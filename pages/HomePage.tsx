import React, { useState, useEffect, useRef, useCallback, useMemo, useLayoutEffect, useReducer, createContext, useContext } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { 
  Search, ArrowRight, Zap, ShieldCheck, Users, BookOpen, Calculator, Shirt, Monitor, 
  Grid, MapPin, Flame, Gift, Eye, ShoppingBag, PlusCircle, Heart, Package, ChevronRight, 
  Sparkles, TrendingUp, MoreHorizontal, ChevronDown, Bell, X, Clock, CheckCircle2, 
  Star, Cpu, Globe, Server, Smartphone, Trophy, Smile, Rocket, Command, Filter, 
  RefreshCw, Menu, Layers, Activity, Calendar, AlertTriangle, Info, User, Settings,
  LogOut, CreditCard, HelpCircle, FileText, Share2, Download, Sliders, Ghost, WifiOff,
  ChevronLeft, Loader2, XCircle, AlertCircle, CheckCircle
} from 'lucide-react';
import { supabase } from '../services/supabase';

type ID = string | number;
type Timestamp = string;

enum ProductCategory {
  TEXTBOOK = 'textbook',
  ELECTRONICS = 'electronics',
  SUPPLIES = 'supplies',
  CLOTHING = 'clothing',
  OTHER = 'other',
}

enum ProductStatus {
  AVAILABLE = 'available',
  PENDING = 'pending',
  SOLD = 'sold',
  HIDDEN = 'hidden',
}

enum SortOption {
  NEWEST = 'newest',
  OLDEST = 'oldest',
  PRICE_ASC = 'price_asc',
  PRICE_DESC = 'price_desc',
  MOST_VIEWED = 'most_viewed',
}

interface Product {
  id: ID;
  created_at: Timestamp;
  title: string;
  description: string;
  price: number;
  images: string[];
  category: ProductCategory;
  status: ProductStatus;
  seller_id: ID;
  view_count: number;
  like_count: number;
  condition: 'new' | 'like_new' | 'good' | 'fair';
  tags: string[];
  trade_method: 'direct' | 'shipping';
  location_name?: string;
  postedAt?: string; 
}

interface UserProfile {
  id: ID;
  name: string;
  avatar_url: string;
  email: string;
  is_verified: boolean;
  rating: number;
}

interface FilterState {
  category: ProductCategory | 'all';
  sort: SortOption;
  minPrice?: number;
  maxPrice?: number;
  search: string;
}

interface PaginationState {
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
}

interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message?: string;
  duration?: number;
}

const Utils = {
  formatCurrency: (amount: number): string => {
    return new Intl.NumberFormat('vi-VN', { 
      style: 'currency', 
      currency: 'VND',
      maximumFractionDigits: 0 
    }).format(amount);
  },

  timeAgo: (dateString: string): string => {
    const now = new Date();
    const date = new Date(dateString);
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
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
  },

  truncate: (str: string, length: number): string => {
    if (!str) return '';
    return str.length > length ? str.substring(0, length) + '...' : str;
  },

  cn: (...classes: (string | undefined | null | false)[]): string => {
    return classes.filter(Boolean).join(' ');
  },

  uuid: (): string => {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  },

  debounce: <F extends (...args: any[]) => any>(func: F, waitFor: number) => {
    let timeout: ReturnType<typeof setTimeout> | null = null;
    return (...args: Parameters<F>): void => {
      if (timeout !== null) {
        clearTimeout(timeout);
      }
      timeout = setTimeout(() => func(...args), waitFor);
    };
  }
};

const GlobalStyles = () => (
  <style>{`
    :root {
      --primary: #00418E;
      --secondary: #00B0F0;
      --success: #10B981;
      --warning: #F59E0B;
      --danger: #EF4444;
      --dark: #0F172A;
      --light: #F8FAFC;
    }
    body { 
      background-color: var(--light); 
      color: #1E293B; 
      font-family: 'Inter', system-ui, sans-serif;
      overflow-x: hidden;
    }
    ::-webkit-scrollbar { width: 8px; height: 8px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: #CBD5E1; border-radius: 10px; border: 2px solid #F8FAFC; }
    ::-webkit-scrollbar-thumb:hover { background: #94A3B8; }
    
    @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes pulse-ring { 0% { box-shadow: 0 0 0 0 rgba(0, 65, 142, 0.4); } 70% { box-shadow: 0 0 0 15px rgba(0, 65, 142, 0); } 100% { box-shadow: 0 0 0 0 rgba(0, 65, 142, 0); } }
    @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
    @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
    @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

    .animate-enter { animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; opacity: 0; }
    .animate-float { animation: float 6s ease-in-out infinite; }
    .animate-spin-slow { animation: spin 3s linear infinite; }
    
    .glass-panel {
      background: rgba(255, 255, 255, 0.7);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.5);
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
    }
    .glass-card-hover:hover {
      transform: translateY(-4px);
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
      border-color: var(--secondary);
    }
    .skeleton-shimmer {
      background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
    }
  `}</style>
);

const ParticleCanvas = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;

    class Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      color: string;

      constructor() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.vx = (Math.random() - 0.5) * 0.5;
        this.vy = (Math.random() - 0.5) * 0.5;
        this.size = Math.random() * 3 + 1;
        const colors = ['rgba(0, 65, 142, 0.1)', 'rgba(0, 176, 240, 0.1)', 'rgba(124, 58, 237, 0.05)'];
        this.color = colors[Math.floor(Math.random() * colors.length)];
      }

      update() {
        this.x += this.vx;
        this.y += this.vy;
        if (this.x < 0 || this.x > width) this.vx *= -1;
        if (this.y < 0 || this.y > height) this.vy *= -1;
      }

      draw() {
        if (!ctx) return;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
      }
    }

    const particles: Particle[] = Array.from({ length: 40 }, () => new Particle());

    const animate = () => {
      ctx.clearRect(0, 0, width, height);
      particles.forEach(p => {
        p.update();
        p.draw();
      });
      requestAnimationFrame(animate);
    };

    animate();

    const handleResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 z-0 pointer-events-none" />;
};

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

function useWindowSize() {
  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });
  useEffect(() => {
    const handleResize = () => setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  return windowSize;
}

function useProducts(filter: FilterState) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [count, setCount] = useState(0);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase.from('products').select('*', { count: 'exact' }).eq('status', ProductStatus.AVAILABLE);

      if (filter.category !== 'all') {
        query = query.eq('category', filter.category);
      }
      if (filter.search) {
        query = query.ilike('title', `%${filter.search}%`);
      }
      if (filter.minPrice !== undefined) {
        query = query.gte('price', filter.minPrice);
      }
      if (filter.maxPrice !== undefined) {
        query = query.lte('price', filter.maxPrice);
      }

      switch (filter.sort) {
        case SortOption.NEWEST: query = query.order('posted_at', { ascending: false }); break;
        case SortOption.OLDEST: query = query.order('posted_at', { ascending: true }); break;
        case SortOption.PRICE_ASC: query = query.order('price', { ascending: true }); break;
        case SortOption.PRICE_DESC: query = query.order('price', { ascending: false }); break;
        case SortOption.MOST_VIEWED: query = query.order('view_count', { ascending: false }); break;
      }

      query = query.limit(12);

      const { data, error: dbError, count: totalCount } = await query;

      if (dbError) throw dbError;
      
      const mappedProducts = (data || []).map((p: any) => ({
        id: p.id,
        created_at: p.created_at,
        title: p.title,
        description: p.description,
        price: p.price,
        images: p.images || [],
        category: p.category,
        status: p.status,
        seller_id: p.seller_id,
        view_count: p.view_count || 0,
        like_count: p.like_count || 0,
        condition: p.condition || 'good',
        tags: p.tags || [],
        trade_method: p.trade_method || 'direct',
        location_name: 'HCMUT',
        postedAt: p.posted_at || p.created_at
      }));

      setProducts(mappedProducts);
      setCount(totalCount || 0);
    } catch (err: any) {
      console.error("Fetch Error:", err);
      setError(err.message || 'Không thể tải dữ liệu');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  return { products, loading, error, count, refetch: fetchProducts };
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
}

const Button: React.FC<ButtonProps> = ({ 
  variant = 'primary', 
  size = 'md', 
  loading, 
  icon, 
  iconPosition = 'left',
  fullWidth,
  children, 
  className, 
  disabled,
  ...props 
}) => {
  const baseStyle = "inline-flex items-center justify-center font-bold rounded-xl transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:pointer-events-none focus:outline-none focus:ring-2 focus:ring-offset-2";
  
  const variants = {
    primary: "bg-[#00418E] text-white hover:bg-[#003370] shadow-lg shadow-blue-900/20 focus:ring-blue-500",
    secondary: "bg-[#00B0F0] text-white hover:bg-[#0090C0] shadow-lg shadow-cyan-500/20 focus:ring-cyan-500",
    outline: "border-2 border-slate-200 bg-white text-slate-700 hover:border-[#00418E] hover:text-[#00418E]",
    ghost: "bg-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-900",
    danger: "bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-500/20",
    success: "bg-green-500 text-white hover:bg-green-600 shadow-lg shadow-green-500/20"
  };

  const sizes = {
    xs: "px-2.5 py-1 text-xs",
    sm: "px-3 py-1.5 text-xs",
    md: "px-5 py-2.5 text-sm",
    lg: "px-8 py-3.5 text-base",
    xl: "px-10 py-4 text-lg"
  };

  return (
    <button 
      className={Utils.cn(baseStyle, variants[variant], sizes[size], fullWidth ? 'w-full' : '', className)} 
      disabled={disabled || loading}
      {...props}
    >
      {loading && <RefreshCw className="animate-spin mr-2" size={size === 'xs' || size === 'sm' ? 14 : 18}/>}
      {!loading && icon && iconPosition === 'left' && <span className="mr-2">{icon}</span>}
      {children}
      {!loading && icon && iconPosition === 'right' && <span className="ml-2">{icon}</span>}
    </button>
  );
};

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

const Input: React.FC<InputProps> = ({ label, error, icon, className, ...props }) => (
  <div className="w-full">
    {label && <label className="block text-sm font-bold text-slate-700 mb-1.5">{label}</label>}
    <div className="relative">
      {icon && <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">{icon}</div>}
      <input 
        className={Utils.cn(
          "w-full bg-white border border-slate-200 rounded-xl py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all",
          icon ? "pl-10" : "px-4",
          error ? "border-red-500 focus:border-red-500 focus:ring-red-500/20" : "",
          className
        )}
        {...props}
      />
    </div>
    {error && <p className="mt-1 text-xs text-red-500 font-medium">{error}</p>}
  </div>
);

const Skeleton: React.FC<{ className?: string, width?: string|number, height?: string|number, variant?: 'rect'|'circle' }> = ({ className, width, height, variant = 'rect' }) => (
  <div 
    className={Utils.cn("skeleton-shimmer bg-slate-200", variant === 'circle' ? 'rounded-full' : 'rounded-xl', className)} 
    style={{ width, height }}
  />
);

const Badge: React.FC<{ children: React.ReactNode, color?: 'blue' | 'green' | 'red' | 'purple' | 'orange' | 'slate', icon?: React.ReactNode, size?: 'sm' | 'md' }> = ({ children, color = 'blue', icon, size = 'sm' }) => {
  const styles = {
    blue: 'bg-blue-50 text-blue-700 border-blue-100',
    green: 'bg-green-50 text-green-700 border-green-100',
    red: 'bg-red-50 text-red-700 border-red-100',
    purple: 'bg-purple-50 text-purple-700 border-purple-100',
    orange: 'bg-orange-50 text-orange-700 border-orange-100',
    slate: 'bg-slate-100 text-slate-700 border-slate-200',
  };
  return (
    <span className={Utils.cn("inline-flex items-center rounded-full font-bold uppercase tracking-wider border", styles[color], size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs')}>
      {icon && <span className="mr-1.5">{icon}</span>}
      {children}
    </span>
  );
};

const Tooltip: React.FC<{ content: string, children: React.ReactNode, position?: 'top' | 'bottom' }> = ({ content, children, position = 'top' }) => (
  <div className="group relative flex items-center justify-center">
    {children}
    <div className={Utils.cn(
      "absolute px-3 py-1.5 bg-slate-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50 shadow-xl font-medium",
      position === 'top' ? "bottom-full mb-2" : "top-full mt-2"
    )}>
      {content}
      <div className={Utils.cn(
        "absolute left-1/2 -translate-x-1/2 border-4 border-transparent",
        position === 'top' ? "top-full border-t-slate-900" : "bottom-full border-b-slate-900"
      )}/>
    </div>
  </div>
);

const Drawer: React.FC<{ isOpen: boolean, onClose: () => void, title: string, children: React.ReactNode }> = ({ isOpen, onClose, title, children }) => {
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white h-full shadow-2xl animate-enter" style={{ animationName: 'slideLeft' }}>
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-5 border-b border-slate-100">
            <h3 className="font-bold text-lg text-slate-900">{title}</h3>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={20} /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-5">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

const ProductCard: React.FC<{ product: Product }> = ({ product }) => {
  const navigate = useNavigate();
  const [imageLoaded, setImageLoaded] = useState(false);
  const displayImage = product.images && product.images.length > 0 ? product.images[0] : 'https://placehold.co/400x300?text=No+Image';

  return (
    <div 
      onClick={() => navigate(`/product/${product.id}`)}
      className="glass-card-hover bg-white rounded-2xl overflow-hidden cursor-pointer group relative flex flex-col h-full border border-slate-200 transition-all duration-300"
    >
      <div className="aspect-[4/3] relative overflow-hidden bg-slate-100">
        {!imageLoaded && <Skeleton className="absolute inset-0 w-full h-full" />}
        <img 
          src={displayImage} 
          alt={product.title} 
          className={Utils.cn(
            "w-full h-full object-cover transition-transform duration-700 group-hover:scale-110",
            imageLoaded ? "opacity-100" : "opacity-0"
          )}
          onLoad={() => setImageLoaded(true)}
          onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/400x300?text=Error'; setImageLoaded(true); }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"/>
        
        <div className="absolute top-3 left-3 flex flex-col gap-1">
          {product.price === 0 && (
            <Badge color="red" icon={<Gift size={10}/>}>FREE</Badge>
          )}
          {product.condition === 'new' && (
            <Badge color="green">NEW</Badge>
          )}
        </div>

        <button className="absolute bottom-3 right-3 bg-white text-[#00418E] p-2.5 rounded-full shadow-lg translate-y-10 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 hover:bg-[#00418E] hover:text-white">
          <ArrowRight size={18}/>
        </button>
      </div>

      <div className="p-4 flex flex-col flex-1">
        <div className="flex justify-between items-start mb-2">
           <span className="text-[10px] font-bold text-[#00418E] bg-blue-50 px-2 py-0.5 rounded border border-blue-100 uppercase tracking-wider truncate max-w-[60%]">
             {product.category}
           </span>
           <span className="text-[10px] text-slate-400 flex items-center gap-1 whitespace-nowrap">
             <Clock size={10}/> {Utils.timeAgo(product.postedAt || product.created_at)}
           </span>
        </div>
        
        <h3 className="font-bold text-slate-800 text-sm mb-1 line-clamp-2 min-h-[40px] group-hover:text-[#00418E] transition-colors leading-relaxed">
          {product.title}
        </h3>
        
        <div className="pt-3 mt-auto border-t border-slate-50 flex items-center justify-between">
           <span className="font-black text-slate-900 text-lg tracking-tight">
             {product.price === 0 ? 'Tặng miễn phí' : Utils.formatCurrency(product.price)}
           </span>
           <div className="flex items-center gap-1 text-slate-400 text-xs">
              <Eye size={12}/> {product.view_count || 0}
           </div>
        </div>
      </div>
    </div>
  );
};

const EmptyState: React.FC<{ title?: string, desc?: string, action?: React.ReactNode, icon?: React.ReactNode }> = ({ 
  title = "Không tìm thấy dữ liệu", 
  desc = "Thử thay đổi bộ lọc hoặc tìm kiếm từ khóa khác.", 
  action,
  icon = <Ghost size={48} className="text-slate-300"/>
}) => (
  <div className="col-span-full py-20 px-4 text-center border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50 flex flex-col items-center">
    <div className="w-24 h-24 bg-white rounded-full shadow-sm flex items-center justify-center mb-6">
      {icon}
    </div>
    <h3 className="text-xl font-bold text-slate-800 mb-2">{title}</h3>
    <p className="text-slate-500 max-w-sm mb-8">{desc}</p>
    {action}
  </div>
);

const ErrorState: React.FC<{ message: string, onRetry?: () => void }> = ({ message, onRetry }) => (
  <div className="col-span-full flex flex-col items-center justify-center py-20 text-center">
    <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-6 text-red-500 ring-8 ring-red-50/50">
      <WifiOff size={32}/>
    </div>
    <h3 className="text-xl font-bold text-slate-800 mb-2">Kết nối gián đoạn</h3>
    <p className="text-slate-500 text-sm mb-6 max-w-md">{message}</p>
    {onRetry && <Button variant="outline" onClick={onRetry} icon={<RefreshCw size={16}/>}>Thử lại ngay</Button>}
  </div>
);

const HeroSection = ({ onSearch }: { onSearch: (term: string) => void }) => {
  const [term, setTerm] = useState('');
  
  return (
    <section className="relative pt-32 pb-20 px-4 overflow-hidden">
      <div className="max-w-5xl mx-auto text-center relative z-10">
        
        <div className="animate-enter flex justify-center mb-8">
           <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/80 border border-white/50 backdrop-blur-sm shadow-sm hover:shadow-md transition-shadow cursor-default ring-1 ring-white/60">
              <Sparkles size={14} className="text-yellow-500 fill-yellow-500 animate-pulse"/>
              <span className="text-xs font-bold text-slate-600 tracking-widest uppercase">Cổng thông tin Sinh viên Bách Khoa</span>
           </div>
        </div>

        <h1 className="animate-enter text-5xl md:text-7xl font-black text-slate-900 mb-6 leading-[1.1] tracking-tight drop-shadow-sm">
          Trao đổi đồ cũ <br/>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00418E] via-[#00B0F0] to-purple-600 animate-gradient-x">
            Thông minh & Tiết kiệm
          </span>
        </h1>
        
        <p className="animate-enter text-slate-500 text-lg md:text-xl max-w-2xl mx-auto mb-12 leading-relaxed font-medium">
          Nền tảng mua bán phi lợi nhuận dành riêng cho sinh viên. 
          Tìm giáo trình, laptop, và dụng cụ học tập giá rẻ ngay tại trường.
        </p>

        <div className="animate-enter w-full max-w-2xl mx-auto relative group z-20 mb-16">
           <div className="absolute -inset-1 bg-gradient-to-r from-[#00418E] to-[#00B0F0] rounded-full blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
           <form 
             onSubmit={(e) => { e.preventDefault(); onSearch(term); }} 
             className="relative flex items-center bg-white rounded-full border border-slate-200 p-2 shadow-xl hover:shadow-2xl transition-all"
           >
              <Search className="ml-4 text-slate-400" size={20}/>
              <input 
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                placeholder="Bạn đang tìm gì? (VD: Giải tích 1, Casio 580...)"
                className="w-full h-12 bg-transparent border-none outline-none text-slate-900 px-4 placeholder-slate-400 text-base font-medium"
              />
              <button type="submit" className="h-10 px-8 bg-[#00418E] hover:bg-[#003370] text-white rounded-full font-bold transition-all shadow-md active:scale-95 flex items-center gap-2">
                Tìm kiếm
              </button>
           </form>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-enter px-4">
           {[
             { title: 'Dạo Chợ', desc: 'Săn deal hời', icon: <ShoppingBag size={24}/>, link: '/market', color: 'text-cyan-600', bg: 'bg-cyan-50', border: 'border-cyan-100' },
             { title: 'Đăng Tin', desc: 'Bán nhanh gọn', icon: <PlusCircle size={24}/>, link: '/post-item', color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-100' },
             { title: 'Đã Lưu', desc: 'Món yêu thích', icon: <Heart size={24}/>, link: '/saved', color: 'text-pink-600', bg: 'bg-pink-50', border: 'border-pink-100' },
             { title: 'Quản Lý', desc: 'Tin của tôi', icon: <Package size={24}/>, link: '/my-items', color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-100' },
           ].map((action, i) => (
              <Link to={action.link} key={i} className={`bg-white p-5 rounded-2xl flex flex-col items-center justify-center text-center gap-3 group cursor-pointer border hover:border-slate-300 shadow-sm hover:shadow-lg transition-all ${action.border}`}>
                 <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${action.bg} ${action.color} group-hover:scale-110 transition-transform`}>
                    {action.icon}
                 </div>
                 <div>
                    <h3 className="font-bold text-slate-900 text-sm">{action.title}</h3>
                    <p className="text-slate-500 text-[10px] mt-0.5 font-bold uppercase tracking-wider">{action.desc}</p>
                 </div>
              </Link>
           ))}
        </div>
      </div>
    </section>
  );
};

const CategoryStrip = ({ current, onSelect }: { current: string, onSelect: (c: ProductCategory | 'all') => void }) => {
  const categories = [
    { id: 'all', label: 'Tất cả', icon: <Grid size={16}/> },
    { id: ProductCategory.TEXTBOOK, label: 'Giáo trình', icon: <BookOpen size={16}/> },
    { id: ProductCategory.ELECTRONICS, label: 'Công nghệ', icon: <Monitor size={16}/> },
    { id: ProductCategory.SUPPLIES, label: 'Dụng cụ', icon: <Calculator size={16}/> },
    { id: ProductCategory.CLOTHING, label: 'Đồng phục', icon: <Shirt size={16}/> },
    { id: ProductCategory.OTHER, label: 'Khác', icon: <MoreHorizontal size={16}/> },
  ];

  return (
    <div className="sticky top-0 z-40 bg-[#F8FAFC]/90 backdrop-blur-md border-y border-slate-200 py-3 mb-12 shadow-sm">
       <div className="max-w-7xl mx-auto px-4 overflow-x-auto hide-scrollbar">
          <div className="flex gap-3 min-w-max justify-center">
             {categories.map(cat => (
                <button 
                  key={cat.id} 
                  onClick={() => onSelect(cat.id as any)}
                  className={Utils.cn(
                    "flex items-center gap-2 px-5 py-2.5 rounded-full border transition-all text-sm font-bold active:scale-95 select-none",
                    current === cat.id 
                      ? "bg-[#00418E] border-[#00418E] text-white shadow-md" 
                      : "bg-white border-slate-200 text-slate-600 hover:border-blue-400 hover:text-blue-600"
                  )}
                >
                   {cat.icon}
                   <span>{cat.label}</span>
                </button>
             ))}
          </div>
       </div>
    </div>
  );
};

const StatsSection = () => (
  <section className="bg-white border-y border-slate-200 py-16 mb-24">
     <div className="max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
           {[
             { label: 'Sản phẩm', val: '8.500+', icon: <Package/>, color: 'blue' },
             { label: 'Thành viên', val: '25.000+', icon: <Users/>, color: 'purple' },
             { label: 'Giao dịch', val: '14.200+', icon: <ShoppingBag/>, color: 'green' },
             { label: 'Hài lòng', val: '99.9%', icon: <Smile/>, color: 'orange' }
           ].map((s, i) => (
             <div key={i} className="flex flex-col items-center text-center group cursor-default">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-3 transition-transform group-hover:scale-110 bg-${s.color}-50 text-${s.color}-600`}>
                   {s.icon}
                </div>
                <h4 className="text-3xl font-black text-slate-900 mb-1">{s.val}</h4>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{s.label}</p>
             </div>
           ))}
        </div>
     </div>
  </section>
);

const FeatureSection = () => {
  const navigate = useNavigate();
  return (
    <section className="max-w-7xl mx-auto px-4 mb-24">
      <div className="bg-[#0F172A] rounded-[2.5rem] p-12 relative overflow-hidden text-white shadow-2xl">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-600/20 rounded-full blur-[120px] -mr-20 -mt-20"></div>
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-blue-500/20 border border-blue-500/30 text-blue-300 text-xs font-bold uppercase tracking-wider">
              <Zap size={14}/> Tính năng mới
            </div>
            <h2 className="text-4xl md:text-5xl font-black leading-tight">
              Đăng tin siêu tốc với <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">Công nghệ AI</span>
            </h2>
            <p className="text-slate-400 text-lg leading-relaxed max-w-md">
              Không cần nhập liệu thủ công. Chỉ cần chụp ảnh, hệ thống sẽ tự động phân tích, điền tiêu đề, mô tả và định giá sản phẩm cho bạn trong 3 giây.
            </p>
            <div className="flex gap-4">
              <Button size="lg" icon={<Rocket size={20}/>} onClick={() => navigate('/post-item')}>Thử ngay</Button>
              <Button variant="ghost" className="text-white hover:bg-white/10" icon={<PlayCircle size={20}/>}>Xem demo</Button>
            </div>
          </div>
          <div className="relative hidden lg:block">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl blur-lg opacity-30 transform rotate-6"></div>
            <div className="bg-slate-800/50 backdrop-blur-xl border border-white/10 p-6 rounded-2xl shadow-2xl transform rotate-3 hover:rotate-0 transition-transform duration-500">
              <div className="flex items-center gap-4 mb-6 border-b border-white/10 pb-4">
                <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center shadow-lg"><Sparkles size={24}/></div>
                <div>
                  <h4 className="font-bold text-lg">AI Analysis</h4>
                  <p className="text-xs text-blue-200">Đang xử lý hình ảnh...</p>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="w-20 h-20 bg-slate-700 rounded-lg animate-pulse"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-slate-700 rounded w-3/4 animate-pulse"></div>
                    <div className="h-4 bg-slate-700 rounded w-1/2 animate-pulse"></div>
                  </div>
                </div>
                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 w-2/3 animate-[shimmer_1s_infinite]"></div>
                </div>
                <div className="flex justify-between text-xs text-slate-400 font-mono">
                  <span>Confidence: 98%</span>
                  <span>Category: Textbook</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<FilterState>({
    category: 'all',
    sort: SortOption.NEWEST,
    search: '',
  });

  const { products, loading, error, count, refetch } = useProducts(filter);

  const handleSearch = (term: string) => {
    if (term.trim()) navigate(`/market?search=${encodeURIComponent(term)}`);
  };

  const handleCategorySelect = (cat: ProductCategory | 'all') => {
    setFilter(prev => ({ ...prev, category: cat }));
  };

  return (
    <div className="min-h-screen font-sans selection:bg-[#00418E] selection:text-white pb-20 relative">
      <GlobalStyles />
      <ParticleCanvas />
      
      <div className="aurora-bg absolute top-0 left-0 w-full h-[120vh] bg-radial-gradient from-blue-500/5 to-transparent pointer-events-none -z-10"></div>

      <HeroSection onSearch={handleSearch} />

      <CategoryStrip current={filter.category} onSelect={handleCategorySelect} />

      <section className="max-w-7xl mx-auto px-4 mb-24 min-h-[600px]">
         <div className="flex flex-col md:flex-row items-center justify-between mb-10 gap-6">
            <div className="text-center md:text-left">
               <h2 className="text-3xl font-black text-slate-900 flex items-center gap-3 justify-center md:justify-start">
                  <Flame className="text-orange-500 fill-orange-500 animate-pulse"/> 
                  {filter.category === 'all' ? 'Mới lên sàn' : 'Kết quả lọc'}
               </h2>
               <p className="text-slate-500 mt-1 font-medium text-sm">
                 {loading ? 'Đang cập nhật dữ liệu...' : `Hiển thị ${products.length} sản phẩm mới nhất.`}
               </p>
            </div>
            
            <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
               {[
                 { id: SortOption.NEWEST, label: 'Mới nhất' },
                 { id: SortOption.PRICE_ASC, label: 'Giá tốt' },
                 { id: SortOption.MOST_VIEWED, label: 'Hot' }
               ].map(opt => (
                 <button 
                   key={opt.id}
                   onClick={() => setFilter(prev => ({...prev, sort: opt.id}))}
                   className={Utils.cn(
                     "px-4 py-2 rounded-lg text-xs font-bold transition-all",
                     filter.sort === opt.id ? "bg-slate-900 text-white shadow-md" : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                   )}
                 >
                   {opt.label}
                 </button>
               ))}
            </div>
         </div>

         <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {loading ? (
                [...Array(12)].map((_, i) => (
                  <div key={i} className="bg-white rounded-2xl border border-slate-100 p-4 space-y-3 h-[340px]">
                    <Skeleton className="w-full h-[200px] rounded-xl"/>
                    <Skeleton className="w-3/4 h-4 rounded mt-4"/>
                    <Skeleton className="w-1/2 h-4 rounded"/>
                    <div className="pt-4 mt-auto flex justify-between items-center">
                      <Skeleton className="w-1/3 h-6 rounded"/>
                      <Skeleton className="w-8 h-8 rounded-full" variant="circle"/>
                    </div>
                  </div>
                ))
              ) : error ? (
                <ErrorState message={error} onRetry={refetch} />
              ) : products.length > 0 ? (
                products.map((p) => (
                  <div key={p.id} className="animate-enter">
                    <ProductCard product={p}/>
                  </div>
                ))
              ) : (
                <div className="col-span-full">
                  <EmptyState 
                    title="Chưa có sản phẩm nào"
                    desc="Hiện tại chưa có sản phẩm nào trong danh mục này. Hãy thử lại sau hoặc đăng tin mới."
                    action={
                      <Link to="/post-item">
                        <Button icon={<PlusCircle size={18}/>}>Đăng tin đầu tiên</Button>
                      </Link>
                    }
                  />
                </div>
              )
            }
         </div>

         {products.length > 0 && !loading && (
           <div className="mt-16 text-center">
              <Link to="/market" className="inline-flex items-center gap-2 px-10 py-4 bg-white border-2 border-slate-200 hover:border-[#00418E] text-slate-700 hover:text-[#00418E] rounded-full font-bold text-base transition-all group hover:shadow-xl shadow-sm">
                 Xem toàn bộ thị trường <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform"/>
              </Link>
           </div>
         )}
      </section>

      <StatsSection />
      
      <FeatureSection />

      <section className="bg-white border-t border-slate-200 py-20 relative overflow-hidden">
         <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-full blur-3xl opacity-50 -mr-20 -mt-20"></div>
         <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-50 rounded-full blur-3xl opacity-50 -ml-20 -mb-20"></div>
         
         <div className="max-w-7xl mx-auto px-4 relative z-10">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-10 text-center">
               <div className="flex flex-col items-center group p-6 rounded-3xl hover:bg-slate-50 transition-colors cursor-default">
                  <div className="w-20 h-20 bg-blue-50 text-[#00418E] rounded-3xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500 shadow-sm border border-blue-100"><ShieldCheck size={40}/></div>
                  <h3 className="font-bold text-slate-900 text-xl mb-3">Xác thực Sinh viên</h3>
                  <p className="text-slate-500 text-sm leading-relaxed max-w-xs">Chỉ những tài khoản sử dụng email sinh viên (hcmut.edu.vn) mới được phép đăng tin để đảm bảo an toàn tuyệt đối cho cộng đồng.</p>
               </div>
               <div className="flex flex-col items-center group p-6 rounded-3xl hover:bg-slate-50 transition-colors cursor-default">
                  <div className="w-20 h-20 bg-green-50 text-green-600 rounded-3xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500 shadow-sm border border-green-100"><MapPin size={40}/></div>
                  <h3 className="font-bold text-slate-900 text-xl mb-3">Giao dịch Tại trường</h3>
                  <p className="text-slate-500 text-sm leading-relaxed max-w-xs">Khuyến khích giao dịch trực tiếp tại các địa điểm an toàn như Sảnh H6, Thư viện Trung tâm, Canteen B4 để tránh lừa đảo.</p>
               </div>
               <div className="flex flex-col items-center group p-6 rounded-3xl hover:bg-slate-50 transition-colors cursor-default">
                  <div className="w-20 h-20 bg-orange-50 text-orange-600 rounded-3xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500 shadow-sm border border-orange-100"><Zap size={40}/></div>
                  <h3 className="font-bold text-slate-900 text-xl mb-3">Nhanh chóng & Free</h3>
                  <p className="text-slate-500 text-sm leading-relaxed max-w-xs">Đăng tin trong 30 giây. Hoàn toàn miễn phí trọn đời cho sinh viên. Kết nối trực tiếp người mua và người bán không qua trung gian.</p>
               </div>
            </div>
         </div>
      </section>

      <footer className="bg-[#0F172A] text-slate-400 pt-24 pb-12 border-t border-slate-800">
         <div className="max-w-7xl mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-20">
               <div className="space-y-6">
                  <div className="flex items-center gap-3 text-white">
                    <div className="w-12 h-12 bg-[#00418E] rounded-2xl flex items-center justify-center font-black shadow-lg shadow-blue-900 text-xl">BK</div>
                    <div>
                       <h4 className="font-black text-2xl tracking-tight text-white">CHỢ BK</h4>
                       <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Student Marketplace</p>
                    </div>
                  </div>
                  <p className="leading-relaxed text-sm text-slate-400 max-w-xs">
                     Dự án phi lợi nhuận hỗ trợ sinh viên ĐH Bách Khoa TP.HCM. <br/>
                     Kết nối đam mê - Chia sẻ tri thức.
                  </p>
                  <div className="flex gap-4">
                     {['facebook', 'instagram', 'github', 'youtube'].map(icon => (
                        <a key={icon} href="#" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 hover:text-white transition-all border border-white/5 hover:border-white/20"><Globe size={18}/></a>
                     ))}
                  </div>
               </div>
               
               <div>
                  <h4 className="font-bold text-white mb-8 text-sm uppercase tracking-wider">Khám phá</h4>
                  <ul className="space-y-4 text-sm font-medium">
                     <li><Link to="/market" className="hover:text-[#00B0F0] transition-colors flex items-center gap-2 hover:translate-x-1 duration-200"><ChevronRight size={14}/> Dạo chợ online</Link></li>
                     <li><Link to="/post-item" className="hover:text-[#00B0F0] transition-colors flex items-center gap-2 hover:translate-x-1 duration-200"><ChevronRight size={14}/> Đăng tin bán</Link></li>
                     <li><Link to="/saved" className="hover:text-[#00B0F0] transition-colors flex items-center gap-2 hover:translate-x-1 duration-200"><ChevronRight size={14}/> Sản phẩm yêu thích</Link></li>
                     <li><a href="#" className="hover:text-[#00B0F0] transition-colors flex items-center gap-2 hover:translate-x-1 duration-200"><ChevronRight size={14}/> Sự kiện nổi bật</a></li>
                  </ul>
               </div>

               <div>
                  <h4 className="font-bold text-white mb-8 text-sm uppercase tracking-wider">Hỗ trợ</h4>
                  <ul className="space-y-4 text-sm font-medium">
                     <li><a href="#" className="hover:text-[#00B0F0] transition-colors">Trung tâm trợ giúp</a></li>
                     <li><a href="#" className="hover:text-[#00B0F0] transition-colors">Quy định đăng tin</a></li>
                     <li><a href="#" className="hover:text-[#00B0F0] transition-colors">Chính sách bảo mật</a></li>
                     <li><a href="#" className="hover:text-[#00B0F0] transition-colors">Báo cáo lừa đảo</a></li>
                  </ul>
               </div>

               <div>
                  <h4 className="font-bold text-white mb-8 text-sm uppercase tracking-wider">Liên hệ</h4>
                  <ul className="space-y-5 text-sm font-medium">
                     <li className="flex items-start gap-4">
                        <MapPin size={20} className="text-[#00B0F0] shrink-0 mt-0.5"/>
                        <span>268 Lý Thường Kiệt, Phường 14, Quận 10, TP.HCM (Tòa nhà H6)</span>
                     </li>
                     <li className="flex items-center gap-4">
                        <Server size={20} className="text-[#00B0F0] shrink-0"/>
                        <span>support@hcmut.edu.vn</span>
                     </li>
                     <li className="flex items-center gap-4">
                        <Smartphone size={20} className="text-[#00B0F0] shrink-0"/>
                        <span>(028) 3864 7256</span>
                     </li>
                  </ul>
               </div>
            </div>
            
            <div className="pt-8 border-t border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
               <p>&copy; {new Date().getFullYear()} HCMUT Student Project. All rights reserved.</p>
               <div className="flex gap-8">
                  <a href="#" className="hover:text-white transition-colors">Điều khoản</a>
                  <a href="#" className="hover:text-white transition-colors">Bảo mật</a>
                  <a href="#" className="hover:text-white transition-colors">Sitemap</a>
               </div>
            </div>
         </div>
      </footer>
    </div>
  );
};

export default HomePage;
