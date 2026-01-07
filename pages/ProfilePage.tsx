import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/services/supabase";
import { useToast } from "@/contexts/ToastContext";
import {
  ShieldCheck,
  LogOut,
  Package,
  MessageCircle,
  Star,
  User as UserIcon,
  Camera,
  Edit3,
  Save,
  X,
  ShoppingBag,
  Image as ImageIcon,
  Upload,
  Clock,
  Mail,
  Calendar,
  Flag,
  UserPlus,
  UserCheck,
  MapPin,
  MoreHorizontal,
  Eye,
  Zap,
  CheckCircle,
  School,
  Search,
  ShieldAlert,
  Loader2,
} from "lucide-react";
import { Product, User, Review } from "@/types";
import ProductCard from "@/components/ProductCard";
import confetti from "canvas-confetti";
import CloneAvatar from "@/assets/avatar.jpg";

interface ExtendedUser extends User {
  bio?: string;
  major?: string;
  academicYear?: string;
  joinedAt?: string;
  coverUrl?: string;
  lastSeen?: string;
  banUntil?: string | null; // Cột xử phạt
}

const ProfilePage: React.FC = () => {
  const {
    user: currentUser,
    signOut,
    isRestricted: currentIsRestricted,
  } = useAuth();
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
  const [activeTab, setActiveTab] = useState<
    "selling" | "buying" | "bought" | "reviews"
  >("selling");

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
  const [verificationStatus, setVerificationStatus] = useState<
    "none" | "pending" | "approved" | "rejected"
  >("none");

  // Logic kiểm tra huy hiệu "Không đáng tin"
  const targetIsRestricted = profileUser?.banUntil
    ? new Date(profileUser.banUntil) > new Date()
    : false;

  const formatLastSeen = (timestamp?: string) => {
    if (!timestamp) return "Offline";
    const lastSeenDate = new Date(timestamp);
    const diffInSeconds = Math.floor(
      (new Date().getTime() - lastSeenDate.getTime()) / 1000,
    );
    if (diffInSeconds < 60) return "Vừa truy cập";
    if (diffInSeconds < 300) return "Đang hoạt động";
    if (diffInSeconds < 3600)
      return `Hoạt động ${Math.floor(diffInSeconds / 60)} phút trước`;
    if (diffInSeconds < 86400)
      return `Hoạt động ${Math.floor(diffInSeconds / 3600)} giờ trước`;
    return `Hoạt động ${Math.floor(diffInSeconds / 86400)} ngày trước`;
  };

  const fetchReviews = async () => {
    if (!targetUserId) return;
    try {
      const { data, error } = await supabase
        .from("reviews")
        .select(`*, reviewer:profiles!reviewer_id(name, avatar_url)`)
        .eq("reviewee_id", targetUserId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      if (data) {
        const mappedReviews: Review[] = data.map((r: any) => ({
          id: r.id,
          reviewerId: r.reviewer_id,
          reviewerName: r.reviewer?.name || "Ẩn danh",
          reviewerAvatar:
            r.reviewer?.avatar_url || CloneAvatar,
          rating: r.rating,
          comment: r.comment,
          createdAt: r.created_at,
        }));
        setReviews(mappedReviews);
        if (mappedReviews.length > 0) {
          const total = mappedReviews.reduce(
            (sum, item) => sum + item.rating,
            0,
          );
          setAverageRating(
            parseFloat((total / mappedReviews.length).toFixed(1)),
          );
        }
      }
    } catch (error) {
      console.error("Lỗi lấy đánh giá:", error);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!targetUserId) return;
      setLoading(true);
      try {
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
            studentId: profileData.student_id || "",
            avatar: profileData.avatar_url || CloneAvatar,
            coverUrl: profileData.cover_url,
            isVerified: profileData.is_verified,
            role: profileData.role as any,
            bio: profileData.bio || "",
            major: profileData.major || "",
            academicYear: profileData.academic_year || "",
            joinedAt: profileData.created_at,
            lastSeen: profileData.last_seen,
            banUntil: profileData.ban_until,
          });
        }

        if (!isOwnProfile && currentUser) {
          const { data: followData } = await supabase
            .from("follows")
            .select("*")
            .eq("follower_id", currentUser.id)
            .eq("following_id", targetUserId)
            .single();
          setIsFollowing(!!followData);
        }

        let query = supabase
          .from("products")
          .select("*, profiles:seller_id(name, avatar_url)")
          .eq("seller_id", targetUserId)
          .order("posted_at", { ascending: false });
        if (!isOwnProfile) query = query.eq("status", "available");
        const { data: prodData } = await query;
        if (prodData) setUserProducts(mapProducts(prodData));

        if (isOwnProfile) {
          const { data: boughtData } = await supabase
            .from("products")
            .select("*, profiles:seller_id(name, avatar_url)")
            .eq("buyer_id", targetUserId)
            .eq("status", "sold")
            .order("posted_at", { ascending: false });
          if (boughtData) setPurchasedProducts(mapProducts(boughtData));
        }

        await fetchReviews();
        if (isOwnProfile && currentUser) checkVerificationStatus();
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, currentUser, targetUserId, isOwnProfile]);

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
      if (editAvatarFile) {
        const fileName = `${currentUser.id}/avatar_${Date.now()}`;
        await supabase.storage
          .from("product-images")
          .upload(fileName, editAvatarFile);
        avatarUrl = supabase.storage
          .from("product-images")
          .getPublicUrl(fileName).data.publicUrl;
      }
      if (editCoverFile) {
        const fileName = `${currentUser.id}/cover_${Date.now()}`;
        await supabase.storage
          .from("product-images")
          .upload(fileName, editCoverFile);
        coverUrl = supabase.storage
          .from("product-images")
          .getPublicUrl(fileName).data.publicUrl;
      }
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
      setProfileUser((prev) =>
        prev
          ? {
              ...prev,
              name: editName,
              avatar: avatarUrl!,
              coverUrl: coverUrl,
              bio: editBio,
              major: editMajor,
              academicYear: editYear,
            }
          : null,
      );
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
      await supabase
        .from("follows")
        .delete()
        .eq("follower_id", currentUser.id)
        .eq("following_id", targetUserId);
      setIsFollowing(false);
    } else {
      await supabase
        .from("follows")
        .insert({ follower_id: currentUser.id, following_id: targetUserId });
      setIsFollowing(true);
    }
  };

  const checkVerificationStatus = async () => {
    if (!currentUser) return;
    try {
      const { data } = await supabase
        .from("verification_requests")
        .select("status")
        .eq("user_id", currentUser.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      if (data) setVerificationStatus(data.status as any);
    } catch (e) {}
  };

  const handleUploadVerification = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    try {
      if (!currentUser || !e.target.files?.[0]) return;
      setUploadingVerify(true);
      const file = e.target.files[0];
      const fileName = `${currentUser.id}-${Math.random()}`;
      await supabase.storage.from("product-images").upload(fileName, file);
      const { data } = supabase.storage
        .from("product-images")
        .getPublicUrl(fileName);
      await supabase.from("verification_requests").insert({
        user_id: currentUser.id,
        image_url: data.publicUrl,
        status: "pending",
      });
      addToast("Đã gửi yêu cầu!", "success");
      setVerificationStatus("pending");
      setVerifyModalOpen(false);
    } catch (err: any) {
      addToast("Lỗi: " + err.message, "error");
    } finally {
      setUploadingVerify(false);
    }
  };

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
      postedAt: item.posted_at,
      isLookingToBuy: item.is_looking_to_buy,
      status: item.status,
      seller: item.profiles,
      view_count: item.view_count || 0,
    }));

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
    if (!confirm("Xóa tin?")) return;
    await supabase.from("products").delete().eq("id", pid);
    setUserProducts((prev) => prev.filter((p) => p.id !== pid));
    addToast("Đã xóa", "info");
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  if (loading)
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-[#034EA2]"></div>
      </div>
    );
  if (!profileUser)
    return <div className="py-20 text-center">Không tìm thấy người dùng</div>;

  const sellingProducts = userProducts.filter((p) => !p.isLookingToBuy);
  const buyingRequests = userProducts.filter((p) => p.isLookingToBuy);

  return (
    <div className="min-h-screen bg-[#F0F2F5] pb-20 font-sans">
      {/* 1. HEADER (FACEBOOK STYLE) */}
      <div className="bg-white pb-2 shadow-sm">
        <div className="mx-auto max-w-5xl px-0 md:px-4">
          {/* COVER PHOTO */}
          <div className="group/cover relative h-[160px] w-full overflow-hidden bg-linear-to-r from-gray-200 to-gray-300 md:h-[220px] md:rounded-b-xl">
            {profileUser.coverUrl ? (
              <img
                src={profileUser.coverUrl}
                className="h-full w-full object-cover"
                alt="Cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-sm font-medium text-gray-400 opacity-50">
                Sinh viên Bách Khoa
              </div>
            )}
          </div>

          {/* INFO SECTION */}
          <div className="px-4">
            <div className="relative -mt-12 flex flex-col items-center md:-mt-8 md:flex-row md:items-start">
              {/* AVATAR */}
              <div className="relative z-20 shrink">
                <div
                  className={`relative h-32 w-32 overflow-hidden rounded-full border-4 border-white bg-white shadow-md md:h-40 md:w-40 ${profileUser.isVerified ? "ring-2 ring-blue-500 ring-offset-2" : ""} ${targetIsRestricted ? "ring-2 ring-red-500" : ""}`}
                >
                  <img
                    src={
                      profileUser.avatar || CloneAvatar
                    }
                    className="h-full w-full object-cover"
                    alt={profileUser.name}
                  />
                </div>
              </div>

              {/* NAME & INFO */}
              <div className="mt-3 mb-4 w-full flex-1 text-center md:mt-10 md:ml-5 md:text-left">
                <h1 className="flex items-center justify-center gap-2 text-2xl font-bold text-gray-900 md:justify-start md:text-3xl">
                  {profileUser.name}
                  {profileUser.isVerified && (
                    <ShieldCheck className="h-5 w-5 fill-blue-50 text-blue-500" />
                  )}
                </h1>

                <div className="mt-1 flex flex-col gap-1 text-sm font-medium text-gray-600 md:flex-row md:items-center md:gap-3">
                  {(profileUser.major || profileUser.academicYear) && (
                    <span className="flex items-center justify-center md:justify-start">
                      <School size={14} className="mr-1.5" />
                      {profileUser.major
                        ? `Sinh viên ${profileUser.major}`
                        : "Sinh viên BK"}{" "}
                      {profileUser.academicYear
                        ? `- ${profileUser.academicYear}`
                        : ""}
                    </span>
                  )}
                  <span className="hidden text-gray-300 md:inline">•</span>
                  <span className="flex items-center justify-center font-bold text-green-600 md:justify-start">
                    <Zap size={12} className="mr-1 fill-current" />{" "}
                    {formatLastSeen(profileUser.lastSeen)}
                  </span>
                </div>
                {profileUser.bio && (
                  <p className="mt-2 text-sm text-gray-500 italic">
                    "{profileUser.bio}"
                  </p>
                )}
              </div>

              {/* ACTIONS */}
              <div className="mt-4 flex shrink gap-2 md:mt-10">
                {isOwnProfile ? (
                  <>
                    <button
                      onClick={handleOpenEdit}
                      className="flex h-10 items-center rounded-lg bg-gray-100 px-4 py-2 text-sm font-bold text-gray-800 transition hover:bg-gray-200"
                    >
                      <Edit3 size={16} className="mr-1.5" /> Chỉnh sửa
                    </button>
                    <button
                      onClick={handleLogout}
                      className="h-10 rounded-lg bg-gray-100 px-4 py-2 font-bold text-gray-800 transition hover:bg-gray-200"
                    >
                      <LogOut size={16} />
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      to={
                        targetIsRestricted
                          ? "#"
                          : `/chat?partnerId=${profileUser.id}`
                      }
                      className={`flex h-10 items-center rounded-lg px-5 py-2 text-sm font-bold shadow-sm transition ${targetIsRestricted ? "cursor-not-allowed bg-gray-200 text-gray-400" : "bg-[#0866FF] text-white hover:bg-[#0054d6]"}`}
                    >
                      <MessageCircle size={18} className="mr-1.5" /> Nhắn tin
                    </Link>
                    <button
                      onClick={handleToggleFollow}
                      className={`flex h-10 items-center rounded-lg px-4 py-2 text-sm font-bold transition ${isFollowing ? "bg-gray-100 text-black" : "bg-blue-50 text-blue-600"}`}
                    >
                      {isFollowing ? (
                        <>
                          <UserCheck size={18} className="mr-1.5" /> Đã theo dõi
                        </>
                      ) : (
                        <>
                          <UserPlus size={18} className="mr-1.5" /> Theo dõi
                        </>
                      )}
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* HUY HIỆU CẢNH BÁO "KHÔNG ĐÁNG TIN" */}
            {targetIsRestricted && (
              <div className="mt-4 flex animate-pulse items-center gap-4 rounded-2xl border-2 border-red-100 bg-red-50 p-4">
                <ShieldAlert className="text-red-600" size={28} />
                <div className="flex-1">
                  <h3 className="text-[10px] font-black tracking-widest text-red-800 uppercase">
                    Người dùng không đáng tin
                  </h3>
                  <p className="text-xs font-bold text-red-700">
                    {isOwnProfile
                      ? `Bạn đang bị hạn chế do vi phạm quy định. Hết hạn vào: ${new Date(profileUser.banUntil!).toLocaleDateString("vi-VN")}`
                      : "Người dùng này đang trong thời gian xử phạt. Vui lòng cẩn thận khi giao dịch."}
                  </p>
                </div>
              </div>
            )}

            {/* STATS GRID */}
            <div className="mx-auto mt-6 mb-2 grid max-w-2xl grid-cols-3 gap-4 border-t border-gray-100 pt-4 md:mx-0">
              <div className="text-center md:text-left">
                <span className="block text-xl font-black text-gray-900">
                  {userProducts.length}
                </span>
                <span className="mt-0.5 block text-[10px] font-bold tracking-widest text-gray-500 uppercase">
                  Tin đăng
                </span>
              </div>
              <div className="border-r border-l border-gray-100 text-center md:text-left">
                <span className="block text-xl font-black text-green-600">
                  {userProducts.filter((p) => p.status === "sold").length}
                </span>
                <span className="mt-0.5 block text-[10px] font-bold tracking-widest text-gray-500 uppercase">
                  Đã bán
                </span>
              </div>
              <div className="text-center md:text-left">
                {reviews.length > 0 ? (
                  <div className="flex items-center justify-center gap-1 md:justify-start">
                    <span className="text-xl font-black text-yellow-500">
                      {averageRating}
                    </span>
                    <Star className="h-4 w-4 fill-current text-yellow-500" />
                  </div>
                ) : (
                  <span className="flex items-center justify-center text-sm font-bold text-green-600 md:justify-start">
                    🌱 Người bán mới
                  </span>
                )}
                <span className="mt-0.5 block text-[10px] font-bold tracking-widest text-gray-500 uppercase">
                  Độ uy tín
                </span>
              </div>
            </div>

            {/* TABS NAVIGATION */}
            <div className="no-scrollbar mt-4 flex items-center gap-6 overflow-x-auto border-t border-gray-100 pt-1">
              <button
                onClick={() => setActiveTab("selling")}
                className={`flex items-center border-b-[3px] py-3 text-[14px] font-semibold whitespace-nowrap transition-colors ${activeTab === "selling" ? "border-[#0866FF] text-[#0866FF]" : "border-transparent text-gray-500"}`}
              >
                Đang bán ({sellingProducts.length})
              </button>
              <button
                onClick={() => setActiveTab("buying")}
                className={`flex items-center border-b-[3px] py-3 text-[14px] font-semibold whitespace-nowrap transition-colors ${activeTab === "buying" ? "border-[#0866FF] text-[#0866FF]" : "border-transparent text-gray-500"}`}
              >
                Cần mua ({buyingRequests.length})
              </button>
              <button
                onClick={() => setActiveTab("reviews")}
                className={`flex items-center border-b-[3px] py-3 text-[14px] font-semibold whitespace-nowrap transition-colors ${activeTab === "reviews" ? "border-[#0866FF] text-[#0866FF]" : "border-transparent text-gray-500"}`}
              >
                Đánh giá ({reviews.length})
              </button>
              {isOwnProfile && (
                <button
                  onClick={() => setActiveTab("bought")}
                  className={`flex items-center border-b-[3px] py-3 text-[14px] font-semibold whitespace-nowrap transition-colors ${activeTab === "bought" ? "border-[#0866FF] text-[#0866FF]" : "border-transparent text-gray-500"}`}
                >
                  Lịch sử mua
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 2. MAIN CONTENT */}
      <div className="mx-auto mt-6 max-w-5xl px-4">
        {/* TAB: ĐANG BÁN & CẦN MUA */}
        {(activeTab === "selling" || activeTab === "buying") &&
          ((activeTab === "selling" ? sellingProducts : buyingRequests)
            .length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 bg-white py-20 text-center">
              <p className="font-medium text-gray-500">Chưa có tin đăng nào.</p>
              {isOwnProfile && !currentIsRestricted && (
                <Link
                  to="/post"
                  className="mt-4 inline-block text-sm font-bold text-blue-600 hover:underline"
                >
                  Đăng tin ngay
                </Link>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {(activeTab === "selling" ? sellingProducts : buyingRequests).map(
                (p) => (
                  <div key={p.id} className="group relative">
                    <ProductCard product={p} />
                    {isOwnProfile && (
                      <button
                        onClick={() => handleDelete(p.id)}
                        className="absolute top-2 right-2 z-10 rounded-full bg-white/90 p-1.5 text-gray-700 shadow-sm hover:text-red-600"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                ),
              )}
            </div>
          ))}

        {/* TAB: ĐÁNH GIÁ */}
        {activeTab === "reviews" && (
          <div className="mx-auto max-w-3xl rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
            {!isOwnProfile && currentUser && !currentIsRestricted && (
              <form
                onSubmit={handleCreateReview}
                className="mb-8 rounded-xl border border-gray-200 bg-gray-50 p-4"
              >
                <div className="mb-3 flex gap-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      onClick={() => setNewRating(s)}
                      className={`h-6 w-6 cursor-pointer ${s <= newRating ? "fill-current text-yellow-400" : "text-gray-300"}`}
                    />
                  ))}
                </div>
                <textarea
                  required
                  className="mb-3 w-full rounded-lg border border-gray-300 p-3 text-sm outline-none focus:ring-2 focus:ring-[#034EA2]"
                  placeholder="Nhận xét của bạn..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  rows={2}
                />
                <div className="text-right">
                  <button className="rounded-lg bg-[#034EA2] px-4 py-2 text-xs font-bold text-white">
                    Gửi đánh giá
                  </button>
                </div>
              </form>
            )}
            <div className="space-y-6">
              {reviews.length === 0 ? (
                <p className="py-10 text-center text-gray-400">
                  Chưa có đánh giá nào.
                </p>
              ) : (
                reviews.map((r) => (
                  <div
                    key={r.id}
                    className="flex gap-4 border-b border-gray-50 pb-6 last:border-0 last:pb-0"
                  >
                    <img
                      src={r.reviewerAvatar}
                      className="h-10 w-10 rounded-full border border-gray-100 object-cover"
                    />
                    <div className="flex-1">
                      <div className="mb-1 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-gray-900">
                            {r.reviewerName}
                          </span>
                          <span className="text-xs text-gray-400">
                            {new Date(r.createdAt).toLocaleDateString("vi-VN")}
                          </span>
                        </div>
                        <div className="flex">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`h-3 w-3 ${i < r.rating ? "fill-current text-yellow-400" : "text-gray-200"}`}
                            />
                          ))}
                        </div>
                      </div>
                      <p className="rounded-lg bg-gray-50 p-3 text-sm text-gray-700">
                        {r.comment}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB: LỊCH SỬ MUA */}
        {activeTab === "bought" && isOwnProfile && (
          <div className="mx-auto max-w-3xl space-y-3 rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
            {purchasedProducts.length === 0 ? (
              <p className="py-10 text-center text-sm text-gray-400">
                Bạn chưa mua món nào.
              </p>
            ) : (
              purchasedProducts.map((p) => (
                <div
                  key={p.id}
                  className="flex cursor-pointer items-center gap-4 rounded-xl border border-gray-100 p-3 transition-colors hover:bg-gray-50"
                  onClick={() => navigate(`/product/${p.id}`)}
                >
                  <img
                    src={p.images[0]}
                    className="h-16 w-16 rounded-lg border object-cover"
                  />
                  <div className="flex-1">
                    <h4 className="line-clamp-1 text-sm font-bold text-gray-900">
                      {p.title}
                    </h4>
                    <p className="text-xs text-gray-500">
                      Người bán: {p.seller?.name}
                    </p>
                  </div>
                  <span className="text-sm font-bold text-green-600">
                    {p.price.toLocaleString()} đ
                  </span>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* --- MODAL CHỈNH SỬA --- */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/60 p-4 backdrop-blur-md">
          <div className="w-full max-w-lg overflow-hidden rounded-xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b p-4">
              <h3 className="text-xl font-bold">Chỉnh sửa hồ sơ</h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="rounded-full bg-gray-100 p-1.5"
              >
                <X size={20} />
              </button>
            </div>
            <div className="max-h-[80vh] space-y-6 overflow-y-auto p-4">
              <div>
                <span className="mb-2 block font-bold">Ảnh bìa</span>
                <label className="block h-32 cursor-pointer overflow-hidden rounded-lg bg-gray-200">
                  <img
                    src={
                      previewCover ||
                      profileUser?.coverUrl ||
                      CloneAvatar//via.placeholder.com/600x200"
                    }
                    className="h-full w-full object-cover"
                  />
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        setEditCoverFile(e.target.files[0]);
                        setPreviewCover(URL.createObjectURL(e.target.files[0]));
                      }
                    }}
                  />
                </label>
              </div>
              <div>
                <span className="mb-2 block font-bold">Ảnh đại diện</span>
                <div className="flex justify-center">
                  <label className="relative cursor-pointer">
                    <img
                      src={previewAvatar || profileUser?.avatar}
                      className="h-24 w-24 rounded-full border-4 border-gray-100 object-cover"
                    />
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={(e) => {
                        if (e.target.files?.[0]) {
                          setEditAvatarFile(e.target.files[0]);
                          setPreviewAvatar(
                            URL.createObjectURL(e.target.files[0]),
                          );
                        }
                      }}
                    />
                  </label>
                </div>
              </div>
              <div className="space-y-4">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full rounded-lg border bg-gray-50 p-3 outline-none focus:border-blue-500"
                  placeholder="Tên hiển thị"
                />
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={editMajor}
                    onChange={(e) => setEditMajor(e.target.value)}
                    className="rounded-lg border bg-gray-50 p-3 outline-none"
                    placeholder="Ngành học"
                  />
                  <input
                    type="text"
                    value={editYear}
                    onChange={(e) => setEditYear(e.target.value)}
                    className="rounded-lg border bg-gray-50 p-3 outline-none"
                    placeholder="Khóa"
                  />
                </div>
                <textarea
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  className="h-24 w-full resize-none rounded-lg border bg-gray-50 p-3"
                  placeholder="Giới thiệu bản thân..."
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 border-t p-4">
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="px-5 py-2.5 font-bold text-gray-600"
              >
                Hủy
              </button>
              <button
                onClick={handleUpdateProfile}
                disabled={isSaving}
                className="rounded-lg bg-blue-600 px-5 py-2.5 font-bold text-white shadow-sm"
              >
                {isSaving ? "Đang lưu..." : "Lưu thay đổi"}
              </button>
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
              <p className="text-sm font-medium text-blue-800">
                Xác thực thẻ sinh viên để tăng độ tin cậy khi giao dịch!
              </p>
            </div>
            <button
              onClick={() => setVerifyModalOpen(true)}
              className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-blue-700"
            >
              Xác thực ngay
            </button>
          </div>
        </div>
      )}

      {verifyModalOpen && (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-sm rounded-2xl bg-white p-6 text-center">
            <button
              onClick={() => setVerifyModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400"
            >
              <X size={20} />
            </button>
            <ShieldCheck className="mx-auto mb-4 text-blue-600" size={48} />
            <h3 className="text-xl font-bold">Xác thực sinh viên</h3>
            <p className="mt-2 mb-6 text-sm text-gray-500">
              Tải ảnh thẻ sinh viên của bạn lên để BK Market kiểm duyệt.
            </p>
            <label className="flex h-32 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-blue-200 bg-blue-50">
              {uploadingVerify ? (
                <Loader2 className="animate-spin text-blue-600" />
              ) : (
                <>
                  <Upload className="mb-2 text-blue-600" />
                  <p className="text-sm font-bold text-blue-600">
                    Chọn ảnh thẻ
                  </p>
                </>
              )}
              <input
                type="file"
                className="hidden"
                accept="image/*"
                onChange={handleUploadVerification}
                disabled={uploadingVerify}
              />
            </label>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;
