import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Search, Zap, Users, BookOpen, Monitor, 
  ShoppingBag, PlusCircle, Heart, Package, 
  Clock, MapPin, SlidersHorizontal, 
  X, ArrowRight, Grid, Filter, Ghost, Activity,
  ChevronDown, Sparkles, Smartphone, Mail, Share2, 
  MessageCircle, ThumbsUp, ArrowUp, Eye, Smile // <--- Đã thêm Eye và Smile
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
// 2. UTILS & HOOKS
// ============================================================================
const Utils = {
  formatCurrency: (amount: number) => 
    new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount),
  
  timeAgo: (dateString: string) => {
    if (!dateString) return "Vừa xong";
    const diff = (new Date().getTime() - new Date(dateString).getTime()) / 1000;
    if (diff < 3600) return Math.floor(diff / 60) + " phút trước";
    if (diff < 86400) return Math.floor(diff / 3600) + " giờ trước";
    return Math.floor(diff / 86400) + " ngày trước";
  },
  
  cn: (...classes: (string | undefined | null | false)[]) => classes.filter(Boolean).join(" ")
};

// Hook: Tự động chạy số (Counter Animation)
function useCounter(end: number, duration = 2000) {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    if (end === 0) return;
    let start = 0; 
    const increment = end / (duration / 16); // 60fps
    
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

// Hook: Lấy dữ liệu sản phẩm
function useProducts(filter: FilterState) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);

  useEffect(() => {
    setProducts([]); setPage(0); setHasMore(true); setLoading(true); fetchData(0, true);
  }, [filter]);

  const fetchData = async (pageIdx: number, isNewFilter = false) => {
    try {
      let query = supabase.from("products").select("*").eq("status", "available");
      
      // Filters
      if (filter.category !== "all") query = query.eq("category", filter.category);
      if (filter.search) query = query.ilike("title", `%${filter.search}%`);
      if (filter.minPrice !== "") query = query.gte("price", filter.minPrice);
      if (filter.maxPrice !== "") query = query.lte("price", filter.maxPrice);
      if (filter.condition !== "all") query = query.eq("condition", filter.condition);

      // Sort
      switch(filter.sort) {
        case SortOption.PRICE_ASC: query = query.order("price", { ascending: true }); break;
        case SortOption.PRICE_DESC: query = query.order("price", { ascending: false }); break;
        case SortOption.MOST_VIEWED: query = query.order("view_count", { ascending: false }); break;
        default: query = query.order("created_at", { ascending: false });
      }

      const { data, error } = await query.range(pageIdx * ITEMS_PER_PAGE, (pageIdx * ITEMS_PER_PAGE) + ITEMS_PER_PAGE - 1);
      if (error) throw error;
      
      if (data.length < ITEMS_PER_PAGE) setHasMore(false);
      setProducts(prev => isNewFilter ? data : [...prev, ...data]);
    } catch (err) { console.error(err); } 
    finally { setLoading(false); }
  };

  const loadMore = () => { if (!loading && hasMore) { setPage(p => p + 1); fetchData(page + 1); } };
  return { products, loading, hasMore, loadMore };
}

// ============================================================================
// 3. VISUAL ENGINE (CSS)
// ============================================================================
const VisualEngine = () => (
  <style>{`
    :root { --cobalt-900: #002147; --cobalt-600: #0047AB; --cyan-400: #00E5FF; --light-bg: #F8FAFC; }
    body { background-color: var(--light-bg); color: var(--cobalt-900); font-family: 'Inter', sans-serif; overflow-x: hidden; }
    
    .aurora-bg { position: fixed; top: 0; left: 0; right: 0; height: 120vh; z-index: -1; background: radial-gradient(at 0% 0%, rgba(0, 71, 171, 0.05) 0px, transparent 50%), radial-gradient(at 100% 0%, rgba(0, 229, 255, 0.05) 0px, transparent 50%); filter: blur(80px); }
    
    .glass-card { background: rgba(255, 255, 255, 0.8); backdrop-filter: blur(12px); border: 1px solid rgba(255, 255, 255, 0.9); box-shadow: 0 4px 20px rgba(0, 71, 171, 0.05); }
    .hover-lift { transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1); }
    .hover-lift:hover { transform: translateY(-5px); box-shadow: 0 15px 30px -10px rgba(0, 71, 171, 0.15); border-color: #BFDBFE; }
    
    .animate-float { animation: float 6s ease-in-out infinite; }
    @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-15px); } }
    
    .modal-backdrop { background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(8px); position: fixed; inset: 0; z-index: 100; display: flex; align-items: center; justify-content: center; animation: fadeIn 0.2s; }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    .modal-content { animation: zoomIn 0.2s; }
    @keyframes zoomIn { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
    
    .hide-scrollbar::-webkit-scrollbar { display: none; }
  `}</style>
);

// ============================================================================
// 4. UI COMPONENTS
// ============================================================================

const ProductCard = ({ product, onQuickView }: { product: Product, onQuickView: (p: Product) => void }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToast } = useToast();
  const [liked, setLiked] = useState(false);

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return addToast("Vui lòng đăng nhập", "info");
    setLiked(!liked);
    addToast(liked ? "Đã bỏ lưu" : "Đã lưu tin", "success");
  };

  return (
    <div onClick={() => navigate(`/product/${product.id}`)} className="glass-card hover-lift group flex flex-col rounded-2xl bg-white h-full cursor-pointer overflow-hidden relative">
      <div className="relative aspect-[4/3] bg-slate-100 overflow-hidden">
        <img 
          src={product.images?.[0] || 'https://via.placeholder.com/300'} 
          alt={product.title} 
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" 
          loading="lazy"
        />
        {product.condition === 'new' && (
          <span className="absolute top-2 left-2 bg-[#0047AB] text-white text-[10px] font-bold px-2 py-1 rounded shadow-lg">NEW</span>
        )}
        <button onClick={handleLike} className="absolute top-2 right-2 p-2 bg-white/90 rounded-full text-slate-400 hover:text-red-500 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">
          <Heart size={16} className={liked ? "fill-red-500 text-red-500" : ""}/>
        </button>
      </div>
      
      <div className="p-4 flex flex-col flex-1">
        <div className="flex justify-between items-start mb-2">
          <span className="text-[10px] font-bold text-[#0047AB] bg-blue-50 px-2 py-0.5 rounded border border-blue-100 uppercase">{product.category}</span>
          <span className="text-[10px] text-slate-400 flex items-center gap-1"><Clock size={10}/> {Utils.timeAgo(product.created_at)}</span>
        </div>
        <h3 className="font-bold text-slate-800 line-clamp-2 text-sm mb-auto group-hover:text-[#0047AB] transition-colors">{product.title}</h3>
        <div className="mt-3 pt-3 border-t border-slate-100 flex justify-between items-center">
          <span className="text-base font-black text-[#002147]">{product.price === 0 ? "FREE" : Utils.formatCurrency(product.price)}</span>
          <button onClick={(e) => { e.stopPropagation(); onQuickView(product); }} className="text-slate-400 hover:text-[#0047AB]"><Eye size={18}/></button>
        </div>
      </div>
    </div>
  );
};

const QuickViewModal = ({ product, onClose }: { product: Product, onClose: () => void }) => {
  const navigate = useNavigate();
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content bg-white rounded-3xl p-0 w-full max-w-4xl m-4 flex flex-col md:flex-row overflow-hidden shadow-2xl relative" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-white/80 rounded-full hover:bg-slate-100 z-10"><X size={20}/></button>
        <div className="w-full md:w-1/2 bg-slate-100 flex items-center justify-center p-8">
          <img src={product.images?.[0]} className="max-h-[300px] object-contain mix-blend-multiply"/>
        </div>
        <div className="w-full md:w-1/2 p-8 flex flex-col">
          <div className="mb-auto">
            <span className="text-xs font-bold text-[#0047AB] uppercase mb-2 block">{product.category}</span>
            <h2 className="text-2xl font-black text-slate-900 mb-2">{product.title}</h2>
            <p className="text-3xl font-black text-[#0047AB] mb-6">{product.price === 0 ? "MIỄN PHÍ" : Utils.formatCurrency(product.price)}</p>
            <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-100 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">Tình trạng</span><span className="font-bold">{product.condition === 'new' ? 'Mới 100%' : 'Đã qua sử dụng'}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Khu vực</span><span className="font-bold flex items-center gap-1"><MapPin size={14}/> {product.location_name || 'Bách Khoa'}</span></div>
            </div>
          </div>
          <button onClick={() => navigate(`/product/${product.id}`)} className="w-full py-4 bg-[#002147] text-white font-bold rounded-xl mt-6 hover:bg-[#0047AB] transition-colors flex items-center justify-center gap-2">
            Xem chi tiết <ArrowRight size={18}/>
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 5. MAIN PAGE
// ============================================================================
const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<FilterState>({ category: "all", sort: SortOption.NEWEST, search: "", minPrice: "", maxPrice: "", condition: "all" });
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [stats, setStats] = useState({ users: 0, products: 0, sold: 0 });
  const [showTopBtn, setShowTopBtn] = useState(false);

  const { products, loading, hasMore, loadMore } = useProducts(filter);

  // Counters (Kết nối số liệu thật từ stats)
  const countUsers = useCounter(stats.users);
  const countProducts = useCounter(stats.products);
  const countSold = useCounter(stats.sold);

  // 1. Fetch Real Stats
  useEffect(() => {
    const fetchStats = async () => {
      const [u, p, s] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('products').select('*', { count: 'exact', head: true }),
        supabase.from('products').select('*', { count: 'exact', head: true }).eq('status', 'sold')
      ]);
      setStats({ users: u.count || 0, products: p.count || 0, sold: s.count || 0 });
    };
    fetchStats();
  }, []);

  // 2. Debounce Search
  useEffect(() => {
    const t = setTimeout(() => setFilter(prev => ({...prev, search: searchTerm})), 500);
    return () => clearTimeout(t);
  }, [searchTerm]);

  // 3. Scroll Listener
  useEffect(() => {
    const h = () => setShowTopBtn(window.scrollY > 400);
    window.addEventListener('scroll', h);
    return () => window.removeEventListener('scroll', h);
  }, []);

  return (
    <div className="relative min-h-screen pb-20 font-sans">
      <VisualEngine />
      <div className="aurora-bg"></div>
      
      {selectedProduct && <QuickViewModal product={selectedProduct} onClose={() => setSelectedProduct(null)} />}

      {/* --- HERO SECTION --- */}
      <section className="relative pt-24 pb-20 px-4 text-center overflow-hidden">
        <div className="relative z-10 max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/50 border border-white/60 backdrop-blur-md shadow-sm mb-8 animate-float">
            <Sparkles size={14} className="text-yellow-500 fill-yellow-500"/>
            <span className="text-xs font-bold text-[#002147] uppercase tracking-wider">Cộng đồng Sinh viên Bách Khoa</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-black text-[#002147] leading-[1.1] mb-6 tracking-tight">
            Trao đổi giáo trình <br/> <span className="bg-gradient-to-r from-[#0047AB] to-[#00E5FF] bg-clip-text text-transparent">Tiết kiệm & Thông minh</span>
          </h1>
          <p className="text-slate-500 text-lg md:text-xl font-medium mb-12 max-w-2xl mx-auto leading-relaxed">
            Nền tảng mua bán phi lợi nhuận dành riêng cho BK-ers. Kết nối, chia sẻ và tái sử dụng tài nguyên học tập.
          </p>

          <div className="max-w-xl mx-auto relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-[#0047AB] to-[#00E5FF] rounded-full blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
            <div className="relative bg-white p-2 rounded-full shadow-xl flex items-center">
              <Search className="ml-4 text-slate-400" size={20}/>
              <input 
                className="flex-1 bg-transparent border-none outline-none px-4 py-3 text-slate-800 font-medium placeholder:text-slate-400" 
                placeholder="Bạn đang tìm sách, máy tính...?"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
              <button onClick={() => navigate(`/market?search=${searchTerm}`)} className="bg-[#002147] text-white px-8 py-3 rounded-full font-bold text-sm hover:bg-[#0047AB] transition-all shadow-lg active:scale-95">
                Tìm kiếm
              </button>
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
          {[
            { l: "Dạo Chợ", i: <ShoppingBag size={24}/>, path: "/market", c: "text-cyan-600 bg-cyan-50" },
            { l: "Đăng Tin", i: <PlusCircle size={24}/>, path: "/post-item", c: "text-indigo-600 bg-indigo-50" },
            { l: "Đã Lưu", i: <Heart size={24}/>, path: "/saved", c: "text-pink-600 bg-pink-50" },
            { l: "Của Tôi", i: <Package size={24}/>, path: "/my-items", c: "text-orange-600 bg-orange-50" }
          ].map((item, idx) => (
            <Link to={item.path} key={idx} className="glass-card hover-lift p-6 rounded-2xl flex flex-col items-center gap-3 group">
              <div className={`p-3 rounded-xl ${item.c} group-hover:scale-110 transition-transform`}>{item.i}</div>
              <span className="font-bold text-[#002147] text-xs uppercase tracking-wide">{item.l}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* --- STATS SECTION (REAL DATA) --- */}
      <section className="py-12 bg-white/60 border-y border-white/20 backdrop-blur-sm mb-16">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { v: countUsers, l: "Thành viên", i: <Users size={28}/>, c: "text-blue-600" },
            { v: countProducts, l: "Sản phẩm", i: <Package size={28}/>, c: "text-purple-600" },
            { v: countSold, l: "Đã bán", i: <ShoppingBag size={28}/>, c: "text-green-600" },
            { v: "100%", l: "Miễn phí", i: <Smile size={28}/>, c: "text-orange-600" },
          ].map((s, i) => (
            <div key={i} className="flex flex-col items-center group">
              <div className={`mb-3 ${s.c} group-hover:scale-110 transition-transform`}>{s.i}</div>
              <p className="text-4xl font-black text-[#002147] tabular-nums tracking-tight">{s.v}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{s.l}</p>
            </div>
          ))}
        </div>
      </section>

      {/* --- MAIN FEED --- */}
      <section className="max-w-7xl mx-auto px-4 mb-24">
        {/* Filter Bar */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
          <div className="flex gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 hide-scrollbar">
            {[
              { id: "all", l: "Tất cả", i: <Grid size={16}/> },
              { id: ProductCategory.TEXTBOOK, l: "Giáo trình", i: <BookOpen size={16}/> },
              { id: ProductCategory.ELECTRONICS, l: "Điện tử", i: <Monitor size={16}/> },
              { id: ProductCategory.CLOTHING, l: "Đồng phục", i: <Zap size={16}/> }
            ].map(cat => (
              <button 
                key={cat.id} 
                onClick={() => setFilter({ ...filter, category: cat.id })} 
                className={Utils.cn("flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold transition-all whitespace-nowrap", filter.category === cat.id ? 'bg-[#002147] text-white shadow-lg' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50')}
              >
                {cat.i} {cat.l}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase hidden md:block">Sắp xếp:</span>
            <select className="bg-white border border-slate-200 text-[#002147] text-xs font-bold px-4 py-2.5 rounded-xl outline-none cursor-pointer hover:border-[#0047AB]" value={filter.sort} onChange={e => setFilter({ ...filter, sort: e.target.value as SortOption })}>
              <option value={SortOption.NEWEST}>Mới nhất</option>
              <option value={SortOption.PRICE_ASC}>Giá thấp đến cao</option>
              <option value={SortOption.PRICE_DESC}>Giá cao đến thấp</option>
            </select>
          </div>
        </div>

        {/* Product Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {loading && products.length === 0 ? (
            [...Array(8)].map((_, i) => (
              <div key={i} className="h-[320px] bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
                <div className="h-[180px] bg-slate-100 rounded-xl animate-pulse mb-4"/>
                <div className="h-4 w-3/4 bg-slate-100 rounded animate-pulse mb-2"/>
                <div className="h-4 w-1/2 bg-slate-100 rounded animate-pulse"/>
              </div>
            ))
          ) : products.length > 0 ? (
            products.map(p => <ProductCard key={p.id} product={p} onQuickView={setSelectedProduct}/>)
          ) : (
            <div className="col-span-full py-20 text-center">
              <Ghost size={64} className="mx-auto text-slate-200 mb-4 animate-bounce"/>
              <h3 className="text-xl font-bold text-slate-700">Chưa có sản phẩm nào</h3>
              <p className="text-slate-400 text-sm">Hãy thử thay đổi bộ lọc hoặc từ khóa tìm kiếm.</p>
            </div>
          )}
        </div>

        {/* Load More */}
        {hasMore && products.length > 0 && (
          <div className="mt-16 text-center">
            <button onClick={loadMore} disabled={loading} className="px-8 py-3 bg-white border border-slate-200 text-[#002147] font-bold rounded-full hover:bg-slate-50 hover:border-[#0047AB] transition-all disabled:opacity-50 flex items-center gap-2 mx-auto shadow-sm">
              {loading ? <Activity className="animate-spin" size={16}/> : "Xem thêm sản phẩm"} <ChevronDown size={16}/>
            </button>
          </div>
        )}
      </section>

      {/* --- FOOTER --- */}
      <footer className="bg-[#002147] pt-20 pb-10 text-white border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-lg flex items-center justify-center font-black text-xl shadow-lg">B</div>
                <span className="text-2xl font-black tracking-tight">BK Market</span>
              </div>
              <p className="text-slate-400 text-sm leading-relaxed max-w-sm mb-6">
                Dự án phi lợi nhuận hỗ trợ sinh viên Bách Khoa trong việc trao đổi tài liệu học tập và vật dụng cá nhân.
              </p>
              <div className="flex gap-4">
                {[Share2, MessageCircle, ThumbsUp].map((I, i) => (
                  <button key={i} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-[#00E5FF] hover:text-[#002147] transition-all">
                    <I size={18}/>
                  </button>
                ))}
              </div>
            </div>
            
            <div>
              <h4 className="font-bold text-sm uppercase tracking-widest text-[#00E5FF] mb-6">Khám phá</h4>
              <ul className="space-y-4 text-sm text-slate-300">
                <li><Link to="/market" className="hover:text-white transition-colors">Tất cả sản phẩm</Link></li>
                <li><Link to="/post-item" className="hover:text-white transition-colors">Đăng tin nhanh</Link></li>
                <li><Link to="/rules" className="hover:text-white transition-colors">Quy định cộng đồng</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-sm uppercase tracking-widest text-[#00E5FF] mb-6">Liên hệ</h4>
              <ul className="space-y-4 text-sm text-slate-300">
                <li className="flex items-center gap-3"><Smartphone size={16}/> (028) 3864 7256</li>
                <li className="flex items-center gap-3"><Mail size={16}/> support@hcmut.edu.vn</li>
                <li className="flex items-start gap-3"><MapPin size={16} className="mt-1"/> 268 Lý Thường Kiệt, Q.10</li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-white/10 pt-8 text-center text-xs text-slate-500 font-medium">
            <p>&copy; 2026 HCMUT Student Project. Built with passion.</p>
          </div>
        </div>
      </footer>

      {showTopBtn && (
        <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="fixed bottom-8 right-8 p-4 bg-[#0047AB] text-white rounded-full shadow-2xl hover:scale-110 transition-transform z-50">
          <ArrowUp size={24}/>
        </button>
      )}
    </div>
  );
};

export default HomePage;
