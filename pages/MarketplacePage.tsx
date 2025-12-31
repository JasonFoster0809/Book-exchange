import React, { useState, useEffect } from 'react';
import { Search, Sparkles, Filter, ArrowUpDown, BellRing } from 'lucide-react'; // Thêm icon BellRing
import ProductCard from '../components/ProductCard';
import { ProductCategory, Product } from '../types';
import { smartSearchInterpreter } from '../services/geminiService';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext'; // Import Auth

const MarketplacePage: React.FC = () => {
  const { user } = useAuth(); // Lấy user để xử lý đăng ký săn tin
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  
  // Data States
  const [products, setProducts] = useState<Product[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  
  // AI States
  const [isSearching, setIsSearching] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);

  // Advanced Filters States
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<'newest' | 'price_asc' | 'price_desc'>('newest');
  const [priceRange, setPriceRange] = useState<{min: string, max: string}>({ min: '', max: '' });

  // 1. Fetch dữ liệu gốc từ DB
  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('is_sold', false) // Chỉ lấy sản phẩm chưa bán
        .order('posted_at', { ascending: false });

      if (error) {
        console.error('Lỗi tải sản phẩm:', error);
      } else {
        const mappedProducts: Product[] = (data || []).map((item: any) => ({
          id: item.id,
          sellerId: item.seller_id,
          title: item.title,
          description: item.description,
          price: item.price,
          category: item.category,
          condition: item.condition,
          images: item.images || [],
          tradeMethod: item.trade_method,
          postedAt: item.posted_at,
          isLookingToBuy: item.is_looking_to_buy
        }));
        setAllProducts(mappedProducts);
        setProducts(mappedProducts);
      }
      setLoading(false);
    };
    fetchProducts();
  }, []);

  // 2. Xử lý Logic Lọc & Sắp xếp
  useEffect(() => {
    let result = [...allProducts];

    // Filter: Category
    if (selectedCategory !== 'All') {
      result = result.filter(p => p.category === selectedCategory);
    }

    // Filter: Search Text
    if (searchTerm && !isSearching && !aiSuggestion) {
       const lower = searchTerm.toLowerCase();
       result = result.filter(p => 
         p.title.toLowerCase().includes(lower) || 
         p.description.toLowerCase().includes(lower)
       );
    }

    // Filter: Price Range
    if (priceRange.min) {
        result = result.filter(p => p.price >= Number(priceRange.min));
    }
    if (priceRange.max) {
        result = result.filter(p => p.price <= Number(priceRange.max));
    }

    // Sort: Sắp xếp
    if (sortBy === 'price_asc') {
        result.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'price_desc') {
        result.sort((a, b) => b.price - a.price);
    } else {
        result.sort((a, b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime());
    }

    setProducts(result);
  }, [searchTerm, selectedCategory, isSearching, allProducts, aiSuggestion, sortBy, priceRange]);

  // 3. AI Search Handler
  const handleSmartSearch = async () => {
      if (!searchTerm) return;
      setIsSearching(true);
      setAiSuggestion("Đang nhờ AI phân tích...");

      const result = await smartSearchInterpreter(searchTerm);
      
      if (result) {
          let filtered = allProducts;
          if (result.category) {
              setSelectedCategory(result.category);
              filtered = filtered.filter(p => p.category === result.category);
          }
          if (result.keywords.length > 0) {
              filtered = filtered.filter(p => {
                  const content = (p.title + " " + p.description).toLowerCase();
                  return result.keywords.some(k => content.includes(k.toLowerCase()));
              });
          }
          setPriceRange({ min: '', max: '' });
          setProducts(filtered);
          setAiSuggestion(`AI gợi ý: ${result.category || 'Tất cả'} - "${result.keywords.join(', ')}"`);
      } else {
          setAiSuggestion("AI không tìm thấy gợi ý đặc biệt.");
      }
      setIsSearching(false);
  };

  // --- TÍNH NĂNG MỚI: ĐĂNG KÝ SĂN TIN ---
  const handleSubscribe = async () => {
      if (!user) { 
          alert("Vui lòng đăng nhập để dùng tính năng Săn tin!"); 
          return; 
      }
      if (!searchTerm || searchTerm.length < 3) { 
          alert("Vui lòng nhập từ khóa dài hơn (ít nhất 3 ký tự) để săn tin."); 
          return; 
      }

      const { error } = await supabase.from('search_alerts').insert({
          user_id: user.id,
          keyword: searchTerm
      });

      if (error) {
          alert("Lỗi: " + error.message);
      } else {
          alert(`Đã đăng ký săn tin! Khi có sách chứa từ khóa "${searchTerm}", hệ thống sẽ báo cho bạn.`);
      }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 min-h-screen">
      {/* Header & Search */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
        <h1 className="text-3xl font-bold text-gray-900">Chợ Sinh Viên</h1>
        
        <div className="flex-1 max-w-xl w-full">
            <div className="flex gap-2">
                <div className="relative flex-1 rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Search className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                        type="text"
                        className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 pr-12 sm:text-sm border-gray-300 rounded-md py-3"
                        placeholder="Tìm sách, máy tính..."
                        value={searchTerm}
                        onChange={(e) => {
                            setSearchTerm(e.target.value);
                            if(e.target.value === '') setAiSuggestion(null);
                        }}
                        onKeyDown={(e) => e.key === 'Enter' && handleSmartSearch()}
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center">
                        <button 
                            onClick={handleSmartSearch}
                            className="p-2 text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 rounded-r-md border-l border-gray-300 flex items-center gap-1 text-xs font-medium h-full px-3"
                            disabled={isSearching}
                        >
                            {isSearching ? '...' : <><Sparkles className="w-3 h-3" /> AI Tìm</>}
                        </button>
                    </div>
                </div>

                {/* NÚT SĂN TIN (Search Alerts) */}
                <button 
                    onClick={handleSubscribe}
                    className="bg-orange-500 text-white px-3 py-2 rounded-md hover:bg-orange-600 shadow-sm flex items-center whitespace-nowrap text-sm font-medium transition-colors"
                    title="Nhận thông báo khi có người đăng sách này"
                >
                    <BellRing className="w-4 h-4 mr-1" /> Săn tin
                </button>
            </div>
            
            {aiSuggestion && (
                <div className="mt-2 text-xs text-indigo-600 flex items-center justify-between">
                    <span className="flex items-center"><Sparkles className="w-3 h-3 mr-1" /> {aiSuggestion}</span>
                    <button onClick={() => {setSearchTerm(''); setSelectedCategory('All'); setAiSuggestion(null);}} className="hover:underline text-gray-500">Xóa lọc</button>
                </div>
            )}
        </div>
      </div>

      {/* Toolbar: Filter & Sort */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 bg-white p-3 rounded-lg shadow-sm border border-gray-200">
          <div className="flex overflow-x-auto gap-2 scrollbar-hide flex-1 w-full sm:w-auto pb-2 sm:pb-0">
            {['All', ...Object.values(ProductCategory)].map((cat) => (
              <button
                key={cat}
                onClick={() => { setSelectedCategory(cat); if(selectedCategory !== cat) setAiSuggestion(null); }}
                className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
                  selectedCategory === cat
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                }`}
              >
                {cat === 'All' ? 'Tất cả' : cat}
              </button>
            ))}
          </div>

          <div className="flex gap-2 w-full sm:w-auto">
             <button 
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center px-3 py-2 text-sm font-medium rounded-md border ${showFilters ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}
             >
                 <Filter className="w-4 h-4 mr-2" /> Bộ lọc
             </button>
             
             <div className="relative">
                 <select 
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="appearance-none block w-full pl-3 pr-8 py-2 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 cursor-pointer hover:bg-gray-50"
                 >
                     <option value="newest">Mới nhất</option>
                     <option value="price_asc">Giá: Thấp đến Cao</option>
                     <option value="price_desc">Giá: Cao đến Thấp</option>
                 </select>
                 <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                    <ArrowUpDown className="h-4 w-4" />
                 </div>
             </div>
          </div>
      </div>

      {/* Expanded Filters Area */}
      {showFilters && (
          <div className="bg-gray-50 p-4 rounded-lg mb-6 border border-gray-200 grid grid-cols-1 sm:grid-cols-3 gap-4 animate-fadeIn">
              <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Giá thấp nhất</label>
                  <input type="number" placeholder="0" className="block w-full border border-gray-300 rounded-md p-2 text-sm" 
                         value={priceRange.min} onChange={e => setPriceRange({...priceRange, min: e.target.value})} />
              </div>
              <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Giá cao nhất</label>
                  <input type="number" placeholder="Ví dụ: 200000" className="block w-full border border-gray-300 rounded-md p-2 text-sm" 
                         value={priceRange.max} onChange={e => setPriceRange({...priceRange, max: e.target.value})} />
              </div>
              <div className="flex items-end">
                  <button onClick={() => setPriceRange({min: '', max: ''})} className="text-sm text-gray-500 hover:text-indigo-600 underline pb-2">
                      Xóa khoảng giá
                  </button>
              </div>
          </div>
      )}

      {/* Product Grid */}
      {loading ? (
          <div className="text-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
              <p className="mt-4 text-gray-500">Đang tải dữ liệu chợ...</p>
          </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {products.map((product) => (
               <ProductCard key={product.id} product={product} />
            ))}
            {products.length === 0 && (
                <div className="col-span-full text-center py-16 bg-white rounded-lg border border-dashed border-gray-300">
                    <p className="text-gray-500 text-lg mb-4">Không tìm thấy sản phẩm nào phù hợp.</p>
                    {/* Gợi ý dùng tính năng săn tin nếu không tìm thấy */}
                    <div className="flex flex-col items-center gap-4">
                        <p className="text-sm text-gray-400">Bạn có thể đăng ký nhận tin để được báo khi có người bán:</p>
                        <button 
                            onClick={handleSubscribe} 
                            className="bg-orange-100 text-orange-700 px-4 py-2 rounded-md font-bold hover:bg-orange-200 transition flex items-center"
                        >
                            <BellRing className="w-4 h-4 mr-2" /> Đăng ký Săn tin "{searchTerm}"
                        </button>
                        
                        <button 
                            onClick={() => {
                                setSearchTerm(''); setSelectedCategory('All'); setAiSuggestion(null); setPriceRange({min:'', max:''});
                            }} 
                            className="text-indigo-600 font-medium hover:underline text-sm mt-2"
                        >
                            Hoặc xóa bộ lọc để xem tất cả
                        </button>
                    </div>
                </div>
            )}
        </div>
      )}
    </div>
  );
};

export default MarketplacePage;