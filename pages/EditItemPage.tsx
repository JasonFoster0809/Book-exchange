import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../services/supabase";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import {
  ArrowLeft,
  Save,
  Loader2,
  FileText,
  MapPin,
  Box,
  Upload,
} from "lucide-react";
import { DraggableImageList } from "../components/DraggableImageList";

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

const EditItemPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    price: "",
    category: ProductCategory.TEXTBOOK,
    condition: ProductCondition.GOOD,
    tradeMethod: TradeMethod.DIRECT,
    images: [] as string[],
    tags: [] as string[],
  });

  useEffect(() => {
    fetchProduct();
  }, [id]);

  const fetchProduct = async () => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      if (data) {
        setFormData({
          title: data.title,
          description: data.description || "",
          price: data.price.toString(),
          category: data.category,
          condition: data.condition,
          tradeMethod: data.trade_method,
          images: data.images || [],
          tags: [],
        });
      }
    } catch (error) {
      addToast("Không thể tải thông tin sản phẩm", "error");
      navigate("/my-items");
    } finally {
      setLoading(false);
    }
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
          );
        };
        img.onerror = (error) => reject(error);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user || !e.target.files || e.target.files.length === 0) return;

    const files = Array.from(e.target.files);
    if (formData.images.length + files.length > 8) {
      return addToast("Tối đa 8 ảnh.", "error");
    }

    setUploading(true);
    addToast("Đang xử lý và tải ảnh lên...", "info");

    try {
      const newUrls = await Promise.all(
        files.map(async (file) => {
          try {
            const compressedFile = await compressImage(file);
            const path = `${user.id}/${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;

            const { error: uploadError } = await supabase.storage
              .from("product-images")
              .upload(path, compressedFile);

            if (uploadError) throw uploadError;

            const { data } = supabase.storage
              .from("product-images")
              .getPublicUrl(path);

            return data.publicUrl;
          } catch (err) {
            console.error("Upload failed", err);
            return null;
          }
        }),
      );

      const successUrls = newUrls.filter((url): url is string => url !== null);
      if (successUrls.length > 0) {
        setFormData((prev) => ({
          ...prev,
          images: [...prev.images, ...successUrls],
        }));
        addToast(`Đã thêm ${successUrls.length} ảnh`, "success");
      }
    } catch (error) {
      addToast("Lỗi khi tải ảnh", "error");
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = (urlToRemove: string) => {
    setFormData((prev) => ({
      ...prev,
      images: prev.images.filter((url) => url !== urlToRemove),
    }));
  };

  const handleReorderImages = (newImages: string[]) => {
    setFormData((prev) => ({ ...prev, images: newImages }));
  };

  const handleSave = async () => {
    if (!user || !id) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("products")
        .update({
          title: formData.title,
          description: formData.description,
          price: parseInt(formData.price.replace(/\./g, "")),
          category: formData.category,
          condition: formData.condition,
          trade_method: formData.tradeMethod,
          images: formData.images,
        })
        .eq("id", id);

      if (error) throw error;

      addToast("Cập nhật tin đăng thành công!", "success");
      navigate("/my-items");
    } catch (error) {
      console.error(error);
      addToast("Lỗi khi cập nhật tin", "error");
    } finally {
      setSaving(false);
    }
  };

  const formatPrice = (val: string) => {
    const raw = val.replace(/\D/g, "");
    return raw.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  if (loading)
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="animate-spin text-blue-600" />
      </div>
    );

  return (
    <div className="min-h-screen bg-slate-50 px-4 pt-10 pb-20 font-sans text-slate-800">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex items-center justify-between">
          <button
            onClick={() => navigate("/my-items")}
            className="flex items-center gap-2 font-bold text-slate-500 transition hover:text-slate-800"
          >
            <ArrowLeft size={20} /> Quay lại
          </button>
          <h1 className="text-2xl font-black text-[#00418E]">
            Chỉnh Sửa Tin Đăng
          </h1>
        </div>

        <div className="glass-panel rounded-[2.5rem] border border-white/50 bg-white p-8 shadow-xl">
          <div className="flex flex-col gap-8 lg:flex-row">
            {/* Left Side: Images & Key Info */}
            <div className="space-y-6 lg:w-1/3">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-extrabold text-slate-500 uppercase">
                    Hình ảnh ({formData.images.length}/8)
                  </label>
                  {uploading && (
                    <span className="flex items-center gap-1 text-xs font-bold text-blue-600">
                      <Loader2 size={12} className="animate-spin" /> Đang tải...
                    </span>
                  )}
                </div>

                <DraggableImageList
                  images={formData.images}
                  onReorder={handleReorderImages}
                  onRemove={handleRemoveImage}
                />

                {formData.images.length < 8 && (
                  <label className="group flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-3 transition-all hover:border-blue-500 hover:bg-white">
                    <div className="rounded-full bg-white p-2 text-slate-400 shadow-sm transition-colors group-hover:bg-blue-50 group-hover:text-blue-500">
                      <Upload size={20} />
                    </div>
                    <span className="text-sm font-bold text-slate-500 group-hover:text-blue-600">
                      Thêm ảnh mới
                    </span>
                    <input
                      type="file"
                      className="hidden"
                      multiple
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={uploading}
                    />
                  </label>
                )}
              </div>

              {/* Shipping Method Section */}
              <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50 p-5">
                <label className="mb-3 flex items-center gap-1 text-xs font-extrabold text-blue-800 uppercase">
                  <MapPin size={14} /> Phương thức giao dịch
                </label>
                <div className="space-y-2">
                  {[
                    {
                      val: TradeMethod.DIRECT,
                      icon: <MapPin size={16} />,
                      label: "Gặp trực tiếp",
                    },
                    {
                      val: TradeMethod.SHIPPING,
                      icon: <Box size={16} />,
                      label: "Giao hàng",
                    },
                  ].map((m) => (
                    <button
                      key={m.val}
                      onClick={() =>
                        setFormData({ ...formData, tradeMethod: m.val })
                      }
                      className={`flex w-full items-center gap-3 rounded-xl border-2 p-3 text-sm font-bold transition-all ${
                        formData.tradeMethod === m.val
                          ? "border-blue-500 bg-white text-blue-700 shadow-sm"
                          : "border-transparent text-slate-500 hover:bg-blue-100/50"
                      }`}
                    >
                      {m.icon} {m.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Side: Form Fields */}
            <div className="space-y-6 lg:w-2/3">
              <div className="mb-2 flex items-center gap-2 text-xl font-bold text-slate-800">
                <FileText className="text-blue-600" /> Chi tiết sản phẩm
              </div>

              <div>
                <label className="mb-2 ml-1 block text-xs font-extrabold text-slate-500 uppercase">
                  Tiêu đề tin đăng
                </label>
                <input
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  className="padding-[16px] w-full rounded-2xl border-2 border-slate-200 bg-slate-50 p-4 text-lg font-bold text-slate-800 transition-all outline-none focus:border-[#00418E] focus:bg-white"
                  placeholder="VD: Giáo trình Giải tích 1 - NXB ĐHQG"
                />
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div>
                  <label className="mb-2 ml-1 block text-xs font-extrabold text-slate-500 uppercase">
                    Danh mục
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        category: e.target.value as ProductCategory,
                      })
                    }
                    className="w-full cursor-pointer appearance-none rounded-2xl border-2 border-slate-200 bg-slate-50 p-4 font-bold text-slate-700 transition-all outline-none focus:border-[#00418E] focus:bg-white"
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
                      value={formatPrice(formData.price)}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          price: e.target.value.replace(/\./g, ""),
                        })
                      }
                      className="w-full rounded-2xl border-2 border-slate-200 bg-slate-50 p-4 pl-10 font-bold text-slate-800 transition-all outline-none focus:border-[#00418E] focus:bg-white"
                      placeholder="0"
                    />
                    <span className="absolute top-1/2 left-4 -translate-y-1/2 font-bold text-slate-400">
                      ₫
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <label className="mb-2 ml-1 block text-xs font-extrabold text-slate-500 uppercase">
                  Mô tả chi tiết
                </label>
                <div className="overflow-hidden rounded-2xl border-2 border-slate-200 bg-[#F8FAFC] transition-colors focus-within:border-[#00418E] focus-within:bg-white">
                  <textarea
                    rows={6}
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    className="w-full resize-none bg-transparent p-4 leading-relaxed font-medium text-slate-700 outline-none"
                    placeholder="Mô tả chi tiết về tình trạng, xuất xứ..."
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <label className="mb-3 block text-xs font-extrabold text-slate-500 uppercase">
                  Tình trạng
                </label>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {CONDITIONS.map((c) => (
                    <button
                      key={c.value}
                      onClick={() =>
                        setFormData({ ...formData, condition: c.value })
                      }
                      className={`rounded-xl border-2 p-3 text-left text-sm font-bold transition-all ${formData.condition === c.value ? c.color : "border-transparent bg-white text-slate-500 hover:bg-slate-100"}`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-100 pt-6">
                <button
                  onClick={() => navigate("/my-items")}
                  className="rounded-xl px-6 py-3 font-bold text-slate-500 transition hover:bg-slate-100"
                >
                  Hủy bỏ
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 rounded-xl bg-[#00418E] px-8 py-3 font-bold text-white shadow-lg shadow-blue-900/20 transition hover:bg-[#003370] active:scale-95 disabled:opacity-70"
                >
                  {saving ? (
                    <Loader2 className="animate-spin" size={20} />
                  ) : (
                    <Save size={20} />
                  )}
                  Lưu Thay Đổi
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditItemPage;
