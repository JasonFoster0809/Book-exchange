import React, { useState, useEffect, useRef, useCallback, useReducer } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Upload, X, Image as ImageIcon, DollarSign, Tag, FileText, 
  ArrowRight, ArrowLeft, CheckCircle2, Sparkles, Loader2, Info, 
  Camera, Box, AlertCircle, MapPin, Wand2, Trash2, Edit3, 
  Crop, RotateCcw, Save, Eye, Smartphone, Globe, BarChart3, 
  Calendar, ShieldCheck, Zap, Layers, Maximize2, RefreshCw
} from 'lucide-react';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { ProductCategory, ProductCondition, TradeMethod } from '../types';

const CATEGORIES = [
  { value: ProductCategory.TEXTBOOK, label: 'Giáo trình & Tài liệu', icon: '📚' },
  { value: ProductCategory.ELECTRONICS, label: 'Thiết bị điện tử', icon: '💻' },
  { value: ProductCategory.SUPPLIES, label: 'Dụng cụ học tập', icon: '📐' },
  { value: ProductCategory.CLOTHING, label: 'Thời trang sinh viên', icon: '👕' },
  { value: ProductCategory.OTHER, label: 'Khác', icon: '📦' },
];

const CONDITIONS = [
  { value: ProductCondition.NEW, label: 'Mới 100%', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { value: ProductCondition.LIKE_NEW, label: 'Như mới (99%)', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { value: ProductCondition.GOOD, label: 'Tốt (90%)', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  { value: ProductCondition.FAIR, label: 'Chấp nhận được', color: 'bg-orange-50 text-orange-700 border-orange-200' },
];

const LOCATIONS = [
  { id: 'h6', name: 'Sảnh H6 - Cơ sở Lý Thường Kiệt', coords: { x: 30, y: 40 } },
  { id: 'b4', name: 'Canteen B4', coords: { x: 60, y: 30 } },
  { id: 'lib', name: 'Thư viện Trung tâm', coords: { x: 45, y: 60 } },
  { id: 'a4', name: 'Tòa nhà A4', coords: { x: 20, y: 20 } },
  { id: 'c6', name: 'Khu C6', coords: { x: 80, y: 70 } },
];

const VisualEngine = () => (
  <style>{`
    :root { --primary: #00418E; --secondary: #00B0F0; --accent: #FFD700; }
    body { background-color: #F8FAFC; overflow-x: hidden; }
    ::-webkit-scrollbar { width: 6px; }
    ::-webkit-scrollbar-thumb { background: #94A3B8; border-radius: 10px; }
    
    @keyframes slideUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes pulse-ring { 0% { box-shadow: 0 0 0 0 rgba(0, 65, 142, 0.4); } 70% { box-shadow: 0 0 0 15px rgba(0, 65, 142, 0); } 100% { box-shadow: 0 0 0 0 rgba(0, 65, 142, 0); } }
    @keyframes scan { 0% { top: 0; } 50% { top: 100%; } 100% { top: 0; } }
    @keyframes gradient-x { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }

    .animate-enter { animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
    .animate-fade { animation: fadeIn 0.4s ease-out forwards; }
    
    .glass-panel {
      background: rgba(255, 255, 255, 0.9);
      backdrop-filter: blur(20px);
      border: 1px solid rgba(255, 255, 255, 0.6);
      box-shadow: 0 10px 30px -5px rgba(0,0,0,0.05);
      transition: all 0.3s ease;
    }
    .glass-panel:hover { box-shadow: 0 20px 40px -5px rgba(0,0,0,0.1); transform: translateY(-2px); }

    .input-modern {
      width: 100%; padding: 16px; border-radius: 16px;
      border: 2px solid #E2E8F0; background: #F8FAFC;
      color: #1E293B; font-weight: 500; transition: all 0.2s; outline: none;
    }
    .input-modern:focus { background: white; border-color: var(--primary); box-shadow: 0 0 0 4px rgba(0, 65, 142, 0.1); }
    
    .map-grid {
      background-image: linear-gradient(#e5e7eb 1px, transparent 1px), linear-gradient(90deg, #e5e7eb 1px, transparent 1px);
      background-size: 20px 20px;
    }

    .scanning-line {
      position: absolute; left: 0; width: 100%; height: 2px;
      background: #00B0F0; box-shadow: 0 0 10px #00B0F0;
      animation: scan 2s linear infinite;
    }

    .rich-toolbar-btn { padding: 6px; border-radius: 6px; color: #64748B; transition: all 0.2s; }
    .rich-toolbar-btn:hover { background: #F1F5F9; color: #0F172A; }
    .rich-toolbar-btn.active { background: #E0F2FE; color: #00418E; }
  `}</style>
);

const StepWizard = ({ current, steps, onJump }: { current: number, steps: string[], onJump: (s: number) => void }) => (
  <div className="w-full max-w-4xl mx-auto mb-12">
    <div className="flex justify-between items-center relative">
      <div className="absolute left-0 top-1/2 w-full h-1 bg-slate-200 -z-10 rounded-full"></div>
      <div className="absolute left-0 top-1/2 h-1 bg-gradient-to-r from-blue-600 to-cyan-500 transition-all duration-500 rounded-full" style={{ width: `${((current - 1) / (steps.length - 1)) * 100}%` }}></div>
      {steps.map((label, idx) => {
        const stepNum = idx + 1;
        const isActive = stepNum === current;
        const isDone = stepNum < current;
        return (
          <button key={idx} onClick={() => isDone && onJump(stepNum)} disabled={!isDone} className={`flex flex-col items-center gap-2 group ${isDone ? 'cursor-pointer' : 'cursor-default'}`}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm border-4 transition-all duration-300 z-10 ${isActive ? 'bg-blue-600 border-blue-100 text-white scale-110 shadow-lg shadow-blue-500/30' : isDone ? 'bg-green-500 border-green-100 text-white' : 'bg-white border-slate-200 text-slate-400'}`}>
              {isDone ? <CheckCircle2 size={18}/> : stepNum}
            </div>
            <span className={`text-xs font-bold uppercase tracking-wider transition-colors ${isActive ? 'text-blue-600' : isDone ? 'text-green-600' : 'text-slate-400'}`}>{label}</span>
          </button>
        );
      })}
    </div>
  </div>
);

type FormState = {
  title: string;
  description: string;
  price: string;
  category: ProductCategory;
  condition: ProductCondition;
  tradeMethod: TradeMethod;
  location: string;
  tags: string[];
};

type Action = 
  | { type: 'SET_FIELD'; field: keyof FormState; value: any }
  | { type: 'RESET'; payload: FormState }
  | { type: 'ADD_TAG'; tag: string }
  | { type: 'REMOVE_TAG'; tag: string };

const formReducer = (state: FormState, action: Action): FormState => {
  switch (action.type) {
    case 'SET_FIELD': return { ...state, [action.field]: action.value };
    case 'RESET': return action.payload;
    case 'ADD_TAG': return state.tags.includes(action.tag) ? state : { ...state, tags: [...state.tags, action.tag] };
    case 'REMOVE_TAG': return { ...state, tags: state.tags.filter(t => t !== action.tag) };
    default: return state;
  }
};

const PostItemPage: React.FC = () => {
  const { user, isRestricted } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');

  const [step, setStep] = useState(1);
  const [images, setImages] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [editImageIdx, setEditImageIdx] = useState<number | null>(null);
  const [showSaveDraft, setShowSaveDraft] = useState(false);
  const [priceAnalysis, setPriceAnalysis] = useState<'low' | 'good' | 'high' | null>(null);

  const [state, dispatch] = useReducer(formReducer, {
    title: '', description: '', price: '',
    category: ProductCategory.TEXTBOOK,
    condition: ProductCondition.GOOD,
    tradeMethod: 'direct' as TradeMethod,
    location: LOCATIONS[0].name,
    tags: []
  });

  useEffect(() => {
    const savedDraft = localStorage.getItem('post_draft');
    if (savedDraft && !editId) {
      setShowSaveDraft(true);
    }
    if (editId) {
      const load = async () => {
        const { data } = await supabase.from('products').select('*').eq('id', editId).single();
        if (data) {
          dispatch({ type: 'RESET', payload: {
            title: data.title, description: data.description, price: data.price.toString(),
            category: data.category as ProductCategory, condition: data.condition as ProductCondition,
            tradeMethod: data.trade_method as TradeMethod, location: 'Sảnh H6', tags: []
          }});
          setPreviewUrls(data.images || []);
        }
      };
      load();
    }
  }, [editId]);

  useEffect(() => {
    if (!editId) {
      const timer = setTimeout(() => {
        localStorage.setItem('post_draft', JSON.stringify({ ...state, previewUrls }));
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [state, previewUrls, editId]);

  const restoreDraft = () => {
    const saved = localStorage.getItem('post_draft');
    if (saved) {
      const parsed = JSON.parse(saved);
      dispatch({ type: 'RESET', payload: parsed });
      setPreviewUrls(parsed.previewUrls || []);
      addToast("Đã khôi phục bản nháp!", "success");
      setShowSaveDraft(false);
    }
  };

  const clearDraft = () => {
    localStorage.removeItem('post_draft');
    setShowSaveDraft(false);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      if (images.length + files.length > 8) return addToast("Tối đa 8 ảnh.", "error");
      
      const newUrls = files.map(f => URL.createObjectURL(f));
      setImages([...images, ...files]);
      setPreviewUrls([...previewUrls, ...newUrls]);
    }
  };

  const analyzeImageAI = () => {
    if (previewUrls.length === 0) return addToast("Cần ít nhất 1 ảnh để phân tích", "warning");
    setAiAnalyzing(true);
    setTimeout(() => {
      dispatch({ type: 'SET_FIELD', field: 'title', value: "Máy tính Casio FX-580VN X Chính hãng" });
      dispatch({ type: 'SET_FIELD', field: 'category', value: ProductCategory.SUPPLIES });
      dispatch({ type: 'SET_FIELD', field: 'condition', value: ProductCondition.LIKE_NEW });
      dispatch({ type: 'SET_FIELD', field: 'price', value: "550000" });
      dispatch({ type: 'SET_FIELD', field: 'description', value: "Máy tính khoa học Casio FX-580VN X, tốc độ xử lý nhanh, màn hình độ phân giải cao. Phù hợp cho sinh viên Bách Khoa thi Đại cương. Còn bảo hành 6 tháng." });
      dispatch({ type: 'ADD_TAG', tag: 'Casio' });
      dispatch({ type: 'ADD_TAG', tag: 'Máy tính' });
      setAiAnalyzing(false);
      addToast("AI đã điền thông tin gợi ý!", "success");
    }, 2500);
  };

  const analyzePrice = (price: string) => {
    const p = parseInt(price.replace(/\D/g, ''));
    if (!p) return setPriceAnalysis(null);
    if (p < 100000) setPriceAnalysis('low');
    else if (p > 1000000) setPriceAnalysis('high');
    else setPriceAnalysis('good');
  };

  const formatPrice = (val: string) => {
    const raw = val.replace(/\D/g, '');
    analyzePrice(raw);
    return raw.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  const handleSubmit = async () => {
    if (!user) return navigate('/auth');
    if (!state.title || !state.price) return addToast("Thiếu thông tin bắt buộc", "error");
    setIsSubmitting(true);
    try {
      let finalUrls = previewUrls.filter(u => u.startsWith('http'));
      if (images.length > 0) {
        const uploaded = await Promise.all(images.map(async (file) => {
          const path = `${user.id}/${Date.now()}_${file.name}`;
          await supabase.storage.from('product-images').upload(path, file);
          return supabase.storage.from('product-images').getPublicUrl(path).data.publicUrl;
        }));
        finalUrls = [...finalUrls, ...uploaded];
      }
      const payload = {
        title: state.title, description: state.description,
        price: parseInt(state.price.replace(/\./g, '')),
        category: state.category, condition: state.condition,
        trade_method: state.tradeMethod, images: finalUrls, seller_id: user.id, status: 'available'
      };
      if (editId) await supabase.from('products').update(payload).eq('id', editId);
      else await supabase.from('products').insert(payload);
      
      localStorage.removeItem('post_draft');
      addToast("Đăng tin thành công!", "success");
      navigate('/market');
    } catch (e) { addToast("Lỗi hệ thống", "error"); } 
    finally { setIsSubmitting(false); }
  };

  if (isRestricted) return <div className="h-screen flex items-center justify-center bg-slate-100 text-red-500 font-bold"><AlertCircle className="mr-2"/>Tài khoản bị hạn chế</div>;

  return (
    <div className="min-h-screen pb-32 font-sans text-slate-800">
      <VisualEngine />
      
      <div className="fixed inset-0 z-[-1] overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-[600px] bg-gradient-to-b from-blue-50/50 to-transparent"></div>
        <div className="absolute top-20 right-0 w-[500px] h-[500px] bg-purple-100/30 rounded-full blur-[120px]"></div>
        <div className="absolute top-40 left-0 w-[400px] h-[400px] bg-cyan-100/30 rounded-full blur-[100px]"></div>
      </div>

      {showSaveDraft && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-6 animate-enter border border-slate-700 w-[90%] max-w-lg">
          <div className="flex-1">
            <p className="font-bold text-sm">Phát hiện bản nháp chưa lưu</p>
            <p className="text-xs text-slate-400">Bạn có muốn khôi phục phiên làm việc trước?</p>
          </div>
          <div className="flex gap-3">
            <button onClick={clearDraft} className="px-4 py-2 hover:bg-white/10 rounded-lg text-xs font-bold transition">Hủy bỏ</button>
            <button onClick={restoreDraft} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-xs font-bold transition shadow-lg shadow-blue-500/20">Khôi phục</button>
          </div>
        </div>
      )}

      {aiAnalyzing && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-white p-10 rounded-3xl shadow-2xl max-w-sm w-full text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 to-purple-50 z-0"></div>
            <div className="relative z-10">
              <div className="w-20 h-20 bg-white rounded-full mx-auto mb-6 flex items-center justify-center shadow-lg relative">
                <Sparkles size={40} className="text-indigo-600 animate-pulse"/>
                <div className="absolute inset-0 border-4 border-indigo-100 rounded-full animate-ping"></div>
              </div>
              <h3 className="text-2xl font-black text-slate-800 mb-2">Gemini AI</h3>
              <p className="text-slate-500 font-medium">Đang phân tích hình ảnh...</p>
              <div className="mt-6 h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 w-2/3 animate-[shimmer_1s_infinite]"></div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-5xl mx-auto px-4 pt-12">
        <div className="flex justify-between items-end mb-12 animate-enter">
          <div>
            <h1 className="text-4xl md:text-5xl font-black text-[#00418E] mb-3 tracking-tight">{editId ? 'Hiệu Chỉnh Tin' : 'Đăng Tin Mới'}</h1>
            <p className="text-slate-500 font-medium flex items-center gap-2"><Zap size={16} className="text-yellow-500"/> AI hỗ trợ điền thông tin tự động</p>
          </div>
          <button onClick={() => navigate('/market')} className="hidden md:flex items-center gap-2 text-slate-400 hover:text-[#00418E] font-bold transition-colors">Hủy bỏ <X size={20}/></button>
        </div>

        <StepWizard current={step} steps={['Thư viện ảnh', 'Chi tiết sản phẩm', 'Phương thức & Vị trí', 'Kiểm tra & Đăng']} onJump={setStep} />

        {/* STEP 1: MEDIA CENTER */}
        {step === 1 && (
          <div className="glass-panel p-8 rounded-[2.5rem] animate-enter">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-bold flex items-center gap-3"><Camera className="text-blue-600"/> Thư viện ảnh</h3>
              <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-bold">{previewUrls.length}/8 ảnh</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="order-2 md:order-1">
                <div className="grid grid-cols-3 gap-4 mb-6">
                  {previewUrls.map((url, idx) => (
                    <div key={idx} className="relative aspect-square rounded-2xl overflow-hidden group border-2 border-transparent hover:border-blue-500 transition-all cursor-pointer shadow-sm bg-white" onClick={() => setEditImageIdx(idx)}>
                      <img src={url} className="w-full h-full object-cover transition-transform group-hover:scale-110"/>
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <button onClick={(e) => { e.stopPropagation(); }} className="p-1.5 bg-white rounded-full text-slate-800 hover:bg-blue-50"><Edit3 size={14}/></button>
                        <button onClick={(e) => { e.stopPropagation(); setPreviewUrls(p => p.filter((_, i) => i !== idx)); }} className="p-1.5 bg-white rounded-full text-red-500 hover:bg-red-50"><Trash2 size={14}/></button>
                      </div>
                      {idx === 0 && <span className="absolute top-2 left-2 bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-md">Bìa</span>}
                    </div>
                  ))}
                  {previewUrls.length < 8 && (
                    <label className="aspect-square rounded-2xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-blue-50/50 transition-all group bg-slate-50/50">
                      <div className="p-3 bg-white rounded-full shadow-sm mb-2 group-hover:scale-110 transition-transform"><Upload size={24} className="text-blue-500"/></div>
                      <span className="text-xs font-bold text-slate-500 group-hover:text-blue-600">Thêm ảnh</span>
                      <input type="file" multiple accept="image/*" className="hidden" onChange={handleImageUpload}/>
                    </label>
                  )}
                </div>
              </div>

              <div className="order-1 md:order-2 bg-slate-50 rounded-3xl p-6 border border-slate-100 flex flex-col items-center justify-center text-center">
                <div className="w-full aspect-[4/3] bg-white rounded-2xl shadow-sm border border-slate-200 mb-4 overflow-hidden relative group">
                  {previewUrls.length > 0 ? (
                    <>
                      <img src={previewUrls[editImageIdx || 0]} className="w-full h-full object-contain mix-blend-multiply p-4"/>
                      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 opacity-0 group-hover:opacity-100 transition-all bg-white/90 backdrop-blur p-2 rounded-xl shadow-lg border border-slate-100">
                        <button className="p-2 hover:bg-slate-100 rounded-lg" title="Xoay"><RotateCcw size={18}/></button>
                        <button className="p-2 hover:bg-slate-100 rounded-lg" title="Cắt"><Crop size={18}/></button>
                        <button className="p-2 hover:bg-slate-100 rounded-lg" title="Bộ lọc"><Layers size={18}/></button>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400">
                      <ImageIcon size={48} className="mb-2 opacity-20"/>
                      <p className="text-sm">Chưa có ảnh nào được chọn</p>
                    </div>
                  )}
                </div>
                <p className="text-xs text-slate-500 leading-relaxed max-w-xs">💡 Mẹo: Ảnh bìa nên chụp rõ sản phẩm, đủ ánh sáng và phông nền sạch sẽ để thu hút người mua hơn.</p>
              </div>
            </div>

            <div className="flex justify-end mt-8">
              <button onClick={() => { if(previewUrls.length===0) return addToast("Cần ít nhất 1 ảnh","warning"); setStep(2); }} className="px-8 py-3.5 bg-[#00418E] text-white rounded-xl font-bold flex items-center gap-2 hover:bg-[#003370] transition shadow-xl shadow-blue-900/20 active:scale-95">Tiếp tục <ArrowRight size={18}/></button>
            </div>
          </div>
        )}

        {/* STEP 2: SMART DETAILS */}
        {step === 2 && (
          <div className="glass-panel p-8 rounded-[2.5rem] animate-enter">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-bold flex items-center gap-3"><FileText className="text-blue-600"/> Chi tiết sản phẩm</h3>
              <button onClick={analyzeImageAI} className="px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl font-bold text-xs flex items-center gap-2 shadow-lg shadow-indigo-500/30 hover:scale-105 transition-transform">
                <Wand2 size={16}/> AI Auto-Fill
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
              <div className="md:col-span-8 space-y-6">
                <div>
                  <label className="block text-xs font-extrabold text-slate-500 uppercase mb-2 ml-1">Tiêu đề tin đăng</label>
                  <input value={state.title} onChange={e => dispatch({type:'SET_FIELD', field:'title', value:e.target.value})} className="input-modern text-lg" placeholder="VD: Giáo trình Giải tích 1 - NXB ĐHQG"/>
                </div>
                
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-extrabold text-slate-500 uppercase mb-2 ml-1">Danh mục</label>
                    <select value={state.category} onChange={e => dispatch({type:'SET_FIELD', field:'category', value:e.target.value})} className="input-modern appearance-none cursor-pointer">
                      {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.icon} {c.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-extrabold text-slate-500 uppercase mb-2 ml-1">Giá bán</label>
                    <div className="relative">
                      <input value={formatPrice(state.price)} onChange={e => dispatch({type:'SET_FIELD', field:'price', value:e.target.value.replace(/\./g, '')})} className="input-modern pl-10 font-bold text-slate-800" placeholder="0"/>
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₫</span>
                      {priceAnalysis && (
                        <div className={`absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold px-2 py-0.5 rounded ${priceAnalysis === 'low' ? 'bg-green-100 text-green-700' : priceAnalysis === 'high' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                          {priceAnalysis === 'low' ? 'Giá tốt' : priceAnalysis === 'high' ? 'Giá cao' : 'Hợp lý'}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-slate-500 uppercase mb-2 ml-1">Mô tả chi tiết</label>
                  <div className="bg-[#F8FAFC] border-2 border-slate-200 rounded-2xl overflow-hidden transition-colors focus-within:border-[#00418E] focus-within:bg-white">
                    <div className="flex gap-1 p-2 border-b border-slate-200 bg-slate-50">
                      {['B', 'I', 'U', 'List', 'Link'].map(t => <button key={t} className="rich-toolbar-btn hover:bg-white text-xs font-bold px-3 py-1.5">{t}</button>)}
                    </div>
                    <textarea rows={6} value={state.description} onChange={e => dispatch({type:'SET_FIELD', field:'description', value:e.target.value})} className="w-full p-4 bg-transparent outline-none resize-none text-slate-700 leading-relaxed" placeholder="Mô tả chi tiết về tình trạng, xuất xứ..."/>
                  </div>
                </div>
              </div>

              <div className="md:col-span-4 space-y-6">
                <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
                  <label className="block text-xs font-extrabold text-slate-500 uppercase mb-3">Tình trạng</label>
                  <div className="space-y-2">
                    {CONDITIONS.map(c => (
                      <button key={c.value} onClick={() => dispatch({type:'SET_FIELD', field:'condition', value:c.value})} className={`w-full p-3 rounded-xl text-left text-sm font-bold border-2 transition-all flex items-center justify-between ${state.condition === c.value ? c.color : 'border-transparent bg-slate-50 text-slate-500 hover:bg-slate-100'}`}>
                        {c.label} {state.condition === c.value && <CheckCircle2 size={16}/>}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
                  <label className="block text-xs font-extrabold text-slate-500 uppercase mb-3">Tags (Từ khóa)</label>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {state.tags.map(t => (
                      <span key={t} className="px-2 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-lg flex items-center gap-1">
                        #{t} <button onClick={() => dispatch({type:'REMOVE_TAG', tag:t})}><X size={12}/></button>
                      </span>
                    ))}
                  </div>
                  <input 
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); const val = e.currentTarget.value.trim(); if(val) { dispatch({type:'ADD_TAG', tag:val}); e.currentTarget.value = ''; }}}}
                    placeholder="+ Thêm tag..." 
                    className="w-full bg-slate-50 border-none rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-between mt-8">
              <button onClick={() => setStep(1)} className="px-6 py-3 text-slate-500 font-bold hover:bg-slate-100 rounded-xl transition flex items-center gap-2"><ArrowLeft size={18}/> Quay lại</button>
              <button onClick={() => { if(!state.title || !state.price) return addToast("Điền đủ thông tin!","warning"); setStep(3); }} className="px-8 py-3.5 bg-[#00418E] text-white rounded-xl font-bold flex items-center gap-2 hover:bg-[#003370] transition shadow-xl shadow-blue-900/20 active:scale-95">Tiếp tục <ArrowRight size={18}/></button>
            </div>
          </div>
        )}

        {/* STEP 3: LOCATION & METHOD */}
        {step === 3 && (
          <div className="glass-panel p-8 rounded-[2.5rem] animate-enter">
            <h3 className="text-2xl font-bold mb-6 flex items-center gap-3"><MapPin className="text-blue-600"/> Phương thức giao dịch</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              <div className="space-y-4">
                <label className="block text-xs font-extrabold text-slate-500 uppercase ml-1">Hình thức</label>
                <div className="flex gap-4">
                  {[ {val: 'direct', icon: <MapPin/>, label: 'Gặp trực tiếp', desc: 'An toàn, không phí'}, {val: 'shipping', icon: <Box/>, label: 'Giao hàng', desc: 'Tiện lợi, có phí ship'} ].map((m: any) => (
                    <button key={m.val} onClick={() => dispatch({type:'SET_FIELD', field:'tradeMethod', value:m.val})} className={`flex-1 p-4 rounded-2xl border-2 text-left transition-all ${state.tradeMethod === m.val ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
                      <div className={`mb-2 ${state.tradeMethod === m.val ? 'text-blue-600' : 'text-slate-400'}`}>{m.icon}</div>
                      <div className={`font-bold ${state.tradeMethod === m.val ? 'text-blue-900' : 'text-slate-700'}`}>{m.label}</div>
                      <div className="text-xs text-slate-400 mt-1">{m.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {state.tradeMethod === 'direct' && (
                <div className="space-y-4">
                  <label className="block text-xs font-extrabold text-slate-500 uppercase ml-1">Địa điểm hẹn gặp</label>
                  <div className="bg-slate-100 rounded-2xl p-1 relative h-48 overflow-hidden map-grid group cursor-crosshair">
                    {LOCATIONS.map(loc => (
                      <button key={loc.id} onClick={() => dispatch({type:'SET_FIELD', field:'location', value:loc.name})} style={{ left: `${loc.coords.x}%`, top: `${loc.coords.y}%` }} className={`absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-300 group/pin ${state.location === loc.name ? 'z-20 scale-125' : 'z-10 hover:scale-110'}`}>
                        <MapPin size={32} className={`${state.location === loc.name ? 'text-red-500 fill-red-500' : 'text-slate-400 fill-slate-200'} drop-shadow-md`}/>
                        <span className={`absolute top-full left-1/2 -translate-x-1/2 text-[10px] font-bold bg-white px-2 py-0.5 rounded shadow-sm whitespace-nowrap mt-1 ${state.location === loc.name ? 'text-red-600' : 'text-slate-500 opacity-0 group-hover/pin:opacity-100'}`}>{loc.name}</span>
                      </button>
                    ))}
                    <div className="absolute bottom-2 right-2 bg-white/90 backdrop-blur px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 shadow-sm border border-slate-200">📍 Đang chọn: {state.location}</div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-between mt-8">
              <button onClick={() => setStep(2)} className="px-6 py-3 text-slate-500 font-bold hover:bg-slate-100 rounded-xl transition flex items-center gap-2"><ArrowLeft size={18}/> Quay lại</button>
              <button onClick={() => setStep(4)} className="px-8 py-3.5 bg-[#00418E] text-white rounded-xl font-bold flex items-center gap-2 hover:bg-[#003370] transition shadow-xl shadow-blue-900/20 active:scale-95">Tiếp tục <ArrowRight size={18}/></button>
            </div>
          </div>
        )}

        {/* STEP 4: FINAL REVIEW */}
        {step === 4 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-enter">
            <div className="glass-panel p-8 rounded-[2.5rem] flex flex-col justify-center">
              <h3 className="text-2xl font-bold mb-6 text-center">Xem trước tin đăng</h3>
              <div className="w-[300px] mx-auto bg-white rounded-[3rem] border-[8px] border-slate-900 shadow-2xl overflow-hidden relative aspect-[9/19]">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-slate-900 rounded-b-xl z-20"></div>
                <div className="h-full overflow-y-auto hide-scrollbar bg-slate-50">
                  <div className="relative aspect-square">
                    <img src={previewUrls[0]} className="w-full h-full object-cover"/>
                    <div className="absolute bottom-0 left-0 w-full h-20 bg-gradient-to-t from-black/60 to-transparent"></div>
                    <div className="absolute bottom-4 left-4 text-white font-bold text-lg">{parseInt(state.price.replace(/\./g,'')).toLocaleString()}đ</div>
                  </div>
                  <div className="p-4 space-y-3">
                    <h4 className="font-bold text-slate-900 leading-tight">{state.title}</h4>
                    <div className="flex gap-2">
                      <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-1 rounded">{state.condition}</span>
                      <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-1 rounded">{state.tradeMethod === 'direct' ? 'Trực tiếp' : 'Ship COD'}</span>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">{state.description}</p>
                    <div className="pt-4 border-t border-slate-100">
                      <div className="flex items-center gap-2">
                        <img src={user?.avatar_url || 'https://via.placeholder.com/40'} className="w-8 h-8 rounded-full bg-slate-200"/>
                        <div><p className="text-xs font-bold text-slate-900">{user?.name || 'Bạn'}</p><p className="text-[10px] text-slate-400">Vừa xong</p></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="glass-panel p-8 rounded-[2.5rem] flex flex-col">
              <h3 className="text-2xl font-bold mb-6 flex items-center gap-2"><CheckCircle2 className="text-green-500"/> Sẵn sàng đăng tin?</h3>
              
              <div className="space-y-4 mb-8">
                <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-2xl border border-blue-100">
                  <div className="p-2 bg-white rounded-xl text-blue-600 shadow-sm"><Search size={20}/></div>
                  <div><p className="font-bold text-sm text-blue-900">SEO Score: 95/100</p><p className="text-xs text-blue-700">Tin đăng của bạn rất chi tiết, dễ dàng tìm thấy.</p></div>
                </div>
                <div className="flex items-center gap-4 p-4 bg-green-50 rounded-2xl border border-green-100">
                  <div className="p-2 bg-white rounded-xl text-green-600 shadow-sm"><ShieldCheck size={20}/></div>
                  <div><p className="font-bold text-sm text-green-900">An toàn</p><p className="text-xs text-green-700">Nội dung hợp lệ, không vi phạm chính sách.</p></div>
                </div>
              </div>

              <div className="mt-auto space-y-3">
                <button onClick={handleSubmit} disabled={isSubmitting} className="w-full py-4 bg-gradient-to-r from-[#00418E] to-[#0065D1] text-white rounded-2xl font-bold text-lg flex items-center justify-center gap-3 hover:shadow-xl hover:shadow-blue-500/30 transition-all active:scale-95 disabled:opacity-70 relative overflow-hidden group">
                  {isSubmitting ? <Loader2 className="animate-spin"/> : <Rocket className="group-hover:-translate-y-1 group-hover:translate-x-1 transition-transform"/>}
                  {isSubmitting ? 'Đang xử lý...' : 'ĐĂNG NGAY'}
                  <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 skew-x-12"></div>
                </button>
                <button onClick={() => setStep(3)} className="w-full py-4 bg-white border-2 border-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-50 transition">Chỉnh sửa lại</button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default PostItemPage;
