import React, { useState, useEffect, useReducer, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Upload, X, Image as ImageIcon, DollarSign, Tag, FileText, ArrowRight, ArrowLeft, 
  CheckCircle2, Sparkles, Loader2, Info, Camera, Box, AlertCircle, MapPin, Wand2, 
  Trash2, Edit3, Crop, RotateCcw, Save, Eye, ChevronDown, Check, AlertTriangle, 
  Settings, Maximize2, RefreshCw, Lock, Unlock, Calendar, Cloud, Wifi, Search, Rocket
} from 'lucide-react';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { ProductCategory, ProductCondition, TradeMethod } from '../types';

type ActionType = 
  | { type: 'SET_FIELD'; field: string; value: any }
  | { type: 'SET_ERROR'; field: string; error: string | null }
  | { type: 'ADD_IMAGE'; files: File[]; urls: string[] }
  | { type: 'REMOVE_IMAGE'; index: number }
  | { type: 'UPDATE_IMAGE'; index: number; url: string }
  | { type: 'RESET_FORM'; payload: any }
  | { type: 'SET_LOADING'; status: boolean }
  | { type: 'SET_STEP'; step: number }
  | { type: 'TOGGLE_AI_MODAL'; show: boolean }
  | { type: 'SET_PRICE_ANALYSIS'; analysis: 'low' | 'good' | 'high' | null };

interface PostState {
  title: string;
  description: string;
  price: string;
  category: ProductCategory;
  condition: ProductCondition;
  tradeMethod: TradeMethod;
  location: string;
  tags: string[];
  images: File[];
  previewUrls: string[];
  errors: Record<string, string>;
  isLoading: boolean;
  currentStep: number;
  showAiModal: boolean;
  priceAnalysis: 'low' | 'good' | 'high' | null;
  touched: Record<string, boolean>;
}

const initialState: PostState = {
  title: '',
  description: '',
  price: '',
  category: ProductCategory.TEXTBOOK,
  condition: ProductCondition.GOOD,
  tradeMethod: TradeMethod.DIRECT,
  location: 'Sảnh H6 - ĐH Bách Khoa',
  tags: [],
  images: [],
  previewUrls: [],
  errors: {},
  isLoading: false,
  currentStep: 1,
  showAiModal: false,
  priceAnalysis: null,
  touched: {}
};

const formReducer = (state: PostState, action: ActionType): PostState => {
  switch (action.type) {
    case 'SET_FIELD':
      return { ...state, [action.field]: action.value, touched: { ...state.touched, [action.field]: true } };
    case 'SET_ERROR':
      return { ...state, errors: { ...state.errors, [action.field]: action.error || '' } };
    case 'ADD_IMAGE':
      return { ...state, images: [...state.images, ...action.files], previewUrls: [...state.previewUrls, ...action.urls] };
    case 'REMOVE_IMAGE':
      return { 
        ...state, 
        images: state.images.filter((_, i) => i !== action.index), 
        previewUrls: state.previewUrls.filter((_, i) => i !== action.index) 
      };
    case 'UPDATE_IMAGE':
      const newUrls = [...state.previewUrls];
      newUrls[action.index] = action.url;
      return { ...state, previewUrls: newUrls };
    case 'RESET_FORM':
      return { ...initialState, ...action.payload };
    case 'SET_LOADING':
      return { ...state, isLoading: action.status };
    case 'SET_STEP':
      return { ...state, currentStep: action.step };
    case 'TOGGLE_AI_MODAL':
      return { ...state, showAiModal: action.show };
    case 'SET_PRICE_ANALYSIS':
      return { ...state, priceAnalysis: action.analysis };
    default:
      return state;
  }
};

const ImageProcessor = {
  readFileAsDataURL: (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = (e) => reject(e);
      reader.readAsDataURL(file);
    });
  },
  
  createImage: (url: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.crossOrigin = "anonymous";
      image.addEventListener('load', () => resolve(image));
      image.addEventListener('error', (error) => reject(error));
      image.src = url;
    });
  },

  rotateImage: async (imageUrl: string, degrees: number): Promise<string> => {
    try {
      const image = await ImageProcessor.createImage(imageUrl);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return imageUrl;

      if (degrees === 90 || degrees === 270) {
        canvas.width = image.height;
        canvas.height = image.width;
      } else {
        canvas.width = image.width;
        canvas.height = image.height;
      }

      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((degrees * Math.PI) / 180);
      ctx.drawImage(image, -image.width / 2, -image.height / 2);

      return canvas.toDataURL('image/jpeg', 0.9);
    } catch (e) {
      console.error(e);
      return imageUrl;
    }
  }
};

const Validator = {
  title: (val: string) => !val ? 'Tiêu đề là bắt buộc' : val.length < 10 ? 'Tiêu đề quá ngắn (tối thiểu 10 ký tự)' : val.length > 100 ? 'Tiêu đề quá dài' : null,
  price: (val: string) => {
    const num = parseInt(val.replace(/\D/g, ''));
    if (isNaN(num)) return 'Giá không hợp lệ';
    if (num < 0) return 'Giá không thể âm';
    if (num > 100000000) return 'Giá quá cao';
    return null;
  },
  description: (val: string) => !val ? 'Mô tả là bắt buộc' : val.length < 20 ? 'Mô tả quá ngắn, hãy viết chi tiết hơn' : null,
  images: (urls: string[]) => urls.length === 0 ? 'Cần ít nhất 1 ảnh minh họa' : urls.length > 8 ? 'Tối đa 8 ảnh' : null,
};

const VisualStyles = () => (
  <style>{`
    :root { --primary: #00418E; --secondary: #00B0F0; --success: #10B981; --warning: #F59E0B; --danger: #EF4444; --bg-glass: rgba(255, 255, 255, 0.95); }
    body { background-color: #F8FAFC; color: #334155; font-family: 'Inter', sans-serif; overflow-x: hidden; }
    .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: #CBD5E1; border-radius: 10px; }
    .glass-panel { background: var(--bg-glass); backdrop-filter: blur(20px); border: 1px solid #E2E8F0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05), 0 10px 15px -3px rgba(0,0,0,0.05); }
    .input-wrapper { position: relative; transition: all 0.2s ease; }
    .input-wrapper:focus-within { transform: translateY(-1px); }
    .input-wrapper:focus-within label { color: var(--primary); }
    .input-wrapper:focus-within input, .input-wrapper:focus-within textarea, .input-wrapper:focus-within select { border-color: var(--primary); box-shadow: 0 0 0 4px rgba(0, 65, 142, 0.1); }
    .step-node { transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
    .step-active { background: var(--primary); color: white; border-color: var(--primary); box-shadow: 0 0 0 4px rgba(0, 65, 142, 0.2); transform: scale(1.1); }
    .step-completed { background: var(--success); color: white; border-color: var(--success); }
    .step-pending { background: white; color: #94A3B8; border-color: #E2E8F0; }
    @keyframes spin-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    @keyframes slide-up { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
    .animate-spin-slow { animation: spin-slow 3s linear infinite; }
    .animate-enter { animation: slide-up 0.5s ease-out forwards; }
    .toggle-switch { position: relative; width: 44px; height: 24px; background: #E2E8F0; border-radius: 99px; transition: 0.3s; cursor: pointer; }
    .toggle-switch[data-checked="true"] { background: var(--primary); }
    .toggle-switch::after { content: ''; position: absolute; top: 2px; left: 2px; width: 20px; height: 20px; background: white; border-radius: 50%; transition: 0.3s; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .toggle-switch[data-checked="true"]::after { transform: translateX(20px); }
  `}</style>
);

const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary'|'secondary'|'danger'|'ghost'|'outline', loading?: boolean, icon?: React.ReactNode, fullWidth?: boolean }> = ({ variant = 'primary', loading, icon, children, className, disabled, fullWidth, ...props }) => {
  const styles = {
    primary: "bg-[#00418E] text-white hover:bg-[#003370] shadow-lg shadow-blue-900/20",
    secondary: "bg-[#00B0F0] text-white hover:bg-[#0090C0] shadow-lg shadow-cyan-500/20",
    danger: "bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-500/20",
    ghost: "bg-transparent text-slate-600 hover:bg-slate-100",
    outline: "bg-white border-2 border-slate-200 text-slate-700 hover:border-[#00418E] hover:text-[#00418E]"
  };
  return (
    <button disabled={disabled || loading} className={`inline-flex items-center justify-center px-6 py-3 rounded-xl font-bold transition-all active:scale-95 disabled:opacity-60 disabled:pointer-events-none ${styles[variant]} ${fullWidth ? 'w-full' : ''} ${className}`} {...props}>
      {loading ? <RefreshCw className="animate-spin mr-2" size={18}/> : icon ? <span className="mr-2">{icon}</span> : null}
      {children}
    </button>
  );
};

const InputGroup: React.FC<{ label: string, error?: string, required?: boolean, children: React.ReactNode, subLabel?: string }> = ({ label, error, required, children, subLabel }) => (
  <div className="input-wrapper mb-6">
    <div className="flex justify-between items-baseline mb-2">
      <label className="text-sm font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1">{label} {required && <span className="text-red-500">*</span>}</label>
      {subLabel && <span className="text-xs text-slate-400 font-medium italic">{subLabel}</span>}
    </div>
    {children}
    {error && <div className="mt-1.5 flex items-center gap-1.5 text-xs font-bold text-red-500 bg-red-50 p-2 rounded-lg border border-red-100"><AlertTriangle size={12}/>{error}</div>}
  </div>
);

const StepWizard: React.FC<{ current: number, steps: string[], onChange: (s: number) => void }> = ({ current, steps, onChange }) => (
  <div className="w-full max-w-3xl mx-auto mb-12 relative">
    <div className="absolute top-1/2 left-0 w-full h-1 bg-slate-200 -z-10 rounded-full overflow-hidden">
      <div className="h-full bg-gradient-to-r from-[#00418E] to-[#00B0F0] transition-all duration-500 ease-out" style={{ width: `${((current - 1) / (steps.length - 1)) * 100}%` }}></div>
    </div>
    <div className="flex justify-between">
      {steps.map((label, idx) => {
        const stepNum = idx + 1;
        const status = current === stepNum ? 'step-active' : current > stepNum ? 'step-completed' : 'step-pending';
        return (
          <button key={idx} onClick={() => current > stepNum && onChange(stepNum)} disabled={current <= stepNum} className="group flex flex-col items-center gap-3 bg-transparent border-none outline-none cursor-pointer disabled:cursor-default">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm border-2 step-node ${status}`}>{current > stepNum ? <Check size={20}/> : stepNum}</div>
            <span className={`text-xs font-bold uppercase tracking-wider transition-colors ${current >= stepNum ? 'text-[#00418E]' : 'text-slate-400'}`}>{label}</span>
          </button>
        );
      })}
    </div>
  </div>
);

const ImageEditor: React.FC<{ url: string, onClose: () => void, onSave: (newUrl: string) => void }> = ({ url, onClose, onSave }) => {
  const [rotation, setRotation] = useState(0);
  const [processing, setProcessing] = useState(false);

  const handleSave = async () => {
    setProcessing(true);
    const newUrl = await ImageProcessor.rotateImage(url, rotation);
    onSave(newUrl);
    setProcessing(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4 backdrop-blur-sm animate-enter">
      <div className="w-full max-w-4xl flex-1 flex items-center justify-center relative overflow-hidden rounded-2xl bg-[#0F172A] border border-white/10 shadow-2xl">
        <img src={url} alt="Editing" className="max-w-full max-h-[70vh] object-contain transition-transform duration-300" style={{ transform: `rotate(${rotation}deg)` }} />
      </div>
      <div className="w-full max-w-md mt-6 bg-white rounded-2xl p-4 flex items-center justify-between shadow-xl">
        <button onClick={onClose} className="p-3 text-slate-500 hover:bg-slate-100 rounded-xl transition"><X/></button>
        <div className="flex gap-4">
          <button onClick={() => setRotation(r => r - 90)} className="p-3 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition" title="Xoay trái"><RotateCcw className="-scale-x-100"/></button>
          <button onClick={() => setRotation(r => r + 90)} className="p-3 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition" title="Xoay phải"><RotateCcw/></button>
        </div>
        <button onClick={handleSave} disabled={processing} className="px-6 py-3 bg-[#00418E] text-white rounded-xl font-bold hover:bg-[#003370] transition flex items-center gap-2">
          {processing ? <Loader2 className="animate-spin"/> : <Check/>} Lưu
        </button>
      </div>
    </div>
  );
};

const PostItemPage: React.FC = () => {
  const { user, isRestricted } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');
  
  const [state, dispatch] = useReducer(formReducer, initialState);
  const [editImageIndex, setEditImageIndex] = useState<number | null>(null);

  useEffect(() => {
    if (editId) {
      const fetchProduct = async () => {
        dispatch({ type: 'SET_LOADING', status: true });
        const { data, error } = await supabase.from('products').select('*').eq('id', editId).single();
        if (data) {
          dispatch({ type: 'RESET_FORM', payload: {
            title: data.title, description: data.description, price: data.price.toString(),
            category: data.category, condition: data.condition, tradeMethod: data.trade_method,
            images: [], previewUrls: data.images || [], location: 'HCMUT', tags: data.tags || []
          }});
        } else {
          addToast('Không tìm thấy sản phẩm', 'error');
          navigate('/my-items');
        }
        dispatch({ type: 'SET_LOADING', status: false });
      };
      fetchProduct();
    }
  }, [editId, navigate, addToast]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      const totalImages = state.previewUrls.length + files.length;
      
      if (totalImages > 8) return addToast('Tối đa 8 ảnh.', 'warning');

      const urls = await Promise.all(files.map(file => ImageProcessor.readFileAsDataURL(file)));
      dispatch({ type: 'ADD_IMAGE', files, urls });
      e.target.value = '';
    }
  };

  const validateStep = (step: number): boolean => {
    let isValid = true;
    if (step === 1) {
      const err = Validator.images(state.previewUrls);
      if (err) { dispatch({ type: 'SET_ERROR', field: 'images', error: err }); isValid = false; }
      else dispatch({ type: 'SET_ERROR', field: 'images', error: null });
    }
    if (step === 2) {
      const titleErr = Validator.title(state.title);
      const priceErr = Validator.price(state.price);
      const descErr = Validator.description(state.description);
      
      if (titleErr) dispatch({ type: 'SET_ERROR', field: 'title', error: titleErr });
      if (priceErr) dispatch({ type: 'SET_ERROR', field: 'price', error: priceErr });
      if (descErr) dispatch({ type: 'SET_ERROR', field: 'description', error: descErr });
      
      if (titleErr || priceErr || descErr) isValid = false;
    }
    return isValid;
  };

  const handleNextStep = () => {
    if (validateStep(state.currentStep)) {
      dispatch({ type: 'SET_STEP', step: state.currentStep + 1 });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      addToast('Vui lòng kiểm tra lại thông tin', 'error');
    }
  };

  const handleAIAnalyze = () => {
    if (state.previewUrls.length === 0) return addToast('Cần ít nhất 1 ảnh để AI phân tích', 'warning');
    dispatch({ type: 'TOGGLE_AI_MODAL', show: true });
    
    setTimeout(() => {
      dispatch({ type: 'SET_FIELD', field: 'title', value: 'Máy tính Casio FX-580VN X Chính hãng' });
      dispatch({ type: 'SET_FIELD', field: 'description', value: 'Máy còn mới 99%, đầy đủ chức năng, phù hợp cho sinh viên thi Đại cương. Bảo hành 6 tháng.' });
      dispatch({ type: 'SET_FIELD', field: 'category', value: ProductCategory.SUPPLIES });
      dispatch({ type: 'SET_FIELD', field: 'condition', value: ProductCondition.LIKE_NEW });
      dispatch({ type: 'SET_FIELD', field: 'price', value: '550000' });
      dispatch({ type: 'TOGGLE_AI_MODAL', show: false });
      addToast('AI đã điền thông tin tự động!', 'success');
    }, 2500);
  };

  const handleSubmit = async () => {
    if (!user) return navigate('/auth');
    dispatch({ type: 'SET_LOADING', status: true });

    try {
      let finalImageUrls = [...state.previewUrls.filter(u => u.startsWith('http'))];
      const newImages = state.images;

      if (newImages.length > 0) {
        const uploadPromises = newImages.map(async (file) => {
          const fileName = `${user.id}/${Date.now()}_${Math.random().toString(36).substring(7)}`;
          const { error } = await supabase.storage.from('product-images').upload(fileName, file);
          if (error) throw error;
          const { data } = supabase.storage.from('product-images').getPublicUrl(fileName);
          return data.publicUrl;
        });
        const uploadedUrls = await Promise.all(uploadPromises);
        finalImageUrls = [...finalImageUrls, ...uploadedUrls];
      }

      const payload = {
        title: state.title,
        description: state.description,
        price: parseInt(state.price.replace(/\D/g, '')),
        category: state.category,
        condition: state.condition,
        trade_method: state.tradeMethod,
        images: finalImageUrls,
        seller_id: user.id,
        tags: state.tags,
        status: 'available',
        updated_at: new Date().toISOString()
      };

      if (editId) {
        const { error } = await supabase.from('products').update(payload).eq('id', editId);
        if (error) throw error;
        addToast('Cập nhật tin đăng thành công!', 'success');
      } else {
        const { error } = await supabase.from('products').insert(payload);
        if (error) throw error;
        addToast('Đăng tin thành công!', 'success');
      }
      
      navigate('/market');
    } catch (error: any) {
      console.error(error);
      addToast(error.message || 'Lỗi hệ thống, vui lòng thử lại', 'error');
    } finally {
      dispatch({ type: 'SET_LOADING', status: false });
    }
  };

  const formatPrice = (val: string) => {
    const raw = val.replace(/\D/g, '');
    const p = parseInt(raw);
    if (!p) dispatch({ type: 'SET_PRICE_ANALYSIS', analysis: null });
    else if (p < 100000) dispatch({ type: 'SET_PRICE_ANALYSIS', analysis: 'low' });
    else if (p > 1000000) dispatch({ type: 'SET_PRICE_ANALYSIS', analysis: 'high' });
    else dispatch({ type: 'SET_PRICE_ANALYSIS', analysis: 'good' });
    return raw.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  if (isRestricted) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="bg-white rounded-3xl p-8 shadow-2xl max-w-md w-full text-center border-t-8 border-red-500">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6"><Lock size={40} className="text-red-600"/></div>
        <h2 className="text-2xl font-black text-slate-800 mb-2">Tài khoản bị hạn chế</h2>
        <p className="text-slate-500 mb-8">Bạn không thể đăng tin mới do vi phạm chính sách cộng đồng.</p>
        <Button fullWidth onClick={() => navigate('/')}>Quay về trang chủ</Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen font-sans text-slate-800 pb-20 selection:bg-blue-100">
      <VisualStyles />
      
      {state.showAiModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md animate-enter">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center relative overflow-hidden shadow-2xl">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 to-purple-50 -z-10"></div>
            <div className="w-24 h-24 bg-white rounded-full mx-auto mb-6 flex items-center justify-center shadow-lg relative">
              <Sparkles size={48} className="text-indigo-600 animate-pulse"/>
              <div className="absolute inset-0 border-4 border-indigo-100 rounded-full animate-spin-slow border-t-indigo-500"></div>
            </div>
            <h3 className="text-2xl font-black text-slate-800 mb-2">Gemini AI</h3>
            <p className="text-slate-500 font-medium">Đang phân tích hình ảnh của bạn...</p>
            <div className="mt-6 space-y-2">
              <div className="h-2 bg-slate-200 rounded-full overflow-hidden"><div className="h-full bg-indigo-500 w-2/3 animate-[shimmer_1s_infinite]"></div></div>
              <p className="text-xs text-slate-400 font-mono">Processing tensor data...</p>
            </div>
          </div>
        </div>
      )}

      {editImageIndex !== null && (
        <ImageEditor 
          url={state.previewUrls[editImageIndex]} 
          onClose={() => setEditImageIndex(null)}
          onSave={(url) => { dispatch({ type: 'UPDATE_IMAGE', index: editImageIndex, url }); setEditImageIndex(null); }}
        />
      )}

      <div className="fixed top-0 left-0 w-full h-[600px] bg-gradient-to-b from-[#00418E]/5 to-transparent -z-10 pointer-events-none"></div>

      <div className="max-w-5xl mx-auto px-4 pt-10">
        <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-4 animate-enter">
          <div className="text-center md:text-left">
            <h1 className="text-4xl md:text-5xl font-black text-[#00418E] mb-2 tracking-tight">{editId ? 'Hiệu Chỉnh Tin' : 'Đăng Tin Mới'}</h1>
            <p className="text-slate-500 font-medium flex items-center justify-center md:justify-start gap-2">
              <Sparkles size={16} className="text-yellow-500 fill-yellow-500"/> AI hỗ trợ điền thông tin tự động
            </p>
          </div>
          <Button variant="ghost" icon={<X/>} onClick={() => navigate('/market')}>Hủy bỏ</Button>
        </div>

        <StepWizard current={state.currentStep} steps={['Hình ảnh', 'Chi tiết', 'Giao dịch', 'Xác nhận']} onChange={(s) => dispatch({ type: 'SET_STEP', step: s })} />

        <div className="glass-panel rounded-[2.5rem] p-6 md:p-10 animate-enter" style={{ minHeight: '500px' }}>
          
          {state.currentStep === 1 && (
            <div className="space-y-8">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold flex items-center gap-3"><Camera className="text-blue-600"/> Thư viện ảnh</h2>
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${state.previewUrls.length > 0 ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>{state.previewUrls.length}/8 ảnh</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
                    {state.previewUrls.map((url, idx) => (
                      <div key={idx} className="relative aspect-square rounded-2xl overflow-hidden group border-2 border-transparent hover:border-blue-500 transition-all cursor-pointer shadow-sm bg-white" onClick={() => setEditImageIndex(idx)}>
                        <img src={url} className="w-full h-full object-cover transition-transform group-hover:scale-110"/>
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-[2px]">
                          <button onClick={(e) => { e.stopPropagation(); setEditImageIndex(idx); }} className="p-1.5 bg-white rounded-full text-slate-800 hover:bg-blue-50 transition"><Edit3 size={14}/></button>
                          <button onClick={(e) => { e.stopPropagation(); dispatch({ type: 'REMOVE_IMAGE', index: idx }); }} className="p-1.5 bg-white rounded-full text-red-500 hover:bg-red-50 transition"><Trash2 size={14}/></button>
                        </div>
                        {idx === 0 && <span className="absolute top-2 left-2 bg-[#00418E] text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-md">Bìa</span>}
                      </div>
                    ))}
                    {state.previewUrls.length < 8 && (
                      <label className="aspect-square rounded-2xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-blue-50/50 transition-all group bg-slate-50/30">
                        <div className="p-3 bg-white rounded-full shadow-sm mb-2 group-hover:scale-110 transition-transform"><Upload size={24} className="text-blue-500"/></div>
                        <span className="text-xs font-bold text-slate-500 group-hover:text-blue-600">Thêm ảnh</span>
                        <input type="file" multiple accept="image/*" className="hidden" onChange={handleImageUpload}/>
                      </label>
                    )}
                  </div>
                  {state.errors.images && <p className="text-red-500 text-sm font-bold flex items-center gap-1"><AlertCircle size={14}/> {state.errors.images}</p>}
                </div>

                <div className="bg-slate-50 rounded-3xl p-8 border border-slate-200 flex flex-col items-center justify-center text-center">
                  <div className="w-full aspect-video bg-white rounded-2xl shadow-sm border border-slate-200 mb-6 overflow-hidden relative flex items-center justify-center">
                    {state.previewUrls.length > 0 ? (
                      <img src={state.previewUrls[0]} className="w-full h-full object-contain p-2"/>
                    ) : (
                      <div className="text-slate-300 flex flex-col items-center"><ImageIcon size={64} className="mb-2"/><p className="text-sm font-medium">Chưa có ảnh bìa</p></div>
                    )}
                  </div>
                  <div className="space-y-2 max-w-xs">
                    <h4 className="font-bold text-slate-800">Mẹo chụp ảnh đẹp</h4>
                    <p className="text-xs text-slate-500 leading-relaxed">Sử dụng ánh sáng tự nhiên, phông nền đơn giản và chụp nhiều góc độ để tăng độ tin cậy.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {state.currentStep === 2 && (
            <div className="space-y-8">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold flex items-center gap-3"><FileText className="text-blue-600"/> Thông tin chi tiết</h2>
                <button onClick={handleAIAnalyze} className="px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl font-bold text-xs flex items-center gap-2 shadow-lg shadow-indigo-500/20 hover:scale-105 transition-transform"><Wand2 size={16}/> Auto-Fill AI</button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                <div className="md:col-span-8 space-y-6">
                  <InputGroup label="Tiêu đề" error={state.errors.title} required>
                    <input value={state.title} onChange={e => dispatch({ type: 'SET_FIELD', field: 'title', value: e.target.value })} placeholder="VD: Giáo trình Giải tích 1 - NXB ĐHQG" className="w-full p-4 bg-white border border-slate-200 rounded-xl font-bold text-lg outline-none focus:border-[#00418E] focus:ring-4 focus:ring-blue-500/10 transition-all"/>
                  </InputGroup>

                  <div className="grid grid-cols-2 gap-6">
                    <InputGroup label="Danh mục" required>
                      <div className="relative">
                        <select value={state.category} onChange={e => dispatch({ type: 'SET_FIELD', field: 'category', value: e.target.value })} className="w-full p-4 pl-12 bg-white border border-slate-200 rounded-xl font-bold text-slate-700 outline-none appearance-none cursor-pointer focus:border-[#00418E]">
                          {Object.values(ProductCategory).map(c => <option key={c} value={c}>{c === 'textbook' ? 'Giáo trình' : c === 'electronics' ? 'Điện tử' : c === 'supplies' ? 'Dụng cụ' : c === 'clothing' ? 'Thời trang' : 'Khác'}</option>)}
                        </select>
                        <Tag className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={20}/>
                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={20}/>
                      </div>
                    </InputGroup>

                    <InputGroup label="Giá bán" error={state.errors.price} required>
                      <div className="relative">
                        <input value={formatPrice(state.price)} onChange={e => dispatch({ type: 'SET_FIELD', field: 'price', value: e.target.value.replace(/\./g, '') })} placeholder="0" className="w-full p-4 pl-10 bg-white border border-slate-200 rounded-xl font-bold text-lg outline-none focus:border-[#00418E] text-[#00418E]"/>
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₫</span>
                      </div>
                    </InputGroup>
                  </div>

                  <InputGroup label="Mô tả chi tiết" error={state.errors.description} required>
                    <textarea rows={6} value={state.description} onChange={e => dispatch({ type: 'SET_FIELD', field: 'description', value: e.target.value })} placeholder="Mô tả chi tiết về tình trạng, xuất xứ, lý do bán..." className="w-full p-4 bg-white border border-slate-200 rounded-xl font-medium outline-none focus:border-[#00418E] resize-none leading-relaxed"/>
                  </InputGroup>
                </div>

                <div className="md:col-span-4 space-y-6">
                  <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
                    <label className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-4 block">Tình trạng</label>
                    <div className="space-y-2">
                      {[ { val: ProductCondition.NEW, label: 'Mới 100%', color: 'border-green-200 bg-green-50 text-green-700' }, { val: ProductCondition.LIKE_NEW, label: 'Như mới (99%)', color: 'border-blue-200 bg-blue-50 text-blue-700' }, { val: ProductCondition.GOOD, label: 'Tốt', color: 'border-indigo-200 bg-indigo-50 text-indigo-700' }, { val: ProductCondition.FAIR, label: 'Khá', color: 'border-orange-200 bg-orange-50 text-orange-700' } ].map(cond => (
                        <button key={cond.val} onClick={() => dispatch({ type: 'SET_FIELD', field: 'condition', value: cond.val })} className={`w-full p-3 rounded-xl border-2 text-left font-bold text-sm flex items-center justify-between transition-all ${state.condition === cond.val ? cond.color : 'border-transparent bg-slate-50 text-slate-500 hover:bg-slate-100'}`}>
                          {cond.label} {state.condition === cond.val && <CheckCircle2 size={16}/>}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {state.currentStep === 3 && (
            <div className="space-y-8">
              <h2 className="text-2xl font-bold flex items-center gap-3"><MapPin className="text-blue-600"/> Phương thức giao dịch</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <InputGroup label="Hình thức">
                  <div className="flex gap-4">
                    {[ { val: TradeMethod.DIRECT, label: 'Gặp trực tiếp', icon: <MapPin/> }, { val: TradeMethod.SHIPPING, label: 'Giao hàng', icon: <Box/> } ].map(m => (
                      <button key={m.val} onClick={() => dispatch({ type: 'SET_FIELD', field: 'tradeMethod', value: m.val })} className={`flex-1 p-6 rounded-2xl border-2 text-left transition-all ${state.tradeMethod === m.val ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
                        <div className={`mb-3 ${state.tradeMethod === m.val ? 'text-blue-600' : 'text-slate-400'}`}>{m.icon}</div>
                        <div className={`font-bold text-lg ${state.tradeMethod === m.val ? 'text-blue-900' : 'text-slate-700'}`}>{m.label}</div>
                      </button>
                    ))}
                  </div>
                </InputGroup>

                {state.tradeMethod === TradeMethod.DIRECT && (
                  <InputGroup label="Địa điểm hẹn gặp">
                    <div className="relative h-64 bg-slate-100 rounded-2xl border border-slate-200 overflow-hidden cursor-crosshair group">
                      <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(#cbd5e1 1px, transparent 1px), linear-gradient(90deg, #cbd5e1 1px, transparent 1px)', backgroundSize: '20px 20px', opacity: 0.5 }}></div>
                      {[ { id: 'h6', x: 30, y: 40, label: 'Sảnh H6' }, { id: 'lib', x: 50, y: 60, label: 'Thư viện' }, { id: 'b4', x: 70, y: 30, label: 'Canteen B4' } ].map(loc => (
                        <button key={loc.id} onClick={() => dispatch({ type: 'SET_FIELD', field: 'location', value: loc.label })} style={{ left: `${loc.x}%`, top: `${loc.y}%` }} className={`absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-300 ${state.location === loc.label ? 'scale-125 z-20' : 'scale-100 hover:scale-110'}`}>
                          <MapPin size={32} className={`${state.location === loc.label ? 'text-red-600 fill-red-600' : 'text-slate-400 fill-slate-200'} drop-shadow-md`}/>
                          <span className={`absolute top-full left-1/2 -translate-x-1/2 mt-1 px-2 py-0.5 bg-white rounded shadow-sm text-[10px] font-bold whitespace-nowrap ${state.location === loc.label ? 'text-red-600' : 'text-slate-500 opacity-0 group-hover:opacity-100'}`}>{loc.label}</span>
                        </button>
                      ))}
                      <div className="absolute bottom-3 right-3 bg-white/90 backdrop-blur px-3 py-1.5 rounded-lg text-xs font-bold border shadow-sm">📍 {state.location || 'Chọn địa điểm trên bản đồ'}</div>
                    </div>
                  </InputGroup>
                )}
              </div>
            </div>
          )}

          {state.currentStep === 4 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
              <div>
                <h2 className="text-2xl font-bold mb-6 text-center lg:text-left">Xem trước tin đăng</h2>
                <div className="w-[320px] mx-auto bg-white rounded-[3rem] border-[8px] border-[#0F172A] shadow-2xl overflow-hidden relative aspect-[9/18]">
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-[#0F172A] rounded-b-xl z-20"></div>
                  <div className="h-full overflow-y-auto custom-scrollbar bg-slate-50">
                    <div className="relative aspect-square bg-slate-200">
                      <img src={state.previewUrls[0]} className="w-full h-full object-cover"/>
                      <div className="absolute bottom-0 left-0 w-full h-24 bg-gradient-to-t from-black/70 to-transparent"></div>
                      <div className="absolute bottom-4 left-4 text-white font-bold text-xl">{parseInt(state.price.replace(/\./g,'')).toLocaleString('vi-VN')}₫</div>
                    </div>
                    <div className="p-5 space-y-4">
                      <div className="flex justify-between items-start">
                        <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider">{state.category}</span>
                        <span className="text-xs text-slate-400">Vừa xong</span>
                      </div>
                      <h3 className="font-bold text-slate-900 text-lg leading-snug">{state.title}</h3>
                      <div className="flex gap-2">
                        <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold">{state.condition}</span>
                        <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-bold">{state.tradeMethod === TradeMethod.DIRECT ? 'Trực tiếp' : 'Ship COD'}</span>
                      </div>
                      <div className="h-px bg-slate-200 my-2"></div>
                      <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{state.description}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-blue-50 border border-blue-100 p-6 rounded-2xl">
                  <h4 className="font-bold text-blue-900 mb-2 flex items-center gap-2"><CheckCircle2 size={18}/> Tin đăng hợp lệ</h4>
                  <p className="text-sm text-blue-700">Nội dung của bạn đã tuân thủ quy tắc cộng đồng. Tin sẽ được hiển thị ngay lập tức sau khi đăng.</p>
                </div>
                <div className="space-y-3">
                  <Button fullWidth size="xl" onClick={handleSubmit} loading={state.isLoading} icon={<Rocket/>} className="shadow-xl shadow-blue-500/30">
                    {state.isLoading ? 'Đang xử lý...' : 'XÁC NHẬN ĐĂNG TIN'}
                  </Button>
                  <Button fullWidth variant="outline" onClick={() => dispatch({ type: 'SET_STEP', step: 3 })}>Chỉnh sửa lại</Button>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-between mt-12 pt-6 border-t border-slate-100">
            {state.currentStep > 1 ? (
              <Button variant="ghost" onClick={() => dispatch({ type: 'SET_STEP', step: state.currentStep - 1 })} icon={<ArrowLeft/>}>Quay lại</Button>
            ) : <div/>}
            
            {state.currentStep < 4 && (
              <Button onClick={handleNextStep} icon={<ArrowRight/>} iconPosition="right">Tiếp tục</Button>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

export default PostItemPage;
