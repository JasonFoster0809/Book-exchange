import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  MapPin, Box, ShieldCheck, MessageCircle, AlertCircle, 
  Send, Trash2, ArrowRight, Share2, Flag, Check, AlertTriangle, CheckCircle, XCircle 
} from 'lucide-react'; 
import { Product, User, Comment, ProductStatus } from '../types'; // Import thêm ProductStatus
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import ProductCard from '../components/ProductCard';
import { useToast } from '../contexts/ToastContext'; // Thêm Toast

const ProductDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const { addToast } = useToast();
  
  const [product, setProduct] = useState<Product | null>(null);
  const [seller, setSeller] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  
  // States cho tính năng phụ
  const [copied, setCopied] = useState(false); 
  
  // Comments & Related Products State
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [replyContent, setReplyContent] = useState('');
  const [activeReplyId, setActiveReplyId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);

  // State ảnh chính (để đổi khi click thumbnail)
  const [mainImage, setMainImage] = useState('');

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

  const fetchProductAndSeller = async () => {
      setLoading(true);
      try {
        const { data: pData, error: pError } = await supabase.from('products').select('*').eq('id', id).single();
        if (pError) throw pError;
        
        const mappedProduct: Product = {
            id: pData.id, sellerId: pData.seller_id, title: pData.title, description: pData.description, price: pData.price, category: pData.category, condition: pData.condition, images: pData.images || [], tradeMethod: pData.trade_method, postedAt: pData.posted_at, isLookingToBuy: pData.is_looking_to_buy,
            status: pData.status as ProductStatus // Map status từ DB
        };
        setProduct(mappedProduct);
        setMainImage(mappedProduct.images[0]);

        // Fetch Seller
        const { data: uData } = await supabase.from('profiles').select('*').eq('id', mappedProduct.sellerId).single();
        if (uData) setSeller({ id: uData.id, name: uData.name, studentId: uData.student_id, avatar: uData.avatar_url, isVerified: uData.is_verified, email: uData.email, role: uData.role });

        // --- FETCH SẢN PHẨM TƯƠNG TỰ ---
        const { data: relatedData } = await supabase
            .from('products')
            .select('*')
            .eq('category', mappedProduct.category)
            .neq('id', mappedProduct.id)
            .eq('status', 'available') // Chỉ lấy sp còn hàng
            .limit(4);
            
        if (relatedData) {
            setRelatedProducts(relatedData.map((item: any) => ({
                id: item.id, sellerId: item.seller_id, title: item.title, description: item.description, price: item.price, category: item.category, condition: item.condition, images: item.images || [], tradeMethod: item.trade_method, postedAt: item.posted_at, isLookingToBuy: item.is_looking_to_buy, status: item.status
            })));
        }

      } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const fetchComments = async () => {
      const { data } = await supabase
          .from('comments')
          .select(`*, user:user_id(name, avatar_url)`)
          .eq('product_id', id)
          .order('created_at', { ascending: true });
      
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
          
          rootComments.forEach(root => {
              root.replies = replyMap.get(root.id) || [];
          });

          setComments(rootComments.reverse());
      }
  };

  const handleSubmit = async (e: React.FormEvent, parentId: string | null = null) => {
      e.preventDefault();
      const content = parentId ? replyContent : newComment;
      if (!currentUser || !content.trim()) return;
      
      setSubmitting(true);
      const { error } = await supabase.from('comments').insert({
          product_id: id,
          user_id: currentUser.id,
          content: content.trim(),
          parent_id: parentId
      });
      
      if (!error) {
          setNewComment('');
          setReplyContent('');
          setActiveReplyId(null);
      }
      setSubmitting(false);
  };

  const handleDelete = async (cid: string) => {
      if(confirm("Xóa bình luận?")) await supabase.from('comments').delete().eq('id', cid);
  };

  const handleCopyLink = () => {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
  };

  const handleReport = async () => {
      if (!currentUser) {
          addToast("Vui lòng đăng nhập để báo cáo.", "warning");
          return navigate('/auth');
      }
      const reason = window.prompt("Nhập lý do bạn muốn báo cáo tin này (VD: Lừa đảo, sai sự thật...):");
      if (!reason) return; 

      try {
          const { error } = await supabase.from('reports').insert({
              reporter_id: currentUser.id,
              product_id: product?.id, 
              reason: reason,
              status: 'pending' 
          });

          if (error) throw error;
          addToast("Đã gửi báo cáo thành công! Admin sẽ xem xét sớm.", "success");
      } catch (err: any) {
          console.error("Lỗi báo cáo:", err);
          addToast("Có lỗi xảy ra: " + (err.message || "Không thể gửi báo cáo."), "error");
      }
  };

  // --- TÍNH NĂNG MỚI: CẬP NHẬT TRẠNG THÁI ĐƠN HÀNG ---
  const handleUpdateStatus = async (newStatus: ProductStatus) => {
    if (!product || !currentUser || currentUser.id !== product.sellerId) return;

    const { error } = await supabase
        .from('products')
        .update({ status: newStatus })
        .eq('id', product.id);

    if (error) {
        addToast("Lỗi cập nhật: " + error.message, "error");
    } else {
        setProduct({ ...product, status: newStatus });
        if (newStatus === ProductStatus.SOLD) {
            addToast("Đã chốt đơn! Sản phẩm đã được đánh dấu là Đã Bán.", "success");
        } else if (newStatus === ProductStatus.PENDING) {
            addToast("Đã chuyển sang trạng thái Đang Giao Dịch.", "info");
        } else {
            addToast("Sản phẩm đã được đăng bán trở lại.", "success");
        }
    }
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
                          {seller && comment.userId === seller.id && <span className="ml-2 text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded border border-indigo-200 font-bold">Người bán</span>}
                      </Link>
                      <span className="text-xs text-gray-400">{new Date(comment.createdAt).toLocaleDateString('vi-VN')}</span>
                  </div>
                  <p className="text-sm text-gray-800 whitespace-pre-wrap">{comment.content}</p>
              </div>

              <div className="flex items-center gap-4 mt-1 ml-2">
                  {!isReply && (
                      <button onClick={() => setActiveReplyId(activeReplyId === comment.id ? null : comment.id)} className="text-xs font-bold text-gray-500 hover:text-indigo-600 cursor-pointer">Trả lời</button>
                  )}
                  {currentUser?.id === comment.userId && <button onClick={() => handleDelete(comment.id)} className="text-xs text-gray-400 hover:text-red-500">Xóa</button>}
              </div>

              {activeReplyId === comment.id && (
                  <form onSubmit={(e) => handleSubmit(e, comment.id)} className="flex gap-2 mt-2 max-w-lg">
                      <input autoFocus type="text" className="flex-1 text-sm border border-gray-300 rounded-full px-4 py-1.5 focus:outline-none focus:border-indigo-500" placeholder={`Trả lời ${comment.userName}...`} value={replyContent} onChange={(e) => setReplyContent(e.target.value)} />
                      <button disabled={submitting} className="bg-indigo-600 text-white p-1.5 rounded-full hover:bg-indigo-700"><Send className="w-3.5 h-3.5" /></button>
                  </form>
              )}

              {comment.replies && comment.replies.length > 0 && (
                  <div className="ml-2">
                      {comment.replies.map(reply => <CommentItem key={reply.id} comment={reply} isReply={true} />)}
                  </div>
              )}
          </div>
      </div>
  );

  // Helper render badge trạng thái
  const renderStatusBadge = () => {
      if (product?.status === ProductStatus.SOLD) {
          return <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-bold flex items-center w-fit"><XCircle className="w-4 h-4 mr-1"/> ĐÃ BÁN</span>;
      }
      if (product?.status === ProductStatus.PENDING) {
          return <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-bold flex items-center w-fit"><AlertTriangle className="w-4 h-4 mr-1"/> ĐANG GIAO DỊCH</span>;
      }
      return <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-bold flex items-center w-fit"><CheckCircle className="w-4 h-4 mr-1"/> CÒN HÀNG</span>;
  };

  if (loading) return <div className="py-20 text-center">Đang tải...</div>;
  if (!product) return <div className="py-20 text-center text-red-500">Sản phẩm không tồn tại</div>;

  return (
    <div className="bg-white min-h-screen pb-20 relative">
      <div className="pt-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
          <div className="lg:grid lg:grid-cols-2 lg:gap-x-8">
            
            {/* CỘT TRÁI: ẢNH */}
            <div className="flex flex-col gap-4">
                <div className="aspect-w-4 aspect-h-3 rounded-lg bg-gray-100 overflow-hidden border border-gray-200 relative group">
                    <img src={mainImage || product.images[0]} alt={product.title} className="w-full h-full object-contain" />
                    {/* Tem dán trên ảnh nếu đã bán */}
                    {product.status === ProductStatus.SOLD && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                            <span className="text-white font-bold text-3xl border-4 border-white p-4 rotate-12 rounded opacity-80 uppercase">ĐÃ BÁN</span>
                        </div>
                    )}
                </div>
                {/* Thumbnails */}
                {product.images.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                        {product.images.map((img, idx) => (
                            <button key={idx} onClick={() => setMainImage(img)} className={`w-20 h-20 flex-shrink-0 rounded-md border-2 overflow-hidden ${mainImage === img ? 'border-indigo-600 ring-2 ring-indigo-300' : 'border-transparent hover:border-gray-300'}`}>
                                <img src={img} className="w-full h-full object-cover" />
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* CỘT PHẢI: THÔNG TIN */}
            <div className="mt-10 px-4 sm:px-0 sm:mt-16 lg:mt-0">
              <div className="flex justify-between items-start">
                 <div className="flex-1">
                     <div className="mb-2">{renderStatusBadge()}</div>
                     <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">{product.title}</h1>
                 </div>
                 {/* Nút Share & Report */}
                 <div className="flex gap-2 ml-4">
                    <button onClick={handleCopyLink} className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors relative group" title="Sao chép liên kết">
                        {copied ? <Check className="w-5 h-5 text-green-500" /> : <Share2 className="w-5 h-5" />}
                    </button>
                    <button onClick={handleReport} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors" title="Báo cáo tin này">
                        <Flag className="w-5 h-5" />
                    </button>
                 </div>
              </div>

              <p className="text-3xl text-indigo-600 mt-3 font-bold">{product.price.toLocaleString('vi-VN')} đ</p>
              
              <div className="mt-6 text-base text-gray-700 space-y-6 whitespace-pre-line" dangerouslySetInnerHTML={{ __html: product.description }} />
              
              <div className="mt-8 border-t border-gray-200 pt-8">
                 <div className="flex justify-between mb-2"><span className="font-medium">Danh mục:</span><span>{product.category}</span></div>
                 <div className="flex justify-between"><span className="font-medium">Tình trạng:</span><span className="bg-gray-100 px-2 rounded text-sm">{product.condition}</span></div>
                 <div className="flex justify-between mt-2"><span className="font-medium">Hình thức GD:</span><span className="text-sm">{product.tradeMethod}</span></div>
              </div>

              {seller && (
                <div className="mt-8 bg-gray-50 rounded-xl p-5 border border-gray-200 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <Link to={`/profile/${seller.id}`} className="flex items-center group">
                            <img className="h-12 w-12 rounded-full border border-white shadow-sm object-cover" src={seller.avatar} />
                            <div className="ml-4">
                                <h4 className="font-bold text-gray-900 group-hover:text-indigo-600">{seller.name} {seller.isVerified && <ShieldCheck className="w-4 h-4 text-blue-600 inline" title="Đã xác thực MSSV"/>}</h4>
                                <p className="text-xs text-gray-500">Xem trang cá nhân &rarr;</p>
                            </div>
                        </Link>
                    </div>
                    
                    <div className="mt-4">
                        {currentUser?.id !== seller.id ? (
                            <Link 
                                to={`/chat?partnerId=${seller.id}`} 
                                className={`w-full py-3 rounded-lg font-bold flex justify-center items-center shadow-md transition ${product.status === ProductStatus.SOLD ? 'bg-gray-300 text-gray-500 cursor-not-allowed pointer-events-none' : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-lg'}`}
                            >
                                <MessageCircle className="w-5 h-5 mr-2" /> 
                                {product.status === ProductStatus.SOLD ? 'Sản phẩm đã bán' : 'Nhắn tin chốt đơn'}
                            </Link>
                        ) : (
                             // --- PANEL QUẢN LÝ CHO CHỦ SHOP ---
                             <div className="bg-white p-3 rounded-lg border border-indigo-100 shadow-inner">
                                <p className="text-xs text-gray-500 font-bold mb-2 uppercase text-center">Quản lý trạng thái đơn hàng</p>
                                <div className="grid grid-cols-3 gap-2">
                                    <button onClick={() => handleUpdateStatus(ProductStatus.AVAILABLE)} className={`py-2 text-xs font-bold rounded ${product.status === ProductStatus.AVAILABLE ? 'bg-green-600 text-white ring-2 ring-green-300' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>🟢 Đang bán</button>
                                    <button onClick={() => handleUpdateStatus(ProductStatus.PENDING)} className={`py-2 text-xs font-bold rounded ${product.status === ProductStatus.PENDING ? 'bg-yellow-400 text-yellow-900 ring-2 ring-yellow-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>🟡 Đang GD</button>
                                    <button onClick={() => handleUpdateStatus(ProductStatus.SOLD)} className={`py-2 text-xs font-bold rounded ${product.status === ProductStatus.SOLD ? 'bg-red-600 text-white ring-2 ring-red-300' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>🔴 Đã Bán</button>
                                </div>
                             </div>
                        )}
                    </div>
                </div>
              )}
            </div>
          </div>

          {/* SẢN PHẨM TƯƠNG TỰ */}
          {relatedProducts.length > 0 && (
              <div className="mt-16 border-t border-gray-200 pt-10">
                  <div className="flex justify-between items-center mb-6">
                      <h2 className="text-xl font-bold text-gray-900">Có thể bạn cũng cần</h2>
                      <Link to={`/market?cat=${product.category}`} className="text-indigo-600 text-sm hover:underline flex items-center font-medium">Xem thêm <ArrowRight className="w-4 h-4 ml-1"/></Link>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                      {relatedProducts.map(p => (
                          <ProductCard key={p.id} product={p} />
                      ))}
                  </div>
              </div>
          )}

          {/* Comments Section */}
          <div className="mt-16 border-t border-gray-200 pt-10 max-w-4xl">
              <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
                  Hỏi đáp công khai <span className="ml-2 bg-gray-100 text-gray-600 text-sm py-0.5 px-2 rounded-full">{comments.length + comments.reduce((acc, c) => acc + (c.replies?.length||0), 0)}</span>
              </h3>

              {currentUser ? (
                  <form onSubmit={(e) => handleSubmit(e)} className="flex gap-4 mb-8">
                      <img src={currentUser.avatar} className="w-10 h-10 rounded-full border border-gray-200 object-cover" />
                      <div className="flex-1 relative">
                          <input type="text" className="w-full border border-gray-300 rounded-full py-3 px-5 pr-12 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm" placeholder="Bạn thắc mắc gì về sản phẩm này?" value={newComment} onChange={(e) => setNewComment(e.target.value)} />
                          <button disabled={!newComment.trim() || submitting} className="absolute right-2 top-1.5 p-1.5 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 transition-colors"><Send className="w-4 h-4" /></button>
                      </div>
                  </form>
              ) : <div className="bg-gray-50 p-4 rounded-lg text-center mb-8 border border-dashed border-gray-300"><Link to="/auth" className="text-indigo-600 font-bold hover:underline">Đăng nhập</Link> để bình luận.</div>}
              
              <div className="space-y-2">
                  {comments.length === 0 ? <p className="text-gray-400 italic">Chưa có câu hỏi nào.</p> : comments.map(comment => <CommentItem key={comment.id} comment={comment} />)}
              </div>
          </div>
      </div>
    </div>
  );
};

export default ProductDetailPage;