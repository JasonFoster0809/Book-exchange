import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';
import { useToast } from '../contexts/ToastContext'; 
import { 
  ShieldCheck, LogOut, Package, MessageCircle, Star, User as UserIcon, 
  Camera, Edit3, Save, X, ShoppingBag, Image as ImageIcon,
  Upload, Clock, Mail, Calendar, Flag, UserPlus, UserCheck, MapPin, 
  MoreHorizontal, Eye, Zap, CheckCircle, School, Search 
} from 'lucide-react';
import { Product, User, Review } from '../types';
import ProductCard from '../components/ProductCard';

interface ExtendedUser extends User {
    bio?: string;
    major?: string;
    academicYear?: string;
    joinedAt?: string;
    coverUrl?: string; 
    lastSeen?: string;
}

const ProfilePage: React.FC = () => {
  const { user: currentUser, signOut } = useAuth();
  const { addToast } = useToast(); 
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const isOwnProfile = !id || (currentUser && id === currentUser.id);
  const targetUserId = isOwnProfile ? currentUser?.id : id;

  // --- STATES ---
  const [profileUser, setProfileUser] = useState<ExtendedUser | null>(null);
  const [userProducts, setUserProducts] = useState<Product[]>([]);
  const [purchasedProducts, setPurchasedProducts] = useState<Product[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [averageRating, setAverageRating] = useState<number>(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'selling' | 'buying' | 'bought' | 'reviews'>('selling');
  
  // Edit & Verify States
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editMajor, setEditMajor] = useState('');
  const [editYear, setEditYear] = useState('');
  const [editAvatarFile, setEditAvatarFile] = useState<File | null>(null);
  const [previewAvatar, setPreviewAvatar] = useState<string | null>(null);
  const [editCoverFile, setEditCoverFile] = useState<File | null>(null);
  const [previewCover, setPreviewCover] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [verifyModalOpen, setVerifyModalOpen] = useState(false);
  const [uploadingVerify, setUploadingVerify] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<'none' | 'pending' | 'approved' | 'rejected'>('none');

  // --- HELPER: TÍNH THỜI GIAN HOẠT ĐỘNG ---
  const formatLastSeen = (timestamp?: string) => {
    if (!timestamp) return 'Offline';
    const lastSeenDate = new Date(timestamp);
    const diffInSeconds = Math.floor((new Date().getTime() - lastSeenDate.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'Vừa truy cập';
    if (diffInSeconds < 300) return 'Đang hoạt động'; 
    if (diffInSeconds < 3600) return `Hoạt động ${Math.floor(diffInSeconds / 60)} phút trước`;
    if (diffInSeconds < 86400) return `Hoạt động ${Math.floor(diffInSeconds / 3600)} giờ trước`;
    return `Hoạt động ${Math.floor(diffInSeconds / 86400)} ngày trước`;
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!targetUserId) return;
      setLoading(true);
      try {
        const { data: profileData } = await supabase.from('profiles').select('*').eq('id', targetUserId).single();
        if (profileData) {
            setProfileUser({
                id: profileData.id,
                name: profileData.name || 'Người dùng',
                email: profileData.email,
                studentId: profileData.student_id || '',
                avatar: profileData.avatar_url || 'https://via.placeholder.com/150',
                coverUrl: profileData.cover_url,
                isVerified: profileData.is_verified,
                role: profileData.role as any,
                bio: profileData.bio || '',
                major: profileData.major || '',
                academicYear: profileData.academic_year || '',
                joinedAt: profileData.created_at,
                lastSeen: profileData.last_seen
            });
        }

        if (!isOwnProfile && currentUser) {
            const { data: followData } = await supabase.from('follows').select('*').eq('follower_id', currentUser.id).eq('following_id', targetUserId).single();
            setIsFollowing(!!followData);
        }

        let query = supabase.from('products').select('*, profiles:seller_id(name, avatar_url)').eq('seller_id', targetUserId).order('posted_at', { ascending: false });
        if (!isOwnProfile) query = query.eq('status', 'available'); 
        const { data: productsData } = await query;
        if (productsData) setUserProducts(mapProducts(productsData));

        if (isOwnProfile) {
            const { data: boughtData } = await supabase.from('products').select('*, profiles:seller_id(name, avatar_url)').eq('buyer_id', targetUserId).eq('status', 'sold').order('posted_at', { ascending: false });
            if (boughtData) setPurchasedProducts(mapProducts(boughtData));
        }

        fetchReviews();
        if (isOwnProfile && currentUser) checkVerificationStatus();

      } catch (error) { console.error(error); } finally { setLoading(false); }
    };
    fetchData();
  }, [id, currentUser, targetUserId, isOwnProfile]);

  // ... (Giữ nguyên các hàm handle actions: handleOpenEdit, handleUpdateProfile, handleToggleFollow, mapProducts, fetchReviews...)
  const handleOpenEdit = () => {
      if (!profileUser) return;
      setEditName(profileUser.name);
      setEditBio(profileUser.bio || '');
      setEditMajor(profileUser.major || '');
      setEditYear(profileUser.academicYear || '');
      setPreviewAvatar(null); setEditAvatarFile(null);
      setPreviewCover(null); setEditCoverFile(null);
      setIsEditModalOpen(true);
  };

  const handleUpdateProfile = async () => {
      if (!currentUser) return;
      setIsSaving(true);
      try {
          let avatarUrl = profileUser?.avatar;
          let coverUrl = profileUser?.coverUrl;
          if (editAvatarFile) {
              const fileName = `${currentUser.id}/avatar_${Date.now()}`;
              await supabase.storage.from('product-images').upload(fileName, editAvatarFile);
              avatarUrl = supabase.storage.from('product-images').getPublicUrl(fileName).data.publicUrl;
          }
          if (editCoverFile) {
              const fileName = `${currentUser.id}/cover_${Date.now()}`;
              await supabase.storage.from('product-images').upload(fileName, editCoverFile);
              coverUrl = supabase.storage.from('product-images').getPublicUrl(fileName).data.publicUrl;
          }
          const { error } = await supabase.from('profiles').update({ name: editName, avatar_url: avatarUrl, cover_url: coverUrl, bio: editBio, major: editMajor, academic_year: editYear }).eq('id', currentUser.id);
          if (error) throw error;
          setProfileUser(prev => prev ? ({ ...prev, name: editName, avatar: avatarUrl!, coverUrl: coverUrl, bio: editBio, major: editMajor, academicYear: editYear }) : null);
          setIsEditModalOpen(false);
          addToast("Cập nhật thành công!", "success");
      } catch (err: any) { addToast("Lỗi: " + err.message, "error"); } finally { setIsSaving(false); }
  };

  const handleToggleFollow = async () => {
      if (!currentUser) return navigate('/auth');
      if (isFollowing) {
          await supabase.from('follows').delete().eq('follower_id', currentUser.id).eq('following_id', targetUserId);
          setIsFollowing(false);
          addToast("Đã hủy theo dõi", "info");
      } else {
          await supabase.from('follows').insert({ follower_id: currentUser.id, following_id: targetUserId });
          setIsFollowing(true);
          addToast("Đã theo dõi", "success");
      }
  };

  const checkVerificationStatus = async () => { if (!currentUser) return; try { const { data } = await supabase.from('verification_requests').select('status').eq('user_id', currentUser.id).order('created_at', { ascending: false }).limit(1).single(); if (data) setVerificationStatus(data.status as any); } catch (e) {} };
  const handleUploadVerification = async (e: React.ChangeEvent<HTMLInputElement>) => { try { if (!currentUser || !e.target.files?.[0]) return; setUploadingVerify(true); const file = e.target.files[0]; const fileName = `${currentUser.id}-${Math.random()}`; await supabase.storage.from('product-images').upload(fileName, file); const { data } = supabase.storage.from('product-images').getPublicUrl(fileName); await supabase.from('verification_requests').insert({ user_id: currentUser.id, image_url: data.publicUrl, status: 'pending' }); addToast("Đã gửi yêu cầu!", "success"); setVerificationStatus('pending'); setVerifyModalOpen(false); } catch (err: any) { addToast("Lỗi: " + err.message, "error"); } finally { setUploadingVerify(false); } };
  const mapProducts = (data: any[]): Product[] => data.map((item: any) => ({ id: item.id, sellerId: item.seller_id, title: item.title, description: item.description, price: item.price, category: item.category, condition: item.condition, images: item.images || [], tradeMethod: item.trade_method, postedAt: item.posted_at, isLookingToBuy: item.is_looking_to_buy, status: item.status, seller: item.profiles, view_count: item.view_count || 0 }));
  const handleCreateReview = async (e: React.FormEvent) => { e.preventDefault(); if (!currentUser || !targetUserId) return; setSubmittingReview(true); const { error } = await supabase.from('reviews').insert({ reviewer_id: currentUser.id, reviewee_id: targetUserId, rating: newRating, comment: newComment }); if (!error) { setNewComment(''); setNewRating(5); fetchReviews(); addToast("Đã gửi đánh giá!", "success"); } else { addToast(error.message, "error"); } setSubmittingReview(false); };
  const handleDelete = async (pid: string) => { if (!confirm("Xóa tin?")) return; await supabase.from('products').delete().eq('id', pid); setUserProducts(prev => prev.filter(p => p.id !== pid)); addToast("Đã xóa", "info"); };
  const handleLogout = async () => { await signOut(); navigate('/'); };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#034EA2]"></div></div>;
  if (!profileUser) return <div className="text-center py-20">Không tìm thấy người dùng</div>;

  // Lọc sản phẩm theo nhu cầu
  const sellingProducts = userProducts.filter(p => !p.isLookingToBuy);
  const buyingRequests = userProducts.filter(p => p.isLookingToBuy);

  return (
    <div className="min-h-screen bg-[#F0F2F5] pb-20 font-sans">
      
      {/* 1. HEADER (FACEBOOK STYLE - COMPACT) */}
      <div className="bg-white shadow-sm pb-2">
        <div className="max-w-5xl mx-auto px-0 md:px-4"> {/* Container hẹp hơn chút cho giống FB */}
            
            {/* COVER PHOTO */}
            <div className="relative w-full h-[160px] md:h-[220px] bg-gradient-to-r from-gray-200 to-gray-300 md:rounded-b-xl overflow-hidden group/cover">
                {profileUser.coverUrl ? (
                    <img src={profileUser.coverUrl} className="w-full h-full object-cover" alt="Cover" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <span className="text-sm font-medium opacity-50">Sinh viên Bách Khoa</span>
                    </div>
                )}
            </div>

            {/* INFO SECTION */}
            <div className="px-4">
                <div className="flex flex-col md:flex-row items-center md:items-start -mt-12 md:-mt-8 relative">
                    
                    {/* AVATAR */}
                    <div className="relative z-20 flex-shrink-0">
                        <div className={`w-32 h-32 md:w-40 md:h-40 rounded-full border-[4px] border-white bg-white shadow-md overflow-hidden relative ${profileUser.isVerified ? 'ring-2 ring-blue-500 ring-offset-2' : ''}`}>
                            <img src={profileUser.avatar} className="w-full h-full object-cover" alt={profileUser.name} />
                        </div>
                    </div>

                    {/* NAME & INFO (Căn lề chuẩn) */}
                    <div className="flex-1 text-center md:text-left md:ml-5 mt-3 md:mt-10 mb-4 w-full">
                        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center justify-center md:justify-start gap-2">
                            {profileUser.name}
                            {profileUser.isVerified && <ShieldCheck className="w-5 h-5 text-blue-500 fill-blue-50" title="Đã xác thực thẻ SV" />}
                        </h1>
                        
                        {/* Dòng Trust Info */}
                        <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-3 mt-1 text-sm text-gray-600 font-medium">
                            {/* Chuyên ngành + Khóa */}
                            {(profileUser.major || profileUser.academicYear) && (
                                <span className="flex items-center justify-center md:justify-start">
                                    <School size={14} className="mr-1.5"/> 
                                    {profileUser.major ? `Sinh viên ${profileUser.major}` : 'Sinh viên Bách Khoa'} 
                                    {profileUser.academicYear ? ` - ${profileUser.academicYear}` : ''}
                                </span>
                            )}
                            
                            {/* Last Seen (Realtime) */}
                            <span className="hidden md:inline text-gray-300">•</span>
                            <span className="flex items-center justify-center md:justify-start text-green-600">
                                <Zap size={12} className="mr-1 fill-current"/> {formatLastSeen(profileUser.lastSeen)}
                            </span>
                        </div>

                        {profileUser.bio && <p className="text-gray-500 text-sm mt-2 italic">"{profileUser.bio}"</p>}
                    </div>

                    {/* ACTIONS BUTTONS */}
                    <div className="flex gap-2 mt-4 md:mt-10 flex-shrink-0">
                        {isOwnProfile ? (
                            <>
                                <button onClick={handleOpenEdit} className="px-4 py-2 bg-gray-100 text-gray-800 rounded-lg font-bold hover:bg-gray-200 flex items-center text-sm transition h-10">
                                    <Edit3 size={16} className="mr-1.5"/> Chỉnh sửa
                                </button>
                                <button onClick={handleLogout} className="px-4 py-2 bg-gray-100 text-gray-800 rounded-lg font-bold hover:bg-gray-200 flex items-center text-sm transition h-10">
                                    <LogOut size={16}/>
                                </button>
                            </>
                        ) : (
                            <>
                                <Link to={`/chat?partnerId=${profileUser.id}`} className="px-5 py-2 bg-[#0866FF] text-white rounded-lg font-bold hover:bg-[#0054d6] flex items-center text-sm transition shadow-sm h-10">
                                    <MessageCircle size={18} className="mr-1.5"/> Nhắn tin
                                </Link>
                                <button onClick={handleToggleFollow} className={`px-4 py-2 rounded-lg font-bold flex items-center text-sm transition h-10 ${isFollowing ? 'bg-gray-100 text-black hover:bg-gray-200' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'}`}>
                                    {isFollowing ? <><UserCheck size={18} className="mr-1.5"/> Đã theo dõi</> : <><UserPlus size={18} className="mr-1.5"/> Theo dõi</>}
                                </button>
                                <button className="px-3 py-2 bg-gray-100 text-black rounded-lg hover:bg-gray-200 transition h-10" title="Báo cáo">
                                    <Flag size={18}/>
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {/* --- STATS GRID (ĐỔI WORDING) --- */}
                <div className="grid grid-cols-3 gap-4 border-t border-gray-100 pt-4 mt-6 mb-2 max-w-2xl mx-auto md:mx-0">
                    <div className="text-center md:text-left group">
                        <span className="block text-xl font-black text-gray-900">{userProducts.length}</span>
                        <span className="text-[10px] text-gray-500 uppercase font-bold tracking-widest block mt-0.5">Tin đăng</span>
                    </div>
                    <div className="text-center md:text-left border-l border-r border-gray-100 group">
                        <span className="block text-xl font-black text-green-600">{userProducts.filter(p => p.status === 'sold').length}</span>
                        <span className="text-[10px] text-gray-500 uppercase font-bold tracking-widest block mt-0.5">Đã bán</span>
                    </div>
                    <div className="text-center md:text-left group">
                        {reviews.length > 0 ? (
                            <div className="flex items-center justify-center md:justify-start gap-1">
                                <span className="text-xl font-black text-yellow-500">{averageRating}</span>
                                <Star className="w-4 h-4 text-yellow-500 fill-current"/>
                            </div>
                        ) : (
                            // WORDING MỚI: NGƯỜI BÁN MỚI
                            <span className="flex items-center justify-center md:justify-start text-sm font-bold text-green-600">
                                <span className="mr-1">🌱</span> Người bán mới
                            </span>
                        )}
                        <span className="text-[10px] text-gray-500 uppercase font-bold tracking-widest block mt-0.5">
                            {profileUser.isVerified ? 'Đã xác thực SV' : 'Độ uy tín'}
                        </span>
                    </div>
                </div>

                {/* TABS NAVIGATION */}
                <div className="flex items-center gap-6 mt-4 border-t border-gray-100 pt-1 overflow-x-auto no-scrollbar">
                    <button onClick={() => setActiveTab('selling')} className={`py-3 text-[14px] font-semibold border-b-[3px] transition-colors whitespace-nowrap flex items-center ${activeTab === 'selling' ? 'border-[#0866FF] text-[#0866FF]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                        <Package size={16} className="mr-1.5"/> Đang bán ({sellingProducts.length})
                    </button>
                    <button onClick={() => setActiveTab('buying')} className={`py-3 text-[14px] font-semibold border-b-[3px] transition-colors whitespace-nowrap flex items-center ${activeTab === 'buying' ? 'border-[#0866FF] text-[#0866FF]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                        <Search size={16} className="mr-1.5"/> Cần mua ({buyingRequests.length})
                    </button>
                    <button onClick={() => setActiveTab('reviews')} className={`py-3 text-[14px] font-semibold border-b-[3px] transition-colors whitespace-nowrap flex items-center ${activeTab === 'reviews' ? 'border-[#0866FF] text-[#0866FF]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                        <Star size={16} className="mr-1.5"/> Đánh giá ({reviews.length})
                    </button>
                    {isOwnProfile && (
                        <button onClick={() => setActiveTab('bought')} className={`py-3 text-[14px] font-semibold border-b-[3px] transition-colors whitespace-nowrap flex items-center ${activeTab === 'bought' ? 'border-[#0866FF] text-[#0866FF]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                            <ShoppingBag size={16} className="mr-1.5"/> Lịch sử mua
                        </button>
                    )}
                </div>
            </div>
        </div>
      </div>

      {/* 2. MAIN CONTENT - GRID LAYOUT */}
      <div className="max-w-5xl mx-auto px-4 mt-6">
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            
            {/* TAB: ĐANG BÁN */}
            {activeTab === 'selling' && (
                sellingProducts.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-xl border border-dashed border-gray-200">
                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300"><Package size={32}/></div>
                        <p className="text-gray-500 font-medium">Chưa có tin đăng bán nào.</p>
                        {isOwnProfile && <Link to="/post" className="mt-4 inline-block text-blue-600 font-bold text-sm hover:underline">Đăng tin ngay</Link>}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {sellingProducts.map((p) => (
                            <div key={p.id} className="relative group">
                                <ProductCard product={p} />
                                {isOwnProfile && (
                                    <button onClick={() => handleDelete(p.id)} className="absolute top-2 right-2 bg-white/90 text-gray-700 p-1.5 rounded-full shadow-sm hover:bg-red-50 hover:text-red-600 transition z-10" title="Xóa tin"><X size={16}/></button>
                                )}
                            </div>
                        ))}
                    </div>
                )
            )}

            {/* TAB: CẦN MUA */}
            {activeTab === 'buying' && (
                buyingRequests.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-xl border border-dashed border-gray-200">
                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300"><Search size={32}/></div>
                        <p className="text-gray-500 font-medium">Chưa có tin tìm mua nào.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {buyingRequests.map((p) => (
                            <div key={p.id} className="relative group">
                                <ProductCard product={p} />
                                {isOwnProfile && (
                                    <button onClick={() => handleDelete(p.id)} className="absolute top-2 right-2 bg-white/90 text-gray-700 p-1.5 rounded-full shadow-sm hover:bg-red-50 hover:text-red-600 transition z-10" title="Xóa tin"><X size={16}/></button>
                                )}
                            </div>
                        ))}
                    </div>
                )
            )}

            {/* TAB: ĐÁNH GIÁ */}
            {activeTab === 'reviews' && (
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 max-w-3xl mx-auto">
                    {!isOwnProfile && currentUser && (
                        <form onSubmit={handleCreateReview} className="mb-8 p-4 bg-gray-50 rounded-xl border border-gray-200">
                            <div className="flex items-center mb-3"><span className="text-sm font-bold mr-3 text-gray-700">Đánh giá người bán:</span><div className="flex gap-1">{[1, 2, 3, 4, 5].map(s => (<button key={s} type="button" onClick={() => setNewRating(s)} className="focus:outline-none hover:scale-110 transition-transform"><Star className={`w-6 h-6 ${s <= newRating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} /></button>))}</div></div>
                            <textarea required className="w-full border border-gray-300 p-3 rounded-lg text-sm mb-3 focus:ring-2 focus:ring-[#034EA2] outline-none" placeholder="Nhập nhận xét..." value={newComment} onChange={e => setNewComment(e.target.value)} rows={2}/>
                            <div className="text-right"><button disabled={submittingReview} className="bg-[#034EA2] text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-[#003875] transition-colors shadow-sm">Gửi đánh giá</button></div>
                        </form>
                    )}
                    <div className="space-y-6">
                        {reviews.length === 0 ? (
                            <div className="text-center py-10 text-gray-400">
                                <div className="inline-block p-3 bg-green-50 rounded-full mb-3"><span className="text-2xl">🌱</span></div>
                                <p className="text-gray-900 font-bold">Chưa có đánh giá nào</p>
                                <p className="text-sm mt-1">Hãy là người đầu tiên giao dịch với {profileUser.name}!</p>
                            </div>
                        ) : reviews.map(r => (
                            <div key={r.id} className="flex gap-4 border-b border-gray-50 pb-6 last:border-0 last:pb-0">
                                <img src={r.reviewerAvatar} className="w-10 h-10 rounded-full bg-gray-200 object-cover border border-gray-100" />
                                <div className="flex-1">
                                    <div className="flex items-center justify-between mb-1">
                                        <div className="flex items-center gap-2"><span className="font-bold text-gray-900 text-sm">{r.reviewerName}</span><span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{new Date(r.createdAt).toLocaleDateString('vi-VN')}</span></div>
                                        <div className="flex">{[...Array(5)].map((_, i) => <Star key={i} className={`w-3 h-3 ${i < r.rating ? 'text-yellow-400 fill-current' : 'text-gray-200'}`} />)}</div>
                                    </div>
                                    <p className="text-gray-700 text-sm bg-gray-50 p-3 rounded-lg rounded-tl-none">{r.comment}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* TAB: LỊCH SỬ MUA (PRIVATE) */}
            {activeTab === 'bought' && isOwnProfile && (
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 max-w-3xl mx-auto">
                    {purchasedProducts.length === 0 ? <p className="text-center text-gray-400 py-10 text-sm">Bạn chưa mua món nào.</p> : <div className="space-y-3">{purchasedProducts.map((p) => (<div key={p.id} className="flex gap-4 p-3 border border-gray-100 hover:bg-gray-50 rounded-xl items-center transition-colors cursor-pointer" onClick={() => navigate(`/product/${p.id}`)}><img src={p.images[0]} className="w-16 h-16 rounded-lg object-cover bg-white border border-gray-200"/><div className="flex-1"><h4 className="font-bold text-gray-900 text-sm line-clamp-1">{p.title}</h4><p className="text-xs text-gray-500 mt-0.5">Người bán: {p.seller?.name}</p></div><span className="font-bold text-green-600 text-sm">{p.price.toLocaleString()} đ</span></div>))}</div>}
                </div>
            )}
        </div>
      </div>

      {/* --- EDIT MODAL (POPUP) --- */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
            <div className="bg-white p-0 rounded-xl max-w-lg w-full shadow-2xl relative overflow-hidden">
                <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-white">
                    <h3 className="text-xl font-bold text-gray-900">Chỉnh sửa trang cá nhân</h3>
                    <button onClick={() => setIsEditModalOpen(false)} className="bg-gray-100 hover:bg-gray-200 p-1.5 rounded-full text-gray-600"><X size={20}/></button>
                </div>
                
                <div className="p-4 max-h-[80vh] overflow-y-auto space-y-6">
                    <div>
                        <div className="flex justify-between items-center mb-2"><span className="font-bold text-base">Ảnh bìa</span><label className="text-blue-600 text-sm cursor-pointer hover:underline font-medium">Thay đổi <input type="file" className="hidden" accept="image/*" onChange={(e) => { if(e.target.files?.[0]) { setEditCoverFile(e.target.files[0]); setPreviewCover(URL.createObjectURL(e.target.files[0])); } }} /></label></div>
                        <div className="h-32 rounded-lg overflow-hidden bg-gray-200 relative"><img src={previewCover || profileUser?.coverUrl || 'https://via.placeholder.com/600x200'} className="w-full h-full object-cover" /></div>
                    </div>
                    <div>
                        <div className="flex justify-between items-center mb-2"><span className="font-bold text-base">Ảnh đại diện</span><label className="text-blue-600 text-sm cursor-pointer hover:underline font-medium">Thay đổi <input type="file" className="hidden" accept="image/*" onChange={(e) => { if(e.target.files?.[0]) { setEditAvatarFile(e.target.files[0]); setPreviewAvatar(URL.createObjectURL(e.target.files[0])); } }} /></label></div>
                        <div className="flex justify-center"><div className="w-24 h-24 rounded-full overflow-hidden border-4 border-gray-100"><img src={previewAvatar || profileUser?.avatar} className="w-full h-full object-cover" /></div></div>
                    </div>
                    <div className="space-y-4">
                        <span className="font-bold text-base block">Thông tin</span>
                        <input type="text" value={editName} onChange={e => setEditName(e.target.value)} className="w-full p-3 bg-gray-50 rounded-lg outline-none border border-gray-200 focus:border-blue-500 transition" placeholder="Tên hiển thị" />
                        <div className="grid grid-cols-2 gap-3">
                            <input type="text" value={editMajor} onChange={e => setEditMajor(e.target.value)} className="p-3 bg-gray-50 rounded-lg outline-none border border-gray-200 focus:border-blue-500" placeholder="Ngành học" />
                            <input type="text" value={editYear} onChange={e => setEditYear(e.target.value)} className="p-3 bg-gray-50 rounded-lg outline-none border border-gray-200 focus:border-blue-500" placeholder="Khóa (K2021)" />
                        </div>
                        <textarea value={editBio} onChange={e => setEditBio(e.target.value)} className="w-full p-3 bg-gray-50 rounded-lg outline-none border border-gray-200 focus:border-blue-500 resize-none h-24" placeholder="Giới thiệu bản thân..." />
                    </div>
                </div>
                <div className="p-4 border-t border-gray-200 flex justify-end gap-3">
                    <button onClick={() => setIsEditModalOpen(false)} className="px-5 py-2.5 rounded-lg font-bold text-gray-600 hover:bg-gray-100 transition">Hủy</button>
                    <button onClick={handleUpdateProfile} disabled={isSaving} className="px-5 py-2.5 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition shadow-sm">{isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}</button>
                </div>
            </div>
        </div>
      )}

      {/* Verify Modal */}
      {verifyModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
            <div className="bg-white p-6 rounded-2xl max-w-sm w-full shadow-2xl relative text-center">
                <button onClick={() => setVerifyModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X size={20}/></button>
                <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4"><ShieldCheck size={28}/></div>
                <h3 className="text-xl font-bold text-gray-900">Xác thực sinh viên</h3>
                <p className="text-gray-500 text-sm mt-2 mb-6">Tải ảnh thẻ sinh viên để nhận huy hiệu tích xanh uy tín.</p>
                <label className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer transition-all ${uploadingVerify ? 'bg-gray-50 border-gray-300' : 'border-blue-200 bg-blue-50 hover:bg-blue-100'}`}>
                    {uploadingVerify ? <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div> : <div className="flex flex-col items-center justify-center text-blue-600"><Upload className="w-6 h-6 mb-2" /><p className="text-sm font-bold">Bấm để tải ảnh</p></div>}
                    <input type="file" className="hidden" accept="image/*" onChange={handleUploadVerification} disabled={uploadingVerify} />
                </label>
            </div>
        </div>
      )}

    </div>
  );
};

export default ProfilePage;