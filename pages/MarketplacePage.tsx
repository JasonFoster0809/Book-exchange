import React, { useState, useEffect } from 'react';
import { Search, Sparkles, Filter, ArrowUpDown, BellRing, X, BellPlus, SlidersHorizontal, Clock, Tag, Gift } from 'lucide-react'; // Thêm Gift
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
  
  // States dữ liệu
  const [products, setProducts] = useState<Product[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  
  // AI & UI States
  const [isSearching, setIsSearching] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [showHuntModal, setShowHuntModal] = useState(false);
  const [huntKeyword, setHuntKeyword] = useState('');

  // --- BỘ LỌC (FILTER STATES) ---
  const [sortBy, setSortBy] = useState<'newest' | 'price_asc' | 'price_desc'>('newest');
  const [priceRange, setPriceRange] = useState<{min: string, max: string}>({ min: '', max: '' });
  
  // State lọc tình trạng và thời gian
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

  // Helper dịch tình trạng
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

  // 1. Fetch dữ liệu
  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      
      const { data: productData, error: productError } = await supabase
        .from('products')
        .select('*')
        .order('posted_at', { ascending: false });

      if (productError) {
        addToast(t('market.error') + ": " + productError.message, 'error');
        setLoading(false);
        return;
      }

      // Lấy danh sách đã tim
      let likedProductIds = new Set<string>();
      if (user) {
          const { data: savedData } = await supabase.from('saved_products').select('product_id').eq('user_id', user.id);
          if (savedData) savedData.forEach(item => likedProductIds.add(item.product_id));
      }

      const mappedProducts: Product[] = (productData || []).map((item: any) => ({
          id: item.id, sellerId: item.seller_id, title: item.title, description: item.description, price: item.price, category: item.category, condition: item.condition, images: item.images || [], tradeMethod: item.trade_method, postedAt: item.posted_at, isLookingToBuy: item.is_looking_to_buy,
          status: item.status || ProductStatus.AVAILABLE,
          isLiked: likedProductIds.has(item.id),
          view_count: item.view_count || 0 // [MỚI] Map view_count
      }));

      setAllProducts(mappedProducts);
      setProducts(mappedProducts);
      setLoading(false);
    };

    fetchProducts();
  }, [t, addToast, user]);

  // 2. Logic Lọc & Sắp xếp
  useEffect(() => {
    let result = [...allProducts];

    // Lọc Category
    if (selectedCategory !== 'All') result = result.filter(p => p.category === selectedCategory);

    // Lọc Search Text
    if (searchTerm && !isSearching && !aiSuggestion) {
       const lower = searchTerm.toLowerCase();
       result = result.filter(p => p.title.toLowerCase().includes(lower) || p.description.toLowerCase().includes(lower));
    }

    // Lọc Giá
    if (priceRange.min) result = result.filter(p => p.price >= Number(priceRange.min));
    if (priceRange.max) result = result.filter(p => p.price <= Number(priceRange.max));

    // Lọc Tình trạng
    if (filterCondition !== 'All') {
        result = result.filter(p => p.condition === filterCondition);
    }

    // Lọc Thời gian đăng
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

    // Sắp xếp
    result.sort((a, b) => {
        // Ưu tiên 1: Đã tim
        if (a.isLiked && !b.isLiked) return -1;
        if (!a.isLiked && b.isLiked) return 1;
        // Ưu tiên 2: Status (Sold xuống đáy)
        if (a.status === 'sold' && b.status !== 'sold') return 1;
        if (a.status !== 'sold' && b.status === 'sold') return -1;
        // Ưu tiên 3: Sort user chọn
        if (sortBy === 'price_asc') return a.price - b.price;
        if (sortBy === 'price_desc') return b.price - a.price;
        // Mặc định: Mới nhất
        return new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime();
    });

    setProducts(result);
  }, [searchTerm, selectedCategory, isSearching, allProducts, aiSuggestion, sortBy, priceRange, filterCondition, filterTime]);

  // Logic AI & Hunt
  const handleSmartSearch = async () => { if (!searchTerm) return; setIsSearching(true); setAiSuggestion(t('market.loading')); const result = await smartSearchInterpreter(searchTerm); if (result) { let filtered = allProducts; if (result.category) { setSelectedCategory(result.category); filtered = filtered.filter(p => p.category === result.category); } if (result.keywords.length > 0) { filtered = filtered.filter(p => { const content = (p.title + " " + p.description).toLowerCase(); return result.keywords.some(k => content.includes(k.toLowerCase())); }); } setPriceRange({ min: '', max: '' }); setProducts(filtered); setAiSuggestion(`AI: ${result.category ? getCategoryLabel(result.category) : t('market.all')} - "${result.keywords.join(', ')}"`); } else { setAiSuggestion("AI: " + t('market.no_product')); } setIsSearching(false); };
  const openHuntModal = () => { if (!user) { addToast(t('market.login_req'), "error"); return; } setHuntKeyword(searchTerm); setShowHuntModal(true); };
  const handleRegisterHunt = async (e: React.FormEvent) => { e.preventDefault(); if (!huntKeyword.trim()) return; const { error } = await supabase.from('hunts').insert({ user_id: user?.id, keyword: huntKeyword.trim() }); if (error) { addToast(t('market.error') + ": " + error.message, "error"); } else { addToast(`${t('market.hunt_success')}: "${huntKeyword}"`, "success"); setShowHuntModal(false); setHuntKeyword(''); } };

  // --- COMPONENT BỘ LỌC ---
  const FilterPanel = () => (
      <div className="space-y-6">
          {/* Danh mục */}
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

          {/* Tình trạng */}
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

          {/* Thời gian đăng */}
          <div>
              <h3 className="font-bold text-gray-900 mb-3 flex items-center text-sm uppercase tracking-wide"><Clock className="w-4 h-4 mr-2"/> Thời gian đăng</h3>
              <div className="space-y-2">
                  {[
                      { val: 'All', label: 'Mọi lúc' },
                      { val: '24h', label: '24 giờ qua' },
                      { val: '7d', label: '7 ngày qua' },
                      { val: '30d', label: 'Tháng này' }
                  ].map((opt) => (
                      <label key={opt.val} className="flex items-center space-x-2 cursor-pointer">
                          <input type="radio" checked={filterTime === opt.val} onChange={() => setFilterTime(opt.val)} className="text-indigo-600 focus:ring-indigo-500"/>
                          <span className="text-sm text-gray-700">{opt.label}</span>
                      </label>
                  ))}
              </div>
          </div>
          <hr className="border-gray-100"/>

          {/* Khoảng giá */}
          <div>
              <h3 className="font-bold text-gray-900 mb-3 text-sm uppercase tracking-wide">Khoảng giá</h3>
              <div className="flex items-center gap-2 mb-2">
                  <input type="number" placeholder="Min" className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-indigo-500" value={priceRange.min} onChange={e => setPriceRange({...priceRange, min: e.target.value})} />
                  <span className="text-gray-400">-</span>
                  <input type="number" placeholder="Max" className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-indigo-500" value={priceRange.max} onChange={e => setPriceRange({...priceRange, max: e.target.value})} />
              </div>
              {(priceRange.min || priceRange.max) && (<button onClick={() => setPriceRange({min: '', max: ''})} className="text-xs text-red-500 hover:underline w-full text-right font-medium">Xóa lọc giá</button>)}
          </div>
          <hr className="border-gray-100"/>

          {/* Sắp xếp */}
          <div>
              <h3 className="font-bold text-gray-900 mb-3 text-sm uppercase tracking-wide">Sắp xếp</h3>
              <div className="relative">
                  <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)} className="w-full border border-gray-300 rounded-md py-2 pl-3 pr-8 text-sm bg-white cursor-pointer focus:ring-2 focus:ring-indigo-500 appearance-none">
                      <option value="newest">{t('market.sort_newest')}</option>
                      <option value="price_asc">{t('market.sort_price_asc')}</option>
                      <option value="price_desc">{t('market.sort_price_desc')}</option>
                  </select>
                  <ArrowUpDown className="w-4 h-4 text-gray-500 absolute right-3 top-2.5 pointer-events-none"/>
              </div>
          </div>
      </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-20 pt-6">
      
      {/* --- QUICK LIST (Sticky) --- */}
      <div className="sticky top-16 z-30 bg-white shadow-sm border-b border-gray-200 py-3 overflow-x-auto no-scrollbar">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex gap-3">
              {/* NÚT GÓC 0 ĐỒNG (MỚI) */}
              <button 
                  onClick={() => {
                      setSelectedCategory('All'); 
                      setPriceRange({ min: '0', max: '0' }); 
                      setSortBy('newest');
                  }}
                  className={`whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-bold transition-all flex items-center gap-1 ${priceRange.max === '0' && priceRange.min === '0' ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-md' : 'bg-white border border-pink-200 text-pink-600 hover:bg-pink-50'}`}
              >
                  <Gift className="w-3.5 h-3.5" /> Góc 0 Đồng
              </button>

              <button 
                  onClick={() => {setSelectedCategory('All'); setPriceRange({min:'', max:''})}}
                  className={`whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-bold transition-all ${selectedCategory === 'All' && priceRange.max !== '0' ? 'bg-indigo-600 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                  {t('market.cat_all')}
              </button>
              {Object.values(ProductCategory).map((cat) => (
                  <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-bold transition-all ${selectedCategory === cat ? 'bg-indigo-600 text-white shadow-md' : 'bg-white border border-gray-200 text-gray-600 hover:border-indigo-300 hover:text-indigo-600'}`}
                  >
                      {getCategoryLabel(cat)}
                  </button>
              ))}
          </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* HEADER & SEARCH BAR */}
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
              <div>
                  <h1 className="text-3xl font-bold text-gray-900">{t('market.title')}</h1>
                  <p className="text-sm text-gray-500 mt-1">{t('market.subtitle')}</p>
              </div>
              <div className="flex-1 max-w-xl w-full">
                  <div className="flex gap-2">
                      <div className="relative flex-1">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Search className="h-5 w-5 text-gray-400" /></div>
                          <input type="text" className="block w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 shadow-sm transition-shadow hover:shadow-md" placeholder={t('market.search_placeholder')} value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); if(e.target.value === '') setAiSuggestion(null); }} onKeyDown={(e) => e.key === 'Enter' && handleSmartSearch()} />
                          <div className="absolute inset-y-0 right-0 flex items-center">
                              <button onClick={handleSmartSearch} className="p-2 text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 rounded-r-md border-l border-gray-300 flex items-center gap-1 text-xs font-medium h-full px-3" disabled={isSearching}>
                                  {isSearching ? '...' : <><Sparkles className="w-3 h-3" /> {t('market.ai_btn')}</>}
                              </button>
                          </div>
                      </div>
                      <button onClick={openHuntModal} className="bg-orange-500 text-white px-4 py-2 rounded-lg font-bold hover:bg-orange-600 shadow-md flex items-center whitespace-nowrap transition-transform active:scale-95" title={t('market.hunt_desc')}>
                          <BellRing className="w-5 h-5 mr-2" /> <span className="hidden sm:inline">{t('market.hunt_btn')}</span>
                      </button>
                  </div>
                  {aiSuggestion && (<div className="mt-2 text-xs text-indigo-600 flex items-center justify-between"><span className="flex items-center"><Sparkles className="w-3 h-3 mr-1" /> {aiSuggestion}</span><button onClick={() => {setSearchTerm(''); setSelectedCategory('All'); setAiSuggestion(null);}} className="hover:underline text-gray-500"><X className="w-3 h-3"/></button></div>)}
              </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-8 items-start">
              {/* CỘT TRÁI: SIDEBAR */}
              <div className="hidden lg:block w-64 flex-shrink-0 sticky top-24">
                  <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200"><FilterPanel /></div>
              </div>

              {/* CỘT PHẢI: NỘI DUNG */}
              <div className="flex-1 w-full">
                  <div className="lg:hidden mb-6 space-y-4">
                      <button onClick={() => setShowMobileFilters(!showMobileFilters)} className="w-full bg-white border border-gray-300 py-3 px-4 rounded-lg flex items-center justify-between font-bold text-gray-700 shadow-sm active:bg-gray-50">
                          <span className="flex items-center"><SlidersHorizontal className="w-4 h-4 mr-2" /> Bộ lọc & Danh mục</span>
                          <ArrowUpDown className={`w-4 h-4 transition-transform ${showMobileFilters ? 'rotate-180' : ''}`} />
                      </button>
                      {showMobileFilters && (<div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 animate-fadeIn"><FilterPanel /></div>)}
                  </div>

                  <div className="mb-4 flex items-center justify-between">
                      <p className="text-sm text-gray-500">Tìm thấy <span className="font-bold text-gray-900">{products.length}</span> tin đăng</p>
                  </div>

                  {loading ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                          {[1, 2, 3, 4, 5, 6].map((n) => <ProductSkeleton key={n} />)}
                      </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                        {products.map((product) => (
                           <ProductCard key={product.id} product={product} />
                        ))}
                        {products.length === 0 && (
                            <div className="col-span-full text-center py-20 bg-white rounded-xl border border-dashed border-gray-300">
                                <p className="text-gray-500 text-lg mb-4">{t('market.no_product')}</p>
                                <button onClick={() => {setSearchTerm(''); setSelectedCategory('All'); setPriceRange({min:'',max:''}); setFilterCondition('All'); setFilterTime('All');}} className="text-indigo-600 font-bold hover:underline">Xóa bộ lọc</button>
                            </div>
                        )}
                    </div>
                  )}
              </div>
          </div>
      </div>

      {showHuntModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 relative">
                  <button onClick={() => setShowHuntModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X className="w-5 h-5"/></button>
                  <div className="text-center mb-6">
                      <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-3"><BellPlus className="w-6 h-6 text-indigo-600" /></div>
                      <h3 className="text-lg font-bold text-gray-900">{t('market.hunt_modal_title')}</h3>
                      <p className="text-sm text-gray-500">{t('market.hunt_desc')}</p>
                  </div>
                  <form onSubmit={handleRegisterHunt}>
                      <div className="mb-4">
                          <label className="block text-sm font-medium text-gray-700 mb-1">{t('market.hunt_input_label')}</label>
                          <input type="text" required className="block w-full border border-gray-300 rounded-lg p-2.5 focus:ring-indigo-500 focus:border-indigo-500" placeholder="..." value={huntKeyword} onChange={(e) => setHuntKeyword(e.target.value)} autoFocus />
                      </div>
                      <button type="submit" className="w-full py-2.5 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 shadow-md">{t('market.hunt_submit')}</button>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};

export default MarketplacePage;