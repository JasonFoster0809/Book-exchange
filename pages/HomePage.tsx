import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Search, ArrowRight, Zap, Users, BookOpen, Calculator, Shirt,
  Monitor, Grid, Gift, Eye, ShoppingBag, PlusCircle,
  Heart, Package, ChevronRight, Sparkles, Clock, Smile, Rocket,
  PlayCircle, Ghost, WifiOff, MoreHorizontal, Smartphone, MapPin, 
  TrendingUp, Filter, SlidersHorizontal, X, ChevronLeft, Tag,
  Bell, Menu, Star, CheckCircle, ArrowUp, Mail, Info, Shield, 
  Award, HelpCircle, ChevronDown, Activity, Quote, Calendar,
  ExternalLink, ThumbsUp, MessageCircle
} from "lucide-react";
import { supabase } from "../services/supabase";
import { Product } from "../types";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";

// ============================================================================
// 1. CONFIGURATION & CONSTANTS
// ============================================================================
const ITEMS_PER_PAGE = 12;
const SCROLL_THRESHOLD = 400;

// --- Mock Data for UI Filling ---
const TICKER_MESSAGES = [
  "🔥 Minh Tuấn (K21) vừa đăng bán sách Giải tích 1 - 50k",
  "💻 Lan Anh (K20) đang tìm mua Laptop Dell cũ giá < 5tr",
  "🛍️ Chợ BK vừa đạt mốc 10.000 giao dịch thành công!",
  "🎁 Sự kiện đổi sách cũ lấy cây xanh đang diễn ra tại H6",
  "📢 Cảnh báo: Hãy giao dịch trực tiếp để tránh lừa đảo",
];

const TESTIMONIALS = [
  {
    id: 1,
    name: "Nguyễn Văn An",
    role: "K19 - Khoa Máy Tính",
    avatar: "https://ui-avatars.com/api/?name=Nguyen+An&background=0D8ABC&color=fff",
    content: "Tìm được cuốn Giải tích 1 giá siêu rẻ, lại còn được anh khóa trên hướng dẫn tận tình cách học. 10 điểm cho cộng đồng mình!",
    rating: 5
  },
  {
    id: 2,
    name: "Trần Thị Bích",
    role: "K20 - Khoa Hóa",
    avatar: "https://ui-avatars.com/api/?name=Tran+Bich&background=E91E63&color=fff",
    content: "Giao diện đẹp, dễ dùng. Thích nhất tính năng AI scan, mình đăng bán đống sách cũ chỉ mất có 1 phút là xong.",
    rating: 5
  },
  {
    id: 3,
    name: "Lê Hoàng Nam",
    role: "K21 - Khoa Điện",
    avatar: "https://ui-avatars.com/api/?name=Hoang+Nam&background=FF9800&color=fff",
    content: "Cộng đồng uy tín, toàn sinh viên trường mình nên rất yên tâm khi giao dịch. Đã mua được cái máy tính Casio ngon lành.",
    rating: 4
  }
];

const BLOG_POSTS = [
  {
    id: 1,
    title: "Kinh nghiệm chọn Laptop cho sinh viên IT năm nhất",
    category: "Công nghệ",
    date: "12/10/2023",
    image: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&q=80&w=300",
    excerpt: "Nên chọn Mac hay Windows? RAM 8GB có đủ không? Cùng giải đáp..."
  },
  {
    id: 2,
    title: "Top 5 địa điểm học bài 'chill' nhất Bách Khoa",
    category: "Đời sống",
    date: "10/10/2023",
    image: "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&q=80&w=300",
    excerpt: "Thư viện hay quán cafe? Những góc khuất yên tĩnh bạn chưa biết."
  },
  {
    id: 3,
    title: "Bí kíp săn giáo trình cũ giá rẻ đầu kỳ",
    category: "Mẹo vặt",
    date: "08/10/2023",
    image: "https://images.unsplash.com/photo-1495446815901-a7297e633e8d?auto=format&fit=crop&q=80&w=300",
    excerpt: "Đừng vội mua sách mới. Hãy thử dạo qua Chợ BK để tiết kiệm tiền triệu."
  }
];

// ============================================================================
// 2. TYPES DEFINITIONS
// ============================================================================
enum ProductCategory {
  TEXTBOOK = "textbook",
  ELECTRONICS = "electronics",
  SUPPLIES = "supplies",
  CLOTHING = "clothing",
  OTHER = "other",
}

enum SortOption {
  NEWEST = "newest",
  PRICE_ASC = "price_asc",
  PRICE_DESC = "price_desc",
  MOST_VIEWED = "most_viewed",
}

interface FilterState {
  category: string;
  sort: SortOption;
  search: string;
  minPrice: number | "";
  maxPrice: number | "";
  condition: "all" | "new" | "used";
}

// ============================================================================
// 3. UTILITY HELPER FUNCTIONS
// ============================================================================
const Utils = {
  formatCurrency: (amount: number) => {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount);
  },
  
  timeAgo: (dateString: string) => {
    if (!dateString) return "Vừa xong";
    const now = new Date();
    const posted = new Date(dateString);
    const diff = (now.getTime() - posted.getTime()) / 1000;
    
    if (diff < 60) return "Vừa xong";
    if (diff < 3600) return Math.floor(diff / 60) + " phút trước";
    if (diff < 86400) return Math.floor(diff / 3600) + " giờ trước";
    if (diff < 2592000) return Math.floor(diff / 86400) + " ngày trước";
    return posted.toLocaleDateString('vi-VN');
  },

  cn: (...classes: (string | undefined | null | false)[]) => {
    return classes.filter(Boolean).join(" ");
  }
};

// ============================================================================
// 4. VISUAL ENGINE (ADVANCED CSS STYLES)
// ============================================================================
const GlobalStyles = () => (
  <style>{`
    :root {
      --cobalt-900: #002147;
      --cobalt-800: #003366;
      --cobalt-600: #0047AB;
      --cyan-400: #00E5FF;
      --cyan-100: #E0F7FA;
      --light-bg: #F8FAFC;
    }
    
    body {
      background-color: var(--light-bg);
      color: var(--cobalt-900);
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
      overflow-x: hidden;
    }

    /* --- Grain Effect --- */
    .grain-overlay {
      position: fixed; inset: 0; pointer-events: none; z-index: 0;
      opacity: 0.04;
      background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
    }

    /* --- Aurora Animation --- */
    .aurora-bg {
      position: fixed; top: 0; left: 0; right: 0; height: 120vh; z-index: -1;
      background: 
        radial-gradient(at 0% 0%, rgba(0, 71, 171, 0.15) 0px, transparent 50%),
        radial-gradient(at 100% 0%, rgba(0, 229, 255, 0.1) 0px, transparent 50%),
        radial-gradient(at 50% 50%, rgba(255, 255, 255, 0.8) 0px, transparent 50%);
      filter: blur(80px);
      animation: aurora 20s ease-in-out infinite alternate;
    }
    @keyframes aurora {
      0% { transform: scale(1); opacity: 0.8; }
      100% { transform: scale(1.1); opacity: 1; }
    }

    /* --- Floating Animation --- */
    @keyframes float {
      0%, 100% { transform: translateY(0) rotate(0deg); }
      50% { transform: translateY(-20px) rotate(5deg); }
    }
    .animate-float { animation: float 8s ease-in-out infinite; }
    .delay-100 { animation-delay: 1s; }
    .delay-200 { animation-delay: 2s; }
    .delay-300 { animation-delay: 3s; }

    /* --- Glassmorphism --- */
    .glass-card {
      background: rgba(255, 255, 255, 0.75);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid rgba(255, 255, 255, 0.8);
      box-shadow: 0 8px 32px 0 rgba(0, 33, 71, 0.05);
    }
    
    .glass-nav {
      background: rgba(255, 255, 255, 0.9);
      backdrop-filter: blur(12px);
      border-bottom: 1px solid rgba(255, 255, 255, 0.5);
    }

    /* --- Hover Interactions --- */
    .hover-lift { transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
    .hover-lift:hover { 
      transform: translateY(-8px) scale(1.02); 
      box-shadow: 0 20px 40px -10px rgba(0, 71, 171, 0.15); 
      border-color: #BFDBFE; 
    }

    /* --- Loading Shimmer --- */
    .shimmer { position: relative; overflow: hidden; }
    .shimmer::after {
      content: ''; position: absolute; inset: 0;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.8), transparent);
      transform: translateX(-100%);
    }
    .shimmer:hover::after { transform: translateX(100%); transition: transform 1.5s infinite; }

    /* --- Utilities --- */
    .hide-scrollbar::-webkit-scrollbar { display: none; }
    .text-gradient { 
      background: linear-gradient(to right, #0047AB, #00E5FF); 
      -webkit-background-clip: text; 
      -webkit-text-fill-color: transparent; 
    }

    /* --- Modal Animation --- */
    .modal-backdrop {
      background: rgba(0, 33, 71, 0.7);
      backdrop-filter: blur(8px);
      position: fixed; inset: 0; z-index: 100;
      display: flex; align-items: center; justify-content: center;
      animation: fadeIn 0.3s ease-out;
    }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    
    .modal-content { animation: scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
    @keyframes scaleIn { from { opacity: 0; transform: scale(0.95) translateY(20px); } to { opacity: 1; transform: scale(1) translateY(0); } }

    /* --- Ticker Animation --- */
    @keyframes ticker {
      0% { transform: translateX(100%); }
      100% { transform: translateX(-100%); }
    }
    .ticker-wrap { overflow: hidden; white-space: nowrap; }
    .ticker-move { display: inline-block; padding-left: 100%; animation: ticker 30s linear infinite; }
  `}</style>
);

// ============================================================================
// 5. CUSTOM HOOKS (BUSINESS LOGIC)
// ============================================================================

// --- Fetch Products Hook ---
function useProducts(filter: FilterState) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  // Reset when filter changes
  useEffect(() => {
    setProducts([]);
    setPage(0);
    setHasMore(true);
    setLoading(true);
    fetchData(0, true);
  }, [filter]);

  const fetchData = async (pageIdx: number, isNewFilter = false) => {
    try {
      let query = supabase.from("products").select("*", { count: 'exact' }).eq("status", "available");

      // Filter Logic
      if (filter.category !== "all") query = query.eq("category", filter.category);
      if (filter.search) query = query.ilike("title", `%${filter.search}%`);
      if (filter.minPrice !== "") query = query.gte("price", filter.minPrice);
      if (filter.maxPrice !== "") query = query.lte("price", filter.maxPrice);
      if (filter.condition !== "all") query = query.eq("condition", filter.condition);

      // Sort Logic
      switch(filter.sort) {
        case SortOption.PRICE_ASC: query = query.order("price", { ascending: true }); break;
        case SortOption.PRICE_DESC: query = query.order("price", { ascending: false }); break;
        case SortOption.MOST_VIEWED: query = query.order("view_count", { ascending: false }); break;
        default: query = query.order("created_at", { ascending: false });
      }

      // Pagination
      const from = pageIdx * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;
      
      const { data, error, count } = await query.range(from, to);
      if (error) throw error;

      if (count !== null) setTotalCount(count);
      if (data.length < ITEMS_PER_PAGE) setHasMore(false);
      
      setProducts(prev => isNewFilter ? data : [...prev, ...data]);
    } catch (err) {
      console.error("Error fetching products:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadMore = () => {
    if (!loading && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchData(nextPage);
    }
  };

  return { products, loading, hasMore, loadMore, totalCount };
}

// --- Animated Counter Hook ---
function useCounter(end: number, duration = 2000) {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    let start = 0;
    const increment = end / (duration / 16); 
    const timer = setInterval(() => {
      start += increment;
      if (start >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [end, duration]);

  return count;
}

// ============================================================================
// 6. UI SUB-COMPONENTS (Tách nhỏ để dễ quản lý)
// ============================================================================

// --- Live Ticker (Top Bar) ---
const LiveTickerBar = () => {
  return (
    <div className="bg-[#002147] text-white h-8 flex items-center overflow-hidden relative z-50">
      <div className="bg-[#0047AB] h-full px-3 flex items-center z-10 font-black text-xs uppercase tracking-wider shadow-md">
        <Activity size={14} className="mr-2 animate-pulse"/> Live Update
      </div>
      <div className="ticker-wrap flex-1">
        <div className="ticker-move text-xs font-medium">
          {TICKER_MESSAGES.map((msg, i) => (
            <span key={i} className="inline-block px-4">
              <span className="text-[#00E5FF] mr-2">●</span> {msg}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

// --- Hero Slider ---
const HeroSlider = () => {
  const [current, setCurrent] = useState(0);
  const slides = [
    { title: "Trao đổi đồ cũ", sub: "Thông minh & Tiết kiệm", desc: "Nền tảng mua bán dành riêng cho sinh viên Bách Khoa.", color: "from-[#0047AB] via-[#00E5FF] to-[#2E5AAC]" },
    { title: "Giáo trình giá rẻ", sub: "Tiếp sức mùa thi", desc: "Tìm mua sách cũ, tài liệu ôn thi với giá cực hời.", color: "from-orange-500 via-yellow-400 to-red-500" },
    { title: "Đồ công nghệ", sub: "Chính hãng sinh viên", desc: "Máy tính, phụ kiện điện tử chất lượng, giá mềm.", color: "from-purple-600 via-pink-500 to-indigo-500" },
  ];

  useEffect(() => {
    const timer = setInterval(() => setCurrent(prev => (prev + 1) % slides.length), 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative z-10 mx-auto max-w-5xl mb-12">
      <div className="flex justify-center mb-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/40 px-5 py-2 shadow-sm backdrop-blur-md animate-bounce">
          <Sparkles size={16} className="text-yellow-500 fill-yellow-500" />
          <span className="text-xs font-bold uppercase tracking-widest text-[#002147]">Cổng thông tin Sinh viên</span>
        </div>
      </div>
      <div className="grid grid-cols-1 relative min-h-[220px]">
        {slides.map((slide, idx) => (
          <div key={idx} className={`col-start-1 row-start-1 transition-all duration-700 flex flex-col items-center pb-8 ${idx === current ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
            <h1 className="text-5xl md:text-7xl font-black tracking-tight text-[#002147] mb-6 text-center leading-tight drop-shadow-sm">
              {slide.title} <br />
              <span className={`bg-gradient-to-r ${slide.color} bg-clip-text text-transparent`}>{slide.sub}</span>
            </h1>
            <p className="text-lg text-slate-600 max-w-2xl text-center leading-relaxed font-medium">{slide.desc}</p>
          </div>
        ))}
      </div>
      <div className="flex justify-center gap-2 mt-4">
        {slides.map((_, idx) => (
          <button key={idx} onClick={() => setCurrent(idx)} className={`h-2 rounded-full transition-all duration-300 ${idx === current ? 'bg-[#0047AB] w-12' : 'bg-slate-300 w-2'}`} />
        ))}
      </div>
    </div>
  );
};

// --- Top Sellers Carousel ---
const TopSellers = () => (
  <div className="mb-20">
    <div className="flex items-center justify-between mb-8 px-4">
      <h2 className="text-2xl font-black text-[#002147] flex items-center gap-2">
        <Award className="text-yellow-500 fill-yellow-500"/> Top Sinh viên năng động
      </h2>
      <Link to="/rankings" className="text-[#0047AB] font-bold text-sm hover:underline flex items-center gap-1">
        Xem tất cả <ChevronRight size={16}/>
      </Link>
    </div>
    <div className="flex gap-4 overflow-x-auto px-4 pb-4 hide-scrollbar snap-x">
      {[1,2,3,4,5,6].map(i => (
        <div key={i} className="min-w-[220px] glass-card p-5 rounded-2xl flex flex-col items-center text-center snap-start hover:bg-white transition-colors cursor-pointer group">
          <div className="relative">
            <img src={`https://ui-avatars.com/api/?name=User+${i}&background=random`} className="w-20 h-20 rounded-full border-4 border-white shadow-md mb-3 group-hover:scale-110 transition-transform"/>
            <div className="absolute -bottom-2 -right-2 bg-yellow-400 text-[#002147] text-[10px] font-black px-2 py-1 rounded-full border-2 border-white shadow-sm flex items-center gap-1">
              <Star size={8} className="fill-[#002147]"/> TOP {i}
            </div>
          </div>
          <h4 className="font-bold text-[#002147] mt-2">Nguyễn Văn {String.fromCharCode(64+i)}</h4>
          <p className="text-xs text-slate-500 mb-3 font-medium">Khoa KH & KT Máy Tính</p>
          <div className="flex gap-2 w-full">
             <div className="flex-1 bg-blue-50 rounded-lg py-1">
               <p className="text-[10px] text-slate-400 uppercase font-bold">Đã bán</p>
               <p className="text-sm font-black text-[#0047AB]">{100 - i * 5}</p>
             </div>
             <div className="flex-1 bg-green-50 rounded-lg py-1">
               <p className="text-[10px] text-slate-400 uppercase font-bold">Đánh giá</p>
               <p className="text-sm font-black text-green-600">4.{9-i}</p>
             </div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

// --- Quick View Modal ---
const QuickViewModal = ({ product, onClose }: { product: Product, onClose: () => void }) => {
  const navigate = useNavigate();
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content bg-white rounded-3xl p-6 w-full max-w-4xl shadow-2xl m-4 flex flex-col md:flex-row gap-8 relative overflow-hidden" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-slate-100 rounded-full hover:bg-slate-200 transition-colors z-10"><X size={20}/></button>
        
        {/* Image Side */}
        <div className="w-full md:w-1/2 bg-slate-100 rounded-2xl overflow-hidden flex items-center justify-center relative group">
          <img src={product.images?.[0] || 'https://via.placeholder.com/400'} className="max-h-[400px] object-contain group-hover:scale-105 transition-transform duration-500"/>
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 text-white text-xs px-3 py-1 rounded-full backdrop-blur-md flex items-center gap-1">
            <Eye size={12}/> Đang xem nhanh
          </div>
        </div>

        {/* Info Side */}
        <div className="w-full md:w-1/2 flex flex-col">
          <div className="flex justify-between items-start mb-2">
            <span className="bg-blue-100 text-[#0047AB] text-xs font-bold px-3 py-1 rounded-lg uppercase tracking-wider">{product.category}</span>
            <span className="text-slate-400 text-xs flex items-center gap-1"><Clock size={12}/> {Utils.timeAgo(product.created_at)}</span>
          </div>
          <h2 className="text-2xl font-black text-[#002147] mb-2 leading-tight">{product.title}</h2>
          <p className="text-3xl font-black text-[#0047AB] mb-6">{product.price === 0 ? "Tặng miễn phí" : Utils.formatCurrency(product.price)}</p>
          
          <div className="space-y-3 mb-8 bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-500">Tình trạng</span>
              <span className="font-bold text-slate-800 flex items-center gap-1"><Star size={14} className="text-yellow-500 fill-yellow-500"/> {product.condition}</span>
            </div>
            <div className="w-full h-[1px] bg-slate-200 my-1"></div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-500">Khu vực</span>
              <span className="font-bold text-slate-800 flex items-center gap-1"><MapPin size={14} className="text-red-500"/> {product.location_name || 'Hồ Chí Minh'}</span>
            </div>
            <div className="w-full h-[1px] bg-slate-200 my-1"></div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-500">Người bán</span>
              <span className="font-bold text-[#0047AB] cursor-pointer hover:underline">Xem hồ sơ</span>
            </div>
          </div>

          <div className="mt-auto flex gap-3">
            <button onClick={() => navigate(`/product/${product.id}`)} className="flex-1 bg-[#0047AB] text-white py-3.5 rounded-xl font-bold hover:bg-[#002147] transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-200 active:scale-95">
              Xem chi tiết <ArrowRight size={18}/>
            </button>
            <button className="px-4 py-3.5 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors text-slate-500 hover:text-red-500 active:scale-95">
              <Heart size={20}/>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Product Card ---
const ProductCard: React.FC<{ product: Product, onQuickView: (p: Product) => void }> = ({ product, onQuickView }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToast } = useToast();
  const [liked, setLiked] = useState(false);

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return addToast("Vui lòng đăng nhập", "info");
    setLiked(!liked);
    if (!liked) addToast("Đã thêm vào danh sách yêu thích", "success");
  };

  return (
    <div onClick={() => navigate(`/product/${product.id}`)} className="glass-card hover-lift group relative flex flex-col rounded-2xl bg-white h-full cursor-pointer overflow-hidden border border-white/60">
      <div className="shimmer relative aspect-[4/3] bg-slate-100 overflow-hidden">
        <img src={product.images?.[0] || 'https://via.placeholder.com/300'} alt={product.title} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" loading="lazy"/>
        
        {/* Badges */}
        <div className="absolute left-3 top-3 flex flex-col gap-1">
          {product.price === 0 && <span className="flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold shadow-sm backdrop-blur-md bg-red-500 text-white"><Gift size={10}/> FREE</span>}
          {(new Date().getTime() - new Date(product.created_at).getTime() < 172800000) && 
            <span className="flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold shadow-sm backdrop-blur-md bg-[#0047AB] text-white"><Zap size={10} className="fill-current"/> MỚI</span>}
        </div>

        {/* Hover Actions */}
        <div className="absolute top-3 right-3 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-4 group-hover:translate-x-0">
          <button onClick={handleLike} className="p-2 bg-white/90 backdrop-blur rounded-full text-slate-400 hover:text-red-500 hover:bg-white shadow-sm transition-colors"><Heart size={18} className={liked ? "fill-red-500 text-red-500" : ""}/></button>
          <button onClick={(e) => {e.stopPropagation(); onQuickView(product)}} className="p-2 bg-white/90 backdrop-blur rounded-full text-slate-400 hover:text-[#0047AB] hover:bg-white shadow-sm transition-colors"><Eye size={18}/></button>
        </div>
      </div>

      <div className="p-4 flex flex-col flex-1">
        <div className="flex justify-between items-start mb-2">
          <span className="text-[10px] font-bold text-[#0047AB] bg-blue-50 px-2 py-0.5 rounded border border-blue-100 truncate max-w-[100px]">{product.category}</span>
          <span className="text-[10px] text-slate-400 flex items-center gap-1"><Clock size={10}/> {Utils.timeAgo(product.created_at)}</span>
        </div>
        <h3 className="font-bold text-slate-900 line-clamp-2 text-sm mb-auto group-hover:text-[#0047AB] transition-colors">{product.title}</h3>
        <div className="mt-3 pt-3 border-t border-slate-100 flex justify-between items-center">
          <span className="text-lg font-black text-[#002147]">{product.price === 0 ? "Tặng" : Utils.formatCurrency(product.price)}</span>
          {product.location_name && <div className="flex items-center gap-1 text-[10px] text-slate-500"><MapPin size={10}/> {product.location_name}</div>}
        </div>
      </div>
    </div>
  );
};

// --- Testimonials Section ---
const TestimonialsSection = () => (
  <section className="mb-24 max-w-7xl mx-auto px-4">
    <div className="text-center mb-12">
      <h2 className="text-3xl font-black text-[#002147] mb-2 flex items-center justify-center gap-2"><Quote className="fill-current text-[#0047AB]"/> Sinh viên nói gì?</h2>
      <p className="text-slate-500">Những câu chuyện từ cộng đồng BK Market</p>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {TESTIMONIALS.map((t) => (
        <div key={t.id} className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 italic relative hover:shadow-lg transition-shadow">
          <div className="flex items-center gap-4 mb-6">
            <img src={t.avatar} className="w-12 h-12 rounded-full border-2 border-blue-100"/>
            <div>
              <h4 className="font-bold text-[#002147]">{t.name}</h4>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">{t.role}</p>
            </div>
          </div>
          <p className="text-slate-600 mb-6 text-sm leading-relaxed relative z-10">"{t.content}"</p>
          <div className="flex text-yellow-400 gap-1">
            {[...Array(t.rating)].map((_, i) => <Star key={i} size={14} className="fill-current"/>)}
          </div>
        </div>
      ))}
    </div>
  </section>
);

// --- Blog / News Section ---
const BlogSection = () => (
  <section className="mb-24 max-w-7xl mx-auto px-4">
    <div className="flex items-center justify-between mb-8">
      <h2 className="text-2xl font-black text-[#002147] flex items-center gap-2"><BookOpen/> Cẩm nang sinh viên</h2>
      <button className="text-[#0047AB] font-bold text-sm hover:underline flex items-center gap-1">Xem tất cả <ChevronRight size={16}/></button>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
      {BLOG_POSTS.map((post) => (
        <div key={post.id} className="group cursor-pointer">
          <div className="rounded-2xl overflow-hidden mb-4 relative aspect-video">
            <img src={post.image} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"/>
            <div className="absolute top-3 left-3 bg-white/90 backdrop-blur px-3 py-1 rounded-lg text-xs font-bold text-[#002147] uppercase tracking-wider shadow-sm">
              {post.category}
            </div>
          </div>
          <p className="text-xs text-slate-400 font-bold mb-2 flex items-center gap-1"><Calendar size={12}/> {post.date}</p>
          <h3 className="text-lg font-bold text-[#002147] mb-2 group-hover:text-[#0047AB] transition-colors leading-tight">{post.title}</h3>
          <p className="text-sm text-slate-500 line-clamp-2">{post.excerpt}</p>
        </div>
      ))}
    </div>
  </section>
);

// ============================================================================
// 7. MAIN PAGE COMPONENT
// ============================================================================
const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<FilterState>({ category: "all", sort: SortOption.NEWEST, search: "", minPrice: "", maxPrice: "", condition: "all" });
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showBackToTop, setShowBackToTop] = useState(false);
  
  // Animation Counters (Auto increment on view)
  const countUsers = useCounter(1500, 3000);
  const countItems = useCounter(8500, 3000);
  const countTrans = useCounter(650, 3000);

  // Debounce Search
  useEffect(() => {
    const t = setTimeout(() => setFilter(p => ({...p, search: searchTerm})), 500);
    return () => clearTimeout(t);
  }, [searchTerm]);

  // Scroll Handler
  useEffect(() => {
    const handleScroll = () => setShowBackToTop(window.scrollY > 500);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const { products, loading, hasMore, loadMore, totalCount } = useProducts(filter);

  return (
    <div className="relative min-h-screen selection:bg-[#0047AB] selection:text-white pb-20 font-sans">
      <GlobalStyles />
      <div className="grain-overlay"></div>
      <div className="aurora-bg"></div>
      
      {/* 1. TOP TICKER */}
      <LiveTickerBar />

      {/* 2. MODALS */}
      {selectedProduct && <QuickViewModal product={selectedProduct} onClose={() => setSelectedProduct(null)} />}

      {/* 3. HERO SECTION */}
      <section className="relative px-4 pt-16 pb-20 text-center overflow-hidden">
        {/* Background Floating Elements */}
        <div className="absolute inset-0 pointer-events-none opacity-30">
           <div className="animate-float absolute left-[5%] top-20 text-blue-300 delay-0"><BookOpen size={64} /></div>
           <div className="animate-float absolute right-[10%] top-40 text-cyan-300 delay-100"><Monitor size={80} /></div>
           <div className="animate-float absolute bottom-40 right-[15%] text-indigo-300 delay-200"><Shirt size={72} /></div>
           <div className="animate-float absolute bottom-20 left-[10%] text-pink-300 delay-300"><Heart size={50} /></div>
        </div>

        <HeroSlider />

        {/* Search Bar */}
        <div className="max-w-2xl mx-auto relative z-20 mb-16">
          <div className="absolute -inset-1 bg-gradient-to-r from-[#0047AB] to-[#00E5FF] rounded-full opacity-30 blur-lg animation-pulse"></div>
          <div className="relative bg-white/90 p-2 rounded-full shadow-2xl flex items-center backdrop-blur-xl border border-white/50">
            <Search className="ml-4 text-slate-400" size={22}/>
            <input 
              className="flex-1 bg-transparent border-none outline-none px-4 py-3 text-slate-900 placeholder:text-slate-400 font-medium" 
              placeholder="Bạn muốn tìm gì hôm nay?" 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)}
            />
            <div className="h-8 w-[1px] bg-slate-200 mx-2"></div>
            <button className="bg-[#0047AB] text-white px-8 py-3 rounded-full font-bold hover:bg-[#00306b] transition-all shadow-lg hover:shadow-[#0047AB]/30 active:scale-95">
              Tìm kiếm
            </button>
          </div>
        </div>

        {/* Categories Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto px-4">
           {[
             { label: "Dạo Chợ", icon: <ShoppingBag/>, link: "/market", color: "text-cyan-600 bg-cyan-50" },
             { label: "Đăng Tin", icon: <PlusCircle/>, link: "/post-item", color: "text-indigo-600 bg-indigo-50" },
             { label: "Đã Lưu", icon: <Heart/>, link: "/saved", color: "text-pink-600 bg-pink-50" },
             { label: "Quản Lý", icon: <Package/>, link: "/my-items", color: "text-orange-600 bg-orange-50" },
           ].map((item, i) => (
             <Link to={item.link} key={i} className="glass-card hover-lift p-5 rounded-3xl flex flex-col items-center gap-3 text-center group transition-all">
               <div className={`p-4 rounded-2xl ${item.color} group-hover:scale-110 transition-transform shadow-inner`}>{item.icon}</div>
               <span className="font-bold text-[#002147] text-sm">{item.label}</span>
             </Link>
           ))}
        </div>
      </section>

      {/* 4. ANIMATED STATS */}
      <section className="mb-20 border-y border-white/20 bg-white/60 py-12 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { val: countUsers + "+", label: "Thành viên", icon: <Users/>, color: "text-blue-600" },
            { val: countItems + "+", label: "Tin đăng", icon: <Package/>, color: "text-purple-600" },
            { val: countTrans + "+", label: "Giao dịch", icon: <ShoppingBag/>, color: "text-green-600" },
            { val: "100%", label: "An toàn", icon: <Shield/>, color: "text-orange-600" },
          ].map((s, i) => (
            <div key={i} className="flex flex-col items-center group cursor-default">
              <div className={`mb-3 ${s.color} transform group-hover:scale-110 transition-transform duration-300`}>{s.icon}</div>
              <p className="text-4xl font-black text-[#002147] mb-1">{s.val}</p>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 5. TOP SELLERS */}
      <TopSellers />

      {/* 6. MAIN PRODUCT FEED */}
      <section className="max-w-7xl mx-auto px-4 mb-24 min-h-[600px]">
        {/* Sticky Filter Bar */}
        <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-xl border-y border-white/20 py-4 mb-8 -mx-4 px-4 shadow-sm flex items-center justify-between overflow-x-auto hide-scrollbar">
          <div className="flex gap-2">
            {[
              { id: "all", label: "Tất cả", icon: <Grid size={16}/> },
              { id: ProductCategory.TEXTBOOK, label: "Giáo trình", icon: <BookOpen size={16}/> },
              { id: ProductCategory.ELECTRONICS, label: "Điện tử", icon: <Monitor size={16}/> },
              { id: ProductCategory.CLOTHING, label: "Đồng phục", icon: <Shirt size={16}/> }
            ].map(cat => (
              <button 
                key={cat.id} 
                onClick={() => setFilter({ ...filter, category: cat.id })} 
                className={Utils.cn("flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold border transition-all whitespace-nowrap active:scale-95", filter.category === cat.id ? 'bg-[#0047AB] text-white border-[#0047AB] shadow-md' : 'bg-white text-slate-600 border-slate-200 hover:border-[#0047AB] hover:text-[#0047AB]')}
              >
                {cat.icon} {cat.label}
              </button>
            ))}
          </div>
          <div className="ml-4 border-l border-slate-200 pl-4">
             <div className="relative group">
                <select 
                  className="bg-transparent text-sm font-bold text-slate-700 outline-none cursor-pointer appearance-none pr-8 py-2" 
                  value={filter.sort} 
                  onChange={e => setFilter({ ...filter, sort: e.target.value as SortOption })}
                >
                  <option value={SortOption.NEWEST}>✨ Mới nhất</option>
                  <option value={SortOption.PRICE_ASC}>💰 Giá tăng dần</option>
                  <option value={SortOption.PRICE_DESC}>💎 Giá giảm dần</option>
                  <option value={SortOption.MOST_VIEWED}>🔥 Xem nhiều</option>
                </select>
                <ChevronDown size={16} className="absolute right-0 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"/>
             </div>
          </div>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {loading && products.length === 0 ? (
            [...Array(8)].map((_, i) => (
              <div key={i} className="h-[340px] rounded-2xl bg-white/50 border border-white p-4 space-y-4 shadow-sm">
                <div className="h-[180px] bg-slate-200 rounded-xl animate-pulse"/>
                <div className="h-4 w-3/4 bg-slate-200 rounded animate-pulse"/>
                <div className="h-4 w-1/2 bg-slate-200 rounded animate-pulse"/>
              </div>
            ))
          ) : products.length > 0 ? (
            products.map(p => <div key={p.id} className="animate-enter"><ProductCard product={p} onQuickView={setSelectedProduct}/></div>)
          ) : (
            <div className="col-span-full py-20 text-center border-2 border-dashed border-slate-200 rounded-3xl bg-white/50">
              <Ghost size={64} className="mx-auto text-slate-300 mb-6"/>
              <h3 className="text-2xl font-bold text-slate-700 mb-2">Không tìm thấy sản phẩm nào</h3>
              <p className="text-slate-500 mb-6 max-w-md mx-auto">Có thể từ khóa của bạn chưa chính xác hoặc chưa có ai đăng bán món đồ này.</p>
              <button onClick={() => setFilter({category: 'all', sort: SortOption.NEWEST, search: '', minPrice: "", maxPrice: "", condition: "all"})} className="px-6 py-2 bg-slate-200 rounded-full font-bold text-slate-600 hover:bg-slate-300 transition-colors">Xóa bộ lọc</button>
            </div>
          )}
        </div>

        {/* Load More */}
        {products.length > 0 && hasMore && (
          <div className="mt-16 text-center">
            <button onClick={loadMore} disabled={loading} className="group relative px-8 py-3 bg-white border border-slate-200 rounded-full font-bold text-slate-600 overflow-hidden shadow-lg transition-all hover:text-[#0047AB] hover:border-[#0047AB] active:scale-95 disabled:opacity-50">
              <span className="relative z-10">{loading ? "Đang tải thêm..." : "Xem thêm tin khác"}</span>
              <div className="absolute inset-0 bg-blue-50 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></div>
            </button>
          </div>
        )}
      </section>

      {/* 7. AI PROMO */}
      <section className="mx-auto mb-24 max-w-7xl px-4 animate-enter">
        <div className="relative overflow-hidden rounded-[3rem] bg-[#002147] p-12 text-white shadow-2xl group">
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#0047AB] rounded-full blur-[120px] opacity-40 group-hover:opacity-60 transition-opacity duration-1000"></div>
          <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-16">
            <div className="space-y-8 max-w-xl">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/20 bg-white/5 text-[#00E5FF] text-xs font-bold uppercase tracking-widest"><Zap size={14}/> New AI Feature</div>
              <h2 className="text-5xl font-black leading-tight">Đăng tin siêu tốc với <br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00E5FF] to-[#2E5AAC]">Trí tuệ nhân tạo</span></h2>
              <p className="text-slate-300 text-lg leading-relaxed">Không cần nhập liệu thủ công. Chỉ cần chụp ảnh sản phẩm, AI của chúng tôi sẽ tự động phân tích, đặt tiêu đề và đề xuất mức giá hợp lý trong 3 giây.</p>
              <div className="flex gap-4 pt-4">
                <button onClick={() => navigate('/post-item')} className="px-10 py-4 bg-gradient-to-r from-[#0047AB] to-[#00E5FF] rounded-2xl font-bold shadow-xl hover:scale-105 transition-transform flex items-center gap-3"><Rocket size={20}/> Thử ngay bây giờ</button>
              </div>
            </div>
            {/* AI Animation Mockup */}
            <div className="hidden lg:block relative perspective-1000">
               <div className="bg-[#001529]/90 backdrop-blur-2xl border border-white/10 p-8 rounded-3xl w-96 rotate-y-12 group-hover:rotate-y-0 transition-transform duration-700 shadow-2xl">
                  <div className="flex items-center gap-4 mb-6 border-b border-white/10 pb-6">
                    <div className="w-12 h-12 rounded-full bg-[#0047AB] flex items-center justify-center animate-bounce shadow-lg shadow-blue-500/50"><Sparkles size={24}/></div>
                    <div><h4 className="font-bold text-lg">AI Analysis</h4><p className="text-xs text-[#00E5FF] animate-pulse">Đang xử lý hình ảnh...</p></div>
                  </div>
                  <div className="space-y-4">
                    <div className="h-32 bg-slate-700/50 rounded-xl w-full animate-pulse border border-white/5"></div>
                    <div className="h-4 bg-slate-700/50 rounded w-3/4 animate-pulse"></div>
                    <div className="h-4 bg-slate-700/50 rounded w-1/2 animate-pulse"></div>
                  </div>
                  <div className="mt-6 pt-4 border-t border-white/10 flex justify-between items-center text-xs text-slate-400">
                    <span>Độ chính xác: 98%</span>
                    <span className="text-green-400">Hoàn tất</span>
                  </div>
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* 8. BLOG & TESTIMONIALS */}
      <BlogSection />
      <TestimonialsSection />

      {/* 9. BIG FOOTER */}
      <footer className="bg-[#002147] pt-24 pb-12 text-slate-400 border-t border-[#003366] relative overflow-hidden">
        {/* Background Vectors */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-[0.03]">
           <BookOpen size={400} className="absolute -top-20 -left-20"/>
           <Rocket size={400} className="absolute -bottom-20 -right-20"/>
        </div>

        <div className="max-w-7xl mx-auto px-4 relative z-10">
          {/* Newsletter Box */}
          <div className="mb-20 bg-gradient-to-r from-[#003366] to-[#002855] p-10 rounded-[2.5rem] flex flex-col md:flex-row items-center justify-between gap-10 border border-white/5 shadow-2xl">
            <div className="flex-1">
              <h3 className="text-3xl font-black text-white mb-2">Đăng ký nhận tin</h3>
              <p className="text-slate-400 text-lg">Nhận thông báo về các đợt sale sách cũ đầu kỳ và sự kiện hot.</p>
            </div>
            <div className="flex w-full md:w-auto gap-3">
              <input placeholder="Nhập email sinh viên..." className="bg-[#001529] border border-[#0047AB] text-white px-6 py-4 rounded-2xl outline-none focus:border-[#00E5FF] w-full md:w-80 transition-colors shadow-inner"/>
              <button className="bg-[#00E5FF] text-[#002147] font-bold px-8 py-4 rounded-2xl hover:bg-white transition-colors shadow-lg shadow-cyan-500/20"><Mail size={24}/></button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
            <div className="space-y-6">
              <div className="flex items-center gap-3 text-white">
                <div className="w-12 h-12 bg-[#0047AB] rounded-xl flex items-center justify-center font-black shadow-lg shadow-blue-900 text-xl">BK</div>
                <div><h4 className="font-black text-2xl tracking-tight text-white">CHỢ BK</h4><p className="text-[10px] uppercase text-[#00E5FF] tracking-widest font-bold">Student Marketplace</p></div>
              </div>
              <p className="text-sm leading-loose">Dự án phi lợi nhuận hỗ trợ sinh viên ĐH Bách Khoa TP.HCM trao đổi học liệu, đồ dùng học tập và thiết bị điện tử.</p>
              <div className="flex gap-4">
                {[1,2,3].map(i => <div key={i} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-[#0047AB] transition-colors cursor-pointer"><Share2 size={18}/></div>)}
              </div>
            </div>
            
            {/* Footer Links Sections */}
            <div>
              <h4 className="text-white font-bold uppercase text-sm mb-8 tracking-wider border-b border-blue-900 pb-2 inline-block">Khám phá</h4>
              <ul className="space-y-4 text-sm">
                <li><Link to="/market" className="hover:text-[#00E5FF] transition-colors flex items-center gap-2 group"><ChevronRight size={14} className="group-hover:translate-x-1 transition-transform"/> Dạo chợ online</Link></li>
                <li><Link to="/post-item" className="hover:text-[#00E5FF] transition-colors flex items-center gap-2 group"><ChevronRight size={14} className="group-hover:translate-x-1 transition-transform"/> Đăng tin bán</Link></li>
                <li><Link to="/saved" className="hover:text-[#00E5FF] transition-colors flex items-center gap-2 group"><ChevronRight size={14} className="group-hover:translate-x-1 transition-transform"/> Tin đã lưu</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-bold uppercase text-sm mb-8 tracking-wider border-b border-blue-900 pb-2 inline-block">Hỗ trợ</h4>
              <ul className="space-y-4 text-sm">
                <li><a href="#" className="hover:text-[#00E5FF] transition-colors">Trung tâm trợ giúp</a></li>
                <li><a href="#" className="hover:text-[#00E5FF] transition-colors">Quy định đăng tin</a></li>
                <li><a href="#" className="hover:text-[#00E5FF] transition-colors">An toàn giao dịch</a></li>
                <li><a href="#" className="hover:text-[#00E5FF] transition-colors">Báo cáo lừa đảo</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-bold uppercase text-sm mb-8 tracking-wider border-b border-blue-900 pb-2 inline-block">Liên hệ</h4>
              <ul className="space-y-4 text-sm">
                <li className="flex items-center gap-3"><Smartphone size={18} className="text-[#00E5FF]"/> (028) 3864 7256</li>
                <li className="flex items-start gap-3"><MapPin size={18} className="text-[#00E5FF] mt-1"/> 268 Lý Thường Kiệt, Phường 14, Quận 10, TP.HCM</li>
                <li className="flex items-center gap-3"><Mail size={18} className="text-[#00E5FF]"/> support@bkmart.vn</li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-[#003366] pt-8 text-center flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500">&copy; {new Date().getFullYear()} HCMUT Student Project.</p>
            <p className="text-xs font-medium text-slate-500 flex items-center gap-1">Built with <Heart size={10} className="fill-red-500 text-red-500"/> & <Clock size={10}/> by K21 Team</p>
          </div>
        </div>
      </footer>

      {/* Back to Top */}
      {showBackToTop && (
        <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="fixed bottom-8 right-8 bg-[#0047AB] text-white p-4 rounded-full shadow-2xl hover:scale-110 transition-transform z-50 animate-bounce hover:bg-[#00E5FF] hover:text-[#002147]">
          <ArrowUp size={24}/>
        </button>
      )}
    </div>
  );
};

export default HomePage;
