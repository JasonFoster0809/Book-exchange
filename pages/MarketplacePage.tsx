import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Search, Sparkles, X, BellPlus, Tag, LayoutGrid, List as ListIcon, ShieldCheck, ShoppingBag, HandCoins, CheckCircle2, Loader2, Filter as FilterIcon } from 'lucide-react';
import ProductCard from '../components/ProductCard';
import ProductSkeleton from '../components/ProductSkeleton'; 
import { ProductCategory, Product, ProductStatus, ProductCondition } from '../types'; 
import { smartSearchInterpreter } from '../services/geminiService';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useTranslation } from 'react-i18next';

const MarketplacePage: React.FC = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const { t } = useTranslation(); 

  // --- STATES ---
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  
  // UI States
  const [activeTab, setActiveTab] = useState<'sell' | 'buy'>('sell');
  const [hideSold, setHideSold] = useState(true);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [showHuntModal, setShowHuntModal] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // --- FILTER STATES ---
  const [sortBy, setSortBy] = useState<'newest' | 'price_asc' | 'price_desc'>('newest');
  const [priceRange, setPriceRange] = useState<{min: string, max: string}>({ min: '', max: '' });
  const [filterCondition, setFilterCondition] = useState<string>('All');

  // 1. FETCH DATA
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const { data: productData, error: productError } = await supabase
        .from('products')
        .select('*, profiles:seller_id (name, avatar_url)')
        .order('posted_at', { ascending: false });

      if (productError) throw productError;

      let likedProductIds = new Set<string>();
      if (user) {
        const { data: savedData } = await supabase.from('saved_products').select('product_id').eq('user_id', user.id);
        if (savedData) savedData.forEach(item => likedProductIds.add(item.product_id));
      }

      const mappedProducts: Product[] = (productData || []).map((item: any) => ({
        ...item,
        sellerId: item.seller_id, 
        tradeMethod: item.trade_method, 
        postedAt: item.posted_at, 
        status: item.status || ProductStatus.AVAILABLE,
        isLiked: likedProductIds.has(item.id),
        view_count: item.view_count || 0,
        seller: item.profiles 
      }));

      setAllProducts(mappedProducts);
    } catch (err) {
      addToast(t('market.error'), "error");
    } finally {
      setLoading(false);
    }
  }, [user, addToast, t]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  // 2. AI SMART SEARCH
  const handleAiSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;

    setIsAiProcessing(true);
    try {
      const result = await smartSearchInterpreter(searchTerm);
      if (result) {
        if (result.category) setSelectedCategory(result.category);
        if (result.maxPrice) setPriceRange(prev => ({ ...prev, max: result.maxPrice!.toString() }));
        addToast("AI đã tối ưu bộ lọc cho bạn!", "success");
      }
    } catch (err) {
      console.error("AI Error:", err);
    } finally {
      setIsAiProcessing(false);
    }
  };

  // 3. LOGIC LỌC
  const filteredProducts = useMemo(() => {
    let result = allProducts.filter(p => activeTab === 'sell' ? !p.isLookingToBuy : p.isLookingToBuy);

    if (hideSold) result = result.filter(p => p.status !== ProductStatus.SOLD);
    if (selectedCategory !== 'All') result = result.filter(p => p.category === selectedCategory);
    if (filterCondition !== 'All') result = result.filter(p => p.condition === filterCondition);
    
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(p => p.title.toLowerCase().includes(lower) || p.description?.toLowerCase().includes(lower));
    }

    if (priceRange.min) result = result.filter(p => p.price >= Number(priceRange.min));
    if (priceRange.max) result = result.filter(p => p.price <= Number(priceRange.max));

    result.sort((a, b) => {
      if (sortBy === 'price_asc') return a.price - b.price;
      if (sortBy === 'price_desc') return b.price - a.price;
      return new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime();
    });

    return result;
  }, [allProducts, activeTab, hideSold, selectedCategory, searchTerm, priceRange, filterCondition, sortBy]);

  const FilterPanel = () => (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-gray-900 text-xs uppercase tracking-widest">Trạng thái</h3>
        <button 
          onClick={() => setHideSold(!hideSold)}
          className={`text-[10px] px-3 py-1.5 rounded-full font-bold transition-all ${hideSold ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100' : 'bg-gray-100 text-gray-400'}`}
        >
          {hideSold ? 'ẨN TIN ĐÃ BÁN' : 'HIỆN TẤT CẢ'}
        </button>
      </div>
      
      <div>
        <h3 className="font-bold text-gray-900 mb-4 flex items-center text-xs uppercase tracking-widest">Khoảng giá (VNĐ)</h3>
        <div className="grid grid-cols-2 gap-2">
          <input 
            type="number" placeholder="Từ" 
            value={priceRange.min} onChange={(e) => setPriceRange({...priceRange, min: e.target.value})}
            className="bg-gray-50 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none w-full"
          />
          <input 
            type="number" placeholder="Đến" 
            value={priceRange.max} onChange={(e) => setPriceRange({...priceRange, max: e.target.value})}
            className="bg-gray-50 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none w-full"
          />
        </div>
      </div>

      <hr className="border-gray-100"/>
      
      <div>
        <h3 className="font-bold text-gray-900 mb-4 flex items-center text-xs uppercase tracking-widest"><Tag className="w-3.5 h-3.5 mr-2 text-blue-500"/> Tình trạng</h3>
        <div className="flex flex-wrap gap-2">
          {['All', ...Object.values(ProductCondition)].map(cond => (
            <button 
              key={cond} 
              onClick={() => setFilterCondition(cond)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filterCondition === cond ? 'bg-indigo-50 text-indigo-600 ring-1 ring-indigo-200' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}
            >
              {cond === 'All' ? 'Tất cả' : cond}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-20 pt-6">
      {/* 1. NAVIGATION TABS */}
      <div className="sticky top-16 z-30 bg-white/80 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between">
          <div className="flex gap-8 h-16">
            <button onClick={() => setActiveTab('sell')} className={`flex items-center h-full border-b-2 px-1 text-sm font-bold transition-all ${activeTab === 'sell' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              <ShoppingBag className="w-4 h-4 mr-2" /> Sàn Đồ Cũ
            </button>
            <button onClick={() => setActiveTab('buy')} className={`flex items-center h-full border-b-2 px-1 text-sm font-bold transition-all ${activeTab === 'buy' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              <HandCoins className="w-4 h-4 mr-2" /> Tin Cần Mua
            </button>
          </div>
          <button onClick={() => setShowMobileFilters(true)} className="lg:hidden p-2 text-gray-500 bg-gray-100 rounded-xl"><FilterIcon className="w-5 h-5"/></button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* 2. HEADER & AI SEARCH */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-6">
          <div className="space-y-1">
            <h1 className="text-4xl font-black text-gray-900 tracking-tight flex items-center">
              {activeTab === 'sell' ? 'Khám phá' : 'Tin cần mua'} <Sparkles className="ml-3 w-8 h-8 text-yellow-500 fill-current animate-pulse"/>
            </h1>
            <p className="text-gray-500 font-medium">Kết nối cộng đồng sinh viên - Mua bán an toàn</p>
          </div>
          
          <form onSubmit={handleAiSearch} className="flex-1 max-w-2xl w-full flex gap-3">
            <div className="relative flex-1 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
              <input 
                type="text" 
                className="block w-full pl-12 pr-4 py-4 bg-white border border-gray-200 rounded-2xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 shadow-sm transition-all outline-none font-medium" 
                placeholder="Thử gõ: 'Tìm giáo trình dưới 100k'..." 
                value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              />
              {isAiProcessing && <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-500 animate-spin" />}
            </div>
            <button onClick={() => setShowHuntModal(true)} type="button" className="bg-orange-500 text-white px-6 py-4 rounded-2xl font-bold hover:bg-orange-600 shadow-lg shadow-orange-200 transition-all active:scale-95"><BellPlus className="w-5 h-5" /></button>
          </form>
        </div>

        <div className="flex flex-col lg:flex-row gap-10 items-start">
          {/* 3. SIDEBAR */}
          <div className="hidden lg:block w-72 flex-shrink-0 sticky top-40">
            <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100">
              <div className="mb-8">
                <h3 className="font-bold text-gray-900 mb-4 text-xs uppercase tracking-widest">Danh mục</h3>
                <div className="flex flex-col gap-2">
                  <button onClick={() => setSelectedCategory('All')} className={`text-left px-4 py-2 rounded-xl text-sm font-bold transition-all ${selectedCategory === 'All' ? 'bg-indigo-600 text-white' : 'hover:bg-gray-50 text-gray-600'}`}>Tất cả</button>
                  {Object.values(ProductCategory).map(cat => (
                    <button key={cat} onClick={() => setSelectedCategory(cat)} className={`text-left px-4 py-2 rounded-xl text-sm font-bold transition-all ${selectedCategory === cat ? 'bg-indigo-600 text-white' : 'hover:bg-gray-50 text-gray-600'}`}>{cat}</button>
                  ))}
                </div>
              </div>
              <FilterPanel />
            </div>
          </div>

          {/* 4. MAIN LIST */}
          <div className="flex-1 w-full">
            <div className="mb-8 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <p className="text-sm text-gray-500 font-semibold">Tìm thấy <span className="text-gray-900">{filteredProducts.length}</span> kết quả</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex bg-gray-100 rounded-xl p-1">
                  <button onClick={() => setViewMode('grid')} className={`p-2 rounded-lg ${viewMode === 'grid' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400'}`}><LayoutGrid className="w-4 h-4" /></button>
                  <button onClick={() => setViewMode('list')} className={`p-2 rounded-lg ${viewMode === 'list' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400'}`}><ListIcon className="w-4 h-4" /></button>
                </div>
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)} className="text-xs border-none rounded-xl bg-white font-black text-gray-700 py-2.5 px-4 shadow-sm outline-none ring-1 ring-gray-200 transition-all">
                  <option value="newest">MỚI NHẤT</option>
                  <option value="price_asc">GIÁ TĂNG DẦN</option>
                  <option value="price_desc">GIÁ GIẢM DẦN</option>
                </select>
              </div>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-8">
                {[1, 2, 3, 4, 5, 6].map(n => <ProductSkeleton key={n} />)}
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-32 bg-white rounded-[3rem] border-2 border-dashed border-gray-100 shadow-sm">
                <Search className="w-16 h-16 text-gray-200 mx-auto mb-6" />
                <h3 className="text-2xl font-black text-gray-900 mb-2">Không tìm thấy món đồ nào</h3>
                <p className="text-gray-400 mb-8 max-w-xs mx-auto">Thử đổi từ khóa hoặc reset bộ lọc bạn nhé!</p>
                <button onClick={() => {setSearchTerm(''); setSelectedCategory('All'); setPriceRange({min:'', max:''}); setFilterCondition('All');}} className="bg-indigo-600 text-white px-10 py-4 rounded-2xl font-black shadow-xl hover:bg-indigo-700 transition-all">Làm mới bộ lọc</button>
              </div>
            ) : (
              <div className={viewMode === 'grid' ? "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-8" : "flex flex-col gap-6"}>
                {filteredProducts.map(product => (
                  <ProductCard key={product.id} product={product} viewMode={viewMode} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MOBILE FILTER OVERLAY */}
      {showMobileFilters && (
        <div className="fixed inset-0 z-[100] lg:hidden animate-fadeIn">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowMobileFilters(false)}></div>
          <div className="absolute right-0 top-0 bottom-0 w-80 bg-white p-8 overflow-y-auto">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-xl font-black">Bộ lọc</h2>
              <button onClick={() => setShowMobileFilters(false)} className="p-2 bg-gray-100 rounded-full"><X className="w-5 h-5"/></button>
            </div>
            <FilterPanel />
            <button onClick={() => setShowMobileFilters(false)} className="w-full mt-8 bg-indigo-600 text-white py-4 rounded-2xl font-black">ÁP DỤNG</button>
          </div>
        </div>
      )}

      {/* HUNT MODAL */}
      {showHuntModal && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-fadeIn">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-md p-10 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-orange-400 to-orange-600"></div>
            <button onClick={() => setShowHuntModal(false)} className="absolute top-8 right-8 text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-50 rounded-full transition-all"><X className="w-6 h-6"/></button>
            <div className="text-center mb-10">
              <div className="w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner"><BellPlus className="w-10 h-10 text-orange-500" /></div>
              <h3 className="text-2xl font-black text-gray-900 leading-tight">Đăng ký săn tin</h3>
              <p className="text-gray-500 font-medium mt-2">Chúng mình sẽ báo ngay khi món đồ bạn cần xuất hiện!</p>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); addToast("Đã kích hoạt chế độ săn tin!", "success"); setShowHuntModal(false); }}>
              <input type="text" required className="block w-full border border-gray-100 bg-gray-50 rounded-2xl p-5 focus:ring-4 focus:ring-orange-100 focus:bg-white outline-none transition-all text-lg font-bold mb-8" placeholder="VD: Sách tiếng Nhật..." />
              <button type="submit" className="w-full py-5 bg-orange-500 text-white rounded-[1.5rem] font-black text-lg hover:bg-orange-600 shadow-xl shadow-orange-100 transition-all active:scale-95 uppercase tracking-widest">Bật thông báo</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MarketplacePage;