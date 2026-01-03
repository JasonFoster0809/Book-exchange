import React, { useEffect, useState } from 'react';
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
  // Lấy thêm isRestricted từ useAuth
  const { user: currentUser, isRestricted } = useAuth();
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

  // Kiểm tra người bán có bị restrict không
  const isSellerRestricted = seller?.banUntil ? new Date(seller.banUntil) > new Date() : false;

  useEffect(() => {
    if (id) {
        fetchProductAndSeller();
        fetchComments();
        window.scrollTo(0, 0);
        
        const channel = supabase.channel('realtime-comments')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'comments', filter: `product_id=eq.${id}` }, 
            () => fetchComments())
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }
  }, [id]);

  useEffect(() => {
    if (currentUser && seller) checkFollowStatus();
    if (currentUser && id) checkLikeStatus();
  }, [currentUser, seller, id]);

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

  const handleSubmit = async (e: React.FormEvent, parentId: string | null = null) => {
      e.preventDefault();
      // CHẶN BÌNH LUẬN NẾU BỊ PHẠT
      if (isRestricted) return addToast("Tài khoản đang bị hạn chế bình luận.", "error");

      const content = parentId ? replyContent : newComment;
      if (!currentUser || !content.trim()) return;
      
      setSubmitting(true);
      const { error } = await supabase.from('comments').insert({
          product_id: id, user_id: currentUser.id, content: content.trim(), parent_id: parentId
      });
      if (!error) {
          setNewComment(''); setReplyContent(''); setActiveReplyId(null);
          playNotificationSound();
      }
      setSubmitting(false);
  };

  const handleDelete = async (cid: string) => {
      if(confirm("Xóa bình luận?")) await supabase.from('comments').delete().eq('id', cid);
  };

  const handleCopyLink = () => {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true); setTimeout(() => setCopied(false), 2000);
      addToast("Đã sao chép liên kết!", "success");
  };

  const handleReportClick = () => {
      if (!currentUser) return navigate('/auth');
      setShowReportModal(true);
  };

  const handleFollow = async () => {
    if (!currentUser) return navigate('/auth');
    if (!seller) return;
    if (isFollowing) {
        await supabase.from('follows').delete().eq('follower_id', currentUser.id).eq('following_id', seller.id);
        setIsFollowing(false);
    } else {
        await supabase.from('follows').insert({ follower_id: currentUser.id, following_id: seller.id });
        setIsFollowing(true);
    }
  };

  const handleToggleLike = async () => {
      if (!currentUser) return navigate('/auth');
      if (isLiked) {
          await supabase.from('saved_products').delete().eq('user_id', currentUser.id).eq('product_id', id);
      } else {
          await supabase.from('saved_products').insert({ user_id: currentUser.id, product_id: id });
          playNotificationSound();
      }
      setIsLiked(!isLiked);
  };

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !product) return;
    setIsSubmittingReport(true);
    try {
        const finalReason = reportDescription ? `${reportReason}: ${reportDescription}` : reportReason;
        await supabase.from('reports').insert({
            reporter_id: currentUser.id, product_id: product.id, reason: finalReason, status: 'pending' 
        });
        addToast("Đã gửi báo cáo thành công!", "success");
        setShowReportModal(false);
        setReportDescription('');
    } catch (err: any) { addToast("Có lỗi xảy ra.", "error"); } finally { setIsSubmittingReport(false); }
  };

  const handleUpdateStatus = async (newStatus: ProductStatus) => {
    if (!product || !currentUser || currentUser.id !== product.sellerId) return;
    const { error } = await supabase.from('products').update({ status: newStatus }).eq('id', product.id);
    if (!error) { setProduct({ ...product, status: newStatus }); addToast("Đã cập nhật trạng thái.", "success"); }
  };

  const CommentItem = ({ comment, isReply = false }: { comment: Comment, isReply?: boolean }) => (
      <div className={`flex gap-3 group ${isReply ? 'mt-3 pl-4 border-l-2 border-gray-100' : 'mt-4'}`}>
          <Link to={`/profile/${comment.userId}`}>
             <img src={comment.userAvatar} className={`rounded-full object-cover border border-gray-200 ${isReply ? 'w-8 h-8' : 'w-10 h-10'}`} />
          </Link>
          <div className="flex-1">
              <div className="bg-gray-50 rounded-2xl px-4 py-2 relative inline-block min-w-[200px]">
                  <div className="flex items-center justify-between mb-1 gap-4">
                      <Link to={`/profile/${comment.userId}`} className="font-bold text-sm text-gray-900 hover:underline">
                          {comment.userName}
                          {seller && comment.userId === seller.id && <span className="ml-2 text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded border border-blue-200 font-bold">Người bán</span>}
                      </Link>
                      <span className="text-xs text-gray-400">{new Date(comment.createdAt).toLocaleDateString('vi-VN')}</span>
                  </div>
                  <p className="text-sm text-gray-800 whitespace-pre-wrap">{comment.content}</p>
              </div>
              <div className="flex items-center gap-4 mt-1 ml-2">
                  {!isReply && !isRestricted && (
                      <button onClick={() => setActiveReplyId(activeReplyId === comment.id ? null : comment.id)} className="text-xs font-bold text-gray-500 hover:text-[#034EA2] cursor-pointer">Trả lời</button>
                  )}
                  {currentUser?.id === comment.userId && <button onClick={() => handleDelete(comment.id)} className="text-xs text-gray-400 hover:text-red-500">Xóa</button>}
              </div>
              {activeReplyId === comment.id && !isRestricted && (
                  <form onSubmit={(e) => handleSubmit(e, comment.id)} className="flex gap-2 mt-2 max-w-lg">
                      <input autoFocus type="text" className="flex-1 text-sm border border-gray-300 rounded-full px-4 py-1.5 focus:outline-none focus:border-[#034EA2]" placeholder={`Trả lời ${comment.userName}...`} value={replyContent} onChange={(e) => setReplyContent(e.target.value)} />
                      <button disabled={submitting} className="bg-[#034EA2] text-white p-1.5 rounded-full hover:bg-blue-800"><Send className="w-3.5 h-3.5" /></button>
                  </form>
              )}
              {comment.replies && comment.replies.length > 0 && (
                  <div className="ml-2">{comment.replies.map(reply => <CommentItem key={reply.id} comment={reply} isReply={true} />)}</div>
              )}
          </div>
      </div>
  );

  const renderStatusBadge = () => {
      if (product?.status === ProductStatus.SOLD) return <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-bold flex items-center w-fit"><XCircle className="w-4 h-4 mr-1"/> ĐÃ BÁN</span>;
      if (product?.status === ProductStatus.PENDING) return <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-bold flex items-center w-fit"><AlertTriangle className="w-4 h-4 mr-1"/> ĐANG GIAO DỊCH</span>;
      return <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-bold flex items-center w-fit"><CheckCircle className="w-4 h-4 mr-1"/> CÒN HÀNG</span>;
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center font-sans"><Loader2 className="animate-spin text-[#034EA2]" size={40} /></div>;
  if (!product) return <div className="py-20 text-center text-red-500">Sản phẩm không tồn tại</div>;

  return (
    <div className="bg-slate-50 min-h-screen pb-20 relative font-sans">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-20">
          <div className="max-w-7xl mx-auto px-4 h-14 flex items-center text-sm text-gray-500">
              <Link to="/market" className="hover:text-[#034EA2] flex items-center font-medium"><ArrowLeft className="w-4 h-4 mr-1"/> Chợ BK</Link>
              <ChevronRight className="w-4 h-4 mx-2 text-gray-300"/>
              <span className="text-gray-900 font-medium truncate max-w-[200px]">{product.title}</span>
          </div>
      </div>

      <div className="pt-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
          <div className="lg:grid lg:grid-cols-12 lg:gap-8">
            <div className="lg:col-span-8 flex flex-col gap-6">
                <div className="bg-white rounded-2xl p-2 border border-gray-200 shadow-sm">
                    <div className="aspect-video w-full rounded-xl overflow-hidden bg-gray-100 relative group">
                        <img src={mainImage || product.images[0]} alt={product.title} className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-105" />
                        {product.status === ProductStatus.SOLD && (
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center backdrop-blur-sm">
                                <span className="text-white font-black text-4xl border-4 border-white p-4 -rotate-12 rounded opacity-90 uppercase tracking-widest">ĐÃ BÁN</span>
                            </div>
                        )}
                    </div>
                </div>
                
                {product.images.length > 1 && (
                    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                        {product.images.map((img, idx) => (
                            <button key={idx} onClick={() => setMainImage(img)} className={`w-20 h-20 flex-shrink-0 rounded-xl border-2 overflow-hidden transition-all ${mainImage === img ? 'border-[#034EA2] ring-2 ring-blue-100' : 'border-transparent hover:border-gray-300'}`}>
                                <img src={img} className="w-full h-full object-cover" />
                            </button>
                        ))}
                    </div>
                )}

                <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm">
                    <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center border-l-4 border-[#034EA2] pl-3">Mô tả sản phẩm</h2>
                    <div className="prose max-w-none text-gray-700 whitespace-pre-line leading-relaxed text-base">{product.description}</div>
                </div>

                {/* KHU VỰC BÌNH LUẬN */}
                <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm" id="comments">
                    <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">Hỏi đáp <span className="ml-2 bg-gray-100 text-gray-600 text-sm py-0.5 px-3 rounded-full">{comments.length}</span></h3>

                    {isRestricted ? (
                        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3 mb-8">
                            <ShieldAlert className="text-red-600" size={24} />
                            <p className="text-red-800 text-sm font-bold">Tài khoản bị hạn chế. Chức năng bình luận đã khóa.</p>
                        </div>
                    ) : currentUser ? (
                        <form onSubmit={(e) => handleSubmit(e)} className="flex gap-4 mb-8">
                            <img src={currentUser.avatar} className="w-10 h-10 rounded-full border border-gray-200 object-cover" />
                            <div className="flex-1 relative">
                                <input type="text" className="w-full border border-gray-300 rounded-full py-3 px-5 pr-12 focus:outline-none focus:ring-2 focus:ring-[#034EA2] bg-gray-50" placeholder="Bạn thắc mắc gì về sản phẩm này?" value={newComment} onChange={(e) => setNewComment(e.target.value)} />
                                <button disabled={!newComment.trim() || submitting} className="absolute right-2 top-1.5 p-1.5 bg-[#034EA2] text-white rounded-full"><Send className="w-4 h-4" /></button>
                            </div>
                        </form>
                    ) : <div className="bg-gray-50 p-4 rounded-xl text-center mb-8 border border-dashed border-gray-300 text-sm"><Link to="/auth" className="text-[#034EA2] font-bold">Đăng nhập</Link> để bình luận.</div>}
                    
                    <div className="space-y-4">{comments.length === 0 ? <p className="text-gray-400 italic text-center py-4">Chưa có câu hỏi nào.</p> : comments.map(comment => <CommentItem key={comment.id} comment={comment} />)}</div>
                </div>
            </div>

            <div className="lg:col-span-4 space-y-6 mt-8 lg:mt-0">
                <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-lg relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-bl-[100px] -mr-6 -mt-6 z-0"></div>
                    <div className="relative z-10">
                        <div className="mb-3 flex justify-between items-start">
                            {renderStatusBadge()}
                            <div className="text-xs text-gray-400 flex items-center bg-gray-100 px-2 py-1 rounded-full"><Eye className="w-3 h-3 mr-1"/> {product.view_count || 0} lượt xem</div>
                        </div>
                        <h1 className="text-2xl font-black text-gray-900 leading-tight mb-3">{product.title}</h1>
                        <div className="text-4xl font-extrabold text-[#034EA2] mb-6 tracking-tight">{product.price === 0 ? "FREE" : product.price.toLocaleString('vi-VN') + " đ"}</div>
                        <div className="flex gap-3">
                            <button onClick={handleToggleLike} className={`flex-1 py-3 rounded-xl font-bold border transition-all flex items-center justify-center gap-2 ${isLiked ? 'bg-red-50 border-red-200 text-red-500' : 'bg-white border-gray-300 text-gray-600'}`}><Heart className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} /> {isLiked ? 'Đã lưu' : 'Lưu tin'}</button>
                            <button onClick={handleCopyLink} className="p-3 rounded-xl border border-gray-300 text-gray-600">{copied ? <Check className="text-green-500"/> : <Share2 />}</button>
                            <button onClick={handleReportClick} className="p-3 rounded-xl border border-gray-300 text-gray-400 hover:text-red-500"><Flag /></button>
                        </div>
                    </div>
                </div>

                {seller && (
                    <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
                        <div className="flex items-center gap-4 mb-6">
                            <Link to={`/profile/${seller.id}`} className="relative">
                                <img className={`h-16 w-16 rounded-full border-4 shadow-md object-cover ${isSellerRestricted ? 'border-red-200' : 'border-white'}`} src={seller.avatar} />
                                {seller.isVerified && !isSellerRestricted && <div className="absolute -bottom-1 -right-1 bg-blue-500 text-white p-1 rounded-full border-2 border-white"><ShieldCheck size={12} fill="currentColor"/></div>}
                                {isSellerRestricted && <div className="absolute -bottom-1 -right-1 bg-red-500 text-white p-1 rounded-full border-2 border-white animate-pulse"><ShieldAlert size={12} /></div>}
                            </Link>
                            <div className="flex-1">
                                <h4 className="font-bold text-lg text-gray-900"><Link to={`/profile/${seller.id}`} className="hover:text-[#034EA2]">{seller.name}</Link></h4>
                                {isSellerRestricted && <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded font-black uppercase">Không đáng tin</span>}
                                <div className="flex gap-2 mt-2">
                                  {currentUser?.id !== seller.id && (
                                      <button onClick={handleFollow} className={`text-xs font-bold px-3 py-1 rounded-full border ${isFollowing ? 'bg-gray-100 text-gray-600' : 'bg-blue-50 text-[#034EA2]'}`}>{isFollowing ? 'Đang theo dõi' : '+ Theo dõi'}</button>
                                  )}
                                </div>
                            </div>
                        </div>

                        {/* NÚT CHAT: CHẶN HAI CHIỀU */}
                        {currentUser?.id !== seller.id && (
                            <Link 
                                to={isRestricted || isSellerRestricted || product.status === ProductStatus.SOLD ? '#' : `/chat?partnerId=${seller.id}`} 
                                className={`w-full py-4 rounded-xl font-bold flex justify-center items-center shadow-lg transition-all ${isRestricted || isSellerRestricted || product.status === ProductStatus.SOLD ? 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none' : 'bg-[#034EA2] text-white hover:bg-blue-800'}`}
                            >
                                <MessageCircle className="w-5 h-5 mr-2" /> 
                                {isRestricted ? 'BẠN BỊ HẠN CHẾ' : isSellerRestricted ? 'NGƯỜI BÁN BỊ HẠN CHẾ' : product.status === ProductStatus.SOLD ? 'ĐÃ BÁN' : 'Nhắn tin ngay'}
                            </Link>
                        )}
                    </div>
                )}

                <div className="bg-orange-50 rounded-2xl p-5 border border-orange-100 flex gap-4">
                    <div className="bg-orange-100 p-2 rounded-full h-fit"><AlertTriangle className="w-6 h-6 text-orange-600" /></div>
                    <div>
                        <h4 className="font-bold text-orange-800 text-sm mb-1">Lưu ý an toàn</h4>
                        <p className="text-xs text-orange-700 leading-relaxed">Giao dịch trực tiếp tại trường. Không chuyển khoản trước khi nhận hàng.</p>
                    </div>
                </div>
            </div>
          </div>

          {relatedProducts.length > 0 && (
              <div className="mt-16 border-t border-gray-200 pt-10">
                  <div className="flex justify-between items-center mb-8">
                      <h2 className="text-2xl font-bold text-gray-900">Có thể bạn cũng thích</h2>
                      <Link to={`/market?cat=${product.category}`} className="text-[#034EA2] text-sm font-bold bg-blue-50 px-4 py-2 rounded-full flex items-center">Xem thêm <ArrowRight className="w-4 h-4 ml-1"/></Link>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">{relatedProducts.map(p => <ProductCard key={p.id} product={p} />)}</div>
              </div>
          )}
      </div>

      {/* MOBILE STICKY FOOTER */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t p-4 z-50 flex gap-3 pb-safe">
            <button onClick={handleToggleLike} className={`p-3.5 rounded-xl border-2 ${isLiked ? 'border-red-100 bg-red-50 text-red-500' : 'bg-gray-50 text-gray-600'}`}><Heart className={isLiked ? 'fill-current' : ''}/></button>
            {currentUser?.id !== product.sellerId ? (
                <button 
                onClick={() => !(isRestricted || isSellerRestricted || product.status === ProductStatus.SOLD) && navigate(`/chat?partnerId=${product.sellerId}`)}
                className={`flex-1 rounded-xl font-bold text-lg flex items-center justify-center gap-2 ${isRestricted || isSellerRestricted || product.status === ProductStatus.SOLD ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-[#034EA2] text-white'}`}
                disabled={isRestricted || isSellerRestricted || product.status === ProductStatus.SOLD}
                >
                    <MessageCircle className="w-5 h-5"/> {isRestricted ? 'BỊ CHẶN' : isSellerRestricted ? 'NB BỊ CHẶN' : product.status === ProductStatus.SOLD ? 'ĐÃ BÁN' : 'Chat ngay'}
                </button>
            ) : <button onClick={() => window.scrollTo({top: 0, behavior: 'smooth'})} className="flex-1 bg-gray-800 text-white rounded-xl font-bold text-lg">Quản lý tin</button>}
      </div>

      {/* REPORT MODAL */}
      {showReportModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                <div className="bg-red-50 p-4 border-b border-red-100 flex justify-between items-center">
                    <div className="flex items-center text-red-700 font-bold"><AlertTriangle size={20} className="mr-2" /> Báo cáo vi phạm</div>
                    <button onClick={() => setShowReportModal(false)} className="text-gray-400"><X size={20} /></button>
                </div>
                <form onSubmit={handleSubmitReport} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Lý do</label>
                        <select value={reportReason} onChange={(e) => setReportReason(e.target.value)} className="w-full border-gray-300 rounded-xl p-3 bg-gray-50 border">
                            <option value="fraud">Lừa đảo / Hàng giả</option>
                            <option value="inappropriate">Nội dung thô tục</option>
                            <option value="duplicate">Spam / Tin trùng lặp</option>
                            <option value="other">Khác</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Chi tiết</label>
                        <textarea rows={3} value={reportDescription} onChange={(e) => setReportDescription(e.target.value)} placeholder="Mô tả thêm..." className="w-full border-gray-300 rounded-xl p-3 border resize-none" />
                    </div>
                    <div className="flex justify-end space-x-3 pt-2">
                        <button type="button" onClick={() => setShowReportModal(false)} className="px-4 py-2 font-bold text-gray-600">Hủy</button>
                        <button type="submit" disabled={isSubmittingReport} className="px-6 py-2 font-bold text-white bg-red-600 rounded-lg">{isSubmittingReport ? 'Đang gửi...' : 'Gửi báo cáo'}</button>
                    </div>
                </form>
            </div>
        </div>
      )}
    </div>
  );
};

export default ProductDetailPage;
