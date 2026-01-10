import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  Heart, MessageCircle, Share2, ArrowLeft, Eye, MapPin,
  Clock, Star, Box, ShieldCheck, Calendar, ArrowRight,
  Loader2, AlertTriangle, User, CheckCircle2, Flag, Edit3
} from "lucide-react";
import { supabase } from "../services/supabase";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import { useTranslation } from 'react-i18next'; // Import i18n
import { Product } from "../types";

// --- STYLES & VISUALS ---
const VisualEngine = () => (
  <style>{`
    :root { --primary: #00418E; }
    body { background-color: #F8FAFC; font-family: 'Inter', sans-serif; }
    
    .glass-bar { 
      background: rgba(255, 255, 255, 0.85); 
      backdrop-filter: blur(16px); 
      border-bottom: 1px solid rgba(255, 255, 255, 0.5); 
      z-index: 50;
    }

    .glass-panel { 
      background: rgba(255, 255, 255, 0.8); 
      backdrop-filter: blur(24px); 
      border: 1px solid rgba(255, 255, 255, 0.7); 
      box-shadow: 0 20px 40px -10px rgba(0, 65, 142, 0.1); 
    }

    .aurora-bg {
      position: fixed; top: 0; left: 0; right: 0; height: 100vh; z-index: -1;
      background: radial-gradient(at 0% 0%, rgba(0, 71, 171, 0.15) 0px, transparent 50%),
                  radial-gradient(at 100% 0%, rgba(0, 229, 255, 0.1) 0px, transparent 50%);
      filter: blur(80px);
    }

    .animate-enter { animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; opacity: 0; }
    @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
    
    .hide-scrollbar::-webkit-scrollbar { display: none; }
  `}</style>
);

// Mở rộng interface Product để chứa thông tin người bán
interface ProductDetail extends Product {
  seller?: {
    id: string;
    name: string;
    avatar_url: string;
    verified_status: string;
    student_code: string;
  };
}

const ProductDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const { addToast } = useToast();
  const { t } = useTranslation(); // Hook i18n

  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeImg, setActiveImg] = useState(0);
  const [isLiked, setIsLiked] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const { data: pData, error } = await supabase
          .from("products")
          .select(`*, profiles:seller_id(id, name, avatar_url, verified_status, student_code)`)
          .eq("id", id)
          .single();

        if (error || !pData) throw new Error("Sản phẩm không tồn tại");

        const mappedProduct: ProductDetail = {
          ...pData,
          sellerId: pData.seller_id,
          seller: pData.profiles,
          images: pData.images || [],
          postedAt: pData.created_at,
          tradeMethod: pData.trade_method,
          location: pData.location_name || "TP.HCM"
        };

        setProduct(mappedProduct);
        supabase.rpc("increment_view_count", { product_id: id });

        if (currentUser) {
          const { data: sData } = await supabase
            .from("saved_products")
            .select("id")
            .eq("user_id", currentUser.id)
            .eq("product_id", id)
            .maybeSingle();
          if (sData) setIsLiked(true);
        }

      } catch (err) {
        console.error(err);
        addToast(t('market.no_product'), "error");
        navigate("/market");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, currentUser]);

  const handleLike = async () => {
    if (!currentUser) return navigate("/auth");
    if (!product) return;
    
    const oldState = isLiked;
    setIsLiked(!isLiked);

    try {
      if (oldState) {
        await supabase.from("saved_products").delete().eq("user_id", currentUser.id).eq("product_id", product.id);
      } else {
        await supabase.from("saved_products").insert({ user_id: currentUser.id, product_id: product.id });
      }
    } catch {
      setIsLiked(oldState);
      addToast(t('market.error'), "error");
    }
  };

  const startChat = () => {
    if (!currentUser) return navigate("/auth");
    if (currentUser.id === product?.sellerId) return addToast(t('product.own_item_msg') || "Đây là sản phẩm của bạn!", "info");
    navigate(`/chat?partnerId=${product?.sellerId}&productId=${product?.id}`);
  };

  const handleReport = () => {
    if (!currentUser) return navigate("/auth");
    const reason = prompt(t('product.report_reason') || "Lý do báo cáo vi phạm:");
    if (reason) {
        supabase.from("reports").insert({
            reporter_id: currentUser.id,
            product_id: product?.id,
            reason: reason,
            status: 'pending'
        }).then(({ error }) => {
            if (!error) addToast(t('product.report_success') || "Đã gửi báo cáo", "success");
            else addToast(t('market.error'), "error");
        });
    }
  };

  const getStatusBadge = () => {
    if (!product) return null;
    switch (product.status) {
      case 'sold': return { label: t('product.status.sold'), bg: 'bg-slate-100', text: 'text-slate-500', border: 'border-slate-200' };
      case 'pending': return { label: t('product.status.pending'), bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-200' };
      default: return { label: t('product.status.available'), bg: 'bg-green-50', text: 'text-green-600', border: 'border-green-200' };
    }
  };

  if (loading) return (
    <div className="h-screen flex flex-col items-center justify-center bg-slate-50">
      <Loader2 className="animate-spin text-[#00418E] mb-4" size={40} />
      <p className="text-slate-500 font-medium">{t('market.loading')}</p>
    </div>
  );
  
  if (!product) return null;

  const isOwner = currentUser?.id === product.sellerId;
  const statusBadge = getStatusBadge();

  return (
    <div className="min-h-screen pb-32 font-sans text-slate-800">
      <VisualEngine />
      <div className="aurora-bg"></div>
      
      <div className="sticky top-0 glass-bar transition-all">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          <button onClick={() => navigate(-1)} className="group flex items-center gap-2 rounded-full py-2 pr-4 pl-2 hover:bg-slate-100/50 transition-colors">
            <div className="bg-white p-1.5 rounded-full shadow-sm group-hover:scale-110 transition-transform">
              <ArrowLeft size={18} className="text-slate-700"/>
            </div>
            <span className="font-bold text-sm text-slate-700 hidden sm:block">{t('product.back')}</span>
          </button>
          
          <span className="font-bold text-slate-800 line-clamp-1 max-w-[200px] sm:max-w-md opacity-0 sm:opacity-100 transition-opacity">
            {product.title}
          </span>

          <div className="flex gap-2">
            <button onClick={handleLike} className={`p-2.5 rounded-full border transition-all ${isLiked ? 'bg-red-50 border-red-200 text-red-500' : 'bg-white border-slate-200 text-slate-400 hover:text-red-500'}`}>
              <Heart size={20} className={isLiked ? "fill-current" : ""} />
            </button>
            <button className="p-2.5 rounded-full bg-white border border-slate-200 text-slate-400 hover:text-[#00418E] hover:border-blue-200 transition-colors">
              <Share2 size={20}/>
            </button>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-4 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
        
        {/* LEFT COLUMN */}
        <div className="lg:col-span-7 space-y-8 animate-enter">
          <div className="space-y-4">
            <div className="aspect-[4/3] w-full rounded-[2rem] overflow-hidden bg-white shadow-xl border border-white/60 relative group">
              {product.images.length > 0 ? (
                <img src={product.images[activeImg]} className="w-full h-full object-contain p-2 transition-transform duration-500 group-hover:scale-105" alt="Product Main" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-400">No Image</div>
              )}
              
              {statusBadge && (
                <div className={`absolute top-4 right-4 px-3 py-1.5 rounded-lg border font-black text-xs uppercase tracking-wider shadow-sm backdrop-blur-md ${statusBadge.bg} ${statusBadge.text} ${statusBadge.border}`}>
                  {statusBadge.label}
                </div>
              )}
              
              {product.images.length > 1 && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur-md px-3 py-1 rounded-full text-white text-xs font-bold">
                  {activeImg + 1} / {product.images.length}
                </div>
              )}
            </div>
            
            {product.images.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-2 hide-scrollbar snap-x">
                {product.images.map((img, i) => (
                  <button key={i} onClick={() => setActiveImg(i)} className={`relative w-20 h-20 flex-shrink-0 rounded-2xl overflow-hidden border-2 transition-all snap-start cursor-pointer ${activeImg === i ? 'border-[#00418E] shadow-md scale-105' : 'border-transparent opacity-60 hover:opacity-100'}`}>
                    <img src={img} className="w-full h-full object-cover"/>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="glass-panel p-8 rounded-[2rem]">
            <h3 className="font-bold text-lg mb-6 flex items-center gap-2 text-slate-800">
              <ShieldCheck className="text-[#00418E]" size={20}/> {t('product.description_title')}
            </h3>
            <div className="prose prose-sm max-w-none text-slate-600 leading-relaxed whitespace-pre-wrap font-medium">
              {product.description || t('product.no_description')}
            </div>
          </div>

          <div className="bg-orange-50/80 border border-orange-100 p-6 rounded-[2rem] flex gap-4 items-start">
            <div className="bg-orange-100 p-2 rounded-full text-orange-600 shrink-0"><AlertTriangle size={20}/></div>
            <div>
              <h4 className="font-bold text-orange-800 text-sm mb-1">{t('product.safety_title')}</h4>
              <p className="text-xs text-orange-700 leading-relaxed">{t('product.safety_content')}</p>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="lg:col-span-5 space-y-6 animate-enter" style={{animationDelay: '100ms'}}>
          <div className="glass-panel p-8 rounded-[2.5rem] lg:sticky lg:top-24 border-t-4 border-t-[#00418E]">
            <div className="flex justify-between items-start mb-6">
              <span className="bg-blue-50 text-[#00418E] px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider border border-blue-100">{product.category}</span>
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 bg-white/50 px-2 py-1 rounded-lg"><Eye size={14}/> {product.view_count}</div>
            </div>
            
            <h1 className="text-3xl font-black text-slate-900 mb-4 leading-tight">{product.title}</h1>
            <p className="text-4xl font-black text-[#00418E] mb-8 tracking-tight">
              {product.price === 0 ? t('common.price_free') : new Intl.NumberFormat('vi-VN').format(product.price) + 'đ'}
            </p>

            <div className="grid grid-cols-2 gap-3 mb-8">
              <div className="p-3 bg-white/60 rounded-2xl border border-white shadow-sm hover:scale-[1.02] transition-transform">
                <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">{t('product.condition')}</p>
                <p className="font-bold text-sm text-slate-700 flex gap-2 items-center"><Star size={14} className="text-yellow-500 fill-yellow-500"/> {product.condition}</p>
              </div>
              <div className="p-3 bg-white/60 rounded-2xl border border-white shadow-sm hover:scale-[1.02] transition-transform">
                <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">{t('product.trade_method')}</p>
                <p className="font-bold text-sm text-slate-700 flex gap-2 items-center"><Box size={14} className="text-blue-500"/> {product.tradeMethod === 'direct' ? t('product.method.direct') : t('product.method.shipping')}</p>
              </div>
              <div className="p-3 bg-white/60 rounded-2xl border border-white shadow-sm hover:scale-[1.02] transition-transform">
                <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">{t('product.location')}</p>
                <p className="font-bold text-sm text-slate-700 flex gap-2 items-center"><MapPin size={14} className="text-red-500"/> {product.location}</p>
              </div>
              <div className="p-3 bg-white/60 rounded-2xl border border-white shadow-sm hover:scale-[1.02] transition-transform">
                <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">{t('product.posted_date')}</p>
                <p className="font-bold text-sm text-slate-700 flex gap-2 items-center"><Calendar size={14} className="text-slate-500"/> {new Date(product.postedAt).toLocaleDateString('vi-VN')}</p>
              </div>
            </div>

            <div className="group flex items-center gap-4 p-4 bg-white/50 border border-white rounded-2xl mb-8 cursor-pointer hover:bg-white hover:shadow-md transition-all" onClick={() => navigate(`/profile/${product.seller?.id}`)}>
              <div className="relative">
                <img 
                  src={product.seller?.avatar_url || `https://ui-avatars.com/api/?name=${product.seller?.name || 'User'}&background=random`} 
                  className="w-14 h-14 rounded-full border-2 border-white shadow-sm object-cover"
                  alt={product.seller?.name}
                />
                {product.seller?.verified_status === 'verified' && (
                  <div className="absolute -bottom-1 -right-1 bg-blue-500 text-white p-0.5 rounded-full border-2 border-white" title={t('product.verified_student')}>
                    <CheckCircle2 size={12}/>
                  </div>
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <h4 className="font-bold text-slate-900 truncate">{product.seller?.name || "User"}</h4>
                  {isOwner ? (
                    <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-green-200">{t('product.owner_role')}</span>
                  ) : (
                    <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-blue-200">{t('product.seller_role')}</span>
                  )}
                </div>
                
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  {product.seller?.student_code && (
                    <span className="font-mono bg-slate-100 px-1.5 rounded">{t('product.student_id')}: {product.seller.student_code}</span>
                  )}
                  {product.seller?.verified_status === 'verified' ? (
                     <span className="text-blue-600 font-bold">{t('product.verified_student')}</span>
                  ) : (
                     <span>{t('product.unverified')}</span>
                  )}
                </div>
              </div>
              <div className="p-2 bg-slate-100 rounded-full text-slate-400 group-hover:text-[#00418E] group-hover:bg-blue-50 transition-colors"><ArrowRight size={18}/></div>
            </div>

            <div className="flex flex-col gap-3">
              {isOwner ? (
                <button onClick={() => navigate(`/edit-item/${product.id}`)} className="w-full bg-slate-800 text-white py-4 rounded-2xl font-bold shadow-lg hover:bg-slate-900 transition-all flex items-center justify-center gap-2 text-lg">
                  <Edit3 size={20}/> {t('product.edit_post')}
                </button>
              ) : (
                <button onClick={startChat} className="w-full bg-gradient-to-r from-[#00418E] to-[#0065D1] text-white py-4 rounded-2xl font-bold shadow-lg shadow-blue-900/20 hover:shadow-blue-900/30 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-lg">
                  <MessageCircle size={24}/> {t('product.contact_seller')}
                </button>
              )}
              
              {!isOwner && (
                <button onClick={handleReport} className="w-full bg-white text-slate-600 border border-slate-200 py-3 rounded-2xl font-bold hover:bg-red-50 hover:text-red-600 hover:border-red-100 transition-colors text-sm flex items-center justify-center gap-2">
                  <Flag size={16}/> {t('product.report_post')}
                </button>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ProductDetailPage;
