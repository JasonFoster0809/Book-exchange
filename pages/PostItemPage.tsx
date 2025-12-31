import React, { useState } from 'react';
import { ProductCategory, ProductCondition, TradeMethod } from '../types';
import { Sparkles, ImagePlus, X, Loader2, CheckCircle } from 'lucide-react';
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

  // NÂNG CẤP: Dùng mảng để chứa nhiều file
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState<{msg: string, type: 'success'|'error'} | null>(null);

  // Hàm helper hiển thị thông báo
  const showNotify = (msg: string, type: 'success'|'error') => {
      setNotification({ msg, type });
      setTimeout(() => setNotification(null), 3000);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArr = Array.from(e.target.files);
      
      // Giới hạn tối đa 5 ảnh
      if (imageFiles.length + filesArr.length > 5) {
        showNotify("Chỉ được đăng tối đa 5 ảnh!", 'error');
        return;
      }

      const newPreviews = filesArr.map(file => URL.createObjectURL(file));
      setImageFiles(prev => [...prev, ...filesArr]);
      setPreviewUrls(prev => [...prev, ...newPreviews]);
    }
  };

  const removeImage = (index: number) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index));
    setPreviewUrls(prev => prev.filter((_, i) => i !== index));
  };

  const handleAiGenerate = async () => {
    if (!formData.title || !formData.details) {
      showNotify("Vui lòng nhập Tiêu đề và Ghi chú nhanh trước!", 'error');
      return;
    }
    setIsGenerating(true);
    try {
        const desc = await generateProductDescription(
        formData.title,
        formData.condition,
        formData.category,
        formData.details
        );
        setFormData(prev => ({ ...prev, description: desc }));
    } catch (err) {
        showNotify("Lỗi AI, vui lòng thử lại sau.", 'error');
    }
    setIsGenerating(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      navigate('/auth');
      return;
    }

    if (imageFiles.length === 0) {
        showNotify("Vui lòng đăng ít nhất 1 ảnh thật của sản phẩm.", 'error');
        return;
    }

    setIsSubmitting(true);

    try {
      // 1. Upload song song tất cả ảnh lên Storage
      const uploadPromises = imageFiles.map(async (file) => {
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data } = supabase.storage
          .from('product-images')
          .getPublicUrl(fileName);
          
        return data.publicUrl;
      });

      const uploadedImageUrls = await Promise.all(uploadPromises);

      // 2. Lưu vào DB
      const productData = {
        seller_id: user.id,
        title: formData.title,
        description: formData.description || formData.details,
        price: parseFloat(formData.price),
        category: formData.category,
        condition: formData.condition,
        trade_method: formData.tradeMethod,
        is_looking_to_buy: formData.type === 'buy',
        images: uploadedImageUrls, // Lưu mảng URL
        posted_at: new Date().toISOString()
      };

      const { error } = await supabase.from('products').insert([productData]);
      if (error) throw error;

      showNotify("Đăng bài thành công!", 'success');
      setTimeout(() => navigate('/market'), 1500);

    } catch (error: any) {
      console.error("Lỗi đăng bài:", error);
      showNotify("Lỗi: " + (error.message || "Không thể đăng bài"), 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 relative">
      {/* Toast Notification */}
      {notification && (
          <div className={`fixed top-20 right-5 z-50 px-4 py-3 rounded shadow-lg text-white flex items-center animate-bounce ${notification.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
              {notification.type === 'success' ? <CheckCircle className="w-5 h-5 mr-2"/> : <X className="w-5 h-5 mr-2"/>}
              {notification.msg}
          </div>
      )}

      <div className="bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
        <h3 className="text-xl font-bold leading-6 text-gray-900 mb-6">Đăng tin mới</h3>
        
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-6 gap-6">
            
            {/* Loại tin */}
            <div className="col-span-6">
                <div className="flex gap-4 p-1 bg-gray-100 rounded-lg w-fit">
                    <button type="button" onClick={() => setFormData({...formData, type: 'sell'})} className={`px-4 py-2 rounded-md text-sm font-medium transition ${formData.type === 'sell' ? 'bg-white shadow text-indigo-600' : 'text-gray-500'}`}>
                        Tôi muốn Bán
                    </button>
                    <button type="button" onClick={() => setFormData({...formData, type: 'buy'})} className={`px-4 py-2 rounded-md text-sm font-medium transition ${formData.type === 'buy' ? 'bg-white shadow text-indigo-600' : 'text-gray-500'}`}>
                        Tôi cần Mua
                    </button>
                </div>
            </div>

            <div className="col-span-6">
              <label className="block text-sm font-medium text-gray-700">Tiêu đề sản phẩm</label>
              <input type="text" required placeholder="Ví dụ: Giáo trình Giải tích 1 - Thầy A" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-indigo-500 focus:border-indigo-500" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} />
            </div>

            <div className="col-span-6 sm:col-span-3">
              <label className="block text-sm font-medium text-gray-700">Danh mục</label>
              <select className="mt-1 block w-full p-2 border border-gray-300 rounded-md bg-white" value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value as ProductCategory})}>
                {Object.values(ProductCategory).map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div className="col-span-6 sm:col-span-3">
              <label className="block text-sm font-medium text-gray-700">Tình trạng</label>
              <select className="mt-1 block w-full p-2 border border-gray-300 rounded-md bg-white" value={formData.condition} onChange={(e) => setFormData({...formData, condition: e.target.value as ProductCondition})}>
                 {Object.values(ProductCondition).map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div className="col-span-6 sm:col-span-3">
              <label className="block text-sm font-medium text-gray-700">Giá mong muốn (VNĐ)</label>
              <input type="number" required placeholder="50000" className="mt-1 block w-full border border-gray-300 rounded-md p-2" value={formData.price} onChange={(e) => setFormData({...formData, price: e.target.value})} />
            </div>

            <div className="col-span-6 sm:col-span-3">
                <label className="block text-sm font-medium text-gray-700">Cách giao dịch</label>
                 <select className="mt-1 block w-full p-2 border border-gray-300 rounded-md bg-white" value={formData.tradeMethod} onChange={(e) => setFormData({...formData, tradeMethod: e.target.value as TradeMethod})}>
                     {Object.values(TradeMethod).map(c => <option key={c} value={c}>{c}</option>)}
                </select>
            </div>

            {/* AI Generation Section */}
            <div className="col-span-6 bg-indigo-50 p-4 rounded-lg border border-indigo-100">
              <label className="block text-sm font-medium text-indigo-900 mb-1">Ghi chú nhanh (Màu sắc, tác giả, năm xuất bản...)</label>
              <input type="text" className="block w-full border border-indigo-200 rounded-md p-2 bg-white mb-3" placeholder="Nhập vắn tắt đặc điểm..." value={formData.details} onChange={(e) => setFormData({...formData, details: e.target.value})} />
              
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-gray-700">Mô tả chi tiết (Sẽ hiện trong bài đăng)</label>
                <button type="button" onClick={handleAiGenerate} disabled={isGenerating} className="px-3 py-1.5 text-xs font-bold rounded text-white bg-indigo-600 hover:bg-indigo-700 flex items-center transition shadow-sm">
                    {isGenerating ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Sparkles className="h-3 w-3 mr-1" />}
                    {isGenerating ? 'Đang viết...' : 'Dùng AI viết mô tả'}
                </button>
              </div>
              <textarea rows={5} className="block w-full border border-gray-300 rounded-md p-2 focus:ring-indigo-500" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} placeholder="Bạn có thể tự viết hoặc để AI giúp..." />
            </div>

            {/* --- MULTI IMAGE UPLOAD --- */}
            <div className="col-span-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Hình ảnh sản phẩm (Tối đa 5 ảnh)</label>
              
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {previewUrls.map((url, idx) => (
                      <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-gray-200 group">
                          <img src={url} alt="Preview" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => removeImage(idx)}
                            className="absolute top-1 right-1 bg-black/50 text-white p-1 rounded-full hover:bg-red-600 transition opacity-0 group-hover:opacity-100"
                          >
                            <X className="w-3 h-3" />
                          </button>
                      </div>
                  ))}

                  {/* Nút thêm ảnh */}
                  {previewUrls.length < 5 && (
                    <label className="flex flex-col items-center justify-center aspect-square border-2 border-dashed border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer transition text-gray-400 hover:text-indigo-500 hover:border-indigo-300">
                        <ImagePlus className="w-8 h-8 mb-1" />
                        <span className="text-xs">Thêm ảnh</span>
                        <input 
                            type="file" 
                            multiple 
                            accept="image/*"
                            onChange={handleImageChange}
                            className="hidden"
                        />
                    </label>
                  )}
              </div>
            </div>
          </div>

          <div className="mt-8 flex justify-end pt-5 border-t border-gray-200">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center py-2 px-8 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none disabled:opacity-70 disabled:cursor-not-allowed transition-all"
            >
              {isSubmitting ? (
                  <>
                    <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" /> Đang đăng tải...
                  </>
              ) : 'Đăng Tin Ngay'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PostItemPage;