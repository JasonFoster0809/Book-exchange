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
  ExternalLink, ThumbsUp, MessageCircle, Share2
} from "lucide-react";
import { supabase } from "../services/supabase";
import { Product } from "../types";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";

// ============================================================================
// 1. CONFIGURATION & CONSTANTS
// ============================================================================
const ITEMS_PER_PAGE = 12;

const TICKER_MESSAGES = [
  "🔥 Minh Tuấn (K21) vừa đăng bán sách Giải tích 1 - 50k",
  "💻 Lan Anh (K20) đang tìm mua Laptop Dell cũ giá < 5tr",
  "🛍️ Chợ BK vừa đạt mốc 10.000 giao dịch thành công!",
  "🎁 Sự kiện đổi sách cũ lấy cây xanh đang diễn ra tại H6",
  "📢 Cảnh báo: Hãy giao dịch trực tiếp để tránh lừa đảo",
  "⚡ Hệ thống AI đã được cập nhật - Đăng tin nhanh hơn 50%",
];

const BLOG_POSTS = [
  {
    id: 1,
    title: "Kinh nghiệm chọn Laptop cho sinh viên IT năm nhất",
    category: "Công nghệ",
    date: "12/01/2026",
    image: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&q=80&w=600",
    excerpt: "Nên chọn Mac hay Windows? RAM 8GB có đủ không? Cùng giải đáp thắc mắc cho tân sinh viên."
  },
  {
    id: 2,
    title: "Top 5 địa điểm học bài 'chill' nhất Bách Khoa",
    category: "Đời sống",
    date: "10/01/2026",
    image: "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&q=80&w=600",
    excerpt: "Thư viện hay quán cafe? Những góc khuất yên tĩnh bạn chưa biết tại cơ sở 1 và cơ sở 2."
  },
  {
    id: 3,
    title: "Bí kíp săn giáo trình cũ giá rẻ đầu kỳ",
    category: "Mẹo vặt",
    date: "08/01/2026",
    image: "https://images.unsplash.com/photo-1495446815901-a7297e633e8d?auto=format&fit=crop&q=80&w=600",
    excerpt: "Đừng vội mua sách mới. Hãy thử dạo qua Chợ BK để tiết kiệm hàng triệu đồng mỗi học kỳ."
  }
];

// ============================================================================
// 2. TYPES
// ============================================================================
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
// 3. UTILITY FUNCTIONS
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
    return Math.floor(diff / 86400) + " ngày trước";
  },
  cn: (...classes: (string | undefined | null | false)[]) => classes.filter(Boolean).join(" ")
};

// ============================================================================
// 4. VISUAL ENGINE (CSS)
// ============================================================================
const VisualEngine = () => (
  <style>{`
    :root {
      --cobalt-900: #002147; --cobalt-800: #003366; --cobalt-600: #0047AB;
      --cyan-400: #00E5FF; --light-bg: #F8FAFC;
    }
    
    body { background-color: var(--light-bg); color: var(--cobalt-900); font-family: 'Inter', sans-serif; overflow-x: hidden; }

    .grain-overlay {
      position: fixed; inset: 0; pointer-events: none; z-index: 50; opacity: 0.03;
      background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
    }

    .aurora-bg {
      position: fixed; top: 0; left: 0; right: 0; height: 100vh; z-index: -1;
      background: radial-gradient(at 0% 0%, rgba(0, 71, 171, 0.1) 0px, transparent 50%),
                  radial-gradient(at 100% 0%, rgba(0, 229, 255, 0.1) 0px, transparent 50%);
      filter: blur(80px); animation: aurora 15s ease-in-out infinite alternate;
    }
    @keyframes aurora { from { transform: scale(1); } to { transform: scale(1.1); } }

    .animate-float { animation: float 6s ease-in-out infinite; }
    @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-20px); } }

    .glass-card {
      background: rgba(255, 255, 255, 0.7); backdrop-filter: blur(16px);
      border: 1px solid rgba(255, 255, 255, 0.8); box-shadow: 0 4px 20px rgba(0, 71, 171, 0.05);
    }
    .hover-lift { transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1); }
    .hover-lift:hover { transform: translateY(-8px); box-shadow: 0 20px 40px -10px rgba(0, 71, 171, 0.1); border-color: #BFDBFE; }

    .shimmer { position: relative; overflow: hidden; }
    .shimmer::after {
      content: ''; position: absolute; inset: 0; transform: translateX(-100%);
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
      animation: sh 1.5s infinite;
    }
    @keyframes sh { to { transform: translateX(100%); } }

    .ticker-move { animation: ticker 40s linear infinite; }
    @keyframes ticker { from { transform: translateX(0); } to { transform: translateX(-50%); } }

    .animate-enter { animation: ent 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; opacity: 0; }
    @keyframes ent { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
  `}</style>
);

// ============================================================================
// 5. SUB-COMPONENTS
// ============================================================================

const LiveTicker = () => (
  <div className="bg-[#002147] text-white h-10 flex items-center overflow-hidden sticky top-0 z-[60] border-b border-white/10">
    <div className="bg-[#0047AB] h-full px-4 flex items-center z-20 font-black text-[10px] uppercase tracking-tighter whitespace-nowrap">
      <Activity size={14} className="mr-2 animate-pulse text-[#00E5FF]"/> Hoạt động thực
    </div>
    <div className="flex-1 overflow-hidden whitespace-nowrap relative">
      <div className="ticker-move inline-block">
        {[...TICKER_MESSAGES, ...TICKER_MESSAGES].map((msg, i) => (
          <span key={i} className="inline-block px-8 text-xs font-medium opacity-90">
            <span className="text-[#00E5FF] mr-2">✦</span> {msg}
          </span>
        ))}
      </div>
    </div>
  </div>
);

const HeroSlider = () => {
  const [cur, setCur] = useState(0);
  const slides = [
    { t: "Chợ Đồ Cũ Bách Khoa", s: "Thông Minh & Tiết Kiệm", c: "from-[#0047AB] to-[#00E5FF]" },
    { t: "Giáo Trình Giá Rẻ", s: "Tiếp Sức Mùa Thi", c: "from-orange-500 to-red-500" },
    { t: "Hỗ Trợ Công Nghệ", s: "Ưu Đãi Sinh Viên", c: "from-purple-600 to-indigo-500" }
  ];
  useEffect(() => { const i = setInterval(() => setCur(p => (p+1)%3), 5000); return () => clearInterval(i); }, []);
  return (
    <div className="relative z-10 mx-auto max-w-5xl mb-16 pt-10">
      <div className="grid grid-cols-1 relative min-h-[250px]">
        {slides.map((s, i) => (
          <div key={i} className={`col-start-1 row-start-1 transition-all duration-1000 flex flex-col items-center ${i === cur ? 'opacity-100' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
            <div className="bg-white/40 backdrop-blur-md px-4 py-1 rounded-full border border-white/60 text-[10px] font-bold uppercase tracking-widest text-[#002147] mb-6 flex items-center gap-2">
              <Sparkles size={12} className="text-yellow-500"/> HCMUT Student Marketplace
            </div>
            <h1 className="text-5xl md:text-7xl font-black text-[#002147] text-center leading-[1.1] mb-6">
              {s.t} <br/> <span className={`bg-gradient-to-r ${s.c} bg-clip-text text-transparent`}>{s.s}</span>
            </h1>
            <p className="text-slate-500 max-w-2xl text-center text-lg font-medium leading-relaxed">Nền tảng mua bán phi lợi nhuận dành riêng cho sinh viên Đại học Bách Khoa TP.HCM.</p>
          </div>
        ))}
      </div>
    </div>
  );
};

const ProductCard: React.FC<{ product: Product, onQuickView: (p: Product) => void }> = ({ product, onQuickView }) => {
  const navigate = useNavigate();
  const [liked, setLiked] = useState(false);
  return (
    <div onClick={() => navigate(`/product/${product.id}`)} className="glass-card hover-lift group flex flex-col rounded-3xl bg-white h-full cursor-pointer overflow-hidden border border-white/60 relative">
      <div className="shimmer relative aspect-[4/3] bg-slate-100 overflow-hidden">
        <img src={product.images?.[0] || 'https://via.placeholder.com/300'} alt={product.title} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" loading="lazy"/>
        <div className="absolute left-3 top-3 flex flex-col gap-1 z-10">
          {product.price === 0 && <span className="flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold shadow-lg backdrop-blur-md bg-red-500 text-white"><Gift size={10}/> FREE</span>}
          {(new Date().getTime() - new Date(product.created_at).getTime() < 172800000) && <span className="flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold shadow-lg backdrop-blur-md bg-[#0047AB] text-white"><Zap size={10}/> NEW</span>}
        </div>
        <div className="absolute top-3 right-3 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-4 group-hover:translate-x-0 z-20">
          <button onClick={(e) => { e.stopPropagation(); setLiked(!liked); }} className="p-2 bg-white/90 backdrop-blur rounded-full text-slate-400 hover:text-red-500 shadow-xl transition-colors"><Heart size={18} className={liked ? "fill-red-500 text-red-500" : ""}/></button>
          <button onClick={(e) => { e.stopPropagation(); onQuickView(product); }} className="p-2 bg-white/90 backdrop-blur rounded-full text-slate-400 hover:text-[#0047AB] shadow-xl transition-colors"><Eye size={18}/></button>
        </div>
      </div>
      <div className="p-5 flex flex-col flex-1">
        <div className="flex justify-between items-start mb-3">
          <span className="text-[10px] font-black text-[#0047AB] bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100 uppercase tracking-tighter">{product.category}</span>
          <span className="text-[10px] text-slate-400 font-bold flex items-center gap-1"><Clock size={10}/> {Utils.timeAgo(product.created_at)}</span>
        </div>
        <h3 className="font-bold text-slate-800 line-clamp-2 text-sm mb-auto group-hover:text-[#0047AB] transition-colors leading-relaxed">{product.title}</h3>
        <div className="mt-4 pt-4 border-t border-slate-50 flex justify-between items-center">
          <span className="text-lg font-black text-[#002147] tracking-tight">{product.price === 0 ? "Tặng free" : Utils.formatCurrency(product.price)}</span>
          {product.location_name && <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400"><MapPin size={10}/> {product.location_name}</div>}
        </div>
      </div>
    </div>
  );
};

const FilterModal = ({ filter, setFilter, onClose }: { filter: FilterState, setFilter: any, onClose: () => void }) => (
  <div className="modal-backdrop z-[100]" onClick={onClose}>
    <div className="modal-content bg-white rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl m-4 relative overflow-hidden" onClick={e => e.stopPropagation()}>
      <div className="absolute top-0 right-0 p-8 opacity-5"><Filter size={120}/></div>
      <div className="flex justify-between items-center mb-8 relative z-10">
        <h3 className="text-2xl font-black text-[#002147] flex items-center gap-2"><SlidersHorizontal size={24} className="text-[#0047AB]"/> Bộ lọc</h3>
        <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={24} className="text-slate-400"/></button>
      </div>
      <div className="space-y-8 relative z-10">
        <div>
          <label className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4 block">Khoảng giá phù hợp</label>
          <div className="flex gap-4 items-center">
            <div className="flex-1 relative">
              <input type="number" placeholder="Từ" className="w-full pl-4 pr-10 py-3 bg-slate-50 rounded-2xl border border-slate-200 outline-none focus:border-[#0047AB] font-bold text-sm" value={filter.minPrice} onChange={e => setFilter({ ...filter, minPrice: e.target.value })}/>
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-300">VNĐ</span>
            </div>
            <div className="w-4 h-[2px] bg-slate-200"></div>
            <div className="flex-1 relative">
              <input type="number" placeholder="Đến" className="w-full pl-4 pr-10 py-3 bg-slate-50 rounded-2xl border border-slate-200 outline-none focus:border-[#0047AB] font-bold text-sm" value={filter.maxPrice} onChange={e => setFilter({ ...filter, maxPrice: e.target.value })}/>
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-300">VNĐ</span>
            </div>
          </div>
        </div>
        <div>
          <label className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4 block">Độ mới sản phẩm</label>
          <div className="grid grid-cols-3 gap-2">
            {[{ id: 'all', l: 'Tất cả' }, { id: 'new', l: 'Mới 100%' }, { id: 'used', l: 'Đã dùng' }].map(opt => (
              <button key={opt.id} onClick={() => setFilter({ ...filter, condition: opt.id })} className={`py-3 rounded-2xl text-xs font-black border transition-all ${filter.condition === opt.id ? 'bg-[#0047AB] border-[#0047AB] text-white shadow-lg shadow-blue-200' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>{opt.l}</button>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-10 pt-6 border-t border-slate-100 flex gap-4 relative z-10">
        <button onClick={() => setFilter({ ...filter, minPrice: "", maxPrice: "", condition: "all" })} className="flex-1 py-4 text-slate-400 font-black uppercase tracking-widest text-[10px] hover:text-[#0047AB] transition-colors">Đặt lại</button>
        <button onClick={onClose} className="flex-[2] py-4 bg-[#002147] text-white font-black uppercase tracking-widest text-[10px] rounded-2xl shadow-xl hover:bg-[#0047AB] transition-all active:scale-95">Áp dụng lọc</button>
      </div>
    </div>
  </div>
);

// ============================================================================
// 6. MAIN PAGE
// ============================================================================
const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [filter, setFilter] = useState<FilterState>({ category: "all", sort: SortOption.NEWEST, search: "", minPrice: "", maxPrice: "", condition: "all" });
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const countU = useCounter(25000);
  const countP = useCounter(8500);

  const { products, loading, hasMore, loadMore, totalCount } = useProducts(filter);

  useEffect(() => { const t = setTimeout(() => setFilter(p => ({...p, search: searchTerm})), 500); return () => clearTimeout(t); }, [searchTerm]);
  useEffect(() => { const h = () => setShowBackToTop(window.scrollY > 500); window.addEventListener('scroll', h); return () => window.removeEventListener('scroll', h); }, []);

  return (
    <div className="relative min-h-screen selection:bg-[#0047AB] selection:text-white pb-20">
      <VisualEngine />
      <div className="grain-overlay"></div>
      <div className="aurora-bg"></div>
      
      <LiveTicker />

      {showFilterModal && <FilterModal filter={filter} setFilter={setFilter} onClose={() => setShowFilterModal(false)} />}
      
      {/* Quick View Modal */}
      {selectedProduct && (
        <div className="modal-backdrop z-[110]" onClick={() => setSelectedProduct(null)}>
          <div className="modal-content bg-white rounded-[3rem] p-8 w-full max-w-4xl shadow-2xl m-4 flex flex-col md:flex-row gap-10 relative overflow-hidden" onClick={e => e.stopPropagation()}>
            <button onClick={() => setSelectedProduct(null)} className="absolute top-6 right-6 p-2 bg-slate-100 rounded-full hover:bg-slate-200 transition-colors z-10"><X size={24}/></button>
            <div className="w-full md:w-1/2 bg-slate-50 rounded-[2rem] overflow-hidden flex items-center justify-center border border-slate-100"><img src={selectedProduct.images?.[0]} className="max-h-[400px] object-contain hover:scale-110 transition-transform duration-700"/></div>
            <div className="w-full md:w-1/2 flex flex-col">
              <div className="flex justify-between items-start mb-4"><span className="bg-blue-100 text-[#0047AB] text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest">{selectedProduct.category}</span><span className="text-slate-400 text-xs font-bold flex items-center gap-1"><Clock size={14}/> {Utils.timeAgo(selectedProduct.created_at)}</span></div>
              <h2 className="text-3xl font-black text-[#002147] mb-4 leading-tight">{selectedProduct.title}</h2>
              <p className="text-4xl font-black text-[#0047AB] mb-8">{selectedProduct.price === 0 ? "MIỄN PHÍ" : Utils.formatCurrency(selectedProduct.price)}</p>
              <div className="space-y-4 bg-slate-50 p-6 rounded-3xl border border-slate-100 mb-8 flex-1">
                <div className="flex items-center justify-between"><span className="text-sm font-bold text-slate-400 uppercase tracking-tighter">Tình trạng</span><span className="font-black text-[#002147] flex items-center gap-2"><Star size={16} className="fill-yellow-400 text-yellow-400"/> {selectedProduct.condition === 'new' ? 'Mới 100%' : 'Đã qua sử dụng'}</span></div>
                <div className="h-[1px] bg-slate-200 w-full"></div>
                <div className="flex items-center justify-between"><span className="text-sm font-bold text-slate-400 uppercase tracking-tighter">Địa điểm</span><span className="font-black text-[#002147] flex items-center gap-2"><MapPin size={16} className="text-red-500"/> {selectedProduct.location_name || 'ĐH Bách Khoa'}</span></div>
              </div>
              <button onClick={() => navigate(`/product/${selectedProduct.id}`)} className="w-full py-5 bg-[#002147] text-white font-black uppercase tracking-widest text-xs rounded-2xl shadow-2xl shadow-blue-900/20 hover:bg-[#0047AB] transition-all flex items-center justify-center gap-3">Xem chi tiết bài đăng <ArrowRight size={18}/></button>
            </div>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <section className="relative px-4 pb-24 text-center overflow-hidden">
        <div className="absolute inset-0 pointer-events-none opacity-20 overflow-hidden">
           <BookOpen size={100} className="animate-float absolute left-[5%] top-[10%] text-[#0047AB]"/>
           <Monitor size={120} className="animate-float delay-100 absolute right-[10%] top-[20%] text-[#00E5FF]"/>
           <Smartphone size={80} className="animate-float delay-200 absolute left-[15%] bottom-[20%] text-indigo-400"/>
           <Rocket size={150} className="animate-float delay-300 absolute right-[5%] bottom-[10%] text-purple-400 opacity-50"/>
        </div>
        <HeroSlider />
        <div className="max-w-2xl mx-auto relative z-20 mb-16 animate-enter" style={{animationDelay: "400ms"}}>
          <div className="absolute -inset-2 bg-gradient-to-r from-[#0047AB] to-[#00E5FF] rounded-full opacity-20 blur-2xl animate-pulse"></div>
          <div className="relative bg-white/90 p-2.5 rounded-full shadow-2xl flex items-center backdrop-blur-xl border border-white/50">
            <Search className="ml-5 text-slate-300" size={24}/>
            <input className="flex-1 bg-transparent border-none outline-none px-5 py-4 text-slate-900 placeholder:text-slate-400 font-bold text-lg" placeholder="Bạn đang tìm giáo trình, laptop...?" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}/>
            <div className="h-10 w-[1px] bg-slate-200 mx-2"></div>
            <button onClick={() => setShowFilterModal(true)} className="p-4 text-slate-400 hover:text-[#0047AB] hover:bg-blue-50 rounded-full transition-all relative group"><SlidersHorizontal size={24}/><span className="absolute -top-10 left-1/2 -translate-x-1/2 bg-[#002147] text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">Lọc nâng cao</span></button>
            <button onClick={() => navigate(`/market?search=${searchTerm}`)} className="bg-[#002147] text-white px-10 py-4 rounded-full font-black uppercase tracking-tighter text-sm hover:bg-[#0047AB] transition-all ml-2 shadow-xl active:scale-95">Tìm kiếm</button>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-5xl mx-auto px-4 animate-enter" style={{animationDelay: "600ms"}}>
           {[{ l: "Dạo Chợ", i: <ShoppingBag size={28}/>, path: "/market", c: "text-cyan-600 bg-cyan-50" }, { l: "Đăng Tin", i: <PlusCircle size={28}/>, path: "/post-item", c: "text-indigo-600 bg-indigo-50" }, { l: "Đã Lưu", i: <Heart size={28}/>, path: "/saved", c: "text-pink-600 bg-pink-50" }, { l: "Quản Lý", i: <Package size={28}/>, path: "/my-items", c: "text-orange-600 bg-orange-50" }].map((item, idx) => (
             <Link to={item.path} key={idx} className="glass-card hover-lift p-8 rounded-[2.5rem] flex flex-col items-center gap-4 group">
               <div className={`p-5 rounded-2xl ${item.c} group-hover:scale-110 transition-transform shadow-inner`}>{item.i}</div>
               <span className="font-black text-[#002147] text-xs uppercase tracking-widest">{item.l}</span>
             </Link>
           ))}
        </div>
      </section>

      {/* Animated Stats */}
      <section className="mb-24 border-y border-white/20 bg-white/60 py-20 backdrop-blur-md relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] opacity-25"></div>
        <div className="mx-auto max-w-7xl px-4 grid grid-cols-2 md:grid-cols-4 gap-12 text-center relative z-10">
          {[
            { v: countU + "+", l: "Thành viên", i: <Users size={32}/>, color: "text-blue-600" },
            { v: countP + "+", l: "Sản phẩm", i: <Package size={32}/>, color: "text-purple-600" },
            { v: "15K+", l: "Giao dịch", i: <ShoppingBag size={32}/>, color: "text-green-600" },
            { v: "99%", l: "Hài lòng", i: <Smile size={32}/>, color: "text-orange-600" },
          ].map((s, i) => (
            <div key={i} className="group flex flex-col items-center">
              <div className={`mb-4 ${s.color} transform group-hover:scale-125 transition-transform duration-500`}>{s.i}</div>
              <p className="text-5xl font-black text-[#002147] mb-2 tabular-nums tracking-tighter">{s.v}</p>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{s.l}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Top Sellers */}
      <TopSellers />

      {/* Main Feed */}
      <section className="max-w-7xl mx-auto px-4 mb-32 min-h-[800px]">
        <div className="sticky top-10 z-40 bg-white/95 backdrop-blur-2xl border-y border-white/20 py-5 mb-12 -mx-4 px-6 shadow-xl rounded-full flex items-center justify-between overflow-x-auto hide-scrollbar border border-slate-100">
          <div className="flex gap-3">
            {[
              { id: "all", l: "Tất cả", i: <Grid size={18}/> },
              { id: ProductCategory.TEXTBOOK, l: "Giáo trình", i: <BookOpen size={18}/> },
              { id: ProductCategory.ELECTRONICS, l: "Điện tử", i: <Monitor size={18}/> },
              { id: ProductCategory.CLOTHING, l: "Đồng phục", i: <Shirt size={18}/> }
            ].map(cat => (
              <button key={cat.id} onClick={() => setFilter({ ...filter, category: cat.id })} className={Utils.cn("flex items-center gap-2 px-6 py-3 rounded-full text-xs font-black uppercase tracking-widest border transition-all active:scale-95", filter.category === cat.id ? 'bg-[#002147] text-white border-[#002147] shadow-xl' : 'bg-white text-slate-500 border-slate-200 hover:border-[#0047AB]')}>{cat.i} {cat.l}</button>
            ))}
          </div>
          <div className="ml-6 border-l border-slate-100 pl-6 flex items-center gap-4">
             <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest hidden lg:block">Sắp xếp theo</span>
             <select className="bg-slate-50 px-4 py-2 rounded-xl text-xs font-black text-[#002147] outline-none cursor-pointer border border-slate-100" value={filter.sort} onChange={e => setFilter({ ...filter, sort: e.target.value as SortOption })}>
               <option value={SortOption.NEWEST}> ✨ Mới nhất </option>
               <option value={SortOption.PRICE_ASC}> 💰 Giá rẻ </option>
               <option value={SortOption.MOST_VIEWED}> 🔥 Hot nhất </option>
             </select>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
          {loading && products.length === 0 ? (
            [...Array(12)].map((_, i) => (
              <div key={i} className="h-[380px] rounded-[2.5rem] bg-white/50 border border-white p-6 space-y-6 shadow-sm"><div className="h-[200px] bg-slate-200 rounded-[2rem] animate-pulse"/><div className="h-4 w-3/4 bg-slate-200 rounded animate-pulse"/><div className="h-4 w-1/2 bg-slate-200 rounded animate-pulse"/></div>
            ))
          ) : products.length > 0 ? (
            products.map(p => <div key={p.id} className="animate-enter"><ProductCard product={p} onQuickView={setSelectedProduct}/></div>)
          ) : (
            <div className="col-span-full py-32 text-center glass-card rounded-[3rem] border-2 border-dashed border-slate-200">
              <Ghost size={80} className="mx-auto text-slate-200 mb-8 animate-float"/>
              <h3 className="text-3xl font-black text-slate-700 mb-4">Ối! Trống trơn rồi...</h3>
              <p className="text-slate-400 mb-10 max-w-md mx-auto font-medium">Chúng tôi không tìm thấy kết quả nào khớp với yêu cầu của bạn. Thử đổi từ khóa khác nhé!</p>
              <button onClick={() => {setFilter({category: 'all', sort: SortOption.NEWEST, search: '', minPrice: "", maxPrice: "", condition: "all"}); setSearchTerm("")}} className="px-10 py-4 bg-[#002147] text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-[#0047AB] transition-all shadow-2xl active:scale-95">Xóa hết bộ lọc</button>
            </div>
          )}
        </div>

        {hasMore && products.length > 0 && (
          <div className="mt-24 text-center">
            <button onClick={loadMore} disabled={loading} className="group relative px-12 py-5 bg-[#002147] text-white rounded-[2rem] font-black uppercase tracking-[0.2em] text-[10px] overflow-hidden shadow-2xl transition-all hover:scale-105 active:scale-95 disabled:opacity-50">
              <span className="relative z-10 flex items-center gap-3">{loading ? <Activity className="animate-spin" size={16}/> : "Tải thêm bài đăng"} <ChevronDown size={16}/></span>
              <div className="absolute inset-0 bg-[#0047AB] transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></div>
            </button>
          </div>
        )}
      </section>

      {/* Extra: Features / AI Promo */}
      <section className="max-w-7xl mx-auto px-4 mb-32">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
           <div className="relative overflow-hidden rounded-[3.5rem] bg-gradient-to-br from-[#002147] to-[#0047AB] p-16 text-white shadow-2xl group border border-white/10">
              <div className="absolute -top-20 -right-20 w-80 h-80 bg-[#00E5FF] rounded-full blur-[100px] opacity-20 group-hover:opacity-40 transition-opacity"></div>
              <div className="relative z-10">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/20 bg-white/5 text-[#00E5FF] text-[10px] font-black uppercase tracking-[0.2em] mb-8 animate-pulse"><Zap size={14}/> New AI Engine V2</div>
                <h2 className="text-5xl font-black mb-6 leading-tight">Chụp Ảnh <br/> Bán Hàng Ngay</h2>
                <p className="text-slate-300 mb-10 text-lg leading-relaxed font-medium">Hệ thống AI tiên tiến tự động nhận diện sản phẩm, phân tích tình trạng và gợi ý mức giá trung bình trên thị trường Bách Khoa.</p>
                <button onClick={() => navigate('/post-item')} className="px-10 py-5 bg-[#00E5FF] text-[#002147] rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-white transition-all shadow-xl shadow-cyan-400/20 active:scale-95 flex items-center gap-3">Thử nghiệm ngay <Rocket size={18}/></button>
              </div>
           </div>
           <div className="glass-card rounded-[3.5rem] p-16 border border-white/80">
              <h2 className="text-3xl font-black text-[#002147] mb-10 flex items-center gap-3"><HelpCircle className="text-[#0047AB]"/> Hỗ trợ tân sinh viên</h2>
              <div className="space-y-6">
                {[{ q: "Giao dịch ở đâu an toàn nhất?", a: "Cơ sở 1 nên ở sảnh H6, cơ sở 2 ở B4 hoặc thư viện." }, { q: "Làm sao biết người bán uy tín?", a: "Xem đánh giá sao và huy hiệu 'Sinh viên thực' trên hồ sơ." }, { q: "Giá sách cũ bao nhiêu là hợp lý?", a: "Thường từ 40% - 60% giá bìa tùy độ mới." }].map((f, i) => (
                  <div key={i} className="bg-slate-50/50 p-6 rounded-[2rem] border border-slate-100 hover:border-blue-200 transition-colors cursor-default">
                    <h4 className="font-black text-[#0047AB] mb-2 text-sm uppercase tracking-tight">Q: {f.q}</h4>
                    <p className="text-slate-500 text-sm font-medium leading-relaxed">A: {f.a}</p>
                  </div>
                ))}
              </div>
           </div>
        </div>
      </section>

      {/* News / Blog */}
      <BlogSection />

      {/* FAQ & Testimonials */}
      <TestimonialsSection />
      <FAQSection />

      {/* Newsletter */}
      <section className="max-w-7xl mx-auto px-4 mb-32">
        <div className="bg-gradient-to-r from-[#003366] to-[#002147] p-16 rounded-[4rem] flex flex-col md:flex-row items-center justify-between gap-16 border border-white/10 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-20 opacity-5"><Mail size={300}/></div>
          <div className="flex-1 relative z-10 text-center md:text-left">
            <h3 className="text-5xl font-black text-white mb-4 tracking-tighter">Đừng bỏ lỡ deal hời!</h3>
            <p className="text-slate-400 text-xl font-medium">Chúng tôi sẽ gửi danh sách giáo trình rẻ nhất vào mỗi sáng thứ 2.</p>
          </div>
          <div className="flex w-full md:w-auto gap-4 relative z-10">
            <div className="flex-1 md:w-96 relative">
              <Mail className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500"/>
              <input placeholder="Email sinh viên của bạn..." className="w-full bg-[#001529] border border-[#0047AB]/50 text-white pl-14 pr-6 py-5 rounded-3xl outline-none focus:border-[#00E5FF] transition-all shadow-inner font-bold"/>
            </div>
            <button className="bg-[#00E5FF] text-[#002147] font-black px-10 py-5 rounded-3xl hover:bg-white transition-all shadow-xl shadow-cyan-400/20 active:scale-95 uppercase text-xs tracking-widest">Đăng ký</button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#002147] pt-32 pb-16 text-slate-500 border-t border-white/5 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-20 mb-24">
            <div className="space-y-8">
              <div className="flex items-center gap-4 text-white">
                <div className="w-14 h-14 bg-gradient-to-br from-[#0047AB] to-[#00E5FF] rounded-[1.2rem] flex items-center justify-center font-black shadow-2xl text-2xl">BK</div>
                <div><h4 className="font-black text-3xl tracking-tighter">CHỢ BK</h4><p className="text-[10px] uppercase text-[#00E5FF] tracking-[0.4em] font-black">Marketplace</p></div>
              </div>
              <p className="text-sm leading-relaxed font-medium">Nền tảng thương mại điện tử chuyên biệt cho cộng đồng sinh viên Đại học Bách Khoa TP.HCM. Sứ mệnh của chúng tôi là kết nối và hỗ trợ đời sống sinh viên thông qua việc trao đổi giáo trình và đồ dùng học tập.</p>
              <div className="flex gap-5">
                {[Share2, MessageCircle, ThumbsUp].map((Icon, i) => (
                  <div key={i} className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center hover:bg-[#0047AB] hover:text-white transition-all cursor-pointer border border-white/5 shadow-lg"><Icon size={20}/></div>
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-white font-black uppercase text-xs mb-10 tracking-[0.3em] border-l-4 border-[#00E5FF] pl-4">Menu Chính</h4>
              <ul className="space-y-5 text-sm font-bold">
                <li><Link to="/market" className="hover:text-[#00E5FF] transition-colors flex items-center gap-3 group"><ChevronRight size={14} className="group-hover:translate-x-2 transition-transform"/> Dạo chợ online</Link></li>
                <li><Link to="/post-item" className="hover:text-[#00E5FF] transition-colors flex items-center gap-3 group"><ChevronRight size={14} className="group-hover:translate-x-2 transition-transform"/> Đăng tin rao bán</Link></li>
                <li><Link to="/saved" className="hover:text-[#00E5FF] transition-colors flex items-center gap-3 group"><ChevronRight size={14} className="group-hover:translate-x-2 transition-transform"/> Danh sách yêu thích</Link></li>
                <li><Link to="/chat" className="hover:text-[#00E5FF] transition-colors flex items-center gap-3 group"><ChevronRight size={14} className="group-hover:translate-x-2 transition-transform"/> Trung tâm tin nhắn</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-black uppercase text-xs mb-10 tracking-[0.3em] border-l-4 border-[#00E5FF] pl-4">Pháp Lý</h4>
              <ul className="space-y-5 text-sm font-bold">
                <li><a href="#" className="hover:text-[#00E5FF] transition-colors">Quy định chung</a></li>
                <li><a href="#" className="hover:text-[#00E5FF] transition-colors">Chính sách bảo mật</a></li>
                <li><a href="#" className="hover:text-[#00E5FF] transition-colors">Tranh chấp & Khiếu nại</a></li>
                <li><a href="#" className="hover:text-[#00E5FF] transition-colors">An toàn giao dịch</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-black uppercase text-xs mb-10 tracking-[0.3em] border-l-4 border-[#00E5FF] pl-4">Liên Hệ</h4>
              <ul className="space-y-6 text-sm font-bold">
                <li className="flex items-center gap-4 group cursor-pointer"><div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center group-hover:text-[#00E5FF] transition-colors"><Smartphone size={20}/></div> (028) 3864 7256</li>
                <li className="flex items-start gap-4 group cursor-pointer"><div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center group-hover:text-[#00E5FF] transition-colors mt-1"><MapPin size={20}/></div> 268 Lý Thường Kiệt, Quận 10, TP.HCM</li>
                <li className="flex items-center gap-4 group cursor-pointer"><div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center group-hover:text-[#00E5FF] transition-colors"><Mail size={20}/></div> support@bkmart.vn</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-white/5 pt-12 text-center flex flex-col md:flex-row justify-between items-center gap-6">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-600">© 2026 HCMUT Student Project. All Rights Reserved.</p>
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-600">
              Handcrafted with <Heart size={12} className="text-red-500 fill-red-500 mx-1"/> for the BK Community
            </div>
          </div>
        </div>
      </footer>

      {showBackToTop && (
        <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="fixed bottom-10 right-10 bg-gradient-to-tr from-[#002147] to-[#0047AB] text-white p-5 rounded-[1.5rem] shadow-2xl hover:scale-110 active:scale-95 transition-all z-[100] border border-white/10 group animate-enter">
          <ArrowUp size={28} className="group-hover:-translate-y-1 transition-transform"/>
        </button>
      )}
    </div>
  );
};

export default HomePage;
