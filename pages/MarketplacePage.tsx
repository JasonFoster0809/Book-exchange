import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Search, Filter, X, ChevronDown, MapPin, 
  ArrowUpDown, SlidersHorizontal, Package, 
  Ghost, Clock, Heart, ShoppingBag, Check
} from "lucide-react";
import { supabase } from "../services/supabase";
import { Product } from "../types";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";

// ============================================================================
// 1. CONFIG & STYLES
// ============================================================================
const ITEMS_PER_PAGE = 12;

const LOCATIONS = ["TP.HCM", "Hà Nội", "Đà Nẵng", "Cần Thơ", "Khác"];
const CATEGORIES = [
  { id: "textbook", label: "Sách & Giáo trình" },
  { id: "electronics", label: "Điện tử & Laptop" },
  { id: "supplies", label: "Dụng cụ học tập" },
  { id: "clothing", label: "Đồng phục" },
  { id: "other", label: "Khác" },
];

const VisualEngine = () => (
  <style>{`
    :root {
      --primary: #00388D;
      --bg-body: #F9FAFB;
      --text-main: #111827;
      --border: #E5E7EB;
    }
    body { background-color: var(--bg-body); color: var(--text-main); font-family: 'Inter', sans-serif; }

    /* Layout */
    .market-layout { display: grid; grid-template-columns: 280px 1fr; gap: 32px; max-width: 1280px; margin: 0 auto; padding: 24px; }
    @media (max-width: 1024px) { .market-layout { grid-template-columns: 1fr; } }

    /* Components */
    .filter-sidebar {
      background: white; border: 1px solid var(--border); border-radius: 12px;
      padding: 24px; height: fit-content; position: sticky; top: 100px;
    }
    
    .product-card {
      background: white; border: 1px solid var(--border); border-radius: 8px;
      overflow: hidden; transition: all 0.2s; position: relative;
    }
    .product-card:hover {
      border-color: var(--primary); transform: translateY(-4px);
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
    }

    .custom-checkbox { accent-color: var(--primary); width: 16px; height: 16px; cursor: pointer; }
    
    .price-input {
      width: 100%; padding: 8px 12px; border: 1px solid var(--border);
      border-radius: 6px; font-size: 0.875rem; outline: none;
    }
    .price-input:focus { border-color: var(--primary); box-shadow: 0 0 0 2px rgba(0, 56, 141, 0.1); }

    /* Utilities */
    .hide-scrollbar::-webkit-scrollbar { display: none; }
    .line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
    
    /* Mobile Filter Drawer */
    .mobile-drawer {
      position: fixed; inset: 0; z-index: 50; transform: translateX(100%); transition: transform 0.3s ease-in-out;
    }
    .mobile-drawer.open { transform: translateX(0); }
    .drawer-backdrop { position: absolute; inset: 0; background: rgba(0,0,0,0.5); }
    .drawer-content { 
      position: absolute; right: 0; top: 0; bottom: 0; width: 320px; 
      background: white; padding: 24px; overflow-y: auto;
    }
  `}</style>
);

// ============================================================================
// 2. HELPER COMPONENTS
// ============================================================================

const ProductCard = ({ product }: { product: Product }) => {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { user } = useAuth();

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return addToast("Vui lòng đăng nhập", "info");
    addToast("Đã lưu tin", "success");
    // TODO: Call API save product
  };

  return (
    <div onClick={() => navigate(`/product/${product.id}`)} className="product-card group cursor-pointer flex flex-col h-full">
      <div className="relative aspect-[4/3] bg-gray-100 overflow-hidden border-b border-gray-100">
        <img 
          src={product.images?.[0] || 'https://via.placeholder.com/300'} 
          alt={product.title} 
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />
        {product.condition === 'new' && (
          <span className="absolute top-2 left-2 bg-[#00388D] text-white text-[10px] font-bold px-2 py-1 rounded shadow-sm">MỚI 100%</span>
        )}
        <button 
          onClick={handleLike}
          className="absolute top-2 right-2 p-2 bg-white/90 rounded-full text-gray-400 hover:text-red-500 hover:bg-white shadow-sm transition-colors opacity-0 group-hover:opacity-100"
        >
          <Heart size={16}/>
        </button>
      </div>
      
      <div className="p-4 flex flex-col flex-1">
        <div className="flex justify-between items-start mb-2">
          <span className="text-xs font-bold text-blue-600 uppercase tracking-wide bg-blue-50 px-2 py-0.5 rounded">{product.category}</span>
          <span className="text-xs text-gray-400">{new Date(product.created_at).toLocaleDateString('vi-VN')}</span>
        </div>
        
        <h3 className="text-sm font-bold text-gray-900 line-clamp-2 mb-auto group-hover:text-[#00388D] transition-colors min-h-[40px]">
          {product.title}
        </h3>
        
        <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
          <span className="text-base font-bold text-[#00388D]">
            {product.price === 0 ? "Thỏa thuận" : new Intl.NumberFormat('vi-VN', {style: 'currency', currency: 'VND'}).format(product.price)}
          </span>
          {product.location_name && (
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <MapPin size={12} /> <span className="truncate max-w-[80px]">{product.location_name}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 3. MAIN PAGE
// ============================================================================
const MarketPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // State
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [showMobileFilter, setShowMobileFilter] = useState(false);

  // Filter State
  const [filters, setFilters] = useState({
    search: searchParams.get("search") || "",
    category: searchParams.get("category") || "",
    minPrice: "",
    maxPrice: "",
    condition: "",
    location: "",
    sort: "newest"
  });

  // Debounce Search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(0);
      fetchProducts(0, true);
    }, 500);
    return () => clearTimeout(timer);
  }, [filters]); // Re-fetch when any filter changes

  const fetchProducts = async (pageIdx: number, isReset = false) => {
    setLoading(true);
    try {
      let query = supabase.from("products").select("*", { count: 'exact' }).eq("status", "available");

      // Apply Filters
      if (filters.search) query = query.ilike("title", `%${filters.search}%`);
      if (filters.category) query = query.eq("category", filters.category);
      if (filters.minPrice) query = query.gte("price", Number(filters.minPrice));
      if (filters.maxPrice) query = query.lte("price", Number(filters.maxPrice));
      if (filters.condition) query = query.eq("condition", filters.condition);
      if (filters.location) query = query.ilike("location_name", `%${filters.location}%`);

      // Sorting
      switch (filters.sort) {
        case "price_asc": query = query.order("price", { ascending: true }); break;
        case "price_desc": query = query.order("price", { ascending: false }); break;
        case "oldest": query = query.order("created_at", { ascending: true }); break;
        default: query = query.order("created_at", { ascending: false }); // Newest
      }

      // Pagination
      const from = pageIdx * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;
      const { data, error } = await query.range(from, to);

      if (error) throw error;

      if (data.length < ITEMS_PER_PAGE) setHasMore(false);
      else setHasMore(true);

      setProducts(prev => isReset ? data : [...prev, ...data]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchProducts(nextPage);
  };

  const clearFilters = () => {
    setFilters({ search: "", category: "", minPrice: "", maxPrice: "", condition: "", location: "", sort: "newest" });
    setSearchParams({});
  };

  // Render Filter Sidebar Content
  const FilterContent = () => (
    <div className="space-y-8">
      {/* Search */}
      <div>
        <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2"><Search size={16}/> Từ khóa</h3>
        <input 
          placeholder="Tìm tên sản phẩm..." 
          className="price-input"
          value={filters.search}
          onChange={e => setFilters({...filters, search: e.target.value})}
        />
      </div>

      {/* Category */}
      <div>
        <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2"><Package size={16}/> Danh mục</h3>
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm text-gray-600 hover:text-[#00388D] cursor-pointer">
            <input type="radio" name="category" className="custom-checkbox" checked={!filters.category} onChange={() => setFilters({...filters, category: ""})}/>
            Tất cả
          </label>
          {CATEGORIES.map(cat => (
            <label key={cat.id} className="flex items-center gap-2 text-sm text-gray-600 hover:text-[#00388D] cursor-pointer">
              <input type="radio" name="category" className="custom-checkbox" checked={filters.category === cat.id} onChange={() => setFilters({...filters, category: cat.id})}/>
              {cat.label}
            </label>
          ))}
        </div>
      </div>

      {/* Price Range */}
      <div>
        <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2"><span className="text-lg">₫</span> Khoảng giá</h3>
        <div className="flex gap-2 items-center">
          <input type="number" placeholder="Từ" className="price-input" value={filters.minPrice} onChange={e => setFilters({...filters, minPrice: e.target.value})}/>
          <span className="text-gray-400">-</span>
          <input type="number" placeholder="Đến" className="price-input" value={filters.maxPrice} onChange={e => setFilters({...filters, maxPrice: e.target.value})}/>
        </div>
      </div>

      {/* Location */}
      <div>
        <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2"><MapPin size={16}/> Khu vực</h3>
        <select className="price-input cursor-pointer" value={filters.location} onChange={e => setFilters({...filters, location: e.target.value})}>
          <option value="">Toàn quốc</option>
          {LOCATIONS.map(loc => <option key={loc} value={loc}>{loc}</option>)}
        </select>
      </div>

      <button onClick={clearFilters} className="w-full py-2 border border-gray-300 rounded-lg text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors">
        Xóa tất cả bộ lọc
      </button>
    </div>
  );

  return (
    <div className="min-h-screen">
      <VisualEngine />

      {/* Mobile Filter Drawer */}
      <div className={`mobile-drawer lg:hidden ${showMobileFilter ? 'open' : ''}`}>
        <div className="drawer-backdrop" onClick={() => setShowMobileFilter(false)}></div>
        <div className="drawer-content">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-[#00388D]">Bộ lọc</h2>
            <button onClick={() => setShowMobileFilter(false)}><X size={24}/></button>
          </div>
          <FilterContent />
        </div>
      </div>

      {/* --- PAGE HEADER --- */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-[1280px] mx-auto px-6 py-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <ShoppingBag className="text-[#00388D]"/> Thị trường
            </h1>
            
            <div className="flex items-center gap-3 w-full md:w-auto">
              <button 
                onClick={() => setShowMobileFilter(true)}
                className="lg:hidden flex-1 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-bold flex items-center justify-center gap-2 hover:bg-gray-50"
              >
                <Filter size={16}/> Bộ lọc
              </button>
              
              <div className="relative group flex-1 md:flex-none">
                <select 
                  className="appearance-none bg-white border border-gray-300 text-gray-700 py-2 pl-4 pr-10 rounded-lg text-sm font-bold cursor-pointer focus:outline-none focus:border-[#00388D] w-full md:w-48"
                  value={filters.sort}
                  onChange={e => setFilters({...filters, sort: e.target.value as any})}
                >
                  <option value="newest">Mới nhất</option>
                  <option value="price_asc">Giá thấp đến cao</option>
                  <option value="price_desc">Giá cao đến thấp</option>
                  <option value="oldest">Cũ nhất</option>
                </select>
                <ArrowUpDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"/>
              </div>
            </div>
          </div>

          {/* Active Filters Tag */}
          {(filters.category || filters.minPrice || filters.maxPrice || filters.search) && (
            <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-100">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider py-1">Đang lọc:</span>
              {filters.search && <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded border border-blue-200 flex items-center gap-1">"{filters.search}" <X size={12} className="cursor-pointer" onClick={()=>setFilters({...filters, search:""})}/></span>}
              {filters.category && <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded border border-blue-200 flex items-center gap-1">{CATEGORIES.find(c=>c.id===filters.category)?.label} <X size={12} className="cursor-pointer" onClick={()=>setFilters({...filters, category:""})}/></span>}
              {(filters.minPrice || filters.maxPrice) && <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded border border-blue-200 flex items-center gap-1">{filters.minPrice || 0} - {filters.maxPrice || '∞'} <X size={12} className="cursor-pointer" onClick={()=>setFilters({...filters, minPrice:"", maxPrice:""})}/></span>}
            </div>
          )}
        </div>
      </div>

      {/* --- MAIN LAYOUT --- */}
      <div className="market-layout">
        
        {/* LEFT: DESKTOP SIDEBAR */}
        <aside className="hidden lg:block">
          <div className="filter-sidebar shadow-sm">
            <FilterContent />
          </div>
        </aside>

        {/* RIGHT: PRODUCTS GRID */}
        <main className="min-h-[500px]">
          {loading && products.length === 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
                  <div className="h-40 bg-gray-200 rounded animate-pulse"/>
                  <div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse"/>
                  <div className="h-4 w-1/2 bg-gray-200 rounded animate-pulse"/>
                </div>
              ))}
            </div>
          ) : products.length > 0 ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
                {products.map(p => <ProductCard key={p.id} product={p} />)}
              </div>
              
              {hasMore && (
                <div className="mt-12 text-center">
                  <button 
                    onClick={loadMore} 
                    disabled={loading}
                    className="px-8 py-3 bg-white border border-gray-300 text-gray-700 font-bold rounded-lg hover:bg-gray-50 hover:border-[#00388D] hover:text-[#00388D] transition-all shadow-sm disabled:opacity-50"
                  >
                    {loading ? "Đang tải..." : "Xem thêm sản phẩm"}
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-20 bg-white border border-dashed border-gray-300 rounded-xl">
              <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Ghost size={40} className="text-gray-400"/>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-1">Không tìm thấy sản phẩm nào</h3>
              <p className="text-gray-500 text-sm mb-6">Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm của bạn.</p>
              <button onClick={clearFilters} className="px-6 py-2 bg-[#00388D] text-white font-bold rounded-lg hover:bg-[#002b6e] transition-colors">
                Xóa bộ lọc
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default MarketPage;
