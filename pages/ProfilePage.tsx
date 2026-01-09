import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../services/supabase";
import { useToast } from "../contexts/ToastContext";
import {
  ShieldCheck, LogOut, MessageCircle, Star, Edit3, X,
  UserPlus, UserCheck, Zap, School, ShieldAlert, Loader2,
  MapPin, Calendar, Package, ShoppingBag, Camera, UploadCloud
} from "lucide-react";
import { Product, User, Review } from "../types";
import ProductCard from "../components/ProductCard";
import CloneAvatar from "../assets/avatar.jpg";

// --- STYLES & ANIMATIONS ---
const VisualEngine = () => (
  <style>{`
    :root { --primary: #00418E; }
    body { background-color: #F0F4F8; }
    
    .glass-panel {
      background: rgba(255, 255, 255, 0.8);
      backdrop-filter: blur(20px);
      border: 1px solid rgba(255, 255, 255, 0.6);
      box-shadow: 0 8px 32px rgba(0, 65, 142, 0.05);
    }

    .aurora-bg {
      position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: -1;
      background: radial-gradient(circle at 10% 20%, rgba(0, 65, 142, 0.05) 0%, transparent 40%),
                  radial-gradient(circle at 90% 80%, rgba(0, 229, 255, 0.05) 0%, transparent 40%);
    }

    .profile-avatar {
      box-shadow: 0 0 0 4px white, 0 10px 20px rgba(0,0,0,0.1);
    }
    
    .stat-card { transition: transform 0.2s; }
    .stat-card:hover { transform: translateY(-3px); }

    .tab-active {
      color: #00418E;
      border-bottom: 2px solid #00418E;
      background: linear-gradient(to top, rgba(0,65,142,0.05), transparent);
    }
  `}</style>
);

interface ExtendedUser extends User {
  bio?: string;
  major?: string;
  academicYear?: string;
  joinedAt?: string;
  coverUrl?: string;
  lastSeen?: string;
  banUntil?: string | null;
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
  const [isSaving, setIsSaving] = useState(false);

  // Review States
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  // --- HELPERS ---
  const formatJoinedDate = (dateString?: string) => {
    if (!dateString) return "Thành viên mới";
    return `Tham gia ${new Date(dateString).toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })}`;
  };

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
          avatar: profileData.avatar_url || CloneAvatar,
          coverUrl: profileData.cover_url,
          isVerified: profileData.verified_status === 'verified',
          role: profileData.role as any,
          bio: profileData.bio || "",
          major: profileData.major || "",
          academicYear: profileData.academic_year || "",
          joinedAt: profileData.created_at,
          banUntil: profileData.ban_until,
        });

        // 2. Products
        let prodQuery = supabase
          .from("products")
          .select("*, profiles:seller_id(name, avatar_url)")
          .eq("seller_id", targetUserId)
          .order("created_at", { ascending: false });

        if (!isOwnProfile) prodQuery = prodQuery.eq("status", "available");
        
        const { data: prodData } = await prodQuery;
        
        if (prodData) {
          const mappedProducts = prodData.map((item: any) => ({
            ...item,
            seller: item.profiles,
            images: item.images || [],
            postedAt: item.created_at // Map created_at -> postedAt cho UI
          }));
          setUserProducts(mappedProducts);
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
            reviewerAvatar: r.reviewer?.avatar_url || CloneAvatar,
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

        // 4. Check Follow
        if (!isOwnProfile && currentUser) {
          const { data } = await supabase
            .from("follows")
            .select("*")
            .eq("follower_id", currentUser.id)
            .eq("following_id", targetUserId)
            .maybeSingle();
          setIsFollowing(!!data);
        }

      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, currentUser, targetUserId, isOwnProfile]);

  // --- HANDLERS ---
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

  const handleUpdateProfile = async () => {
    if (!currentUser) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ name: editName, bio: editBio, major: editMajor })
        .eq("id", currentUser.id);
      
      if (error) throw error;
      
      setProfileUser(prev => prev ? ({ ...prev, name: editName, bio: editBio, major: editMajor }) : null);
      setIsEditModalOpen(false);
      addToast("Cập nhật thành công", "success");
    } catch (error) {
      addToast("Lỗi cập nhật", "error");
    } finally {
      setIsSaving(false);
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
      // Refresh logic... (Simplified: reload or refetch)
      window.location.reload(); 
    } catch (error) {
      addToast("Không thể gửi đánh giá", "error");
    } finally {
      setSubmittingReview(false);
    }
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
      <div className="relative mb-24">
        {/* Cover Image */}
        <div className="h-60 md:h-80 w-full relative overflow-hidden bg-gradient-to-r from-blue-900 to-blue-600">
          {profileUser.coverUrl ? (
            <img src={profileUser.coverUrl} className="w-full h-full object-cover opacity-90" alt="cover" />
          ) : (
            <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
          )}
          {/* Overlay Gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
        </div>

        {/* Profile Info Card (Floating) */}
        <div className="max-w-5xl mx-auto px-4 relative">
          <div className="glass-panel rounded-3xl p-6 md:p-8 -mt-20 flex flex-col md:flex-row gap-6 items-center md:items-end relative z-10">
            
            {/* Avatar */}
            <div className="relative -mt-16 md:-mt-24 md:mr-4 shrink-0">
              <img 
                src={profileUser.avatar} 
                className="w-32 h-32 md:w-40 md:h-40 rounded-full object-cover profile-avatar bg-white" 
                alt={profileUser.name}
              />
              {profileUser.isVerified && (
                <div className="absolute bottom-2 right-2 bg-blue-500 text-white p-1.5 rounded-full ring-4 ring-white" title="Đã xác thực SV">
                  <ShieldCheck size={20} />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 text-center md:text-left min-w-0">
              <h1 className="text-3xl font-black text-slate-900 mb-1 flex items-center justify-center md:justify-start gap-2">
                {profileUser.name}
                {isBanned && <span className="bg-red-100 text-red-600 text-xs px-2 py-1 rounded-full font-bold uppercase tracking-wider">Bị khóa</span>}
              </h1>
              
              <div className="flex flex-wrap justify-center md:justify-start gap-y-1 gap-x-4 text-sm font-medium text-slate-500 mb-4">
                <span className="flex items-center gap-1.5"><School size={16}/> {profileUser.major || "Sinh viên Bách Khoa"}</span>
                <span className="flex items-center gap-1.5"><Calendar size={16}/> {formatJoinedDate(profileUser.joinedAt)}</span>
                {profileUser.studentId && <span className="flex items-center gap-1.5"><ShieldAlert size={16} className="text-slate-400"/> MSSV: {profileUser.studentId}</span>}
              </div>

              {profileUser.bio && (
                <p className="text-slate-600 italic bg-blue-50/50 px-4 py-2 rounded-xl inline-block border border-blue-100/50">
                  "{profileUser.bio}"
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3 shrink-0">
              {isOwnProfile ? (
                <>
                  <button 
                    onClick={() => {
                      setEditName(profileUser.name);
                      setEditBio(profileUser.bio || "");
                      setEditMajor(profileUser.major || "");
                      setIsEditModalOpen(true);
                    }}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
                  >
                    <Edit3 size={18}/> Sửa hồ sơ
                  </button>
                  <button 
                    onClick={() => signOut()} 
                    className="p-2.5 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                    title="Đăng xuất"
                  >
                    <LogOut size={20}/>
                  </button>
                </>
              ) : (
                <>
                  <Link to={`/chat?partnerId=${profileUser.id}`} className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-white bg-[#00418E] hover:bg-[#00306b] shadow-lg shadow-blue-900/20 transition-all active:scale-95">
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
      <div className="max-w-5xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT: Stats & Badges */}
        <div className="lg:col-span-4 space-y-6">
          <div className="glass-panel p-6 rounded-2xl">
            <h3 className="font-bold text-slate-400 text-xs uppercase tracking-wider mb-4">Thống kê hoạt động</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white p-4 rounded-xl border border-slate-100 stat-card">
                <div className="text-2xl font-black text-[#00418E]">{userProducts.length}</div>
                <div className="text-xs font-bold text-slate-500">Tin đăng</div>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-100 stat-card">
                <div className="text-2xl font-black text-green-600">{userProducts.filter(p => p.status === 'sold').length}</div>
                <div className="text-xs font-bold text-slate-500">Đã bán</div>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-100 stat-card col-span-2 flex items-center justify-between">
                <div>
                  <div className="text-2xl font-black text-yellow-500 flex items-center gap-1">
                    {averageRating} <Star size={20} className="fill-current"/>
                  </div>
                  <div className="text-xs font-bold text-slate-500">{reviews.length} đánh giá</div>
                </div>
                <div className="h-10 w-10 bg-yellow-50 text-yellow-600 rounded-full flex items-center justify-center">
                  <Zap size={20}/>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-[#00418E] to-[#0065D1] p-6 rounded-2xl text-white shadow-lg relative overflow-hidden">
            <div className="absolute -right-4 -top-4 bg-white/10 w-24 h-24 rounded-full blur-xl"></div>
            <h3 className="font-bold text-lg mb-2 relative z-10">Thành viên uy tín</h3>
            <p className="text-blue-100 text-sm mb-4 relative z-10">Đã xác thực thông tin sinh viên và có lịch sử giao dịch tốt.</p>
            {profileUser.isVerified ? (
               <div className="inline-flex items-center gap-2 bg-white/20 px-3 py-1.5 rounded-lg text-xs font-bold backdrop-blur-sm">
                 <ShieldCheck size={14}/> Verified Student
               </div>
            ) : (
               <div className="inline-flex items-center gap-2 bg-white/20 px-3 py-1.5 rounded-lg text-xs font-bold backdrop-blur-sm opacity-60">
                 Unverified
               </div>
            )}
          </div>
        </div>

        {/* RIGHT: Tabs & Content */}
        <div className="lg:col-span-8">
          <div className="glass-panel rounded-3xl min-h-[500px] overflow-hidden">
            {/* Tabs */}
            <div className="flex border-b border-slate-100 bg-white/50 backdrop-blur-md">
              <button 
                onClick={() => setActiveTab('selling')}
                className={`flex-1 py-4 font-bold text-sm transition-all flex items-center justify-center gap-2 ${activeTab === 'selling' ? 'tab-active' : 'text-slate-500 hover:text-slate-800'}`}
              >
                <Package size={18}/> Kho hàng ({userProducts.length})
              </button>
              <button 
                onClick={() => setActiveTab('reviews')}
                className={`flex-1 py-4 font-bold text-sm transition-all flex items-center justify-center gap-2 ${activeTab === 'reviews' ? 'tab-active' : 'text-slate-500 hover:text-slate-800'}`}
              >
                <Star size={18}/> Đánh giá ({reviews.length})
              </button>
            </div>

            <div className="p-6">
              {activeTab === 'selling' ? (
                userProducts.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {userProducts.map(product => (
                      <ProductCard key={product.id} product={product} />
                    ))}
                  </div>
                ) : (
                  <div className="py-20 text-center text-slate-400">
                    <ShoppingBag size={48} className="mx-auto mb-4 opacity-20"/>
                    <p className="font-medium">Chưa có sản phẩm nào</p>
                  </div>
                )
              ) : (
                <div className="space-y-6">
                  {!isOwnProfile && currentUser && (
                    <form onSubmit={handleCreateReview} className="bg-slate-50 p-4 rounded-xl border border-slate-100 mb-8">
                      <h4 className="font-bold text-sm mb-3">Viết đánh giá của bạn</h4>
                      <div className="flex gap-2 mb-3">
                        {[1, 2, 3, 4, 5].map(star => (
                          <button type="button" key={star} onClick={() => setNewRating(star)} className="focus:outline-none">
                            <Star size={24} className={star <= newRating ? "fill-yellow-400 text-yellow-400" : "text-slate-300"}/>
                          </button>
                        ))}
                      </div>
                      <textarea 
                        className="w-full p-3 rounded-xl border border-slate-200 text-sm focus:border-[#00418E] outline-none" 
                        placeholder="Chia sẻ trải nghiệm giao dịch..."
                        rows={3}
                        value={newComment}
                        onChange={e => setNewComment(e.target.value)}
                      />
                      <div className="mt-2 text-right">
                        <button disabled={submittingReview} className="bg-[#00418E] text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-[#00306b]">
                          {submittingReview ? "Đang gửi..." : "Gửi đánh giá"}
                        </button>
                      </div>
                    </form>
                  )}
                  
                  {reviews.length > 0 ? reviews.map(review => (
                    <div key={review.id} className="flex gap-4 border-b border-slate-100 pb-6 last:border-0 last:pb-0">
                      <img src={review.reviewerAvatar} className="w-10 h-10 rounded-full bg-slate-200 object-cover" alt="Reviewer"/>
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-bold text-slate-800 text-sm">{review.reviewerName}</p>
                            <div className="flex text-yellow-400 text-xs mt-0.5">
                              {[...Array(5)].map((_, i) => (
                                <Star key={i} size={12} className={i < review.rating ? "fill-current" : "text-slate-200"}/>
                              ))}
                            </div>
                          </div>
                          <span className="text-xs text-slate-400 font-medium">{new Date(review.createdAt).toLocaleDateString()}</span>
                        </div>
                        <p className="mt-2 text-sm text-slate-600 bg-slate-50 p-3 rounded-lg">{review.comment}</p>
                      </div>
                    </div>
                  )) : (
                    <div className="py-10 text-center text-slate-400">Chưa có đánh giá nào</div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* --- EDIT MODAL --- */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-lg text-slate-800">Chỉnh sửa hồ sơ</h3>
              <button onClick={() => setIsEditModalOpen(false)} className="bg-white p-1.5 rounded-full text-slate-400 hover:text-slate-600 shadow-sm"><X size={18}/></button>
            </div>
            
            <div className="p-6 space-y-4">
               {/* Cover & Avatar Edit Hooks would go here - simplified for brevity */}
               <div>
                 <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Tên hiển thị</label>
                 <input 
                   type="text" 
                   value={editName} 
                   onChange={e => setEditName(e.target.value)} 
                   className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:border-[#00418E] outline-none"
                 />
               </div>
               <div>
                 <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Ngành học</label>
                 <input 
                   type="text" 
                   value={editMajor} 
                   onChange={e => setEditMajor(e.target.value)} 
                   className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:border-[#00418E] outline-none"
                 />
               </div>
               <div>
                 <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Giới thiệu</label>
                 <textarea 
                   rows={3}
                   value={editBio} 
                   onChange={e => setEditBio(e.target.value)} 
                   className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:border-[#00418E] outline-none resize-none"
                 />
               </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
               <button onClick={() => setIsEditModalOpen(false)} className="px-5 py-2.5 rounded-xl font-bold text-slate-500 hover:bg-slate-200 transition-colors">Hủy</button>
               <button 
                 onClick={handleUpdateProfile} 
                 disabled={isSaving}
                 className="px-6 py-2.5 rounded-xl font-bold text-white bg-[#00418E] hover:bg-[#00306b] shadow-lg shadow-blue-900/20 disabled:opacity-50"
               >
                 {isSaving ? "Đang lưu..." : "Lưu thay đổi"}
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;
