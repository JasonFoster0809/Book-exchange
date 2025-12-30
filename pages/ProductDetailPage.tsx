import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { MOCK_PRODUCTS, MOCK_USERS } from '../constants';
import { MapPin, Box, ShieldCheck, MessageCircle, AlertCircle } from 'lucide-react';
import { TradeMethod } from '../types';

const ProductDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const product = MOCK_PRODUCTS.find(p => p.id === id);

  if (!product) {
    return <div className="text-center py-20">Product not found</div>;
  }

  const seller = MOCK_USERS[product.sellerId] || { 
    id: 'unknown',
    name: 'Unknown', 
    studentId: '', // Added to satisfy type requirement
    isVerified: false, 
    avatar: 'https://via.placeholder.com/100' 
  };

  return (
    <div className="bg-white min-h-screen">
      <div className="pt-6 pb-16 sm:pb-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
          <div className="lg:grid lg:grid-cols-2 lg:gap-x-8">
            {/* Image Gallery */}
            <div className="aspect-w-4 aspect-h-3 rounded-lg bg-gray-100 overflow-hidden mb-6 lg:mb-0">
              <img
                src={product.images[0]}
                alt={product.title}
                className="w-full h-full object-center object-cover"
              />
            </div>

            {/* Product Info */}
            <div className="mt-10 px-4 sm:px-0 sm:mt-16 lg:mt-0">
              {product.isLookingToBuy ? (
                 <span className="inline-flex items-center px-3 py-0.5 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800 mb-4">
                    Looking to Buy
                 </span>
              ) : (
                 <h2 className="sr-only">Product information</h2>
              )}
              
              <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">{product.title}</h1>

              <div className="mt-3">
                <h2 className="sr-only">Product information</h2>
                <p className="text-3xl text-indigo-600">{product.price.toLocaleString('vi-VN')} đ</p>
              </div>

              <div className="mt-6">
                <h3 className="sr-only">Description</h3>
                <div className="text-base text-gray-700 space-y-6" dangerouslySetInnerHTML={{ __html: product.description }} />
              </div>

              <div className="mt-8 border-t border-gray-200 pt-8">
                 <div className="flex items-center justify-between mb-4">
                     <h3 className="text-sm font-medium text-gray-900">Condition</h3>
                     <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {product.condition}
                     </span>
                 </div>
                 
                 <div className="flex items-center justify-between">
                     <h3 className="text-sm font-medium text-gray-900">Trade Method</h3>
                     <div className="flex items-center">
                        {product.tradeMethod === TradeMethod.LOCKER || product.tradeMethod === TradeMethod.BOTH ? (
                            <span className="flex items-center text-green-700 bg-green-50 px-3 py-1 rounded-md text-sm mr-2">
                                <Box className="w-4 h-4 mr-1" /> Smart Locker
                            </span>
                        ) : null}
                        {product.tradeMethod === TradeMethod.DIRECT || product.tradeMethod === TradeMethod.BOTH ? (
                            <span className="flex items-center text-blue-700 bg-blue-50 px-3 py-1 rounded-md text-sm">
                                <MapPin className="w-4 h-4 mr-1" /> Direct Meetup
                            </span>
                        ) : null}
                     </div>
                 </div>
              </div>

              {/* Seller Card */}
              <div className="mt-8 bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex items-center">
                    <img className="h-12 w-12 rounded-full object-cover" src={seller.avatar} alt="" />
                    <div className="ml-4">
                        <div className="flex items-center">
                            <h4 className="text-lg font-bold text-gray-900">{seller.name}</h4>
                            {seller.isVerified && <ShieldCheck className="w-4 h-4 text-indigo-600 ml-1" />}
                        </div>
                        <p className="text-sm text-gray-500">Student ID: {seller.studentId ? `${seller.studentId.substring(0, 4)}****` : 'Hidden'}</p>
                    </div>
                </div>
                <div className="mt-4 flex gap-3">
                    <Link to="/chat" className="flex-1 bg-indigo-600 border border-transparent rounded-md py-3 px-8 flex items-center justify-center text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                        <MessageCircle className="w-5 h-5 mr-2" /> Chat Now
                    </Link>
                </div>
              </div>

              <div className="mt-6 flex items-start text-xs text-gray-500">
                  <AlertCircle className="w-4 h-4 mr-1 flex-shrink-0 text-gray-400" />
                  <p>Remember to check the item carefully before confirming receipt, especially for electronics.</p>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetailPage;