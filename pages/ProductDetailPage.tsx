/**
 * PROJECT: BOOK EXCHANGE - HCMUT
 * MODULE: PRODUCT DETAIL (CINEMATIC EDITION)
 * AUTHOR: HCMUT STUDENT TEAM
 * ---------------------------------------------
 * Mô tả: Trang chi tiết sản phẩm với giao diện "Chân trời mới".
 * Tích hợp Supabase, Real-time comment, và luồng giao dịch Chat.
 */

import React, { useEffect, useState, useCallback, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  Heart,
  MessageCircle,
  Share2,
  Flag,
  ArrowLeft,
  ArrowRight,
  ChevronRight,
  MapPin,
  Clock,
  Eye,
  ShieldCheck,
  Star,
  Box,
  CheckCircle2,
  Send,
  Copy,
  AlertTriangle,
  Calendar,
  Award,
  Zap,
  CornerUpRight,
  Info,
  X,
} from "lucide-react";
import { Product, User, Comment } from "@/types";
import { supabase } from "@/services/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import ProductCard from "@/components/ProductCard";
import CloneAvatar from "@/assets/avatar.jpg";

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
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
    amount,
  );

const timeAgo = (date: string | Date) => {
  const seconds = Math.floor(
    (new Date().getTime() - new Date(date).getTime()) / 1000,
  );
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
const CinematicGallery = ({
  images,
  status,
}: {
  images: string[];
  status: any;
}) => {
  const [active, setActive] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div className="sticky top-24 flex flex-col gap-6 select-none">
      {/* Main Stage */}
      <div
        className="group relative aspect-4/3 overflow-hidden rounded-[2.5rem] border border-white/50 bg-white shadow-2xl shadow-blue-900/5 lg:aspect-square"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="absolute inset-0 z-0 bg-linear-to-tr from-slate-100/50 to-white/50"></div>

        <img
          src={images[active]}
          alt="Product Hero"
          className={`relative z-10 h-full w-full object-contain p-8 transition-transform duration-700 ease-out ${isHovered ? "scale-110" : "scale-100"}`}
          style={{ mixBlendMode: "multiply" }}
        />

        {/* Status Overlay */}
        {status === "sold" && (
          <div className="animate-zoom absolute inset-0 z-20 flex items-center justify-center bg-slate-900/60 backdrop-blur-[2px]">
            <div className="-rotate-12 border-[6px] border-white px-10 py-4 text-5xl font-black tracking-widest text-white uppercase opacity-90 md:text-6xl">
              ĐÃ BÁN
            </div>
          </div>
        )}

        {/* Cinematic Controls */}
        <div className="absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 translate-y-4 gap-2 rounded-full border border-white/20 bg-black/5 px-4 py-2 opacity-0 backdrop-blur-md transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
          {images.map((_, i) => (
            <div
              key={i}
              className={`h-2 w-2 rounded-full transition-all ${i === active ? "w-6 bg-black" : "bg-black/30"}`}
            ></div>
          ))}
        </div>
      </div>

      {/* Thumbnails Strip */}
      {images.length > 1 && (
        <div className="hide-scrollbar flex snap-x gap-4 overflow-x-auto px-2 pb-4">
          {images.map((img, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className={`group/thumb relative h-24 w-24 shrink snap-center overflow-hidden rounded-2xl border-2 transition-all duration-300 ${active === i ? "scale-105 border-[#00418E] shadow-lg" : "border-transparent bg-white opacity-60 hover:opacity-100"}`}
            >
              <img
                src={img}
                className="h-full w-full object-cover p-1"
                alt={`view-${i}`}
              />
              {active !== i && (
                <div className="absolute inset-0 bg-white/20 transition-colors group-hover/thumb:bg-transparent"></div>
              )}
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
      className="glass-panel hover-lift group relative flex cursor-pointer items-center gap-5 overflow-hidden rounded-4xl p-5"
    >
      {/* Background Decoration */}
      <div className="absolute top-0 right-0 h-32 w-32 rounded-bl-full bg-linear-to-bl from-blue-50 to-transparent opacity-50 transition-transform duration-500 group-hover:scale-110"></div>

      <div className="relative z-10">
        <div className="h-16 w-16 rounded-full bg-linear-to-tr from-[#00418E] to-[#00B0F0] p-1">
          <img
            src={seller.avatar || CloneAvatar}
            className="h-full w-full rounded-full border-2 border-white object-cover"
            alt={seller.name}
          />
        </div>
        {seller.isVerified && (
          <div className="absolute -right-1 -bottom-1 rounded-full border-2 border-white bg-blue-500 p-1 text-white shadow-sm">
            <CheckCircle2 size={12} />
          </div>
        )}
      </div>

      <div className="relative z-10 flex-1">
        <h4 className="text-lg font-bold text-slate-800 transition-colors group-hover:text-[#00418E]">
          {seller.name}
        </h4>
        <div className="mt-1 flex items-center gap-3 text-xs font-medium text-slate-500">
          <div className="flex items-center gap-1 rounded-md bg-yellow-50 px-2 py-0.5 text-yellow-500">
            <Star size={10} fill="currentColor" /> 4.9
          </div>
          <span className="h-1 w-1 rounded-full bg-slate-300"></span>
          <span>Phản hồi nhanh</span>
        </div>
      </div>

      <div className="relative z-10 rounded-full bg-white p-3 text-slate-400 shadow-sm transition-all group-hover:bg-blue-50 group-hover:text-[#00418E]">
        <CornerUpRight size={20} />
      </div>
    </div>
  );
};

// 3.3. Spec Item (Thông số kỹ thuật)
const SpecItem = ({
  icon,
  label,
  value,
}: {
  icon: any;
  label: string;
  value: string;
}) => (
  <div className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50/50 p-4 transition-all duration-300 hover:bg-white hover:shadow-md">
    <div className="rounded-xl bg-white p-2 text-[#00418E] shadow-sm">
      {icon}
    </div>
    <div>
      <p className="mb-0.5 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
        {label}
      </p>
      <p className="text-sm font-bold text-slate-800">{value}</p>
    </div>
  </div>
);

// 3.4. Comment Item
const CommentItem = ({ comment }: { comment: Comment }) => (
  <div className="flex gap-4 rounded-2xl border border-slate-50 bg-white p-4 shadow-sm transition-all hover:shadow-md">
    <img
      src={comment.userAvatar}
      className="h-10 w-10 rounded-full border border-slate-100 bg-slate-100 object-cover"
      alt="u"
    />
    <div className="flex-1">
      <div className="mb-1 flex items-start justify-between">
        <span className="text-sm font-bold text-slate-900">
          {comment.userName}
        </span>
        <span className="text-[10px] font-medium text-slate-400">
          {timeAgo(comment.createdAt)}
        </span>
      </div>
      <p className="text-sm leading-relaxed text-slate-600">
        {comment.content}
      </p>
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
  const [activeTab, setActiveTab] = useState<"details" | "discussion">(
    "details",
  );
  const [commentInput, setCommentInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch Logic
  const fetchData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const { data: pData } = await supabase
        .from("products")
        .select("*")
        .eq("id", id)
        .single();
      if (!pData) throw new Error("Not found");

      const mappedProduct: Product = {
        ...pData,
        sellerId: pData.seller_id,
        images: pData.images || [],
        status: pData.status,
        postedAt: pData.posted_at,
      };
      setProduct(mappedProduct);

      // Parallel Fetching for Speed
      const [sellerRes, commentRes, relatedRes, likeRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("*")
          .eq("id", mappedProduct.sellerId)
          .single(),
        supabase
          .from("comments")
          .select(`*, user:user_id(name, avatar_url)`)
          .eq("product_id", id)
          .order("created_at", { ascending: false }),
        supabase
          .from("products")
          .select("*")
          .eq("category", mappedProduct.category)
          .neq("id", id)
          .limit(4),
        currentUser?.id
          ? supabase
              .from("saved_products")
              .select("id")
              .eq("user_id", currentUser.id)
              .eq("product_id", id)
              .maybeSingle()
          : Promise.resolve({ data: null }),
      ]);

      if (sellerRes.data)
        setSeller({
          ...sellerRes.data,
          id: sellerRes.data.id,
          avatar: sellerRes.data.avatar_url,
          isVerified: sellerRes.data.is_verified,
        });
      setComments(commentRes.data || []);
      setRelated(
        relatedRes.data?.map((p: any) => ({
          ...p,
          sellerId: p.seller_id,
          images: p.images || [],
          status: p.status,
        })) || [],
      );
      setIsLiked(!!likeRes.data);

      // Silent view count update
      supabase.rpc("increment_view_count", { product_id: id });
    } catch (err) {
      addToast("Sản phẩm không tồn tại hoặc đã bị xóa.", "error");
      navigate("/market");
    } finally {
      setLoading(false);
    }
  }, [id, currentUser?.id, navigate, addToast]);

  useEffect(() => {
    fetchData();
    window.scrollTo(0, 0);
  }, [fetchData]);

  // Actions
  const handleLike = async () => {
    if (!currentUser) return navigate("/auth");
    setIsLiked(!isLiked); // Optimistic UI
    try {
      if (isLiked)
        await supabase
          .from("saved_products")
          .delete()
          .eq("user_id", currentUser.id)
          .eq("product_id", id);
      else
        await supabase
          .from("saved_products")
          .insert({ user_id: currentUser.id, product_id: id });
    } catch {
      setIsLiked(!isLiked);
    } // Revert if failed
  };

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return navigate("/auth");
    if (!commentInput.trim()) return;

    setIsSubmitting(true);
    const { error } = await supabase
      .from("comments")
      .insert({
        product_id: id,
        user_id: currentUser.id,
        content: commentInput.trim(),
      });
    if (!error) {
      setCommentInput("");
      fetchData();
      addToast("Đã gửi bình luận", "success");
    }
    setIsSubmitting(false);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    addToast("Đã sao chép liên kết", "success");
  };

  // Loading State
  if (loading)
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#F8FAFC]">
        <VisualEngine />
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-100 border-t-[#00418E]"></div>
        <p className="animate-pulse text-sm font-medium text-slate-400">
          Đang tải dữ liệu...
        </p>
      </div>
    );

  if (!product) return null;

  const isOwner = currentUser?.id === product.sellerId;

  return (
    <div className="min-h-screen pb-32 font-sans text-slate-800">
      <VisualEngine />

      {/* --- HEADER (Glassmorphism Sticky) --- */}
      <div className="glass-nav sticky top-0 z-50 transition-all duration-300">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          <div className="animate-enter flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="rounded-full p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="hidden items-center gap-2 text-sm font-medium text-slate-500 md:flex">
              <Link
                to="/market"
                className="transition-colors hover:text-[#00418E]"
              >
                Market
              </Link>
              <ChevronRight size={14} />
              <span className="max-w-[200px] truncate font-bold text-slate-900">
                {product.title}
              </span>
            </div>
          </div>
          <div className="animate-enter stagger-1 flex items-center gap-2">
            <button
              onClick={copyLink}
              className="rounded-full p-2 text-slate-500 transition-colors hover:bg-blue-50 hover:text-[#00418E]"
            >
              <Share2 size={20} />
            </button>
            <button className="rounded-full p-2 text-slate-500 transition-colors hover:bg-red-50 hover:text-red-500">
              <Flag size={20} />
            </button>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-4 py-10">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-16">
          {/* --- LEFT COLUMN: GALLERY & CONTENT (60%) --- */}
          <div className="animate-enter space-y-12 lg:col-span-7">
            <CinematicGallery images={product.images} status={product.status} />

            {/* Tabbed Content Area */}
            <div className="space-y-8">
              <div className="flex gap-8 border-b border-gray-200">
                <button
                  onClick={() => setActiveTab("details")}
                  className={`relative pb-4 text-lg font-bold transition-all ${activeTab === "details" ? "text-[#00418E]" : "text-slate-400 hover:text-slate-600"}`}
                >
                  Thông tin chi tiết
                  {activeTab === "details" && (
                    <span className="animate-zoom absolute bottom-0 left-0 h-0.5 w-full rounded-full bg-[#00418E]"></span>
                  )}
                </button>
                <button
                  onClick={() => setActiveTab("discussion")}
                  className={`relative pb-4 text-lg font-bold transition-all ${activeTab === "discussion" ? "text-[#00418E]" : "text-slate-400 hover:text-slate-600"}`}
                >
                  Thảo luận ({comments.length})
                  {activeTab === "discussion" && (
                    <span className="animate-zoom absolute bottom-0 left-0 h-0.5 w-full rounded-full bg-[#00418E]"></span>
                  )}
                </button>
              </div>

              {activeTab === "details" ? (
                <div className="animate-enter stagger-1">
                  <div className="prose prose-slate mb-8 max-w-none text-base leading-loose text-slate-600">
                    {product.description ||
                      "Người bán chưa cung cấp mô tả chi tiết."}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <SpecItem
                      icon={<Star size={18} />}
                      label="Tình trạng"
                      value={product.condition}
                    />
                    <SpecItem
                      icon={<Box size={18} />}
                      label="Giao dịch"
                      value={
                        product.tradeMethod === "direct"
                          ? "Trực tiếp"
                          : "Ship COD"
                      }
                    />
                    <SpecItem
                      icon={<MapPin size={18} />}
                      label="Khu vực"
                      value="TP. Hồ Chí Minh"
                    />
                    <SpecItem
                      icon={<Calendar size={18} />}
                      label="Ngày đăng"
                      value={new Date(product.postedAt).toLocaleDateString()}
                    />
                  </div>
                </div>
              ) : (
                <div className="animate-enter stagger-1 space-y-6">
                  {currentUser ? (
                    <form
                      onSubmit={handleComment}
                      className="flex items-start gap-4"
                    >
                      <img
                        src={currentUser.avatar}
                        className="h-10 w-10 rounded-full border border-gray-200 shadow-sm"
                        alt="me"
                      />
                      <div className="group relative flex-1">
                        <textarea
                          value={commentInput}
                          onChange={(e) => setCommentInput(e.target.value)}
                          placeholder="Bạn có thắc mắc gì về sản phẩm này?..."
                          className="min-h-[80px] w-full resize-none rounded-2xl border border-gray-200 bg-white p-4 pr-14 text-sm shadow-sm transition-all focus:border-[#00418E] focus:ring-4 focus:ring-blue-50 focus:outline-none"
                        />
                        <button
                          disabled={!commentInput.trim() || isSubmitting}
                          className="absolute right-3 bottom-3 rounded-xl bg-[#00418E] p-2 text-white shadow-lg transition-all hover:scale-105 hover:shadow-blue-500/30 active:scale-95 disabled:opacity-50"
                        >
                          <Send size={16} />
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
                      <p className="mb-4 text-slate-500">
                        Bạn cần đăng nhập để tham gia thảo luận.
                      </p>
                      <Link
                        to="/auth"
                        className="inline-block rounded-xl border border-slate-200 bg-white px-6 py-2 font-bold text-slate-700 transition-all hover:border-[#00418E] hover:text-[#00418E]"
                      >
                        Đăng nhập ngay
                      </Link>
                    </div>
                  )}

                  <div className="space-y-4">
                    {comments.map((c, i) => (
                      <div
                        key={c.id}
                        className="animate-enter"
                        style={{ animationDelay: `${i * 50}ms` }}
                      >
                        <CommentItem comment={c} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* --- RIGHT COLUMN: STICKY INFO PANEL (40%) --- */}
          <div className="relative lg:col-span-5">
            <div className="animate-enter stagger-2 sticky top-24 space-y-8">
              {/* Product Info Card */}
              <div className="glass-panel group relative overflow-hidden rounded-[2.5rem] p-8">
                <div className="pointer-events-none absolute top-0 right-0 -mt-16 -mr-16 h-64 w-64 rounded-bl-full bg-linear-to-br from-blue-50 to-transparent opacity-50"></div>

                <div className="relative z-10">
                  <div className="mb-6 flex items-start justify-between">
                    <span className="inline-flex items-center gap-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-black tracking-wider text-[#00418E] uppercase">
                      <Box size={12} /> {product.category}
                    </span>
                    <button
                      onClick={handleLike}
                      className="rounded-full border border-slate-100 bg-white p-2.5 text-slate-400 shadow-sm transition-all hover:text-red-500 hover:shadow-md active:scale-90"
                    >
                      <Heart
                        size={22}
                        className={isLiked ? "fill-red-500 text-red-500" : ""}
                      />
                    </button>
                  </div>

                  <h1 className="mb-4 text-3xl leading-tight font-black text-slate-900 md:text-4xl">
                    {product.title}
                  </h1>

                  <div className="mb-8 flex items-center gap-6 border-b border-slate-100 pb-8 text-sm font-bold text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <Clock size={16} className="text-[#00418E]" />{" "}
                      {timeAgo(product.postedAt)}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Eye size={16} className="text-[#00418E]" />{" "}
                      {product.view_count}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <MapPin size={16} className="text-[#00418E]" /> HCMUT
                    </div>
                  </div>

                  <div className="mb-8">
                    <p className="mb-2 text-xs font-bold tracking-widest text-slate-400 uppercase">
                      Giá bán
                    </p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-5xl font-black tracking-tighter text-[#00418E] drop-shadow-sm">
                        {product.price === 0
                          ? "Miễn phí"
                          : formatCurrency(product.price)}
                      </span>
                      {product.price === 0 && (
                        <span className="rounded-md border border-green-100 bg-green-50 px-2 py-1 text-sm font-bold text-green-500">
                          Quà tặng
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-3">
                    {isOwner ? (
                      <button
                        onClick={() =>
                          navigate(`/post-item?edit=${product.id}`)
                        }
                        className="w-full rounded-2xl bg-slate-100 py-4 text-lg font-bold text-slate-700 transition-all hover:bg-slate-200"
                      >
                        Chỉnh sửa bài đăng
                      </button>
                    ) : (
                      // NÚT CHAT DUY NHẤT - TRUYỀN PRODUCT ID
                      <button
                        onClick={() =>
                          navigate(
                            `/chat?partnerId=${seller?.id}&productId=${product.id}`,
                          )
                        }
                        disabled={product.status === "sold"}
                        className="btn-primary flex w-full items-center justify-center gap-3 rounded-2xl py-4 text-lg font-bold shadow-xl shadow-blue-900/20 transition-all hover:scale-[1.02] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <MessageCircle size={24} className="fill-current" />
                        {product.status === "sold"
                          ? "Sản phẩm đã bán"
                          : "Nhắn tin & Chốt đơn"}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Seller & Safety */}
              {seller && <SellerCard seller={seller} />}

              <div className="flex items-start gap-4 rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
                <div className="rounded-xl bg-blue-50 p-3 text-[#00418E]">
                  <ShieldCheck size={24} />
                </div>
                <div>
                  <h4 className="mb-1 text-sm font-bold text-slate-900">
                    Giao dịch an toàn
                  </h4>
                  <p className="text-xs leading-relaxed text-slate-500">
                    Chỉ nên giao dịch trực tiếp tại khuôn viên trường (H6, Thư
                    viện). Không chuyển khoản trước khi nhận hàng.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* --- RELATED PRODUCTS --- */}
        {related.length > 0 && (
          <div className="animate-enter stagger-3 mt-32 border-t border-slate-200 pt-16">
            <div className="mb-10 flex items-center justify-between">
              <h3 className="text-3xl font-black text-slate-900">
                Sản phẩm tương tự
              </h3>
              <Link
                to="/market"
                className="group flex items-center gap-1 font-bold text-[#00418E] hover:underline"
              >
                Xem tất cả{" "}
                <ArrowRight
                  size={18}
                  className="transition-transform group-hover:translate-x-1"
                />
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
              {related.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        )}
      </main>

      {/* --- MOBILE STICKY BAR (BOTTOM) --- */}
      <div className="animate-enter fixed right-0 bottom-0 left-0 z-50 border-t border-gray-200 bg-white/90 p-4 shadow-[0_-10px_30px_rgba(0,0,0,0.1)] backdrop-blur-xl lg:hidden">
        <div className="flex gap-3">
          <button
            onClick={() =>
              navigate(`/chat?partnerId=${seller?.id}&productId=${product.id}`)
            }
            disabled={product.status === "sold"}
            className="btn-primary flex flex-1 items-center justify-center gap-2 rounded-xl py-3.5 font-bold text-white shadow-lg transition-transform active:scale-95 disabled:opacity-50"
          >
            <MessageCircle size={20} className="fill-current" /> Chat Ngay
          </button>
          <button
            onClick={handleLike}
            className={`flex w-14 items-center justify-center rounded-xl border-2 transition-all active:scale-95 ${isLiked ? "border-red-500 bg-red-50 text-red-500" : "border-gray-200 bg-white text-gray-400"}`}
          >
            <Heart size={24} className={isLiked ? "fill-current" : ""} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductDetailPage;
