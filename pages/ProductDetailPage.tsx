import React, { 
  useEffect, useState, useMemo, useRef, useCallback, useReducer 
} from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import {
  ShieldCheck, MessageCircle, Share2, Flag, Heart,
  ShieldAlert, Loader2, ShoppingBag, Store, ArrowLeft,
  ChevronRight, X, Clock, Box, MapPin, CheckCircle2,
  AlertCircle, Copy, Send, Star, Eye, Gift, 
  Maximize2, ChevronLeft, QrCode, AlertTriangle,
  Sparkles, Zap, Award, ThumbsUp, 
  MoreHorizontal, CornerUpRight, Hash, BadgeCheck,
  CreditCard, Truck, RefreshCw
} from 'lucide-react';
import { Product, User, Comment, ProductStatus } from '../types';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import ProductCard from '../components/ProductCard'; // Import component thẻ sản phẩm

// ============================================================================
// 1. UTILS & TYPES
// ============================================================================

const CURRENCY_LOCALE = 'vi-VN';

interface RichUser extends User {
  joinDate: string;
  responseRate: number;
  isOnline?: boolean;
}

interface RichProduct extends Product {
  view_count: number;
  original_price?: number;
  tags: string[];
}

const formatCurrency = (amount: number) => 
  new Intl.NumberFormat(CURRENCY_LOCALE, { style: 'currency', currency: 'VND' }).format(amount);

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

const clsx = (...classes: (string | undefined | null | false)[]) => classes.filter(Boolean).join(' ');

// ============================================================================
// 2. VISUAL ENGINE (CSS)
// ============================================================================

const VisualEngine = () => (
  <style>{`
    :root {
      --primary: #4F46E5;
      --secondary: #EC4899;
      --glass: rgba(255, 255, 255, 0.7);
      --glass-border: rgba(255, 255, 255, 0.8);
    }

    body {
      background-color: #F3F4F6;
      background-image: 
        radial-gradient(at 0% 0%, hsla(253,16%,7%,0.05) 0, transparent 50%), 
        radial-gradient(at 50% 100%, hsla(225,39%,30%,0.05) 0, transparent 50%);
    }

    /* --- Mesh Gradient Background --- */
    .mesh-bg {
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      z-index: -1;
      background: 
        radial-gradient(at 10% 10%, rgba(79, 70, 229, 0.15) 0px, transparent 50%),
        radial-gradient(at 90% 10%, rgba(236, 72, 153, 0.15) 0px, transparent 50%),
        radial-gradient(at 50% 50%, rgba(255, 255, 255, 0.8) 0px, transparent 100%);
      filter: blur(80px);
    }

    /* --- Glassmorphism --- */
    .glass-panel {
      background: var(--glass);
      backdrop-filter: blur(24px);
      -webkit-backdrop-filter: blur(24px);
      border: 1px solid var(--glass-border);
      box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.05);
    }

    .glass-card-hover {
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .glass-card-hover:hover {
      background: rgba(255, 255, 255, 0.9);
      transform: translateY(-4px);
      box-shadow: 0 20px 40px -10px rgba(0,0,0,0.1);
    }

    /* --- Animations --- */
    @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
    @keyframes slideUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes scaleIn { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }
    
    .animate-float { animation: float 6s ease-in-out infinite; }
    .animate-enter { animation: slideUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; opacity: 0; }
    
    /* --- Typography & Elements --- */
    .hero-title {
      font-size: 2.5rem;
      line-height: 1.1;
      letter-spacing: -0.02em;
      background: linear-gradient(135deg, #111827 0%, #4B5563 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .hide-scrollbar::-webkit-scrollbar { display: none; }
  `}</style>
);

// ============================================================================
// 3. UI COMPONENTS
// ============================================================================

// 3.1 Gallery hoành tráng (Hero Gallery)
const HeroGallery = ({ images, status, onOpenLightbox }: { images: string[], status: ProductStatus, onOpenLightbox: () => void }) => {
  const [active, setActive] = useState(0);

  return (
    <div className="flex flex-col gap-6">
      <div 
        className="relative aspect-square md:aspect-[4/3] rounded-[2.5rem] bg-white border border-white shadow-2xl shadow-indigo-100 overflow-hidden cursor-zoom-in group transition-all hover:shadow-indigo-200"
        onClick={onOpenLightbox}
      >
        <img 
          src={images[active]} 
          alt="Product Main" 
          className="w-full h-full object-contain p-8 transition-transform duration-700 ease-out group-hover:scale-105"
        />
        
        {status === 'sold' && (
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm z-20 flex items-center justify-center">
             <div className="border-[6px] border-white text-white text-6xl font-black uppercase -rotate-12 px-10 py-4 tracking-widest animate-pulse">SOLD</div>
          </div>
        )}

        <div className="absolute bottom-6 right-6 z-20 opacity-0 group-hover:opacity-100 transition-all translate-y-4 group-hover:translate-y-0">
          <div className="bg-white/90 backdrop-blur-md px-4 py-2 rounded-full shadow-lg text-xs font-bold flex items-center gap-2 text-slate-700">
             <Maximize2 size={14}/> Phóng to
          </div>
        </div>

        {/* Floating Badges */}
        <div className="absolute top-6 left-6 flex flex-col gap-2 z-20">
           {status === 'available' && <span className="bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg shadow-green-500/30">Có sẵn</span>}
           <span className="bg-white/80 backdrop-blur text-slate-700 px-3 py-1 rounded-full text-xs font-bold shadow-sm border border-white">Chính hãng</span>
        </div>
      </div>

      {images.length > 1 && (
        <div className="flex gap-4 overflow-x-auto pb-4 px-2 hide-scrollbar">
          {images.map((img, i) => (
            <button 
              key={i} 
              onClick={() => setActive(i)}
              className={clsx(
                "relative w-24 h-24 rounded-2xl overflow-hidden border-2 transition-all duration-300 flex-shrink-0",
                active === i ? "border-indigo-600 ring-4 ring-indigo-50 shadow-lg scale-105" : "border-transparent opacity-70 hover:opacity-100 bg-white"
              )}
            >
              <img src={img} className="w-full h-full object-cover" alt="thumb"/>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// 3.2 Seller Strip (Banner người bán)
const SellerBanner = ({ seller }: { seller: RichUser }) => {
  const navigate = useNavigate();
  return (
    <div className="glass-panel p-6 rounded-[2rem] flex flex-col md:flex-row items-center gap-6 glass-card-hover group cursor-pointer" onClick={() => navigate(`/profile/${seller.id}`)}>
      <div className="relative">
        <div className="w-20 h-20 rounded-full p-[3px] bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500">
           <img src={seller.avatar || 'https://via.placeholder.com/150'} className="w-full h-full rounded-full object-cover border-4 border-white" alt={seller.name}/>
        </div>
        {seller.isVerified && <div className="absolute -bottom-1 -right-1 bg-blue-500 text-white p-1.5 rounded-full border-4 border-white"><CheckCircle2 size={14}/></div>}
      </div>
      
      <div className="flex-1 text-center md:text-left">
         <h4 className="text-xl font-black text-slate-800 mb-1 group-hover:text-indigo-600 transition-colors">{seller.name}</h4>
         <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-sm text-slate-500 font-medium">
            <span className="flex items-center gap-1"><Star size={14} className="text-yellow-400 fill-yellow-400"/> 4.9 Đánh giá</span>
            <span>•</span>
            <span>{seller.responseRate}% Phản hồi</span>
            <span>•</span>
            <span className="text-green-600 font-bold">Online</span>
         </div>
      </div>

      <button className="px-6 py-3 bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 rounded-xl font-bold transition-all flex items-center gap-2">
         <Store size={18}/> Xem Shop
      </button>
    </div>
  );
};

// 3.3 Value Proposition (Cam kết)
const ValueProps = () => (
  <div className="grid grid-cols-2 gap-4">
     <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100 flex flex-col items-center text-center gap-2">
        <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600"><ShieldCheck size={20}/></div>
        <div>
           <h5 className="font-bold text-slate-800 text-sm">Thanh toán an toàn</h5>
           <p className="text-xs text-slate-500 mt-1">Giữ tiền đến khi nhận hàng</p>
        </div>
     </div>
     <div className="bg-pink-50/50 p-4 rounded-2xl border border-pink-100 flex flex-col items-center text-center gap-2">
        <div className="w-10 h-10 bg-pink-100 rounded-full flex items-center justify-center text-pink-600"><RefreshCw size={20}/></div>
        <div>
           <h5 className="font-bold text-slate-800 text-sm">Đổi trả dễ dàng</h5>
           <p className="text-xs text-slate-500 mt-1">Trong vòng 3 ngày</p>
        </div>
     </div>
  </div>
);

// 3.4 Comments List
const CommentSection = ({ comments, currentUser, onSend }: any) => {
   const [input, setInput] = useState('');
   
   return (
      <div className="space-y-6">
         {currentUser ? (
            <div className="flex gap-4">
               <img src={currentUser.avatar} className="w-12 h-12 rounded-full border border-white shadow-sm" alt="Me"/>
               <div className="flex-1 relative">
                  <textarea 
                     value={input}
                     onChange={e => setInput(e.target.value)}
                     placeholder="Hỏi người bán về sản phẩm này..."
                     className="w-full bg-white border-0 shadow-sm rounded-2xl p-4 pr-14 focus:ring-2 focus:ring-indigo-200 transition-all resize-none min-h-[80px]"
                  />
                  <button 
                     disabled={!input.trim()}
                     onClick={() => { onSend(input); setInput(''); }}
                     className="absolute right-3 bottom-3 p-2 bg-indigo-600 text-white rounded-xl shadow-lg hover:bg-indigo-700 disabled:opacity-50 transition-all active:scale-95"
                  >
                     <Send size={18}/>
                  </button>
               </div>
            </div>
         ) : (
            <div className="bg-indigo-50 p-6 rounded-2xl text-center text-indigo-800 font-bold border border-indigo-100">
               <Link to="/auth" className="underline">Đăng nhập</Link> để tham gia thảo luận.
            </div>
         )}

         <div className="space-y-6">
            {comments.map((c: any) => (
               <div key={c.id} className="flex gap-4 animate-enter">
                  <img src={c.userAvatar} className="w-10 h-10 rounded-full border border-white shadow-sm" alt="User"/>
                  <div className="flex-1 bg-white p-5 rounded-2xl rounded-tl-sm shadow-sm border border-slate-100">
                     <div className="flex justify-between items-start mb-2">
                        <span className="font-bold text-sm text-slate-900">{c.userName}</span>
                        <span className="text-[10px] text-slate-400 font-bold">{timeAgo(c.createdAt)}</span>
                     </div>
                     <p className="text-slate-600 text-sm leading-relaxed">{c.content}</p>
                  </div>
               </div>
            ))}
         </div>
      </div>
   );
};

// ============================================================================
// 4. MAIN PAGE
// ============================================================================

const ProductDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const { addToast } = useToast();
  
  const [product, setProduct] = useState<RichProduct | null>(null);
  const [seller, setSeller] = useState<RichUser | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [related, setRelated] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  const [activeTab, setActiveTab] = useState<'desc' | 'reviews'>('desc');
  const [lightboxOpen, setLightboxOpen] = useState(false);

  // --- Fetch Logic ---
  const fetchData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const { data: pData } = await supabase.from('products').select('*').eq('id', id).single();
      if (!pData) throw new Error("Not found");
      
      const mappedProduct: RichProduct = {
         ...pData,
         sellerId: pData.seller_id,
         images: pData.images || [],
         status: pData.status as ProductStatus,
         postedAt: pData.posted_at,
         view_count: pData.view_count || 0,
         tags: ['Sách giáo khoa', 'Đại học', 'Chính hãng'],
         original_price: pData.price * 1.2
      };
      setProduct(mappedProduct);

      const [sellerRes, commentRes, relatedRes, likeRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', mappedProduct.sellerId).single(),
        supabase.from('comments').select(`*, user:user_id(name, avatar_url)`).eq('product_id', id).order('created_at', { ascending: false }),
        supabase.from('products').select('*').eq('category', mappedProduct.category).neq('id', id).limit(4),
        currentUser ? supabase.from('saved_products').select('id').eq('user_id', currentUser.id).eq('product_id', id).maybeSingle() : Promise.resolve({ data: null })
      ]);

      if (sellerRes.data) setSeller({ ...sellerRes.data, id: sellerRes.data.id, avatar: sellerRes.data.avatar_url, isVerified: sellerRes.data.is_verified, joinDate: sellerRes.data.created_at, responseRate: 99 } as RichUser);
      setComments(commentRes.data || []);
      setRelated(relatedRes.data?.map(p => ({ ...p, sellerId: p.seller_id, images: p.images || [], status: p.status } as Product)) || []);
      setIsLiked(!!likeRes.data);
      supabase.rpc('increment_view_count', { product_id: id });

    } catch (err) {
      addToast("Có lỗi xảy ra", "error");
      navigate('/market');
    } finally {
      setLoading(false);
    }
  }, [id, currentUser, addToast, navigate]);

  useEffect(() => { fetchData(); window.scrollTo(0, 0); }, [fetchData]);

  // --- Actions ---
  const handleLike = async () => {
    if (!currentUser) return navigate('/auth');
    setIsLiked(!isLiked);
    try {
      if (isLiked) await supabase.from('saved_products').delete().eq('user_id', currentUser.id).eq('product_id', id);
      else await supabase.from('saved_products').insert({ user_id: currentUser.id, product_id: id });
    } catch { setIsLiked(!isLiked); }
  };

  const handleSendComment = async (content: string) => {
    const { error } = await supabase.from('comments').insert({ product_id: id, user_id: currentUser?.id, content });
    if (!error) { fetchData(); addToast("Đã gửi bình luận", "success"); }
  };

  const copyLink = () => { navigator.clipboard.writeText(window.location.href); addToast("Đã sao chép link", "success"); };

  if (loading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><Loader2 className="animate-spin text-indigo-600" size={40}/></div>;
  if (!product) return null;

  return (
    <div className="min-h-screen font-sans text-slate-800 pb-32 relative overflow-hidden">
      <VisualEngine />
      <div className="mesh-bg"/>

      {/* --- Lightbox --- */}
      {lightboxOpen && (
        <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center animate-enter" onClick={() => setLightboxOpen(false)}>
           <button className="absolute top-6 right-6 p-4 bg-white/10 rounded-full text-white"><X size={24}/></button>
           <img src={product.images[0]} className="max-h-[90vh] max-w-[90vw] object-contain rounded-lg shadow-2xl" onClick={e => e.stopPropagation()}/>
        </div>
      )}

      {/* --- HEADER (Transparent Sticky) --- */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-white/50 transition-all">
        <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4 animate-enter">
             <button onClick={() => navigate(-1)} className="p-2.5 hover:bg-white rounded-full transition-colors shadow-sm"><ArrowLeft size={20} className="text-slate-600"/></button>
             <div className="hidden md:flex items-center gap-2 text-sm font-bold text-slate-500">
                <Link to="/market" className="hover:text-indigo-600 transition-colors">Market</Link>
                <ChevronRight size={14}/>
                <span className="text-slate-900 line-clamp-1 max-w-[200px]">{product.title}</span>
             </div>
          </div>
          <div className="flex items-center gap-3 animate-enter" style={{animationDelay: '100ms'}}>
             <button onClick={copyLink} className="p-2.5 bg-white/50 hover:bg-white rounded-full text-slate-600 hover:text-indigo-600 transition-all border border-transparent hover:border-white shadow-sm"><Share2 size={20}/></button>
             <button className="p-2.5 bg-white/50 hover:bg-white rounded-full text-slate-600 hover:text-red-500 transition-all border border-transparent hover:border-white shadow-sm"><Flag size={20}/></button>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-10">
         <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16">
            
            {/* --- LEFT: VISUALS (55%) --- */}
            <div className="lg:col-span-7 space-y-10">
               <div className="animate-enter">
                  <HeroGallery images={product.images} status={product.status as ProductStatus} onOpenLightbox={() => setLightboxOpen(true)} />
               </div>

               {/* Description Tabs */}
               <div className="glass-panel rounded-[2.5rem] p-8 animate-enter" style={{animationDelay: '200ms'}}>
                  <div className="flex items-center gap-8 border-b border-slate-200/60 pb-6 mb-8">
                     <button onClick={() => setActiveTab('desc')} className={clsx("text-xl font-black transition-colors relative pb-1", activeTab === 'desc' ? "text-slate-900" : "text-slate-400 hover:text-slate-600")}>
                        Chi tiết
                        {activeTab === 'desc' && <div className="absolute -bottom-7 left-0 w-full h-1 bg-indigo-600 rounded-t-full shadow-[0_-4px_12px_rgba(79,70,229,0.5)]"/>}
                     </button>
                     <button onClick={() => setActiveTab('reviews')} className={clsx("text-xl font-black transition-colors relative pb-1", activeTab === 'reviews' ? "text-slate-900" : "text-slate-400 hover:text-slate-600")}>
                        Bình luận ({comments.length})
                        {activeTab === 'reviews' && <div className="absolute -bottom-7 left-0 w-full h-1 bg-indigo-600 rounded-t-full shadow-[0_-4px_12px_rgba(79,70,229,0.5)]"/>}
                     </button>
                  </div>

                  {activeTab === 'desc' ? (
                     <div className="animate-enter">
                        <div className="prose prose-lg prose-indigo max-w-none text-slate-600 leading-loose font-medium mb-8">
                           {product.description || "Người bán chưa cung cấp mô tả."}
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                           {['Mới 99%', 'Bìa mềm', 'Có ghi chú'].map((tag, i) => (
                              <div key={i} className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-center font-bold text-slate-600 text-sm">{tag}</div>
                           ))}
                        </div>
                     </div>
                  ) : (
                     <div className="animate-enter">
                        <CommentSection comments={comments} currentUser={currentUser} onSend={handleSendComment} />
                     </div>
                  )}
               </div>
            </div>

            {/* --- RIGHT: INFO & ACTIONS (45% - Sticky) --- */}
            <div className="lg:col-span-5 relative">
               <div className="sticky top-28 space-y-8 animate-enter" style={{animationDelay: '100ms'}}>
                  
                  {/* Hero Card */}
                  <div className="glass-panel p-8 md:p-10 rounded-[3rem] relative overflow-hidden shadow-2xl shadow-indigo-500/10">
                     <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
                     
                     <div className="relative z-10">
                        {/* Tags & Wishlist */}
                        <div className="flex justify-between items-start mb-6">
                           <span className="bg-white/90 backdrop-blur text-indigo-700 text-xs font-black px-4 py-2 rounded-xl uppercase tracking-wider border border-white shadow-sm flex items-center gap-2">
                              <Box size={14}/> {product.category}
                           </span>
                           <button onClick={handleLike} className="p-3 bg-white rounded-full shadow-sm hover:shadow-lg transition-all active:scale-95 group border border-transparent hover:border-rose-100">
                              <Heart size={24} className={clsx("transition-all duration-300", isLiked ? "fill-rose-500 text-rose-500 scale-110" : "text-slate-300 group-hover:text-rose-400")}/>
                           </button>
                        </div>

                        {/* Title */}
                        <h1 className="hero-title font-black mb-6">{product.title}</h1>
                        
                        {/* Meta Data */}
                        <div className="flex items-center gap-6 text-sm font-bold text-slate-500 mb-8 border-b border-slate-200/60 pb-8">
                           <div className="flex items-center gap-2"><Clock size={18} className="text-indigo-500"/> {timeAgo(product.postedAt)}</div>
                           <div className="flex items-center gap-2"><MapPin size={18} className="text-indigo-500"/> TP.HCM</div>
                           <div className="flex items-center gap-2"><Eye size={18} className="text-indigo-500"/> {product.view_count}</div>
                        </div>

                        {/* Price & Actions */}
                        <div className="mb-8">
                           <div className="flex items-end gap-3 mb-2">
                              <span className="text-6xl font-black text-indigo-600 tracking-tighter drop-shadow-sm">
                                 {product.price === 0 ? 'FREE' : formatCurrency(product.price)}
                              </span>
                              {product.price > 0 && <span className="text-xl text-slate-400 line-through mb-3 font-bold">{formatCurrency(product.price * 1.2)}</span>}
                           </div>
                           {product.price === 0 && (
                              <div className="inline-flex items-center gap-2 text-sm font-bold text-green-700 bg-green-100 px-4 py-2 rounded-full border border-green-200 animate-float">
                                 <Gift size={16}/> Quà tặng sinh viên
                              </div>
                           )}
                        </div>

                        {/* CTAs */}
                        <div className="hidden lg:flex flex-col gap-4">
                           {currentUser?.id === product.sellerId ? (
                               <button onClick={() => navigate(`/post-item?edit=${product.id}`)} className="w-full py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-black text-lg transition-all">Quản lý bài đăng</button>
                           ) : (
                              <>
                                 <button 
                                    onClick={() => navigate(`/chat?partnerId=${seller?.id}`)}
                                    disabled={product.status === 'sold'}
                                    className="w-full py-5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white rounded-2xl font-black text-lg shadow-xl shadow-indigo-500/30 transition-all hover:-translate-y-1 active:scale-95 flex items-center justify-center gap-3"
                                 >
                                    <MessageCircle size={24} className="fill-current"/> Chat với người bán
                                 </button>
                                 <button 
                                    onClick={() => addToast("Chức năng đang phát triển", "info")}
                                    className="w-full py-5 bg-white border-2 border-slate-100 hover:border-indigo-200 text-slate-700 hover:text-indigo-600 rounded-2xl font-black text-lg transition-all hover:-translate-y-1 flex items-center justify-center gap-3"
                                 >
                                    <ShoppingBag size={24}/> Mua ngay
                                 </button>
                              </>
                           )}
                        </div>
                     </div>
                  </div>

                  {/* Seller & Trust */}
                  {seller && <SellerBanner seller={seller} />}
                  <ValueProps />
                  
               </div>
            </div>
         </div>

         {/* --- RELATED CAROUSEL --- */}
         {related.length > 0 && (
            <div className="mt-24 border-t border-slate-200 pt-16 animate-enter" style={{animationDelay: '300ms'}}>
               <div className="flex items-center justify-between mb-10">
                  <div>
                     <h3 className="text-3xl font-black text-slate-900 mb-2">Gợi ý dành cho bạn</h3>
                     <p className="text-slate-500 font-medium">Sản phẩm tương tự trong danh mục {product.category}</p>
                  </div>
                  <Link to="/market" className="text-indigo-600 font-bold hover:underline flex items-center gap-1 group bg-indigo-50 px-4 py-2 rounded-xl transition-colors hover:bg-indigo-100">
                     Xem tất cả <ArrowLeft className="rotate-180 group-hover:translate-x-1 transition-transform" size={20}/>
                  </Link>
               </div>
               <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  {related.map(p => <ProductCard key={p.id} product={p} />)}
               </div>
            </div>
         )}
      </main>

      {/* MOBILE FLOATING BAR */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-slate-200 p-4 lg:hidden z-50 animate-enter shadow-[0_-10px_30px_rgba(0,0,0,0.1)]">
         <div className="flex gap-3">
            <button onClick={() => navigate(`/chat?partnerId=${seller?.id}`)} className="flex-1 bg-indigo-600 text-white py-3.5 rounded-xl font-bold shadow-lg shadow-indigo-500/30 flex items-center justify-center gap-2 active:scale-95 transition-transform">
               <MessageCircle size={20} className="fill-current"/> Chat Ngay
            </button>
            <button onClick={handleLike} className={`w-14 flex items-center justify-center rounded-xl border-2 transition-all active:scale-90 ${isLiked ? 'border-rose-500 bg-rose-50 text-rose-500' : 'border-slate-200 text-slate-400 bg-white'}`}>
               <Heart size={24} className={isLiked ? 'fill-current' : ''}/>
            </button>
         </div>
      </div>
    </div>
  );
};

export default ProductDetailPage;
