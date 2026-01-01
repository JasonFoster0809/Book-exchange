import React, { useEffect, useState, useMemo } from 'react';
import { Product, TradeMethod, ProductStatus } from '../types';
import { Box, User, Clock, Heart, Eye, Sparkles, Share2, Star, ShieldCheck, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { formatTimeAgo } from '../utils/dateUtils';

interface ProductCardProps {
  product: Product;
  viewMode?: 'grid' | 'list';
}

const ProductCard: React.FC<ProductCardProps> = ({ product, viewMode = 'grid' }) => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const isWanted = product.isLookingToBuy;
  
  // KHỞI TẠO STATE: Ưu tiên lấy từ product.seller (dữ liệu đã join từ trang cha)
  const [sellerInfo, setSellerInfo] = useState({
    avatar: product.seller?.avatar_url || null,
    name: product.seller?.name || null,
    rating: product.seller?.rating || 5.0,
    trades: product.seller?.completed_trades || 0,
    isVerified: product.seller?.is_verified || false // Mới thêm
  });

  const [isLiked, setIsLiked] = useState(product.isLiked || false);
  const [likeLoading, setLikeLoading] = useState(false);

  const isNewItem = useMemo(() => {
    const postedTime = new Date(product.postedAt).getTime();
    return (new Date().getTime() - postedTime) < 3 * 24 * 60 * 60 * 1000;
  }, [product.postedAt]);

  // Cập nhật thông tin seller nếu có thay đổi hoặc fetch lại nếu thiếu (Fallback)
  useEffect(() => {
    if (product.seller) {
      setSellerInfo({
        avatar: product.seller.avatar_url,
        name: product.seller.name,
        rating: product.seller.rating || 5.0,
        trades: product.seller.completed_trades || 0,
        isVerified: product.seller.is_verified || false
      });
    } else if (product.sellerId) {
      const fetchSellerInfo = async () => {
        const { data } = await supabase
          .from('profiles')
          .select('avatar_url, name, rating, completed_trades, is_verified')
          .eq('id', product.sellerId)
          .single();
        
        if (data) {
          setSellerInfo({
            avatar: data.avatar_url,
            name: data.name,
            rating: data.rating || 5.0,
            trades: data.completed_trades || 0,
            isVerified: data.is_verified || false
          });
        }
      };
      fetchSellerInfo();
    }
  }, [product.seller, product.sellerId]);

  const handleShare = (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    const url = `${window.location.origin}/#/product/${product.id}`;
    navigator.clipboard.writeText(url);
    addToast("Đã copy link sản phẩm!", "success");
  };

  const toggleLike = async (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (!user) { addToast("Vui lòng đăng nhập để lưu tin!", "warning"); return; }
    if (likeLoading) return;
    setLikeLoading(true);
    try {
        if (isLiked) {
            await supabase.from('saved_products').delete().eq('user_id', user.id).eq('product_id', product.id);
            setIsLiked(false);
        } else {
            await supabase.from('saved_products').insert({ user_id: user.id, product_id: product.id });
            setIsLiked(true);
            addToast("Đã lưu tin thành công!", "success");
        }
    } finally {
        setLikeLoading(false);
    }
  };

  const SellerAvatar = () => (
    <div className="relative flex-shrink-0">
        {sellerInfo.avatar ? (
            <img 
              src={sellerInfo.avatar} 
              className={`w-8 h-8 rounded-full object-cover border shadow-sm ${sellerInfo.isVerified ? 'border-blue-500' : 'border-gray-100'}`} 
              alt="" 
            />
        ) : (
            <div className={`w-8 h-8 rounded-full flex items-center justify-center border ${sellerInfo.isVerified ? 'bg-blue-50 border-blue-200' : 'bg-indigo-50 border-gray-100'}`}>
                <User className={`w-4 h-4 ${sellerInfo.isVerified ? 'text-blue-500' : 'text-indigo-400'}`} />
            </div>
        )}
        {sellerInfo.isVerified && (
            <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-[1px]">
                <ShieldCheck className="w-3 h-3 text-blue-500 fill-blue-100" />
            </div>
        )}
    </div>
  );

  // --- LIST VIEW ---
  if (viewMode === 'list') {
      return (
        <div className={`group flex bg-white rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden border border-gray-100 mb-4 h-40 ${product.status === ProductStatus.SOLD ? 'opacity-70 grayscale-[0.8]' : ''}`}>
            <Link to={`/product/${product.id}`} className="relative w-48 flex-shrink-0 bg-gray-50 overflow-hidden block">
                <img src={product.images[0] || 'https://via.placeholder.com/300'} alt={product.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                {product.status === ProductStatus.SOLD && <div className="absolute inset-0 bg-black/40 flex items-center justify-center"><span className="text-white font-bold border-2 border-white px-2 py-1 rotate-12 text-xs uppercase">Đã bán</span></div>}
            </Link>
            <div className="p-4 flex-1 flex flex-col justify-between">
                <div>
                    <div className="flex justify-between items-start">
                        <Link to={`/product/${product.id}`}><h3 className="text-base font-bold text-gray-900 line-clamp-1 hover:text-indigo-600 transition-colors">{product.title}</h3></Link>
                        {product.status !== ProductStatus.SOLD && (
                             <button onClick={toggleLike} className={`p-1.5 rounded-full hover:bg-gray-100 transition-colors ${isLiked ? 'text-red-500' : 'text-gray-400'}`}><Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} /></button>
                        )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-indigo-600 font-extrabold text-lg">{isWanted ? 'Cần Mua' : `${product.price.toLocaleString('vi-VN')} đ`}</span>
                        <div className={`text-[9px] font-bold px-2 py-0.5 rounded-md ${product.tradeMethod === TradeMethod.LOCKER ? 'bg-green-50 text-green-600' : 'bg-orange-50 text-orange-600'}`}>
                            {product.tradeMethod === TradeMethod.LOCKER ? 'LOCKER' : 'MEETUP'}
                        </div>
                    </div>
                </div>
                <div className="flex items-center justify-between border-t border-gray-100 pt-2 mt-2">
                     <div className="flex items-center text-[10px] text-gray-400 gap-3 font-medium">
                        <span className="flex items-center"><Eye className="w-3 h-3 mr-1"/> {product.view_count || 0}</span>
                        <span className="flex items-center"><Clock className="w-3 h-3 mr-1"/> {formatTimeAgo(product.postedAt)}</span>
                    </div>
                    <Link to={`/profile/${product.sellerId}`} className="flex items-center gap-2 group/user">
                        <span className="text-xs font-bold text-gray-700 group-hover/user:text-indigo-600">{sellerInfo.name}</span>
                        <SellerAvatar />
                    </Link>
                </div>
            </div>
        </div>
      );
  }

  // --- GRID VIEW ---
  return (
    <div className={`group relative flex flex-col bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-500 border border-gray-100 h-full ${product.status === ProductStatus.SOLD ? 'opacity-80' : ''}`}>
      <div className="relative aspect-w-16 aspect-h-12 bg-gray-50 h-44 overflow-hidden rounded-t-2xl">
        <Link to={`/product/${product.id}`}>
          <img src={product.images[0] || 'https://via.placeholder.com/400'} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt={product.title} />
        </Link>
        
        {product.status === ProductStatus.SOLD && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-[2px] z-10">
             <span className="text-white font-bold border-2 border-white px-3 py-1 rounded-sm rotate-12 uppercase tracking-widest">Đã bay</span>
          </div>
        )}

        {isNewItem && product.status === ProductStatus.AVAILABLE && (
          <div className="absolute top-0 left-0 z-20">
            <span className="bg-gradient-to-r from-red-600 to-orange-500 text-white text-[9px] font-bold px-2.5 py-1 rounded-br-xl shadow-lg flex items-center animate-pulse">
              <Sparkles className="w-3 h-3 mr-1"/> MỚI
            </span>
          </div>
        )}

        <div className="absolute top-2 right-2 z-20 flex flex-col gap-2 transform translate-x-12 group-hover:translate-x-0 transition-transform duration-300">
          <button onClick={toggleLike} className={`p-2 rounded-full backdrop-blur-md shadow-lg ${isLiked ? 'bg-red-500 text-white' : 'bg-white/90 text-gray-400 hover:text-red-500'}`}>
            <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-current' : ''}`} />
          </button>
          <button onClick={handleShare} className="p-2 rounded-full backdrop-blur-md bg-white/90 text-gray-400 hover:text-indigo-600 shadow-lg">
            <Share2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="p-4 flex flex-col flex-1">
        <Link to={`/product/${product.id}`} className="block mb-1">
          <h3 className="text-sm font-bold text-gray-800 line-clamp-2 h-10 hover:text-indigo-600 transition-colors">{product.title}</h3>
        </Link>

        <div className="flex items-center justify-between mt-auto pt-2">
          <span className="text-indigo-600 font-extrabold text-base">
            {isWanted ? 'Cần mua' : product.price === 0 ? 'MIỄN PHÍ' : `${product.price.toLocaleString('vi-VN')}đ`}
          </span>
          <div className="flex items-center text-[10px] text-gray-400 gap-2 font-medium">
            <span className="flex items-center"><Eye className="w-3 h-3 mr-0.5"/> {product.view_count || 0}</span>
            <span className="flex items-center"><Clock className="w-3 h-3 mr-0.5"/> {formatTimeAgo(product.postedAt)}</span>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-gray-50 flex items-center justify-between">
            <Link to={`/profile/${product.sellerId}`} className="flex items-center group/user overflow-hidden">
                <SellerAvatar />
                <div className="ml-2 overflow-hidden">
                    <p className="text-[12px] font-bold text-gray-700 line-clamp-1 group-hover/user:text-indigo-600 transition-colors flex items-center">
                        {sellerInfo.name || 'Người dùng'} 
                        {/* Tích xanh lá cây cho người bán uy tín nhiều giao dịch */}
                        {sellerInfo.trades > 5 && <ShieldCheck className="w-3 h-3 text-green-500 ml-1" title="Uy tín (Nhiều giao dịch)" />}
                    </p>
                    <div className="flex items-center text-[9px] text-amber-500 font-medium">
                        <Star className="w-2.5 h-2.5 fill-current mr-0.5"/> 
                        {sellerInfo.rating.toFixed(1)} 
                        <span className="ml-1 text-gray-400">({sellerInfo.trades} GD)</span>
                    </div>
                </div>
            </Link>
            
            <div className={`text-[9px] font-bold px-2 py-1 rounded-md shadow-sm flex items-center ${product.tradeMethod === TradeMethod.LOCKER ? 'bg-green-50 text-green-600' : 'bg-orange-50 text-orange-600'}`}>
              {product.tradeMethod === TradeMethod.LOCKER ? <Box className="w-3 h-3 mr-1"/> : <MapPin className="w-3 h-3 mr-1"/>}
              {product.tradeMethod === TradeMethod.LOCKER ? 'LOCKER' : 'MEETUP'}
            </div>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;