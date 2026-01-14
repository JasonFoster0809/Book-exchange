import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Search, BookOpen, Monitor, Calculator, Shirt, MoreHorizontal,
  MapPin, Filter, ChevronDown, SlidersHorizontal, X, Clock,
  ArrowRight, LayoutGrid, List
} from "lucide-react";
import { supabase } from "../services/supabase";
import { Product } from "../types";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";

// ============================================================================
// 1. CONFIGURATION
// ============================================================================
const ITEMS_PER_PAGE = 12;

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
  MOST_VIEWED = "most_viewed",
}

interface FilterState {
  category: string;
  sort: SortOption;
  search: string;
  minPrice: number | "";
  maxPrice: number | "";
  condition: "all" | "new" | "used";
}

// ============================================================================
// 2. UTILS
// ============================================================================
const Utils = {
  formatCurrency: (amount: number) => 
    new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount),
  
  timeAgo: (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN');
  },

  cn: (...classes: (string | undefined | false)[]) => classes.filter(Boolean).join(" "),
};

// ============================================================================
// 3. STYLES (Clean & Professional)
// ============================================================================
const GlobalStyles = () => (
  <style>{`
    :root {
      --primary: #00388D; /* BK Blue Standard */
      --secondary: #00AEEF;
      --bg-color: #F3F4F6;
      --text-main: #1F2937;
      --text-muted: #6B7280;
    }
    
    body {
      background-color: var(--bg-color);
      color: var(--text-main);
      font-family: 'Inter', system-ui, sans-serif;
    }

    /* Professional Card */
    .pro-card {
      background: white;
      border: 1px solid #E5E7EB;
      border-radius: 8px;
      transition: all 0.2s ease-in-out;
    }
    .pro-card:hover {
      border-color: var(--secondary);
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      transform: translateY(-2px);
    }

    /* Form Elements */
    .pro-input {
      border: 1px solid #D1D5DB;
      border-radius: 6px;
      transition: border-color 0.2s;
    }
    .pro-input:focus {
      border-color: var(--primary);
      outline: none;
      box-shadow: 0 0 0 2px rgba(0, 56, 141, 0.1);
    }

    /* Buttons */
    .btn-primary {
      background-color: var(--primary);
      color: white;
      font-weight: 600;
      border-radius: 6px;
      transition: background-color 0.2s;
    }
    .btn-primary:hover { background-color: #002b6e; }

    .btn-outline {
      background-color: white;
      border: 1px solid #D1D5DB;
      color: var(--text-main);
      font-weight: 500;
      border-radius: 6px;
      transition: all 0.2s;
    }
    .btn-outline:hover { border-color: var(--text-muted); background-color: #F9FAFB; }

    /* Skeleton Loading */
    .skeleton {
      background-color: #E5E7EB;
      animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
    }
    @keyframes pulse { 50% { opacity: .5; } }

    .hide-scrollbar::-webkit-scrollbar { display: none; }
    
    /* Modal Backdrop */
    .modal-backdrop {
      background: rgba(0, 0, 0, 0.5);
      position: fixed; inset: 0; z-index: 50;
      display: flex; align-items: center; justify-content: center;
    }
  `}</style>
);

// ============================================================================
// 4. DATA LOGIC
// ============================================================================
function useProducts(filter: FilterState) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    setProducts([]); setPage(0); setHasMore(true); setLoading(true); fetchData(0, true);
  }, [filter]);

  const fetchData = async (pageIdx: number, isNewFilter = false) => {
    try {
      let query = supabase.from("products").select("*", { count: 'exact' }).eq("status", "available");

      if (filter.category !== "all") query = query.eq("category", filter.category);
      if (filter.search) query = query.ilike("title", `%${filter.search}%`);
      if (filter.minPrice !== "") query = query.gte("price", filter.minPrice);
      if (filter.maxPrice !== "") query = query.lte("price", filter.maxPrice);
      if (filter.condition !== "all") query = query.eq("condition", filter.condition);

      switch(filter.sort) {
        case SortOption.PRICE_ASC: query = query.order("price", { ascending: true }); break;
        case SortOption.PRICE_DESC: query = query.order("price", { ascending: false }); break;
        case SortOption.MOST_VIEWED: query = query.order("view_count", { ascending: false }); break;
        default: query = query.order("created_at", { ascending: false });
      }

      const { data, error, count } = await query.range(pageIdx * ITEMS_PER_PAGE, (pageIdx * ITEMS_PER_PAGE) + ITEMS_PER_PAGE - 1);
      if (error) throw error;

      if (count !== null) setTotalCount(count);
      if (data.length < ITEMS_PER_PAGE) setHasMore(false);
      
      setProducts(prev => isNewFilter ? data : [...prev, ...data]);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const loadMore = () => { if (!loading && hasMore) { setPage(p => p + 1); fetchData(page + 1); } };
  return { products, loading, hasMore, loadMore, totalCount };
}

// ============================================================================
// 5. COMPONENTS
// ============================================================================

const FilterModal = ({ filter, setFilter, onClose }: { filter: FilterState, setFilter: any, onClose: () => void }) => (
  <div className="modal-backdrop" onClick={onClose}>
    <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl" onClick={e => e.stopPropagation()}>
      <div className="flex justify-between items-center mb-6 border-b pb-4">
        <h3 className="text-lg font-bold text-slate-800">Bộ lọc tìm kiếm</h3>
        <button onClick={onClose}><X size={20} className="text-slate-500 hover:text-slate-800"/></button>
      </div>
      
      <div className="space-y-6">
        <div>
          <label className="text-sm font-medium text-slate-700 mb-2 block">Khoảng giá (VNĐ)</label>
          <div className="flex gap-4 items-center">
            <input 
              type="number" placeholder="0" className="pro-input w-full p-2.5 text-sm"
              value={filter.minPrice} onChange={e => setFilter({ ...filter, minPrice: e.target.value })}
            />
            <span className="text-slate-400">-</span>
            <input 
              type="number" placeholder="Tối đa" className="pro-input w-full p-2.5 text-sm"
              value={filter.maxPrice} onChange={e => setFilter({ ...filter, maxPrice: e.target.value })}
            />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700 mb-2 block">Tình trạng sản phẩm</label>
          <div className="flex gap-2">
            {[
              { id: 'all', label: 'Tất cả' },
              { id: 'new', label: 'Mới' },
              { id: 'used', label: 'Cũ' }
            ].map(opt => (
              <button 
                key={opt.id}
                onClick={() => setFilter({ ...filter, condition: opt.id })}
                className={`flex-1 py-2 rounded text-sm font-medium border ${filter.condition === opt.id ? 'bg-blue-50 border-blue-600 text-blue-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-8 flex gap-3">
        <button 
          onClick={() => setFilter({ ...filter, minPrice: "", maxPrice: "", condition: "all" })}
          className="flex-1 py-2.5 btn-outline text-sm"
        >
          Đặt lại
        </button>
        <button 
          onClick={onClose}
          className="flex-1 py-2.5 btn-primary text-sm"
        >
          Áp dụng
        </button>
      </div>
    </div>
  </div>
);

const ProductCard: React.FC<{ product: Product }> = ({ product }) => {
  const navigate = useNavigate();
  return (
    <div onClick={() => navigate(`/product/${product.id}`)} className="pro-card group cursor-pointer flex flex-col h-full bg-white overflow-hidden">
      <div className="relative aspect-[4/3] bg-gray-100 overflow-hidden border-b border-gray-100">
        <img 
          src={product.images?.[0] || 'https://via.placeholder.com/300'} 
          alt={product.title} 
          className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />
        {/* Simple Badge */}
        {product.condition === 'new' && (
          <span className="absolute top-2 right-2 bg-blue-600 text-white text-[10px] font-bold px-2 py-1 rounded shadow-sm">MỚI</span>
        )}
      </div>
      
      <div className="p-4 flex flex-col flex-1">
        <div className="flex justify-between items-start mb-2">
          <span className="text-xs font-medium text-blue-600 uppercase tracking-wide">{product.category}</span>
          <span className="text-xs text-gray-400">{Utils.timeAgo(product.created_at)}</span>
        </div>
        
        <h3 className="text-sm font-bold text-gray-900 line-clamp-2 mb-auto group-hover:text-blue-700 transition-colors">
          {product.title}
        </h3>
        
        <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
          <span className="text-base font-bold text-red-600">
            {product.price === 0 ? "Thỏa thuận" : Utils.formatCurrency(product.price)}
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
// 6. MAIN PAGE
// ============================================================================
const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<FilterState>({ category: "all", sort: SortOption.NEWEST, search: "", minPrice: "", maxPrice: "", condition: "all" });
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilterModal, setShowFilterModal] = useState(false);
  
  // Debounce Search
  useEffect(() => {
    const t = setTimeout(() => setFilter(p => ({...p, search: searchTerm})), 500);
    return () => clearTimeout(t);
  }, [searchTerm]);

  const { products, loading, hasMore, loadMore, totalCount } = useProducts(filter);

  return (
    <div className="min-h-screen pb-12 font-sans">
      <GlobalStyles />
      
      {showFilterModal && <FilterModal filter={filter} setFilter={setFilter} onClose={() => setShowFilterModal(false)} />}

      {/* --- HERO SECTION (CLEAN) --- */}
      <section className="bg-white border-b border-gray-200 pt-12 pb-16 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-4 tracking-tight">
            Sàn Giao Dịch Sinh Viên <span className="text-[#00388D]">Bách Khoa</span>
          </h1>
          <p className="text-slate-600 mb-8 max-w-2xl mx-auto text-base">
            Nơi trao đổi giáo trình, tài liệu, thiết bị điện tử và dụng cụ học tập uy tín, an toàn dành riêng cho cộng đồng sinh viên HCMUT.
          </p>

          {/* Search Box */}
          <div className="max-w-2xl mx-auto relative">
            <div className="flex shadow-sm rounded-lg overflow-hidden border border-gray-300 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition-all">
              <div className="bg-gray-50 px-4 flex items-center border-r border-gray-200">
                <Search className="text-gray-400" size={20} />
              </div>
              <input 
                type="text"
                className="flex-1 py-3 px-4 text-gray-900 placeholder-gray-500 outline-none"
                placeholder="Tìm kiếm sách, máy tính, tài liệu..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <button 
                onClick={() => setShowFilterModal(true)}
                className="bg-white px-4 border-l border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-blue-600 transition-colors"
                title="Bộ lọc nâng cao"
              >
                <SlidersHorizontal size={20} />
              </button>
              <button 
                onClick={() => navigate(`/market?search=${searchTerm}`)}
                className="bg-[#00388D] text-white px-6 py-3 font-semibold hover:bg-[#002b6e] transition-colors"
              >
                Tìm kiếm
              </button>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="flex justify-center gap-8 mt-8 text-sm text-gray-500">
            <div className="flex items-center gap-2"><BookOpen size={16} className="text-blue-600"/> <strong>2,500+</strong> Giáo trình</div>
            <div className="flex items-center gap-2"><Monitor size={16} className="text-blue-600"/> <strong>1,200+</strong> Thiết bị</div>
            <div className="flex items-center gap-2"><Users size={16} className="text-blue-600"/> <strong>15k+</strong> Sinh viên</div>
          </div>
        </div>
      </section>

      {/* --- MAIN CONTENT --- */}
      <section className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row gap-8">
          
          {/* LEFT: CATEGORIES & SIDEBAR */}
          <div className="w-full md:w-64 flex-shrink-0 space-y-6">
            <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <LayoutGrid size={18}/> Danh mục
              </h3>
              <div className="space-y-1">
                {[
                  { id: "all", label: "Tất cả sản phẩm" },
                  { id: ProductCategory.TEXTBOOK, label: "Sách & Giáo trình" },
                  { id: ProductCategory.ELECTRONICS, label: "Điện tử & Laptop" },
                  { id: ProductCategory.SUPPLIES, label: "Dụng cụ học tập" },
                  { id: ProductCategory.CLOTHING, label: "Đồng phục & Khác" },
                ].map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setFilter({ ...filter, category: cat.id })}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${filter.category === cat.id ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-blue-50 rounded-lg border border-blue-100 p-4">
              <h4 className="font-bold text-blue-800 mb-2 text-sm">Bạn cần bán đồ?</h4>
              <p className="text-xs text-blue-600 mb-3">Đăng tin miễn phí, tiếp cận hàng ngàn sinh viên Bách Khoa ngay hôm nay.</p>
              <button 
                onClick={() => navigate('/post-item')}
                className="w-full py-2 bg-white border border-blue-200 text-blue-700 text-sm font-bold rounded hover:bg-blue-100 transition-colors"
              >
                Đăng tin ngay
              </button>
            </div>
          </div>

          {/* RIGHT: PRODUCTS GRID */}
          <div className="flex-1">
            {/* Header Sort */}
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900">
                {filter.category === 'all' ? 'Tin đăng mới nhất' : 'Kết quả lọc'}
              </h2>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500 hidden sm:inline">Sắp xếp:</span>
                <select 
                  className="bg-white border border-gray-300 text-gray-700 text-sm rounded-md px-3 py-1.5 outline-none focus:border-blue-500"
                  value={filter.sort}
                  onChange={e => setFilter({ ...filter, sort: e.target.value as SortOption })}
                >
                  <option value={SortOption.NEWEST}>Mới nhất</option>
                  <option value={SortOption.PRICE_ASC}>Giá thấp đến cao</option>
                  <option value={SortOption.PRICE_DESC}>Giá cao đến thấp</option>
                </select>
              </div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {loading && products.length === 0 ? (
                [...Array(8)].map((_, i) => (
                  <div key={i} className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
                    <div className="h-40 bg-gray-200 rounded skeleton"/>
                    <div className="h-4 w-3/4 bg-gray-200 rounded skeleton"/>
                    <div className="h-4 w-1/2 bg-gray-200 rounded skeleton"/>
                  </div>
                ))
              ) : products.length > 0 ? (
                products.map(p => <ProductCard key={p.id} product={p} />)
              ) : (
                <div className="col-span-full py-16 text-center bg-white border border-gray-200 rounded-lg">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Search className="text-gray-400" size={32}/>
                  </div>
                  <h3 className="text-lg font-bold text-gray-800">Không tìm thấy sản phẩm</h3>
                  <p className="text-gray-500 text-sm mt-1 mb-4">Thử thay đổi từ khóa hoặc bộ lọc của bạn.</p>
                  <button 
                    onClick={() => {
                      setFilter({ category: 'all', sort: SortOption.NEWEST, search: '', minPrice: "", maxPrice: "", condition: "all" });
                      setSearchTerm("");
                    }} 
                    className="text-blue-600 font-bold text-sm hover:underline"
                  >
                    Xóa bộ lọc
                  </button>
                </div>
              )}
            </div>

            {/* Load More */}
            {products.length > 0 && hasMore && (
              <div className="mt-10 text-center">
                <button 
                  onClick={loadMore} 
                  disabled={loading}
                  className="px-6 py-2.5 bg-white border border-gray-300 text-gray-700 font-medium rounded-md hover:bg-gray-50 hover:border-gray-400 transition-all disabled:opacity-50"
                >
                  {loading ? "Đang tải..." : "Xem thêm sản phẩm"}
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* --- FOOTER --- */}
      <footer className="bg-white border-t border-gray-200 pt-12 pb-8 mt-12">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-[#00388D] rounded flex items-center justify-center text-white font-bold">BK</div>
              <span className="text-lg font-bold text-[#00388D]">BK Market</span>
            </div>
            <p className="text-sm text-gray-500 mb-4">Cộng đồng trao đổi hàng đầu dành cho sinh viên Bách Khoa.</p>
            <p className="text-xs text-gray-400">© 2026 HCMUT Student Project.</p>
          </div>
          
          <div>
            <h4 className="font-bold text-gray-900 mb-4 text-sm uppercase">Về chúng tôi</h4>
            <ul className="space-y-2 text-sm text-gray-600">
              <li><Link to="/about" className="hover:text-blue-600">Giới thiệu</Link></li>
              <li><Link to="/rules" className="hover:text-blue-600">Quy chế hoạt động</Link></li>
              <li><Link to="/privacy" className="hover:text-blue-600">Chính sách bảo mật</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-gray-900 mb-4 text-sm uppercase">Hỗ trợ</h4>
            <ul className="space-y-2 text-sm text-gray-600">
              <li><a href="#" className="hover:text-blue-600">Trung tâm trợ giúp</a></li>
              <li><a href="#" className="hover:text-blue-600">Báo cáo vi phạm</a></li>
              <li><a href="#" className="hover:text-blue-600">Liên hệ admin</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-gray-900 mb-4 text-sm uppercase">Liên hệ</h4>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>268 Lý Thường Kiệt, Q.10, TP.HCM</li>
              <li>Email: support@bkmart.vn</li>
              <li>Hotline: (028) 3864 7256</li>
            </ul>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
