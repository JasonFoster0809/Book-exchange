import React from 'react';

interface ProductSkeletonProps {
  viewMode?: 'grid' | 'list';
}

const ProductSkeleton: React.FC<ProductSkeletonProps> = ({ viewMode = 'grid' }) => {
  // --- CHẾ ĐỘ DANH SÁCH (NGANG) ---
  if (viewMode === 'list') {
    return (
      <div className="bg-white border border-gray-100 rounded-3xl p-4 flex flex-col sm:flex-row gap-5 w-full">
        {/* Ảnh */}
        <div className="w-full sm:w-36 h-36 bg-gray-200 rounded-2xl animate-pulse flex-shrink-0"></div>
        
        {/* Nội dung */}
        <div className="flex-1 py-1 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex justify-between">
              <div className="h-5 w-2/3 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-5 w-20 bg-gray-200 rounded animate-pulse"></div>
            </div>
            <div className="flex gap-3">
              <div className="h-6 w-16 bg-gray-100 rounded-lg animate-pulse"></div>
              <div className="h-6 w-24 bg-gray-100 rounded-lg animate-pulse"></div>
            </div>
          </div>
          {/* Footer actions */}
          <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-50">
            <div className="h-9 w-9 bg-gray-200 rounded-xl animate-pulse"></div>
            <div className="h-9 w-24 bg-gray-200 rounded-xl animate-pulse"></div>
            <div className="h-9 w-9 bg-gray-200 rounded-xl animate-pulse"></div>
          </div>
        </div>
      </div>
    );
  }

  // --- CHẾ ĐỘ LƯỚI (DỌC - MẶC ĐỊNH) ---
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden h-full flex flex-col">
      <div className="aspect-[4/3] bg-gray-200 animate-pulse"></div>
      <div className="p-4 flex flex-col gap-3 flex-1">
        <div className="h-4 bg-gray-200 rounded animate-pulse w-full"></div>
        <div className="h-4 bg-gray-200 rounded animate-pulse w-2/3"></div>
        <div className="flex justify-between items-center mt-auto pt-2">
          <div className="h-4 bg-gray-200 rounded animate-pulse w-1/3"></div>
          <div className="h-4 bg-gray-200 rounded animate-pulse w-1/4"></div>
        </div>
      </div>
    </div>
  );
};

export default ProductSkeleton;
