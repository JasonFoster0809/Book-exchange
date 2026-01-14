import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Search, ArrowRight, Zap, Users, BookOpen, Calculator, Shirt,
  Monitor, Grid, Gift, Eye, ShoppingBag, PlusCircle,
  Heart, Package, ChevronRight, Sparkles, Clock, Smile, Rocket,
  PlayCircle, Ghost, WifiOff, MoreHorizontal, Smartphone, MapPin, 
  TrendingUp, Filter, SlidersHorizontal, X, ChevronLeft, Tag,
  Bell, Menu, Star, CheckCircle, ArrowUp, Mail, Info, Shield, 
  Award, HelpCircle, ChevronDown, Activity, Quote, Calendar,
  ExternalLink, ThumbsUp, MessageCircle, Share2 // <--- ĐÃ BỔ SUNG SHARE2
} from "lucide-react";
import { supabase } from "../services/supabase";
import { Product } from "../types";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";

// ============================================================================
// 1. CONFIGURATION & CONSTANTS
// ============================================================================
const ITEMS_PER_PAGE = 12;
const SCROLL_THRESHOLD = 400;

// --- Mock Data for UI Filling ---
const TICKER_MESSAGES = [
  "🔥 Minh Tuấn (K21) vừa đăng bán sách Giải tích 1 - 50k",
  "💻 Lan Anh (K20) đang tìm mua Laptop Dell cũ giá < 5tr",
  "🛍️ Chợ BK vừa đạt mốc 10.000 giao dịch thành công!",
  "🎁 Sự kiện đổi sách cũ lấy cây xanh đang diễn ra tại H6",
  "📢 Cảnh báo: Hãy giao dịch trực tiếp để tránh lừa đảo",
];

const TESTIMONIALS = [
  {
    id: 1,
    name: "Nguyễn Văn An",
    role: "K19 - Khoa Máy Tính",
    avatar: "https://ui-avatars.com/api/?name=Nguyen+An&background=0D8ABC&color=fff",
    content: "Tìm được cuốn Giải tích 1 giá siêu rẻ, lại còn được anh khóa trên hướng dẫn tận tình cách học. 10 điểm cho cộng đồng mình!",
    rating: 5
  },
  {
    id: 2,
    name: "Trần Thị Bích",
    role: "K20 - Khoa Hóa",
    avatar: "https://ui-avatars.com/api/?name=Tran+Bich&background=E91E63&color=fff",
    content: "Giao diện đẹp, dễ dùng. Thích nhất tính năng AI scan, mình đăng bán đống sách cũ chỉ mất có 1 phút là xong.",
    rating: 5
  },
  {
    id: 3,
    name: "Lê Hoàng Nam",
    role: "K21 - Khoa Điện",
    avatar: "https://ui-avatars.com/api/?name=Hoang+Nam&background=FF9800&color=fff",
    content: "Cộng đồng uy tín, toàn sinh viên trường mình nên rất yên tâm khi giao dịch. Đã mua được cái máy tính Casio ngon lành.",
    rating: 4
  }
];

const BLOG_POSTS = [
  {
    id: 1,
    title: "Kinh nghiệm chọn Laptop cho sinh viên IT năm nhất",
    category: "Công nghệ",
    date: "12/10/2023",
    image: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&q=80&w=300",
    excerpt: "Nên chọn Mac hay Windows? RAM 8GB có đủ không? Cùng giải đáp..."
  },
  {
    id: 2,
    title: "Top 5 địa điểm học bài 'chill' nhất Bách Khoa",
    category: "Đời sống",
    date: "10/10/2023",
    image: "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&q=80&w=300",
    excerpt: "Thư viện hay quán cafe? Những góc khuất yên tĩnh bạn chưa biết."
  },
  {
    id: 3,
    title: "Bí kíp săn giáo trình cũ giá rẻ đầu kỳ",
    category: "Mẹo vặt",
    date: "08/10/2023",
    image: "https://images.unsplash.com/photo-1495446815901-a7297e633e8d?auto=format&fit=crop&q=80&w=300",
    excerpt: "Đừng vội mua sách mới. Hãy thử dạo qua Chợ BK để tiết kiệm tiền triệu."
  }
];

// ============================================================================
// 2. TYPES DEFINITIONS
// ============================================================================
enum ProductCategory {
  TEXTBOOK = "textbook",
  ELECTRONICS = "electronics",
  SUPPLIES = "supplies",
  CLOTHING = "clothing",
  OTHER = "other",
}

enum SortOption {
  NEWEST = "newest",
  PRICE_ASC = "price_asc",
  PRICE_DESC = "price_desc",
  MOST_VIEWED = "most_viewed",
}

interface FilterState {
  category: string;
  sort: SortOption;
  search: string;
  minPrice: number | "";
  maxPrice: number | "";
  condition: "all" | "new" | "used";
}

// ============================================================================
// 3. UTILITY HELPER FUNCTIONS
// ============================================================================
const Utils = {
  formatCurrency: (amount: number) => {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount);
  },
  
  timeAgo: (dateString: string) => {
    if (!dateString) return "Vừa xong";
    const now = new Date();
    const posted = new Date(dateString);
    const diff = (now.getTime() - posted.getTime()) / 1000;
    
    if (diff < 60) return "Vừa xong";
    if (diff < 3600) return Math.floor(diff / 60) + " phút trước";
    if (diff < 86400) return Math.floor(diff / 3600) + " giờ trước";
    if (diff < 2592000) return Math.floor(diff / 86400) + " ngày trước";
    return posted.toLocaleDateString('vi-VN');
  },

  cn: (...classes: (string | undefined | null | false)[]) => {
    return classes.filter(Boolean).join(" ");
  }
};

// ============================================================================
// 4. VISUAL ENGINE (ADVANCED CSS STYLES)
// ============================================================================
const GlobalStyles = () => (
  <style>{`
    :root {
      --cobalt-900: #002147;
      --cobalt-800: #003366;
      --cobalt-600: #0047AB;
      --cyan-400: #00E5FF;
      --cyan-100: #E0F7FA;
      --light-bg: #F8FAFC;
    }
    
    body {
      background-color: var(--light-bg);
      color: var(--cobalt-900);
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
      overflow-x: hidden;
    }

    /* --- Grain Effect --- */
    .grain-overlay {
      position: fixed; inset: 0; pointer-events: none; z-index: 0;
      opacity: 0.04;
      background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
    }

    /* --- Aurora Animation --- */
    .aurora-bg {
      position: fixed; top: 0; left: 0; right: 0; height: 120vh; z-index: -1;
      background: 
        radial-gradient(at 0% 0%, rgba(0, 71, 171, 0.15) 0px, transparent 50%),
        radial-gradient(at 100% 0%, rgba(0, 229, 255, 0.1) 0px, transparent 50%),
        radial-gradient(at 50% 50%, rgba(255, 255, 255, 0.8) 0px, transparent 50%);
      filter: blur(80px);
      animation: aurora 20s ease-in-out infinite alternate;
    }
    @keyframes aurora {
      0% { transform: scale(1); opacity: 0.8; }
      100% { transform: scale(1.1); opacity: 1; }
    }

    /* --- Floating Animation --- */
    @keyframes float {
      0%, 100% { transform: translateY(0) rotate(0deg); }
      50% { transform: translateY(-20px) rotate(5deg); }
    }
    .animate-float { animation: float 8s ease-in-out infinite; }
    .delay-100 { animation-delay: 1s; }
    .delay-200 { animation-delay: 2s; }
    .delay-300 { animation-delay: 3s; }

    /* --- Glassmorphism --- */
    .glass-card {
      background: rgba(255, 255, 255, 0.75);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid rgba(255, 255, 255, 0.8);
      box-shadow: 0 8px 32px 0 rgba(0, 33, 71, 0.05);
    }
    
    .glass-nav {
      background: rgba(255, 255, 255, 0.9);
      backdrop-filter: blur(12px);
      border-bottom: 1px solid rgba(255, 255, 255, 0.5);
    }

    /* --- Hover Interactions --- */
    .hover-lift { transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
    .hover-lift:hover { 
      transform: translateY(-8px) scale(1.02); 
      box-shadow: 0 20px 40px -10px rgba(0, 71, 171, 0.15); 
      border-color: #BFDBFE; 
    }

    /* --- Loading Shimmer --- */
    .shimmer { position: relative; overflow: hidden; }
    .shimmer::after {
      content: ''; position: absolute; inset: 0;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.8), transparent);
      transform: translateX(-100%);
    }
    .shimmer:hover::after { transform: translateX(100%); transition: transform 1.5s infinite; }

    /* --- Utilities --- */
    .hide-scrollbar::-webkit-scrollbar { display: none; }
    .text-gradient { 
      background: linear-gradient(to right, #0047AB, #00E5FF); 
      -webkit-background-clip: text; 
      -webkit-text-fill-color: transparent; 
    }

    /* --- Modal Animation --- */
    .modal-backdrop {
      background: rgba(0, 33, 71, 0.7);
      backdrop-filter: blur(8px);
      position: fixed; inset: 0; z-index: 100;
      display: flex; align-items: center; justify-content: center;
      animation: fadeIn 0.3s ease-out;
    }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    
    .modal-content { animation: scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
    @keyframes scaleIn { from { opacity: 0; transform: scale(0.95) translateY(20px); } to { opacity: 1; transform: scale(1) translateY(0); } }

    /* --- Ticker Animation --- */
    @keyframes ticker {
      0% { transform: translateX(100%); }
      100% { transform: translateX(-100%); }
    }
    .ticker-wrap { overflow: hidden; white-space: nowrap; }
    .ticker-move { display: inline-block; padding-left: 100%; animation: ticker 30s linear infinite; }
  `}</style>
);

// ============================================================================
// 5. CUSTOM HOOKS (BUSINESS LOGIC)
// ============================================================================

// --- Fetch Products Hook ---
function useProducts(filter: FilterState) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  // Reset when filter changes
  useEffect(() => {
    setProducts([]);
    setPage(0);
    setHasMore(true);
    setLoading(true);
    fetchData(0, true);
  }, [filter]);

  const fetchData = async (pageIdx: number, isNewFilter = false) => {
    try {
      let query = supabase.from("products").select("*", { count: 'exact' }).eq("status", "available");

      // Filter Logic
      if (filter.category !== "all") query = query.eq("category", filter.category);
      if (filter.search) query = query.ilike("title", `%${filter.search}%`);
      if (filter.minPrice !== "") query = query.gte("price", filter.minPrice);
      if (filter.maxPrice !== "") query = query.lte("price", filter.maxPrice);
      if (filter.condition !== "all") query = query.eq("condition", filter.condition);

      // Sort Logic
      switch(filter.sort) {
        case SortOption.PRICE_ASC: query = query.order("price", { ascending: true }); break;
        case SortOption.PRICE_DESC: query = query.order("price", { ascending: false }); break;
        case SortOption.MOST_VIEWED: query = query.order("view_count", { ascending: false }); break;
        default: query = query.order("created_at", { ascending: false });
      }

      // Pagination
      const from = pageIdx * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;
      
      const { data, error, count } = await query.range(from, to);
      if (error) throw error;

      if (count !== null) setTotalCount(count);
      if (data.length < ITEMS_PER_PAGE) setHasMore(false);
      
      setProducts(prev => isNewFilter ? data : [...prev, ...data]);
    } catch (err) {
      console.error("Error fetching products:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadMore = () => {
    if (!loading && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchData(nextPage);
    }
  };

  return { products, loading, hasMore, loadMore, totalCount };
}

// --- Animated Counter Hook ---
function useCounter(end: number, duration = 2000) {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    let start = 0;
    const increment = end / (duration / 16); 
    const timer = setInterval(() => {
      start += increment;
      if (start >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [end, duration]);

  return count;
}

// ============================================================================
// 6. UI SUB-COMPONENTS (Tách nhỏ để dễ quản lý)
// ============================================================================

// --- Live Ticker (Top Bar) ---
const LiveTickerBar = () => {
  return (
    <div className="bg-[#002147] text-white h-8 flex items-center overflow-hidden relative z-50">
      <div className="bg-[#0047AB] h-full px-3 flex items-center z-10 font-black text-xs uppercase tracking-wider shadow-md">
        <Activity size={14} className="mr-2 animate-pulse"/> Live Update
      </div>
      <div className="ticker-wrap flex-1">
        <div className="ticker-move text-xs font-medium">
          {TICKER_MESSAGES.map((msg, i) => (
            <span key={i} className="inline-block px-4">
              <span className="text-[#00E5FF] mr-2">●</span> {msg}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

// --- Hero Slider ---
const HeroSlider = () => {
  const [current, setCurrent] = useState(0);
  const slides = [
    { title: "Trao đổi đồ cũ", sub: "Thông minh & Tiết kiệm", desc: "Nền tảng mua bán dành riêng cho sinh viên Bách Khoa.", color: "from-[#0047AB] via-[#00E5FF] to-[#2E5AAC]" },
    { title: "Giáo trình giá rẻ", sub: "Tiếp sức mùa thi", desc: "Tìm mua sách cũ, tài liệu ôn thi với giá cực hời.", color: "from-orange-500 via-yellow-400 to-red-500" },
    { title: "Đồ công nghệ", sub: "Chính hãng sinh viên", desc: "Máy tính, phụ kiện điện tử chất lượng, giá mềm.", color: "from-purple-600 via-pink-500 to-indigo-500" },
  ];

  useEffect(() => {
    const timer = setInterval(() => setCurrent(prev => (prev + 1) % slides.length), 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative z-10 mx-auto max-w-5xl mb-12">
      <div className="flex justify-center mb-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/40 px-5 py-2 shadow-sm backdrop-blur-md animate-bounce">
          <Sparkles size={16} className="text-yellow-500 fill-yellow-500" />
          <span className="text-xs font-bold uppercase tracking-widest text-[#002147]">Cổng thông tin Sinh viên</span>
        </div>
      </div>
      <div className="grid grid-cols-1 relative min-h-[220px]">
        {slides.map((slide, idx) => (
          <div key={idx} className={`col-start-1 row-start-1 transition-all duration-700 flex flex-col items-center pb-8 ${idx === current ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
            <h1 className="text-5xl md:text-7xl font-black tracking-tight text-[#002147] mb-6 text-center leading-tight drop-shadow-sm">
              {slide.title} <br />
              <span className={`bg-gradient-to-r ${slide.color} bg-clip-text text-transparent`}>{slide.sub}</span>
            </h1>
            <p className="text-lg text-slate-600 max-w-2xl text-center leading-relaxed font-medium">{slide.desc}</p>
          </div>
        ))}
      </div>
      <div className="flex justify-center gap-2 mt-4">
        {slides.map((_, idx) => (
          <button key={idx} onClick={() => setCurrent(idx)} className={`h
