import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Heart, MessageCircle, Share2, Flag, ArrowLeft,
  ChevronRight, MapPin, Clock, Eye, ShieldCheck,
  MoreHorizontal, Star, Box, CheckCircle2, User as UserIcon
} from 'lucide-react';
import { Product, User, Comment, ProductStatus } from '../types';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import ProductCard from '../components/ProductCard';

// ============================================================================
// 1. HELPERS & UTILS
// ============================================================================

const formatCurrency = (amount: number) => 
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);

const timeAgo = (date: string | Date) => {
  const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + " năm trước";
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + " tháng trước";
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + " ngày trước";
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + " giờ trước";
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + " phút trước";
  return "Vừa xong";
};

// ============================================================================
// 2. MINIMALIST COMPONENTS
// ============================================================================

// --- Gallery dạng lưới dọc (Giống Airbnb/Pinterest) ---
const VerticalGallery = ({ images, status }: { images: string[], status: string }) => {
  const [activeImage, setActiveImage] = useState(images[0]);

  return (
    <div className="flex flex-col gap-4">
      {/* Ảnh chính to bản */}
      <div className="relative aspect-[4/3] bg-gray-100 rounded-xl overflow-hidden cursor-zoom-in border border-gray-200">
        <img src={activeImage} alt="Main" className="w-full h-full object-contain mix-blend-multiply" />
        {status === 'sold' && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="text-white font-bold text-3xl uppercase tracking-widest border-4 border-white px-6 py-2">Đã bán</span>
          </div>
        )}
      </div>

      {/* Grid ảnh nhỏ bên dưới */}
      {images.length > 1 && (
        <div className="grid grid-cols-4 gap-4">
          {images.map((img, idx) => (
            <div 
              key={idx} 
              onMouseEnter={() => setActiveImage(img)}
              className={`aspect-square rounded-lg bg-gray-50 border cursor-pointer overflow-hidden transition-all ${activeImage === img ? 'ring-2 ring-black border-transparent' : 'border-gray-200 hover:border-gray-400'}`}
            >
              <img src={img} alt={`thumb-${idx}`} className="w-full h-full object-cover" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// --- Thông tin người bán (Gọn gàng) ---
const SellerStrip = ({ seller }: { seller: User }) => {
  const navigate = useNavigate();
  return (
    <div 
      onClick={() => navigate(`/profile/${seller.id}`)}
      className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 hover:border-gray-300 hover:bg-gray-50 transition-all cursor-pointer group"
    >
      <div className="relative">
        <img src={seller.avatar || 'https://via.placeholder.com/150'} className="w-14 h-14 rounded-full object-cover border border-gray-200" alt={seller.name} />
        {seller.isVerified && <div className="absolute -bottom-1 -right-1 bg-blue-600 text-white rounded-full p-0.5 border-2 border-white"><CheckCircle2 size={10}/></div>}
      </div>
      <div className="flex-1">
        <h4 className="font-bold text-gray-900 group-hover:underline decoration-2 underline-offset-2">{seller.name}</h4>
        <div className="flex items-center gap-3 text-sm text-gray-500 mt-0.5">
          <span className="flex items-center gap-1 text-yellow-600 font-medium"><Star size={12} fill="currentColor"/> 4.9</span>
          <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
          <span>Phản hồi 98%</span>
        </div>
      </div>
      <div className="p-2 bg-white rounded-full border border-gray-200 text-gray-400 group-hover:text-black transition-colors">
        <ChevronRight size={20}/>
      </div>
    </div>
  );
};

// ============================================================================
// 3. MAIN PAGE
// ============================================================================

const ProductDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const { addToast } = useToast();
  
  // Data State
  const [product, setProduct] = useState<Product | null>(null);
  const [seller, setSeller] = useState<User | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [related, setRelated] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  
  // UI State
  const [commentInput, setCommentInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch Logic (Giữ nguyên logic chuẩn)
  const fetchData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      // 1. Get Product
      const { data: pData } = await supabase.from('products').select('*').eq('id', id).single();
      if (!pData) throw new Error("Not found");
      
      const mappedProduct: Product = { ...pData, sellerId: pData.seller_id, images: pData.images || [], status: pData.status, postedAt: pData.posted_at };
      setProduct(mappedProduct);

      // 2. Parallel Fetch
      const [sellerRes, commentRes, relatedRes, likeRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', mappedProduct.sellerId).single(),
        supabase.from('comments').select(`*, user:user_id(name, avatar_url)`).eq('product_id', id).order('created_at', { ascending: false }),
        supabase.from('products').select('*').eq('category', mappedProduct.category).neq('id', id).limit(4),
        currentUser ? supabase.from('saved_products').select('id').eq('user_id', currentUser.id).eq('product_id', id).maybeSingle() : Promise.resolve({ data: null })
      ]);

      if (sellerRes.data) setSeller({ ...sellerRes.data, id: sellerRes.data.id, avatar: sellerRes.data.avatar_url, isVerified: sellerRes.data.is_verified });
      setComments(commentRes.data || []);
      setRelated(relatedRes.data?.map(p => ({ ...p, sellerId: p.seller_id, images: p.images || [], status: p.status } as Product)) || []);
      setIsLiked(!!likeRes.data);
      supabase.rpc('increment_view_count', { product_id: id });

    } catch (err) {
      addToast("Không tìm thấy sản phẩm", "error");
      navigate('/market');
    } finally {
      setLoading(false);
    }
  }, [id, currentUser, navigate, addToast]);

  useEffect(() => { fetchData(); window.scrollTo(0, 0); }, [fetchData]);

  // Actions
  const handleLike = async () => {
    if (!currentUser) return navigate('/auth');
    setIsLiked(!isLiked);
    try {
      if (isLiked) await supabase.from('saved_products').delete().eq('user_id', currentUser.id).eq('product_id', id);
      else await supabase.from('saved_products').insert({ user_id: currentUser.id, product_id: id });
    } catch { setIsLiked(!isLiked); }
  };

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return navigate('/auth');
    if (!commentInput.trim()) return;
    setIsSubmitting(true);
    const { error } = await supabase.from('comments').insert({ product_id: id, user_id: currentUser.id, content: commentInput.trim() });
    if (!error) { setCommentInput(''); fetchData(); addToast("Đã gửi bình luận", "success"); }
    setIsSubmitting(false);
  };

  const copyLink = () => { navigator.clipboard.writeText(window.location.href); addToast("Đã sao chép link", "success"); };

  if (loading) return <div className="min-h-screen bg-white flex items-center justify-center"><div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin"/></div>;
  if (!product) return null;

  const isOwner = currentUser?.id === product.sellerId;

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans pb-20">
      
      {/* --- HEADER ĐƠN GIẢN (Minimal Header) --- */}
      <div className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><ArrowLeft size={20}/></button>
            <div className="hidden md:flex items-center gap-2 text-sm text-gray-500 font-medium">
              <Link to="/market" className="hover:text-black transition-colors">Market</Link>
              <ChevronRight size={14}/>
              <span className="text-black truncate max-w-[200px]">{product.title}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={copyLink} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500 hover:text-black"><Share2 size={20}/></button>
            <button className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500 hover:text-red-500"><Flag size={20}/></button>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-8 md:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          
          {/* --- LEFT: CONTENT SCROLL (Ảnh & Mô tả) --- */}
          <div className="lg:col-span-7 space-y-12">
            
            {/* Gallery */}
            <VerticalGallery images={product.images} status={product.status as string} />

            {/* Description Text */}
            <div className="border-t border-gray-100 pt-10">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2">Mô tả sản phẩm</h3>
              <div className="prose prose-slate max-w-none text-gray-600 leading-relaxed whitespace-pre-wrap">
                {product.description || "Người bán chưa cung cấp mô tả chi tiết."}
              </div>
              
              {/* Product Attributes Grid */}
              <div className="grid grid-cols-2 gap-4 mt-8">
                <div className="p-4 bg-gray-50 rounded-xl">
                  <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Tình trạng</span>
                  <span className="font-bold text-gray-900">{product.condition}</span>
                </div>
                <div className="p-4 bg-gray-50 rounded-xl">
                  <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Danh mục</span>
                  <span className="font-bold text-gray-900">{product.category}</span>
                </div>
                <div className="p-4 bg-gray-50 rounded-xl">
                  <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Giao dịch</span>
                  <span className="font-bold text-gray-900">{product.tradeMethod === 'direct' ? 'Trực tiếp' : 'Ship COD'}</span>
                </div>
                <div className="p-4 bg-gray-50 rounded-xl">
                  <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Khu vực</span>
                  <span className="font-bold text-gray-900">TP. Hồ Chí Minh</span>
                </div>
              </div>
            </div>

            {/* Comments (Minimal) */}
            <div className="border-t border-gray-100 pt-10">
              <h3 className="text-xl font-bold mb-6">Hỏi đáp ({comments.length})</h3>
              
              {currentUser ? (
                <form onSubmit={handleComment} className="flex gap-4 mb-10">
                  <img src={currentUser.avatar} className="w-10 h-10 rounded-full bg-gray-100" alt="me"/>
                  <div className="flex-1">
                    <input 
                      value={commentInput}
                      onChange={e => setCommentInput(e.target.value)}
                      placeholder="Đặt câu hỏi cho người bán..."
                      className="w-full bg-gray-50 border-0 rounded-xl px-4 py-3 focus:ring-2 focus:ring-black transition-all"
                    />
                    <div className="flex justify-end mt-2">
                      <button disabled={!commentInput.trim()} className="bg-black text-white px-6 py-2 rounded-lg font-bold text-sm hover:bg-gray-800 disabled:opacity-50 transition-colors">
                        Gửi câu hỏi
                      </button>
                    </div>
                  </div>
                </form>
              ) : (
                <div className="bg-gray-50 p-4 rounded-xl text-center text-sm font-medium mb-8">
                  <Link to="/auth" className="underline font-bold">Đăng nhập</Link> để bình luận.
                </div>
              )}

              <div className="space-y-8">
                {comments.map(c => (
                  <div key={c.id} className="flex gap-4">
                    <img src={c.userAvatar} className="w-10 h-10 rounded-full bg-gray-100 border border-gray-100" alt="u"/>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-sm">{c.userName}</span>
                        <span className="text-xs text-gray-400">{timeAgo(c.createdAt)}</span>
                      </div>
                      <p className="text-gray-600 text-sm leading-relaxed">{c.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* --- RIGHT: STICKY INFO (Thông tin & Hành động) --- */}
          <div className="lg:col-span-5 relative">
            <div className="sticky top-24 space-y-8">
              
              {/* Main Product Info */}
              <div>
                <div className="flex justify-between items-start mb-4">
                  <span className="text-sm font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full uppercase tracking-wide text-[10px]">{product.category}</span>
                  <button onClick={handleLike} className="group outline-none">
                    <Heart size={28} className={`transition-all ${isLiked ? 'fill-red-500 text-red-500' : 'text-gray-300 group-hover:text-black'}`} />
                  </button>
                </div>

                <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 leading-tight mb-4">{product.title}</h1>
                
                <div className="flex items-center gap-6 text-sm font-medium text-gray-500 mb-8 pb-8 border-b border-gray-100">
                  <div className="flex items-center gap-2"><Clock size={16}/> {timeAgo(product.postedAt)}</div>
                  <div className="flex items-center gap-2"><Eye size={16}/> {product.view_count} lượt xem</div>
                  <div className="flex items-center gap-2"><MapPin size={16}/> TP.HCM</div>
                </div>

                <div className="mb-8">
                   <p className="text-gray-500 text-sm font-bold mb-1 uppercase tracking-wider">Giá bán</p>
                   <div className="flex items-baseline gap-3">
                      <span className="text-5xl font-black text-gray-900 tracking-tight">
                        {product.price === 0 ? 'Miễn phí' : formatCurrency(product.price)}
                      </span>
                      {product.price > 0 && <span className="text-xl text-gray-300 line-through decoration-2 font-bold">{formatCurrency(product.price * 1.2)}</span>}
                   </div>
                </div>

                {/* Seller Section */}
                {seller && <SellerStrip seller={seller} />}
              </div>

              {/* Action Buttons */}
              <div className="space-y-3 pt-4">
                {isOwner ? (
                  <button onClick={() => navigate(`/post-item?edit=${product.id}`)} className="w-full py-4 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-xl font-bold text-lg transition-all">
                    Chỉnh sửa bài đăng
                  </button>
                ) : (
                  <>
                    <button 
                      onClick={() => navigate(`/chat?partnerId=${seller?.id}`)}
                      disabled={product.status === 'sold'}
                      className="w-full py-4 bg-black text-white rounded-xl font-bold text-lg hover:bg-gray-800 transition-all shadow-xl shadow-gray-200 active:scale-95 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      <MessageCircle size={20}/>
                      {product.status === 'sold' ? 'Đã bán' : 'Chat với người bán'}
                    </button>
                    {product.status !== 'sold' && (
                      <button onClick={() => addToast("Chức năng đang phát triển", "info")} className="w-full py-4 bg-white border-2 border-black text-black rounded-xl font-bold text-lg hover:bg-gray-50 transition-all active:scale-95">
                        Mua ngay
                      </button>
                    )}
                  </>
                )}
              </div>

              {/* Safety Note */}
              <div className="bg-blue-50 p-5 rounded-xl border border-blue-100 text-sm text-blue-800 flex gap-3">
                 <ShieldCheck className="shrink-0 mt-0.5"/>
                 <div>
                    <p className="font-bold mb-1">Giao dịch an toàn</p>
                    <p className="opacity-80">Không chuyển khoản trước. Kiểm tra kỹ sách trước khi thanh toán. Nên giao dịch tại nơi công cộng.</p>
                 </div>
              </div>

            </div>
          </div>
        </div>

        {/* --- RELATED PRODUCTS --- */}
        {related.length > 0 && (
          <div className="mt-24 border-t border-gray-100 pt-12">
            <div className="flex justify-between items-end mb-8">
              <h3 className="text-2xl font-bold text-gray-900">Sản phẩm tương tự</h3>
              <Link to="/market" className="text-gray-500 font-bold text-sm hover:text-black hover:underline">Xem tất cả</Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {related.map(p => <ProductCard key={p.id} product={p} />)}
            </div>
          </div>
        )}
      </main>

      {/* MOBILE BAR (Sticky Bottom) */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 lg:hidden z-50">
        <div className="flex gap-3">
           <button 
              onClick={() => navigate(`/chat?partnerId=${seller?.id}`)} 
              className="flex-1 bg-black text-white font-bold py-3.5 rounded-xl active:scale-95 transition-transform"
              disabled={product.status === 'sold'}
           >
              Chat Ngay
           </button>
           <button onClick={handleLike} className={`w-14 flex items-center justify-center border-2 rounded-xl transition-colors ${isLiked ? 'border-red-500 text-red-500 bg-red-50' : 'border-gray-200 text-gray-400'}`}>
              <Heart size={24} className={isLiked ? 'fill-current' : ''} />
           </button>
        </div>
      </div>
    </div>
  );
};

export default ProductDetailPage;
