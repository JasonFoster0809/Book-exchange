import React, { useState, useEffect } from 'react';
import { Search, Sparkles } from 'lucide-react';
import ProductCard from '../components/ProductCard';
import { ProductCategory, Product } from '../types';
import { smartSearchInterpreter } from '../services/geminiService';
import { supabase } from '../services/supabase'; // Import Supabase

const MarketplacePage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  
  // Khởi tạo là mảng rỗng, không dùng MOCK_PRODUCTS nữa
  const [products, setProducts] = useState<Product[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]); // Lưu bản gốc để filter
  const [loading, setLoading] = useState(true);
  
  const [isSearching, setIsSearching] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);

  // 1. Fetch dữ liệu từ Supabase khi vào trang
  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('posted_at', { ascending: false }); // Tin mới nhất lên đầu

      if (error) {
        console.error('Lỗi tải sản phẩm:', error);
      } else {
        // Map dữ liệu từ DB (snake_case) sang camelCase nếu cần, 
        // nhưng nếu bạn đã lưu đúng key ở PostItemPage thì có thể dùng luôn.
        // Tuy nhiên để an toàn với type Product, ta nên map lại:
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

  // 2. Xử lý Filter (Local)
  useEffect(() => {
    let filtered = allProducts;

    // Filter theo Category
    if (selectedCategory !== 'All') {
      filtered = filtered.filter(p => p.category === selectedCategory);
    }

    // Filter theo Search thường (nếu không đang chạy AI Search)
    if (searchTerm && !isSearching && !aiSuggestion) {
       const lower = searchTerm.toLowerCase();
       filtered = filtered.filter(p => 
         p.title.toLowerCase().includes(lower) || 
         p.description.toLowerCase().includes(lower)
       );
    }

    setProducts(filtered);
  }, [searchTerm, selectedCategory, isSearching, allProducts, aiSuggestion]);

  // 3. Xử lý AI Search
  const handleSmartSearch = async () => {
      if (!searchTerm) return;
      setIsSearching(true);
      setAiSuggestion("Đang nhờ AI phân tích...");

      const result = await smartSearchInterpreter(searchTerm);
      
      if (result) {
          let filtered = allProducts;
          
          // AI chọn danh mục
          if (result.category) {
              setSelectedCategory(result.category);
              filtered = filtered.filter(p => p.category === result.category);
          }

          // AI lọc từ khóa
          if (result.keywords.length > 0) {
              filtered = filtered.filter(p => {
                  const content = (p.title + " " + p.description).toLowerCase();
                  return result.keywords.some(k => content.includes(k.toLowerCase()));
              });
          }
          setProducts(filtered);
          setAiSuggestion(`AI gợi ý: Danh mục ${result.category || 'Tất cả'} & Từ khóa: ${result.keywords.join(', ')}`);
      } else {
          setAiSuggestion("AI không tìm thấy gợi ý, đang tìm kiếm thường.");
      }
      setIsSearching(false);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
        <h1 className="text-3xl font-bold text-gray-900">Chợ Sinh Viên</h1>
        
        <div className="flex-1 max-w-lg w-full">
            <div className="relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                    type="text"
                    className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 pr-12 sm:text-sm border-gray-300 rounded-md py-3"
                    placeholder="Tìm tên sách, mã môn (VD: MT1003)..."
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
                        {isSearching ? '...' : <><Sparkles className="w-3 h-3" /> Tìm bằng AI</>}
                    </button>
                </div>
            </div>
            {aiSuggestion && (
                <div className="mt-2 text-xs text-indigo-600 flex items-center justify-between">
                    <span className="flex items-center"><Sparkles className="w-3 h-3 mr-1" /> {aiSuggestion}</span>
                    <button onClick={() => {setSearchTerm(''); setSelectedCategory('All'); setAiSuggestion(null);}} className="hover:underline">Xóa lọc</button>
                </div>
            )}
        </div>
      </div>

      {/* Categories Bar */}
      <div className="flex overflow-x-auto pb-4 gap-2 mb-6 scrollbar-hide">
        {['All', ...Object.values(ProductCategory)].map((cat) => (
          <button
            key={cat}
            onClick={() => { setSelectedCategory(cat); if(selectedCategory !== cat) setAiSuggestion(null); }}
            className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              selectedCategory === cat
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {cat === 'All' ? 'Tất cả' : cat}
          </button>
        ))}
      </div>

      {/* Loading State */}
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
                <div className="col-span-full text-center py-20 bg-white rounded-lg border border-dashed border-gray-300">
                    <p className="text-gray-500">Không tìm thấy sản phẩm nào.</p>
                    <button 
                        onClick={() => {setSearchTerm(''); setSelectedCategory('All'); setAiSuggestion(null);}} 
                        className="mt-4 text-indigo-600 font-medium hover:underline"
                    >
                        Xóa bộ lọc để xem tất cả
                    </button>
                </div>
            )}
        </div>
      )}
    </div>
  );
};

export default MarketplacePage;