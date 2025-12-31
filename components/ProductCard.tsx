import React, { useEffect, useState } from 'react';
import { Product, TradeMethod } from '../types';
import { MapPin, Box, User } from 'lucide-react'; // Thêm icon User
import { Link } from 'react-router-dom';
import { supabase } from '../services/supabase';

interface ProductCardProps {
  product: Product;
}

const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const isWanted = product.isLookingToBuy;
  
  // State để lưu thông tin người bán của card này
  const [sellerAvatar, setSellerAvatar] = useState<string | null>(null);
  const [sellerName, setSellerName] = useState<string | null>(null);

  // Fetch nhẹ avatar người bán (chỉ lấy avatar để tối ưu)
  useEffect(() => {
    const fetchSellerInfo = async () => {
        const { data } = await supabase
            .from('profiles')
            .select('avatar_url, name')
            .eq('id', product.sellerId)
            .single();
        if (data) {
            setSellerAvatar(data.avatar_url);
            setSellerName(data.name);
        }
    };
    fetchSellerInfo();
  }, [product.sellerId]);

  return (
    <div className="group flex flex-col bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden border border-gray-100 h-full">
      {/* 1. Link bao quanh ảnh sản phẩm để xem chi tiết */}
      <Link to={`/product/${product.id}`} className="relative aspect-w-4 aspect-h-3 bg-gray-200 h-48 block overflow-hidden">
        <img 
          src={product.images[0] || 'https://via.placeholder.com/300'} 
          alt={product.title} 
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        {isWanted && (
           <span className="absolute top-2 left-2 bg-yellow-100 text-yellow-800 text-xs font-bold px-2 py-1 rounded-full border border-yellow-200 shadow-sm">
             Cần Mua
           </span>
        )}
        {!isWanted && (
            <span className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm text-indigo-700 text-xs font-bold px-2 py-1 rounded-md shadow-sm border border-indigo-100">
                {product.price.toLocaleString('vi-VN')} đ
            </span>
        )}
      </Link>

      <div className="p-4 flex flex-col flex-1">
        {/* Tiêu đề */}
        <Link to={`/product/${product.id}`} className="block">
             <h3 className="text-sm font-bold text-gray-900 line-clamp-2 h-10 hover:text-indigo-600 transition-colors" title={product.title}>
                 {product.title}
             </h3>
        </Link>
        
        <p className="mt-1 text-xs text-gray-500 mb-3">{product.category} • {product.condition}</p>
        
        {/* Footer của Card: Icon giao dịch + Avatar người bán */}
        <div className="mt-auto pt-3 border-t border-gray-100 flex items-center justify-between">
            {/* Phương thức giao dịch */}
            <div className="flex items-center text-xs text-gray-500">
              {product.tradeMethod === TradeMethod.LOCKER || product.tradeMethod === TradeMethod.BOTH ? (
                 <span className="flex items-center text-green-600 bg-green-50 px-2 py-0.5 rounded-full" title="Có thể gửi Locker">
                   <Box className="w-3 h-3 mr-1" /> Locker
                 </span>
              ) : (
                 <span className="flex items-center text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full" title="Gặp trực tiếp">
                   <MapPin className="w-3 h-3 mr-1" /> Meetup
                 </span>
              )}
            </div>

            {/* Avatar người bán (Click để sang Profile) */}
            <Link 
                to={`/profile/${product.sellerId}`} 
                className="flex items-center pl-2 hover:opacity-80 transition-opacity"
                title={`Người bán: ${sellerName || 'Loading...'}`}
                onClick={(e) => e.stopPropagation()} // Tránh click nhầm vào sản phẩm
            >
                {sellerAvatar ? (
                    <img src={sellerAvatar} alt="" className="w-6 h-6 rounded-full border border-gray-200 object-cover" />
                ) : (
                    <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center">
                        <User className="w-3 h-3 text-gray-400" />
                    </div>
                )}
            </Link>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;