import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Upload, X, Image as ImageIcon, DollarSign, Tag, 
  FileText, ArrowRight, ArrowLeft, CheckCircle2, 
  Sparkles, Loader2, Info, Camera, Box, AlertCircle,
  MapPin // <-- Đã thêm MapPin vào đây
} from 'lucide-react';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { ProductCategory, ProductCondition, TradeMethod } from '../types';

const VisualEngine = () => (
  <style>{`
    :root {
      --primary: #00418E;
      --secondary: #00B0F0;
    }
    
    body { background-color: #F8FAFC; }

    ::-webkit-scrollbar { width: 6px; }
    ::-webkit-scrollbar-thumb { background: #CBD5E1; border-radius: 10px; }

    @keyframes slideUp {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes pulse-ring {
      0% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.5); }
      70% { box-shadow: 0 0 0 15px rgba(59, 130, 246, 0); }
      100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); }
    }
    @keyframes shimmer {
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }

    .animate-enter { animation: slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
    .animate-pulse-ring { animation: pulse-ring 2s infinite; }
    
    .glass-panel {
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(20px);
      border: 1px solid rgba(255, 255, 255, 0.5);
      box-shadow: 0 20px 40px -10px rgba(0,0,0,0.05);
    }

    .gradient-text {
      background: linear-gradient(135deg, #00418E 0%, #00B0F0 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .input-group:focus-within label { color: var(--primary); }
    .input-group:focus-within input, 
    .input-group:focus-within textarea,
    .input-group:focus-within select { 
      border-color: var(--primary); 
      box-shadow: 0 0 0 4px rgba(0, 65, 142, 0.1);
    }

    .step-active { background: var(--primary); color: white; border-color: var(--primary); }
    .step-completed { background: #10B981; color: white; border-color: #10B981; }
    .step-inactive { background: white; color: #94A3B8; border-color: #E2E8F0; }
  `}</style>
);

const CATEGORIES = [
  { value: ProductCategory.TEXTBOOK, label: 'Giáo trình & Sách' },
  { value: ProductCategory.ELECTRONICS, label: 'Thiết bị điện tử' },
  { value: ProductCategory.SUPPLIES, label: 'Dụng cụ học tập' },
  { value: ProductCategory.CLOTHING, label: 'Đồng phục & Thời trang' },
  { value: ProductCategory.OTHER, label: 'Khác' },
];

const CONDITIONS = [
  { value: ProductCondition.NEW, label: 'Mới 100%' },
  { value: ProductCondition.LIKE_NEW, label: 'Như mới (99%)' },
  { value: ProductCondition.GOOD, label: 'Tốt (Đã qua sử dụng)' },
  { value: ProductCondition.FAIR, label: 'Khá (Có vết trầy xước)' },
];

const STEPS = [
  { id: 1, title: 'Hình ảnh', icon: <Camera size={18}/> },
  { id: 2, title: 'Thông tin', icon: <FileText size={18}/> },
  { id: 3, title: 'Xác nhận', icon: <CheckCircle2 size={18}/> },
];

const StepIndicator = ({ currentStep }: { currentStep: number }) => (
  <div className="flex items-center justify-center mb-10 w-full max-w-2xl mx-auto">
    {STEPS.map((step, index) => (
      <div key={step.id} className="flex items-center w-full last:w-auto">
        <div className={`relative flex items-center justify-center w-10 h-10 rounded-full border-2 font-bold text-sm transition-all duration-300 z-10 ${
          currentStep === step.id ? 'step-active scale-110 shadow-lg' : 
          currentStep > step.id ? 'step-completed' : 'step-inactive'
        }`}>
          {currentStep > step.id ? <CheckCircle2 size={20}/> : step.id}
          
          <div className="absolute -bottom-8 whitespace-nowrap text-xs font-bold text-slate-500">
            {step.title}
          </div>
        </div>
        {index < STEPS.length - 1 && (
          <div className={`flex-1 h-1 mx-2 rounded-full transition-all duration-500 ${
            currentStep > step.id ? 'bg-[#10B981]' : 'bg-slate-200'
          }`}/>
        )}
      </div>
    ))}
  </div>
);

const AIAnalyzer = ({ onAnalyze }: { onAnalyze: () => void }) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleClick = () => {
    setIsAnalyzing(true);
    setTimeout(() => {
      setIsAnalyzing(false);
      onAnalyze();
    }, 2000);
  };

  return (
    <button 
      onClick={handleClick}
      disabled={isAnalyzing}
      className={`relative w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 overflow-hidden transition-all ${
        isAnalyzing ? 'bg-indigo-100 text-indigo-700' : 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white hover:shadow-lg hover:scale-[1.02]'
      }`}
    >
      {isAnalyzing ? (
        <>
          <Loader2 size={18} className="animate-spin"/> Gemini AI đang phân tích ảnh...
        </>
      ) : (
        <>
          <Sparkles size={18}/> Dùng AI tự động điền thông tin
        </>
      )}
      {!isAnalyzing && <div className="absolute inset-0 bg-white/20 animate-[shimmer_2s_infinite] skew-x-12"></div>}
    </button>
  );
};

const PostItemPage: React.FC = () => {
  const { user, isRestricted } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');

  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [images, setImages] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    category: ProductCategory.TEXTBOOK,
    condition: ProductCondition.GOOD,
    tradeMethod: 'direct' as TradeMethod, // Default to string literal cast
  });

  useEffect(() => {
    if (editId) {
      const loadProduct = async () => {
        const { data } = await supabase.from('products').select('*').eq('id', editId).single();
        if (data) {
          setFormData({
            title: data.title,
            description: data.description || '',
            price: data.price.toString(),
            category: data.category as ProductCategory,
            condition: data.condition as ProductCondition,
            tradeMethod: data.trade_method as TradeMethod,
          });
          setPreviewUrls(data.images || []);
        }
      };
      loadProduct();
    }
  }, [editId]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      setImages(prev => [...prev, ...newFiles]);
      
      const newUrls = newFiles.map(file => URL.createObjectURL(file));
      setPreviewUrls(prev => [...prev, ...newUrls]);
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
    setPreviewUrls(prev => prev.filter((_, i) => i !== index));
  };

  const handleAIAnalyze = () => {
    setFormData(prev => ({
      ...prev,
      title: "Giáo trình Giải Tích 1 - ĐH Bách Khoa (Bản đẹp)",
      description: "Sách còn mới 99%, không ghi chú, bao bìa cẩn thận. Phù hợp cho sinh viên năm nhất học đại cương.",
      category: ProductCategory.TEXTBOOK,
      condition: ProductCondition.LIKE_NEW
    }));
    addToast("Đã tự động điền thông tin từ hình ảnh!", "success");
  };

  const handleSubmit = async () => {
    if (!user) return navigate('/auth');
    if (!formData.title || !formData.price) return addToast("Vui lòng điền đầy đủ thông tin", "error");
    
    setIsSubmitting(true);
    try {
      let imageUrls = [...previewUrls];

      if (images.length > 0) {
        const newUploadedUrls = await Promise.all(images.map(async (file) => {
          const fileName = `${user.id}/${Date.now()}-${file.name}`;
          const { error } = await supabase.storage.from('product-images').upload(fileName, file);
          if (error) throw error;
          const { data } = supabase.storage.from('product-images').getPublicUrl(fileName);
          return data.publicUrl;
        }));
        imageUrls = [...imageUrls.filter(url => url.startsWith('http')), ...newUploadedUrls];
      }

      const productData = {
        title: formData.title,
        description: formData.description,
        price: parseInt(formData.price.replace(/\D/g, '')),
        category: formData.category,
        condition: formData.condition,
        trade_method: formData.tradeMethod,
        images: imageUrls,
        seller_id: user.id,
        status: 'available'
      };

      if (editId) {
        await supabase.from('products').update(productData).eq('id', editId);
        addToast("Cập nhật tin đăng thành công!", "success");
      } else {
        await supabase.from('products').insert(productData);
        addToast("Đăng tin thành công!", "success");
      }
      navigate('/my-items');

    } catch (error) {
      console.error(error);
      addToast("Có lỗi xảy ra khi đăng tin", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isRestricted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center p-8 bg-white rounded-3xl shadow-xl max-w-md">
          <AlertCircle size={48} className="text-red-500 mx-auto mb-4"/>
          <h2 className="text-2xl font-bold text-slate-800">Tài khoản bị hạn chế</h2>
          <p className="text-slate-500 mt-2">Bạn không thể đăng tin mới do vi phạm quy định cộng đồng.</p>
          <button onClick={() => navigate('/')} className="mt-6 px-6 py-2 bg-slate-200 rounded-full font-bold">Về trang chủ</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 font-sans text-slate-800 selection:bg-blue-100">
      <VisualEngine />
      
      <div className="fixed inset-0 z-[-1] overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-blue-50 to-transparent"></div>
        <div className="absolute -top-[20%] -right-[10%] w-[600px] h-[600px] bg-blue-100/50 rounded-full blur-[100px] opacity-60"></div>
        <div className="absolute top-[20%] -left-[10%] w-[400px] h-[400px] bg-purple-100/50 rounded-full blur-[80px] opacity-60"></div>
      </div>

      <div className="max-w-4xl mx-auto px-4 pt-10">
        
        <div className="text-center mb-12 animate-enter">
          <h1 className="text-4xl md:text-5xl font-black mb-3">
            {editId ? 'Chỉnh Sửa Tin' : 'Đăng Tin Mới'}
          </h1>
          <p className="text-slate-500 text-lg">Tiếp cận hàng ngàn sinh viên Bách Khoa chỉ trong vài bước.</p>
        </div>

        <StepIndicator currentStep={currentStep} />

        {currentStep === 1 && (
          <div className="glass-panel p-8 rounded-[2.5rem] animate-enter">
            <h3 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <Camera className="text-blue-500"/> Hình ảnh sản phẩm
            </h3>
            
            <div className="mb-8">
              <label 
                htmlFor="image-upload" 
                className="w-full h-64 border-3 border-dashed border-slate-300 rounded-3xl flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-blue-50/50 transition-all group relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="p-4 bg-white rounded-full shadow-lg mb-4 group-hover:scale-110 transition-transform">
                  <Upload size={32} className="text-blue-600"/>
                </div>
                <p className="text-lg font-bold text-slate-700">Kéo thả hoặc nhấn để tải ảnh lên</p>
                <p className="text-sm text-slate-400 mt-1">Hỗ trợ JPG, PNG (Tối đa 5 ảnh)</p>
                <input 
                  id="image-upload" 
                  type="file" 
                  multiple 
                  accept="image/*" 
                  className="hidden" 
                  onChange={handleImageUpload}
                />
              </label>
            </div>

            {previewUrls.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {previewUrls.map((url, idx) => (
                  <div key={idx} className="relative aspect-square rounded-2xl overflow-hidden group shadow-sm border border-slate-200">
                    <img src={url} alt="Preview" className="w-full h-full object-cover"/>
                    <button 
                      onClick={() => removeImage(idx)}
                      className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                    >
                      <X size={14}/>
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end">
              <button 
                onClick={() => {
                  if (previewUrls.length === 0) return addToast("Vui lòng tải lên ít nhất 1 ảnh", "warning");
                  setCurrentStep(2);
                }}
                className="px-8 py-3 bg-[#00418E] text-white rounded-xl font-bold flex items-center gap-2 hover:bg-[#003370] transition-all shadow-lg shadow-blue-900/20"
              >
                Tiếp tục <ArrowRight size={18}/>
              </button>
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div className="glass-panel p-8 rounded-[2.5rem] animate-enter">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold flex items-center gap-2">
                <FileText className="text-blue-500"/> Thông tin chi tiết
              </h3>
              <div className="w-48">
                <AIAnalyzer onAnalyze={handleAIAnalyze} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="input-group col-span-2">
                <label className="block text-sm font-bold text-slate-500 mb-2 uppercase tracking-wider">Tiêu đề tin đăng</label>
                <input 
                  value={formData.title}
                  onChange={e => setFormData({...formData, title: e.target.value})}
                  placeholder="VD: Giáo trình Giải tích 1 - Thầy A"
                  className="w-full p-4 bg-white border border-slate-200 rounded-xl font-bold text-lg outline-none transition-all"
                />
              </div>

              <div className="input-group">
                <label className="block text-sm font-bold text-slate-500 mb-2 uppercase tracking-wider">Giá bán (VND)</label>
                <div className="relative">
                  <input 
                    type="text"
                    value={formData.price ? parseInt(formData.price).toLocaleString('vi-VN') : ''}
                    onChange={e => {
                      const val = e.target.value.replace(/\D/g, '');
                      setFormData({...formData, price: val});
                    }}
                    placeholder="0"
                    className="w-full p-4 pl-12 bg-white border border-slate-200 rounded-xl font-bold text-lg outline-none transition-all"
                  />
                  <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"/>
                </div>
              </div>

              <div className="input-group">
                <label className="block text-sm font-bold text-slate-500 mb-2 uppercase tracking-wider">Danh mục</label>
                <div className="relative">
                  <select 
                    value={formData.category}
                    onChange={e => setFormData({...formData, category: e.target.value as ProductCategory})}
                    className="w-full p-4 pl-12 bg-white border border-slate-200 rounded-xl font-bold text-slate-700 outline-none appearance-none transition-all"
                  >
                    {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                  <Tag className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"/>
                </div>
              </div>

              <div className="input-group col-span-2">
                <label className="block text-sm font-bold text-slate-500 mb-2 uppercase tracking-wider">Mô tả chi tiết</label>
                <textarea 
                  rows={5}
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  placeholder="Mô tả chi tiết về tình trạng, xuất xứ, lý do bán..."
                  className="w-full p-4 bg-white border border-slate-200 rounded-xl font-medium outline-none transition-all resize-none"
                />
              </div>

              <div className="input-group">
                <label className="block text-sm font-bold text-slate-500 mb-2 uppercase tracking-wider">Tình trạng</label>
                <div className="grid grid-cols-2 gap-2">
                  {CONDITIONS.map(c => (
                    <button 
                      key={c.value}
                      onClick={() => setFormData({...formData, condition: c.value})}
                      className={`p-3 rounded-xl text-xs font-bold border transition-all ${formData.condition === c.value ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'}`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="input-group">
                <label className="block text-sm font-bold text-slate-500 mb-2 uppercase tracking-wider">Phương thức giao dịch</label>
                <div className="flex gap-2">
                  {/* Fixed Usage: Using string literals cast to TradeMethod to avoid Enum errors */}
                  {[
                    { val: 'direct' as TradeMethod, label: 'Trực tiếp', icon: <MapPin size={16}/> },
                    { val: 'shipping' as TradeMethod, label: 'Giao hàng', icon: <Box size={16}/> }
                  ].map(m => (
                    <button 
                      key={m.val}
                      onClick={() => setFormData({...formData, tradeMethod: m.val})}
                      className={`flex-1 p-3 rounded-xl text-sm font-bold border transition-all flex items-center justify-center gap-2 ${formData.tradeMethod === m.val ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'}`}
                    >
                      {m.icon} {m.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-between">
              <button onClick={() => setCurrentStep(1)} className="px-6 py-3 text-slate-500 font-bold hover:text-slate-800 flex items-center gap-2">
                <ArrowLeft size={18}/> Quay lại
              </button>
              <button 
                onClick={() => {
                  if (!formData.title || !formData.price) return addToast("Vui lòng điền thông tin bắt buộc", "warning");
                  setCurrentStep(3);
                }}
                className="px-8 py-3 bg-[#00418E] text-white rounded-xl font-bold flex items-center gap-2 hover:bg-[#003370] transition-all shadow-lg"
              >
                Xem trước <ArrowRight size={18}/>
              </button>
            </div>
          </div>
        )}

        {currentStep === 3 && (
          <div className="glass-panel p-8 rounded-[2.5rem] animate-enter">
            <h3 className="text-2xl font-bold mb-6 flex items-center gap-2 text-center justify-center">
              <CheckCircle2 className="text-green-500"/> Xác nhận tin đăng
            </h3>

            <div className="max-w-sm mx-auto bg-white rounded-3xl overflow-hidden shadow-xl border border-slate-100 mb-8 transform hover:scale-105 transition-transform duration-500">
              <div className="aspect-[4/3] relative">
                <img src={previewUrls[0]} alt="Preview" className="w-full h-full object-cover"/>
                <div className="absolute top-3 left-3 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-xs font-bold text-slate-700 shadow-sm">
                  {formData.condition}
                </div>
              </div>
              <div className="p-5">
                <h4 className="text-lg font-bold text-slate-900 mb-2 line-clamp-2">{formData.title}</h4>
                <div className="flex justify-between items-center border-t border-slate-50 pt-3 mt-2">
                  <span className="text-xl font-black text-[#00418E]">
                    {parseInt(formData.price).toLocaleString()}đ
                  </span>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{formData.tradeMethod}</span>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 p-4 rounded-xl text-center mb-8 border border-blue-100">
              <p className="text-sm text-blue-800">
                <Info size={16} className="inline mr-1 mb-0.5"/>
                Tin đăng của bạn sẽ được hiển thị ngay lập tức trên Market.
              </p>
            </div>

            <div className="flex justify-between">
              <button onClick={() => setCurrentStep(2)} className="px-6 py-3 text-slate-500 font-bold hover:text-slate-800 flex items-center gap-2">
                <ArrowLeft size={18}/> Chỉnh sửa
              </button>
              <button 
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="px-10 py-3 bg-gradient-to-r from-[#00418E] to-[#0065D1] text-white rounded-xl font-bold flex items-center gap-2 hover:shadow-lg hover:shadow-blue-500/30 transition-all active:scale-95 disabled:opacity-70"
              >
                {isSubmitting ? <Loader2 size={20} className="animate-spin"/> : <Sparkles size={20}/>}
                {isSubmitting ? 'Đang đăng...' : 'ĐĂNG NGAY'}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default PostItemPage;
