import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Search, Filter, ShoppingBag, WifiOff, Ghost,
  RefreshCw, Grid, List, SlidersHorizontal, ArrowUpDown,
  BookOpen, Monitor, Calculator, Shirt, MoreHorizontal,
  X, Check
} from "lucide-react";
import { supabase } from "../services/supabase";
import ProductCard from "../components/ProductCard";
import { Product, ProductCategory, SortOption } from "../types";

// --- CONFIG ---
const CATEGORIES = [
  { id: "all", label: "Tất cả", icon: <Grid size={16} /> },
  { id: ProductCategory.TEXTBOOK, label: "Giáo trình", icon: <BookOpen size={16} /> },
  { id: ProductCategory.ELECTRONICS, label: "Điện tử", icon: <Monitor size={16} /> },
  { id: ProductCategory.SUPPLIES, label: "Dụng cụ", icon: <Calculator size={16} /> },
  { id: ProductCategory.CLOTHING, label: "Quần áo", icon: <Shirt size={16} /> },
  { id: ProductCategory.OTHER, label: "Khác", icon: <MoreHorizontal size={16} /> },
];

const SORTS = [
  { id: SortOption.NEWEST, label: "Mới nhất" },
  { id: SortOption.PRICE_ASC, label: "Giá thấp -> Cao" },
  { id: SortOption.PRICE_DESC, label: "Giá cao -> Thấp" },
  { id: SortOption.MOST_VIEWED, label: "Xem nhiều" },
];

// --- STYLES ---
const VisualEngine = () => (
  <style>{`
    :root { --primary: #00418E; --secondary: #00B0F0; }
    body { background-color: #F8FAFC; color: #0F172A; font-family: 'Inter', sans-serif; }
    
    .glass-bar { 
      background: rgba(255, 255, 255, 0.85); 
      backdrop-filter: blur(16px); 
      -webkit-backdrop-filter: blur(16px);
      border-bottom: 1px solid rgba(255, 255, 255, 0.5); 
      box-shadow: 0 4px 30px rgba(0, 0, 0, 0.03);
    }
    
    .animate-enter { animation: slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; opacity: 0; }
    @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
    
    /* Hide scrollbar but keep functionality */
    .hide-scrollbar::-webkit-scrollbar { display: none; }
    .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
  `}</style>
);

const AnimatedBackground = () => (
  <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
    <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-blue-50/80 to-transparent"></div>
    <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-blue-400/10 rounded-full mix-blend-multiply filter blur-[80px]"></div>
    <div className="absolute top-[20%] left-[-10%] w-[400px] h-[400px] bg-cyan-400/10 rounded-full mix-blend-multiply filter blur-[80px]"></div>
  </div>
);

const MarketplacePage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // State
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [category, setCategory] = useState<string>("all");
  const [sort, setSort] = useState<SortOption>(SortOption.NEWEST);
  const [isFilterOpen, setIsFilterOpen] = useState(false); // Mobile filter toggle

  // Sync search param
  useEffect(() => {
    const querySearch = searchParams.get("search");
    if (querySearch !== search) {
      const params = new URLSearchParams(searchParams);
      if (search) params.set("search", search);
      else params.delete("search");
      setSearchParams(params, { replace: true });
    }
  }, [search]);

  // Fetch Data
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase
        .from("products")
        .select("*")
        .eq("status", "available"); // Chỉ lấy sản phẩm có sẵn

      // Apply Filters
      if (category !== "all") query = query.eq("category", category);
      if (search) query = query.ilike("title", `%${search}%`);

      // Apply Sorting
      switch (sort) {
        case SortOption.NEWEST:
          query = query.order("created_at", { ascending: false });
          break;
        case SortOption.PRICE_ASC:
          query = query.order("price", { ascending: true });
          break;
        case SortOption.PRICE_DESC:
          query = query.order("price", { ascending: false });
          break;
        case SortOption.MOST_VIEWED:
          query = query.order("view_count", { ascending: false });
          break;
      }

      const { data, error: dbError } = await query.limit(50);
      if (dbError) throw dbError;

      // MAP DATA: Snake Case (DB) -> Camel Case (UI)
      const mappedProducts: Product[] = (data || []).map((p: any) => ({
        ...p,
        sellerId: p.seller_id,
        postedAt: p.created_at,
        tradeMethod: p.trade_method,
        location: p.location_name || "TP.HCM",
        images: p.images || [],
        view_count: p.view_count || 0
      }));

      setProducts(mappedProducts);
    } catch (err: any) {
      console.error(err);
      setError("Không thể tải dữ liệu. Vui lòng kiểm tra kết nối.");
    } finally {
      setLoading(false);
    }
  }, [category, sort, search]);

  useEffect(() => {
    // Debounce search
    const timer = setTimeout(() => {
      fetchProducts();
    }, 400);
    return () => clearTimeout(timer);
  }, [fetchProducts]);

  return (
    <div className="min-h-screen pt-20 pb-20 font-sans text-slate-800">
      <VisualEngine />
      <AnimatedBackground />

      {/* --- STICKY FILTER BAR --- */}
      <div className="sticky top-16 z-30 glass-bar py-3 px-4 transition-all duration-300">
        <div className="max-w-7xl mx-auto space-y-3">
          
          {/* Top Row: Search & Mobile Toggle */}
          <div className="flex gap-3 items-center">
            <div className="relative flex-1 group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#00418E] transition-colors" size={20}/>
              <input 
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Tìm kiếm sản phẩm (VD: Giáo trình, Máy tính...)"
                className="w-full pl-10 pr-10 py-3 rounded-xl bg-white border border-slate-200 focus:border-[#00418E] focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-medium text-slate-700 shadow-sm"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500 p-1">
                  <X size={16} />
                </button>
              )}
            </div>
            
            {/* Filter Toggle Button (Mobile) */}
            <button 
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className={`md:hidden p-3 rounded-xl border transition-all ${isFilterOpen ? 'bg-[#00418E] text-white border-[#00418E]' : 'bg-white text-slate-600 border-slate-200'}`}
            >
              <SlidersHorizontal size={20} />
            </button>

            {/* Sort Dropdown (Desktop) */}
            <div className="hidden md:block relative group">
              <select 
                value={sort}
                onChange={e => setSort(e.target.value as SortOption)}
                className="appearance-none pl-10 pr-8 py-3 rounded-xl bg-white border border-slate-200 font-bold text-sm text-slate-700 cursor-pointer focus:border-[#00418E] focus:ring-4 focus:ring-blue-500/10 hover:border-slate-300 shadow-sm outline-none transition-all min-w-[180px]"
              >
                {SORTS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
              <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16}/>
            </div>
          </div>

          {/* Bottom Row: Categories & Mobile Sort */}
          <div className={`flex-col md:flex-row gap-4 items-start md:items-center justify-between ${isFilterOpen ? 'flex' : 'hidden md:flex'}`}>
            
            {/* Categories */}
            <div className="flex gap-2 overflow-x-auto w-full hide-scrollbar pb-1">
              {CATEGORIES.map(c => (
                <button
                  key={c.id}
                  onClick={() => setCategory(c.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap border transition-all select-none ${
                    category === c.id 
                      ? 'bg-[#00418E] text-white border-[#00418E] shadow-lg shadow-blue-900/20' 
                      : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {c.icon}
                  {c.label}
                </button>
              ))}
            </div>

            {/* Mobile Sort Select */}
            <div className="md:hidden w-full">
              <div className="relative">
                <select 
                  value={sort}
                  onChange={e => setSort(e.target.value as SortOption)}
                  className="w-full appearance-none pl-10 pr-4 py-2.5 rounded-lg bg-white border border-slate-200 font-bold text-sm text-slate-700 outline-none"
                >
                  {SORTS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
                <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16}/>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* --- CONTENT AREA --- */}
      <div className="max-w-7xl mx-auto px-4 mt-8">
        
        {/* Results Info */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <ShoppingBag className="text-[#00418E]" />
            Kết quả tìm kiếm
            <span className="text-sm font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full ml-2">
              {loading ? "..." : products.length}
            </span>
          </h2>
          {!loading && (
            <button 
              onClick={fetchProducts} 
              className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-[#00418E] transition-colors"
              title="Làm mới"
            >
              <RefreshCw size={18} />
            </button>
          )}
        </div>

        {/* Product Grid */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 h-[320px] flex flex-col gap-3 animate-pulse">
                <div className="w-full h-[180px] bg-slate-200 rounded-xl"></div>
                <div className="w-3/4 h-4 bg-slate-200 rounded"></div>
                <div className="w-1/2 h-4 bg-slate-200 rounded"></div>
                <div className="mt-auto w-full h-10 bg-slate-200 rounded-xl"></div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="py-20 text-center rounded-3xl bg-red-50 border border-red-100">
            <WifiOff size={48} className="mx-auto mb-4 text-red-400" />
            <h3 className="text-lg font-bold text-red-900 mb-2">Lỗi kết nối</h3>
            <p className="text-red-700 mb-4">{error}</p>
            <button onClick={fetchProducts} className="px-6 py-2 bg-white border border-red-200 text-red-600 rounded-lg font-bold hover:bg-red-50">Thử lại</button>
          </div>
        ) : products.length === 0 ? (
          <div className="py-24 text-center rounded-[2rem] border-2 border-dashed border-slate-200 bg-white/50">
            <Ghost size={64} className="mx-auto mb-6 text-slate-300" />
            <h3 className="text-xl font-bold text-slate-700 mb-2">Không tìm thấy sản phẩm nào</h3>
            <p className="text-slate-500 max-w-md mx-auto">
              Thử thay đổi từ khóa tìm kiếm hoặc danh mục khác xem sao.
            </p>
            <button 
              onClick={() => { setSearch(""); setCategory("all"); }}
              className="mt-6 px-6 py-2.5 bg-[#00418E] text-white rounded-xl font-bold shadow-lg hover:shadow-blue-500/30 transition-transform hover:scale-105"
            >
              Xóa bộ lọc
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {products.map((p, index) => (
              <div key={p.id} className="animate-enter" style={{animationDelay: `${index * 50}ms`}}>
                <ProductCard product={p} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MarketplacePage;
