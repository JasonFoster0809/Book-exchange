import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../services/supabase";
import { useToast } from "../contexts/ToastContext";
import {
  Camera,
  Upload,
  X,
  Sparkles,
  DollarSign,
  Tag,
  MapPin,
  AlignLeft,
  Loader,
  ArrowLeft,
  Image as ImageIcon,
  CheckCircle,
  Info
} from "lucide-react";

// --- TYPES ---
interface PostForm {
  title: string;
  description: string;
  price: string; // Dùng string để dễ xử lý input, convert sang number khi submit
  category: string;
  condition: string;
  trade_method: string;
  location_name: string;
}

const CATEGORIES = [
  { id: "textbook", label: "Giáo trình" },
  { id: "electronics", label: "Điện tử (Laptop, MTCT...)" },
  { id: "supplies", label: "Dụng cụ học tập" },
  { id: "clothing", label: "Đồng phục / Quần áo" },
  { id: "other", label: "Khác" },
];

const CONDITIONS = [
  { id: "new", label: "Mới 100%" },
  { id: "like_new", label: "Như mới (99%)" },
  { id: "good", label: "Tốt (Trầy xước nhẹ)" },
  { id: "fair", label: "Cũ (Chấp nhận được)" },
];

const PostItemPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false); // State giả lập AI
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [form, setForm] = useState<PostForm>({
    title: "",
    description: "",
    price: "",
    category: "textbook",
    condition: "good",
    trade_method: "direct",
    location_name: "Hồ Chí Minh",
  });

  // Styles
  const GlobalStyles = () => (
    <style>{`
      :root { --primary: #00418E; --secondary: #00B0F0; }
      body { background-color: #F8FAFC; color: #0F172A; font-family: 'Inter', system-ui, sans-serif; }
      .glass-panel { background: rgba(255, 255, 255, 0.8); backdrop-filter: blur(12px); border: 1px solid rgba(255, 255, 255, 0.5); box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
      .input-field { width: 100%; background: white; border: 1px solid #E2E8F0; border-radius: 12px; padding: 12px 16px; transition: all 0.2s; outline: none; }
      .input-field:focus { border-color: #00418E; box-shadow: 0 0 0 3px rgba(0, 65, 142, 0.1); }
      .animate-enter { animation: fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; opacity: 0; }
      @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
    `}</style>
  );

  // Handlers
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      // Validate file size/type nếu cần
      setImageFiles((prev) => [...prev, ...newFiles]);
      
      // Tạo preview URL
      const newPreviews = newFiles.map((file) => URL.createObjectURL(file));
      setImagePreviews((prev) => [...prev, ...newPreviews]);
    }
  };

  const removeImage = (index: number) => {
    setImageFiles((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => {
      // Revoke URL cũ để tránh leak memory
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  };

  // Giả lập AI Analysis (Bạn có thể nối Gemini Service thật vào đây)
  const handleAnalyzeWithAI = async () => {
    if (imageFiles.length === 0) {
      addToast("Vui lòng chọn ảnh trước để AI phân tích", "error");
      return;
    }
    setAnalyzing(true);
    // Giả lập delay 2s
    setTimeout(() => {
      setForm((prev) => ({
        ...prev,
        title: "Giáo trình Giải Tích 1 - HCMUT (Bìa xanh)",
        description: "Sách còn mới, không viết vẽ bậy. Dùng cho sinh viên năm 1 Bách Khoa.",
        category: "textbook",
        condition: "like_new"
      }));
      setAnalyzing(false);
      addToast("Đã phân tích ảnh thành công!", "success");
    }, 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!form.title || !form.price) {
      addToast("Vui lòng điền tên và giá sản phẩm", "error");
      return;
    }
    if (imageFiles.length === 0) {
      addToast("Vui lòng đăng ít nhất 1 ảnh", "error");
      return;
    }

    setLoading(true);
    try {
      // 1. Upload ảnh lên Supabase Storage
      const imageUrls: string[] = [];
      for (const file of imageFiles) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
        const filePath = `${user.id}/${fileName}`;

        // Lưu ý: Bucket tên là 'product-images' (hoặc 'images' tùy setup của bạn)
        const { error: uploadError } = await supabase.storage
          .from('product-images') 
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        // Lấy Public URL
        const { data: urlData } = supabase.storage
          .from('product-images')
          .getPublicUrl(filePath);
          
        imageUrls.push(urlData.publicUrl);
      }

      // 2. Insert vào bảng PRODUCTS (Schema cũ)
      const { error: insertError } = await supabase
        .from('products')
        .insert({
          title: form.title,
          description: form.description,
          price: parseInt(form.price.replace(/\D/g, '')) || 0, // Convert string -> number
          category: form.category,
          condition: form.condition,
          trade_method: form.trade_method,
          location_name: form.location_name,
          images: imageUrls, // Array string
          seller_id: user.id,
          status: 'available',
          view_count: 0,
          like_count: 0
        });

      if (insertError) throw insertError;

      addToast("Đăng tin thành công!", "success");
      navigate('/market'); // Quay về chợ hoặc trang chi tiết

    } catch (error: any) {
      console.error("Post Error:", error);
      addToast("Có lỗi xảy ra: " + error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pb-20 pt-20">
      <GlobalStyles />
      
      {/* Background Decor */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-200/20 rounded-full blur-[100px]" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-200/20 rounded-full blur-[100px]" />
      </div>

      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8 animate-enter">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-white rounded-full transition-colors">
            <ArrowLeft size={24} className="text-slate-600" />
          </button>
          <div>
            <h1 className="text-3xl font-black text-slate-800">Đăng tin mới</h1>
            <p className="text-slate-500">Tiếp cận hàng ngàn sinh viên Bách Khoa ngay hôm nay.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* --- CỘT TRÁI: UPLOAD ẢNH & AI --- */}
          <div className="lg:col-span-1 space-y-6 animate-enter" style={{ animationDelay: '100ms' }}>
            {/* AI Banner */}
            <div className="glass-panel p-5 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-100">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles size={18} className="text-blue-600 animate-pulse" />
                <h3 className="font-bold text-blue-900">AI Hỗ trợ</h3>
              </div>
              <p className="text-xs text-blue-700/80 mb-4 leading-relaxed">
                Tải ảnh lên và để AI tự động điền thông tin giúp bạn. Tiết kiệm 90% thời gian!
              </p>
              <button 
                onClick={handleAnalyzeWithAI}
                disabled={analyzing || imageFiles.length === 0}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {analyzing ? <Loader size={16} className="animate-spin" /> : <Sparkles size={16} />}
                {analyzing ? "Đang phân tích..." : "Phân tích ngay"}
              </button>
            </div>

            {/* Upload Area */}
            <div className="glass-panel p-5 rounded-2xl">
              <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                <ImageIcon size={18} className="text-slate-400" /> Hình ảnh
              </h3>
              
              <div className="grid grid-cols-2 gap-2 mb-4">
                {imagePreviews.map((src, idx) => (
                  <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-slate-200 group">
                    <img src={src} alt="Preview" className="w-full h-full object-cover" />
                    <button 
                      onClick={() => removeImage(idx)}
                      className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
                
                {/* Nút thêm ảnh */}
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="aspect-square rounded-lg border-2 border-dashed border-slate-300 hover:border-blue-500 hover:bg-blue-50 transition-all cursor-pointer flex flex-col items-center justify-center text-slate-400 hover:text-blue-500"
                >
                  <Camera size={24} className="mb-2" />
                  <span className="text-xs font-bold">Thêm ảnh</span>
                </div>
              </div>
              
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileSelect} 
                className="hidden" 
                multiple 
                accept="image/*" 
              />
              
              <p className="text-[10px] text-center text-slate-400">
                Tối đa 5 ảnh. Dung lượng &lt; 5MB/ảnh.
              </p>
            </div>
          </div>

          {/* --- CỘT PHẢI: FORM NHẬP LIỆU --- */}
          <div className="lg:col-span-2 animate-enter" style={{ animationDelay: '200ms' }}>
            <form onSubmit={handleSubmit} className="glass-panel p-6 rounded-3xl space-y-6">
              
              {/* Tiêu đề */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Tên sản phẩm</label>
                <input 
                  value={form.title}
                  onChange={e => setForm({...form, title: e.target.value})}
                  placeholder="VD: Giáo trình Giải Tích 1, Laptop Dell XPS..."
                  className="input-field text-lg font-medium"
                />
              </div>

              {/* Giá & Danh mục */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-1">
                    <DollarSign size={14} /> Giá bán (VNĐ)
                  </label>
                  <input 
                    type="text"
                    value={form.price}
                    onChange={e => {
                      // Chỉ cho nhập số
                      const val = e.target.value.replace(/\D/g, '');
                      setForm({...form, price: val ? parseInt(val).toLocaleString('vi-VN') : ''});
                    }}
                    placeholder="0 = Miễn phí"
                    className="input-field font-mono text-green-600 font-bold"
                  />
                  {form.price === '0' && <span className="text-xs text-green-500 font-bold mt-1 block">✨ Sản phẩm này sẽ hiện là MIỄN PHÍ</span>}
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-1">
                    <Tag size={14} /> Danh mục
                  </label>
                  <select 
                    value={form.category}
                    onChange={e => setForm({...form, category: e.target.value})}
                    className="input-field appearance-none"
                  >
                    {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                  </select>
                </div>
              </div>

              {/* Tình trạng & Hình thức */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Tình trạng</label>
                  <div className="flex flex-wrap gap-2">
                    {CONDITIONS.map(c => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setForm({...form, condition: c.id})}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                          form.condition === c.id 
                            ? 'bg-blue-600 border-blue-600 text-white shadow-md' 
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                   <label className="block text-sm font-bold text-slate-700 mb-2">Giao dịch</label>
                   <div className="flex gap-4">
                     <label className="flex items-center gap-2 cursor-pointer">
                        <input 
                          type="radio" 
                          name="trade" 
                          checked={form.trade_method === 'direct'}
                          onChange={() => setForm({...form, trade_method: 'direct'})}
                          className="w-4 h-4 text-blue-600"
                        />
                        <span className="text-sm">Trực tiếp (HCMUT)</span>
                     </label>
                     <label className="flex items-center gap-2 cursor-pointer">
                        <input 
                          type="radio" 
                          name="trade"
                          checked={form.trade_method === 'shipping'}
                          onChange={() => setForm({...form, trade_method: 'shipping'})}
                          className="w-4 h-4 text-blue-600"
                        />
                        <span className="text-sm">Ship cod</span>
                     </label>
                   </div>
                </div>
              </div>

              {/* Mô tả */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-1">
                  <AlignLeft size={14} /> Mô tả chi tiết
                </label>
                <textarea 
                  value={form.description}
                  onChange={e => setForm({...form, description: e.target.value})}
                  rows={5}
                  placeholder="Mô tả kỹ hơn về tình trạng, thời gian mua, lý do bán..."
                  className="input-field resize-none leading-relaxed"
                />
              </div>

              {/* Địa điểm */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-1">
                  <MapPin size={14} /> Khu vực
                </label>
                <input 
                  value={form.location_name}
                  onChange={e => setForm({...form, location_name: e.target.value})}
                  className="input-field"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-4">
                 <button 
                   type="button" 
                   onClick={() => navigate(-1)}
                   className="px-6 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition-colors"
                 >
                   Hủy bỏ
                 </button>
                 <button 
                   type="submit"
                   disabled={loading}
                   className="px-8 py-3 rounded-xl font-bold text-white bg-gradient-to-r from-blue-600 to-cyan-500 hover:opacity-90 shadow-lg shadow-blue-500/30 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
                 >
                   {loading && <Loader size={18} className="animate-spin" />}
                   {loading ? "Đang đăng tin..." : "Đăng tin ngay"}
                 </button>
              </div>

            </form>
            
            <div className="mt-6 flex items-start gap-3 p-4 bg-yellow-50 border border-yellow-100 rounded-xl text-yellow-800 text-sm">
               <Info size={18} className="shrink-0 mt-0.5" />
               <p>
                 Lưu ý: Mọi tin đăng đều được kiểm duyệt. Vui lòng không đăng các sản phẩm cấm (vape, thuốc lá, chất kích thích...) để tránh bị khóa tài khoản vĩnh viễn.
               </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PostItemPage;
