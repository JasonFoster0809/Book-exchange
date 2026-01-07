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
} from "lucide-react";
import { supabase } from "../services/supabase";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";

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
    color: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  {
    value: ProductCondition.LIKE_NEW,
    label: "Như mới (99%)",
    color: "bg-blue-50 text-blue-700 border-blue-200",
  },
  {
    value: ProductCondition.GOOD,
    label: "Tốt (90%)",
    color: "bg-indigo-50 text-indigo-700 border-indigo-200",
  },
  {
    value: ProductCondition.FAIR,
    label: "Chấp nhận được",
    color: "bg-orange-50 text-orange-700 border-orange-200",
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

const VisualEngine = () => (
  <style>{`
    :root { --primary: #00418E; --secondary: #00B0F0; --accent: #FFD700; }
    body { background-color: #F8FAFC; overflow-x: hidden; }
    ::-webkit-scrollbar { width: 6px; }
    ::-webkit-scrollbar-thumb { background: #94A3B8; border-radius: 10px; }
    @keyframes slideUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
    .animate-enter { animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; opacity: 0; }
    .glass-panel { background: rgba(255, 255, 255, 0.9); backdrop-filter: blur(20px); border: 1px solid rgba(255, 255, 255, 0.6); box-shadow: 0 10px 30px -5px rgba(0,0,0,0.05); transition: all 0.3s ease; }
    .glass-panel:hover { box-shadow: 0 20px 40px -5px rgba(0,0,0,0.1); transform: translateY(-2px); }
    .input-modern { width: 100%; padding: 16px; border-radius: 16px; border: 2px solid #E2E8F0; background: #F8FAFC; color: #1E293B; font-weight: 500; transition: all 0.2s; outline: none; }
    .input-modern:focus { background: white; border-color: var(--primary); box-shadow: 0 0 0 4px rgba(0, 65, 142, 0.1); }
    .map-grid { background-image: linear-gradient(#e5e7eb 1px, transparent 1px), linear-gradient(90deg, #e5e7eb 1px, transparent 1px); background-size: 20px 20px; }
    .rich-toolbar-btn { padding: 6px; border-radius: 6px; color: #64748B; transition: all 0.2s; }
    .rich-toolbar-btn:hover { background: #F1F5F9; color: #0F172A; }
  `}</style>
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
  <div className="mx-auto mb-12 w-full max-w-4xl">
    <div className="relative flex items-center justify-between">
      <div className="absolute top-1/2 left-0 -z-10 h-1 w-full rounded-full bg-slate-200"></div>
      <div
        className="absolute top-1/2 left-0 h-1 rounded-full bg-linear-to-r from-blue-600 to-cyan-500 transition-all duration-500"
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
            className={`group flex flex-col items-center gap-2 ${isDone ? "cursor-pointer" : "cursor-default"}`}
          >
            <div
              className={`z-10 flex h-10 w-10 items-center justify-center rounded-full border-4 text-sm font-bold transition-all duration-300 ${isActive ? "scale-110 border-blue-100 bg-blue-600 text-white shadow-lg shadow-blue-500/30" : isDone ? "border-green-100 bg-green-500 text-white" : "border-slate-200 bg-white text-slate-400"}`}
            >
              {isDone ? <CheckCircle2 size={18} /> : stepNum}
            </div>
            <span
              className={`text-xs font-bold tracking-wider uppercase transition-colors ${isActive ? "text-blue-600" : isDone ? "text-green-600" : "text-slate-400"}`}
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

  const getUserName = () => (user as any)?.user_metadata?.name || "Bạn";
  const getUserAvatar = () =>
    (user as any)?.user_metadata?.avatar_url ||
    "https://via.placeholder.com/40";

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
      <div className="pointer-events-none fixed inset-0 z-[-1] overflow-hidden">
        <div className="absolute top-0 left-0 h-[600px] w-full bg-linear-to-b from-blue-50/50 to-transparent"></div>
      </div>

      {showSaveDraft && (
        <div className="animate-enter fixed bottom-8 left-1/2 z-50 flex w-[90%] max-w-lg -translate-x-1/2 items-center gap-6 rounded-2xl border border-slate-700 bg-slate-900 px-6 py-4 text-white shadow-2xl">
          <div className="flex-1">
            <p className="text-sm font-bold">Phát hiện bản nháp chưa lưu</p>
            <p className="text-xs text-slate-400">Bạn có muốn khôi phục?</p>
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
              className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold shadow-lg transition hover:bg-blue-500"
            >
              Khôi phục
            </button>
          </div>
        </div>
      )}

      {aiAnalyzing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm">
          <div className="relative w-full max-w-sm overflow-hidden rounded-3xl bg-white p-10 text-center shadow-2xl">
            <div className="absolute inset-0 z-0 bg-linear-to-br from-indigo-50 to-purple-50"></div>
            <div className="relative z-10">
              <div className="relative mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-white shadow-lg">
                <Sparkles size={40} className="animate-pulse text-indigo-600" />
                <div className="absolute inset-0 animate-ping rounded-full border-4 border-indigo-100"></div>
              </div>
              <h3 className="mb-2 text-2xl font-black text-slate-800">
                Gemini AI
              </h3>
              <p className="font-medium text-slate-500">
                Đang phân tích hình ảnh...
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-5xl px-4 pt-12">
        <div className="animate-enter mb-12 flex items-end justify-between">
          <div>
            <h1 className="mb-3 text-4xl font-black tracking-tight text-[#00418E] md:text-5xl">
              {editId ? "Hiệu Chỉnh" : "Đăng Tin Mới"}
            </h1>
            <p className="flex items-center gap-2 font-medium text-slate-500">
              <Zap size={16} className="text-yellow-500" /> AI hỗ trợ điền thông
              tin tự động
            </p>
          </div>
          <button
            onClick={() => navigate("/market")}
            className="hidden items-center gap-2 font-bold text-slate-400 transition-colors hover:text-[#00418E] md:flex"
          >
            Hủy bỏ <X size={20} />
          </button>
        </div>

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

        {step === 1 && (
          <div className="glass-panel animate-enter rounded-[2.5rem] p-8">
            <div className="mb-8 flex items-center justify-between">
              <h3 className="flex items-center gap-3 text-2xl font-bold">
                <Camera className="text-blue-600" /> Thư viện ảnh
              </h3>
              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                {previewUrls.length}/8 ảnh
              </span>
            </div>
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
              <div className="order-2 md:order-1">
                <div className="mb-6 grid grid-cols-3 gap-4">
                  {previewUrls.map((url, idx) => (
                    <div
                      key={idx}
                      className="group relative aspect-square cursor-pointer overflow-hidden rounded-2xl border-2 border-transparent bg-white shadow-sm transition-all hover:border-blue-500"
                      onClick={() => setEditImageIdx(idx)}
                    >
                      <img
                        src={url}
                        className="h-full w-full object-cover transition-transform group-hover:scale-110"
                      />
                      <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                          }}
                          className="rounded-full bg-white p-1.5 text-slate-800 hover:bg-blue-50"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreviewUrls((p) =>
                              p.filter((_, i) => i !== idx),
                            );
                          }}
                          className="rounded-full bg-white p-1.5 text-red-500 hover:bg-red-50"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      {idx === 0 && (
                        <span className="absolute top-2 left-2 rounded-md bg-blue-600 px-2 py-0.5 text-[10px] font-bold text-white shadow-md">
                          Bìa
                        </span>
                      )}
                    </div>
                  ))}
                  {previewUrls.length < 8 && (
                    <label className="group flex aspect-square cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/50 transition-all hover:border-blue-500 hover:bg-blue-50/50">
                      <div className="mb-2 rounded-full bg-white p-3 shadow-sm transition-transform group-hover:scale-110">
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
              <div className="order-1 flex flex-col items-center justify-center rounded-3xl border border-slate-100 bg-slate-50 p-6 text-center md:order-2">
                <div className="group relative mb-4 aspect-4/3 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                  {previewUrls.length > 0 ? (
                    <>
                      <img
                        src={previewUrls[editImageIdx || 0]}
                        className="h-full w-full object-contain p-4 mix-blend-multiply"
                      />
                      <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2 rounded-xl border border-slate-100 bg-white/90 p-2 opacity-0 shadow-lg backdrop-blur transition-all group-hover:opacity-100">
                        <button className="rounded-lg p-2 hover:bg-slate-100">
                          <RotateCcw size={18} />
                        </button>
                        <button className="rounded-lg p-2 hover:bg-slate-100">
                          <Crop size={18} />
                        </button>
                        <button className="rounded-lg p-2 hover:bg-slate-100">
                          <Layers size={18} />
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center text-slate-400">
                      <ImageIcon size={48} className="mb-2 opacity-20" />
                      <p className="text-sm">Chưa có ảnh nào được chọn</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="mt-8 flex justify-end">
              <button
                onClick={() => {
                  if (previewUrls.length === 0)
                    return addToast("Cần ít nhất 1 ảnh", "warning");
                  setStep(2);
                }}
                className="flex items-center gap-2 rounded-xl bg-[#00418E] px-8 py-3.5 font-bold text-white shadow-xl shadow-blue-900/20 transition hover:bg-[#003370] active:scale-95"
              >
                Tiếp tục <ArrowRight size={18} />
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="glass-panel animate-enter rounded-[2.5rem] p-8">
            <div className="mb-8 flex items-center justify-between">
              <h3 className="flex items-center gap-3 text-2xl font-bold">
                <FileText className="text-blue-600" /> Chi tiết sản phẩm
              </h3>
              <button
                onClick={analyzeImageAI}
                className="flex items-center gap-2 rounded-xl bg-linear-to-r from-indigo-500 to-purple-500 px-5 py-2.5 text-xs font-bold text-white shadow-lg transition-transform hover:scale-105"
              >
                <Wand2 size={16} /> AI Auto-Fill
              </button>
            </div>
            <div className="grid grid-cols-1 gap-8 md:grid-cols-12">
              <div className="space-y-6 md:col-span-8">
                <div>
                  <label className="mb-2 ml-1 block text-xs font-extrabold text-slate-500 uppercase">
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
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="mb-2 ml-1 block text-xs font-extrabold text-slate-500 uppercase">
                      Danh mục
                    </label>
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
                          {c.icon} {c.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-2 ml-1 block text-xs font-extrabold text-slate-500 uppercase">
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
                        className="input-modern pl-10 font-bold text-slate-800"
                        placeholder="0"
                      />
                      <span className="absolute top-1/2 left-4 -translate-y-1/2 font-bold text-slate-400">
                        ₫
                      </span>
                      {priceAnalysis && (
                        <div
                          className={`absolute top-1/2 right-4 -translate-y-1/2 rounded px-2 py-0.5 text-[10px] font-bold ${priceAnalysis === "low" ? "bg-green-100 text-green-700" : priceAnalysis === "high" ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"}`}
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
                <div>
                  <label className="mb-2 ml-1 block text-xs font-extrabold text-slate-500 uppercase">
                    Mô tả chi tiết
                  </label>
                  <div className="overflow-hidden rounded-2xl border-2 border-slate-200 bg-[#F8FAFC] transition-colors focus-within:border-[#00418E] focus-within:bg-white">
                    <div className="flex gap-1 border-b border-slate-200 bg-slate-50 p-2">
                      {["B", "I", "U", "List", "Link"].map((t) => (
                        <button
                          key={t}
                          className="rich-toolbar-btn px-3 py-1.5 text-xs font-bold hover:bg-white"
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
                      className="w-full resize-none bg-transparent p-4 leading-relaxed text-slate-700 outline-none"
                      placeholder="Mô tả chi tiết về tình trạng, xuất xứ..."
                    />
                  </div>
                </div>
              </div>
              <div className="space-y-6 md:col-span-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <label className="mb-3 block text-xs font-extrabold text-slate-500 uppercase">
                    Tình trạng
                  </label>
                  <div className="space-y-2">
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
                        className={`flex w-full items-center justify-between rounded-xl border-2 p-3 text-left text-sm font-bold transition-all ${state.condition === c.value ? c.color : "border-transparent bg-slate-50 text-slate-500 hover:bg-slate-100"}`}
                      >
                        {c.label}{" "}
                        {state.condition === c.value && (
                          <CheckCircle2 size={16} />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <label className="mb-3 block text-xs font-extrabold text-slate-500 uppercase">
                    Tags
                  </label>
                  <div className="mb-3 flex flex-wrap gap-2">
                    {state.tags.map((t) => (
                      <span
                        key={t}
                        className="flex items-center gap-1 rounded-lg bg-blue-50 px-2 py-1 text-xs font-bold text-blue-700"
                      >
                        #{t}{" "}
                        <button
                          onClick={() =>
                            dispatch({ type: "REMOVE_TAG", tag: t })
                          }
                        >
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
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
                    placeholder="+ Thêm tag..."
                    className="w-full rounded-lg border-none bg-slate-50 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>
            </div>
            <div className="mt-8 flex justify-between">
              <button
                onClick={() => setStep(1)}
                className="flex items-center gap-2 rounded-xl px-6 py-3 font-bold text-slate-500 transition hover:bg-slate-100"
              >
                <ArrowLeft size={18} /> Quay lại
              </button>
              <button
                onClick={() => {
                  if (!state.title || !state.price)
                    return addToast("Điền đủ thông tin!", "warning");
                  setStep(3);
                }}
                className="flex items-center gap-2 rounded-xl bg-[#00418E] px-8 py-3.5 font-bold text-white shadow-xl shadow-blue-900/20 transition hover:bg-[#003370] active:scale-95"
              >
                Tiếp tục <ArrowRight size={18} />
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="glass-panel animate-enter rounded-[2.5rem] p-8">
            <h3 className="mb-6 flex items-center gap-3 text-2xl font-bold">
              <MapPin className="text-blue-600" /> Phương thức giao dịch
            </h3>
            <div className="mb-8 grid grid-cols-1 gap-8 md:grid-cols-2">
              <div className="space-y-4">
                <label className="ml-1 block text-xs font-extrabold text-slate-500 uppercase">
                  Hình thức
                </label>
                <div className="flex gap-4">
                  {[
                    {
                      val: TradeMethod.DIRECT,
                      icon: <MapPin />,
                      label: "Gặp trực tiếp",
                      desc: "An toàn, không phí",
                    },
                    {
                      val: TradeMethod.SHIPPING,
                      icon: <Box />,
                      label: "Giao hàng",
                      desc: "Tiện lợi, có phí ship",
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
                      className={`flex-1 rounded-2xl border-2 p-4 text-left transition-all ${state.tradeMethod === m.val ? "border-blue-500 bg-blue-50" : "border-slate-200 bg-white hover:border-slate-300"}`}
                    >
                      <div
                        className={`mb-2 ${state.tradeMethod === m.val ? "text-blue-600" : "text-slate-400"}`}
                      >
                        {m.icon}
                      </div>
                      <div
                        className={`font-bold ${state.tradeMethod === m.val ? "text-blue-900" : "text-slate-700"}`}
                      >
                        {m.label}
                      </div>
                      <div className="mt-1 text-xs text-slate-400">
                        {m.desc}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              {state.tradeMethod === TradeMethod.DIRECT && (
                <div className="space-y-4">
                  <label className="ml-1 block text-xs font-extrabold text-slate-500 uppercase">
                    Địa điểm hẹn gặp
                  </label>
                  <div className="map-grid group relative h-48 cursor-crosshair overflow-hidden rounded-2xl bg-slate-100 p-1">
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
                        className={`group/pin absolute -translate-x-1/2 -translate-y-1/2 transform transition-all duration-300 ${state.location === loc.name ? "z-20 scale-125" : "z-10 hover:scale-110"}`}
                      >
                        <MapPin
                          size={32}
                          className={`${state.location === loc.name ? "fill-red-500 text-red-500" : "fill-slate-200 text-slate-400"} drop-shadow-md`}
                        />
                        <span
                          className={`absolute top-full left-1/2 mt-1 -translate-x-1/2 rounded bg-white px-2 py-0.5 text-[10px] font-bold whitespace-nowrap shadow-sm ${state.location === loc.name ? "text-red-600" : "text-slate-500 opacity-0 group-hover/pin:opacity-100"}`}
                        >
                          {loc.name}
                        </span>
                      </button>
                    ))}
                    <div className="absolute right-2 bottom-2 rounded-lg border border-slate-200 bg-white/90 px-3 py-1.5 text-xs font-bold text-slate-600 shadow-sm backdrop-blur">
                      📍 Đang chọn: {state.location}
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="mt-8 flex justify-between">
              <button
                onClick={() => setStep(2)}
                className="flex items-center gap-2 rounded-xl px-6 py-3 font-bold text-slate-500 transition hover:bg-slate-100"
              >
                <ArrowLeft size={18} /> Quay lại
              </button>
              <button
                onClick={() => setStep(4)}
                className="flex items-center gap-2 rounded-xl bg-[#00418E] px-8 py-3.5 font-bold text-white shadow-xl shadow-blue-900/20 transition hover:bg-[#003370] active:scale-95"
              >
                Tiếp tục <ArrowRight size={18} />
              </button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="animate-enter grid grid-cols-1 gap-8 lg:grid-cols-2">
            <div className="glass-panel flex flex-col justify-center rounded-[2.5rem] p-8">
              <h3 className="mb-6 text-center text-2xl font-bold">
                Xem trước tin đăng
              </h3>
              <div className="relative mx-auto aspect-9/19 w-[300px] overflow-hidden rounded-[3rem] border-8 border-slate-900 bg-white shadow-2xl">
                <div className="absolute top-0 left-1/2 z-20 h-6 w-32 -translate-x-1/2 rounded-b-xl bg-slate-900"></div>
                <div className="hide-scrollbar h-full overflow-y-auto bg-slate-50">
                  <div className="relative aspect-square">
                    <img
                      src={previewUrls[0]}
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute bottom-0 left-0 h-20 w-full bg-linear-to-t from-black/60 to-transparent"></div>
                    <div className="absolute bottom-4 left-4 text-lg font-bold text-white">
                      {parseInt(
                        state.price.replace(/\./g, ""),
                      ).toLocaleString()}
                      đ
                    </div>
                  </div>
                  <div className="space-y-3 p-4">
                    <h4 className="leading-tight font-bold text-slate-900">
                      {state.title}
                    </h4>
                    <div className="flex gap-2">
                      <span className="rounded bg-blue-100 px-2 py-1 text-[10px] font-bold text-blue-700">
                        {state.condition}
                      </span>
                      <span className="rounded bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600">
                        {state.tradeMethod === TradeMethod.DIRECT
                          ? "Trực tiếp"
                          : "Ship COD"}
                      </span>
                    </div>
                    <p className="text-xs leading-relaxed text-slate-500">
                      {state.description}
                    </p>
                    <div className="border-t border-slate-100 pt-4">
                      <div className="flex items-center gap-2">
                        <img
                          src={getUserAvatar()}
                          className="h-8 w-8 rounded-full bg-slate-200"
                        />
                        <div>
                          <p className="text-xs font-bold text-slate-900">
                            {getUserName()}
                          </p>
                          <p className="text-[10px] text-slate-400">Vừa xong</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="glass-panel flex flex-col rounded-[2.5rem] p-8">
              <h3 className="mb-6 flex items-center gap-2 text-2xl font-bold">
                <CheckCircle2 className="text-green-500" /> Sẵn sàng đăng tin?
              </h3>
              <div className="mb-8 space-y-4">
                <div className="flex items-center gap-4 rounded-2xl border border-blue-100 bg-blue-50 p-4">
                  <div className="rounded-xl bg-white p-2 text-blue-600 shadow-sm">
                    <Search size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-blue-900">
                      SEO Score: 95/100
                    </p>
                    <p className="text-xs text-blue-700">
                      Tin đăng của bạn rất chi tiết, dễ dàng tìm thấy.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4 rounded-2xl border border-green-100 bg-green-50 p-4">
                  <div className="rounded-xl bg-white p-2 text-green-600 shadow-sm">
                    <ShieldCheck size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-green-900">An toàn</p>
                    <p className="text-xs text-green-700">
                      Nội dung hợp lệ, không vi phạm chính sách.
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-auto space-y-3">
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="group relative flex w-full items-center justify-center gap-3 overflow-hidden rounded-2xl bg-linear-to-r from-[#00418E] to-[#0065D1] py-4 text-lg font-bold text-white transition-all hover:shadow-xl hover:shadow-blue-500/30 active:scale-95 disabled:opacity-70"
                >
                  {isSubmitting ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <Rocket className="transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
                  )}
                  {isSubmitting ? "Đang xử lý..." : "ĐĂNG NGAY"}
                  <div className="absolute inset-0 -translate-x-full skew-x-12 bg-white/20 transition-transform duration-700 group-hover:translate-x-full"></div>
                </button>
                <button
                  onClick={() => setStep(3)}
                  className="w-full rounded-2xl border-2 border-slate-100 bg-white py-4 font-bold text-slate-600 transition hover:bg-slate-50"
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
