import React, { useState, useEffect, useCallback } from 'react';
// --- ĐÃ SỬA: Thêm Link vào đây ---
import { useSearchParams, useNavigate, Link } from 'react-router-dom'; 
import { 
  Search, Filter, SlidersHorizontal, ArrowLeft, Loader2, 
  ChevronDown, X, Check, Grid, List as ListIcon, ShieldAlert
} from 'lucide-react';
import { supabase } from '../services/supabase';
import { Product, ProductCondition, ProductCategory, ProductStatus } from '../types';
import ProductCard from '../components/ProductCard';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';

const MarketPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const { addToast } = useToast();

  // --- STATE ---
  const initialSearch = searchParams.get('search') || '';
  const initialCat = searchParams.get('cat') || 'All';

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  // Filter States
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [category, setCategory] = useState(initialCat);
  const [priceRange, setPriceRange] = useState({ min: '', max: '' });
  const [condition, setCondition] = useState('All');
  const [sortBy, setSortBy] = useState('newest');
  const [showMobileFilter, setShowMobileFilter] = useState(false);

  // Sync URL params to State
  useEffect(() => {
    setSearchTerm(searchParams.get('search') || '');
    setCategory(searchParams.get('cat') || 'All');
  }, [searchParams]);

  // --- FETCH DATA ---
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('products')
        .select('*, profiles:seller_id(name, avatar_url)')
        .neq('status', 'deleted'); // Không hiện bài đã xóa

      // 1. Tìm kiếm
      if (searchTerm) {
        query = query.or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
      }

      // 2. Danh mục
      if (category !== 'All') {
        query = query.eq('category', category);
      }

      // 3. Tình trạng
      if (condition !== 'All') {
        query = query.eq('condition', condition);
      }

      // 4. Khoảng giá
      if (priceRange.min) query = query.gte('price', Number(priceRange.min));
      if (priceRange.max) query = query.lte('price', Number(priceRange.max));

      // 5. Sắp xếp
      if (sortBy === 'newest') query = query.order('posted_at', { ascending: false });
      if (sortBy === 'price_asc') query = query.order('price', { ascending: true });
      if (sortBy === 'price_desc') query = query.order('price', { ascending: false });

      const { data, error } = await query;
      if (error) throw error;

      if (data) {
        const mapped = data.map((item: any) => ({
          ...item,
          sellerId: item.seller_id,
          tradeMethod: item.trade_method,
          postedAt: item.posted_at,
          status: item.status,
          seller: item.profiles,
          view_count: item.view_count || 0
        }));
        setProducts(mapped);
      }
    } catch (err) {
      console.error(err);
      addToast("Lỗi tải dữ liệu", "error");
    } finally {
      setLoading(false);
    }
  }, [searchTerm, category, condition, priceRange, sortBy]);

  // Debounce fetch
  useEffect(() => {
    const timer = setTimeout(() => fetchProducts(), 300);
    return () => clearTimeout(timer);
  }, [fetchProducts]);

  // --- HANDLERS ---
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchParams({ search: searchTerm, cat: category });
  };

  const handleAdminDelete = async (productId: string) => {
    if (!window.confirm("Xóa bài viết này?")) return;
    const { error } = await supabase.from('products').update({ status: 'deleted' }).eq('id', productId);
    if (!error) {
      setProducts(prev => prev.filter(p => p.id !== productId));
      addToast("Đã xóa bài viết", "success");
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f5f5] font-sans text-[#1a1a1a]">
      {/* HEADER SEARCH (Blue Theme) */}
      <div className="bg-[#00418E] sticky top-0 z-30 shadow-md py-4 px-4">
        <div className="max-w-7xl mx-auto flex gap-4 items-center">
          <Link to="/" className="text-white hover:bg-white/10 p-2 rounded-full transition-all md:hidden"><ArrowLeft /></Link>
          <Link to="/" className="text-white font-black text-xl hidden md:block mr-8 tracking-tighter">CHỢ BK</Link>
          
          <form onSubmit={handleSearchSubmit} className="flex-1 relative max-w-3xl">
            <input 
              type="text" 
              placeholder="Tìm kiếm sản phẩm..." 
              className="w-full pl-4 pr-12 py-2.5 rounded-sm outline-none text-sm text-gray-800 shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <button type="submit" className="absolute right-1 top-1 bottom-1 bg-[#00418E] text-white px-4 rounded-sm hover:bg-[#003370] transition-all">
              <Search size={16} />
            </button>
          </form>

          <button className="md:hidden text-white" onClick={() => setShowMobileFilter(true)}><Filter /></button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 flex gap-6 items-start">
        
        {/* SIDEBAR FILTER (DESKTOP) */}
        <div className="hidden md:block w-64 flex-shrink-0 space-y-8">
          {/* Danh mục */}
          <div>
            <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2 text-sm uppercase"><SlidersHorizontal size={16}/> Danh mục</h3>
            <div className="space-y-2 pl-2">
              <button onClick={() => { setCategory('All'); setSearchParams({ search: searchTerm, cat: 'All' }); }} className={`block text-sm hover:text-[#00418E] transition-colors ${category === 'All' ? 'text-[#00418E] font-bold' : 'text-gray-600'}`}>Tất cả</button>
              {Object.values(ProductCategory).map(cat => (
                <button key={cat} onClick={() => { setCategory(cat); setSearchParams({ search: searchTerm, cat }); }} className={`block text-sm hover:text-[#00418E] transition-colors ${category === cat ? 'text-[#00418E] font-bold' : 'text-gray-600'}`}>
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Khoảng giá */}
          <div>
            <h3 className="font-bold text-gray-800 mb-3 text-sm uppercase">Khoảng giá</h3>
            <div className="flex items-center gap-2 mb-3">
              <input type="number" placeholder="₫ TỪ" value={priceRange.min} onChange={e => setPriceRange({...priceRange, min: e.target.value})} className="w-full border p-2 text-xs outline-none focus:border-[#00418E] bg-white"/>
              <span className="text-gray-400">-</span>
              <input type="number" placeholder="₫ ĐẾN" value={priceRange.max} onChange={e => setPriceRange({...priceRange, max: e.target.value})} className="w-full border p-2 text-xs outline-none focus:border-[#00418E] bg-white"/>
            </div>
            <button className="w-full bg-[#00418E] text-white py-2 text-xs font-bold uppercase tracking-widest hover:bg-[#003370] transition-all">Áp dụng</button>
          </div>

          {/* Tình trạng */}
          <div>
            <h3 className="font-bold text-gray-800 mb-3 text-sm uppercase">Tình trạng</h3>
            <div className="space-y-2 pl-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="condition" checked={condition === 'All'} onChange={() => setCondition('All')} className="accent-[#00418E]"/>
                <span className="text-sm text-gray-600">Tất cả</span>
              </label>
              {Object.values(ProductCondition).map(cond => (
                <label key={cond} className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="condition" checked={condition === cond} onChange={() => setCondition(cond)} className="accent-[#00418E]"/>
                  <span className="text-sm text-gray-600">{cond}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* MAIN CONTENT */}
        <div className="flex-1 w-full">
          {/* Toolbar */}
          <div className="bg-[#ededed] p-3 mb-4 flex items-center justify-between rounded-sm">
            <div className="flex items-center gap-4 text-sm">
              <span className="text-gray-600">Sắp xếp theo</span>
              <button onClick={() => setSortBy('newest')} className={`px-4 py-2 rounded-sm transition-all ${sortBy === 'newest' ? 'bg-[#00418E] text-white' : 'bg-white hover:bg-gray-50'}`}>Mới nhất</button>
              <button onClick={() => setSortBy('price_asc')} className={`px-4 py-2 rounded-sm transition-all ${sortBy === 'price_asc' ? 'bg-[#00418E] text-white' : 'bg-white hover:bg-gray-50'}`}>Giá thấp</button>
              <button onClick={() => setSortBy('price_desc')} className={`px-4 py-2 rounded-sm transition-all ${sortBy === 'price_desc' ? 'bg-[#00418E] text-white' : 'bg-white hover:bg-gray-50'}`}>Giá cao</button>
            </div>
            
            <div className="hidden md:flex items-center gap-1">
               <span className="text-sm mr-2"><span className="text-[#00418E] font-bold">{products.length}</span> sản phẩm</span>
               <button onClick={() => setViewMode('grid')} className={`p-2 ${viewMode === 'grid' ? 'text-[#00418E]' : 'text-gray-400'}`}><Grid size={18}/></button>
               <button onClick={() => setViewMode('list')} className={`p-2 ${viewMode === 'list' ? 'text-[#00418E]' : 'text-gray-400'}`}><ListIcon size={18}/></button>
            </div>
          </div>

          {/* Product Grid */}
          {loading ? (
            <div className="flex justify-center py-20"><Loader2 className="animate-spin text-[#00418E]" size={40} /></div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white shadow-sm border border-gray-100">
               <div className="w-32 h-32 bg-gray-50 rounded-full flex items-center justify-center mb-4"><Search size={48} className="text-gray-200"/></div>
               <h3 className="text-lg font-bold text-gray-500">Không tìm thấy sản phẩm nào</h3>
               <button onClick={() => { setSearchTerm(''); setCategory('All'); setCondition('All'); setPriceRange({min:'',max:''}); setSearchParams({}); }} className="mt-4 text-[#00418E] font-bold hover:underline">Xóa bộ lọc</button>
            </div>
          ) : (
            <div className={viewMode === 'grid' ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3" : "flex flex-col gap-3"}>
              {products.map(p => (
                <ProductCard 
                  key={p.id} 
                  product={p} 
                  viewMode={viewMode}
                  onAdminDelete={isAdmin ? handleAdminDelete : undefined}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* MOBILE FILTER MODAL */}
      {showMobileFilter && (
        <div className="fixed inset-0 z-50 bg-white">
           <div className="flex items-center justify-between p-4 border-b">
              <h2 className="font-bold text-lg text-[#00418E]">Bộ lọc tìm kiếm</h2>
              <button onClick={() => setShowMobileFilter(false)}><X size={24}/></button>
           </div>
           <div className="p-4 space-y-6 h-[calc(100vh-80px)] overflow-y-auto">
              <div>
                 <h3 className="font-bold mb-3 uppercase text-xs text-gray-500">Danh mục</h3>
                 <div className="flex flex-wrap gap-2">
                    <button onClick={() => setCategory('All')} className={`px-4 py-2 rounded-sm border text-sm ${category === 'All' ? 'border-[#00418E] text-[#00418E] bg-blue-50' : 'border-gray-200 bg-gray-50'}`}>Tất cả</button>
                    {Object.values(ProductCategory).map(cat => (
                       <button key={cat} onClick={() => setCategory(cat)} className={`px-4 py-2 rounded-sm border text-sm ${category === cat ? 'border-[#00418E] text-[#00418E] bg-blue-50' : 'border-gray-200 bg-gray-50'}`}>{cat}</button>
                    ))}
                 </div>
              </div>
              <div>
                 <h3 className="font-bold mb-3 uppercase text-xs text-gray-500">Khoảng giá</h3>
                 <div className="flex gap-2">
                    <input type="number" placeholder="Tối thiểu" value={priceRange.min} onChange={e => setPriceRange({...priceRange, min: e.target.value})} className="w-full border p-3 bg-gray-50 rounded-sm"/>
                    <input type="number" placeholder="Tối đa" value={priceRange.max} onChange={e => setPriceRange({...priceRange, max: e.target.value})} className="w-full border p-3 bg-gray-50 rounded-sm"/>
                 </div>
              </div>
           </div>
           <div className="absolute bottom-0 left-0 right-0 p-4 border-t bg-white">
              <button onClick={() => setShowMobileFilter(false)} className="w-full bg-[#00418E] text-white py-3 font-bold rounded-sm shadow-lg">Xem {products.length} kết quả</button>
           </div>
        </div>
      )}
    </div>
  );
};

export default MarketPage;
