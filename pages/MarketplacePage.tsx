import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { 
  Search, Filter, SlidersHorizontal, ArrowLeft, Loader2, 
  ChevronDown, X, Check, Grid, List as ListIcon, ShieldAlert,
  Ghost, Sparkles, Tag, ArrowUpAZ, ArrowDownAZ, LayoutGrid,
  ChevronRight, ChevronLeft, MapPin, Zap, Clock, Star,
  RotateCcw, ShoppingBag, Eye, Heart, AlertCircle, Calendar,
  MoreHorizontal, ArrowUpRight, Gift // <-- Đã thêm Gift
} from 'lucide-react';
import { supabase } from '../services/supabase';
import { Product, ProductCondition, ProductCategory, ProductStatus } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';

// ============================================================================
// 1. GLOBAL STYLES & CONFIGURATION
// ============================================================================

const THEME = {
  primary: '#00418E', // BK Cobalt Blue
  secondary: '#00B0F0',
  accent: '#FFD700',
};

// Inject CSS Keyframes
const MarketStyles = () => (
  <style>{`
    @keyframes slideUpFade {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes shimmer {
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }
    .animate-slide-up { animation: slideUpFade 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
    .animate-shimmer { background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; }
    
    .scrollbar-hide::-webkit-scrollbar { display: none; }
    .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
    
    .custom-scrollbar::-webkit-scrollbar { width: 6px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background-color: rgba(0, 65, 142, 0.1); border-radius: 20px; }
    .custom-scrollbar:hover::-webkit-scrollbar-thumb { background-color: rgba(0, 65, 142, 0.3); }
  `}</style>
);

const SORT_OPTIONS = [
  { value: 'newest', label: 'Mới nhất', icon: <Clock size={14} /> },
  { value: 'price_asc', label: 'Giá: Thấp đến Cao', icon: <ArrowDownAZ size={14} /> },
  { value: 'price_desc', label: 'Giá: Cao đến Thấp', icon: <ArrowUpAZ size={14} /> },
  { value: 'view_desc', label: 'Xem nhiều nhất', icon: <Eye size={14} /> },
];

const ITEMS_PER_PAGE = 12;

// ============================================================================
// 2. ATOMIC COMPONENTS (UI BLOCKS)
// ============================================================================

/**
 * FilterSection: Component hiển thị nhóm bộ lọc (Accordion)
 */
const FilterSection = ({ title, icon, isOpen, onToggle, children }: any) => (
  <div className="border-b border-gray-100 last:border-0">
    <button 
      onClick={onToggle}
      className="w-full flex items-center justify-between py-5 group transition-colors"
    >
      <h3 className="font-black text-gray-800 text-xs uppercase tracking-widest flex items-center gap-2 group-hover:text-[#00418E]">
        {icon} {title}
      </h3>
      <ChevronDown 
        size={16} 
        className={`text-gray-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''} group-hover:text-[#00418E]`} 
      />
    </button>
    <div 
      className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-[500px] opacity-100 mb-5' : 'max-h-0 opacity-0'}`}
    >
      {children}
    </div>
  </div>
);

/**
 * CheckboxItem: Nút lựa chọn tuỳ chỉnh đẹp mắt
 */
const CheckboxItem = ({ label, checked, onChange, count }: any) => (
  <label className="flex items-center gap-3 cursor-pointer group py-1.5 select-none">
    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all duration-200 ${checked ? 'border-[#00418E] bg-[#00418E]' : 'border-gray-300 bg-white group-hover:border-[#00418E]'}`}>
      <Check size={12} className={`text-white transition-transform duration-200 ${checked ? 'scale-100' : 'scale-0'}`} strokeWidth={4} />
    </div>
    <input type="checkbox" className="hidden" checked={checked} onChange={onChange} />
    <span className={`text-sm font-medium transition-colors flex-1 ${checked ? 'text-[#00418E]' : 'text-gray-600 group-hover:text-gray-900'}`}>
      {label}
    </span>
    {count !== undefined && (
      <span className="text-[10px] bg-gray-100 text-gray-400 py-0.5 px-2 rounded-full font-bold group-hover:bg-blue-50 group-hover:text-[#00418E] transition-colors">
        {count}
      </span>
    )}
  </label>
);

/**
 * MarketSkeleton: Component Loading (Định nghĩa 1 lần duy nhất ở đây)
 */
const MarketSkeleton = ({ viewMode }: { viewMode: 'grid' | 'list' }) => (
  <div className={viewMode === 'grid' ? "grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6" : "flex flex-col gap-4"}>
    {[...Array(8)].map((_, i) => (
      <div key={i} className={`bg-white border border-gray-100 rounded-3xl p-4 shadow-sm relative overflow-hidden ${viewMode === 'list' ? 'flex gap-4 h-36' : 'h-[350px]'}`}>
        <div className={`${viewMode === 'list' ? 'w-48 h-full' : 'h-48 w-full'} bg-gray-200 rounded-2xl`}></div>
        <div className="flex-1 space-y-3 py-2">
          <div className="h-4 bg-gray-200 rounded-full w-24"></div>
          <div className="h-6 bg-gray-200 rounded-full w-full"></div>
          <div className="h-6 bg-gray-200 rounded-full w-2/3"></div>
          <div className="h-8 bg-gray-200 rounded-lg w-32 mt-4"></div>
        </div>
        <div className="absolute inset-0 animate-shimmer"></div>
      </div>
    ))}
  </div>
);

/**
 * ProductCard: Card sản phẩm phiên bản Market
 */
const MarketProductCard = ({ product, viewMode, onAdminDelete }: { product: Product, viewMode: 'grid' | 'list', onAdminDelete?: (id: string) => void }) => {
  const navigate = useNavigate();
  
  // Grid View
  if (viewMode === 'grid') {
    return (
      <div 
        onClick={() => navigate(`/product/${product.id}`)}
        className="group bg-white rounded-3xl border border-gray-100 overflow-hidden hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col h-full relative"
      >
        {/* Image Area */}
        <div className="aspect-[4/3] relative overflow-hidden bg-gray-50">
          <img 
            src={product.images[0] || 'https://via.placeholder.com/400'} 
            alt={product.title} 
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 mix-blend-multiply"
            loading="lazy"
          />
          
          {/* Badges */}
          <div className="absolute top-3 left-3 flex flex-wrap gap-2 max-w-[80%]">
            {product.price === 0 && (
              <span className="bg-red-500 text-white text-[10px] font-black px-2 py-1 rounded-lg shadow-lg flex items-center gap-1 animate-pulse">
                <Gift size={10} /> 0Đ
              </span>
            )}
            {product.condition === 'Mới' && (
              <span className="bg-emerald-500 text-white text-[10px] font-black px-2 py-1 rounded-lg shadow-lg">
                NEW
              </span>
            )}
          </div>

          {/* Action Overlay */}
          <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-[1px]">
             <button className="bg-white text-[#00418E] px-4 py-2 rounded-full font-bold text-xs shadow-xl transform scale-90 group-hover:scale-100 transition-all flex items-center gap-2">
               <Eye size={14}/> Xem chi tiết
             </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="p-5 flex flex-col flex-1">
          <div className="flex items-center gap-2 mb-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
            <span className="bg-blue-50 text-[#00418E] px-2 py-0.5 rounded">{product.category}</span>
            <span className="w-1 h-1 rounded-full bg-gray-300"></span>
            <span className="flex items-center gap-1"><Clock size={10}/> {new Date(product.postedAt).toLocaleDateString('vi-VN')}</span>
          </div>

          <h3 className="font-bold text-gray-800 text-sm mb-3 line-clamp-2 group-hover:text-[#00418E] transition-colors leading-snug min-h-[40px]">
            {product.title}
          </h3>

          <div className="mt-auto pt-3 border-t border-gray-50 flex justify-between items-center">
            <div className="flex flex-col">
               <span className="text-[10px] text-gray-400 line-through decoration-red-300">
                 {product.price > 0 ? (product.price * 1.2).toLocaleString() : ''}
               </span>
               <span className="text-lg font-black text-[#00418E]">
                 {product.price === 0 ? 'Tặng' : `${product.price.toLocaleString('vi-VN')}₫`}
               </span>
            </div>
            
            {onAdminDelete ? (
              <button 
                onClick={(e) => { e.stopPropagation(); onAdminDelete(product.id); }}
                className="p-2 bg-red-50 text-red-500 rounded-full hover:bg-red-500 hover:text-white transition-all"
                title="Xóa bài viết"
              >
                <X size={16} />
              </button>
            ) : (
              <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-[#00418E] group-hover:text-white transition-all">
                <ShoppingBag size={14} />
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // List View (Horizontal)
  return (
    <div 
      onClick={() => navigate(`/product/${product.id}`)}
      className="group bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-lg hover:border-blue-200 transition-all duration-300 cursor-pointer flex gap-6"
    >
      <div className="w-48 h-32 rounded-xl overflow-hidden bg-gray-50 shrink-0 relative">
        <img 
          src={product.images[0] || 'https://via.placeholder.com/400'} 
          alt={product.title} 
          className="w-full h-full object-contain mix-blend-multiply group-hover:scale-105 transition-transform duration-500"
        />
        {product.price === 0 && <span className="absolute top-2 left-2 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded">FREE</span>}
      </div>
      
      <div className="flex-1 py-1 flex flex-col">
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2 mb-2">
               <span className="text-[10px] font-bold bg-blue-50 text-[#00418E] px-2 py-0.5 rounded border border-blue-100">{product.category}</span>
               <span className="text-[10px] font-bold text-gray-400 flex items-center gap-1"><MapPin size={10}/> TP.HCM</span>
            </div>
            <h3 className="font-bold text-gray-900 text-lg mb-2 group-hover:text-[#00418E] transition-colors">{product.title}</h3>
            <p className="text-sm text-gray-500 line-clamp-2 mb-3 max-w-xl">{product.description}</p>
          </div>
          <div className="text-right">
             <div className="text-xl font-black text-[#00418E]">{product.price === 0 ? '0đ' : `${product.price.toLocaleString()}₫`}</div>
             <div className="text-xs text-gray-400 mt-1">{new Date(product.postedAt).toLocaleDateString()}</div>
          </div>
        </div>
        
        <div className="mt-auto flex items-center gap-4">
           <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-gray-200 overflow-hidden">
                 <img src={product.seller?.avatar || 'https://via.placeholder.com/50'} className="w-full h-full object-cover"/>
              </div>
              <span className="text-xs font-bold text-gray-600">{product.seller?.name || 'Người bán'}</span>
           </div>
           {onAdminDelete && (
             <button onClick={(e) => { e.stopPropagation(); onAdminDelete(product.id); }} className="text-xs text-red-500 hover:underline ml-auto">Xóa tin</button>
           )}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 3. MAIN PAGE COMPONENT
// ============================================================================

const MarketPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  // --- ĐÃ SỬA: Lấy thêm 'user' để check nút đăng tin ---
  const { user, isAdmin } = useAuth();
  const { addToast } = useToast();

  // --- STATE MANAGEMENT ---
  const initialSearch = searchParams.get('search') || '';
  const initialCat = searchParams.get('cat') || 'All';
  const initialPage = parseInt(searchParams.get('page') || '1');

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [category, setCategory] = useState(initialCat);
  const [condition, setCondition] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState({ min: '', max: '' });
  const [sortBy, setSortBy] = useState('newest');
  
  // UI States
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [showMobileFilter, setShowMobileFilter] = useState(false);
  
  // Accordion State
  const [expanded, setExpanded] = useState({ cat: true, price: true, cond: true });

  // --- EFFECT: SYNC URL ---
  useEffect(() => {
    setSearchTerm(searchParams.get('search') || '');
    setCategory(searchParams.get('cat') || 'All');
    setCurrentPage(parseInt(searchParams.get('page') || '1'));
  }, [searchParams]);

  // Update URL function
  const updateUrl = useCallback(() => {
    const params: any = {};
    if (searchTerm) params.search = searchTerm;
    if (category !== 'All') params.cat = category;
    if (currentPage > 1) params.page = currentPage.toString();
    setSearchParams(params);
  }, [searchTerm, category, currentPage, setSearchParams]);

  // --- CORE: DATA FETCHING ---
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('products')
        .select('*, profiles:seller_id(name, avatar_url)', { count: 'exact' })
        .neq('status', 'deleted');

      // Filters
      if (searchTerm) query = query.or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
      if (category !== 'All') query = query.eq('category', category);
      if (condition.length > 0) query = query.in('condition', condition);
      if (priceRange.min) query = query.gte('price', Number(priceRange.min));
      if (priceRange.max) query = query.lte('price', Number(priceRange.max));

      // Sort
      switch (sortBy) {
        case 'newest': query = query.order('posted_at', { ascending: false }); break;
        case 'price_asc': query = query.order('price', { ascending: true }); break;
        case 'price_desc': query = query.order('price', { ascending: false }); break;
        case 'view_desc': query = query.order('view_count', { ascending: false }); break;
        default: query = query.order('posted_at', { ascending: false });
      }

      // Pagination
      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;
      if (error) throw error;

      setTotalCount(count || 0);
      if (data) {
        const mapped = data.map((item: any) => ({
          ...item, sellerId: item.seller_id, tradeMethod: item.trade_method, postedAt: item.posted_at, 
          status: item.status, seller: item.profiles, view_count: item.view_count || 0
        }));
        setProducts(mapped);
      }
    } catch (err) {
      console.error(err);
      addToast("Lỗi tải dữ liệu", "error");
    } finally {
      setLoading(false);
    }
  }, [searchTerm, category, condition, priceRange, sortBy, currentPage]);

  // Debounce Fetch
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProducts();
      updateUrl();
    }, 400);
    return () => clearTimeout(timer);
  }, [fetchProducts, updateUrl]);

  // --- HANDLERS ---
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchProducts();
  };

  const clearAllFilters = () => {
    setSearchTerm('');
    setCategory('All');
    setCondition([]);
    setPriceRange({ min: '', max: '' });
    setCurrentPage(1);
    setSearchParams({});
  };

  const handleAdminDelete = async (id: string) => {
    if (!window.confirm("Xác nhận xóa bài viết?")) return;
    await supabase.from('products').update({ status: 'deleted' }).eq('id', id);
    setProducts(prev => prev.filter(p => p.id !== id));
    addToast("Đã xóa bài viết", "success");
  };

  const activeFiltersCount = (category !== 'All' ? 1 : 0) + condition.length + (priceRange.min ? 1 : 0);

  // ============================================================================
  // 4. RENDER UI
  // ============================================================================
  return (
    <div className="min-h-screen bg-[#F8F9FA] font-sans text-[#1E293B]">
      <MarketStyles />

      {/* --- HEADER STICKY --- */}
      <div className="bg-white/80 backdrop-blur-xl sticky top-0 z-40 border-b border-gray-200 transition-all duration-300">
        <div className="max-w-[1400px] mx-auto px-4 py-3">
          <div className="flex gap-6 items-center">
            {/* Mobile Back */}
            <Link to="/" className="md:hidden p-2 text-gray-500 hover:bg-gray-100 rounded-full"><ArrowLeft size={20}/></Link>

            {/* Logo Desktop */}
            <Link to="/" className="hidden md:flex items-center gap-2 group mr-8">
              <div className="w-10 h-10 bg-[#00418E] rounded-xl flex items-center justify-center text-white shadow-lg group-hover:scale-105 transition-transform">
                <LayoutGrid size={20} />
              </div>
              <div>
                <h1 className="font-black text-xl text-[#00418E] leading-none tracking-tight">MARKET</h1>
                <span className="text-[10px] font-bold text-gray-400 tracking-widest uppercase">Bách Khoa</span>
              </div>
            </Link>
            
            {/* Main Search */}
            <form onSubmit={handleSearchSubmit} className="flex-1 relative max-w-2xl group">
              <input 
                type="text" 
                placeholder="Tìm kiếm món đồ bạn cần..." 
                className="w-full pl-12 pr-12 py-3 rounded-2xl bg-gray-50 text-gray-800 outline-none border-2 border-transparent focus:border-[#00418E] focus:bg-white focus:ring-4 focus:ring-blue-50 transition-all font-medium placeholder:text-gray-400"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#00418E] transition-colors" size={20} />
              {searchTerm && <button type="button" onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-300 hover:text-red-500"><X size={16}/></button>}
            </form>

            {/* Actions */}
            <div className="flex items-center gap-3">
               <button onClick={() => setShowMobileFilter(true)} className="md:hidden p-3 bg-gray-50 rounded-xl relative">
                 <Filter size={20}/>
                 {activeFiltersCount > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white"></span>}
               </button>
               {user && (
                 <Link to="/post" className="hidden md:flex items-center gap-2 bg-[#00418E] text-white px-6 py-3 rounded-xl font-bold hover:bg-[#003370] hover:shadow-lg transition-all active:scale-95">
                   <Zap size={18} className="fill-current"/> Đăng tin
                 </Link>
               )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 py-8 flex gap-8 items-start relative">
        
        {/* --- SIDEBAR FILTER (DESKTOP) --- */}
        <aside className="hidden lg:block w-72 flex-shrink-0 sticky top-28 h-[calc(100vh-140px)] overflow-y-auto pr-2 custom-scrollbar">
          <div className="flex items-center justify-between mb-6 px-1">
            <h2 className="font-black text-gray-900 text-lg flex items-center gap-2"><Filter size={20} className="text-[#00418E]"/> Bộ Lọc</h2>
            {activeFiltersCount > 0 && <button onClick={clearAllFilters} className="text-xs font-bold text-red-500 hover:underline flex items-center gap-1"><RotateCcw size={12}/> Đặt lại</button>}
          </div>

          <div className="space-y-4">
            {/* Category Filter */}
            <div className="bg-white p-5 rounded-[1.5rem] border border-gray-100 shadow-sm">
              <FilterSection title="Danh Mục" icon={<Grid size={14}/>} isOpen={expanded.cat} onToggle={() => setExpanded(p => ({...p, cat: !p.cat}))}>
                <div className="space-y-1">
                  <button onClick={() => {setCategory('All'); setCurrentPage(1);}} className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-between ${category === 'All' ? 'bg-[#00418E] text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}>
                    Tất cả {category === 'All' && <Check size={14}/>}
                  </button>
                  {Object.values(ProductCategory).map(cat => (
                    <button key={cat} onClick={() => {setCategory(cat); setCurrentPage(1);}} className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-between ${category === cat ? 'bg-[#00418E] text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}>
                      {cat} {category === cat && <Check size={14}/>}
                    </button>
                  ))}
                </div>
              </FilterSection>
            </div>

            {/* Price Filter */}
            <div className="bg-white p-5 rounded-[1.5rem] border border-gray-100 shadow-sm">
              <FilterSection title="Khoảng Giá" icon={<Tag size={14}/>} isOpen={expanded.price} onToggle={() => setExpanded(p => ({...p, price: !p.price}))}>
                <div className="flex items-center gap-2 mb-3">
                  <input type="number" placeholder="Từ" value={priceRange.min} onChange={e => setPriceRange({...priceRange, min: e.target.value})} className="w-full bg-gray-50 border-none p-3 rounded-xl text-sm font-bold text-center focus:ring-2 focus:ring-[#00418E]"/>
                  <span className="text-gray-300 font-black">-</span>
                  <input type="number" placeholder="Đến" value={priceRange.max} onChange={e => setPriceRange({...priceRange, max: e.target.value})} className="w-full bg-gray-50 border-none p-3 rounded-xl text-sm font-bold text-center focus:ring-2 focus:ring-[#00418E]"/>
                </div>
                <button className="w-full bg-white border-2 border-[#00418E] text-[#00418E] py-2.5 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-[#00418E] hover:text-white transition-all">Áp dụng</button>
              </FilterSection>
            </div>

            {/* Condition Filter */}
            <div className="bg-white p-5 rounded-[1.5rem] border border-gray-100 shadow-sm">
              <FilterSection title="Tình Trạng" icon={<Sparkles size={14}/>} isOpen={expanded.cond} onToggle={() => setExpanded(p => ({...p, cond: !p.cond}))}>
                <div className="space-y-2">
                  {Object.values(ProductCondition).map(cond => (
                    <CheckboxItem 
                      key={cond} 
                      label={cond} 
                      checked={condition.includes(cond)} 
                      onChange={() => {
                        setCondition(prev => prev.includes(cond) ? prev.filter(c => c !== cond) : [...prev, cond]);
                        setCurrentPage(1);
                      }} 
                    />
                  ))}
                </div>
              </FilterSection>
            </div>
          </div>
        </aside>

        {/* --- MAIN CONTENT --- */}
        <div className="flex-1 w-full min-w-0">
          
          {/* Active Filter Bar (Chips) */}
          {activeFiltersCount > 0 && (
            <div className="flex flex-wrap gap-2 mb-6 animate-slide-up">
              {category !== 'All' && (
                <span className="px-3 py-1.5 bg-blue-50 text-[#00418E] rounded-lg text-xs font-bold flex items-center gap-2 border border-blue-100">
                  {category} <button onClick={() => setCategory('All')} className="hover:bg-blue-200 rounded-full p-0.5"><X size={12}/></button>
                </span>
              )}
              {condition.map(c => (
                <span key={c} className="px-3 py-1.5 bg-purple-50 text-purple-600 rounded-lg text-xs font-bold flex items-center gap-2 border border-purple-100">
                  {c} <button onClick={() => setCondition(p => p.filter(i => i !== c))} className="hover:bg-purple-200 rounded-full p-0.5"><X size={12}/></button>
                </span>
              ))}
              {(priceRange.min || priceRange.max) && (
                <span className="px-3 py-1.5 bg-orange-50 text-orange-600 rounded-lg text-xs font-bold flex items-center gap-2 border border-orange-100">
                  Giá: {priceRange.min || 0} - {priceRange.max || '∞'}
                  <button onClick={() => setPriceRange({min:'', max:''})} className="hover:bg-orange-200 rounded-full p-0.5"><X size={12}/></button>
                </span>
              )}
            </div>
          )}

          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm sticky top-[80px] z-20 md:static">
            <div className="flex items-center gap-3">
               <div className="p-2 bg-[#00418E] text-white rounded-lg shadow-lg shadow-blue-200"><LayoutGrid size={18}/></div>
               <div>
                 <h2 className="text-sm font-bold text-gray-900">Kết quả tìm kiếm</h2>
                 <p className="text-xs text-gray-500 font-medium">Tìm thấy <span className="text-[#00418E] font-bold">{totalCount}</span> món đồ</p>
               </div>
            </div>
            
            <div className="flex items-center gap-3 overflow-x-auto pb-1 sm:pb-0 scrollbar-hide">
               {SORT_OPTIONS.map(opt => (
                 <button key={opt.value} onClick={() => setSortBy(opt.value)} className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap border ${sortBy === opt.value ? 'bg-[#00418E] text-white border-[#00418E] shadow-md' : 'bg-gray-50 text-gray-500 border-transparent hover:bg-gray-100'}`}>
                   {opt.icon} {opt.label}
                 </button>
               ))}
               <div className="w-px h-6 bg-gray-200 mx-1 hidden sm:block"></div>
               <div className="hidden sm:flex bg-gray-100 p-1 rounded-xl">
                  <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white text-[#00418E] shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}><Grid size={16}/></button>
                  <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white text-[#00418E] shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}><ListIcon size={16}/></button>
               </div>
            </div>
          </div>

          {/* Grid Content */}
          <div className="min-h-[500px]">
            {loading ? (
              <MarketSkeleton viewMode={viewMode} />
            ) : products.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 bg-white rounded-[2rem] border-2 border-dashed border-gray-200 shadow-sm text-center">
                 <div className="relative mb-6">
                    <div className="w-32 h-32 bg-gray-50 rounded-full flex items-center justify-center animate-bounce">
                        <Ghost size={64} className="text-gray-300" />
                    </div>
                    <div className="absolute top-0 right-0 w-8 h-8 bg-red-100 text-red-500 rounded-full flex items-center justify-center animate-pulse"><AlertCircle size={16}/></div>
                 </div>
                 <h3 className="text-2xl font-black text-gray-300 uppercase tracking-widest mb-2">Không tìm thấy</h3>
                 <p className="text-gray-400 text-sm font-medium max-w-xs mx-auto mb-8">Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm xem sao?</p>
                 <button onClick={clearAllFilters} className="px-8 py-3 bg-[#00418E] text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all flex items-center gap-2">
                    <RotateCcw size={16}/> Xóa bộ lọc
                 </button>
              </div>
            ) : (
              <div className={viewMode === 'grid' ? "grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6" : "flex flex-col gap-4"}>
                {products.map((p, idx) => (
                  <div key={p.id} className="animate-slide-up" style={{animationDelay: `${idx * 50}ms`}}>
                    <MarketProductCard 
                      product={p} 
                      viewMode={viewMode}
                      onAdminDelete={isAdmin ? handleAdminDelete : undefined}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalCount > 0 && (
            <div className="flex justify-center mt-16 mb-8 gap-2">
               <button onClick={() => {setCurrentPage(p => Math.max(1, p - 1)); window.scrollTo({top:0, behavior:'smooth'});}} disabled={currentPage === 1} className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white border border-gray-200 hover:border-[#00418E] hover:text-[#00418E] disabled:opacity-50 transition-all shadow-sm"><ChevronLeft size={20}/></button>
               <div className="px-6 h-12 flex items-center justify-center rounded-2xl bg-[#00418E] text-white font-bold shadow-lg shadow-blue-200">Trang {currentPage}</div>
               <button onClick={() => {setCurrentPage(p => p + 1); window.scrollTo({top:0, behavior:'smooth'});}} disabled={products.length < ITEMS_PER_PAGE} className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white border border-gray-200 hover:border-[#00418E] hover:text-[#00418E] disabled:opacity-50 transition-all shadow-sm"><ChevronRight size={20}/></button>
            </div>
          )}
        </div>
      </div>

      {/* --- MOBILE FILTER MODAL --- */}
      {showMobileFilter && (
        <div className="fixed inset-0 z-[60] flex flex-col md:hidden">
           <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowMobileFilter(false)}></div>
           <div className="absolute bottom-0 left-0 right-0 bg-[#F8F9FA] rounded-t-[2rem] h-[85vh] flex flex-col animate-slide-up">
              <div className="p-6 bg-white rounded-t-[2rem] border-b border-gray-100 flex justify-between items-center sticky top-0 z-10">
                 <h2 className="font-black text-xl text-[#00418E] flex items-center gap-2"><Filter size={20}/> BỘ LỌC</h2>
                 <button onClick={() => setShowMobileFilter(false)} className="p-2 bg-gray-50 rounded-full hover:bg-gray-100"><X size={24}/></button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-8">
                 {/* Mobile Categories */}
                 <div className="bg-white p-5 rounded-3xl shadow-sm">
                    <h3 className="font-black text-gray-400 text-xs uppercase tracking-widest mb-4">Danh mục</h3>
                    <div className="flex flex-wrap gap-2">
                       <button onClick={() => setCategory('All')} className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all ${category === 'All' ? 'bg-[#00418E] text-white border-[#00418E]' : 'bg-gray-50 text-gray-600 border-gray-200'}`}>Tất cả</button>
                       {Object.values(ProductCategory).map(cat => (
                          <button key={cat} onClick={() => setCategory(cat)} className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all ${category === cat ? 'bg-[#00418E] text-white border-[#00418E]' : 'bg-gray-50 text-gray-600 border-gray-200'}`}>{cat}</button>
                       ))}
                    </div>
                 </div>
                 {/* Mobile Price */}
                 <div className="bg-white p-5 rounded-3xl shadow-sm">
                    <h3 className="font-black text-gray-400 text-xs uppercase tracking-widest mb-4">Khoảng giá</h3>
                    <div className="flex gap-4">
                       <input type="number" placeholder="Min" value={priceRange.min} onChange={e => setPriceRange({...priceRange, min: e.target.value})} className="w-full bg-gray-50 p-4 rounded-2xl font-bold text-center border-none focus:ring-2 focus:ring-[#00418E]"/>
                       <input type="number" placeholder="Max" value={priceRange.max} onChange={e => setPriceRange({...priceRange, max: e.target.value})} className="w-full bg-gray-50 p-4 rounded-2xl font-bold text-center border-none focus:ring-2 focus:ring-[#00418E]"/>
                    </div>
                 </div>
              </div>
              <div className="p-6 bg-white border-t border-gray-100 safe-area-pb">
                 <button onClick={() => setShowMobileFilter(false)} className="w-full bg-[#00418E] text-white py-4 rounded-2xl font-black text-lg shadow-xl shadow-blue-900/20 active:scale-95 transition-transform uppercase tracking-widest">
                    Xem {totalCount} kết quả
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default MarketPage;
