import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { MapPin, Box, ShieldCheck, MessageCircle, AlertCircle, Send, Trash2, ArrowRight } from 'lucide-react'; // Thêm ArrowRight
import { Product, User, Comment } from '../types';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import ProductCard from '../components/ProductCard'; // Import ProductCard để tái sử dụng

const ProductDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user: currentUser } = useAuth();
  
  const [product, setProduct] = useState<Product | null>(null);
  const [seller, setSeller] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Comments & Related Products State
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [replyContent, setReplyContent] = useState('');
  const [activeReplyId, setActiveReplyId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]); // <--- STATE MỚI

  useEffect(() => {
    if (id) {
        fetchProductAndSeller();
        fetchComments();
        // Trigger lại khi đổi id (chuyển sang xem sản phẩm khác)
        window.scrollTo(0, 0);
        
        // Realtime comments
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
            id: pData.id, sellerId: pData.seller_id, title: pData.title, description: pData.description, price: pData.price, category: pData.category, condition: pData.condition, images: pData.images || [], tradeMethod: pData.trade_method, postedAt: pData.posted_at, isLookingToBuy: pData.is_looking_to_buy
        };
        setProduct(mappedProduct);

        // Fetch Seller
        const { data: uData } = await supabase.from('profiles').select('*').eq('id', mappedProduct.sellerId).single();
        if (uData) setSeller({ id: uData.id, name: uData.name, studentId: uData.student_id, avatar: uData.avatar_url, isVerified: uData.is_verified, email: uData.email, role: uData.role });

        // --- FETCH SẢN PHẨM TƯƠNG TỰ (NÂNG CẤP) ---
        // Lấy 4 sản phẩm cùng Category nhưng KHÁC ID hiện tại
        const { data: relatedData } = await supabase
            .from('products')
            .select('*')
            .eq('category', mappedProduct.category)
            .neq('id', mappedProduct.id) // Loại trừ chính nó
            .eq('is_sold', false) // Chỉ lấy hàng chưa bán
            .limit(4);
            
        if (relatedData) {
            setRelatedProducts(relatedData.map((item: any) => ({
                id: item.id, sellerId: item.seller_id, title: item.title, description: item.description, price: item.price, category: item.category, condition: item.condition, images: item.images || [], tradeMethod: item.trade_method, postedAt: item.posted_at, isLookingToBuy: item.is_looking_to_buy
            })));
        }
        // ------------------------------------------

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
          
          // Xây dựng cây comment (Parent -> Children)
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

          // Đảo ngược lại để comment mới nhất lên đầu
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

  // Component render 1 dòng comment
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

  if (loading) return <div className="py-20 text-center">Đang tải...</div>;
  if (!product) return <div className="py-20 text-center text-red-500">Sản phẩm không tồn tại</div>;

  return (
    <div className="bg-white min-h-screen pb-20">
      <div className="pt-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
          {/* Main Content */}
          <div className="lg:grid lg:grid-cols-2 lg:gap-x-8">
            <div className="aspect-w-4 aspect-h-3 rounded-lg bg-gray-100 overflow-hidden border border-gray-200">
              <img src={product.images[0]} alt={product.title} className="w-full h-full object-contain" />
            </div>
            <div className="mt-10 px-4 sm:px-0 sm:mt-16 lg:mt-0">
              <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">{product.title}</h1>
              <p className="text-3xl text-indigo-600 mt-3">{product.price.toLocaleString('vi-VN')} đ</p>
              <div className="mt-6 text-base text-gray-700 space-y-6 whitespace-pre-line" dangerouslySetInnerHTML={{ __html: product.description }} />
              
              <div className="mt-8 border-t border-gray-200 pt-8">
                 <div className="flex justify-between mb-2"><span className="font-medium">Danh mục:</span><span>{product.category}</span></div>
                 <div className="flex justify-between"><span className="font-medium">Tình trạng:</span><span className="bg-gray-100 px-2 rounded text-sm">{product.condition}</span></div>
              </div>

              {seller && (
                <div className="mt-8 bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="flex items-center justify-between">
                        <Link to={`/profile/${seller.id}`} className="flex items-center group">
                            <img className="h-12 w-12 rounded-full border border-white shadow-sm object-cover" src={seller.avatar} />
                            <div className="ml-4">
                                <h4 className="font-bold text-gray-900 group-hover:text-indigo-600">{seller.name} {seller.isVerified && <ShieldCheck className="w-4 h-4 text-blue-600 inline"/>}</h4>
                                <p className="text-xs text-gray-500">Xem trang cá nhân &rarr;</p>
                            </div>
                        </Link>
                    </div>
                    <div className="mt-4"><Link to={`/chat?partnerId=${seller.id}`} className="block w-full bg-indigo-600 text-white text-center py-3 rounded-md font-medium hover:bg-indigo-700 flex justify-center items-center"><MessageCircle className="w-5 h-5 mr-2" /> Nhắn tin riêng</Link></div>
                </div>
              )}
            </div>
          </div>

          {/* --- KHU VỰC SẢN PHẨM TƯƠNG TỰ (MỚI) --- */}
          {relatedProducts.length > 0 && (
              <div className="mt-16 border-t border-gray-200 pt-10">
                  <div className="flex justify-between items-center mb-6">
                      <h2 className="text-xl font-bold text-gray-900">Sản phẩm tương tự</h2>
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