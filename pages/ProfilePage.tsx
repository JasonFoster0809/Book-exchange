import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../services/supabase";
import { useToast } from "../contexts/ToastContext";
import {
  ShieldCheck, LogOut, MessageCircle, Star, Edit3, X,
  UserPlus, Zap, School, ShieldAlert, Loader2,
  Calendar, Package, ShoppingBag
} from "lucide-react";
import { Product, User, Review } from "../types"; // Dùng trực tiếp User từ types
import ProductCard from "../components/ProductCard";

// --- VISUAL ENGINE ---
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
      background: 
        radial-gradient(at 0% 0%, rgba(0, 71, 171, 0.1) 0px, transparent 50%),
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

  // Xác định xem đang xem profile của chính mình hay người khác
  const isOwnProfile = !id || (currentUser && id === currentUser.id);
  const targetUserId = isOwnProfile ? currentUser?.id : id;

  // --- STATES ---
  // FIX: Dùng User thay vì ExtendedUser
  const [profileUser, setProfileUser] = useState<User | null>(null);
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
  const [editCoverFile, setEditCoverFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Verify & Review States
  const [verifyModalOpen, setVerifyModalOpen] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<string>("none");

  // --- HELPERS ---
  const formatJoinedDate = (dateString?: string) => {
    if (!dateString) return "Thành viên mới";
    try {
      return `Tham gia ${new Date(dateString).toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })}`;
    } catch { return "Thành viên mới"; }
  };

  const formatLastSeen = (timestamp?: string) => {
    if (!timestamp) return "Offline";
    const date = new Date(timestamp);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diff < 300) return "Đang hoạt động"; // Dưới 5 phút
    if (diff < 3600) return `Hoạt động ${Math.floor(diff / 60)} phút trước`;
    if (diff < 86400) return `Hoạt động ${Math.floor(diff / 3600)} giờ trước`;
    return `Hoạt động ${Math.floor(diff / 86400)} ngày trước`;
  };

  // Tự động cập nhật Last Seen khi vào trang
  useEffect(() => {
    if (currentUser) {
      const updatePresence = async () => {
        await supabase.from('profiles').update({ last_seen: new Date().toISOString() }).eq('id', currentUser.id);
      };
      updatePresence();
    }
  }, [currentUser]);

  // --- FETCH DATA (LOGIC BẤT TỬ) ---
  useEffect(() => {
    const fetchData = async () => {
      if (!targetUserId) return;
      setLoading(true);
      
      try {
        // 1. Fetch Profile
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", targetUserId)
          .single();

        if (profileError) throw profileError;

        // FIX: Map đầy đủ trường banned và studentId
        setProfileUser({
          id: profileData.id,
          name: profileData.name || "Người dùng ẩn danh",
          email: profileData.email,
          studentId: profileData.student_code || "",
          avatar: profileData.avatar_url || `https://ui-avatars.com/api/?name=${profileData.name || 'U'}&background=random`,
          coverUrl: profileData.cover_url,
          isVerified: profileData.verified_status === 'verified',
          role: profileData.role as any,
          bio: profileData.bio || "",
          major: profileData.major || "",
          academicYear: profileData.academic_year || "",
          joinedAt: profileData.created_at,
          lastSeen: profileData.last_seen,
          banUntil: profileData.banned_until,
          banned: !!profileData.banned_until && new Date(profileData.banned_until) > new Date() // <--- FIX LỖI TS2345
        });

        // 2. Fetch Products
        let prodQuery = supabase
          .from("products")
          .select("*")
          .eq("seller_id", targetUserId)
          .order("created_at", { ascending: false });

        if (!isOwnProfile) {
          prodQuery = prodQuery.eq("status", "available");
        }
        
        const { data: prodData } = await prodQuery;
        
        if (prodData) {
          const mappedProducts = prodData.map((item: any) => ({
            id: item.id,
            title: item.title,
            description: item.description,
            price: item.price,
            images: Array.isArray(item.images) ? item.images : (item.images ? [item.images] : []),
            category: item.category,
            condition: item.condition,
            status: item.status,
            tradeMethod: item.trade_method,
            location: item.location_name || 'TP.HCM', // <--- FIX LỖI TS2322 (Thiếu location)
            sellerId: item.seller_id,
            postedAt: item.created_at,
            view_count: item.view_count || 0,
            seller: profileData // Gán profileData vào để tránh lỗi undefined
          }));
          setUserProducts(mappedProducts as any);
        }

        // 3. Fetch Reviews
        try {
          const { data: reviewData, error: rError } = await supabase
            .from("reviews")
            .select(`*, reviewer:profiles!reviewer_id(name, avatar_url)`)
            .eq("reviewee_id", targetUserId)
            .order("created_at", { ascending: false });
            
          if (!rError && reviewData) {
             const mapped = reviewData.map((r: any) => ({
               id: r.id, reviewerId: r.reviewer_id, rating: r.rating, comment: r.comment, createdAt: r.created_at,
               reviewerName: r.reviewer?.name || "Ẩn danh",
               reviewerAvatar: r.reviewer?.avatar_url || "https://ui-avatars.com/api/?background=random"
             }));
             setReviews(mapped);
             if (mapped.length > 0) {
               setAverageRating(parseFloat((mapped.reduce((a:number,b:any)=>a+b.rating,0) / mapped.length).toFixed(1)));
             }
          }
        } catch (e) { console.log("Review fetch fallback"); }

        // 4. Follow & Verify status
        if (currentUser && !isOwnProfile) {
           const { data } = await supabase.from("follows").select("id").eq("follower_id", currentUser.id).eq("following_id", targetUserId).maybeSingle();
           setIsFollowing(!!data);
        }
        if (currentUser && isOwnProfile) {
           const { data } = await supabase.from("verification_requests").select("status").eq("user_id", currentUser.id).maybeSingle();
           if(data) setVerificationStatus(data.status);
        }

      } catch (err) {
        console.error(err);
        addToast("Không thể tải thông tin người dùng", "error");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [targetUserId, isOwnProfile, currentUser]);

  // --- UPDATE PROFILE HANDLER ---
  const handleUpdateProfile = async () => {
    if (!currentUser) return;
    setIsSaving(true);
    try {
      let avatarUrl = profileUser?.avatar;
      let coverUrl = profileUser?.coverUrl;

      // Upload Logic (Giả lập nếu chưa setup storage)
      if (editAvatarFile || editCoverFile) {
         // Logic upload thật ở đây (cần bucket 'product-images')
         // ...
      }

      const updates = {
        name: editName,
        bio: editBio,
        major: editMajor,
        academic_year: editYear,
        // avatar_url: avatarUrl, // Uncomment khi có upload
        // cover_url: coverUrl
      };

      const { error } = await supabase.from("profiles").update(updates).eq("id", currentUser.id);
      if (error) throw error;

      setProfileUser(prev => prev ? ({ ...prev, ...updates }) : null);
      setIsEditModalOpen(false);
      addToast("Cập nhật thành công!", "success");
    } catch (e) { addToast("Lỗi cập nhật", "error"); }
    finally { setIsSaving(false); }
  };

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-[#00418E]" size={40}/></div>;
  if (!profileUser) return <div className="py-20 text-center text-slate-500">Người dùng không tồn tại</div>;

  const isBanned = profileUser.banned;

  return (
    <div className="min-h-screen pb-20 font-sans text-slate-800">
      <VisualEngine />
      <div className="aurora-bg"></div>

      {/* --- HEADER --- */}
      <div className="relative mb-24 animate-enter">
        {/* Cover */}
        <div className="h-64 md:h-80 w-full relative overflow-hidden bg-slate-900 group">
          {profileUser.coverUrl ? (
            <img src={profileUser.coverUrl} className="w-full h-full object-cover opacity-90 transition-transform duration-700 group-hover:scale-105" />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-[#00418E] to-[#0065D1] opacity-80">
                <div className="w-full h-full opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
          
          {/* Back Button */}
          <button onClick={() => navigate(-1)} className="absolute top-6 left-4 md:left-8 bg-black/20 hover:bg-black/40 text-white p-2 rounded-full backdrop-blur-sm transition-all z-20">
             <span className="sr-only">Back</span> ←
          </button>
        </div>

        {/* Profile Info */}
        <div className="max-w-5xl mx-auto px-4 relative">
          <div className="glass-panel rounded-3xl p-6 md:p-8 -mt-20 flex flex-col md:flex-row gap-6 items-center md:items-end relative z-10">
            
            <div className="relative -mt-20 md:-mt-28 md:mr-2 shrink-0 group">
              <img src={profileUser.avatar} className="w-32 h-32 md:w-44 md:h-44 rounded-full object-cover profile-avatar bg-white" />
              {profileUser.isVerified && <div className="absolute bottom-2 right-2 bg-blue-500 text-white p-1.5 rounded-full ring-4 ring-white shadow-sm"><ShieldCheck size={24} /></div>}
            </div>

            <div className="flex-1 text-center md:text-left min-w-0 pb-2">
              <h1 className="text-3xl md:text-4xl font-black text-slate-900 mb-2 flex items-center justify-center md:justify-start gap-3">
                {profileUser.name}
                {isBanned && <span className="bg-red-100 text-red-600 text-xs px-2.5 py-1 rounded-full font-bold uppercase tracking-wider border border-red-200">Bị khóa</span>}
              </h1>
              
              <div className="flex flex-wrap justify-center md:justify-start gap-y-2 gap-x-5 text-sm font-medium text-slate-500 mb-4">
                <span className="flex items-center gap-1.5 bg-white/50 px-2 py-1 rounded-lg border border-white/50"><School size={16} className="text-[#00418E]"/> {profileUser.major || "Sinh viên BK"} {profileUser.academicYear ? `- ${profileUser.academicYear}` : ""}</span>
                <span className="flex items-center gap-1.5"><Calendar size={16}/> {formatJoinedDate(profileUser.joinedAt)}</span>
                <span className={`flex items-center gap-1.5 ${formatLastSeen(profileUser.lastSeen) === "Đang hoạt động" ? "text-green-600 font-bold" : "text-slate-500"}`}>
                    <Zap size={16} className={formatLastSeen(profileUser.lastSeen) === "Đang hoạt động" ? "fill-green-500 animate-pulse" : "fill-slate-300"}/> 
                    {formatLastSeen(profileUser.lastSeen)}
                </span>
              </div>

              {profileUser.bio && <p className="text-slate-600 italic bg-blue-50/60 px-4 py-2 rounded-xl inline-block border border-blue-100/50 max-w-lg text-sm md:text-base">"{profileUser.bio}"</p>}
            </div>

            <div className="flex gap-3 shrink-0 self-center md:self-end mb-2">
              {isOwnProfile ? (
                <>
                  <button onClick={() => { setEditName(profileUser.name); setEditBio(profileUser.bio || ""); setEditMajor(profileUser.major || ""); setEditYear(profileUser.academicYear || ""); setIsEditModalOpen(true); }} className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 shadow-sm"><Edit3 size={18}/> Sửa hồ sơ</button>
                  <button onClick={() => signOut()} className="p-2.5 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 border border-red-100"><LogOut size={20}/></button>
                </>
              ) : (
                <>
                  <Link to={`/chat/${profileUser.id}`} className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-white bg-[#00418E] hover:bg-[#00306b] shadow-lg shadow-blue-900/20 active:scale-95"><MessageCircle size={18}/> Nhắn tin</Link>
                  <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold bg-white border border-blue-200 text-blue-600 hover:bg-blue-50"><UserPlus size={18}/> Theo dõi</button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* --- CONTENT --- */}
      <div className="max-w-5xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-12 gap-8 animate-enter" style={{animationDelay: '100ms'}}>
        
        {/* LEFT STATS */}
        <div className="lg:col-span-4 space-y-6">
          <div className="glass-panel p-6 rounded-2xl">
            <h3 className="font-bold text-slate-400 text-xs uppercase tracking-wider mb-4">Thống kê hoạt động</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white p-4 rounded-xl border border-slate-100 stat-card shadow-sm text-center">
                <div className="text-2xl font-black text-[#00418E]">{userProducts.length}</div>
                <div className="text-xs font-bold text-slate-500 mt-1">Tin đăng</div>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-100 stat-card shadow-sm text-center">
                <div className="text-2xl font-black text-green-600">{userProducts.filter(p => p.status === 'sold').length}</div>
                <div className="text-xs font-bold text-slate-500 mt-1">Đã bán</div>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-100 stat-card col-span-2 flex items-center justify-between shadow-sm">
                <div>
                  <div className="text-2xl font-black text-yellow-500 flex items-center gap-1">{averageRating} <Star size={20} className="fill-current"/></div>
                  <div className="text-xs font-bold text-slate-500 mt-1">{reviews.length} đánh giá</div>
                </div>
                <div className="h-12 w-12 bg-yellow-50 text-yellow-600 rounded-2xl flex items-center justify-center"><Zap size={24}/></div>
              </div>
            </div>
          </div>

          {isOwnProfile && !profileUser.isVerified && (
            <div className="bg-white border border-dashed border-slate-300 p-6 rounded-2xl text-center">
               <ShieldAlert size={32} className="mx-auto text-slate-300 mb-3"/>
               <p className="text-sm font-bold text-slate-600 mb-3">Tài khoản chưa xác thực</p>
               <button onClick={() => setVerifyModalOpen(true)} className="text-xs font-bold text-white bg-blue-500 px-4 py-2 rounded-lg hover:bg-blue-600 shadow-sm">Xác thực ngay</button>
            </div>
          )}
        </div>

        {/* RIGHT TABS */}
        <div className="lg:col-span-8">
          <div className="glass-panel rounded-3xl min-h-[500px] overflow-hidden">
            <div className="flex border-b border-slate-200/60 bg-white/50 backdrop-blur-md sticky top-0 z-20">
              <button onClick={() => setActiveTab('selling')} className={`flex-1 py-4 font-bold text-sm transition-all flex items-center justify-center gap-2 tab-btn ${activeTab === 'selling' ? 'tab-active text-[#00418E]' : 'text-slate-500'}`}><Package size={18}/> Kho hàng</button>
              <button onClick={() => setActiveTab('reviews')} className={`flex-1 py-4 font-bold text-sm transition-all flex items-center justify-center gap-2 tab-btn ${activeTab === 'reviews' ? 'tab-active text-[#00418E]' : 'text-slate-500'}`}><Star size={18}/> Đánh giá</button>
            </div>

            <div className="p-6">
              {activeTab === 'selling' ? (
                userProducts.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    {userProducts.map(product => <ProductCard key={product.id} product={product} />)}
                  </div>
                ) : (
                  <div className="py-24 text-center text-slate-400">
                    <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4"><ShoppingBag size={32} className="opacity-40"/></div>
                    <p className="font-medium">Chưa có sản phẩm nào.</p>
                    {isOwnProfile && <Link to="/post-item" className="text-sm font-bold text-[#00418E] mt-2 inline-block hover:underline">Đăng tin ngay</Link>}
                  </div>
                )
              ) : (
                <div className="text-center py-20 text-slate-400">
                   <MessageCircle size={40} className="mx-auto mb-3 opacity-30"/>
                   <p>Tính năng đánh giá đang được cập nhật</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* EDIT MODAL */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-lg">Chỉnh sửa hồ sơ</h3>
              <button onClick={() => setIsEditModalOpen(false)}><X size={20} className="text-slate-400"/></button>
            </div>
            <div className="p-6 space-y-4">
               <div><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Tên hiển thị</label><input value={editName} onChange={e=>setEditName(e.target.value)} className="w-full p-3 bg-slate-50 border rounded-xl"/></div>
               <div className="grid grid-cols-2 gap-4">
                 <div><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Ngành</label><input value={editMajor} onChange={e=>setEditMajor(e.target.value)} className="w-full p-3 bg-slate-50 border rounded-xl"/></div>
                 <div><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Khóa</label><input value={editYear} onChange={e=>setEditYear(e.target.value)} className="w-full p-3 bg-slate-50 border rounded-xl"/></div>
               </div>
               <div><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Bio</label><textarea value={editBio} onChange={e=>setEditBio(e.target.value)} rows={3} className="w-full p-3 bg-slate-50 border rounded-xl"/></div>
            </div>
            <div className="p-4 border-t bg-slate-50 flex justify-end gap-3">
               <button onClick={() => setIsEditModalOpen(false)} className="px-5 py-2.5 rounded-xl font-bold text-slate-500 hover:bg-slate-200">Hủy</button>
               <button onClick={handleUpdateProfile} disabled={isSaving} className="px-6 py-2.5 rounded-xl font-bold text-white bg-[#00418E]">{isSaving ? "Đang lưu..." : "Lưu thay đổi"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;
