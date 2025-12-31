import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import { generateProductDescription } from '../services/geminiService';
// Import các icon cần thiết
import { Upload, DollarSign, Tag, FileText, Sparkles, ImagePlus, X, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { ProductCategory, ProductCondition, TradeMethod } from '../types';
// Import Toast để hiển thị thông báo đẹp
import { useToast } from '../contexts/ToastContext';

const PostItemPage: React.FC = () => {
  const { user } = useAuth();
  const { addToast } = useToast(); // Hook sử dụng Toast Notification
  const navigate = useNavigate();
  
  // State quản lý trạng thái loading
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  // State quản lý form dữ liệu
  const [formData, setFormData] = useState({
    title: '',
    price: '',
    description: '',
    details: '', // Ghi chú nhanh cho AI
    category: ProductCategory.TEXTBOOK,
    condition: ProductCondition.GOOD,
    tradeMethod: TradeMethod.BOTH,
    isLookingToBuy: false, // Mặc định là tin BÁN
    type: 'sell' // Helper state cho UI switch Bán/Mua
  });

  // State quản lý danh sách ảnh (NÂNG CẤP: Đăng nhiều ảnh)
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);

  // Hàm xử lý khi chọn ảnh từ máy
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFiles = Array.from(e.target.files);
      
      // Kiểm tra giới hạn số lượng ảnh (VD: tối đa 5 ảnh)
      if (imageFiles.length + selectedFiles.length > 5) {
        addToast("Bạn chỉ được đăng tối đa 5 ảnh cho một sản phẩm.", "warning");
        return;
      }

      // Kiểm tra dung lượng từng ảnh (VD: < 5MB)
      const validFiles = selectedFiles.filter(file => {
          if (file.size > 5 * 1024 * 1024) {
              addToast(`Ảnh ${file.name} quá lớn (Max 5MB). Đã bỏ qua.`, "warning");
              return false;
          }
          return true;
      });

      if (validFiles.length > 0) {
          // Cập nhật state
          setImageFiles(prev => [...prev, ...validFiles]);
          // Tạo URL preview
          const newPreviews = validFiles.map(file => URL.createObjectURL(file));
          setPreviewUrls(prev => [...prev, ...newPreviews]);
      }
    }
  };

  // Hàm xóa ảnh đã chọn
  const removeImage = (index: number) => {
      setImageFiles(prev => prev.filter((_, i) => i !== index));
      setPreviewUrls(prev => prev.filter((_, i) => i !== index));
  };

  // Hàm gọi AI để viết mô tả tự động
  const handleGenerateAI = async () => {
    if (!formData.title) {
        addToast("Vui lòng nhập tên món đồ trước để AI có thể viết mô tả.", "warning");
        return;
    }
    
    setAiLoading(true); // Bật loading AI
    try {
        // Gọi service Gemini (hoặc Groq)
        const desc = await generateProductDescription(
            formData.title, 
            formData.condition, 
            formData.category, 
            formData.details || "Mô tả ngắn gọn, hấp dẫn cho sinh viên"
        );
        
        // Điền kết quả vào ô Mô tả
        setFormData(prev => ({ ...prev, description: desc }));
        addToast("AI đã viết xong mô tả cho bạn!", "success");

    } catch (error) {
        console.error("Lỗi AI:", error);
        addToast("AI đang bận, vui lòng thử lại sau.", "error");
    } finally {
        setAiLoading(false); // Tắt loading AI
    }
  };

  // Hàm xử lý Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Validate dữ liệu đầu vào
    if (!user) {
        addToast("Vui lòng đăng nhập để đăng tin.", "error");
        navigate('/auth');
        return;
    }
    if (!formData.title || !formData.price) {
        addToast("Vui lòng điền tên và giá sản phẩm.", "warning");
        return;
    }
    if (imageFiles.length === 0) {
        addToast("Vui lòng tải lên ít nhất 1 hình ảnh thực tế.", "warning");
        return;
    }

    setLoading(true); // Bật loading submit
    
    try {
        // 2. Upload tất cả ảnh lên Supabase Storage (Song song)
        const uploadPromises = imageFiles.map(async (file) => {
            const fileExt = file.name.split('.').pop();
            const fileName = `${user.id}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
            
            const { error: uploadError } = await supabase.storage
                .from('product-images')
                .upload(fileName, file);
            
            if (uploadError) throw uploadError;

            // Lấy Public URL
            const { data } = supabase.storage
                .from('product-images')
                .getPublicUrl(fileName);
                
            return data.publicUrl;
        });

        // Chờ tất cả ảnh upload xong
        const uploadedImageUrls = await Promise.all(uploadPromises);

        // 3. Lưu thông tin sản phẩm vào Database
        const { error: insertError } = await supabase.from('products').insert({
            seller_id: user.id,
            title: formData.title,
            price: parseInt(formData.price),
            description: formData.description || formData.details, // Fallback nếu ko có mô tả dài
            category: formData.category,
            condition: formData.condition,
            trade_method: formData.tradeMethod,
            images: uploadedImageUrls, // Lưu mảng URL ảnh
            is_looking_to_buy: formData.type === 'buy', // Map type sang boolean
            is_sold: false,
            posted_at: new Date().toISOString() // Thời gian đăng
        });

        if (insertError) throw insertError;

        // 4. Thông báo thành công và chuyển hướng
        addToast("Đăng tin thành công! Chúc bạn giao dịch thuận lợi.", "success");
        navigate('/market'); // Về trang chợ

    } catch (error: any) {
        console.error("Lỗi đăng tin:", error);
        addToast("Có lỗi xảy ra: " + (error.message || "Không thể đăng tin."), "error");
    } finally {
        setLoading(false); // Tắt loading dù thành công hay thất bại
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      {/* Header trang */}
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-extrabold text-gray-900 flex items-center justify-center gap-2">
            <FileText className="w-8 h-8 text-indigo-600"/> Đăng Tin Mới
        </h1>
        <p className="mt-2 text-gray-500">Đăng bán giáo trình, đồ dùng học tập cũ hoặc tìm mua món đồ bạn cần.</p>
      </div>

      <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
        {/* Thanh tiêu đề form */}
        <div className="bg-indigo-600 px-6 py-4 flex justify-between items-center">
             <span className="text-white font-medium text-lg">Thông tin sản phẩm</span>
             {/* Switch Bán / Mua */}
             <div className="bg-indigo-800 p-1 rounded-lg flex text-sm">
                 <button 
                    type="button" 
                    onClick={() => setFormData({...formData, type: 'sell'})} 
                    className={`px-3 py-1 rounded-md transition-all ${formData.type === 'sell' ? 'bg-white text-indigo-700 font-bold shadow' : 'text-indigo-200 hover:text-white'}`}
                 >
                     Bán đồ
                 </button>
                 <button 
                    type="button" 
                    onClick={() => setFormData({...formData, type: 'buy'})} 
                    className={`px-3 py-1 rounded-md transition-all ${formData.type === 'buy' ? 'bg-white text-indigo-700 font-bold shadow' : 'text-indigo-200 hover:text-white'}`}
                 >
                     Cần mua
                 </button>
             </div>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-8">
            
            {/* 1. Tên & Giá */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                        Tên món đồ <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                        <input 
                            type="text" 
                            required 
                            className="block w-full pl-4 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors" 
                            placeholder="VD: Giáo trình Giải tích 1..." 
                            value={formData.title} 
                            onChange={e => setFormData({...formData, title: e.target.value})} 
                        />
                        <Tag className="w-5 h-5 text-gray-400 absolute right-3 top-3.5"/>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                        Giá mong muốn (VNĐ) <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                        <input 
                            type="number" 
                            required 
                            className="block w-full pl-4 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors font-mono font-bold text-gray-700" 
                            placeholder="50000" 
                            value={formData.price} 
                            onChange={e => setFormData({...formData, price: e.target.value})} 
                        />
                        <DollarSign className="w-5 h-5 text-gray-400 absolute right-3 top-3.5"/>
                    </div>
                </div>
            </div>

            {/* 2. Các tùy chọn Select (Category, Condition, Method) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Danh mục</label>
                    <select 
                        className="block w-full py-2.5 px-3 border border-gray-300 bg-white rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm cursor-pointer" 
                        value={formData.category} 
                        onChange={e => setFormData({...formData, category: e.target.value as any})}
                    >
                        {Object.values(ProductCategory).map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Tình trạng</label>
                    <select 
                        className="block w-full py-2.5 px-3 border border-gray-300 bg-white rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm cursor-pointer" 
                        value={formData.condition} 
                        onChange={e => setFormData({...formData, condition: e.target.value as any})}
                    >
                        {Object.values(ProductCondition).map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Giao dịch</label>
                    <select 
                        className="block w-full py-2.5 px-3 border border-gray-300 bg-white rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm cursor-pointer" 
                        value={formData.tradeMethod} 
                        onChange={e => setFormData({...formData, tradeMethod: e.target.value as any})}
                    >
                        {Object.values(TradeMethod).map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
            </div>

            {/* 3. Khu vực Upload Ảnh (QUAN TRỌNG: Multi-upload) */}
            <div className="bg-gray-50 p-6 rounded-xl border border-dashed border-gray-300">
                <label className="block text-sm font-bold text-gray-700 mb-4 flex justify-between">
                    <span>Hình ảnh thực tế <span className="text-red-500">*</span></span>
                    <span className="text-xs font-normal text-gray-500 bg-white px-2 py-1 rounded border">Tối đa 5 ảnh</span>
                </label>
                
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-4">
                    {/* Danh sách ảnh đã chọn */}
                    {previewUrls.map((url, idx) => (
                        <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-gray-200 group shadow-sm bg-white">
                            <img src={url} alt={`Preview ${idx}`} className="w-full h-full object-cover" />
                            {/* Nút xóa ảnh */}
                            <button
                                type="button"
                                onClick={() => removeImage(idx)}
                                className="absolute top-1 right-1 bg-white/90 text-red-500 p-1 rounded-full hover:bg-red-500 hover:text-white transition-all shadow-sm opacity-0 group-hover:opacity-100"
                                title="Xóa ảnh này"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    ))}

                    {/* Nút Thêm ảnh (chỉ hiện khi chưa đủ 5 ảnh) */}
                    {previewUrls.length < 5 && (
                        <label className="flex flex-col items-center justify-center aspect-square border-2 border-dashed border-indigo-200 rounded-lg hover:bg-indigo-50 cursor-pointer transition-all text-indigo-400 hover:text-indigo-600 hover:border-indigo-400 bg-white">
                            <ImagePlus className="w-8 h-8 mb-2" />
                            <span className="text-xs font-medium">Thêm ảnh</span>
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
                {previewUrls.length === 0 && (
                    <p className="text-center text-xs text-gray-400 mt-4">Chưa có ảnh nào được chọn. Hãy tải lên ảnh thật để bán nhanh hơn nhé!</p>
                )}
            </div>

            {/* 4. Mô tả chi tiết & AI */}
            <div className="bg-gradient-to-br from-white to-indigo-50/50 p-6 rounded-xl border border-indigo-100 shadow-sm">
                <div className="mb-4">
                     <label className="block text-sm font-bold text-gray-700 mb-2">Ghi chú nhanh (Để AI viết hộ)</label>
                     <div className="flex gap-2">
                        <input 
                            type="text" 
                            className="flex-1 border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500" 
                            placeholder="VD: Sách còn mới 99%, có bao plastic, tặng kèm đề thi..." 
                            value={formData.details} 
                            onChange={e => setFormData({...formData, details: e.target.value})} 
                        />
                        <button 
                            type="button"
                            onClick={handleGenerateAI}
                            disabled={aiLoading}
                            className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-indigo-700 transition flex items-center shadow disabled:opacity-70 whitespace-nowrap"
                        >
                            {aiLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                            AI Viết
                        </button>
                     </div>
                </div>

                <div className="relative">
                    <label className="block text-sm font-bold text-gray-700 mb-2">Mô tả chi tiết (Nội dung bài đăng)</label>
                    <textarea 
                        rows={6} 
                        required 
                        className="block w-full p-4 border border-gray-300 rounded-xl shadow-inner focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white leading-relaxed" 
                        placeholder="Mô tả chi tiết về sản phẩm sẽ xuất hiện ở đây..."
                        value={formData.description}
                        onChange={e => setFormData({...formData, description: e.target.value})}
                    />
                    <div className="absolute bottom-3 right-3 text-xs text-gray-400 pointer-events-none">
                        {formData.description.length} ký tự
                    </div>
                </div>
            </div>

            {/* 5. Nút Submit */}
            <div className="pt-6 border-t border-gray-100">
                <button 
                    type="submit" 
                    disabled={loading}
                    className="w-full flex justify-center items-center py-4 px-6 border border-transparent rounded-xl shadow-lg text-base font-bold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-70 disabled:cursor-not-allowed transition-all transform hover:-translate-y-0.5"
                >
                    {loading ? (
                        <>
                            <Loader2 className="animate-spin -ml-1 mr-3 h-5 w-5" /> 
                            Đang xử lý đăng tin...
                        </>
                    ) : (
                        <>
                            <CheckCircle className="w-5 h-5 mr-2" />
                            Đăng Tin Ngay
                        </>
                    )}
                </button>
                <p className="text-center text-xs text-gray-500 mt-4">
                    Bằng việc đăng tin, bạn cam kết món đồ đúng như mô tả và tuân thủ quy định của cộng đồng UniMarket.
                </p>
            </div>
        </form>
      </div>
    </div>
  );
};

export default PostItemPage;