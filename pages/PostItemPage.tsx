import React, { useState } from 'react';
import { ProductCategory, ProductCondition, TradeMethod } from '../types';
import { Sparkles, Camera, UploadCloud, X } from 'lucide-react';
import { generateProductDescription } from '../services/geminiService';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const PostItemPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    title: '',
    price: '',
    category: ProductCategory.TEXTBOOK,
    condition: ProductCondition.GOOD,
    details: '', 
    description: '', 
    tradeMethod: TradeMethod.BOTH,
    type: 'sell'
  });

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Xử lý khi chọn ảnh từ máy
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Kiểm tra dung lượng (< 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert("File ảnh quá lớn! Vui lòng chọn ảnh dưới 5MB.");
        return;
      }

      setImageFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleAiGenerate = async () => {
    if (!formData.title || !formData.details) {
      alert("Vui lòng nhập Tiêu đề và Ghi chú nhanh trước!");
      return;
    }
    setIsGenerating(true);
    const desc = await generateProductDescription(
      formData.title,
      formData.condition,
      formData.category,
      formData.details
    );
    setFormData(prev => ({ ...prev, description: desc }));
    setIsGenerating(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      alert("Bạn cần đăng nhập để đăng bài!");
      navigate('/auth');
      return;
    }

    setIsSubmitting(true);

    try {
      let finalImageUrl = 'https://via.placeholder.com/400x300?text=No+Image';

      // 1. Upload ảnh nếu có
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(fileName, imageFile);

        if (uploadError) throw uploadError;

        // Lấy link ảnh công khai
        const { data: urlData } = supabase.storage
          .from('product-images')
          .getPublicUrl(fileName);
          
        finalImageUrl = urlData.publicUrl;
      }

      // 2. Lưu thông tin sản phẩm
      const productData = {
        seller_id: user.id,
        title: formData.title,
        description: formData.description || formData.details,
        price: parseFloat(formData.price),
        category: formData.category,
        condition: formData.condition,
        trade_method: formData.tradeMethod,
        is_looking_to_buy: formData.type === 'buy',
        images: [finalImageUrl], // Lưu link ảnh thật vào mảng
        posted_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('products')
        .insert([productData]);

      if (error) throw error;

      alert("Đăng bài thành công!");
      navigate('/market');

    } catch (error: any) {
      console.error("Lỗi đăng bài:", error);
      alert("Lỗi: " + (error.message || "Không thể đăng bài"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
        <h3 className="text-lg font-medium leading-6 text-gray-900 mb-6">Đăng tin mới</h3>
        
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-6 gap-6">
            
            {/* ... (Các phần Loại tin, Tiêu đề, Danh mục... giữ nguyên) ... */}
            <div className="col-span-6">
                <div className="flex gap-4">
                    <label className="flex items-center cursor-pointer">
                        <input type="radio" name="type" value="sell" checked={formData.type === 'sell'} onChange={e => setFormData({...formData, type: e.target.value})} className="h-4 w-4 text-indigo-600" />
                        <span className="ml-2 text-sm font-medium text-gray-700">Tôi muốn Bán</span>
                    </label>
                    <label className="flex items-center cursor-pointer">
                        <input type="radio" name="type" value="buy" checked={formData.type === 'buy'} onChange={e => setFormData({...formData, type: e.target.value})} className="h-4 w-4 text-indigo-600" />
                        <span className="ml-2 text-sm font-medium text-gray-700">Tôi muốn Mua</span>
                    </label>
                </div>
            </div>

            <div className="col-span-6">
              <label className="block text-sm font-medium text-gray-700">Tiêu đề</label>
              <input type="text" required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} />
            </div>

            <div className="col-span-6 sm:col-span-3">
              <label className="block text-sm font-medium text-gray-700">Danh mục</label>
              <select className="mt-1 block w-full p-2 border border-gray-300 rounded-md" value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value as ProductCategory})}>
                {Object.values(ProductCategory).map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div className="col-span-6 sm:col-span-3">
              <label className="block text-sm font-medium text-gray-700">Tình trạng</label>
              <select className="mt-1 block w-full p-2 border border-gray-300 rounded-md" value={formData.condition} onChange={(e) => setFormData({...formData, condition: e.target.value as ProductCondition})}>
                 {Object.values(ProductCondition).map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div className="col-span-6 sm:col-span-3">
              <label className="block text-sm font-medium text-gray-700">Giá (VNĐ)</label>
              <input type="number" required className="mt-1 block w-full border border-gray-300 rounded-md p-2" value={formData.price} onChange={(e) => setFormData({...formData, price: e.target.value})} />
            </div>

            <div className="col-span-6 sm:col-span-3">
                <label className="block text-sm font-medium text-gray-700">Giao dịch</label>
                 <select className="mt-1 block w-full p-2 border border-gray-300 rounded-md" value={formData.tradeMethod} onChange={(e) => setFormData({...formData, tradeMethod: e.target.value as TradeMethod})}>
                     {Object.values(TradeMethod).map(c => <option key={c} value={c}>{c}</option>)}
                </select>
            </div>

            {/* Mô tả & AI */}
            <div className="col-span-6">
              <label className="block text-sm font-medium text-gray-700">Ghi chú nhanh</label>
              <input type="text" className="mb-2 block w-full border border-gray-300 rounded-md p-2" value={formData.details} onChange={(e) => setFormData({...formData, details: e.target.value})} />
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-medium text-gray-700">Mô tả chi tiết</label>
                <button type="button" onClick={handleAiGenerate} disabled={isGenerating} className="px-2 py-1 text-xs rounded text-white bg-indigo-600 flex items-center">
                    <Sparkles className="h-3 w-3 mr-1" /> AI Viết
                </button>
              </div>
              <textarea rows={4} className="block w-full border border-gray-300 rounded-md p-2" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} />
            </div>

            {/* --- PHẦN UPLOAD ẢNH MỚI --- */}
            <div className="col-span-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Hình ảnh sản phẩm</label>
              
              {!previewUrl ? (
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:bg-gray-50 transition cursor-pointer relative">
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={handleImageChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="space-y-1 text-center pointer-events-none">
                    <UploadCloud className="mx-auto h-12 w-12 text-gray-400" />
                    <div className="text-sm text-gray-600">
                      <span className="font-medium text-indigo-600 hover:text-indigo-500">Tải ảnh lên</span>
                    </div>
                    <p className="text-xs text-gray-500">PNG, JPG, GIF up to 5MB</p>
                  </div>
                </div>
              ) : (
                <div className="relative mt-2 w-full h-64 bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                  <img src={previewUrl} alt="Preview" className="w-full h-full object-contain" />
                  <button
                    type="button"
                    onClick={() => {
                        setImageFile(null);
                        setPreviewUrl(null);
                    }}
                    className="absolute top-2 right-2 bg-red-600 text-white p-1 rounded-full shadow hover:bg-red-700"
                    title="Xóa ảnh"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
            {/* --------------------------- */}

          </div>

          <div className="mt-6 flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className="py-2 px-6 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none disabled:opacity-50"
            >
              {isSubmitting ? 'Đang đăng tải...' : 'Đăng Tin Ngay'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PostItemPage;