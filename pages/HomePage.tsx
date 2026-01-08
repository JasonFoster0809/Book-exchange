import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Search, ArrowRight, Zap, Users, BookOpen, Calculator, Shirt,
  Monitor, Grid, Gift, Eye, ShoppingBag, PlusCircle, Heart,
  Package, Sparkles, Clock, Smile, Rocket, PlayCircle,
  Ghost, WifiOff, MoreHorizontal, TrendingUp,
  MapPin, Star, Cpu, Music
} from "lucide-react";
import { supabase } from "../services/supabase";
import { Product, ProductCategory, ProductCondition } from "../types";

// --- CONFIGURATION ---
const CATEGORIES = [
  { id: "all", label: "Tất cả", icon: <Grid size={18} /> },
  { id: ProductCategory.TEXTBOOK, label: "Sách", icon: <BookOpen size={18} /> },
  { id: ProductCategory.ELECTRONICS, label: "Tech", icon: <Monitor size={18} /> },
  { id: ProductCategory.SUPPLIES, label: "Dụng cụ", icon: <Calculator size={18} /> },
  { id: ProductCategory.CLOTHING, label: "Fashion", icon: <Shirt size={18} /> },
  { id: ProductCategory.OTHER, label: "Khác", icon: <MoreHorizontal size={18} /> },
];

enum SortOption {
  NEWEST = "newest",
  PRICE_ASC = "price_asc",
  PRICE_DESC = "price_desc",
  MOST_VIEWED = "most_viewed",
}

interface FilterState {
  category: string | "all";
  sort: SortOption;
  search: string;
}

// --- VISUAL ENGINE (CSS) ---
const VisualEngine = () => (
  <style>{`
    :root {
      --primary: #00418E;
      --secondary: #00B0F0;
      --accent: #7C3AED;
    }
    body { background-color: #0F172A; color: #F8FAFC; font-family: 'Inter', sans-serif; overflow-x: hidden; }
    
    /* Scrollbar */
    ::-webkit-scrollbar { width: 6px; }
    ::-webkit-scrollbar-track { background: #0F172A; }
    ::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; }
    ::-webkit-scrollbar-thumb:hover { background: var(--secondary); }

    /* Animations */
    @keyframes float { 
      0%, 100% { transform: translateY(0) rotate(0deg); } 
      50% { transform: translateY(-20px) rotate(5deg); } 
    }
    @keyframes pulse-glow {
      0%, 100% { box-shadow: 0 0 20px rgba(0, 176, 240, 0.2); }
      50% { box-shadow: 0 0 40px rgba(0, 176, 240, 0.6); }
    }
    @keyframes gradient-x {
      0% { background-position: 0% 50%; }
      50% { background-position: 100% 50%; }
      100% { background-position: 0% 50%; }
    }
    @keyframes fadeInUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }

    .animate-float { animation: float 8s ease-in-out infinite; }
    .animate-float-fast { animation: float 6s ease-in-out infinite; }
    .animate-enter { animation: fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; opacity: 0; }
    .animate-gradient { background-size: 200% auto; animation: gradient-x 4s linear infinite; }
    
    /* Holographic Card Effect */
    .holo-card {
      background: rgba(255, 255, 255, 0.05);
      backdrop-filter: blur(16px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      transition: all 0.4s ease;
    }
    .holo-card:hover {
      background: rgba(255, 255, 255, 0.1);
      border-color: rgba(0, 176, 240, 0.5);
      transform: translateY(-10px) scale(1.02);
      box-shadow: 0 20px 40px -10px rgba(0, 176, 240, 0.3);
    }
    .holo-card::before {
      content: "";
      position: absolute;
      top: 0; left: -100%; width: 50%; height: 100%;
      background: linear-gradient(to right, transparent, rgba(255,255,255,0.2), transparent);
      transform: skewX(-25deg);
      transition: 0.5s;
    }
    .holo-card:hover::before { left: 150%; }

    /* Skeleton */
    .skeleton-shimmer {
      background: linear-gradient(90deg, #1e293b 25%, #334155 50%, #1e293b 75%);
      background-size: 200% 100%;
      animation: gradient-x 1.5s infinite;
    }
  `}</style>
);

// --- MOUSE SPOTLIGHT COMPONENT ---
const MouseSpotlight = () => {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  useEffect(() => {
    const handleMove = (e: MouseEvent) => setPos({ x: e.clientX, y: e.clientY });
    window.addEventListener('mousemove', handleMove);
    return () => window.removeEventListener('mousemove', handleMove);
  }, []);
  return (
    <div 
      className="pointer-events-none fixed inset-0 z-0 transition-opacity duration-300"
      style={{
        background: `radial-gradient(600px at ${pos.x}px ${pos.y}px, rgba(0, 176, 240, 0.15), transparent 80%)`
      }}
    />
  );
};

// --- TYPEWRITER EFFECT COMPONENT ---
const TypewriterPlaceholder = ({ texts }: { texts: string[] }) => {
  const [index, setIndex] = useState(0);
  const [subIndex, setSubIndex] = useState(0);
  const [reverse, setReverse] = useState(false);
  const [blink, setBlink] = useState(true);

  useEffect(() => {
    if (subIndex === texts[index].length + 1 && !reverse) {
      setTimeout(() => setReverse(true), 1000);
      return;
    }
    if (subIndex === 0 && reverse) {
      setReverse(false);
      setIndex((prev) => (prev + 1) % texts.length);
      return;
    }
    const timeout = setTimeout(() => {
      setSubIndex((prev) => prev + (reverse ? -1 : 1));
    }, Math.max(reverse ? 75 : subIndex === texts[index].length ? 1000 : 150, Math.random() * 50));
    return () => clearTimeout(timeout);
  }, [subIndex, index, reverse, texts]);

  useEffect(() => {
    const timeout = setTimeout(() => setBlink(!blink), 500);
    return () => clearTimeout(timeout);
  }, [blink]);

  return (
    <span className="text-slate-400 pointer-events-none absolute left-12 top-1/2 -translate-y-1/2">
      {texts[index].substring(0, subIndex)}
      <span className={`${blink ? "opacity-100" : "opacity-0"} text-blue-400`}>|</span>
    </span>
  );
};

// --- UTILS ---
const Utils = {
  formatCurrency: (amount: number) => new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(amount),
  timeAgo: (date: string) => {
    if (!date) return "Vừa xong";
    const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
    if (seconds > 86400) return Math.floor(seconds / 86400) + " ngày trước";
    if (seconds > 3600) return Math.floor(seconds / 3600) + " giờ trước";
    if (seconds > 60) return Math.floor(seconds / 60) + " phút trước";
    return "Vừa xong";
  }
};

// --- PRODUCT CARD ---
const ProductCard: React.FC<{ product: Product }> = ({ product }) => {
  const navigate = useNavigate();
  const [loaded, setLoaded] = useState(false);
  const image = product.images && product.images.length > 0 ? product.images[0] : "https://placehold.co/400x300/1e293b/FFF?text=No+Image";

  return (
    <div onClick={() => navigate(`/product/${product.id}`)} className="holo-card group relative flex h-full cursor-pointer flex-col overflow-hidden rounded-[1.5rem] bg-[#1E293B]">
      {/* Image */}
      <div className="relative aspect-4/3 overflow-hidden bg-slate-900">
        {!loaded && <div className="skeleton-shimmer absolute inset-0" />}
        <img
          src={image}
          alt={product.title}
          className={`h-full w-full object-cover transition-all duration-700 group-hover:scale-110 ${loaded ? 'opacity-100' : 'opacity-0'}`}
          onLoad={() => setLoaded(true)}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0F172A] via-transparent to-transparent opacity-60"></div>
        
        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-2">
          {product.price === 0 && (
            <span className="flex items-center gap-1 rounded-full bg-gradient-to-r from-red-500 to-pink-500 px-3 py-1 text-[10px] font-bold text-white shadow-lg shadow-red-500/40 animate-pulse">
              <Gift size={10} /> GIFT
            </span>
          )}
          {product.condition === ProductCondition.NEW && (
            <span className="flex items-center gap-1 rounded-full bg-gradient-to-r from-emerald-400 to-teal-500 px-3 py-1 text-[10px] font-bold text-white shadow-lg shadow-emerald-500/40">
              <Sparkles size={10} /> NEW
            </span>
          )}
        </div>

        <button className="absolute bottom-3 right-3 translate-y-12 rounded-full bg-white p-3 text-slate-900 shadow-[0_0_20px_rgba(255,255,255,0.5)] transition-all duration-300 hover:scale-110 group-hover:translate-y-0">
          <ArrowRight size={18} />
        </button>
      </div>

      {/* Info */}
      <div className="flex flex-1 flex-col p-5 relative z-10">
        <div className="mb-3 flex items-center justify-between">
          <span className="rounded-lg border border-blue-500/30 bg-blue-500/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-blue-400 backdrop-blur-md">
            {product.category}
          </span>
          <span className="flex items-center gap-1 text-[10px] text-slate-400">
            <Clock size={10} /> {Utils.timeAgo(product.postedAt || product.created_at || '')}
          </span>
        </div>
        
        <h3 className="mb-2 line-clamp-2 text-sm font-bold text-slate-100 group-hover:text-blue-400 transition-colors">
          {product.title}
        </h3>
        
        <div className="mt-auto border-t border-slate-700/50 pt-3 flex items-center justify-between">
          <span className="text-lg font-black tracking-tight text-white group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-blue-400 group-hover:to-cyan-400 transition-all">
            {product.price === 0 ? "FREE" : Utils.formatCurrency(product.price)}
          </span>
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 bg-slate-800/50 px-2 py-1 rounded-lg">
            <Eye size={12} /> {product.view_count || 0}
          </div>
        </div>
      </div>
    </div>
  );
};

// --- MAIN HOMEPAGE ---
const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<FilterState>({ category: "all", sort: SortOption.NEWEST, search: "" });
  const { products, loading, error, refetch } = useProducts(filter);
  const [searchVal, setSearchVal] = useState("");

  return (
    <div className="relative min-h-screen selection:bg-blue-500 selection:text-white overflow-hidden">
      <VisualEngine />
      <MouseSpotlight />
      
      {/* Background Blobs */}
      <div className="fixed inset-0 pointer-events-none -z-10">
        <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-blue-600/20 rounded-full mix-blend-screen filter blur-[120px] animate-float"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-purple-600/20 rounded-full mix-blend-screen filter blur-[120px] animate-float-fast"></div>
      </div>

      {/* --- HERO SECTION --- */}
      <section className="relative px-4 pt-32 pb-24 text-center">
        {/* Floating 3D Icons */}
        <div className="absolute inset-0 pointer-events-none z-0 opacity-40">
          <div className="absolute top-20 left-[10%] animate-float text-blue-400 drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]"><BookOpen size={64} strokeWidth={1} /></div>
          <div className="absolute top-40 right-[15%] animate-float-fast text-cyan-400 drop-shadow-[0_0_15px_rgba(6,182,212,0.5)]"><Monitor size={80} strokeWidth={1} /></div>
          <div className="absolute bottom-20 left-[20%] animate-float text-purple-400 drop-shadow-[0_0_15px_rgba(168,85,247,0.5)]"><Cpu size={56} strokeWidth={1} /></div>
          <div className="absolute bottom-40 right-[10%] animate-float-fast text-pink-400 drop-shadow-[0_0_15px_rgba(236,72,153,0.5)]"><Music size={72} strokeWidth={1} /></div>
        </div>

        <div className="relative z-10 mx-auto max-w-5xl">
          <div className="animate-enter inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-900/30 backdrop-blur-md px-4 py-1.5 shadow-[0_0_20px_rgba(59,130,246,0.2)] mb-8">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            <span className="text-xs font-bold tracking-widest text-blue-200 uppercase">Cổng thông tin Sinh viên BK</span>
          </div>
          
          <h1 className="animate-enter delay-100 mb-6 text-5xl md:text-8xl font-black tracking-tighter text-white drop-shadow-2xl">
            SĂN ĐỒ CŨ <br />
            <span className="animate-gradient bg-gradient-to-r from-blue-400 via-cyan-400 to-purple-400 bg-clip-text text-transparent">
              CHUẨN SINH VIÊN
            </span>
          </h1>

          <p className="animate-enter delay-200 mx-auto mb-12 max-w-2xl text-lg font-medium text-slate-400 md:text-xl leading-relaxed">
            Trao đổi giáo trình, laptop, dụng cụ học tập giá rẻ ngay tại trường.
            <br className="hidden md:block"/> Cộng đồng mua bán phi lợi nhuận, an toàn tuyệt đối.
          </p>

          {/* DYNAMIC SEARCH BAR */}
          <div className="animate-enter delay-300 relative mx-auto w-full max-w-2xl mb-16 group z-20">
            <div className="absolute -inset-0.5 rounded-full bg-gradient-to-r from-blue-500 via-cyan-500 to-purple-500 opacity-75 blur transition duration-500 group-hover:opacity-100 group-hover:blur-md"></div>
            <form 
              onSubmit={(e) => { e.preventDefault(); if(searchVal) navigate(`/market?search=${encodeURIComponent(searchVal)}`); }}
              className="relative flex items-center rounded-full bg-[#0F172A] p-2"
            >
              <Search className="ml-4 text-blue-400" size={24} />
              <div className="relative flex-1 h-12">
                {!searchVal && <TypewriterPlaceholder texts={["Tìm giáo trình Giải Tích 1...", "Tìm máy tính Casio 580...", "Tìm đồ án cũ...", "Tìm laptop giá rẻ..."]} />}
                <input
                  value={searchVal}
                  onChange={(e) => setSearchVal(e.target.value)}
                  className="absolute inset-0 w-full h-full bg-transparent px-4 text-lg font-bold text-white placeholder-transparent outline-none border-none focus:ring-0"
                />
              </div>
              <button className="flex h-12 w-32 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-blue-600 to-cyan-600 px-6 text-sm font-bold text-white shadow-lg shadow-blue-500/40 transition-all hover:scale-105 active:scale-95">
                <Rocket size={18} /> Đi Thôi
              </button>
            </form>
          </div>

          {/* QUICK ACTIONS */}
          <div className="animate-enter delay-300 grid grid-cols-2 gap-4 px-4 md:grid-cols-4 max-w-4xl mx-auto">
            {[
              { title: "Dạo Chợ", desc: "Săn deal hời", icon: <ShoppingBag size={24} />, link: "/market", color: "text-cyan-400", bg: "bg-cyan-900/30", border: "border-cyan-500/30" },
              { title: "Đăng Tin", desc: "Bán 30s", icon: <PlusCircle size={24} />, link: "/post-item", color: "text-purple-400", bg: "bg-purple-900/30", border: "border-purple-500/30" },
              { title: "Đã Lưu", desc: "Yêu thích", icon: <Heart size={24} />, link: "/saved", color: "text-pink-400", bg: "bg-pink-900/30", border: "border-pink-500/30" },
              { title: "Quản Lý", desc: "Tin của tôi", icon: <Package size={24} />, link: "/my-items", color: "text-orange-400", bg: "bg-orange-900/30", border: "border-orange-500/30" },
            ].map((item, i) => (
              <Link to={item.link} key={i} className={`group relative flex cursor-pointer flex-col items-center justify-center gap-3 rounded-3xl border ${item.border} bg-[#1E293B]/50 p-6 text-center backdrop-blur-sm transition-all hover:-translate-y-2 hover:bg-[#1E293B]`}>
                <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${item.bg} ${item.color} shadow-lg shadow-black/20 transition-transform group-hover:scale-110 group-hover:rotate-6`}>
                  {item.icon}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-200 group-hover:text-white">{item.title}</h3>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mt-1">{item.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* --- STICKY CATEGORY NAV --- */}
      <div className="sticky top-0 z-40 border-y border-white/5 bg-[#0F172A]/80 py-4 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl overflow-x-auto px-4 hide-scrollbar">
          <div className="flex min-w-max justify-center gap-3">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setFilter({ ...filter, category: cat.id })}
                className={`group flex items-center gap-2 rounded-full border px-6 py-2.5 text-sm font-bold transition-all active:scale-95 ${
                  filter.category === cat.id
                    ? "border-cyan-500 bg-cyan-500/20 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)]"
                    : "border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-500 hover:text-white hover:bg-slate-700"
                }`}
              >
                <span className={`transition-transform group-hover:scale-110 ${filter.category === cat.id ? 'text-cyan-400' : 'text-slate-500 group-hover:text-white'}`}>{cat.icon}</span>
                <span>{cat.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* --- PRODUCTS SECTION --- */}
      <section className="mx-auto max-w-7xl px-4 py-16 min-h-[800px]">
        <div className="mb-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-center md:text-left">
            <h2 className="text-3xl font-black text-white flex items-center justify-center md:justify-start gap-3">
              <TrendingUp className="text-cyan-400 animate-pulse" />
              {filter.category === 'all' ? 'Mới Lên Sàn' : 'Kết Quả Lọc'}
            </h2>
            <p className="text-slate-400 font-medium mt-2">
              {loading ? "Đang tải dữ liệu..." : `Tìm thấy ${products.length} tin đăng phù hợp`}
            </p>
          </div>
          
          <div className="flex items-center gap-2 bg-[#1E293B] p-1.5 rounded-2xl border border-white/5">
            {[
              { id: SortOption.NEWEST, label: "Mới nhất" },
              { id: SortOption.PRICE_ASC, label: "Giá rẻ" },
              { id: SortOption.MOST_VIEWED, label: "Hot" }
            ].map(opt => (
              <button
                key={opt.id}
                onClick={() => setFilter({...filter, sort: opt.id})}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${filter.sort === opt.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {loading ? [...Array(8)].map((_, i) => (
            <div key={i} className="h-[360px] rounded-[1.5rem] bg-[#1E293B] p-4 border border-white/5">
              <div className="skeleton-shimmer h-[200px] w-full rounded-2xl mb-4" />
              <div className="skeleton-shimmer h-4 w-3/4 rounded mb-2" />
              <div className="skeleton-shimmer h-4 w-1/2 rounded" />
            </div>
          )) : error ? (
            <div className="col-span-full py-20 text-center rounded-[2rem] bg-[#1E293B]/50 border border-white/5">
              <WifiOff size={48} className="mx-auto text-red-400 mb-4" />
              <h3 className="text-xl font-bold text-white">Mất kết nối</h3>
              <button onClick={refetch} className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-500">Thử lại</button>
            </div>
          ) : products.length > 0 ? (
            products.map(p => (
              <div key={p.id} className="animate-enter">
                <ProductCard product={p} />
              </div>
            ))
          ) : (
            <div className="col-span-full py-24 text-center border-2 border-dashed border-slate-700 rounded-[3rem] bg-slate-900/50">
              <Ghost size={64} className="mx-auto text-slate-600 mb-6" />
              <h3 className="text-2xl font-black text-white">Chưa có tin nào</h3>
              <p className="text-slate-400 mb-8">Hãy là người đầu tiên đăng bán!</p>
              <Link to="/post-item" className="px-8 py-3 bg-blue-600 text-white rounded-2xl font-bold shadow-lg hover:shadow-blue-500/40 transition-all">Đăng tin ngay</Link>
            </div>
          )}
        </div>

        {products.length > 0 && !loading && (
          <div className="mt-20 text-center">
            <Link to="/market" className="group inline-flex items-center gap-3 rounded-full border border-blue-500/30 bg-blue-900/20 px-8 py-3 text-sm font-bold text-blue-400 transition-all hover:bg-blue-500 hover:text-white hover:border-transparent hover:shadow-[0_0_20px_rgba(59,130,246,0.4)]">
              Xem tất cả tin đăng <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        )}
      </section>

      {/* --- FOOTER --- */}
      <footer className="border-t border-slate-800 bg-[#0B1120] pt-16 pb-8">
        <div className="mx-auto max-w-7xl px-4 text-center">
          <div className="mb-8 flex justify-center">
            <div className="h-16 w-16 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-2xl flex items-center justify-center text-white text-2xl font-black shadow-lg shadow-blue-900/40">BK</div>
          </div>
          <p className="text-slate-500 font-medium mb-8">Dự án phi lợi nhuận hỗ trợ sinh viên ĐH Bách Khoa TP.HCM</p>
          <div className="flex justify-center gap-8 text-sm font-bold text-slate-400 mb-12">
            <Link to="/market" className="hover:text-white transition-colors">Dạo chợ</Link>
            <Link to="/post-item" className="hover:text-white transition-colors">Đăng tin</Link>
            <a href="#" className="hover:text-white transition-colors">Điều khoản</a>
            <a href="#" className="hover:text-white transition-colors">Liên hệ</a>
          </div>
          <p className="text-xs text-slate-600 font-bold uppercase tracking-widest">&copy; {new Date().getFullYear()} HCMUT Student Project.</p>
        </div>
      </footer>
    </div>
  );
};

// --- DATA FETCHING ---
function useProducts(filter: FilterState) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase.from("products").select("*").eq("status", "available");
      if (filter.category !== "all") query = query.eq("category", filter.category);
      if (filter.search) query = query.ilike("title", `%${filter.search}%`);
      
      if (filter.sort === SortOption.NEWEST) query = query.order("created_at", { ascending: false });
      else if (filter.sort === SortOption.PRICE_ASC) query = query.order("price", { ascending: true });
      else if (filter.sort === SortOption.PRICE_DESC) query = query.order("price", { ascending: false });
      else if (filter.sort === SortOption.MOST_VIEWED) query = query.order("view_count", { ascending: false });

      const { data, error: dbError } = await query.limit(24);
      if (dbError) throw dbError;

      const mapped = (data || []).map((p: any) => ({
        ...p,
        sellerId: p.seller_id,
        postedAt: p.created_at,
        tradeMethod: p.trade_method,
        location: p.location_name,
        images: p.images || []
      }));

      setProducts(mapped);
    } catch (err: any) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);
  return { products, loading, error, refetch: fetchProducts };
}

export default HomePage;
