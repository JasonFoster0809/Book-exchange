import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Search, Filter, SlidersHorizontal, ArrowUpDown, 
  ShoppingBag, X, Check, Ghost, Loader2, MapPin, 
  Clock, Heart, Eye, ArrowRight
} from "lucide-react";
import { supabase } from "../services/supabase";
import { Product } from "../types";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";

// ============================================================================
// 1. CONFIG & UTILS
// ============================================================================
const ITEMS_PER_PAGE = 12;

const CATEGORIES = [
  { id: "all", label: "Tất cả" },
  { id: "textbook", label: "Giáo trình" },
  { id: "electronics", label: "Điện tử" },
  { id: "clothing", label: "Đồng phục" },
  { id: "supplies", label: "Dụng cụ" },
  { id: "other", label: "Khác" },
];

const SORT_OPTIONS = [
  { id: "newest", label: "Mới nhất" },
  { id: "price_asc", label: "Giá thấp đến cao" },
  { id: "price_desc", label: "Giá cao đến thấp" },
  { id: "most_viewed", label: "Xem nhiều nhất" },
];

const formatCurrency = (amount: number) => 
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount);

const timeAgo = (dateString: string) => {
  const diff = (new Date().getTime() - new Date(dateString).getTime()) / 1000;
  if (diff < 3600) return Math.floor(diff / 60) + " phút trước";
  if (diff < 86400) return Math.floor(diff / 3600) + " giờ trước";
  return Math.floor(diff / 86400) + " ngày trước";
};

// ============================================================================
// 2. VISUAL ENGINE
// ============================================================================
const VisualEngine = () => (
  <style>{`
    :root { --primary: #00418E; --bg-light: #F8FAFC; }
    body { background-color: var(--bg-light); color: #1e293b; font-family: 'Inter', sans-serif; }
    
    .glass-nav { 
      background: rgba(255, 255, 255, 0.9); backdrop-filter: blur(10px); 
      border-bottom: 1px solid rgba(0,0,0,0.05); z-index: 40; 
    }
    
    .product-card {
      background: white; border-radius: 20px; overflow: hidden;
      border: 1px solid #f1f5f9; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;
    }
    .product-card:hover {
      transform: translateY(-5px); box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
      border-color: #bfdbfe;
    }
    
    .filter-chip {
      transition: all 0.2s; white-space: nowrap;
    }
    .filter-chip.active {
      background: #00418E; color: white; border-color: #00418E; box-shadow: 0 4px 6px -1px rgba(0, 65, 142, 0.2);
    }

    .hide-scrollbar::-webkit-scrollbar { display: none; }
    
    .animate-pulse-slow { animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .5; } }
  `}</style>
);

// ============================================================================
// 3. COMPONENTS
// ============================================================================

const ProductSkeleton = () => (
  <div className="product-card h-[340px] flex flex-col">
    <div className="h-[200px] bg-slate-200 animate-pulse-slow"></div>
    <div className="p-4 flex-1 space-y-3">
      <div className="h-4 bg-slate-200 rounded w-3/4 animate-pulse-slow"></div>
      <div className="h-4 bg-slate-200 rounded w-1/2 animate-pulse-slow"></div>
      <div className="mt-auto h-6 bg-slate-200 rounded w-1/3 animate-pulse-slow"></div>
    </div>
  </div>
);

const EmptyState = ({ onReset }: { onReset: () => void }) => (
  <div className="col-span-full py-20 flex flex-col items-center justify-center text-center">
    <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-6">
      <Ghost size={48} className="text-slate-300"/>
    </div>
    <h3 className="text-xl font-bold text-slate-800 mb-2">Không tìm thấy sản phẩm nào</h3>
    <p className="text-slate-500 max-w-md mb-8">Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc của bạn xem sao nhé.</p>
    <button onClick={onReset} className="px-6 py-3 bg-[#00418E] text-white rounded-xl font-bold hover:bg-blue-800 transition-all shadow-lg shadow-blue-900/20">
      Xóa bộ lọc
    </button>
  </div>
);

// ============================================================================
// 4. MAIN PAGE
// ============================================================================
const MarketplacePage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { addToast } = useToast();

  // --- STATE ---
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [showFilters, setShowFilters] = useState(false); // Mobile toggle

  // --- FILTERS STATE ---
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [category, setCategory] = useState(searchParams.get("category") || "all");
  const [sort, setSort] = useState("newest");
  const [priceRange, setPriceRange] = useState<{min: string, max: string}>({ min: "", max: "" });

  // --- FETCH DATA ---
  const fetchProducts = useCallback(async (isLoadMore = false) => {
    setLoading(!isLoadMore);
    
    try {
      let query = supabase.from("products").select("*").eq("status", "available");

      // 1. Filter Logic
      if (category !== "all") query = query.eq("category", category);
      if (search) query = query.ilike("title", `%${search}%`);
      if (priceRange.min) query = query.gte("price", Number(priceRange.min));
      if (priceRange.max) query = query.lte("price", Number(priceRange.max));

      // 2. Sort Logic
      switch (sort) {
        case "price_asc": query = query.order("price", { ascending: true }); break;
        case "price_desc": query = query.order("price", { ascending: false }); break;
        case "most_viewed": query = query.order("view_count", { ascending: false }); break;
        default: query = query.order("created_at", { ascending: false }); // Newest
      }

      // 3. Pagination
      const from = page * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;
      query = query.range(from, to);

      const { data, error } = await query;
      if (error) throw error;

      if (data) {
        if (data.length < ITEMS_PER_PAGE) setHasMore(false);
        setProducts(prev => isLoadMore ? [...prev, ...data] : data);
      }
    } catch (err) {
      console.error("Lỗi tải sản phẩm:", err);
      addToast("Không thể tải danh sách sản phẩm", "error");
    } finally {
      setLoading(false);
    }
  }, [category, search, sort, priceRange, page]); // Depend on page too

  // Reset page when filters change
  useEffect(() => {
    setPage(0);
    setHasMore(true);
    fetchProducts(false);
  }, [category, search, sort, priceRange]); // Removed fetchProducts from dep array to avoid loop if not careful, but useCallback handles it.

  // Debounce Search update to URL
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchParams(prev => {
        if (search) prev.set("search", search);
        else prev.delete("search");
        return prev;
      });
    }, 500);
    return () => clearTimeout(timer);
  }, [search, setSearchParams]);

  // Load More Handler
  const handleLoadMore = () => {
    setPage(prev => {
      const newPage = prev + 1;
      // Note: Logic fetch inside useEffect will not trigger automatically 
      // because fetchProducts depends on page, BUT we need to call it with isLoadMore=true
      // So we call fetchProducts manually here or use a separate effect.
      // Better approach for simplicity: Call fetch directly here is tricky due to closure.
      // Let's rely on a separate useEffect for pagination if possible, 
      // OR just modify fetchProducts to accept page arg.
      // CURRENT FIX:
      return newPage;
    });
  };
  
  // Effect specifically for pagination to trigger load more
  useEffect(() => {
    if (page > 0) fetchProducts(true);
  }, [page]);


  // --- HANDLERS ---
  const resetFilters = () => {
    setSearch("");
    setCategory("all");
    setSort("newest");
    setPriceRange({ min: "", max: "" });
    setSearchParams({});
  };

  const handleProductClick = (productId: string) => {
    navigate(`/product/${productId}`);
  };

  return (
    <div className="min-h-screen pb-20">
      <VisualEngine />
      
      {/* 1. HEADER & SEARCH BAR */}
      <div className="sticky top-0 glass-nav py-4 px-4 md:px-8 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-4 items-center justify-between">
          
          {/* Logo / Title Mobile */}
          <div className="flex items-center justify-between w-full md:w-auto">
            <h1 className="text-xl font-black text-[#00418E] flex items-center gap-2">
              <ShoppingBag className="text-blue-500"/> CHỢ <span className="text-slate-700">BK</span>
            </h1>
            <button 
              className="md:hidden p-2 bg-slate-100 rounded-lg text-slate-600"
              onClick={() => setShowFilters(!showFilters)}
            >
              {showFilters ? <X size={20}/> : <Filter size={20}/>}
            </button>
          </div>

          {/* Search Input */}
          <div className="relative w-full md:max-w-lg group">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
              <Search size={18} className="text-slate-400 group-focus-within:text-[#00418E] transition-colors"/>
            </div>
            <input 
              type="text" 
              className="w-full bg-slate-100 border border-transparent text-slate-900 text-sm rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white focus:border-transparent block pl-10 p-3 transition-all" 
              placeholder="Tìm kiếm giáo trình, máy tính..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button 
                onClick={() => setSearch("")}
                className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-600"
              >
                <X size={16}/>
              </button>
            )}
          </div>

          {/* Post Button (Desktop) */}
          <button 
            onClick={() => navigate('/post-item')}
            className="hidden md:flex items-center gap-2 bg-[#00418E] text-white px-5 py-3 rounded-xl font-bold text-sm hover:bg-blue-800 transition-all shadow-lg shadow-blue-900/20"
          >
            Đăng tin mới <ArrowRight size={16}/>
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 grid grid-cols-1 md:grid-cols-4 gap-8">
        
        {/* 2. SIDEBAR FILTERS (Desktop) & DRAWER (Mobile) */}
        <aside className={`md:col-span-1 space-y-8 ${showFilters ? 'block' : 'hidden md:block'}`}>
          {/* Categories */}
          <div>
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
              <SlidersHorizontal size={18}/> Danh mục
            </h3>
            <div className="space-y-2">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setCategory(cat.id)}
                  className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all flex justify-between items-center ${category === cat.id ? 'bg-blue-50 text-[#00418E] border border-blue-100 shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}
                >
                  {cat.label}
                  {category === cat.id && <Check size={16}/>}
                </button>
              ))}
            </div>
          </div>

          {/* Price Range */}
          <div>
            <h3 className="font-bold text-slate-800 mb-4">Khoảng giá</h3>
            <div className="flex items-center gap-2 mb-4">
              <input 
                type="number" placeholder="Min" 
                className="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500"
                value={priceRange.min}
                onChange={e => setPriceRange({...priceRange, min: e.target.value})}
              />
              <span className="text-slate-400">-</span>
              <input 
                type="number" placeholder="Max" 
                className="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500"
                value={priceRange.max}
                onChange={e => setPriceRange({...priceRange, max: e.target.value})}
              />
            </div>
          </div>

          {/* Sort */}
          <div>
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
              <ArrowUpDown size={18}/> Sắp xếp
            </h3>
            <select 
              value={sort} 
              onChange={(e) => setSort(e.target.value)}
              className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-500 appearance-none cursor-pointer"
            >
              {SORT_OPTIONS.map(opt => (
                <option key={opt.id} value={opt.id}>{opt.label}</option>
              ))}
            </select>
          </div>
          
          <button onClick={resetFilters} className="w-full py-2 text-sm text-slate-500 hover:text-red-500 font-medium border-t border-slate-200 pt-4">
            Đặt lại bộ lọc
          </button>
        </aside>

        {/* 3. PRODUCT GRID */}
        <main className="md:col-span-3">
          
          {/* Active Filters Display */}
          <div className="flex flex-wrap gap-2 mb-6">
            {category !== 'all' && (
              <span className="px-3 py-1 bg-blue-100 text-[#00418E] text-xs font-bold rounded-full flex items-center gap-1">
                {CATEGORIES.find(c => c.id === category)?.label} <X size={12} className="cursor-pointer" onClick={() => setCategory('all')}/>
              </span>
            )}
            {search && (
              <span className="px-3 py-1 bg-blue-100 text-[#00418E] text-xs font-bold rounded-full flex items-center gap-1">
                Tìm: "{search}" <X size={12} className="cursor-pointer" onClick={() => setSearch('')}/>
              </span>
            )}
          </div>

          {/* Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
            {loading && page === 0 ? (
              [...Array(6)].map((_, i) => <ProductSkeleton key={i} />)
            ) : products.length > 0 ? (
              products.map(product => (
                <div 
                  key={product.id} 
                  onClick={() => handleProductClick(product.id)}
                  className="product-card group cursor-pointer"
                >
                  <div className="aspect-[4/3] bg-slate-100 relative overflow-hidden">
                    <img 
                      src={product.images?.[0] || 'https://via.placeholder.com/300'} 
                      alt={product.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      loading="lazy"
                    />
                    {product.condition === 'new' && (
                      <span className="absolute top-2 left-2 bg-[#00418E] text-white text-[10px] font-bold px-2 py-1 rounded shadow-md">NEW</span>
                    )}
                    {/* Hover Actions */}
                    <div className="absolute bottom-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity translate-y-2 group-hover:translate-y-0 duration-300">
                      <div className="p-2 bg-white rounded-full shadow-md text-slate-500 hover:text-red-500"><Heart size={16}/></div>
                      <div className="p-2 bg-white rounded-full shadow-md text-slate-500 hover:text-[#00418E]"><Eye size={16}/></div>
                    </div>
                  </div>
                  
                  <div className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[10px] font-bold text-[#00418E] bg-blue-50 px-2 py-0.5 rounded border border-blue-100 uppercase truncate max-w-[50%]">
                        {CATEGORIES.find(c => c.id === product.category)?.label || product.category}
                      </span>
                      <span className="text-[10px] text-slate-400 flex items-center gap-1">
                        <Clock size={10}/> {timeAgo(product.created_at)}
                      </span>
                    </div>
                    
                    <h3 className="font-bold text-slate-800 text-sm line-clamp-2 mb-3 h-10 group-hover:text-[#00418E] transition-colors">
                      {product.title}
                    </h3>
                    
                    <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                      <span className="font-black text-lg text-[#00418E]">
                        {product.price === 0 ? "FREE" : formatCurrency(product.price)}
                      </span>
                      <div className="flex items-center gap-1 text-[10px] text-slate-400 font-medium">
                        <MapPin size={12}/> {product.location_name || "Bách Khoa"}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <EmptyState onReset={resetFilters} />
            )}
          </div>

          {/* Load More Button */}
          {hasMore && !loading && products.length > 0 && (
            <div className="mt-12 text-center">
              <button 
                onClick={handleLoadMore}
                className="px-8 py-3 bg-white border border-slate-200 text-slate-600 rounded-full font-bold text-sm hover:bg-slate-50 hover:border-blue-200 transition-all shadow-sm flex items-center gap-2 mx-auto"
              >
                Xem thêm sản phẩm <ArrowRight size={16}/>
              </button>
            </div>
          )}
          
          {loading && page > 0 && (
            <div className="py-8 text-center flex justify-center">
              <Loader2 className="animate-spin text-[#00418E]" size={32}/>
            </div>
          )}
        </main>
      </div>

      {/* Floating Action Button (Mobile) */}
      <button 
        onClick={() => navigate('/post-item')}
        className="md:hidden fixed bottom-6 right-6 w-14 h-14 bg-[#00418E] text-white rounded-full shadow-2xl flex items-center justify-center z-50 hover:scale-110 active:scale-90 transition-all"
      >
        <div className="relative">
          <ShoppingBag size={24}/>
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-[#00418E]"></div>
        </div>
      </button>

    </div>
  );
};

export default MarketplacePage;
