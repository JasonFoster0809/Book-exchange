import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Search, ArrowRight, Zap, Users, BookOpen, Calculator, Shirt,
  Monitor, Grid, Flame, Gift, Eye, ShoppingBag, PlusCircle, Heart,
  Package, ChevronRight, Sparkles, Clock, Smile, Rocket, PlayCircle,
  Ghost, WifiOff, RefreshCw, MoreHorizontal, Smartphone, MapPin, Filter
} from "lucide-react";
import { supabase } from "../services/supabase";

// --- TYPES & ENUMS ---
type ID = string | number;
type Timestamp = string;

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

interface Product {
  id: ID;
  created_at: Timestamp;
  title: string;
  description: string;
  price: number;
  images: string[];
  category: string;
  status: string;
  seller_id: ID;
  view_count: number;
  condition: string;
  tags: string[];
  trade_method: string;
  location_name?: string; // Khớp với DB
  location?: string;      // Fallback
}

interface FilterState {
  category: string | "all";
  sort: SortOption;
  search: string;
}

// --- STYLES & UTILS ---
const Utils = {
  formatCurrency: (amount: number): string => {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(amount);
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

const GlobalStyles = () => (
  <style>{`
    :root { --primary: #00418E; --secondary: #00B0F0; }
    body { background-color: #F8FAFC; color: #0F172A; font-family: 'Inter', system-ui, sans-serif; overflow-x: hidden; }
    ::-webkit-scrollbar { width: 6px; }
    ::-webkit-scrollbar-thumb { background: #CBD5E1; border-radius: 10px; }
    .glass-card-hover { transition: all 0.3s ease; }
    .glass-card-hover:hover { transform: translateY(-5px); box-shadow: 0 15px 30px -5px rgba(0, 0, 0, 0.1); }
    .skeleton-shimmer { background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; }
    @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
    @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
    .animate-enter { animation: fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; opacity: 0; }
  `}</style>
);

const AnimatedBackground = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
    <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-300/30 rounded-full blur-[100px]" />
    <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-300/30 rounded-full blur-[100px]" />
  </div>
);

// --- HOOK FETCH DATA ---
function useProducts(filter: FilterState) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      console.log("Đang tải dữ liệu products...");
      let query = supabase
        .from("products")
        .select("*")
        .eq("status", "available"); // Đảm bảo DB có cột status = 'available'

      if (filter.category !== "all") query = query.eq("category", filter.category);
      if (filter.search) query = query.ilike("title", `%${filter.search}%`);

      if (filter.sort === SortOption.NEWEST) query = query.order("created_at", { ascending: false });
      else if (filter.sort === SortOption.PRICE_ASC) query = query.order("price", { ascending: true });
      else if (filter.sort === SortOption.PRICE_DESC) query = query.order("price", { ascending: false });
      else if (filter.sort === SortOption.MOST_VIEWED) query = query.order("view_count", { ascending: false });

      const { data, error: dbError } = await query.limit(20);
      
      if (dbError) throw dbError;
      
      console.log("Dữ liệu tải về:", data); // Check F12 Console

      setProducts((data || []).map((p: any) => ({
        ...p,
        images: p.images || [],
        location: p.location_name || p.location || "TP.HCM" // Fix lỗi hiển thị địa điểm
      })));
    } catch (err: any) {
      console.error("Lỗi fetch:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);
  return { products, loading, error, refetch: fetchProducts };
}

// --- COMPONENTS ---
const ProductCard: React.FC<{ product: Product }> = ({ product }) => {
  const navigate = useNavigate();
  const [imageLoaded, setImageLoaded] = useState(false);
  const displayImage = product.images && product.images.length > 0 ? product.images[0] : "https://placehold.co/400x300?text=No+Image";

  return (
    <div onClick={() => navigate(`/product/${product.id}`)} className="glass-card-hover group relative flex h-full cursor-pointer flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="relative aspect-4/3 overflow-hidden bg-slate-100">
        {!imageLoaded && <div className="skeleton-shimmer absolute inset-0 h-full w-full" />}
        <img
          src={displayImage}
          alt={product.title}
          className={Utils.cn("h-full w-full object-cover transition-transform duration-500 group-hover:scale-110", imageLoaded ? "opacity-100" : "opacity-0")}
          onLoad={() => setImageLoaded(true)}
          onError={(e) => { (e.target as HTMLImageElement).src = "https://via.placeholder.com/400"; setImageLoaded(true); }}
        />
        <div className="absolute top-3 left-3 flex flex-col gap-1 z-10">
          {product.price === 0 && <span className="rounded bg-red-500 px-2 py-1 text-[10px] font-bold text-white shadow-sm">FREE</span>}
          {product.condition === "new" && <span className="rounded bg-green-500 px-2 py-1 text-[10px] font-bold text-white shadow-sm">NEW</span>}
        </div>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <div className="mb-2 flex items-center justify-between text-[10px] text-slate-500">
          <span className="uppercase tracking-wider font-bold text-blue-600 border border-blue-100 bg-blue-50 px-2 py-0.5 rounded-full">{product.category}</span>
          <span className="flex items-center gap-1"><Clock size={10} /> {Utils.timeAgo(product.created_at)}</span>
        </div>
        <h3 className="mb-1 line-clamp-2 text-sm font-bold text-slate-800 group-hover:text-blue-600">{product.title}</h3>
        <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-3">
          <span className="text-base font-black text-slate-900">{product.price === 0 ? "Tặng miễn phí" : Utils.formatCurrency(product.price)}</span>
          <div className="flex items-center gap-1 text-xs text-slate-400"><Eye size={12} /> {product.view_count || 0}</div>
        </div>
      </div>
    </div>
  );
};

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<FilterState>({ category: "all", sort: SortOption.NEWEST, search: "" });
  const { products, loading, error, refetch } = useProducts(filter);

  return (
    <div className="relative min-h-screen">
      <GlobalStyles />
      <AnimatedBackground />

      {/* HERO SECTION */}
      <section className="relative pt-32 pb-20 px-4 text-center">
        <div className="relative z-10 max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/60 border border-white shadow-sm mb-6 animate-enter">
            <Sparkles size={14} className="text-yellow-500 fill-yellow-500 animate-pulse" />
            <span className="text-xs font-bold text-slate-600 uppercase tracking-widest">Cổng thông tin sinh viên Bách Khoa</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-black text-slate-900 mb-6 tracking-tight animate-enter" style={{ animationDelay: '100ms' }}>
            Trao đổi đồ cũ <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-cyan-500">Thông minh & Tiết kiệm</span>
          </h1>
          <div className="relative max-w-xl mx-auto mb-12 animate-enter" style={{ animationDelay: '200ms' }}>
            <div className="flex items-center bg-white p-2 rounded-full shadow-xl border border-slate-200">
              <Search className="ml-3 text-slate-400" />
              <input 
                placeholder="Tìm giáo trình, máy tính..." 
                className="flex-1 px-4 outline-none text-slate-700 font-medium"
                onKeyDown={(e) => e.key === 'Enter' && navigate(`/market?search=${encodeURIComponent((e.target as any).value)}`)}
              />
              <button onClick={() => navigate('/market')} className="bg-blue-600 text-white px-6 py-2.5 rounded-full font-bold text-sm hover:bg-blue-700 transition-colors">Tìm kiếm</button>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto animate-enter" style={{ animationDelay: '300ms' }}>
            {[
              { label: "Dạo chợ", icon: <ShoppingBag />, color: "text-blue-600", bg: "bg-blue-50", link: "/market" },
              { label: "Đăng tin", icon: <PlusCircle />, color: "text-purple-600", bg: "bg-purple-50", link: "/post-item" },
              { label: "Đã lưu", icon: <Heart />, color: "text-pink-600", bg: "bg-pink-50", link: "/saved" },
              { label: "Quản lý", icon: <Package />, color: "text-orange-600", bg: "bg-orange-50", link: "/my-items" },
            ].map((item, i) => (
              <Link to={item.link} key={i} className="flex flex-col items-center gap-3 p-4 rounded-2xl bg-white/60 border border-white shadow-sm hover:shadow-md transition-all cursor-pointer hover:bg-white">
                <div className={`p-3 rounded-xl ${item.bg} ${item.color}`}>{item.icon}</div>
                <span className="text-sm font-bold text-slate-700">{item.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CATEGORY BAR */}
      <div className="sticky top-0 z-30 bg-slate-50/90 backdrop-blur-md border-y border-slate-200 py-3 mb-10">
        <div className="max-w-7xl mx-auto px-4 overflow-x-auto hide-scrollbar">
          <div className="flex gap-3 min-w-max">
            {[
              { id: "all", label: "Tất cả", icon: <Grid size={16}/> },
              { id: "textbook", label: "Giáo trình", icon: <BookOpen size={16}/> },
              { id: "electronics", label: "Điện tử", icon: <Monitor size={16}/> },
              { id: "supplies", label: "Dụng cụ", icon: <Calculator size={16}/> },
              { id: "clothing", label: "Đồng phục", icon: <Shirt size={16}/> },
              { id: "other", label: "Khác", icon: <MoreHorizontal size={16}/> },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setFilter({ ...filter, category: cat.id as any })}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold border transition-all ${
                  filter.category === cat.id ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-600 border-slate-200 hover:border-blue-400"
                }`}
              >
                {cat.icon} {cat.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* PRODUCT LIST */}
      <section className="max-w-7xl mx-auto px-4 pb-24">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
            <Flame className="text-orange-500 fill-orange-500" /> Mới lên sàn
          </h2>
          <select 
            className="bg-white border border-slate-200 text-sm font-bold text-slate-700 rounded-lg px-3 py-2 outline-none focus:border-blue-500"
            onChange={(e) => setFilter({...filter, sort: e.target.value as SortOption})}
          >
            <option value={SortOption.NEWEST}>Mới nhất</option>
            <option value={SortOption.PRICE_ASC}>Giá thấp đến cao</option>
            <option value={SortOption.PRICE_DESC}>Giá cao đến thấp</option>
          </select>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl p-4 border border-slate-100 h-80">
                <div className="skeleton-shimmer h-48 w-full rounded-xl mb-4" />
                <div className="skeleton-shimmer h-4 w-3/4 rounded mb-2" />
                <div className="skeleton-shimmer h-4 w-1/2 rounded" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-slate-200">
            <WifiOff size={48} className="mx-auto text-red-400 mb-4" />
            <h3 className="text-xl font-bold text-slate-800">Lỗi kết nối</h3>
            <p className="text-slate-500 mb-4">{error}</p>
            <button onClick={refetch} className="px-6 py-2 bg-blue-600 text-white rounded-xl font-bold">Thử lại</button>
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 border-dashed">
            <Ghost size={48} className="mx-auto text-slate-300 mb-4" />
            <h3 className="text-xl font-bold text-slate-800">Chưa có tin đăng nào</h3>
            <p className="text-slate-500 mb-6">Hãy là người đầu tiên đăng bán!</p>
            <Link to="/post-item" className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700">Đăng tin ngay</Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {products.map((p) => (
              <div key={p.id} className="animate-enter">
                <ProductCard product={p} />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default HomePage;
