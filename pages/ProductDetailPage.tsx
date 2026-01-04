import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Heart, MessageCircle, Share2, Flag, ArrowLeft,
  ChevronRight, MapPin, Clock, Eye, ShieldCheck,
  Star, Box, CheckCircle2, ShoppingBag // Đã bỏ ShoppingBag ở nút mua, giữ lại icon nếu cần
} from 'lucide-react';
import { Product, User, Comment } from '../types'; // Đảm bảo import đúng types
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import ProductCard from '../components/ProductCard';

// ============================================================================
// 1. HELPERS & STYLES
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

const Animations = () => (
  <style>{`
    :root { --ease-out: cubic-bezier(0.16, 1, 0.3, 1); }
    @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
    .animate-enter { animation: fadeInUp 0.6s var(--ease-out) forwards; opacity: 0; }
    .stagger-1 { animation-delay: 100ms; }
    .stagger-2 { animation-delay: 200ms; }
    .hover-scale { transition: transform 0.2s; }
    .hover-scale:hover { transform: scale(1.02); }
    .glass-nav { background: rgba(255,255,255,0.9); backdrop-filter: blur(10px); border-bottom: 1px solid rgba(0,0,0,0.05); }
    .hide-scrollbar::-webkit-scrollbar { display: none; }
  `}</style>
);

// ============================================================================
// 2. COMPONENTS
// ============================================================================

const InteractiveGallery = ({ images, status }: { images: string[], status: any }) => {
  const [active, setActive] = useState(0);
  return (
    <div className="space-y-4">
      <div className="relative aspect-[4/3] bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-sm cursor-zoom-in group">
        <img src={images[active]} alt="Product" className="w-full h-full object-contain p-4 transition-transform duration-500 group-hover:scale-105"/>
        {status === 'sold' && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-10">
            <span className="text-white font-black text-4xl border-4 border-white px-8 py-2 uppercase tracking-widest -rotate-12">Đã bán</span>
          </div>
        )}
      </div>
      {images.length > 1 && (
        <div className="flex gap-3 overflow-x-auto pb-2 hide-scrollbar">
          {images.map((img, i) => (
            <button key={i} onClick={() => setActive(i)} className={`w-20 h-20 flex-shrink-0 rounded-2xl overflow-hidden border-2 transition-all ${active === i ? 'border-blue-600 shadow-md' : 'border-transparent opacity-60 hover:opacity-100'}`}>
              <img src={img} className="w-full h-full object-cover"/>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const SellerInfo = ({ seller }: { seller: User }) => {
  const navigate = useNavigate();
  return (
    <div onClick={() => navigate(`/profile/${seller.id}`)} className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-pointer group">
      <div className="relative">
        <img src={seller.avatar || 'https://via.placeholder.com/150'} className="w-14 h-14 rounded-full object-cover border-2 border-white shadow-sm"/>
        {seller.isVerified && <CheckCircle2 size={16} className="absolute -bottom-1 -right-1 text-white bg-blue-500 rounded-full border-2 border-white"/>}
      </div>
      <div className="flex-1">
        <h4 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{seller.name}</h4>
        <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
          <span className="flex items-center gap-1 text-yellow-500 font-bold"><Star size={12} fill="currentColor"/> 4.9</span>
          <span className="w-1 h-1 bg-gray-300 rounded-full"/>
          <span>Phản hồi nhanh</span>
        </div>
      </div>
      <ChevronRight size={20} className="text-gray-300 group-hover:text-blue-600 transition-colors"/>
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
  
  const [product, setProduct] = useState<Product | null>(null);
  const [seller, setSeller] = useState<User | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLiked, setIsLiked] = useState(false);

  const fetchData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const { data: pData } = await supabase.from('products').select('*').eq('id', id).single();
      if (!pData) throw new Error("Not found");
      
      const mappedProduct: Product = { ...pData, sellerId: pData.seller_id, images: pData.images || [], status: pData.status, postedAt: pData.posted_at };
      setProduct(mappedProduct);

      const [sellerRes, relatedRes, likeRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', mappedProduct.sellerId).single(),
        supabase.from('products').select('*').eq('category', mappedProduct.category).neq('id', id).limit(4),
        currentUser ? supabase.from('saved_products').select('id').eq('user_id', currentUser.id).eq('product_id', id).maybeSingle() : Promise.resolve({ data: null })
      ]);

      if (sellerRes.data) setSeller({ ...sellerRes.data, id: sellerRes.data.id, avatar: sellerRes.data.avatar_url, isVerified: sellerRes.data.is_verified });
      setRelated(relatedRes.data?.map((p: any) => ({ ...p, sellerId: p.seller_id, images: p.images || [], status: p.status })) || []);
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

  const handleLike = async () => {
    if (!currentUser) return navigate('/auth');
    setIsLiked(!isLiked);
    try {
      if (isLiked) await supabase.from('saved_products').delete().eq('user_id', currentUser.id).eq('product_id', id);
      else await supabase.from('saved_products').insert({ user_id: currentUser.id, product_id: id });
    } catch { setIsLiked(!isLiked); }
  };

  const copyLink = () => { navigator.clipboard.writeText(window.location.href); addToast("Đã sao chép link", "success"); };

  if (loading) return <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"/></div>;
  if (!product) return null;

  const isOwner = currentUser?.id === product.sellerId;

  return (
    <div className="min-h-screen font-sans text-slate-800 pb-20 selection:bg-blue-100 selection:text-blue-900">
      <Animations />
      
      {/* Header */}
      <div className="sticky top-0 z-50 glass-nav transition-all">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 animate-enter">
            <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600"><ArrowLeft size={20}/></button>
            <div className="hidden md:flex items-center gap-2 text-sm font-medium text-gray-500">
              <Link to="/market" className="hover:text-blue-600 transition-colors">Market</Link>
              <ChevronRight size={14}/>
              <span className="text-gray-900 truncate max-w-[200px] font-bold">{product.title}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 animate-enter stagger-1">
            <button onClick={copyLink} className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors"><Share2 size={20}/></button>
            <button className="p-2 hover:bg-red-50 text-gray-500 hover:text-red-500 rounded-full transition-colors"><Flag size={20}/></button>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          
          {/* Left: Gallery & Content */}
          <div className="lg:col-span-7 space-y-10 animate-enter">
            <InteractiveGallery images={product.images} status={product.status} />
            
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
              <h3 className="text-xl font-black text-gray-900 mb-6">Mô tả chi tiết</h3>
              <div className="prose prose-slate max-w-none text-gray-600 leading-relaxed whitespace-pre-wrap mb-8">
                {product.description || "Chưa có mô tả chi tiết."}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                   <p className="text-xs font-bold text-gray-400 uppercase mb-1">Tình trạng</p>
                   <p className="font-bold text-gray-900 flex items-center gap-2"><Star size={16} className="text-yellow-500 fill-yellow-500"/> {product.condition}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                   <p className="text-xs font-bold text-gray-400 uppercase mb-1">Giao dịch</p>
                   <p className="font-bold text-gray-900 flex items-center gap-2"><Box size={16} className="text-blue-500"/> {product.tradeMethod === 'direct' ? 'Trực tiếp' : 'Ship COD'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Info & Actions */}
          <div className="lg:col-span-5 relative">
            <div className="sticky top-24 space-y-6 animate-enter stagger-2">
              <div className="bg-white rounded-[2.5rem] p-8 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] border border-gray-100 relative overflow-hidden">
                <div className="flex justify-between items-start mb-6">
                  <span className="bg-blue-50 text-blue-700 text-xs font-black px-3 py-1.5 rounded-lg uppercase tracking-wider">{product.category}</span>
                  <button onClick={handleLike} className="p-2 hover:bg-gray-50 rounded-full transition-all active:scale-90 group">
                    <Heart size={26} className={isLiked ? 'fill-red-500 text-red-500' : 'text-gray-300 group-hover:text-red-400'}/>
                  </button>
                </div>

                <h1 className="text-3xl font-black text-gray-900 leading-tight mb-4">{product.title}</h1>
                
                <div className="flex items-center gap-5 text-sm font-medium text-gray-500 mb-8 border-b border-gray-100 pb-6">
                  <div className="flex items-center gap-1.5"><Clock size={16} className="text-blue-500"/> {timeAgo(product.postedAt)}</div>
                  <div className="flex items-center gap-1.5"><MapPin size={16} className="text-blue-500"/> TP.HCM</div>
                  <div className="flex items-center gap-1.5"><Eye size={16} className="text-blue-500"/> {product.view_count}</div>
                </div>

                <div className="mb-8">
                  <div className="flex items-baseline gap-3">
                    <span className="text-5xl font-black text-blue-700 tracking-tight">
                      {product.price === 0 ? 'FREE' : formatCurrency(product.price)}
                    </span>
                    {product.price > 0 && <span className="text-xl text-gray-300 line-through font-bold">{formatCurrency(product.price * 1.2)}</span>}
                  </div>
                </div>

                {/* --- CHỈ CÓ NÚT CHAT --- */}
                <div className="flex flex-col gap-3">
                  {isOwner ? (
                    <button onClick={() => navigate(`/post-item?edit=${product.id}`)} className="w-full py-4 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-2xl font-bold text-lg transition-all hover-scale">
                      Chỉnh sửa bài đăng
                    </button>
                  ) : (
                    <button 
                      onClick={() => navigate(`/chat?partnerId=${seller?.id}&productId=${product.id}`)}
                      disabled={product.status === 'sold'}
                      className="w-full py-4 bg-[#00418E] hover:bg-[#003370] text-white rounded-2xl font-bold text-lg shadow-xl shadow-blue-900/10 transition-all hover-scale flex items-center justify-center gap-3 disabled:bg-gray-300 disabled:shadow-none"
                    >
                      <MessageCircle size={22} className="fill-current"/> 
                      {product.status === 'sold' ? 'Đã bán' : 'Nhắn tin với người bán'}
                    </button>
                  )}
                </div>
              </div>

              {seller && <SellerInfo seller={seller} />}

              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-3xl border border-blue-100">
                <h4 className="font-bold text-blue-900 flex items-center gap-2 mb-3"><ShieldCheck size={18}/> An toàn là trên hết</h4>
                <p className="text-sm text-blue-800/80 leading-relaxed">
                  Hãy trao đổi kỹ càng qua tin nhắn trước khi gặp mặt. Không chuyển khoản cọc trước khi nhận hàng.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Related Products */}
        {related.length > 0 && (
          <div className="mt-24 border-t border-gray-200 pt-16 animate-enter stagger-2">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-2xl font-black text-gray-900">Sản phẩm tương tự</h3>
              <Link to="/market" className="text-blue-600 font-bold hover:underline flex items-center gap-1">Xem thêm <ChevronRight size={16}/></Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {related.map(p => <ProductCard key={p.id} product={p} />)}
            </div>
          </div>
        )}
      </main>

      {/* Mobile Sticky Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-lg border-t border-gray-200 p-4 lg:hidden z-50 animate-enter">
        <div className="flex gap-3">
           <button 
             onClick={() => navigate(`/chat?partnerId=${seller?.id}&productId=${product.id}`)} 
             disabled={product.status === 'sold'}
             className="flex-1 bg-[#00418E] text-white py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-transform disabled:bg-gray-300"
           >
             <MessageCircle size={20} className="fill-current"/> Chat Ngay
           </button>
           <button onClick={handleLike} className={`w-14 flex items-center justify-center rounded-xl border-2 transition-all active:scale-95 ${isLiked ? 'border-red-500 bg-red-50 text-red-500' : 'border-gray-200 text-gray-400 bg-white'}`}>
              <Heart size={24} className={isLiked ? 'fill-current' : ''}/>
           </button>
        </div>
      </div>
    </div>
  );
};

export default ProductDetailPage;
