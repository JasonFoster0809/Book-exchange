import React, {
  useState,
  useEffect,
  useCallback,
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
} from "lucide-react";

// --- QUAN TRỌNG: Đảm bảo đường dẫn import này đúng trong project của bạn ---
// Nếu chưa config supabase, code vẫn sẽ chạy bằng Mock Data (Dữ liệu giả)
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
  PRICE_ASC = "price_asc",
  PRICE_DESC = "price_desc",
  POPULAR = "popular",
}

interface Product {
  id: ID;
  title: string;
  price: number;
  images: string[];
  category: string; // Để string lỏng lẻo hơn để tránh lỗi khớp type
  status: string;
  condition: string;
  seller_id: ID;
  created_at: string;
  updated_at?: string;
  view_count: number;
  seller_avatar?: string;
}

interface FilterState {
  search: string;
  category: string; // Đổi thành string để linh hoạt
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
  { value: SortOption.PRICE_ASC, label: "Giá thấp đến cao" },
  { value: SortOption.PRICE_DESC, label: "Giá cao đến thấp" },
];

// ============================================================================
// 2. STYLES (Visual Engine)
// ============================================================================
const VisualEngine = () => (
  <style>{`
    :root { --primary: #00418E; --secondary: #00B0F0; --dark: #0F172A; }
    body { background-color: #F8FAFC; color: #334155; }
    
    ::-webkit-scrollbar { width: 6px; }
    ::-webkit-scrollbar-thumb { background: #CBD5E1; border-radius: 10px; }
    
    .product-card {
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      border: 1px solid #E2E8F0;
    }
    .product-card:hover {
      transform: translateY(-5px);
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
      border-color: var(--secondary);
    }
    
    .animate-enter { animation: slideUp 0.4s ease-out forwards; }
    @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
    
    .skeleton-wave {
      background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
    }
    @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
  `}</style>
);

// ============================================================================
// 3. UTILS & HOOKS
// ============================================================================

const Utils = {
  formatCurrency: (n: number) =>
    new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(n),
  timeAgo: (date: string) => {
    if (!date) return "Vừa xong";
    const diff = (new Date().getTime() - new Date(date).getTime()) / 1000;
    if (diff < 60) return "Vừa xong";
    if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
    return `${Math.floor(diff / 86400)} ngày trước`;
  },
};

// Dữ liệu mẫu dùng khi DB trống hoặc lỗi
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
    created_at: new Date(Date.now() - 3600000).toISOString(),
    view_count: 120
  },
  {
    id: "mock-2",
    title: "Máy tính Casio FX-580VN X - Bảo hành dài",
    price: 450000,
    images: ["https://cdn.nguyenkimmall.com/images/detailed/645/10046644-may-tinh-khoa-hoc-casio-fx-580vn-x-1.jpg"],
    category: "electronics",
    status: "available",
    condition: "good",
    seller_id: "s2",
    created_at: new Date(Date.now() - 7200000).toISOString(),
    view_count: 50
  },
  {
    id: "mock-3",
    title: "Bộ thước vẽ kỹ thuật Rotring",
    price: 150000,
    images: [], // Test trường hợp không có ảnh
    category: "supplies",
    status: "available",
    condition: "new",
    seller_id: "s3",
    created_at: new Date(Date.now() - 86400000).toISOString(),
    view_count: 10
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
    created_at: new Date(Date.now() - 100000000).toISOString(),
    view_count: 200
  }
];

const useMarketData = (filters: FilterState) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Cấu hình Query
      let query = supabase
        .from("products")
        .select("*", { count: "exact" });
      
      // -- Lọc --
      if (filters.category !== "all") {
        query = query.eq("category", filters.category);
      }
      
      if (filters.search) {
        query = query.ilike("title", `%${filters.search}%`);
      }

      if (filters.minPrice && !isNaN(parseInt(filters.minPrice))) {
        query = query.gte("price", parseInt(filters.minPrice));
      }
      if (filters.maxPrice && !isNaN(parseInt(filters.maxPrice))) {
        query = query.lte("price", parseInt(filters.maxPrice));
      }

      if (filters.condition !== "all") {
        query = query.eq("condition", filters.condition);
      }

      // -- Sắp xếp --
      switch (filters.sort) {
        case SortOption.NEWEST:
          query = query.order("created_at", { ascending: false });
          break;
        case SortOption.PRICE_ASC:
          query = query.order("price", { ascending: true });
          break;
        case SortOption.PRICE_DESC:
          query = query.order("price", { ascending: false });
          break;
        default:
          query = query.order("created_at", { ascending: false });
      }

      // 2. Thực thi Query
      const { data, count, error } = await query;

      // 3. Xử lý kết quả & Fallback Mock Data
      if (error || !data || data.length === 0) {
        console.warn("Không lấy được dữ liệu từ DB hoặc DB trống. Đang dùng Mock Data để hiển thị.");
        
        // Lọc Mock Data theo filter hiện tại (giả lập logic backend)
        let mockResult = [...MOCK_PRODUCTS];
        if (filters.category !== "all") {
          mockResult = mockResult.filter(p => p.category === filters.category);
        }
        if (filters.search) {
          mockResult = mockResult.filter(p => p.title.toLowerCase().includes(filters.search.toLowerCase()));
        }

        setProducts(mockResult);
        setTotal(mockResult.length);
      } else {
        // Dữ liệu thật từ Supabase
        console.log("Đã lấy được dữ liệu từ Supabase:", data);
        setProducts(data.map((p: any) => ({
          ...p,
          images: Array.isArray(p.images) ? p.images : [], // Đảm bảo luôn là mảng
        })));
        setTotal(count || 0);
      }

    } catch (err) {
      console.error("Lỗi nghiêm trọng:", err);
      // Fallback an toàn cuối cùng
      setProducts(MOCK_PRODUCTS);
      setTotal(MOCK_PRODUCTS.length);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  return { products, loading, total, refetch: fetchProducts };
};

// ============================================================================
// 4. COMPONENTS
// ============================================================================

const ProductSkeleton = () => (
  <div className="space-y-3 rounded-2xl border border-slate-100 bg-white p-3">
    <div className="skeleton-wave aspect-4/3 w-full rounded-xl" />
    <div className="space-y-2">
      <div className="skeleton-wave h-4 w-3/4 rounded" />
      <div className="skeleton-wave h-4 w-1/2 rounded" />
    </div>
  </div>
);

const ProductCard = ({ product }: { product: Product }) => {
  const navigate = useNavigate();
  
  // Xử lý ảnh: Nếu mảng rỗng hoặc null, dùng ảnh mặc định
  const displayImage = (product.images && product.images.length > 0) 
    ? product.images[0] 
    : "https://via.placeholder.com/300?text=BK+Market";

  return (
    <div
      onClick={() => navigate(`/product/${product.id}`)}
      className="product-card group relative flex h-full cursor-pointer flex-col overflow-hidden rounded-2xl bg-white"
    >
      {/* Image Area */}
      <div className="relative aspect-4/3 overflow-hidden bg-slate-100">
        <img
          src={displayImage}
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
          alt={product.title}
          onError={(e) => {
            // Fallback nếu link ảnh bị lỗi 404
            (e.target as HTMLImageElement).src = "https://via.placeholder.com/300?text=No+Image";
          }}
        />
        <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/20 opacity-0 transition-opacity group-hover:opacity-100">
          <button className="translate-y-4 transform rounded-full bg-white p-2 text-slate-800 shadow-lg transition-all duration-300 group-hover:translate-y-0 hover:bg-blue-50">
            <ShoppingBag size={18} />
          </button>
        </div>
        <span className="absolute right-2 bottom-2 flex items-center gap-1 rounded bg-black/60 px-2 py-1 text-[10px] font-bold text-white backdrop-blur">
          <Clock size={10} className="text-blue-300" /> {Utils.timeAgo(product.created_at)}
        </span>
      </div>

      {/* Info Area */}
      <div className="flex flex-1 flex-col p-4">
        <div className="mb-2">
          <span className="rounded border border-blue-100 bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-600 uppercase">
            {product.category}
          </span>
        </div>
        <h3 className="mb-1 line-clamp-2 flex-1 text-sm leading-snug font-bold text-slate-800 transition-colors group-hover:text-blue-600">
          {product.title}
        </h3>
        <div className="mt-3 flex items-end justify-between border-t border-slate-50 pt-3">
          <div>
            <p className="text-xs font-medium text-slate-400">Giá bán</p>
            <p className="text-lg font-black text-slate-900">
              {product.price === 0 ? "0đ" : Utils.formatCurrency(product.price)}
            </p>
          </div>
          <div className="flex items-center gap-1 text-xs text-slate-400">
            <MapPin size={12} /> HCMUT
          </div>
        </div>
      </div>
    </div>
  );
};

const FilterSidebar = ({
  filters,
  onChange,
  isOpen,
  onClose,
}: {
  filters: FilterState;
  onChange: (key: keyof FilterState, val: any) => void;
  isOpen: boolean;
  onClose: () => void;
}) => {
  return (
    <>
      {isOpen && <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={onClose} />}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-72 transform bg-white transition-transform duration-300 ease-in-out lg:sticky lg:top-24 lg:z-0 lg:h-[calc(100vh-120px)] lg:bg-transparent ${isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"} hide-scrollbar overflow-y-auto border-r border-slate-200 p-6 lg:border-none lg:p-0`}
      >
        <div className="mb-6 flex items-center justify-between lg:hidden">
          <h2 className="text-xl font-bold">Bộ lọc</h2>
          <button onClick={onClose}><X /></button>
        </div>
        <div className="space-y-8">
          {/* Categories */}
          <div>
            <h3 className="mb-4 flex items-center gap-2 font-black text-slate-800">
              <LayoutGrid size={18} /> Danh mục
            </h3>
            <div className="space-y-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => onChange("category", cat.id)}
                  className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all ${filters.category === cat.id ? "bg-blue-600 text-white shadow-md shadow-blue-500/20" : "border border-slate-100 bg-white text-slate-600 hover:bg-blue-50"}`}
                >
                  {React.cloneElement(cat.icon as React.ReactElement, { size: 18 })}
                  {cat.label}
                  {filters.category === cat.id && <CheckCircle2 size={16} className="ml-auto" />}
                </button>
              ))}
            </div>
          </div>

          {/* Price Range */}
          <div>
            <h3 className="mb-4 flex items-center gap-2 font-black text-slate-800"><Zap size={18} /> Khoảng giá</h3>
            <div className="mb-4 flex items-center gap-2">
              <input type="number" placeholder="Min" value={filters.minPrice} onChange={(e) => onChange("minPrice", e.target.value)} className="w-full rounded-lg border border-slate-200 bg-white py-2 px-3 text-sm outline-none focus:border-blue-500" />
              <span className="text-slate-400">-</span>
              <input type="number" placeholder="Max" value={filters.maxPrice} onChange={(e) => onChange("maxPrice", e.target.value)} className="w-full rounded-lg border border-slate-200 bg-white py-2 px-3 text-sm outline-none focus:border-blue-500" />
            </div>
          </div>

          <button onClick={() => { onChange("category", "all"); onChange("minPrice", ""); onChange("maxPrice", ""); onChange("condition", "all"); }} className="flex w-full items-center justify-center gap-2 border-t border-slate-200 py-3 pt-6 text-sm font-bold text-slate-500 transition-colors hover:text-red-500">
            <RotateCcw size={16} /> Đặt lại bộ lọc
          </button>
        </div>
      </aside>
    </>
  );
};

// ============================================================================
// 5. MAIN PAGE
// ============================================================================

const MarketPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  // State bộ lọc
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
    <div className="min-h-screen pt-20 pb-20">
      <VisualEngine />

      <div className="pointer-events-none fixed inset-0 z-[-1] overflow-hidden">
        <div className="absolute top-0 right-0 h-[600px] w-[600px] rounded-full bg-blue-500/5 blur-[120px]" />
        <div className="absolute bottom-0 left-0 h-[500px] w-[500px] rounded-full bg-cyan-500/5 blur-[100px]" />
      </div>

      <div className="mx-auto max-w-7xl px-4">
        {/* HEADER */}
        <div className="animate-enter mb-8 flex flex-col items-end justify-between gap-4 md:flex-row">
          <div>
            <h1 className="mb-2 text-3xl font-black text-slate-900 md:text-4xl">Thị trường</h1>
            <p className="text-slate-500">Tìm thấy <span className="font-bold text-[#00418E]">{total}</span> sản phẩm phù hợp.</p>
          </div>
          <div className="flex w-full items-center gap-3 md:w-auto">
            <div className="group relative flex-1 md:w-80">
              <input value={filters.search} onChange={(e) => handleFilterChange("search", e.target.value)} placeholder="Tìm kiếm sản phẩm..." className="w-full rounded-xl border border-slate-200 bg-white py-3 pr-4 pl-10 shadow-sm transition-all outline-none focus:border-[#00418E] focus:ring-4 focus:ring-blue-500/10" />
              <Search className="absolute top-1/2 left-3 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-[#00418E]" size={20} />
            </div>
            <button onClick={() => setIsMobileFilterOpen(true)} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm lg:hidden"><SlidersHorizontal size={20} /></button>
          </div>
        </div>

        {/* LAYOUT CHÍNH */}
        <div className="flex items-start gap-8">
          <FilterSidebar filters={filters} onChange={handleFilterChange} isOpen={isMobileFilterOpen} onClose={() => setIsMobileFilterOpen(false)} />

          <div className="w-full min-w-0 flex-1">
            {/* Sort Bar */}
            <div className="animate-enter mb-6 flex items-center justify-between rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
              <div className="hide-scrollbar flex gap-2 overflow-x-auto px-2">
                {SORT_OPTIONS.map((opt) => (
                  <button key={opt.value} onClick={() => handleFilterChange("sort", opt.value)} className={`rounded-lg px-4 py-2 text-xs font-bold whitespace-nowrap transition-all ${filters.sort === opt.value ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-100"}`}>{opt.label}</button>
                ))}
              </div>
            </div>

            {/* Grid Sản phẩm */}
            <div className="animate-enter grid grid-cols-2 gap-6 md:grid-cols-3 xl:grid-cols-4" style={{ animationDelay: "100ms" }}>
              {loading ? (
                [...Array(8)].map((_, i) => <ProductSkeleton key={i} />)
              ) : products.length > 0 ? (
                products.map((product) => <ProductCard key={product.id} product={product} />)
              ) : (
                // Trạng thái trống (Con ma)
                <div className="col-span-full rounded-3xl border-2 border-dashed border-slate-200 bg-white py-20 text-center">
                  <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-slate-50">
                    <Ghost size={48} className="text-slate-300" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-800">Không tìm thấy sản phẩm</h3>
                  <button onClick={() => { handleFilterChange("category", "all"); handleFilterChange("search", ""); }} className="mt-6 rounded-full bg-[#00418E] px-6 py-2 text-sm font-bold text-white shadow-lg">Xóa bộ lọc</button>
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
