import React, { useEffect, useState, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  Heart, MessageCircle, Share2, Flag, ArrowLeft,
  ChevronRight, MapPin, Clock, Eye, ShieldCheck,
  Star, Box, CheckCircle2, Send, Calendar,
  Award, Zap, CornerUpRight, Info, AlertTriangle,
  Smartphone
} from "lucide-react";
import { supabase } from "../services/supabase";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import { Product, DBProfile, Comment } from "../types";

// --- STYLES & ANIMATIONS ---
const VisualEngine = () => (
  <style>{`
    :root {
      --primary: #00418E;
      --secondary: #00B0F0;
      --glass-surface: rgba(255, 255, 255, 0.75);
      --glass-border: rgba(255, 255, 255, 0.6);
    }
    body { background-color: #F8FAFC; color: #0F172A; font-family: 'Inter', system-ui, sans-serif; }

    /* Animations */
    @keyframes blob { 
      0% { transform: translate(0px, 0px) scale(1); } 
      33% { transform: translate(30px, -50px) scale(1.1); } 
      66% { transform: translate(-20px, 20px) scale(0.9); } 
      100% { transform: translate(0px, 0px) scale(1); } 
    }
    .animate-blob { animation: blob 10s infinite; }
    
    @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
    .animate-enter { animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; opacity: 0; }
    
    .stagger-1 { animation-delay: 100ms; }
    .stagger-2 { animation-delay: 200ms; }
    .stagger-3 { animation-delay: 300ms; }

    /* Components */
    .glass-panel {
      background: var(--glass-surface);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid var(--glass-border);
      box-shadow: 0 20px 40px -10px rgba(0, 65, 142, 0.1);
    }

    .btn-primary {
      background: linear-gradient(135deg, #00418E 0%, #0065D1 100%);
      color: white;
      transition: all 0.3s ease;
    }
    .btn-primary:hover {
      box-shadow: 0 10px 20px -5px rgba(0, 65, 142, 0.4);
      transform: translateY(-2px);
    }

    .hover-scale { transition: transform 0.2s; }
    .hover-scale:hover { transform: scale(1.05); }
    .active-scale:active { transform: scale(0.95); }
    
    .shimmer-bg {
      background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
    }
    @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
  `}</style>
);

const AnimatedBackground = () => (
  <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
    <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-300/30 rounded-full mix-blend-multiply filter blur-[100px] animate-blob"></div>
    <div className="absolute top-0 right-1/4 w-96 h-96 bg-purple-300/30 rounded-full mix-blend-multiply filter blur-[100px] animate-blob animation-delay-2000"></div>
    <div className="absolute -bottom-32 left-1/3 w-96 h-96 bg-cyan-300/30 rounded-full mix-blend-multiply filter blur-[100px] animate-blob animation-delay-4000"></div>
  </div>
);

// --- UTILS ---
const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(amount);

const timeAgo = (date: string | Date) => {
  if (!date) return "Vừa xong";
  const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
  if (seconds > 86400) return Math.floor(seconds / 86400) + " ngày trước";
  if (seconds > 3600) return Math.floor(seconds / 3600) + " giờ trước";
  if (seconds > 60) return Math.floor(seconds / 60) + " phút trước";
  return "Vừa xong";
};

// --- COMPONENTS ---

const CinematicGallery = ({ images, status }: { images: string[]; status: any }) => {
  const [active, setActive] = useState(0);
  return (
    <div className="sticky top-24 flex flex-col gap-4 select-none">
      <div className="group relative aspect-4/3 w-full overflow-hidden rounded-[2rem] border border-white/60 bg-white shadow-xl">
        {images.length > 0 ? (
          <img
            src={images[active]}
            alt="Product"
            className="h-full w-full object-contain p-2 transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-slate-50 text-slate-300">
            <Box size={48} />
          </div>
        )}
        
        {status === "sold" && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
            <div className="-rotate-12 border-4 border-white px-8 py-3 text-4xl font-black tracking-widest text-white uppercase opacity-90">
              ĐÃ BÁN
            </div>
          </div>
        )}
      </div>

      {images.length > 1 && (
        <div className="flex gap-3 overflow-x-auto pb-2 hide-scrollbar">
          {images.map((img, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className={`relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border-2 transition-all ${
                active === i ? "border-[#00418E] ring-2 ring-blue-100" : "border-transparent opacity-70 hover:opacity-100"
              }`}
            >
              <img src={img} className="h-full w-full object-cover" alt={`thumb-${i}`} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const SellerCard = ({ seller }: { seller: any }) => {
  const navigate = useNavigate();
  // Fallback nếu seller null hoặc thiếu data
  const name = seller?.name || "Người dùng ẩn danh";
  const avatar = seller?.avatar_url || `https://ui-avatars.com/api/?name=${name}&background=random`;
  const isVerified = seller?.is_verified || seller?.verified_status === 'verified';

  return (
    <div
      onClick={() => seller?.id && navigate(`/profile/${seller.id}`)}
      className="glass-panel group relative flex cursor-pointer items-center gap-4 overflow-hidden rounded-3xl p-4 transition-transform hover:-translate-y-1"
    >
      <div className="relative">
        <img src={avatar} className="h-14 w-14 rounded-full border-2 border-white object-cover shadow-sm" alt={name} />
        {isVerified && (
          <div className="absolute -right-1 -bottom-1 rounded-full border-2 border-white bg-blue-500 p-0.5 text-white">
            <CheckCircle2 size={12} />
          </div>
        )}
      </div>
      <div className="flex-1">
        <h4 className="text-base font-bold text-slate-800 group-hover:text-[#00418E]">{name}</h4>
        <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
          <span className="flex items-center gap-1 text-yellow-500"><Star size={10} fill="currentColor" /> 4.9</span>
          <span className="h-1 w-1 rounded-full bg-slate-300"></span>
          <span>Phản hồi nhanh</span>
        </div>
      </div>
      <div className="rounded-full bg-white p-2.5 text-slate-400 shadow-sm group-hover:text-[#00418E]">
        <CornerUpRight size={18} />
      </div>
    </div>
  );
};

const SpecItem = ({ icon, label, value }: { icon: any; label: string; value: string }) => (
  <div className="flex items-start gap-3 rounded-2xl border border-white bg-white/50 p-3 shadow-sm">
    <div className="rounded-xl bg-white p-2 text-[#00418E] shadow-sm">{icon}</div>
    <div>
      <p className="mb-0.5 text-[10px] font-bold tracking-wider text-slate-400 uppercase">{label}</p>
      <p className="text-sm font-bold text-slate-800 line-clamp-1">{value}</p>
    </div>
  </div>
);

const CommentItem = ({ comment }: { comment: any }) => (
  <div className="flex gap-4 rounded-2xl border border-white bg-white/60 p-4 shadow-sm">
    <img
      src={comment.user?.avatar_url || `https://ui-avatars.com/api/?name=${comment.user?.name || 'U'}`}
      className="h-10 w-10 rounded-full border border-white bg-slate-100 object-cover"
      alt="u"
    />
    <div className="flex-1">
      <div className="mb-1 flex items-start justify-between">
        <span className="text-sm font-bold text-slate-900">{comment.user?.name || "Người dùng"}</span>
        <span className="text-[10px] font-medium text-slate-400">{timeAgo(comment.created_at)}</span>
      </div>
      <p className="text-sm leading-relaxed text-slate-600">{comment.content}</p>
    </div>
  </div>
);

// --- MAIN PAGE ---
const ProductDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const { addToast } = useToast();

  const [product, setProduct] = useState<Product | null>(null);
  const [seller, setSeller] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  const [commentInput, setCommentInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch Data
  const fetchData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      // 1. Fetch Product + Seller (JOIN)
      const { data: pData, error } = await supabase
        .from("products")
        .select(`
          *,
          profiles:seller_id (*) 
        `)
        .eq("id", id)
        .single();

      if (error || !pData) throw new Error("Sản phẩm không tồn tại");

      // Map DB -> Client Model
      const mappedProduct: Product = {
        ...pData,
        sellerId: pData.seller_id,
        images: pData.images || [],
        postedAt: pData.created_at, // Map created_at -> postedAt
        tradeMethod: pData.trade_method,
        location: pData.location_name || "TP.HCM"
      };
      
      setProduct(mappedProduct);
      setSeller(pData.profiles); // Data seller lấy từ join

      // 2. Fetch Comments
      const { data: cData } = await supabase
        .from("comments")
        .select(`*, user:user_id(name, avatar_url)`)
        .eq("product_id", id)
        .order("created_at", { ascending: false });
      
      setComments(cData || []);

      // 3. Check Like
      if (currentUser) {
        const { data: lData } = await supabase
          .from("saved_products")
          .select("id")
          .eq("user_id", currentUser.id)
          .eq("product_id", id)
          .maybeSingle();
        setIsLiked(!!lData);
      }

      // Incr View
      supabase.rpc("increment_view_count", { product_id: id });

    } catch (err) {
      console.error(err);
      addToast("Không tìm thấy sản phẩm hoặc đã bị xóa.", "error");
      navigate("/market");
    } finally {
      setLoading(false);
    }
  }, [id, currentUser?.id]);

  useEffect(() => { fetchData(); window.scrollTo(0, 0); }, [fetchData]);

  // Handlers
  const handleLike = async () => {
    if (!currentUser) return navigate("/auth");
    setIsLiked(!isLiked);
    try {
      if (isLiked) await supabase.from("saved_products").delete().eq("user_id", currentUser.id).eq("product_id", id);
      else await supabase.from("saved_products").insert({ user_id: currentUser.id, product_id: id });
    } catch { setIsLiked(!isLiked); }
  };

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return navigate("/auth");
    if (!commentInput.trim()) return;

    setIsSubmitting(true);
    const { error } = await supabase
      .from("comments")
      .insert({ product_id: id, user_id: currentUser.id, content: commentInput.trim() });
    
    if (!error) {
      setCommentInput("");
      fetchData(); // Refresh comments
      addToast("Đã gửi bình luận", "success");
    }
    setIsSubmitting(false);
  };

  const startChat = () => {
    if (!currentUser) return navigate("/auth");
    // Chuyển hướng sang trang chat với param partnerId và productId
    navigate(`/chat?partnerId=${product?.sellerId}&productId=${product?.id}`);
  };

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-[#F8FAFC]">
      <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-[#00418E]"></div>
    </div>
  );

  if (!product) return null;

  return (
    <div className="min-h-screen pb-32 font-sans text-slate-800">
      <VisualEngine />
      <AnimatedBackground />

      {/* HEADER */}
      <div className="sticky top-0 z-50 border-b border-white/20 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          <button onClick={() => navigate(-1)} className="rounded-full p-2 hover:bg-slate-100 transition-colors">
            <ArrowLeft size={20} className="text-slate-600" />
          </button>
          <span className="font-bold text-slate-800 line-clamp-1 max-w-[200px]">{product.title}</span>
          <div className="flex gap-2">
            <button onClick={handleLike} className={`p-2 rounded-full transition-colors ${isLiked ? 'text-red-500 bg-red-50' : 'text-slate-400 hover:bg-slate-50'}`}>
              <Heart size={20} className={isLiked ? 'fill-current' : ''} />
            </button>
            <button className="p-2 rounded-full text-slate-400 hover:bg-slate-50">
              <Share2 size={20} />
            </button>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
          
          {/* LEFT: IMAGES & COMMENTS (7 cols) */}
          <div className="space-y-8 lg:col-span-7 animate-enter">
            <CinematicGallery images={product.images} status={product.status} />
            
            {/* Description */}
            <div className="glass-panel rounded-3xl p-6 md:p-8">
              <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Info size={18} className="text-blue-600"/> Mô tả chi tiết
              </h3>
              <div className="prose prose-slate max-w-none text-sm leading-relaxed text-slate-600 whitespace-pre-wrap">
                {product.description || "Chưa có mô tả chi tiết."}
              </div>
            </div>

            {/* Comments */}
            <div className="glass-panel rounded-3xl p-6 md:p-8">
              <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                <MessageCircle size={18} className="text-blue-600"/> Thảo luận ({comments.length})
              </h3>
              
              {currentUser ? (
                <form onSubmit={handleComment} className="flex gap-4 mb-8">
                  <img src={currentUser.avatar} className="w-10 h-10 rounded-full border shadow-sm" />
                  <div className="flex-1 relative">
                    <input 
                      value={commentInput}
                      onChange={e => setCommentInput(e.target.value)}
                      placeholder="Đặt câu hỏi cho người bán..."
                      className="w-full rounded-2xl border-none bg-slate-50 px-4 py-3 pr-12 text-sm font-medium focus:ring-2 focus:ring-blue-100"
                    />
                    <button disabled={!commentInput.trim()} className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-blue-600 text-white rounded-xl shadow-md hover:scale-105 active:scale-95 disabled:opacity-50 transition-all">
                      <Send size={14} />
                    </button>
                  </div>
                </form>
              ) : (
                <div className="bg-slate-50 rounded-xl p-4 text-center text-sm text-slate-500 mb-6">
                  Vui lòng <Link to="/auth" className="text-blue-600 font-bold hover:underline">đăng nhập</Link> để bình luận.
                </div>
              )}

              <div className="space-y-4">
                {comments.map(c => <CommentItem key={c.id} comment={c} />)}
                {comments.length === 0 && <p className="text-center text-slate-400 text-sm">Chưa có bình luận nào.</p>}
              </div>
            </div>
          </div>

          {/* RIGHT: INFO & ACTION (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="sticky top-24 space-y-6 animate-enter stagger-1">
              
              {/* Main Info Card */}
              <div className="glass-panel rounded-[2.5rem] p-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 -mt-10 -mr-10 h-40 w-40 bg-blue-100/50 rounded-full blur-3xl pointer-events-none"></div>
                
                <div className="mb-4 flex items-start justify-between">
                  <span className="inline-block rounded-lg bg-blue-50 px-3 py-1 text-xs font-black uppercase tracking-wider text-[#00418E]">
                    {product.category}
                  </span>
                  <div className="flex items-center gap-1 text-xs font-bold text-slate-400">
                    <Eye size={14}/> {product.view_count}
                  </div>
                </div>

                <h1 className="text-3xl font-black text-slate-900 leading-tight mb-4">{product.title}</h1>
                
                <div className="flex items-baseline gap-2 mb-8">
                  <span className="text-4xl font-black text-[#00418E] tracking-tight">
                    {product.price === 0 ? "Miễn phí" : formatCurrency(product.price)}
                  </span>
                  {product.price === 0 && <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-bold rounded-md">GIFT</span>}
                </div>

                <div className="grid grid-cols-2 gap-3 mb-8">
                  <SpecItem icon={<Star size={16}/>} label="Tình trạng" value={product.condition === 'new' ? 'Mới 100%' : 'Đã qua sử dụng'} />
                  <SpecItem icon={<Box size={16}/>} label="Giao dịch" value={product.tradeMethod === 'direct' ? 'Trực tiếp' : 'Ship COD'} />
                  <SpecItem icon={<MapPin size={16}/>} label="Khu vực" value={product.location || "TP.HCM"} />
                  <SpecItem icon={<Calendar size={16}/>} label="Ngày đăng" value={new Date(product.postedAt).toLocaleDateString()} />
                </div>

                {product.sellerId === currentUser?.id ? (
                  <button onClick={() => navigate(`/post-item?edit=${product.id}`)} className="w-full py-4 rounded-2xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 transition-colors">
                    Chỉnh sửa bài đăng
                  </button>
                ) : (
                  <button 
                    onClick={startChat}
                    className="btn-primary w-full py-4 rounded-2xl font-bold text-lg shadow-xl shadow-blue-900/20 flex items-center justify-center gap-2 active:scale-95"
                  >
                    <MessageCircle className="fill-current" /> Nhắn tin ngay
                  </button>
                )}
              </div>

              {/* Seller Info */}
              <SellerCard seller={seller} />

              {/* Safety Tip */}
              <div className="flex gap-4 p-5 rounded-3xl bg-white border border-slate-100 shadow-sm items-start">
                <div className="p-2 bg-green-50 text-green-600 rounded-xl"><ShieldCheck size={20}/></div>
                <div>
                  <h4 className="font-bold text-sm text-slate-800">Giao dịch an toàn</h4>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Nên giao dịch trực tiếp tại các khu vực đông người trong trường (Sảnh H6, Thư viện). Kiểm tra kỹ hàng trước khi thanh toán.
                  </p>
                </div>
              </div>

            </div>
          </div>

        </div>
      </main>

      {/* MOBILE BOTTOM BAR */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur-md border-t border-slate-200 lg:hidden z-50 animate-enter">
        <div className="flex gap-3">
          <button 
            onClick={startChat}
            className="flex-1 btn-primary py-3 rounded-xl font-bold shadow-lg flex items-center justify-center gap-2"
          >
            <MessageCircle className="fill-current" size={20} /> Chat ngay
          </button>
          <button 
            onClick={handleLike}
            className={`w-12 flex items-center justify-center rounded-xl border-2 transition-colors ${isLiked ? 'border-red-500 bg-red-50 text-red-500' : 'border-slate-200 text-slate-400'}`}
          >
            <Heart size={24} className={isLiked ? 'fill-current' : ''} />
          </button>
        </div>
      </div>

    </div>
  );
};

export default ProductDetailPage;
