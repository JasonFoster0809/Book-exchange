import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  ShieldCheck, MessageCircle, Share2, Flag, Heart, 
  ShieldAlert, Loader2, Star, ShoppingBag, Store, ArrowLeft, 
  ChevronRight, X, AlertTriangle, Clock, Shield, Box, 
  MapPin, CheckCircle2, AlertCircle, Copy, Send, ChevronLeft
} from 'lucide-react'; 
import { Product, User, Comment, ProductStatus } from '../types'; 
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext'; 
import ProductCard from '../components/ProductCard';

// ============================================================================
// 1. STYLES & CONFIGURATION
// ============================================================================

const THEME = {
  primary: '#00418E',
  secondary: '#00B0F0',
  accent: '#FFD700',
  danger: '#EF4444',
  success: '#10B981',
};

const DetailStyles = () => (
  <style>{`
    @keyframes pulse-ring {
      0% { transform: scale(0.8); opacity: 0.5; }
      100% { transform: scale(2); opacity: 0; }
    }
    .animate-pulse-ring {
      animation: pulse-ring 2s cubic-bezier(0.215, 0.61, 0.355, 1) infinite;
    }
    .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background-color: rgba(0, 0, 0, 0.1); border-radius: 10px; }
    
    .glass-panel {
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.5);
    }
  `}</style>
);

// ============================================================================
// 2. ATOMIC COMPONENTS
// ============================================================================

/**
 * ImageGallery: Hiển thị ảnh sản phẩm chuyên nghiệp
 */
const ImageGallery = ({ images, status }: { images: string[], status: ProductStatus }) => {
  const [mainImage, setMainImage] = useState(images[0] || '');
  const [isHovering, setIsHovering] = useState(false);

  useEffect(() => {
    if (images.length > 0) setMainImage(images[0]);
  }, [images]);

  return (
    <div className="flex flex-col gap-4">
      {/* Main Image Stage */}
      <div 
        className="aspect-square relative rounded-[2rem] border border-gray-100 bg-white overflow-hidden group shadow-sm"
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
        <img 
          src={mainImage} 
          className={`w-full h-full object-contain mix-blend-multiply transition-transform duration-700 ${isHovering ? 'scale-110' : 'scale-100'}`} 
          alt="Product Detail" 
        />
        
        {/* Status Overlay */}
        {status === 'sold' && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center z-10">
            <div className="border-[4px] border-white text-white font-black text-4xl px-8 py-3 -rotate-12 uppercase tracking-widest">ĐÃ BÁN</div>
          </div>
        )}

        {/* Zoom Hint */}
        <div className="absolute bottom-4 right-4 bg-white/80 backdrop-blur px-3 py-1 rounded-full text-xs font-bold text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity">
          Hover để phóng to
        </div>
      </div>

      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar">
          {images.map((img, idx) => (
            <button 
              key={idx} 
              onMouseEnter={() => setMainImage(img)}
              className={`w-20 h-20 rounded-xl border-2 flex-shrink-0 overflow-hidden transition-all ${mainImage === img ? 'border-[#00418E] ring-2 ring-blue-100' : 'border-transparent opacity-60 hover:opacity-100'}`}
            >
              <img src={img} className="w-full h-full object-cover" alt={`thumb-${idx}`} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * SellerInfoCard: Thông tin người bán gọn gàng
 */
const SellerInfoCard = ({ seller, isUntrusted }: { seller: User, isUntrusted: boolean }) => (
  <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
    <div className="relative shrink-0">
      <img 
        src={seller.avatar || 'https://via.placeholder.com/100'} 
        className={`w-16 h-16 rounded-full border-2 p-0.5 object-cover ${isUntrusted ? 'border-red-500' : 'border-[#00418E]'}`} 
        alt="avatar" 
      />
      {isUntrusted ? (
        <div className="absolute -bottom-1 -right-1 bg-red-600 text-white p-1 rounded-full animate-pulse shadow-sm">
          <ShieldAlert size={12}/>
        </div>
      ) : seller.isVerified && (
        <div className="absolute -bottom-1 -right-1 bg-blue-500 text-white p-1 rounded-full shadow-sm">
          <CheckCircle2 size={12}/>
        </div>
      )}
    </div>
    
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2">
        <h4 className="font-bold text-gray-900 truncate">{seller.name}</h4>
        {isUntrusted && <span className="bg-red-100 text-red-600 text-[10px] font-black px-1.5 py-0.5 rounded uppercase">Cảnh báo</span>}
      </div>
      
      <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
        {isUntrusted ? (
          <span className="text-red-500 font-bold">Tài khoản này đang bị hạn chế</span>
        ) : (
          <>
            <span className="w-2 h-2 rounded-full bg-green-500"></span> Online 5 phút trước
          </>
        )}
      </p>

      <div className="flex gap-3 mt-3">
        <Link to={`/profile/${seller.id}`} className="text-xs font-bold text-[#00418E] hover:underline flex items-center gap-1">
          <Store size={14}/> Xem Shop
        </Link>
        {!isUntrusted && (
          <span className="text-xs text-gray-400">Phản hồi: <span className="text-gray-700 font-bold">98%</span></span>
        )}
      </div>
    </div>
  </div>
);

/**
 * SafetyCard: Cảnh báo an toàn
 */
const SafetyCard = () => (
  <div className="bg-blue-50/50 p-5 rounded-2xl border border-blue-100">
    <h3 className="font-bold text-[#00418E] flex items-center gap-2 text-sm uppercase mb-3">
      <ShieldCheck size={18}/> Mẹo an toàn
    </h3>
    <ul className="space-y-3 text-sm text-gray-600">
      <li className="flex items-start gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 shrink-0"></span>
        <span>KHÔNG chuyển khoản trước (cọc) khi chưa thấy hàng.</span>
      </li>
      <li className="flex items-start gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 shrink-0"></span>
        <span>Nên giao dịch trực tiếp tại trường (H6, Thư viện).</span>
      </li>
      <li className="flex items-start gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 shrink-0"></span>
        <span>Kiểm tra kỹ tình trạng sản phẩm trước khi thanh toán.</span>
      </li>
    </ul>
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
  
  // State
  const [product, setProduct] = useState<Product | null>(null);
  const [seller, setSeller] = useState<User | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  
  // Loading & Interactive State
  const [loading, setLoading] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportData, setReportData] = useState({ reason: 'fraud', desc: '' });

  // --- LOGIC: CHECK UNTRUSTED ---
  const isViewerUntrusted = useMemo(() => {
    if (!currentUser) return false;
    return (currentUser.banUntil && new Date(currentUser.banUntil) > new Date()) || isRestricted;
  }, [currentUser, isRestricted]);

  const isSellerUntrusted = useMemo(() => {
    if (!seller) return false;
    return seller.banUntil && new Date(seller.banUntil) > new Date();
  }, [seller]);

  // --- FETCH DATA ---
  useEffect(() => {
    if (id) fetchData();
  }, [id, currentUser]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Tang view count (RPC)
      await supabase.rpc('increment_view_count', { product_id: id });

      // 2. Fetch Product & Seller
      const { data: pData } = await supabase.from('products').select('*').eq('id', id).single();
      if (!pData) throw new Error("Not found");
      
      const mappedProduct: Product = { 
        ...pData, 
        sellerId: pData.seller_id, 
        images: pData.images || [], 
        status: pData.status as ProductStatus,
        postedAt: pData.posted_at
      };
      setProduct(mappedProduct);

      const { data: uData } = await supabase.from('profiles').select('*').eq('id', mappedProduct.sellerId).single();
      if (uData) setSeller({ 
        ...uData, 
        id: uData.id, 
        avatar: uData.avatar_url, 
        isVerified: uData.is_verified, 
        banUntil: uData.ban_until 
      });

      // 3. Fetch Comments
      const { data: cData } = await supabase.from('comments')
        .select(`*, user:user_id(name, avatar_url)`)
        .eq('product_id', id)
        .order('created_at', { ascending: false });
      setComments(cData || []);

      // 4. Check Like Status
      if (currentUser) {
        const { data: likeData } = await supabase.from('saved_products')
          .select('*')
          .eq('user_id', currentUser.id)
          .eq('product_id', id)
          .single();
        setIsLiked(!!likeData);
      }

      // 5. Fetch Related
      const { data: relData } = await supabase.from('products')
        .select('*')
        .eq('category', mappedProduct.category)
        .neq('id', id)
        .eq('status', 'available')
        .limit(4);
      
      if (relData) {
        setRelatedProducts(relData.map(item => ({ 
          ...item, 
          sellerId: item.seller_id, 
          images: item.images || [],
          status: item.status
        } as Product)));
      }

    } catch (err) {
      console.error(err);
      addToast("Không tìm thấy sản phẩm hoặc đã bị xóa", "error");
      navigate('/market');
    } finally {
      setLoading(false);
    }
  };

  // --- HANDLERS ---
  const handleToggleLike = async () => {
    if (!currentUser) return navigate('/auth');
    
    // Optimistic Update
    const prev = isLiked;
    setIsLiked(!prev);

    try {
      if (prev) {
        await supabase.from('saved_products').delete().eq('user_id', currentUser.id).eq('product_id', id);
        addToast("Đã bỏ lưu tin", "info");
      } else {
        await supabase.from('saved_products').insert({ user_id: currentUser.id, product_id: id });
        addToast("Đã lưu vào danh sách quan tâm", "success");
      }
    } catch (err) {
      setIsLiked(prev); // Rollback
      console.error(err);
    }
  };

  const handleSendComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return navigate('/auth');
    if (isViewerUntrusted) return addToast("Tài khoản bị hạn chế tính năng này", "error");
    if (!newComment.trim()) return;

    setSubmitting(true);
    const { error } = await supabase.from('comments').insert({ 
      product_id: id, 
      user_id: currentUser.id, 
      content: newComment.trim() 
    });

    if (!error) {
      setNewComment('');
      fetchData(); // Refresh comments
      addToast("Đã gửi bình luận", "success");
    } else {
      addToast("Gửi thất bại", "error");
    }
    setSubmitting(false);
  };

  const handleReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    
    await supabase.from('reports').insert({
      reporter_id: currentUser.id,
      product_id: product?.id,
      reason: `${reportData.reason}: ${reportData.desc}`,
      status: 'pending'
    });
    
    addToast("Cảm ơn bạn đã báo cáo. Admin sẽ xem xét.", "success");
    setShowReportModal(false);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(window.location.href);
    addToast("Đã sao chép liên kết", "success");
  };

  // --- RENDER ---
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-white"><Loader2 className="animate-spin text-[#00418E]" size={40} /></div>;
  if (!product) return null;

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-24 font-sans text-[#1E293B]">
      <DetailStyles />

      {/* 1. BREADCRUMB HEADER */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-500 overflow-hidden">
            <Link to="/" className="hover:text-[#00418E]"><ArrowLeft size={18}/></Link>
            <span className="w-px h-4 bg-gray-300 mx-2"></span>
            <Link to="/market" className="hover:text-[#00418E] hidden sm:block">Market</Link>
            <ChevronRight size={14} className="hidden sm:block"/>
            <span className="hover:text-[#00418E] cursor-pointer truncate font-medium text-gray-900 max-w-[200px] sm:max-w-md">
              {product.title}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={copyToClipboard} className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors" title="Sao chép link">
              <Copy size={18}/>
            </button>
            <button onClick={() => setShowReportModal(true)} className="p-2 hover:bg-red-50 rounded-full text-gray-400 hover:text-red-500 transition-colors" title="Báo cáo">
              <Flag size={18}/>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* 2. LEFT COLUMN: GALLERY (8/12) */}
          <div className="lg:col-span-7 space-y-8">
            <ImageGallery images={product.images} status={product.status} />
            
            {/* Description Block (Desktop) */}
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 hidden lg:block">
              <h3 className="text-lg font-black text-[#00418E] uppercase tracking-widest mb-6 flex items-center gap-2">
                <Box size={20}/> Mô tả sản phẩm
              </h3>
              <div className="prose prose-blue max-w-none text-gray-600 whitespace-pre-wrap leading-relaxed">
                {product.description}
              </div>
            </div>
          </div>

          {/* 3. RIGHT COLUMN: INFO & ACTIONS (4/12) */}
          <div className="lg:col-span-5 relative">
            <div className="sticky top-24 space-y-6">
              
              {/* Main Info Card */}
              <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-gray-100">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <span className="bg-blue-50 text-[#00418E] text-xs font-bold px-3 py-1.5 rounded-lg uppercase tracking-wider">
                    {product.category}
                  </span>
                  <button onClick={handleToggleLike} className="group">
                    <Heart size={24} className={`transition-all ${isLiked ? 'fill-red-500 text-red-500 scale-110' : 'text-gray-400 group-hover:text-red-400'}`} />
                  </button>
                </div>

                <h1 className="text-2xl md:text-3xl font-black text-gray-900 leading-tight mb-4">
                  {product.title}
                </h1>

                <div className="flex items-center gap-6 text-sm text-gray-500 mb-6 pb-6 border-b border-gray-100">
                  <div className="flex items-center gap-1">
                    <Clock size={16} className="text-[#00418E]"/> 
                    {new Date(product.postedAt).toLocaleDateString('vi-VN')}
                  </div>
                  <div className="flex items-center gap-1">
                    <Eye size={16} className="text-[#00418E]"/>
                    {product.view_count || 0} lượt xem
                  </div>
                  <div className="flex items-center gap-1">
                    <MapPin size={16} className="text-[#00418E]"/>
                    TP.HCM
                  </div>
                </div>

                <div className="mb-8">
                  <div className="flex items-end gap-3 mb-2">
                    <span className="text-4xl font-black text-[#00418E] tracking-tight">
                      {product.price === 0 ? 'Miễn phí' : `${product.price.toLocaleString()}₫`}
                    </span>
                    {product.price > 0 && <span className="text-lg text-gray-400 line-through mb-1 decoration-2 decoration-red-300 italic">{(product.price * 1.2).toLocaleString()}đ</span>}
                  </div>
                  {product.price === 0 && <span className="text-sm font-bold text-green-600 flex items-center gap-1"><Gift size={14}/> Dành tặng sinh viên</span>}
                </div>

                {/* Info Grid */}
                <div className="grid grid-cols-2 gap-4 mb-8">
                  <div className="bg-gray-50 p-4 rounded-2xl">
                    <p className="text-xs text-gray-400 uppercase font-bold mb-1">Tình trạng</p>
                    <p className="font-bold text-gray-900">{product.condition}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-2xl">
                    <p className="text-xs text-gray-400 uppercase font-bold mb-1">Bảo hành</p>
                    <p className="font-bold text-gray-900">Không</p>
                  </div>
                </div>

                {/* Desktop Buttons */}
                <div className="hidden lg:flex flex-col gap-3">
                  <button 
                    onClick={() => !(isViewerUntrusted || isSellerUntrusted) && navigate(`/chat?partnerId=${seller?.id}`)}
                    disabled={isViewerUntrusted || isSellerUntrusted}
                    className={`w-full py-4 rounded-xl font-black text-lg shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95 ${
                      isViewerUntrusted || isSellerUntrusted 
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                        : 'bg-[#00418E] text-white hover:bg-[#003370] shadow-blue-200'
                    }`}
                  >
                    <MessageCircle size={20}/> 
                    {isViewerUntrusted ? 'TÀI KHOẢN BỊ KHÓA' : isSellerUntrusted ? 'NGƯỜI BÁN BỊ KHÓA' : 'Chat Ngay'}
                  </button>
                  
                  <button 
                    onClick={() => addToast("Tính năng thanh toán đang bảo trì", "info")}
                    disabled={isViewerUntrusted || isSellerUntrusted}
                    className="w-full py-4 bg-white border-2 border-[#00418E] text-[#00418E] rounded-xl font-bold hover:bg-blue-50 transition-all flex items-center justify-center gap-2"
                  >
                    <ShoppingBag size={20}/> Mua Ngay
                  </button>
                </div>
              </div>

              {/* Seller & Safety */}
              {seller && <SellerInfoCard seller={seller} isUntrusted={isSellerUntrusted} />}
              <SafetyCard />
            </div>
          </div>

          {/* Description Mobile */}
          <div className="lg:hidden col-span-1 bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-black text-[#00418E] uppercase tracking-widest mb-4">Mô tả sản phẩm</h3>
            <div className="prose prose-sm text-gray-600 whitespace-pre-wrap">
              {product.description}
            </div>
          </div>

        </div>

        {/* 4. COMMENTS SECTION */}
        <div className="mt-12 max-w-4xl">
          <div className="flex items-center gap-4 mb-8">
            <h3 className="text-2xl font-black text-gray-900">Hỏi đáp & Bình luận</h3>
            <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-bold">{comments.length}</span>
          </div>

          {/* Comment Input */}
          {isViewerUntrusted ? (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-6 flex items-center gap-4 mb-8">
              <div className="bg-red-100 p-3 rounded-full text-red-500"><ShieldAlert size={24}/></div>
              <div>
                <h4 className="font-bold text-red-700">Tài khoản bị hạn chế</h4>
                <p className="text-sm text-red-600">Bạn không thể bình luận do vi phạm chính sách cộng đồng.</p>
              </div>
            </div>
          ) : currentUser ? (
            <form onSubmit={handleSendComment} className="flex gap-4 mb-10">
              <img src={currentUser.avatar} className="w-10 h-10 rounded-full border border-gray-200" alt="me"/>
              <div className="flex-1 relative">
                <textarea 
                  value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                  placeholder="Đặt câu hỏi cho người bán..."
                  className="w-full bg-white border border-gray-200 rounded-2xl p-4 pr-12 focus:outline-none focus:border-[#00418E] focus:ring-4 focus:ring-blue-50 transition-all min-h-[60px] resize-y"
                />
                <button 
                  disabled={!newComment.trim() || submitting}
                  className="absolute right-3 bottom-3 p-2 bg-[#00418E] text-white rounded-xl hover:bg-[#003370] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {submitting ? <Loader2 size={18} className="animate-spin"/> : <Send size={18}/>}
                </button>
              </div>
            </form>
          ) : (
            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6 text-center mb-10">
              <p className="text-blue-800 font-medium">Vui lòng <Link to="/auth" className="underline font-bold">Đăng nhập</Link> để tham gia thảo luận.</p>
            </div>
          )}

          {/* Comment List */}
          <div className="space-y-6">
            {comments.map(c => (
              <div key={c.id} className="flex gap-4">
                <img src={c.userAvatar} className="w-10 h-10 rounded-full border border-gray-100" alt="user"/>
                <div className="flex-1 bg-white p-4 rounded-2xl rounded-tl-none border border-gray-100 shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-gray-900">{c.userName}</span>
                      {c.userId === seller?.id && <span className="bg-[#00418E] text-white text-[10px] px-2 py-0.5 rounded font-bold">Người bán</span>}
                    </div>
                    <span className="text-xs text-gray-400">{new Date(c.createdAt).toLocaleDateString()}</span>
                  </div>
                  <p className="text-sm text-gray-600">{c.content}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 5. RELATED PRODUCTS */}
        {relatedProducts.length > 0 && (
          <div className="mt-20 border-t border-gray-200 pt-12">
            <h3 className="text-2xl font-black text-gray-900 mb-8">Có thể bạn cũng thích</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {relatedProducts.map(p => <ProductCard key={p.id} product={p} />)}
            </div>
          </div>
        )}
      </div>

      {/* 6. MOBILE STICKY FOOTER */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 lg:hidden z-40 safe-area-pb shadow-[0_-10px_20px_rgba(0,0,0,0.05)]">
        <div className="flex gap-3">
          <button 
            onClick={() => !(isViewerUntrusted || isSellerUntrusted) && navigate(`/chat?partnerId=${seller?.id}`)}
            disabled={isViewerUntrusted || isSellerUntrusted}
            className="flex-1 bg-[#00418E] text-white py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 disabled:bg-gray-300"
          >
            <MessageCircle size={20}/> Chat Ngay
          </button>
          <button 
            onClick={handleToggleLike}
            className={`w-14 flex items-center justify-center rounded-xl border-2 ${isLiked ? 'border-red-500 bg-red-50 text-red-500' : 'border-gray-200 text-gray-400'}`}
          >
            <Heart size={24} className={isLiked ? 'fill-current' : ''}/>
          </button>
        </div>
      </div>

      {/* 7. REPORT MODAL */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="bg-red-50 p-6 border-b border-red-100 flex justify-between items-center">
              <h3 className="text-red-600 font-bold flex items-center gap-2 uppercase tracking-wide text-sm">
                <AlertCircle size={20}/> Báo cáo vi phạm
              </h3>
              <button onClick={() => setShowReportModal(false)} className="text-red-400 hover:text-red-600"><X size={20}/></button>
            </div>
            <form onSubmit={handleReport} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Lý do</label>
                <select 
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-red-500 font-medium text-sm"
                  value={reportData.reason}
                  onChange={e => setReportData({...reportData, reason: e.target.value})}
                >
                  <option value="fraud">Lừa đảo / Hàng giả</option>
                  <option value="spam">Spam / Tin rác</option>
                  <option value="prohibited">Hàng cấm / Phản cảm</option>
                  <option value="other">Lý do khác</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Chi tiết</label>
                <textarea 
                  rows={4}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-red-500 text-sm"
                  placeholder="Mô tả chi tiết vi phạm..."
                  value={reportData.desc}
                  onChange={e => setReportData({...reportData, desc: e.target.value})}
                />
              </div>
              <button className="w-full bg-red-600 text-white py-3.5 rounded-xl font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-200">
                GỬI BÁO CÁO
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductDetailPage;

