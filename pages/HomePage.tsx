import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Search, ArrowRight, Zap, Users, BookOpen, Calculator, Shirt,
  Monitor, Grid, Gift, Eye, ShoppingBag, PlusCircle,
  Heart, Package, ChevronRight, Sparkles, Clock, Smile, Rocket,
  PlayCircle, Ghost, WifiOff, MoreHorizontal, Smartphone, MapPin, 
  TrendingUp, Filter, SlidersHorizontal, X, ChevronLeft, Tag,
  Bell, Menu, Star, CheckCircle, ArrowUp, Mail, Info, Shield
} from "lucide-react";
import { supabase } from "../services/supabase";
import { Product } from "../types";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";

// ============================================================================
// 1. CONFIGURATION & TYPES
// ============================================================================
const ITEMS_PER_PAGE = 12;

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
// 2. UTILITY FUNCTIONS
// ============================================================================
const Utils = {
  formatCurrency: (amount: number) => 
    new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount),
  
  timeAgo: (dateString: string) => {
    if (!dateString) return "Vừa xong";
    const diff = (new Date().getTime() - new Date(dateString).getTime()) / 1000;
    if (diff < 60) return "Vừa xong";
    if (diff < 3600) return Math.floor(diff / 60) + " phút trước";
    if (diff < 86400) return Math.floor(diff / 3600) + " giờ trước";
    return Math.floor(diff / 86400) + " ngày trước";
  },

  cn: (...classes: (string | undefined | false)[]) => classes.filter(Boolean).join(" "),
};

// ============================================================================
// 3. VISUAL ENGINE (ADVANCED CSS)
// ============================================================================
const GlobalStyles = () => (
  <style>{`
    :root {
      --cobalt-900: #002147; --cobalt-800: #003366; --cobalt-600: #0047AB;
      --cyan-400: #00E5FF; --cyan-100: #E0F7FA;
      --light-bg: #F8FAFC;
    }
    
    body {
      background-color: var(--light-bg);
      color: var(--cobalt-900);
      font-family: 'Inter', sans-serif;
      overflow-x: hidden;
    }

    /* --- Aurora & Blob Animation --- */
    .aurora-bg {
      position: fixed; top: 0; left: 0; right: 0; height: 120vh; z-index: -1;
      background: 
        radial-gradient(at 0% 0%, rgba(0, 71, 171, 0.15) 0px, transparent 50%),
        radial-gradient(at 100% 0%, rgba(0, 229, 255, 0.1) 0px, transparent 50%),
        radial-gradient(at 50% 50%, rgba(255, 255, 255, 0.8) 0px, transparent 50%);
      filter: blur(80px);
      animation: aurora 15s ease-in-out infinite alternate;
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
    .animate-float { animation: float 6s ease-in-out infinite; }
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
      background: rgba(255, 255, 255, 0.85);
      backdrop-filter: blur(12px);
      border-bottom: 1px solid rgba(255, 255, 255, 0.5);
    }

    /* --- Interactions --- */
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
    .shimmer:hover::after { transform: translateX(100%); transition: transform 0.8s ease-in-out; }

    /* --- Utilities --- */
    .hide-scrollbar::-webkit-scrollbar { display: none; }
    .text-gradient { 
      background: linear-gradient(to right, #0047AB, #00E5FF); 
      -webkit-background-clip: text; 
      -webkit-text-fill-color: transparent; 
    }

    /* --- Modal --- */
    .modal-backdrop {
      background: rgba(0, 33, 71, 0.6);
      backdrop-filter: blur(8px);
      position: fixed; inset: 0; z-index: 100;
      display: flex; align-items: center; justify-content: center;
      animation: fadeIn 0.3s ease-out;
    }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    .modal-content { animation: scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
    @keyframes scaleIn { from { opacity: 0; transform: scale(0.95) translateY(20px); } to { opacity: 1; transform: scale(1) translateY(0); } }
  `}</style>
);

// ============================================================================
// 4. CUSTOM DATA HOOK
// ============================================================================
function useProducts(filter: FilterState) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

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

      const from = pageIdx * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;
      
      const { data, error, count } = await query.range(from, to);
      if (error) throw error;

      if (count !== null) setTotalCount(count);
      if (data.length < ITEMS_PER_PAGE) setHasMore(false);
      
      setProducts(prev => isNewFilter ? data : [...prev, ...data]);
    } catch (err) {
      console.error(err);
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

// ============================================================================
// 5. SUB-COMPONENTS
// ============================================================================

// --- TOP ANNOUNCEMENT BAR ---
const AnnouncementBar = () => (
  <div className="bg-[#002147] text-white py-2 px-4 text-center text-xs font-bold tracking-wider relative overflow-hidden">
    <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent animate-pulse pointer-events-none"/>
    <span className="relative z-10 flex items-center justify-center gap-2">
      <Bell size={12} className="text-[#00E5FF]"/> 
      SỰ KIỆN: Tuần lễ trao đổi sách cũ BK - Nhận quà liền tay! 👉 <Link to="/event" className="underline hover:text-[#00E5FF]">Xem chi tiết</Link>
    </span>
  </div>
);

// --- HERO SLIDER ---
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

// --- QUICK VIEW MODAL ---
const QuickViewModal = ({ product, onClose }: { product: Product, onClose: () => void }) => {
  const navigate = useNavigate();
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content bg-white rounded-3xl p-6 w-full max-w-4xl shadow-2xl m-4 flex flex-col md:flex-row gap-8 relative overflow-hidden" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-slate-100 rounded-full hover:bg-slate-200 transition-colors z-10"><X size={20}/></button>
        
        {/* Left: Image */}
        <div className="w-full md:w-1/2 bg-slate-100 rounded-2xl overflow-hidden flex items-center justify-center relative group">
          <img src={product.images?.[0] || 'https://via.placeholder.com/400'} className="max-h-[400px] object-contain group-hover:scale-105 transition-transform duration-500"/>
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 text-white text-xs px-3 py-1 rounded-full backdrop-blur-md">
            Click vào chi tiết để xem thêm ảnh
          </div>
        </div>

        {/* Right: Info */}
        <div className="w-full md:w-1/2 flex flex-col">
          <div className="flex justify-between items-start mb-2">
            <span className="bg-blue-100 text-[#0047AB] text-xs font-bold px-3 py-1 rounded-lg uppercase tracking-wider">{product.category}</span>
            <span className="text-slate-400 text-xs flex items-center gap-1"><Clock size={12}/> {Utils.timeAgo(product.created_at)}</span>
          </div>
          <h2 className="text-2xl font-black text-[#002147] mb-2 leading-tight">{product.title}</h2>
          <p className="text-3xl font-black text-[#0047AB] mb-6">{product.price === 0 ? "Tặng miễn phí" : Utils.formatCurrency(product.price)}</p>
          
          <div className="space-y-3 mb-8">
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-sm font-medium text-slate-500">Tình trạng</span>
              <span className="font-bold text-slate-800 flex items-center gap-1"><Star size={14} className="text-yellow-500 fill-yellow-500"/> {product.condition}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-sm font-medium text-slate-500">Khu vực</span>
              <span className="font-bold text-slate-800 flex items-center gap-1"><MapPin size={14} className="text-red-500"/> {product.location_name || 'Hồ Chí Minh'}</span>
            </div>
          </div>

          <div className="mt-auto flex gap-3">
            <button onClick={() => navigate(`/product/${product.id}`)} className="flex-1 bg-[#0047AB] text-white py-3 rounded-xl font-bold hover:bg-[#002147] transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-200">
              Xem chi tiết <ArrowRight size={18}/>
            </button>
            <button className="px-4 py-3 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"><Heart size={20}/></button>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- PRODUCT CARD ---
const ProductCard: React.FC<{ product: Product, onQuickView: (p: Product) => void }> = ({ product, onQuickView }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToast } = useToast();
  const [liked, setLiked] = useState(false);

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return addToast("Vui lòng đăng nhập", "info");
    setLiked(!liked);
    if (!liked) addToast("Đã lưu tin", "success");
  };

  const handleQuickView = (e: React.MouseEvent) => {
    e.stopPropagation();
    onQuickView(product);
  };

  return (
    <div onClick={() => navigate(`/product/${product.id}`)} className="glass-card hover-lift group relative flex flex-col rounded-2xl bg-white h-full cursor-pointer overflow-hidden border border-white/60">
      <div className="shimmer relative aspect-[4/3] bg-slate-100 overflow-hidden">
        <img src={product.images?.[0] || 'https://via.placeholder.com/300'} alt={product.title} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" loading="lazy"/>
        
        <div className="absolute left-3 top-3 flex flex-col gap-1">
          {product.price === 0 && <span className="flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold shadow-sm backdrop-blur-md bg-red-500 text-white"><Gift size={10}/> FREE</span>}
          {(new Date().getTime() - new Date(product.created_at).getTime() < 172800000) && <span className="flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold shadow-sm backdrop-blur-md bg-[#0047AB] text-white"><Zap size={10}/> MỚI</span>}
        </div>

        {/* Action Buttons */}
        <div className="absolute top-3 right-3 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-4 group-hover:translate-x-0">
          <button onClick={handleLike} className="p-2 bg-white/90 backdrop-blur rounded-full text-slate-400 hover:text-red-500 hover:bg-white shadow-sm"><Heart size={18} className={liked ? "fill-red-500 text-red-500" : ""}/></button>
          <button onClick={handleQuickView} className="p-2 bg-white/90 backdrop-blur rounded-full text-slate-400 hover:text-[#0047AB] hover:bg-white shadow-sm" title="Xem nhanh"><Eye size={18}/></button>
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
          {product.location_name && <div className="flex items-center gap-1 text-[10px] text-slate-500 bg-slate-50 px-2 py-1 rounded"><MapPin size={10}/> {product.location_name}</div>}
        </div>
      </div>
    </div>
  );
};

// --- FILTER MODAL ---
const FilterModal = ({ filter, setFilter, onClose }: { filter: FilterState, setFilter: any, onClose: () => void }) => (
  <div className="modal-backdrop" onClick={onClose}>
    <div className="modal-content bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl m-4" onClick={e => e.stopPropagation()}>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-bold text-[#002147]">Bộ lọc nâng cao</h3>
        <button onClick={onClose}><X size={24} className="text-slate-400 hover:text-slate-800"/></button>
      </div>
      
      <div className="space-y-6">
        <div>
          <label className="text-sm font-bold text-slate-700 mb-2 block">Khoảng giá (VNĐ)</label>
          <div className="flex gap-4 items-center">
            <input type="number" placeholder="Thấp nhất" className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 outline-none focus:border-[#0047AB]" value={filter.minPrice} onChange={e => setFilter({ ...filter, minPrice: e.target.value })}/>
            <span className="text-slate-400">-</span>
            <input type="number" placeholder="Cao nhất" className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 outline-none focus:border-[#0047AB]" value={filter.maxPrice} onChange={e => setFilter({ ...filter, maxPrice: e.target.value })}/>
          </div>
        </div>
        <div>
          <label className="text-sm font-bold text-slate-700 mb-2 block">Tình trạng</label>
          <div className="grid grid-cols-3 gap-2">
            {[{ id: 'all', label: 'Tất cả' }, { id: 'new', label: 'Mới cứng' }, { id: 'used', label: 'Đã dùng' }].map(opt => (
              <button key={opt.id} onClick={() => setFilter({ ...filter, condition: opt.id })} className={`py-2 rounded-xl text-sm font-medium border ${filter.condition === opt.id ? 'bg-blue-50 border-[#0047AB] text-[#0047AB]' : 'border-slate-200 text-slate-600'}`}>{opt.label}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-8 pt-4 border-t border-slate-100 flex gap-3">
        <button onClick={() => setFilter({ ...filter, minPrice: "", maxPrice: "", condition: "all" })} className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-xl">Đặt lại</button>
        <button onClick={onClose} className="flex-1 py-3 bg-[#0047AB] text-white font-bold rounded-xl shadow-lg shadow-blue-200 hover:bg-[#00306b]">Áp dụng</button>
      </div>
    </div>
  </div>
);

// ============================================================================
// 6. MAIN PAGE
// ============================================================================
const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<FilterState>({ category: "all", sort: SortOption.NEWEST, search: "", minPrice: "", maxPrice: "", condition: "all" });
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showBackToTop, setShowBackToTop] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setFilter(p => ({...p, search: searchTerm})), 500);
    return () => clearTimeout(t);
  }, [searchTerm]);

  useEffect(() => {
    const handleScroll = () => setShowBackToTop(window.scrollY > 400);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const { products, loading, hasMore, loadMore, totalCount } = useProducts(filter);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  return (
    <div className="relative min-h-screen selection:bg-[#0047AB] selection:text-white pb-20">
      <GlobalStyles />
      <div className="aurora-bg"></div>
      
      <AnnouncementBar />
      
      {showFilterModal && <FilterModal filter={filter} setFilter={setFilter} onClose={() => setShowFilterModal(false)} />}
      {selectedProduct && <QuickViewModal product={selectedProduct} onClose={() => setSelectedProduct(null)} />}

      {/* --- HERO SECTION --- */}
      <section className="relative px-4 pt-20 pb-20 text-center overflow-hidden">
        {/* Animated Background Icons */}
        <div className="absolute inset-0 pointer-events-none opacity-30">
           <div className="animate-float absolute left-[5%] top-20 text-blue-300 delay-0"><BookOpen size={64} /></div>
           <div className="animate-float absolute right-[10%] top-40 text-cyan-300 delay-100"><Monitor size={80} /></div>
           <div className="animate-float absolute bottom-40 right-[15%] text-indigo-300 delay-200"><Shirt size={72} /></div>
           <div className="animate-float absolute bottom-20 left-[10%] text-pink-300 delay-300"><Heart size={50} /></div>
        </div>

        <HeroSlider />

        {/* Search Bar */}
        <div className="max-w-2xl mx-auto relative z-20 mb-16">
          <div className="absolute -inset-1 bg-gradient-to-r from-[#0047AB] to-[#00E5FF] rounded-full opacity-30 blur-lg"></div>
          <div className="relative bg-white/90 p-2 rounded-full shadow-xl flex items-center backdrop-blur-xl">
            <Search className="ml-4 text-slate-400" size={22}/>
            <input className="flex-1 bg-transparent border-none outline-none px-4 py-3 text-slate-900 placeholder:text-slate-400 font-medium" placeholder="Bạn muốn tìm gì hôm nay?" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}/>
            <div className="h-8 w-[1px] bg-slate-200 mx-2"></div>
            <button onClick={() => setShowFilterModal(true)} className="p-3 text-slate-500 hover:text-[#0047AB] hover:bg-blue-50 rounded-full transition-colors relative">
              <SlidersHorizontal size={20}/>
              {(filter.minPrice || filter.condition !== 'all') && <div className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full"></div>}
            </button>
            <button onClick={() => navigate(`/market?search=${encodeURIComponent(searchTerm)}`)} className="bg-[#0047AB] text-white px-6 py-3 rounded-full font-bold hover:bg-[#00306b] transition-all ml-2 shadow-lg">Tìm</button>
          </div>
        </div>

        {/* Quick Categories */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto px-4">
           {[
             { label: "Dạo Chợ", icon: <ShoppingBag/>, link: "/market", color: "text-cyan-600 bg-cyan-50" },
             { label: "Đăng Tin", icon: <PlusCircle/>, link: "/post-item", color: "text-indigo-600 bg-indigo-50" },
             { label: "Đã Lưu", icon: <Heart/>, link: "/saved", color: "text-pink-600 bg-pink-50" },
             { label: "Quản Lý", icon: <Package/>, link: "/my-items", color: "text-orange-600 bg-orange-50" },
           ].map((item, i) => (
             <Link to={item.link} key={i} className="glass-card hover-lift p-4 rounded-2xl flex flex-col items-center gap-2 text-center group">
               <div className={`p-3 rounded-xl ${item.color} group-hover:scale-110 transition-transform`}>{item.icon}</div>
               <span className="font-bold text-[#002147] text-sm">{item.label}</span>
             </Link>
           ))}
        </div>
      </section>

      {/* --- FEATURES SECTION --- */}
      <section className="py-16 bg-white/50 backdrop-blur-sm border-y border-white/20 mb-20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-black text-[#002147] mb-2">Tại sao chọn <span className="text-[#0047AB]">BK Market?</span></h2>
            <p className="text-slate-500">Nền tảng được xây dựng bởi sinh viên, vì sinh viên.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: <Shield size={32}/>, title: "Xác thực BK", desc: "100% người dùng là sinh viên Bách Khoa, giảm thiểu lừa đảo." },
              { icon: <Zap size={32}/>, title: "Nhanh chóng", desc: "Đăng tin trong 30s với sự hỗ trợ của AI tự động điền thông tin." },
              { icon: <Smile size={32}/>, title: "Phi lợi nhuận", desc: "Hoàn toàn miễn phí. Không thu phí trung gian hay phí đăng tin." },
            ].map((f, i) => (
              <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center text-center hover:shadow-md transition-shadow">
                <div className="w-16 h-16 bg-blue-50 text-[#0047AB] rounded-full flex items-center justify-center mb-4">{f.icon}</div>
                <h3 className="font-bold text-lg text-[#002147] mb-2">{f.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --- MAIN MARKETPLACE SECTION --- */}
      <section className="max-w-7xl mx-auto px-4 mb-24 min-h-[600px]">
        {/* Sticky Nav */}
        <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-xl border-y border-white/20 py-4 mb-8 -mx-4 px-4 shadow-sm flex items-center justify-between overflow-x-auto hide-scrollbar">
          <div className="flex gap-2">
            {[{ id: "all", label: "Tất cả", icon: <Grid size={16}/> }, { id: ProductCategory.TEXTBOOK, label: "Sách", icon: <BookOpen size={16}/> }, { id: ProductCategory.ELECTRONICS, label: "Điện tử", icon: <Monitor size={16}/> }, { id: ProductCategory.SUPPLIES, label: "Dụng cụ", icon: <Calculator size={16}/> }, { id: ProductCategory.CLOTHING, label: "Đồng phục", icon: <Shirt size={16}/> }].map(cat => (
              <button key={cat.id} onClick={() => setFilter({ ...filter, category: cat.id })} className={Utils.cn("flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold border transition-all whitespace-nowrap", filter.category === cat.id ? 'bg-[#0047AB] text-white border-[#0047AB]' : 'bg-white text-slate-600 border-slate-200 hover:border-[#0047AB]')}>{cat.icon} {cat.label}</button>
            ))}
          </div>
          <div className="ml-4 border-l border-slate-200 pl-4">
             <select className="bg-transparent text-sm font-bold text-slate-600 outline-none cursor-pointer" value={filter.sort} onChange={e => setFilter({ ...filter, sort: e.target.value as SortOption })}>
               <option value={SortOption.NEWEST}>Mới nhất</option>
               <option value={SortOption.PRICE_ASC}>Giá tăng dần</option>
               <option value={SortOption.PRICE_DESC}>Giá giảm dần</option>
               <option value={SortOption.MOST_VIEWED}>Xem nhiều</option>
             </select>
          </div>
        </div>

        {/* Product Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {loading && products.length === 0 ? (
            [...Array(8)].map((_, i) => (
              <div key={i} className="h-[320px] rounded-2xl bg-white/50 border border-white p-4 space-y-4 shadow-sm">
                <div className="h-[180px] bg-slate-200 rounded-xl animate-pulse"/>
                <div className="h-4 w-3/4 bg-slate-200 rounded animate-pulse"/>
                <div className="h-4 w-1/2 bg-slate-200 rounded animate-pulse"/>
              </div>
            ))
          ) : products.length > 0 ? (
            products.map(p => <div key={p.id} className="animate-enter"><ProductCard product={p} onQuickView={setSelectedProduct}/></div>)
          ) : (
            <div className="col-span-full py-20 text-center border-2 border-dashed border-slate-200 rounded-3xl bg-white/50">
              <Ghost size={48} className="mx-auto text-slate-300 mb-4"/>
              <h3 className="text-xl font-bold text-slate-700">Không tìm thấy sản phẩm nào</h3>
              <button onClick={() => setFilter({category: 'all', sort: SortOption.NEWEST, search: '', minPrice: "", maxPrice: "", condition: "all"})} className="mt-4 text-[#0047AB] font-bold hover:underline">Xóa bộ lọc</button>
            </div>
          )}
        </div>

        {products.length > 0 && hasMore && (
          <div className="mt-12 text-center">
            <button onClick={loadMore} disabled={loading} className="bg-white border border-slate-200 px-8 py-3 rounded-full font-bold text-slate-600 hover:border-[#0047AB] hover:text-[#0047AB] transition-all shadow-sm disabled:opacity-50">
              {loading ? "Đang tải..." : "Xem thêm tin đăng"}
            </button>
          </div>
        )}
      </section>

      {/* --- AI BANNER --- */}
      <section className="mx-auto mb-24 max-w-7xl px-4 animate-enter">
        <div className="relative overflow-hidden rounded-[2.5rem] bg-[#002147] p-12 text-white shadow-2xl group">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#0047AB] rounded-full blur-[100px] opacity-50 group-hover:opacity-70 transition-opacity"></div>
          <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-10">
            <div className="space-y-6 max-w-xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/20 bg-white/10 text-[#00E5FF] text-xs font-bold uppercase"><Zap size={14}/> Tính năng mới</div>
              <h2 className="text-4xl md:text-5xl font-black leading-tight">Đăng tin siêu tốc với <br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00E5FF] to-[#2E5AAC]">Công nghệ AI</span></h2>
              <p className="text-slate-300 text-lg">AI tự động phân tích hình ảnh và điền thông tin trong 3 giây.</p>
              <div className="flex gap-4 pt-2">
                <button onClick={() => navigate('/post-item')} className="px-8 py-3 bg-gradient-to-r from-[#0047AB] to-[#00E5FF] rounded-xl font-bold shadow-lg hover:scale-105 transition-transform flex items-center gap-2"><Rocket size={20}/> Thử ngay</button>
              </div>
            </div>
            {/* AI Mockup */}
            <div className="hidden lg:block relative">
               <div className="bg-[#001529]/80 backdrop-blur-xl border border-white/10 p-6 rounded-2xl w-80 rotate-6 group-hover:rotate-0 transition-transform duration-500 shadow-2xl">
                  <div className="flex items-center gap-4 mb-4 border-b border-white/10 pb-4">
                    <div className="w-10 h-10 rounded-full bg-[#0047AB] flex items-center justify-center animate-bounce"><Sparkles size={20}/></div>
                    <div><h4 className="font-bold">AI Analysis</h4><p className="text-xs text-[#00E5FF]">Processing...</p></div>
                  </div>
                  <div className="space-y-3">
                    <div className="h-24 bg-slate-700 rounded-lg w-full animate-pulse"></div>
                    <div className="h-3 bg-slate-700 rounded w-3/4 animate-pulse"></div>
                    <div className="h-3 bg-slate-700 rounded w-1/2 animate-pulse"></div>
                  </div>
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- TESTIMONIALS --- */}
      <section className="mb-24 max-w-7xl mx-auto px-4">
        <h2 className="text-center text-3xl font-black text-[#002147] mb-12">Sinh viên nói gì?</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { name: "Minh Tuấn", role: "K19 - Khoa Máy Tính", content: "Tìm được cuốn Giải tích 1 giá siêu rẻ, lại còn được anh khóa trên hướng dẫn tận tình. 10 điểm!" },
            { name: "Lan Anh", role: "K20 - Khoa Hóa", content: "Giao diện đẹp, dễ dùng. Thích nhất tính năng AI scan, đăng bán sách cũ cực nhanh." },
            { name: "Hoàng Nam", role: "K21 - Khoa Điện", content: "Cộng đồng uy tín, toàn sinh viên trường mình nên rất yên tâm khi giao dịch." },
          ].map((t, i) => (
            <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 italic relative">
              <div className="absolute -top-4 left-6 bg-[#0047AB] text-white p-2 rounded-lg"><CheckCircle size={20}/></div>
              <p className="text-slate-600 mb-4 pt-4">"{t.content}"</p>
              <div>
                <h4 className="font-bold text-[#002147]">{t.name}</h4>
                <p className="text-xs text-slate-400 font-bold uppercase">{t.role}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* --- FOOTER --- */}
      <footer className="bg-[#002147] pt-20 pb-10 text-slate-400 border-t border-[#003366] relative overflow-hidden">
        {/* Background Elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-10">
           <div className="absolute top-10 left-10 text-white animate-float"><BookOpen size={120}/></div>
           <div className="absolute bottom-10 right-10 text-white animate-float delay-200"><Rocket size={120}/></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 relative z-10">
          {/* Newsletter */}
          <div className="mb-16 bg-[#003366]/50 p-8 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-6 backdrop-blur-sm border border-white/5">
            <div>
              <h3 className="text-2xl font-bold text-white mb-2">Đăng ký nhận tin</h3>
              <p className="text-sm text-slate-400">Nhận thông báo về các đợt sale sách cũ đầu kỳ.</p>
            </div>
            <div className="flex w-full md:w-auto gap-2">
              <input placeholder="Email của bạn..." className="bg-[#002147] border border-[#0047AB] text-white px-4 py-3 rounded-xl outline-none focus:border-[#00E5FF] w-full md:w-80 transition-colors"/>
              <button className="bg-[#00E5FF] text-[#002147] font-bold px-6 py-3 rounded-xl hover:bg-white transition-colors"><Mail size={20}/></button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-white">
                <div className="w-10 h-10 bg-[#0047AB] rounded-xl flex items-center justify-center font-black shadow-lg shadow-blue-900">BK</div>
                <div><h4 className="font-black text-xl">CHỢ BK</h4><p className="text-[10px] uppercase text-[#00E5FF] tracking-wider">Student Marketplace</p></div>
              </div>
              <p className="text-sm leading-relaxed">Dự án phi lợi nhuận hỗ trợ sinh viên ĐH Bách Khoa TP.HCM trao đổi học liệu và đồ dùng.</p>
            </div>
            <div>
              <h4 className="text-white font-bold uppercase text-sm mb-6 tracking-wider">Khám phá</h4>
              <ul className="space-y-3 text-sm">
                <li><Link to="/market" className="hover:text-[#00E5FF] transition-colors flex items-center gap-2"><ChevronRight size={14}/> Dạo chợ online</Link></li>
                <li><Link to="/post-item" className="hover:text-[#00E5FF] transition-colors flex items-center gap-2"><ChevronRight size={14}/> Đăng tin bán</Link></li>
                <li><Link to="/saved" className="hover:text-[#00E5FF] transition-colors flex items-center gap-2"><ChevronRight size={14}/> Tin đã lưu</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-bold uppercase text-sm mb-6 tracking-wider">Hỗ trợ</h4>
              <ul className="space-y-3 text-sm">
                <li><a href="#" className="hover:text-[#00E5FF] transition-colors">Trung tâm trợ giúp</a></li>
                <li><a href="#" className="hover:text-[#00E5FF] transition-colors">Quy định đăng tin</a></li>
                <li><a href="#" className="hover:text-[#00E5FF] transition-colors">An toàn giao dịch</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-bold uppercase text-sm mb-6 tracking-wider">Liên hệ</h4>
              <ul className="space-y-3 text-sm">
                <li className="flex items-center gap-3"><Smartphone size={16} className="text-[#00E5FF]"/> (028) 3864 7256</li>
                <li className="flex items-center gap-3"><MapPin size={16} className="text-[#00E5FF]"/> 268 Lý Thường Kiệt, Q.10</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-[#003366] pt-8 text-center text-xs font-bold uppercase tracking-widest text-slate-600">
            &copy; {new Date().getFullYear()} HCMUT Student Project. Built with ❤️ & ☕.
          </div>
        </div>
      </footer>

      {/* Back to Top Button */}
      {showBackToTop && (
        <button onClick={scrollToTop} className="fixed bottom-8 right-8 bg-[#0047AB] text-white p-3 rounded-full shadow-2xl hover:scale-110 transition-transform z-50 animate-bounce">
          <ArrowUp size={24}/>
        </button>
      )}
    </div>
  );
};

export default HomePage;
