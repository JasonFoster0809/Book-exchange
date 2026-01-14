import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Search, ArrowRight, Zap, Users, BookOpen, Calculator, Shirt,
  Monitor, Grid, Gift, Eye, ShoppingBag, PlusCircle,
  Heart, Package, ChevronRight, Sparkles, Clock, Smile, Rocket,
  PlayCircle, Ghost, WifiOff, MoreHorizontal, Smartphone, MapPin, TrendingUp, Filter
} from "lucide-react";
import { supabase } from "../services/supabase";
import { Product } from "../types";

// ============================================================================
// 1. TYPES & CONFIG
// ============================================================================
type ID = string | number;

enum ProductCategory {
  TEXTBOOK = "textbook",
  ELECTRONICS = "electronics",
  SUPPLIES = "supplies",
  CLOTHING = "clothing",
  OTHER = "other",
}

enum SortOption {
  NEWEST = "newest",
  OLDEST = "oldest",
  PRICE_ASC = "price_asc",
  PRICE_DESC = "price_desc",
  MOST_VIEWED = "most_viewed",
}

interface FilterState {
  category: string;
  sort: SortOption;
  search: string;
}

// ============================================================================
// 2. UTILS
// ============================================================================
const Utils = {
  formatCurrency: (amount: number): string => {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount);
  },
  timeAgo: (dateString: string): string => {
    if (!dateString) return "Vừa xong";
    const seconds = Math.floor((new Date().getTime() - new Date(dateString).getTime()) / 1000);
    if (seconds > 86400) return Math.floor(seconds / 86400) + " ngày trước";
    if (seconds > 3600) return Math.floor(seconds / 3600) + " giờ trước";
    if (seconds > 60) return Math.floor(seconds / 60) + " phút trước";
    return "Vừa xong";
  },
  cn: (...classes: (string | undefined | null | false)[]): string => classes.filter(Boolean).join(" "),
};

// ============================================================================
// 3. VISUAL ENGINE (CSS Styles Pro Max)
// ============================================================================
const GlobalStyles = () => (
  <style>{`
    :root {
      --cobalt-900: #002147;
      --cobalt-600: #0047AB;
      --cyan-400: #00E5FF;
      --light-bg: #F8FAFC;
    }
    
    body {
      background-color: var(--light-bg);
      color: var(--cobalt-900);
      font-family: 'Inter', sans-serif;
      overflow-x: hidden;
    }

    /* --- Aurora Background --- */
    .aurora-bg {
      position: absolute; top: 0; left: 0; right: 0; height: 120vh;
      background: 
        radial-gradient(at 0% 0%, rgba(0, 71, 171, 0.15) 0px, transparent 50%),
        radial-gradient(at 100% 0%, rgba(0, 229, 255, 0.1) 0px, transparent 50%),
        radial-gradient(at 50% 100%, rgba(240, 248, 255, 0.5) 0px, transparent 50%);
      filter: blur(80px);
      z-index: -1;
      animation: aurora 10s ease-in-out infinite alternate;
    }
    @keyframes aurora {
      0% { transform: scale(1); opacity: 0.8; }
      100% { transform: scale(1.1); opacity: 1; }
    }

    /* --- Floating Icons Animation --- */
    @keyframes float {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-20px); }
    }
    .animate-float { animation: float 6s ease-in-out infinite; }
    .delay-1000 { animation-delay: 1s; }
    .delay-2000 { animation-delay: 2s; }

    /* --- Glass Components --- */
    .glass-card {
      background: rgba(255, 255, 255, 0.65);
      backdrop-filter: blur(16px);
      border: 1px solid rgba(255, 255, 255, 0.8);
      box-shadow: 0 4px 20px -5px rgba(0, 71, 171, 0.05);
    }
    
    .hero-glass {
      background: rgba(255, 255, 255, 0.7);
      backdrop-filter: blur(20px);
      border: 1px solid rgba(255, 255, 255, 0.5);
      box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.1);
    }

    /* --- Hover Effects --- */
    .hover-lift { transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1); }
    .hover-lift:hover { 
      transform: translateY(-8px); 
      box-shadow: 0 15px 30px -10px rgba(0, 71, 171, 0.15); 
      border-color: #BFDBFE; 
    }

    /* --- Loading Shimmer --- */
    .shimmer { position: relative; overflow: hidden; }
    .shimmer::after {
      content: ''; position: absolute; top: 0; left: 0; width: 100%; height: 100%;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent);
      transform: translateX(-100%);
    }
    .shimmer:hover::after { transform: translateX(100%); transition: transform 0.6s ease-in-out; }
    
    /* --- Scrollbar --- */
    .hide-scrollbar::-webkit-scrollbar { display: none; }
    .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

    /* --- Animations --- */
    .animate-enter { animation: fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; opacity: 0; }
    @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
  `}</style>
);

// ============================================================================
// 4. DATA HOOK
// ============================================================================
function useProducts(filter: FilterState) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase.from("products").select("*").eq("status", "available");

      // Filter
      if (filter.category !== "all") query = query.eq("category", filter.category);
      if (filter.search) query = query.ilike("title", `%${filter.search}%`);

      // Sort
      if (filter.sort === SortOption.NEWEST) query = query.order("created_at", { ascending: false });
      else if (filter.sort === SortOption.PRICE_ASC) query = query.order("price", { ascending: true });
      else if (filter.sort === SortOption.PRICE_DESC) query = query.order("price", { ascending: false });
      else if (filter.sort === SortOption.MOST_VIEWED) query = query.order("view_count", { ascending: false });

      const { data, error: dbError } = await query.limit(20);
      if (dbError) throw dbError;

      setProducts(data || []);
    } catch (err: any) {
      console.error("Fetch Error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);
  return { products, loading, error, refetch: fetchProducts };
}

// ============================================================================
// 5. SUB-COMPONENTS
// ============================================================================

const ProductCard: React.FC<{ product: Product }> = ({ product }) => {
  const navigate = useNavigate();
  const [imageLoaded, setImageLoaded] = useState(false);
  const displayImage = product.images && product.images.length > 0 ? product.images[0] : "https://via.placeholder.com/400x300?text=No+Image";

  return (
    <div
      onClick={() => navigate(`/product/${product.id}`)}
      className="glass-card hover-lift group relative flex h-full cursor-pointer flex-col overflow-hidden rounded-2xl bg-white"
    >
      {/* Image */}
      <div className="shimmer relative aspect-[4/3] overflow-hidden bg-slate-100">
        <img
          src={displayImage} alt={product.title}
          className={Utils.cn("h-full w-full object-cover transition-transform duration-700 group-hover:scale-110", imageLoaded ? "opacity-100" : "opacity-0")}
          onLoad={() => setImageLoaded(true)} loading="lazy"
        />
        {/* Badges */}
        <div className="absolute left-3 top-3 flex flex-col gap-1">
          {product.price === 0 && (
            <span className="flex items-center gap-1 rounded-full bg-red-500 px-2 py-1 text-[10px] font-bold text-white shadow-lg backdrop-blur-md"><Gift size={10} /> FREE</span>
          )}
          {(new Date().getTime() - new Date(product.created_at || '').getTime()) < 86400000 * 2 && (
             <span className="flex items-center gap-1 rounded-full bg-[#0047AB] px-2 py-1 text-[10px] font-bold text-white shadow-lg backdrop-blur-md"><Zap size={10} className="fill-white"/> MỚI</span>
          )}
        </div>
        <button className="absolute bottom-3 right-3 translate-y-10 rounded-full bg-white p-2.5 text-[#0047AB] opacity-0 shadow-lg transition-all duration-300 hover:bg-[#0047AB] hover:text-white group-hover:translate-y-0 group-hover:opacity-100">
          <ArrowRight size={18} />
        </button>
      </div>

      {/* Info */}
      <div className="flex flex-1 flex-col p-4">
        <div className="mb-2 flex items-start justify-between">
          <span className="max-w-[60%] truncate rounded-full border border-blue-100 bg-blue-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#0047AB]">
            {product.category}
          </span>
          <span className="flex items-center gap-1 whitespace-nowrap text-[10px] text-slate-400">
            <Clock size={10} /> {Utils.timeAgo(product.created_at)}
          </span>
        </div>
        <h3 className="mb-1 line-clamp-2 min-h-[40px] text-sm font-bold leading-relaxed text-slate-800 transition-colors group-hover:text-[#0047AB]">
          {product.title}
        </h3>
        <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-3">
          <span className="text-lg font-black tracking-tight text-[#002147]">
            {product.price === 0 ? "Tặng miễn phí" : Utils.formatCurrency(product.price)}
          </span>
          {product.location_name && (
             <div className="flex items-center gap-1 rounded-full bg-slate-50 px-2 py-1 text-[10px] text-slate-500">
                <MapPin size={10} /> {product.location_name}
             </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 6. MAIN HOMEPAGE
// ============================================================================
const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const productSectionRef = useRef<HTMLDivElement>(null);
  
  const [filter, setFilter] = useState<FilterState>({
    category: "all",
    sort: SortOption.NEWEST,
    search: "",
  });
  const [searchTerm, setSearchTerm] = useState("");
  
  // Debounce Search
  useEffect(() => {
    const timer = setTimeout(() => {
        setFilter(prev => ({...prev, search: searchTerm}));
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const { products, loading, error, refetch } = useProducts(filter);

  // Scroll to products when searching
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFilter(prev => ({...prev, search: searchTerm}));
    productSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="relative min-h-screen selection:bg-[#0047AB] selection:text-white">
      <GlobalStyles />
      <div className="aurora-bg"></div>

      {/* --- HERO SECTION --- */}
      <section className="relative overflow-hidden px-4 pb-24 pt-32 text-center">
        {/* Floating Icons Background */}
        <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden opacity-30">
          <div className="animate-float absolute left-[5%] top-20 text-blue-300 delay-0"><BookOpen size={64} /></div>
          <div className="animate-float absolute right-[10%] top-40 text-cyan-300 delay-1000"><Monitor size={80} /></div>
          <div className="animate-float absolute bottom-40 right-[15%] text-indigo-300 delay-2000"><Shirt size={72} /></div>
          <div className="animate-float absolute bottom-20 left-[10%] text-pink-300 delay-1000"><Heart size={50} /></div>
        </div>

        <div className="relative z-10 mx-auto max-w-5xl">
          <div className="animate-enter mb-8 flex justify-center">
            <div className="inline-flex cursor-default items-center gap-2 rounded-full border border-white/60 bg-white/40 px-5 py-2 shadow-sm ring-1 ring-white/50 backdrop-blur-md transition-all hover:scale-105 hover:bg-white/60">
              <Sparkles size={16} className="animate-pulse fill-yellow-400 text-yellow-400" />
              <span className="text-xs font-bold uppercase tracking-widest text-[#002147]">
                Dành riêng cho Sinh viên Bách Khoa
              </span>
            </div>
          </div>

          <h1 className="animate-enter mb-8 text-5xl font-black tracking-tight text-[#002147] drop-shadow-sm md:text-7xl" style={{ animationDelay: "100ms" }}>
            Trao đổi đồ cũ <br />
            <span className="bg-gradient-to-r from-[#0047AB] via-[#00E5FF] to-[#2E5AAC] bg-clip-text text-transparent">
              Thông minh & Tiết kiệm
            </span>
          </h1>

          <p className="animate-enter mx-auto mb-12 max-w-2xl text-lg font-medium leading-relaxed text-slate-600 md:text-xl" style={{ animationDelay: "200ms" }}>
            Nền tảng mua bán phi lợi nhuận. Tìm giáo trình, laptop, và dụng cụ học tập giá rẻ ngay tại trường ĐH Bách Khoa.
          </p>

          {/* Search Bar */}
          <div className="animate-enter group relative z-20 mx-auto mb-20 w-full max-w-2xl" style={{ animationDelay: "300ms" }}>
            <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-[#0047AB] to-[#00E5FF] opacity-30 blur-lg transition duration-1000 group-hover:opacity-50"></div>
            <form onSubmit={handleSearchSubmit} className="relative flex items-center rounded-full border border-white/50 bg-white/90 p-2 shadow-xl backdrop-blur-xl transition-all hover:bg-white hover:shadow-2xl">
              <Search className="ml-4 text-slate-400 group-focus-within:text-[#0047AB]" size={22} />
              <input
                placeholder="Bạn muốn tìm gì hôm nay? (VD: Giải tích 1...)"
                className="h-14 w-full border-none bg-transparent px-4 text-base font-medium text-slate-900 outline-none placeholder:text-slate-400"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <button type="submit" className="flex h-12 w-32 items-center justify-center gap-2 rounded-full bg-[#0047AB] px-2 shadow-lg transition-all hover:bg-[#002147] active:scale-95">
                <span className="text-sm font-bold text-white">Tìm kiếm</span>
              </button>
            </form>
          </div>

          {/* Quick Actions Grid */}
          <div className="animate-enter grid grid-cols-2 gap-4 px-4 md:grid-cols-4" style={{ animationDelay: "400ms" }}>
            {[
              { title: "Dạo Chợ", desc: "Săn deal hời", icon: <ShoppingBag size={24} />, link: "/market", color: "text-cyan-600", bg: "bg-cyan-50" },
              { title: "Đăng Tin", desc: "Bán nhanh gọn", icon: <PlusCircle size={24} />, link: "/post-item", color: "text-indigo-600", bg: "bg-indigo-50" },
              { title: "Đã Lưu", desc: "Món yêu thích", icon: <Heart size={24} />, link: "/saved", color: "text-pink-600", bg: "bg-pink-50" },
              { title: "Quản Lý", desc: "Tin của tôi", icon: <Package size={24} />, link: "/my-items", color: "text-orange-600", bg: "bg-orange-50" },
            ].map((action, i) => (
              <Link to={action.link} key={i} className="glass-card hover-lift group flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl p-6 text-center">
                <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${action.bg} ${action.color} shadow-sm transition-transform group-hover:rotate-6 group-hover:scale-110`}>
                  {action.icon}
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#002147]">{action.title}</h3>
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">{action.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* --- STICKY CATEGORY BAR --- */}
      <div className="sticky top-0 z-40 mb-12 border-y border-white/20 bg-white/80 py-4 shadow-sm backdrop-blur-xl transition-all">
        <div className="hide-scrollbar mx-auto max-w-7xl overflow-x-auto px-4">
          <div className="flex min-w-max justify-center gap-3">
            {[
              { id: "all", label: "Tất cả", icon: <Grid size={16} /> },
              { id: ProductCategory.TEXTBOOK, label: "Giáo trình", icon: <BookOpen size={16} /> },
              { id: ProductCategory.ELECTRONICS, label: "Công nghệ", icon: <Monitor size={16} /> },
              { id: ProductCategory.SUPPLIES, label: "Dụng cụ", icon: <Calculator size={16} /> },
              { id: ProductCategory.CLOTHING, label: "Đồng phục", icon: <Shirt size={16} /> },
              { id: ProductCategory.OTHER, label: "Khác", icon: <MoreHorizontal size={16} /> },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setFilter((prev) => ({ ...prev, category: cat.id as any }))}
                className={Utils.cn(
                  "flex select-none items-center gap-2 rounded-full border px-5 py-2.5 text-sm font-bold transition-all active:scale-95",
                  filter.category === cat.id
                    ? "border-[#0047AB] bg-[#0047AB] text-white shadow-lg shadow-blue-500/20"
                    : "border-slate-200 bg-white text-slate-600 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-600"
                )}
              >
                {cat.icon}
                <span>{cat.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* --- PRODUCTS SECTION --- */}
      <section className="mx-auto mb-24 min-h-[600px] max-w-7xl px-4" ref={productSectionRef}>
        <div className="mb-10 flex flex-col items-center justify-between gap-6 md:flex-row">
          <div className="text-center md:text-left">
            <h2 className="flex items-center justify-center gap-3 text-3xl font-black text-[#002147] md:justify-start">
              <TrendingUp className="animate-pulse text-[#00E5FF]" />
              {filter.category === "all" ? "Mới lên sàn" : "Kết quả lọc"}
            </h2>
            <p className="mt-2 text-sm font-medium text-slate-500">
              {loading ? "Đang cập nhật dữ liệu..." : `Hiển thị ${products.length} tin đăng mới nhất.`}
            </p>
          </div>
          <div className="flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
            {[
              { id: SortOption.NEWEST, label: "Mới nhất" },
              { id: SortOption.PRICE_ASC, label: "Giá rẻ" },
              { id: SortOption.MOST_VIEWED, label: "Xem nhiều" },
            ].map((opt) => (
              <button
                key={opt.id}
                onClick={() => setFilter((prev) => ({ ...prev, sort: opt.id }))}
                className={Utils.cn(
                  "rounded-lg px-4 py-2 text-xs font-bold transition-all",
                  filter.sort === opt.id
                    ? "bg-[#002147] text-white shadow-md"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4">
          {loading ? (
            [...Array(8)].map((_, i) => (
              <div key={i} className="h-[340px] space-y-3 rounded-2xl border border-white bg-white/60 p-4 shadow-sm">
                <div className="h-[200px] w-full animate-pulse rounded-xl bg-slate-200" />
                <div className="mt-4 h-4 w-3/4 animate-pulse rounded bg-slate-200" />
                <div className="h-4 w-1/2 animate-pulse rounded bg-slate-200" />
              </div>
            ))
          ) : error ? (
            <div className="glass-card col-span-full rounded-3xl py-20 text-center">
              <WifiOff size={40} className="mx-auto mb-4 text-red-500" />
              <p className="text-slate-500">Lỗi kết nối server</p>
              <button onClick={refetch} className="mt-4 rounded-lg border border-slate-200 px-4 py-2 text-sm font-bold hover:bg-white">Thử lại</button>
            </div>
          ) : products.length > 0 ? (
            products.map((p) => (
              <div key={p.id} className="animate-enter">
                <ProductCard product={p} />
              </div>
            ))
          ) : (
            <div className="col-span-full rounded-3xl border-2 border-dashed border-slate-200 bg-white/50 py-20 text-center">
              <Ghost size={48} className="mx-auto mb-4 text-slate-300" />
              <h3 className="text-xl font-bold text-slate-800">Không tìm thấy sản phẩm nào</h3>
              <p className="text-sm text-slate-500 mt-2">Hãy thử thay đổi từ khóa hoặc danh mục khác.</p>
              <button 
                onClick={() => {setFilter({category: 'all', sort: SortOption.NEWEST, search: ''}); setSearchTerm('')}} 
                className="text-[#00418E] font-bold hover:underline mt-4 inline-block"
              >
                Xóa bộ lọc
              </button>
            </div>
          )}
        </div>

        {products.length > 0 && !loading && (
          <div className="mt-16 text-center">
            <Link to="/market" className="group inline-flex items-center gap-2 rounded-full border border-white bg-white/80 px-10 py-4 text-base font-bold text-[#002147] shadow-md backdrop-blur transition-all hover:border-[#0047AB] hover:text-[#0047AB] hover:shadow-xl hover:scale-105">
              Xem toàn bộ thị trường <ArrowRight size={20} className="transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        )}
      </section>

      {/* --- STATS SECTION --- */}
      <section className="mb-24 border-y border-white/20 bg-white/60 py-16 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            {[
              { label: "Tin đăng", val: "8.500+", icon: <Package />, color: "blue" },
              { label: "Thành viên", val: "25.000+", icon: <Users />, color: "purple" },
              { label: "Giao dịch", val: "14.200+", icon: <ShoppingBag />, color: "green" },
              { label: "Hài lòng", val: "99.9%", icon: <Smile />, color: "orange" },
            ].map((s, i) => (
              <div key={i} className="group flex cursor-default flex-col items-center text-center">
                <div className={`bg-${s.color}-50 text-${s.color}-600 mb-4 flex h-16 w-16 items-center justify-center rounded-2xl shadow-inner transition-all duration-500 group-hover:rotate-12 group-hover:scale-110`}>
                  {s.icon}
                </div>
                <h4 className="mb-1 text-3xl font-black text-[#002147]">{s.val}</h4>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --- AI MARKETING BANNER --- */}
      <section className="mx-auto mb-24 max-w-7xl px-4">
        <div className="group relative overflow-hidden rounded-[2.5rem] bg-[#002147] p-12 text-white shadow-2xl">
          <div className="absolute -mr-20 -mt-20 right-0 top-0 h-[600px] w-[600px] rounded-full bg-[#0047AB]/30 blur-[120px] transition-all duration-1000 group-hover:bg-[#00E5FF]/20"></div>
          <div className="relative z-10 grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#00E5FF] backdrop-blur">
                <Zap size={14} className="fill-[#00E5FF]" /> Tính năng mới
              </div>
              <h2 className="text-4xl font-black leading-tight md:text-5xl">
                Đăng tin siêu tốc với <br />
                <span className="animate-pulse bg-gradient-to-r from-[#00E5FF] to-[#2E5AAC] bg-clip-text text-transparent">
                  Công nghệ AI
                </span>
              </h2>
              <p className="max-w-md text-lg leading-relaxed text-slate-300">
                Không cần nhập liệu thủ công. Chỉ cần chụp ảnh, hệ thống sẽ tự động phân tích và điền thông tin trong 3 giây.
              </p>
              <div className="flex gap-4">
                <button
                  onClick={() => navigate("/post-item")}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#0047AB] to-[#00E5FF] px-8 py-3.5 font-bold text-white shadow-lg transition-transform hover:scale-105 active:scale-95"
                >
                  <Rocket size={20} /> Thử ngay
                </button>
                <button className="flex items-center gap-2 rounded-xl bg-white/10 px-6 py-3.5 font-bold text-white hover:bg-white/20">
                  <PlayCircle size={20} /> Xem demo
                </button>
              </div>
            </div>

            {/* AI Mockup UI */}
            <div className="relative hidden lg:block">
              <div className="absolute inset-0 rotate-6 transform rounded-2xl bg-gradient-to-r from-[#0047AB] to-[#00E5FF] opacity-30 blur-lg transition-transform duration-700 group-hover:rotate-12"></div>
              <div className="rotate-3 transform rounded-2xl border border-white/10 bg-[#001529]/80 p-6 shadow-2xl backdrop-blur-xl transition-all duration-500 hover:rotate-0 hover:scale-105">
                <div className="mb-6 flex items-center gap-4 border-b border-white/10 pb-4">
                  <div className="flex h-12 w-12 animate-bounce items-center justify-center rounded-full bg-[#0047AB] shadow-lg">
                    <Sparkles size={24} />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold">AI Analysis</h4>
                    <p className="text-xs text-[#00E5FF]">Đang xử lý hình ảnh...</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex gap-3">
                    <div className="h-20 w-20 animate-pulse rounded-lg bg-slate-700"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-3/4 animate-pulse rounded bg-slate-700"></div>
                      <div className="h-4 w-1/2 animate-pulse rounded bg-slate-700"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- FOOTER --- */}
      <footer className="border-t border-[#003366] bg-[#002147] pb-12 pt-24 text-slate-400">
        <div className="mx-auto max-w-7xl px-4">
          <div className="mb-20 grid grid-cols-1 gap-12 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-6">
              <div className="flex items-center gap-3 text-white">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0047AB] text-xl font-black shadow-lg shadow-blue-900">
                  BK
                </div>
                <div>
                  <h4 className="text-2xl font-black tracking-tight text-white">CHỢ BK</h4>
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-[#00E5FF]">
                    Student Marketplace
                  </p>
                </div>
              </div>
              <p className="max-w-xs text-sm leading-relaxed text-slate-400">
                Dự án phi lợi nhuận hỗ trợ sinh viên ĐH Bách Khoa TP.HCM.
              </p>
            </div>
            <div>
              <h4 className="mb-8 text-sm font-bold uppercase tracking-wider text-white">Khám phá</h4>
              <ul className="space-y-4 text-sm font-medium">
                <li>
                  <Link to="/market" className="flex items-center gap-2 transition-colors duration-200 hover:translate-x-1 hover:text-[#00E5FF]">
                    <ChevronRight size={14} /> Dạo chợ online
                  </Link>
                </li>
                <li>
                  <Link to="/post-item" className="flex items-center gap-2 transition-colors duration-200 hover:translate-x-1 hover:text-[#00E5FF]">
                    <ChevronRight size={14} /> Đăng tin bán
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="mb-8 text-sm font-bold uppercase tracking-wider text-white">Hỗ trợ</h4>
              <ul className="space-y-4 text-sm font-medium">
                <li><a href="#" className="transition-colors hover:text-[#00E5FF]">Trung tâm trợ giúp</a></li>
                <li><a href="#" className="transition-colors hover:text-[#00E5FF]">Chính sách bảo mật</a></li>
              </ul>
            </div>
            <div>
              <h4 className="mb-8 text-sm font-bold uppercase tracking-wider text-white">Liên hệ</h4>
              <ul className="space-y-5 text-sm font-medium">
                <li className="flex items-center gap-4">
                  <Smartphone size={20} className="shrink-0 text-[#00E5FF]" />
                  <span>(028) 3864 7256</span>
                </li>
              </ul>
            </div>
          </div>
          <div className="flex flex-col items-center justify-between gap-4 border-t border-[#003366] pt-8 text-xs font-bold uppercase tracking-wider text-slate-500 md:flex-row">
            <p>&copy; {new Date().getFullYear()} HCMUT Student Project.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
