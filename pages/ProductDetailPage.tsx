import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Heart, MessageCircle, Share2, ArrowLeft, Eye, MapPin,
  Clock, Star, Box, ShieldCheck, Calendar, ArrowRight,
  Loader2, AlertTriangle, CheckCircle2, Flag, Edit3,
  MessageSquare, Send, Trash, X, Check, ZoomIn, Phone
} from "lucide-react";
import { supabase } from "../services/supabase";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import { Product } from "../types";

// ============================================================================
// 1. VISUAL ENGINE (Giao diện đẹp)
// ============================================================================
const VisualEngine = () => (
  <style>{`
    :root { --primary: #00418E; }
    body { background-color: #F8FAFC; font-family: 'Inter', sans-serif; }
    
    .glass-bar { 
      background: rgba(255, 255, 255, 0.9); backdrop-filter: blur(20px); 
      border-bottom: 1px solid rgba(255, 255, 255, 0.5); z-index: 40;
    }
    .glass-panel { 
      background: rgba(255, 255, 255, 0.7); backdrop-filter: blur(20px); 
      border: 1px solid rgba(255, 255, 255, 0.8); 
      box-shadow: 0 10px 30px -10px rgba(0, 65, 142, 0.08); 
    }
    .comment-bubble {
      background: white; border-radius: 16px; border-top-left-radius: 4px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.03);
    }
    .aurora-bg {
      position: fixed; top: 0; left: 0; right: 0; height: 100vh; z-index: -1;
      background: radial-gradient(at 0% 0%, rgba(0, 71, 171, 0.08) 0px, transparent 50%),
                  radial-gradient(at 100% 0%, rgba(0, 229, 255, 0.08) 0px, transparent 50%);
    }
    .animate-enter { animation: slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; opacity: 0; }
    @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
    .hide-scrollbar::-webkit-scrollbar { display: none; }
    
    /* Modal Fullscreen */
    .modal-backdrop {
      background: rgba(0, 0, 0, 0.95); backdrop-filter: blur(8px);
      position: fixed; inset: 0; z-index: 9999;
      display: flex; align-items: center; justify-content: center;
      animation: fadeIn 0.2s ease-out;
    }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  `}</style>
);

// ============================================================================
// 2. UTILS & TYPES
// ============================================================================
interface ProductDetail extends Product {
  seller?: {
    id: string;
    name: string;
    avatar_url: string;
    verified_status: string;
    student_code: string;
  };
}

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  user: { name: string; avatar_url: string };
  parent_id?: string | null;
}

const timeAgo = (dateString: string) => {
  if (!dateString) return "Vừa xong";
  const diff = (new Date().getTime() - new Date(dateString).getTime()) / 1000;
  if (diff < 60) return "Vừa xong";
  if (diff < 3600) return Math.floor(diff / 60) + " phút trước";
  if (diff < 86400) return Math.floor(diff / 3600) + " giờ trước";
  return Math.floor(diff / 86400) + " ngày trước";
};

const formatCurrency = (amount: number) => 
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);

// ============================================================================
// 3. SUB-COMPONENTS
// ============================================================================

// Lightbox xem ảnh
const ImageLightbox = ({ src, onClose }: { src: string, onClose: () => void }) => (
  <div className="modal-backdrop" onClick={onClose}>
    <button className="absolute top-4 right-4 text-white/70 hover:text-white p-3 bg-white/10 rounded-full z-50">
      <X size={28}/>
    </button>
    <div className="w-full h-full flex items-center justify-center p-4">
      <img src={src} className="rounded-lg shadow-2xl object-contain max-h-[90vh] max-w-[95vw]" onClick={e => e.stopPropagation()} />
    </div>
  </div>
);

// Modal báo cáo
const ReportModal = ({ onClose, onSubmit }: { onClose: () => void, onSubmit: (reason: string) => void }) => {
  const [reason, setReason] = useState("");
  const reasons = ["Hàng giả/Nhái", "Lừa đảo", "Sai danh mục", "Nội dung phản cảm", "Khác"];
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-md m-4" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold flex items-center gap-2"><AlertTriangle className="text-red-500"/> Báo cáo tin đăng</h3>
          <button onClick={onClose}><X size={20} className="text-gray-400"/></button>
        </div>
        <div className="space-y-2 mb-6">
          {reasons.map(r => (
            <button key={r} onClick={() => setReason(r)} className={`w-full text-left px-4 py-3 rounded-xl border transition-all ${reason === r ? 'border-[#00418E] bg-blue-50 text-[#00418E] font-medium' : 'border-gray-200 hover:border-blue-200'}`}>
              {r}
            </button>
          ))}
        </div>
        <button disabled={!reason} onClick={() => onSubmit(reason)} className="w-full bg-red-600 text-white py-3 rounded-xl font-bold hover:bg-red-700 disabled:opacity-50">Gửi báo cáo</button>
      </div>
    </div>
  );
};

// ============================================================================
// 4. MAIN PAGE
// ============================================================================
const ProductDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const { addToast } = useToast();

  // State
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeImg, setActiveImg] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [showLightbox, setShowLightbox] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  
  // Comment State
  const [newComment, setNewComment] = useState("");
  const [isPostingComment, setIsPostingComment] = useState(false);
  const [replyTo, setReplyTo] = useState<Comment | null>(null);

  // --- 1. FETCH DATA (Logic Bất Tử - Fail safe) ---
  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      setLoading(true);
      try {
        console.log("🚀 Đang tải sản phẩm:", id);

        // Bước 1: Thử lấy dữ liệu chuẩn (Join bảng)
        let { data: pData, error: pError } = await supabase
          .from("products")
          .select(`*, profiles:seller_id(*)`) // Thử join
          .eq("id", id)
          .single();

        // Bước 2: Nếu lỗi join (do chưa setup relation), chuyển sang lấy thủ công
        if (pError || !pData) {
          console.warn("⚠️ Fallback fetch mode active...");
          const { data: rawProduct, error: rawError } = await supabase
            .from("products")
            .select("*")
            .eq("id", id)
            .single();
          
          if (rawError || !rawProduct) throw new Error("Không tìm thấy sản phẩm");
          
          pData = rawProduct;
          // Lấy seller thủ công
          if (rawProduct.seller_id) {
            const { data: sData } = await supabase.from("profiles").select("*").eq("id", rawProduct.seller_id).single();
            pData.profiles = sData; 
          }
        }

        // Bước 3: Map dữ liệu
        const safeImages = Array.isArray(pData.images) && pData.images.length > 0 
          ? pData.images 
          : (typeof pData.images === 'string' ? [pData.images] : ['https://via.placeholder.com/600x400?text=No+Image']);

        const mappedProduct: ProductDetail = {
          ...pData,
          sellerId: pData.seller_id,
          seller: pData.profiles || {}, 
          images: safeImages,
          postedAt: pData.created_at,
          tradeMethod: pData.trade_method,
          location: pData.location_name || "TP.HCM"
        };
        setProduct(mappedProduct);

        // Tăng view & Check like
        supabase.rpc("increment_view", { product_id: id }).catch(() => {});
        if (currentUser) {
          const { data: sData } = await supabase.from("saved_products").select("id").eq("user_id", currentUser.id).eq("product_id", id).maybeSingle();
          if (sData) setIsLiked(true);
        }

      } catch (err) {
        console.error(err);
        addToast("Sản phẩm không tồn tại hoặc đã bị xóa", "error");
        navigate("/market");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, currentUser]);

  // --- 2. FETCH COMMENTS ---
  useEffect(() => {
    if (!id) return;
    const fetchComments = async () => {
      // Cố gắng join user
      const { data, error } = await supabase.from('comments').select(`*, user:profiles(name, avatar_url)`).eq('product_id', id).order('created_at', { ascending: false });
      
      // Fallback nếu comment table chưa setup foreign key profile
      if (error) {
         const { data: rawComments } = await supabase.from('comments').select('*').eq('product_id', id).order('created_at', { ascending: false });
         setComments(rawComments as any || []);
      } else {
         setComments(data as any || []);
      }
    };
    fetchComments();
    
    // Realtime subscription
    const ch = supabase.channel(`comments_${id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'comments', filter: `product_id=eq.${id}` }, () => fetchComments())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [id]);

  // --- 3. ACTIONS ---
  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return navigate("/auth");
    if (!newComment.trim()) return;

    setIsPostingComment(true);
    try {
      await supabase.from('comments').insert({
        product_id: id, user_id: currentUser.id, content: newComment.trim(), parent_id: replyTo?.id || null
      });
      setNewComment(""); setReplyTo(null); addToast("Đã gửi bình luận", "success");
    } catch { addToast("Lỗi gửi bình luận", "error"); } 
    finally { setIsPostingComment(false); }
  };

  const handleLike = async () => {
    if (!currentUser) return navigate("/auth");
    const old = isLiked; setIsLiked(!isLiked);
    try {
      if (old) await supabase.from("saved_products").delete().eq("user_id", currentUser.id).eq("product_id", id);
      else await supabase.from("saved_products").insert({ user_id: currentUser.id, product_id: id });
    } catch { setIsLiked(old); }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setIsCopied(true); addToast("Đã sao chép link", "success");
    setTimeout(() => setIsCopied(false), 2000);
  };

  const startChat = () => {
    if (!currentUser) return navigate("/auth");
    if (currentUser.id === product?.sellerId) return addToast("Đây là sản phẩm của bạn!", "info");
    navigate(`/chat/${product?.sellerId}`);
  };

  if (loading) return <div className="h-screen flex flex-col items-center justify-center"><Loader2 className="animate-spin text-[#00418E] mb-4" size={40} /><p className="text-slate-500">Đang tải...</p></div>;
  if (!product) return null;

  const isOwner = currentUser?.id === product.sellerId;

  return (
    <div className="min-h-screen pb-32 font-sans text-slate-800">
      <VisualEngine />
      <div className="aurora-bg"></div>
      
      {showLightbox && <ImageLightbox src={product.images[activeImg]} onClose={() => setShowLightbox(false)} />}
      {showReport && <ReportModal onClose={() => setShowReport(false)} onSubmit={(reason) => { 
          supabase.from("reports").insert({ reporter_id: currentUser?.id, product_id: id, reason, status: 'pending' }).then(() => {
             addToast("Đã gửi báo cáo", "success"); setShowReport(false);
          });
      }} />}

      {/* HEADER */}
      <div className="sticky top-0 glass-bar transition-all">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          <button onClick={() => navigate(-1)} className="group flex items-center gap-2 rounded-full py-2 pr-4 pl-2 hover:bg-slate-100/50 transition-colors">
            <div className="bg-white p-1.5 rounded-full shadow-sm group-hover:scale-110 transition-transform"><ArrowLeft size={18} className="text-slate-700"/></div>
            <span className="font-bold text-sm text-slate-700 hidden sm:block">Quay lại</span>
          </button>
          
          <span className="font-bold text-slate-800 line-clamp-1 max-w-[200px] sm:max-w-md opacity-0 sm:opacity-100 transition-opacity">{product.title}</span>

          <div className="flex gap-2">
            <button onClick={handleLike} className={`p-2.5 rounded-full border transition-all ${isLiked ? 'bg-red-50 border-red-200 text-red-500' : 'bg-white border-slate-200 text-slate-400 hover:text-red-500'}`}>
              <Heart size={20} className={isLiked ? "fill-current" : ""} />
            </button>
            <button onClick={handleShare} className="p-2.5 rounded-full bg-white border border-slate-200 text-slate-400 hover:text-[#00418E] hover:border-blue-200 transition-colors">
              {isCopied ? <Check size={20} className="text-green-500"/> : <Share2 size={20}/>}
            </button>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-4 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
        <div className="lg:col-span-7 space-y-8 animate-enter">
          
          {/* Gallery */}
          <div className="space-y-4">
            <div className="aspect-[4/3] w-full rounded-[2rem] overflow-hidden bg-white shadow-xl border border-white/60 relative group cursor-zoom-in transition-all hover:shadow-2xl" onClick={() => setShowLightbox(true)}>
              <img src={product.images[activeImg]} className="w-full h-full object-contain p-2 transition-transform duration-500 group-hover:scale-105" alt="Product" />
              
              {product.status !== 'available' && (
                <div className="absolute top-4 right-4 px-3 py-1.5 rounded-lg border font-black text-xs uppercase tracking-wider shadow-sm backdrop-blur-md bg-slate-100 text-slate-500">
                  {product.status === 'sold' ? 'Đã bán' : 'Đang giao dịch'}
                </div>
              )}
              
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/40 text-white px-4 py-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm flex items-center gap-2 pointer-events-none">
                <ZoomIn size={16}/> Xem phóng to
              </div>

              {product.images.length > 1 && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur-md px-3 py-1 rounded-full text-white text-xs font-bold">
                  {activeImg + 1} / {product.images.length}
                </div>
              )}
            </div>
            
            {product.images.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-2 hide-scrollbar snap-x">
                {product.images.map((img, i) => (
                  <button key={i} onClick={() => setActiveImg(i)} className={`relative w-20 h-20 flex-shrink-0 rounded-2xl overflow-hidden border-2 transition-all cursor-pointer ${activeImg === i ? 'border-[#00418E] shadow-md scale-105' : 'border-transparent opacity-60 hover:opacity-100'}`}>
                    <img src={img} className="w-full h-full object-cover"/>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="glass-panel p-8 rounded-[2rem]">
            <h3 className="font-bold text-lg mb-6 flex items-center gap-2 text-slate-800"><ShieldCheck className="text-[#00418E]" size={20}/> Mô tả chi tiết</h3>
            <div className="prose prose-sm max-w-none text-slate-600 leading-relaxed whitespace-pre-wrap font-medium">
              {product.description || "Người bán không cung cấp mô tả."}
            </div>
          </div>

          {/* COMMENTS */}
          <div className="glass-panel p-8 rounded-[2rem]">
            <h3 className="font-bold text-lg mb-6 flex items-center gap-2 text-slate-800"><MessageSquare className="text-[#00418E]" size={20}/> Bình luận ({comments.length})</h3>
            <form onSubmit={handlePostComment} className="flex gap-3 mb-8">
              <div className="flex-shrink-0">
                <img src={currentUser?.avatar || `https://ui-avatars.com/api/?name=${currentUser?.name || 'Me'}`} className="w-10 h-10 rounded-full bg-slate-200 border border-white shadow-sm"/>
              </div>
              <div className="flex-1">
                {replyTo && (
                  <div className="flex justify-between items-center bg-blue-50 p-2 px-3 rounded-xl mb-2 text-xs text-blue-700 font-medium border border-blue-100">
                    <span>Đang trả lời <b>{replyTo.user?.name}</b></span>
                    <button type="button" onClick={() => setReplyTo(null)} className="p-1 hover:bg-blue-100 rounded"><Trash size={12}/></button>
                  </div>
                )}
                <div className="relative">
                  <input value={newComment} onChange={e => setNewComment(e.target.value)} placeholder="Viết bình luận..." className="w-full bg-white/80 border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-100 focus:border-[#00418E] outline-none transition-all pr-12"/>
                  <button type="submit" disabled={!newComment.trim() || isPostingComment} className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-[#00418E] text-white rounded-xl hover:bg-[#00306b] disabled:opacity-50 transition-colors">
                    {isPostingComment ? <Loader2 size={16} className="animate-spin"/> : <Send size={16}/>}
                  </button>
                </div>
              </div>
            </form>
            <div className="space-y-6">
              {comments.map(comment => (
                <div key={comment.id} className="group flex gap-3">
                  <img src={comment.user?.avatar_url || `https://ui-avatars.com/api/?name=${comment.user?.name || 'U'}`} className="w-9 h-9 rounded-full bg-slate-200 border border-white shadow-sm flex-shrink-0"/>
                  <div>
                    <div className="comment-bubble px-4 py-2.5">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-bold text-xs text-slate-900">{comment.user?.name || 'Ẩn danh'}</span>
                        <span className="text-[10px] text-slate-400 font-medium">{timeAgo(comment.created_at)}</span>
                      </div>
                      <p className="text-sm text-slate-700 leading-relaxed">{comment.content}</p>
                    </div>
                    {currentUser && <button onClick={() => setReplyTo(comment)} className="text-[10px] font-bold text-slate-400 hover:text-[#00418E] mt-1 ml-2 transition-colors">Trả lời</button>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="lg:col-span-5 space-y-6 animate-enter" style={{animationDelay: '100ms'}}>
          <div className="glass-panel p-8 rounded-[2.5rem] lg:sticky lg:top-24 border-t-4 border-t-[#00418E]">
            <div className="flex justify-between items-start mb-6">
              <span className="bg-blue-50 text-[#00418E] px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider border border-blue-100">{product.category}</span>
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 bg-white/50 px-2 py-1 rounded-lg"><Eye size={14}/> {product.view_count || 0}</div>
            </div>
            
            <h1 className="text-3xl font-black text-slate-900 mb-4 leading-tight">{product.title}</h1>
            <p className="text-4xl font-black text-[#00418E] mb-8 tracking-tight">{product.price === 0 ? "MIỄN PHÍ" : formatCurrency(product.price)}</p>

            <div className="grid grid-cols-2 gap-3 mb-8">
              <div className="p-3 bg-white/60 rounded-2xl border border-white shadow-sm">
                <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Tình trạng</p>
                <p className="font-bold text-sm text-slate-700 flex gap-2 items-center"><Star size={14} className="text-yellow-500 fill-yellow-500"/> {product.condition}</p>
              </div>
              <div className="p-3 bg-white/60 rounded-2xl border border-white shadow-sm">
                <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Giao dịch</p>
                <p className="font-bold text-sm text-slate-700 flex gap-2 items-center"><Box size={14} className="text-blue-500"/> {product.tradeMethod === 'direct' ? "Trực tiếp" : "Ship COD"}</p>
              </div>
              <div className="p-3 bg-white/60 rounded-2xl border border-white shadow-sm">
                <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Khu vực</p>
                <p className="font-bold text-sm text-slate-700 flex gap-2 items-center"><MapPin size={14} className="text-red-500"/> {product.location}</p>
              </div>
              <div className="p-3 bg-white/60 rounded-2xl border border-white shadow-sm">
                <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Ngày đăng</p>
                <p className="font-bold text-sm text-slate-700 flex gap-2 items-center"><Calendar size={14} className="text-slate-500"/> {new Date(product.postedAt).toLocaleDateString('vi-VN')}</p>
              </div>
            </div>

            <div className="group flex items-center gap-4 p-4 bg-white/50 border border-white rounded-2xl mb-8 cursor-pointer hover:bg-white hover:shadow-md transition-all" onClick={() => navigate(`/profile/${product.seller?.id || '#'}`)}>
              <div className="relative">
                <img src={product.seller?.avatar_url || `https://ui-avatars.com/api/?name=${product.seller?.name || 'User'}&background=random`} className="w-14 h-14 rounded-full border-2 border-white shadow-sm object-cover"/>
                {product.seller?.verified_status === 'verified' && <div className="absolute -bottom-1 -right-1 bg-blue-500 text-white p-0.5 rounded-full border-2 border-white"><CheckCircle2 size={12}/></div>}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <h4 className="font-bold text-slate-900 truncate">{product.seller?.name || "Người dùng ẩn danh"}</h4>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${isOwner ? 'bg-green-100 text-green-700 border-green-200' : 'bg-blue-100 text-blue-700 border-blue-200'}`}>
                    {isOwner ? "Tôi" : "Người bán"}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  {product.seller?.student_code && <span className="font-mono bg-slate-100 px-1.5 rounded">MSSV: {product.seller.student_code}</span>}
                </div>
              </div>
              <div className="p-2 bg-slate-100 rounded-full text-slate-400 group-hover:text-[#00418E] group-hover:bg-blue-50 transition-colors"><ArrowRight size={18}/></div>
            </div>

            <div className="flex flex-col gap-3">
              {isOwner ? (
                <button onClick={() => navigate(`/edit-item/${product.id}`)} className="w-full bg-slate-800 text-white py-4 rounded-2xl font-bold shadow-lg hover:bg-slate-900 transition-all flex items-center justify-center gap-2 text-lg">
                  <Edit3 size={20}/> Chỉnh sửa bài đăng
                </button>
              ) : (
                <button onClick={startChat} className="w-full bg-gradient-to-r from-[#00418E] to-[#0065D1] text-white py-4 rounded-2xl font-bold shadow-lg shadow-blue-900/20 hover:shadow-blue-900/30 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-lg">
                  <MessageCircle size={24}/> Liên hệ người bán
                </button>
              )}
              {!isOwner && (
                <button onClick={() => setShowReport(true)} className="w-full bg-white text-slate-600 border border-slate-200 py-3 rounded-2xl font-bold hover:bg-red-50 hover:text-red-600 hover:border-red-100 transition-colors text-sm flex items-center justify-center gap-2">
                  <Flag size={16}/> Báo cáo tin này
                </button>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* MOBILE STICKY BAR */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-3 z-30 flex gap-3 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] pb-safe">
        {isOwner ? (
           <button onClick={() => navigate(`/edit-item/${product.id}`)} className="flex-1 bg-slate-800 text-white py-3 rounded-xl font-bold flex justify-center items-center gap-2">
             <Edit3 size={18}/> Chỉnh sửa
           </button>
        ) : (
           <>
             <button onClick={startChat} className="flex-1 bg-[#00418E] text-white py-3 rounded-xl font-bold flex justify-center items-center gap-2 shadow-lg shadow-blue-200">
               <MessageCircle size={18}/> Chat ngay
             </button>
             <button onClick={() => addToast("Chức năng gọi chưa sẵn sàng", "info")} className="px-4 py-3 bg-blue-50 text-[#00418E] rounded-xl font-bold border border-blue-100">
               <Phone size={20}/>
             </button>
           </>
        )}
      </div>
    </div>
  );
};

export default ProductDetailPage;
