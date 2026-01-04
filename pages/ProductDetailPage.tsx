/**
 * PROJECT: BOOK EXCHANGE - HCMUT
 * MODULE: PRODUCT DETAIL (CINEMATIC EDITION)
 * AUTHOR: HCMUT STUDENT TEAM
 * ---------------------------------------------
 * Mô tả: Trang chi tiết sản phẩm với giao diện "Chân trời mới".
 * Tích hợp Supabase, Real-time comment, và luồng giao dịch Chat.
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Heart, MessageCircle, Share2, Flag, ArrowLeft,ArrowRight,
  ChevronRight, MapPin, Clock, Eye, ShieldCheck,
  Star, Box, CheckCircle2, Send, Copy, AlertTriangle,
  Calendar, Award, Zap, CornerUpRight, Info, X
} from 'lucide-react';
import { Product, User, Comment } from '../types';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import ProductCard from '../components/ProductCard';

// ============================================================================
// PART 1: THE VISUAL CORE (ADVANCED CSS-IN-JS)
// ============================================================================

const VisualEngine = () => (
  <style>{`
    :root {
      --primary: #00418E;
      --secondary: #00B0F0;
      --glass-surface: rgba(255, 255, 255, 0.65);
      --glass-border: rgba(255, 255, 255, 0.8);
      --easing: cubic-bezier(0.23, 1, 0.32, 1);
    }

    body { background-color: #F8FAFC; }

    /* --- Keyframes --- */
    @keyframes slideUp {
      from { opacity: 0; transform: translateY(40px); }
      to { opacity: 1; transform: translateY(0); }
    }
    
    @keyframes zoomIn {
      from { opacity: 0; transform: scale(0.95); }
      to { opacity: 1; transform: scale(1); }
    }

    @keyframes pulse-ring {
      0% { box-shadow: 0 0 0 0 rgba(0, 65, 142, 0.4); }
      70% { box-shadow: 0 0 0 15px rgba(0, 65, 142, 0); }
      100% { box-shadow: 0 0 0 0 rgba(0, 65, 142, 0); }
    }

    @keyframes float {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-10px); }
    }

    @keyframes shimmer {
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }

    /* --- Classes --- */
    .animate-enter { 
      animation: slideUp 1s var(--easing) forwards; 
      opacity: 0; 
    }
    
    .animate-zoom {
      animation: zoomIn 0.6s var(--easing) forwards;
    }

    .animate-float {
      animation: float 6s ease-in-out infinite;
    }

    .stagger-1 { animation-delay: 100ms; }
    .stagger-2 { animation-delay: 200ms; }
    .stagger-3 { animation-delay: 300ms; }
    .stagger-4 { animation-delay: 400ms; }

    /* Glassmorphism */
    .glass-panel {
      background: var(--glass-surface);
      backdrop-filter: blur(24px);
      -webkit-backdrop-filter: blur(24px);
      border: 1px solid var(--glass-border);
      box-shadow: 0 20px 40px -10px rgba(0,0,0,0.05);
    }

    .glass-nav {
      background: rgba(255, 255, 255, 0.85);
      backdrop-filter: blur(16px);
      border-bottom: 1px solid rgba(0,0,0,0.05);
    }

    /* Interactive Elements */
    .hover-lift {
      transition: all 0.4s var(--easing);
    }
    .hover-lift:hover {
      transform: translateY(-4px);
      box-shadow: 0 15px 30px -5px rgba(0,0,0,0.1);
    }

    .btn-primary {
      background: linear-gradient(135deg, #00418E 0%, #0065D1 100%);
      color: white;
      position: relative;
      overflow: hidden;
    }
    .btn-primary::after {
      content: '';
      position: absolute;
      top: 0; left: -100%;
      width: 50%; height: 100%;
      background: linear-gradient(to right, transparent, rgba(255,255,255,0.3), transparent);
      transform: skewX(-20deg);
      transition: 0.5s;
    }
    .btn-primary:hover::after {
      left: 100%;
      transition: 0.7s;
    }

    /* Skeleton Loading */
    .shimmer-bg {
      background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
    }

    .hide-scrollbar::-webkit-scrollbar { display: none; }
  `}</style>
);

// ============================================================================
// PART 2: UTILITIES
// ============================================================================

const formatCurrency = (amount: number) => 
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);

const timeAgo = (date: string | Date) => {
  const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + " năm trước";
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + " tháng trước";
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + " ngày trước";
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + " giờ trước";
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + " phút trước";
  return "Vừa xong";
};

// ============================================================================
// PART 3: ATOMIC COMPONENTS
// ============================================================================

// 3.1. Cinematic Image Gallery
const CinematicGallery = ({ images, status }: { images: string[], status: any }) => {
  const [active, setActive] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div className="flex flex-col gap-6 select-none sticky top-24">
      {/* Main Stage */}
      <div 
        className="relative aspect-[4/3] lg:aspect-square rounded-[2.5rem] overflow-hidden bg-white shadow-2xl shadow-blue-900/5 group border border-white/50"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="absolute inset-0 bg-gradient-to-tr from-slate-100/50 to-white/50 z-0"></div>
        
        <img 
          src={images[active]} 
          alt="Product Hero" 
          className={`w-full h-full object-contain p-8 relative z-10 transition-transform duration-700 ease-out ${isHovered ? 'scale-110' : 'scale-100'}`}
          style={{ mixBlendMode: 'multiply' }}
        />

        {/* Status Overlay */}
        {status === 'sold' && (
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px] z-20 flex items-center justify-center animate-zoom">
            <div className="border-[6px] border-white text-white text-5xl md:text-6xl font-black uppercase -rotate-12 tracking-widest px-10 py-4 opacity-90">
              ĐÃ BÁN
            </div>
          </div>
        )}

        {/* Cinematic Controls */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex gap-2 px-4 py-2 bg-black/5 backdrop-blur-md rounded-full border border-white/20 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-4 group-hover:translate-y-0">
           {images.map((_, i) => (
             <div key={i} className={`w-2 h-2 rounded-full transition-all ${i === active ? 'bg-black w-6' : 'bg-black/30'}`}></div>
           ))}
        </div>
      </div>

      {/* Thumbnails Strip */}
      {images.length > 1 && (
        <div className="flex gap-4 overflow-x-auto pb-4 px-2 hide-scrollbar snap-x">
          {images.map((img, i) => (
            <button 
              key={i} 
              onClick={() => setActive(i)}
              className={`relative w-24 h-24 flex-shrink-0 rounded-2xl overflow-hidden border-2 transition-all duration-300 snap-center group/thumb ${active === i ? 'border-[#00418E] shadow-lg scale-105' : 'border-transparent opacity-60 hover:opacity-100 bg-white'}`}
            >
              <img src={img} className="w-full h-full object-cover p-1" alt={`view-${i}`}/>
              {active !== i && <div className="absolute inset-0 bg-white/20 group-hover/thumb:bg-transparent transition-colors"></div>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// 3.2. Seller Profile Card (Premium Style)
const SellerCard = ({ seller }: { seller: User }) => {
  const navigate = useNavigate();
  return (
    <div 
      onClick={() => navigate(`/profile/${seller.id}`)}
      className="glass-panel p-5 rounded-[2rem] flex items-center gap-5 hover-lift cursor-pointer group relative overflow-hidden"
    >
      {/* Background Decoration */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-blue-50 to-transparent rounded-bl-full opacity-50 group-hover:scale-110 transition-transform duration-500"></div>

      <div className="relative z-10">
        <div className="w-16 h-16 rounded-full p-1 bg-gradient-to-tr from-[#00418E] to-[#00B0F0]">
          <img src={seller.avatar || 'https://via.placeholder.com/150'} className="w-full h-full rounded-full object-cover border-2 border-white" alt={seller.name}/>
        </div>
        {seller.isVerified && (
          <div className="absolute -bottom-1 -right-1 bg-blue-500 text-white p-1 rounded-full border-2 border-white shadow-sm">
            <CheckCircle2 size={12}/>
          </div>
        )}
      </div>
      
      <div className="flex-1 relative z-10">
        <h4 className="font-bold text-lg text-slate-800 group-hover:text-[#00418E] transition-colors">{seller.name}</h4>
        <div className="flex items-center gap-3 text-xs font-medium text-slate-500 mt-1">
          <div className="flex items-center gap-1 text-yellow-500 bg-yellow-50 px-2 py-0.5 rounded-md">
            <Star size={10} fill="currentColor"/> 4.9
          </div>
          <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
          <span>Phản hồi nhanh</span>
        </div>
      </div>

      <div className="relative z-10 p-3 bg-white rounded-full shadow-sm text-slate-400 group-hover:text-[#00418E] group-hover:bg-blue-50 transition-all">
        <CornerUpRight size={20}/>
      </div>
    </div>
  );
};

// 3.3. Spec Item (Thông số kỹ thuật)
const SpecItem = ({ icon, label, value }: { icon: any, label: string, value: string }) => (
  <div className="flex items-start gap-3 p-4 bg-slate-50/50 rounded-2xl border border-slate-100 hover:bg-white hover:shadow-md transition-all duration-300">
    <div className="p-2 bg-white rounded-xl text-[#00418E] shadow-sm">{icon}</div>
    <div>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{label}</p>
      <p className="font-bold text-slate-800 text-sm">{value}</p>
    </div>
  </div>
);

// 3.4. Comment Item
const CommentItem = ({ comment }: { comment: Comment }) => (
  <div className="flex gap-4 p-4 bg-white rounded-2xl border border-slate-50 shadow-sm hover:shadow-md transition-all">
    <img src={comment.userAvatar} className="w-10 h-10 rounded-full bg-slate-100 border border-slate-100 object-cover" alt="u"/>
    <div className="flex-1">
      <div className="flex justify-between items-start mb-1">
        <span className="font-bold text-sm text-slate-900">{comment.userName}</span>
        <span className="text-[10px] text-slate-400 font-medium">{timeAgo(comment.createdAt)}</span>
      </div>
      <p className="text-slate-600 text-sm leading-relaxed">{comment.content}</p>
    </div>
  </div>
);

// ============================================================================
// PART 4: MAIN LOGIC
// ============================================================================

const ProductDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const { addToast } = useToast();
  
  // State
  const [product, setProduct] = useState<Product | null>(null);
  const [seller, setSeller] = useState<User | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [related, setRelated] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'discussion'>('details');
  const [commentInput, setCommentInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch Logic
  const fetchData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const { data: pData } = await supabase.from('products').select('*').eq('id', id).single();
      if (!pData) throw new Error("Not found");
      
      const mappedProduct: Product = { ...pData, sellerId: pData.seller_id, images: pData.images || [], status: pData.status, postedAt: pData.posted_at };
      setProduct(mappedProduct);

      // Parallel Fetching for Speed
      const [sellerRes, commentRes, relatedRes, likeRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', mappedProduct.sellerId).single(),
        supabase.from('comments').select(`*, user:user_id(name, avatar_url)`).eq('product_id', id).order('created_at', { ascending: false }),
        supabase.from('products').select('*').eq('category', mappedProduct.category).neq('id', id).limit(4),
        currentUser ? supabase.from('saved_products').select('id').eq('user_id', currentUser.id).eq('product_id', id).maybeSingle() : Promise.resolve({ data: null })
      ]);

      if (sellerRes.data) setSeller({ ...sellerRes.data, id: sellerRes.data.id, avatar: sellerRes.data.avatar_url, isVerified: sellerRes.data.is_verified });
      setComments(commentRes.data || []);
      setRelated(relatedRes.data?.map((p: any) => ({ ...p, sellerId: p.seller_id, images: p.images || [], status: p.status })) || []);
      setIsLiked(!!likeRes.data);
      
      // Silent view count update
      supabase.rpc('increment_view_count', { product_id: id });

    } catch (err) {
      addToast("Sản phẩm không tồn tại hoặc đã bị xóa.", "error");
      navigate('/market');
    } finally {
      setLoading(false);
    }
  }, [id, currentUser, navigate, addToast]);

  useEffect(() => { fetchData(); window.scrollTo(0, 0); }, [fetchData]);

  // Actions
  const handleLike = async () => {
    if (!currentUser) return navigate('/auth');
    setIsLiked(!isLiked); // Optimistic UI
    try {
      if (isLiked) await supabase.from('saved_products').delete().eq('user_id', currentUser.id).eq('product_id', id);
      else await supabase.from('saved_products').insert({ user_id: currentUser.id, product_id: id });
    } catch { setIsLiked(!isLiked); } // Revert if failed
  };

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return navigate('/auth');
    if (!commentInput.trim()) return;
    
    setIsSubmitting(true);
    const { error } = await supabase.from('comments').insert({ product_id: id, user_id: currentUser.id, content: commentInput.trim() });
    if (!error) { 
      setCommentInput(''); 
      fetchData(); 
      addToast("Đã gửi bình luận", "success"); 
    }
    setIsSubmitting(false);
  };

  const copyLink = () => { navigator.clipboard.writeText(window.location.href); addToast("Đã sao chép liên kết", "success"); };

  // Loading State
  if (loading) return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center gap-4">
      <VisualEngine/>
      <div className="w-12 h-12 border-4 border-blue-100 border-t-[#00418E] rounded-full animate-spin"></div>
      <p className="text-slate-400 text-sm font-medium animate-pulse">Đang tải dữ liệu...</p>
    </div>
  );

  if (!product) return null;

  const isOwner = currentUser?.id === product.sellerId;

  return (
    <div className="min-h-screen font-sans text-slate-800 pb-32">
      <VisualEngine />
      
      {/* --- HEADER (Glassmorphism Sticky) --- */}
      <div className="sticky top-0 z-50 glass-nav transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4 animate-enter">
            <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500 hover:text-slate-900"><ArrowLeft size={20}/></button>
            <div className="hidden md:flex items-center gap-2 text-sm font-medium text-slate-500">
              <Link to="/market" className="hover:text-[#00418E] transition-colors">Market</Link>
              <ChevronRight size={14}/>
              <span className="text-slate-900 truncate max-w-[200px] font-bold">{product.title}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 animate-enter stagger-1">
            <button onClick={copyLink} className="p-2 hover:bg-blue-50 text-slate-500 hover:text-[#00418E] rounded-full transition-colors"><Share2 size={20}/></button>
            <button className="p-2 hover:bg-red-50 text-slate-500 hover:text-red-500 rounded-full transition-colors"><Flag size={20}/></button>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16">
          
          {/* --- LEFT COLUMN: GALLERY & CONTENT (60%) --- */}
          <div className="lg:col-span-7 space-y-12 animate-enter">
            <CinematicGallery images={product.images} status={product.status} />
            
            {/* Tabbed Content Area */}
            <div className="space-y-8">
              <div className="flex gap-8 border-b border-gray-200">
                <button 
                  onClick={() => setActiveTab('details')}
                  className={`pb-4 text-lg font-bold transition-all relative ${activeTab === 'details' ? 'text-[#00418E]' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  Thông tin chi tiết
                  {activeTab === 'details' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-[#00418E] rounded-full animate-zoom"></span>}
                </button>
                <button 
                  onClick={() => setActiveTab('discussion')}
                  className={`pb-4 text-lg font-bold transition-all relative ${activeTab === 'discussion' ? 'text-[#00418E]' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  Thảo luận ({comments.length})
                  {activeTab === 'discussion' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-[#00418E] rounded-full animate-zoom"></span>}
                </button>
              </div>

              {activeTab === 'details' ? (
                <div className="animate-enter stagger-1">
                  <div className="prose prose-slate max-w-none text-slate-600 leading-loose text-base mb-8">
                    {product.description || "Người bán chưa cung cấp mô tả chi tiết."}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <SpecItem icon={<Star size={18}/>} label="Tình trạng" value={product.condition} />
                    <SpecItem icon={<Box size={18}/>} label="Giao dịch" value={product.tradeMethod === 'direct' ? 'Trực tiếp' : 'Ship COD'} />
                    <SpecItem icon={<MapPin size={18}/>} label="Khu vực" value="TP. Hồ Chí Minh" />
                    <SpecItem icon={<Calendar size={18}/>} label="Ngày đăng" value={new Date(product.postedAt).toLocaleDateString()} />
                  </div>
                </div>
              ) : (
                <div className="animate-enter stagger-1 space-y-6">
                  {currentUser ? (
                    <form onSubmit={handleComment} className="flex gap-4 items-start">
                      <img src={currentUser.avatar} className="w-10 h-10 rounded-full border border-gray-200 shadow-sm" alt="me"/>
                      <div className="flex-1 relative group">
                        <textarea 
                          value={commentInput}
                          onChange={e => setCommentInput(e.target.value)}
                          placeholder="Bạn có thắc mắc gì về sản phẩm này?..."
                          className="w-full bg-white border border-gray-200 rounded-2xl p-4 pr-14 focus:outline-none focus:border-[#00418E] focus:ring-4 focus:ring-blue-50 transition-all min-h-[80px] resize-none shadow-sm text-sm"
                        />
                        <button disabled={!commentInput.trim() || isSubmitting} className="absolute right-3 bottom-3 p-2 bg-[#00418E] text-white rounded-xl shadow-lg hover:shadow-blue-500/30 hover:scale-105 transition-all active:scale-95 disabled:opacity-50">
                          <Send size={16}/>
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="p-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-center">
                      <p className="text-slate-500 mb-4">Bạn cần đăng nhập để tham gia thảo luận.</p>
                      <Link to="/auth" className="inline-block px-6 py-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-700 hover:border-[#00418E] hover:text-[#00418E] transition-all">Đăng nhập ngay</Link>
                    </div>
                  )}
                  
                  <div className="space-y-4">
                    {comments.map((c, i) => (
                      <div key={c.id} className="animate-enter" style={{ animationDelay: `${i * 50}ms` }}>
                        <CommentItem comment={c} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* --- RIGHT COLUMN: STICKY INFO PANEL (40%) --- */}
          <div className="lg:col-span-5 relative">
            <div className="sticky top-24 space-y-8 animate-enter stagger-2">
              
              {/* Product Info Card */}
              <div className="glass-panel p-8 rounded-[2.5rem] relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-50 to-transparent rounded-bl-full -mr-16 -mt-16 pointer-events-none opacity-50"></div>
                
                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-6">
                    <span className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-[#00418E] rounded-lg text-xs font-black uppercase tracking-wider border border-blue-100">
                      <Box size={12}/> {product.category}
                    </span>
                    <button onClick={handleLike} className="p-2.5 bg-white rounded-full shadow-sm hover:shadow-md border border-slate-100 text-slate-400 hover:text-red-500 transition-all active:scale-90">
                      <Heart size={22} className={isLiked ? 'fill-red-500 text-red-500' : ''}/>
                    </button>
                  </div>

                  <h1 className="text-3xl md:text-4xl font-black text-slate-900 leading-tight mb-4">{product.title}</h1>
                  
                  <div className="flex items-center gap-6 text-sm font-bold text-slate-400 mb-8 pb-8 border-b border-slate-100">
                    <div className="flex items-center gap-1.5"><Clock size={16} className="text-[#00418E]"/> {timeAgo(product.postedAt)}</div>
                    <div className="flex items-center gap-1.5"><Eye size={16} className="text-[#00418E]"/> {product.view_count}</div>
                    <div className="flex items-center gap-1.5"><MapPin size={16} className="text-[#00418E]"/> HCMUT</div>
                  </div>

                  <div className="mb-8">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Giá bán</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-5xl font-black text-[#00418E] tracking-tighter drop-shadow-sm">
                        {product.price === 0 ? 'Miễn phí' : formatCurrency(product.price)}
                      </span>
                      {product.price === 0 && <span className="text-green-500 text-sm font-bold bg-green-50 px-2 py-1 rounded-md border border-green-100">Quà tặng</span>}
                    </div>
                  </div>

                  <div className="flex flex-col gap-3">
                    {isOwner ? (
                      <button onClick={() => navigate(`/post-item?edit=${product.id}`)} className="w-full py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-bold text-lg transition-all">
                        Chỉnh sửa bài đăng
                      </button>
                    ) : (
                      // NÚT CHAT DUY NHẤT - TRUYỀN PRODUCT ID
                      <button 
                        onClick={() => navigate(`/chat?partnerId=${seller?.id}&productId=${product.id}`)}
                        disabled={product.status === 'sold'}
                        className="btn-primary w-full py-4 rounded-2xl font-bold text-lg shadow-xl shadow-blue-900/20 transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <MessageCircle size={24} className="fill-current"/> 
                        {product.status === 'sold' ? 'Sản phẩm đã bán' : 'Nhắn tin & Chốt đơn'}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Seller & Safety */}
              {seller && <SellerCard seller={seller} />}
              
              <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex gap-4 items-start">
                 <div className="p-3 bg-blue-50 text-[#00418E] rounded-xl"><ShieldCheck size={24}/></div>
                 <div>
                    <h4 className="font-bold text-slate-900 text-sm mb-1">Giao dịch an toàn</h4>
                    <p className="text-xs text-slate-500 leading-relaxed">
                       Chỉ nên giao dịch trực tiếp tại khuôn viên trường (H6, Thư viện). Không chuyển khoản trước khi nhận hàng.
                    </p>
                 </div>
              </div>

            </div>
          </div>
        </div>

        {/* --- RELATED PRODUCTS --- */}
        {related.length > 0 && (
          <div className="mt-32 border-t border-slate-200 pt-16 animate-enter stagger-3">
            <div className="flex items-center justify-between mb-10">
              <h3 className="text-3xl font-black text-slate-900">Sản phẩm tương tự</h3>
              <Link to="/market" className="text-[#00418E] font-bold hover:underline flex items-center gap-1 group">
                 Xem tất cả <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform"/>
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {related.map(p => <ProductCard key={p.id} product={p} />)}
            </div>
          </div>
        )}
      </main>

      {/* --- MOBILE STICKY BAR (BOTTOM) --- */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-gray-200 p-4 lg:hidden z-50 animate-enter shadow-[0_-10px_30px_rgba(0,0,0,0.1)]">
        <div className="flex gap-3">
           <button 
             onClick={() => navigate(`/chat?partnerId=${seller?.id}&productId=${product.id}`)} 
             disabled={product.status === 'sold'}
             className="flex-1 btn-primary text-white py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-transform disabled:opacity-50"
           >
             <MessageCircle size={20} className="fill-current"/> Chat Ngay
           </button>
           <button onClick={handleLike} className={`w-14 flex items-center justify-center rounded-xl border-2 transition-all active:scale-95 ${isLiked ? 'border-red-500 bg-red-50 text-red-500' : 'border-gray-200 text-gray-400 bg-white'}`}>
              <Heart size={24} className={isLiked ? 'fill-current' : ''}/>
           </button>
        </div>
      </div>

    </div>
  );
};

export default ProductDetailPage;
