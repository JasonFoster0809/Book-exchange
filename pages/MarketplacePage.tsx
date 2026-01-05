import React, { useState, useEffect, useReducer, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Search, Filter, ShoppingBag, MapPin, Heart, SlidersHorizontal, 
  ChevronDown, X, Star, Zap, LayoutGrid, List, ArrowUpRight, 
  Loader2, Ghost, Package, Monitor, BookOpen, Shirt, Calculator, 
  MoreHorizontal, RotateCcw, CheckCircle2, Clock
} from 'lucide-react';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';

// ============================================================================
// 1. TYPES & CONFIG
// ============================================================================

type ID = string | number;

enum ProductCategory {
  TEXTBOOK = 'textbook',
  ELECTRONICS = 'electronics',
  SUPPLIES = 'supplies',
  CLOTHING = 'clothing',
  OTHER = 'other',
}

enum SortOption {
  NEWEST = 'newest',
  PRICE_ASC = 'price_asc',
  PRICE_DESC = 'price_desc',
  POPULAR = 'popular',
}

interface Product {
  id: ID;
  title: string;
  price: number;
  images: string[];
  category: ProductCategory;
  status: string;
  condition: string;
  seller_id: ID;
  created_at: string;
  view_count: number;
  seller_avatar?: string;
  seller_name?: string;
}

interface FilterState {
  search: string;
  category: ProductCategory | 'all';
  minPrice: string;
  maxPrice: string;
  sort: SortOption;
  condition: string | 'all';
}

const CATEGORIES = [
  { id: 'all', label: 'Tất cả', icon: <LayoutGrid size={18}/> },
  { id: ProductCategory.TEXTBOOK, label: 'Giáo trình', icon: <BookOpen size={18}/> },
  { id: ProductCategory.ELECTRONICS, label: 'Điện tử', icon: <Monitor size={18}/> },
  { id: ProductCategory.SUPPLIES, label: 'Dụng cụ', icon: <Calculator size={18}/> },
  { id: ProductCategory.CLOTHING, label: 'Thời trang', icon: <Shirt size={18}/> },
  { id: ProductCategory.OTHER, label: 'Khác', icon: <MoreHorizontal size={18}/> },
];

const SORT_OPTIONS = [
  { value: SortOption.NEWEST, label: 'Mới nhất' },
  { value: SortOption.POPULAR, label: 'Phổ biến nhất' },
  { value: SortOption.PRICE_ASC, label: 'Giá thấp đến cao' },
  { value: SortOption.PRICE_DESC, label: 'Giá cao đến thấp' },
];

// ============================================================================
// 2. VISUAL ENGINE
// ============================================================================
const VisualEngine = () => (
  <style>{`
    :root { --primary: #00418E; --secondary: #00B0F0; --dark: #0F172A; }
    body { background-color: #F8FAFC; color: #334155; }
    
    ::-webkit-scrollbar { width: 6px; }
    ::-webkit-scrollbar-thumb { background: #CBD5E1; border-radius: 10px; }
    
    .glass-panel {
      background: rgba(255, 255, 255, 0.8);
      backdrop-filter: blur(20px);
      border: 1px solid rgba(255, 255, 255, 0.6);
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
    }
    
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
    
    .filter-active { background: #E0F2FE; color: #00418E; border-color: #00418E; }
    
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
  formatCurrency: (n: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n),
  timeAgo: (date: string) => {
    const diff = (new Date().getTime() - new Date(date).getTime()) / 1000;
    if (diff < 60) return 'Vừa xong';
    if (diff < 3600) return `${Math.floor(diff/60)} phút trước`;
    if (diff < 86400) return `${Math.floor(diff/3600)} giờ trước`;
    return `${Math.floor(diff/86400)} ngày trước`;
  }
};

const useMarketData = (filters: FilterState) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase.from('products').select('*', { count: 'exact' }).eq('status', 'available');

      // Filters
      if (filters.category !== 'all') query = query.eq('category', filters.category);
      if (filters.search) query = query.ilike('title', `%${filters.search}%`);
      if (filters.minPrice) query = query.gte('price', parseInt(filters.minPrice));
      if (filters.maxPrice) query = query.lte('price', parseInt(filters.maxPrice));
      if (filters.condition !== 'all') query = query.eq('condition', filters.condition);

      // Sorting
      switch (filters.sort) {
        case SortOption.NEWEST: query = query.order('created_at', { ascending: false }); break;
        case SortOption.PRICE_ASC: query = query.order('price', { ascending: true }); break;
        case SortOption.PRICE_DESC: query = query.order('price', { ascending: false }); break;
        case SortOption.POPULAR: query = query.order('view_count', { ascending: false }); break;
      }

      const { data, count, error } = await query;
      if (error) throw error;

      setProducts((data || []).map((p: any) => ({
        ...p,
        images: p.images || [], // Ensure array
        seller_avatar: 'https://via.placeholder.com/40', // Mock avatar if join query complex
      })));
      setTotal(count || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  return { products, loading, total, refetch: fetchProducts };
};

// ============================================================================
// 4. COMPONENTS
// ============================================================================

const ProductSkeleton = () => (
  <div className="bg-white rounded-2xl border border-slate-100 p-3 space-y-3">
    <div className="aspect-[4/3] skeleton-wave rounded-xl w-full"/>
    <div className="space-y-2">
      <div className="h-4 skeleton-wave rounded w-3/4"/>
      <div className="h-4 skeleton-wave rounded w-1/2"/>
    </div>
    <div className="flex justify-between items-center pt-2">
      <div className="h-6 skeleton-wave rounded w-1/3"/>
      <div className="h-8 w-8 skeleton-wave rounded-full"/>
    </div>
  </div>
);

const ProductCard = ({ product }: { product: Product }) => {
  const navigate = useNavigate();
  return (
    <div 
      onClick={() => navigate(`/product/${product.id}`)}
      className="product-card bg-white rounded-2xl overflow-hidden cursor-pointer relative group h-full flex flex-col"
    >
      {/* Image */}
      <div className="aspect-[4/3] relative overflow-hidden bg-slate-100">
        <img 
          src={product.images[0] || 'https://via.placeholder.com/300?text=No+Image'} 
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          alt={product.title}
        />
        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <button className="bg-white text-slate-800 p-2 rounded-full shadow-lg hover:bg-blue-50 transform translate-y-4 group-hover:translate-y-0 transition-all duration-300"><ShoppingBag size={18}/></button>
          <button className="bg-white text-red-500 p-2 rounded-full shadow-lg hover:bg-red-50 transform translate-y-4 group-hover:translate-y-0 transition-all duration-300 delay-75"><Heart size={18}/></button>
        </div>
        {product.price === 0 && <span className="absolute top-2 left-2 bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded shadow-sm">FREE</span>}
        <span className="absolute bottom-2 right-2 bg-black/60 backdrop-blur text-white text-[10px] font-bold px-2 py-1 rounded">{Utils.timeAgo(product.created_at)}</span>
      </div>

      {/* Info */}
      <div className="p-4 flex flex-col flex-1">
        <div className="mb-2">
          <span className="text-[10px] uppercase font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">{product.category}</span>
        </div>
        <h3 className="font-bold text-slate-800 text-sm leading-snug mb-1 line-clamp-2 group-hover:text-blue-600 transition-colors flex-1">{product.title}</h3>
        <div className="flex justify-between items-end mt-3 pt-3 border-t border-slate-50">
          <div>
            <p className="text-xs text-slate-400 font-medium">Giá bán</p>
            <p className="text-lg font-black text-slate-900">{product.price === 0 ? '0đ' : Utils.formatCurrency(product.price)}</p>
          </div>
          <div className="flex items-center gap-1 text-xs text-slate-400">
            <MapPin size={12}/> HCMUT
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
  onClose 
}: { 
  filters: FilterState, 
  onChange: (key: keyof FilterState, val: any) => void,
  isOpen: boolean,
  onClose: () => void
}) => {
  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={onClose} />}
      
      <aside className={`fixed lg:sticky top-0 lg:top-24 left-0 h-full lg:h-[calc(100vh-120px)] w-72 bg-white lg:bg-transparent z-50 lg:z-0 transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} overflow-y-auto hide-scrollbar border-r lg:border-none border-slate-200 p-6 lg:p-0`}>
        <div className="flex justify-between items-center lg:hidden mb-6">
          <h2 className="font-bold text-xl">Bộ lọc</h2>
          <button onClick={onClose}><X/></button>
        </div>

        <div className="space-y-8">
          {/* Categories */}
          <div>
            <h3 className="font-black text-slate-800 mb-4 flex items-center gap-2"><LayoutGrid size={18}/> Danh mục</h3>
            <div className="space-y-2">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => onChange('category', cat.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${filters.category === cat.id ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' : 'bg-white text-slate-600 hover:bg-blue-50 border border-slate-100'}`}
                >
                  {React.cloneElement(cat.icon as React.ReactElement, { size: 18 })}
                  {cat.label}
                  {filters.category === cat.id && <CheckCircle2 size={16} className="ml-auto"/>}
                </button>
              ))}
            </div>
          </div>

          {/* Price Range */}
          <div>
            <h3 className="font-black text-slate-800 mb-4 flex items-center gap-2"><Zap size={18}/> Khoảng giá</h3>
            <div className="flex items-center gap-2 mb-4">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">₫</span>
                <input 
                  type="number" 
                  placeholder="Min" 
                  value={filters.minPrice}
                  onChange={e => onChange('minPrice', e.target.value)}
                  className="w-full pl-6 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500"
                />
              </div>
              <span className="text-slate-400">-</span>
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">₫</span>
                <input 
                  type="number" 
                  placeholder="Max" 
                  value={filters.maxPrice}
                  onChange={e => onChange('maxPrice', e.target.value)}
                  className="w-full pl-6 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500"
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {[ {label: '< 100k', max: '100000'}, {label: '100k - 500k', min: '100000', max: '500000'}, {label: '> 1M', min: '1000000'} ].map((r, i) => (
                <button 
                  key={i} 
                  onClick={() => { onChange('minPrice', r.min || ''); onChange('maxPrice', r.max || ''); }}
                  className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-bold hover:bg-slate-200"
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {/* Condition */}
          <div>
            <h3 className="font-black text-slate-800 mb-4 flex items-center gap-2"><Star size={18}/> Tình trạng</h3>
            <div className="flex flex-wrap gap-2">
              {['new', 'like_new', 'good', 'fair'].map(c => (
                <button
                  key={c}
                  onClick={() => onChange('condition', filters.condition === c ? 'all' : c)}
                  className={`px-4 py-2 rounded-lg text-xs font-bold border transition-all ${filters.condition === c ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'}`}
                >
                  {c === 'new' ? 'Mới 100%' : c === 'like_new' ? 'Như mới' : c === 'good' ? 'Tốt' : 'Khá'}
                </button>
              ))}
            </div>
          </div>
          
          <button 
            onClick={() => { onChange('category', 'all'); onChange('minPrice', ''); onChange('maxPrice', ''); onChange('condition', 'all'); }}
            className="w-full py-3 flex items-center justify-center gap-2 text-slate-500 font-bold text-sm hover:text-red-500 transition-colors border-t border-slate-200 pt-6"
          >
            <RotateCcw size={16}/> Đặt lại bộ lọc
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
  
  const [filters, setFilters] = useState<FilterState>({
    search: searchParams.get('search') || '',
    category: (searchParams.get('cat') as ProductCategory) || 'all',
    minPrice: '',
    maxPrice: '',
    sort: SortOption.NEWEST,
    condition: 'all'
  });

  const { products, loading, total } = useMarketData(filters);

  const handleFilterChange = (key: keyof FilterState, val: any) => {
    setFilters(prev => ({ ...prev, [key]: val }));
    // Update URL param for shareability (basic implementation)
    if (key === 'search') setSearchParams({ search: val });
  };

  return (
    <div className="min-h-screen pt-20 pb-20">
      <VisualEngine />
      
      {/* Decorative Background */}
      <div className="fixed inset-0 z-[-1] pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-[120px]"/>
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-cyan-500/5 rounded-full blur-[100px]"/>
      </div>

      <div className="max-w-7xl mx-auto px-4">
        
        {/* HEADER AREA */}
        <div className="flex flex-col md:flex-row justify-between items-end mb-8 gap-4 animate-enter">
          <div>
            <h1 className="text-3xl md:text-4xl font-black text-slate-900 mb-2">Thị trường</h1>
            <p className="text-slate-500">Tìm thấy <span className="font-bold text-[#00418E]">{total}</span> sản phẩm phù hợp với bạn.</p>
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto">
            {/* Search Input */}
            <div className="relative flex-1 md:w-80 group">
              <input 
                value={filters.search}
                onChange={e => handleFilterChange('search', e.target.value)}
                placeholder="Tìm kiếm sản phẩm..."
                className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-[#00418E] focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#00418E] transition-colors" size={20}/>
            </div>

            <button onClick={() => setIsMobileFilterOpen(true)} className="lg:hidden p-3 bg-white border border-slate-200 rounded-xl shadow-sm">
              <SlidersHorizontal size={20}/>
            </button>
          </div>
        </div>

        {/* MAIN LAYOUT */}
        <div className="flex gap-8 items-start">
          
          {/* Sidebar (Desktop) */}
          <div className="hidden lg:block w-72 flex-shrink-0 sticky top-24">
            <FilterSidebar 
              filters={filters} 
              onChange={handleFilterChange} 
              isOpen={false} 
              onClose={() => {}}
            />
          </div>

          {/* Mobile Sidebar (Drawer) */}
          <FilterSidebar 
            filters={filters} 
            onChange={handleFilterChange} 
            isOpen={isMobileFilterOpen} 
            onClose={() => setIsMobileFilterOpen(false)}
          />

          {/* Product Grid */}
          <div className="flex-1 w-full min-w-0">
            {/* Sort Bar */}
            <div className="flex justify-between items-center mb-6 bg-white p-2 rounded-xl border border-slate-200 shadow-sm animate-enter">
              <div className="flex gap-2 overflow-x-auto hide-scrollbar px-2">
                {SORT_OPTIONS.map(opt => (
                  <button 
                    key={opt.value}
                    onClick={() => handleFilterChange('sort', opt.value)}
                    className={`whitespace-nowrap px-4 py-2 rounded-lg text-xs font-bold transition-all ${filters.sort === opt.value ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100'}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Grid Content */}
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6 animate-enter" style={{ animationDelay: '100ms' }}>
              {loading ? (
                [...Array(8)].map((_, i) => <ProductSkeleton key={i}/>)
              ) : products.length > 0 ? (
                products.map(product => (
                  <ProductCard key={product.id} product={product} />
                ))
              ) : (
                <div className="col-span-full py-20 text-center bg-white rounded-3xl border-2 border-dashed border-slate-200">
                  <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Ghost size={48} className="text-slate-300"/>
                  </div>
                  <h3 className="text-xl font-bold text-slate-800">Không tìm thấy sản phẩm</h3>
                  <p className="text-slate-500 mt-2">Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm nhé.</p>
                  <button 
                    onClick={() => { handleFilterChange('category', 'all'); handleFilterChange('search', ''); }}
                    className="mt-6 px-6 py-2 bg-[#00418E] text-white rounded-full font-bold text-sm shadow-lg shadow-blue-500/30"
                  >
                    Xóa bộ lọc
                  </button>
                </div>
              )}
            </div>

            {/* Load More (Mock) */}
            {products.length > 0 && !loading && (
              <div className="mt-12 text-center">
                <button className="px-8 py-3 bg-white border border-slate-300 text-slate-600 rounded-full font-bold text-sm hover:border-[#00418E] hover:text-[#00418E] transition-all shadow-sm">
                  Đang hiển thị {products.length} kết quả. Cuộn để xem thêm.
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MarketPage;
