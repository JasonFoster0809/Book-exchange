import React, { useEffect, useState, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  MapPin, Box, ShieldCheck, MessageCircle, AlertCircle, 
  Send, Trash2, ArrowRight, Share2, Flag, Check, AlertTriangle, CheckCircle, XCircle, X,
  UserPlus, UserCheck, ChevronRight, ArrowLeft, Heart, Calendar, Eye, ShieldAlert, Loader2
} from 'lucide-react'; 
import { Product, User, Comment, ProductStatus } from '../types'; 
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import ProductCard from '../components/ProductCard';
import { useToast } from '../contexts/ToastContext'; 
import { playNotificationSound } from '../utils/audio';

const ProductDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const { addToast } = useToast();
  
  const [product, setProduct] = useState<Product | null>(null);
  const [seller, setSeller] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false); 
  const [isFollowing, setIsFollowing] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('fraud');
  const [reportDescription, setReportDescription] = useState('');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [replyContent, setReplyContent] = useState('');
  const [activeReplyId, setActiveReplyId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [mainImage, setMainImage] = useState('');

  // --- LOGIC TRỌNG TÂM: KHÓA DỰA TRÊN HUY HIỆU KHÔNG ĐÁNG TIN ---
  const isViewerUntrusted = useMemo(() => {
    if (!currentUser?.banUntil) return false;
    return new Date(currentUser.banUntil) > new Date();
  }, [currentUser?.banUntil]);

  const isSellerUntrusted = useMemo(() => {
    if (!seller?.banUntil) return false;
    return new Date(seller.banUntil) > new Date();
  }, [seller?.banUntil]);

  useEffect(() => {
    if (id) {
        fetchProductAndSeller();
        fetchComments();
        window.scrollTo(0, 0);
        const channel = supabase.channel(`realtime-comments-${id}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'comments', filter: `product_id=eq.${id}` }, 
            () => fetchComments())
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }
  }, [id]);

  useEffect(() => {
    if (currentUser && seller) {
      checkFollowStatus();
      checkLikeStatus();
    }
  }, [currentUser, seller]);

  const checkFollowStatus = async () => {
    if (!seller || !currentUser) return;
    const { data } = await supabase.from('follows').select('*').eq('follower_id', currentUser.id).eq('following_id', seller.id).single();
    setIsFollowing(!!data);
  };

  const checkLikeStatus = async () => {
      if (!currentUser || !id) return;
      const { data } = await supabase.from('saved_products').select('*').eq('user_id', currentUser.id).eq('product_id', id).single();
      setIsLiked(!!data);
  };

  const fetchProductAndSeller = async () => {
      setLoading(true);
      try {
        await supabase.rpc('increment_view_count', { product_id: id });
        const { data: pData, error: pError } = await supabase.from('products').select('*').eq('id', id).single();
        if (pError) throw pError;
        
        const mappedProduct: Product = {
            ...pData, sellerId: pData.seller_id, images: pData.images || [], tradeMethod: pData.trade_method, postedAt: pData.posted_at,
            status: pData.status as ProductStatus, view_count: pData.view_count || 0
        };
        setProduct(mappedProduct);
        setMainImage(mappedProduct.images[0]);

        const { data: uData } = await supabase.from('profiles').select('*').eq('id', mappedProduct.sellerId).single();
        if (uData) setSeller({ ...uData, id: uData.id, avatar: uData.avatar_url, isVerified: uData.is_verified, studentId: uData.student_id, banUntil: uData.ban_until });

        const { data: relatedData } = await supabase.from('products').select('*').eq('category', mappedProduct.category).neq('id', mappedProduct.id).eq('status', 'available').limit(4);
        if (relatedData) setRelatedProducts(relatedData.map((item: any) => ({ ...item, sellerId: item.seller_id, images: item.images || [], postedAt: item.posted_at, tradeMethod: item.trade_method })));
      } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const fetchComments = async () => {
      const { data } = await supabase.from('comments').select(`*, user:user_id(name, avatar_url)`).eq('product_id', id).order('created_at', { ascending: true });
      if (data) {
          const rawComments: Comment[] = data.map((c: any) => ({
              id: c.id, productId: c.product_id, userId: c.user_id,
              userName: c.user?.name || 'Người dùng',
              userAvatar: c.user?.avatar_url || 'https://via.placeholder.com/150',
              content: c.content, createdAt: c.created_at, parentId: c.parent_id
          }));
          const rootComments = rawComments.filter(c => !c.parentId);
          const replyMap = new Map<string, Comment[]>();
          rawComments.forEach(c => {
              if (c.parentId) {
                  const list = replyMap.get(c.parentId) || [];
                  list.push(c);
                  replyMap.set(c.parentId, list);
              }
          });
          rootComments.forEach(root => root.replies = replyMap.get(root.id) || []);
          setComments(rootComments.reverse());
      }
  };

  const handleToggleLike = async () => {
    if (!currentUser) return navigate('/auth');
    try {
      if (isLiked) {
        await supabase.from('saved_products').delete().eq('user_id', currentUser.id).eq('product_id', id);
        setIsLiked(false);
      } else {
        await supabase.from('saved_products').insert({ user_id: currentUser.id, product_id: id });
        setIsLiked(true);
        playNotificationSound();
        addToast("Đã lưu tin!", "success");
      }
    } catch (err) { console.error(err); }
  };

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !product) return;
    setIsSubmittingReport(true);
    try {
        await supabase.from('reports').insert({
            reporter_id: currentUser.id, product_id: product.id, reason: `${reportReason}: ${reportDescription}`, status: 'pending' 
        });
        addToast("Đã gửi báo cáo vi phạm", "success");
        setShowReportModal(false);
    } catch (err) { addToast("Lỗi gửi báo cáo", "error"); } finally { setIsSubmittingReport(false); }
  };

  const handleSubmit = async (e: React.FormEvent, parentId: string | null = null) => {
      e.preventDefault();
      
      // KHÓA CỨNG Ở TẦNG LOGIC: Kiểm tra thời gian thực ngay khi nhấn nút
      const now = new Date();
      const isActuallyBanned = currentUser?.banUntil && new Date(currentUser.banUntil) > now;
      
      if (isActuallyBanned) {
          addToast("Tài khoản của bạn đang bị hạn chế bình luận do mang huy hiệu 'Không đáng tin'.", "error");
          return; 
      }

      const content = parentId ? replyContent : newComment;
      if (!currentUser || !content.trim()) return;
      
      setSubmitting(true);
      try {
        const { error } = await supabase.from('comments').insert({
            product_id: id, user_id: currentUser.id, content: content.trim(), parent_id: parentId
        });
        if (error) throw error;
        setNewComment(''); setReplyContent(''); setActiveReplyId(null);
        fetchComments();
        playNotificationSound();
      } catch (err: any) {
        addToast("Lỗi: " + err.message, "error");
      } finally {
        setSubmitting(false);
      }
  };

  const handleDeleteComment = async (cid: string) => {
    if(confirm("Xóa bình luận này?")) {
        await supabase.from('comments').delete().eq('id', cid);
        fetchComments();
    }
  };

  const CommentItem = ({ comment, isReply = false }: { comment: Comment, isReply?: boolean }) => (
      <div className={`flex gap-3 group ${isReply ? 'mt-3 pl-4 border-l-2 border-gray-100' : 'mt-4'}`}>
          <Link to={`/profile/${comment.userId}`}>
             <img src={comment.userAvatar} className={`rounded-full object-cover border ${isReply ? 'w-8 h-8' : 'w-10 h-10'}`} />
          </Link>
          <div className="flex-1">
              <div className="bg-gray-50 rounded-2xl px-4 py-2 inline-block min-w-[180px] relative">
                  <p className="font-bold text-sm text-gray-900">{comment.userName}</p>
                  <p className="text-sm text-gray-800 whitespace-pre-wrap">{comment.content}</p>
              </div>
              <div className="flex items-center gap-4 mt-1 ml-2">
                  {/* CHẶN TRẢ LỜI NẾU KHÔNG ĐÁNG TIN */}
                  {!isReply && !isViewerUntrusted && (
                      <button onClick={() => setActiveReplyId(activeReplyId === comment.id ? null : comment.id)} className="text-xs font-bold text-gray-500 hover:text-blue-600">Trả lời</button>
                  )}
                  {currentUser?.id === comment.userId && <button onClick={() => handleDeleteComment(comment.id)} className="text-xs text-gray-400 hover:text-red-500">Xóa</button>}
              </div>
              {activeReplyId === comment.id && !isViewerUntrusted && (
                  <form onSubmit={(e) => handleSubmit(e, comment.id)} className="flex gap-2 mt-2 max-w-lg">
                      <input autoFocus type="text" className="flex-1 text-sm border rounded-full px-4 py-1.5 focus:border-blue-500 outline-none" placeholder={`Phản hồi ${comment.userName}...`} value={replyContent} onChange={(e) => setReplyContent(e.target.value)} />
                      <button disabled={submitting} className="bg-blue-600 text-white p-1.5 rounded-full"><Send size={14} /></button>
                  </form>
              )}
              {comment.replies && comment.replies.length > 0 && (
                  <div className="ml-2">{comment.replies.map(reply => <CommentItem key={reply.id} comment={reply} isReply={true} />)}</div>
              )}
          </div>
      </div>
  );

  if (loading) return <div className="min-h-screen flex items-center justify-center font-sans"><Loader2 className="animate-spin text-blue-600" size={40} /></div>;
  if (!product) return <div className="py-20 text-center text-red-500 font-bold">Sản phẩm không tồn tại</div>;

  return (
    <div className="bg-slate-50 min-h-screen pb-20 font-sans">
      <div className="bg-white border-b sticky top-0 z-20 p-4">
        <div className="max-w-7xl mx-auto flex items-center gap-2 text-sm text-gray-500">
          <Link to="/market" className="hover:text-blue-600 font-medium flex items-center gap-1"><ArrowLeft size={16}/> Chợ BK</Link>
          <ChevronRight size={14} />
          <span className="text-gray-900 font-medium truncate">{product.title}</span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 mt-6 lg:grid lg:grid-cols-12 lg:gap-8">
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white rounded-2xl p-2 shadow-sm border overflow-hidden relative">
            <img src={mainImage} className="w-full aspect-video object-contain rounded-xl bg-gray-50" alt="main" />
            {product.status === 'sold' && <div className="absolute inset-0 bg-black/40 flex items-center justify-center"><span className="text-white font-black text-4xl border-4 p-4 -rotate-12 uppercase tracking-widest">ĐÃ BÁN</span></div>}
          </div>

          <div className="bg-white rounded-2xl p-8 shadow-sm border">
            <h2 className="text-xl font-bold mb-4 border-l-4 border-blue-600 pl-3">Mô tả sản phẩm</h2>
            <div className="text-gray-700 whitespace-pre-wrap leading-relaxed">{product.description}</div>
          </div>

          {/* KHU VỰC HỎI ĐÁP */}
          <div className="bg-white rounded-2xl p-8 shadow-sm border" id="comments">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2">Hỏi đáp <span className="bg-gray-100 text-gray-500 text-xs px-2 py-1 rounded-full">{comments.length}</span></h3>

            {/* KHÓA HIỂN THỊ NẾU MANG HUY HIỆU KHÔNG ĐÁNG TIN */}
            {isViewerUntrusted ? (
              <div className="p-5 bg-red-50 border-2 border-red-100 rounded-2xl flex items-center gap-4 mb-8 animate-pulse shadow-sm">
                <ShieldAlert className="text-red-600 flex-shrink-0" size={32} />
                <div>
                  <p className="text-red-800 text-sm font-black uppercase tracking-widest">Tài khoản bị hạn chế</p>
                  <p className="text-red-700 text-xs font-bold">Chức năng bình luận đã khóa do tài khoản mang huy hiệu 'Không đáng tin'.</p>
                </div>
              </div>
            ) : currentUser ? (
              <form onSubmit={(e) => handleSubmit(e)} className="flex gap-4 mb-10">
                <img src={currentUser.avatar} className="w-12 h-12 rounded-full border shadow-sm object-cover" />
                <div className="flex-1 relative">
                  <input 
                    type="text" 
                    className="w-full border-2 border-gray-100 rounded-full py-3 px-6 pr-14 focus:border-blue-500 outline-none bg-gray-50" 
                    placeholder="Đặt câu hỏi cho người bán..." 
                    value={newComment} 
                    onChange={(e) => setNewComment(e.target.value)} 
                  />
                  <button type="submit" disabled={!newComment.trim() || submitting} className="absolute right-2 top-2 p-2 bg-blue-600 text-white rounded-full"><Send size={20}/></button>
                </div>
              </form>
            ) : (
              <div className="text-center p-6 bg-gray-50 rounded-2xl mb-8 border-2 border-dashed border-gray-200">
                Vui lòng <Link to="/auth" className="text-blue-600 font-bold underline">Đăng nhập</Link> để bình luận.
              </div>
            )}

            <div className="space-y-2">
              {comments.map(c => <CommentItem key={c.id} comment={c} />)}
            </div>
          </div>
        </div>

        {/* SIDEBAR */}
        <div className="lg:col-span-4 mt-8 lg:mt-0 space-y-6">
          <div className="bg-white rounded-2xl p-6 shadow-lg border-2 border-white">
             <h1 className="text-2xl font-black text-gray-900 mb-3 leading-tight">{product.title}</h1>
             <div className="text-3xl font-black text-blue-700 mb-6">{product.price === 0 ? "FREE" : product.price.toLocaleString('vi-VN') + " đ"}</div>
             <div className="flex gap-2">
               <button onClick={handleToggleLike} className={`flex-1 py-3 rounded-xl font-bold border-2 transition-all flex items-center justify-center gap-2 ${isLiked ? 'bg-red-50 border-red-100 text-red-500' : 'bg-white border-gray-100 text-gray-600'}`}><Heart size={20} className={isLiked ? 'fill-current' : ''}/> {isLiked ? 'Đã lưu' : 'Lưu tin'}</button>
               <button onClick={() => { navigator.clipboard.writeText(window.location.href); addToast("Đã copy link", "success"); }} className="p-3 border-2 border-gray-100 rounded-xl text-gray-400 hover:bg-gray-50"><Share2 size={20}/></button>
             </div>
          </div>

          {seller && (
            <div className="bg-white rounded-2xl p-6 shadow-sm border">
              <div className="flex items-center gap-4 mb-6">
                <Link to={`/profile/${seller.id}`} className="relative">
                  <img src={seller.avatar} className={`w-16 h-16 rounded-full border-4 object-cover ${isSellerUntrusted ? 'border-red-400' : 'border-blue-50'}`} />
                  {isSellerUntrusted && <div className="absolute -bottom-1 -right-1 bg-red-500 text-white p-1 rounded-full border-2 border-white animate-pulse"><ShieldAlert size={12} /></div>}
                  {seller.isVerified && !isSellerUntrusted && <div className="absolute -bottom-1 -right-1 bg-blue-500 text-white p-1 rounded-full border-2 border-white"><ShieldCheck size={12} fill="currentColor"/></div>}
                </Link>
                <div className="overflow-hidden">
                  <h4 className="font-bold text-lg truncate"><Link to={`/profile/${seller.id}`} className="hover:text-blue-600">{seller.name}</Link></h4>
                  {isSellerUntrusted && <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded font-black uppercase">Không đáng tin</span>}
                </div>
              </div>

              {/* KHÓA NHẮN TIN 2 CHIỀU NẾU MỘT TRONG HAI BỊ BAN */}
              <Link 
                to={(isViewerUntrusted || isSellerUntrusted || product.status === 'sold') ? '#' : `/chat?partnerId=${seller.id}`} 
                className={`w-full py-4 rounded-xl font-bold flex justify-center items-center shadow-lg transition-all ${ (isViewerUntrusted || isSellerUntrusted || product.status === 'sold') ? 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none' : 'bg-blue-600 text-white hover:bg-blue-700' }`}
              >
                <MessageCircle className="mr-2" size={20} /> 
                {isViewerUntrusted ? 'BẠN BỊ HẠN CHẾ' : isSellerUntrusted ? 'NB BỊ HẠN CHẾ' : product.status === 'sold' ? 'ĐÃ BÁN' : 'Nhắn tin ngay'}
              </Link>
            </div>
          )}

          <div className="bg-orange-50 border-2 border-orange-100 p-5 rounded-2xl flex gap-3">
             <AlertTriangle className="text-orange-500 flex-shrink-0" size={20} />
             <div className="text-[11px] text-orange-800 leading-relaxed font-medium">Giao dịch trực tiếp tại trường. Không chuyển khoản trước để tránh lừa đảo.</div>
          </div>
        </div>
      </div>

      {/* Mobile Footer */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t p-4 z-50 flex gap-3 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] pb-safe">
          <button onClick={handleToggleLike} className={`p-3 rounded-xl border-2 ${isLiked ? 'border-red-100 bg-red-50 text-red-500' : 'border-gray-100 text-gray-400'}`}><Heart size={24}/></button>
          <button 
            onClick={() => !(isViewerUntrusted || isSellerUntrusted || product.status === 'sold') && navigate(`/chat?partnerId=${seller?.id}`)}
            disabled={isViewerUntrusted || isSellerUntrusted || product.status === 'sold'}
            className={`flex-1 rounded-xl font-bold flex items-center justify-center gap-2 ${isViewerUntrusted || isSellerUntrusted || product.status === 'sold' ? 'bg-gray-200 text-gray-400' : 'bg-blue-600 text-white shadow-lg'}`}
          >
            {isViewerUntrusted ? 'BỊ CHẶN' : isSellerUntrusted ? 'NB BỊ CHẶN' : 'Nhắn tin'}
          </button>
      </div>

      {/* REPORT MODAL */}
      {showReportModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                <div className="bg-red-50 p-4 border-b border-red-100 flex justify-between items-center"><div className="flex items-center text-red-700 font-bold"><AlertTriangle size={20} className="mr-2" /> Báo cáo vi phạm</div><button onClick={() => setShowReportModal(false)}><X size={20} /></button></div>
                <form onSubmit={handleSubmitReport} className="p-6 space-y-4">
                    <select value={reportReason} onChange={(e) => setReportReason(e.target.value)} className="w-full border-gray-300 rounded-xl p-3 bg-gray-50 border outline-none"><option value="fraud">Lừa đảo / Hàng giả</option><option value="duplicate">Spam</option><option value="other">Khác</option></select>
                    <textarea rows={3} value={reportDescription} onChange={(e) => setReportDescription(e.target.value)} placeholder="Chi tiết..." className="w-full border-gray-300 rounded-xl p-3 border resize-none outline-none" />
                    <div className="flex justify-end gap-3"><button type="button" onClick={() => setShowReportModal(false)} className="px-4 py-2 font-bold text-gray-600">Hủy</button><button type="submit" disabled={isSubmittingReport} className="px-6 py-2 font-bold text-white bg-red-600 rounded-lg">Gửi báo cáo</button></div>
                </form>
            </div>
        </div>
      )}
    </div>
  );
};

export default ProductDetailPage;