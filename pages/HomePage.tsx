import React, { useState, useEffect, useReducer } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Upload,
  X,
  Image as ImageIcon,
  DollarSign,
  Tag,
  FileText,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Sparkles,
  Loader2,
  Info,
  Camera,
  Box,
  AlertCircle,
  MapPin,
  Wand2,
  Trash2,
  Edit3,
  Crop,
  RotateCcw,
  Save,
  Eye,
  Smartphone,
  Globe,
  BarChart3,
  Calendar,
  ShieldCheck,
  Zap,
  Layers,
  Maximize2,
  RefreshCw,
  Search,
  Rocket,
  Check,
  Monitor,
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
  {
    value: ProductCategory.TEXTBOOK,
    label: "Giáo trình & Tài liệu",
    icon: "📚",
  },
  { value: ProductCategory.ELECTRONICS, label: "Thiết bị điện tử", icon: "💻" },
  { value: ProductCategory.SUPPLIES, label: "Dụng cụ học tập", icon: "📐" },
  {
    value: ProductCategory.CLOTHING,
    label: "Thời trang sinh viên",
    icon: "👕",
  },
  { value: ProductCategory.OTHER, label: "Khác", icon: "📦" },
];

const CONDITIONS = [
  {
    value: ProductCondition.NEW,
    label: "Mới 100%",
    color: "bg-emerald-100 text-emerald-700 border-emerald-200",
  },
  {
    value: ProductCondition.LIKE_NEW,
    label: "Như mới (99%)",
    color: "bg-blue-100 text-blue-700 border-blue-200",
  },
  {
    value: ProductCondition.GOOD,
    label: "Tốt (90%)",
    color: "bg-indigo-100 text-indigo-700 border-indigo-200",
  },
  {
    value: ProductCondition.FAIR,
    label: "Chấp nhận được",
    color: "bg-orange-100 text-orange-700 border-orange-200",
  },
];

const LOCATIONS = [
  {
    id: "h6",
    name: "Sảnh H6 - Cơ sở Lý Thường Kiệt",
    coords: { x: 30, y: 40 },
  },
  { id: "b4", name: "Canteen B4", coords: { x: 60, y: 30 } },
  { id: "lib", name: "Thư viện Trung tâm", coords: { x: 45, y: 60 } },
  { id: "a4", name: "Tòa nhà A4", coords: { x: 20, y: 20 } },
  { id: "c6", name: "Khu C6", coords: { x: 80, y: 70 } },
];

// --- STYLES & ANIMATION COMPONENTS ---
const VisualEngine = () => (
  <style>{`
    :root { --primary: #00418E; --secondary: #00B0F0; }
    body { background-color: #F8FAFC; overflow-x: hidden; font-family: 'Inter', system-ui, sans-serif; }
    
    ::-webkit-scrollbar { width: 6px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: #CBD5E1; border-radius: 10px; }
    
    /* Animations */
    @keyframes slideUp { 
      from { opacity: 0; transform: translateY(20px) scale(0.98); } 
      to { opacity: 1; transform: translateY(0) scale(1); } 
    }
    @keyframes blob { 
      0% { transform: translate(0px, 0px) scale(1); } 
      33% { transform: translate(30px, -50px) scale(1.1); } 
      66% { transform: translate(-20px, 20px) scale(0.9); } 
      100% { transform: translate(0px, 0px) scale(1); } 
    }
    
    .animate-enter { animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; opacity: 0; }
    .animate-blob { animation: blob 10s infinite; }
    .animation-delay-2000 { animation-delay: 2s; }
    .animation-delay-4000 { animation-delay: 4s; }
    
    /* Glass Panel */
    .glass-panel { 
      background: rgba(255, 255, 255, 0.75); 
      backdrop-filter: blur(24px); 
      -webkit-backdrop-filter: blur(24px);
      border: 1px solid rgba(255, 255, 255, 0.6); 
      box-shadow: 0 20px 50px -12px rgba(0, 0, 0, 0.1); 
      transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); 
    }
    
    /* Inputs */
    .input-modern { 
      width: 100%; padding: 16px; border-radius: 16px; 
      border: 2px solid transparent; 
      background: #F1F5F9; 
      color: #1E293B; font-weight: 600; 
      transition: all 0.3s ease; 
      outline: none; 
    }
    .input-modern:focus { 
      background: white; 
      border-color: var(--primary); 
      box-shadow: 0 0 0 4px rgba(0, 65, 142, 0.1); 
      transform: translateY(-2px);
    }
    
    .hover-scale { transition: transform 0.2s; }
    .hover-scale:hover { transform: scale(1.02); }
    .active-scale:active { transform: scale(0.98); }

    .map-grid { background-image: linear-gradient(#e5e7eb 1px, transparent 1px), linear-gradient(90deg, #e5e7eb 1px, transparent 1px); background-size: 20px 20px; }
  `}</style>
);

const AnimatedBackground = () => (
  <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
    <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-300/30 rounded-full mix-blend-multiply filter blur-[100px] animate-blob"></div>
    <div className="absolute top-0 right-1/4 w-96 h-96 bg-purple-300/30 rounded-full mix-blend-multiply filter blur-[100px] animate-blob animation-delay-2000"></div>
    <div className="absolute -bottom-32 left-1/3 w-96 h-96 bg-cyan-300/30 rounded-full mix-blend-multiply filter blur-[100px] animate-blob animation-delay-4000"></div>
    <div className="absolute inset-0 bg-white/30 backdrop-blur-[1px]"></div>
  </div>
);

const StepWizard = ({
  current,
  steps,
  onJump,
}: {
  current: number;
  steps: string[];
  onJump: (s: number) => void;
}) => (
  <div className="mx-auto mb-12 w-full max-w-4xl px-4">
    <div className="relative flex items-center justify-between">
      <div className="absolute top-1/2 left-0 -z-10 h-1.5 w-full rounded-full bg-white/50 shadow-inner"></div>
      <div
        className="absolute top-1/2 left-0 h-1.5 rounded-full bg-gradient-to-r from-blue-600 via-cyan-500 to-blue-600 transition-all duration-700 ease-out"
        style={{ width: `${((current - 1) / (steps.length - 1)) * 100}%` }}
      ></div>
      {steps.map((label, idx) => {
        const stepNum = idx + 1;
        const isActive = stepNum === current;
        const isDone = stepNum < current;
        return (
          <button
            key={idx}
            onClick={() => isDone && onJump(stepNum)}
            disabled={!isDone}
            className={`group flex flex-col items-center gap-3 transition-all ${isDone ? "cursor-pointer" : "cursor-default"}`}
          >
            <div
              className={`z-10 flex h-12 w-12 items-center justify-center rounded-full border-[3px] text-sm font-bold transition-all duration-500 ${
                isActive 
                  ? "scale-125 border-blue-500 bg-white text-blue-600 shadow-xl shadow-blue-500/30" 
                  : isDone 
                    ? "border-transparent bg-gradient-to-br from-green-400 to-green-600 text-white shadow-lg shadow-green-500/30 scale-100" 
                    : "border-slate-200 bg-white text-slate-300 scale-90"
              }`}
            >
              {isDone ? <Check size={20} strokeWidth={3} /> : stepNum}
            </div>
            <span
              className={`text-[10px] font-bold tracking-widest uppercase transition-all duration-300 ${
                isActive ? "text-blue-700 translate-y-0 opacity-100" : "text-slate-400 translate-y-1 opacity-70"
              }`}
            >
              {label}
            </span>
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
  | { type: "SET_FIELD"; field: keyof FormState; value: any }
  | { type: "RESET"; payload: FormState }
  | { type: "ADD_TAG"; tag: string }
  | { type: "REMOVE_TAG"; tag: string };

const formReducer = (state: FormState, action: Action): FormState => {
  switch (action.type) {
    case "SET_FIELD":
      return { ...state, [action.field]: action.value };
    case "RESET":
      return action.payload;
    case "ADD_TAG":
      return state.tags.includes(action.tag)
        ? state
        : { ...state, tags: [...state.tags, action.tag] };
    case "REMOVE_TAG":
      return { ...state, tags: state.tags.filter((t) => t !== action.tag) };
    default:
      return state;
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
  const [editImageIdx, setEditImageIdx] = useState<number | null>(null);
  const [showSaveDraft, setShowSaveDraft] = useState(false);
  const [priceAnalysis, setPriceAnalysis] = useState<
    "low" | "good" | "high" | null
  >(null);

  const [state, dispatch] = useReducer(formReducer, {
    title: "",
    description: "",
    price: "",
    category: ProductCategory.TEXTBOOK,
    condition: ProductCondition.GOOD,
    tradeMethod: TradeMethod.DIRECT,
    location: LOCATIONS[0].name,
    tags: [],
  });

  useEffect(() => {
    const savedDraft = localStorage.getItem("post_draft");
    if (savedDraft && !editId) setShowSaveDraft(true);
    if (editId) {
      const load = async () => {
        const { data } = await supabase
          .from("products")
          .select("*")
          .eq("id", editId)
          .single();
        if (data) {
          dispatch({
            type: "RESET",
            payload: {
              title: data.title,
              description: data.description,
              price: data.price.toString(),
              category: data.category as ProductCategory,
              condition: data.condition as ProductCondition,
              tradeMethod: data.trade_method as TradeMethod,
              location: "Sảnh H6",
              tags: [],
            },
          });
          setPreviewUrls(data.images || []);
        }
      };
      load();
    }
  }, [editId]);

  useEffect(() => {
    if (!editId) {
      const timer = setTimeout(() => {
        localStorage.setItem(
          "post_draft",
          JSON.stringify({ ...state, previewUrls }),
        );
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [state, previewUrls, editId]);

  const restoreDraft = () => {
    const saved = localStorage.getItem("post_draft");
    if (saved) {
      const parsed = JSON.parse(saved);
      dispatch({ type: "RESET", payload: parsed });
      setPreviewUrls(parsed.previewUrls || []);
      addToast("Đã khôi phục bản nháp!", "success");
      setShowSaveDraft(false);
    }
  };

  const clearDraft = () => {
    localStorage.removeItem("post_draft");
    setShowSaveDraft(false);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      if (images.length + files.length > 8)
        return addToast("Tối đa 8 ảnh.", "error");
      const newUrls = files.map((f) => URL.createObjectURL(f));
      setImages([...images, ...files]);
      setPreviewUrls([...previewUrls, ...newUrls]);
    }
  };

  const analyzeImageAI = () => {
    if (previewUrls.length === 0)
      return addToast("Cần ít nhất 1 ảnh để phân tích", "warning");
    setAiAnalyzing(true);
    setTimeout(() => {
      dispatch({
        type: "SET_FIELD",
        field: "title",
        value: "Máy tính Casio FX-580VN X Chính hãng",
      });
      dispatch({
        type: "SET_FIELD",
        field: "category",
        value: ProductCategory.SUPPLIES,
      });
      dispatch({
        type: "SET_FIELD",
        field: "condition",
        value: ProductCondition.LIKE_NEW,
      });
      dispatch({ type: "SET_FIELD", field: "price", value: "550000" });
      dispatch({
        type: "SET_FIELD",
        field: "description",
        value:
          "Máy tính khoa học Casio FX-580VN X, tốc độ xử lý nhanh, màn hình độ phân giải cao. Phù hợp cho sinh viên Bách Khoa thi Đại cương. Còn bảo hành 6 tháng.",
      });
      dispatch({ type: "ADD_TAG", tag: "Casio" });
      dispatch({ type: "ADD_TAG", tag: "Máy tính" });
      setAiAnalyzing(false);
      addToast("AI đã điền thông tin gợi ý!", "success");
    }, 2500);
  };

  useEffect(() => {
    const raw = state.price.replace(/\D/g, "");
    const p = parseInt(raw);
    if (!p) setPriceAnalysis(null);
    else if (p < 100000) setPriceAnalysis("low");
    else if (p > 1000000) setPriceAnalysis("high");
    else setPriceAnalysis("good");
  }, [state.price]);

  const formatPrice = (val: string) => {
    const raw = val.replace(/\D/g, "");
    return raw.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  // Helper function to compress images
  const compressImage = (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX_WIDTH = 1200;
          const MAX_HEIGHT = 1200;
          let width = img.width;
          let height = img.height;

          // Maintain aspect ratio
          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (!ctx) return reject(new Error("Failed to get canvas context"));

          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (blob) {
                // Create new file with compressed blob
                const newFile = new File(
                  [blob],
                  file.name.replace(/\.[^/.]+$/, ".jpg"),
                  {
                    type: "image/jpeg",
                    lastModified: Date.now(),
                  },
                );
                resolve(newFile);
              } else {
                reject(new Error("Compression failed"));
              }
            },
            "image/jpeg",
            0.7,
          ); // 0.7 quality = ~70% size reduction
        };
        img.onerror = (error) => reject(error);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleSubmit = async () => {
    if (!user) return navigate("/auth");
    if (!state.title || !state.price)
      return addToast("Thiếu thông tin bắt buộc", "error");
    setIsSubmitting(true);

    try {
      let finalUrls = previewUrls.filter((u) => u.startsWith("http"));

      if (images.length > 0) {
        // Show loading state
        addToast("Đang nén và tải ảnh lên...", "info");

        const uploaded = await Promise.all(
          images.map(async (file) => {
            try {
              // 1. Compress image
              const compressedFile = await compressImage(file);

              // 2. Upload to Supabase
              const path = `${user.id}/${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
              const { error: uploadError } = await supabase.storage
                .from("product-images")
                .upload(path, compressedFile);

              if (uploadError) throw uploadError;

              // 3. Get Public URL
              const { data: urlData } = supabase.storage
                .from("product-images")
                .getPublicUrl(path);

              return urlData.publicUrl;
            } catch (err) {
              console.error("Error uploading file:", file.name, err);
              throw new Error(`Lỗi khi tải ảnh ${file.name}`);
            }
          }),
        );

        finalUrls = [...finalUrls, ...uploaded];
      }

      const payload = {
        title: state.title,
        description: state.description,
        price: parseInt(state.price.replace(/\./g, "")),
        category: state.category,
        condition: state.condition,
        trade_method: state.tradeMethod,
        images: finalUrls,
        seller_id: user.id,
        status: "available",
      };

      const { error: dbError } = editId
        ? await supabase.from("products").update(payload).eq("id", editId)
        : await supabase.from("products").insert(payload);

      if (dbError) throw dbError;

      localStorage.removeItem("post_draft");
      addToast(
        editId ? "Cập nhật thành công!" : "Đăng tin thành công!",
        "success",
      );
      navigate("/market");
    } catch (e: any) {
      console.error(e);
      addToast(e.message || "Lỗi hệ thống khi đăng tin", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Safe user access
  const getUserName = () => user?.name || "Bạn";
  const getUserAvatar = () => user?.avatar || "https://via.placeholder.com/40";

  if (isRestricted)
    return (
      <div className="flex h-screen items-center justify-center bg-slate-100 font-bold text-red-500">
        <AlertCircle className="mr-2" />
        Tài khoản bị hạn chế
      </div>
    );

  return (
    <div className="min-h-screen pb-32 font-sans text-slate-800">
      <VisualEngine />
      <AnimatedBackground />

      {/* --- FLOATING DRAFT RESTORE --- */}
      {showSaveDraft && (
        <div className="animate-enter fixed bottom-8 left-1/2 z-50 flex w-[90%] max-w-lg -translate-x-1/2 items-center gap-6 rounded-2xl border border-white/20 bg-slate-900/90 backdrop-blur-md px-6 py-4 text-white shadow-2xl transition-all hover:-translate-y-1">
          <div className="flex-1">
            <p className="text-sm font-bold flex items-center gap-2"><Save size={16} className="text-yellow-400" /> Phát hiện bản nháp cũ</p>
            <p className="text-xs text-slate-400">Bạn có muốn khôi phục nội dung trước đó?</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={clearDraft}
              className="rounded-lg px-4 py-2 text-xs font-bold transition hover:bg-white/10"
            >
              Hủy bỏ
            </button>
            <button
              onClick={restoreDraft}
              className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold shadow-lg shadow-blue-500/30 transition hover:bg-blue-500"
            >
              Khôi phục
            </button>
          </div>
        </div>
      )}

      {/* --- AI ANALYZING OVERLAY --- */}
      {aiAnalyzing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md transition-all">
          <div className="relative w-full max-w-sm overflow-hidden rounded-[2.5rem] bg-white p-10 text-center shadow-2xl animate-enter">
            <div className="absolute inset-0 z-0 bg-gradient-to-br from-indigo-50 via-white to-purple-50"></div>
            <div className="relative z-10">
              <div className="relative mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-white shadow-xl shadow-indigo-200/50">
                <Sparkles size={48} className="animate-pulse text-indigo-600" />
                <div className="absolute inset-0 animate-ping rounded-full border-4 border-indigo-100 duration-1000"></div>
                <div className="absolute inset-0 animate-ping rounded-full border-4 border-indigo-50 duration-1000 delay-300"></div>
              </div>
              <h3 className="mb-2 text-2xl font-black text-slate-900 tracking-tight">
                Gemini AI
              </h3>
              <p className="font-medium text-slate-500 text-sm">
                Đang phân tích hình ảnh & trích xuất thông tin...
              </p>
            </div>
          </div>
        </div>
      )}

      {/* --- HEADER --- */}
      <div className="mx-auto max-w-5xl px-4 pt-24">
        <div className="animate-enter mb-12 flex items-end justify-between">
          <div>
            <h1 className="mb-2 text-4xl font-black tracking-tight text-[#00418E] md:text-6xl drop-shadow-sm">
              {editId ? "Hiệu Chỉnh" : "Đăng Tin Mới"}
            </h1>
            <p className="flex items-center gap-2 font-medium text-slate-500 pl-1">
              <Zap size={18} className="text-yellow-500 fill-yellow-500" /> AI hỗ trợ điền thông tin tự động siêu tốc
            </p>
          </div>
          <button
            onClick={() => navigate("/market")}
            className="hidden items-center gap-2 font-bold text-slate-400 transition-all hover:text-red-500 hover:rotate-90 duration-300 md:flex rounded-full p-2 hover:bg-red-50"
          >
            <X size={28} />
          </button>
        </div>

        {/* --- STEPPER --- */}
        <StepWizard
          current={step}
          steps={[
            "Thư viện ảnh",
            "Chi tiết sản phẩm",
            "Phương thức & Vị trí",
            "Kiểm tra & Đăng",
          ]}
          onJump={setStep}
        />

        {/* --- STEP 1: IMAGES --- */}
        {step === 1 && (
          <div className="glass-panel animate-enter rounded-[2.5rem] p-8 md:p-12">
            <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <h3 className="flex items-center gap-3 text-2xl font-bold text-slate-800">
                <div className="p-3 bg-blue-100 rounded-2xl text-blue-600"><Camera size={24} /></div>
                Thư viện ảnh
              </h3>
              <span className="rounded-full bg-blue-50 px-4 py-2 text-sm font-bold text-blue-700 border border-blue-100">
                {previewUrls.length}/8 ảnh đã chọn
              </span>
            </div>
            <div className="grid grid-cols-1 gap-12 md:grid-cols-2">
              {/* Image Grid */}
              <div className="order-2 md:order-1">
                <div className="mb-6 grid grid-cols-3 gap-4">
                  {previewUrls.map((url, idx) => (
                    <div
                      key={idx}
                      className="group relative aspect-square cursor-pointer overflow-hidden rounded-2xl border-2 border-white bg-white shadow-md transition-all hover:scale-105 hover:shadow-xl"
                      onClick={() => setEditImageIdx(idx)}
                    >
                      <img
                        src={url}
                        className="h-full w-full object-cover"
                      />
                      <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/40 opacity-0 transition-all duration-300 group-hover:opacity-100 backdrop-blur-sm">
                        <button
                          onClick={(e) => { e.stopPropagation(); }}
                          className="rounded-full bg-white p-2 text-slate-800 hover:bg-blue-50 hover:text-blue-600 transition-colors shadow-lg"
                        >
                          <Edit3 size={16} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreviewUrls((p) => p.filter((_, i) => i !== idx));
                          }}
                          className="rounded-full bg-white p-2 text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors shadow-lg"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      {idx === 0 && (
                        <span className="absolute top-2 left-2 rounded-lg bg-blue-600/90 backdrop-blur px-2 py-1 text-[10px] font-bold text-white shadow-md">
                          Ảnh bìa
                        </span>
                      )}
                    </div>
                  ))}
                  {previewUrls.length < 8 && (
                    <label className="group flex aspect-square cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/50 transition-all hover:border-blue-500 hover:bg-blue-50/50 hover:scale-105 active:scale-95">
                      <div className="mb-3 rounded-full bg-white p-4 shadow-sm transition-transform group-hover:scale-110 group-hover:rotate-12">
                        <Upload size={24} className="text-blue-500" />
                      </div>
                      <span className="text-xs font-bold text-slate-500 group-hover:text-blue-600">
                        Thêm ảnh
                      </span>
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageUpload}
                      />
                    </label>
                  )}
                </div>
              </div>
              
              {/* Preview Area */}
              <div className="order-1 flex flex-col items-center justify-center rounded-[2rem] border border-slate-100 bg-gradient-to-b from-slate-50 to-white p-8 text-center md:order-2 shadow-inner">
                <div className="group relative mb-6 aspect-4/3 w-full overflow-hidden rounded-2xl border border-white bg-white shadow-xl transition-all hover:shadow-2xl">
                  {previewUrls.length > 0 ? (
                    <>
                      <img
                        src={previewUrls[editImageIdx || 0]}
                        className="h-full w-full object-contain p-4"
                      />
                      <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2 rounded-2xl border border-white/50 bg-white/80 p-2 opacity-0 shadow-lg backdrop-blur transition-all group-hover:opacity-100 transform translate-y-4 group-hover:translate-y-0">
                        <button className="rounded-xl p-2 hover:bg-blue-50 hover:text-blue-600 transition-colors">
                          <RotateCcw size={18} />
                        </button>
                        <button className="rounded-xl p-2 hover:bg-blue-50 hover:text-blue-600 transition-colors">
                          <Crop size={18} />
                        </button>
                        <button className="rounded-xl p-2 hover:bg-blue-50 hover:text-blue-600 transition-colors">
                          <Layers size={18} />
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center text-slate-300">
                      <ImageIcon size={64} className="mb-4 opacity-50" />
                      <p className="text-sm font-medium">Chưa có ảnh nào được chọn</p>
                    </div>
                  )}
                </div>
                <p className="text-xs text-slate-400 max-w-xs">
                  Mẹo: Ảnh đầu tiên sẽ là ảnh bìa hiển thị ngoài trang chủ. Hãy chọn ảnh đẹp nhất!
                </p>
              </div>
            </div>
            
            <div className="mt-12 flex justify-end border-t border-slate-100 pt-6">
              <button
                onClick={() => {
                  if (previewUrls.length === 0)
                    return addToast("Cần ít nhất 1 ảnh", "warning");
                  setStep(2);
                }}
                className="group flex items-center gap-3 rounded-2xl bg-[#00418E] px-10 py-4 font-bold text-white shadow-xl shadow-blue-900/20 transition-all hover:bg-[#003370] hover:scale-105 active:scale-95"
              >
                Tiếp tục <ArrowRight size={20} className="transition-transform group-hover:translate-x-1" />
              </button>
            </div>
          </div>
        )}

        {/* --- STEP 2: DETAILS --- */}
        {step === 2 && (
          <div className="glass-panel animate-enter rounded-[2.5rem] p-8 md:p-12">
            <div className="mb-10 flex items-center justify-between">
              <h3 className="flex items-center gap-3 text-2xl font-bold text-slate-800">
                <div className="p-3 bg-blue-100 rounded-2xl text-blue-600"><FileText size={24} /></div>
                Chi tiết sản phẩm
              </h3>
              <button
                onClick={analyzeImageAI}
                className="group flex items-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-3 text-xs font-bold text-white shadow-lg shadow-indigo-500/30 transition-all hover:scale-105 hover:shadow-indigo-500/50 active:scale-95"
              >
                <Wand2 size={16} className="group-hover:rotate-12 transition-transform" /> AI Auto-Fill
              </button>
            </div>
            <div className="grid grid-cols-1 gap-12 md:grid-cols-12">
              <div className="space-y-8 md:col-span-8">
                <div className="space-y-2">
                  <label className="ml-1 block text-xs font-extrabold text-slate-500 uppercase tracking-wider">
                    Tiêu đề tin đăng
                  </label>
                  <input
                    value={state.title}
                    onChange={(e) =>
                      dispatch({
                        type: "SET_FIELD",
                        field: "title",
                        value: e.target.value,
                      })
                    }
                    className="input-modern text-lg"
                    placeholder="VD: Giáo trình Giải tích 1 - NXB ĐHQG"
                  />
                </div>
                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="ml-1 block text-xs font-extrabold text-slate-500 uppercase tracking-wider">
                      Danh mục
                    </label>
                    <div className="relative">
                      <select
                        value={state.category}
                        onChange={(e) =>
                          dispatch({
                            type: "SET_FIELD",
                            field: "category",
                            value: e.target.value,
                          })
                        }
                        className="input-modern cursor-pointer appearance-none"
                      >
                        {CATEGORIES.map((c) => (
                          <option key={c.value} value={c.value}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                        {CATEGORIES.find(c => c.value === state.category)?.icon}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="ml-1 block text-xs font-extrabold text-slate-500 uppercase tracking-wider">
                      Giá bán
                    </label>
                    <div className="relative">
                      <input
                        value={formatPrice(state.price)}
                        onChange={(e) =>
                          dispatch({
                            type: "SET_FIELD",
                            field: "price",
                            value: e.target.value.replace(/\./g, ""),
                          })
                        }
                        className="input-modern pl-10 font-mono text-lg font-bold text-slate-800"
                        placeholder="0"
                      />
                      <span className="absolute top-1/2 left-4 -translate-y-1/2 font-bold text-slate-400">
                        ₫
                      </span>
                      {priceAnalysis && (
                        <div
                          className={`absolute top-1/2 right-4 -translate-y-1/2 rounded-lg px-3 py-1 text-[10px] font-bold uppercase tracking-wider shadow-sm animate-enter ${priceAnalysis === "low" ? "bg-green-100 text-green-700" : priceAnalysis === "high" ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"}`}
                        >
                          {priceAnalysis === "low"
                            ? "Giá tốt"
                            : priceAnalysis === "high"
                              ? "Giá cao"
                              : "Hợp lý"}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="ml-1 block text-xs font-extrabold text-slate-500 uppercase tracking-wider">
                    Mô tả chi tiết
                  </label>
                  <div className="overflow-hidden rounded-2xl border-2 border-transparent bg-[#F1F5F9] transition-all focus-within:border-[#00418E] focus-within:bg-white focus-within:shadow-lg focus-within:shadow-blue-500/10">
                    <div className="flex gap-2 border-b border-slate-200/50 bg-slate-100/50 p-2">
                      {["B", "I", "U", "•", "Link"].map((t) => (
                        <button
                          key={t}
                          className="rich-toolbar-btn h-8 w-8 flex items-center justify-center text-xs font-bold bg-white rounded-lg shadow-sm hover:scale-105 active:scale-95"
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                    <textarea
                      rows={6}
                      value={state.description}
                      onChange={(e) =>
                        dispatch({
                          type: "SET_FIELD",
                          field: "description",
                          value: e.target.value,
                        })
                      }
                      className="w-full resize-none bg-transparent p-4 leading-relaxed text-slate-700 outline-none placeholder:text-slate-400"
                      placeholder="Mô tả kỹ hơn về tình trạng, thời gian mua, lý do bán..."
                    />
                  </div>
                </div>
              </div>
              
              <div className="space-y-8 md:col-span-4">
                <div className="rounded-3xl border border-white bg-white/60 p-6 shadow-sm backdrop-blur-sm">
                  <label className="mb-4 block text-xs font-extrabold text-slate-500 uppercase tracking-wider">
                    Tình trạng
                  </label>
                  <div className="space-y-3">
                    {CONDITIONS.map((c) => (
                      <button
                        key={c.value}
                        onClick={() =>
                          dispatch({
                            type: "SET_FIELD",
                            field: "condition",
                            value: c.value,
                          })
                        }
                        className={`group flex w-full items-center justify-between rounded-xl border-2 p-3.5 text-left text-sm font-bold transition-all hover:scale-[1.02] active:scale-[0.98] ${state.condition === c.value ? c.color + " shadow-md" : "border-transparent bg-white text-slate-500 hover:bg-slate-50"}`}
                      >
                        {c.label}{" "}
                        {state.condition === c.value && (
                          <CheckCircle2 size={18} className="animate-enter" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="rounded-3xl border border-white bg-white/60 p-6 shadow-sm backdrop-blur-sm">
                  <label className="mb-4 block text-xs font-extrabold text-slate-500 uppercase tracking-wider">
                    Tags
                  </label>
                  <div className="mb-4 flex flex-wrap gap-2">
                    {state.tags.map((t) => (
                      <span
                        key={t}
                        className="animate-enter flex items-center gap-1 rounded-lg bg-blue-100 px-2.5 py-1.5 text-xs font-bold text-blue-700 shadow-sm"
                      >
                        #{t}{" "}
                        <button
                          onClick={() =>
                            dispatch({ type: "REMOVE_TAG", tag: t })
                          }
                          className="hover:text-red-500"
                        >
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="relative">
                    <input
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          const val = e.currentTarget.value.trim();
                          if (val) {
                            dispatch({ type: "ADD_TAG", tag: val });
                            e.currentTarget.value = "";
                          }
                        }
                      }}
                      placeholder="Thêm tag..."
                      className="w-full rounded-xl border-none bg-white px-4 py-3 text-sm shadow-inner transition-all focus:ring-2 focus:ring-blue-100"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                      <Tag size={14} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-12 flex justify-between border-t border-slate-100 pt-6">
              <button
                onClick={() => setStep(1)}
                className="group flex items-center gap-2 rounded-2xl px-8 py-3 font-bold text-slate-500 transition hover:bg-white hover:text-slate-700 hover:shadow-lg"
              >
                <ArrowLeft size={18} className="transition-transform group-hover:-translate-x-1" /> Quay lại
              </button>
              <button
                onClick={() => {
                  if (!state.title || !state.price)
                    return addToast("Điền đủ thông tin!", "warning");
                  setStep(3);
                }}
                className="group flex items-center gap-3 rounded-2xl bg-[#00418E] px-10 py-4 font-bold text-white shadow-xl shadow-blue-900/20 transition-all hover:bg-[#003370] hover:scale-105 active:scale-95"
              >
                Tiếp tục <ArrowRight size={20} className="transition-transform group-hover:translate-x-1" />
              </button>
            </div>
          </div>
        )}

        {/* --- STEP 3: LOCATION --- */}
        {step === 3 && (
          <div className="glass-panel animate-enter rounded-[2.5rem] p-8 md:p-12">
            <h3 className="mb-8 flex items-center gap-3 text-2xl font-bold text-slate-800">
              <div className="p-3 bg-blue-100 rounded-2xl text-blue-600"><MapPin size={24} /></div>
              Phương thức giao dịch
            </h3>
            <div className="mb-10 grid grid-cols-1 gap-12 md:grid-cols-2">
              <div className="space-y-6">
                <label className="ml-1 block text-xs font-extrabold text-slate-500 uppercase tracking-wider">
                  Hình thức
                </label>
                <div className="flex flex-col gap-4">
                  {[
                    {
                      val: TradeMethod.DIRECT,
                      icon: <MapPin />,
                      label: "Gặp trực tiếp",
                      desc: "An toàn, không phí, kiểm tra hàng tại chỗ",
                    },
                    {
                      val: TradeMethod.SHIPPING,
                      icon: <Box />,
                      label: "Giao hàng (Ship)",
                      desc: "Tiện lợi, có phí ship, phù hợp ở xa",
                    },
                  ].map((m: any) => (
                    <button
                      key={m.val}
                      onClick={() =>
                        dispatch({
                          type: "SET_FIELD",
                          field: "tradeMethod",
                          value: m.val,
                        })
                      }
                      className={`group relative flex items-start gap-4 rounded-3xl border-2 p-5 text-left transition-all hover:scale-[1.02] active:scale-[0.98] ${state.tradeMethod === m.val ? "border-blue-500 bg-blue-50 shadow-lg shadow-blue-500/10" : "border-transparent bg-white shadow-sm hover:border-slate-200"}`}
                    >
                      <div
                        className={`rounded-2xl p-3 transition-colors ${state.tradeMethod === m.val ? "bg-blue-100 text-blue-600" : "bg-slate-100 text-slate-400 group-hover:bg-slate-200"}`}
                      >
                        {m.icon}
                      </div>
                      <div>
                        <div
                          className={`text-lg font-bold ${state.tradeMethod === m.val ? "text-blue-900" : "text-slate-700"}`}
                        >
                          {m.label}
                        </div>
                        <div className="mt-1 text-sm font-medium text-slate-400">
                          {m.desc}
                        </div>
                      </div>
                      {state.tradeMethod === m.val && <div className="absolute top-5 right-5 text-blue-500"><CheckCircle2 className="animate-enter" /></div>}
                    </button>
                  ))}
                </div>
              </div>
              
              {state.tradeMethod === TradeMethod.DIRECT && (
                <div className="space-y-6 animate-enter">
                  <label className="ml-1 block text-xs font-extrabold text-slate-500 uppercase tracking-wider">
                    Địa điểm hẹn gặp
                  </label>
                  <div className="map-grid group relative h-64 w-full cursor-crosshair overflow-hidden rounded-3xl border-4 border-white bg-slate-100 p-1 shadow-inner">
                    {LOCATIONS.map((loc) => (
                      <button
                        key={loc.id}
                        onClick={() =>
                          dispatch({
                            type: "SET_FIELD",
                            field: "location",
                            value: loc.name,
                          })
                        }
                        style={{
                          left: `${loc.coords.x}%`,
                          top: `${loc.coords.y}%`,
                        }}
                        className={`group/pin absolute -translate-x-1/2 -translate-y-1/2 transform transition-all duration-500 cubic-bezier(0.34, 1.56, 0.64, 1) ${state.location === loc.name ? "z-20 scale-125" : "z-10 hover:scale-110"}`}
                      >
                        <MapPin
                          size={40}
                          className={`${state.location === loc.name ? "fill-red-500 text-red-600 drop-shadow-lg" : "fill-slate-300 text-slate-400 drop-shadow-md"} transition-colors`}
                        />
                        <span
                          className={`absolute top-full left-1/2 mt-1 -translate-x-1/2 whitespace-nowrap rounded-lg bg-white/90 px-3 py-1 text-[10px] font-bold backdrop-blur-sm shadow-lg transition-all ${state.location === loc.name ? "text-red-600 scale-100 opacity-100" : "text-slate-500 scale-90 opacity-0 group-hover/pin:scale-100 group-hover/pin:opacity-100"}`}
                        >
                          {loc.name}
                        </span>
                      </button>
                    ))}
                    <div className="absolute right-3 bottom-3 rounded-xl border border-white/50 bg-white/80 px-4 py-2 text-xs font-bold text-slate-600 shadow-lg backdrop-blur-md flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                      Đang chọn: <span className="text-blue-600">{state.location}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar">
                    {LOCATIONS.map(loc => (
                      <button 
                        key={loc.id} 
                        onClick={() => dispatch({type: 'SET_FIELD', field: 'location', value: loc.name})}
                        className={`whitespace-nowrap px-4 py-2 rounded-xl text-xs font-bold transition-all border ${state.location === loc.name ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'}`}
                      >
                        {loc.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="mt-12 flex justify-between border-t border-slate-100 pt-6">
              <button
                onClick={() => setStep(2)}
                className="group flex items-center gap-2 rounded-2xl px-8 py-3 font-bold text-slate-500 transition hover:bg-white hover:text-slate-700 hover:shadow-lg"
              >
                <ArrowLeft size={18} className="transition-transform group-hover:-translate-x-1" /> Quay lại
              </button>
              <button
                onClick={() => setStep(4)}
                className="group flex items-center gap-3 rounded-2xl bg-[#00418E] px-10 py-4 font-bold text-white shadow-xl shadow-blue-900/20 transition-all hover:bg-[#003370] hover:scale-105 active:scale-95"
              >
                Tiếp tục <ArrowRight size={20} className="transition-transform group-hover:translate-x-1" />
              </button>
            </div>
          </div>
        )}

        {/* --- STEP 4: PREVIEW & SUBMIT --- */}
        {step === 4 && (
          <div className="animate-enter grid grid-cols-1 gap-8 lg:grid-cols-2">
            {/* DEVICE PREVIEW */}
            <div className="glass-panel flex flex-col justify-center items-center rounded-[2.5rem] p-8 bg-slate-200/50">
              <h3 className="mb-8 text-center text-2xl font-bold text-slate-700 flex items-center gap-2">
                <Smartphone className="text-slate-500"/> Xem trước (Mobile)
              </h3>
              <div className="relative mx-auto aspect-[9/19] w-[320px] overflow-hidden rounded-[3rem] border-8 border-slate-800 bg-white shadow-2xl transition-transform hover:scale-[1.02]">
                {/* Notch */}
                <div className="absolute top-0 left-1/2 z-20 h-7 w-36 -translate-x-1/2 rounded-b-2xl bg-slate-800"></div>
                
                {/* Content */}
                <div className="hide-scrollbar h-full overflow-y-auto bg-slate-50 pb-20">
                  {/* Image */}
                  <div className="relative aspect-square">
                    <img
                      src={previewUrls[0]}
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute top-4 left-4 z-10 flex gap-2">
                       <button className="bg-black/40 backdrop-blur-md text-white p-2 rounded-full"><ArrowLeft size={18}/></button>
                    </div>
                    <div className="absolute bottom-0 left-0 h-32 w-full bg-gradient-to-t from-black/80 to-transparent"></div>
                    <div className="absolute bottom-6 left-6">
                       <span className="text-white/80 text-xs font-bold uppercase tracking-wider bg-white/20 backdrop-blur px-2 py-1 rounded-lg mb-2 inline-block">
                         {CATEGORIES.find(c => c.value === state.category)?.label}
                       </span>
                       <div className="text-2xl font-bold text-white mt-1">
                        {parseInt(state.price.replace(/\./g, "")).toLocaleString()}đ
                       </div>
                    </div>
                  </div>
                  
                  {/* Body */}
                  <div className="space-y-4 p-6 -mt-4 relative z-10 bg-white rounded-t-3xl shadow-lg">
                    <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-2"></div>
                    <div>
                      <h4 className="text-xl font-black text-slate-900 leading-tight">
                        {state.title}
                      </h4>
                      <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
                        <span className="shrink-0 rounded-lg bg-blue-50 px-3 py-1.5 text-[10px] font-bold text-blue-700 uppercase tracking-wider">
                          {CONDITIONS.find(c => c.value === state.condition)?.label}
                        </span>
                        <span className="shrink-0 rounded-lg bg-slate-100 px-3 py-1.5 text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                          {state.tradeMethod === TradeMethod.DIRECT ? "Trực tiếp" : "Ship COD"}
                        </span>
                      </div>
                    </div>
                    
                    <div className="py-4 border-y border-slate-100 flex items-center gap-3">
                       <img src={getUserAvatar()} className="w-10 h-10 rounded-full bg-slate-200 object-cover" />
                       <div>
                          <p className="text-xs font-bold text-slate-900">{getUserName()}</p>
                          <div className="flex gap-1">
                             {[1,2,3,4,5].map(i => <div key={i} className="w-2 h-2 rounded-full bg-yellow-400"></div>)}
                          </div>
                       </div>
                       <button className="ml-auto text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full">Xem trang</button>
                    </div>

                    <div>
                      <h5 className="font-bold text-sm text-slate-900 mb-2">Mô tả</h5>
                      <p className="text-sm leading-relaxed text-slate-500">
                        {state.description || "Chưa có mô tả..."}
                      </p>
                    </div>
                    
                    <div className="flex gap-2 mt-4">
                        {state.tags.map(t => <span key={t} className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded">#{t}</span>)}
                    </div>
                  </div>
                </div>
                
                {/* Bottom Bar Mockup */}
                <div className="absolute bottom-0 w-full bg-white border-t p-4 flex gap-3 z-20">
                   <button className="flex-1 bg-blue-600 text-white font-bold py-3 rounded-xl shadow-lg shadow-blue-500/30 text-sm">Nhắn tin</button>
                   <button className="flex-1 bg-slate-900 text-white font-bold py-3 rounded-xl shadow-lg text-sm">Mua ngay</button>
                </div>
              </div>
            </div>
            
            {/* CHECKLIST & SUBMIT */}
            <div className="glass-panel flex flex-col rounded-[2.5rem] p-8 md:p-12">
              <h3 className="mb-8 flex items-center gap-2 text-3xl font-bold text-slate-800">
                <CheckCircle2 className="text-green-500 fill-green-100" size={32} /> Sẵn sàng đăng tin?
              </h3>
              <div className="mb-8 space-y-4">
                <div className="flex items-center gap-4 rounded-3xl border border-blue-100 bg-blue-50/50 p-5 transition-all hover:bg-blue-50">
                  <div className="rounded-2xl bg-white p-3 text-blue-600 shadow-md shadow-blue-100">
                    <Search size={24} />
                  </div>
                  <div>
                    <p className="text-base font-bold text-blue-900">
                      SEO Score: 98/100
                    </p>
                    <p className="text-sm font-medium text-blue-600/80">
                      Tin đăng rất chi tiết, dễ dàng tìm thấy trên chợ.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4 rounded-3xl border border-green-100 bg-green-50/50 p-5 transition-all hover:bg-green-50">
                  <div className="rounded-2xl bg-white p-3 text-green-600 shadow-md shadow-green-100">
                    <ShieldCheck size={24} />
                  </div>
                  <div>
                    <p className="text-base font-bold text-green-900">An toàn</p>
                    <p className="text-sm font-medium text-green-600/80">
                      Nội dung hợp lệ, không vi phạm chính sách cộng đồng.
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-auto space-y-4">
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="group relative flex w-full items-center justify-center gap-3 overflow-hidden rounded-2xl bg-gradient-to-r from-[#00418E] to-[#0065D1] py-5 text-xl font-bold text-white shadow-xl shadow-blue-900/20 transition-all hover:scale-[1.02] hover:shadow-blue-900/40 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <Rocket className="transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
                  )}
                  {isSubmitting ? "Đang xử lý..." : "ĐĂNG TIN NGAY"}
                  <div className="absolute inset-0 -translate-x-full skew-x-12 bg-white/20 transition-transform duration-700 group-hover:translate-x-full"></div>
                </button>
                <button
                  onClick={() => setStep(3)}
                  className="w-full rounded-2xl border-2 border-slate-100 bg-white py-4 font-bold text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
                >
                  Chỉnh sửa lại
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PostItemPage;
