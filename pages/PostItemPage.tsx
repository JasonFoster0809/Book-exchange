import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Info, X, Plus, CheckCircle2 } from 'lucide-react';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { ProductCategory, ProductCondition, TradeMethod } from '../types';

const PostItemPage = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [form, setForm] = useState({ title: '', description: '', price: '', category: ProductCategory.TEXTBOOK, condition: ProductCondition.GOOD, tradeMethod: TradeMethod.DIRECT, isLookingToBuy: false });

  const handleImg = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setImages([...images, ...files]);
      setPreviews([...previews, ...files.map(f => URL.createObjectURL(f))]);
    }
  };

  const removeImg = (i: number) => {
    setImages(images.filter((_, idx) => idx !== i));
    setPreviews(previews.filter((_, idx) => idx !== i));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || images.length === 0) return addToast(user ? "Thêm ít nhất 1 ảnh!" : "Hãy đăng nhập!", "error");
    setLoading(true);
    try {
      const urls = await Promise.all(images.map(async (file) => {
        const path = `${user.id}/${Date.now()}_${file.name}`;
        await supabase.storage.from('product-images').upload(path, file);
        return supabase.storage.from('product-images').getPublicUrl(path).data.publicUrl;
      }));

      const { error } = await supabase.from('products').insert([{ 
        seller_id: user.id, ...form, price: parseInt(form.price) || 0, images: urls, status: 'available', trade_method: form.tradeMethod, is_looking_to_buy: form.isLookingToBuy 
      }]);
      if (error) throw error;
      addToast("Thành công!", "success");
      navigate('/marketplace');
    } catch (err: any) { addToast(err.message, "error"); } finally { setLoading(false); }
  };

  const inputClass = "w-full px-5 py-4 bg-gray-50 rounded-2xl focus:ring-4 focus:ring-indigo-100 outline-none font-bold transition-all";
  const labelClass = "block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1";

  return (
    <div className="min-h-screen bg-[#F8FAFC] py-10 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-10 text-center">
          <h1 className="text-4xl font-black text-gray-900">Tạo tin đăng mới</h1>
          <p className="text-gray-500">Chia sẻ món đồ của bạn với cộng đồng sinh viên</p>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white p-6 rounded-[2rem] shadow-sm border">
              <label className={labelClass}><Camera className="inline w-4 h-4 mr-2"/> Ảnh sản phẩm</label>
              <div className="grid grid-cols-2 gap-3">
                {previews.map((src, i) => (
                  <div key={i} className="relative aspect-square rounded-2xl overflow-hidden group">
                    <img src={src} className="w-full h-full object-cover" />
                    <button type="button" onClick={() => removeImg(i)} className="absolute top-2 right-2 p-1 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100"><X size={14}/></button>
                  </div>
                ))}
                {previews.length < 4 && (
                  <label className="aspect-square rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50">
                    <Plus className="text-gray-300" /><input type="file" multiple onChange={handleImg} className="hidden" />
                  </label>
                )}
              </div>
            </div>
            <div className="bg-indigo-600 p-6 rounded-[2rem] text-white shadow-xl">
              <h3 className="font-bold mb-2 flex items-center"><Info className="w-4 h-4 mr-2"/> Mẹo</h3>
              <ul className="text-xs space-y-2 opacity-90">
                {["Ảnh rõ nét bán nhanh hơn", "Mô tả chi tiết tình trạng", "Giá hợp lý để mau bay"].map((t, i) => <li key={i} className="flex items-center"><CheckCircle2 className="w-3 h-3 mr-2"/> {t}</li>)}
              </ul>
            </div>
          </div>

          <div className="lg:col-span-7 bg-white p-8 rounded-[2.5rem] shadow-sm border space-y-6">
            <div className="flex bg-gray-100 p-1 rounded-2xl">
              {[ {l: 'Tôi bán', v: false}, {l: 'Tôi mua', v: true} ].map(t => (
                <button key={t.l} type="button" onClick={() => setForm({...form, isLookingToBuy: t.v})} className={`flex-1 py-3 rounded-xl text-sm font-bold ${form.isLookingToBuy === t.v ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500'}`}>{t.l}</button>
              ))}
            </div>

            <div><label className={labelClass}>Tiêu đề</label><input required placeholder="Tên sản phẩm..." className={inputClass} value={form.title} onChange={e => setForm({...form, title: e.target.value})} /></div>

            <div className="grid grid-cols-2 gap-4">
              <div><label className={labelClass}>Danh mục</label>
                <select className={inputClass} value={form.category} onChange={e => setForm({...form, category: e.target.value as any})}>
                  {Object.values(ProductCategory).map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
              <div><label className={labelClass}>Tình trạng</label>
                <select className={inputClass} value={form.condition} onChange={e => setForm({...form, condition: e.target.value as any})}>
                  {Object.values(ProductCondition).map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="relative"><label className={labelClass}>Giá (VNĐ)</label><input type="number" className={inputClass} value={form.price} onChange={e => setForm({...form, price: e.target.value})} /><span className="absolute right-4 bottom-4 text-gray-400">đ</span></div>
              <div><label className={labelClass}>Giao dịch</label>
                <select className={inputClass} value={form.tradeMethod} onChange={e => setForm({...form, tradeMethod: e.target.value as any})}>
                  <option value={TradeMethod.DIRECT}>Trực tiếp</option>
                  <option value={TradeMethod.LOCKER}>Locker</option>
                  <option value={TradeMethod.BOTH}>Linh hoạt</option>
                </select>
              </div>
            </div>

            <div><label className={labelClass}>Mô tả</label><textarea rows={3} className={inputClass} value={form.description} onChange={e => setForm({...form, description: e.target.value})} /></div>

            <button disabled={loading} className="w-full py-5 bg-indigo-600 text-white rounded-[1.5rem] font-black text-lg hover:bg-indigo-700 disabled:opacity-50 transition-all">
              {loading ? "Đang xử lý..." : "ĐĂNG TIN NGAY"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PostItemPage;