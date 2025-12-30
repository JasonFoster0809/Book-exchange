import React from 'react';
import { Product, TradeMethod } from '../types';
import { MapPin, Box } from 'lucide-react';
import { Link } from 'react-router-dom';

interface ProductCardProps {
  product: Product;
}

const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const isWanted = product.isLookingToBuy;

  return (
    <Link to={`/product/${product.id}`} className="group block bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden border border-gray-100">
      <div className="relative aspect-w-4 aspect-h-3 bg-gray-200 h-48">
        <img 
          src={product.images[0]} 
          alt={product.title} 
          className="w-full h-full object-cover group-hover:opacity-90 transition-opacity"
        />
        {isWanted && (
           <span className="absolute top-2 left-2 bg-yellow-100 text-yellow-800 text-xs font-bold px-2 py-1 rounded-full">
             Looking to Buy
           </span>
        )}
        {!isWanted && (
            <span className="absolute top-2 right-2 bg-indigo-600 text-white text-xs font-bold px-2 py-1 rounded-md">
                {product.price.toLocaleString('vi-VN')} đ
            </span>
        )}
      </div>
      <div className="p-4">
        <div className="flex justify-between items-start">
             <h3 className="text-sm font-medium text-gray-900 line-clamp-2 h-10">{product.title}</h3>
        </div>
        <p className="mt-1 text-xs text-gray-500">{product.category} • {product.condition}</p>
        
        <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
          {product.tradeMethod === TradeMethod.LOCKER || product.tradeMethod === TradeMethod.BOTH ? (
             <span className="flex items-center text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
               <Box className="w-3 h-3 mr-1" /> Locker Available
             </span>
          ) : (
             <span className="flex items-center text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
               <MapPin className="w-3 h-3 mr-1" /> Meetup Only
             </span>
          )}
        </div>
      </div>
    </Link>
  );
};

export default ProductCard;