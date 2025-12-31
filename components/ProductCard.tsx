import React, { useEffect, useState, useMemo } from 'react';
import { Product, TradeMethod, ProductStatus } from '../types';
import { MapPin, Box, User, Clock, Heart, Eye, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { formatTimeAgo } from '../utils/dateUtils';

interface ProductCardProps {
  product: Product;
  viewMode?: 'grid' | 'list'; // Nhận prop viewMode từ trang cha
}

const ProductCard: React.FC<ProductCardProps> = ({ product, viewMode = 'grid' }) => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const isWanted = product.isLookingToBuy;
  
  const [sellerAvatar, setSellerAvatar] = useState<string | null>(null);
  const [sellerName, setSellerName] = useState<string | null>(null);
  const [isLiked, setIsLiked] = useState(product.isLiked || false);
  const [likeLoading, setLikeLoading] = useState(false);

  // LOGIC: Kiểm tra tin mới (đăng trong vòng 3 ngày)
  const isNewItem = useMemo(() => {
      const postedTime = new Date(product.postedAt).getTime();
      const threeDays = 3 * 24 * 60 * 60 * 1000;
      return (new Date().getTime() - postedTime) < threeDays;
  }, [product.postedAt]);

  useEffect(() => {
    const fetchSellerInfo = async () => {
        if (!product.sellerId) return;
        const { data } = await supabase.from('profiles').select('avatar_url, name').eq('id', product.sellerId).single();
        if (data) { setSellerAvatar(data.avatar_url); setSellerName(data.name); }
    };
    fetchSellerInfo();
  }, [product.sellerId]);

  const toggleLike = async (e: React.MouseEvent) => {
      e.preventDefault(); e.stopPropagation();
      if (!user) { addToast("Vui lòng đăng nhập để lưu tin!", "warning"); return; }
      if (likeLoading) return;

      setLikeLoading(true);
      if (isLiked) {
          const { error } = await supabase.from('saved_products').delete().eq('user_id', user.id).eq('product_id', product.id);
          if (!error) setIsLiked(false);
      } else {
          const { error } = await supabase.from('saved_products').insert({ user_id: user.id, product_id: product.id });
          if (!error) { setIsLiked(true); addToast("Đã lưu tin thành công!", "success"); }
      }
      setLikeLoading(false);
  };

  // --- HÀM RENDER CON DẤU / TRẠNG THÁI ---
  const renderStatusOverlay = () => {
      // 1. Trạng thái ĐÃ BÁN (Con dấu đỏ - Style mộc đỏ)
      if (product.status === ProductStatus.SOLD) {
          return (
             <div className="absolute inset-0 bg-gray-50/50 flex items-center justify-center z-10 backdrop-blur-[1px]">
                <div className="transform -rotate-12 border-[3px] border-red-600 px-2 py-1 rounded mix-blend-multiply opacity-90 shadow-sm">
                    <div className="border border-red-600 px-3 py-1 rounded-sm">
                        <span className="text-red-600 font-black text-xl sm:text-2xl uppercase tracking-[0.2em] whitespace-nowrap">
                            ĐÃ BÁN
                        </span>
                    </div>
                </div>
             </div>
          );
      }
      // 2. Trạng thái ĐANG GIAO DỊCH
      if (product.status === ProductStatus.PENDING) {
          return (
             <div className="absolute top-2 right-2 z-10">
                <span className="bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-1 rounded shadow-md flex items-center animate-pulse border border-yellow-500">
                   <Clock className="w-3 h-3 mr-1" /> Đang GD
                </span>
             </div>
          );
      }
      return null;
  };

  // --- GIAO DIỆN: DẠNG DANH SÁCH (LIST VIEW) ---
  if (viewMode === 'list') {
      return (
        <div className={`group flex bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden border border-gray-100 mb-4 h-40 ${product.status === ProductStatus.SOLD ? 'opacity-80 grayscale-[0.5]' : ''}`}>
            {/* Ảnh bên trái */}
            <Link to={`/product/${product.id}`} className="relative w-48 flex-shrink-0 bg-gray-200 overflow-hidden block">
                <img src={product.images[0] || 'https://via.placeholder.com/300'} alt={product.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                
                {renderStatusOverlay()}

                {/* Nhãn MỚI (nếu có) */}
                {isNewItem && product.status === ProductStatus.AVAILABLE && (
                    <span className="absolute top-0 left-0 bg-red-600 text-white text-[10px] font-bold px-2 py-1 rounded-br-lg shadow-sm z-10 flex items-center">
                        <Sparkles className="w-3 h-3 mr-1"/> MỚI
                    </span>
                )}
            </Link>

            {/* Thông tin bên phải */}
            <div className="p-4 flex-1 flex flex-col justify-between">
                <div>
                    <div className="flex justify-between items-start">
                        <Link to={`/product/${product.id}`}>
                            <h3 className="text-base font-bold text-gray-900 line-clamp-1 hover:text-indigo-600 transition-colors" title={product.title}>
                                {product.title}
                            </h3>
                        </Link>
                        {/* Nút Tim */}
                        {product.status !== ProductStatus.SOLD && (
                             <button onClick={toggleLike} className={`p-1.5 rounded-full hover:bg-gray-100 transition-colors ${isLiked ? 'text-red-500' : 'text-gray-400'}`}>
                                <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
                            </button>
                        )}
                    </div>
                    
                    <p className="text-indigo-600 font-bold text-lg mt-1">
                        {isWanted ? 'Cần Mua' : `${product.price.toLocaleString('vi-VN')} đ`}
                    </p>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{product.description}</p>
                </div>

                <div className="flex items-center justify-between border-t border-gray-100 pt-2 mt-2">
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                        <span className="bg-gray-100 px-2 py-0.5 rounded font-medium">{product.category}</span>
                        <span className="flex items-center" title="Lượt xem"><Eye className="w-3 h-3 mr-1"/>{product.view_count || 0}</span>
                        <span className="flex items-center"><Clock className="w-3 h-3 mr-1"/>{formatTimeAgo(product.postedAt)}</span>
                    </div>
                    
                    <Link to={`/profile/${product.sellerId}`} className="flex items-center text-xs font-medium text-gray-700 hover:text-indigo-600" onClick={e => e.stopPropagation()}>
                        {sellerAvatar ? <img src={sellerAvatar} className="w-5 h-5 rounded-full mr-2 object-cover border border-gray-200" /> : <User className="w-4 h-4 mr-2 text-gray-400"/>}
                        <span className="truncate max-w-[100px]">{sellerName}</span>
                    </Link>
                </div>
            </div>
        </div>
      );
  }

  // --- GIAO DIỆN: DẠNG LƯỚI (GRID VIEW - MẶC ĐỊNH) ---
  return (
    <div className={`group flex flex-col bg-white rounded-lg shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden border border-gray-100 h-full ${product.status === ProductStatus.SOLD ? 'opacity-80 grayscale-[0.5]' : ''}`}>
      
      {/* Phần Ảnh */}
      <Link to={`/product/${product.id}`} className="relative aspect-w-4 aspect-h-3 bg-gray-200 h-48 block overflow-hidden">
        <img 
          src={product.images[0] || 'https://via.placeholder.com/300'} 
          alt={product.title} 
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
        />
        
        {renderStatusOverlay()}

        {/* Nhãn MỚI (Góc trên trái) */}
        {isNewItem && product.status === ProductStatus.AVAILABLE && (
            <span className="absolute top-0 left-0 bg-red-600 text-white text-[10px] font-bold px-2 py-1 rounded-br-lg shadow-sm z-10 flex items-center animate-pulse">
                <Sparkles className="w-3 h-3 mr-1"/> MỚI
            </span>
        )}

        {/* Nút Tim */}
        {product.status !== ProductStatus.SOLD && (
            <button 
                onClick={toggleLike}
                disabled={likeLoading}
                className={`absolute top-2 right-2 z-20 p-2 rounded-full backdrop-blur-md shadow-sm transition-all active:scale-90 ${isLiked ? 'bg-red-50 text-red-500' : 'bg-white/80 text-gray-400 hover:bg-white hover:text-red-500'}`}
                title={isLiked ? "Bỏ lưu" : "Lưu tin"}
            >
                <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
            </button>
        )}

        {/* Tag Cần Mua */}
        {isWanted && product.status !== ProductStatus.SOLD && (
           <span className="absolute bottom-2 left-2 bg-yellow-100 text-yellow-800 text-xs font-bold px-2 py-1 rounded-full border border-yellow-200 shadow-sm z-10">
             Cần Mua
           </span>
        )}

        {/* Tag Giá Tiền */}
        {!isWanted && product.status !== ProductStatus.SOLD && product.status !== ProductStatus.PENDING && (
            <span className="absolute bottom-2 right-2 bg-white/95 backdrop-blur-sm text-indigo-700 text-xs font-bold px-2 py-1 rounded-md shadow-sm border border-indigo-50 z-10">
                {product.price.toLocaleString('vi-VN')} đ
            </span>
        )}
      </Link>

      {/* Phần Thông Tin */}
      <div className="p-4 flex flex-col flex-1">
        <Link to={`/product/${product.id}`} className="block">
             <h3 className="text-sm font-bold text-gray-900 line-clamp-2 h-10 hover:text-indigo-600 transition-colors" title={product.title}>
                 {product.title}
             </h3>
        </Link>
        
        <div className="mt-1 flex justify-between items-center text-xs text-gray-500 mb-3">
            <span className="truncate max-w-[40%]">{product.category}</span>
            <div className="flex gap-2">
                <span className="flex items-center text-gray-400" title="Lượt xem">
                    <Eye className="w-3 h-3 mr-1"/> {product.view_count || 0}
                </span>
                <span className="flex items-center text-gray-400">
                    <Clock className="w-3 h-3 mr-1"/> {formatTimeAgo(product.postedAt)}
                </span>
            </div>
        </div>
        
        {/* Footer Card */}
        <div className="mt-auto pt-3 border-t border-gray-100 flex items-center justify-between">
            <div className="flex items-center text-xs text-gray-500">
              {product.tradeMethod === TradeMethod.LOCKER || product.tradeMethod === TradeMethod.BOTH ? (
                 <span className="flex items-center text-green-600 bg-green-50 px-2 py-0.5 rounded-full"><Box className="w-3 h-3 mr-1" /> Locker</span>
              ) : (
                 <span className="flex items-center text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full"><MapPin className="w-3 h-3 mr-1" /> Meetup</span>
              )}
            </div>

            <Link 
                to={`/profile/${product.sellerId}`} 
                className="flex items-center pl-2 hover:opacity-80 transition-opacity"
                onClick={(e) => e.stopPropagation()} 
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