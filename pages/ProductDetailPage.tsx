import React, { 
  useEffect, useState, useMemo, useRef, useCallback, useReducer, 
  createContext, useContext, ReactNode, MouseEvent as ReactMouseEvent 
} from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import {
  ShieldCheck, MessageCircle, Share2, Flag, Heart,
  ShieldAlert, Loader2, ShoppingBag, Store, ArrowLeft,
  ChevronRight, X, Clock, Box, MapPin, CheckCircle2,
  AlertCircle, Copy, Send, Star, Eye, Gift, 
  Maximize2, ChevronLeft, QrCode, AlertTriangle,
  MoreVertical, ThumbsUp, ThumbsDown, Filter,
  TrendingUp, Calendar, Info, Camera, Image as ImageIcon,
  Check, XCircle, Search, Hash, CornerDownRight,
  User as UserIcon, Bell, Settings, LogOut, ChevronDown
} from 'lucide-react';
import { Product, User, Comment, ProductStatus } from '../types';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';

// ============================================================================
// PART 1: UTILITIES & CONSTANTS & TYPES (THE FOUNDATION)
// ============================================================================

const ANIMATION_DURATION = 300;
const DATE_LOCALE = 'vi-VN';
const CURRENCY_LOCALE = 'vi-VN';
const CURRENCY_CODE = 'VND';

// --- Extensive Types ---
type ThemeMode = 'light' | 'dark';
type ViewMode = 'grid' | 'list';
type SortOption = 'newest' | 'oldest' | 'price_asc' | 'price_desc';

interface Dimensions {
  width: number;
  height: number;
}

interface Position {
  x: number;
  y: number;
}

interface ScrollPosition {
  scrollX: number;
  scrollY: number;
}

// Extended User Interface
interface RichUser extends User {
  joinDate: string;
  responseRate: number; // 0-100
  responseTime: string; // e.g. "within 1 hour"
  totalSales: number;
  badges: string[]; // e.g. ["verified", "fast-shipper"]
  followers: number;
  following: number;
  bio?: string;
  coverImage?: string;
  isOnline?: boolean;
  lastActive?: string;
}

// Extended Product Interface
interface RichProduct extends Product {
  view_count: number;
  likes_count: number;
  shares_count: number;
  original_price?: number;
  tags: string[];
  dimensions?: string; // e.g. "20x30x5 cm"
  weight?: string; // e.g. "500g"
  brand?: string;
  model?: string;
  sku?: string;
  history: { date: string; price: number }[]; // Price history
}

// Review Interface (Mocking a complex review system)
interface ProductReview {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  rating: number;
  content: string;
  images?: string[];
  likes: number;
  isVerifiedPurchase: boolean;
  createdAt: string;
  reply?: {
    sellerId: string;
    content: string;
    createdAt: string;
  };
}

// --- Helper Functions ---

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat(CURRENCY_LOCALE, { 
    style: 'currency', 
    currency: CURRENCY_CODE 
  }).format(amount);
};

const formatNumber = (num: number): string => {
  return new Intl.NumberFormat(CURRENCY_LOCALE, { notation: "compact" }).format(num);
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat(DATE_LOCALE, {
    year: 'numeric', month: 'long', day: 'numeric'
  }).format(date);
};

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

const generateColorFromStr = (str: string): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const c = (hash & 0x00ffffff).toString(16).toUpperCase();
  return '#' + '00000'.substring(0, 6 - c.length) + c;
};

const clsx = (...classes: (string | undefined | null | false)[]): string => {
  return classes.filter(Boolean).join(' ');
};

// --- Custom Hooks ---

// 1. Hook to detect window size
const useWindowSize = (): Dimensions => {
  const [windowSize, setWindowSize] = useState<Dimensions>({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return windowSize;
};

// 2. Hook to detect click outside
const useOnClickOutside = (ref: React.RefObject<HTMLElement>, handler: (event: MouseEvent | TouchEvent) => void) => {
  useEffect(() => {
    const listener = (event: MouseEvent | TouchEvent) => {
      if (!ref.current || ref.current.contains(event.target as Node)) {
        return;
      }
      handler(event);
    };
    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);
    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [ref, handler]);
};

// 3. Hook for scroll position
const useScrollPosition = (): ScrollPosition => {
  const [scrollPos, setScrollPos] = useState<ScrollPosition>({ scrollX: 0, scrollY: 0 });
  useEffect(() => {
    const handleScroll = () => {
      setScrollPos({ scrollX: window.scrollX, scrollY: window.scrollY });
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  return scrollPos;
};

// 4. Hook for keyboard shortcuts
const useKeyPress = (targetKey: string, handler: () => void) => {
  useEffect(() => {
    const downHandler = ({ key }: KeyboardEvent) => {
      if (key === targetKey) handler();
    };
    window.addEventListener('keydown', downHandler);
    return () => window.removeEventListener('keydown', downHandler);
  }, [targetKey, handler]);
};

// ============================================================================
// PART 2: THE UI SYSTEM (DESIGN SYSTEM IN A FILE)
// ============================================================================

// --- 2.1 CSS-in-JS Styles ---
const Styles = () => (
  <style>{`
    :root {
      --primary-50: #eff6ff;
      --primary-100: #dbeafe;
      --primary-200: #bfdbfe;
      --primary-300: #93c5fd;
      --primary-400: #60a5fa;
      --primary-500: #3b82f6;
      --primary-600: #2563eb;
      --primary-700: #1d4ed8;
      --primary-800: #1e40af;
      --primary-900: #1e3a8a;
      
      --success: #10b981;
      --warning: #f59e0b;
      --danger: #ef4444;
      --info: #3b82f6;

      --glass-bg: rgba(255, 255, 255, 0.7);
      --glass-border: rgba(255, 255, 255, 0.5);
      --glass-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.07);
    }

    body {
      background-color: #f8fafc;
      background-image: 
        radial-gradient(at 40% 20%, hsla(213,100%,92%,1) 0px, transparent 50%),
        radial-gradient(at 80% 0%, hsla(189,100%,92%,1) 0px, transparent 50%),
        radial-gradient(at 0% 50%, hsla(341,100%,92%,1) 0px, transparent 50%);
      background-attachment: fixed;
    }

    /* Scrollbar */
    ::-webkit-scrollbar { width: 8px; height: 8px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
    ::-webkit-scrollbar-thumb:hover { background: #94a3b8; }

    /* Animations */
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes scaleIn { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }
    @keyframes bounce-slow { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
    @keyframes pulse-soft { 0%, 100% { opacity: 1; } 50% { opacity: .7; } }
    @keyframes spin-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

    .animate-enter { animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; opacity: 0; }
    .delay-100 { animation-delay: 100ms; }
    .delay-200 { animation-delay: 200ms; }
    .delay-300 { animation-delay: 300ms; }
    .delay-400 { animation-delay: 400ms; }
    .delay-500 { animation-delay: 500ms; }

    .glass-panel {
      background: var(--glass-bg);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1px solid var(--glass-border);
      box-shadow: var(--glass-shadow);
    }

    .custom-prose h1, .custom-prose h2 { color: #0f172a; font-weight: 800; margin-top: 1.5em; margin-bottom: 0.5em; }
    .custom-prose p { margin-bottom: 1em; line-height: 1.75; color: #475569; }
    .custom-prose ul { list-style: disc inside; margin-bottom: 1em; padding-left: 0.5em; }
    .custom-prose strong { color: #1e293b; font-weight: 700; }
    
    .text-gradient {
      background: linear-gradient(135deg, var(--primary-600), var(--primary-400));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .interactive-card {
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .interactive-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 12px 24px -8px rgba(0, 0, 0, 0.1);
    }
  `}</style>
);

// --- 2.2 Reusable Components ---

// Button Component
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  isLoading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({
  className, variant = 'primary', size = 'md', isLoading, leftIcon, rightIcon, fullWidth, children, disabled, ...props
}, ref) => {
  const baseStyles = "inline-flex items-center justify-center rounded-xl font-bold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100";
  
  const variants = {
    primary: "bg-[#00418E] text-white hover:bg-[#003370] focus:ring-[#00418E] shadow-lg shadow-blue-500/30 border border-transparent",
    secondary: "bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 shadow-sm focus:ring-slate-200",
    outline: "bg-transparent border-2 border-[#00418E] text-[#00418E] hover:bg-blue-50 focus:ring-blue-200",
    ghost: "bg-transparent text-slate-600 hover:bg-slate-100 focus:ring-slate-200",
    danger: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 shadow-lg shadow-red-500/30",
    success: "bg-green-600 text-white hover:bg-green-700 focus:ring-green-500 shadow-lg shadow-green-500/30"
  };

  const sizes = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2.5 text-sm",
    lg: "px-6 py-3.5 text-base",
    xl: "px-8 py-4 text-lg"
  };

  return (
    <button
      ref={ref}
      className={clsx(baseStyles, variants[variant], sizes[size], fullWidth && "w-full", className)}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && <Loader2 className="animate-spin mr-2" size={size === 'sm' ? 14 : 18} />}
      {!isLoading && leftIcon && <span className="mr-2">{leftIcon}</span>}
      {children}
      {!isLoading && rightIcon && <span className="ml-2">{rightIcon}</span>}
    </button>
  );
});

// Badge Component
const Badge = ({ children, variant = 'info', className }: { children: ReactNode, variant?: 'info' | 'success' | 'warning' | 'danger' | 'neutral', className?: string }) => {
  const styles = {
    info: "bg-blue-100 text-blue-700 border-blue-200",
    success: "bg-green-100 text-green-700 border-green-200",
    warning: "bg-yellow-100 text-yellow-700 border-yellow-200",
    danger: "bg-red-100 text-red-700 border-red-200",
    neutral: "bg-slate-100 text-slate-700 border-slate-200",
  };
  return (
    <span className={clsx("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border", styles[variant], className)}>
      {children}
    </span>
  );
};

// Avatar Component
const Avatar = ({ src, alt, size = 'md', className, isOnline }: { src?: string, alt: string, size?: 'sm' | 'md' | 'lg' | 'xl', className?: string, isOnline?: boolean }) => {
  const sizes = { sm: "w-8 h-8", md: "w-10 h-10", lg: "w-14 h-14", xl: "w-20 h-20" };
  return (
    <div className={clsx("relative inline-block", className)}>
      <img src={src || `https://ui-avatars.com/api/?name=${encodeURIComponent(alt)}&background=random`} alt={alt} className={clsx("rounded-full object-cover border-2 border-white shadow-sm", sizes[size])} />
      {isOnline && <span className="absolute bottom-0 right-0 block h-3 w-3 rounded-full ring-2 ring-white bg-green-500" />}
    </div>
  );
};

// Tooltip Component
const Tooltip = ({ children, content }: { children: ReactNode, content: string }) => {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative inline-block" onMouseEnter={() => setVisible(true)} onMouseLeave={() => setVisible(false)}>
      {children}
      {visible && (
        <div className="absolute z-50 px-3 py-2 text-xs font-bold text-white bg-slate-800 rounded-lg shadow-xl -top-10 left-1/2 -translate-x-1/2 whitespace-nowrap animate-enter">
          {content}
          <div className="absolute bottom-[-4px] left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-800 rotate-45"></div>
        </div>
      )}
    </div>
  );
};

// Modal Component
const Modal = ({ isOpen, onClose, title, children, maxWidth = 'max-w-md' }: { isOpen: boolean, onClose: () => void, title: ReactNode, children: ReactNode, maxWidth?: string }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-y-auto">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose} />
      <div className={clsx("relative bg-white rounded-[2rem] shadow-2xl w-full transform transition-all animate-scale-in flex flex-col max-h-[90vh]", maxWidth)}>
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h3 className="text-xl font-black text-gray-900">{title}</h3>
          <button onClick={onClose} className="p-2 bg-gray-50 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-full transition-colors"><X size={20} /></button>
        </div>
        <div className="p-6 overflow-y-auto custom-scrollbar">{children}</div>
      </div>
    </div>
  );
};

// ============================================================================
// PART 3: PAGE-SPECIFIC SUB-COMPONENTS
// ============================================================================

// 3.1. Advanced Image Gallery with Parallax & Magnifier
const AdvancedGallery = ({ images, status, onFullscreen }: { images: string[], status: ProductStatus, onFullscreen: () => void }) => {
  const [activeIdx, setActiveIdx] = useState(0);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: ReactMouseEvent) => {
    if (!containerRef.current) return;
    const { left, top, width, height } = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - left) / width) * 100;
    const y = ((e.clientY - top) / height) * 100;
    setMousePos({ x, y });
  };

  return (
    <div className="flex flex-col gap-6 select-none">
      <div 
        ref={containerRef}
        className="relative aspect-square lg:aspect-[4/3] rounded-[2.5rem] overflow-hidden bg-white border border-white shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] group cursor-zoom-in"
        onMouseMove={handleMouseMove}
        onClick={onFullscreen}
      >
        <div className="absolute inset-0 bg-slate-50 opacity-0 group-hover:opacity-100 transition-opacity z-0" />
        
        {/* Main Image with transform effect */}
        <img 
          src={images[activeIdx]} 
          alt="Product Main" 
          className="relative z-10 w-full h-full object-contain p-4 transition-transform duration-200 ease-out"
          style={{ 
            transformOrigin: `${mousePos.x}% ${mousePos.y}%`,
            transform: 'scale(1.02)' 
          }}
        />

        {/* Status Badge */}
        {status === 'sold' && (
          <div className="absolute inset-0 z-20 bg-black/40 backdrop-blur-[2px] flex items-center justify-center">
            <div className="border-[6px] border-white text-white text-5xl md:text-6xl font-black uppercase -rotate-12 tracking-widest px-10 py-4 mix-blend-overlay">
              ĐÃ BÁN
            </div>
          </div>
        )}

        {/* Hover Controls */}
        <div className="absolute bottom-6 right-6 z-20 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-4 group-hover:translate-y-0">
          <Button size="sm" variant="secondary" className="rounded-full shadow-lg" leftIcon={<Maximize2 size={16}/>}>
            Toàn màn hình
          </Button>
        </div>
      </div>

      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="flex gap-4 overflow-x-auto pb-4 px-2 hide-scrollbar snap-x">
          {images.map((img, i) => (
            <button 
              key={i}
              onClick={() => setActiveIdx(i)}
              className={clsx(
                "relative flex-shrink-0 w-20 h-20 rounded-2xl overflow-hidden border-2 transition-all duration-300 snap-center",
                activeIdx === i ? "border-blue-600 ring-4 ring-blue-50 scale-105 shadow-md" : "border-transparent opacity-60 hover:opacity-100 hover:border-gray-200"
              )}
            >
              <img src={img} alt={`thumb-${i}`} className="w-full h-full object-cover" />
              {activeIdx === i && <div className="absolute inset-0 bg-blue-600/10" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// 3.2. Seller Profile Card (Rich Data)
const SellerProfileCard = ({ seller }: { seller: RichUser }) => {
  const navigate = useNavigate();
  return (
    <div className="glass-panel p-6 rounded-[2rem] hover:bg-white transition-colors duration-300 group">
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-full p-[2px] bg-gradient-to-tr from-blue-600 to-cyan-400">
              <img src={seller.avatar || 'https://via.placeholder.com/150'} className="w-full h-full rounded-full object-cover border-[3px] border-white" alt={seller.name}/>
            </div>
            {seller.isVerified && <div className="absolute -bottom-1 -right-1 bg-blue-500 text-white p-1 rounded-full border-2 border-white"><CheckCircle2 size={12}/></div>}
          </div>
          <div>
            <h4 className="text-lg font-black text-slate-800 flex items-center gap-2">
              {seller.name}
              {seller.badges?.includes('verified') && <Badge variant="info">Verified</Badge>}
            </h4>
            <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
              <span className={clsx("w-2 h-2 rounded-full", seller.isOnline ? "bg-green-500" : "bg-gray-300")}></span>
              {seller.isOnline ? "Đang online" : `Online ${timeAgo(seller.lastActive || new Date().toISOString())}`}
            </div>
          </div>
        </div>
        <Button size="sm" variant="outline" className="rounded-full" onClick={() => navigate(`/profile/${seller.id}`)}>
          Xem Shop
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-2 py-4 border-t border-b border-gray-100/50">
        <div className="text-center p-2 rounded-xl hover:bg-slate-50 transition-colors">
          <div className="text-xs text-slate-400 font-bold uppercase mb-1">Đánh giá</div>
          <div className="text-slate-800 font-black flex items-center justify-center gap-1">
            <Star size={14} className="text-yellow-400 fill-yellow-400"/> 4.9
          </div>
        </div>
        <div className="text-center p-2 rounded-xl hover:bg-slate-50 transition-colors border-l border-r border-gray-100">
          <div className="text-xs text-slate-400 font-bold uppercase mb-1">Phản hồi</div>
          <div className="text-slate-800 font-black">98%</div>
        </div>
        <div className="text-center p-2 rounded-xl hover:bg-slate-50 transition-colors">
          <div className="text-xs text-slate-400 font-bold uppercase mb-1">Tham gia</div>
          <div className="text-slate-800 font-black">{timeAgo(seller.joinDate)}</div>
        </div>
      </div>

      <div className="mt-4 flex gap-2">
         {/* Mock Badges */}
         {['Fast Shipper', 'Reliable', 'Friendly'].map((badge, i) => (
           <span key={i} className="text-[10px] bg-slate-100 text-slate-600 px-2 py-1 rounded-md font-bold">{badge}</span>
         ))}
      </div>
    </div>
  );
};

// 3.3. Trust & Safety Widget
const TrustWidget = () => (
  <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#00418E] to-[#002B5E] p-6 text-white shadow-xl shadow-blue-900/20">
    <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
    <div className="absolute bottom-0 left-0 -mb-4 -ml-4 w-24 h-24 bg-cyan-400/20 rounded-full blur-xl"></div>
    
    <div className="relative z-10">
      <h3 className="flex items-center gap-2 font-bold text-lg mb-4">
        <ShieldCheck className="text-cyan-300" /> BookExchange Guard
      </h3>
      <ul className="space-y-4 text-sm text-blue-100/90 font-medium">
        <li className="flex gap-3">
          <CheckCircle2 size={18} className="text-cyan-400 shrink-0 mt-0.5" />
          <span>Thanh toán an toàn, chỉ giải ngân khi bạn xác nhận đã nhận hàng.</span>
        </li>
        <li className="flex gap-3">
          <CheckCircle2 size={18} className="text-cyan-400 shrink-0 mt-0.5" />
          <span>Hoàn tiền 100% nếu sách không đúng mô tả hoặc giả mạo.</span>
        </li>
      </ul>
      <button className="mt-6 w-full py-3 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 rounded-xl text-xs font-bold uppercase tracking-wider transition-all">
        Xem chính sách bảo vệ
      </button>
    </div>
  </div>
);

// 3.4. Price History Chart (CSS-only Visualization)
const PriceHistoryChart = ({ history }: { history: { date: string, price: number }[] }) => {
  if (!history || history.length === 0) return null;
  const maxPrice = Math.max(...history.map(h => h.price));
  
  return (
    <div className="mt-8 pt-6 border-t border-gray-100">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2"><TrendingUp size={16}/> Lịch sử giá</h4>
        <span className="text-xs text-green-600 font-bold bg-green-50 px-2 py-1 rounded-lg">Giá tốt nhất</span>
      </div>
      <div className="flex items-end gap-2 h-24 pt-4">
        {history.map((point, i) => {
          const height = (point.price / maxPrice) * 100;
          return (
            <div key={i} className="flex-1 flex flex-col items-center group relative">
              <div 
                className="w-full bg-blue-100 rounded-t-sm hover:bg-blue-500 transition-colors relative"
                style={{ height: `${height}%` }}
              >
                 <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
                    {formatCurrency(point.price)}
                 </div>
              </div>
              <span className="text-[10px] text-slate-400 mt-1">{new Date(point.date).getDate()}/{new Date(point.date).getMonth() + 1}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ============================================================================
// PART 4: THE MONOLITHIC LOGIC
// ============================================================================

// --- Reducer for State Management ---
type PageState = {
  loading: boolean;
  product: RichProduct | null;
  seller: RichUser | null;
  comments: Comment[];
  relatedProducts: Product[];
  isLiked: boolean;
  activeTab: 'desc' | 'reviews' | 'shipping';
  error: string | null;
};

type PageAction = 
  | { type: 'FETCH_START' }
  | { type: 'FETCH_SUCCESS'; payload: { product: RichProduct; seller: RichUser; comments: Comment[]; related: Product[]; isLiked: boolean } }
  | { type: 'FETCH_ERROR'; payload: string }
  | { type: 'TOGGLE_LIKE' }
  | { type: 'SET_TAB'; payload: 'desc' | 'reviews' | 'shipping' }
  | { type: 'ADD_COMMENT'; payload: Comment };

const pageReducer = (state: PageState, action: PageAction): PageState => {
  switch (action.type) {
    case 'FETCH_START': return { ...state, loading: true, error: null };
    case 'FETCH_SUCCESS': return { ...state, loading: false, ...action.payload };
    case 'FETCH_ERROR': return { ...state, loading: false, error: action.payload };
    case 'TOGGLE_LIKE': return { ...state, isLiked: !state.isLiked };
    case 'SET_TAB': return { ...state, activeTab: action.payload };
    case 'ADD_COMMENT': return { ...state, comments: [action.payload, ...state.comments] };
    default: return state;
  }
};

const ProductDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user: currentUser, isRestricted } = useAuth();
  const { addToast } = useToast();
  
  // Local State Management
  const [state, dispatch] = useReducer(pageReducer, {
    loading: true,
    product: null,
    seller: null,
    comments: [],
    relatedProducts: [],
    isLiked: false,
    activeTab: 'desc',
    error: null
  });

  const [commentInput, setCommentInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [shareMenuOpen, setShareMenuOpen] = useState(false);
  const scrollPosition = useScrollPosition();
  const windowSize = useWindowSize();

  // Scroll to top on mount
  useEffect(() => { window.scrollTo(0, 0); }, [id]);

  // Derived Values
  const isOwner = currentUser?.id === state.product?.sellerId;
  const isSellerUntrusted = useMemo(() => state.seller?.banUntil && new Date(state.seller.banUntil) > new Date(), [state.seller]);
  const isViewerUntrusted = useMemo(() => (currentUser?.banUntil && new Date(currentUser.banUntil) > new Date()) || isRestricted, [currentUser, isRestricted]);

  // Data Fetching Logic (Complex)
  const fetchData = useCallback(async () => {
    if (!id) return;
    dispatch({ type: 'FETCH_START' });
    try {
      // 1. Fetch Product
      const { data: pData, error } = await supabase.from('products').select('*').eq('id', id).single();
      if (error || !pData) throw new Error("Sản phẩm không tồn tại");

      // 2. Transform Product Data (Mocking missing fields)
      const product: RichProduct = {
        ...pData,
        sellerId: pData.seller_id,
        images: pData.images || [],
        status: pData.status,
        postedAt: pData.posted_at,
        view_count: pData.view_count || Math.floor(Math.random() * 1000),
        likes_count: Math.floor(Math.random() * 100),
        shares_count: Math.floor(Math.random() * 50),
        tags: ['Textbook', 'Used', 'Good Condition'],
        history: Array.from({ length: 5 }, (_, i) => ({ date: new Date(Date.now() - i * 86400000 * 5).toISOString(), price: pData.price * (1 + (Math.random() * 0.2 - 0.1)) })),
      };

      // 3. Parallel Fetching
      const [sellerRes, commentRes, relatedRes, likeRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', product.sellerId).single(),
        supabase.from('comments').select(`*, user:user_id(name, avatar_url)`).eq('product_id', id).order('created_at', { ascending: false }),
        supabase.from('products').select('*').eq('category', product.category).neq('id', id).limit(4),
        currentUser ? supabase.from('saved_products').select('id').eq('user_id', currentUser.id).eq('product_id', id).maybeSingle() : Promise.resolve({ data: null })
      ]);

      // 4. Transform Seller Data
      const seller: RichUser = sellerRes.data ? {
        ...sellerRes.data,
        id: sellerRes.data.id,
        avatar: sellerRes.data.avatar_url,
        isVerified: sellerRes.data.is_verified,
        joinDate: sellerRes.data.created_at || new Date().toISOString(),
        responseRate: 98,
        responseTime: 'Thường trả lời trong 5 phút',
        totalSales: 156,
        badges: ['verified', 'fast-shipper'],
        followers: 420,
        following: 12,
        isOnline: Math.random() > 0.3
      } : {} as any;

      dispatch({
        type: 'FETCH_SUCCESS',
        payload: {
          product,
          seller,
          comments: commentRes.data || [],
          related: relatedRes.data?.map(p => ({ ...p, sellerId: p.seller_id, images: p.images || [], status: p.status } as Product)) || [],
          isLiked: !!likeRes.data
        }
      });

      // Increment View Count (Fire and forget)
      supabase.rpc('increment_view_count', { product_id: id });

    } catch (err) {
      console.error(err);
      dispatch({ type: 'FETCH_ERROR', payload: "Không thể tải thông tin sản phẩm" });
      addToast("Lỗi tải trang", "error");
    }
  }, [id, currentUser, addToast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Handlers
  const handleLike = async () => {
    if (!currentUser) return navigate('/auth', { state: { from: location } });
    dispatch({ type: 'TOGGLE_LIKE' }); // Optimistic UI
    try {
      if (state.isLiked) await supabase.from('saved_products').delete().eq('user_id', currentUser.id).eq('product_id', id);
      else await supabase.from('saved_products').insert({ user_id: currentUser.id, product_id: id });
    } catch { dispatch({ type: 'TOGGLE_LIKE' }); } // Revert on error
  };

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return navigate('/auth');
    if (!commentInput.trim()) return;
    setIsSubmitting(true);
    const { data, error } = await supabase.from('comments').insert({ product_id: id, user_id: currentUser.id, content: commentInput.trim() }).select(`*, user:user_id(name, avatar_url)`).single();
    if (data && !error) {
      dispatch({ type: 'ADD_COMMENT', payload: data });
      setCommentInput('');
      addToast("Bình luận thành công", "success");
    } else {
      addToast("Gửi bình luận thất bại", "error");
    }
    setIsSubmitting(false);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    addToast("Đã sao chép liên kết", "success");
    setShareMenuOpen(false);
  };

  // Keyboard Shortcuts
  useKeyPress("Escape", () => setLightboxOpen(false));

  // Render Loading
  if (state.loading) return <div className="min-h-screen bg-[#F8FAFC]"><Styles /><div className="h-16 border-b bg-white mb-8"></div><div className="max-w-7xl mx-auto px-4"><div className="grid grid-cols-1 lg:grid-cols-12 gap-8"><div className="lg:col-span-7 h-96 bg-gray-200 rounded-[2rem] animate-pulse"/><div className="lg:col-span-5 h-[600px] bg-gray-200 rounded-[2rem] animate-pulse"/></div></div></div>;
  if (!state.product) return null;

  return (
    <div className="min-h-screen pb-32 text-slate-800 selection:bg-blue-100 selection:text-blue-900 font-sans">
      <Styles />

      {/* --- Lightbox Overlay --- */}
      {lightboxOpen && (
        <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center animate-enter" onClick={() => setLightboxOpen(false)}>
           <button className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"><X size={24}/></button>
           <img src={state.product.images[0]} className="max-h-[90vh] max-w-[90vw] object-contain rounded-lg shadow-2xl" onClick={e => e.stopPropagation()}/>
        </div>
      )}

      {/* --- Report Modal --- */}
      <Modal isOpen={reportModalOpen} onClose={() => setReportModalOpen(false)} title={<span className="flex items-center gap-2 text-red-600"><AlertTriangle/> Báo cáo vi phạm</span>}>
         <div className="space-y-4">
            <p className="text-sm text-gray-500">Hãy chọn lý do bạn muốn báo cáo sản phẩm này. Chúng tôi sẽ xem xét trong vòng 24h.</p>
            {['Hàng giả/Hàng nhái', 'Lừa đảo', 'Nội dung phản cảm', 'Spam'].map(reason => (
              <label key={reason} className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 cursor-pointer hover:bg-red-50 hover:border-red-200 transition-colors">
                 <input type="radio" name="report" className="w-4 h-4 text-red-600 focus:ring-red-500"/>
                 <span className="font-bold text-gray-700">{reason}</span>
              </label>
            ))}
            <textarea className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-200 outline-none text-sm" rows={3} placeholder="Mô tả chi tiết thêm..."></textarea>
            <div className="flex gap-3 pt-2">
               <Button fullWidth variant="secondary" onClick={() => setReportModalOpen(false)}>Hủy</Button>
               <Button fullWidth variant="danger" onClick={() => { addToast("Đã gửi báo cáo", "success"); setReportModalOpen(false); }}>Gửi Báo Cáo</Button>
            </div>
         </div>
      </Modal>

      {/* --- HEADER --- */}
      <div className={clsx("sticky top-0 z-40 transition-all duration-300 border-b", scrollPosition.scrollY > 10 ? "bg-white/90 backdrop-blur-md shadow-sm border-gray-200" : "bg-transparent border-transparent")}>
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
           <div className="flex items-center gap-4 animate-enter">
              <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><ArrowLeft size={20} className="text-slate-600"/></button>
              <div className="hidden sm:flex items-center gap-2 text-sm text-gray-500 font-medium">
                 <Link to="/market" className="hover:text-[#00418E] transition-colors">Market</Link>
                 <ChevronRight size={14}/>
                 <span className="text-slate-900 truncate max-w-[200px] font-bold">{state.product.title}</span>
              </div>
           </div>
           <div className="flex items-center gap-2 animate-enter delay-100">
              <div className="relative">
                 <button onClick={() => setShareMenuOpen(!shareMenuOpen)} className="p-2 hover:bg-blue-50 text-slate-500 hover:text-blue-600 rounded-full transition-colors"><Share2 size={20}/></button>
                 {shareMenuOpen && (
                    <div className="absolute top-12 right-0 w-48 bg-white rounded-xl shadow-xl border border-gray-100 p-2 animate-scale-in z-50">
                       <button onClick={copyLink} className="flex items-center gap-3 p-3 hover:bg-slate-50 rounded-lg w-full text-left text-sm font-bold text-slate-700"><Copy size={16}/> Copy Link</button>
                       <button className="flex items-center gap-3 p-3 hover:bg-slate-50 rounded-lg w-full text-left text-sm font-bold text-slate-700"><QrCode size={16}/> QR Code</button>
                    </div>
                 )}
              </div>
              <button onClick={() => setReportModalOpen(true)} className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-full transition-colors"><Flag size={20}/></button>
           </div>
        </div>
      </div>

      {/* --- MAIN CONTENT --- */}
      <div className="max-w-7xl mx-auto px-4 py-8">
         <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
            
            {/* LEFT COLUMN: Gallery & Details */}
            <div className="lg:col-span-7 space-y-10">
               <div className="animate-enter">
                  <AdvancedGallery images={state.product.images} status={state.product.status as ProductStatus} onFullscreen={() => setLightboxOpen(true)} />
               </div>

               {/* Description Card */}
               <div className="glass-panel p-8 rounded-[2rem] animate-enter delay-100">
                  <div className="flex items-center gap-4 mb-8 border-b border-gray-100/50 pb-6">
                     <button onClick={() => dispatch({type: 'SET_TAB', payload: 'desc'})} className={clsx("text-lg font-black transition-colors relative", state.activeTab === 'desc' ? "text-slate-900" : "text-slate-400 hover:text-slate-600")}>
                        Mô tả
                        {state.activeTab === 'desc' && <span className="absolute -bottom-6 left-0 w-full h-1 bg-blue-600 rounded-t-full"/>}
                     </button>
                     <button onClick={() => dispatch({type: 'SET_TAB', payload: 'shipping'})} className={clsx("text-lg font-black transition-colors relative", state.activeTab === 'shipping' ? "text-slate-900" : "text-slate-400 hover:text-slate-600")}>
                        Giao hàng
                        {state.activeTab === 'shipping' && <span className="absolute -bottom-6 left-0 w-full h-1 bg-blue-600 rounded-t-full"/>}
                     </button>
                  </div>
                  
                  {state.activeTab === 'desc' && (
                    <div className="animate-enter">
                       <div className="custom-prose text-slate-600 whitespace-pre-wrap leading-loose mb-8">
                          {state.product.description || "Người bán chưa cung cấp mô tả chi tiết."}
                       </div>
                       
                       <div className="grid grid-cols-2 gap-4">
                          <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-100">
                             <div className="text-[10px] uppercase font-bold text-slate-400 mb-1 tracking-wider">Tình trạng</div>
                             <div className="font-bold text-slate-800 flex items-center gap-2"><Star size={16} className="text-yellow-500 fill-yellow-500"/> {state.product.condition}</div>
                          </div>
                          <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-100">
                             <div className="text-[10px] uppercase font-bold text-slate-400 mb-1 tracking-wider">Danh mục</div>
                             <div className="font-bold text-slate-800 flex items-center gap-2"><Box size={16} className="text-blue-500"/> {state.product.category}</div>
                          </div>
                          <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-100">
                             <div className="text-[10px] uppercase font-bold text-slate-400 mb-1 tracking-wider">Kích thước (Est)</div>
                             <div className="font-bold text-slate-800">20 x 15 cm</div>
                          </div>
                          <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-100">
                             <div className="text-[10px] uppercase font-bold text-slate-400 mb-1 tracking-wider">Trọng lượng</div>
                             <div className="font-bold text-slate-800">~300g</div>
                          </div>
                       </div>

                       <PriceHistoryChart history={state.product.history} />
                    </div>
                  )}

                  {state.activeTab === 'shipping' && (
                     <div className="animate-enter space-y-4 text-slate-600">
                        <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-xl border border-blue-100">
                           <MapPin className="text-blue-600 shrink-0 mt-1"/>
                           <div>
                              <h4 className="font-bold text-blue-900">Khu vực giao dịch</h4>
                              <p className="text-sm">Hồ Chí Minh (Quận 10, Thủ Đức)</p>
                           </div>
                        </div>
                        <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
                           <Box className="text-slate-600 shrink-0 mt-1"/>
                           <div>
                              <h4 className="font-bold text-slate-900">Phương thức</h4>
                              <p className="text-sm">{state.product.tradeMethod === 'direct' ? 'Chỉ giao dịch trực tiếp để đảm bảo chất lượng.' : 'Hỗ trợ Ship COD toàn quốc (người mua chịu phí).'}</p>
                           </div>
                        </div>
                     </div>
                  )}
               </div>

               {/* Comments Section */}
               <div className="animate-enter delay-200" id="comments">
                  <div className="flex items-center justify-between mb-6">
                     <h3 className="text-2xl font-black text-slate-900 flex items-center gap-3">
                        Thảo luận <span className="text-sm bg-slate-200 text-slate-600 px-2 py-1 rounded-md">{state.comments.length}</span>
                     </h3>
                     <div className="flex gap-2">
                        <button className="text-xs font-bold text-slate-500 hover:text-blue-600">Mới nhất</button>
                        <span className="text-slate-300">|</span>
                        <button className="text-xs font-bold text-slate-500 hover:text-blue-600">Cũ nhất</button>
                     </div>
                  </div>

                  {currentUser ? (
                     <div className="flex gap-4 mb-10 group">
                        <Avatar src={currentUser.avatar} alt={currentUser.name} size="md" />
                        <div className="flex-1 relative">
                           <textarea 
                              value={commentInput}
                              onChange={e => setCommentInput(e.target.value)}
                              placeholder="Đặt câu hỏi cho người bán..."
                              className="w-full bg-white border border-gray-200 rounded-2xl p-4 pr-14 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all min-h-[80px] resize-none shadow-sm text-sm"
                           />
                           <div className="absolute right-3 bottom-3 flex items-center gap-2">
                              <button className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors"><ImageIcon size={18}/></button>
                              <Button size="sm" onClick={handleComment} isLoading={isSubmitting} disabled={!commentInput.trim()}>
                                 <Send size={16}/>
                              </Button>
                           </div>
                        </div>
                     </div>
                  ) : (
                     <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 p-8 rounded-2xl text-center mb-10">
                        <p className="text-blue-900 font-bold mb-3">Đăng nhập để tham gia thảo luận</p>
                        <Link to="/auth" className="inline-block"><Button>Đăng nhập ngay</Button></Link>
                     </div>
                  )}

                  <div className="space-y-6">
                     {state.comments.map(c => (
                        <div key={c.id} className="flex gap-4 group animate-enter">
                           <Avatar src={c.userAvatar} alt={c.userName} size="md" />
                           <div className="flex-1">
                              <div className="bg-white p-4 rounded-2xl rounded-tl-sm border border-slate-100 shadow-sm hover:shadow-md transition-all">
                                 <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center gap-2">
                                       <span className="font-bold text-sm text-slate-900">{c.userName}</span>
                                       {c.userId === state.product?.sellerId && <span className="bg-blue-100 text-blue-700 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide">Seller</span>}
                                    </div>
                                    <span className="text-[10px] text-slate-400">{timeAgo(c.createdAt)}</span>
                                 </div>
                                 <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">{c.content}</p>
                              </div>
                              <div className="flex items-center gap-4 mt-2 ml-2 text-xs font-bold text-slate-400">
                                 <button className="hover:text-blue-600 flex items-center gap-1"><ThumbsUp size={12}/> Thích</button>
                                 <button className="hover:text-blue-600">Trả lời</button>
                              </div>
                           </div>
                        </div>
                     ))}
                  </div>
               </div>
            </div>

            {/* RIGHT COLUMN: Info & Actions (Sticky) */}
            <div className="lg:col-span-5 relative">
               <div className="sticky top-24 space-y-6 animate-enter delay-100">
                  
                  {/* Main Product Info Card */}
                  <div className="glass-panel p-8 rounded-[2.5rem] relative overflow-hidden group">
                     {/* Decorative Blobs */}
                     <div className="absolute -top-24 -right-24 w-64 h-64 bg-blue-400/20 rounded-full blur-3xl group-hover:bg-blue-400/30 transition-colors duration-500"></div>
                     <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-cyan-400/10 rounded-full blur-3xl"></div>
                     
                     <div className="relative z-10">
                        <div className="flex justify-between items-start mb-6">
                           <Badge variant="info" className="text-sm px-3 py-1 shadow-sm bg-white/50 backdrop-blur">{state.product.category}</Badge>
                           <div className="flex gap-2">
                              <Tooltip content={state.isLiked ? "Bỏ lưu" : "Lưu tin"}>
                                 <button onClick={handleLike} className="bg-white p-2.5 rounded-full shadow-sm hover:shadow-md transition-all active:scale-95 group/heart">
                                    <Heart size={22} className={clsx("transition-colors duration-300", state.isLiked ? "fill-red-500 text-red-500 animate-pulse-soft" : "text-slate-300 group-hover/heart:text-red-400")}/>
                                 </button>
                              </Tooltip>
                           </div>
                        </div>

                        <h1 className="text-3xl lg:text-4xl font-black text-slate-900 leading-tight mb-4 tracking-tight">{state.product.title}</h1>
                        
                        <div className="flex items-center gap-4 text-sm text-slate-500 mb-8 border-b border-slate-100/50 pb-6 font-medium">
                           <div className="flex items-center gap-1.5"><Clock size={16} className="text-blue-500"/> {timeAgo(state.product.postedAt)}</div>
                           <div className="flex items-center gap-1.5"><Eye size={16} className="text-blue-500"/> {state.product.view_count}</div>
                           <div className="flex items-center gap-1.5"><MapPin size={16} className="text-blue-500"/> TP.HCM</div>
                        </div>

                        <div className="mb-8">
                           <div className="flex items-end gap-3 mb-2">
                              <span className="text-5xl font-black text-[#00418E] tracking-tight drop-shadow-sm">
                                 {state.product.price === 0 ? 'FREE' : formatCurrency(state.product.price)}
                              </span>
                              {state.product.price > 0 && (
                                 <span className="text-lg text-slate-400 line-through mb-2 font-bold decoration-2 decoration-red-300">
                                    {formatCurrency(state.product.price * 1.2)}
                                 </span>
                              )}
                           </div>
                           {state.product.price === 0 && (
                              <div className="inline-flex items-center gap-2 text-xs font-bold text-green-700 bg-green-100 px-3 py-1.5 rounded-full border border-green-200 shadow-sm animate-bounce-slow">
                                 <Gift size={14}/> Quà tặng sinh viên
                              </div>
                           )}
                        </div>

                        {/* CTA Buttons */}
                        <div className="hidden lg:flex flex-col gap-3">
                           {isOwner ? (
                               <Button size="xl" variant="secondary" fullWidth onClick={() => navigate(`/post-item?edit=${state.product?.id}`)} leftIcon={<Settings size={20}/>}>
                                  Quản lý bài đăng
                               </Button>
                           ) : (
                              <>
                                 <Button 
                                    size="xl" 
                                    fullWidth 
                                    onClick={() => navigate(`/chat?partnerId=${state.seller?.id}`)}
                                    disabled={isViewerUntrusted || isSellerUntrusted || state.product.status === 'sold'}
                                    leftIcon={<MessageCircle size={22} className="fill-current"/>}
                                    className="shadow-blue-500/25 hover:shadow-blue-500/40 transform hover:-translate-y-1"
                                 >
                                    {state.product.status === 'sold' ? 'Đã bán' : 'Chat với người bán'}
                                 </Button>
                                 <Button 
                                    size="xl" 
                                    variant="outline" 
                                    fullWidth 
                                    disabled={state.product.status === 'sold'}
                                    onClick={() => addToast("Chức năng đang bảo trì", "info")} 
                                    leftIcon={<ShoppingBag size={22}/>}
                                 >
                                    Mua ngay
                                 </Button>
                              </>
                           )}
                        </div>
                     </div>
                  </div>

                  {/* Seller Info */}
                  {state.seller && <SellerProfileCard seller={state.seller} />}
                  
                  {/* Safety Widget */}
                  <TrustWidget />

               </div>
            </div>
         </div>

         {/* --- RELATED PRODUCTS --- */}
         {state.relatedProducts.length > 0 && (
            <div className="mt-24 border-t border-slate-200 pt-16">
               <div className="flex items-center justify-between mb-10">
                  <div>
                     <h3 className="text-3xl font-black text-slate-900 mb-2">Có thể bạn quan tâm</h3>
                     <p className="text-slate-500">Các sản phẩm tương tự trong danh mục {state.product.category}</p>
                  </div>
                  <Link to="/market" className="flex items-center gap-1 text-blue-600 font-bold hover:underline group">
                     Xem tất cả <ArrowLeft className="rotate-180 group-hover:translate-x-1 transition-transform" size={18}/>
                  </Link>
               </div>
               <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  {state.relatedProducts.map(p => <ProductCard key={p.id} product={p} />)}
               </div>
            </div>
         )}
      </div>

      {/* --- MOBILE FLOATING BAR --- */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-slate-200 p-4 lg:hidden z-50 safe-area-pb shadow-[0_-10px_40px_rgba(0,0,0,0.1)] animate-slide-up">
         <div className="flex gap-3">
            <Button 
               fullWidth 
               size="lg"
               onClick={() => navigate(`/chat?partnerId=${state.seller?.id}`)} 
               disabled={isViewerUntrusted || isSellerUntrusted || state.product.status === 'sold'}
               leftIcon={<MessageCircle size={20} className="fill-current"/>}
            >
               Chat Ngay
            </Button>
            <button 
               onClick={handleLike} 
               className={clsx(
                  "w-16 flex items-center justify-center rounded-xl border-2 transition-all active:scale-90",
                  state.isLiked ? "border-red-500 bg-red-50 text-red-500" : "border-slate-200 text-slate-400 bg-white"
               )}
            >
               <Heart size={24} className={state.isLiked ? 'fill-current' : ''}/>
            </button>
         </div>
      </div>

    </div>
  );
};

export default ProductDetailPage;
