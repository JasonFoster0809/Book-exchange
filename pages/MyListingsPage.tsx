import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Search, Sparkles, Filter, ArrowUpDown, BellRing, X, BellPlus, SlidersHorizontal, Clock, Tag, Gift, LayoutGrid, List as ListIcon, CheckCircle2, ShoppingBag, HandCoins, Loader2, ChevronDown } from 'lucide-react';
import ProductCard from '../components/ProductCard';
import ProductSkeleton from '../components/ProductSkeleton'; 
import { ProductCategory, Product, ProductStatus, ProductCondition } from '../types'; 
import { smartSearchInterpreter } from '../services/geminiService';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useTranslation } from 'react-i18next';

const PAGE_SIZE = 12; // Số lượng tin mỗi lần tải

const MarketplacePage: React.FC = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const { t } = useTranslation(); 

  // --- STATES ---
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  
  // States dữ liệu & Phân trang
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  
  // AI & UI States
  const [activeTab, setActiveTab] = useState<'sell' | 'buy'>('sell');
  const [hideSold, setHideSold] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [showHuntModal, setShowHuntModal] = useState(false);
  const [huntKeyword, setHuntKeyword] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // --- BỘ LỌC (FILTER STATES) ---
  const [sortBy, setSortBy] = useState<'newest' | 'price_asc' | 'price_desc'>('newest');
  const [priceRange, setPriceRange] = useState<{min: string, max: string}>({ min: '', max: '' });
  const [filterCondition, setFilterCondition] = useState<string>('All');
  const [filterTime, setFilterTime] = useState<string>('All'); 

  // Helper dịch danh mục
  const getCategoryLabel = (cat: string) => {
      if (cat === 'All') return t('market.cat_all');
      switch (cat) {
          case 'Textbook': case ProductCategory.TEXTBOOK: return t('market.cat_textbook');
          case 'Electronics': case ProductCategory.ELECTRONICS: return t('market.cat_electronics');
          case 'School Supplies': case ProductCategory.SUPPLIES: return t('market.cat_supplies');
          case 'Uniforms/Clothing': case ProductCategory.CLOTHING: return t('market.cat_clothing');
          case 'Other': case ProductCategory.OTHER: return t('market.cat_other');
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

  // 1. FETCH DATA (Hỗ trợ Pagination)
  const fetchProducts = useCallback(async (isLoadMore = false) => {
    const from = isLoadMore ? (page + 1) * PAGE_SIZE : 0;
    const to = from + PAGE_SIZE - 1;

    if (isLoadMore) setIsLoadingMore(true);
    else setLoading(true);

    try {
      const { data: productData, error: productError } = await supabase
        .from('products')
        // [QUAN TRỌNG] Lấy thêm is_verified, rating, completed_trades để truyền xuống ProductCard
        .select('*, profiles:seller_id (name, avatar_url, is_verified, rating, completed_trades)')
        .order('posted_at', { ascending: false })
        .range(from, to);

      if (productError) throw productError;

      let likedProductIds = new Set<string>();
      if (user) {
          const { data: savedData } = await supabase.from('saved_products').select('product_id').eq('user_id', user.id);
          if (savedData) savedData.forEach(item => likedProductIds.add(item.product_id));
      }

      const mappedProducts: Product[] = (productData || []).map((item: any) => ({
          id: item.id, sellerId: item.seller_id, title: item.title, description: item.description, price: item.price, category: item.category, condition: item.condition, images: item.images || [], tradeMethod: item.trade_method, postedAt: item.posted_at, isLookingToBuy: item.is_looking_to_buy,
          status: item.status || ProductStatus.AVAILABLE,
          isLiked: likedProductIds.has(item.id),
          view_count: item.view_count || 0,
          seller: item.profiles // Truyền object seller xuống con
      }));

      if (isLoadMore) {
        setAllProducts(prev => [...prev, ...mappedProducts]);
        setPage(prev => prev + 1);
      } else {
        setAllProducts(mappedProducts);
        setPage(0);
      }

      // Kiểm tra xem còn dữ liệu không
      setHasMore(mappedProducts.length === PAGE_SIZE);

    } catch (err: any) {
      addToast(t('market.error') + ": " + err.message, 'error');
    } finally {
      setLoading(false);
      setIsLoadingMore(false);
    }
  }, [user, page, addToast, t]);

  // Load lần đầu
  useEffect(() => {
    fetchProducts(false);
  }, []); // Chỉ chạy 1 lần khi mount, các dependency khác xử lý trong callback

  // 2. Logic Lọc & Sắp xếp (Client-side filtering trên dữ liệu đã tải)
  const filteredProducts = useMemo(() => {
    let result = [...allProducts];

    // Lọc theo Tab (Bán / Cần mua)
    if (activeTab === 'sell') result = result.filter(p => !p.isLookingToBuy);
    else result = result.filter(p => p.isLookingToBuy);

    // Lọc ẩn tin đã bán
    if (hideSold) result = result.filter(p => p.status !== ProductStatus.SOLD);

    if (selectedCategory !== 'All') result = result.filter(p => p.category === selectedCategory);

    if (searchTerm && !isSearching && !aiSuggestion) {
       const lower = searchTerm.toLowerCase();
       result = result.filter(p => p.title.toLowerCase().includes(lower) || p.description?.toLowerCase().includes(lower));
    }

    if (priceRange.min) result = result.filter(p => p.price >= Number(priceRange.min));
    if (priceRange.max) result = result.filter(p => p.price <= Number(priceRange.max));

    if (filterCondition !== 'All') {
        result = result.filter(p => p.condition === filterCondition);
    }

    if (filterTime !== 'All') {
        const now = new Date().getTime();
        result = result.filter(p => {
            const postedTime = new Date(p.postedAt).getTime();
            const diffHours = (now - postedTime) / (1000 * 60 * 60); 
            if (filterTime === '24h') return diffHours <= 24;
            if (filterTime === '7d') return diffHours <= 24 * 7;
            if (filterTime === '30d') return diffHours <= 24 * 30;
            return true;
        });
    }

    result.sort((a, b) => {
        if (a.isLiked && !b.isLiked) return -1;
        if (!a.isLiked && b.isLiked) return 1;
        if (sortBy === 'price_asc') return a.price - b.price;
        if (sortBy === 'price_desc') return b.price - a.price;
        return new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime();
    });

    return result;
  }, [allProducts, activeTab, hideSold, searchTerm, selectedCategory, isSearching, aiSuggestion, sortBy, priceRange, filterCondition, filterTime]);

  // Logic AI & Hunt
  const handleSmartSearch = async () => { if (!searchTerm) return; setIsSearching(true); setAiSuggestion(t('market.loading')); const result = await smartSearchInterpreter(searchTerm); if (result) { let filtered = allProducts; if (result.category) { setSelectedCategory(result.category); filtered = filtered.filter(p => p.category === result.category); } if (result.keywords.length > 0) { filtered = filtered.filter(p => { const content = (p.title + " " + p.description).toLowerCase(); return result.keywords.some(k => content.includes(k.toLowerCase())); }); } setPriceRange({ min: '', max: '' }); setAllProducts(filtered); setAiSuggestion(`AI: ${result.category ? getCategoryLabel(result.category) : t('market.all')} - "${result.keywords.join(', ')}"`); } else { setAiSuggestion("AI: " + t('market.no_product')); } setIsSearching(false); };
  const openHuntModal = () => { if (!user) { addToast(t('market.login_req'), "error"); return; } setHuntKeyword(searchTerm); setShowHuntModal(true); };
  const handleRegisterHunt = async (e: React.FormEvent) => { e.preventDefault(); if (!huntKeyword.trim()) return; const { error } = await supabase.from('hunts').insert({ user_id: user?.id, keyword: huntKeyword.trim() }); if (error) { addToast(t('market.error') + ": " + error.message, "error"); } else { addToast(`${t('market.hunt_success')}: "${huntKeyword}"`, "success"); setShowHuntModal(false); setHuntKeyword(''); } };

  // --- COMPONENT BỘ LỌC ---
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
                  <button onClick={() => {setSelectedCategory('All'); setPriceRange({min:'', max:''})}} className={`block w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${selectedCategory === 'All' && priceRange.max !== '0' ? 'bg-indigo-50 text-indigo-700 font-bold border-l-4 border-indigo-600' : 'text-gray-600 hover:bg-gray-50'}`}>{t('market.cat_all')}</button>
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
          <hr className="border-gray-100"/>

          <div>
              <h3 className="font-bold text-gray-900 mb-3 flex items-center text-sm uppercase tracking-wide"><Clock className="w-4 h-4 mr-2"/> Thời gian đăng</h3>
              <div className="space-y-2">
                  {[{ val: 'All', label: 'Mọi lúc' }, { val: '24h', label: '24 giờ qua' }, { val: '7d', label: '7 ngày qua' }, { val: '30d', label: 'Tháng này' }].map((opt) => (
                      <label key={opt.val} className="flex items-center space-x-2 cursor-pointer">
                          <input type="radio" checked={filterTime === opt.val} onChange={() => setFilterTime(opt.val)} className="text-indigo-600 focus:ring-indigo-500"/>
                          <span className="text-sm text-gray-700">{opt.label}</span>
                      </label>
                  ))}
              </div>
          </div>
          <hr className="border-gray-100"/>

          <div>
              <h3 className="font-bold text-gray-900 mb-3 text-sm uppercase tracking-wide">Khoảng giá</h3>
              <div className="flex items-center gap-2 mb-2">
                  <input type="number" placeholder="Min" className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-indigo-500" value={priceRange.min} onChange={e => setPriceRange({...priceRange, min: e.target.value})} />
                  <span className="text-gray-400">-</span>
                  <input type="number" placeholder="Max" className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-indigo-500" value={priceRange.max} onChange={e => setPriceRange({...priceRange, max: e.target.value})} />
              </div>
              {(priceRange.min || priceRange.max) && (<button onClick={() => setPriceRange({min: '', max: ''})} className="text-xs text-red-500 hover:underline w-full text-right font-medium">Xóa lọc giá</button>)}
          </div>
      </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-20 pt-6">
      <div className="sticky top-16 z-30 bg-white/80 backdrop-blur-md border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-16">
              <div className="flex gap-8 h-full">
                  <button onClick={() => setActiveTab('sell')} className={`flex items-center h-full border-b-2 px-1 text-sm font-bold transition-all ${activeTab === 'sell' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}><ShoppingBag className="w-4 h-4 mr-2" /> Sàn Đồ Cũ</button>
                  <button onClick={() => setActiveTab('buy')} className={`flex items-center h-full border-b-2 px-1 text-sm font-bold transition-all ${activeTab === 'buy' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}><HandCoins className="w-4 h-4 mr-2" /> Tin Cần Mua</button>
              </div>
              <button onClick={() => setShowMobileFilters(!showMobileFilters)} className="lg:hidden p-2 text-gray-500 bg-gray-100 rounded-xl"><SlidersHorizontal className="w-5 h-5"/></button>
          </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-6">
              <div className="space-y-1">
                  <h1 className="text-4xl font-black text-gray-900 tracking-tight flex items-center">
                      {activeTab === 'sell' ? 'Khám phá' : 'Tin cần mua'} <Sparkles className="ml-3 w-8 h-8 text-yellow-500 fill-current animate-pulse"/>
                  </h1>
                  <p className="text-gray-500 font-medium">{activeTab === 'sell' ? 'Hàng nghìn món đồ cũ đang đợi chủ mới' : 'Đồng môn đang tìm kiếm các món đồ này'}</p>
              </div>
              <div className="flex-1 max-w-2xl w-full flex gap-3">
                  <div className="relative flex-1 group">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                      <input type="text" className="block w-full pl-12 pr-4 py-4 bg-white border border-gray-200 rounded-2xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 shadow-sm transition-all outline-none font-medium" placeholder={t('market.search_placeholder')} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSmartSearch()}/>
                  </div>
                  <button onClick={openHuntModal} className="bg-orange-500 text-white px-6 py-4 rounded-2xl font-bold hover:bg-orange-600 shadow-lg shadow-orange-200 transition-all active:scale-95 flex items-center gap-2">
                      <BellRing className="w-5 h-5" /> <span className="hidden sm:inline">{t('market.hunt_btn')}</span>
                  </button>
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
                          <p className="text-sm text-gray-500 font-semibold">Tìm thấy <span className="text-gray-900">{filteredProducts.length}</span> kết quả</p>
                      </div>
                      <div className="flex items-center gap-4">
                          <div className="flex bg-gray-100 rounded-xl p-1">
                              <button onClick={() => setViewMode('grid')} className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400'}`}><LayoutGrid className="w-4 h-4" /></button>
                              <button onClick={() => setViewMode('list')} className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400'}`}><ListIcon className="w-4 h-4" /></button>
                          </div>
                          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)} className="text-xs border-none rounded-xl bg-white font-black text-gray-700 py-2.5 pl-4 pr-10 shadow-sm cursor-pointer outline-none ring-1 ring-gray-200 focus:ring-2 focus:ring-indigo-500 transition-all appearance-none" style={{ backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%236366f1%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center', backgroundSize: '16px' }}>
                              <option value="newest">{t('market.sort_newest')}</option>
                              <option value="price_asc">{t('market.sort_price_asc')}</option>
                              <option value="price_desc">{t('market.sort_price_desc')}</option>
                          </select>
                      </div>
                  </div>

                  {loading ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-8">
                          {[1, 2, 3, 4, 5, 6].map((n) => <ProductSkeleton key={n} />)}
                      </div>
                  ) : (
                    <div className={viewMode === 'grid' ? "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-8" : "flex flex-col gap-6"}>
                        {filteredProducts.map((product) => (
                           <ProductCard key={product.id} product={product} viewMode={viewMode} />
                        ))}
                    </div>
                  )}

                  {!loading && filteredProducts.length > 0 && hasMore && !searchTerm && (
                    <div className="mt-12 text-center">
                        <button 
                            onClick={() => fetchProducts(true)} 
                            disabled={isLoadingMore}
                            className="bg-white border border-gray-200 text-gray-600 px-8 py-3 rounded-full font-bold hover:bg-gray-50 hover:text-indigo-600 hover:border-indigo-200 transition-all shadow-sm flex items-center gap-2 mx-auto disabled:opacity-50"
                        >
                            {isLoadingMore ? (
                                <><Loader2 className="w-5 h-5 animate-spin"/> Đang tải...</>
                            ) : (
                                <><ChevronDown className="w-5 h-5"/> Xem thêm tin đăng</>
                            )}
                        </button>
                    </div>
                  )}

                  {!loading && filteredProducts.length === 0 && (
                      <div className="text-center py-32 bg-white rounded-[3rem] border-2 border-dashed border-gray-100 shadow-sm">
                          <Search className="w-16 h-16 text-gray-200 mx-auto mb-6" />
                          <h3 className="text-2xl font-black text-gray-900 mb-2">{t('market.no_product')}</h3>
                          <button onClick={() => {setSearchTerm(''); setSelectedCategory('All'); setFilterCondition('All'); setFilterTime('All'); setPriceRange({min:'', max:''}); setHideSold(true);}} className="text-indigo-600 font-bold hover:underline">Reset bộ lọc</button>
                      </div>
                  )}
              </div>
          </div>
      </div>
      {/* (Hunt Modal Code giữ nguyên...) */}
      {showHuntModal && (
          <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-fadeIn">
              <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-md p-10 relative overflow-hidden">
                  <button onClick={() => setShowHuntModal(false)} className="absolute top-8 right-8 text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-50 rounded-full transition-all"><X className="w-6 h-6"/></button>
                  <div className="text-center mb-10">
                      <div className="w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-6 border-8 border-white shadow-inner"><BellPlus className="w-10 h-10 text-indigo-600" /></div>
                      <h3 className="text-3xl font-black text-gray-900 leading-tight mb-3">{t('market.hunt_modal_title')}</h3>
                      <p className="text-gray-500 font-medium leading-relaxed">{t('market.hunt_desc')}</p>
                  </div>
                  <form onSubmit={handleRegisterHunt}>
                      <input type="text" required className="block w-full border border-gray-100 bg-gray-50 rounded-2xl p-5 focus:ring-4 focus:ring-indigo-100 focus:bg-white focus:border-indigo-500 outline-none transition-all text-lg font-bold mb-8" placeholder={t('market.hunt_input_label')} value={huntKeyword} onChange={(e) => setHuntKeyword(e.target.value)} autoFocus />
                      <button type="submit" className="w-full py-5 bg-indigo-600 text-white rounded-[1.5rem] font-black text-lg hover:bg-indigo-700 shadow-2xl shadow-indigo-200 transition-all active:scale-[0.97] uppercase tracking-widest">{t('market.hunt_submit')}</button>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};

export default MarketplacePage;