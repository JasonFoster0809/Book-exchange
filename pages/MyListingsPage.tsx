import React, { useState, useEffect, useCallback } from 'react';
import { 
  Search, Sparkles, Filter, SlidersHorizontal, Clock, Tag, 
  LayoutGrid, List as ListIcon, CheckCircle2, ShoppingBag, 
  HandCoins, Loader2, ChevronDown, Package 
} from 'lucide-react';
import ProductCard from '../components/ProductCard';
import ProductSkeleton from '../components/ProductSkeleton'; 
import { ProductCategory, Product, ProductStatus, ProductCondition } from '../types'; 
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useTranslation } from 'react-i18next';

const PAGE_SIZE = 12;

const MyListingsPage: React.FC = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const { t } = useTranslation(); 

  // --- STATES ---
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  
  // Tabs: Tin Đang Bán / Tin Cần Mua
  const [activeTab, setActiveTab] = useState<'sell' | 'buy'>('sell');
  const [hideSold, setHideSold] = useState(false); // Mặc định hiện cả tin đã bán để quản lý
  const [sortBy, setSortBy] = useState<'newest' | 'price_asc' | 'price_desc'>('newest');
  const [priceRange, setPriceRange] = useState<{min: string, max: string}>({ min: '', max: '' });
  const [filterCondition, setFilterCondition] = useState<string>('All');
  
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Helper Labels
  const getCategoryLabel = (cat: string) => {
      if (cat === 'All') return t('market.cat_all');
      switch (cat) {
          case ProductCategory.TEXTBOOK: return t('market.cat_textbook');
          case ProductCategory.ELECTRONICS: return t('market.cat_electronics');
          case ProductCategory.SUPPLIES: return t('market.cat_supplies');
          case ProductCategory.CLOTHING: return t('market.cat_clothing');
          case ProductCategory.OTHER: return t('market.cat_other');
          default: return cat; 
      }
  };

  const getConditionLabel = (cond: string) => {
      switch (cond) {
          case ProductCondition.NEW: return "Mới 100%";
          case ProductCondition.LIKE_NEW: return "Như mới";
          case ProductCondition.GOOD: return "Tốt";
          case ProductCondition.FAIR: return "Khá";
          case ProductCondition.POOR: return "Cũ";
          default: return cond;
      }
  };

  // --- FETCH DATA (Server-Side Filter) ---
  const fetchProducts = useCallback(async (isLoadMore = false) => {
    if (!user) return; // Bắt buộc phải đăng nhập

    const from = isLoadMore ? (page + 1) * PAGE_SIZE : 0;
    const to = from + PAGE_SIZE - 1;

    if (isLoadMore) setIsLoadingMore(true);
    else setLoading(true);

    try {
      let query = supabase
        .from('products')
        // FIX 1: Lấy thông tin người bán (chính mình)
        // FIX 2: verified_status thay vì is_verified
        .select('*, seller:profiles!seller_id (name, avatar_url, verified_status, rating, completed_trades)')
        // FIX 3: CHỈ LẤY TIN CỦA TÔI
        .eq('seller_id', user.id)
        .range(from, to);

      // --- FILTERS ---
      
      // 1. Tab Bán / Mua
      if (activeTab === 'buy') query = query.eq('is_looking_to_buy', true);
      else query = query.eq('is_looking_to_buy', false);

      // 2. Ẩn tin đã bán (nếu user muốn)
      if (hideSold) query = query.neq('status', 'sold');

      // 3. Category
      if (selectedCategory !== 'All') query = query.eq('category', selectedCategory);

      // 4. Search
      if (searchTerm) query = query.ilike('title', `%${searchTerm}%`);

      // 5. Price
      if (priceRange.min) query = query.gte('price', parseInt(priceRange.min));
      if (priceRange.max) query = query.lte('price', parseInt(priceRange.max));

      // 6. Condition
      if (filterCondition !== 'All') query = query.eq('condition', filterCondition);

      // 7. Sort (FIX 4: posted_at -> created_at)
      if (sortBy === 'price_asc') query = query.order('price', { ascending: true });
      else if (sortBy === 'price_desc') query = query.order('price', { ascending: false });
      else query = query.order('created_at', { ascending: false }); // Chuẩn database

      const { data: productData, error: productError } = await query;

      if (productError) throw productError;

      const mappedProducts: Product[] = (productData || []).map((item: any) => ({
          id: item.id, 
          sellerId: item.seller_id, 
          title: item.title, 
          description: item.description, 
          price: item.price, 
          category: item.category, 
          condition: item.condition, 
          images: item.images || [], 
          tradeMethod: item.trade_method, 
          postedAt: item.created_at, // Map từ created_at
          isLookingToBuy: item.is_looking_to_buy,
          status: item.status || ProductStatus.AVAILABLE,
          isLiked: false, // My listings thì ko cần check like
          view_count: item.view_count || 0,
          seller: item.seller 
      }));

      if (isLoadMore) {
        setAllProducts(prev => [...prev, ...mappedProducts]);
        setPage(prev => prev + 1);
      } else {
        setAllProducts(mappedProducts);
        setPage(0);
      }

      setHasMore(mappedProducts.length === PAGE_SIZE);

    } catch (err: any) {
      console.error(err);
      addToast(t('market.error'), 'error');
    } finally {
      setLoading(false);
      setIsLoadingMore(false);
    }
  }, [user, page, activeTab, hideSold, selectedCategory, searchTerm, priceRange, filterCondition, sortBy, addToast, t]);

  // Reload khi bộ lọc thay đổi
  useEffect(() => {
    const timer = setTimeout(() => {
        fetchProducts(false);
    }, 500);
    return () => clearTimeout(timer);
  }, [activeTab, hideSold, selectedCategory, searchTerm, priceRange, filterCondition, sortBy]); 

  // --- UI COMPONENTS ---
  const FilterPanel = () => (
      <div className="space-y-6">
           <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-900 text-xs uppercase tracking-widest">Trạng thái</h3>
              <button onClick={() => setHideSold(!hideSold)} className={`text-[10px] px-2 py-1 rounded-md font-bold transition-all ${hideSold ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-400'}`}>{hideSold ? 'ĐÃ ẨN TIN BÁN' : 'HIỆN TẤT CẢ'}</button>
          </div>
          <hr className="border-gray-100"/>
          
          <div>
              <h3 className="font-bold text-gray-900 mb-3 flex items-center text-sm uppercase tracking-wide"><Filter className="w-4 h-4 mr-2"/> {t('market.cat_all')}</h3>
              <div className="space-y-1">
                  <button onClick={() => {setSelectedCategory('All'); setPriceRange({min:'', max:''})}} className={`block w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${selectedCategory === 'All' && !priceRange.max ? 'bg-indigo-50 text-indigo-700 font-bold border-l-4 border-indigo-600' : 'text-gray-600 hover:bg-gray-50'}`}>{t('market.cat_all')}</button>
                  {Object.values(ProductCategory).map(cat => (
                      <button key={cat} onClick={() => setSelectedCategory(cat)} className={`block w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${selectedCategory === cat ? 'bg-indigo-50 text-indigo-700 font-bold border-l-4 border-indigo-600' : 'text-gray-600 hover:bg-gray-50'}`}>{getCategoryLabel(cat)}</button>
                  ))}
              </div>
          </div>
          <hr className="border-gray-100"/>

          <div>
              <h3 className="font-bold text-gray-900 mb-3 flex items-center text-sm uppercase tracking-wide"><Tag className="w-4 h-4 mr-2"/> Tình trạng</h3>
              <div className="space-y-2">
                  <label className="flex items-center space-x-2 cursor-pointer">
                      <input type="radio" checked={filterCondition === 'All'} onChange={() => setFilterCondition('All')} className="text-indigo-600 focus:ring-indigo-500"/>
                      <span className="text-sm text-gray-700">Tất cả</span>
                  </label>
                  {Object.values(ProductCondition).map(cond => (
                      <label key={cond} className="flex items-center space-x-2 cursor-pointer">
                          <input type="radio" checked={filterCondition === cond} onChange={() => setFilterCondition(cond)} className="text-indigo-600 focus:ring-indigo-500"/>
                          <span className="text-sm text-gray-700 truncate" title={getConditionLabel(cond)}>{getConditionLabel(cond)}</span>
                      </label>
                  ))}
              </div>
          </div>
      </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-20 pt-6">
      <div className="sticky top-16 z-30 bg-white/80 backdrop-blur-md border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-16">
              <div className="flex gap-8 h-full">
                  <button onClick={() => setActiveTab('sell')} className={`flex items-center h-full border-b-2 px-1 text-sm font-bold transition-all ${activeTab === 'sell' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}><ShoppingBag className="w-4 h-4 mr-2" /> Đang bán</button>
                  <button onClick={() => setActiveTab('buy')} className={`flex items-center h-full border-b-2 px-1 text-sm font-bold transition-all ${activeTab === 'buy' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}><HandCoins className="w-4 h-4 mr-2" /> Cần mua</button>
              </div>
              <button onClick={() => setShowMobileFilters(!showMobileFilters)} className="lg:hidden p-2 text-gray-500 bg-gray-100 rounded-xl"><SlidersHorizontal className="w-5 h-5"/></button>
          </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-6">
              <div className="space-y-1">
                  <h1 className="text-4xl font-black text-gray-900 tracking-tight flex items-center">
                      Quản lý tin đăng <Sparkles className="ml-3 w-8 h-8 text-yellow-500 fill-current animate-pulse"/>
                  </h1>
                  <p className="text-gray-500 font-medium">Danh sách các tin bạn đang đăng bán hoặc tìm mua.</p>
              </div>
              <div className="flex-1 max-w-2xl w-full flex gap-3">
                  <div className="relative flex-1 group">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                      <input type="text" className="block w-full pl-12 pr-4 py-4 bg-white border border-gray-200 rounded-2xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 shadow-sm transition-all outline-none font-medium" placeholder="Tìm trong tin của bạn..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                  </div>
              </div>
          </div>
          
          <div className="flex flex-col lg:flex-row gap-10 items-start">
              <div className="hidden lg:block w-72 flex-shrink-0 sticky top-40">
                  <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100"><FilterPanel /></div>
              </div>

              <div className="flex-1 w-full">
                  {showMobileFilters && (<div className="lg:hidden mb-6 bg-white p-4 rounded-xl shadow-sm border border-gray-200 animate-fadeIn"><FilterPanel /></div>)}

                  <div className="mb-8 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                          <p className="text-sm text-gray-500 font-semibold">Bạn có <span className="text-gray-900">{allProducts.length}</span> tin</p>
                      </div>
                      <div className="flex items-center gap-4">
                          <div className="flex bg-gray-100 rounded-xl p-1">
                              <button onClick={() => setViewMode('grid')} className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400'}`}><LayoutGrid className="w-4 h-4" /></button>
                              <button onClick={() => setViewMode('list')} className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400'}`}><ListIcon className="w-4 h-4" /></button>
                          </div>
                          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)} className="text-xs border-none rounded-xl bg-white font-black text-gray-700 py-2.5 pl-4 pr-10 shadow-sm cursor-pointer outline-none ring-1 ring-gray-200 focus:ring-2 focus:ring-indigo-500 transition-all appearance-none">
                              <option value="newest">{t('market.sort_newest')}</option>
                              <option value="price_asc">{t('market.sort_price_asc')}</option>
                              <option value="price_desc">{t('market.sort_price_desc')}</option>
                          </select>
                      </div>
                  </div>

                  {loading && !isLoadingMore ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-8">
                          {[1, 2, 3, 4, 5, 6].map((n) => <ProductSkeleton key={n} />)}
                      </div>
                  ) : (
                    <div className={viewMode === 'grid' ? "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-8" : "flex flex-col gap-6"}>
                        {allProducts.map((product) => (
                           <ProductCard key={product.id} product={product} viewMode={viewMode} />
                        ))}
                    </div>
                  )}

                  {!loading && allProducts.length > 0 && hasMore && (
                    <div className="mt-12 text-center">
                        <button 
                            onClick={() => fetchProducts(true)} 
                            disabled={isLoadingMore}
                            className="bg-white border border-gray-200 text-gray-600 px-8 py-3 rounded-full font-bold hover:bg-gray-50 hover:text-indigo-600 hover:border-indigo-200 transition-all shadow-sm flex items-center gap-2 mx-auto disabled:opacity-50"
                        >
                            {isLoadingMore ? (
                                <><Loader2 className="w-5 h-5 animate-spin"/> Đang tải...</>
                            ) : (
                                <><ChevronDown className="w-5 h-5"/> Xem thêm tin</>
                            )}
                        </button>
                    </div>
                  )}

                  {!loading && allProducts.length === 0 && (
                      <div className="text-center py-32 bg-white rounded-[3rem] border-2 border-dashed border-gray-100 shadow-sm">
                          <Package className="w-16 h-16 text-gray-200 mx-auto mb-6" />
                          <h3 className="text-2xl font-black text-gray-900 mb-2">Chưa có tin nào</h3>
                          <p className="text-gray-500 mb-6">Bạn chưa đăng tin nào trong mục này.</p>
                          <button onClick={() => {setSearchTerm(''); setSelectedCategory('All'); setFilterCondition('All'); setPriceRange({min:'', max:''}); setHideSold(false);}} className="text-indigo-600 font-bold hover:underline">Reset bộ lọc</button>
                      </div>
                  )}
              </div>
          </div>
      </div>
    </div>
  );
};

export default MyListingsPage;
