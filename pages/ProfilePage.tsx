import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../services/supabase";
import { useToast } from "../contexts/ToastContext";
import {
  ShieldCheck, LogOut, MessageCircle, Star, Edit3, X,
  UserPlus, UserCheck, Zap, School, ShieldAlert, Loader2,
  Calendar, Package, ShoppingBag, Camera, Upload, MapPin
} from "lucide-react";
import { Product, User, Review } from "../types";
import ProductCard from "../components/ProductCard";
// import CloneAvatar from "../assets/avatar.jpg"; // Đảm bảo đường dẫn đúng hoặc dùng link placeholder

// --- TYPES EXTENSION ---
interface ExtendedUser extends User {
  bio?: string;
  major?: string;
  academicYear?: string;
  joinedAt?: string;
  coverUrl?: string;
  lastSeen?: string;
  banUntil?: string | null;
}

// --- VISUAL ENGINE ---
const VisualEngine = () => (
  <style>{`
    :root { --primary: #00418E; }
    body { background-color: #F0F4F8; }
    
    .glass-panel {
      background: rgba(255, 255, 255, 0.7);
      backdrop-filter: blur(20px);
      border: 1px solid rgba(255, 255, 255, 0.6);
      box-shadow: 0 8px 32px rgba(0, 65, 142, 0.05);
    }

    .aurora-bg {
      position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: -1;
      background: 
        radial-gradient(at 0% 0%, rgba(0, 71, 171, 0.15) 0px, transparent 50%),
        radial-gradient(at 100% 100%, rgba(0, 229, 255, 0.1) 0px, transparent 50%);
    }

    .profile-avatar {
      box-shadow: 0 0 0 4px rgba(255,255,255,0.9), 0 10px 25px rgba(0,65,142,0.15);
    }
    
    .stat-card { transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
    .stat-card:hover { transform: translateY(-4px); }

    .tab-btn { position: relative; }
    .tab-active::after {
      content: ''; position: absolute; bottom: 0; left: 50%; transform: translateX(-50%);
      width: 40%; height: 3px; background: #00418E; border-radius: 4px;
    }
    
    .animate-enter { animation: slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; opacity: 0; }
    @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
  `}</style>
);

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
  const [reviews, setReviews] = useState<Review[]>([]);
  const [averageRating, setAverageRating] = useState<number>(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"selling" | "reviews">("selling");

  // Edit Modal States
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editMajor, setEditMajor] = useState("");
  const [editYear, setEditYear] = useState("");
  const [editAvatarFile, setEditAvatarFile] = useState<File | null>(null);
  const [previewAvatar, setPreviewAvatar] = useState<string | null>(null);
  const [editCoverFile, setEditCoverFile] = useState<File | null>(null);
  const [previewCover, setPreviewCover] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Verify & Review States
  const [verifyModalOpen, setVerifyModalOpen] = useState(false);
  const [uploadingVerify, setUploadingVerify] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<string>("none");
  
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  // --- HELPERS ---
  const formatJoinedDate = (dateString?: string) => {
    if (!dateString) return "Thành viên mới";
    return `Tham gia ${new Date(dateString).toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })}`;
  };

  // ✅ FIX: Hàm hiển thị thời gian thông minh hơn
  const formatLastSeen = (timestamp?: string) => {
    if (!timestamp) return "Offline";
    const date = new Date(timestamp);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000); // giây

    // Nếu < 5 phút (300 giây) -> Đang hoạt động
    if (diff < 300) return "Đang hoạt động";
    if (diff < 3600) return `Hoạt động ${Math.floor(diff / 60)} phút trước`;
    if (diff < 86400) return `Hoạt động ${Math.floor(diff / 3600)} giờ trước`;
    if (diff < 2592000) return `Hoạt động ${Math.floor(diff / 86400)} ngày trước`;
    
    return `Lần cuối: ${date.toLocaleDateString('vi-VN')}`;
  };

  // ✅ FIX: Tự động cập nhật thời gian Online khi người dùng lướt web
  useEffect(() => {
    if (currentUser) {
      const updatePresence = async () => {
        await supabase.from('profiles')
          .update({ last_seen: new Date().toISOString() })
          .eq('id', currentUser.id);
      };
      updatePresence();
      
      // Cập nhật mỗi 5 phút nếu vẫn ở trang này
      const interval = setInterval(updatePresence, 300000);
      return () => clearInterval(interval);
    }
  }, [currentUser]);

  // --- FETCH DATA ---
  useEffect(() => {
    const fetchData = async () => {
      if (!targetUserId) return;
      setLoading(true);
      try {
        // 1. Profile
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", targetUserId)
          .single();

        if (profileError || !profileData) throw new Error("Không tìm thấy người dùng");

        setProfileUser({
          id: profileData.id,
          name: profileData.name || "Người dùng",
          email: profileData.email,
          studentId: profileData.student_code || "",
          avatar: profileData.avatar_url || "https://ui-avatars.com/api/?background=random", // Fallback avatar
          coverUrl: profileData.cover_url,
          isVerified: profileData.verified_status === 'verified',
          role: profileData.role as any,
          bio: profileData.bio || "",
          major: profileData.major || "",
          academicYear: profileData.academic_year || "",
          joinedAt: profileData.created_at,
          lastSeen: profileData.last_seen,
          banUntil: profileData.ban_until,
        });

        // 2. Products (Fix: Lấy thêm verified_status cho seller)
        let prodQuery = supabase
          .from("products")
          .select("*, profiles:seller_id(name, avatar_url, verified_status)")
          .eq("seller_id", targetUserId)
          .order("created_at", { ascending: false });

        if (!isOwnProfile) prodQuery = prodQuery.eq("status", "available");
        
        const { data: prodData } = await prodQuery;
        
        if (prodData) {
          const mappedProducts = prodData.map((item: any) => ({
            id: item.id,
            title: item.title,
            description: item.description,
            price: item.price,
            images: item.images || [],
            category: item.category,
            condition: item.condition,
            status: item.status,
            tradeMethod: item.trade_method,
            sellerId: item.seller_id,
            postedAt: item.created_at,
            view_count: item.view_count || 0,
            seller: item.profiles, // Map relation
          }));
          setUserProducts(mappedProducts as any);
        }

        // 3. Reviews
        const { data: reviewData } = await supabase
          .from("reviews")
          .select(`*, reviewer:profiles!reviewer_id(name, avatar_url)`)
          .eq("reviewee_id", targetUserId)
          .order("created_at", { ascending: false });

        if (reviewData) {
          const mappedReviews = reviewData.map((r: any) => ({
            id: r.id,
            reviewerId: r.reviewer_id,
            reviewerName: r.reviewer?.name || "Ẩn danh",
            reviewerAvatar: r.reviewer?.avatar_url || "https://ui-avatars.com/api/?background=random",
            rating: r.rating,
            comment: r.comment,
            createdAt: r.created_at,
          }));
          setReviews(mappedReviews);
          if (mappedReviews.length > 0) {
            const total = mappedReviews.reduce((sum, item) => sum + item.rating, 0);
            setAverageRating(parseFloat((total / mappedReviews.length).toFixed(1)));
          }
        }

        // 4. Follow & Verification Status
        if (!isOwnProfile && currentUser) {
          const { data } = await supabase.from("follows").select("id").eq("follower_id", currentUser.id).eq("following_id", targetUserId).maybeSingle();
          setIsFollowing(!!data);
        }
        
        if (isOwnProfile && currentUser) {
          const { data } = await supabase.from("verification_requests").select("status").eq("user_id", currentUser.id).maybeSingle();
          if (data) setVerificationStatus(data.status);
        }

      } catch (err) {
        console.error(err);
        addToast("Lỗi tải thông tin", "error");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, currentUser, targetUserId, isOwnProfile]);

  // --- HANDLERS ---
  const handleUpdateProfile = async () => {
    if (!currentUser) return;
    setIsSaving(true);
    try {
      let avatarUrl = profileUser?.avatar;
      let coverUrl = profileUser?.coverUrl;

      // Upload Avatar
      if (editAvatarFile) {
        const fileName = `${currentUser.id}/avatar_${Date.now()}`;
        const { error: upErr } = await supabase.storage.from("product-images").upload(fileName, editAvatarFile);
        if (!upErr) {
          const { data } = supabase.storage.from("product-images").getPublicUrl(fileName);
          avatarUrl = data.publicUrl;
        }
      }

      // Upload Cover
      if (editCoverFile) {
        const fileName = `${currentUser.id}/cover_${Date.now()}`;
        const { error: upErr } = await supabase.storage.from("product-images").upload(fileName, editCoverFile);
        if (!upErr) {
          const { data } = supabase.storage.from("product-images").getPublicUrl(fileName);
          coverUrl = data.publicUrl;
        }
      }

      const { error } = await supabase
        .from("profiles")
        .update({ 
          name: editName, 
          bio: editBio, 
          major: editMajor,
          academic_year: editYear,
          avatar_url: avatarUrl,
          cover_url: coverUrl
        })
        .eq("id", currentUser.id);
      
      if (error) throw error;
      
      // Update UI state
      setProfileUser(prev => prev ? ({ 
        ...prev, 
        name: editName, bio: editBio, major: editMajor, academicYear: editYear,
        avatar: avatarUrl!, coverUrl: coverUrl 
      }) : null);
      
      setIsEditModalOpen(false);
      addToast("Cập nhật thành công", "success");
    } catch (error: any) {
      addToast(error.message, "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleUploadVerification = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!currentUser || !e.target.files?.[0]) return;
    setUploadingVerify(true);
    try {
      const file = e.target.files[0];
      const fileName = `verify/${currentUser.id}_${Date.now()}`;
      await supabase.storage.from("product-images").upload(fileName, file);
      const { data } = supabase.storage.from("product-images").getPublicUrl(fileName);
      
      await supabase.from("verification_requests").insert({
        user_id: currentUser.id,
        image_url: data.publicUrl,
        student_code: profileUser?.studentId || "UPDATE_ME",
        status: "pending",
      });
      
      addToast("Đã gửi yêu cầu xác thực!", "success");
      setVerificationStatus("pending");
      setVerifyModalOpen(false);
    } catch (err: any) { addToast(err.message, "error"); }
    finally { setUploadingVerify(false); }
  };

  const handleToggleFollow = async () => {
    if (!currentUser) return navigate("/auth");
    if (isFollowing) {
      await supabase.from("follows").delete().eq("follower_id", currentUser.id).eq("following_id", targetUserId);
      setIsFollowing(false);
    } else {
      await supabase.from("follows").insert({ follower_id: currentUser.id, following_id: targetUserId });
      setIsFollowing(true);
    }
  };

  const handleCreateReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !targetUserId) return;
    setSubmittingReview(true);
    try {
      const { error } = await supabase.from("reviews").insert({
        reviewer_id: currentUser.id,
        reviewee_id: targetUserId,
        rating: newRating,
        comment: newComment
      });
      if (error) throw error;
      addToast("Đã gửi đánh giá", "success");
      setNewComment("");
      // Refresh reviews list (simplified)
      window.location.reload(); 
    } catch (error) { addToast("Lỗi khi gửi đánh giá", "error"); }
    finally { setSubmittingReview(false); }
  };

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-[#F0F4F8]">
      <Loader2 className="animate-spin text-[#00418E]" size={40} />
    </div>
  );

  if (!profileUser) return <div className="py-20 text-center">Không tìm thấy người dùng</div>;

  const isBanned = profileUser.banUntil && new Date(profileUser.banUntil) > new Date();

  return (
    <div className="min-h-screen pb-20 font-sans text-slate-800">
      <VisualEngine />
      <div className="aurora-bg"></div>

      {/* --- HEADER SECTION --- */}
      <div className="relative mb-24 animate-enter">
        {/* Cover Image */}
        <div className="h-64 md:h-80 w-full relative overflow-hidden bg-slate-900 group">
          {profileUser.coverUrl ? (
            <img src={profileUser.coverUrl} className="w-full h-full object-cover opacity-90 transition-transform duration-700 group-hover:scale-105" alt="cover" />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-[#00418E] to-[#0065D1] opacity-80">
                <div className="w-full h-full opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
        </div>

        {/* Profile Info Card (Floating) */}
        <div className="max-w-5xl mx-auto px-4 relative">
          <div className="glass-panel rounded-3xl p-6 md:p-8 -mt-20 flex flex-col md:flex-row gap-6 items-center md:items-end relative z-10">
            
            {/* Avatar */}
            <div className="relative -mt-20 md:-mt-28 md:mr-2 shrink-0 group">
              <img 
                src={profileUser.avatar} 
                className="w-32 h-32 md:w-44 md:h-44 rounded-full object-cover profile-avatar bg-white" 
                alt={profileUser.name}
              />
              {profileUser.isVerified && (
                <div className="absolute bottom-2 right-2 bg-blue-500 text-white p-1.5 rounded-full ring-4 ring-white shadow-sm" title="Đã xác thực SV">
                  <ShieldCheck size={24} />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 text-center md:text-left min-w-0 pb-2">
              <h1 className="text-3xl md:text-4xl font-black text-slate-900 mb-2 flex items-center justify-center md:justify-start gap-3">
                {profileUser.name}
                {isBanned && <span className="bg-red-100 text-red-600 text-xs px-2.5 py-1 rounded-full font-bold uppercase tracking-wider border border-red-200">Bị khóa</span>}
              </h1>
              
              <div className="flex flex-wrap justify-center md:justify-start gap-y-2 gap-x-5 text-sm font-medium text-slate-500 mb-4">
                <span className="flex items-center gap-1.5 bg-white/50 px-2 py-1 rounded-lg border border-white/50"><School size={16} className="text-[#00418E]"/> {profileUser.major || "Sinh viên Bách Khoa"} {profileUser.academicYear ? `- ${profileUser.academicYear}` : ""}</span>
                <span className="flex items-center gap-1.5"><Calendar size={16}/> {formatJoinedDate(profileUser.joinedAt)}</span>
                
                {/* --- HIỂN THỊ TRẠNG THÁI --- */}
                <span className={`flex items-center gap-1.5 ${formatLastSeen(profileUser.lastSeen) === "Đang hoạt động" ? "text-green-600 font-bold" : "text-slate-500"}`}>
                    <Zap size={16} className={formatLastSeen(profileUser.lastSeen) === "Đang hoạt động" ? "fill-green-500 animate-pulse" : "fill-slate-300"}/> 
                    {formatLastSeen(profileUser.lastSeen)}
                </span>
              </div>

              {profileUser.bio && (
                <p className="text-slate-600 italic bg-blue-50/60 px-4 py-2 rounded-xl inline-block border border-blue-100/50 max-w-lg text-sm md:text-base">
                  "{profileUser.bio}"
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3 shrink-0 self-center md:self-end mb-2">
              {isOwnProfile ? (
                <>
                  <button 
                    onClick={() => {
                      setEditName(profileUser.name);
                      setEditBio(profileUser.bio || "");
                      setEditMajor(profileUser.major || "");
                      setEditYear(profileUser.academicYear || "");
                      setIsEditModalOpen(true);
                    }}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm"
                  >
                    <Edit3 size={18}/> Sửa hồ sơ
                  </button>
                  <button onClick={() => signOut()} className="p-2.5 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 transition-colors border border-red-100" title="Đăng xuất">
                    <LogOut size={20}/>
                  </button>
                </>
              ) : (
                <>
                  <Link to={`/chat/${profileUser.id}`} className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-white bg-[#00418E] hover:bg-[#00306b] shadow-lg shadow-blue-900/20 transition-all active:scale-95">
                    <MessageCircle size={18}/> Nhắn tin
                  </Link>
                  <button 
                    onClick={handleToggleFollow}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-all border ${isFollowing ? 'bg-slate-100 border-slate-200 text-slate-600' : 'bg-white border-blue-200 text-blue-600 hover:bg-blue-50'}`}
                  >
                    {isFollowing ? <UserCheck size={18}/> : <UserPlus size={18}/>}
                    {isFollowing ? "Đã theo dõi" : "Theo dõi"}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* --- CONTENT SECTION --- */}
      <div className="max-w-5xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-12 gap-8 animate-enter" style={{animationDelay: '100ms'}}>
        
        {/* LEFT: Stats & Badges */}
        <div className="lg:col-span-4 space-y-6">
          <div className="glass-panel p-6 rounded-2xl">
            <h3 className="font-bold text-slate-400 text-xs uppercase tracking-wider mb-4">Thống kê hoạt động</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white p-4 rounded-xl border border-slate-100 stat-card shadow-sm">
                <div className="text-2xl font-black text-[#00418E]">{userProducts.length}</div>
                <div className="text-xs font-bold text-slate-500 mt-1">Tin đăng</div>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-100 stat-card shadow-sm">
                <div className="text-2xl font-black text-green-600">{userProducts.filter(p => p.status === 'sold').length}</div>
                <div className="text-xs font-bold text-slate-500 mt-1">Đã bán</div>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-100 stat-card col-span-2 flex items-center justify-between shadow-sm">
                <div>
                  <div className="text-2xl font-black text-yellow-500 flex items-center gap-1">
                    {averageRating} <Star size={20} className="fill-current"/>
                  </div>
                  <div className="text-xs font-bold text-slate-500 mt-1">{reviews.length} đánh giá</div>
                </div>
                <div className="h-12 w-12 bg-yellow-50 text-yellow-600 rounded-2xl flex items-center justify-center">
                  <Zap size={24}/>
                </div>
              </div>
            </div>
          </div>

          {/* Verification Badge */}
          {profileUser.isVerified ? (
            <div className="bg-gradient-to-br from-[#00418E] to-[#0065D1] p-6 rounded-2xl text-white shadow-lg relative overflow-hidden">
              <div className="absolute -right-6 -top-6 bg-white/10 w-32 h-32 rounded-full blur-2xl"></div>
              <h3 className="font-bold text-lg mb-1 relative z-10 flex items-center gap-2"><ShieldCheck size={20}/> Thành viên uy tín</h3>
              <p className="text-blue-100 text-sm mb-4 relative z-10 opacity-90">Đã xác thực thông tin sinh viên.</p>
              <div className="inline-flex items-center gap-2 bg-white/20 px-3 py-1.5 rounded-lg text-xs font-bold backdrop-blur-sm border border-white/20">
                  VERIFIED STUDENT
              </div>
            </div>
          ) : isOwnProfile && (
            <div className="bg-white border border-dashed border-slate-300 p-6 rounded-2xl text-center">
               <ShieldAlert size={32} className="mx-auto text-slate-300 mb-3"/>
               <p className="text-sm font-bold text-slate-600 mb-3">Tài khoản chưa xác thực</p>
               {verificationStatus === 'pending' ? (
                 <span className="text-xs font-bold text-orange-500 bg-orange-50 px-3 py-1.5 rounded-lg">Đang chờ duyệt...</span>
               ) : (
                 <button onClick={() => setVerifyModalOpen(true)} className="text-xs font-bold text-white bg-blue-500 px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors shadow-sm">Xác thực ngay</button>
               )}
            </div>
          )}
        </div>

        {/* RIGHT: Tabs & Content */}
        <div className="lg:col-span-8">
          <div className="glass-panel rounded-3xl min-h-[500px] overflow-hidden">
            {/* Tabs */}
            <div className="flex border-b border-slate-200/60 bg-white/50 backdrop-blur-md sticky top-0 z-20">
              <button 
                onClick={() => setActiveTab('selling')}
                className={`flex-1 py-4 font-bold text-sm transition-all flex items-center justify-center gap-2 tab-btn ${activeTab === 'selling' ? 'tab-active text-[#00418E]' : 'text-slate-500 hover:text-slate-800'}`}
              >
                <Package size={18}/> Kho hàng ({userProducts.length})
              </button>
              <button 
                onClick={() => setActiveTab('reviews')}
                className={`flex-1 py-4 font-bold text-sm transition-all flex items-center justify-center gap-2 tab-btn ${activeTab === 'reviews' ? 'tab-active text-[#00418E]' : 'text-slate-500 hover:text-slate-800'}`}
              >
                <Star size={18}/> Đánh giá ({reviews.length})
              </button>
            </div>

            <div className="p-6">
              {activeTab === 'selling' ? (
                userProducts.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    {userProducts.map(product => (
                      <ProductCard key={product.id} product={product} />
                    ))}
                  </div>
                ) : (
                  <div className="py-24 text-center text-slate-400">
                    <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <ShoppingBag size={32} className="opacity-40"/>
                    </div>
                    <p className="font-medium">Chưa có sản phẩm nào được đăng bán.</p>
                    {isOwnProfile && <Link to="/post-item" className="text-sm font-bold text-[#00418E] mt-2 inline-block hover:underline">Đăng tin ngay</Link>}
                  </div>
                )
              ) : (
                <div className="space-y-6">
                  {!isOwnProfile && currentUser && (
                    <form onSubmit={handleCreateReview} className="bg-slate-50 p-5 rounded-2xl border border-slate-100 mb-8 transition-all focus-within:bg-white focus-within:shadow-md focus-within:border-blue-100">
                      <h4 className="font-bold text-sm mb-3 text-slate-700">Viết đánh giá của bạn</h4>
                      <div className="flex gap-2 mb-4">
                        {[1, 2, 3, 4, 5].map(star => (
                          <button type="button" key={star} onClick={() => setNewRating(star)} className="focus:outline-none transition-transform hover:scale-110 active:scale-95">
                            <Star size={28} className={star <= newRating ? "fill-yellow-400 text-yellow-400 drop-shadow-sm" : "text-slate-200"}/>
                          </button>
                        ))}
                      </div>
                      <textarea 
                        className="w-full p-3 rounded-xl border border-slate-200 text-sm focus:border-[#00418E] focus:ring-4 focus:ring-blue-500/10 outline-none transition-all bg-white" 
                        placeholder="Chia sẻ trải nghiệm giao dịch..."
                        rows={3}
                        value={newComment}
                        onChange={e => setNewComment(e.target.value)}
                      />
                      <div className="mt-3 text-right">
                        <button disabled={submittingReview} className="bg-[#00418E] text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-[#00306b] shadow-lg shadow-blue-900/10 transition-all disabled:opacity-50">
                          {submittingReview ? "Đang gửi..." : "Gửi đánh giá"}
                        </button>
                      </div>
                    </form>
                  )}
                  
                  {reviews.length > 0 ? reviews.map(review => (
                    <div key={review.id} className="flex gap-4 border-b border-slate-100 pb-6 last:border-0 last:pb-0 animate-enter">
                      <img src={review.reviewerAvatar} className="w-12 h-12 rounded-full bg-slate-200 object-cover border border-slate-100" alt="Reviewer"/>
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-bold text-slate-800 text-sm">{review.reviewerName}</p>
                            <div className="flex text-yellow-400 text-xs mt-1 gap-0.5">
                              {[...Array(5)].map((_, i) => (
                                <Star key={i} size={12} className={i < review.rating ? "fill-current" : "text-slate-200"}/>
                              ))}
                            </div>
                          </div>
                          <span className="text-xs text-slate-400 font-medium bg-slate-100 px-2 py-1 rounded-md">{new Date(review.createdAt).toLocaleDateString()}</span>
                        </div>
                        <p className="mt-3 text-sm text-slate-600 bg-slate-50 p-3 rounded-xl leading-relaxed">{review.comment}</p>
                      </div>
                    </div>
                  )) : (
                    <div className="py-20 text-center text-slate-400">
                       <MessageCircle size={40} className="mx-auto mb-3 opacity-30"/>
                       <p>Chưa có đánh giá nào</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* --- MODAL CHỈNH SỬA --- */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F172A]/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="font-bold text-lg text-slate-800">Chỉnh sửa hồ sơ</h3>
              <button onClick={() => setIsEditModalOpen(false)} className="bg-white p-2 rounded-full text-slate-400 hover:text-slate-600 shadow-sm border border-slate-100"><X size={18}/></button>
            </div>
            
            <div className="p-6 space-y-5 overflow-y-auto">
               <div>
                 <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Ảnh đại diện & Bìa</label>
                 <div className="flex gap-4">
                    <label className="flex-1 h-24 bg-slate-100 rounded-xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center cursor-pointer hover:bg-blue-50 hover:border-blue-300 transition-all group">
                        <Camera className="text-slate-400 group-hover:text-blue-500 mb-1"/>
                        <span className="text-xs font-bold text-slate-500 group-hover:text-blue-600">Đổi Avatar</span>
                        <input type="file" className="hidden" accept="image/*" onChange={(e) => { if(e.target.files?.[0]) { setEditAvatarFile(e.target.files[0]); setPreviewAvatar(URL.createObjectURL(e.target.files[0])); }}} />
                    </label>
                    <label className="flex-1 h-24 bg-slate-100 rounded-xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center cursor-pointer hover:bg-blue-50 hover:border-blue-300 transition-all group">
                        <Upload className="text-slate-400 group-hover:text-blue-500 mb-1"/>
                        <span className="text-xs font-bold text-slate-500 group-hover:text-blue-600">Đổi Bìa</span>
                        <input type="file" className="hidden" accept="image/*" onChange={(e) => { if(e.target.files?.[0]) { setEditCoverFile(e.target.files[0]); setPreviewCover(URL.createObjectURL(e.target.files[0])); }}} />
                    </label>
                 </div>
                 {/* Preview Area */}
                 {(previewAvatar || previewCover) && <p className="text-xs text-green-600 mt-2 font-bold text-center">Đã chọn ảnh mới!</p>}
               </div>

               <div>
                 <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Tên hiển thị</label>
                 <input type="text" value={editName} onChange={e => setEditName(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:border-[#00418E] outline-none transition-all"/>
               </div>
               
               <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Ngành học</label>
                    <input type="text" value={editMajor} onChange={e => setEditMajor(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:border-[#00418E] outline-none transition-all" placeholder="VD: CNTT"/>
                 </div>
                 <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Khóa</label>
                    <input type="text" value={editYear} onChange={e => setEditYear(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:border-[#00418E] outline-none transition-all" placeholder="VD: K2021"/>
                 </div>
               </div>

               <div>
                 <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Giới thiệu bản thân</label>
                 <textarea rows={3} value={editBio} onChange={e => setEditBio(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:border-[#00418E] outline-none resize-none transition-all"/>
               </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
               <button onClick={() => setIsEditModalOpen(false)} className="px-5 py-2.5 rounded-xl font-bold text-slate-500 hover:bg-slate-200 transition-colors">Hủy</button>
               <button onClick={handleUpdateProfile} disabled={isSaving} className="px-6 py-2.5 rounded-xl font-bold text-white bg-[#00418E] hover:bg-[#00306b] shadow-lg shadow-blue-900/20 disabled:opacity-50 flex items-center gap-2">
                 {isSaving && <Loader2 size={16} className="animate-spin"/>} Lưu thay đổi
               </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL XÁC THỰC --- */}
      {verifyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F172A]/70 backdrop-blur-md p-4 animate-in fade-in">
          <div className="relative w-full max-w-sm rounded-3xl bg-white p-8 text-center shadow-2xl">
            <button onClick={() => setVerifyModalOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X size={20} /></button>
            <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-6 text-blue-600">
               <ShieldCheck size={32} />
            </div>
            <h3 className="text-xl font-black text-slate-900 mb-2">Xác thực sinh viên</h3>
            <p className="text-sm text-slate-500 mb-8 leading-relaxed">Vui lòng tải lên ảnh thẻ sinh viên hoặc bảng điểm. Admin sẽ duyệt trong vòng 24h.</p>
            
            <label className="flex h-32 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50/50 hover:bg-blue-50 hover:border-blue-400 transition-all group">
              {uploadingVerify ? <Loader2 className="animate-spin text-blue-600" /> : (
                <>
                  <Upload className="mb-2 text-blue-400 group-hover:text-blue-600 transition-colors" />
                  <p className="text-xs font-bold text-blue-600 uppercase tracking-wider">Chọn ảnh</p>
                </>
              )}
              <input type="file" className="hidden" accept="image/*" onChange={handleUploadVerification} disabled={uploadingVerify} />
            </label>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;
