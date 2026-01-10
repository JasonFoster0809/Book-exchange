import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Search, ShoppingBag, WifiOff, Ghost, RefreshCw, Grid,
  SlidersHorizontal, ArrowUpDown, BookOpen, Monitor, Calculator,
  Shirt, MoreHorizontal, X, DollarSign, Tag
} from "lucide-react";
import { supabase } from "../services/supabase";
import ProductCard from "../components/ProductCard";
import { Product, ProductCategory, SortOption, ProductCondition } from "../types";
import { useTranslation } from "react-i18next";

// --- STYLES & ANIMATIONS ---
const VisualEngine = () => (
  <style>{`
    :root { --primary: #00418E; }
    body { background-color: #F8FAFC; color: #0F172A; }
    
    /* Sticky Glass Header */
    .glass-bar { 
      background: rgba(255, 255, 255, 0.9); 
      backdrop-filter: blur(20px); 
      border-bottom: 1px solid rgba(255, 255, 255, 0.6); 
      box-shadow: 0 4px 20px -5px rgba(0, 0, 0, 0.05); 
      z-index: 40;
    }

    /* Horizontal Scroll Hide */
    .hide-scrollbar::-webkit-scrollbar { display: none; }
    .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

    /* Animations */
    .animate-enter { animation: slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; opacity: 0; }
    @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
    
    .filter-chip { transition: all 0.2s; }
    .filter-chip:active { transform: scale(0.95); }
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
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();

  // --- STATES ---
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // --- FILTERS ---
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [category, setCategory] = useState<string>("all");
  const [sort, setSort] = useState<SortOption>(SortOption.NEWEST);
  
  // Advanced Filters (Mới)
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [minPrice, setMinPrice] = useState<string>("");
  const [maxPrice, setMaxPrice] = useState<string>("");
  const [condition, setCondition] = useState<string>("all");

  // --- CONFIG ---
  const categories = [
    { id: "all", label: t('market.cat_all'), icon: <Grid size={16} /> },
    { id: ProductCategory.TEXTBOOK, label: t('market.cat_textbook'), icon: <BookOpen size={16} /> },
    { id: ProductCategory.ELECTRONICS, label: t('market.cat_electronics'), icon: <Monitor size={16} /> },
    { id: ProductCategory.SUPPLIES, label: t('market.cat_supplies'), icon: <Calculator size={16} /> },
    { id: ProductCategory.CLOTHING, label: t('market.cat_clothing'), icon: <Shirt size={16} /> },
    { id: ProductCategory.OTHER, label: t('market.cat_other'), icon: <MoreHorizontal size={16} /> },
  ];

  const sorts = [
    { id: SortOption.NEWEST, label: t('market.sort_newest') },
    { id: SortOption.PRICE_ASC, label: t('market.sort_price_asc') },
    { id: SortOption.PRICE_DESC, label: t('market.sort_price_desc') },
    { id: SortOption.MOST_VIEWED, label: "Xem nhiều" },
  ];

  const conditions = [
    { id: "all", label: "Tất cả tình trạng" },
    { id: ProductCondition.NEW, label: "Mới 100%" },
    { id: ProductCondition.LIKE_NEW, label: "Like New 99%" },
    { id: ProductCondition.GOOD, label: "Tốt" },
    { id: ProductCondition.FAIR, label: "Khá" },
  ];

  // --- SYNC URL ---
  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    if (search) params.set("search", search); else params.delete("search");
    setSearchParams(params, { replace: true });
  }, [search]);

  // --- FETCH DATA ---
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase
        .from("products")
        .select(`*, profiles:seller_id(id, name, avatar_url, verified_status, student_code)`)
        .eq("status", "available");

      // 1. Basic Filters
      if (category !== "all") query = query.eq("category", category);
      if (search) query = query.ilike("title", `%${search}%`);

      // 2. Advanced Filters
      if (minPrice) query = query.gte("price", parseInt(minPrice));
      if (maxPrice) query = query.lte("price", parseInt(maxPrice));
      if (condition !== "all") query = query.eq("condition", condition);

      // 3. Sorting
      switch (sort) {
        case SortOption.NEWEST: query = query.order("created_at", { ascending: false }); break;
        case SortOption.PRICE_ASC: query = query.order("price", { ascending: true }); break;
        case SortOption.PRICE_DESC: query = query.order("price", { ascending: false }); break;
        case SortOption.MOST_VIEWED: query = query.order("view_count", { ascending: false }); break;
        default: query = query.order("created_at", { ascending: false });
      }

      const { data, error: dbError } = await query.limit(50);
      if (dbError) throw dbError;

      const mappedProducts: Product[] = (data || []).map((p: any) => ({
        ...p,
        sellerId: p.seller_id,
        seller: p.profiles,
        postedAt: p.created_at,
        tradeMethod: p.trade_method,
        location: p.location_name || "TP.HCM",
        images: p.images || [],
        view_count: p.view_count || 0,
      }));

      setProducts(mappedProducts);
    } catch (err: any) {
      console.error(err);
      setError(t('market.error'));
    } finally {
      setLoading(false);
    }
  }, [category, sort, search, minPrice, maxPrice, condition, t]);

  // Debounce Search
  useEffect(() => {
    const timer = setTimeout(() => fetchProducts(), 400);
    return () => clearTimeout(timer);
  }, [fetchProducts]);

  // --- HANDLERS ---
  const clearFilters = () => {
    setSearch("");
    setCategory("all");
    setSort(SortOption.NEWEST);
    setMinPrice("");
    setMaxPrice("");
    setCondition("all");
    setIsFilterOpen(false);
  };

  const activeFilterCount = (minPrice ? 1 : 0) + (maxPrice ? 1 : 0) + (condition !== "all" ? 1 : 0);

  return (
    <div className="min-h-screen pt-16 pb-20 font-sans text-slate-800">
      <VisualEngine />
      <AnimatedBackground />

      {/* --- HEADER & FILTERS (STICKY) --- */}
      <div className="sticky top-16 z-30 glass-bar transition-all duration-300">
        <div className="mx-auto max-w-7xl px-4 py-3">
          
          {/* Row 1: Search & Controls */}
          <div className="flex items-center gap-3 mb-3">
            <div className="group relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-[#00418E]" size={18} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('market.search_placeholder')}
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-10 text-sm font-medium text-slate-700 shadow-sm outline-none transition-all focus:border-[#00418E] focus:ring-4 focus:ring-blue-500/10 placeholder:text-slate-400"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-red-500 rounded-full hover:bg-slate-100">
                  <X size={14} />
                </button>
              )}
            </div>

            <button
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className={`relative flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-bold transition-all ${isFilterOpen || activeFilterCount > 0 ? "border-[#00418E] bg-[#00418E] text-white shadow-md" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}
            >
              <SlidersHorizontal size={18} />
              <span className="hidden sm:inline">{t('market.filter_btn')}</span>
              {activeFilterCount > 0 && (
                <span className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white text-[10px] flex items-center justify-center rounded-full border-2 border-white shadow-sm">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>

          {/* Row 2: Advanced Filter Panel (Collapsible) */}
          <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isFilterOpen ? "max-h-60 opacity-100 mb-3" : "max-h-0 opacity-0"}`}>
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* Sort */}
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Sắp xếp theo</label>
                <div className="relative">
                  <select
                    value={sort}
                    onChange={(e) => setSort(e.target.value as SortOption)}
                    className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-4 pr-10 text-sm font-bold text-slate-700 outline-none focus:border-[#00418E]"
                  >
                    {sorts.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                  </select>
                  <ArrowUpDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                </div>
              </div>

              {/* Price Range */}
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Khoảng giá (VNĐ)</label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" size={12}/>
                    <input type="number" placeholder="Min" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-7 pr-2 text-sm font-bold text-slate-700 outline-none focus:border-[#00418E]"/>
                  </div>
                  <span className="text-slate-300">-</span>
                  <div className="relative flex-1">
                    <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" size={12}/>
                    <input type="number" placeholder="Max" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-7 pr-2 text-sm font-bold text-slate-700 outline-none focus:border-[#00418E]"/>
                  </div>
                </div>
              </div>

              {/* Condition */}
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Tình trạng đồ</label>
                <div className="relative">
                  <select
                    value={condition}
                    onChange={(e) => setCondition(e.target.value)}
                    className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-4 pr-10 text-sm font-bold text-slate-700 outline-none focus:border-[#00418E]"
                  >
                    {conditions.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                  </select>
                  <Tag className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                </div>
              </div>
            </div>
          </div>

          {/* Row 3: Categories Chips */}
          <div className="hide-scrollbar flex w-full gap-2 overflow-x-auto">
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => setCategory(c.id)}
                className={`flex items-center gap-2 whitespace-nowrap rounded-full border px-4 py-2 text-xs font-bold transition-all filter-chip ${
                  category === c.id
                    ? "border-[#00418E] bg-[#00418E] text-white shadow-lg shadow-blue-500/20"
                    : "border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:bg-blue-50"
                }`}
              >
                {c.icon}
                {c.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* --- PRODUCT GRID --- */}
      <div className="mx-auto mt-6 max-w-7xl px-4">
        {/* Results Info */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-white rounded-lg shadow-sm border border-slate-100 text-[#00418E]">
               <ShoppingBag size={20} />
            </div>
            <div>
               <h2 className="text-lg font-bold text-slate-800 leading-tight">Kết quả tìm kiếm</h2>
               <p className="text-xs text-slate-500 font-medium">Tìm thấy {products.length} tin đăng phù hợp</p>
            </div>
          </div>
          
          <div className="flex gap-2">
             {!loading && (activeFilterCount > 0 || category !== 'all' || search) && (
                <button onClick={clearFilters} className="px-3 py-1.5 rounded-lg bg-red-50 text-red-600 text-xs font-bold hover:bg-red-100 transition-colors flex items-center gap-1">
                   <X size={12}/> Xóa bộ lọc
                </button>
             )}
             <button onClick={() => fetchProducts()} className="p-2 rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-[#00418E] hover:border-blue-200 transition-all shadow-sm">
                <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
             </button>
          </div>
        </div>

        {/* Grid Render */}
        {loading ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="flex h-[300px] animate-pulse flex-col gap-3 rounded-2xl border border-white bg-white/60 p-3 shadow-sm">
                <div className="h-[160px] w-full rounded-xl bg-slate-200"></div>
                <div className="h-4 w-3/4 rounded bg-slate-200"></div>
                <div className="h-4 w-1/2 rounded bg-slate-200"></div>
                <div className="mt-auto h-8 w-full rounded-lg bg-slate-200"></div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="rounded-3xl border border-red-100 bg-red-50/50 py-20 text-center backdrop-blur-sm">
            <WifiOff size={48} className="mx-auto mb-4 text-red-400" />
            <h3 className="mb-2 text-lg font-bold text-red-900">{error}</h3>
            <button onClick={() => fetchProducts()} className="rounded-lg border border-red-200 bg-white px-6 py-2 font-bold text-red-600 hover:bg-red-50 shadow-sm">Thử lại</button>
          </div>
        ) : products.length === 0 ? (
          <div className="rounded-[2rem] border-2 border-dashed border-slate-200 bg-white/40 py-24 text-center backdrop-blur-sm">
            <Ghost size={64} className="mx-auto mb-6 text-slate-300 opacity-50" />
            <h3 className="mb-2 text-xl font-bold text-slate-700">{t('market.no_product')}</h3>
            <p className="mx-auto max-w-md text-slate-500 text-sm mb-6">Thử thay đổi từ khóa hoặc điều chỉnh bộ lọc.</p>
            <button onClick={clearFilters} className="rounded-xl bg-[#00418E] px-6 py-2.5 font-bold text-white shadow-lg transition-transform hover:scale-105 active:scale-95">
              Xem tất cả
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {products.map((p, index) => (
              <div key={p.id} className="animate-enter" style={{ animationDelay: `${index * 50}ms` }}>
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
