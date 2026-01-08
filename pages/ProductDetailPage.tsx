import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Heart, MessageCircle, Share2, ArrowLeft, Eye, MapPin, Clock, Star, Box, CheckCircle2, ShieldCheck, Calendar } from "lucide-react";
import { supabase } from "../services/supabase";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import { Product } from "../types";

// --- STYLES ---
const VisualEngine = () => (
  <style>{`
    :root { --primary: #00418E; }
    body { background-color: #F8FAFC; }
    .glass-panel { background: rgba(255,255,255,0.8); backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.6); box-shadow: 0 20px 40px -10px rgba(0,65,142,0.1); }
    .animate-enter { animation: slideUp 0.6s ease-out forwards; }
    @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
  `}</style>
);

const ProductDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const { addToast } = useToast();

  const [product, setProduct] = useState<Product | null>(null);
  const [seller, setSeller] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeImg, setActiveImg] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      setLoading(true);
      try {
        // FETCH PRODUCT + SELLER (JOIN)
        const { data: pData, error } = await supabase
          .from("products")
          .select(`*, profiles:seller_id (*)`)
          .eq("id", id)
          .single();

        if (error || !pData) throw new Error("Sản phẩm không tồn tại");

        // MAP DATA
        const mappedProduct: Product = {
          ...pData,
          sellerId: pData.seller_id,
          images: pData.images || [],
          postedAt: pData.created_at,
          tradeMethod: pData.trade_method,
          location: pData.location_name || "TP.HCM"
        };

        setProduct(mappedProduct);
        setSeller(pData.profiles);
        
        // Count view
        supabase.rpc("increment_view_count", { product_id: id });

      } catch (err) {
        addToast("Không tìm thấy sản phẩm", "error");
        navigate("/market");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const startChat = () => {
    if (!currentUser) return navigate("/auth");
    navigate(`/chat?partnerId=${product?.sellerId}&productId=${product?.id}`);
  };

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-[#00418E]"/></div>;
  if (!product) return null;

  return (
    <div className="min-h-screen pb-32 font-sans text-slate-800">
      <VisualEngine />
      
      {/* HEADER */}
      <div className="sticky top-0 z-50 border-b border-white/20 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          <button onClick={() => navigate(-1)} className="rounded-full p-2 hover:bg-slate-100"><ArrowLeft size={20}/></button>
          <span className="font-bold line-clamp-1">{product.title}</span>
          <div className="flex gap-2"><button className="p-2 hover:bg-slate-100 rounded-full"><Share2 size={20}/></button></div>
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-4 py-8 grid grid-cols-1 lg:grid-cols-12 gap-10">
        
        {/* LEFT: IMAGES */}
        <div className="lg:col-span-7 space-y-6 animate-enter">
          <div className="aspect-4/3 rounded-[2rem] overflow-hidden bg-white shadow-lg border border-white/60">
            <img src={product.images[activeImg]} className="w-full h-full object-contain p-4"/>
          </div>
          {product.images.length > 1 && (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {product.images.map((img, i) => (
                <button key={i} onClick={() => setActiveImg(i)} className={`w-20 h-20 rounded-xl border-2 overflow-hidden ${activeImg === i ? 'border-[#00418E]' : 'border-transparent opacity-60'}`}>
                  <img src={img} className="w-full h-full object-cover"/>
                </button>
              ))}
            </div>
          )}
          
          <div className="glass-panel p-8 rounded-[2rem]">
            <h3 className="font-bold text-lg mb-4 flex gap-2"><ShieldCheck className="text-blue-600"/> Mô tả chi tiết</h3>
            <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">{product.description || "Chưa có mô tả."}</p>
          </div>
        </div>

        {/* RIGHT: INFO */}
        <div className="lg:col-span-5 space-y-6 animate-enter" style={{animationDelay: '100ms'}}>
          <div className="glass-panel p-8 rounded-[2rem] sticky top-24">
            <div className="flex justify-between items-start mb-4">
              <span className="bg-blue-50 text-[#00418E] px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider">{product.category}</span>
              <span className="flex items-center gap-1 text-xs font-bold text-slate-400"><Eye size={14}/> {product.view_count}</span>
            </div>
            
            <h1 className="text-3xl font-black text-slate-900 mb-4 leading-tight">{product.title}</h1>
            <p className="text-4xl font-black text-[#00418E] mb-8">{product.price === 0 ? "Miễn phí" : new Intl.NumberFormat('vi-VN').format(product.price) + 'đ'}</p>

            <div className="grid grid-cols-2 gap-3 mb-8">
              <div className="p-3 bg-white/50 rounded-xl border border-white"><p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Tình trạng</p><p className="font-bold text-sm flex gap-2 items-center"><Star size={14} className="text-yellow-500"/> {product.condition}</p></div>
              <div className="p-3 bg-white/50 rounded-xl border border-white"><p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Giao dịch</p><p className="font-bold text-sm flex gap-2 items-center"><Box size={14} className="text-blue-500"/> {product.tradeMethod === 'direct' ? 'Trực tiếp' : 'Ship COD'}</p></div>
              <div className="p-3 bg-white/50 rounded-xl border border-white"><p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Khu vực</p><p className="font-bold text-sm flex gap-2 items-center"><MapPin size={14} className="text-red-500"/> {product.location}</p></div>
              <div className="p-3 bg-white/50 rounded-xl border border-white"><p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Ngày đăng</p><p className="font-bold text-sm flex gap-2 items-center"><Calendar size={14} className="text-slate-500"/> {new Date(product.postedAt).toLocaleDateString()}</p></div>
            </div>

            {/* Seller Card */}
            <div className="flex items-center gap-4 p-4 bg-white/60 rounded-2xl mb-8 cursor-pointer hover:bg-white transition-colors" onClick={() => navigate(`/profile/${seller?.id}`)}>
              <img src={seller?.avatar_url || `https://ui-avatars.com/api/?name=${seller?.name}`} className="w-12 h-12 rounded-full border bg-slate-200 object-cover"/>
              <div className="flex-1">
                <h4 className="font-bold text-slate-900">{seller?.name || "Người bán"}</h4>
                <p className="text-xs text-slate-500">Hoạt động sôi nổi • Phản hồi nhanh</p>
              </div>
              <div className="p-2 bg-slate-100 rounded-full text-slate-400"><ArrowRight size={16}/></div>
            </div>

            <div className="flex gap-3">
              <button onClick={startChat} className="flex-1 bg-[#00418E] text-white py-4 rounded-2xl font-bold shadow-lg shadow-blue-900/20 hover:scale-[1.02] transition-transform flex items-center justify-center gap-2">
                <MessageCircle/> Nhắn tin ngay
              </button>
              <button className="p-4 border-2 border-slate-200 rounded-2xl text-slate-400 hover:border-red-200 hover:text-red-500 hover:bg-red-50 transition-colors">
                <Heart/>
              </button>
            </div>
          </div>
        </div>

      </main>
    </div>
  );
};

export default ProductDetailPage;
