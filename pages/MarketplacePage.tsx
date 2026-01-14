import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import {
  Search, Filter, X, ChevronDown, MapPin, 
  ArrowUpDown, SlidersHorizontal, Package, 
  Ghost, Clock, Heart, ShoppingBag, Check,
  LayoutGrid, List, Eye, Bell, ChevronRight, User, ArrowRight // <--- Đã thêm ArrowRight
} from "lucide-react";
import { supabase } from "../services/supabase";
import { Product } from "../types";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";

// ============================================================================
// 1. CONFIG & TYPES
// ============================================================================
const ITEMS_PER_PAGE = 12;

const CATEGORIES = [
  { id: "textbook", label: "Sách & Giáo trình" },
  { id: "electronics", label: "Điện tử & Laptop" },
  { id: "supplies", label: "Dụng cụ học tập" },
  { id: "clothing", label: "Đồng phục" },
  { id: "other", label: "Khác" },
];

const LOCATIONS = ["TP.HCM", "Hà Nội", "Đà Nẵng", "Cần Thơ", "Khác"];

enum SortOption {
  NEWEST = "newest",
  PRICE_ASC = "price_asc",
  PRICE_DESC = "price_desc",
  MOST_VIEWED = "most_viewed",
}

// Fix Types: Sử dụng string cho các trường input để tránh lỗi Type mismatch
interface FilterState {
  category: string;
  sort: SortOption;
  search: string;
  minPrice: string; // Changed form number | "" to string
  maxPrice: string; // Changed form number | "" to string
  condition: string; // Relaxed type to string to handle ""
  location: string;
}

// ============================================================================
// 2. UTILS
// ============================================================================
const Utils = {
  formatCurrency: (amount: number) => 
    new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount),
  
  timeAgo: (dateString: string) => {
    if (!dateString) return "";
    const diff = (new Date().getTime() - new Date(dateString).getTime()) / 1000;
    if (diff < 3600) return "Vừa xong";
    if (diff < 86400) return Math.floor(diff / 3600) + " giờ trước";
    return new Date(dateString).toLocaleDateString('vi-VN');
  },

  cn: (...classes: (string | undefined | false)[]) => classes.filter(Boolean).join(" "),
};

// ============================================================================
// 3. VISUAL ENGINE
// ============================================================================
const VisualEngine = () => (
  <style>{`
    :root {
      --primary: #00388D;
      --primary-hover: #002b6e;
      --bg-body: #F3F4F6;
      --border: #E5E7EB;
    }
    body { background-color: var(--bg-body); color: #1F2937; font-family: 'Inter', sans-serif; }

    /* Layout */
    .market-layout { display: grid; grid-template-columns: 260px 1fr; gap: 24px; max-width: 1280px; margin: 0 auto; padding: 24px; }
    @media (max-width: 1024px) { .market-layout { grid-template-columns: 1fr; } }

    /* Filter Sidebar */
    .filter-sidebar {
      background: white; border: 1px solid var(--border); border-radius: 8px;
      padding: 20px; height: fit-content; position: sticky; top: 80px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }

    /* Product Card (Grid) */
    .card-grid {
      background: white; border: 1px solid var(--border); border-radius: 8px;
      overflow: hidden; transition: all 0.2s; position: relative; display: flex; flex-direction: column;
    }
    .card-grid:hover {
      border-color: var(--primary); transform: translateY(-2px);
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
    }
    .card-grid .img-wrapper { aspect-ratio: 4/3; position: relative; overflow: hidden; background: #f3f4f6; }
    
    /* Product Card (List) */
    .card-list {
      background: white; border: 1px solid var(--border); border-radius: 8px;
      overflow: hidden; transition: all 0.2s; display: flex; flex-direction: row; height: 180px;
    }
    .card-list:hover { border-color: var(--primary); box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
    .card-list .img-wrapper { width: 240px; height: 100%; position: relative; overflow: hidden; background: #f3f4f6; flex-shrink: 0; }
    @media (max-width: 640px) { .card-list { flex-direction: column; height: auto; } .card-list .img-wrapper { width: 100%; aspect-ratio: 4/3; } }

    /* Inputs */
    .input-field {
      width: 100%; padding: 8px 12px; border: 1px solid var(--border);
      border-radius: 6px; font-size: 0.875rem; outline: none; transition: border-color 0.2s;
    }
    .input-field:focus { border-color: var(--primary); box-shadow: 0 0 0 2px rgba(0, 56, 141, 0.1); }

    /* Modal */
    .modal-backdrop {
      background: rgba(0, 0, 0, 0.6); backdrop-filter: blur(4px);
      position: fixed; inset: 0; z-index: 100;
      display: flex; align-items: center; justify-content: center;
      animation: fadeIn 0.2s;
    }
    .modal-content { animation: zoomIn 0.2s cubic-bezier(0.16, 1, 0.3, 1); }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes zoomIn { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }

    .hide-scrollbar::-webkit-scrollbar { display: none; }
    .line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  `}</style>
);

// ============================================================================
// 4. SUB-COMPONENTS
// ============================================================================

// --- Quick View Modal ---
const QuickViewModal = ({ product, onClose }: { product: Product, onClose: () => void }) => {
  const navigate = useNavigate();
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content bg-white rounded-lg w-full max-w-4xl m-4 flex flex-col md:flex-row overflow-hidden shadow-2xl relative" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors z-10"><X size={20}/></button>
        
        {/* Image Side */}
        <div className="w-full md:w-1/2 bg-gray-50 flex items-center justify-center p-8">
          <img src={product.images?.[0] || 'https://via.placeholder.com/400'} className="max-h-[300px] object-contain mix-blend-multiply"/>
        </div>

        {/* Info Side */}
        <div className="w-full md:w-1/2 p-8 flex flex-col">
          <div className="mb-4">
            <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded uppercase tracking-wide">{product.category}</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2 leading-tight">{product.title}</h2>
          <div className="flex items-center gap-4 mb-6">
            <p className="text-2xl font-bold text-[#00388D]">{product.price === 0 ? "Miễn phí" : Utils.formatCurrency(product.price)}</p>
            <span className="text-sm text-gray-500 border-l pl-4 border-gray-300">{Utils.timeAgo(product.created_at)}</span>
          </div>
          
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 mb-6 space-y-2">
            <div className="flex justify-between text-sm"><span className="text-gray-500">Tình trạng:</span> <span className="font-medium text-gray-900">{product.condition === 'new' ? 'Mới 100%' : 'Đã qua sử dụng'}</span></div>
            <div className="flex justify-between text-sm"><span className="text-gray-500">Khu vực:</span> <span className="font-medium text-gray-900">{product.location_name || 'Toàn quốc'}</span></div>
            <div className="flex justify-between text-sm"><span className="text-gray-500">Người bán:</span> <span className="font-medium text-blue-600 cursor-pointer hover:underline">Xem hồ sơ</span></div>
          </div>

          <div className="mt-auto flex gap-3">
            <button onClick={() => navigate(`/product/${product.id}`)} className="flex-1 bg-[#00388D] text-white py-3 rounded-lg font-bold hover:bg-[#002b6e] transition-all flex items-center justify-center gap-2">
              Xem chi tiết <ArrowRight size={18}/>
            </button>
            <button className="px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-gray-600"><Heart size={20}/></button>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Product Card ---
const ProductCard = ({ product, viewMode, onQuickView }: { product: Product, viewMode: 'grid' | 'list', onQuickView: (p: Product) => void }) => {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { user } = useAuth();

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return addToast("Vui lòng đăng nhập", "info");
    addToast("Đã lưu tin", "success");
  };

  const handleQuickView = (e: React.MouseEvent) => {
    e.stopPropagation();
    onQuickView(product);
  };

  const isGrid = viewMode === 'grid';

  return (
    <div onClick={() => navigate(`/product/${product.id}`)} className={isGrid ? "card-grid group cursor-pointer" : "card-list group cursor-pointer"}>
      <div className="img-wrapper">
        <img 
          src={product.images?.[0] || 'https://via.placeholder.com/300'} 
          alt={product.title} 
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />
        {product.condition === 'new' && (
          <span className="absolute top-2 left-2 bg-[#00388D] text-white text-[10px] font-bold px-2 py-1 rounded shadow-sm">MỚI 100%</span>
        )}
        <div className={`absolute top-2 right-2 flex-col gap-2 ${isGrid ? 'flex opacity-0 group-hover:opacity-100 transition-opacity' : 'flex'}`}>
           <button onClick={handleLike} className="p-1.5 bg-white/90 rounded-full text-gray-500 hover:text-red-500 hover:bg-white shadow-sm"><Heart size={16}/></button>
           <button onClick={handleQuickView} className="p-1.5 bg-white/90 rounded-full text-gray-500 hover:text-blue-500 hover:bg-white shadow-sm"><Eye size={16}/></button>
        </div>
      </div>
      
      <div className={`p-4 flex flex-col flex-1 ${!isGrid && 'justify-between'}`}>
        <div>
          <div className="flex justify-between items-start mb-1">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">{product.category}</span>
            <span className="text-[10px] text-gray-400">{Utils.timeAgo(product.created_at)}</span>
          </div>
          
          <h3 className={`font-bold text-gray-900 group-hover:text-[#00388D] transition-colors ${isGrid ? 'text-sm line-clamp-2 min-h-[40px]' : 'text-lg mb-2'}`}>
            {product.title}
          </h3>
          
          {!isGrid && (
            <p className="text-sm text-gray-500 line-clamp-2 mb-4">{product.description || "Không có mô tả..."}</p>
          )}
        </div>
        
        <div className={`pt-3 border-t border-gray-100 flex items-center justify-between ${isGrid ? 'mt-auto' : ''}`}>
          <span className="text-base font-bold text-[#00388D]">
            {product.price === 0 ? "Thỏa thuận" : Utils.formatCurrency(product.price)}
          </span>
          <div className="flex items-center gap-3">
             {product.location_name && (
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <MapPin size={12} /> <span className="truncate max-w-[80px]">{product.location_name}</span>
              </div>
            )}
            {!isGrid && (
               <div className="flex items-center gap-1 text-xs text-gray-500">
                 <Eye size={12}/> {product.view_count || 0}
               </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 5. MAIN PAGE
// ============================================================================
const MarketPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { addToast } = useToast();
  
  // States
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [showMobileFilter, setShowMobileFilter] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Filter State
  const [filters, setFilters] = useState<FilterState>({
    search: searchParams.get("search") || "",
    category: searchParams.get("category") || "",
    minPrice: "",
    maxPrice: "",
    condition: "all",
    location: "",
    sort: SortOption.NEWEST
  });

  // Debounce Search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(0);
      fetchProducts(0, true);
    }, 500);
    return () => clearTimeout(timer);
  }, [filters]);

  const fetchProducts = async (pageIdx: number, isReset = false) => {
    setLoading(true);
    try {
      let query = supabase.from("products").select("*", { count: 'exact' }).eq("status", "available");

      // Filter Logic
      if (filters.search) query = query.ilike("title", `%${filters.search}%`);
      if (filters.category) query = query.eq("category", filters.category);
      // Fix: Convert string price to number before query
      if (filters.minPrice) query = query.gte("price", Number(filters.minPrice));
      if (filters.maxPrice) query = query.lte("price", Number(filters.maxPrice));
      if (filters.condition && filters.condition !== "all") query = query.eq("condition", filters.condition);
      if (filters.location) query = query.ilike("location_name", `%${filters.location}%`);

      switch (filters.sort) {
        case SortOption.PRICE_ASC: query = query.order("price", { ascending: true }); break;
        case SortOption.PRICE_DESC: query = query.order("price", { ascending: false }); break;
        case SortOption.MOST_VIEWED: query = query.order("view_count", { ascending: false }); break;
        default: query = query.order("created_at", { ascending: false });
      }

      const { data, error } = await query.range(pageIdx * ITEMS_PER_PAGE, (pageIdx * ITEMS_PER_PAGE) + ITEMS_PER_PAGE - 1);
      if (error) throw error;

      if (data.length < ITEMS_PER_PAGE) setHasMore(false);
      else setHasMore(true);

      setProducts(prev => isReset ? data : [...prev, ...data]);
    } catch (err) { console.error(err); } 
    finally { setLoading(false); }
  };

  const loadMore = () => { const nextPage = page + 1; setPage(nextPage); fetchProducts(nextPage); };
  
  const clearFilters = () => {
    setFilters({ search: "", category: "", minPrice: "", maxPrice: "", condition: "all", location: "", sort: SortOption.NEWEST });
    setSearchParams({});
  };
  
  const saveSearch = () => addToast("Đã lưu bộ lọc tìm kiếm này!", "success");

  // Filter Sidebar Content
  const FilterSidebar = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-gray-100">
        <h3 className="font-bold text-gray-900 flex items-center gap-2"><Filter size={18}/> Bộ lọc</h3>
        <button onClick={clearFilters} className="text-xs font-bold text-blue-600 hover:underline">Đặt lại</button>
      </div>

      <div>
        <h4 className="text-sm font-bold text-gray-700 mb-3">Từ khóa</h4>
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
          <input className="input-field pl-9" placeholder="Tìm kiếm..." value={filters.search} onChange={e => setFilters({...filters, search: e.target.value})}/>
        </div>
      </div>

      <div>
        <h4 className="text-sm font-bold text-gray-700 mb-3">Danh mục</h4>
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm text-gray-600 hover:text-[#00388D] cursor-pointer">
            <input type="radio" name="cat" className="accent-[#00388D]" checked={!filters.category} onChange={() => setFilters({...filters, category: ""})}/> Tất cả
          </label>
          {CATEGORIES.map(cat => (
            <label key={cat.id} className="flex items-center gap-2 text-sm text-gray-600 hover:text-[#00388D] cursor-pointer">
              <input type="radio" name="cat" className="accent-[#00388D]" checked={filters.category === cat.id} onChange={() => setFilters({...filters, category: cat.id})}/> {cat.label}
            </label>
          ))}
        </div>
      </div>

      <div>
        <h4 className="text-sm font-bold text-gray-700 mb-3">Khoảng giá</h4>
        <div className="flex gap-2 items-center">
          <input type="number" placeholder="Từ" className="input-field text-xs" value={filters.minPrice} onChange={e => setFilters({...filters, minPrice: e.target.value})}/>
          <span className="text-gray-400">-</span>
          <input type="number" placeholder="Đến" className="input-field text-xs" value={filters.maxPrice} onChange={e => setFilters({...filters, maxPrice: e.target.value})}/>
        </div>
      </div>

      <div>
        <h4 className="text-sm font-bold text-gray-700 mb-3">Tình trạng</h4>
        <select className="input-field cursor-pointer" value={filters.condition} onChange={e => setFilters({...filters, condition: e.target.value})}>
          <option value="all">Tất cả</option>
          <option value="new">Mới 100%</option>
          <option value="used">Đã qua sử dụng</option>
        </select>
      </div>

      <div>
        <h4 className="text-sm font-bold text-gray-700 mb-3">Khu vực</h4>
        <select className="input-field cursor-pointer" value={filters.location} onChange={e => setFilters({...filters, location: e.target.value})}>
          <option value="">Toàn quốc</option>
          {LOCATIONS.map(loc => <option key={loc} value={loc}>{loc}</option>)}
        </select>
      </div>

      <button onClick={saveSearch} className="w-full py-2 bg-blue-50 text-[#00388D] font-bold rounded-lg text-sm hover:bg-blue-100 flex items-center justify-center gap-2 transition-colors">
        <Bell size={16}/> Lưu tìm kiếm này
      </button>
    </div>
  );

  return (
    <div className="min-h-screen">
      <VisualEngine />
      {selectedProduct && <QuickViewModal product={selectedProduct} onClose={() => setSelectedProduct(null)} />}

      {/* Mobile Drawer */}
      <div className={`fixed inset-0 z-50 transform transition-transform duration-300 lg:hidden ${showMobileFilter ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="absolute inset-0 bg-black/50" onClick={() => setShowMobileFilter(false)}></div>
        <div className="absolute right-0 top-0 bottom-0 w-80 bg-white p-6 overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-[#00388D]">Bộ lọc</h2>
            <button onClick={() => setShowMobileFilter(false)}><X size={24}/></button>
          </div>
          <FilterSidebar />
        </div>
      </div>

      {/* --- BREADCRUMBS & HEADER --- */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-[1280px] mx-auto px-6 py-3">
          <div className="text-xs text-gray-500 flex items-center gap-2 mb-4">
            <Link to="/" className="hover:text-[#00388D]">Trang chủ</Link> <ChevronRight size={12}/> <span className="font-bold text-gray-700">Thị trường</span>
          </div>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Sàn giao dịch</h1>
              <p className="text-sm text-gray-500 mt-1">Tìm thấy <strong className="text-[#00388D]">{products.length}</strong> kết quả phù hợp</p>
            </div>
            
            <div className="flex items-center gap-3 w-full md:w-auto">
              <button onClick={() => setShowMobileFilter(true)} className="lg:hidden flex-1 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-bold flex items-center justify-center gap-2 hover:bg-gray-50">
                <SlidersHorizontal size={16}/> Bộ lọc
              </button>
              
              <div className="flex items-center bg-gray-100 p-1 rounded-lg border border-gray-200">
                <button onClick={() => setViewMode('grid')} className={`p-2 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-[#00388D]' : 'text-gray-500 hover:text-gray-700'}`}><LayoutGrid size={18}/></button>
                <button onClick={() => setViewMode('list')} className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-[#00388D]' : 'text-gray-500 hover:text-gray-700'}`}><List size={18}/></button>
              </div>

              <div className="relative group flex-1 md:flex-none w-48">
                <select className="appearance-none bg-white border border-gray-300 text-gray-700 py-2 pl-4 pr-10 rounded-lg text-sm font-bold cursor-pointer focus:outline-none focus:border-[#00388D] w-full" value={filters.sort} onChange={e => setFilters({...filters, sort: e.target.value as any})}>
                  <option value={SortOption.NEWEST}>Mới nhất</option>
                  <option value={SortOption.PRICE_ASC}>Giá thấp đến cao</option>
                  <option value={SortOption.PRICE_DESC}>Giá cao đến thấp</option>
                  <option value={SortOption.MOST_VIEWED}>Xem nhiều nhất</option>
                </select>
                <ArrowUpDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"/>
              </div>
            </div>
          </div>

          {/* Active Filters Tag */}
          {(filters.search || filters.category || filters.minPrice || filters.maxPrice || (filters.condition && filters.condition !== "all")) && (
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
        <aside className="hidden lg:block">
          <div className="filter-sidebar">
            <FilterSidebar />
          </div>
        </aside>

        <main className="min-h-[500px]">
          {loading && products.length === 0 ? (
            <div className={`grid gap-6 ${viewMode === 'grid' ? 'grid-cols-2 md:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1'}`}>
              {[...Array(8)].map((_, i) => (
                <div key={i} className={`bg-white rounded-lg border border-gray-200 p-4 space-y-3 ${viewMode === 'list' ? 'flex gap-4' : ''}`}>
                  <div className={`bg-gray-200 rounded animate-pulse ${viewMode === 'list' ? 'w-48 h-32' : 'h-40'}`}/>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse"/>
                    <div className="h-4 w-1/2 bg-gray-200 rounded animate-pulse"/>
                  </div>
                </div>
              ))}
            </div>
          ) : products.length > 0 ? (
            <>
              <div className={`grid gap-6 ${viewMode === 'grid' ? 'grid-cols-2 md:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1'}`}>
                {products.map(p => <ProductCard key={p.id} product={p} viewMode={viewMode} onQuickView={setSelectedProduct}/>)}
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
