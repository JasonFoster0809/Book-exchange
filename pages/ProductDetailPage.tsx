import React, { useEffect, useState, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  ShieldCheck, MessageCircle, Share2, Flag, Heart, 
  ShieldAlert, Loader2, ShoppingBag, Store, ArrowLeft, 
  ChevronRight, X, Clock, Box, MapPin, CheckCircle2, 
  AlertCircle, Copy, Send, MoreHorizontal, Calendar, Star,
  Eye, Gift
} from 'lucide-react'; 
import { Product, User, Comment, ProductStatus } from '../types'; 
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext'; 
import ProductCard from '../components/ProductCard';

// ============================================================================
// 1. ADVANCED ANIMATIONS & STYLES
// ============================================================================

const DetailStyles = () => (
  <style>{`
    @keyframes slideUpFade {
      0% { opacity: 0; transform: translateY(40px) scale(0.95); }
      100% { opacity: 1; transform: translateY(0) scale(1); }
    }
    @keyframes fadeInScale {
      0% { opacity: 0; transform: scale(0.9); }
      100% { opacity: 1; transform: scale(1); }
    }
    @keyframes pulse-ring {
      0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(0, 65, 142, 0.7); }
      70% { transform: scale(1); box-shadow: 0 0 0 10px rgba(0, 65, 142, 0); }
      100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(0, 65, 142, 0); }
    }
    @keyframes shimmer {
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }
    @keyframes float {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-5px); }
    }

    .animate-enter { animation: slideUpFade 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; opacity: 0; }
    .animate-pop { animation: fadeInScale 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
    .animate-pulse-ring { animation: pulse-ring 2s infinite; }
    .animate-float { animation: float 3s ease-in-out infinite; }
    
    .shimmer-bg { 
      background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%); 
      background-size: 200% 100%; 
      animation: shimmer 1.5s infinite; 
    }

    .glass-panel {
      background: rgba(255, 255, 255, 0.8);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.5);
    }

    .hide-scrollbar::-webkit-scrollbar { display: none; }
    .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
  `}</style>
);

// ============================================================================
// 2. ATOMIC COMPONENTS
// ============================================================================

const ImageGallery = ({ images, status }: { images: string[], status: ProductStatus }) => {
  const [mainImage, setMainImage] = useState(images[0] || '');
  const [isHovering, setIsHovering] = useState(false);

  useEffect(() => {
    if (images.length > 0) setMainImage(images[0]);
  }, [images]);

  return (
    <div className="flex flex-col gap-4 animate-enter" style={{ animationDelay: '0ms' }}>
      <div 
        className="aspect-[4/3] lg:aspect-square relative rounded-[2rem] border border-gray-100 bg-white overflow-hidden group shadow-lg cursor-zoom-in"
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
        <img 
          src={mainImage} 
          className={`w-full h-full object-contain mix-blend-multiply transition-transform duration-700 cubic-bezier(0.2, 0, 0.2, 1) ${isHovering ? 'scale-125' : 'scale-100'}`} 
          alt="Product Detail" 
        />
        {status === 'sold' && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-10 animate-pop">
            <div className="border-[4px] border-white text-white font-black text-4xl px-8 py-3 -rotate-12 uppercase tracking-widest shadow-2xl">ĐÃ BÁN</div>
          </div>
        )}
      </div>

      {images.length > 1 && (
        <div className="flex gap-3 overflow-x-auto pb-2 hide-scrollbar">
          {images.map((img, idx) => (
            <button 
              key={idx} 
              onMouseEnter={() => setMainImage(img)}
              className={`w-20 h-20 rounded-2xl border-2 flex-shrink-0 overflow-hidden transition-all duration-300 ${mainImage === img ? 'border-[#00418E] ring-4 ring-blue-50 scale-105' : 'border-transparent opacity-60 hover:opacity-100 hover:scale-105'}`}
            >
              <img src={img} className="w-full h-full object-cover" alt={`thumb-${idx}`} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const SellerInfoCard = ({ seller, isUntrusted }: { seller: User, isUntrusted: boolean }) => (
  <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 group">
    <div className="relative shrink-0">
      <img 
        src={seller.avatar || 'https://via.placeholder.com/100'} 
        className={`w-16 h-16 rounded-full border-2 p-0.5 object-cover transition-colors duration-300 ${isUntrusted ? 'border-red-500' : 'border-[#00418E] group-hover:border-[#00B0F0]'}`} 
        alt="avatar" 
      />
      {isUntrusted ? (
        <div className="absolute -bottom-1 -right-1 bg-red-600 text-white p-1 rounded-full animate-pulse shadow-sm border-2 border-white"><ShieldAlert size={12}/></div>
      ) : seller.isVerified && (
        <div className="absolute -bottom-1 -right-1 bg-blue-500 text-white p-1 rounded-full shadow-sm border-2 border-white animate-pop"><CheckCircle2 size={12}/></div>
      )}
    </div>
    
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2">
        <h4 className="font-bold text-gray-900 truncate text-lg group-hover:text-[#00418E] transition-colors">{seller.name}</h4>
        {isUntrusted && <span className="bg-red-100 text-red-600 text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider">Cảnh báo</span>}
      </div>
      <p className="text-xs text-gray-500 mt-1 flex items-center gap-1.5">
        {isUntrusted ? (
          <span className="text-red-500 font-bold flex items-center gap-1"><AlertCircle size={12}/> Tài khoản bị hạn chế</span>
        ) : (
          <>
            <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span></span>
            Online
          </>
        )}
      </p>
      <div className="flex gap-4 mt-3">
        <Link to={`/profile/${seller.id}`} className="text-xs font-bold text-[#00418E] hover:underline flex items-center gap-1 group/link">
          <Store size={14} className="group-hover/link:scale-110 transition-transform"/> Xem Shop
        </Link>
        {!isUntrusted && <span className="text-xs text-gray-400 flex items-center gap-1"><Star size={12} className="text-yellow-400 fill-yellow-400"/> 4.9/5.0</span>}
      </div>
    </div>
  </div>
);

const DetailSkeleton = () => (
  <div className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
    <div className="lg:col-span-7 space-y-4">
      <div className="aspect-square rounded-[2rem] shimmer-bg w-full"></div>
      <div className="flex gap-3">{[1,2,3].map(i => <div key={i} className="w-20 h-20 rounded-2xl shimmer-bg"></div>)}</div>
    </div>
    <div className="lg:col-span-5 space-y-6">
      <div className="h-8 w-3/4 rounded-lg shimmer-bg"></div>
      <div className="h-6 w-1/2 rounded-lg shimmer-bg"></div>
      <div className="h-40 w-full rounded-[2rem] shimmer-bg"></div>
      <div className="h-24 w-full rounded-2xl shimmer-bg"></div>
    </div>
  </div>
);

// ============================================================================
// 3. MAIN COMPONENT
// ============================================================================

const ProductDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user: currentUser, isRestricted } = useAuth();
  const navigate = useNavigate();
  const { addToast } = useToast();
  
  const [product, setProduct] = useState<Product | null>(null);
  const [seller, setSeller] = useState<User | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('fraud');
  const [reportDesc, setReportDesc] = useState('');

  const isViewerUntrusted = useMemo(() => {
    if (!currentUser) return false;
    return (currentUser.banUntil && new Date(currentUser.banUntil) > new Date()) || isRestricted;
  }, [currentUser, isRestricted]);

  const isSellerUntrusted = useMemo(() => {
    if (!seller) return false;
    return seller.banUntil && new Date(seller.banUntil) > new Date();
  }, [seller]);

  useEffect(() => {
    if (id) fetchData();
  }, [id, currentUser]);

  const fetchData = async () => {
    setLoading(true);
    try {
      await supabase.rpc('increment_view_count', { product_id: id });

      const { data: pData } = await supabase.from('products').select('*').eq('id', id).single();
      if (!pData) throw new Error("Not found");
      
      // FIX ERROR 1: Ép kiểu 'as unknown as ProductStatus' để TS không báo lỗi
      const mappedProduct: Product = { 
        ...pData, 
        sellerId: pData.seller_id, 
        images: pData.images || [], 
        status: (pData.status as unknown as ProductStatus) || 'available', 
        postedAt: pData.posted_at
      };
      setProduct(mappedProduct);

      const { data: uData } = await supabase.from('profiles').select('*').eq('id', mappedProduct.sellerId).single();
      if (uData) setSeller({ ...uData, id: uData.id, avatar: uData.avatar_url, isVerified: uData.is_verified, banUntil: uData.ban_until });

      const { data: cData } = await supabase.from('comments').select(`*, user:user_id(name, avatar_url)`).eq('product_id', id).order('created_at', { ascending: false });
      setComments(cData || []);

      if (currentUser) {
        const { data: likeData } = await supabase.from('saved_products').select('*').eq('user_id', currentUser.id).eq('product_id', id).single();
        setIsLiked(!!likeData);
      }

      const { data: relData } = await supabase.from('products').select('*').eq('category', mappedProduct.category).neq('id', id).eq('status', 'available').limit(4);
      if (relData) {
        // FIX ERROR 2: Double casting ở đây cũng vậy
        setRelatedProducts(relData.map(item => ({ 
          ...item, 
          sellerId: item.seller_id, 
          images: item.images || [],
          status: (item.status as unknown as ProductStatus) 
        } as Product)));
      }

    } catch (err) {
      console.error(err);
      addToast("Sản phẩm không tồn tại", "error");
      navigate('/market');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleLike = async () => {
    if (!currentUser) return navigate('/auth');
    const prev = isLiked;
    setIsLiked(!prev);
    try {
      if (prev) await supabase.from('saved_products').delete().eq('user_id', currentUser.id).eq('product_id', id);
      else await supabase.from('saved_products').insert({ user_id: currentUser.id, product_id: id });
      addToast(prev ? "Đã bỏ lưu tin" : "Đã lưu tin", "success");
    } catch (err) { setIsLiked(prev); }
  };

  const handleSendComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return navigate('/auth');
    if (isViewerUntrusted) return addToast("Tài khoản bị hạn chế", "error");
    if (!newComment.trim()) return;
    setSubmitting(true);
    const { error } = await supabase.from('comments').insert({ product_id: id, user_id: currentUser.id, content: newComment.trim() });
    if (!error) { setNewComment(''); fetchData(); addToast("Đã gửi bình luận", "success"); } 
    else { addToast("Gửi thất bại", "error"); }
    setSubmitting(false);
  };

  const handleReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    await supabase.from('reports').insert({ reporter_id: currentUser.id, product_id: product?.id, reason: `${reportReason}: ${reportDesc}`, status: 'pending' });
    addToast("Đã gửi báo cáo", "success");
    setShowReportModal(false);
  };

  const copyLink = () => { navigator.clipboard.writeText(window.location.href); addToast("Đã sao chép liên kết", "success"); };

  if (loading) return <div className="min-h-screen bg-white"><DetailStyles /><DetailSkeleton /></div>;
  if (!product) return null;

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24 font-sans text-[#1E293B]">
      <DetailStyles />

      {/* HEADER NAV */}
      <div className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-40 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-500 overflow-hidden animate-enter">
            <button onClick={() => navigate(-1)} className="hover:text-[#00418E] transition-colors p-1"><ArrowLeft size={20}/></button>
            <span className="w-px h-4 bg-gray-300 mx-2"></span>
            <Link to="/market" className="hover:text-[#00418E] hidden sm:block">Market</Link>
            <ChevronRight size={14} className="hidden sm:block"/>
            <span className="truncate font-bold text-gray-900 max-w-[200px] sm:max-w-md">{product.title}</span>
          </div>
          <div className="flex items-center gap-2 animate-enter" style={{animationDelay: '100ms'}}>
            <button onClick={copyLink} className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors" title="Copy Link"><Copy size={18}/></button>
            <button onClick={() => setShowReportModal(true)} className="p-2 hover:bg-red-50 rounded-full text-gray-400 hover:text-red-500 transition-colors" title="Report"><Flag size={18}/></button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* LEFT: GALLERY */}
          <div className="lg:col-span-7 space-y-8">
            <ImageGallery images={product.images} status={product.status} />
            <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100 hidden lg:block animate-enter" style={{animationDelay: '200ms'}}>
              <h3 className="text-lg font-black text-[#00418E] uppercase tracking-widest mb-6 flex items-center gap-2"><Box size={20}/> Mô tả chi tiết</h3>
              <div className="prose prose-blue max-w-none text-gray-600 whitespace-pre-wrap leading-relaxed text-base">{product.description}</div>
            </div>
          </div>

          {/* RIGHT: INFO */}
          <div className="lg:col-span-5 relative">
            <div className="sticky top-24 space-y-6 animate-enter" style={{animationDelay: '300ms'}}>
              <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-lg shadow-blue-900/5 border border-gray-100 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-bl-[100px] -z-0 opacity-50"></div>
                <div className="relative z-10">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <span className="bg-blue-50 text-[#00418E] text-xs font-bold px-3 py-1.5 rounded-lg uppercase tracking-wider border border-blue-100">{product.category}</span>
                    <button onClick={handleToggleLike} className="group transition-transform active:scale-95"><Heart size={26} className={`transition-all duration-300 ${isLiked ? 'fill-red-500 text-red-500 scale-110 drop-shadow-md' : 'text-gray-300 group-hover:text-red-400'}`} /></button>
                  </div>
                  <h1 className="text-2xl md:text-3xl font-black text-gray-900 leading-tight mb-6">{product.title}</h1>
                  <div className="flex items-center gap-6 text-sm text-gray-500 mb-8 pb-6 border-b border-gray-100">
                    <div className="flex items-center gap-1.5 font-medium"><Clock size={16} className="text-[#00418E]"/> {new Date(product.postedAt).toLocaleDateString('vi-VN')}</div>
                    <div className="flex items-center gap-1.5 font-medium"><Eye size={16} className="text-[#00418E]"/> {product.view_count || 0} xem</div>
                    <div className="flex items-center gap-1.5 font-medium"><MapPin size={16} className="text-[#00418E]"/> TP.HCM</div>
                  </div>
                  <div className="mb-8">
                    <div className="flex items-end gap-3 mb-2">
                      <span className="text-4xl font-black text-[#00418E] tracking-tight">{product.price === 0 ? 'Miễn phí' : `${product.price.toLocaleString()}₫`}</span>
                      {product.price > 0 && <span className="text-lg text-gray-400 line-through mb-1 decoration-2 decoration-red-300 italic">{(product.price * 1.2).toLocaleString()}đ</span>}
                    </div>
                    {product.price === 0 && <span className="inline-flex items-center gap-1 text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full"><Gift size={12}/> Quà tặng sinh viên</span>}
                  </div>
                  <div className="grid grid-cols-2 gap-4 mb-8">
                    <div className="bg-[#F8FAFC] p-4 rounded-2xl border border-gray-100"><p className="text-[10px] text-gray-400 uppercase font-black mb-1 tracking-wider">Tình trạng</p><p className="font-bold text-gray-900">{product.condition}</p></div>
                    <div className="bg-[#F8FAFC] p-4 rounded-2xl border border-gray-100"><p className="text-[10px] text-gray-400 uppercase font-black mb-1 tracking-wider">Giao dịch</p><p className="font-bold text-gray-900">{product.tradeMethod === 'direct' ? 'Trực tiếp' : 'Ship COD'}</p></div>
                  </div>
                  <div className="hidden lg:flex flex-col gap-3">
                    <button onClick={() => !(isViewerUntrusted || isSellerUntrusted) && navigate(`/chat?partnerId=${seller?.id}`)} disabled={isViewerUntrusted || isSellerUntrusted} className={`w-full py-4 rounded-xl font-black text-lg shadow-lg flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-95 ${isViewerUntrusted || isSellerUntrusted ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-[#00418E] text-white hover:bg-[#003370] shadow-blue-200'}`}><MessageCircle size={20} className="fill-current"/> {isViewerUntrusted ? 'TÀI KHOẢN BỊ KHÓA' : isSellerUntrusted ? 'NGƯỜI BÁN BỊ KHÓA' : 'Chat Ngay'}</button>
                    <button onClick={() => addToast("Chức năng đang phát triển", "info")} disabled={isViewerUntrusted || isSellerUntrusted} className="w-full py-4 bg-white border-2 border-[#00418E] text-[#00418E] rounded-xl font-bold hover:bg-blue-50 transition-all flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95"><ShoppingBag size={20}/> Mua Ngay</button>
                  </div>
                </div>
              </div>
              {seller && <SellerInfoCard seller={seller} isUntrusted={isSellerUntrusted} />}
              <div className="bg-blue-50/50 p-6 rounded-2xl border border-blue-100"><h3 className="font-bold text-[#00418E] flex items-center gap-2 text-sm uppercase mb-4 tracking-wider"><ShieldCheck size={18}/> Mẹo an toàn</h3><ul className="space-y-3 text-sm text-gray-600 font-medium"><li className="flex items-start gap-3"><div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 shrink-0"></div><span>KHÔNG chuyển khoản trước (cọc) khi chưa kiểm tra hàng.</span></li><li className="flex items-start gap-3"><div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 shrink-0"></div><span>Nên giao dịch trực tiếp tại các khu vực đông người (H6, Thư viện).</span></li></ul></div>
            </div>
          </div>
          <div className="lg:hidden col-span-1 bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100"><h3 className="text-lg font-black text-[#00418E] uppercase tracking-widest mb-4">Mô tả sản phẩm</h3><div className="prose prose-sm text-gray-600 whitespace-pre-wrap">{product.description}</div></div>
        </div>

        {/* COMMENTS */}
        <div className="mt-16 max-w-4xl animate-enter" style={{animationDelay: '400ms'}}>
          <div className="flex items-center justify-between mb-8"><h3 className="text-2xl font-black text-gray-900 flex items-center gap-3">Hỏi đáp <span className="bg-gray-100 text-gray-500 text-sm font-bold px-3 py-1 rounded-full">{comments.length}</span></h3></div>
          {isViewerUntrusted ? (<div className="bg-red-50 border border-red-200 rounded-2xl p-6 flex items-center gap-4 mb-8"><div className="bg-red-100 p-3 rounded-full text-red-500"><ShieldAlert size={24}/></div><div><h4 className="font-bold text-red-700">Tài khoản bị hạn chế</h4><p className="text-sm text-red-600">Bạn không thể bình luận do vi phạm chính sách cộng đồng.</p></div></div>) : currentUser ? (<form onSubmit={handleSendComment} className="flex gap-4 mb-10 group"><img src={currentUser.avatar} className="w-12 h-12 rounded-full border-2 border-white shadow-md object-cover" alt="me"/><div className="flex-1 relative"><textarea value={newComment} onChange={e => setNewComment(e.target.value)} placeholder="Đặt câu hỏi cho người bán..." className="w-full bg-white border border-gray-200 rounded-2xl p-4 pr-14 focus:outline-none focus:border-[#00418E] focus:ring-4 focus:ring-blue-50 transition-all min-h-[60px] resize-y shadow-sm"/><button disabled={!newComment.trim() || submitting} className="absolute right-3 bottom-3 p-2 bg-[#00418E] text-white rounded-xl hover:bg-[#003370] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md active:scale-95">{submitting ? <Loader2 size={18} className="animate-spin"/> : <Send size={18}/>}</button></div></form>) : (<div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-8 text-center mb-10"><p className="text-blue-800 font-bold mb-2">Bạn cần đăng nhập để tham gia thảo luận</p><Link to="/auth" className="inline-block mt-2 text-sm font-black text-white bg-[#00418E] px-6 py-2 rounded-xl hover:bg-[#003370] transition-all shadow-lg hover:shadow-xl">Đăng nhập ngay</Link></div>)}
          <div className="space-y-6">{comments.map((c, idx) => (<div key={c.id} className="flex gap-4 animate-enter" style={{animationDelay: `${idx * 50}ms`}}><img src={c.userAvatar} className="w-10 h-10 rounded-full border border-gray-100 object-cover" alt="user"/><div className="flex-1 bg-white p-5 rounded-2xl rounded-tl-none border border-gray-100 shadow-sm hover:shadow-md transition-shadow"><div className="flex justify-between items-start mb-2"><div className="flex items-center gap-2"><span className="font-bold text-sm text-gray-900">{c.userName}</span>{c.userId === seller?.id && <span className="bg-[#00418E] text-white text-[10px] px-2 py-0.5 rounded font-black uppercase tracking-wider">Người bán</span>}</div><span className="text-xs text-gray-400 font-medium">{new Date(c.createdAt).toLocaleDateString()}</span></div><p className="text-sm text-gray-600 leading-relaxed">{c.content}</p></div></div>))}</div>
        </div>

        {/* RELATED */}
        {relatedProducts.length > 0 && (<div className="mt-24 border-t border-gray-200 pt-16 animate-enter" style={{animationDelay: '500ms'}}><div className="flex items-center justify-between mb-8"><h3 className="text-2xl font-black text-gray-900">Có thể bạn cũng thích</h3><Link to="/market" className="text-[#00418E] font-bold text-sm hover:underline">Xem thêm</Link></div><div className="grid grid-cols-2 md:grid-cols-4 gap-6">{relatedProducts.map(p => <ProductCard key={p.id} product={p} />)}</div></div>)}
      </div>

      {/* MOBILE FOOTER */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 lg:hidden z-50 safe-area-pb shadow-[0_-10px_30px_rgba(0,0,0,0.1)] animate-slide-up"><div className="flex gap-3"><button onClick={() => !(isViewerUntrusted || isSellerUntrusted) && navigate(`/chat?partnerId=${seller?.id}`)} disabled={isViewerUntrusted || isSellerUntrusted} className="flex-1 bg-[#00418E] text-white py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 disabled:bg-gray-300 shadow-lg active:scale-95 transition-transform"><MessageCircle size={20} className="fill-current"/> Chat Ngay</button><button onClick={handleToggleLike} className={`w-14 flex items-center justify-center rounded-xl border-2 transition-all active:scale-90 ${isLiked ? 'border-red-500 bg-red-50 text-red-500' : 'border-gray-200 text-gray-400 bg-white'}`}><Heart size={24} className={isLiked ? 'fill-current' : ''}/></button></div></div>

      {/* REPORT MODAL */}
      {showReportModal && (<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"><div className="bg-white rounded-[2rem] w-full max-w-sm overflow-hidden shadow-2xl animate-pop"><div className="bg-red-50 p-6 border-b border-red-100 flex justify-between items-center"><h3 className="text-red-600 font-black flex items-center gap-2 uppercase tracking-wide text-sm"><AlertCircle size={20}/> Báo cáo vi phạm</h3><button onClick={() => setShowReportModal(false)} className="text-red-400 hover:text-red-600 p-1 hover:bg-red-100 rounded-full transition-colors"><X size={20}/></button></div><form onSubmit={handleReport} className="p-6 space-y-5"><div><label className="block text-xs font-bold text-gray-500 uppercase mb-2 tracking-wider">Lý do báo cáo</label><select className="w-full p-4 bg-gray-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-red-200 font-bold text-gray-700 appearance-none" value={reportReason} onChange={e => setReportReason(e.target.value)}><option value="fraud">Lừa đảo / Hàng giả</option><option value="spam">Spam / Tin rác</option><option value="prohibited">Hàng cấm / Phản cảm</option><option value="other">Lý do khác</option></select></div><div><label className="block text-xs font-bold text-gray-500 uppercase mb-2 tracking-wider">Chi tiết vi phạm</label><textarea rows={4} className="w-full p-4 bg-gray-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-red-200 text-sm font-medium placeholder-gray-400 resize-none" placeholder="Mô tả chi tiết để Admin xử lý..." value={reportDesc} onChange={e => setReportDesc(e.target.value)}/></div><button className="w-full bg-red-600 text-white py-4 rounded-xl font-black hover:bg-red-700 transition-all shadow-lg shadow-red-200 active:scale-95 uppercase tracking-widest text-sm">GỬI BÁO CÁO</button></form></div></div>)}
    </div>
  );
};

export default ProductDetailPage;
