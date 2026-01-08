import React, { useState, useEffect, useReducer } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Upload, X, Image as ImageIcon, DollarSign, Tag, FileText,
  ArrowRight, ArrowLeft, CheckCircle2, Sparkles, Loader2,
  Camera, Box, AlertCircle, MapPin, Wand2, Trash2, Edit3,
  RotateCcw, Save, Eye, Smartphone, Search, Rocket, ShieldCheck, Check
} from "lucide-react";
import { supabase } from "../services/supabase";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import { ProductCategory, ProductCondition, TradeMethod } from "../types";

// --- CONFIG & STYLES ---
const CATEGORIES = [
  { value: ProductCategory.TEXTBOOK, label: "Giáo trình & Tài liệu", icon: "📚" },
  { value: ProductCategory.ELECTRONICS, label: "Thiết bị điện tử", icon: "💻" },
  { value: ProductCategory.SUPPLIES, label: "Dụng cụ học tập", icon: "📐" },
  { value: ProductCategory.CLOTHING, label: "Thời trang sinh viên", icon: "👕" },
  { value: ProductCategory.OTHER, label: "Khác", icon: "📦" },
];

const CONDITIONS = [
  { value: ProductCondition.NEW, label: "Mới 100%", color: "bg-emerald-100 text-emerald-700" },
  { value: ProductCondition.LIKE_NEW, label: "Như mới (99%)", color: "bg-blue-100 text-blue-700" },
  { value: ProductCondition.GOOD, label: "Tốt (90%)", color: "bg-indigo-100 text-indigo-700" },
  { value: ProductCondition.FAIR, label: "Chấp nhận được", color: "bg-orange-100 text-orange-700" },
];

const LOCATIONS = ["Sảnh H6", "Canteen B4", "Thư viện", "Tòa A4", "Khu C6", "Nhà xe"];

const VisualEngine = () => (
  <style>{`
    :root { --primary: #00418E; --secondary: #00B0F0; }
    body { background-color: #F8FAFC; color: #0F172A; }
    .glass-panel { background: rgba(255, 255, 255, 0.8); backdrop-filter: blur(20px); border: 1px solid rgba(255, 255, 255, 0.6); box-shadow: 0 20px 40px -10px rgba(0, 65, 142, 0.1); }
    .input-modern { width: 100%; padding: 16px; border-radius: 16px; border: 2px solid #E2E8F0; background: #F8FAFC; transition: all 0.2s; outline: none; }
    .input-modern:focus { background: white; border-color: var(--primary); box-shadow: 0 0 0 4px rgba(0, 65, 142, 0.1); }
    @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
    .animate-enter { animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
  `}</style>
);

// --- REDUCER ---
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

  const [step, setStep] = useState(1);
  const [images, setImages] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [aiAnalyzing, setAiAnalyzing] = useState(false);

  const [state, dispatch] = useReducer(formReducer, {
    title: "", description: "", price: "",
    category: ProductCategory.TEXTBOOK, condition: ProductCondition.GOOD,
    tradeMethod: TradeMethod.DIRECT, location: "Sảnh H6", tags: []
  });

  // Load Edit Data
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
              tradeMethod: data.trade_method, // Map từ DB snake_case
              location: data.location_name || "", // Map từ DB snake_case
              tags: data.tags || []
            }
          });
          setPreviewUrls(data.images || []);
        }
      };
      load();
    }
  }, [editId]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setImages([...images, ...newFiles]);
      setPreviewUrls([...previewUrls, ...newFiles.map(f => URL.createObjectURL(f))]);
    }
  };

  const handleSubmit = async () => {
    if (!user) return navigate("/auth");
    if (!state.title || !state.price) return addToast("Thiếu thông tin!", "error");
    setIsSubmitting(true);

    try {
      let finalUrls = previewUrls.filter(u => u.startsWith("http"));
      
      // Upload ảnh mới
      if (images.length > 0) {
        for (const file of images) {
          const path = `${user.id}/${Date.now()}_${Math.random().toString(36).substr(2,9)}`;
          const { error } = await supabase.storage.from("product-images").upload(path, file);
          if (!error) {
            const { data } = supabase.storage.from("product-images").getPublicUrl(path);
            finalUrls.push(data.publicUrl);
          }
        }
      }

      // Payload gửi lên DB (Snake Case)
      const payload = {
        title: state.title,
        description: state.description,
        price: parseInt(state.price.replace(/\D/g, '')),
        category: state.category,
        condition: state.condition,
        trade_method: state.tradeMethod, // snake_case
        location_name: state.location,   // snake_case
        images: finalUrls,
        tags: state.tags,
        seller_id: user.id,              // snake_case
        status: 'available',
        view_count: 0
      };

      const { error } = editId 
        ? await supabase.from("products").update(payload).eq("id", editId)
        : await supabase.from("products").insert(payload);

      if (error) throw error;
      addToast(editId ? "Cập nhật thành công!" : "Đăng tin thành công!", "success");
      navigate("/market");
    } catch (err: any) {
      addToast(err.message, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ... (Phần render UI giữ nguyên, chỉ sửa lại phần hiển thị Step cho ngắn gọn)
  
  if (isRestricted) return <div className="h-screen flex items-center justify-center text-red-500 font-bold">Tài khoản bị hạn chế</div>;

  return (
    <div className="min-h-screen pb-32 pt-24 font-sans text-slate-800">
      <VisualEngine />
      <div className="fixed inset-0 -z-10 bg-gradient-to-br from-blue-50 to-white pointer-events-none"></div>
      
      <div className="mx-auto max-w-4xl px-4">
        <div className="flex justify-between items-end mb-8 animate-enter">
          <div>
            <h1 className="text-4xl font-black text-[#00418E]">{editId ? "Chỉnh Sửa" : "Đăng Tin Mới"}</h1>
            <p className="text-slate-500 font-medium">Tiếp cận hàng ngàn sinh viên BK.</p>
          </div>
          <button onClick={() => navigate('/market')} className="text-slate-400 hover:text-red-500"><X size={28}/></button>
        </div>

        {/* STEPPER UI */}
        <div className="glass-panel rounded-[2rem] p-8 animate-enter">
          {step === 1 && (
            <div className="space-y-6">
              <h3 className="text-2xl font-bold flex gap-2"><Camera className="text-blue-600"/> Chọn ảnh</h3>
              <div className="grid grid-cols-4 gap-4">
                {previewUrls.map((url, i) => (
                  <div key={i} className="relative aspect-square rounded-xl overflow-hidden border">
                    <img src={url} className="w-full h-full object-cover" />
                    <button onClick={() => setPreviewUrls(p => p.filter((_, idx) => idx !== i))} className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full"><X size={12}/></button>
                  </div>
                ))}
                {previewUrls.length < 8 && (
                  <label className="flex flex-col items-center justify-center aspect-square rounded-xl border-2 border-dashed border-blue-200 bg-blue-50 cursor-pointer hover:bg-blue-100">
                    <Upload className="text-blue-500 mb-2"/>
                    <span className="text-xs font-bold text-blue-600">Thêm ảnh</span>
                    <input type="file" hidden multiple onChange={handleImageUpload} />
                  </label>
                )}
              </div>
              <div className="flex justify-end"><button onClick={() => setStep(2)} className="px-6 py-3 bg-[#00418E] text-white rounded-xl font-bold">Tiếp tục</button></div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <h3 className="text-2xl font-bold flex gap-2"><FileText className="text-blue-600"/> Thông tin</h3>
              <div className="grid md:grid-cols-2 gap-6">
                <input placeholder="Tiêu đề" className="input-modern" value={state.title} onChange={e => dispatch({type: 'SET_FIELD', field: 'title', value: e.target.value})} />
                <input placeholder="Giá bán (VNĐ)" className="input-modern" value={state.price} onChange={e => dispatch({type: 'SET_FIELD', field: 'price', value: e.target.value})} />
                <select className="input-modern" value={state.category} onChange={e => dispatch({type: 'SET_FIELD', field: 'category', value: e.target.value})}>
                  {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
                <div className="flex gap-2">
                  {CONDITIONS.map(c => (
                    <button key={c.value} onClick={() => dispatch({type: 'SET_FIELD', field: 'condition', value: c.value})} className={`flex-1 rounded-xl border text-xs font-bold ${state.condition === c.value ? c.color : 'bg-white'}`}>{c.label}</button>
                  ))}
                </div>
              </div>
              <textarea placeholder="Mô tả chi tiết..." rows={4} className="input-modern" value={state.description} onChange={e => dispatch({type: 'SET_FIELD', field: 'description', value: e.target.value})} />
              <div className="flex justify-between">
                <button onClick={() => setStep(1)} className="text-slate-500 font-bold">Quay lại</button>
                <button onClick={() => setStep(3)} className="px-6 py-3 bg-[#00418E] text-white rounded-xl font-bold">Tiếp tục</button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <h3 className="text-2xl font-bold flex gap-2"><MapPin className="text-blue-600"/> Giao dịch</h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="font-bold text-slate-500 text-xs uppercase">Hình thức</label>
                  <div className="flex gap-4">
                    <button onClick={() => dispatch({type: 'SET_FIELD', field: 'tradeMethod', value: TradeMethod.DIRECT})} className={`flex-1 p-4 rounded-xl border-2 text-left ${state.tradeMethod === TradeMethod.DIRECT ? 'border-blue-500 bg-blue-50 text-blue-700' : 'bg-white'}`}>Gặp trực tiếp</button>
                    <button onClick={() => dispatch({type: 'SET_FIELD', field: 'tradeMethod', value: TradeMethod.SHIPPING})} className={`flex-1 p-4 rounded-xl border-2 text-left ${state.tradeMethod === TradeMethod.SHIPPING ? 'border-blue-500 bg-blue-50 text-blue-700' : 'bg-white'}`}>Ship COD</button>
                  </div>
                </div>
                {state.tradeMethod === TradeMethod.DIRECT && (
                  <div className="space-y-3">
                    <label className="font-bold text-slate-500 text-xs uppercase">Địa điểm</label>
                    <div className="flex flex-wrap gap-2">
                      {LOCATIONS.map(loc => (
                        <button key={loc} onClick={() => dispatch({type: 'SET_FIELD', field: 'location', value: loc})} className={`px-3 py-1.5 rounded-lg text-sm font-bold border ${state.location === loc ? 'bg-slate-800 text-white' : 'bg-white'}`}>{loc}</button>
                      ))}
                    </div>
                    <input className="input-modern" placeholder="Hoặc nhập địa điểm khác..." value={state.location} onChange={e => dispatch({type: 'SET_FIELD', field: 'location', value: e.target.value})} />
                  </div>
                )}
              </div>
              <div className="flex justify-between pt-6 border-t">
                <button onClick={() => setStep(2)} className="text-slate-500 font-bold">Quay lại</button>
                <button onClick={handleSubmit} disabled={isSubmitting} className="px-8 py-3 bg-gradient-to-r from-[#00418E] to-[#0065D1] text-white rounded-xl font-bold shadow-lg flex items-center gap-2">
                  {isSubmitting ? <Loader2 className="animate-spin"/> : <Rocket/>} Đăng Tin Ngay
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PostItemPage;
