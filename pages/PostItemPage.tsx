import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom'; // <--- Thêm useParams để lấy ID sửa
import {
  Camera, Info, X, CheckCircle2, Wand2, Calculator,
  Upload, Loader2, Sparkles, ArrowLeft, Banknote, ChevronDown, Save
} from 'lucide-react';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { ProductCategory, ProductCondition, TradeMethod } from '../types';
// Import đúng service Gemini của bạn
import { generateCreativeDescription, estimatePrice } from '../services/geminiService'; 
import confetti from 'canvas-confetti';

const PostItemPage = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>(); // Lấy ID từ URL (nếu có)

  const fileInputRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);

  // --- STATES ---
  const isEditing = Boolean(id); // Kiểm tra đang Sửa hay Đăng mới
  const [loading, setLoading] = useState(false);
  const [isAiWriting, setIsAiWriting] = useState(false);
  const [isEstimating, setIsEstimating] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  // Preview chứa cả URL ảnh cũ (string) và Blob ảnh mới
  const [previews, setPreviews] = useState<string[]>([]); 
  const [images, setImages] = useState<File[]>([]); 

  const [displayPrice, setDisplayPrice] = useState('');

  const [form, setForm] = useState({
    title: '',
    description: '',
    price: '',
    category: ProductCategory.TEXTBOOK,
    condition: ProductCondition.GOOD,
    tradeMethod: TradeMethod.DIRECT,
    isLookingToBuy: false
  });

  // --- EFFECT: LOAD DỮ LIỆU CŨ NẾU LÀ SỬA TIN ---
  useEffect(() => {
    if (isEditing && id) {
      const loadOldData = async () => {
        setLoading(true);
        const { data, error } = await supabase.from('products').select('*').eq('id', id).single();
        
        if (error || !data) {
            addToast("Không tìm thấy tin đăng hoặc lỗi kết nối", "error");
            navigate('/market');
            return;
        }

        if (data.seller_id !== user?.id) {
            addToast("Bạn không chính chủ, đừng sửa bậy nha!", "error");
            navigate('/market');
            return;
        }

        // Điền dữ liệu cũ vào form
        setForm({
            title: data.title,
            description: data.description,
            price: data.price.toString(),
            category: data.category as ProductCategory,
            condition: data.condition as ProductCondition,
            tradeMethod: data.trade_method as TradeMethod,
            isLookingToBuy: data.is_looking_to_buy
        });
        
        setDisplayPrice(formatCurrency(data.price.toString()));

        // Load ảnh cũ (chỉ là URL)
        if (data.images && data.images.length > 0) {
            setPreviews(data.images);
        }
        setLoading(false);
      };
      loadOldData();
    }
  }, [id, isEditing, user, navigate]);

  // Tự động giãn chiều cao textarea
  useEffect(() => {
    if (descriptionRef.current) {
      descriptionRef.current.style.height = 'auto';
      descriptionRef.current.style.height = descriptionRef.current.scrollHeight + 'px';
    }
  }, [form.description]);

  // --- HÀM HỖ TRỢ ---
  const formatCurrency = (value: string) => {
    if (!value) return '';
    const number = value.replace(/\D/g, '');
    return number.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCurrency(e.target.value);
    setDisplayPrice(formatted);
    setForm({ ...form, price: formatted.replace(/\./g, '') });
  };

  // --- XỬ LÝ ẢNH ---
  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const newFiles = Array.from(files);
    
    if (previews.length + newFiles.length > 5) {
        addToast("Tối đa 5 ảnh thôi nhe!", "warning");
        return;
    }

    const validFiles = newFiles.filter(file => {
      if (file.size > 5 * 1024 * 1024) {
        addToast(`Ảnh ${file.name} nặng quá (>5MB)`, 'error');
        return false;
      }
      return true;
    });

    setImages(prev => [...prev, ...validFiles]);
    const newPreviews = validFiles.map(file => URL.createObjectURL(file));
    setPreviews(prev => [...prev, ...newPreviews]);
  };

  const removeImg = (index: number) => {
    // Xóa khỏi preview
    const urlToRemove = previews[index];
    setPreviews(prev => prev.filter((_, i) => i !== index));

    // Nếu là ảnh mới (blob:...), cần xóa trong mảng images
    if (urlToRemove.startsWith('blob:')) {
        // Tính toán xem ảnh bị xóa là ảnh mới thứ mấy
        const oldImagesCount = previews.filter(url => !url.startsWith('blob:')).length;
        
        // Nếu xóa một ảnh cũ, oldImagesCount sẽ giảm, nhưng index của blob trong mảng images không đổi
        // Nếu xóa một ảnh mới, index cần trừ đi số lượng ảnh cũ hiện tại (trước khi xóa)
        // Cách an toàn nhất cho UX đơn giản:
        // Lọc lại mảng images dựa trên URL blob (nhưng ko map ngược dc).
        // => Reset lại images: Cách này hơi cồng kềnh nhưng chính xác: 
        // Logic đơn giản: 
        // 1. Lấy tất cả ảnh mới còn lại trong previews
        // 2. Filter images sao cho URL object của nó nằm trong danh sách previews còn lại
        // Tuy nhiên URL.createObjectURL tạo ra string khác nhau mỗi lần.
        
        // Giải pháp nhanh: Đếm số ảnh cũ đứng trước nó
        const numOldBefore = previews.slice(0, index).filter(u => !u.startsWith('blob:')).length;
        // Nếu bản thân nó là blob
        const indexInNewArray = index - numOldBefore;
        setImages(prev => prev.filter((_, i) => i !== indexInNewArray));
    }
  };

  // --- AI FEATURES (Dùng geminiService) ---
  const handleMagicWrite = async () => {
    if (!form.title.trim()) return addToast("Nhập tên món đồ trước đã nhé!", "warning");

    setIsAiWriting(true);
    try {
      const text = await generateCreativeDescription(form.title, form.category);
      if (text) {
        setForm(prev => ({ ...prev, description: text }));
        addToast("AI đã viết xong!", "success");
      } else {
        addToast("AI đang bận, thử lại sau nhé!", "error");
      }
    } catch (e) { console.error(e); } finally { setIsAiWriting(false); }
  };

  const handleEstimatePrice = async () => {
    if (!form.title.trim()) return addToast("Nhập tên món đồ để định giá!", "warning");

    setIsEstimating(true);
    try {
      const priceHint = await estimatePrice(form.title, form.category, form.condition);
      if (priceHint) {
        const numericPrice = priceHint.replace(/\D/g, '');
        if (numericPrice) {
            const formatted = formatCurrency(numericPrice);
            setDisplayPrice(formatted);
            setForm(prev => ({ ...prev, price: numericPrice }));
            addToast(`Gợi ý giá: ${priceHint} VNĐ`, "success");
        } else {
            addToast(`Gợi ý: ${priceHint}`, "info");
        }
      }
    } catch (e) { console.error(e); } finally { setIsEstimating(false); }
  };

  // --- SUBMIT (XỬ LÝ CẢ INSERT VÀ UPDATE) ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return addToast("Vui lòng đăng nhập!", "error");
    if (previews.length === 0 && !form.isLookingToBuy) return addToast("Thêm ít nhất 1 ảnh nhé!", "error");

    setLoading(true);
    try {
      // 1. Upload ảnh mới & Giữ lại ảnh cũ
      const finalImageUrls: string[] = [];
      
      // Giữ lại ảnh cũ (URL từ supabase)
      const oldImages = previews.filter(url => !url.startsWith('blob:'));
      finalImageUrls.push(...oldImages);

      // Upload ảnh mới
      if (images.length > 0) {
          const newUrls = await Promise.all(images.map(async (file) => {
            const path = `${user.id}/${Date.now()}_${Math.random().toString(36).substring(7)}`;
            await supabase.storage.from('product-images').upload(path, file);
            return supabase.storage.from('product-images').getPublicUrl(path).data.publicUrl;
          }));
          finalImageUrls.push(...newUrls);
      }

      // Chuẩn bị data
      const productData = {
        title: form.title,
        description: form.description,
        price: parseInt(form.price) || 0,
        category: form.category,
        condition: form.condition,
        trade_method: form.tradeMethod,
        is_looking_to_buy: form.isLookingToBuy,
        images: finalImageUrls,
        seller_id: user.id,
        status: 'available' // Mặc định available
      };

      if (isEditing) {
          // --- UPDATE ---
          const { error } = await supabase.from('products').update(productData).eq('id', id);
          if (error) throw error;
          addToast("Cập nhật tin thành công!", "success");
      } else {
          // --- INSERT ---
          const { error } = await supabase.from('products').insert([productData]);
          if (error) throw error;
          try { confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } }); } catch (e) { }
          addToast("Đăng tin thành công!", "success");
      }

      setTimeout(() => navigate('/my-items'), 1500);

    } catch (err: any) {
      addToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full px-5 py-4 bg-gray-50 rounded-2xl border border-transparent focus:bg-white focus:border-[#034EA2] focus:ring-4 focus:ring-blue-50 outline-none font-bold transition-all text-gray-800";
  const labelClass = "block text-xs font-black text-[#034EA2] uppercase mb-2 ml-1 tracking-wider";

  if (loading && isEditing && !form.title) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-[#034EA2] w-10 h-10"/></div>;

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-20 pt-6">
      <div className="max-w-4xl mx-auto px-4 mb-8 flex items-center">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full mr-4 transition-colors"><ArrowLeft className="w-6 h-6 text-gray-600" /></button>
        <div>
          <h1 className="text-3xl font-black text-[#034EA2]">{isEditing ? 'Chỉnh sửa tin' : 'Đăng tin mới'}</h1>
          <p className="text-gray-500 font-medium text-sm">{isEditing ? 'Cập nhật thông tin nhanh chóng' : 'Kết nối giao dịch trong cộng đồng Bách Khoa'}</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* CỘT TRÁI: ẢNH */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100">
              <label className={labelClass}><Camera className="inline w-4 h-4 mr-2" /> Ảnh sản phẩm ({previews.length}/5)</label>
              <div className="grid grid-cols-2 gap-3 mb-4">
                {previews.map((src, i) => (
                  <div key={i} className="relative aspect-square rounded-2xl overflow-hidden group border border-gray-100">
                    <img src={src} className="w-full h-full object-cover" />
                    <button type="button" onClick={() => removeImg(i)} className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-md"><X size={12} /></button>
                  </div>
                ))}
                {previews.length < 5 && (
                  <div
                    className={`aspect-square rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all ${dragActive ? 'border-[#034EA2] bg-blue-50' : 'border-gray-300 hover:border-[#034EA2] hover:bg-gray-50'}`}
                    onDragEnter={() => setDragActive(true)}
                    onDragLeave={() => setDragActive(false)}
                    onDrop={(e) => { e.preventDefault(); setDragActive(false); handleFiles(e.dataTransfer.files); }}
                    onDragOver={(e) => e.preventDefault()}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className={`w-8 h-8 mb-2 ${dragActive ? 'text-[#034EA2]' : 'text-gray-300'}`} />
                    <span className="text-xs text-gray-400 font-bold">Thêm ảnh</span>
                    <input ref={fileInputRef} type="file" multiple accept="image/*" onChange={(e) => handleFiles(e.target.files)} className="hidden" />
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-400 text-center">Kéo thả hoặc bấm để tải ảnh</p>
            </div>

            <div className="bg-gradient-to-br from-[#034EA2] to-[#00B0F0] p-6 rounded-[2rem] text-white shadow-xl">
              <h3 className="font-bold mb-3 flex items-center text-lg"><Info className="w-5 h-5 mr-2" /> Mẹo bán nhanh</h3>
              <ul className="text-sm space-y-3 opacity-90">
                <li className="flex items-start"><CheckCircle2 className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" /> <span>Chụp ảnh dưới ánh sáng tự nhiên.</span></li>
                <li className="flex items-start"><CheckCircle2 className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" /> <span>Mô tả chi tiết tình trạng.</span></li>
                <li className="flex items-start"><CheckCircle2 className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" /> <span>Giao dịch tại Sảnh H6, Thư viện.</span></li>
              </ul>
            </div>
          </div>

          {/* CỘT PHẢI: FORM */}
          <div className="lg:col-span-7 bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 space-y-6">
            <div className="flex bg-gray-100 p-1.5 rounded-2xl">
              {[{ l: 'Tôi muốn BÁN', v: false }, { l: 'Tôi cần MUA', v: true }].map(t => (
                <button key={t.l} type="button" onClick={() => setForm({ ...form, isLookingToBuy: t.v })} className={`flex-1 py-3 rounded-xl text-sm font-black transition-all ${form.isLookingToBuy === t.v ? 'bg-white text-[#034EA2] shadow-md' : 'text-gray-400 hover:text-gray-600'}`}>{t.l}</button>
              ))}
            </div>

            <div>
              <label className={labelClass}>Tiêu đề món đồ</label>
              <input required placeholder="VD: Giáo trình Giải tích 1 - Thầy A..." className={inputClass} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Danh mục</label>
                <div className="relative">
                  <select className={`${inputClass} appearance-none cursor-pointer`} value={form.category} onChange={e => setForm({ ...form, category: e.target.value as any })}>
                    {Object.values(ProductCategory).map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 w-5 h-5" />
                </div>
              </div>
              <div>
                <label className={labelClass}>Tình trạng</label>
                <div className="relative">
                  <select className={`${inputClass} appearance-none cursor-pointer`} value={form.condition} onChange={e => setForm({ ...form, condition: e.target.value as any })}>
                    {Object.values(ProductCondition).map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 w-5 h-5" />
                </div>
              </div>
            </div>

            <div>
              <label className={labelClass}>
                <div className="flex justify-between items-center">
                  Giá mong muốn (VNĐ)
                  <button type="button" onClick={handleEstimatePrice} className="text-[11px] bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full flex items-center hover:bg-yellow-200 transition-colors disabled:opacity-50 font-bold animate-pulse" disabled={isEstimating}>
                    {isEstimating ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Calculator className="w-3 h-3 mr-1" />}
                    Định giá
                  </button>
                </div>
              </label>
              <div className="relative">
                <Banknote className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="VD: 50.000"
                  className={`${inputClass} pl-12 pr-16`}
                  value={displayPrice}
                  onChange={handlePriceChange}
                  maxLength={15}
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-sm bg-white pl-2">VNĐ</span>
              </div>
            </div>

            <div>
              <label className={labelClass}>Cách giao dịch</label>
              <div className="relative">
                <select className={`${inputClass} appearance-none cursor-pointer`} value={form.tradeMethod} onChange={e => setForm({ ...form, tradeMethod: e.target.value as any })}>
                  <option value={TradeMethod.DIRECT}>Gặp trực tiếp</option>
                  <option value={TradeMethod.LOCKER}>Qua tủ Locker</option>
                  <option value={TradeMethod.BOTH}>Linh hoạt</option>
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 w-5 h-5" />
              </div>
            </div>

            <div className="relative">
              <label className={labelClass}>
                <div className="flex justify-between items-center">
                  Mô tả chi tiết
                  <button type="button" onClick={handleMagicWrite} className="text-[11px] bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-3 py-1 rounded-full flex items-center shadow-md hover:shadow-lg transition-all active:scale-95 disabled:opacity-50 font-bold animate-pulse" disabled={isAiWriting}>
                    {isAiWriting ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Wand2 className="w-3 h-3 mr-1" />}
                    AI Viết Hộ
                  </button>
                </div>
              </label>
              <textarea
                ref={descriptionRef}
                rows={4}
                placeholder="Mô tả kỹ hơn về nguồn gốc, lý do pass..."
                className={`${inputClass} resize-none leading-relaxed min-h-[120px] overflow-hidden`}
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
              />
            </div>

            <button disabled={loading} className="w-full py-5 bg-[#034EA2] text-white rounded-[1.5rem] font-black text-lg hover:bg-[#003875] shadow-xl shadow-blue-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 flex items-center justify-center group">
              {loading ? <Loader2 className="w-6 h-6 animate-spin mr-2" /> : (isEditing ? <Save className="w-6 h-6 mr-2" /> : <Sparkles className="w-6 h-6 mr-2 group-hover:animate-spin" />)}
              {loading ? "Đang xử lý..." : (isEditing ? "LƯU THAY ĐỔI" : "ĐĂNG TIN NGAY")}
            </button>

          </div>
        </form>
      </div>
    </div>
  );
};

export default PostItemPage;