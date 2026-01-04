import React, { 
  useEffect, useState, useMemo, useRef, useCallback, useReducer, 
  MouseEvent as ReactMouseEvent 
} from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import {
  ShieldCheck, MessageCircle, Share2, Flag, Heart,
  ShieldAlert, Loader2, ShoppingBag, Store, ArrowLeft,
  ChevronRight, X, Clock, Box, MapPin, CheckCircle2,
  AlertCircle, Copy, Send, Star, Eye, Gift, 
  Maximize2, ChevronLeft, QrCode, AlertTriangle,
  Sparkles, TrendingUp, Zap, Award, ThumbsUp, 
  MoreHorizontal, CornerUpRight, Hash, BadgeCheck
} from 'lucide-react';
import { Product, User, Comment, ProductStatus } from '../types';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import ProductCard from '../components/ProductCard'; // <--- ĐÃ FIX LỖI IMPORT TẠI ĐÂY

// ============================================================================
// PART 1: UTILS & CONSTANTS
// ============================================================================

const CURRENCY_LOCALE = 'vi-VN';
const CURRENCY_CODE = 'VND';

// --- Extended Types for Rich UI ---
interface RichUser extends User {
  joinDate: string;
  responseRate: number;
  responseTime: string;
  badges: string[];
  isOnline?: boolean;
  lastActive?: string;
  coverImage?: string;
}

interface RichProduct extends Product {
  view_count: number;
  likes_count: number;
  original_price?: number;
  tags: string[];
  history: { date: string; price: number }[];
  description_html?: string;
}

// --- Helper Functions ---
const formatCurrency = (amount: number): string => 
  new Intl.NumberFormat(CURRENCY_LOCALE, { style: 'currency', currency: CURRENCY_CODE }).format(amount);

const timeAgo = (date: string | Date): string => {
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

const clsx = (...classes: (string | undefined | null | false)[]): string => classes.filter(Boolean).join(' ');

// ============================================================================
// PART 2: THE "LUNG LINH" VISUAL ENGINE (CSS)
// ============================================================================

const VisualEngine = () => (
  <style>{`
    :root {
      --primary: #6366f1;
      --secondary: #ec4899;
      --accent: #8b5cf6;
      --glass-bg: rgba(255, 255, 255, 0.65);
      --glass-border: rgba(255, 255, 255, 0.8);
      --glass-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.1);
      --neon-glow: 0 0 10px rgba(99, 102, 241, 0.5), 0 0 20px rgba(99, 102, 241, 0.3);
    }

    body {
      background-color: #f0f4f8;
      background-image: 
        radial-gradient(at 0% 0%, hsla(253,16%,7%,0.05) 0, transparent 50%), 
        radial-gradient(at 50% 0%, hsla(225,39%,30%,0.05) 0, transparent 50%), 
        radial-gradient(at 100% 0%, hsla(339,49%,30%,0.05) 0, transparent 50%);
      overflow-x: hidden;
    }

    /* --- Aurora Background Animation --- */
    .aurora-bg {
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      z-index: -1;
      background: 
        radial-gradient(circle at 15% 50%, rgba(236, 72, 153, 0.1), transparent 25%), 
        radial-gradient(circle at 85% 30%, rgba(99, 102, 241, 0.15), transparent 25%);
      filter: blur(60px);
      animation: aurora-move 10s infinite alternate;
    }

    @keyframes aurora-move {
      0% { transform: scale(1); }
      100% { transform: scale(1.1); }
    }

    /* --- 3D Tilt Effect Utilities --- */
    .tilt-card {
      transition: transform 0.1s ease, box-shadow 0.2s ease;
      transform-style: preserve-3d;
    }
    .tilt-content {
      transform: translateZ(20px);
    }

    /* --- Glassmorphism --- */
    .glass-panel {
      background: var(--glass-bg);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid var(--glass-border);
      box-shadow: var(--glass-shadow);
    }

    .glass-button {
      background: rgba(255, 255, 255, 0.8);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.5);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .glass-button:hover {
      background: rgba(255, 255, 255, 0.95);
      transform: translateY(-2px);
      box-shadow: 0 10px 20px rgba(0,0,0,0.1);
    }
    .glass-button:active {
      transform: translateY(0);
    }

    /* --- Animations --- */
    @keyframes float { 0% { transform: translateY(0px); } 50% { transform: translateY(-10px); } 100% { transform: translateY(0px); } }
    @keyframes shine { 0% { background-position: 200% center; } 100% { background-position: -200% center; } }
    @keyframes pulse-ring { 0% { box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.7); } 70% { box-shadow: 0 0 0 15px rgba(99, 102, 241, 0); } 100% { box-shadow: 0 0 0 0 rgba(99, 102, 241, 0); } }
    @keyframes enter-up { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }

    .animate-float { animation: float 6s ease-in-out infinite; }
    .animate-enter { animation: enter-up 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; opacity: 0; }
    
    .shimmer-text {
      background: linear-gradient(to right, #1e293b 20%, #818cf8 40%, #818cf8 60%, #1e293b 80%);
      background-size: 200% auto;
      color: #000;
      background-clip: text;
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      animation: shine 5s linear infinite;
    }

    .hide-scrollbar::-webkit-scrollbar { display: none; }
    
    /* Custom Scrollbar */
    ::-webkit-scrollbar { width: 6px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
    ::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
  `}</style>
);

// ============================================================================
// PART 3: REUSABLE UI COMPONENTS (ATOMICS)
// ============================================================================

// 3.1 Button with Neon Glow
const Button = ({ children, variant = 'primary', className, isLoading, icon, ...props }: any) => {
  const base = "relative overflow-hidden px-6 py-3 rounded-2xl font-bold transition-all duration-300 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variants: any = {
    primary: "bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:-translate-y-1",
    secondary: "bg-white text-slate-700 border border-slate-200 shadow-sm hover:bg-slate-50 hover:border-indigo-200 hover:text-indigo-600",
    danger: "bg-gradient-to-r from-red-500 to-rose-600 text-white shadow-lg shadow-red-500/30 hover:shadow-red-500/50",
    ghost: "bg-transparent text-slate-500 hover:bg-slate-100 hover:text-indigo-600"
  };

  return (
    <button className={clsx(base, variants[variant], className)} {...props}>
      {isLoading ? <Loader2 className="animate-spin" size={20}/> : icon}
      {children}
      {variant === 'primary' && <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 skew-y-12"></div>}
    </button>
  );
};

// 3.2 Modal with Backdrop Blur
const Modal = ({ isOpen, onClose, children }: any) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-enter" onClick={onClose} style={{animationDuration: '0.3s'}} />
      <div className="relative bg-white/90 backdrop-blur-xl rounded-[2.5rem] p-8 shadow-2xl max-w-md w-full border border-white/50 animate-enter">
        <button onClick={onClose} className="absolute top-4 right-4 p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-red-500 transition-colors"><X size={20}/></button>
        {children}
      </div>
    </div>
  );
};

// 3.3 Lightbox Gallery
const Lightbox = ({ images, onClose }: { images: string[], onClose: () => void }) => {
  const [idx, setIdx] = useState(0);
  return (
    <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-2xl flex items-center justify-center animate-enter" onClick={onClose}>
      <button className="absolute top-6 right-6 p-4 bg-white/10 rounded-full text-white hover:bg-white/30 transition-all z-50" onClick={onClose}><X size={24}/></button>
      <button className="absolute left-4 p-4 text-white/50 hover:text-white transition-colors z-50" onClick={(e) => {e.stopPropagation(); setIdx((idx - 1 + images.length) % images.length)}}><ChevronLeft size={48}/></button>
      <img src={images[idx]} className="max-h-[85vh] max-w-[90vw] object-contain rounded-lg shadow-2xl scale-100 animate-enter" onClick={e => e.stopPropagation()} alt="full"/>
      <button className="absolute right-4 p-4 text-white/50 hover:text-white transition-colors z-50" onClick={(e) => {e.stopPropagation(); setIdx((idx + 1) % images.length)}}><ChevronRight size={48}/></button>
      <div className="absolute bottom-8 flex gap-2">
        {images.map((_, i) => <div key={i} className={`w-2 h-2 rounded-full transition-all ${i === idx ? 'bg-white w-6' : 'bg-white/30'}`}/>)}
      </div>
    </div>
  );
};

// ============================================================================
// PART 4: COMPLEX INTERACTIVE COMPONENTS
// ============================================================================

// 4.1 Holographic 3D Image Gallery
const HolographicGallery = ({ images, status, onClick }: { images: string[], status: ProductStatus, onClick: () => void }) => {
  const [active, setActive] = useState(0);
  const cardRef = useRef<HTMLDivElement>(null);
  const [rotate, setRotate] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: ReactMouseEvent) => {
    if (!cardRef.current) return;
    const { left, top, width, height } = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - left - width / 2) / 25;
    const y = (e.clientY - top - height / 2) / 25;
    setRotate({ x: -y, y: x });
  };

  return (
    <div className="space-y-6">
      <div 
        ref={cardRef}
        className="relative aspect-[4/3] rounded-[2.5rem] bg-white border border-white/60 shadow-xl cursor-zoom-in group perspective-1000"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setRotate({ x: 0, y: 0 })}
        onClick={onClick}
        style={{ transform: `perspective(1000px) rotateX(${rotate.x}deg) rotateY(${rotate.y}deg)`, transition: 'transform 0.1s ease-out' }}
      >
        <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/10 to-pink-500/10 opacity-0 group-hover:opacity-100 transition-opacity rounded-[2.5rem] z-0 pointer-events-none"/>
        <img src={images[active]} alt="Main" className="w-full h-full object-contain p-6 relative z-10 drop-shadow-xl transition-transform duration-500 group-hover:scale-105"/>
        
        {status === 'sold' && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 backdrop-blur-[2px] rounded-[2.5rem]">
            <div className="border-[6px] border-white text-white text-6xl font-black uppercase -rotate-12 tracking-widest px-8 py-2 mix-blend-overlay animate-pulse">SOLD</div>
          </div>
        )}
        
        <div className="absolute bottom-6 right-6 bg-white/90 backdrop-blur text-xs font-bold px-4 py-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-all translate-y-4 group-hover:translate-y-0 z-20 flex items-center gap-2">
          <Maximize2 size={14} className="text-indigo-600"/> Xem chi tiết
        </div>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4 px-2 hide-scrollbar">
        {images.map((img, i) => (
          <button 
            key={i} 
            onClick={() => setActive(i)} 
            className={clsx(
              "relative w-20 h-20 rounded-2xl overflow-hidden border-2 transition-all duration-300 flex-shrink-0 shadow-sm hover:shadow-lg",
              active === i ? "border-indigo-600 ring-4 ring-indigo-50 scale-110 z-10" : "border-white opacity-60 hover:opacity-100 hover:scale-105"
            )}
          >
            <img src={img} className="w-full h-full object-cover" alt="thumb"/>
          </button>
        ))}
      </div>
    </div>
  );
};

// 4.2 Rich Seller Card
const SellerCard = ({ seller }: { seller: RichUser }) => {
  const navigate = useNavigate();
  return (
    <div className="glass-panel p-6 rounded-[2rem] hover:bg-white/80 transition-colors duration-300 group">
      <div className="flex items-center gap-5 mb-6">
        <div className="relative">
          <div className="w-18 h-18 rounded-full p-[3px] bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 animate-spin-slow">
            <img src={seller.avatar || 'https://via.placeholder.com/150'} className="w-16 h-16 rounded-full object-cover border-4 border-white" alt={seller.name}/>
          </div>
          <div className="absolute -bottom-1 -right-1 bg-green-500 border-4 border-white w-6 h-6 rounded-full flex items-center justify-center text-white shadow-sm">
            <Zap size={12} fill="currentColor"/>
          </div>
        </div>
        <div className="flex-1">
          <h4 className="font-black text-xl text-slate-800 flex items-center gap-2">
            {seller.name}
            {seller.isVerified && <BadgeCheck className="text-blue-500" size={20} fill="currentColor" color="white"/>}
          </h4>
          <div className="flex items-center gap-3 text-xs font-bold text-slate-500 mt-1">
            <span className="flex items-center gap-1 text-green-600 bg-green-50 px-2 py-0.5 rounded-md"><div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"/> Online</span>
            <span>•</span>
            <span>Tham gia {timeAgo(seller.joinDate)}</span>
          </div>
        </div>
        <button onClick={() => navigate(`/profile/${seller.id}`)} className="p-3 bg-slate-50 hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 rounded-2xl transition-colors">
          <Store size={20}/>
        </button>
      </div>
      
      <div className="grid grid-cols-3 gap-3 border-t border-slate-100 pt-4">
        {[
          { label: 'Đánh giá', val: '4.9', icon: <Star size={12} className="text-yellow-500 fill-yellow-500"/> },
          { label: 'Phản hồi', val: '99%', icon: <MessageCircle size={12} className="text-blue-500"/> },
          { label: 'Đã bán', val: '120+', icon: <ShoppingBag size={12} className="text-purple-500"/> }
        ].map((item, i) => (
          <div key={i} className="text-center bg-slate-50/50 rounded-xl p-2 hover:bg-white transition-colors">
            <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">{item.label}</div>
            <div className="font-black text-slate-800 flex items-center justify-center gap-1">{item.icon} {item.val}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

// 4.3 Safety Widget
const SafetyShield = () => (
  <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-indigo-600 to-violet-700 p-6 text-white shadow-xl shadow-indigo-500/20">
    <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/20 rounded-full blur-2xl"></div>
    <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-pink-500/20 rounded-full blur-2xl"></div>
    <div className="relative z-10">
      <h3 className="flex items-center gap-2 font-bold text-lg mb-4">
        <ShieldCheck className="text-indigo-200" /> BookExchange Safe
      </h3>
      <div className="space-y-3 text-sm font-medium text-indigo-100">
        <div className="flex gap-3 items-start">
           <CheckCircle2 size={16} className="text-green-400 mt-0.5 shrink-0"/>
           <span className="leading-snug">Thanh toán được bảo vệ, chỉ giải ngân khi bạn hài lòng.</span>
        </div>
        <div className="flex gap-3 items-start">
           <CheckCircle2 size={16} className="text-green-400 mt-0.5 shrink-0"/>
           <span className="leading-snug">Hoàn tiền 100% nếu sách giả hoặc sai mô tả.</span>
        </div>
      </div>
    </div>
  </div>
);

// ============================================================================
// PART 5: MAIN LOGIC & COMPONENT
// ============================================================================

const ProductDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const { addToast } = useToast();
  
  // State
  const [product, setProduct] = useState<RichProduct | null>(null);
  const [seller, setSeller] = useState<RichUser | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  const [commentInput, setCommentInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  // UI State
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'desc' | 'reviews'>('desc');

  // Fetch Logic
  const fetchData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const { data: pData } = await supabase.from('products').select('*').eq('id', id).single();
      if (!pData) throw new Error("Product not found");

      const richProduct: RichProduct = {
        ...pData,
        sellerId: pData.seller_id,
        images: pData.images || [],
        status: pData.status as ProductStatus,
        postedAt: pData.posted_at,
        view_count: pData.view_count || 0,
        likes_count: 0,
        tags: ['Giáo trình', 'IT', 'Sách cũ'],
        history: [],
      };
      setProduct(richProduct);

      const [sellerRes, commentRes, relatedRes, likeRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', richProduct.sellerId).single(),
        supabase.from('comments').select(`*, user:user_id(name, avatar_url)`).eq('product_id', id).order('created_at', { ascending: false }),
        supabase.from('products').select('*').eq('category', richProduct.category).neq('id', id).limit(4),
        currentUser ? supabase.from('saved_products').select('id').eq('user_id', currentUser.id).eq('product_id', id).maybeSingle() : Promise.resolve({ data: null })
      ]);

      if (sellerRes.data) {
        setSeller({ ...sellerRes.data, id: sellerRes.data.id, avatar: sellerRes.data.avatar_url, isVerified: sellerRes.data.is_verified, joinDate: sellerRes.data.created_at || new Date().toISOString() } as RichUser);
      }
      setComments(commentRes.data || []);
      setRelatedProducts(relatedRes.data?.map(p => ({ ...p, sellerId: p.seller_id, images: p.images || [], status: p.status } as Product)) || []);
      setIsLiked(!!likeRes.data);
      supabase.rpc('increment_view_count', { product_id: id });

    } catch (err) {
      addToast("Lỗi tải trang", "error");
      navigate('/market');
    } finally {
      setLoading(false);
    }
  }, [id, currentUser, navigate, addToast]);

  useEffect(() => { fetchData(); window.scrollTo(0, 0); }, [fetchData]);

  // Handlers
  const handleLike = async () => {
    if (!currentUser) return navigate('/auth');
    setIsLiked(!isLiked);
    try {
      if (isLiked) await supabase.from('saved_products').delete().eq('user_id', currentUser.id).eq('product_id', id);
      else await supabase.from('saved_products').insert({ user_id: currentUser.id, product_id: id });
    } catch {}
  };

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return navigate('/auth');
    if (!commentInput.trim()) return;
    setSubmitting(true);
    const { error } = await supabase.from('comments').insert({ product_id: id, user_id: currentUser.id, content: commentInput.trim() });
    if (!error) {
      setCommentInput('');
      fetchData();
      addToast("Đã gửi bình luận", "success");
    }
    setSubmitting(false);
  };

  const copyLink = () => { navigator.clipboard.writeText(window.location.href); addToast("Đã sao chép link", "success"); };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-indigo-600" size={40}/></div>;
  if (!product) return null;

  return (
    <div className="min-h-screen font-sans text-slate-800 pb-32">
      <VisualEngine />
      <div className="aurora-bg" />
      {lightboxOpen && <Lightbox images={product.images} onClose={() => setLightboxOpen(false)} />}
      
      {/* Report Modal */}
      <Modal isOpen={reportOpen} onClose={() => setReportOpen(false)}>
         <h3 className="text-xl font-black text-slate-900 mb-4 flex items-center gap-2"><AlertTriangle className="text-red-500"/> Báo cáo vi phạm</h3>
         <p className="text-sm text-slate-500 mb-4">Hãy giúp chúng tôi giữ cộng đồng trong sạch.</p>
         <div className="space-y-3 mb-6">
            {['Lừa đảo', 'Hàng giả', 'Spam', 'Khác'].map(r => (
               <button key={r} className="w-full text-left p-3 rounded-xl border border-slate-200 hover:bg-red-50 hover:border-red-200 hover:text-red-600 font-bold transition-colors">{r}</button>
            ))}
         </div>
         <Button fullWidth variant="secondary" onClick={() => setReportOpen(false)}>Đóng</Button>
      </Modal>

      {/* Header */}
      <div className="sticky top-0 z-40 bg-white/70 backdrop-blur-xl border-b border-white/50 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4 animate-enter">
            <button onClick={() => navigate(-1)} className="p-2 hover:bg-white rounded-full transition-colors shadow-sm"><ArrowLeft size={20} className="text-slate-600"/></button>
            <div className="hidden sm:flex items-center gap-2 text-sm font-bold text-slate-500">
              <Link to="/market" className="hover:text-indigo-600 transition-colors">Market</Link>
              <ChevronRight size={14}/>
              <span className="text-slate-900 truncate max-w-[200px]">{product.title}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 animate-enter" style={{animationDelay: '0.1s'}}>
            <button onClick={copyLink} className="glass-button p-2 rounded-full text-slate-500 hover:text-indigo-600"><Share2 size={18}/></button>
            <button onClick={() => setReportOpen(true)} className="glass-button p-2 rounded-full text-slate-500 hover:text-red-500"><Flag size={18}/></button>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          
          {/* --- LEFT: GALLERY & CONTENT --- */}
          <div className="lg:col-span-7 space-y-10">
            <div className="animate-enter">
               <HolographicGallery images={product.images} status={product.status as ProductStatus} onClick={() => setLightboxOpen(true)} />
            </div>

            <div className="glass-panel rounded-[2.5rem] p-8 animate-enter" style={{animationDelay: '0.2s'}}>
              <div className="flex gap-6 border-b border-slate-200/50 pb-6 mb-6">
                 <button onClick={() => setActiveTab('desc')} className={clsx("text-lg font-black transition-colors relative", activeTab === 'desc' ? "shimmer-text" : "text-slate-400 hover:text-slate-600")}>
                    Mô tả chi tiết
                    {activeTab === 'desc' && <div className="absolute -bottom-6 left-0 w-full h-1 bg-indigo-600 rounded-t-full shadow-[0_-2px_10px_rgba(79,70,229,0.5)]"/>}
                 </button>
                 <button onClick={() => setActiveTab('reviews')} className={clsx("text-lg font-black transition-colors relative", activeTab === 'reviews' ? "shimmer-text" : "text-slate-400 hover:text-slate-600")}>
                    Bình luận ({comments.length})
                    {activeTab === 'reviews' && <div className="absolute -bottom-6 left-0 w-full h-1 bg-indigo-600 rounded-t-full shadow-[0_-2px_10px_rgba(79,70,229,0.5)]"/>}
                 </button>
              </div>

              {activeTab === 'desc' ? (
                 <div className="space-y-6 animate-enter">
                    <div className="prose prose-slate max-w-none text-slate-600 leading-loose whitespace-pre-wrap font-medium">
                       {product.description || "Chưa có mô tả."}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                       <div className="bg-white/50 p-4 rounded-2xl border border-white">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Tình trạng</span>
                          <div className="font-bold text-slate-800 flex items-center gap-2"><Star size={16} className="text-yellow-500 fill-yellow-500"/> {product.condition}</div>
                       </div>
                       <div className="bg-white/50 p-4 rounded-2xl border border-white">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Hình thức</span>
                          <div className="font-bold text-slate-800 flex items-center gap-2"><Box size={16} className="text-indigo-500"/> {product.tradeMethod === 'direct' ? 'Trực tiếp' : 'Ship COD'}</div>
                       </div>
                    </div>
                 </div>
              ) : (
                 <div className="space-y-6 animate-enter">
                    {currentUser ? (
                       <form onSubmit={handleComment} className="flex gap-4 mb-8">
                          <img src={currentUser.avatar} className="w-10 h-10 rounded-full border border-white shadow-sm" alt="me"/>
                          <div className="flex-1 relative group">
                             <textarea 
                                value={commentInput} 
                                onChange={e => setCommentInput(e.target.value)} 
                                className="w-full bg-slate-50 border-0 rounded-2xl p-4 pr-12 focus:ring-2 focus:ring-indigo-100 transition-all resize-none min-h-[60px]"
                                placeholder="Viết bình luận..."
                             />
                             <button disabled={!commentInput.trim() || submitting} className="absolute right-2 bottom-2 p-2 bg-indigo-600 text-white rounded-xl shadow-lg hover:shadow-indigo-500/50 hover:scale-105 transition-all active:scale-95 disabled:opacity-50">
                                {submitting ? <Loader2 size={16} className="animate-spin"/> : <Send size={16}/>}
                             </button>
                          </div>
                       </form>
                    ) : (
                       <div className="bg-indigo-50 p-4 rounded-xl text-center text-indigo-800 font-bold mb-6">Đăng nhập để bình luận</div>
                    )}
                    {comments.map(c => (
                       <div key={c.id} className="flex gap-4 group">
                          <img src={c.userAvatar} className="w-10 h-10 rounded-full border border-white shadow-sm" alt="u"/>
                          <div className="flex-1 bg-white p-4 rounded-2xl rounded-tl-none border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                             <div className="flex justify-between items-start mb-1">
                                <span className="font-bold text-sm text-slate-900">{c.userName}</span>
                                <span className="text-[10px] text-slate-400 font-bold">{timeAgo(c.createdAt)}</span>
                             </div>
                             <p className="text-slate-600 text-sm leading-relaxed">{c.content}</p>
                          </div>
                       </div>
                    ))}
                 </div>
              )}
            </div>
          </div>

          {/* --- RIGHT: INFO & ACTIONS (STICKY) --- */}
          <div className="lg:col-span-5 relative">
             <div className="sticky top-24 space-y-6 animate-enter" style={{animationDelay: '0.1s'}}>
                
                {/* Main Info Card */}
                <div className="glass-panel p-8 rounded-[2.5rem] relative overflow-hidden">
                   <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-400/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                   
                   <div className="relative z-10">
                      <div className="flex justify-between items-start mb-6">
                         <span className="bg-white/80 backdrop-blur text-indigo-600 text-xs font-black px-3 py-1.5 rounded-lg uppercase tracking-wider border border-white shadow-sm">
                            {product.category}
                         </span>
                         <button onClick={handleLike} className="group p-2 bg-white rounded-full shadow-sm hover:shadow-md transition-all active:scale-95">
                            <Heart size={24} className={clsx("transition-all duration-300", isLiked ? "fill-rose-500 text-rose-500 scale-110" : "text-slate-300 group-hover:text-rose-400")}/>
                         </button>
                      </div>

                      <h1 className="text-4xl font-black text-slate-900 leading-tight mb-4 tracking-tight text-balance">{product.title}</h1>
                      
                      <div className="flex items-center gap-4 text-sm text-slate-500 mb-8 pb-6 border-b border-slate-200/50">
                         <div className="flex items-center gap-1.5 font-bold"><Clock size={16} className="text-indigo-500"/> {timeAgo(product.postedAt)}</div>
                         <div className="flex items-center gap-1.5 font-bold"><Eye size={16} className="text-indigo-500"/> {product.view_count}</div>
                         <div className="flex items-center gap-1.5 font-bold"><MapPin size={16} className="text-indigo-500"/> HCM</div>
                      </div>

                      <div className="mb-8">
                         <div className="flex items-end gap-3 mb-2">
                            <span className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600 tracking-tight">
                               {product.price === 0 ? 'FREE' : formatCurrency(product.price)}
                            </span>
                            {product.price > 0 && <span className="text-lg text-slate-400 line-through mb-2 font-bold">{formatCurrency(product.price * 1.2)}</span>}
                         </div>
                         {product.price === 0 && (
                            <div className="inline-flex items-center gap-2 text-xs font-bold text-green-700 bg-green-100 px-3 py-1.5 rounded-full border border-green-200 shadow-sm animate-float">
                               <Gift size={14}/> Quà tặng sinh viên
                            </div>
                         )}
                      </div>

                      <div className="hidden lg:flex flex-col gap-3">
                        {currentUser?.id === product.sellerId ? (
                           <Button variant="secondary" fullWidth onClick={() => navigate(`/post-item?edit=${product.id}`)}>Quản lý bài đăng</Button>
                        ) : (
                           <>
                              <Button 
                                variant="primary" 
                                fullWidth 
                                icon={<MessageCircle size={20}/>}
                                onClick={() => navigate(`/chat?partnerId=${seller?.id}`)}
                                disabled={product.status === 'sold'}
                              >
                                 {product.status === 'sold' ? 'Đã bán' : 'Chat ngay'}
                              </Button>
                              <Button 
                                variant="secondary" 
                                fullWidth 
                                icon={<ShoppingBag size={20}/>}
                                onClick={() => addToast("Đang phát triển", "info")}
                                disabled={product.status === 'sold'}
                              >
                                 Mua ngay
                              </Button>
                           </>
                        )}
                      </div>
                   </div>
                </div>

                {seller && <SellerCard seller={seller} />}
                <SafetyShield />
             </div>
          </div>
        </div>

        {/* RELATED PRODUCTS */}
        {relatedProducts.length > 0 && (
          <div className="mt-24 border-t border-slate-200/60 pt-16 animate-enter" style={{animationDelay: '0.3s'}}>
             <div className="flex items-center justify-between mb-10">
                <div>
                   <h3 className="text-3xl font-black text-slate-900 mb-2">Gợi ý cho bạn</h3>
                   <p className="text-slate-500 font-medium">Các sản phẩm tương tự có thể bạn sẽ thích</p>
                </div>
                <Link to="/market" className="text-indigo-600 font-bold hover:underline flex items-center gap-1 group">
                   Xem tất cả <ArrowLeft className="rotate-180 group-hover:translate-x-1 transition-transform" size={20}/>
                </Link>
             </div>
             <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {relatedProducts.map(p => <ProductCard key={p.id} product={p} />)}
             </div>
          </div>
        )}
      </main>

      {/* MOBILE BAR */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-slate-200 p-4 lg:hidden z-50 animate-enter shadow-[0_-10px_30px_rgba(0,0,0,0.1)]">
        <div className="flex gap-3">
           <Button 
             className="flex-1"
             variant="primary"
             icon={<MessageCircle size={20}/>}
             onClick={() => navigate(`/chat?partnerId=${seller?.id}`)}
             disabled={product.status === 'sold'}
           >
             Chat Ngay
           </Button>
           <button onClick={handleLike} className={`w-14 flex items-center justify-center rounded-2xl border-2 transition-all active:scale-95 ${isLiked ? 'border-rose-500 bg-rose-50 text-rose-500' : 'border-slate-200 text-slate-400 bg-white'}`}>
              <Heart size={24} className={isLiked ? 'fill-current' : ''}/>
           </button>
        </div>
      </div>
    </div>
  );
};

export default ProductDetailPage;
