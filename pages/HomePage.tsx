import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Search,
  ArrowRight,
  Zap,
  Users,
  BookOpen,
  Calculator,
  Shirt,
  Monitor,
  Grid,
  Flame,
  Gift,
  Eye,
  ShoppingBag,
  PlusCircle,
  Heart,
  Package,
  ChevronRight,
  Sparkles,
  Clock,
  Smile,
  Rocket,
  PlayCircle,
  Ghost,
  WifiOff,
  RefreshCw,
  MoreHorizontal,
  Smartphone,
  Laptop,
  GraduationCap,
} from "lucide-react";
import { supabase } from "../services/supabase";

// --- TYPES & ENUMS ---
type ID = string | number;
type Timestamp = string;

// Đổi tên Enum cho khớp với Post
enum PostCategory {
  TEXTBOOK = "Textbook",
  ELECTRONICS = "Electronics",
  SUPPLIES = "School Supplies",
  CLOTHING = "Uniforms/Clothing",
  OTHER = "Other",
}

enum SortOption {
  NEWEST = "newest",
  OLDEST = "oldest",
  PRICE_ASC = "price_asc",
  PRICE_DESC = "price_desc",
  MOST_VIEWED = "most_viewed",
}

// Interface Post (thay cho Product)
interface Post {
  id: ID;
  created_at: Timestamp;
  title: string;
  description: string;
  price: number;
  images: string[];
  category: string;
  status: string;
  owner_id: ID;
  view_count: number;
  condition: string;
  tags: string[];
  trade_type: "sell" | "swap" | "free";
  location?: string;
  published_at?: string;
}

interface FilterState {
  category: string | "all";
  sort: SortOption;
  search: string;
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger" | "success" | "gradient";
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: "left" | "right";
  fullWidth?: boolean;
}

// --- UTILS ---
const Utils = {
  formatCurrency: (amount: number): string => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      maximumFractionDigits: 0,
    }).format(amount);
  },
  timeAgo: (dateString: string): string => {
    if (!dateString) return "Vừa xong";
    const now = new Date();
    const date = new Date(dateString);
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (seconds > 86400) return Math.floor(seconds / 86400) + " ngày trước";
    if (seconds > 3600) return Math.floor(seconds / 3600) + " giờ trước";
    if (seconds > 60) return Math.floor(seconds / 60) + " phút trước";
    return "Vừa xong";
  },
  cn: (...classes: (string | undefined | null | false)[]): string =>
    classes.filter(Boolean).join(" "),
};

// --- STYLES ---
const GlobalStyles = () => (
  <style>{`
    :root { --primary: #00418E; --secondary: #00B0F0; --accent: #7C3AED; --light: #F8FAFC; }
    body { background-color: var(--light); color: #0F172A; font-family: 'Inter', system-ui, sans-serif; overflow-x: hidden; }
    
    ::-webkit-scrollbar { width: 6px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: #CBD5E1; border-radius: 10px; }
    ::-webkit-scrollbar-thumb:hover { background: #94A3B8; }

    /* Animations */
    @keyframes float { 0% { transform: translateY(0px); } 50% { transform: translateY(-15px); } 100% { transform: translateY(0px); } }
    @keyframes float-delay { 0% { transform: translateY(0px); } 50% { transform: translateY(-10px); } 100% { transform: translateY(0px); } }
    @keyframes blob { 0% { transform: translate(0px, 0px) scale(1); } 33% { transform: translate(30px, -50px) scale(1.1); } 66% { transform: translate(-20px, 20px) scale(0.9); } 100% { transform: translate(0px, 0px) scale(1); } }
    @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
    @keyframes text-gradient { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
    @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }

    .animate-float { animation: float 6s ease-in-out infinite; }
    .animate-float-delay { animation: float-delay 7s ease-in-out infinite; animation-delay: 2s; }
    .animate-blob { animation: blob 7s infinite; }
    .animate-text-gradient { background-size: 200% auto; animation: text-gradient 5s linear infinite; }
    .animate-enter { animation: fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; opacity: 0; }
    .delay-100 { animation-delay: 100ms; }
    .delay-200 { animation-delay: 200ms; }
    .delay-300 { animation-delay: 300ms; }

    /* Glassmorphism & Hover Effects */
    .glass-panel { background: rgba(255, 255, 255, 0.7); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border: 1px solid rgba(255, 255, 255, 0.5); }
    .glass-card-hover { transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1); }
    .glass-card-hover:hover { transform: translateY(-8px) scale(1.01); box-shadow: 0 20px 40px -10px rgba(0, 65, 142, 0.15); border-color: rgba(0, 176, 240, 0.5); }
    
    .skeleton-shimmer { background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; }
  `}</style>
);

// --- COMPONENTS ---

const AnimatedBackground = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
    <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-300 rounded-full mix-blend-multiply filter blur-[128px] opacity-40 animate-blob"></div>
    <div className="absolute top-0 right-1/4 w-96 h-96 bg-purple-300 rounded-full mix-blend-multiply filter blur-[128px] opacity-40 animate-blob animation-delay-2000"></div>
    <div className="absolute -bottom-32 left-1/3 w-96 h-96 bg-cyan-300 rounded-full mix-blend-multiply filter blur-[128px] opacity-40 animate-blob animation-delay-4000"></div>
    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
  </div>
);

// Đổi tên Hook: usePosts
function usePosts(filter: FilterState) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase
        .from("posts")
        .select("*, post_images(path)") 
        .eq("status", "approved") 
        .eq("campus", "CS1"); 

      if (filter.category !== "all") query = query.eq("category", filter.category);
      if (filter.search) query = query.ilike("title", `%${filter.search}%`);

      if (filter.sort === SortOption.NEWEST) query = query.order("published_at", { ascending: false });
      else if (filter.sort === SortOption.PRICE_ASC) query = query.order("price", { ascending: true });
      else if (filter.sort === SortOption.PRICE_DESC) query = query.order("price", { ascending: false });
      else if (filter.sort === SortOption.MOST_VIEWED) query = query.order("view_count", { ascending: false });

      const { data, error: dbError } = await query.limit(12);
      if (dbError) throw dbError;

      setPosts((data || []).map((p: any) => ({
          ...p,
          images: p.post_images ? p.post_images.map((img: any) => img.path) : [],
          postedAt: p.published_at || p.created_at,
        }))
      );
    } catch (err: any) {
      console.error("Fetch Error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);
  return { posts, loading, error, refetch: fetchPosts };
}

const Button: React.FC<ButtonProps> = ({ variant = "primary", size = "md", loading, icon, iconPosition = "left", fullWidth, children, className, disabled, ...props }) => {
  const baseStyle = "inline-flex items-center justify-center font-bold rounded-xl transition-all duration-300 active:scale-95 disabled:opacity-50 disabled:pointer-events-none focus:outline-none focus:ring-2 focus:ring-offset-2 relative overflow-hidden";
  const variants = {
    primary: "bg-[#00418E] text-white hover:bg-[#003370] shadow-lg shadow-blue-900/20 hover:shadow-blue-900/40",
    secondary: "bg-[#00B0F0] text-white hover:bg-[#0090C0] shadow-lg shadow-cyan-500/20",
    outline: "border-2 border-slate-200 bg-white/50 backdrop-blur-sm text-slate-700 hover:border-[#00418E] hover:text-[#00418E] hover:bg-white",
    ghost: "bg-transparent text-slate-500 hover:bg-slate-100/50",
    danger: "bg-red-500 text-white hover:bg-red-600 shadow-red-500/20",
    success: "bg-green-500 text-white hover:bg-green-600 shadow-green-500/20",
    gradient: "bg-gradient-to-r from-[#00418E] to-[#00B0F0] text-white hover:opacity-90 shadow-lg shadow-blue-500/30",
  };
  const sizes = { xs: "px-2.5 py-1 text-xs", sm: "px-3 py-1.5 text-xs", md: "px-5 py-2.5 text-sm", lg: "px-8 py-3.5 text-base", xl: "px-10 py-4 text-lg" };

  return (
    <button className={Utils.cn(baseStyle, variants[variant], sizes[size], fullWidth ? "w-full" : "", className)} disabled={disabled || loading} {...props}>
      {loading && <RefreshCw className="mr-2 animate-spin" size={16} />}
      {!loading && icon && iconPosition === "left" && <span className="mr-2">{icon}</span>}
      <span className="relative z-10">{children}</span>
      {!loading && icon && iconPosition === "right" && <span className="ml-2">{icon}</span>}
    </button>
  );
};

// Đổi tên Component: PostCard
const PostCard: React.FC<{ post: Post }> = ({ post }) => {
  const navigate = useNavigate();
  const [imageLoaded, setImageLoaded] = useState(false);
  const displayImage = post.images && post.images.length > 0 ? post.images[0] : "https://placehold.co/400x300?text=No+Image";

  const categoryLabels: Record<string, string> = {
    [PostCategory.TEXTBOOK]: "Giáo trình",
    [PostCategory.ELECTRONICS]: "Điện tử",
    [PostCategory.SUPPLIES]: "Dụng cụ",
    [PostCategory.CLOTHING]: "Thời trang",
    [PostCategory.OTHER]: "Khác",
  };
  const displayCategory = categoryLabels[post.category] || post.category;

  return (
    // Lưu ý: Route vẫn giữ là /product/:id để tránh lỗi nếu App.tsx chưa đổi
    <div onClick={() => navigate(`/product/${post.id}`)} className="glass-card-hover group relative flex h-full cursor-pointer flex-col overflow-hidden rounded-2xl border border-white/60 bg-white/40 backdrop-blur-md shadow-sm transition-all duration-300">
      <div className="relative aspect-4/3 overflow-hidden bg-slate-100">
        {!imageLoaded && <div className="skeleton-shimmer absolute inset-0 h-full w-full" />}
        <img
          src={displayImage}
          alt={post.title}
          className={Utils.cn("h-full w-full object-cover transition-transform duration-700 group-hover:scale-110", imageLoaded ? "opacity-100" : "opacity-0")}
          onLoad={() => setImageLoaded(true)}
          onError={(e) => { (e.target as HTMLImageElement).src = "https://placehold.co/400x300?text=Error"; setImageLoaded(true); }}
        />
        
        <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/30 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 z-10 pointer-events-none"></div>

        <div className="absolute top-3 left-3 flex flex-col gap-1 z-20">
          {(post.price === 0 || post.trade_type === 'free') && (
            <span className="flex items-center gap-1 rounded-full bg-red-500/90 backdrop-blur-sm px-2.5 py-1 text-[10px] font-bold text-white shadow-lg border border-red-400">
              <Gift size={10} /> FREE
            </span>
          )}
          {post.trade_type === 'swap' && (
            <span className="flex items-center gap-1 rounded-full bg-purple-500/90 backdrop-blur-sm px-2.5 py-1 text-[10px] font-bold text-white shadow-lg border border-purple-400">
              <RefreshCw size={10} /> SWAP
            </span>
          )}
          {post.condition === "Brand New" && (
            <span className="rounded-full bg-green-500/90 backdrop-blur-sm px-2.5 py-1 text-[10px] font-bold text-white shadow-lg border border-green-400">
              NEW
            </span>
          )}
        </div>

        <button className="absolute right-3 bottom-3 translate-y-10 rounded-full bg-white p-2.5 text-[#00418E] opacity-0 shadow-lg transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 hover:bg-[#00418E] hover:text-white z-20">
          <ArrowRight size={18} />
        </button>
      </div>

      <div className="flex flex-1 flex-col p-4 relative">
        <div className="mb-2 flex items-start justify-between">
          <span className="max-w-[60%] truncate rounded-full border border-blue-100 bg-blue-50/80 px-2.5 py-0.5 text-[10px] font-bold tracking-wider text-[#00418E] uppercase">
            {displayCategory}
          </span>
          <span className="flex items-center gap-1 text-[10px] whitespace-nowrap text-slate-400">
            <Clock size={10} /> {Utils.timeAgo(post.published_at || post.created_at)}
          </span>
        </div>
        <h3 className="mb-1 line-clamp-2 min-h-[40px] text-sm leading-relaxed font-bold text-slate-800 transition-colors group-hover:text-[#00418E]">
          {post.title}
        </h3>
        <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-3">
          <span className="text-lg font-black tracking-tight text-[#0F172A] group-hover:text-[#00418E] transition-colors">
            {post.trade_type === 'free' || post.price === 0 ? "Tặng miễn phí" : post.trade_type === 'swap' ? "Trao đổi" : Utils.formatCurrency(post.price)}
          </span>
          <div className="flex items-center gap-1 text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded-full">
            <Eye size={12} /> {post.view_count || 0}
          </div>
        </div>
      </div>
    </div>
  );
};

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<FilterState>({ category: "all", sort: SortOption.NEWEST, search: "" });
  const { posts, loading, error, refetch } = usePosts(filter);

  const handleSearch = (term: string) => {
    if (term.trim()) navigate(`/market?search=${encodeURIComponent(term)}`);
  };

  return (
    <div className="relative min-h-screen font-sans selection:bg-[#00418E] selection:text-white overflow-hidden">
      <GlobalStyles />
      <AnimatedBackground />

      {/* --- HERO SECTION --- */}
      <section className="relative px-4 pt-32 pb-24">
        {/* Floating Icons Background */}
        <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
             <div className="absolute top-20 left-[10%] text-blue-200/40 animate-float"><BookOpen size={64} /></div>
             <div className="absolute top-40 right-[15%] text-purple-200/40 animate-float-delay"><Laptop size={80} /></div>
             <div className="absolute bottom-20 left-[20%] text-cyan-200/40 animate-float delay-100"><Calculator size={56} /></div>
             <div className="absolute bottom-40 right-[10%] text-orange-200/40 animate-float-delay"><GraduationCap size={72} /></div>
        </div>

        <div className="relative z-10 mx-auto max-w-5xl text-center">
          <div className="animate-enter mb-8 flex justify-center">
            <div className="inline-flex cursor-default items-center gap-2 rounded-full border border-white/60 bg-white/40 backdrop-blur-md px-5 py-2 shadow-sm ring-1 ring-white/50 transition-all hover:scale-105 hover:bg-white/60">
              <Sparkles size={16} className="animate-pulse fill-yellow-500 text-yellow-500" />
              <span className="text-xs font-bold tracking-widest text-slate-700 uppercase">Cổng thông tin Sinh viên Bách Khoa</span>
            </div>
          </div>
          
          <h1 className="animate-enter delay-100 mb-8 text-5xl leading-[1.1] font-black tracking-tight text-slate-900 drop-shadow-sm md:text-7xl">
            Trao đổi đồ cũ <br />
            <span className="animate-text-gradient bg-gradient-to-r from-[#00418E] via-[#00B0F0] to-[#7C3AED] bg-clip-text text-transparent">
              Thông minh & Tiết kiệm
            </span>
          </h1>

          <p className="animate-enter delay-200 mx-auto mb-12 max-w-2xl text-lg leading-relaxed font-medium text-slate-600 md:text-xl">
            Nền tảng mua bán phi lợi nhuận dành riêng cho sinh viên. <br className="hidden md:block"/>
            Tìm giáo trình, laptop, và dụng cụ học tập giá rẻ ngay tại trường.
          </p>

          {/* Search Bar */}
          <div className="animate-enter delay-300 group relative z-20 mx-auto mb-20 w-full max-w-2xl">
            <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-[#00418E] to-[#00B0F0] opacity-30 blur-lg transition duration-1000 group-hover:opacity-50"></div>
            <form
              onSubmit={(e) => { e.preventDefault(); handleSearch((e.target as any)[0].value); }}
              className="relative flex items-center rounded-full border border-white/50 bg-white/80 backdrop-blur-xl p-2 shadow-xl transition-all hover:shadow-2xl hover:bg-white"
            >
              <Search className="ml-4 text-slate-400 group-focus-within:text-[#00418E]" size={22} />
              <input
                placeholder="Bạn đang tìm gì? (VD: Giải tích 1, Casio 580...)"
                className="h-14 w-full border-none bg-transparent px-4 text-base font-medium text-slate-900 placeholder-slate-400 outline-none"
              />
              <button type="submit" className="flex h-12 w-32 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#00418E] to-[#0065D1] px-2 shadow-lg transition-all hover:brightness-110 active:scale-95">
                <span className="text-sm font-bold text-white">Tìm kiếm</span>
              </button>
            </form>
          </div>

          {/* Quick Actions Grid */}
          <div className="animate-enter delay-300 grid grid-cols-2 gap-4 px-4 md:grid-cols-4">
            {[
              { title: "Dạo Chợ", desc: "Săn deal hời", icon: <ShoppingBag size={24} />, link: "/market", color: "text-cyan-600", bg: "bg-cyan-50", border: "border-cyan-100" },
              { title: "Đăng Tin", desc: "Bán nhanh gọn", icon: <PlusCircle size={24} />, link: "/post-item", color: "text-purple-600", bg: "bg-purple-50", border: "border-purple-100" },
              { title: "Đã Lưu", desc: "Món yêu thích", icon: <Heart size={24} />, link: "/saved", color: "text-pink-600", bg: "bg-pink-50", border: "border-pink-100" },
              { title: "Quản Lý", desc: "Tin của tôi", icon: <Package size={24} />, link: "/my-items", color: "text-orange-600", bg: "bg-orange-50", border: "border-orange-100" },
            ].map((action, i) => (
              <Link to={action.link} key={i} className={`group glass-panel flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl p-6 text-center transition-all hover:bg-white hover:scale-105 hover:shadow-xl`}>
                <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${action.bg} ${action.color} transition-transform group-hover:rotate-6 group-hover:scale-110 shadow-sm`}>
                  {action.icon}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">{action.title}</h3>
                  <p className="mt-1 text-[10px] font-bold tracking-wider text-slate-500 uppercase">{action.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* --- CATEGORY BAR (Sticky) --- */}
      <div className="sticky top-0 z-40 mb-12 border-y border-white/20 bg-white/70 py-4 shadow-sm backdrop-blur-xl">
        <div className="hide-scrollbar mx-auto max-w-7xl overflow-x-auto px-4">
          <div className="flex min-w-max justify-center gap-3">
            {[
              { id: "all", label: "Tất cả", icon: <Grid size={16} /> },
              { id: PostCategory.TEXTBOOK, label: "Giáo trình", icon: <BookOpen size={16} /> },
              { id: PostCategory.ELECTRONICS, label: "Công nghệ", icon: <Monitor size={16} /> },
              { id: PostCategory.SUPPLIES, label: "Dụng cụ", icon: <Calculator size={16} /> },
              { id: PostCategory.CLOTHING, label: "Đồng phục", icon: <Shirt size={16} /> },
              { id: PostCategory.OTHER, label: "Khác", icon: <MoreHorizontal size={16} /> },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setFilter((prev) => ({ ...prev, category: cat.id as any }))}
                className={Utils.cn(
                  "flex items-center gap-2 rounded-full border px-5 py-2.5 text-sm font-bold transition-all select-none active:scale-95",
                  filter.category === cat.id
                    ? "border-[#00418E] bg-[#00418E] text-white shadow-lg shadow-blue-500/20"
                    : "border-slate-200 bg-white text-slate-600 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50"
                )}
              >
                {cat.icon}
                <span>{cat.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* --- POSTS LIST --- */}
      <section className="mx-auto mb-24 min-h-[600px] max-w-7xl px-4">
        <div className="mb-10 flex flex-col items-center justify-between gap-6 md:flex-row">
          <div className="text-center md:text-left">
            <h2 className="flex items-center justify-center gap-3 text-3xl font-black text-slate-900 md:justify-start">
              <Flame className="animate-pulse fill-orange-500 text-orange-500" />{" "}
              {filter.category === "all" ? "Mới lên sàn" : "Kết quả lọc"}
            </h2>
            <p className="mt-2 text-sm font-medium text-slate-500">
              {loading ? "Đang cập nhật dữ liệu..." : `Hiển thị ${posts.length} tin đăng mới nhất.`}
            </p>
          </div>
          <div className="flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
            {[ { id: SortOption.NEWEST, label: "Mới nhất" }, { id: SortOption.PRICE_ASC, label: "Giá tốt" }, { id: SortOption.MOST_VIEWED, label: "Hot" } ].map((opt) => (
              <button
                key={opt.id}
                onClick={() => setFilter((prev) => ({ ...prev, sort: opt.id }))}
                className={Utils.cn(
                  "rounded-lg px-4 py-2 text-xs font-bold transition-all",
                  filter.sort === opt.id ? "bg-slate-900 text-white shadow-md" : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4">
          {loading ? (
            [...Array(8)].map((_, i) => (
              <div key={i} className="h-[340px] space-y-3 rounded-2xl border border-white bg-white/60 p-4 shadow-sm">
                <div className="skeleton-shimmer h-[200px] w-full rounded-xl" />
                <div className="skeleton-shimmer mt-4 h-4 w-3/4 rounded" />
                <div className="skeleton-shimmer h-4 w-1/2 rounded" />
              </div>
            ))
          ) : error ? (
            <div className="col-span-full py-20 text-center glass-panel rounded-3xl">
              <WifiOff size={40} className="mx-auto mb-4 text-red-500" />
              <p className="text-slate-500">Lỗi kết nối</p>
              <Button onClick={refetch} variant="outline" className="mt-4">Thử lại</Button>
            </div>
          ) : posts.length > 0 ? (
            posts.map((p) => (
              <div key={p.id} className="animate-enter"><PostCard post={p} /></div>
            ))
          ) : (
            <div className="col-span-full rounded-3xl border-2 border-dashed border-slate-200 bg-white/50 py-20 text-center">
              <Ghost size={48} className="mx-auto mb-4 text-slate-300" />
              <h3 className="text-xl font-bold text-slate-800">Chưa có tin đăng nào</h3>
              <Link to="/post-item"><Button icon={<PlusCircle size={18} />} className="mt-4">Đăng tin ngay</Button></Link>
            </div>
          )}
        </div>

        {posts.length > 0 && !loading && (
          <div className="mt-16 text-center">
            <Link to="/market" className="group inline-flex items-center gap-2 rounded-full border border-white bg-white/80 backdrop-blur px-10 py-4 text-base font-bold text-slate-700 shadow-md transition-all hover:border-[#00418E] hover:text-[#00418E] hover:shadow-xl hover:scale-105">
              Xem toàn bộ thị trường <ArrowRight size={20} className="transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        )}
      </section>

      {/* --- STATS SECTION --- */}
      <section className="mb-24 border-y border-white/20 bg-white/60 backdrop-blur-md py-16">
        <div className="mx-auto max-w-7xl px-4">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            {[
              { label: "Sản phẩm", val: "8.500+", icon: <Package />, color: "blue" },
              { label: "Thành viên", val: "25.000+", icon: <Users />, color: "purple" },
              { label: "Giao dịch", val: "14.200+", icon: <ShoppingBag />, color: "green" },
              { label: "Hài lòng", val: "99.9%", icon: <Smile />, color: "orange" },
            ].map((s, i) => (
              <div key={i} className="group flex cursor-default flex-col items-center text-center">
                <div className={`mb-4 flex h-16 w-16 items-center justify-center rounded-2xl transition-all duration-500 group-hover:scale-110 group-hover:rotate-12 bg-${s.color}-50 text-${s.color}-600 shadow-inner`}>
                  {s.icon}
                </div>
                <h4 className="mb-1 text-3xl font-black text-slate-900">{s.val}</h4>
                <p className="text-xs font-bold tracking-wider text-slate-400 uppercase">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --- AI BANNER --- */}
      <section className="mx-auto mb-24 max-w-7xl px-4">
        <div className="relative overflow-hidden rounded-[2.5rem] bg-[#0F172A] p-12 text-white shadow-2xl group">
          <div className="absolute top-0 right-0 -mt-20 -mr-20 h-[600px] w-[600px] rounded-full bg-blue-600/20 blur-[120px] transition-all duration-1000 group-hover:bg-purple-600/30"></div>
          <div className="relative z-10 grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 backdrop-blur px-3 py-1 text-xs font-bold tracking-wider text-blue-300 uppercase">
                <Zap size={14} className="fill-blue-300"/> Tính năng mới
              </div>
              <h2 className="text-4xl leading-tight font-black md:text-5xl">
                Đăng tin siêu tốc với <br />
                <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent animate-pulse">Công nghệ AI</span>
              </h2>
              <p className="max-w-md text-lg leading-relaxed text-slate-400">Không cần nhập liệu thủ công. Chỉ cần chụp ảnh, hệ thống sẽ tự động phân tích, điền tiêu đề, mô tả và định giá sản phẩm.</p>
              <div className="flex gap-4">
                <Button size="lg" variant="gradient" icon={<Rocket size={20} />} onClick={() => navigate("/post-item")}>Thử ngay</Button>
                <Button variant="ghost" className="text-white hover:bg-white/10" icon={<PlayCircle size={20} />}>Xem demo</Button>
              </div>
            </div>
            
            {/* AI Mockup Animation */}
            <div className="relative hidden lg:block">
              <div className="absolute inset-0 rotate-6 transform rounded-2xl bg-gradient-to-r from-blue-500 to-purple-600 opacity-30 blur-lg transition-transform group-hover:rotate-12 duration-700"></div>
              <div className="rotate-3 transform rounded-2xl border border-white/10 bg-slate-800/80 p-6 shadow-2xl backdrop-blur-xl transition-all duration-500 hover:rotate-0 hover:scale-105">
                <div className="mb-6 flex items-center gap-4 border-b border-white/10 pb-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-500 shadow-lg animate-bounce"><Sparkles size={24} /></div>
                  <div>
                    <h4 className="text-lg font-bold">AI Analysis</h4>
                    <p className="text-xs text-blue-200">Đang xử lý hình ảnh...</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex gap-3">
                    <div className="h-20 w-20 animate-pulse rounded-lg bg-slate-700"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-3/4 animate-pulse rounded bg-slate-700"></div>
                      <div className="h-4 w-1/2 animate-pulse rounded bg-slate-700"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- FOOTER --- */}
      <footer className="border-t border-slate-800 bg-[#0F172A] pt-24 pb-12 text-slate-400">
        <div className="mx-auto max-w-7xl px-4">
          <div className="mb-20 grid grid-cols-1 gap-12 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-6">
              <div className="flex items-center gap-3 text-white">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#00418E] text-xl font-black shadow-lg shadow-blue-900">BK</div>
                <div>
                  <h4 className="text-2xl font-black tracking-tight text-white">CHỢ BK</h4>
                  <p className="mt-1 text-[10px] font-bold tracking-widest text-slate-500 uppercase">Student Marketplace</p>
                </div>
              </div>
              <p className="max-w-xs text-sm leading-relaxed text-slate-400">Dự án phi lợi nhuận hỗ trợ sinh viên ĐH Bách Khoa TP.HCM.</p>
            </div>
            <div>
              <h4 className="mb-8 text-sm font-bold tracking-wider text-white uppercase">Khám phá</h4>
              <ul className="space-y-4 text-sm font-medium">
                <li><Link to="/market" className="flex items-center gap-2 transition-colors duration-200 hover:translate-x-1 hover:text-[#00B0F0]"><ChevronRight size={14} /> Dạo chợ online</Link></li>
                <li><Link to="/post-item" className="flex items-center gap-2 transition-colors duration-200 hover:translate-x-1 hover:text-[#00B0F0]"><ChevronRight size={14} /> Đăng tin bán</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="mb-8 text-sm font-bold tracking-wider text-white uppercase">Hỗ trợ</h4>
              <ul className="space-y-4 text-sm font-medium">
                <li><a href="#" className="transition-colors hover:text-[#00B0F0]">Trung tâm trợ giúp</a></li>
                <li><a href="#" className="transition-colors hover:text-[#00B0F0]">Chính sách bảo mật</a></li>
              </ul>
            </div>
            <div>
              <h4 className="mb-8 text-sm font-bold tracking-wider text-white uppercase">Liên hệ</h4>
              <ul className="space-y-5 text-sm font-medium">
                <li className="flex items-center gap-4"><Smartphone size={20} className="shrink-0 text-[#00B0F0]" /><span>(028) 3864 7256</span></li>
              </ul>
            </div>
          </div>
          <div className="flex flex-col items-center justify-between gap-4 border-t border-slate-800 pt-8 text-xs font-bold tracking-wider text-slate-500 uppercase md:flex-row">
            <p>&copy; {new Date().getFullYear()} HCMUT Student Project.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
