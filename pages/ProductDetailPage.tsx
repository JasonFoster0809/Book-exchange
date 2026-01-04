import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Heart, MessageCircle, Share2, Flag, ArrowLeft,
  ChevronRight, MapPin, Clock, Eye, ShieldCheck,
  Star, Box, CheckCircle2, Send, ShoppingBag,
  MoreHorizontal, ChevronDown, Copy, AlertTriangle
} from 'lucide-react';
import { Product, User, Comment, ProductStatus } from '../types';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import ProductCard from '../components/ProductCard';

// ============================================================================
// 1. CONFIG & STYLES (THE ANIMATION ENGINE)
// ============================================================================

const CURRENCY_LOCALE = 'vi-VN';

const Animations = () => (
  <style>{`
    :root {
      --ease-out-quart: cubic-bezier(0.165, 0.84, 0.44, 1);
    }
    
    body { background-color: #FAFAFA; }

    /* --- Keyframes --- */
    @keyframes fadeInUp {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
    
    @keyframes scaleIn {
      from { opacity: 0; transform: scale(0.95); }
      to { opacity: 1; transform: scale(1); }
    }

    @keyframes shimmer {
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }

    /* --- Classes --- */
    .animate-enter { 
      animation: fadeInUp 0.8s var(--ease-out-quart) forwards; 
      opacity: 0; 
    }
    
    .stagger-1 { animation-delay: 100ms; }
    .stagger-2 { animation-delay: 200ms; }
    .stagger-3 { animation-delay: 300ms; }
    .stagger-4 { animation-delay: 400ms; }

    .hover-scale {
      transition: transform 0.3s var(--ease-out-quart);
    }
    .hover-scale:hover {
      transform: scale(1.02);
    }

    .shimmer-bg {
      background: linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%);
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
    }

    .glass-nav {
      background: rgba(255, 255, 255, 0.85);
      backdrop-filter: blur(12px);
      border-bottom: 1px solid rgba(0,0,0,0.05);
    }

    .hide-scrollbar::-webkit-scrollbar { display: none; }
  `}</style>
);

const formatCurrency = (amount: number) => 
  new Intl.NumberFormat(CURRENCY_LOCALE, { style: 'currency', currency: 'VND' }).format(amount);

const timeAgo = (date: string | Date) => {
  const d = new Date(date);
  return new Intl.DateTimeFormat(CURRENCY_LOCALE, { day: '2-digit', month: '2-digit', year: 'numeric' }).format(d);
};

// ============================================================================
// 2. UI COMPONENTS (PROFESSIONAL & POLISHED)
// ============================================================================

// 2.1. Skeleton Loading (Chuyên nghiệp là phải có cái này)
const LoadingSkeleton = () => (
  <div className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-12 gap-10">
    <div className="lg:col-span-7 space-y-4">
      <div className="aspect-[4/3] rounded-3xl shimmer-bg w-full"></div>
      <div className="flex gap-4">
        {[1,2,3].map(i => <div key={i} className="w-20 h-20 rounded-xl shimmer-bg"></div>)}
      </div>
    </div>
    <div className="lg:col-span-5 space-y-6">
      <div className="h-8 w-3/4 rounded-lg shimmer-bg"></div>
      <div className="h-6 w-1/2 rounded-lg shimmer-bg"></div>
      <div className="h-40 w-full rounded-3xl shimmer-bg"></div>
      <div className="h-20 w-full rounded-2xl shimmer-bg"></div>
    </div>
  </div>
);

// 2.2. Interactive Gallery
const InteractiveGallery = ({ images, status }: { images: string[], status: any }) => {
  const [active, setActive] = useState(0);

  return (
    <div className="space-y-4">
      <div 
        className="relative aspect-[4/3] lg:aspect-square bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-sm group cursor-zoom-in"
      >
        <img 
          src={images[active]} 
          alt="Product" 
          className="w-full h-full object-contain p-4 transition-transform duration-700 ease-out group-hover:scale-110"
        />
        {status === 'sold' && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] z-10 flex items-center justify-center animate-enter">
            <span className="text-white font-black text-4xl border-4 border-white px-8 py-2 uppercase tracking-widest -rotate-12">Đã bán</span>
          </div>
        )}
      </div>

      {images.length > 1 && (
        <div className="flex gap-3 overflow-x-auto pb-2 px-1 hide-scrollbar">
          {images.map((img, i) => (
            <button 
              key={i} 
              onClick={() => setActive(i)}
              className={`relative w-20 h-20 flex-shrink-0 rounded-2xl overflow-hidden border-2 transition-all duration-300 ${active === i ? 'border-blue-600 shadow-md scale-105' : 'border-transparent opacity-60 hover:opacity-100 hover:scale-105'}`}
            >
              <img src={img} className="w-full h-full object-cover" alt="thumb"/>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// 2.3. Trusted Seller Card
const SellerCard = ({ seller }: { seller: User }) => {
  const navigate = useNavigate();
  return (
    <div 
      onClick={() => navigate(`/profile/${seller.id}`)}
      className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-blue-100 transition-all cursor-pointer group hover:-translate-y-1 duration-300"
    >
      <div className="relative">
        <img src={seller.avatar || 'https://via.placeholder.com/150'} className="w-14 h-14 rounded-full object-cover border-2 border-white shadow-sm" alt={seller.name}/>
        {seller.isVerified && <CheckCircle2 size={16} className="absolute -bottom-1 -right-1 text-white bg-blue-500 rounded-full border-2 border-white"/>}
      </div>
      <div className="flex-1">
        <h4 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{seller.name}</h4>
        <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
          <span className="flex items-center gap-1"><Star size={12} className="text-yellow-500 fill-yellow-500"/> 4.9</span>
          <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
          <span>Phản hồi nhanh</span>
        </div>
      </div>
      <ChevronRight size={20} className="text-gray-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all"/>
    </div>
  );
};

// ============================================================================
// 3. MAIN PAGE LOGIC
// ============================================================================

const ProductDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const { addToast } = useToast();
  
  const [product, setProduct] = useState<Product | null>(null);
  const [seller, setSeller] = useState<User | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [related, setRelated] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  const [activeTab, setActiveTab] = useState<'desc' | 'comments'>('desc');
  const [commentInput, setCommentInput] = useState('');

  const fetchData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const { data: pData } = await supabase.from('products').select('*').eq('id', id).single();
      if (!pData) throw new Error("Not found");
      
      // Mocking some data for visual purpose
      const mappedProduct: Product = { ...pData, sellerId: pData.seller_id, images: pData.images || [], status: pData.status, postedAt: pData.posted_at };
      setProduct(mappedProduct);

      const [sellerRes, commentRes, relatedRes, likeRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', mappedProduct.sellerId).single(),
        supabase.from('comments').select(`*, user:user_id(name, avatar_url)`).eq('product_id', id).order('created_at', { ascending: false }),
        supabase.from('products').select('*').eq('category', mappedProduct.category).neq('id', id).limit(4),
        currentUser ? supabase.from('saved_products').select('id').eq('user_id', currentUser.id).eq('product_id', id).maybeSingle() : Promise.resolve({ data: null })
      ]);

      if (sellerRes.data) setSeller({ ...sellerRes.data, id: sellerRes.data.id, avatar: sellerRes.data.avatar_url, isVerified: sellerRes.data.is_verified });
      setComments(commentRes.data || []);
      setRelated(relatedRes.data?.map(p => ({ ...p, sellerId: p.seller_id, images: p.images || [], status: p.status } as Product)) || []);
      setIsLiked(!!likeRes.data);
      supabase.rpc('increment_view_count', { product_id: id });

    } catch (err) {
      addToast("Không tìm thấy sản phẩm", "error");
      navigate('/market');
    } finally {
      setLoading(false);
    }
  }, [id, currentUser, navigate, addToast]);

  useEffect(() => { fetchData(); window.scrollTo(0, 0); }, [fetchData]);

  const handleLike = async () => {
    if (!currentUser) return navigate('/auth');
    setIsLiked(!isLiked);
    try {
      if (isLiked) await supabase.from('saved_products').delete().eq('user_id', currentUser.id).eq('product_id', id);
      else await supabase.from('saved_products').insert({ user_id: currentUser.id, product_id: id });
    } catch { setIsLiked(!isLiked); }
  };

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return navigate('/auth');
    if (!commentInput.trim()) return;
    const { error } = await supabase.from('comments').insert({ product_id: id, user_id: currentUser.id, content: commentInput.trim() });
    if (!error) { setCommentInput(''); fetchData(); addToast("Đã gửi bình luận", "success"); }
  };

  const copyLink = () => { navigator.clipboard.writeText(window.location.href); addToast("Đã sao chép link", "success"); };

  if (loading) return <div className="min-h-screen bg-[#FAFAFA]"><Animations /><div className="h-16 glass-nav mb-8"></div><LoadingSkeleton /></div>;
  if (!product) return null;

  const isOwner = currentUser?.id === product.sellerId;

  return (
    <div className="min-h-screen font-sans text-slate-800 pb-20 selection:bg-blue-100 selection:text-blue-900">
      <Animations />
      
      {/* HEADER: Glassmorphism */}
      <div className="sticky top-0 z-50 glass-nav transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 animate-enter">
            <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600"><ArrowLeft size={20}/></button>
            <div className="hidden md:flex items-center gap-2 text-sm font-medium text-gray-500">
              <Link to="/market" className="hover:text-blue-600 transition-colors">Market</Link>
              <ChevronRight size={14}/>
              <span className="text-gray-900 truncate max-w-[200px] font-bold">{product.title}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 animate-enter stagger-1">
            <button onClick={copyLink} className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors"><Share2 size={20}/></button>
            <button className="p-2 hover:bg-red-50 text-gray-500 hover:text-red-500 rounded-full transition-colors"><Flag size={20}/></button>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          
          {/* --- LEFT: GALLERY & DETAILS (Scrollable) --- */}
          <div className="lg:col-span-7 space-y-10">
            <div className="animate-enter">
              <InteractiveGallery images={product.images} status={product.status} />
            </div>

            {/* Content Tabs */}
            <div className="bg-white rounded-3xl p-8 shadow-[0_2px_20px_rgba(0,0,0,0.04)] border border-gray-100 animate-enter stagger-1">
              <div className="flex gap-8 border-b border-gray-100 pb-4 mb-6">
                <button onClick={() => setActiveTab('desc')} className={`text-lg font-bold pb-4 transition-all relative ${activeTab === 'desc' ? 'text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}>
                  Chi tiết
                  {activeTab === 'desc' && <span className="absolute bottom-[-17px] left-0 w-full h-1 bg-blue-600 rounded-t-full"></span>}
                </button>
                <button onClick={() => setActiveTab('comments')} className={`text-lg font-bold pb-4 transition-all relative ${activeTab === 'comments' ? 'text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}>
                  Hỏi đáp ({comments.length})
                  {activeTab === 'comments' && <span className="absolute bottom-[-17px] left-0 w-full h-1 bg-blue-600 rounded-t-full"></span>}
                </button>
              </div>

              {activeTab === 'desc' ? (
                <div className="animate-enter">
                  <div className="prose prose-slate max-w-none text-gray-600 leading-relaxed whitespace-pre-wrap mb-8">
                    {product.description || "Chưa có mô tả chi tiết."}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                       <p className="text-xs font-bold text-gray-400 uppercase mb-1">Tình trạng</p>
                       <p className="font-bold text-gray-900 flex items-center gap-2"><Star size={16} className="text-yellow-500 fill-yellow-500"/> {product.condition}</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                       <p className="text-xs font-bold text-gray-400 uppercase mb-1">Giao dịch</p>
                       <p className="font-bold text-gray-900 flex items-center gap-2"><Box size={16} className="text-blue-500"/> {product.tradeMethod === 'direct' ? 'Trực tiếp' : 'Ship COD'}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="animate-enter space-y-6">
                  {currentUser ? (
                    <form onSubmit={handleComment} className="flex gap-4 mb-8">
                      <img src={currentUser.avatar} className="w-10 h-10 rounded-full border border-gray-100 shadow-sm" alt="me"/>
                      <div className="flex-1 relative">
                        <textarea 
                          value={commentInput}
                          onChange={e => setCommentInput(e.target.value)}
                          placeholder="Đặt câu hỏi cho người bán..."
                          className="w-full bg-gray-50 border-transparent rounded-2xl px-4 py-3 focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-200 transition-all resize-none min-h-[80px] shadow-inner"
                        />
                        <button disabled={!commentInput.trim()} className="absolute right-2 bottom-2 p-2 bg-blue-600 text-white rounded-xl shadow-lg hover:bg-blue-700 disabled:opacity-50 transition-all active:scale-95">
                          <Send size={16}/>
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="bg-blue-50 p-6 rounded-2xl text-center text-blue-800 font-bold border border-blue-100">
                      <Link to="/auth" className="underline">Đăng nhập</Link> để bình luận.
                    </div>
                  )}
                  {comments.map(c => (
                    <div key={c.id} className="flex gap-4">
                      <img src={c.userAvatar} className="w-10 h-10 rounded-full bg-gray-100 border border-gray-100" alt="u"/>
                      <div className="flex-1 bg-gray-50 p-4 rounded-2xl rounded-tl-sm">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-sm text-gray-900">{c.userName}</span>
                          <span className="text-xs text-gray-400">• {product.postedAt}</span>
                        </div>
                        <p className="text-gray-600 text-sm leading-relaxed">{c.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* --- RIGHT: STICKY INFO (Fixed Position) --- */}
          <div className="lg:col-span-5 relative">
            <div className="sticky top-24 space-y-6 animate-enter stagger-2">
              
              {/* Main Info Card */}
              <div className="bg-white rounded-[2.5rem] p-8 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] border border-gray-100/80 relative overflow-hidden">
                <div className="flex justify-between items-start mb-6">
                  <span className="bg-blue-50 text-blue-700 text-xs font-black px-3 py-1.5 rounded-lg uppercase tracking-wider">{product.category}</span>
                  <button onClick={handleLike} className="p-2 hover:bg-gray-50 rounded-full transition-all active:scale-90 group">
                    <Heart size={26} className={isLiked ? 'fill-red-500 text-red-500' : 'text-gray-300 group-hover:text-red-400'}/>
                  </button>
                </div>

                <h1 className="text-3xl font-black text-gray-900 leading-tight mb-4">{product.title}</h1>
                
                <div className="flex items-center gap-5 text-sm font-medium text-gray-500 mb-8 border-b border-gray-100 pb-6">
                  <div className="flex items-center gap-1.5"><Clock size={16} className="text-blue-500"/> {timeAgo(product.postedAt)}</div>
                  <div className="flex items-center gap-1.5"><MapPin size={16} className="text-blue-500"/> TP.HCM</div>
                  <div className="flex items-center gap-1.5"><Eye size={16} className="text-blue-500"/> {product.view_count}</div>
                </div>

                <div className="mb-8">
                  <div className="flex items-baseline gap-3">
                    <span className="text-5xl font-black text-blue-700 tracking-tight">
                      {product.price === 0 ? 'FREE' : formatCurrency(product.price)}
                    </span>
                    {product.price > 0 && <span className="text-xl text-gray-300 line-through font-bold">{formatCurrency(product.price * 1.2)}</span>}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-3">
                  {isOwner ? (
                    <button onClick={() => navigate(`/post-item?edit=${product.id}`)} className="w-full py-4 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-2xl font-bold text-lg transition-all hover-scale">
                      Chỉnh sửa bài đăng
                    </button>
                  ) : (
                    <>
                      <button 
                        onClick={() => navigate(`/chat?partnerId=${seller?.id}`)}
                        disabled={product.status === 'sold'}
                        className="w-full py-4 bg-[#00418E] hover:bg-[#003370] text-white rounded-2xl font-bold text-lg shadow-xl shadow-blue-900/10 transition-all hover-scale flex items-center justify-center gap-3 disabled:bg-gray-300 disabled:shadow-none"
                      >
                        <MessageCircle size={22} className="fill-current"/> 
                        {product.status === 'sold' ? 'Đã bán' : 'Chat với người bán'}
                      </button>
                      {product.status !== 'sold' && (
                        <button onClick={() => addToast("Chức năng đang phát triển", "info")} className="w-full py-4 bg-white border-2 border-gray-100 hover:border-blue-200 text-gray-700 hover:text-blue-600 rounded-2xl font-bold text-lg transition-all hover-scale flex items-center justify-center gap-3">
                          <ShoppingBag size={22}/> Mua ngay
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>

              {seller && <SellerCard seller={seller} />}

              {/* Safety Widget */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-3xl border border-blue-100">
                <h4 className="font-bold text-blue-900 flex items-center gap-2 mb-3">
                  <ShieldCheck size={18}/> Mẹo giao dịch an toàn
                </h4>
                <p className="text-sm text-blue-800/80 leading-relaxed">
                  Sinh viên Bách Khoa không nên chuyển khoản cọc. Hãy hẹn giao dịch trực tiếp tại H6, Thư viện hoặc Canteen để đảm bảo an toàn.
                </p>
              </div>

            </div>
          </div>
        </div>

        {/* --- RELATED PRODUCTS --- */}
        {related.length > 0 && (
          <div className="mt-24 border-t border-gray-200 pt-16 animate-enter stagger-3">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-2xl font-black text-gray-900">Sản phẩm tương tự</h3>
              <Link to="/market" className="text-blue-600 font-bold hover:underline flex items-center gap-1">Xem thêm <ChevronRight size={16}/></Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {related.map(p => <ProductCard key={p.id} product={p} />)}
            </div>
          </div>
        )}
      </main>

      {/* MOBILE BAR (Sticky Bottom) */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-lg border-t border-gray-200 p-4 lg:hidden z-50 animate-enter">
        <div className="flex gap-3">
           <button 
             onClick={() => navigate(`/chat?partnerId=${seller?.id}`)} 
             disabled={product.status === 'sold'}
             className="flex-1 bg-[#00418E] text-white py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-transform"
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
