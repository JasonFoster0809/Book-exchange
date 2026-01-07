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

// Import supabase client
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
  view_count: number; // Quan trọng cho sắp xếp phổ biến
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

// Dữ liệu mẫu (Mock Data) cập nhật view_count để test sort
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
    created_at: new Date().toISOString(), // Mới nhất
    view_count: 10 // Ít xem
  },
  {
    id: "mock-2",
    title: "Máy tính Casio FX-580VN X (HOT)",
    price: 350000,
    images: ["https://cdn.nguyenkimmall.com/images/detailed/645/10046644-may-tinh-khoa-hoc-casio-fx-580vn-x-1.jpg"],
    category: "electronics",
    status: "available",
    condition: "good",
    seller_id: "s2",
    created_at: new Date(Date.now() - 86400000).toISOString(),
    view_count: 999 // Rất phổ biến -> Sẽ lên đầu khi chọn Phổ biến
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
    title: "Áo BK Hoodie size L",
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
// 2. STYLES & ANIMATIONS
// ============================================================================
const VisualEngine = () => (
  <style>{`
    :root { --primary: #00418E; --secondary: #00B0F0; }
    body { background-color: #F8FAFC; color: #334155; overscroll-behavior-y: none; }
    
    /* Ẩn thanh cuộn nhưng vẫn cuộn được */
    .hide-scrollbar::-webkit-scrollbar { display: none; }
    .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

    .product-card {
      transition: transform 0.2s, box-shadow 0.2s;
      border: 1px solid #E2E8F0;
    }
    .product-card:active { transform: scale(0.98); }
    
    /* Animation cho Mobile Drawer */
    .drawer-overlay { animation: fadeIn 0.3s forwards; }
    .drawer-content { animation: slideRight 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
    
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes slideRight { from { transform: translateX(-100%); } to { transform: translateX(0); } }

    /* Fix lỗi iOS input zoom */
    input, select, textarea { font-size: 16px !important; }
  `}</style>
);

// ============================================================================
// 3. LOGIC HOOKS
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
      let query = supabase.from("products").select("*", { count: "exact" });
      
      // -- Lọc --
      if (filters.category !== "all") query = query.eq("category", filters.category);
      if (filters.search) query = query.ilike("title", `%${filters.search}%`);
      if (filters.minPrice && !isNaN(parseInt(filters.minPrice))) query = query.gte("price", parseInt(filters.minPrice));
      if (filters.maxPrice && !isNaN(parseInt(filters.maxPrice))) query = query.lte("price", parseInt(filters.maxPrice));
      if (filters.condition !== "all") query = query.eq("condition", filters.condition);

      // -- Sắp xếp (FIXED LOGIC) --
      switch (filters.sort) {
        case SortOption.NEWEST:
          query = query.order("created_at", { ascending: false });
          break;
        case SortOption.POPULAR:
          // Nếu DB chưa có cột view_count thì sort này sẽ lỗi -> Code sẽ nhảy xuống catch và dùng Mock Data
          query = query.order("view_count", { ascending: false, nullsFirst: false });
          break;
        case SortOption.PRICE_ASC:
          query = query.order("price", { ascending: true });
          break;
        case SortOption.PRICE_DESC:
          query = query.order("price", { ascending: false });
          break;
      }

      const { data, count, error } = await query;

      if (error || !data || data.length === 0) {
        // --- FALLBACK MOCK DATA ---
        let mock = [...MOCK_PRODUCTS];
        // Filter giả lập
        if (filters.category !== "all") mock = mock.filter(p => p.category === filters.category);
        if (filters.search) mock = mock.filter(p => p.title.toLowerCase().includes(filters.search.toLowerCase()));
        
        // Sort giả lập
        if (filters.sort === SortOption.NEWEST) mock.sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        if (filters.sort === SortOption.POPULAR) mock.sort((a,b) => b.view_count - a.view_count);
        if (filters.sort === SortOption.PRICE_ASC) mock.sort((a,b) => a.price - b.price);
        if (filters.sort === SortOption.PRICE_DESC) mock.sort((a,b) => b.price - a.price);

        setProducts(mock);
        setTotal(mock.length);
      } else {
        setProducts(data);
        setTotal(count || 0);
      }
    } catch (err) {
      console.log("Using Mock Data due to error");
      setProducts(MOCK_PRODUCTS);
      setTotal(MOCK_PRODUCTS.length);
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
  const img = (product.images && product.images.length) ? product.images[0] : "https://via.placeholder.com/300?text=BK+Market";

  return (
    <div
      onClick={() => navigate(`/product/${product.id}`)}
      className="product-card group relative flex flex-col overflow-hidden rounded-lg bg-white shadow-sm cursor-pointer"
    >
      <div className="relative aspect-square overflow-hidden bg-slate-100">
        <img src={img} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" alt={product.title} />
        {/* Nhãn thời gian */}
        <div className="absolute bottom-1 right-1 rounded bg-black/50 px-1.5 py-0.5 text-[10px] text-white backdrop-blur-sm">
          {Utils.timeAgo(product.created_at)}
        </div>
        {/* Nhãn phổ biến */}
        {product.view_count > 100 && (
          <div className="absolute top-1 left-1 rounded bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white shadow-sm">
            HOT
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col p-3">
        <h3 className="line-clamp-2 text-sm font-medium text-slate-800 mb-1 h-10 leading-5">
          {product.title}
        </h3>
        <div className="mt-auto">
          <p className="text-base font-bold text-red-600">{Utils.formatCurrency(product.price)}</p>
          <div className="mt-1 flex items-center justify-between text-[10px] text-slate-400">
            <span className="flex items-center gap-0.5"><MapPin size={10} /> HCMUT</span>
            <span>Đã xem {product.view_count}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Component Sidebar (Drawer cho Mobile)
const FilterDrawer = ({ filters, onChange, isOpen, onClose }: any) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div className="drawer-overlay absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="drawer-content absolute inset-y-0 left-0 w-[80%] max-w-[320px] bg-white shadow-xl flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-bold">Bộ lọc</h2>
          <button onClick={onClose} className="p-2 bg-slate-100 rounded-full"><X size={20}/></button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Categories */}
          <div>
            <h3 className="font-bold mb-3 flex items-center gap-2"><LayoutGrid size={16}/> Danh mục</h3>
            <div className="grid grid-cols-2 gap-2">
              {CATEGORIES.map(cat => (
                <button 
                  key={cat.id} 
                  onClick={() => { onChange("category", cat.id); onClose(); }}
                  className={`p-2 text-xs rounded-lg border text-left flex items-center gap-2 ${filters.category === cat.id ? 'bg-blue-50 border-blue-500 text-blue-700 font-bold' : 'border-slate-100'}`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Price */}
          <div>
            <h3 className="font-bold mb-3 flex items-center gap-2"><Zap size={16}/> Giá tiền</h3>
            <div className="flex gap-2 mb-2">
              <input type="number" placeholder="Min" value={filters.minPrice} onChange={e => onChange("minPrice", e.target.value)} className="w-full p-2 border rounded text-sm"/>
              <input type="number" placeholder="Max" value={filters.maxPrice} onChange={e => onChange("maxPrice", e.target.value)} className="w-full p-2 border rounded text-sm"/>
            </div>
          </div>

          {/* Sort Mobile */}
          <div>
            <h3 className="font-bold mb-3 flex items-center gap-2"><ArrowUpDown size={16}/> Sắp xếp</h3>
            <div className="space-y-1">
              {SORT_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => { onChange("sort", opt.value); onClose(); }}
                  className={`w-full text-left p-2 rounded text-sm ${filters.sort === opt.value ? 'bg-blue-100 text-blue-700 font-bold' : 'text-slate-600'}`}
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
            className="w-full py-3 bg-[#00418E] text-white rounded-lg font-bold shadow-lg"
          >
            Áp dụng
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
    sort: SortOption.NEWEST,
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
      <div className="lg:hidden sticky top-0 z-30 bg-white border-b px-4 py-3 shadow-sm">
        <div className="flex gap-2">
          <div className="flex-1 relative">
             <input 
                value={filters.search}
                onChange={e => handleFilterChange("search", e.target.value)}
                placeholder="Tìm kiếm..." 
                className="w-full bg-slate-100 rounded-full py-2 pl-9 pr-4 text-sm outline-none"
             />
             <Search className="absolute top-2.5 left-3 text-slate-400" size={16}/>
          </div>
          <button 
            onClick={() => setIsMobileFilterOpen(true)}
            className="p-2 bg-slate-100 rounded-full text-slate-700 relative"
          >
             <SlidersHorizontal size={20}/>
             {filters.category !== 'all' && <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>}
          </button>
        </div>
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
            <p className="text-slate-500 mt-1">Tìm thấy <b>{total}</b> sản phẩm</p>
          </div>
          <div className="relative w-80">
            <input 
              value={filters.search}
              onChange={e => handleFilterChange("search", e.target.value)}
              placeholder="Tìm kiếm sản phẩm..." 
              className="w-full border rounded-xl py-3 pl-10 pr-4 shadow-sm outline-none focus:border-blue-500 transition-all"
            />
            <Search className="absolute top-3.5 left-3.5 text-slate-400" size={20}/>
          </div>
        </div>

        <div className="flex items-start gap-8">
          {/* SIDEBAR DESKTOP */}
          <aside className="hidden lg:block w-64 flex-shrink-0 sticky top-24 bg-white rounded-xl border p-4 shadow-sm h-fit">
            <div className="space-y-6">
              <div>
                <h3 className="font-bold mb-3 flex items-center gap-2 text-slate-800"><LayoutGrid size={18}/> Danh mục</h3>
                <div className="space-y-1">
                  {CATEGORIES.map(cat => (
                    <button 
                      key={cat.id}
                      onClick={() => handleFilterChange("category", cat.id)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${filters.category === cat.id ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="pt-4 border-t">
                 <h3 className="font-bold mb-3 flex items-center gap-2 text-slate-800"><Zap size={18}/> Giá</h3>
                 <div className="flex items-center gap-2">
                    <input type="number" placeholder="Min" className="w-full p-2 border rounded text-sm" onChange={e => handleFilterChange("minPrice", e.target.value)}/>
                    <span>-</span>
                    <input type="number" placeholder="Max" className="w-full p-2 border rounded text-sm" onChange={e => handleFilterChange("maxPrice", e.target.value)}/>
                 </div>
              </div>

              <button 
                onClick={() => { handleFilterChange("category", "all"); handleFilterChange("sort", SortOption.NEWEST); }}
                className="w-full py-2 border border-slate-200 text-slate-500 text-sm font-bold rounded-lg hover:text-red-500 hover:border-red-200"
              >
                Đặt lại
              </button>
            </div>
          </aside>

          {/* MAIN CONTENT */}
          <div className="flex-1 min-w-0">
            {/* Sort Tabs (Desktop + Mobile Horizontal Scroll) */}
            <div className="flex gap-2 overflow-x-auto hide-scrollbar mb-4 lg:mb-6 pb-1">
              {SORT_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => handleFilterChange("sort", opt.value)}
                  className={`whitespace-nowrap px-4 py-2 rounded-full text-xs lg:text-sm font-bold border transition-all ${filters.sort === opt.value ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200'}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* PRODUCT GRID (2 cột mobile, 4 cột desktop) */}
            {loading ? (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-6">
                 {[...Array(4)].map((_,i) => <div key={i} className="aspect-[3/4] bg-slate-200 rounded-lg animate-pulse"/>)}
              </div>
            ) : products.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 lg:gap-6">
                {products.map(p => <ProductCard key={p.id} product={p} />)}
              </div>
            ) : (
              // Empty State
              <div className="flex flex-col items-center justify-center py-16 bg-white rounded-xl border border-dashed">
                 <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4"><Ghost className="text-slate-300" size={32}/></div>
                 <h3 className="font-bold text-slate-700">Không tìm thấy sản phẩm</h3>
                 <button onClick={() => { handleFilterChange("category", "all"); handleFilterChange("search", ""); }} className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-full text-sm font-bold">Xóa bộ lọc</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MarketPage;
