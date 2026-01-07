import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Search,
  ShoppingBag,
  MapPin,
  Heart,
  SlidersHorizontal,
  X,
  Star,
  Zap,
  LayoutGrid,
  Ghost,
  Monitor,
  BookOpen,
  Shirt,
  Calculator,
  MoreHorizontal,
  RotateCcw,
  CheckCircle2,
  Clock,
  ArrowUpDown,
  Filter
} from "lucide-react";

// --- SUPABASE CONFIG ---
// Đảm bảo file supabase.js/ts của bạn đã export biến supabase
import { supabase } from "../services/supabase"; 

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
  POPULAR = "popular",
  PRICE_ASC = "price_asc",
  PRICE_DESC = "price_desc",
}

interface Product {
  id: ID;
  title: string;
  price: number;
  images: string[];
  category: string;
  status: string;
  condition: string;
  seller_id: ID;
  created_at: string;
  view_count: number;
}

interface FilterState {
  search: string;
  category: string;
  minPrice: string;
  maxPrice: string;
  sort: SortOption;
  condition: string;
}

const CATEGORIES = [
  { id: "all", label: "Tất cả", icon: <LayoutGrid size={18} /> },
  { id: ProductCategory.TEXTBOOK, label: "Giáo trình", icon: <BookOpen size={18} /> },
  { id: ProductCategory.ELECTRONICS, label: "Điện tử", icon: <Monitor size={18} /> },
  { id: ProductCategory.SUPPLIES, label: "Dụng cụ", icon: <Calculator size={18} /> },
  { id: ProductCategory.CLOTHING, label: "Thời trang", icon: <Shirt size={18} /> },
  { id: ProductCategory.OTHER, label: "Khác", icon: <MoreHorizontal size={18} /> },
];

const SORT_OPTIONS = [
  { value: SortOption.NEWEST, label: "Mới nhất" },
  { value: SortOption.POPULAR, label: "Phổ biến nhất" },
  { value: SortOption.PRICE_ASC, label: "Giá tăng dần" },
  { value: SortOption.PRICE_DESC, label: "Giá giảm dần" },
];

// --- MOCK DATA (Dữ liệu dự phòng khi DB lỗi/trống) ---
const MOCK_PRODUCTS: Product[] = [
  {
    id: "mock-1",
    title: "Giáo trình Giải tích 1 - BK Hà Nội (Mới 99%)",
    price: 45000,
    images: ["https://bizweb.dktcdn.net/100/180/634/products/giai-tich-1.jpg"],
    category: "textbook",
    status: "available",
    condition: "like_new",
    seller_id: "s1",
    created_at: new Date().toISOString(),
    view_count: 15
  },
  {
    id: "mock-2",
    title: "Máy tính Casio FX-580VN X (Bảo hành dài)",
    price: 350000,
    images: ["https://cdn.nguyenkimmall.com/images/detailed/645/10046644-may-tinh-khoa-hoc-casio-fx-580vn-x-1.jpg"],
    category: "electronics",
    status: "available",
    condition: "good",
    seller_id: "s2",
    created_at: new Date(Date.now() - 86400000).toISOString(),
    view_count: 999 
  },
  {
    id: "mock-3",
    title: "Bộ thước vẽ kỹ thuật Rotring",
    price: 150000,
    images: [],
    category: "supplies",
    status: "available",
    condition: "new",
    seller_id: "s3",
    created_at: new Date(Date.now() - 100000).toISOString(),
    view_count: 50
  },
  {
    id: "mock-4",
    title: "Áo BK Hoodie size L (Mùa đông)",
    price: 199000,
    images: ["https://xuongmaymac.vn/wp-content/uploads/2020/12/ao-khoac-dong-phuc-bach-khoa.jpg"],
    category: "clothing",
    status: "available",
    condition: "good",
    seller_id: "s4",
    created_at: new Date(Date.now() - 2000000).toISOString(),
    view_count: 200
  }
];

// ============================================================================
// 2. STYLES
// ============================================================================
const VisualEngine = () => (
  <style>{`
    :root { --primary: #00418E; --secondary: #00B0F0; }
    body { background-color: #F8FAFC; color: #334155; overscroll-behavior-y: none; }
    
    .hide-scrollbar::-webkit-scrollbar { display: none; }
    .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

    .product-card {
      transition: transform 0.2s, box-shadow 0.2s;
      border: 1px solid #E2E8F0;
    }
    .product-card:active { transform: scale(0.98); }
    
    /* Animation Sidebar Mobile */
    .drawer-overlay { animation: fadeIn 0.3s forwards; }
    .drawer-content { animation: slideRight 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
    
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes slideRight { from { transform: translateX(-100%); } to { transform: translateX(0); } }

    input, select, textarea { font-size: 16px !important; }
  `}</style>
);

// ============================================================================
// 3. LOGIC HOOKS (Đã sửa lỗi Sort)
// ============================================================================

const Utils = {
  formatCurrency: (n: number) =>
    new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(n),
  timeAgo: (date: string) => {
    if (!date) return "";
    const diff = (new Date().getTime() - new Date(date).getTime()) / 1000;
    if (diff < 3600) return `${Math.floor(diff / 60)}p trước`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h trước`;
    return `${Math.floor(diff / 86400)} ngày`;
  },
};

const useMarketData = (filters: FilterState) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      // Bắt đầu Query
      let query = supabase.from("products").select("*", { count: "exact" });
      
      // -- Filter --
      if (filters.category !== "all") query = query.eq("category", filters.category);
      if (filters.search) query = query.ilike("title", `%${filters.search}%`);
      if (filters.minPrice && !isNaN(parseInt(filters.minPrice))) query = query.gte("price", parseInt(filters.minPrice));
      if (filters.maxPrice && !isNaN(parseInt(filters.maxPrice))) query = query.lte("price", parseInt(filters.maxPrice));
      if (filters.condition !== "all") query = query.eq("condition", filters.condition);

      // -- Sorting (FIXED) --
      switch (filters.sort) {
        case SortOption.NEWEST:
          // Sửa lỗi: Sort theo ID thay vì created_at để tránh lỗi null data
          query = query.order("id", { ascending: false });
          break;
        case SortOption.POPULAR:
          // Sort theo view_count
          query = query.order("view_count", { ascending: false, nullsFirst: false });
          break;
        case SortOption.PRICE_ASC:
          query = query.order("price", { ascending: true });
          break;
        case SortOption.PRICE_DESC:
          query = query.order("price", { ascending: false });
          break;
        default:
          query = query.order("id", { ascending: false });
      }

      const { data, count, error } = await query;

      if (error) throw error;

      // -- LOGIC CHỐNG TRẮNG TRANG --
      // Nếu DB trả về rỗng và đang ở trang chủ -> Hiện Mock Data
      const isDefaultState = filters.category === 'all' && filters.search === '' && filters.minPrice === '';
      
      if ((!data || data.length === 0) && isDefaultState) {
        console.warn("DB trống hoặc lỗi kết nối -> Dùng Mock Data");
        setProducts(MOCK_PRODUCTS);
        setTotal(MOCK_PRODUCTS.length);
      } else {
        setProducts(data || []);
        setTotal(count || 0);
      }

    } catch (err) {
      console.error("Lỗi API, sử dụng dữ liệu giả:", err);
      // Fallback khi lỗi mạng/code
      let mock = [...MOCK_PRODUCTS];
      if (filters.sort === SortOption.PRICE_ASC) mock.sort((a,b) => a.price - b.price);
      if (filters.sort === SortOption.PRICE_DESC) mock.sort((a,b) => b.price - a.price);
      setProducts(mock);
      setTotal(mock.length);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  return { products, loading, total };
};

// ============================================================================
// 4. COMPONENTS
// ============================================================================

const ProductCard = ({ product }: { product: Product }) => {
  const navigate = useNavigate();
  // Xử lý ảnh fallback
  const img = (product.images && product.images.length > 0) 
    ? product.images[0] 
    : "https://via.placeholder.com/300?text=BK+Market";

  return (
    <div
      onClick={() => navigate(`/product/${product.id}`)}
      className="product-card group relative flex flex-col overflow-hidden rounded-lg bg-white shadow-sm cursor-pointer"
    >
      <div className="relative aspect-square overflow-hidden bg-slate-100">
        <img 
          src={img} 
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" 
          alt={product.title}
          onError={(e) => (e.target as HTMLImageElement).src = "https://via.placeholder.com/300?text=No+Image"}
        />
        
        {/* Badge HOT */}
        {product.view_count > 100 && (
          <div className="absolute top-1 left-1 rounded bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white shadow-sm z-10">
            HOT
          </div>
        )}
        
        {/* Thời gian */}
        <div className="absolute bottom-1 right-1 rounded bg-black/50 px-1.5 py-0.5 text-[10px] text-white backdrop-blur-sm">
          {Utils.timeAgo(product.created_at)}
        </div>
      </div>
      
      <div className="flex flex-1 flex-col p-3">
        <h3 className="line-clamp-2 text-sm font-medium text-slate-800 mb-1 h-10 leading-5">
          {product.title}
        </h3>
        <div className="mt-auto">
          <p className="text-base font-bold text-red-600">{Utils.formatCurrency(product.price)}</p>
          <div className="mt-1 flex items-center justify-between text-[10px] text-slate-400">
            <span className="flex items-center gap-0.5"><MapPin size={10} /> HCMUT</span>
            <span>Xem: {product.view_count || 0}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const FilterDrawer = ({ filters, onChange, isOpen, onClose }: any) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div className="drawer-overlay absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="drawer-content absolute inset-y-0 left-0 w-[85%] max-w-[320px] bg-white shadow-xl flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-bold text-slate-800">Bộ lọc tìm kiếm</h2>
          <button onClick={onClose} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200"><X size={20}/></button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Categories Mobile */}
          <div>
            <h3 className="font-bold mb-3 flex items-center gap-2 text-slate-700"><LayoutGrid size={18}/> Danh mục</h3>
            <div className="grid grid-cols-2 gap-2">
              {CATEGORIES.map(cat => (
                <button 
                  key={cat.id} 
                  onClick={() => { onChange("category", cat.id); onClose(); }}
                  className={`p-2.5 text-xs rounded-lg border text-left font-medium transition-all ${filters.category === cat.id ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-slate-200 text-slate-600'}`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Price Mobile */}
          <div>
            <h3 className="font-bold mb-3 flex items-center gap-2 text-slate-700"><Zap size={18}/> Khoảng giá</h3>
            <div className="flex gap-2">
              <input type="number" placeholder="Min" value={filters.minPrice} onChange={e => onChange("minPrice", e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500"/>
              <input type="number" placeholder="Max" value={filters.maxPrice} onChange={e => onChange("maxPrice", e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500"/>
            </div>
          </div>

          {/* Sort Mobile */}
          <div>
            <h3 className="font-bold mb-3 flex items-center gap-2 text-slate-700"><ArrowUpDown size={18}/> Sắp xếp</h3>
            <div className="space-y-1">
              {SORT_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => { onChange("sort", opt.value); onClose(); }}
                  className={`w-full text-left p-3 rounded-lg text-sm font-medium border transition-all ${filters.sort === opt.value ? 'bg-blue-50 text-blue-700 border-blue-200' : 'border-transparent text-slate-600 hover:bg-slate-50'}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="p-4 border-t bg-slate-50">
          <button 
            onClick={() => { onChange("category", "all"); onChange("minPrice", ""); onChange("maxPrice", ""); onChange("sort", SortOption.NEWEST); onClose(); }}
            className="w-full py-3 bg-[#00418E] text-white rounded-xl font-bold shadow-lg shadow-blue-900/10 active:scale-95 transition-transform"
          >
            Áp dụng / Đặt lại
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 5. MAIN PAGE
// ============================================================================

const MarketPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    search: searchParams.get("search") || "",
    category: (searchParams.get("cat") as string) || "all",
    minPrice: "",
    maxPrice: "",
    sort: SortOption.NEWEST, // Mặc định Newest (đã fix logic thành sort by ID)
    condition: "all",
  });

  const { products, loading, total } = useMarketData(filters);

  const handleFilterChange = (key: keyof FilterState, val: any) => {
    setFilters((prev) => ({ ...prev, [key]: val }));
    if (key === "search") setSearchParams({ search: val });
  };

  return (
    <div className="min-h-screen pb-20 bg-[#F8FAFC]">
      <VisualEngine />

      {/* --- HEADER MOBILE (Sticky) --- */}
      <div className="lg:hidden sticky top-0 z-30 bg-white border-b px-4 py-3 shadow-sm flex items-center gap-3">
        <div className="flex-1 relative">
           <input 
              value={filters.search}
              onChange={e => handleFilterChange("search", e.target.value)}
              placeholder="Tìm kiếm..." 
              className="w-full bg-slate-100 rounded-full py-2.5 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
           />
           <Search className="absolute top-2.5 left-3.5 text-slate-400" size={18}/>
        </div>
        <button 
          onClick={() => setIsMobileFilterOpen(true)}
          className="p-2.5 bg-white border border-slate-200 rounded-full text-slate-700 relative active:bg-slate-50"
        >
           <SlidersHorizontal size={20}/>
           {filters.category !== 'all' && <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></span>}
        </button>
      </div>

      {/* --- DRAWER MOBILE --- */}
      <FilterDrawer 
        filters={filters} 
        onChange={handleFilterChange} 
        isOpen={isMobileFilterOpen} 
        onClose={() => setIsMobileFilterOpen(false)} 
      />

      <div className="mx-auto max-w-7xl px-4 lg:pt-8 pt-4">
        {/* HEADER DESKTOP */}
        <div className="hidden lg:flex items-end justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black text-slate-900">Thị trường</h1>
            <p className="text-slate-500 mt-1">Tìm thấy <b className="text-[#00418E]">{total}</b> sản phẩm phù hợp</p>
          </div>
          <div className="relative w-80">
            <input 
              value={filters.search}
              onChange={e => handleFilterChange("search", e.target.value)}
              placeholder="Tìm kiếm sản phẩm..." 
              className="w-full border border-slate-200 rounded-xl py-3 pl-10 pr-4 shadow-sm outline-none focus:border-[#00418E] focus:ring-4 focus:ring-blue-500/10 transition-all"
            />
            <Search className="absolute top-3.5 left-3.5 text-slate-400" size={20}/>
          </div>
        </div>

        <div className="flex items-start gap-8">
          {/* SIDEBAR DESKTOP */}
          <aside className="hidden lg:block w-64 flex-shrink-0 sticky top-24 bg-white rounded-xl border border-slate-200 p-5 shadow-sm h-fit">
            <div className="space-y-6">
              {/* Category Desktop */}
              <div>
                <h3 className="font-bold mb-3 flex items-center gap-2 text-slate-800"><LayoutGrid size={18}/> Danh mục</h3>
                <div className="space-y-1">
                  {CATEGORIES.map(cat => (
                    <button 
                      key={cat.id}
                      onClick={() => handleFilterChange("category", cat.id)}
                      className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors flex items-center justify-between group ${filters.category === cat.id ? 'bg-[#00418E] text-white font-bold' : 'text-slate-600 hover:bg-slate-50'}`}
                    >
                      <span>{cat.label}</span>
                      {filters.category === cat.id && <CheckCircle2 size={16}/>}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Price Desktop */}
              <div className="pt-4 border-t">
                 <h3 className="font-bold mb-3 flex items-center gap-2 text-slate-800"><Zap size={18}/> Khoảng giá</h3>
                 <div className="flex items-center gap-2 mb-3">
                    <input type="number" placeholder="Min" className="w-full p-2 border rounded-lg text-sm" onChange={e => handleFilterChange("minPrice", e.target.value)}/>
                    <span className="text-slate-400">-</span>
                    <input type="number" placeholder="Max" className="w-full p-2 border rounded-lg text-sm" onChange={e => handleFilterChange("maxPrice", e.target.value)}/>
                 </div>
              </div>

              <button 
                onClick={() => { handleFilterChange("category", "all"); handleFilterChange("minPrice", ""); handleFilterChange("maxPrice", ""); handleFilterChange("sort", SortOption.NEWEST); }}
                className="w-full py-2.5 border border-slate-200 text-slate-500 text-sm font-bold rounded-lg hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-all flex items-center justify-center gap-2"
              >
                <RotateCcw size={16}/> Đặt lại
              </button>
            </div>
          </aside>

          {/* MAIN CONTENT */}
          <div className="flex-1 min-w-0">
            {/* Sort Tabs Desktop & Mobile */}
            <div className="flex gap-2 overflow-x-auto hide-scrollbar mb-4 lg:mb-6 pb-1">
              {SORT_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => handleFilterChange("sort", opt.value)}
                  className={`whitespace-nowrap px-4 py-2 rounded-full text-xs lg:text-sm font-bold border transition-all ${filters.sort === opt.value ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* PRODUCT GRID */}
            <div className="min-h-[400px]">
              {loading ? (
                // Skeleton Loading
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 lg:gap-6">
                   {[...Array(8)].map((_,i) => (
                     <div key={i} className="bg-white border p-3 rounded-lg h-64">
                       <div className="bg-slate-200 h-32 rounded mb-3 animate-pulse"></div>
                       <div className="bg-slate-200 h-4 w-3/4 rounded mb-2 animate-pulse"></div>
                       <div className="bg-slate-200 h-4 w-1/2 rounded animate-pulse"></div>
                     </div>
                   ))}
                </div>
              ) : products.length > 0 ? (
                // Danh sách sản phẩm
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 lg:gap-6">
                  {products.map(p => <ProductCard key={p.id} product={p} />)}
                </div>
              ) : (
                // Empty State
                <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-dashed">
                   <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4 border border-slate-100">
                     <Ghost className="text-slate-300" size={40}/>
                   </div>
                   <h3 className="text-lg font-bold text-slate-800">Không tìm thấy sản phẩm</h3>
                   <p className="text-slate-500 text-sm mt-1">Hãy thử tìm kiếm với từ khóa khác xem sao.</p>
                   <button 
                      onClick={() => { handleFilterChange("category", "all"); handleFilterChange("search", ""); }} 
                      className="mt-6 px-6 py-2.5 bg-[#00418E] text-white rounded-full text-sm font-bold shadow-lg hover:shadow-blue-500/25 transition-all"
                   >
                      Xóa bộ lọc
                   </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MarketPage;
