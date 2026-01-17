import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, MapPin, Clock, ShieldCheck, Heart, 
  MessageCircle, Phone, Share2, AlertTriangle,
  ShoppingCart, Star, ChevronRight, Copy, Check,
  User, Flag, Loader2, Package, Eye, ShoppingBag // <--- ĐÃ THÊM ShoppingBag
} from "lucide-react";
import { supabase } from "../services/supabase";
import { Product } from "../types";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";

// ============================================================================
// 1. UTILS & STYLES
// ============================================================================
const formatCurrency = (amount: number) => 
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount);

const timeAgo = (dateString: string) => {
  if (!dateString) return "Mới đăng";
  const diff = (new Date().getTime() - new Date(dateString).getTime()) / 1000;
  if (diff < 3600) return Math.floor(diff / 60) + " phút trước";
  if (diff < 86400) return Math.floor(diff / 3600) + " giờ trước";
  return Math.floor(diff / 86400) + " ngày trước";
};

const VisualEngine = () => (
  <style>{`
    .hide-scrollbar::-webkit-scrollbar { display: none; }
    .glass-panel { background: white; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
    .animate-fade-in { animation: fadeIn 0.5s ease-out; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
  `}</style>
);

// ============================================================================
// 2. MAIN COMPONENT
// ============================================================================
const ProductDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToast } = useToast();

  const [product, setProduct] = useState<any | null>(null);
  const [seller, setSeller] = useState<any | null>(null);
  const [relatedItems, setRelatedItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeImg, setActiveImg] = useState(0);
  const [copied, setCopied] = useState(false);
  const [isLiked, setIsLiked] = useState(false);

  // --- FETCH DATA (Logic "Bất tử") ---
  useEffect(() => {
    if (!id) return;
    window.scrollTo(0, 0);

    const fetchData = async () => {
      setLoading(true);
      try {
        console.log("🚀 Đang tải sản phẩm ID:", id);

        // CÁCH 1: Thử lấy dữ liệu kiểu "Chuẩn" (Join bảng)
        let { data: pData, error: pError } = await supabase
          .from("products")
          .select("*, seller:profiles(*)")
          .eq("id", id)
          .single();

        // CÁCH 2: Nếu Cách 1 lỗi (do chưa setup foreign key), chuyển sang Fallback
        if (pError) {
          console.warn("⚠️ Lỗi join bảng, chuyển sang chế độ fallback...", pError.message);
          
          // 2.1 Lấy sản phẩm trần
          const { data: rawProduct, error: rawError } = await supabase
            .from("products")
            .select("*")
            .eq("id", id)
            .single();

          if (rawError || !rawProduct) throw rawError || new Error("Không tìm thấy");
          
          pData = rawProduct;
          pData.seller = null;

          // 2.2 Lấy thông tin seller thủ công
          if (rawProduct.seller_id) {
            const { data: sData } = await supabase
              .from("profiles")
              .select("*")
              .eq("id", rawProduct.seller_id)
              .single();
            pData.seller = sData;
          }
        }

        // --- Gán dữ liệu ---
        setProduct(pData);
        setSeller(pData.seller || {});
        console.log("✅ Đã tải xong:", pData);

        // Fetch Related
        if (pData.category) {
          const { data: related } = await supabase
            .from("products")
            .select("*")
            .eq("category", pData.category)
            .neq("id", id)
            .eq("status", "available")
            .limit(4);
          setRelatedItems(related || []);
        }

        // Check Like
        if (user) {
          const { data: likeData } = await supabase
            .from("saved_products")
            .select("id")
            .eq("user_id", user.id)
            .eq("product_id", id)
            .maybeSingle();
          setIsLiked(!!likeData);
        }

        // --- SỬA LỖI RPC ---
        // Thay vì .catch(), ta gọi await trực tiếp vì đang ở trong try/catch
        await supabase.rpc('increment_view', { product_id: id });

      } catch (err) {
        console.error("❌ Lỗi load trang:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, user]);

  // --- ACTIONS ---
  const handleChat = () => {
    if (!user) return addToast("Vui lòng đăng nhập", "info");
    if (seller?.id === user.id) return addToast("Đây là sản phẩm của bạn", "info");
    navigate(`/chat/${seller?.id}`);
  };

  const handleLike = async () => {
    if (!user) return addToast("Vui lòng đăng nhập", "info");
    const oldVal = isLiked;
    setIsLiked(!isLiked); 
    
    if (oldVal) {
      await supabase.from("saved_products").delete().eq("user_id", user.id).eq("product_id", id);
      addToast("Đã bỏ lưu", "info");
    } else {
      await supabase.from("saved_products").insert({ user_id: user.id, product_id: id });
      addToast("Đã lưu tin", "success");
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    addToast("Đã sao chép link", "success");
    setTimeout(() => setCopied(false), 2000);
  };

  // --- RENDER ---
  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8FAFC]">
      <Loader2 className="animate-spin text-[#00418E] mb-4" size={40}/>
      <p className="text-slate-500 font-medium">Đang tải chi tiết...</p>
    </div>
  );

  if (!product) return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center bg-[#F8FAFC] gap-4">
      <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center">
        <Package size={48} className="text-slate-300"/>
      </div>
      <h2 className="text-xl font-bold text-slate-700">Sản phẩm không tồn tại</h2>
      <button onClick={() => navigate('/market')} className="px-6 py-2.5 bg-[#00418E] text-white rounded-xl font-bold hover:bg-blue-800 transition-all">
        Quay về chợ
      </button>
    </div>
  );

  const images = Array.isArray(product.images) && product.images.length > 0 
    ? product.images 
    : (typeof product.images === 'string' ? [product.images] : ['https://via.placeholder.com/600x400?text=No+Image']);

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24 lg:pb-12 font-sans text-slate-800">
      <VisualEngine />

      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200 px-4 h-16 flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 rounded-full text-slate-600 transition-colors flex items-center gap-2">
          <ArrowLeft size={20}/> <span className="text-sm font-bold hidden sm:inline">Quay lại</span>
        </button>
        <div className="flex gap-2">
          <button onClick={handleLike} className={`p-2 rounded-full border transition-all ${isLiked ? 'bg-red-50 text-red-500 border-red-200' : 'bg-white border-slate-200 text-slate-400'}`}>
            <Heart size={20} className={isLiked ? "fill-current" : ""}/>
          </button>
          <button onClick={handleShare} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 hover:text-[#00418E]">
            {copied ? <Check size={20} className="text-green-500"/> : <Share2 size={20}/>}
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* === CỘT TRÁI === */}
        <div className="lg:col-span-8 space-y-8 animate-fade-in">
          <div className="space-y-4">
            <div className="aspect-[4/3] lg:aspect-video bg-white rounded-3xl border border-slate-200 overflow-hidden relative flex items-center justify-center bg-slate-50">
              <img src={images[activeImg]} className="max-h-full max-w-full object-contain" alt={product.title} />
              {product.condition === 'new' && <span className="absolute top-4 left-4 bg-[#00418E] text-white px-3 py-1 rounded-lg text-xs font-bold shadow-md uppercase tracking-wider">Mới 100%</span>}
            </div>
            {images.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-2 hide-scrollbar">
                {images.map((img: string, idx: number) => (
                  <button key={idx} onClick={() => setActiveImg(idx)} className={`w-20 h-20 rounded-xl overflow-hidden border-2 flex-shrink-0 transition-all ${activeImg === idx ? 'border-[#00418E] opacity-100' : 'border-transparent opacity-60 hover:opacity-100'}`}>
                    <img src={img} className="w-full h-full object-cover"/>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="glass-panel rounded-3xl p-6 md:p-8">
            <div className="flex flex-wrap gap-2 mb-4">
              <span className="px-3 py-1 bg-blue-50 text-[#00418E] text-xs font-bold rounded-lg uppercase tracking-wider border border-blue-100">{product.category}</span>
              <span className="px-3 py-1 bg-slate-50 text-slate-500 text-xs font-bold rounded-lg border border-slate-100 flex items-center gap-1"><Clock size={12}/> {timeAgo(product.created_at)}</span>
              <span className="px-3 py-1 bg-slate-50 text-slate-500 text-xs font-bold rounded-lg border border-slate-100 flex items-center gap-1"><Eye size={12}/> {product.view_count || 0} lượt xem</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-slate-900 mb-6 leading-tight">{product.title}</h1>
            <div className="grid grid-cols-2 md:grid-cols-2 gap-4 mb-8">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Tình trạng</p>
                <div className="flex items-center gap-2 font-bold text-slate-800 text-sm"><Star size={16} className="text-yellow-500 fill-yellow-500"/> {product.condition === 'new' ? 'Mới nguyên seal' : 'Đã qua sử dụng'}</div>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Khu vực</p>
                <div className="flex items-center gap-2 font-bold text-slate-800 text-sm"><MapPin size={16} className="text-red-500"/> {product.location_name || 'Bách Khoa TP.HCM'}</div>
              </div>
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-3 border-l-4 border-[#00418E] pl-3">Mô tả chi tiết</h3>
            <div className="text-slate-600 leading-relaxed whitespace-pre-line">{product.description || "Người bán không cung cấp mô tả chi tiết."}</div>
          </div>

          <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100 flex gap-4 items-start">
            <ShieldCheck size={24} className="text-[#00418E] shrink-0 mt-1"/>
            <div>
              <h4 className="font-bold text-[#00418E] mb-1">Giao dịch an toàn</h4>
              <p className="text-sm text-blue-800/80 leading-relaxed">Nên giao dịch trực tiếp tại khuôn viên trường. Không chuyển khoản trước khi nhận hàng.</p>
            </div>
          </div>
        </div>

        {/* === CỘT PHẢI === */}
        <div className="lg:col-span-4 space-y-6">
          <div className="glass-panel rounded-3xl p-6 shadow-lg shadow-blue-900/5 lg:sticky lg:top-24 border-t-4 border-t-[#00418E]">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Giá bán</p>
            <div className="text-4xl font-black text-[#00418E] mb-8 tracking-tight">{product.price === 0 ? "MIỄN PHÍ" : formatCurrency(product.price)}</div>
            {user?.id === seller?.id ? (
               <button onClick={() => navigate(`/edit-item/${product.id}`)} className="w-full py-4 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-900 transition-all flex items-center justify-center gap-2 mb-3">Chỉnh sửa tin</button>
            ) : (
              <>
                <button onClick={handleChat} className="w-full py-4 bg-[#00418E] text-white rounded-xl font-bold hover:bg-blue-800 transition-all shadow-xl shadow-blue-900/20 active:scale-95 flex items-center justify-center gap-2 mb-3"><MessageCircle size={18}/> Nhắn tin người bán</button>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => addToast("Tính năng đang phát triển", "info")} className="py-3 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 hover:text-green-600 hover:border-green-200 transition-all flex items-center justify-center gap-2"><Phone size={18}/> Gọi điện</button>
                  <button onClick={() => addToast("Đã báo cáo tin này", "success")} className="py-3 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 hover:text-red-500 hover:border-red-200 transition-all flex items-center justify-center gap-2"><Flag size={18}/> Báo cáo</button>
                </div>
              </>
            )}
          </div>

          <div className="glass-panel rounded-3xl p-6">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">Người đăng bán</h3>
            <div className="flex items-center gap-4 mb-6 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => navigate(`/profile/${seller?.id || '#'}`)}>
              <div className="w-16 h-16 rounded-full bg-slate-100 p-1 border border-slate-200">
                <img src={seller?.avatar_url || `https://ui-avatars.com/api/?name=${seller?.name || 'User'}&background=random`} className="w-full h-full object-cover rounded-full" alt="Seller Avatar"/>
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-lg flex items-center gap-1">{seller?.name || 'Người dùng ẩn danh'}</h4>
                <p className="text-xs text-slate-500 font-medium bg-slate-100 px-2 py-1 rounded-lg inline-block mt-1">{seller?.student_code ? `MSSV: ${seller.student_code}` : 'Thành viên Bách Khoa'}</p>
              </div>
            </div>
            <button onClick={() => navigate(`/profile/${seller?.id || '#'}`)} className="w-full py-3 bg-slate-50 text-slate-600 text-xs font-bold rounded-xl hover:bg-slate-100 transition-colors uppercase tracking-wider flex items-center justify-center gap-2">Xem trang cá nhân <ChevronRight size={14}/></button>
          </div>
        </div>
      </div>

      {/* RELATED PRODUCTS */}
      {relatedItems.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 py-12 border-t border-slate-200 mt-8">
          <h3 className="text-2xl font-black text-slate-800 mb-8 flex items-center gap-2"><ShoppingBag className="text-[#00418E]"/> Tin cùng chuyên mục</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {relatedItems.map(item => (
              <div key={item.id} onClick={() => navigate(`/product/${item.id}`)} className="bg-white rounded-2xl border border-slate-200 p-4 cursor-pointer hover:shadow-lg hover:border-blue-200 transition-all group">
                <div className="aspect-square bg-slate-100 rounded-xl mb-4 overflow-hidden relative">
                  <img src={Array.isArray(item.images) ? item.images[0] : (item.images || 'https://via.placeholder.com/300')} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"/>
                </div>
                <h4 className="font-bold text-slate-800 text-sm line-clamp-2 mb-2 group-hover:text-[#00418E] transition-colors">{item.title}</h4>
                <p className="font-black text-[#00418E]">{item.price === 0 ? "FREE" : formatCurrency(item.price)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MOBILE BOTTOM BAR */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 lg:hidden z-50 flex gap-3 shadow-2xl pb-safe">
        {user?.id !== seller?.id && (
           <>
            <button className="flex-1 py-3 bg-white border border-slate-300 rounded-xl font-bold text-slate-700 text-sm">Gọi điện</button>
            <button onClick={handleChat} className="flex-[2] py-3 bg-[#00418E] text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-900/20">Nhắn tin ngay</button>
           </>
        )}
      </div>
    </div>
  );
};

export default ProductDetailPage;
