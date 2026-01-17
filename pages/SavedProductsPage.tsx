import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import ProductCard from '../components/ProductCard';
import { Product, ProductStatus } from '../types';
import { Heart, ArrowLeft, Loader2, ShoppingBag } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

const SavedProductsPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [savedProducts, setSavedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSavedItems = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    
    try {
      // Join bảng saved_products với products VÀ profiles (người bán)
      const { data: savedData, error } = await supabase
        .from('saved_products')
        .select(`
          product_id,
          product:products (
            *,
            seller:profiles!seller_id (name, avatar_url, verified_status, rating, completed_trades)
          )
        `)
        .eq('user_id', user.id);

      if (error) throw error;

      if (savedData) {
        const mapped: Product[] = savedData
          .filter((item: any) => item.product) // Lọc bỏ nếu sản phẩm gốc đã bị xóa
          .map((item: any) => {
            const p = item.product;
            return {
              id: p.id,
              sellerId: p.seller_id,
              title: p.title,
              description: p.description || '',
              price: p.price,
              // Xử lý ảnh an toàn
              images: Array.isArray(p.images) ? p.images : (p.images ? [p.images] : []),
              category: p.category,
              condition: p.condition,
              tradeMethod: p.trade_method,
              postedAt: p.created_at,
              
              // FIX QUAN TRỌNG: Thêm trường location
              location: p.location_name || 'TP.HCM',
              
              status: p.status || ProductStatus.AVAILABLE,
              isLiked: true, // Chắc chắn đã like
              view_count: p.view_count || 0,
              
              // Thêm thông tin người bán để hiển thị trên Card
              seller: p.seller 
            };
          });
        setSavedProducts(mapped);
      }
    } catch (err) {
      console.error("Lỗi khi tải tin đã lưu:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchSavedItems();
    }
  }, [fetchSavedItems, user]);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-center bg-[#F8FAFC]">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 max-w-sm">
          <p className="text-gray-600 mb-6 font-medium">Vui lòng đăng nhập để xem danh sách tin đã lưu.</p>
          <Link to="/auth" className="inline-block w-full bg-[#00418E] text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-800 transition-colors">
            Đăng nhập ngay
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-white bg-white/50 rounded-full transition-all border border-transparent hover:border-gray-200 text-gray-500 hover:text-[#00418E] shadow-sm"
            title="Quay lại"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-black text-gray-900 flex items-center gap-2">
              Tin đã lưu <Heart className="w-6 h-6 text-red-500 fill-current" /> 
            </h1>
            <p className="text-gray-500 text-sm mt-1 font-medium">Danh sách các món đồ bạn đang quan tâm.</p>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 gap-4">
            <Loader2 className="w-10 h-10 text-[#00418E] animate-spin" />
            <p className="text-gray-400 font-bold text-sm animate-pulse">Đang tải dữ liệu...</p>
          </div>
        ) : savedProducts.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-[2rem] border-2 border-dashed border-gray-200">
            <div className="bg-gray-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
              <ShoppingBag className="w-8 h-8 text-gray-300" />
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">Chưa có tin nào</h2>
            <p className="text-gray-500 mb-8 max-w-xs mx-auto text-sm">Hãy dạo một vòng chợ và thả tim những món đồ bạn thích nhé!</p>
            <Link 
              to="/" 
              className="inline-flex items-center gap-2 bg-[#00418E] text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-800 transition-all shadow-lg shadow-blue-900/20 hover:shadow-xl hover:-translate-y-1"
            >
              Khám phá ngay
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {savedProducts.map(product => (
              <ProductCard 
                key={product.id} 
                product={product} 
                // Có thể thêm prop onUnsave={() => fetchSavedItems()} nếu muốn xóa ngay lập tức
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SavedProductsPage;
