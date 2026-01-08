import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Search,
  ShoppingBag,
  WifiOff,
  Ghost,
  RefreshCw,
  Grid,
  SlidersHorizontal,
  ArrowUpDown,
  BookOpen,
  Monitor,
  Calculator,
  Shirt,
  MoreHorizontal,
  X,
} from "lucide-react";
import { supabase } from "../services/supabase";
import ProductCard from "../components/ProductCard";
import { Product, ProductCategory, SortOption } from "../types";

// --- CONFIG ---
const CATEGORIES = [
  { id: "all", label: "Tất cả", icon: <Grid size={16} /> },
  {
    id: ProductCategory.TEXTBOOK,
    label: "Giáo trình",
    icon: <BookOpen size={16} />,
  },
  {
    id: ProductCategory.ELECTRONICS,
    label: "Điện tử",
    icon: <Monitor size={16} />,
  },
  {
    id: ProductCategory.SUPPLIES,
    label: "Dụng cụ",
    icon: <Calculator size={16} />,
  },
  { id: ProductCategory.CLOTHING, label: "Quần áo", icon: <Shirt size={16} /> },
  {
    id: ProductCategory.OTHER,
    label: "Khác",
    icon: <MoreHorizontal size={16} />,
  },
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
    :root { --primary: #00418E; }
    body { background-color: #F8FAFC; color: #0F172A; }
    .glass-bar { 
      background: rgba(255, 255, 255, 0.85); 
      backdrop-filter: blur(16px); 
      border-bottom: 1px solid rgba(255, 255, 255, 0.5); 
      box-shadow: 0 4px 30px rgba(0, 0, 0, 0.03); 
    }
    .animate-enter { animation: slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; opacity: 0; }
    @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
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
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Sync URL Params
  useEffect(() => {
    const querySearch = searchParams.get("search");
    if (querySearch !== search) {
      const params = new URLSearchParams(searchParams);
      if (search) params.set("search", search);
      else params.delete("search");
      setSearchParams(params, { replace: true });
    }
  }, [search]);

  // Fetch Data Logic
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase
        .from("products")
        .select("*")
        .eq("status", "available"); // Chỉ lấy tin còn hàng

      // 1. Filter Category
      if (category !== "all") {
        query = query.eq("category", category);
      }

      // 2. Filter Search
      if (search) {
        query = query.ilike("title", `%${search}%`);
      }

      // 3. Sort
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
        default:
          query = query.order("created_at", { ascending: false });
      }

      const { data, error: dbError } = await query.limit(50);

      if (dbError) throw dbError;

      // 4. MAP DATA (Snake_case -> CamelCase)
      // Bước này cực quan trọng để khớp với ProductCard
      const mappedProducts: Product[] = (data || []).map((p: any) => ({
        ...p,
        sellerId: p.seller_id, // Map từ DB
        postedAt: p.created_at, // Map từ DB
        tradeMethod: p.trade_method, // Map từ DB
        location: p.location_name || "TP.HCM", // Map từ DB (có fallback)
        images: p.images || [],
        view_count: p.view_count || 0,
      }));

      setProducts(mappedProducts);
    } catch (err: any) {
      console.error(err);
      setError("Không thể tải dữ liệu. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  }, [category, sort, search]);

  // Debounce search fetch
  useEffect(() => {
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
        <div className="mx-auto max-w-7xl space-y-3">
          {/* Top Row */}
          <div className="flex items-center gap-3">
            {/* Search Input */}
            <div className="group relative flex-1">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-[#00418E]"
                size={20}
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm kiếm sản phẩm..."
                className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-10 font-medium text-slate-700 shadow-sm outline-none transition-all focus:border-[#00418E] focus:ring-4 focus:ring-blue-500/10"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-red-500"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {/* Mobile Filter Toggle */}
            <button
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className={`rounded-xl border p-3 transition-all md:hidden ${isFilterOpen ? "border-[#00418E] bg-[#00418E] text-white" : "border-slate-200 bg-white text-slate-600"}`}
            >
              <SlidersHorizontal size={20} />
            </button>

            {/* Desktop Sort */}
            <div className="group relative hidden md:block">
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortOption)}
                className="min-w-[180px] cursor-pointer appearance-none rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-8 text-sm font-bold text-slate-700 shadow-sm outline-none transition-all focus:border-[#00418E] focus:ring-4 focus:ring-blue-500/10 hover:border-slate-300"
              >
                {SORTS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
              <ArrowUpDown
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                size={16}
              />
            </div>
          </div>

          {/* Bottom Row (Filters) */}
          <div
            className={`flex-col items-start justify-between gap-4 md:flex md:flex-row md:items-center ${isFilterOpen ? "flex" : "hidden"}`}
          >
            {/* Categories */}
            <div className="hide-scrollbar flex w-full gap-2 overflow-x-auto pb-1">
              {CATEGORIES.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setCategory(c.id)}
                  className={`flex items-center gap-2 whitespace-nowrap rounded-lg border px-4 py-2 text-xs font-bold transition-all ${
                    category === c.id
                      ? "border-[#00418E] bg-[#00418E] text-white shadow-lg shadow-blue-900/20"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  {c.icon}
                  {c.label}
                </button>
              ))}
            </div>

            {/* Mobile Sort */}
            <div className="relative w-full md:hidden">
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortOption)}
                className="w-full appearance-none rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm font-bold text-slate-700 outline-none"
              >
                {SORTS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
              <ArrowUpDown
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                size={16}
              />
            </div>
          </div>
        </div>
      </div>

      {/* --- CONTENT AREA --- */}
      <div className="mx-auto mt-8 max-w-7xl px-4">
        {/* Results Header */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-xl font-bold text-slate-800">
            <ShoppingBag className="text-[#00418E]" />
            Kết quả tìm kiếm
            <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-sm font-medium text-slate-500">
              {loading ? "..." : products.length}
            </span>
          </h2>
          {!loading && (
            <button
              onClick={fetchProducts}
              className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-[#00418E]"
              title="Làm mới"
            >
              <RefreshCw size={18} />
            </button>
          )}
        </div>

        {/* Product Grid */}
        {loading ? (
          <div className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="flex h-[320px] animate-pulse flex-col gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"
              >
                <div className="h-[180px] w-full rounded-xl bg-slate-200"></div>
                <div className="h-4 w-3/4 rounded bg-slate-200"></div>
                <div className="h-4 w-1/2 rounded bg-slate-200"></div>
                <div className="mt-auto h-10 w-full rounded-xl bg-slate-200"></div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="rounded-3xl border border-red-100 bg-red-50 py-20 text-center">
            <WifiOff size={48} className="mx-auto mb-4 text-red-400" />
            <h3 className="mb-2 text-lg font-bold text-red-900">
              Lỗi kết nối
            </h3>
            <p className="mb-4 text-red-700">{error}</p>
            <button
              onClick={fetchProducts}
              className="rounded-lg border border-red-200 bg-white px-6 py-2 font-bold text-red-600 hover:bg-red-50"
            >
              Thử lại
            </button>
          </div>
        ) : products.length === 0 ? (
          <div className="rounded-[2rem] border-2 border-dashed border-slate-200 bg-white/50 py-24 text-center">
            <Ghost size={64} className="mx-auto mb-6 text-slate-300" />
            <h3 className="mb-2 text-xl font-bold text-slate-700">
              Không tìm thấy sản phẩm nào
            </h3>
            <p className="mx-auto max-w-md text-slate-500">
              Thử thay đổi từ khóa tìm kiếm hoặc chọn danh mục khác xem sao.
            </p>
            <button
              onClick={() => {
                setSearch("");
                setCategory("all");
              }}
              className="mt-6 rounded-xl bg-[#00418E] px-6 py-2.5 font-bold text-white shadow-lg transition-transform hover:scale-105 hover:shadow-blue-500/30"
            >
              Xóa bộ lọc
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4">
            {products.map((p, index) => (
              <div
                key={p.id}
                className="animate-enter"
                style={{ animationDelay: `${index * 50}ms` }}
              >
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
