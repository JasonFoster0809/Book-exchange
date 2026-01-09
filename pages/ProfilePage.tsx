import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/services/supabase";
import { useToast } from "@/contexts/ToastContext";
import {
  ShieldCheck,
  LogOut,
  MessageCircle,
  Star,
  Edit3,
  X,
  UserPlus,
  UserCheck,
  Zap,
  School,
  ShieldAlert,
  Loader2,
  Upload,
} from "lucide-react";
import { Product, User, Review } from "@/types";
import ProductCard from "@/components/ProductCard";
import CloneAvatar from "@/assets/avatar.jpg";

// Interface mở rộng cho User trong trang Profile
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
  const { user: currentUser, signOut, isRestricted: currentIsRestricted } = useAuth();
  const { addToast } = useToast();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Xác định xem đây có phải profile của chính mình không
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
  const [activeTab, setActiveTab] = useState<"selling" | "buying" | "bought" | "reviews">("selling");

  // Edit & Verify States
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

  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [verifyModalOpen, setVerifyModalOpen] = useState(false);
  const [uploadingVerify, setUploadingVerify] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<"none" | "pending" | "approved" | "rejected">("none");

  // Logic kiểm tra tài khoản bị hạn chế
  const targetIsRestricted = profileUser?.banUntil ? new Date(profileUser.banUntil) > new Date() : false;

  // Format thời gian hoạt động cuối
  const formatLastSeen = (timestamp?: string) => {
    if (!timestamp) return "Offline";
    const diff = Math.floor((new Date().getTime() - new Date(timestamp).getTime()) / 1000);
    if (diff < 60) return "Vừa truy cập";
    if (diff < 300) return "Đang hoạt động";
    if (diff < 3600) return `Hoạt động ${Math.floor(diff / 60)} phút trước`;
    return `Hoạt động ${Math.floor(diff / 3600)} giờ trước`;
  };

  // --- HÀM MAP DỮ LIỆU TỪ DB SANG UI ---
  const mapProducts = (data: any[]): Product[] =>
    data.map((item: any) => ({
      id: item.id,
      sellerId: item.seller_id,
      title: item.title,
      description: item.description,
      price: item.price,
      category: item.category,
      condition: item.condition,
      images: item.images || [],
      tradeMethod: item.trade_method,
      // QUAN TRỌNG: Map cột 'created_at' từ DB sang 'postedAt' của App
      postedAt: item.created_at, 
      isLookingToBuy: false, // Mặc định là bán
      status: item.status,
      seller: item.profiles, // Relation join
      view_count: item.view_count || 0,
    }));

  const fetchReviews = async () => {
    if (!targetUserId) return;
    try {
      const { data, error } = await supabase
        .from("reviews")
        .select(`*, reviewer:profiles!reviewer_id(name, avatar_url)`)
        .eq("reviewee_id", targetUserId)
        .order("created_at", { ascending: false }); // Sửa lỗi order
      
      if (!error && data) {
        const mappedReviews: Review[] = data.map((r: any) => ({
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
    } catch (e) { console.error("Lỗi tải đánh giá:", e); }
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!targetUserId) return;
      setLoading(true);
      try {
        // 1. Lấy thông tin Profile
        const { data: profileData } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", targetUserId)
          .single();

        if (profileData) {
          setProfileUser({
            id: profileData.id,
            name: profileData.name || "Người dùng",
            email: profileData.email,
            // Map các trường snake_case từ DB
            studentId: profileData.student_code || "", 
            avatar: profileData.avatar_url || CloneAvatar,
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
        }

        // 2. Kiểm tra Follow (nếu xem profile người khác)
        if (!isOwnProfile && currentUser) {
          const { data } = await supabase
            .from("follows")
            .select("*")
            .eq("follower_id", currentUser.id)
            .eq("following_id", targetUserId)
            .maybeSingle();
          setIsFollowing(!!data);
        }

        // 3. Lấy danh sách sản phẩm ĐANG BÁN
        let query = supabase
          .from("products")
          .select("*, profiles:seller_id(name, avatar_url)")
          .eq("seller_id", targetUserId)
          .order("created_at", { ascending: false }); // Sửa lỗi order
        
        if (!isOwnProfile) query = query.eq("status", "available");
        
        const { data: prodData } = await query;
        if (prodData) setUserProducts(mapProducts(prodData));

        // 4. Lấy lịch sử MUA HÀNG (chỉ chủ sở hữu xem được)
        if (isOwnProfile) {
          // Chỉ chạy nếu bảng products có cột buyer_id (nếu chưa có thì bỏ qua để tránh lỗi)
          // const { data: boughtData } = ...
        }

        await fetchReviews();
        if (isOwnProfile && currentUser) checkVerificationStatus();

      } catch (error) { console.error(error); } 
      finally { setLoading(false); }
    };
    fetchData();
  }, [id, currentUser, targetUserId, isOwnProfile]);

  // --- ACTIONS HANDLERS ---

  const handleOpenEdit = () => {
    if (!profileUser) return;
    setEditName(profileUser.name);
    setEditBio(profileUser.bio || "");
    setEditMajor(profileUser.major || "");
    setEditYear(profileUser.academicYear || "");
    setIsEditModalOpen(true);
  };

  const handleUpdateProfile = async () => {
    if (!currentUser) return;
    setIsSaving(true);
    try {
      let avatarUrl = profileUser?.avatar;
      let coverUrl = profileUser?.coverUrl;

      // Upload Avatar
      if (editAvatarFile) {
        const fileName = `${currentUser.id}/avatar_${Date.now()}`;
        const { error: uploadError } = await supabase.storage.from("product-images").upload(fileName, editAvatarFile);
        if (!uploadError) {
          const { data } = supabase.storage.from("product-images").getPublicUrl(fileName);
          avatarUrl = data.publicUrl;
        }
      }

      // Upload Cover
      if (editCoverFile) {
        const fileName = `${currentUser.id}/cover_${Date.now()}`;
        const { error: uploadError } = await supabase.storage.from("product-images").upload(fileName, editCoverFile);
        if (!uploadError) {
          const { data } = supabase.storage.from("product-images").getPublicUrl(fileName);
          coverUrl = data.publicUrl;
        }
      }

      // Update Table
      const { error } = await supabase
        .from("profiles")
        .update({
          name: editName,
          avatar_url: avatarUrl,
          cover_url: coverUrl,
          bio: editBio,
          major: editMajor,
          academic_year: editYear,
        })
        .eq("id", currentUser.id);

      if (error) throw error;

      // Update Local State
      setProfileUser((prev) => prev ? {
        ...prev,
        name: editName,
        avatar: avatarUrl!,
        coverUrl: coverUrl,
        bio: editBio,
        major: editMajor,
        academicYear: editYear,
      } : null);

      setIsEditModalOpen(false);
      addToast("Cập nhật thành công!", "success");
    } catch (err: any) {
      addToast("Lỗi: " + err.message, "error");
    } finally {
      setIsSaving(false);
    }
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

  const checkVerificationStatus = async () => {
    if (!currentUser) return;
    const { data } = await supabase.from("verification_requests").select("status").eq("user_id", currentUser.id).maybeSingle();
    if (data) setVerificationStatus(data.status as any);
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
        student_code: profileUser?.studentId || "UPDATE_ME", // Cần nhập MSSV
        status: "pending",
      });
      
      addToast("Đã gửi yêu cầu!", "success");
      setVerificationStatus("pending");
      setVerifyModalOpen(false);
    } catch (err: any) { addToast(err.message, "error"); }
    finally { setUploadingVerify(false); }
  };

  const handleCreateReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !targetUserId) return;
    setSubmittingReview(true);
    const { error } = await supabase.from("reviews").insert({
      reviewer_id: currentUser.id,
      reviewee_id: targetUserId,
      rating: newRating,
      comment: newComment,
    });
    if (!error) {
      setNewComment("");
      setNewRating(5);
      fetchReviews();
      addToast("Đã gửi đánh giá!", "success");
    } else {
      addToast(error.message, "error");
    }
    setSubmittingReview(false);
  };

  const handleDelete = async (pid: string) => {
    if (!confirm("Bạn chắc chắn muốn xóa tin này?")) return;
    await supabase.from("products").delete().eq("id", pid);
    setUserProducts((prev) => prev.filter((p) => p.id !== pid));
    addToast("Đã xóa tin đăng", "info");
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-[#034EA2]" size={40}/></div>;
  if (!profileUser) return <div className="py-20 text-center">Không tìm thấy người dùng</div>;

  const sellingProducts = userProducts; // Hiển thị tất cả sản phẩm đang bán

  return (
    <div className="min-h-screen bg-[#F0F2F5] pb-20 font-sans">
      {/* 1. HEADER PROFILE */}
      <div className="bg-white pb-2 shadow-sm">
        <div className="mx-auto max-w-5xl px-0 md:px-4">
          
          {/* COVER */}
          <div className="group/cover relative h-[160px] w-full overflow-hidden bg-gradient-to-r from-gray-200 to-gray-300 md:h-[220px] md:rounded-b-xl">
            {profileUser.coverUrl ? (
              <img src={profileUser.coverUrl} className="h-full w-full object-cover" alt="Cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-sm font-medium text-gray-400 opacity-50">Sinh viên Bách Khoa</div>
            )}
          </div>

          {/* INFO SECTION */}
          <div className="px-4">
            <div className="relative -mt-12 flex flex-col items-center md:-mt-8 md:flex-row md:items-start">
              
              {/* AVATAR */}
              <div className="relative z-20 shrink">
                <div className={`relative h-32 w-32 overflow-hidden rounded-full border-4 border-white bg-white shadow-md md:h-40 md:w-40 ${profileUser.isVerified ? "ring-2 ring-blue-500 ring-offset-2" : ""} ${targetIsRestricted ? "ring-2 ring-red-500" : ""}`}>
                  <img src={profileUser.avatar} className="h-full w-full object-cover" alt={profileUser.name} />
                </div>
              </div>

              {/* NAME & BIO */}
              <div className="mt-3 mb-4 w-full flex-1 text-center md:mt-10 md:ml-5 md:text-left">
                <h1 className="flex items-center justify-center gap-2 text-2xl font-bold text-gray-900 md:justify-start md:text-3xl">
                  {profileUser.name}
                  {profileUser.isVerified && <ShieldCheck className="h-5 w-5 fill-blue-50 text-blue-500" />}
                </h1>

                <div className="mt-1 flex flex-col gap-1 text-sm font-medium text-gray-600 md:flex-row md:items-center md:gap-3">
                  {(profileUser.major || profileUser.academicYear) && (
                    <span className="flex items-center justify-center md:justify-start">
                      <School size={14} className="mr-1.5" />
                      {profileUser.major ? `Sinh viên ${profileUser.major}` : "Sinh viên BK"} {profileUser.academicYear ? `- ${profileUser.academicYear}` : ""}
                    </span>
                  )}
                  <span className="hidden text-gray-300 md:inline">•</span>
                  <span className="flex items-center justify-center font-bold text-green-600 md:justify-start">
                    <Zap size={12} className="mr-1 fill-current" /> {formatLastSeen(profileUser.lastSeen)}
                  </span>
                </div>
                {profileUser.bio && <p className="mt-2 text-sm text-gray-500 italic">"{profileUser.bio}"</p>}
              </div>

              {/* ACTIONS BUTTONS */}
              <div className="mt-4 flex shrink gap-2 md:mt-10">
                {isOwnProfile ? (
                  <>
                    <button onClick={handleOpenEdit} className="flex h-10 items-center rounded-lg bg-gray-100 px-4 py-2 text-sm font-bold text-gray-800 transition hover:bg-gray-200">
                      <Edit3 size={16} className="mr-1.5" /> Chỉnh sửa
                    </button>
                    <button onClick={handleLogout} className="h-10 rounded-lg bg-gray-100 px-4 py-2 font-bold text-gray-800 transition hover:bg-gray-200">
                      <LogOut size={16} />
                    </button>
                  </>
                ) : (
                  <>
                    <Link to={targetIsRestricted ? "#" : `/chat?partnerId=${profileUser.id}`} className={`flex h-10 items-center rounded-lg px-5 py-2 text-sm font-bold shadow-sm transition ${targetIsRestricted ? "cursor-not-allowed bg-gray-200 text-gray-400" : "bg-[#0866FF] text-white hover:bg-[#0054d6]"}`}>
                      <MessageCircle size={18} className="mr-1.5" /> Nhắn tin
                    </Link>
                    <button onClick={handleToggleFollow} className={`flex h-10 items-center rounded-lg px-4 py-2 text-sm font-bold transition ${isFollowing ? "bg-gray-100 text-black" : "bg-blue-50 text-blue-600"}`}>
                      {isFollowing ? <><UserCheck size={18} className="mr-1.5" /> Đã theo dõi</> : <><UserPlus size={18} className="mr-1.5" /> Theo dõi</>}
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* BANNER CẢNH BÁO */}
            {targetIsRestricted && (
              <div className="mt-4 flex animate-pulse items-center gap-4 rounded-2xl border-2 border-red-100 bg-red-50 p-4">
                <ShieldAlert className="text-red-600" size={28} />
                <div className="flex-1">
                  <h3 className="text-[10px] font-black tracking-widest text-red-800 uppercase">Người dùng không đáng tin</h3>
                  <p className="text-xs font-bold text-red-700">
                    {isOwnProfile ? `Bạn đang bị hạn chế do vi phạm quy định. Hết hạn: ${new Date(profileUser.banUntil!).toLocaleDateString("vi-VN")}` : "Người dùng này đang bị xử phạt. Cẩn thận khi giao dịch."}
                  </p>
                </div>
              </div>
            )}

            {/* THỐNG KÊ NHANH */}
            <div className="mx-auto mt-6 mb-2 grid max-w-2xl grid-cols-3 gap-4 border-t border-gray-100 pt-4 md:mx-0">
              <div className="text-center md:text-left">
                <span className="block text-xl font-black text-gray-900">{userProducts.length}</span>
                <span className="mt-0.5 block text-[10px] font-bold tracking-widest text-gray-500 uppercase">Tin đăng</span>
              </div>
              <div className="border-r border-l border-gray-100 text-center md:text-left">
                <span className="block text-xl font-black text-green-600">{userProducts.filter((p) => p.status === "sold").length}</span>
                <span className="mt-0.5 block text-[10px] font-bold tracking-widest text-gray-500 uppercase">Đã bán</span>
              </div>
              <div className="text-center md:text-left">
                {reviews.length > 0 ? (
                  <div className="flex items-center justify-center gap-1 md:justify-start">
                    <span className="text-xl font-black text-yellow-500">{averageRating}</span>
                    <Star className="h-4 w-4 fill-current text-yellow-500" />
                  </div>
                ) : (
                  <span className="flex items-center justify-center text-sm font-bold text-green-600 md:justify-start">🌱 Mới tham gia</span>
                )}
                <span className="mt-0.5 block text-[10px] font-bold tracking-widest text-gray-500 uppercase">Uy tín</span>
              </div>
            </div>

            {/* NAV TABS */}
            <div className="no-scrollbar mt-4 flex items-center gap-6 overflow-x-auto border-t border-gray-100 pt-1">
              <button onClick={() => setActiveTab("selling")} className={`flex items-center border-b-[3px] py-3 text-[14px] font-semibold whitespace-nowrap transition-colors ${activeTab === "selling" ? "border-[#0866FF] text-[#0866FF]" : "border-transparent text-gray-500"}`}>
                Đang bán ({sellingProducts.length})
              </button>
              <button onClick={() => setActiveTab("reviews")} className={`flex items-center border-b-[3px] py-3 text-[14px] font-semibold whitespace-nowrap transition-colors ${activeTab === "reviews" ? "border-[#0866FF] text-[#0866FF]" : "border-transparent text-gray-500"}`}>
                Đánh giá ({reviews.length})
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 2. MAIN CONTENT AREA */}
      <div className="mx-auto mt-6 max-w-5xl px-4">
        
        {/* TAB: SELLING PRODUCTS */}
        {activeTab === "selling" && (
          sellingProducts.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 bg-white py-20 text-center">
              <p className="font-medium text-gray-500">Chưa có tin đăng nào.</p>
              {isOwnProfile && !currentIsRestricted && (
                <Link to="/post" className="mt-4 inline-block text-sm font-bold text-blue-600 hover:underline">Đăng tin ngay</Link>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {sellingProducts.map((p) => (
                <div key={p.id} className="group relative">
                  <ProductCard product={p} />
                  {isOwnProfile && (
                    <button onClick={() => handleDelete(p.id)} className="absolute top-2 right-2 z-10 rounded-full bg-white/90 p-1.5 text-gray-700 shadow-sm hover:text-red-600">
                      <X size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )
        )}

        {/* TAB: REVIEWS */}
        {activeTab === "reviews" && (
          <div className="mx-auto max-w-3xl rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
            {!isOwnProfile && currentUser && !currentIsRestricted && (
              <form onSubmit={handleCreateReview} className="mb-8 rounded-xl border border-gray-200 bg-gray-50 p-4">
                <div className="mb-3 flex gap-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} onClick={() => setNewRating(s)} className={`h-6 w-6 cursor-pointer ${s <= newRating ? "fill-current text-yellow-400" : "text-gray-300"}`} />
                  ))}
                </div>
                <textarea required className="mb-3 w-full rounded-lg border border-gray-300 p-3 text-sm outline-none focus:ring-2 focus:ring-[#034EA2]" placeholder="Nhận xét của bạn..." value={newComment} onChange={(e) => setNewComment(e.target.value)} rows={2} />
                <div className="text-right">
                  <button className="rounded-lg bg-[#034EA2] px-4 py-2 text-xs font-bold text-white">Gửi đánh giá</button>
                </div>
              </form>
            )}
            <div className="space-y-6">
              {reviews.length === 0 ? <p className="py-10 text-center text-gray-400">Chưa có đánh giá nào.</p> : reviews.map((r) => (
                <div key={r.id} className="flex gap-4 border-b border-gray-50 pb-6 last:border-0 last:pb-0">
                  <img src={r.reviewerAvatar} className="h-10 w-10 rounded-full border border-gray-100 object-cover" />
                  <div className="flex-1">
                    <div className="mb-1 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-gray-900">{r.reviewerName}</span>
                        <span className="text-xs text-gray-400">{new Date(r.createdAt).toLocaleDateString("vi-VN")}</span>
                      </div>
                      <div className="flex">{[...Array(5)].map((_, i) => <Star key={i} className={`h-3 w-3 ${i < r.rating ? "fill-current text-yellow-400" : "text-gray-200"}`} />)}</div>
                    </div>
                    <p className="rounded-lg bg-gray-50 p-3 text-sm text-gray-700">{r.comment}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* --- MODAL CHỈNH SỬA --- */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/60 p-4 backdrop-blur-md">
          <div className="w-full max-w-lg overflow-hidden rounded-xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b p-4">
              <h3 className="text-xl font-bold">Chỉnh sửa hồ sơ</h3>
              <button onClick={() => setIsEditModalOpen(false)} className="rounded-full bg-gray-100 p-1.5"><X size={20} /></button>
            </div>
            <div className="max-h-[80vh] space-y-6 overflow-y-auto p-4">
              {/* Cover Edit */}
              <div>
                <span className="mb-2 block font-bold">Ảnh bìa</span>
                <label className="block h-32 cursor-pointer overflow-hidden rounded-lg bg-gray-200">
                  <img src={previewCover || profileUser?.coverUrl || CloneAvatar} className="h-full w-full object-cover" />
                  <input type="file" className="hidden" accept="image/*" onChange={(e) => { if (e.target.files?.[0]) { setEditCoverFile(e.target.files[0]); setPreviewCover(URL.createObjectURL(e.target.files[0])); } }} />
                </label>
              </div>
              {/* Avatar Edit */}
              <div>
                <span className="mb-2 block font-bold">Ảnh đại diện</span>
                <div className="flex justify-center">
                  <label className="relative cursor-pointer">
                    <img src={previewAvatar || profileUser?.avatar} className="h-24 w-24 rounded-full border-4 border-gray-100 object-cover" />
                    <input type="file" className="hidden" accept="image/*" onChange={(e) => { if (e.target.files?.[0]) { setEditAvatarFile(e.target.files[0]); setPreviewAvatar(URL.createObjectURL(e.target.files[0])); } }} />
                  </label>
                </div>
              </div>
              {/* Inputs */}
              <div className="space-y-4">
                <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full rounded-lg border bg-gray-50 p-3 outline-none focus:border-blue-500" placeholder="Tên hiển thị" />
                <div className="grid grid-cols-2 gap-3">
                  <input type="text" value={editMajor} onChange={(e) => setEditMajor(e.target.value)} className="rounded-lg border bg-gray-50 p-3 outline-none" placeholder="Ngành học" />
                  <input type="text" value={editYear} onChange={(e) => setEditYear(e.target.value)} className="rounded-lg border bg-gray-50 p-3 outline-none" placeholder="Khóa (VD: K2021)" />
                </div>
                <textarea value={editBio} onChange={(e) => setEditBio(e.target.value)} className="h-24 w-full resize-none rounded-lg border bg-gray-50 p-3" placeholder="Giới thiệu ngắn về bản thân..." />
              </div>
            </div>
            <div className="flex justify-end gap-3 border-t p-4">
              <button onClick={() => setIsEditModalOpen(false)} className="px-5 py-2.5 font-bold text-gray-600">Hủy</button>
              <button onClick={handleUpdateProfile} disabled={isSaving} className="rounded-lg bg-blue-600 px-5 py-2.5 font-bold text-white shadow-sm">{isSaving ? "Đang lưu..." : "Lưu thay đổi"}</button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL XÁC THỰC --- */}
      {isOwnProfile && verificationStatus === "none" && (
        <div className="mx-auto mt-4 max-w-5xl px-4">
          <div className="flex items-center justify-between rounded-xl border border-blue-100 bg-blue-50 p-4">
            <div className="flex items-center gap-3">
              <ShieldCheck className="text-blue-600" size={24} />
              <p className="text-sm font-medium text-blue-800">Xác thực sinh viên để tăng độ uy tín!</p>
            </div>
            <button onClick={() => setVerifyModalOpen(true)} className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-blue-700">Xác thực ngay</button>
          </div>
        </div>
      )}

      {verifyModalOpen && (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-sm rounded-2xl bg-white p-6 text-center">
            <button onClick={() => setVerifyModalOpen(false)} className="absolute top-4 right-4 text-gray-400"><X size={20} /></button>
            <ShieldCheck className="mx-auto mb-4 text-blue-600" size={48} />
            <h3 className="text-xl font-bold">Xác thực sinh viên</h3>
            <p className="mt-2 mb-6 text-sm text-gray-500">Tải ảnh thẻ sinh viên hoặc bảng điểm để BQT duyệt.</p>
            <label className="flex h-32 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-blue-200 bg-blue-50 hover:bg-blue-100 transition-colors">
              {uploadingVerify ? <Loader2 className="animate-spin text-blue-600" /> : (
                <>
                  <Upload className="mb-2 text-blue-600" />
                  <p className="text-sm font-bold text-blue-600">Chọn ảnh</p>
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
