import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Camera, Info, X, CheckCircle2,
  Upload, Loader2, Sparkles, ArrowLeft, Banknote, ChevronDown, Save, Tag
} from 'lucide-react';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { ProductCategory, ProductCondition, TradeMethod } from '../types';
import confetti from 'canvas-confetti';

const PostItemPage = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);

  // --- STATES ---
  const isEditing = Boolean(id);
  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(isEditing);
  const [dragActive, setDragActive] = useState(false);

  // Previews chứa URL (cả blob mới và link cũ từ server)
  const [previews, setPreviews] = useState<string[]>([]); 
  // Chỉ chứa các File mới được chọn để upload
  const [newImages, setNewImages] = useState<File[]>([]); 

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
        setFetchingData(true);
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

        setForm({
            title: data.title,
            description: data.description,
            price: data.price.toString(),
            category: data.category as ProductCategory,
            condition: data.condition as ProductCondition,
            tradeMethod: data.trade_method as TradeMethod,
            isLookingToBuy: data.is_looking_to_buy
        });
        
        setDisplayPrice(data.price.toLocaleString('vi-VN'));
        if (data.images) setPreviews(data.images);
        setFetchingData(false);
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
  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    setForm({ ...form, price: value });
    setDisplayPrice(value ? parseInt(value).toLocaleString('vi-VN') : '');
  };

  // --- XỬ LÝ ẢNH ---
  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const incomingFiles = Array.from(files);
    
    if (previews.length + incomingFiles.length > 5) {
        addToast("Tối đa 5 ảnh thôi nhe!", "warning");
        return;
    }

    const validFiles = incomingFiles.filter(file => file.size <= 5 * 1024 * 1024);
    if (validFiles.length < incomingFiles.length) addToast("Một số ảnh quá nặng (>5MB)", "error");

    setNewImages(prev => [...prev, ...validFiles]);
    const newPreviews = validFiles.map(file => URL.createObjectURL(file));
    setPreviews(prev => [...prev, ...newPreviews]);
  };

  const removeImg = (index: number) => {
    const urlToRemove = previews[index];
    setPreviews(prev => prev.filter((_, i) => i !== index));

    // Nếu là ảnh mới chọn (blob), cần xóa khỏi mảng newImages để không upload thừa
    if (urlToRemove.startsWith('blob:')) {
        const numOldBefore = previews.slice(0, index).filter(u => !u.startsWith('blob:')).length;
        const indexInNewArray = index - numOldBefore;
        setNewImages(prev => prev.filter((_, i) => i !== indexInNewArray));
    }
  };

  // --- SUBMIT ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return addToast("Vui lòng đăng nhập!", "error");
    if (previews.length === 0 && !form.isLookingToBuy) return addToast("Thêm ít nhất 1 ảnh nhé!", "error");

    setLoading(true);
    try {
      const finalImageUrls: string[] = [];
      
      // Giữ lại các ảnh cũ đã có trên server
      const existingUrls = previews.filter(url => !url.startsWith('blob:'));
      finalImageUrls.push(...existingUrls);

      // Upload các ảnh mới chọn
      if (newImages.length > 0) {
          const uploadedUrls = await Promise.all(newImages.map(async (file) => {
            const path = `${user.id}/${Date.now()}_${Math.random().toString(36).substring(7)}`;
            await supabase.storage.from('product-images').upload(path, file);
            return supabase.storage.from('product-images').getPublicUrl(path).data.publicUrl;
          }));
          finalImageUrls.push(...uploadedUrls);
      }

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
        status: 'available'
      };

      if (isEditing) {
          const { error } = await supabase.from('products').update(productData).eq('id', id);
          if (error) throw error;
          addToast("Cập nhật tin thành công!", "success");
      } else {
          const { error } = await supabase.from('products').insert([productData]);
          if (error) throw error;
          try { confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } }); } catch (e) { }
          addToast("Đăng tin thành công!", "success");
      }

      setTimeout(() => navigate('/my-items'), 1000);
    } catch (err: any) {
      addToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full px-5 py-4 bg-gray-50 rounded-2xl border border-transparent focus:bg-white focus:border-[#034EA2] focus:ring-4 focus:ring-blue-50 outline-none font-bold transition-all text-gray-800";
  const labelClass = "block text-xs font-black text-[#034EA2] uppercase mb-2 ml-1 tracking-wider";

  if (fetchingData) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-[#034EA2] w-10 h-10"/></div>;

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-20 pt-6">
      <div className="max-w-4xl mx-auto px-4 mb-8 flex items-center">
        <button type="button" onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full mr-4 transition-colors"><ArrowLeft className="w-6 h-6 text-gray-600" /></button>
        <div>
          <h1 className="text-3xl font-black text-[#034EA2]">{isEditing ? 'Chỉnh sửa tin' : 'Đăng tin mới'}</h1>
          <p className="text-gray-500 font-medium text-sm">Điền thông tin chi tiết để giao dịch nhanh hơn</p>
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
                    <img src={src} className="w-full h-full object-cover" alt="preview" />
                    <button type="button" onClick={() => removeImg(i)} className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-md"><X size={12} /></button>
                  </div>
                ))}
                {previews.length < 5 && (
                  <div
                    className={`aspect-square rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all ${dragActive ? 'border-[#034EA2] bg-blue-50' : 'border-gray-300 hover:border-[#034EA2] hover:bg-gray-50'}`}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="w-8 h-8 mb-2 text-gray-300" />
                    <span className="text-xs text-gray-400 font-bold">Thêm ảnh</span>
                    <input ref={fileInputRef} type="file" multiple accept="image/*" onChange={(e) => handleFiles(e.target.files)} className="hidden" />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* CỘT PHẢI: FORM */}
          <div className="lg:col-span-7 bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 space-y-6">
            <div className="flex bg-gray-100 p-1.5 rounded-2xl">
              <button type="button" onClick={() => setForm({ ...form, isLookingToBuy: false })} className={`flex-1 py-3 rounded-xl text-sm font-black transition-all ${!form.isLookingToBuy ? 'bg-white text-[#034EA2] shadow-md' : 'text-gray-400'}`}>Tôi muốn BÁN</button>
              <button type="button" onClick={() => setForm({ ...form, isLookingToBuy: true })} className={`flex-1 py-3 rounded-xl text-sm font-black transition-all ${form.isLookingToBuy ? 'bg-white text-[#034EA2] shadow-md' : 'text-gray-400'}`}>Tôi cần MUA</button>
            </div>

            <div>
              <label className={labelClass}>Tiêu đề</label>
              <input required placeholder="Tên món đồ..." className={inputClass} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Danh mục</label>
                <select className={inputClass} value={form.category} onChange={e => setForm({ ...form, category: e.target.value as any })}>
                  {Object.values(ProductCategory).map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>Tình trạng</label>
                <select className={inputClass} value={form.condition} onChange={e => setForm({ ...form, condition: e.target.value as any })}>
                  {Object.values(ProductCondition).map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className={labelClass}>Giá (VNĐ)</label>
              <div className="relative">
                <Banknote className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input type="text" placeholder="VD: 50.000" className={`${inputClass} pl-12`} value={displayPrice} onChange={handlePriceChange} />
              </div>
            </div>

            <div>
              <label className={labelClass}>Giao dịch</label>
              <select className={inputClass} value={form.tradeMethod} onChange={e => setForm({ ...form, tradeMethod: e.target.value as any })}>
                <option value={TradeMethod.DIRECT}>Gặp trực tiếp</option>
                <option value={TradeMethod.LOCKER}>Qua tủ Locker</option>
                <option value={TradeMethod.BOTH}>Linh hoạt</option>
              </select>
            </div>

            <div>
              <label className={labelClass}>Mô tả</label>
              <textarea ref={descriptionRef} rows={4} className={`${inputClass} resize-none`} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            </div>

            <button disabled={loading} className="w-full py-5 bg-[#034EA2] text-white rounded-[1.5rem] font-black text-lg hover:bg-[#003875] shadow-xl disabled:opacity-50 transition-all flex items-center justify-center">
              {loading ? <Loader2 className="w-6 h-6 animate-spin mr-2" /> : isEditing ? <Save className="w-6 h-6 mr-2" /> : <Tag className="w-6 h-6 mr-2" />}
              {isEditing ? "LƯU THAY ĐỔI" : "ĐĂNG TIN NGAY"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PostItemPage;