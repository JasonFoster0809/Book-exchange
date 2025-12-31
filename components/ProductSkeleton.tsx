import React from 'react';

const ProductSkeleton: React.FC = () => {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden h-full">
      {/* Giả lập ảnh */}
      <div className="aspect-w-4 aspect-h-3 bg-gray-200 animate-pulse h-48"></div>
      
      <div className="p-4 flex flex-col gap-3">
        {/* Giả lập tiêu đề (2 dòng) */}
        <div className="h-4 bg-gray-200 rounded animate-pulse w-full"></div>
        <div className="h-4 bg-gray-200 rounded animate-pulse w-2/3"></div>
        
        {/* Giả lập giá tiền & thông tin phụ */}
        <div className="flex justify-between items-center mt-2">
            <div className="h-3 bg-gray-200 rounded animate-pulse w-1/3"></div>
            <div className="h-3 bg-gray-200 rounded animate-pulse w-1/4"></div>
        </div>
        
        {/* Giả lập footer card */}
        <div className="mt-4 pt-3 border-t border-gray-50 flex justify-between items-center">
             <div className="h-5 w-16 bg-gray-200 rounded-full animate-pulse"></div>
             <div className="h-6 w-6 rounded-full bg-gray-200 animate-pulse"></div>
        </div>
      </div>
    </div>
  );
};

export default ProductSkeleton;