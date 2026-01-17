import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Heart, MessageCircle, Share2, ArrowLeft, Eye, MapPin,
  Clock, Star, Box, ShieldCheck, Calendar, ArrowRight,
  Loader2, AlertTriangle, CheckCircle2, Flag, Edit3,
  MessageSquare, Send, Trash, X, Check, ZoomIn, ShoppingBag
} from "lucide-react";
import { supabase } from "../services/supabase";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import { Product } from "../types";

// ============================================================================
// 1. VISUAL ENGINE
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
      background: white; border-radius: 24px;
      border: 1px solid #e2e8f0; 
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
    }
    .comment-bubble {
      background: #f8fafc; border-radius: 16px; border-top-left-radius: 2px;
      padding: 12px 16px; border: 1px solid #f1f5f9;
    }
    .hide-scrollbar::-webkit-scrollbar { display: none; }
    
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
// 2. TYPES & UTILS
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
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]); // New Feature
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

  // --- 1. FETCH DATA (Logic Bất Tử) ---
  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      window.scrollTo(0,0);
      setLoading(true);
      try {
        // Lấy sản phẩm
        let { data: pData, error: pError } = await supabase
          .from("products")
          .select(`*, profiles:seller_id(*)`)
          .eq("id", id)
          .single();

        // Fallback nếu lỗi relation
        if (pError || !pData) {
          const { data: rawProduct, error: rawError } = await supabase.from("products").select("*").eq("id", id).single();
          if (rawError || !rawProduct) throw new Error("Not found");
          pData = rawProduct;
          if (rawProduct.seller_id) {
            const { data: sData } = await supabase.from("profiles").select("*").eq("id", rawProduct.seller_id).single();
            pData.profiles = sData; 
          }
        }

        // Map Data
        const safeImages = Array.isArray(pData.images) && pData.images.length > 0 
          ? pData.images : (typeof pData.images === 'string' ? [pData.images] : ['https://via.placeholder.com/600x400']);

        const finalProduct = {
          ...pData,
          sellerId: pData.seller_id,
          seller: pData.profiles || {}, 
          images: safeImages,
          postedAt: pData.created_at,
          tradeMethod: pData.trade_method,
          location: pData.location_name || "TP.HCM"
        };
        setProduct(finalProduct);

        // Tăng view
        await supabase.rpc("increment_view", { product_id: id });

        // Check like
        if (currentUser) {
          const { data: sData } = await supabase.from("saved_products").select("id").eq("user_id", currentUser.id).eq("product_id", id).maybeSingle();
          if (sData) setIsLiked(true);
        }

        // --- NEW FEATURE: Fetch Related Products ---
        if (pData.category) {
          const { data: related } = await supabase
            .from("products")
            .select("*")
            .eq("category", pData.category)
            .neq("id", id) // Không lấy chính nó
            .eq("status", "available")
            .limit(4);
          setRelatedProducts(related || []);
        }

      } catch (err) {
        addToast("Sản phẩm không tồn tại", "error");
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
      const { data, error } = await supabase.from('comments').select(`*, user:profiles(name, avatar_url)`).eq('product_id', id).order('created_at', { ascending: false });
      
      if (error) { // Fallback
         const { data: rawComments } = await supabase.from('comments').select('*').eq('product_id', id).order('created_at', { ascending: false });
         setComments(rawComments as any || []);
      } else {
         setComments(data as any || []);
      }
    };
    fetchComments();
    
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
      setNewComment(""); setReplyTo(null); addToast("Đã bình luận", "success");
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

  const startChat = () => {
    if (!currentUser) return navigate("/auth");
    if (currentUser.id === product?.sellerId) return addToast("Đây là sản phẩm của bạn!", "info");
    navigate(`/chat/${product?.sellerId}`);
  };

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-[#00418E]" size={40}/></div>;
  if (!product) return null;

  const isOwner = currentUser?.id === product.sellerId;

  return (
    <div className="min-h-screen pb-32 font-sans text-slate-800 bg-[#F8FAFC]">
      <VisualEngine />
      
      {showLightbox && <ImageLightbox src={product.images[activeImg]} onClose={() => setShowLightbox(false)} />}
      {showReport && <ReportModal onClose={() => setShowReport(false)} onSubmit={(r) => { 
          supabase.from("reports").insert({ reporter_id: currentUser?.id, product_id: id, reason: r, status: 'pending' }).then(() => {
             addToast("Đã báo cáo", "success"); setShowReport(false);
          });
      }} />}

      {/* HEADER */}
      <div className="sticky top-0 glass-bar transition-all">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 rounded-full flex items-center gap-2 text-slate-600">
            <ArrowLeft size={20}/> <span className="font-bold text-sm hidden sm:block">Quay lại</span>
          </button>
          <div className="flex gap-2">
            <button onClick={handleLike} className={`p-2 rounded-full border transition-all ${isLiked ? 'bg-red-50 text-red-500 border-red-200' : 'bg-white border-slate-200 text-slate-400'}`}>
              <Heart size={20} className={isLiked ? "fill-current" : ""} />
            </button>
            <button onClick={() => { navigator.clipboard.writeText(window.location.href); setIsCopied(true); setTimeout(() => setIsCopied(false), 2000); }} className="p-2 rounded-full bg-white border border-slate-200">
              {isCopied ? <Check size={20} className="text-green-500"/> : <Share2 size={20}/>}
            </button>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-4 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
        {/* LEFT COLUMN */}
        <div className="lg:col-span-8 space-y-8">
          {/* Gallery */}
          <div className="space-y-4">
            <div className="aspect-[4/3] w-full rounded-3xl overflow-hidden bg-white shadow-sm border border-slate-200 relative group cursor-zoom-in" onClick={() => setShowLightbox(true)}>
              <img src={product.images[activeImg]} className="w-full h-full object-contain p-2 transition-transform duration-500 group-hover:scale-105" />
              {product.status === 'new' && <span className="absolute top-4 left-4 bg-[#00418E] text-white px-3 py-1 rounded-lg text-xs font-bold shadow-md">NEW</span>}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/40 text-white px-4 py-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2">
                <ZoomIn size={16}/> Phóng to
              </div>
              {product.images.length > 1 && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur-md px-3 py-1 rounded-full text-white text-xs font-bold">
                  {activeImg + 1} / {product.images.length}
                </div>
              )}
            </div>
            {product.images.length > 1 && (
              <div className="flex gap-3 overflow-x-auto hide-scrollbar">
                {product.images.map((img: string, i: number) => (
                  <button key={i} onClick={() => setActiveImg(i)} className={`w-20 h-20 rounded-xl border-2 flex-shrink-0 overflow-hidden ${activeImg === i ? 'border-[#00418E]' : 'border-transparent'}`}>
                    <img src={img} className="w-full h-full object-cover"/>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Description */}
          <div className="glass-panel p-6 md:p-8">
            <div className="flex flex-wrap gap-2 mb-4">
               <span className="px-3 py-1 bg-blue-50 text-[#00418E] text-xs font-bold rounded-lg uppercase border border-blue-100">{product.category}</span>
               <span className="px-3 py-1 bg-slate-50 text-slate-500 text-xs font-bold rounded-lg border border-slate-100 flex items-center gap-1"><Clock size={12}/> {timeAgo(product.created_at)}</span>
               <span className="px-3 py-1 bg-slate-50 text-slate-500 text-xs font-bold rounded-lg border border-slate-100 flex items-center gap-1"><Eye size={12}/> {product.view_count || 0}</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-slate-900 mb-6">{product.title}</h1>
            
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-slate-800 border-b pb-2"><ShieldCheck className="text-[#00418E]" size={20}/> Chi tiết sản phẩm</h3>
            <div className="whitespace-pre-wrap text-slate-600 leading-relaxed text-base">
              {product.description || "Người bán không cung cấp mô tả."}
            </div>
          </div>

          {/* COMMENTS (Đã khôi phục) */}
          <div className="glass-panel p-6 md:p-8">
            <h3 className="font-bold text-lg mb-6 flex items-center gap-2"><MessageSquare className="text-[#00418E]" size={20}/> Bình luận & Hỏi đáp ({comments.length})</h3>
            
            <form onSubmit={handlePostComment} className="flex gap-3 mb-8">
              <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden flex-shrink-0">
                <img src={currentUser?.avatar || `https://ui-avatars.com/api/?name=${currentUser?.name || 'Me'}`} className="w-full h-full object-cover"/>
              </div>
              <div className="flex-1 relative">
                <input value={newComment} onChange={e => setNewComment(e.target.value)} placeholder="Nhập bình luận của bạn..." className="w-full bg-slate-100 border-transparent focus:bg-white border focus:border-[#00418E] rounded-2xl px-4 py-3 outline-none transition-all pr-12"/>
                <button type="submit" disabled={isPostingComment} className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-[#00418E] text-white rounded-xl hover:bg-blue-800 disabled:opacity-50">
                  {isPostingComment ? <Loader2 size={16} className="animate-spin"/> : <Send size={16}/>}
                </button>
              </div>
            </form>

            <div className="space-y-6">
              {comments.length === 0 && <p className="text-center text-slate-400 text-sm py-4">Chưa có bình luận nào. Hãy là người đầu tiên!</p>}
              {comments.map(c => (
                <div key={c.id} className="flex gap-3 group">
                  <div className="w-9 h-9 rounded-full bg-slate-200 overflow-hidden flex-shrink-0">
                    <img src={c.user?.avatar_url || `https://ui-avatars.com/api/?name=${c.user?.name || 'User'}`} className="w-full h-full"/>
                  </div>
                  <div className="flex-1">
                    <div className="comment-bubble">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-xs text-slate-900">{c.user?.name || 'Ẩn danh'}</span>
                        <span className="text-[10px] text-slate-400">{timeAgo(c.created_at)}</span>
                      </div>
                      <p className="text-sm text-slate-700">{c.content}</p>
                    </div>
                    {currentUser && <button onClick={() => { setReplyTo(c); setNewComment(`@${c.user?.name} `); }} className="text-xs text-slate-500 font-bold mt-1 ml-2 hover:text-[#00418E]">Trả lời</button>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="lg:col-span-4 space-y-6">
          <div className="glass-panel p-6 rounded-[24px] lg:sticky lg:top-24 border-t-4 border-t-[#00418E]">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Giá bán</p>
            <p className="text-4xl font-black text-[#00418E] mb-6">{product.price === 0 ? "FREE" : formatCurrency(product.price)}</p>

            <div className="space-y-3 mb-6">
              <div className="flex justify-between p-3 bg-slate-50 rounded-xl"><span className="text-xs font-bold text-slate-500 uppercase">Tình trạng</span><span className="font-bold text-sm flex gap-1"><Star size={14} className="text-yellow-500"/>{product.condition}</span></div>
              <div className="flex justify-between p-3 bg-slate-50 rounded-xl"><span className="text-xs font-bold text-slate-500 uppercase">Khu vực</span><span className="font-bold text-sm flex gap-1"><MapPin size={14} className="text-red-500"/>{product.location}</span></div>
              <div className="flex justify-between p-3 bg-slate-50 rounded-xl"><span className="text-xs font-bold text-slate-500 uppercase">Giao dịch</span><span className="font-bold text-sm flex gap-1"><Box size={14} className="text-blue-500"/>{product.tradeMethod === 'direct' ? "Trực tiếp" : "Ship COD"}</span></div>
            </div>

            <div className="flex items-center gap-3 mb-6 cursor-pointer hover:bg-slate-50 p-2 rounded-xl transition-colors" onClick={() => navigate(`/profile/${product.seller?.id}`)}>
               <div className="relative">
                 <img src={product.seller?.avatar_url || 'https://via.placeholder.com/50'} className="w-12 h-12 rounded-full border border-slate-200"/>
                 {product.seller?.verified_status === 'verified' && <CheckCircle2 className="absolute -bottom-1 -right-1 text-blue-500 bg-white rounded-full" size={16}/>}
               </div>
               <div>
                 <h4 className="font-bold text-slate-900">{product.seller?.name || 'Người dùng'}</h4>
                 <p className="text-xs text-slate-500">{product.seller?.student_code ? `MSSV: ${product.seller.student_code}` : 'Thành viên BK'}</p>
               </div>
            </div>

            <div className="flex flex-col gap-3">
              {isOwner ? (
                <button onClick={() => navigate(`/edit-item/${product.id}`)} className="w-full py-3 bg-slate-800 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-900"><Edit3 size={18}/> Sửa tin</button>
              ) : (
                <button onClick={startChat} className="w-full py-4 bg-[#00418E] text-white rounded-xl font-bold shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2 hover:bg-blue-800 transition-all">
                  <MessageCircle size={20}/> Chat với người bán
                </button>
              )}
              {/* Đã xóa nút Gọi điện ở đây */}
              
              {!isOwner && (
                <button onClick={() => setShowReport(true)} className="w-full py-3 border border-slate-200 text-slate-600 rounded-xl font-bold text-sm hover:bg-red-50 hover:text-red-500 hover:border-red-100 transition-colors flex items-center justify-center gap-2">
                  <Flag size={16}/> Báo cáo tin này
                </button>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* NEW FEATURE: RELATED PRODUCTS */}
      {relatedProducts.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 pb-20 mt-8 border-t border-slate-200 pt-12">
           <h3 className="text-2xl font-black text-slate-800 mb-8 flex items-center gap-2"><ShoppingBag className="text-[#00418E]"/> Có thể bạn cũng thích</h3>
           <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {relatedProducts.map(item => (
                <div key={item.id} onClick={() => navigate(`/product/${item.id}`)} className="bg-white rounded-2xl border border-slate-200 p-3 cursor-pointer hover:shadow-lg hover:border-blue-200 transition-all">
                   <div className="aspect-square bg-slate-100 rounded-xl overflow-hidden mb-3">
                      <img src={Array.isArray(item.images) ? item.images[0] : (item.images || '')} className="w-full h-full object-cover"/>
                   </div>
                   <h4 className="font-bold text-sm text-slate-800 line-clamp-2 h-10 mb-2">{item.title}</h4>
                   <p className="font-black text-[#00418E]">{item.price === 0 ? "FREE" : formatCurrency(item.price)}</p>
                </div>
              ))}
           </div>
        </div>
      )}

      {/* MOBILE STICKY BAR (Đã xóa nút gọi) */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 z-30 flex gap-3 pb-safe shadow-[0_-5px_15px_rgba(0,0,0,0.05)]">
        {isOwner ? (
           <button onClick={() => navigate(`/edit-item/${product.id}`)} className="flex-1 bg-slate-800 text-white py-3 rounded-xl font-bold flex justify-center items-center gap-2">
             <Edit3 size={18}/> Chỉnh sửa
           </button>
        ) : (
           <button onClick={startChat} className="flex-1 bg-[#00418E] text-white py-3 rounded-xl font-bold flex justify-center items-center gap-2 shadow-lg">
             <MessageCircle size={18}/> Chat ngay
           </button>
        )}
      </div>
    </div>
  );
};

export default ProductDetailPage;
