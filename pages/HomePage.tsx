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
} from "lucide-react";
import { supabase } from "../services/supabase";

type ID = string | number;
type Timestamp = string;

// Enum khớp với SQL Schema mới
enum ProductCategory {
  TEXTBOOK = "Textbook",
  ELECTRONICS = "Electronics",
  SUPPLIES = "School Supplies",
  CLOTHING = "Uniforms/Clothing",
  OTHER = "Other",
}

// Update Enum Status theo SQL (approved, pending_approval...)
enum PostStatus {
  PENDING = "pending_approval",
  APPROVED = "approved",
  REJECTED = "rejected",
  ARCHIVED = "archived",
  RESERVED = "reserved",
  SOLD = "sold",
}

enum SortOption {
  NEWEST = "newest",
  OLDEST = "oldest",
  PRICE_ASC = "price_asc",
  PRICE_DESC = "price_desc",
  MOST_VIEWED = "most_viewed",
}

// Interface Product mapping với bảng 'posts'
interface Product {
  id: ID;
  created_at: Timestamp;
  title: string;
  description: string;
  price: number;
  images: string[]; // Sẽ map từ bảng post_images
  category: string;
  status: string;
  owner_id: ID; // Đổi seller_id -> owner_id
  view_count: number;
  condition: string;
  tags: string[];
  trade_type: "sell" | "swap" | "free"; // Thêm trade_type từ SQL
  location?: string; // SQL column: location
  published_at?: string; // SQL column: published_at
}

interface FilterState {
  category: string | "all";
  sort: SortOption;
  search: string;
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger" | "success";
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: "left" | "right";
  fullWidth?: boolean;
}

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

const GlobalStyles = () => (
  <style>{`
    :root { --primary: #00418E; --secondary: #00B0F0; --light: #F8FAFC; }
    body { background-color: var(--light); color: #1E293B; font-family: 'Inter', system-ui, sans-serif; overflow-x: hidden; }
    ::-webkit-scrollbar { width: 8px; } ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: #CBD5E1; border-radius: 10px; }
    @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
    .animate-enter { animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; opacity: 0; }
    .glass-card-hover:hover { transform: translateY(-4px); box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1); border-color: var(--secondary); }
    .skeleton-shimmer { background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; }
    @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
  `}</style>
);

const ParticleCanvas = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let width = window.innerWidth;
    let height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
    const particles = Array.from({ length: 40 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      size: Math.random() * 3 + 1,
      color: ["rgba(0, 65, 142, 0.1)", "rgba(0, 176, 240, 0.1)"][
        Math.floor(Math.random() * 2)
      ],
    }));
    const animate = () => {
      ctx.clearRect(0, 0, width, height);
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
      });
      requestAnimationFrame(animate);
    };
    animate();
    const handleResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 z-0"
    />
  );
};

// --- HOOK FETCH SẢN PHẨM MỚI (UPDATE CHO TABLE POSTS) ---
function useProducts(filter: FilterState) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Query bảng 'posts' và join 'post_images'
      let query = supabase
        .from("posts")
        .select("*, post_images(path)") 
        .eq("status", "approved") // Chỉ lấy bài đã duyệt
        .eq("campus", "CS1"); // Mặc định CS1 theo logic SQL mới

      if (filter.category !== "all") {
        query = query.eq("category", filter.category);
      }
        
      if (filter.search) {
        query = query.ilike("title", `%${filter.search}%`);
      }

      // Sort logic
      if (filter.sort === SortOption.NEWEST)
        query = query.order("published_at", { ascending: false }); // SQL dùng published_at
      else if (filter.sort === SortOption.PRICE_ASC)
        query = query.order("price", { ascending: true });
      else if (filter.sort === SortOption.PRICE_DESC)
        query = query.order("price", { ascending: false });
      else if (filter.sort === SortOption.MOST_VIEWED)
        query = query.order("view_count", { ascending: false });

      const { data, error: dbError } = await query.limit(12);
      if (dbError) throw dbError;

      // Transform Data: Map cấu trúc SQL về cấu trúc UI
      setProducts(
        (data || []).map((p: any) => ({
          ...p,
          // Lấy ảnh từ bảng quan hệ post_images, sắp xếp theo sort_order nếu cần
          images: p.post_images 
            ? p.post_images.map((img: any) => img.path)
            : [],
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

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);
  return { products, loading, error, refetch: fetchProducts };
}

const Button: React.FC<ButtonProps> = ({
  variant = "primary",
  size = "md",
  loading,
  icon,
  iconPosition = "left",
  fullWidth,
  children,
  className,
  disabled,
  ...props
}) => {
  const baseStyle =
    "inline-flex items-center justify-center font-bold rounded-xl transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:pointer-events-none focus:outline-none focus:ring-2 focus:ring-offset-2";
  const variants = {
    primary:
      "bg-[#00418E] text-white hover:bg-[#003370] shadow-lg shadow-blue-900/20",
    secondary:
      "bg-[#00B0F0] text-white hover:bg-[#0090C0] shadow-lg shadow-cyan-500/20",
    outline:
      "border-2 border-slate-200 bg-white text-slate-700 hover:border-[#00418E] hover:text-[#00418E]",
    ghost: "bg-transparent text-slate-500 hover:bg-slate-100",
    danger: "bg-red-500 text-white hover:bg-red-600",
    success: "bg-green-500 text-white hover:bg-green-600",
  };
  const sizes = {
    xs: "px-2.5 py-1 text-xs",
    sm: "px-3 py-1.5 text-xs",
    md: "px-5 py-2.5 text-sm",
    lg: "px-8 py-3.5 text-base",
    xl: "px-10 py-4 text-lg",
  };

  return (
    <button
      className={Utils.cn(
        baseStyle,
        variants[variant],
        sizes[size],
        fullWidth ? "w-full" : "",
        className,
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <RefreshCw className="mr-2 animate-spin" size={16} />}
      {!loading && icon && iconPosition === "left" && (
        <span className="mr-2">{icon}</span>
      )}
      {children}
      {!loading && icon && iconPosition === "right" && (
        <span className="ml-2">{icon}</span>
      )}
    </button>
  );
};

const ProductCard: React.FC<{ product: Product }> = ({ product }) => {
  const navigate = useNavigate();
  const [imageLoaded, setImageLoaded] = useState(false);
  const displayImage =
    product.images && product.images.length > 0
      ? product.images[0]
      : "https://placehold.co/400x300?text=No+Image";

  // Map category code to label Vietnamese
  const categoryLabels: Record<string, string> = {
    [ProductCategory.TEXTBOOK]: "Giáo trình",
    [ProductCategory.ELECTRONICS]: "Điện tử",
    [ProductCategory.SUPPLIES]: "Dụng cụ",
    [ProductCategory.CLOTHING]: "Thời trang",
    [ProductCategory.OTHER]: "Khác",
  };

  const displayCategory = categoryLabels[product.category] || product.category;

  return (
    <div
      onClick={() => navigate(`/product/${product.id}`)}
      className="glass-card-hover group relative flex h-full cursor-pointer flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white transition-all duration-300"
    >
      <div className="relative aspect-4/3 overflow-hidden bg-slate-100">
        {!imageLoaded && (
          <div className="skeleton-shimmer absolute inset-0 h-full w-full" />
        )}
        <img
          src={displayImage}
          alt={product.title}
          className={Utils.cn(
            "h-full w-full object-cover transition-transform duration-700 group-hover:scale-110",
            imageLoaded ? "opacity-100" : "opacity-0",
          )}
          onLoad={() => setImageLoaded(true)}
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              "https://placehold.co/400x300?text=Error";
            setImageLoaded(true);
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        <div className="absolute top-3 left-3 flex flex-col gap-1">
          {/* Logic hiển thị Badge dựa trên trade_type và price */}
          {(product.price === 0 || product.trade_type === 'free') && (
            <span className="flex items-center gap-1 rounded bg-red-500 px-2 py-1 text-[10px] font-bold text-white shadow-lg">
              <Gift size={10} /> FREE
            </span>
          )}
          {product.trade_type === 'swap' && (
            <span className="flex items-center gap-1 rounded bg-purple-500 px-2 py-1 text-[10px] font-bold text-white shadow-lg">
              <RefreshCw size={10} /> SWAP
            </span>
          )}
          {product.condition === "Brand New" && (
            <span className="rounded bg-green-500 px-2 py-1 text-[10px] font-bold text-white shadow-lg">
              NEW
            </span>
          )}
        </div>
        <button className="absolute right-3 bottom-3 translate-y-10 rounded-full bg-white p-2.5 text-[#00418E] opacity-0 shadow-lg transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 hover:bg-[#00418E] hover:text-white">
          <ArrowRight size={18} />
        </button>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <div className="mb-2 flex items-start justify-between">
          <span className="max-w-[60%] truncate rounded border border-blue-100 bg-blue-50 px-2 py-0.5 text-[10px] font-bold tracking-wider text-[#00418E] uppercase">
            {displayCategory}
          </span>
          <span className="flex items-center gap-1 text-[10px] whitespace-nowrap text-slate-400">
            <Clock size={10} />{" "}
            {Utils.timeAgo(product.published_at || product.created_at)}
          </span>
        </div>
        <h3 className="mb-1 line-clamp-2 min-h-[40px] text-sm leading-relaxed font-bold text-slate-800 transition-colors group-hover:text-[#00418E]">
          {product.title}
        </h3>
        <div className="mt-auto flex items-center justify-between border-t border-slate-50 pt-3">
          <span className="text-lg font-black tracking-tight text-slate-900">
            {product.trade_type === 'free' || product.price === 0
              ? "Tặng miễn phí"
              : product.trade_type === 'swap' 
                ? "Trao đổi"
                : Utils.formatCurrency(product.price)}
          </span>
          <div className="flex items-center gap-1 text-xs text-slate-400">
            <Eye size={12} /> {product.view_count || 0}
          </div>
        </div>
      </div>
    </div>
  );
};

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<FilterState>({
    category: "all",
    sort: SortOption.NEWEST,
    search: "",
  });
  const { products, loading, error, refetch } = useProducts(filter);
  const handleSearch = (term: string) => {
    if (term.trim()) navigate(`/market?search=${encodeURIComponent(term)}`);
  };

  return (
    <div className="relative min-h-screen font-sans selection:bg-[#00418E] selection:text-white">
      <GlobalStyles />
      <ParticleCanvas />
      <div className="aurora-bg bg-radial-gradient pointer-events-none absolute top-0 left-0 -z-10 h-[120vh] w-full from-blue-500/5 to-transparent"></div>

      <section className="relative overflow-hidden px-4 pt-32 pb-20">
        <div className="relative z-10 mx-auto max-w-5xl text-center">
          <div className="animate-enter mb-8 flex justify-center">
            <div className="inline-flex cursor-default items-center gap-2 rounded-full border border-white/50 bg-white/80 px-4 py-1.5 shadow-sm ring-1 ring-white/60 backdrop-blur-sm transition-shadow hover:shadow-md">
              <Sparkles
                size={14}
                className="animate-pulse fill-yellow-500 text-yellow-500"
              />
              <span className="text-xs font-bold tracking-widest text-slate-600 uppercase">
                Cổng thông tin Sinh viên Bách Khoa
              </span>
            </div>
          </div>
          <h1 className="animate-enter mb-6 text-5xl leading-[1.1] font-black tracking-tight text-slate-900 drop-shadow-sm md:text-7xl">
            Trao đổi đồ cũ <br />
            <span className="bg-gradient-to-r from-[#00418E] via-[#00B0F0] to-purple-600 bg-clip-text text-transparent">
              Thông minh & Tiết kiệm
            </span>
          </h1>
          <p className="animate-enter mx-auto mb-12 max-w-2xl text-lg leading-relaxed font-medium text-slate-500 md:text-xl">
            Nền tảng mua bán phi lợi nhuận dành riêng cho sinh viên. Tìm giáo
            trình, laptop, và dụng cụ học tập giá rẻ ngay tại trường.
          </p>
          <div className="animate-enter group relative z-20 mx-auto mb-16 w-full max-w-2xl">
            <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-[#00418E] to-[#00B0F0] opacity-20 blur transition duration-1000 group-hover:opacity-40"></div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSearch((e.target as any)[0].value);
              }}
              className="relative flex items-center rounded-full border border-slate-200 bg-white p-2 shadow-xl transition-all hover:shadow-2xl"
            >
              <Search className="ml-4 text-slate-400" size={20} />
              <input
                placeholder="Bạn đang tìm gì? (VD: Giải tích 1, Casio 580...)"
                className="h-12 w-full border-none bg-transparent px-4 text-base font-medium text-slate-900 placeholder-slate-400 outline-none"
              />
              <button
                type="submit"
                className="flex h-10 w-25 items-center justify-center gap-2 rounded-full bg-[#00418E] px-2 shadow-md transition-all hover:bg-[#003370] active:scale-95"
              >
                <p className="text-xs font-bold text-white">Tìm kiếm</p>
              </button>
            </form>
          </div>
          <div className="animate-enter grid grid-cols-2 gap-4 px-4 md:grid-cols-4">
            {[
              {
                title: "Dạo Chợ",
                desc: "Săn deal hời",
                icon: <ShoppingBag size={24} />,
                link: "/market",
                color: "text-cyan-600",
                bg: "bg-cyan-50",
                border: "border-cyan-100",
              },
              {
                title: "Đăng Tin",
                desc: "Bán nhanh gọn",
                icon: <PlusCircle size={24} />,
                link: "/post-item",
                color: "text-purple-600",
                bg: "bg-purple-50",
                border: "border-purple-100",
              },
              {
                title: "Đã Lưu",
                desc: "Món yêu thích",
                icon: <Heart size={24} />,
                link: "/saved",
                color: "text-pink-600",
                bg: "bg-pink-50",
                border: "border-pink-100",
              },
              {
                title: "Quản Lý",
                desc: "Tin của tôi",
                icon: <Package size={24} />,
                link: "/my-items",
                color: "text-orange-600",
                bg: "bg-orange-50",
                border: "border-orange-100",
              },
            ].map((action, i) => (
              <Link
                to={action.link}
                key={i}
                className={`group flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border bg-white p-5 text-center shadow-sm transition-all hover:border-slate-300 hover:shadow-lg ${action.border}`}
              >
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-xl ${action.bg} ${action.color} transition-transform group-hover:scale-110`}
                >
                  {action.icon}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {action.title}
                  </h3>
                  <p className="mt-0.5 text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                    {action.desc}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <div className="sticky top-0 z-40 mb-12 border-y border-slate-200 bg-[#F8FAFC]/90 py-3 shadow-sm backdrop-blur-md">
        <div className="hide-scrollbar mx-auto max-w-7xl overflow-x-auto px-4">
          <div className="flex min-w-max justify-center gap-3">
            {[
              { id: "all", label: "Tất cả", icon: <Grid size={16} /> },
              {
                id: ProductCategory.TEXTBOOK,
                label: "Giáo trình",
                icon: <BookOpen size={16} />,
              },
              {
                id: ProductCategory.ELECTRONICS,
                label: "Công nghệ",
                icon: <Monitor size={16} />,
              },
              {
                id: ProductCategory.SUPPLIES,
                label: "Dụng cụ",
                icon: <Calculator size={16} />,
              },
              {
                id: ProductCategory.CLOTHING,
                label: "Đồng phục",
                icon: <Shirt size={16} />,
              },
              {
                id: ProductCategory.OTHER,
                label: "Khác",
                icon: <MoreHorizontal size={16} />,
              },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() =>
                  setFilter((prev) => ({ ...prev, category: cat.id as any }))
                }
                className={Utils.cn(
                  "flex items-center gap-2 rounded-full border px-5 py-2.5 text-sm font-bold transition-all select-none active:scale-95",
                  filter.category === cat.id
                    ? "border-[#00418E] bg-[#00418E] text-white shadow-md"
                    : "border-slate-200 bg-white text-slate-600 hover:border-blue-400 hover:text-blue-600",
                )}
              >
                {cat.icon}
                <span>{cat.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <section className="mx-auto mb-24 min-h-[600px] max-w-7xl px-4">
        <div className="mb-10 flex flex-col items-center justify-between gap-6 md:flex-row">
          <div className="text-center md:text-left">
            <h2 className="flex items-center justify-center gap-3 text-3xl font-black text-slate-900 md:justify-start">
              <Flame className="animate-pulse fill-orange-500 text-orange-500" />{" "}
              {filter.category === "all" ? "Mới lên sàn" : "Kết quả lọc"}
            </h2>
            <p className="mt-1 text-sm font-medium text-slate-500">
              {loading
                ? "Đang cập nhật dữ liệu..."
                : `Hiển thị ${products.length} sản phẩm mới nhất.`}
            </p>
          </div>
          <div className="flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
            {[
              { id: SortOption.NEWEST, label: "Mới nhất" },
              { id: SortOption.PRICE_ASC, label: "Giá tốt" },
              { id: SortOption.MOST_VIEWED, label: "Hot" },
            ].map((opt) => (
              <button
                key={opt.id}
                onClick={() => setFilter((prev) => ({ ...prev, sort: opt.id }))}
                className={Utils.cn(
                  "rounded-lg px-4 py-2 text-xs font-bold transition-all",
                  filter.sort === opt.id
                    ? "bg-slate-900 text-white shadow-md"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-700",
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
              <div
                key={i}
                className="h-[340px] space-y-3 rounded-2xl border border-slate-100 bg-white p-4"
              >
                <div className="skeleton-shimmer h-[200px] w-full rounded-xl" />
                <div className="skeleton-shimmer mt-4 h-4 w-3/4 rounded" />
                <div className="skeleton-shimmer h-4 w-1/2 rounded" />
              </div>
            ))
          ) : error ? (
            <div className="col-span-full py-20 text-center">
              <WifiOff size={40} className="mx-auto mb-4 text-red-500" />
              <p className="text-slate-500">Lỗi kết nối</p>
              <Button onClick={refetch} variant="outline" className="mt-4">
                Thử lại
              </Button>
            </div>
          ) : products.length > 0 ? (
            products.map((p) => (
              <div key={p.id} className="animate-enter">
                <ProductCard product={p} />
              </div>
            ))
          ) : (
            <div className="col-span-full rounded-3xl border-2 border-dashed border-slate-200 py-20 text-center">
              <Ghost size={48} className="mx-auto mb-4 text-slate-300" />
              <h3 className="text-xl font-bold text-slate-800">
                Chưa có sản phẩm
              </h3>
              <Link to="/post-item">
                <Button icon={<PlusCircle size={18} />} className="mt-4">
                  Đăng tin ngay
                </Button>
              </Link>
            </div>
          )}
        </div>
        {products.length > 0 && !loading && (
          <div className="mt-16 text-center">
            <Link
              to="/market"
              className="group inline-flex items-center gap-2 rounded-full border-2 border-slate-200 bg-white px-10 py-4 text-base font-bold text-slate-700 shadow-sm transition-all hover:border-[#00418E] hover:text-[#00418E] hover:shadow-xl"
            >
              Xem toàn bộ thị trường{" "}
              <ArrowRight
                size={20}
                className="transition-transform group-hover:translate-x-1"
              />
            </Link>
          </div>
        )}
      </section>

      <section className="mb-24 border-y border-slate-200 bg-white py-16">
        <div className="mx-auto max-w-7xl px-4">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            {[
              {
                label: "Sản phẩm",
                val: "8.500+",
                icon: <Package />,
                color: "blue",
              },
              {
                label: "Thành viên",
                val: "25.000+",
                icon: <Users />,
                color: "purple",
              },
              {
                label: "Giao dịch",
                val: "14.200+",
                icon: <ShoppingBag />,
                color: "green",
              },
              {
                label: "Hài lòng",
                val: "99.9%",
                icon: <Smile />,
                color: "orange",
              },
            ].map((s, i) => (
              <div
                key={i}
                className="group flex cursor-default flex-col items-center text-center"
              >
                <div
                  className={`mb-3 flex h-14 w-14 items-center justify-center rounded-2xl transition-transform group-hover:scale-110 bg-${s.color}-50 text-${s.color}-600`}
                >
                  {s.icon}
                </div>
                <h4 className="mb-1 text-3xl font-black text-slate-900">
                  {s.val}
                </h4>
                <p className="text-xs font-bold tracking-wider text-slate-400 uppercase">
                  {s.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto mb-24 max-w-7xl px-4">
        <div className="relative overflow-hidden rounded-[2.5rem] bg-[#0F172A] p-12 text-white shadow-2xl">
          <div className="absolute top-0 right-0 -mt-20 -mr-20 h-[600px] w-[600px] rounded-full bg-blue-600/20 blur-[120px]"></div>
          <div className="relative z-10 grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 rounded-lg border border-blue-500/30 bg-blue-500/20 px-3 py-1 text-xs font-bold tracking-wider text-blue-300 uppercase">
                <Zap size={14} /> Tính năng mới
              </div>
              <h2 className="text-4xl leading-tight font-black md:text-5xl">
                Đăng tin siêu tốc với <br />
                <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                  Công nghệ AI
                </span>
              </h2>
              <p className="max-w-md text-lg leading-relaxed text-slate-400">
                Không cần nhập liệu thủ công. Chỉ cần chụp ảnh, hệ thống sẽ tự
                động phân tích, điền tiêu đề, mô tả và định giá sản phẩm cho bạn
                trong 3 giây.
              </p>
              <div className="flex gap-4">
                <Button
                  size="lg"
                  icon={<Rocket size={20} />}
                  onClick={() => navigate("/post-item")}
                >
                  Thử ngay
                </Button>
                <Button
                  variant="ghost"
                  className="text-white hover:bg-white/10"
                  icon={<PlayCircle size={20} />}
                >
                  Xem demo
                </Button>
              </div>
            </div>
            <div className="relative hidden lg:block">
              <div className="absolute inset-0 rotate-6 transform rounded-2xl bg-gradient-to-r from-blue-500 to-purple-600 opacity-30 blur-lg"></div>
              <div className="rotate-3 transform rounded-2xl border border-white/10 bg-slate-800/50 p-6 shadow-2xl backdrop-blur-xl transition-transform duration-500 hover:rotate-0">
                <div className="mb-6 flex items-center gap-4 border-b border-white/10 pb-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-500 shadow-lg">
                    <Sparkles size={24} />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold">AI Analysis</h4>
                    <p className="text-xs text-blue-200">
                      Đang xử lý hình ảnh...
                    </p>
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

      <footer className="border-t border-slate-800 bg-[#0F172A] pt-24 pb-12 text-slate-400">
        <div className="mx-auto max-w-7xl px-4">
          <div className="mb-20 grid grid-cols-1 gap-12 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-6">
              <div className="flex items-center gap-3 text-white">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#00418E] text-xl font-black shadow-lg shadow-blue-900">
                  BK
                </div>
                <div>
                  <h4 className="text-2xl font-black tracking-tight text-white">
                    CHỢ BK
                  </h4>
                  <p className="mt-1 text-[10px] font-bold tracking-widest text-slate-500 uppercase">
                    Student Marketplace
                  </p>
                </div>
              </div>
              <p className="max-w-xs text-sm leading-relaxed text-slate-400">
                Dự án phi lợi nhuận hỗ trợ sinh viên ĐH Bách Khoa TP.HCM.
              </p>
            </div>
            <div>
              <h4 className="mb-8 text-sm font-bold tracking-wider text-white uppercase">
                Khám phá
              </h4>
              <ul className="space-y-4 text-sm font-medium">
                <li>
                  <Link
                    to="/market"
                    className="flex items-center gap-2 transition-colors duration-200 hover:translate-x-1 hover:text-[#00B0F0]"
                  >
                    <ChevronRight size={14} /> Dạo chợ online
                  </Link>
                </li>
                <li>
                  <Link
                    to="/post-item"
                    className="flex items-center gap-2 transition-colors duration-200 hover:translate-x-1 hover:text-[#00B0F0]"
                  >
                    <ChevronRight size={14} /> Đăng tin bán
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="mb-8 text-sm font-bold tracking-wider text-white uppercase">
                Hỗ trợ
              </h4>
              <ul className="space-y-4 text-sm font-medium">
                <li>
                  <a
                    href="#"
                    className="transition-colors hover:text-[#00B0F0]"
                  >
                    Trung tâm trợ giúp
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="transition-colors hover:text-[#00B0F0]"
                  >
                    Chính sách bảo mật
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="mb-8 text-sm font-bold tracking-wider text-white uppercase">
                Liên hệ
              </h4>
              <ul className="space-y-5 text-sm font-medium">
                <li className="flex items-center gap-4">
                  <Smartphone size={20} className="shrink-0 text-[#00B0F0]" />
                  <span>(028) 3864 7256</span>
                </li>
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
