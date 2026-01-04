import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { 
  Search, Filter, SlidersHorizontal, ArrowLeft, Loader2, 
  ChevronDown, X, Check, Grid, List as ListIcon, ShieldAlert,
  Ghost, Sparkles, Tag, ArrowUpAZ, ArrowDownAZ, LayoutGrid,
  ChevronRight, ChevronLeft, MapPin, Zap, Clock, Star,
  RotateCcw, ShoppingBag, Eye
} from 'lucide-react';
import { supabase } from '../services/supabase';
import { Product, ProductCondition, ProductCategory, ProductStatus } from '../types';
import ProductCard from '../components/ProductCard';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';

// ============================================================================
// 1. CONSTANTS & CONFIGURATIONS
// ============================================================================

const ITEMS_PER_PAGE = 12;

const SORT_OPTIONS = [
  { value: 'newest', label: 'Mới nhất', icon: <Clock size={14} /> },
  { value: 'price_asc', label: 'Giá: Thấp đến Cao', icon: <ArrowDownAZ size={14} /> },
  { value: 'price_desc', label: 'Giá: Cao đến Thấp', icon: <ArrowUpAZ size={14} /> },
  { value: 'view_desc', label: 'Xem nhiều nhất', icon: <Eye size={14} /> },
];

const LOCATIONS = [
  "Cơ sở Lý Thường Kiệt",
  "Cơ sở Dĩ An",
  "KTX Khu A",
  "KTX Khu B",
  "Online / Ship",
  "Khác"
];

const QUICK_FILTERS = [
  { id: 'freeship', label: 'Freeship', icon: <ShoppingBag size={12}/> },
  { id: 'verified', label: 'Người bán Uy tín', icon: <Star size={12}/> },
  { id: 'urgent', label: 'Cần bán gấp', icon: <Zap size={12}/> },
];

// ============================================================================
// 2. SUB-COMPONENTS (INTERNAL)
// ============================================================================

/**
 * Component hiển thị tiêu đề các nhóm lọc (Accordion style)
 */
const FilterSectionTitle = ({ title, expanded, onToggle, icon }: any) => (
  <div 
    onClick={onToggle}
    className="flex items-center justify-between py-4 cursor-pointer group select-none border-b border-dashed border-gray-100 last:border-0"
  >
    <h3 className="font-black text-gray-800 text-[13px] uppercase tracking-widest flex items-center gap-2 group-hover:text-[#00418E] transition-colors">
      {icon} {title}
    </h3>
    <ChevronDown 
      size={16} 
      className={`text-gray-400 transition-transform duration-300 ${expanded ? 'rotate-180' : ''} group-hover:text-[#00418E]`} 
    />
  </div>
);

/**
 * Component Checkbox tùy chỉnh đẹp mắt
 */
const CustomCheckbox = ({ label, checked, onChange, count }: any) => (
  <label className="flex items-center gap-3 cursor-pointer group py-1.5">
    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all duration-200 ${checked ? 'border-[#00418E] bg-[#00418E]' : 'border-gray-300 bg-white group-hover:border-[#00418E]'}`}>
      <Check size={12} className={`text-white transition-transform ${checked ? 'scale-100' : 'scale-0'}`} strokeWidth={4} />
    </div>
    <input type="checkbox" className="hidden" checked={checked} onChange={onChange} />
    <span className={`text-sm font-medium transition-colors flex-1 ${checked ? 'text-[#00418E]' : 'text-gray-600 group-hover:text-gray-900'}`}>
      {label}
    </span>
    {count !== undefined && (
      <span className="text-[10px] bg-gray-100 text-gray-400 py-0.5 px-1.5 rounded-full font-bold">
        {count}
      </span>
    )}
  </label>
);

/**
 * Component Pagination (Phân trang)
 */
const Pagination = ({ currentPage, totalPages, onPageChange }: any) => {
  if (totalPages <= 1) return null;

  const pages = [];
  // Logic hiển thị trang thông minh (1, 2, ..., 5, 6)
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== '...') {
      pages.push('...');
    }
  }

  return (
    <div className="flex items-center justify-center gap-2 mt-12 mb-8">
      <button 
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
        className="w-10 h-10 flex items-center justify-center rounded-xl border border-gray-200 text-gray-500 hover:border-[#00418E] hover:text-[#00418E] disabled:opacity-30 disabled:cursor-not-allowed transition-all bg-white"
      >
        <ChevronLeft size={18} />
      </button>
      
      {pages.map((p, idx) => (
        p === '...' ? (
          <span key={`dots-${idx}`} className="text-gray-400 px-2">...</span>
        ) : (
          <button 
            key={p}
            onClick={() => onPageChange(p)}
            className={`w-10 h-10 flex items-center justify-center rounded-xl font-bold text-sm transition-all ${currentPage === p ? 'bg-[#00418E] text-white shadow-lg shadow-blue-200 scale-110' : 'bg-white border border-gray-200 text-gray-600 hover:border-[#00418E]'}`}
          >
            {p}
          </button>
        )
      ))}

      <button 
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage === totalPages}
        className="w-10 h-10 flex items-center justify-center rounded-xl border border-gray-200 text-gray-500 hover:border-[#00418E] hover:text-[#00418E] disabled:opacity-30 disabled:cursor-not-allowed transition-all bg-white"
      >
        <ChevronRight size={18} />
      </button>
    </div>
  );
};

/**
 * Component hiển thị Banner quảng cáo nhỏ trong trang Market
 */
const MarketBanner = () => (
  <div className="relative w-full h-40 md:h-48 rounded-[1.5rem] overflow-hidden bg-gradient-to-r from-[#00418E] to-[#0066cc] mb-8 shadow-lg group">
    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
    <div className="absolute right-0 top-0 h-full w-1/2 bg-white/5 skew-x-12 transform origin-bottom-right"></div>
    
    <div className="relative z-10 h-full flex flex-col justify-center px-8 md:px-12">
      <div className="inline-flex items-center gap-2 bg-yellow-400/20 text-yellow-300 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full w-fit mb-2 border border-yellow-300/30">
        <Sparkles size={12} /> Hỗ trợ sinh viên
      </div>
      <h2 className="text-2xl md:text-3xl font-black text-white mb-2 leading-tight">
        Đăng tin dễ dàng <br/> Kết nối <span className="text-yellow-300 underline decoration-2 underline-offset-4">tức thì</span>
      </h2>
      <p className="text-blue-100 text-sm md:text-base opacity-90 max-w-lg">
        Tìm kiếm giáo trình, đồ dùng học tập giá rẻ ngay tại trường.
      </p>
    </div>
    
    {/* Decorative Elements */}
    <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700"></div>
    <Ghost className="absolute right-10 bottom-8 text-white/10 w-24 h-24 rotate-12" />
  </div>
);

// ============================================================================
// 3. MAIN COMPONENT
// ============================================================================

const MarketPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isAdmin } = useAuth(); // Loại bỏ 'user' nếu không dùng trực tiếp
  const { addToast } = useToast();

  // --- STATE MANAGEMENT ---
  // Core Data
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  
  // URL Params Sync
  const initialSearch = searchParams.get('search') || '';
  const initialCat = searchParams.get('cat') || 'All';
  const initialPage = parseInt(searchParams.get('page') || '1');

  // Filter States
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [category, setCategory] = useState(initialCat);
  const [condition, setCondition] = useState<string[]>([]); // Multi-select support
  const [priceRange, setPriceRange] = useState({ min: '', max: '' });
  const [sortBy, setSortBy] = useState('newest');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);

  // UI States
  const [showMobileFilter, setShowMobileFilter] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    cat: true,
    price: true,
    cond: true,
    loc: false
  });

  // --- REFS & HELPERS ---
  const topRef = useRef<HTMLDivElement>(null);

  const toggleSection = (sec: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [sec]: !prev[sec] }));
  };

  const handleConditionChange = (cond: string) => {
    setCondition(prev => 
      prev.includes(cond) ? prev.filter(c => c !== cond) : [...prev, cond]
    );
    setCurrentPage(1); // Reset page on filter change
  };

  const handleLocationChange = (loc: string) => {
    setSelectedLocations(prev =>
      prev.includes(loc) ? prev.filter(l => l !== loc) : [...prev, loc]
    );
    setCurrentPage(1);
  };

  const clearAllFilters = () => {
    setSearchTerm('');
    setCategory('All');
    setCondition([]);
    setPriceRange({ min: '', max: '' });
    setSelectedLocations([]);
    setCurrentPage(1);
    setSearchParams({}); // Clear URL
    addToast("Đã xóa toàn bộ bộ lọc", "info");
  };

  // --- SYNC URL & STATE ---
  useEffect(() => {
    // Khi URL thay đổi (VD: Back button), cập nhật lại State
    setSearchTerm(searchParams.get('search') || '');
    setCategory(searchParams.get('cat') || 'All');
    const p = parseInt(searchParams.get('page') || '1');
    setCurrentPage(p);
  }, [searchParams]);

  // Update URL khi Category hoặc Page thay đổi (Search Term handled in submit)
  const updateUrl = () => {
    const params: any = {};
    if (searchTerm) params.search = searchTerm;
    if (category !== 'All') params.cat = category;
    if (currentPage > 1) params.page = currentPage.toString();
    setSearchParams(params);
  };

  // --- DATA FETCHING (CORE LOGIC) ---
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Base Query
      let query = supabase
        .from('products')
        .select('*, profiles:seller_id(name, avatar_url, ban_until)', { count: 'exact' })
        .neq('status', 'deleted');

      // 2. Full-text Search (Tìm kiếm tương đối)
      if (searchTerm) {
        query = query.or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
      }

      // 3. Category Filter
      if (category !== 'All') {
        query = query.eq('category', category);
      }

      // 4. Condition Filter (Multi-select: OR logic inside filter)
      if (condition.length > 0) {
        // Supabase postgrest-js cú pháp cho IN là: .in('column', ['val1', 'val2'])
        query = query.in('condition', condition);
      }

      // 5. Price Range
      if (priceRange.min) query = query.gte('price', Number(priceRange.min));
      if (priceRange.max) query = query.lte('price', Number(priceRange.max));

      // 6. Location Filter (Giả sử có cột location, nếu chưa có thì bỏ qua)
      // if (selectedLocations.length > 0) query = query.in('location', selectedLocations);

      // 7. Sorting
      switch (sortBy) {
        case 'newest': query = query.order('posted_at', { ascending: false }); break;
        case 'price_asc': query = query.order('price', { ascending: true }); break;
        case 'price_desc': query = query.order('price', { ascending: false }); break;
        case 'view_desc': query = query.order('view_count', { ascending: false, nullsFirst: false }); break;
        default: query = query.order('posted_at', { ascending: false });
      }

      // 8. Pagination
      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;
      query = query.range(from, to);

      // 9. Execute
      const { data, error, count } = await query;
      
      if (error) throw error;

      setTotalCount(count || 0);

      if (data) {
        // Mapping dữ liệu để khớp với Interface Product
        const mappedProducts: Product[] = data.map((item: any) => ({
          id: item.id,
          title: item.title,
          price: item.price,
          description: item.description,
          category: item.category,
          condition: item.condition,
          images: item.images || [],
          sellerId: item.seller_id,
          tradeMethod: item.trade_method,
          postedAt: item.posted_at,
          status: item.status,
          view_count: item.view_count || 0,
          // Map thông tin Seller & Check ban status
          seller: {
            name: item.profiles?.name || 'Người dùng ẩn danh',
            avatar: item.profiles?.avatar_url || 'https://via.placeholder.com/150',
            banUntil: item.profiles?.ban_until
          }
        }));
        setProducts(mappedProducts);
      }
    } catch (err: any) {
      console.error("Fetch Error:", err);
      addToast("Không thể tải dữ liệu. Vui lòng thử lại.", "error");
    } finally {
      setLoading(false);
      // Scroll to top of list if needed
      // topRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [searchTerm, category, condition, priceRange, sortBy, currentPage, selectedLocations]);

  // Debounce calling fetch
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProducts();
      updateUrl();
    }, 400); // 400ms debounce
    return () => clearTimeout(timer);
  }, [fetchProducts]); // Dependency array covers all filter states

  // --- HANDLERS ---

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchProducts(); // Force fetch immediately
  };

  const handleAdminDelete = async (productId: string) => {
    if (!window.confirm("Admin: Bạn chắc chắn muốn xóa bài viết này?")) return;
    try {
      const { error } = await supabase.from('products').update({ status: 'deleted' }).eq('id', productId);
      if (error) throw error;
      
      setProducts(prev => prev.filter(p => p.id !== productId));
      addToast("Đã xóa bài viết vi phạm", "success");
    } catch (e) {
      addToast("Lỗi khi xóa bài viết", "error");
    }
  };

  // Đếm số lượng filter đang active
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (category !== 'All') count++;
    if (priceRange.min || priceRange.max) count++;
    count += condition.length;
    count += selectedLocations.length;
    return count;
  }, [category, priceRange, condition, selectedLocations]);

  return (
    <div className="min-h-screen bg-[#F8F9FA] font-sans text-[#1a1a1a] selection:bg-[#00418E] selection:text-white" ref={topRef}>
      
      {/* ================= HEADER SEARCH & NAV ================= */}
      <div className="bg-white sticky top-0 z-30 shadow-sm border-b border-gray-200 transition-all">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex gap-6 items-center">
            {/* Mobile Back */}
            <Link to="/" className="md:hidden p-2 -ml-2 text-gray-500 hover:bg-gray-100 rounded-full">
              <ArrowLeft size={24} />
            </Link>

            {/* Logo Desktop */}
            <Link to="/" className="hidden md:flex items-center gap-2 group">
              <div className="w-10 h-10 bg-[#00418E] rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-200 group-hover:scale-105 transition-transform">
                <LayoutGrid size={20} />
              </div>
              <div>
                <h1 className="font-black text-xl text-[#00418E] leading-none tracking-tight">CHỢ BK</h1>
                <span className="text-[10px] font-bold text-gray-400 tracking-widest uppercase">Student Market</span>
              </div>
            </Link>
            
            {/* Search Bar */}
            <form onSubmit={handleSearchSubmit} className="flex-1 relative max-w-3xl group mx-auto md:mx-0">
              <input 
                type="text" 
                placeholder="Tìm giáo trình, máy tính, đồ dùng..." 
                className="w-full pl-12 pr-12 py-3 rounded-2xl bg-gray-50 text-gray-800 outline-none border-2 border-transparent focus:border-[#00418E] focus:bg-white focus:ring-4 focus:ring-blue-50 transition-all font-medium placeholder:text-gray-400 shadow-inner"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#00418E] transition-colors" size={20} />
              
              {/* Clear Button */}
              {searchTerm && (
                <button 
                  type="button" 
                  onClick={() => setSearchTerm('')} 
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
                >
                  <X size={16} />
                </button>
              )}
            </form>

            {/* Mobile Filter Toggle */}
            <button 
              className="md:hidden p-3 bg-gray-50 rounded-xl text-gray-600 active:scale-95 transition-transform relative"
              onClick={() => setShowMobileFilter(true)}
            >
              <Filter size={20} />
              {activeFilterCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#00418E] text-white text-[10px] flex items-center justify-center rounded-full font-bold shadow-sm border-2 border-white">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>

          {/* Quick Tags (Horizontal Scroll) */}
          <div className="flex items-center gap-3 mt-4 overflow-x-auto pb-2 scrollbar-hide">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest flex-shrink-0">Gợi ý:</span>
            {QUICK_FILTERS.map(tag => (
              <button key={tag.id} className="flex items-center gap-1.5 px-4 py-1.5 rounded-full border border-gray-200 bg-white text-xs font-bold text-gray-600 hover:border-[#00418E] hover:text-[#00418E] hover:shadow-sm transition-all whitespace-nowrap">
                {tag.icon} {tag.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 flex gap-8 items-start relative">
        
        {/* ================= SIDEBAR FILTER (DESKTOP) ================= */}
        <aside className="hidden md:block w-72 flex-shrink-0 sticky top-40 h-[calc(100vh-160px)] overflow-y-auto pr-4 custom-scrollbar">
          
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-black text-gray-800 text-lg flex items-center gap-2"><SlidersHorizontal size={20} className="text-[#00418E]"/> BỘ LỌC</h2>
            {activeFilterCount > 0 && (
              <button onClick={clearAllFilters} className="text-xs font-bold text-red-500 hover:underline flex items-center gap-1">
                <RotateCcw size={10} /> Đặt lại
              </button>
            )}
          </div>

          <div className="space-y-6">
            {/* 1. Danh mục */}
            <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm transition-all hover:shadow-md">
              <FilterSectionTitle 
                title="DANH MỤC" 
                icon={<Grid size={16}/>}
                expanded={expandedSections.cat} 
                onToggle={() => toggleSection('cat')} 
              />
              {expandedSections.cat && (
                <div className="mt-4 space-y-1 animate-fadeIn">
                  <button 
                    onClick={() => { setCategory('All'); setCurrentPage(1); }} 
                    className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-between group ${category === 'All' ? 'bg-[#00418E] text-white shadow-md shadow-blue-200' : 'text-gray-500 hover:bg-gray-50'}`}
                  >
                    Tất cả
                    {category === 'All' && <Check size={14} />}
                  </button>
                  {Object.values(ProductCategory).map(cat => (
                    <button 
                      key={cat} 
                      onClick={() => { setCategory(cat); setCurrentPage(1); }} 
                      className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-between group ${category === cat ? 'bg-[#00418E] text-white shadow-md shadow-blue-200' : 'text-gray-500 hover:bg-gray-50'}`}
                    >
                      {cat}
                      {category === cat && <Check size={14} />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 2. Khoảng giá */}
            <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm transition-all hover:shadow-md">
              <FilterSectionTitle 
                title="KHOẢNG GIÁ" 
                icon={<Tag size={16}/>}
                expanded={expandedSections.price} 
                onToggle={() => toggleSection('price')} 
              />
              {expandedSections.price && (
                <div className="mt-4 space-y-3 animate-fadeIn">
                  <div className="flex items-center gap-2">
                    <input 
                      type="number" 
                      placeholder="Từ" 
                      value={priceRange.min} 
                      onChange={e => setPriceRange({...priceRange, min: e.target.value})} 
                      className="w-full bg-gray-50 border border-transparent p-3 rounded-xl text-sm outline-none focus:bg-white focus:border-[#00418E] focus:ring-2 focus:ring-blue-50 transition-all font-bold text-center placeholder:font-normal"
                    />
                    <span className="text-gray-300 font-black">-</span>
                    <input 
                      type="number" 
                      placeholder="Đến" 
                      value={priceRange.max} 
                      onChange={e => setPriceRange({...priceRange, max: e.target.value})} 
                      className="w-full bg-gray-50 border border-transparent p-3 rounded-xl text-sm outline-none focus:bg-white focus:border-[#00418E] focus:ring-2 focus:ring-blue-50 transition-all font-bold text-center placeholder:font-normal"
                    />
                  </div>
                  <button className="w-full bg-white border-2 border-[#00418E] text-[#00418E] py-2.5 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-[#00418E] hover:text-white transition-all active:scale-95 shadow-sm">
                    Áp dụng
                  </button>
                </div>
              )}
            </div>

            {/* 3. Tình trạng */}
            <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm transition-all hover:shadow-md">
              <FilterSectionTitle 
                title="TÌNH TRẠNG" 
                icon={<Sparkles size={16}/>}
                expanded={expandedSections.cond} 
                onToggle={() => toggleSection('cond')} 
              />
              {expandedSections.cond && (
                <div className="mt-4 space-y-2 animate-fadeIn pl-1">
                  {Object.values(ProductCondition).map(cond => (
                    <CustomCheckbox 
                      key={cond} 
                      label={cond} 
                      checked={condition.includes(cond)} 
                      onChange={() => handleConditionChange(cond)} 
                    />
                  ))}
                </div>
              )}
            </div>

            {/* 4. Địa điểm */}
            <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm transition-all hover:shadow-md">
              <FilterSectionTitle 
                title="KHU VỰC" 
                icon={<MapPin size={16}/>}
                expanded={expandedSections.loc} 
                onToggle={() => toggleSection('loc')} 
              />
              {expandedSections.loc && (
                <div className="mt-4 space-y-2 animate-fadeIn pl-1">
                  {LOCATIONS.map(loc => (
                    <CustomCheckbox 
                      key={loc} 
                      label={loc} 
                      checked={selectedLocations.includes(loc)} 
                      onChange={() => handleLocationChange(loc)} 
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* ================= MAIN CONTENT ================= */}
        <div className="flex-1 w-full min-w-0">
          
          <MarketBanner />

          {/* Toolbar & Sort */}
          <div className="bg-white p-4 mb-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 sticky top-[80px] z-20 md:static">
            <div className="flex items-center gap-3">
               <div className="bg-[#00418E] text-white p-2 rounded-lg shadow-md shadow-blue-200">
                 <Filter size={18} />
               </div>
               <div>
                 <h2 className="text-sm font-bold text-gray-900 leading-tight">Kết quả tìm kiếm</h2>
                 <p className="text-xs text-gray-500 font-medium">Hiển thị <span className="text-[#00418E] font-bold">{products.length}</span> / {totalCount} tin đăng</p>
               </div>
            </div>
            
            <div className="flex items-center gap-3 overflow-x-auto pb-1 sm:pb-0 scrollbar-hide">
               {SORT_OPTIONS.map(opt => (
                 <button 
                   key={opt.value}
                   onClick={() => setSortBy(opt.value)}
                   className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap border ${sortBy === opt.value ? 'bg-[#00418E] text-white border-[#00418E] shadow-md' : 'bg-gray-50 text-gray-500 border-transparent hover:bg-gray-100'}`}
                 >
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

          {/* Active Filter Chips */}
          {activeFilterCount > 0 && (
            <div className="flex flex-wrap gap-2 mb-6 animate-fadeIn">
              {category !== 'All' && (
                <span className="px-3 py-1 bg-blue-50 text-[#00418E] rounded-lg text-xs font-bold flex items-center gap-1 border border-blue-100">
                  {category} <button onClick={() => setCategory('All')} className="hover:bg-blue-100 rounded-full p-0.5"><X size={10}/></button>
                </span>
              )}
              {condition.map(c => (
                <span key={c} className="px-3 py-1 bg-purple-50 text-purple-600 rounded-lg text-xs font-bold flex items-center gap-1 border border-purple-100">
                  {c} <button onClick={() => handleConditionChange(c)} className="hover:bg-purple-100 rounded-full p-0.5"><X size={10}/></button>
                </span>
              ))}
              {(priceRange.min || priceRange.max) && (
                <span className="px-3 py-1 bg-orange-50 text-orange-600 rounded-lg text-xs font-bold flex items-center gap-1 border border-orange-100">
                  {priceRange.min || 0} - {priceRange.max || '∞'}
                  <button onClick={() => setPriceRange({min: '', max: ''})} className="hover:bg-orange-100 rounded-full p-0.5"><X size={10}/></button>
                </span>
              )}
              <button onClick={clearAllFilters} className="text-xs text-gray-400 hover:text-red-500 underline ml-2">Xóa tất cả</button>
            </div>
          )}

          {/* --- PRODUCT GRID / LOADING STATE --- */}
          <div className="min-h-[400px]">
            {loading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                 {[...Array(8)].map((_, i) => (
                   <div key={i} className="bg-white rounded-3xl h-80 animate-pulse border border-gray-100 shadow-sm relative overflow-hidden">
                      <div className="h-48 bg-gray-200 w-full"></div>
                      <div className="p-4 space-y-3">
                        <div className="h-4 bg-gray-200 rounded-full w-3/4"></div>
                        <div className="h-3 bg-gray-200 rounded-full w-1/2"></div>
                        <div className="flex justify-between pt-2">
                          <div className="h-6 bg-gray-200 rounded-full w-20"></div>
                          <div className="h-6 bg-gray-200 rounded-full w-8"></div>
                        </div>
                      </div>
                      <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-r from-transparent via-white/50 to-transparent -translate-x-full animate-shimmer"></div>
                   </div>
                 ))}
              </div>
            ) : products.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[2rem] border-2 border-dashed border-gray-200 shadow-sm text-center px-4">
                 <div className="relative mb-6">
                    <div className="w-40 h-40 bg-gray-50 rounded-full flex items-center justify-center animate-pulse-slow">
                        <Ghost size={80} className="text-gray-200" />
                    </div>
                    <div className="absolute top-0 right-2 bg-red-100 p-2 rounded-full animate-bounce">
                        <Search size={20} className="text-red-400"/>
                    </div>
                 </div>
                 <h3 className="text-2xl font-black text-gray-300 uppercase tracking-widest mb-2">Trống trơn!</h3>
                 <p className="text-gray-400 text-sm font-medium max-w-xs mx-auto mb-8">
                   Không tìm thấy món đồ nào khớp với bộ lọc hiện tại. Thử tìm từ khóa khác xem sao?
                 </p>
                 <button 
                    onClick={clearAllFilters} 
                    className="px-10 py-3 bg-[#00418E] text-white rounded-xl font-bold shadow-lg shadow-blue-200 hover:bg-[#003370] hover:shadow-xl transition-all active:scale-95 flex items-center gap-2"
                 >
                    <RotateCcw size={16}/> Xóa bộ lọc & Thử lại
                 </button>
              </div>
            ) : (
              <div className={viewMode === 'grid' ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6" : "flex flex-col gap-4"}>
                {products.map((p, idx) => (
                  <div 
                    key={p.id} 
                    className="animate-in fade-in slide-in-from-bottom-4 duration-700 fill-mode-backwards" 
                    style={{animationDelay: `${idx * 50}ms`}}
                  >
                    <ProductCard 
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
          <Pagination 
            currentPage={currentPage} 
            totalPages={Math.ceil(totalCount / ITEMS_PER_PAGE)} 
            onPageChange={(page: number) => {
              setCurrentPage(page);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }} 
          />

        </div>
      </div>

      {/* ================= MOBILE FILTER MODAL ================= */}
      {showMobileFilter && (
        <div className="fixed inset-0 z-50 bg-white flex flex-col animate-in slide-in-from-bottom duration-300 md:hidden">
           {/* Modal Header */}
           <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-white sticky top-0 z-10 shadow-sm">
              <h2 className="font-black text-xl text-[#00418E] flex items-center gap-2 tracking-tight"><Filter size={20}/> BỘ LỌC</h2>
              <button onClick={() => setShowMobileFilter(false)} className="p-2 bg-gray-50 rounded-full hover:bg-gray-100 transition-colors text-gray-500"><X size={24}/></button>
           </div>
           
           {/* Modal Body */}
           <div className="p-5 space-y-8 overflow-y-auto flex-1 pb-32 bg-[#F8F9FA]">
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                 <h3 className="font-black mb-4 text-xs text-gray-400 uppercase tracking-widest">Danh mục</h3>
                 <div className="flex flex-wrap gap-2">
                    <button onClick={() => setCategory('All')} className={`px-4 py-2 rounded-xl border text-sm font-bold transition-all ${category === 'All' ? 'border-[#00418E] text-[#00418E] bg-blue-50' : 'border-gray-200 bg-white text-gray-500'}`}>Tất cả</button>
                    {Object.values(ProductCategory).map(cat => (
                       <button key={cat} onClick={() => setCategory(cat)} className={`px-4 py-2 rounded-xl border text-sm font-bold transition-all ${category === cat ? 'border-[#00418E] text-[#00418E] bg-blue-50' : 'border-gray-200 bg-white text-gray-500'}`}>{cat}</button>
                    ))}
                 </div>
              </div>

              <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                 <h3 className="font-black mb-4 text-xs text-gray-400 uppercase tracking-widest">Khoảng giá</h3>
                 <div className="flex gap-4 items-center">
                    <input type="number" placeholder="0đ" value={priceRange.min} onChange={e => setPriceRange({...priceRange, min: e.target.value})} className="flex-1 border-2 border-gray-100 p-4 bg-gray-50 rounded-xl font-bold text-center focus:border-[#00418E] focus:bg-white outline-none transition-all"/>
                    <span className="text-gray-300 font-black">-</span>
                    <input type="number" placeholder="MAX" value={priceRange.max} onChange={e => setPriceRange({...priceRange, max: e.target.value})} className="flex-1 border-2 border-gray-100 p-4 bg-gray-50 rounded-xl font-bold text-center focus:border-[#00418E] focus:bg-white outline-none transition-all"/>
                 </div>
              </div>

              <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                 <h3 className="font-black mb-4 text-xs text-gray-400 uppercase tracking-widest">Tình trạng</h3>
                 <div className="space-y-3">
                    {Object.values(ProductCondition).map(cond => (
                      <CustomCheckbox 
                        key={cond} 
                        label={cond} 
                        checked={condition.includes(cond)} 
                        onChange={() => handleConditionChange(cond)} 
                      />
                    ))}
                 </div>
              </div>
           </div>

           {/* Modal Footer */}
           <div className="absolute bottom-0 left-0 right-0 p-5 border-t border-gray-100 bg-white shadow-[0_-4px_20px_rgba(0,0,0,0.05)] flex gap-4">
              <button onClick={clearAllFilters} className="flex-1 py-4 font-bold text-gray-500 hover:bg-gray-50 rounded-2xl transition-all border border-gray-200">Đặt lại</button>
              <button onClick={() => setShowMobileFilter(false)} className="flex-[2] bg-[#00418E] text-white py-4 font-black rounded-2xl shadow-xl shadow-blue-200 active:scale-95 transition-transform uppercase tracking-widest text-sm">
                Xem {totalCount} kết quả
              </button>
           </div>
        </div>
      )}
    </div>
  );
};

export default MarketPage;
