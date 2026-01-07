import React, { useState, useEffect, useRef, useReducer } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Upload, X, Image as ImageIcon, DollarSign, Tag, FileText,
  ArrowRight, ArrowLeft, CheckCircle2, Sparkles, Loader2,
  Info, Camera, MapPin, Smartphone, Monitor, Eye,
  Trash2, Edit3, RotateCcw, Box, Truck
} from "lucide-react";
import { supabase } from "../services/supabase";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";

// --- CONFIGURATION ---
enum ProductCategory {
  TEXTBOOK = "textbook",
  ELECTRONICS = "electronics",
  SUPPLIES = "supplies",
  CLOTHING = "clothing",
  OTHER = "other",
}

enum ProductCondition {
  NEW = "new",
  LIKE_NEW = "like_new",
  GOOD = "good",
  FAIR = "fair",
}

enum TradeMethod {
  DIRECT = "direct",
  SHIPPING = "shipping",
}

const CATEGORIES = [
  { value: ProductCategory.TEXTBOOK, label: "Giáo trình & Tài liệu" },
  { value: ProductCategory.ELECTRONICS, label: "Thiết bị điện tử" },
  { value: ProductCategory.SUPPLIES, label: "Dụng cụ học tập" },
  { value: ProductCategory.CLOTHING, label: "Thời trang sinh viên" },
  { value: ProductCategory.OTHER, label: "Khác" },
];

const CONDITIONS = [
  { value: ProductCondition.NEW, label: "Mới 100%", color: "bg-green-100 text-green-700" },
  { value: ProductCondition.LIKE_NEW, label: "Như mới (99%)", color: "bg-blue-100 text-blue-700" },
  { value: ProductCondition.GOOD, label: "Tốt (90%)", color: "bg-indigo-100 text-indigo-700" },
  { value: ProductCondition.FAIR, label: "Chấp nhận được", color: "bg-orange-100 text-orange-700" },
];

// --- STYLES ---
const VisualEngine = () => (
  <style>{`
    :root { --primary: #00418E; --secondary: #00B0F0; }
    body { background-color: #F8FAFC; overflow-x: hidden; }
    ::-webkit-scrollbar { width: 6px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: #CBD5E1; border-radius: 10px; }
    
    .glass-panel { background: rgba(255, 255, 255, 0.9); backdrop-filter: blur(20px); border: 1px solid rgba(255, 255, 255, 0.6); box-shadow: 0 10px 30px -5px rgba(0,0,0,0.05); transition: all 0.3s ease; }
    .input-modern { width: 100%; padding: 14px; border-radius: 12px; border: 1px solid #E2E8F0; background: #F8FAFC; color: #1E293B; font-weight: 500; transition: all 0.2s; outline: none; }
    .input-modern:focus { background: white; border-color: var(--primary); box-shadow: 0 0 0 4px rgba(0, 65, 142, 0.1); }
    
    /* Device Mockup */
    .mockup-mobile { width: 375px; margin: 0 auto; border: 8px solid #1e293b; border-radius: 30px; overflow: hidden; background: white; box-shadow: 0 20px 40px rgba(0,0,0,0.2); }
    .mockup-desktop { width: 100%; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background: white; box-shadow: 0 10px 30px rgba(0,0,0,0.05); }
    
    @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
    .animate-enter { animation: slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
  `}</style>
);

// --- HELPER COMPONENTS ---
const StepIndicator = ({ current, steps }: { current: number; steps: string[] }) => (
  <div className="mb-10">
    <div className="flex justify-between relative">
      <div className="absolute top-1/2 left-0 w-full h-1 bg-slate-200 -z-10 rounded-full"></div>
      <div className="absolute top-1/2 left-0 h-1 bg-blue-600 -z-10 rounded-full transition-all duration-500" 
           style={{ width: `${(current - 1) / (steps.length - 1) * 100}%` }}></div>
      {steps.map((label, idx) => {
        const stepNum = idx + 1;
        const isActive = stepNum === current;
        const isCompleted = stepNum < current;
        return (
          <div key={idx} className="flex flex-col items-center gap-2 bg-white px-2">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm border-2 transition-all ${
              isActive ? "border-blue-600 bg-blue-600 text-white scale-110 shadow-lg shadow-blue-500/30" : 
              isCompleted ? "border-green-500 bg-green-500 text-white" : "border-slate-300 text-slate-400 bg-white"
            }`}>
              {isCompleted ? <CheckCircle2 size={20} /> : stepNum}
            </div>
            <span className={`text-xs font-bold uppercase tracking-wider ${isActive ? "text-blue-700" : "text-slate-400"}`}>{label}</span>
          </div>
        );
      })}
    </div>
  </div>
);

// --- MAIN FORM LOGIC ---
const PostItemPage: React.FC = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get("edit");

  // State
  const [step, setStep] = useState(1);
  const [files, setFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewMode, setPreviewMode] = useState<'mobile' | 'desktop'>('desktop');

  // Form State
  const [form, setForm] = useState({
    title: "",
    description: "",
    price: "",
    category: ProductCategory.TEXTBOOK,
    condition: ProductCondition.GOOD,
    tradeMethod: TradeMethod.DIRECT,
    location: "Sảnh H6 - Cơ sở Lý Thường Kiệt",
  });

  // Load Edit Data
  useEffect(() => {
    if (editId) {
      const load = async () => {
        const { data } = await supabase.from('products').select('*').eq('id', editId).single();
        if (data) {
          setForm({
            title: data.title,
            description: data.description,
            price: data.price.toString(),
            category: data.category,
            condition: data.condition,
            tradeMethod: data.trade_method,
            location: data.location_name || ""
          });
          setPreviewUrls(data.images || []);
        }
      };
      load();
    }
  }, [editId]);

  // Handlers
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      if (previewUrls.length + newFiles.length > 5) return addToast("Tối đa 5 ảnh", "error");
      
      setFiles([...files, ...newFiles]);
      const newUrls = newFiles.map(f => URL.createObjectURL(f));
      setPreviewUrls([...previewUrls, ...newUrls]);
    }
  };

  const removeImage = (idx: number) => {
    setPreviewUrls(prev => prev.filter((_, i) => i !== idx));
    setFiles(prev => prev.filter((_, i) => i !== idx));
  };

  const runAIAnalysis = () => {
    if (previewUrls.length === 0) return addToast("Chọn ảnh trước nhé!", "warning");
    setAiAnalyzing(true);
    // Giả lập AI
    setTimeout(() => {
      setForm(prev => ({
        ...prev,
        title: "Giáo trình Giải Tích 1 - ĐHQG TP.HCM",
        price: "45000",
        category: ProductCategory.TEXTBOOK,
        condition: ProductCondition.LIKE_NEW,
        description: "Sách còn mới 99%, không ghi chú, bao bìa cẩn thận. Pass lại cho bạn nào cần."
      }));
      setAiAnalyzing(false);
      addToast("AI đã điền thông tin!", "success");
    }, 2000);
  };

  const handleNext = () => {
    if (step === 1 && previewUrls.length === 0) return addToast("Vui lòng chọn ít nhất 1 ảnh", "error");
    if (step === 2 && (!form.title || !form.price)) return addToast("Vui lòng điền tên và giá", "error");
    setStep(s => s + 1);
  };

  const handleSubmit = async () => {
    if (!user) return;
    setIsSubmitting(true);
    try {
      // 1. Upload ảnh (Logic upload thật)
      let finalUrls = previewUrls.filter(u => u.startsWith("http"));
      const toUpload = files;

      if (toUpload.length > 0) {
        for (const file of toUpload) {
          const path = `${user.id}/${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          const { error } = await supabase.storage.from('product-images').upload(path, file);
          if (!error) {
            const { data } = supabase.storage.from('product-images').getPublicUrl(path);
            finalUrls.push(data.publicUrl);
          }
        }
      }

      // 2. Insert DB
      const payload = {
        title: form.title,
        description: form.description,
        price: parseInt(form.price.replace(/\D/g, '')),
        category: form.category,
        condition: form.condition,
        trade_method: form.tradeMethod,
        location_name: form.location,
        images: finalUrls,
        seller_id: user.id,
        status: 'available',
        view_count: 0
      };

      const { error } = editId 
        ? await supabase.from('products').update(payload).eq('id', editId)
        : await supabase.from('products').insert(payload);

      if (error) throw error;

      addToast("Đăng tin thành công!", "success");
      navigate('/market');
    } catch (error: any) {
      console.error(error);
      addToast("Lỗi: " + error.message, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- RENDER STEPS ---
  
  // STEP 1: IMAGES
  const StepImages = () => (
    <div className="glass-panel p-8 rounded-3xl animate-enter">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold flex items-center gap-2"><ImageIcon className="text-blue-600"/> Chọn hình ảnh</h2>
        <button onClick={runAIAnalysis} disabled={aiAnalyzing} className="flex items-center gap-2 bg-gradient-to-r from-purple-500 to-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg hover:shadow-purple-500/30 transition-all disabled:opacity-50">
          {aiAnalyzing ? <Loader2 className="animate-spin" size={16}/> : <Sparkles size={16}/>}
          {aiAnalyzing ? "Đang phân tích..." : "Phân tích bằng AI"}
        </button>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        {previewUrls.map((url, idx) => (
          <div key={idx} className="relative aspect-square rounded-2xl overflow-hidden group border border-slate-200">
            <img src={url} className="w-full h-full object-cover" />
            <button onClick={() => removeImage(idx)} className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-all hover:bg-red-600 shadow-sm"><Trash2 size={14}/></button>
            {idx === 0 && <span className="absolute bottom-2 left-2 bg-black/60 text-white text-[10px] font-bold px-2 py-1 rounded">Ảnh bìa</span>}
          </div>
        ))}
        {previewUrls.length < 5 && (
          <label className="flex flex-col items-center justify-center aspect-square rounded-2xl border-2 border-dashed border-slate-300 hover:border-blue-500 hover:bg-blue-50 transition-all cursor-pointer">
            <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center mb-2"><Camera className="text-blue-500" /></div>
            <span className="text-xs font-bold text-slate-500">Thêm ảnh</span>
            <input type="file" hidden multiple accept="image/*" onChange={handleImageUpload} />
          </label>
        )}
      </div>
      <p className="text-center text-xs text-slate-400">Mẹo: Ảnh đầu tiên sẽ là ảnh bìa. Tối đa 5 ảnh.</p>
    </div>
  );

  // STEP 2: INFO
  const StepInfo = () => (
    <div className="glass-panel p-8 rounded-3xl animate-enter space-y-6">
      <h2 className="text-2xl font-bold flex items-center gap-2"><FileText className="text-blue-600"/> Thông tin chi tiết</h2>
      
      <div>
        <label className="block text-sm font-bold text-slate-700 mb-2">Tên sản phẩm</label>
        <input 
          value={form.title} 
          onChange={e => setForm({...form, title: e.target.value})}
          className="input-modern text-lg" 
          placeholder="VD: Giáo trình Giải Tích 1..." 
        />
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">Giá bán (VNĐ)</label>
          <div className="relative">
            <DollarSign size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              value={form.price}
              onChange={e => setForm({...form, price: e.target.value})}
              className="input-modern pl-9 font-mono text-green-600 font-bold"
              placeholder="0 = Miễn phí"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">Danh mục</label>
          <select 
            value={form.category}
            onChange={e => setForm({...form, category: e.target.value as ProductCategory})}
            className="input-modern"
          >
            {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-bold text-slate-700 mb-2">Tình trạng</label>
        <div className="flex gap-3">
          {CONDITIONS.map(c => (
            <button 
              key={c.value}
              onClick={() => setForm({...form, condition: c.value})}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition-all ${
                form.condition === c.value 
                  ? `border-blue-600 bg-blue-50 text-blue-700 shadow-sm ring-1 ring-blue-200` 
                  : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-bold text-slate-700 mb-2">Mô tả thêm</label>
        <textarea 
          value={form.description}
          onChange={e => setForm({...form, description: e.target.value})}
          rows={4}
          className="input-modern resize-none"
          placeholder="Mô tả kỹ hơn về tình trạng, thời gian mua..."
        />
      </div>
    </div>
  );

  // STEP 3: LOCATION
  const StepLocation = () => (
    <div className="glass-panel p-8 rounded-3xl animate-enter space-y-6">
      <h2 className="text-2xl font-bold flex items-center gap-2"><MapPin className="text-blue-600"/> Giao dịch</h2>
      
      <div>
        <label className="block text-sm font-bold text-slate-700 mb-4">Phương thức giao dịch</label>
        <div className="grid grid-cols-2 gap-4">
          <label className={`cursor-pointer p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${form.tradeMethod === TradeMethod.DIRECT ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-200 hover:border-blue-200"}`}>
            <input type="radio" className="hidden" checked={form.tradeMethod === TradeMethod.DIRECT} onChange={() => setForm({...form, tradeMethod: TradeMethod.DIRECT})} />
            <Box size={24}/>
            <span className="font-bold">Gặp trực tiếp</span>
          </label>
          <label className={`cursor-pointer p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${form.tradeMethod === TradeMethod.SHIPPING ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-200 hover:border-blue-200"}`}>
            <input type="radio" className="hidden" checked={form.tradeMethod === TradeMethod.SHIPPING} onChange={() => setForm({...form, tradeMethod: TradeMethod.SHIPPING})} />
            <Truck size={24}/>
            <span className="font-bold">Gửi Locker / Ship</span>
          </label>
        </div>
      </div>

      <div>
        <label className="block text-sm font-bold text-slate-700 mb-2">Địa điểm giao dịch</label>
        <div className="relative">
          <MapPin size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            value={form.location}
            onChange={e => setForm({...form, location: e.target.value})}
            className="input-modern pl-10"
            placeholder="VD: Sảnh H6, Canteen B4..."
          />
        </div>
        <div className="mt-3 flex gap-2 overflow-x-auto pb-2">
          {["Sảnh H6", "Thư viện", "Canteen B4", "Nhà xe"].map(loc => (
            <button key={loc} onClick={() => setForm({...form, location: loc})} className="whitespace-nowrap px-3 py-1 bg-slate-100 rounded-full text-xs font-bold text-slate-600 hover:bg-blue-100 hover:text-blue-700 transition-colors">
              {loc}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  // STEP 4: PREVIEW (MOBILE/DESKTOP TOGGLE)
  const StepPreview = () => {
    // Mock Data for Preview
    const mockProduct = {
      ...form,
      price: parseInt(form.price.replace(/\D/g, '') || '0'),
      images: previewUrls,
      sellerName: user?.user_metadata?.name || "Bạn (Người bán)",
      created_at: new Date().toISOString()
    };

    return (
      <div className="animate-enter">
        <div className="flex justify-center mb-6">
          <div className="bg-white p-1 rounded-xl shadow-sm border border-slate-200 inline-flex">
            <button 
              onClick={() => setPreviewMode('mobile')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${previewMode === 'mobile' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              <Smartphone size={16} /> Mobile
            </button>
            <button 
              onClick={() => setPreviewMode('desktop')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${previewMode === 'desktop' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              <Monitor size={16} /> Desktop
            </button>
          </div>
        </div>

        <div className={previewMode === 'mobile' ? "mockup-mobile" : "mockup-desktop"}>
          {/* MOCKUP CONTENT */}
          <div className="bg-white min-h-[500px]">
            {/* Header Mockup */}
            <div className="h-14 border-b flex items-center px-4 justify-between bg-white sticky top-0 z-10">
              <ArrowLeft size={20} className="text-slate-600"/>
              <span className="font-bold text-sm">Chi tiết sản phẩm</span>
              <div className="w-5"></div>
            </div>
            
            <div className={`p-4 ${previewMode === 'desktop' ? 'grid grid-cols-2 gap-8' : ''}`}>
              {/* Images */}
              <div>
                <div className="aspect-4/3 bg-slate-100 rounded-xl overflow-hidden mb-4 border border-slate-100">
                  <img src={mockProduct.images[0] || 'https://via.placeholder.com/400'} className="w-full h-full object-cover" />
                </div>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {mockProduct.images.map((url, i) => (
                    <img key={i} src={url} className="w-16 h-16 rounded-lg object-cover border border-slate-200" />
                  ))}
                </div>
              </div>

              {/* Info */}
              <div className="space-y-4">
                <div>
                  <span className="text-[10px] font-bold uppercase text-blue-600 bg-blue-50 px-2 py-1 rounded">{CATEGORIES.find(c => c.value === form.category)?.label}</span>
                  <h1 className="text-xl font-black text-slate-900 mt-2 leading-tight">{form.title || "Tên sản phẩm..."}</h1>
                  <p className="text-2xl font-black text-blue-600 mt-2">{parseInt(form.price).toLocaleString()}đ</p>
                </div>

                <div className="flex items-center gap-3 py-3 border-y border-slate-100">
                  <div className="w-10 h-10 rounded-full bg-slate-200"></div>
                  <div>
                    <p className="text-sm font-bold">{mockProduct.sellerName}</p>
                    <p className="text-xs text-slate-500">Người bán uy tín</p>
                  </div>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-slate-500">Tình trạng</span> <span className="font-bold">{CONDITIONS.find(c => c.value === form.condition)?.label}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Giao dịch</span> <span className="font-bold">{form.tradeMethod === 'direct' ? "Trực tiếp" : "Ship"}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Tại</span> <span className="font-bold">{form.location}</span></div>
                </div>

                <div>
                  <h3 className="font-bold text-sm mb-2">Mô tả</h3>
                  <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{form.description || "Chưa có mô tả..."}</p>
                </div>
              </div>
            </div>
            
            {/* Bottom Bar Mockup */}
            <div className="p-4 border-t bg-white sticky bottom-0 flex gap-3">
              <button className="flex-1 bg-blue-600 text-white font-bold py-3 rounded-xl shadow-lg">Nhắn tin</button>
              <button className="flex-1 bg-green-600 text-white font-bold py-3 rounded-xl shadow-lg">Mua ngay</button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen pt-24 pb-20 font-sans">
      <VisualEngine />
      <div className="fixed inset-0 pointer-events-none -z-10 bg-gradient-to-b from-blue-50/50 to-white"></div>

      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black text-slate-900">{editId ? "Chỉnh Sửa Tin" : "Đăng Tin Mới"}</h1>
            <p className="text-slate-500 text-sm">Điền thông tin chi tiết để bán nhanh hơn.</p>
          </div>
          <button onClick={() => navigate('/market')} className="text-slate-400 hover:text-slate-600"><X size={24}/></button>
        </div>

        {/* Steps */}
        <StepIndicator current={step} steps={["Hình ảnh", "Thông tin", "Giao dịch", "Xem lại"]} />

        {/* Content */}
        <div className="mb-8">
          {step === 1 && <StepImages />}
          {step === 2 && <StepInfo />}
          {step === 3 && <StepLocation />}
          {step === 4 && <StepPreview />}
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between items-center pt-6 border-t border-slate-200">
          {step > 1 ? (
            <button onClick={() => setStep(s => s - 1)} className="px-6 py-3 rounded-xl font-bold text-slate-600 hover:bg-slate-100 transition-colors flex items-center gap-2">
              <ArrowLeft size={18} /> Quay lại
            </button>
          ) : (
            <div></div> // Spacer
          )}

          {step < 4 ? (
            <button onClick={handleNext} className="px-8 py-3 rounded-xl font-bold text-white bg-[#00418E] hover:bg-[#003370] shadow-lg transition-all flex items-center gap-2">
              Tiếp tục <ArrowRight size={18} />
            </button>
          ) : (
            <button 
              onClick={handleSubmit} 
              disabled={isSubmitting}
              className="px-8 py-3 rounded-xl font-bold text-white bg-green-600 hover:bg-green-700 shadow-lg shadow-green-500/30 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 className="animate-spin" /> : <CheckCircle2 />}
              {isSubmitting ? "Đang đăng..." : "Xác nhận đăng tin"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default PostItemPage;
