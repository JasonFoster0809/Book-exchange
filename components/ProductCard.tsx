import React, { useEffect, useState, useMemo } from 'react';
import { Product, TradeMethod, ProductStatus } from '../types';
import { 
  Box, User, Clock, Heart, Eye, Sparkles, Share2, 
  Star, ShieldCheck, MapPin, ShieldAlert, Trash2 
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { formatTimeAgo } from '../utils/dateUtils';

// Thêm prop onAdminDelete vào interface để sửa lỗi build tại MarketplacePage
interface ProductCardProps {
  product: Product;
  viewMode?: 'grid' | 'list';
  onAdminDelete?: (productId: string) => Promise<void>; 
}

const ProductCard: React.FC<ProductCardProps> = ({ product, viewMode = 'grid', onAdminDelete }) => {
  const { user, isAdmin } = useAuth();
  const { addToast } = useToast();
  const isWanted = product.isLookingToBuy;
  
  const [sellerInfo, setSellerInfo] = useState({
    avatar: product.seller?.avatar_url || null,
    name: product.seller?.name || 'Người dùng',
    rating: product.seller?.rating || 5.0,
    trades: product.seller?.completed_trades || 0,
    isVerified: product.seller?.is_verified || false,
    banUntil: product.seller?.ban_until || null 
  });

  const [isLiked, setIsLiked] = useState(product.isLiked || false);
  const [likeLoading, setLikeLoading] = useState(false);

  // Logic kiểm tra người bán có đang bị hạn chế (huy hiệu đỏ) hay không
  const isSellerRestricted = useMemo(() => {
    return sellerInfo.banUntil ? new Date(sellerInfo.banUntil) > new Date() : false;
  }, [sellerInfo.banUntil]);

  const isNewItem = useMemo(() => {
    const postedTime = new Date(product.postedAt).getTime();
    return (new Date().getTime() - postedTime) < 3 * 24 * 60 * 60 * 1000;
  }, [product.postedAt]);

  useEffect(() => {
    if (product.seller) {
      setSellerInfo({
        avatar: product.seller.avatar_url,
        name: product.seller.name || 'Người dùng',
        rating: product.seller.rating || 5.0,
        trades: product.seller.completed_trades || 0,
        isVerified: product.seller.is_verified || false,
        banUntil: product.seller.ban_until || null
      });
    } else if (product.sellerId) {
      const fetchSellerInfo = async () => {
        const { data } = await supabase.from('profiles').select('avatar_url, name, rating, completed_trades, is_verified, ban_until').eq('id', product.sellerId).single();
        if (data) {
          setSellerInfo({
            avatar: data.avatar_url,
            name: data.name || 'Người dùng',
            rating: data.rating || 5.0,
            trades: data.completed_trades || 0,
            isVerified: data.is_verified || false,
            banUntil: data.ban_until
          });
        }
      };
      fetchSellerInfo();
    }
  }, [product.seller, product.sellerId]);

  const toggleLike = async (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (!user) { addToast("Vui lòng đăng nhập!", "warning"); return; }
    if (likeLoading) return;
    setLikeLoading(true);
    try {
        if (isLiked) {
            await supabase.from('saved_products').delete().eq('user_id', user.id).eq('product_id', product.id);
            setIsLiked(false);
        } else {
            await supabase.from('saved_products').insert({ user_id: user.id, product_id: product.id });
            setIsLiked(true);
            addToast("Đã lưu tin!", "success");
        }
    } finally { setLikeLoading(false); }
  };

  const SellerAvatar = () => (
    <div className="relative flex-shrink-0">
        {sellerInfo.avatar ? (
            <img src={sellerInfo.avatar} className={`w-8 h-8 rounded-full object-cover border shadow-sm ${isSellerRestricted ? 'border-red-500' : (sellerInfo.isVerified ? 'border-blue-500' : 'border-gray-200')}`} />
        ) : (
            <div className={`w-8 h-8 rounded-full flex items-center justify-center border ${isSellerRestricted ? 'bg-red-50 border-red-200' : (sellerInfo.isVerified ? 'bg-blue-50 border-blue-200' : 'bg-gray-100 border-gray-200')}`}>
                <User className={`w-4 h-4 ${isSellerRestricted ? 'text-red-500' : (sellerInfo.isVerified ? 'text-blue-500' : 'text-gray-400')}`} />
            </div>
        )}
        {sellerInfo.isVerified && !isSellerRestricted && (
          <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-[2px] shadow-sm">
            <ShieldCheck className="w-3 h-3 text-blue-500 fill-blue-100" />
          </div>
        )}
        {isSellerRestricted && (
          <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-[2px] shadow-sm animate-pulse">
            <ShieldAlert className="w-3 h-3 text-red-500 fill-red-100" />
          </div>
        )}
    </div>
  );

  // --- LIST VIEW ---
  if (viewMode === 'list') {
      return (
        <div className={`group flex bg-white rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden border border-gray-100 mb-4 h-44 ${product.status === ProductStatus.SOLD ? 'opacity-75 grayscale' : ''}`}>
            <Link to={`/product/${product.id}`} className="relative w-48 flex-shrink-0 bg-gray-50 overflow-hidden block">
                <img src={product.images[0] || 'https://via.placeholder.com/300'} alt={product.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                {product.status === ProductStatus.SOLD && <div className="absolute inset-0 bg-black/50 flex items-center justify-center"><span className="text-white font-bold border-2 border-white px-3 py-1 rotate-12 text-xs uppercase tracking-widest">ĐÃ BÁN</span></div>}
            </Link>
            <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                    <div className="flex justify-between items-start">
                        <Link to={`/product/${product.id}`}><h3 className="text-lg font-bold text-gray-900 line-clamp-1 hover:text-[#034EA2] transition-colors">{product.title}</h3></Link>
                        <div className="flex gap-2">
                          {isAdmin && onAdminDelete && (
                            <button onClick={(e) => { e.preventDefault(); onAdminDelete(product.id); }} className="p-2 bg-red-50 text-red-500 rounded-full hover:bg-red-100 transition-colors"><Trash2 size={18} /></button>
                          )}
                          <button onClick={toggleLike} className={`p-2 rounded-full hover:bg-red-50 transition-colors ${isLiked ? 'text-red-500' : 'text-gray-300'}`}><Heart className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} /></button>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 mt-2">
                        <span className="text-[#034EA2] font-black text-xl">{isWanted ? 'Cần Mua' : product.price === 0 ? 'Tặng Free' : `${product.price.toLocaleString('vi-VN')} đ`}</span>
                    </div>
                </div>
                <div className="flex items-center justify-between border-t border-gray-100 pt-3 mt-2">
                    <Link to={`/profile/${product.sellerId}`} className="flex items-center gap-2 group/user hover:bg-gray-50 pr-2 pl-1 py-1 rounded-full transition-colors">
                        <div className="flex flex-col items-end">
                          <span className="text-xs font-bold text-gray-700 group-hover/user:text-[#034EA2]">{sellerInfo.name}</span>
                          {isSellerRestricted && <span className="text-[8px] text-red-500 font-black uppercase animate-pulse">Không đáng tin</span>}
                        </div>
                        <SellerAvatar />
                    </Link>
                </div>
            </div>
        </div>
      );
  }

  // --- GRID VIEW ---
  return (
    <div className={`group relative flex flex-col bg-white rounded-[1.25rem] shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 h-full overflow-hidden ${product.status === ProductStatus.SOLD ? 'opacity-80' : ''}`}>
      <div className="relative aspect-[4/3] bg-gray-100 overflow-hidden">
        <Link to={`/product/${product.id}`} className="block w-full h-full">
          <img src={product.images[0] || 'https://via.placeholder.com/400'} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-in-out" alt={product.title} />
        </Link>
        <div className="absolute top-3 right-3 z-20 flex flex-col gap-2 translate-x-10 group-hover:translate-x-0 transition-transform duration-300">
          {isAdmin && onAdminDelete && (
            <button onClick={(e) => { e.preventDefault(); onAdminDelete(product.id); }} className="w-8 h-8 flex items-center justify-center rounded-full bg-white text-red-500 shadow-md hover:bg-red-500 hover:text-white transition-colors">
              <Trash2 size={16} />
            </button>
          )}
          <button onClick={toggleLike} className={`w-8 h-8 flex items-center justify-center rounded-full shadow-md transition-colors ${isLiked ? 'bg-red-500 text-white' : 'bg-white text-gray-400 hover:text-red-500 hover:bg-red-50'}`}>
            <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
          </button>
        </div>
      </div>

      <div className="p-4 flex flex-col flex-1">
        <Link to={`/product/${product.id}`} className="block mb-2">
          <h3 className="text-[15px] font-bold text-gray-800 line-clamp-2 leading-snug group-hover:text-[#034EA2] transition-colors min-h-[40px]">{product.title}</h3>
        </Link>
        <div className="mt-3 flex items-center justify-between">
            <Link to={`/profile/${product.sellerId}`} className="flex items-center gap-2 group/user max-w-[65%]">
                <SellerAvatar />
                <div className="flex flex-col overflow-hidden">
                    <span className={`text-[11px] font-bold truncate group-hover/user:text-[#034EA2] transition-colors ${isSellerRestricted ? 'text-red-600' : 'text-gray-700'}`}>{sellerInfo.name}</span>
                    {isSellerRestricted && (
                       <span className="text-[8px] text-red-500 font-black uppercase flex items-center gap-0.5 animate-pulse"><ShieldAlert size={8}/> Không đáng tin</span>
                    )}
                </div>
            </Link>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;