import React, { useState, useEffect, useReducer } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Upload, X, Image as ImageIcon, DollarSign, Tag, FileText,
  ArrowRight, ArrowLeft, CheckCircle2, Sparkles, Loader2,
  Camera, Box, MapPin, Wand2, Trash2, Edit3,
  RotateCcw, Eye, Smartphone, Rocket, Check, Truck
} from "lucide-react";
import { supabase } from "../services/supabase";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import { ProductCategory, ProductCondition, TradeMethod } from "../types";

// --- CONFIG ---
const CATEGORIES = [
  { value: ProductCategory.TEXTBOOK, label: "Giáo trình & Tài liệu" },
  { value: ProductCategory.ELECTRONICS, label: "Thiết bị điện tử" },
  { value: ProductCategory.SUPPLIES, label: "Dụng cụ học tập" },
  { value: ProductCategory.CLOTHING, label: "Thời trang sinh viên" },
  { value: ProductCategory.OTHER, label: "Khác" },
];

const CONDITIONS = [
  { value: ProductCondition.NEW, label: "Mới 100%", color: "bg-emerald-100 text-emerald-700" },
  { value: ProductCondition.LIKE_NEW, label: "Như mới (99%)", color: "bg-blue-100 text-blue-700" },
  { value: ProductCondition.GOOD, label: "Tốt (90%)", color: "bg-indigo-100 text-indigo-700" },
  { value: ProductCondition.FAIR, label: "Chấp nhận được", color: "bg-orange-100 text-orange-700" },
];

const LOCATIONS = ["Sảnh H6", "Canteen B4", "Thư viện", "Tòa A4", "Khu C6", "Nhà xe"];

// --- STYLES ---
const VisualEngine = () => (
  <style>{`
    :root { --primary: #00418E; }
    body { background-color: #F8FAFC; color: #0F172A; }
    
    .glass-panel { 
      background: rgba(255, 255, 255, 0.85); 
      backdrop-filter: blur(20px); 
      border: 1px solid rgba(255, 255, 255, 0.6); 
      box-shadow: 0 20px 40px -10px rgba(0, 65, 142, 0.1); 
    }
    
    .input-modern { 
      width: 100%; padding: 16px; border-radius: 16px; 
      border: 2px solid #E2E8F0; background: white; 
      transition: all 0.2s; outline: none; font-weight: 500;
    }
    .input-modern:focus { border-color: var(--primary); box-shadow: 0 0 0 4px rgba(0, 65, 142, 0.1); }
    
    /* Ẩn nút tăng giảm số mặc định của trình duyệt để tránh vỡ giao diện */
    input[type=number]::-webkit-inner-spin-button, 
    input[type=number]::-webkit-outer-spin-button { 
      -webkit-appearance: none; margin: 0; 
    }
    input[type=number] { -moz-appearance: textfield; }

    @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
    .animate-enter { animation: slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
    
    .mockup-mobile { 
      width: 320px; height: 640px; margin: 0 auto; 
      border: 8px solid #1e293b; border-radius: 40px; 
      overflow: hidden; background: white; position: relative;
      box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);
    }
  `}</style>
);

// --- STEP INDICATOR ---
const StepWizard = ({ current, steps, onJump }: { current: number, steps: string[], onJump: (s: number) => void }) => (
  <div className="mb-10 px-4">
    <div className="relative flex justify-between items-center">
      <div className="absolute top-1/2 left-0 w-full h-1 bg-slate-200 -z-10 rounded-full"></div>
      <div className="absolute top-1/2 left-0 h-1 bg-[#00418E] -z-10 rounded-full transition-all duration-500" style={{ width: `${(current - 1) / (steps.length - 1) * 100}%` }}></div>
      {steps.map((label, idx) => {
        const stepNum = idx + 1;
        const isActive = stepNum === current;
        const isDone = stepNum < current;
        return (
          <button key={idx} onClick={() => isDone && onJump(stepNum)} disabled={!isDone} className="flex flex-col items-center gap-2 group">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm border-2 transition-all ${isActive ? "border-[#00418E] bg-[#00418E] text-white scale-110 shadow-lg" : isDone ? "border-green-500 bg-green-500 text-white" : "border-slate-300 bg-white text-slate-400"}`}>
              {isDone ? <Check size={18} /> : stepNum}
            </div>
            <span className={`text-[10px] font-bold uppercase tracking-wider ${isActive ? "text-[#00418E]" : "text-slate-400"}`}>{label}</span>
          </button>
        );
      })}
    </div>
  </div>
);

// --- STATE MANAGEMENT ---
type FormState = {
  title: string; description: string; price: string;
  category: ProductCategory; condition: ProductCondition;
  tradeMethod: TradeMethod; location: string; tags: string[];
};

const formReducer = (state: FormState, action: any): FormState => {
  switch (action.type) {
    case "SET_FIELD": return { ...state, [action.field]: action.value };
    case "RESET": return action.payload;
    case "ADD_TAG": return state.tags.includes(action.tag) ? state : { ...state, tags: [...state.tags, action.tag] };
    case "REMOVE_TAG": return { ...state, tags: state.tags.filter(t => t !== action.tag) };
    default: return state;
  }
};

const PostItemPage: React.FC = () => {
  const { user, isRestricted } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get("edit");

  // Local State
  const [step, setStep] = useState(1);
  const [images, setImages] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [aiAnalyzing, setAiAnalyzing] = useState(false);

  // Form State
  const [state, dispatch] = useReducer(formReducer, {
    title: "", description: "", price: "",
    category: ProductCategory.TEXTBOOK, condition: ProductCondition.GOOD,
    tradeMethod: TradeMethod.DIRECT, location: "Sảnh H6", tags: []
  });

  // Load data for editing
  useEffect(() => {
    if (editId) {
      const load = async () => {
        const { data } = await supabase.from("products").select("*").eq("id", editId).single();
        if (data) {
          dispatch({
            type: "RESET",
            payload: {
              title: data.title,
              description: data.description,
              price: data.price.toString(),
              category: data.category,
              condition: data.condition,
              tradeMethod: data.trade_method, 
              location: data.location_name,   
              tags: data.tags || []
            }
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
      setImages([...images, ...newFiles]);
      setPreviewUrls([...previewUrls, ...newFiles.map(f => URL.createObjectURL(f))]);
    }
  };

  const removeImage = (idx: number) => {
    setPreviewUrls(prev => prev.filter((_, i) => i !== idx));
    setImages(prev => prev.filter((_, i) => i !== idx));
  };

  const runAIAnalysis = () => {
    if (previewUrls.length === 0) return addToast("Chọn ảnh trước nhé!", "warning");
    setAiAnalyzing(true);
    setTimeout(() => {
      dispatch({ type: "SET_FIELD", field: "title", value: "Giáo trình Giải Tích 1 - NXB ĐHQG" });
      dispatch({ type: "SET_FIELD", field: "category", value: ProductCategory.TEXTBOOK });
      dispatch({ type: "SET_FIELD", field: "price", value: "45000" });
      dispatch({ type: "SET_FIELD", field: "condition", value: ProductCondition.LIKE_NEW });
      dispatch({ type: "SET_FIELD", field: "description", value: "Sách còn mới 99%, không ghi chú, bao bìa cẩn thận. Pass lại cho bạn nào cần." });
      setAiAnalyzing(false);
      addToast("AI đã điền thông tin!", "success");
    }, 1500);
  };

  const handleSubmit = async () => {
    if (!user) return navigate("/auth");
    setIsSubmitting(true);

    try {
      // 1. Upload Images
      let finalUrls = previewUrls.filter(u => u.startsWith("http"));
      if (images.length > 0) {
        for (const file of images) {
          const path = `${user.id}/${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          const { error } = await supabase.storage.from("product-images").upload(path, file);
          if (!error) {
            const { data } = supabase.storage.from("product-images").getPublicUrl(path);
            finalUrls.push(data.publicUrl);
          }
        }
      }

      // 2. Prepare Payload
      const payload = {
        title: state.title,
        description: state.description,
        price: parseInt(state.price.replace(/\D/g, '')),
        category: state.category,
        condition: state.condition,
        trade_method: state.tradeMethod,
        location_name: state.location,
        images: finalUrls,
        tags: state.tags,
        seller_id: user.id,
        status: 'available',
        view_count: 0
      };

      // 3. Insert/Update
      const { error } = editId 
        ? await supabase.from("products").update(payload).eq("id", editId)
        : await supabase.from("products").insert(payload);

      if (error) throw error;

      addToast("Đăng tin thành công!", "success");
      navigate("/market");
    } catch (err: any) {
      console.error(err);
      addToast("Lỗi: " + err.message, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isRestricted) return <div className="h-screen flex items-center justify-center text-red-500 font-bold">Tài khoản bị hạn chế</div>;

  return (
    <div className="min-h-screen pt-24 pb-20 font-sans text-slate-800">
      <VisualEngine />
      <div className="fixed inset-0 -z-10 bg-gradient-to-br from-blue-50 to-white"></div>

      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="flex justify-between items-end mb-8 animate-enter">
          <div>
            <h1 className="text-4xl font-black text-[#00418E]">{editId ? "Chỉnh Sửa Tin" : "Đăng Tin Mới"}</h1>
            <p className="text-slate-500 font-medium">Bán nhanh chóng trong 4 bước đơn giản.</p>
          </div>
          <button onClick={() => navigate('/market')} className="text-slate-400 hover:text-red-500 transition-colors bg-white p-2 rounded-full shadow-sm"><X size={24}/></button>
        </div>

        {/* Wizard Progress */}
        <StepWizard current={step} steps={["Hình ảnh", "Thông tin", "Giao dịch", "Xác nhận"]} onJump={setStep} />

        <div className="glass-panel rounded-[2.5rem] p-8 animate-enter min-h-[500px]">
          
          {/* --- STEP 1: IMAGES --- */}
          {step === 1 && (
            <div className="space-y-8">
              <div className="flex justify-between items-center">
                <h3 className="text-2xl font-bold flex gap-2 items-center"><Camera className="text-[#00418E]"/> Thư viện ảnh</h3>
                <button onClick={runAIAnalysis} disabled={aiAnalyzing} className="px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-xl text-sm font-bold shadow-lg hover:shadow-purple-500/30 flex items-center gap-2">
                  {aiAnalyzing ? <Loader2 className="animate-spin" size={16}/> : <Sparkles size={16}/>}
                  {aiAnalyzing ? "Đang phân tích..." : "AI Gợi ý"}
                </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {previewUrls.map((url, idx) => (
                  <div key={idx} className="relative aspect-square rounded-2xl overflow-hidden group border-2 border-white shadow-sm">
                    <img src={url} className="w-full h-full object-cover" />
                    <button onClick={() => removeImage(idx)} className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-all shadow-md hover:scale-110"><Trash2 size={14}/></button>
                    {idx === 0 && <span className="absolute bottom-2 left-2 bg-[#00418E]/90 text-white text-[10px] font-bold px-2 py-1 rounded-lg backdrop-blur">Ảnh bìa</span>}
                  </div>
                ))}
                {previewUrls.length < 5 && (
                  <label className="flex flex-col items-center justify-center aspect-square rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50/50 cursor-pointer hover:bg-blue-50 hover:border-[#00418E] transition-all group">
                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm mb-2 group-hover:scale-110 transition-transform"><Upload className="text-[#00418E]"/></div>
                    <span className="text-xs font-bold text-blue-600">Thêm ảnh</span>
                    <input type="file" hidden multiple accept="image/*" onChange={handleImageUpload} />
                  </label>
                )}
              </div>
              
              <div className="flex justify-end pt-4 border-t border-slate-200">
                <button onClick={() => { if(previewUrls.length === 0) return addToast("Cần ít nhất 1 ảnh", "warning"); setStep(2); }} className="px-8 py-3 bg-[#00418E] text-white rounded-xl font-bold shadow-lg hover:shadow-blue-900/20 flex items-center gap-2">Tiếp tục <ArrowRight size={18}/></button>
              </div>
            </div>
          )}

          {/* --- STEP 2: INFO --- */}
          {step === 2 && (
            <div className="space-y-8">
              <h3 className="text-2xl font-bold flex gap-2 items-center"><FileText className="text-[#00418E]"/> Chi tiết sản phẩm</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Tiêu đề tin</label>
                  <input value={state.title} onChange={e => dispatch({type:'SET_FIELD', field:'title', value:e.target.value})} className="input-modern text-lg" placeholder="VD: Giáo trình Giải tích 1..." />
                </div>
                
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Giá bán</label>
                    <div className="relative">
                      {/* ĐÃ SỬA: Bỏ icon trái, thêm text phải, thêm padding right */}
                      <input 
                        value={state.price} 
                        onChange={e => dispatch({type:'SET_FIELD', field:'price', value:e.target.value})} 
                        className="input-modern pr-16 font-bold text-[#00418E] text-lg" 
                        placeholder="0" 
                        type="number"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm pointer-events-none">VNĐ</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Danh mục</label>
                    <select value={state.category} onChange={e => dispatch({type:'SET_FIELD', field:'category', value:e.target.value})} className="input-modern cursor-pointer">
                      {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Tình trạng</label>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {CONDITIONS.map(c => (
                      <button key={c.value} onClick={() => dispatch({type:'SET_FIELD', field:'condition', value:c.value})} className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all whitespace-nowrap ${state.condition === c.value ? c.color + ' border-transparent shadow-sm' : 'bg-white border-slate-200 text-slate-500'}`}>
                        {c.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Mô tả</label>
                  <textarea value={state.description} onChange={e => dispatch({type:'SET_FIELD', field:'description', value:e.target.value})} rows={5} className="input-modern resize-none" placeholder="Mô tả chi tiết về sản phẩm..." />
                </div>
              </div>

              <div className="flex justify-between pt-4 border-t border-slate-200">
                <button onClick={() => setStep(1)} className="text-slate-500 font-bold hover:text-slate-700">Quay lại</button>
                <button onClick={() => { if(!state.title || !state.price) return addToast("Điền đủ thông tin", "warning"); setStep(3); }} className="px-8 py-3 bg-[#00418E] text-white rounded-xl font-bold shadow-lg flex items-center gap-2">Tiếp tục <ArrowRight size={18}/></button>
              </div>
            </div>
          )}

          {/* --- STEP 3: LOGISTICS --- */}
          {step === 3 && (
            <div className="space-y-8">
              <h3 className="text-2xl font-bold flex gap-2 items-center"><MapPin className="text-[#00418E]"/> Phương thức giao dịch</h3>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-4">Hình thức</label>
                  <div className="space-y-3">
                    {[
                      { val: TradeMethod.DIRECT, label: "Gặp trực tiếp", icon: <Box/>, sub: "An toàn, không phí" },
                      { val: TradeMethod.SHIPPING, label: "Giao hàng (Ship)", icon: <Truck/>, sub: "Tiện lợi, có phí ship" }
                    ].map(m => (
                      <button key={m.val} onClick={() => dispatch({type:'SET_FIELD', field:'tradeMethod', value:m.val})} className={`w-full p-4 rounded-2xl border-2 flex items-center gap-4 transition-all text-left ${state.tradeMethod === m.val ? 'border-blue-500 bg-blue-50' : 'border-transparent bg-white hover:border-slate-200 shadow-sm'}`}>
                        <div className={`p-3 rounded-xl ${state.tradeMethod === m.val ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400'}`}>{m.icon}</div>
                        <div>
                          <p className={`font-bold ${state.tradeMethod === m.val ? 'text-blue-900' : 'text-slate-700'}`}>{m.label}</p>
                          <p className="text-xs text-slate-400">{m.sub}</p>
                        </div>
                        {state.tradeMethod === m.val && <CheckCircle2 className="ml-auto text-blue-500"/>}
                      </button>
                    ))}
                  </div>
                </div>

                {state.tradeMethod === TradeMethod.DIRECT && (
                  <div className="animate-enter">
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-4">Địa điểm hẹn gặp</label>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {LOCATIONS.map(loc => (
                        <button key={loc} onClick={() => dispatch({type:'SET_FIELD', field:'location', value:loc})} className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${state.location === loc ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`}>
                          {loc}
                        </button>
                      ))}
                    </div>
                    <div className="relative">
                      <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
                      <input value={state.location} onChange={e => dispatch({type:'SET_FIELD', field:'location', value:e.target.value})} className="input-modern pl-11" placeholder="Hoặc nhập địa điểm khác..." />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-between pt-4 border-t border-slate-200">
                <button onClick={() => setStep(2)} className="text-slate-500 font-bold hover:text-slate-700">Quay lại</button>
                <button onClick={() => setStep(4)} className="px-8 py-3 bg-[#00418E] text-white rounded-xl font-bold shadow-lg flex items-center gap-2">Tiếp tục <ArrowRight size={18}/></button>
              </div>
            </div>
          )}

          {/* --- STEP 4: PREVIEW --- */}
          {step === 4 && (
            <div className="grid md:grid-cols-2 gap-10 items-start">
              <div className="space-y-6">
                <h3 className="text-2xl font-bold text-slate-800">Kiểm tra lại tin đăng</h3>
                <p className="text-slate-500">Xem trước cách bài đăng hiển thị trên ứng dụng của người mua.</p>
                
                <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl flex gap-4 items-start">
                  <div className="bg-white p-2 rounded-xl text-blue-600 shadow-sm"><Sparkles size={20}/></div>
                  <div>
                    <p className="font-bold text-blue-900 text-sm">Mẹo bán nhanh</p>
                    <p className="text-xs text-blue-700 mt-1">Tin đăng có đầy đủ ảnh và mô tả chi tiết thường bán nhanh hơn gấp 3 lần.</p>
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button onClick={handleSubmit} disabled={isSubmitting} className="flex-1 py-4 bg-gradient-to-r from-[#00418E] to-[#0065D1] text-white rounded-2xl font-bold text-lg shadow-xl hover:shadow-blue-500/30 hover:scale-[1.02] transition-all flex items-center justify-center gap-2">
                    {isSubmitting ? <Loader2 className="animate-spin"/> : <Rocket/>}
                    {editId ? "Cập Nhật Tin" : "Đăng Tin Ngay"}
                  </button>
                  <button onClick={() => setStep(3)} className="px-6 rounded-2xl border-2 border-slate-200 text-slate-500 font-bold hover:bg-slate-50">Sửa lại</button>
                </div>
              </div>

              {/* Mobile Preview Mockup */}
              <div className="mockup-mobile border-slate-800 shadow-2xl">
                <div className="absolute top-0 w-full h-full bg-slate-50 overflow-y-auto hide-scrollbar">
                  <div className="relative aspect-square bg-slate-200">
                    <img src={previewUrls[0]} className="w-full h-full object-cover" />
                    <div className="absolute top-4 left-4 bg-black/30 p-2 rounded-full text-white"><ArrowLeft size={18}/></div>
                  </div>
                  <div className="p-5 -mt-6 relative bg-white rounded-t-[2rem]">
                    <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto mb-4"></div>
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">{CATEGORIES.find(c => c.value === state.category)?.label}</span>
                      <span className="text-xs text-slate-400 font-bold"><Eye size={12} className="inline mr-1"/> 0</span>
                    </div>
                    <h2 className="text-xl font-black text-slate-900 leading-tight mb-2">{state.title}</h2>
                    <p className="text-2xl font-black text-[#00418E] mb-6">{state.price ? parseInt(state.price.replace(/\D/g, '')).toLocaleString() : 0}đ</p>
                    
                    <div className="grid grid-cols-2 gap-2 mb-6">
                      <div className="bg-slate-50 p-3 rounded-xl border"><p className="text-[10px] text-slate-400 uppercase font-bold">Tình trạng</p><p className="text-sm font-bold">{CONDITIONS.find(c => c.value === state.condition)?.label}</p></div>
                      <div className="bg-slate-50 p-3 rounded-xl border"><p className="text-[10px] text-slate-400 uppercase font-bold">Giao dịch</p><p className="text-sm font-bold">{state.tradeMethod === TradeMethod.DIRECT ? 'Trực tiếp' : 'Ship COD'}</p></div>
                    </div>

                    <div className="space-y-2 mb-20">
                      <h4 className="font-bold text-sm">Mô tả</h4>
                      <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{state.description || "Chưa có mô tả..."}</p>
                    </div>
                  </div>
                  
                  {/* Bottom Bar Mockup */}
                  <div className="absolute bottom-0 w-full p-4 bg-white border-t flex gap-3">
                    <button className="flex-1 bg-slate-100 text-slate-700 font-bold py-3 rounded-xl text-sm">Chat</button>
                    <button className="flex-1 bg-[#00418E] text-white font-bold py-3 rounded-xl text-sm">Mua ngay</button>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default PostItemPage;
