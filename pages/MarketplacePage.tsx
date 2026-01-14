import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import {
  Search, Filter, X, MapPin, 
  ArrowUpDown, SlidersHorizontal, Package, 
  Ghost, Clock, Heart, ShoppingBag,
  LayoutGrid, List, Eye, Bell, ChevronRight, ArrowRight
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

interface FilterState {
  category: string;
  sort: SortOption;
  search: string;
  minPrice: string;
  maxPrice: string;
  condition: string;
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
// 3. VISUAL ENGINE (CSS FIXED & UPGRADED)
// ============================================================================
const VisualEngine = () => (
  <style>{`
    :root {
      --primary: #00388D;
      --primary-dark: #002b6e;
      --bg-body: #F8FAFC; /* Màu nền sáng hơn, sạch hơn */
      --border: #E2E8F0;
    }
    body { background-color: var(--bg-body); color: #1E293B; font-family: 'Inter', sans-serif; }

    /* --- Background Pattern (Nâng cấp đồ họa: Chấm bi hiện đại) --- */
    .bg-dots {
      background-image: radial-gradient(#CBD5E1 1px, transparent 1px);
      background-size: 24px 24px;
      mask-image: linear-gradient(to bottom, black 60%, transparent 100%);
      -webkit-mask-image: linear-gradient(to bottom, black 60%, transparent 100%);
      position: fixed; top: 0; left: 0; right: 0; height: 100vh; z-index: -1; opacity: 0.4;
    }

    /* Layout */
    .market-layout { display: grid; grid-template-columns: 280px 1fr; gap: 32px; max-width: 1320px; margin: 0 auto; padding: 32px 24px; }
    @media (max-width: 1024px) { .market-layout { grid-template-columns: 1fr; } }

    /* Sticky Sidebar */
    .filter-sidebar {
      background: white; border: 1px solid var(--border); border-radius: 16px;
      padding: 24px; height: fit-content; position: sticky; top: 100px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.02);
    }

    /* Product Cards */
    .card-base {
      background: white; border: 1px solid var(--border); border-radius: 12px;
      overflow: hidden; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;
    }
    .card-base:hover {
      border-color: #93C5FD; transform: translateY(-4px);
      box-shadow: 0 12px 24px -8px rgba(0, 56, 141, 0.15);
    }

    .card-grid { display: flex; flex-direction: column; }
    .card-grid .img-wrapper { aspect-ratio: 4/3; position: relative; overflow: hidden; background: #F1F5F9; }
    
    .card-list { display: flex; flex-direction: row; height: 200px; }
    .card-list .img-wrapper { width: 260px; height: 100%; position: relative; overflow: hidden; background: #F1F5F9; flex-shrink: 0; }
    @media (max-width: 640px) { .card-list { flex-direction: column; height: auto; } .card-list .img-wrapper { width: 100%; aspect-ratio: 4/3; } }

    /* Inputs (FIX LỖI ĐÈ CHỮ: Padding Left lớn hơn) */
    .input-field {
      width: 100%; 
      padding: 10px 12px 10px 40px; /* pl-10 tương đương 40px để tránh icon */
      border: 1px solid var(--border);
      border-radius: 10px; font-size: 0.9rem; outline: none; transition: all 0.2s;
      background: #fff;
    }
    .input-field:focus { 
      border-color: var(--primary); 
      box-shadow: 0 0 0 3px rgba(0, 56, 141, 0.1); 
    }

    /* Modal Animation */
    .modal-backdrop {
      background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(4px);
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
      <div className="modal-content bg-white rounded-2xl w-full max-w-4xl m-4 flex flex-col md:flex-row overflow-hidden shadow-2xl relative" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-slate-100 rounded-full hover:bg-slate-200 transition-colors z-10"><X size={20}/></button>
        
        {/* Image */}
        <div className="w-full md:w-1/2 bg-slate-50 flex items-center justify-center p-8 border-r border-slate-100">
          <img src={product.images?.[0] || 'https://via.placeholder.com/400'} className="max-h-[350px] w-full object-contain rounded-lg"/>
        </div>

        {/* Info */}
        <div className="w-full md:w-1/2 p-8 flex flex-col">
          <div className="mb-4 flex items-center gap-2">
            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full uppercase tracking-wider border border-blue-100">{product.category}</span>
            <span className="text-xs text-slate-400 font-medium flex items-center gap-1"><Clock size={12}/> {Utils.timeAgo(product.created_at)}</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-3 leading-snug">{product.title}</h2>
          <div className="flex items-center gap-4 mb-6 pb-6 border-b border-slate-100">
            <p className="text-3xl font-black text-[#00388D]">{product.price === 0 ? "Miễn phí" : Utils.formatCurrency(product.price)}</p>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
              <span className="text-xs text-slate-500 block mb-1">Tình trạng</span>
              <span className="font-bold text-slate-900">{product.condition === 'new' ? '✨ Mới 100%' : '📦 Đã qua sử dụng'}</span>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
              <span className="text-xs text-slate-500 block mb-1">Khu vực</span>
              <span className="font-bold text-slate-900 truncate">{product.location_name || 'Toàn quốc'}</span>
            </div>
          </div>

          <div className="mt-auto flex gap-3">
            <button onClick={() => navigate(`/product/${product.id}`)} className="flex-1 bg-[#00388D] text-white py-3.5 rounded-xl font-bold hover:bg-[#002b6e] transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20 active:scale-95">
              Xem chi tiết <ArrowRight size={18}/>
            </button>
            <button className="px-5 py-3.5 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors text-slate-600 hover:text-red-500"><Heart size={20}/></button>
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
    <div onClick={() => navigate(`/product/${product.id}`)} className={`card-base group cursor-pointer ${isGrid ? 'card-grid' : 'card-list'}`}>
      <div className="img-wrapper">
        <img 
          src={product.images?.[0] || 'https://via.placeholder.com/300'} 
          alt={product.title} 
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          loading="lazy"
        />
        {product.condition === 'new' && (
          <span className="absolute top-3 left-3 bg-[#00388D] text-white text-[10px] font-black px-2.5 py-1 rounded-md shadow-lg">NEW</span>
        )}
        <div className={`absolute top-3 right-3 flex-col gap-2 ${isGrid ? 'flex opacity-0 group-hover:opacity-100 transition-opacity' : 'flex'}`}>
           <button onClick={handleLike} className="p-2 bg-white/90 backdrop-blur rounded-full text-slate-500 hover:text-red-500 hover:bg-white shadow-sm transition-all"><Heart size={16}/></button>
           <button onClick={handleQuickView} className="p-2 bg-white/90 backdrop-blur rounded-full text-slate-500 hover:text-blue-500 hover:bg-white shadow-sm transition-all"><Eye size={16}/></button>
        </div>
      </div>
      
      <div className={`p-5 flex flex-col flex-1 ${!isGrid && 'justify-between'}`}>
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider bg-blue-50 px-2 py-0.5 rounded border border-blue-100 truncate max-w-[120px]">{product.category}</span>
            <span className="text-[10px] font-medium text-slate-400">{Utils.timeAgo(product.created_at)}</span>
          </div>
          
          <h3 className={`font-bold text-slate-800 group-hover:text-[#00388D] transition-colors ${isGrid ? 'text-sm line-clamp-2 min-h-[40px]' : 'text-lg mb-2'}`}>
            {product.title}
          </h3>
          
          {!isGrid && (
            <p className="text-sm text-slate-500 line-clamp-2 mb-4">{product.description || "Không có mô tả chi tiết cho sản phẩm này."}</p>
          )}
        </div>
        
        <div className={`pt-4 border-t border-slate-100 flex items-center justify-between ${isGrid ? 'mt-auto' : ''}`}>
          <span className="text-lg font-black text-[#00388D] tracking-tight">
            {product.price === 0 ? "Thỏa thuận" : Utils.formatCurrency(product.price)}
          </span>
          <div className="flex items-center gap-3">
             {product.location_name && (
              <div className="flex items-center gap-1 text-xs font-medium text-slate-500 bg-slate-50 px-2 py-1 rounded">
                <MapPin size={10} /> <span className="truncate max-w-[80px]">{product.location_name}</span>
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

      if (filters.search) query = query.ilike("title", `%${filters.search}%`);
      if (filters.category) query = query.eq("category", filters.category);
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

  // Filter Sidebar Content (Fix UI: Icon absolute left, padding left input)
  const FilterSidebar = () => (
    <div className="space-y-7">
      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
        <h3 className="font-bold text-slate-800 flex items-center gap-2 text-lg"><Filter size={20} className="text-[#00388D]"/> Bộ lọc</h3>
        <button onClick={clearFilters} className="text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline">Đặt lại</button>
      </div>

      <div>
        <h4 className="text-sm font-bold text-slate-700 mb-3">Từ khóa</h4>
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"/> 
          {/* FIX: Thêm class 'pl-10' để chữ không đè lên icon */}
          <input 
            className="input-field pl-10" 
            placeholder="Tìm tên sản phẩm..." 
            value={filters.search} 
            onChange={e => setFilters({...filters, search: e.target.value})}
          />
        </div>
      </div>

      <div>
        <h4 className="text-sm font-bold text-slate-700 mb-3">Danh mục</h4>
        <div className="space-y-2.5">
          <label className="flex items-center gap-3 text-sm text-slate-600 hover:text-[#00388D] cursor-pointer group transition-colors">
            <input type="radio" name="cat" className="accent-[#00388D] w-4 h-4 cursor-pointer" checked={!filters.category} onChange={() => setFilters({...filters, category: ""})}/> 
            <span className="group-hover:translate-x-1 transition-transform">Tất cả</span>
          </label>
          {CATEGORIES.map(cat => (
            <label key={cat.id} className="flex items-center gap-3 text-sm text-slate-600 hover:text-[#00388D] cursor-pointer group transition-colors">
              <input type="radio" name="cat" className="accent-[#00388D] w-4 h-4 cursor-pointer" checked={filters.category === cat.id} onChange={() => setFilters({...filters, category: cat.id})}/> 
              <span className="group-hover:translate-x-1 transition-transform">{cat.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <h4 className="text-sm font-bold text-slate-700 mb-3">Khoảng giá</h4>
        <div className="flex gap-2 items-center">
          <div className="relative w-full">
             <input type="number" placeholder="Từ" className="input-field pl-3 text-xs" value={filters.minPrice} onChange={e => setFilters({...filters, minPrice: e.target.value})}/>
          </div>
          <span className="text-slate-300">-</span>
          <div className="relative w-full">
             <input type="number" placeholder="Đến" className="input-field pl-3 text-xs" value={filters.maxPrice} onChange={e => setFilters({...filters, maxPrice: e.target.value})}/>
          </div>
        </div>
      </div>

      <div>
        <h4 className="text-sm font-bold text-slate-700 mb-3">Tình trạng</h4>
        <select className="input-field cursor-pointer pl-3" value={filters.condition} onChange={e => setFilters({...filters, condition: e.target.value})}>
          <option value="all">Tất cả</option>
          <option value="new">✨ Mới 100%</option>
          <option value="used">📦 Đã qua sử dụng</option>
        </select>
      </div>

      <button onClick={saveSearch} className="w-full py-2.5 bg-blue-50 text-[#00388D] font-bold rounded-xl text-sm hover:bg-blue-100 flex items-center justify-center gap-2 transition-colors border border-blue-100">
        <Bell size={16}/> Lưu bộ lọc này
      </button>
    </div>
  );

  return (
    <div className="min-h-screen">
      <VisualEngine />
      <div className="bg-dots"></div> {/* Nền chấm bi */}
      
      {selectedProduct && <QuickViewModal product={selectedProduct} onClose={() => setSelectedProduct(null)} />}

      {/* Mobile Drawer */}
      <div className={`fixed inset-0 z-50 transform transition-transform duration-300 lg:hidden ${showMobileFilter ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowMobileFilter(false)}></div>
        <div className="absolute right-0 top-0 bottom-0 w-80 bg-white p-6 overflow-y-auto shadow-2xl">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-xl font-bold text-[#00388D]">Bộ lọc tìm kiếm</h2>
            <button onClick={() => setShowMobileFilter(false)}><X size={24} className="text-slate-500"/></button>
          </div>
          <FilterSidebar />
        </div>
      </div>

      {/* --- HEADER --- */}
      <div className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-[1320px] mx-auto px-6 py-4">
          {/* Breadcrumb */}
          <div className="text-xs text-slate-500 flex items-center gap-2 mb-3 font-medium">
            <Link to="/" className="hover:text-[#00388D] transition-colors">Trang chủ</Link> 
            <ChevronRight size={12}/> 
            <span className="text-slate-800">Thị trường</span>
          </div>

          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                <ShoppingBag className="text-[#00388D] fill-[#00388D]/10" size={28}/> Sàn giao dịch
              </h1>
              <p className="text-sm text-slate-500 mt-1 font-medium">Tìm thấy <strong className="text-[#00388D]">{products.length}</strong> kết quả phù hợp</p>
            </div>
            
            <div className="flex items-center gap-3 w-full md:w-auto">
              <button onClick={() => setShowMobileFilter(true)} className="lg:hidden flex-1 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-slate-50 transition-colors text-slate-700 shadow-sm">
                <SlidersHorizontal size={16}/> Bộ lọc
              </button>
              
              <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
                <button onClick={() => setViewMode('grid')} className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-[#00388D]' : 'text-slate-400 hover:text-slate-600'}`}><LayoutGrid size={18}/></button>
                <button onClick={() => setViewMode('list')} className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-[#00388D]' : 'text-slate-400 hover:text-slate-600'}`}><List size={18}/></button>
              </div>

              <div className="relative group flex-1 md:flex-none w-48">
                <select className="appearance-none bg-white border border-slate-200 text-slate-700 py-2.5 pl-4 pr-10 rounded-xl text-sm font-bold cursor-pointer focus:outline-none focus:border-[#00388D] w-full shadow-sm transition-all hover:border-[#00388D]" value={filters.sort} onChange={e => setFilters({...filters, sort: e.target.value as any})}>
                  <option value={SortOption.NEWEST}>Mới nhất</option>
                  <option value={SortOption.PRICE_ASC}>Giá thấp đến cao</option>
                  <option value={SortOption.PRICE_DESC}>Giá cao đến thấp</option>
                  <option value={SortOption.MOST_VIEWED}>Xem nhiều nhất</option>
                </select>
                <ArrowUpDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"/>
              </div>
            </div>
          </div>

          {/* Active Filters Tag */}
          {(filters.search || filters.category || filters.minPrice || filters.maxPrice || (filters.condition && filters.condition !== "all")) && (
            <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-slate-100 animate-enter">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider py-1.5 mr-1">Đang lọc:</span>
              {filters.search && <span className="text-xs bg-white border border-blue-200 text-blue-700 px-3 py-1.5 rounded-full flex items-center gap-1 font-bold shadow-sm">"{filters.search}" <X size={12} className="cursor-pointer hover:text-red-500" onClick={()=>setFilters({...filters, search:""})}/></span>}
              {filters.category && <span className="text-xs bg-white border border-blue-200 text-blue-700 px-3 py-1.5 rounded-full flex items-center gap-1 font-bold shadow-sm">{CATEGORIES.find(c=>c.id===filters.category)?.label} <X size={12} className="cursor-pointer hover:text-red-500" onClick={()=>setFilters({...filters, category:""})}/></span>}
              {(filters.minPrice || filters.maxPrice) && <span className="text-xs bg-white border border-blue-200 text-blue-700 px-3 py-1.5 rounded-full flex items-center gap-1 font-bold shadow-sm">{filters.minPrice || 0} - {filters.maxPrice || '∞'} <X size={12} className="cursor-pointer hover:text-red-500" onClick={()=>setFilters({...filters, minPrice:"", maxPrice:""})}/></span>}
              <button onClick={clearFilters} className="text-xs text-slate-500 hover:text-red-600 underline ml-auto font-bold transition-colors">Xóa tất cả</button>
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

        <main className="min-h-[600px]">
          {loading && products.length === 0 ? (
            <div className={`grid gap-6 ${viewMode === 'grid' ? 'grid-cols-2 md:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1'}`}>
              {[...Array(8)].map((_, i) => (
                <div key={i} className={`bg-white rounded-xl border border-slate-200 p-4 space-y-3 ${viewMode === 'list' ? 'flex gap-4' : ''}`}>
                  <div className={`bg-slate-100 rounded-lg animate-pulse ${viewMode === 'list' ? 'w-48 h-32' : 'h-40'}`}/>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-3/4 bg-slate-100 rounded animate-pulse"/>
                    <div className="h-4 w-1/2 bg-slate-100 rounded animate-pulse"/>
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
                <div className="mt-16 text-center">
                  <button 
                    onClick={loadMore} 
                    disabled={loading}
                    className="px-8 py-3 bg-white border border-slate-300 text-slate-700 font-bold rounded-xl hover:bg-slate-50 hover:border-[#00388D] hover:text-[#00388D] transition-all shadow-sm disabled:opacity-50 active:scale-95"
                  >
                    {loading ? "Đang tải..." : "Xem thêm sản phẩm"}
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-24 bg-white border-2 border-dashed border-slate-200 rounded-2xl">
              <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <Ghost size={48} className="text-slate-300"/>
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">Không tìm thấy sản phẩm nào</h3>
              <p className="text-slate-500 text-sm mb-8 max-w-xs mx-auto">Thử thay đổi bộ lọc hoặc sử dụng từ khóa tìm kiếm chung chung hơn.</p>
              <button onClick={clearFilters} className="px-8 py-3 bg-[#00388D] text-white font-bold rounded-xl hover:bg-[#002b6e] transition-all shadow-lg shadow-blue-900/20 active:scale-95">
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
