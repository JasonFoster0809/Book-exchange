import React, { useState, useEffect, useCallback } from 'react';
import { 
  Search, Sparkles, X, BellPlus, Tag, LayoutGrid, List as ListIcon, 
  CheckCircle2, Loader2, Filter as FilterIcon, ShoppingBag, HandCoins, 
  Mic, MicOff, GraduationCap, Gift, ChevronUp, TrendingUp, 
  BookOpen, Calculator, Shirt, Plug, Coffee, MoreHorizontal
} from 'lucide-react';
import ProductCard from '../components/ProductCard';
import ProductSkeleton from '../components/ProductSkeleton'; 
import { ProductCategory, Product, ProductStatus, ProductCondition } from '../types'; 
import { smartSearchInterpreter } from '../services/geminiService';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useTranslation } from 'react-i18next';
import { playNotificationSound } from '../utils/audio';

interface IWindow extends Window {
  webkitSpeechRecognition: any;
  SpeechRecognition: any;
}

const TRENDING_KEYWORDS = [
  "Giải tích 1", "Casio 580VN X", "Áo Bách Khoa", "Giáo trình Triết", 
  "Bàn học", "Quạt máy", "Tai nghe", "Laptop cũ"
];

const getCategoryIcon = (cat: string) => {
  switch (cat) {
    case 'Giáo trình': return <BookOpen className="w-5 h-5"/>;
    case 'Đồ điện tử': return <Plug className="w-5 h-5"/>;
    case 'Thời trang': return <Shirt className="w-5 h-5"/>;
    case 'Dụng cụ học tập': return <Calculator className="w-5 h-5"/>;
    case 'Gia dụng': return <Coffee className="w-5 h-5"/>;
    default: return <MoreHorizontal className="w-5 h-5"/>;
  }
};

const HeroBanner = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const slides = [
    {
      id: 1,
      title: "Mùa Thi Sắp Đến!",
      desc: "Săn ngay tài liệu, phao thi (đùa thôi) giá rẻ.",
      bg: "bg-gradient-to-r from-[#034EA2] to-[#0073e6]",
      icon: <GraduationCap className="w-32 h-32 text-white/20 absolute -bottom-4 -right-4 rotate-12" />
    },
    {
      id: 2,
      title: "Xả Kho Đồ Công Nghệ",
      desc: "Laptop, chuột, phím cơ pass lại giá sinh viên.",
      bg: "bg-gradient-to-r from-orange-500 to-red-500",
      icon: <Plug className="w-32 h-32 text-white/20 absolute -bottom-4 -right-4 rotate-12" />
    },
    {
      id: 3,
      title: "Góc 0 Đồng BK",
      desc: "Lan tỏa yêu thương, tặng lại đồ cũ cho bạn cần.",
      bg: "bg-gradient-to-r from-green-500 to-emerald-600",
      icon: <Gift className="w-32 h-32 text-white/20 absolute -bottom-4 -right-4 rotate-12" />
    }
  ];

  useEffect(() => {
    const timer = setInterval(() => setCurrentSlide((prev) => (prev + 1) % slides.length), 4000);
    return () => clearInterval(timer);
  }, [slides.length]);

  return (
    <div className="relative w-full h-48 md:h-60 rounded-[2rem] overflow-hidden shadow-xl mb-8 group ring-4 ring-white/50">
      {slides.map((slide, index) => (
        <div key={slide.id} className={`absolute inset-0 transition-opacity duration-1000 ease-in-out flex items-center px-8 md:px-12 ${index === currentSlide ? 'opacity-100' : 'opacity-0'}`}>
          <div className={`absolute inset-0 ${slide.bg}`}></div>
          <div className="relative z-10 text-white max-w-2xl">
            <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-[10px] md:text-xs font-bold uppercase tracking-widest mb-2 inline-block border border-white/30">Tin Nổi Bật</span>
            <h2 className="text-2xl md:text-4xl font-black mb-2 leading-tight drop-shadow-md">{slide.title}</h2>
            <p className="text-white/90 text-sm md:text-lg font-medium">{slide.desc}</p>
          </div>
          {slide.icon}
        </div>
      ))}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
        {slides.map((_, idx) => (
          <button key={idx} onClick={() => setCurrentSlide(idx)} className={`h-1.5 rounded-full transition-all ${currentSlide === idx ? 'bg-white w-8' : 'bg-white/40 w-2'}`} />
        ))}
      </div>
    </div>
  );
};

const MarketplacePage: React.FC = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const { t } = useTranslation(); 

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalResult, setTotalResult] = useState(0);

  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [activeTab, setActiveTab] = useState<'sell' | 'buy'>('sell');
  const [hideSold, setHideSold] = useState(true);
  const [onlyFree, setOnlyFree] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'newest' | 'price_asc' | 'price_desc'>('newest');
  const [priceRange, setPriceRange] = useState<{min: string, max: string}>({ min: '', max: '' });
  const [filterCondition, setFilterCondition] = useState<string>('All');

  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [showHuntModal, setShowHuntModal] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [isListening, setIsListening] = useState(false);

  useEffect(() => {
    const handleScroll = () => setShowScrollTop(window.scrollY > 300);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearchTerm(searchTerm), 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase.from('products').select('*, profiles:seller_id (name, avatar_url)', { count: 'exact' });

      query = query.eq('is_looking_to_buy', activeTab === 'buy');
      if (hideSold) query = query.neq('status', ProductStatus.SOLD);
      if (selectedCategory !== 'All') query = query.eq('category', selectedCategory);
      if (filterCondition !== 'All') query = query.eq('condition', filterCondition);
      
      if (onlyFree) query = query.eq('price', 0);
      else {
        if (priceRange.min) query = query.gte('price', Number(priceRange.min));
        if (priceRange.max) query = query.lte('price', Number(priceRange.max));
      }

      if (debouncedSearchTerm) query = query.or(`title.ilike.%${debouncedSearchTerm}%,description.ilike.%${debouncedSearchTerm}%`);

      if (sortBy === 'newest') query = query.order('posted_at', { ascending: false });
      if (sortBy === 'price_asc') query = query.order('price', { ascending: true });
      if (sortBy === 'price_desc') query = query.order('price', { ascending: false });

      const { data, error, count } = await query;
      if (error) throw error;
      
      setTotalResult(count || 0);
      
      let likedProductIds = new Set<string>();
      if (user) {
        const { data: savedData } = await supabase.from('saved_products').select('product_id').eq('user_id', user.id);
        if (savedData) savedData.forEach(item => likedProductIds.add(item.product_id));
      }

      setProducts((data || []).map((item: any) => ({
        ...item, sellerId: item.seller_id, tradeMethod: item.trade_method, postedAt: item.posted_at, 
        status: item.status || ProductStatus.AVAILABLE, isLiked: likedProductIds.has(item.id), 
        view_count: item.view_count || 0, seller: item.profiles 
      })));
    } catch (err) {
      addToast(t('market.error'), "error");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearchTerm, selectedCategory, activeTab, hideSold, onlyFree, priceRange, filterCondition, sortBy, user, addToast, t]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const handleVoiceSearch = () => {
    const windowObj = window as unknown as IWindow;
    const SpeechRecognition = windowObj.SpeechRecognition || windowObj.webkitSpeechRecognition;
    if (!SpeechRecognition) return addToast("Trình duyệt không hỗ trợ.", "error");

    const recognition = new SpeechRecognition();
    recognition.lang = 'vi-VN';
    setIsListening(true);
    recognition.start();

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setSearchTerm(transcript);
      setIsListening(false);
      addToast(`Đang tìm: "${transcript}"`, "info");
    };
    recognition.onspeechend = () => { recognition.stop(); setIsListening(false); };
    recognition.onerror = () => setIsListening(false);
  };

  const handleAiSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;
    setIsAiProcessing(true);
    try {
      const result = await smartSearchInterpreter(searchTerm);
      if (result) {
        if (result.category) setSelectedCategory(result.category);
        if (result.maxPrice) setPriceRange(prev => ({ ...prev, max: result.maxPrice!.toString() }));
        playNotificationSound();
        addToast("AI đã tối ưu bộ lọc!", "success");
      }
    } catch (err) { console.error(err); } finally { setIsAiProcessing(false); }
  };

  const handleTrendingClick = (keyword: string) => {
    setSearchTerm(keyword);
    playNotificationSound();
  };

  const FilterPanel = () => (
    <div className="space-y-6 animate-fadeIn">
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-xl border border-green-100 shadow-sm">
        <div className="flex items-center justify-between cursor-pointer" onClick={() => setOnlyFree(!onlyFree)}>
            <div className="flex items-center gap-2">
                <Gift className="w-5 h-5 text-green-600 animate-bounce" />
                <span className="font-bold text-green-700 text-sm">Góc 0 Đồng</span>
            </div>
            <div className={`w-10 h-6 rounded-full p-1 transition-colors ${onlyFree ? 'bg-green-500' : 'bg-gray-300'}`}>
                <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${onlyFree ? 'translate-x-4' : ''}`}></div>
            </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h3 className="font-bold text-[#034EA2] text-xs uppercase tracking-widest">Trạng thái</h3>
        <button onClick={() => setHideSold(!hideSold)} className={`text-[10px] px-3 py-1.5 rounded-full font-bold transition-all ${hideSold ? 'bg-[#034EA2] text-white shadow-md' : 'bg-gray-100 text-gray-400'}`}>
          {hideSold ? 'ẨN ĐÃ BÁN' : 'HIỆN TẤT CẢ'}
        </button>
      </div>

      <div className={onlyFree ? 'opacity-50 pointer-events-none' : ''}>
        <h3 className="font-bold text-[#034EA2] mb-4 flex items-center text-xs uppercase tracking-widest">Khoảng giá</h3>
        <div className="grid grid-cols-2 gap-2">
          <input type="number" placeholder="Từ" value={priceRange.min} onChange={(e) => setPriceRange({...priceRange, min: e.target.value})} className="bg-gray-50 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-[#034EA2] outline-none w-full" />
          <input type="number" placeholder="Đến" value={priceRange.max} onChange={(e) => setPriceRange({...priceRange, max: e.target.value})} className="bg-gray-50 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-[#034EA2] outline-none w-full" />
        </div>
      </div>

      <hr className="border-gray-100"/>
      <div>
        <h3 className="font-bold text-[#034EA2] mb-4 flex items-center text-xs uppercase tracking-widest"><Tag className="w-3.5 h-3.5 mr-2 text-[#00B0F0]"/> Tình trạng</h3>
        <div className="flex flex-wrap gap-2">
          {['All', ...Object.values(ProductCondition)].map(cond => (
            <button key={cond} onClick={() => setFilterCondition(cond)} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filterCondition === cond ? 'bg-blue-50 text-[#034EA2] ring-1 ring-blue-200' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}>
              {cond === 'All' ? 'Tất cả' : cond}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen relative pb-20 pt-6 bg-[#F8FAFC]">
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center opacity-[0.03] blur-[1px]" style={{ backgroundImage: "url('https://upload.wikimedia.org/wikipedia/commons/thumb/e/e8/Hcmut_official.jpg/1200px-Hcmut_official.jpg')" }} ></div>
      </div>

      <div className="relative z-10">
        <div className="sticky top-16 z-30 bg-white/90 backdrop-blur-md border-b border-gray-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-16">
            <div className="flex gap-8 h-full">
              <button onClick={() => setActiveTab('sell')} className={`flex items-center h-full border-b-4 px-1 text-sm font-bold transition-all ${activeTab === 'sell' ? 'border-[#034EA2] text-[#034EA2]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                <ShoppingBag className="w-4 h-4 mr-2" /> Sàn Đồ Cũ
              </button>
              <button onClick={() => setActiveTab('buy')} className={`flex items-center h-full border-b-4 px-1 text-sm font-bold transition-all ${activeTab === 'buy' ? 'border-[#034EA2] text-[#034EA2]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                <HandCoins className="w-4 h-4 mr-2" /> Tin Cần Mua
              </button>
            </div>
            <button onClick={() => setShowMobileFilters(true)} className="lg:hidden p-2 text-gray-500 bg-gray-100 rounded-xl"><FilterIcon className="w-5 h-5"/></button>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-6">
            <div className="space-y-1">
              <h1 className="text-3xl md:text-4xl font-black text-[#034EA2] tracking-tight flex items-center">
                {activeTab === 'sell' ? 'Chợ Bách Khoa' : 'Cần Mua Gì?'} 
                <GraduationCap className="ml-3 w-8 h-8 md:w-10 md:h-10 text-[#00B0F0] animate-bounce"/>
              </h1>
              <p className="text-gray-600 font-medium text-sm md:text-base">Kết nối sinh viên BK - Uy tín - Giá rẻ</p>
            </div>
            
            <form onSubmit={handleAiSearch} className="flex-1 max-w-2xl w-full flex gap-3">
              <div className="relative flex-1 group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-[#034EA2] transition-colors" />
                <input 
                  type="text" 
                  className="block w-full pl-12 pr-12 py-4 bg-white border border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-[#034EA2] shadow-sm transition-all outline-none font-medium text-gray-700" 
                  placeholder={isListening ? "Đang nghe..." : "Thử: 'Giáo trình', 'Casio 580', 'Quạt máy'..."}
                  value={searchTerm} 
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <button type="button" onClick={handleVoiceSearch} className={`absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full transition-all ${isListening ? 'bg-red-50 text-red-500 animate-pulse ring-2 ring-red-200' : 'text-gray-400 hover:text-[#034EA2] hover:bg-blue-50'}`}>
                  {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>
                {isAiProcessing && <Loader2 className="absolute right-14 top-1/2 -translate-y-1/2 w-5 h-5 text-[#034EA2] animate-spin" />}
              </div>
              <button onClick={() => setShowHuntModal(true)} type="button" className="bg-[#00B0F0] text-white px-5 md:px-6 py-4 rounded-2xl font-bold hover:bg-[#0095da] shadow-lg shadow-blue-200 transition-all active:scale-95">
                  <BellPlus className="w-5 h-5" />
              </button>
            </form>
          </div>

          <div className="flex flex-wrap items-center gap-2 mb-8 animate-fadeIn">
            <span className="flex items-center text-xs font-bold text-gray-500 uppercase tracking-wider mr-2"><TrendingUp className="w-3 h-3 mr-1"/> Hot Search:</span>
            {TRENDING_KEYWORDS.map(keyword => (
              <button key={keyword} onClick={() => handleTrendingClick(keyword)} className="px-3 py-1 bg-white border border-gray-200 rounded-full text-xs font-medium text-gray-600 hover:border-[#034EA2] hover:text-[#034EA2] transition-colors">
                {keyword}
              </button>
            ))}
          </div>

          <HeroBanner />

          <div className="flex gap-4 overflow-x-auto pb-4 mb-8 no-scrollbar md:hidden">
             {Object.values(ProductCategory).map(cat => (
               <button key={cat} onClick={() => setSelectedCategory(cat)} className={`flex-shrink-0 flex flex-col items-center justify-center p-3 rounded-xl bg-white border shadow-sm min-w-[80px] transition-all ${selectedCategory === cat ? 'border-[#034EA2] bg-blue-50' : 'border-gray-100'}`}>
                 <div className={`p-2 rounded-full mb-1 ${selectedCategory === cat ? 'bg-[#034EA2] text-white' : 'bg-gray-100 text-gray-500'}`}>
                    {getCategoryIcon(cat)}
                 </div>
                 <span className={`text-[10px] font-bold text-center ${selectedCategory === cat ? 'text-[#034EA2]' : 'text-gray-600'}`}>{cat}</span>
               </button>
             ))}
          </div>

          <div className="flex flex-col lg:flex-row gap-10 items-start">
            <div className="hidden lg:block w-72 flex-shrink-0 sticky top-40">
              <div className="bg-white/95 backdrop-blur-sm p-6 rounded-[1.5rem] shadow-sm border border-blue-100">
                <div className="mb-6">
                  <h3 className="font-bold text-[#034EA2] mb-3 text-xs uppercase tracking-widest">Danh mục</h3>
                  <div className="flex flex-col gap-1.5">
                    <button onClick={() => setSelectedCategory('All')} className={`text-left px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${selectedCategory === 'All' ? 'bg-[#034EA2] text-white shadow-md' : 'hover:bg-blue-50 text-gray-600'}`}>Tất cả</button>
                    {Object.values(ProductCategory).map(cat => (
                      <button key={cat} onClick={() => setSelectedCategory(cat)} className={`flex items-center text-left px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${selectedCategory === cat ? 'bg-[#034EA2] text-white shadow-md' : 'hover:bg-blue-50 text-gray-600'}`}>
                        <span className="mr-2 opacity-80">{getCategoryIcon(cat)}</span> {cat}
                      </button>
                    ))}
                  </div>
                </div>
                <FilterPanel />
              </div>
            </div>

            <div className="flex-1 w-full">
              <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-orange-500 animate-pulse" />
                  <p className="text-sm text-gray-600 font-semibold">Tìm thấy <span className="text-[#034EA2] font-bold text-lg">{totalResult}</span> món đồ</p>
                </div>
                <div className="flex items-center gap-3 ml-auto">
                  <div className="flex bg-white border border-gray-200 rounded-xl p-1 shadow-sm">
                    <button onClick={() => setViewMode('grid')} className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-[#034EA2] text-white shadow-md' : 'text-gray-400 hover:bg-gray-50'}`}><LayoutGrid className="w-4 h-4" /></button>
                    <button onClick={() => setViewMode('list')} className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-[#034EA2] text-white shadow-md' : 'text-gray-400 hover:bg-gray-50'}`}><ListIcon className="w-4 h-4" /></button>
                  </div>
                  <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)} className="text-xs border-none rounded-xl bg-white font-bold text-[#034EA2] py-3 px-8 shadow-sm outline-none ring-1 ring-blue-100 transition-all cursor-pointer hover:shadow-md">
                    <option value="newest">MỚI NHẤT</option>
                    <option value="price_asc">GIÁ TĂNG DẦN</option>
                    <option value="price_desc">GIÁ GIẢM DẦN</option>
                  </select>
                </div>
              </div>

              {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                  {[1, 2, 3, 4, 5, 6].map(n => <ProductSkeleton key={n} />)}
                </div>
              ) : products.length === 0 ? (
                <div className="text-center py-20 bg-white/80 rounded-[2rem] border-2 border-dashed border-blue-100 shadow-sm">
                  <Search className="w-20 h-20 text-blue-200 mx-auto mb-6" />
                  <h3 className="text-2xl font-black text-[#034EA2] mb-2">Không tìm thấy món nào</h3>
                  <p className="text-gray-500 mb-8 max-w-xs mx-auto">Thử đổi từ khóa hoặc dùng AI Search xem sao!</p>
                  <button onClick={() => {setSearchTerm(''); setDebouncedSearchTerm(''); setSelectedCategory('All'); setPriceRange({min:'', max:''}); setFilterCondition('All'); setOnlyFree(false);}} className="bg-[#034EA2] text-white px-8 py-3 rounded-xl font-bold shadow-lg hover:bg-blue-800 transition-all">Xóa bộ lọc</button>
                </div>
              ) : (
                <div className={viewMode === 'grid' ? "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6" : "flex flex-col gap-4"}>
                  {products.map(product => (
                    <ProductCard key={product.id} product={product} viewMode={viewMode} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {showMobileFilters && (
          <div className="fixed inset-0 z-[100] lg:hidden animate-fadeIn">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowMobileFilters(false)}></div>
            <div className="absolute right-0 top-0 bottom-0 w-80 bg-white p-6 overflow-y-auto shadow-2xl">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-xl font-black text-[#034EA2]">Bộ lọc tìm kiếm</h2>
                <button onClick={() => setShowMobileFilters(false)} className="p-2 bg-gray-100 rounded-full hover:bg-red-50 hover:text-red-500 transition-colors"><X className="w-5 h-5"/></button>
              </div>
              <FilterPanel />
              <button onClick={() => setShowMobileFilters(false)} className="w-full mt-8 bg-[#034EA2] text-white py-4 rounded-xl font-bold shadow-lg shadow-blue-200 active:scale-95 transition-transform">Áp dụng bộ lọc</button>
            </div>
          </div>
        )}

        {showHuntModal && (
          <div className="fixed inset-0 bg-[#034EA2]/20 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-fadeIn">
            <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md p-8 relative overflow-hidden border border-blue-100">
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[#034EA2] to-[#00B0F0]"></div>
              <button onClick={() => setShowHuntModal(false)} className="absolute top-6 right-6 text-gray-400 hover:text-red-500 p-2 hover:bg-red-50 rounded-full transition-all"><X className="w-6 h-6"/></button>
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner"><BellPlus className="w-8 h-8 text-[#034EA2]" /></div>
                <h3 className="text-2xl font-black text-[#034EA2]">Đăng ký săn tin BK</h3>
                <p className="text-gray-500 text-sm mt-2 px-4">Nhập tên món đồ, tụi mình sẽ báo ngay khi có người bán!</p>
              </div>
              <form onSubmit={(e) => { 
                  e.preventDefault(); 
                  playNotificationSound();
                  addToast("Đã kích hoạt chế độ săn tin!", "success"); 
                  setShowHuntModal(false); 
              }}>
                <input type="text" required className="block w-full border border-gray-200 bg-gray-50 rounded-xl p-4 focus:ring-4 focus:ring-blue-100 focus:bg-white outline-none transition-all font-bold mb-6 text-[#034EA2]" placeholder="VD: Giáo trình Giải Tích 1..." />
                <button type="submit" className="w-full py-4 bg-[#00B0F0] text-white rounded-xl font-black hover:bg-[#0095da] shadow-lg shadow-blue-200 transition-all active:scale-95 uppercase tracking-widest">Bật thông báo</button>
              </form>
            </div>
          </div>
        )}

        <button 
          onClick={scrollToTop}
          className={`fixed bottom-24 right-6 p-4 bg-[#034EA2] text-white rounded-full shadow-xl z-40 transition-all duration-300 hover:bg-[#003875] hover:-translate-y-1 ${showScrollTop ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0'}`}
        >
          <ChevronUp className="w-6 h-6" />
        </button>

      </div>
    </div>
  );
};

export default MarketplacePage;