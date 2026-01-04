import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import {
  ShieldCheck, MessageCircle, Share2, Flag, Heart,
  ShieldAlert, Loader2, ShoppingBag, Store, ArrowLeft,
  ChevronRight, X, Clock, Box, MapPin, CheckCircle2,
  AlertCircle, Copy, Send, Star, Eye, Gift, 
  Maximize2, ChevronLeft, QrCode, AlertTriangle
} from 'lucide-react';
import { Product, User, Comment, ProductStatus } from '../types';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import ProductCard from '../components/ProductCard';

// ============================================================================
// 0. UTILS & TYPES EXTENSION
// ============================================================================

// Mở rộng Type cục bộ để handle các trường dữ liệu phong phú hơn
interface RichUser extends User {
  joinDate?: string;
  responseRate?: string; // Ví dụ: '98%'
}

// Format tiền tệ
const formatCurrency = (amount: number) => 
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);

// Tính thời gian tương đối (VD: 5 phút trước)
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
// 1. GOD-TIER STYLES (CSS-IN-JS)
// ============================================================================

const GlobalStyles = () => (
  <style>{`
    :root {
      --primary: #00418E;
      --primary-dark: #003370;
      --glass: rgba(255, 255, 255, 0.85);
      --glass-border: rgba(255, 255, 255, 0.6);
    }

    /* --- Keyframe Animations --- */
    @keyframes slideUpFade {
      0% { opacity: 0; transform: translateY(30px) scale(0.98); }
      100% { opacity: 1; transform: translateY(0) scale(1); }
    }
    @keyframes fadeInZoom {
      0% { opacity: 0; transform: scale(0.95); }
      100% { opacity: 1; transform: scale(1); }
    }
    @keyframes shimmer {
      0% { background-position: -1000px 0; }
      100% { background-position: 1000px 0; }
    }
    @keyframes heartbeat {
      0% { transform: scale(1); }
      15% { transform: scale(1.3); }
      30% { transform: scale(1); }
      45% { transform: scale(1.15); }
      60% { transform: scale(1); }
    }
    @keyframes blob {
      0% { transform: translate(0px, 0px) scale(1); }
      33% { transform: translate(30px, -50px) scale(1.1); }
      66% { transform: translate(-20px, 20px) scale(0.9); }
      100% { transform: translate(0px, 0px) scale(1); }
    }

    /* --- Classes --- */
    .animate-enter { animation: slideUpFade 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; opacity: 0; }
    .animate-pop { animation: fadeInZoom 0.4s cubic-bezier(0.34, 1.56, 0.64, 1); }
    .animate-heartbeat { animation: heartbeat 0.6s ease-in-out; }
    .animate-blob { animation: blob 7s infinite; }
    
    .glass-effect {
      background: var(--glass);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid var(--glass-border);
    }
    
    .shimmer-effect {
      background: linear-gradient(to right, #f6f7f8 0%, #edeef1 20%, #f6f7f8 40%, #f6f7f8 100%);
      background-size: 2000px 100%;
      animation: shimmer 1.5s infinite linear;
    }

    .hide-scrollbar::-webkit-scrollbar { display: none; }
    .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

    .custom-prose { color: #334155; line-height: 1.8; font-size: 1rem; }
    .custom-prose p { margin-bottom: 1em; }
    .custom-prose ul { list-style: disc inside; margin-bottom: 1em; padding-left: 1em; }

    .safe-area-pb { padding-bottom: env(safe-area-inset-bottom); }
  `}</style>
);

// ============================================================================
// 2. ATOMIC COMPONENTS (UI MODULES)
// ============================================================================

// 2.1. Lightbox Gallery (Xem ảnh full màn hình)
const Lightbox = ({ images, onClose }: { images: string[], onClose: () => void }) => {
  const [idx, setIdx] = useState(0);

  const next = (e: React.MouseEvent) => { e.stopPropagation(); setIdx((p) => (p + 1) % images.length); };
  const prev = (e: React.MouseEvent) => { e.stopPropagation(); setIdx((p) => (p - 1 + images.length) % images.length); };

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') setIdx((p) => (p + 1) % images.length);
      if (e.key === 'ArrowLeft') setIdx((p) => (p - 1 + images.length) % images.length);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [images.length, onClose]);

  return (
    <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center animate-pop" onClick={onClose}>
      <button className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all z-50" onClick={onClose}>
        <X size={24} />
      </button>
      
      <div className="absolute top-6 left-6 text-white/60 font-mono text-sm">
        {idx + 1} / {images.length}
      </div>

      <button onClick={prev} className="absolute left-4 p-4 text-white/80 hover:bg-white/10 rounded-full transition-all group z-50">
        <ChevronLeft size={40} className="group-hover:-translate-x-1 transition-transform"/>
      </button>

      <img 
        src={images[idx]} 
        className="max-h-[85vh] max-w-[90vw] object-contain shadow-2xl rounded-lg select-none"
        alt="Full view"
        onClick={(e) => e.stopPropagation()}
      />

      <button onClick={next} className="absolute right-4 p-4 text-white/80 hover:bg-white/10 rounded-full transition-all group z-50">
        <ChevronRight size={40} className="group-hover:translate-x-1 transition-transform"/>
      </button>

      <div className="absolute bottom-8 flex gap-2">
        {images.map((_, i) => (
          <div key={i} className={`w-2 h-2 rounded-full transition-all ${i === idx ? 'bg-white scale-125' : 'bg-white/30'}`} />
        ))}
      </div>
    </div>
  );
};

// 2.2. Product Gallery Component (Fix lỗi Type tại đây)
const ProductGallery = ({ images, status, onOpenLightbox }: { images: string[], status: ProductStatus | string, onOpenLightbox: () => void }) => {
  const [activeImg, setActiveImg] = useState(images[0]);
  const [isZoomed, setIsZoomed] = useState(false);

  useEffect(() => { if (images.length > 0) setActiveImg(images[0]); }, [images]);

  return (
    <div className="flex flex-col gap-4 w-full select-none">
      <div 
        className="relative aspect-square lg:aspect-[4/3] rounded-[2rem] overflow-hidden bg-white border border-gray-100 shadow-sm cursor-zoom-in group"
        onMouseEnter={() => setIsZoomed(true)}
        onMouseLeave={() => setIsZoomed(false)}
        onClick={onOpenLightbox}
      >
        <img 
          src={activeImg} 
          alt="Main product" 
          className={`w-full h-full object-contain mix-blend-multiply transition-transform duration-700 ease-out ${isZoomed ? 'scale-110' : 'scale-100'}`}
        />
        
        {/* Status Badge */}
        {status === 'sold' && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] z-10 flex items-center justify-center animate-pop">
            <div className="border-[3px] border-white text-white text-4xl font-black uppercase -rotate-12 tracking-widest px-6 py-2">ĐÃ BÁN</div>
          </div>
        )}
        
        <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full text-xs font-bold shadow-sm flex items-center gap-1.5 text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <Maximize2 size={14}/> Xem ảnh lớn
        </div>
      </div>

      {images.length > 1 && (
        <div className="flex gap-3 overflow-x-auto pb-2 hide-scrollbar">
          {images.map((img, i) => (
            <button 
              key={i}
              onMouseEnter={() => setActiveImg(img)}
              className={`w-20 h-20 flex-shrink-0 rounded-2xl overflow-hidden border-2 transition-all duration-300 relative ${activeImg === img ? 'border-[#00418E] ring-2 ring-blue-50 opacity-100 scale-105' : 'border-transparent opacity-60 hover:opacity-100 hover:scale-105'}`}
            >
              <img src={img} alt={`Thumb ${i}`} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// 2.3. Seller Profile Card
const SellerCard = ({ seller, isVerified }: { seller: RichUser, isVerified: boolean }) => (
  <div className="bg-white p-6 rounded-[1.5rem] border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-500 transform hover:-translate-y-1 group relative overflow-hidden">
    {/* Decorative BG */}
    <div className="absolute -top-10 -right-10 w-32 h-32 bg-gradient-to-br from-blue-50 to-transparent rounded-full opacity-50 group-hover:scale-150 transition-transform duration-700"></div>
    
    <div className="flex items-center gap-5 relative z-10">
      <div className="relative">
        <div className="w-16 h-16 rounded-full p-[2px] bg-gradient-to-tr from-[#00418E] to-[#00B0F0]">
          <img src={seller.avatar || 'https://via.placeholder.com/150'} className="w-full h-full rounded-full object-cover border-[3px] border-white" alt={seller.name} />
        </div>
        {isVerified && (
          <div className="absolute -bottom-1 -right-1 bg-blue-500 text-white p-1 rounded-full border-2 border-white shadow-sm animate-pop" title="Đã xác thực">
            <CheckCircle2 size={12} strokeWidth={3} />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-lg text-gray-900 truncate pr-2 group-hover:text-[#00418E] transition-colors">{seller.name}</h3>
          <Link to={`/profile/${seller.id}`} className="p-2 bg-gray-50 rounded-full hover:bg-blue-50 hover:text-[#00418E] transition-colors">
            <Store size={18} />
          </Link>
        </div>
        
        <div className="flex items-center gap-3 mt-1.5 text-xs font-medium text-gray-500">
          <div className="flex items-center gap-1 text-yellow-500 bg-yellow-50 px-2 py-0.5 rounded-md">
            <Star size={12} fill="currentColor" /> 4.9
          </div>
          <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
          <span>Online</span>
        </div>
      </div>
    </div>
  </div>
);

// 2.4. Safety Widget
const SafetyWidget = () => (
  <div className="bg-gradient-to-br from-indigo-50/50 to-blue-50/50 p-6 rounded-2xl border border-blue-100/50 backdrop-blur-sm relative overflow-hidden">
    <div className="absolute -right-6 -top-6 w-24 h-24 bg-blue-100/50 rounded-full blur-xl"></div>
    <h4 className="font-bold text-[#00418E] flex items-center gap-2 mb-4 text-sm uppercase tracking-wide">
      <ShieldCheck size={18} /> Giao dịch an toàn
    </h4>
    <ul className="space-y-3">
      {[
        "Không chuyển khoản cọc trước khi nhận hàng.",
        "Kiểm tra kỹ tình trạng sách tại nơi công cộng.",
        "Báo cáo ngay nếu thấy dấu hiệu lừa đảo."
      ].map((text, i) => (
        <li key={i} className="flex items-start gap-3 text-sm text-gray-600">
          <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0"></div>
          <span className="leading-snug">{text}</span>
        </li>
      ))}
    </ul>
  </div>
);

// 2.5. Skeleton Loader
const DetailSkeleton = () => (
  <div className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
    <div className="lg:col-span-7 space-y-6">
      <div className="aspect-[4/3] rounded-[2rem] shimmer-effect w-full shadow-inner"></div>
      <div className="flex gap-4">{[1,2,3].map(i => <div key={i} className="w-20 h-20 rounded-xl shimmer-effect"></div>)}</div>
    </div>
    <div className="lg:col-span-5 space-y-8">
      <div className="bg-white p-8 rounded-[2rem] border border-gray-100 space-y-6">
        <div className="h-8 w-3/4 rounded-xl shimmer-effect"></div>
        <div className="h-6 w-1/2 rounded-lg shimmer-effect"></div>
        <div className="h-24 w-full rounded-2xl shimmer-effect"></div>
        <div className="h-14 w-full rounded-xl shimmer-effect"></div>
      </div>
    </div>
  </div>
);

// ============================================================================
// 3. MAIN COMPONENT LOGIC
// ============================================================================

const ProductDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user: currentUser, isRestricted } = useAuth();
  const { addToast } = useToast();
  
  // State Management
  const [product, setProduct] = useState<Product | null>(null);
  const [seller, setSeller] = useState<RichUser | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  const [commentInput, setCommentInput] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  
  // UI States
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [reportReason, setReportReason] = useState('fraud');
  const [reportDesc, setReportDesc] = useState('');

  // Checks
  const isViewerUntrusted = useMemo(() => {
    if (!currentUser) return false;
    return (currentUser.banUntil && new Date(currentUser.banUntil) > new Date()) || isRestricted;
  }, [currentUser, isRestricted]);

  const isSellerUntrusted = useMemo(() => {
    if (!seller) return false;
    return seller.banUntil && new Date(seller.banUntil) > new Date();
  }, [seller]);

  // Data Fetching
  const fetchData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      // Parallel Fetch
      const [productRes, commentsRes] = await Promise.all([
        supabase.from('products').select('*').eq('id', id).single(),
        supabase.from('comments').select(`*, user:user_id(name, avatar_url)`).eq('product_id', id).order('created_at', { ascending: false })
      ]);

      if (productRes.error || !productRes.data) throw new Error("Product not found");

      const pData = productRes.data;
      // FIX TYPE CASTING HERE:
      const mappedProduct: Product = {
        ...pData,
        sellerId: pData.seller_id,
        images: pData.images || [],
        status: pData.status, // Giữ nguyên string, component sẽ xử lý
        postedAt: pData.posted_at,
        view_count: pData.view_count || 0
      };

      // Tăng view count âm thầm
      supabase.rpc('increment_view_count', { product_id: id });

      setProduct(mappedProduct);
      setComments(commentsRes.data || []);

      // Fetch Seller & Related
      const [sellerRes, relatedRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', mappedProduct.sellerId).single(),
        supabase.from('products')
          .select('*')
          .eq('category', mappedProduct.category)
          .neq('id', id)
          .eq('status', 'available')
          .limit(4)
      ]);

      if (sellerRes.data) {
        setSeller({ 
          ...sellerRes.data, 
          id: sellerRes.data.id, 
          avatar: sellerRes.data.avatar_url, 
          isVerified: sellerRes.data.is_verified, 
          banUntil: sellerRes.data.ban_until,
        });
      }

      if (relatedRes.data) {
        setRelatedProducts(relatedRes.data.map(item => ({
          ...item,
          sellerId: item.seller_id,
          images: item.images || [],
          status: item.status
        } as Product)));
      }

      // Check Like
      if (currentUser) {
        const { data } = await supabase.from('saved_products').select('id').eq('user_id', currentUser.id).eq('product_id', id).maybeSingle();
        setIsLiked(!!data);
      }

    } catch (err) {
      console.error(err);
      addToast("Không tìm thấy sản phẩm", "error");
      navigate('/market');
    } finally {
      setLoading(false);
    }
  }, [id, currentUser, addToast, navigate]);

  useEffect(() => {
    fetchData();
    window.scrollTo(0, 0);
  }, [fetchData]);

  // Actions
  const handleToggleLike = async () => {
    if (!currentUser) return navigate('/auth');
    const prevLiked = isLiked;
    setIsLiked(!prevLiked); // Optimistic Update
    try {
      if (prevLiked) await supabase.from('saved_products').delete().eq('user_id', currentUser.id).eq('product_id', id);
      else await supabase.from('saved_products').insert({ user_id: currentUser.id, product_id: id });
      addToast(prevLiked ? "Đã bỏ lưu" : "Đã lưu tin", "success");
    } catch { setIsLiked(prevLiked); }
  };

  const handleSendComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return navigate('/auth');
    if (isViewerUntrusted) return addToast("Tài khoản bị hạn chế", "error");
    if (!commentInput.trim()) return;

    setSubmittingComment(true);
    const { error } = await supabase.from('comments').insert({ 
      product_id: id, 
      user_id: currentUser.id, 
      content: commentInput.trim() 
    });
    
    if (!error) {
      setCommentInput('');
      fetchData();
      addToast("Đã bình luận", "success");
    } else {
      addToast("Lỗi khi gửi bình luận", "error");
    }
    setSubmittingComment(false);
  };

  const handleReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setSubmittingComment(true);
    await supabase.from('reports').insert({
       reporter_id: currentUser.id,
       product_id: product?.id,
       reason: `${reportReason}: ${reportDesc}`,
       status: 'pending'
    });
    setShowReportModal(false);
    setSubmittingComment(false);
    addToast("Đã gửi báo cáo", "success");
  };

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    addToast("Đã sao chép liên kết", "success");
    setShowShareModal(false);
  };

  // Render
  if (loading) return <div className="min-h-screen bg-[#F8FAFC]"><GlobalStyles /><div className="h-16 border-b bg-white mb-4"></div><DetailSkeleton /></div>;
  if (!product) return null;

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 font-sans pb-32 selection:bg-blue-100 selection:text-blue-900">
      <GlobalStyles />
      {lightboxOpen && <Lightbox images={product.images} onClose={() => setLightboxOpen(false)} />}

      {/* --- HEADER --- */}
      <div className="sticky top-0 z-40 glass-effect border-b border-gray-200/50 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4 animate-enter">
            <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-600">
              <ArrowLeft size={20} />
            </button>
            <div className="hidden sm:flex items-center gap-2 text-sm text-gray-500 font-medium">
               <Link to="/market" className="hover:text-[#00418E] transition-colors">Market</Link>
               <ChevronRight size={14} />
               <span className="text-slate-900 truncate max-w-[200px]">{product.title}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 animate-enter" style={{ animationDelay: '100ms' }}>
             <button onClick={() => setShowShareModal(!showShareModal)} className="p-2 hover:bg-blue-50 text-slate-500 hover:text-[#00418E] rounded-full transition-colors relative group">
                <Share2 size={20} />
                {showShareModal && (
                  <div className="absolute top-12 right-0 w-64 bg-white rounded-xl shadow-xl border border-gray-100 p-2 animate-pop origin-top-right z-50 flex flex-col gap-1">
                     <button onClick={copyLink} className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg w-full text-left transition-colors">
                        <Copy size={18} className="text-gray-500"/> <span className="text-sm font-bold text-gray-700">Sao chép liên kết</span>
                     </button>
                     <button className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg w-full text-left transition-colors">
                        <QrCode size={18} className="text-gray-500"/> <span className="text-sm font-bold text-gray-700">Mã QR</span>
                     </button>
                  </div>
                )}
             </button>
             <button onClick={() => setShowReportModal(true)} className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-full transition-colors">
                <Flag size={20} />
             </button>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          
          {/* --- LEFT: GALLERY & CONTENT --- */}
          <div className="lg:col-span-7 space-y-10">
            <div className="animate-enter" style={{ animationDelay: '0ms' }}>
               <ProductGallery images={product.images} status={product.status} onOpenLightbox={() => setLightboxOpen(true)} />
            </div>

            <div className="bg-white rounded-[2rem] p-8 border border-gray-100 shadow-sm animate-enter relative overflow-hidden" style={{ animationDelay: '150ms' }}>
              <div className="flex items-center gap-3 mb-6 border-b border-gray-100 pb-4">
                 <div className="p-2.5 bg-blue-50 text-[#00418E] rounded-xl">
                    <Box size={20} strokeWidth={2.5}/>
                 </div>
                 <h2 className="text-lg font-black text-slate-800 uppercase tracking-wide">Chi tiết sản phẩm</h2>
              </div>
              <div className="custom-prose text-slate-600 whitespace-pre-wrap">
                 {product.description || "Người bán chưa cung cấp mô tả chi tiết."}
              </div>
              <div className="grid grid-cols-2 gap-4 mt-8 pt-6 border-t border-gray-100">
                <div className="p-5 bg-slate-50/50 rounded-2xl border border-slate-100">
                   <span className="block text-[10px] font-bold text-slate-400 uppercase mb-1 tracking-wider">Tình trạng</span>
                   <span className="text-slate-800 font-bold flex items-center gap-2">
                      <Star size={16} className="text-yellow-500 fill-yellow-500"/> {product.condition}
                   </span>
                </div>
                <div className="p-5 bg-slate-50/50 rounded-2xl border border-slate-100">
                   <span className="block text-[10px] font-bold text-slate-400 uppercase mb-1 tracking-wider">Phương thức</span>
                   <span className="text-slate-800 font-bold flex items-center gap-2">
                      <Box size={16} className="text-blue-500"/> {product.tradeMethod === 'direct' ? 'Giao dịch trực tiếp' : 'Ship COD toàn quốc'}
                   </span>
                </div>
              </div>
            </div>

            <div className="animate-enter" style={{ animationDelay: '300ms' }}>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-black text-slate-900 flex items-center gap-3">
                  Bình luận <span className="bg-slate-100 px-2.5 py-1 rounded-full text-xs font-bold text-slate-600">{comments.length}</span>
                </h3>
              </div>

              {isViewerUntrusted ? (
                 <div className="bg-red-50 border border-red-100 rounded-2xl p-6 flex items-center gap-4">
                    <ShieldAlert className="text-red-500" size={32}/>
                    <div>
                       <h4 className="font-bold text-red-700">Tài khoản bị hạn chế</h4>
                       <p className="text-sm text-red-600">Bạn vui lòng liên hệ admin để mở khóa tính năng bình luận.</p>
                    </div>
                 </div>
              ) : currentUser ? (
                 <form onSubmit={handleSendComment} className="flex gap-4 mb-10 relative group">
                    <img src={currentUser.avatar} className="w-12 h-12 rounded-full border-2 border-white shadow-md object-cover bg-gray-100" alt="Me"/>
                    <div className="flex-1 relative">
                       <textarea 
                          value={commentInput}
                          onChange={e => setCommentInput(e.target.value)}
                          placeholder="Đặt câu hỏi cho người bán..."
                          className="w-full bg-white border border-gray-200 rounded-2xl p-4 pr-14 focus:outline-none focus:border-[#00418E] focus:ring-4 focus:ring-blue-50/50 transition-all min-h-[80px] resize-none shadow-sm placeholder:text-gray-400 font-medium"
                       />
                       <button 
                          disabled={!commentInput.trim() || submittingComment}
                          className="absolute right-3 bottom-3 p-2 bg-[#00418E] text-white rounded-xl hover:bg-[#003370] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg active:scale-95"
                       >
                          {submittingComment ? <Loader2 size={18} className="animate-spin"/> : <Send size={18}/>}
                       </button>
                    </div>
                 </form>
              ) : (
                 <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-8 rounded-2xl text-center border border-blue-100 mb-8">
                    <p className="text-blue-900 font-bold mb-3">Đăng nhập để tham gia thảo luận</p>
                    <Link to="/auth" className="inline-flex items-center gap-2 bg-[#00418E] text-white px-6 py-2.5 rounded-xl font-bold shadow-lg shadow-blue-200 hover:shadow-xl hover:-translate-y-0.5 transition-all">
                       Đăng nhập ngay <ChevronRight size={16}/>
                    </Link>
                 </div>
              )}

              <div className="space-y-6">
                 {comments.map((c) => (
                    <div key={c.id} className="flex gap-4 animate-enter group">
                      <img src={c.userAvatar} className="w-10 h-10 rounded-full object-cover border border-gray-100 shadow-sm" alt="User" />
                      <div className="flex-1 bg-white p-5 rounded-2xl rounded-tl-none border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-gray-900">{c.userName}</span>
                            {c.userId === seller?.id && <span className="bg-blue-600 text-white text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Chủ Shop</span>}
                          </div>
                          <span className="text-[10px] text-gray-400 font-medium">{timeAgo(c.createdAt)}</span>
                        </div>
                        <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{c.content}</p>
                      </div>
                    </div>
                 ))}
              </div>
            </div>
          </div>

          {/* --- RIGHT: INFO & ACTIONS --- */}
          <div className="lg:col-span-5 relative">
             <div className="sticky top-24 space-y-6 animate-enter" style={{ animationDelay: '100ms' }}>
                
                {/* Product Card Info */}
                <div className="bg-white rounded-[2.5rem] p-8 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] border border-gray-100 relative overflow-hidden group">
                   <div className="absolute -top-20 -right-20 w-64 h-64 bg-blue-50 rounded-full blur-3xl opacity-60 group-hover:opacity-100 transition-opacity duration-700"></div>
                   
                   <div className="relative z-10">
                      <div className="flex justify-between items-start mb-4">
                         <span className="bg-blue-50 text-[#00418E] text-xs font-black px-3 py-1.5 rounded-lg uppercase tracking-wider border border-blue-100">
                            {product.category}
                         </span>
                         <button onClick={handleToggleLike} className="group/heart focus:outline-none">
                            <Heart 
                               size={28} 
                               className={`transition-all duration-300 ${isLiked ? 'fill-red-500 text-red-500 scale-110 animate-heartbeat' : 'text-gray-300 group-hover/heart:text-red-400'}`} 
                            />
                         </button>
                      </div>

                      <h1 className="text-3xl font-black text-slate-900 leading-tight mb-4">{product.title}</h1>
                      
                      <div className="flex items-center gap-6 text-sm text-slate-500 mb-8 border-b border-gray-100 pb-6">
                         <div className="flex items-center gap-2 font-medium"><Clock size={16} className="text-[#00418E]"/> {timeAgo(product.postedAt)}</div>
                         <div className="flex items-center gap-2 font-medium"><Eye size={16} className="text-[#00418E]"/> {product.view_count}</div>
                         <div className="flex items-center gap-2 font-medium"><MapPin size={16} className="text-[#00418E]"/> TP.HCM</div>
                      </div>

                      <div className="mb-8">
                         <div className="flex items-end gap-3 mb-2">
                            <span className="text-5xl font-black text-[#00418E] tracking-tight">
                               {product.price === 0 ? 'Miễn phí' : formatCurrency(product.price)}
                            </span>
                            {product.price > 0 && (
                               <span className="text-lg text-gray-400 line-through mb-2 decoration-2 decoration-red-300">
                                  {formatCurrency(product.price * 1.2)}
                               </span>
                            )}
                         </div>
                         {product.price === 0 && (
                            <div className="inline-flex items-center gap-2 text-xs font-bold text-green-700 bg-green-100 px-3 py-1.5 rounded-full border border-green-200">
                               <Gift size={14} className="animate-bounce"/> Quà tặng sinh viên
                            </div>
                         )}
                      </div>

                      <div className="hidden lg:flex flex-col gap-3">
                         {currentUser?.id === product.sellerId ? (
                             <button onClick={() => navigate(`/post-item?edit=${product.id}`)} className="w-full py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-black text-lg transition-all flex items-center justify-center gap-2">
                                Chỉnh sửa bài đăng
                             </button>
                         ) : (
                            <>
                               <button 
                                  onClick={() => navigate(`/chat?partnerId=${seller?.id}`)}
                                  disabled={isViewerUntrusted || isSellerUntrusted || product.status === 'sold'}
                                  className={`w-full py-4 rounded-2xl font-black text-lg shadow-xl shadow-blue-200/50 flex items-center justify-center gap-3 transition-all hover:scale-[1.02] active:scale-95 ${
                                     isViewerUntrusted || isSellerUntrusted || product.status === 'sold'
                                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none' 
                                        : 'bg-gradient-to-r from-[#00418E] to-[#003370] text-white hover:shadow-2xl'
                                  }`}
                               >
                                  <MessageCircle size={22} className="fill-current"/> 
                                  {product.status === 'sold' ? 'Đã bán' : 'Chat với người bán'}
                               </button>
                               <button 
                                  disabled={product.status === 'sold'}
                                  onClick={() => addToast("Chức năng đang bảo trì", "info")} 
                                  className="w-full py-4 bg-white border-2 border-[#00418E] text-[#00418E] rounded-2xl font-black text-lg hover:bg-blue-50 transition-all flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-95 disabled:opacity-50"
                               >
                                  <ShoppingBag size={22}/> Mua ngay
                               </button>
                            </>
                         )}
                      </div>
                   </div>
                </div>

                {seller && <SellerCard seller={seller} isVerified={seller.isVerified} />}
                <SafetyWidget />

             </div>
          </div>
        </div>

        {/* --- RELATED PRODUCTS --- */}
        {relatedProducts.length > 0 && (
          <div className="mt-24 border-t border-gray-200 pt-16 animate-enter" style={{ animationDelay: '400ms' }}>
             <div className="flex items-center justify-between mb-10">
                <h3 className="text-3xl font-black text-slate-900">Có thể bạn cũng thích</h3>
                <Link to="/market" className="text-[#00418E] font-bold text-sm hover:underline flex items-center gap-1 group">
                   Xem thêm <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform"/>
                </Link>
             </div>
             <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {relatedProducts.map(p => <ProductCard key={p.id} product={p} />)}
             </div>
          </div>
        )}
      </main>

      {/* --- MOBILE FLOATING BAR --- */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-t border-gray-200 p-4 lg:hidden z-50 safe-area-pb shadow-[0_-10px_40px_rgba(0,0,0,0.15)] animate-enter">
         <div className="flex gap-3">
            <button 
               onClick={() => navigate(`/chat?partnerId=${seller?.id}`)} 
               disabled={isViewerUntrusted || isSellerUntrusted || product.status === 'sold'}
               className="flex-1 bg-[#00418E] text-white py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 disabled:bg-gray-300 shadow-lg active:scale-95 transition-transform"
            >
               <MessageCircle size={20} className="fill-current"/> 
               Chat Ngay
            </button>
            <button 
               onClick={handleToggleLike} 
               className={`w-14 flex items-center justify-center rounded-xl border-2 transition-all active:scale-90 ${isLiked ? 'border-red-500 bg-red-50 text-red-500' : 'border-gray-200 text-gray-400 bg-white'}`}
            >
               <Heart size={24} className={isLiked ? 'fill-current' : ''}/>
            </button>
         </div>
      </div>

      {/* --- REPORT MODAL --- */}
      {showReportModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-pop" onClick={() => setShowReportModal(false)}></div>
           <div className="bg-white rounded-[2rem] w-full max-w-sm overflow-hidden shadow-2xl relative z-10 animate-enter">
              <div className="bg-red-50 p-6 border-b border-red-100 flex justify-between items-center">
                 <h3 className="text-red-600 font-black flex items-center gap-2 uppercase tracking-wide text-sm">
                    <AlertTriangle size={20}/> Báo cáo vi phạm
                 </h3>
                 <button onClick={() => setShowReportModal(false)} className="text-red-400 hover:text-red-600 p-1 hover:bg-red-100 rounded-full transition-colors">
                    <X size={20}/>
                 </button>
              </div>
              <form onSubmit={handleReport} className="p-6 space-y-5">
                 <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2 tracking-wider">Lý do báo cáo</label>
                    <div className="relative">
                       <select 
                          className="w-full p-4 bg-gray-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-red-200 font-bold text-gray-700 appearance-none"
                          value={reportReason}
                          onChange={e => setReportReason(e.target.value)}
                       >
                          <option value="fraud">Lừa đảo / Hàng giả</option>
                          <option value="spam">Spam / Tin rác</option>
                          <option value="prohibited">Hàng cấm / Phản cảm</option>
                          <option value="other">Lý do khác</option>
                       </select>
                       <ChevronRight className="absolute right-4 top-4 rotate-90 text-gray-400 pointer-events-none" size={16}/>
                    </div>
                 </div>
                 <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2 tracking-wider">Chi tiết vi phạm</label>
                    <textarea 
                       rows={4} 
                       className="w-full p-4 bg-gray-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-red-200 text-sm font-medium placeholder-gray-400 resize-none"
                       placeholder="Mô tả chi tiết để Admin xử lý..."
                       value={reportDesc}
                       onChange={e => setReportDesc(e.target.value)}
                    />
                 </div>
                 <button className="w-full bg-red-600 text-white py-4 rounded-xl font-black hover:bg-red-700 transition-all shadow-lg shadow-red-200 active:scale-95 uppercase tracking-widest text-sm flex items-center justify-center gap-2">
                    {submittingComment ? <Loader2 className="animate-spin"/> : 'GỬI BÁO CÁO'}
                 </button>
              </form>
           </div>
        </div>
      )}

    </div>
  );
};

export default ProductDetailPage;
