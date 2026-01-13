// src/pages/SavedProductsPage.tsx
import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import ProductCard from '../components/ProductCard';
import { Product, ProductStatus } from '../types';
import { Heart, ArrowLeft, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';

const SavedProductsPage: React.FC = () => {
  const { user } = useAuth();
  const [savedProducts, setSavedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSavedItems = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    
    try {
      // Truy vấn bảng saved_products và lấy thông tin chi tiết từ bảng products liên kết
      const { data: savedData, error } = await supabase
        .from('saved_products')
        .select(`
          product_id,
          products (*)
        `)
        .eq('user_id', user.id);

      if (error) throw error;

      if (savedData) {
        // Chuyển đổi dữ liệu từ Database sang định dạng Interface Product trong types.ts
        const mapped: Product[] = savedData
          .filter((item: any) => item.products !== null) // Loại bỏ các tin đã bị xóa khỏi hệ thống
          .map((item: any) => ({
            id: item.products.id,
            sellerId: item.products.seller_id,
            title: item.products.title,
            description: item.products.description || '',
            price: item.products.price,
            images: item.products.images || [],
            category: item.products.category,
            condition: item.products.condition,
            tradeMethod: item.products.trade_method,
            postedAt: item.products.posted_at,
            status: item.products.status || ProductStatus.AVAILABLE,
            isLiked: true,
            view_count: item.products.view_count || 0
          }));
        setSavedProducts(mapped);
      }
    } catch (err) {
      console.error("Lỗi khi tải tin đã lưu:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchSavedItems();
  }, [fetchSavedItems]);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-center">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
          <p className="text-gray-600 mb-4 font-medium">Vui lòng đăng nhập để xem tin đăng đã lưu của bạn.</p>
          <Link to="/auth" className="inline-block bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-indigo-700 transition-colors">
            Đăng nhập ngay
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 min-h-screen">
      {/* Header điều hướng */}
      <div className="flex items-center gap-4 mb-10">
        <Link 
          to="/market" 
          className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500 hover:text-indigo-600"
          title="Quay lại chợ"
        >
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 flex items-center gap-3">
            <Heart className="w-8 h-8 text-red-500 fill-current" /> 
            Tin đã lưu
          </h1>
          <p className="text-gray-500 mt-1">Nơi giữ lại những món đồ bạn đang quan tâm</p>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 gap-4">
          <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
          <p className="text-gray-500 font-medium">Đang tìm lại các tin bạn đã lưu...</p>
        </div>
      ) : savedProducts.length === 0 ? (
        <div className="text-center py-24 bg-white rounded-3xl border-2 border-dashed border-gray-200">
          <div className="bg-gray-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Heart className="w-10 h-10 text-gray-200" />
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Danh sách đang trống</h2>
          <p className="text-gray-500 mb-8 max-w-xs mx-auto">Bạn chưa lưu tin đăng nào. Hãy dạo một vòng chợ để tìm món đồ ưng ý nhé!</p>
          <Link 
            to="/market" 
            className="inline-flex items-center gap-2 bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-md hover:shadow-lg active:scale-95"
          >
            Khám phá ngay
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {savedProducts.map(product => (
            <ProductCard 
              key={product.id} 
              product={product} 
              // Bạn có thể thêm prop để ProductCard biết đây là trang Saved 
              // nhằm mục đích re-fetch nếu người dùng bấm bỏ tim
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default SavedProductsPage;
