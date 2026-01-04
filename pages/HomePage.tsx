import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Search, Sparkles, ArrowRight, Zap, ShieldCheck, Users, 
  BookOpen, Calculator, Shirt, Plug, ChevronDown, Monitor, 
  Code, Cpu, GraduationCap, Terminal, Star, Quote, 
  HelpCircle, ChevronRight, ChevronLeft, Bell, MapPin, 
  CheckCircle2, Play, Pause, TrendingUp, Flame, Gift,
  Smartphone, MousePointer, Award, Clock, Heart, 
  Share2, MessageCircle, AlertTriangle, Eye, RefreshCw,
  Facebook, Instagram, Youtube, Twitter, Mail, Phone
} from 'lucide-react';
import { supabase } from '../services/supabase';
import { Product } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';

// ============================================================================
// 1. CONFIGURATION & TYPES DEFINITION
// ============================================================================

/** * Design System Constants 
 * Hệ thống màu sắc và cấu hình animation chuẩn BK Premium
 */
const CONFIG = {
  colors: {
    primary: '#00418E', // BK Blue
    secondary: '#00B0F0', // Light Blue
    accent: '#FFD700', // Gold
    danger: '#EF4444',
    success: '#10B981',
    dark: '#0F172A',
    light: '#F8FAFC',
    glass: 'rgba(255, 255, 255, 0.8)',
  },
  animation: {
    slow: '1000ms',
    medium: '500ms',
    fast: '300ms',
    bezier: 'cubic-bezier(0.4, 0, 0.2, 1)',
  }
};

// Interface mở rộng cho hiển thị phức tạp
interface ExtendedProduct extends Product {
  badge?: 'Hot' | 'New' | 'Sale' | null;
  likes: number;
  isVerifiedStore: boolean;
  distance?: string;
  responseRate?: string;
}

interface NavItem {
  label: string;
  href: string;
  icon?: React.ReactNode;
  active?: boolean;
}

interface StatItem {
  id: string;
  value: number;
  suffix: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

// ============================================================================
// 2. MOCK DATA GENERATOR (RICH DATA)
// ============================================================================

const TRENDING_SEARCHES = [
  "Giải tích 1", "Đại số tuyến tính", "Casio 580VNX", 
  "Áo khoác BK", "Chuột Logitech", "Bàn phím cơ", 
  "Giáo trình Triết", "Quạt máy cũ", "Tủ vải", "Tai nghe Sony"
];

const CATEGORIES_DETAILED = [
  { 
    id: 'giao-trinh', 
    name: 'Tài liệu học tập', 
    sub: 'Giáo trình, Slide, Đề thi', 
    icon: <BookOpen size={28} />, 
    color: 'from-blue-500 to-cyan-500',
    bg: 'bg-blue-50',
    text: 'text-blue-600',
    count: 2450 
  },
  { 
    id: 'cong-nghe', 
    name: 'Đồ công nghệ', 
    sub: 'Laptop, Điện thoại, Phụ kiện', 
    icon: <Cpu size={28} />, 
    color: 'from-indigo-500 to-purple-500',
    bg: 'bg-indigo-50',
    text: 'text-indigo-600',
    count: 1280 
  },
  { 
    id: 'dung-cu', 
    name: 'Dụng cụ & VP phẩm', 
    icon: <Calculator size={28} />, 
    sub: 'Máy tính, Thước, Bảng vẽ', 
    color: 'from-emerald-500 to-teal-500',
    bg: 'bg-emerald-50',
    text: 'text-emerald-600',
    count: 850 
  },
  { 
    id: 'thoi-trang', 
    name: 'Thời trang BK', 
    sub: 'Đồng phục, Balo, Áo khoa', 
    icon: <Shirt size={28} />, 
    color: 'from-orange-500 to-red-500',
    bg: 'bg-orange-50',
    text: 'text-orange-600',
    count: 420 
  },
  { 
    id: 'gia-dung', 
    name: 'Đồ gia dụng KTX', 
    sub: 'Quạt, Ổ cắm, Kệ sách', 
    icon: <Plug size={28} />, 
    color: 'from-pink-500 to-rose-500',
    bg: 'bg-pink-50',
    text: 'text-pink-600',
    count: 630 
  },
  { 
    id: 'xe-co', 
    name: 'Phương tiện', 
    sub: 'Xe đạp, Xe máy, Phụ tùng', 
    icon: <MapPin size={28} />, 
    color: 'from-gray-600 to-gray-800',
    bg: 'bg-gray-100',
    text: 'text-gray-700',
    count: 150 
  }
];

const HERO_SLIDES = [
  {
    id: 1,
    title: "Chào tân sinh viên K24",
    subtitle: "Combo giáo trình đại cương giá siêu hời",
    cta: "Săn ngay",
    image: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&q=80&w=2000",
    color: "bg-[#00418E]"
  },
  {
    id: 2,
    title: "Thanh lý đồ công nghệ",
    subtitle: "Laptop, chuột, phím cơ giảm tới 50%",
    cta: "Xem chi tiết",
    image: "https://images.unsplash.com/photo-1593640408182-31c70c8268f5?auto=format&fit=crop&q=80&w=2000",
    color: "bg-indigo-600"
  },
  {
    id: 3,
    title: "Góc 0 Đồng - Lan tỏa yêu thương",
    subtitle: "Tặng đồ cũ cho các bạn sinh viên khó khăn",
    cta: "Tham gia ngay",
    image: "https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?auto=format&fit=crop&q=80&w=2000",
    color: "bg-emerald-600"
  }
];

// ============================================================================
// 3. UTILITY HOOKS (ANIMATION & LOGIC)
// ============================================================================

/**
 * Hook xử lý hiệu ứng gõ chữ (Typewriter Effect)
 */
const useTypewriter = (words: string[], speed = 150, pause = 2000) => {
  const [index, setIndex] = useState(0);
  const [subIndex, setSubIndex] = useState(0);
  const [reverse, setReverse] = useState(false);
  const [blink, setBlink] = useState(true);

  useEffect(() => {
    if (subIndex === words[index].length + 1 && !reverse) {
      setTimeout(() => setReverse(true), pause);
      return;
    }
    if (subIndex === 0 && reverse) {
      setReverse(false);
      setIndex((prev) => (prev + 1) % words.length);
      return;
    }

    const timeout = setTimeout(() => {
      setSubIndex((prev) => prev + (reverse ? -1 : 1));
    }, Math.max(reverse ? 75 : speed, parseInt(String(Math.random() * 50))));

    return () => clearTimeout(timeout);
  }, [subIndex, index, reverse, words, speed, pause]);

  useEffect(() => {
    const timeout = setTimeout(() => setBlink((prev) => !prev), 500);
    return () => clearTimeout(timeout);
  }, [blink]);

  return `${words[index].substring(0, subIndex)}${blink ? "|" : " "}`;
};

/**
 * Hook xử lý Parallax Effect khi di chuột
 */
const useParallax = (strength: number = 20) => {
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const { clientX, clientY } = e;
    const x = (clientX - window.innerWidth / 2) / strength;
    const y = (clientY - window.innerHeight / 2) / strength;
    setPosition({ x, y });
  }, [strength]);

  return { position, handleMouseMove };
};

// ============================================================================
// 4. COMPLEX SUB-COMPONENTS (PART 1)
// ============================================================================

/**
 * 4.1 Animated Background Blob
 * Tạo các khối màu trôi nổi phía sau
 */
const BackgroundBlobs = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
    <div className="absolute top-[-10%] right-[-10%] w-[800px] h-[800px] rounded-full bg-gradient-to-br from-blue-400/20 to-purple-400/20 blur-[100px] animate-blob"></div>
    <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] rounded-full bg-gradient-to-tr from-cyan-400/20 to-teal-400/20 blur-[80px] animate-blob animation-delay-2000"></div>
    <div className="absolute top-[40%] left-[30%] w-[400px] h-[400px] rounded-full bg-gradient-to-r from-yellow-400/10 to-orange-400/10 blur-[60px] animate-blob animation-delay-4000"></div>
  </div>
);

/**
 * 4.2 Modern Search Bar
 * Thanh tìm kiếm với hiệu ứng Glassmorphism và Dropdown gợi ý
 */
const ModernSearchBar = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const placeholderText = useTypewriter([
    "Tìm kiếm 'Giáo trình Giải tích 1'...",
    "Tìm kiếm 'Máy tính Casio 580'...",
    "Tìm kiếm 'Quạt máy cũ'...",
    "Tìm kiếm 'Laptop Dell XPS'..."
  ]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/market?search=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <div className="relative z-20 w-full max-w-3xl mx-auto group">
      {/* Glow Effect */}
      <div className={`absolute -inset-1 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 rounded-full blur opacity-25 group-hover:opacity-75 transition duration-1000 group-hover:duration-200 ${isFocused ? 'opacity-100' : ''}`}></div>
      
      <form 
        onSubmit={handleSearch}
        className="relative flex items-center bg-white/90 backdrop-blur-xl rounded-full shadow-2xl transition-all duration-300 transform hover:scale-[1.01]"
      >
        {/* Category Dropdown Trigger */}
        <div className="hidden md:flex items-center pl-6 pr-4 border-r border-gray-200 cursor-pointer hover:bg-gray-50/50 h-full rounded-l-full transition-colors">
          <span className="text-sm font-bold text-gray-600 mr-2">Tất cả</span>
          <ChevronDown size={14} className="text-gray-400" />
        </div>

        {/* Input Area */}
        <div className="flex-1 relative">
          <input 
            type="text" 
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setTimeout(() => setIsFocused(false), 200)}
            className="w-full h-16 pl-6 pr-12 bg-transparent border-none outline-none text-lg text-gray-800 font-medium placeholder-transparent"
            placeholder="Search..."
          />
          {!query && (
            <div className="absolute left-6 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 text-lg">
              {placeholderText}
            </div>
          )}
        </div>

        {/* Search Button */}
        <div className="pr-2">
          <button 
            type="submit"
            className="h-12 w-12 md:w-auto md:px-8 bg-[#00418E] hover:bg-[#003370] text-white rounded-full flex items-center justify-center gap-2 transition-all duration-300 shadow-lg hover:shadow-blue-500/30 active:scale-95"
          >
            <Search size={20} />
            <span className="hidden md:inline font-bold">Tìm kiếm</span>
          </button>
        </div>
      </form>

      {/* Quick Suggestions Dropdown (Only shows when focused) */}
      {isFocused && (
        <div className="absolute top-full left-0 right-0 mt-4 bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-gray-100 p-6 animate-in fade-in slide-in-from-top-4 duration-200 origin-top">
          <div className="flex items-center gap-2 mb-4 text-xs font-bold text-gray-400 uppercase tracking-widest">
            <TrendingUp size={14} /> Xu hướng tìm kiếm
          </div>
          <div className="flex flex-wrap gap-3">
            {TRENDING_SEARCHES.map((item, idx) => (
              <button 
                key={idx}
                onMouseDown={() => {
                  setQuery(item);
                  navigate(`/market?search=${encodeURIComponent(item)}`);
                }}
                className="px-4 py-2 bg-gray-50 hover:bg-blue-50 text-gray-600 hover:text-[#00418E] rounded-xl text-sm font-medium transition-all flex items-center gap-2 group"
              >
                <Search size={14} className="text-gray-300 group-hover:text-blue-400" />
                {item}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// 5. MAIN COMPONENT (PART 1: HERO & SETUP)
// ============================================================================

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { parallax, handleMouseMove } = useParallax(30); // Use defined hook later
  
  // States
  const [scrolled, setScrolled] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);
  const [stats, setStats] = useState({ users: 0, products: 0, money: 0 });

  // Scroll Listener
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Stats Counter Animation
  useEffect(() => {
    let u = 0, p = 0, m = 0;
    const interval = setInterval(() => {
      if (u < 15000) u += 150;
      if (p < 5400) p += 54;
      if (m < 250) m += 2;
      setStats({ users: u, products: p, money: m });
      if (u >= 15000 && p >= 5400 && m >= 250) clearInterval(interval);
    }, 20);
    return () => clearInterval(interval);
  }, []);

  // Auto Slider
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlide(prev => (prev + 1) % HERO_SLIDES.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-white font-sans text-[#1E293B] overflow-x-hidden selection:bg-[#00418E] selection:text-white">
      
      {/* =====================================================================
          SECTION A: HERO BANNER (THE MASTERPIECE)
      ====================================================================== */}
      <section 
        className="relative w-full min-h-[850px] flex flex-col justify-center items-center bg-[#00418E] overflow-hidden"
        onMouseMove={(e: any) => {
            // Simple parallax logic inline if hook causes issue in split parts
            const x = (e.clientX - window.innerWidth / 2) / 30;
            const y = (e.clientY - window.innerHeight / 2) / 30;
            document.documentElement.style.setProperty('--mouse-x', `${x}px`);
            document.documentElement.style.setProperty('--mouse-y', `${y}px`);
        }}
      >
        {/* A.1 Background Layers */}
        <div className="absolute inset-0 z-0">
          {/* Main Image with Blend Mode */}
          <div className="absolute inset-0 bg-[url('https://hcmut.edu.vn/img/campus/campus-1.jpg')] bg-cover bg-center opacity-10 mix-blend-overlay scale-110 animate-pulse-slow"></div>
          
          {/* Mesh Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#00418E]/90 via-[#00418E]/80 to-[#00418E] z-10"></div>
          
          {/* Animated Blobs */}
          <div className="absolute top-[-10%] right-[-5%] w-[800px] h-[800px] bg-blue-500/30 rounded-full blur-[120px] animate-blob mix-blend-screen"></div>
          <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-purple-500/20 rounded-full blur-[100px] animate-blob animation-delay-2000 mix-blend-screen"></div>
          
          {/* Grid Pattern */}
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 z-10"></div>
        </div>

        {/* A.2 Main Content */}
        <div className="relative z-20 w-full max-w-7xl px-4 pt-20 pb-32 text-center flex flex-col items-center">
          
          {/* Floating Badge */}
          <div 
            className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white shadow-2xl mb-10 hover:bg-white/20 transition-all cursor-default animate-bounce-slow"
            style={{ transform: 'translate(var(--mouse-x), var(--mouse-y))' }}
          >
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-yellow-500"></span>
            </span>
            <span className="text-xs font-black uppercase tracking-[0.2em]">Cộng đồng sinh viên Bách Khoa TP.HCM</span>
          </div>

          {/* Hero Typography */}
          <h1 className="text-6xl md:text-8xl font-black text-white mb-8 leading-[1.1] tracking-tighter drop-shadow-2xl">
            Sàn Giao Dịch <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-200 via-white to-cyan-200 animate-shine bg-[length:200%_auto]">
              Đồ Cũ Sinh Viên
            </span>
          </h1>

          <p className="text-blue-100/90 text-lg md:text-2xl mb-14 max-w-3xl font-medium leading-relaxed">
            Kết nối hơn <span className="text-yellow-300 font-bold">{stats.users.toLocaleString()}+</span> sinh viên. 
            Mua bán giáo trình, thiết bị điện tử an toàn, nhanh chóng ngay tại khuôn viên trường.
          </p>

          {/* Search Component */}
          <div className="w-full mb-20 transform transition-all hover:scale-[1.02]">
            <ModernSearchBar />
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-16 w-full max-w-5xl border-t border-white/10 pt-12">
            {[
              { label: 'Thành viên', value: stats.users, suffix: '+', icon: <Users className="w-5 h-5 text-blue-300"/> },
              { label: 'Tin đăng', value: stats.products, suffix: '+', icon: <Share2 className="w-5 h-5 text-purple-300"/> },
              { label: 'Giao dịch', value: stats.money, suffix: 'tr+', icon: <CheckCircle2 className="w-5 h-5 text-green-300"/> },
              { label: 'Uy tín', value: 100, suffix: '%', icon: <ShieldCheck className="w-5 h-5 text-yellow-300"/> },
            ].map((stat, idx) => (
              <div key={idx} className="text-center group">
                <div className="flex items-center justify-center gap-2 text-white/60 mb-2 text-xs font-bold uppercase tracking-widest group-hover:text-white transition-colors">
                  {stat.icon} {stat.label}
                </div>
                <div className="text-4xl md:text-5xl font-black text-white group-hover:scale-110 transition-transform duration-300 flex justify-center items-baseline">
                  {stat.value.toLocaleString()}
                  <span className="text-2xl text-white/50 ml-1">{stat.suffix}</span>
                </div>
              </div>
            ))}
          </div>

        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-60 animate-bounce">
          <span className="text-[10px] font-bold text-white uppercase tracking-widest">Khám phá</span>
          <ChevronDown className="text-white w-6 h-6" />
        </div>
        
        {/* Floating Elements (Visual Decoration) */}
        <img src="https://upload.wikimedia.org/wikipedia/commons/4/4e/Hcmut.png" alt="Logo BK" className="absolute top-20 left-10 w-32 h-32 opacity-10 rotate-12 blur-sm animate-float hidden xl:block" />
        <div className="absolute top-40 right-20 w-20 h-20 bg-yellow-400/20 rounded-xl rotate-45 blur-md animate-float animation-delay-1000 hidden xl:block"></div>
      </section>

      {/* --- END PART 1 --- */}
      {/* Các phần tiếp theo sẽ nối tiếp vào đây */}
      {/* =====================================================================
          SECTION B: BENTO CATEGORIES (MODERN GRID LAYOUT)
          Thiết kế lưới Bento hiện đại, tối ưu không gian và thị giác
      ====================================================================== */}
      <div className="bg-[#F8FAFC] relative z-10 rounded-t-[3rem] -mt-16 pt-24 pb-20 shadow-[0_-20px_50px_rgba(0,0,0,0.1)]">
        <div className="max-w-7xl mx-auto px-4">
          
          <SectionHeader 
            title="Khám Phá Danh Mục" 
            subtitle="Tìm kiếm dễ dàng hơn với các nhóm sản phẩm được phân loại chi tiết dành riêng cho sinh viên Bách Khoa."
          />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-[180px]">
            {CATEGORIES_DETAILED.map((cat, idx) => (
              <div 
                key={cat.id}
                onClick={() => navigate(`/market?cat=${cat.id}`)}
                className={`group relative overflow-hidden rounded-[2rem] p-8 cursor-pointer transition-all duration-500 hover:shadow-2xl hover:-translate-y-1 ${idx === 0 || idx === 3 ? 'md:col-span-2 bg-white' : 'bg-white'}`}
              >
                {/* Background Gradient on Hover */}
                <div className={`absolute inset-0 bg-gradient-to-br ${cat.color} opacity-0 group-hover:opacity-5 transition-opacity duration-500`}></div>
                
                {/* Content */}
                <div className="relative z-10 h-full flex flex-col justify-between">
                  <div className="flex justify-between items-start">
                    <div className={`w-16 h-16 rounded-2xl ${cat.bg} ${cat.text} flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-500`}>
                      {cat.icon}
                    </div>
                    <span className="bg-gray-100 text-gray-500 text-[10px] font-bold px-2 py-1 rounded-full group-hover:bg-[#00418E] group-hover:text-white transition-colors">
                      {cat.count}+
                    </span>
                  </div>
                  
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-1 flex items-center gap-2 group-hover:text-[#00418E] transition-colors">
                      {cat.name}
                      <ArrowRight size={18} className="opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
                    </h3>
                    <p className="text-sm text-gray-500 font-medium group-hover:text-gray-700 transition-colors">
                      {cat.sub}
                    </p>
                  </div>
                </div>

                {/* Decorative Pattern */}
                <div className="absolute -bottom-10 -right-10 w-32 h-32 rounded-full border-[20px] border-gray-50 group-hover:border-blue-50/50 transition-colors duration-500"></div>
              </div>
            ))}
          </div>

        </div>
      </div>

      {/* =====================================================================
          SECTION C: AI POWER SHOWCASE (DARK MODE CONTRAST)
          Khu vực giới thiệu tính năng AI với giao diện tối tương phản
      ====================================================================== */}
      <section className="py-24 bg-[#0F172A] relative overflow-hidden">
        {/* C.1 Background Effects */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-blue-500/20 rounded-full blur-[120px] animate-pulse-slow"></div>
          <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-purple-500/20 rounded-full blur-[120px] animate-pulse-slow animation-delay-2000"></div>
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20"></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            
            {/* C.2 Text Content */}
            <div className="order-2 lg:order-1">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-widest mb-8">
                <Cpu size={14} className="animate-spin-slow" /> Công nghệ độc quyền
              </div>
              
              <h2 className="text-4xl md:text-6xl font-black text-white mb-8 leading-[1.1]">
                Đăng tin <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">Siêu Tốc</span> <br/>
                với Trợ lý AI
              </h2>
              
              <p className="text-slate-400 text-lg mb-10 leading-relaxed max-w-lg">
                Quên đi việc đau đầu nghĩ caption hay định giá sản phẩm. 
                Chỉ cần tải ảnh lên, <strong className="text-white">Gemini Vision Pro</strong> sẽ phân tích và tạo nội dung bán hàng chuyên nghiệp trong 30 giây.
              </p>

              <div className="space-y-6 mb-12">
                {[
                  { title: "Tự động viết mô tả", desc: "Tạo nội dung hấp dẫn, đầy đủ thông số kỹ thuật.", icon: <Code className="text-blue-400"/> },
                  { title: "Định giá thông minh", desc: "Gợi ý mức giá phù hợp dựa trên tình trạng món đồ.", icon: <TrendingUp className="text-green-400"/> },
                  { title: "Gắn thẻ tự động", desc: "Phân loại danh mục chính xác để dễ tìm kiếm.", icon: <Tag className="text-purple-400"/> }
                ].map((feature, idx) => (
                  <div key={idx} className="flex gap-4 group">
                    <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0 group-hover:bg-white/10 transition-colors">
                      {feature.icon}
                    </div>
                    <div>
                      <h4 className="text-white font-bold text-lg mb-1 group-hover:text-blue-400 transition-colors">{feature.title}</h4>
                      <p className="text-slate-500 text-sm">{feature.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-4">
                <button 
                  onClick={() => navigate('/post')}
                  className="px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-lg shadow-blue-500/25 transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
                >
                  <Sparkles size={20} /> Trải nghiệm ngay
                </button>
                <button 
                  onClick={() => navigate('/market')}
                  className="px-8 py-4 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-xl font-bold transition-all"
                >
                  Xem Demo
                </button>
              </div>
            </div>

            {/* C.3 Terminal Visualizer */}
            <div className="order-1 lg:order-2 perspective-1000">
              <div className="transform rotate-y-[-5deg] rotate-x-[5deg] hover:rotate-0 transition-transform duration-700 ease-out">
                {/* Gọi Component AITerminal đã định nghĩa ở Phần 1 */}
                <AITerminal />
                
                {/* Floating Elements decoration */}
                <div className="absolute -top-10 -right-10 bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20 shadow-xl animate-float">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                      <CheckCircle2 className="text-green-400" size={20} />
                    </div>
                    <div>
                      <p className="text-white text-xs font-bold">Hoàn tất</p>
                      <p className="text-green-400 text-xs font-mono">0.8s processing</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* =====================================================================
          SECTION D: LIVE FEED - NEW ARRIVALS
          Danh sách sản phẩm mới nhất với Skeleton Loading và Hover Effects
      ====================================================================== */}
      <section className="py-24 bg-white relative">
        <div className="max-w-7xl mx-auto px-4">
          
          <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-red-50 text-red-500 rounded-lg animate-pulse">
                  <Flame size={24} />
                </div>
                <span className="text-red-500 font-bold uppercase tracking-widest text-sm">Vừa cập nhật</span>
              </div>
              <h2 className="text-4xl font-black text-gray-900 tracking-tight">Mới Lên Sàn</h2>
            </div>

            <div className="flex items-center bg-gray-100 p-1.5 rounded-xl">
              {['Tất cả', 'Giáo trình', 'Công nghệ', 'Góc 0Đ'].map((tab) => (
                <button 
                  key={tab}
                  className="px-6 py-2.5 rounded-lg text-sm font-bold transition-all hover:bg-white hover:shadow-sm focus:bg-white focus:shadow-md focus:text-[#00418E] text-gray-500"
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* Product Grid */}
          <div className="min-h-[500px]">
            {loading ? (
              // Skeleton Loading State (Giả lập khung xương khi đang tải)
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                  <div key={n} className="bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-sm h-[420px] flex flex-col">
                    <div className="h-64 bg-gray-200 animate-pulse relative">
                        <div className="absolute top-4 right-4 w-8 h-8 bg-white/50 rounded-full"></div>
                    </div>
                    <div className="p-5 space-y-4 flex-1">
                      <div className="h-4 bg-gray-200 rounded-full w-24 animate-pulse"></div>
                      <div className="h-6 bg-gray-200 rounded-full w-full animate-pulse"></div>
                      <div className="h-6 bg-gray-200 rounded-full w-2/3 animate-pulse"></div>
                      <div className="mt-auto flex justify-between pt-4 border-t border-gray-50">
                         <div className="h-8 bg-gray-200 rounded-lg w-24 animate-pulse"></div>
                         <div className="h-8 bg-gray-200 rounded-full w-8 animate-pulse"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              // Real Data Grid
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                {recentProducts.map((product, idx) => (
                  // Staggered Animation Delay
                  <div 
                    key={product.id} 
                    className="animate-in fade-in slide-in-from-bottom-8 duration-700 fill-mode-backwards"
                    style={{ animationDelay: `${idx * 100}ms` }}
                  >
                    {/* Sử dụng Component HomeProductCard đã định nghĩa ở Phần 1 */}
                    <HomeProductCard 
                      product={product} 
                      onClick={() => navigate(`/product/${product.id}`)}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-20 text-center">
            <button 
              onClick={() => navigate('/market')}
              className="group relative inline-flex items-center justify-center px-12 py-4 font-black text-white transition-all duration-200 bg-[#00418E] rounded-full hover:bg-[#003370] hover:shadow-xl hover:-translate-y-1 focus:outline-none focus:ring-4 focus:ring-blue-500/20 overflow-hidden"
            >
              <span className="relative z-10 flex items-center gap-2 uppercase tracking-widest text-sm">
                Xem tất cả 2,450+ món đồ <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform"/>
              </span>
              {/* Button Shine Effect */}
              <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent z-0"></div>
            </button>
          </div>

        </div>
      </section>

      {/* =====================================================================
          SECTION E: FLASH SALE & BANNER (PROMO)
          Khu vực banner quảng cáo ngang (như Shopee/Lazada)
      ====================================================================== */}
      <section className="py-12 bg-[#F8FAFC]">
        <div className="max-w-7xl mx-auto px-4">
          <div className="relative rounded-[2.5rem] overflow-hidden shadow-xl group cursor-pointer">
            <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-pink-600"></div>
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/diagmonds-light.png')] opacity-20"></div>
            
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between p-12 gap-8">
              <div className="text-white text-center md:text-left">
                <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-4 py-1.5 rounded-full text-xs font-bold mb-4 border border-white/30 animate-pulse">
                  <Clock size={14} /> KẾT THÚC TRONG: 02:45:12
                </div>
                <h3 className="text-4xl md:text-5xl font-black mb-4">FLASH SALE 0Đ</h3>
                <p className="text-white/90 text-lg font-medium max-w-md">
                  Sự kiện dọn nhà KTX cuối kỳ. Hàng ngàn món đồ được tặng miễn phí mỗi ngày.
                </p>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="bg-white p-4 rounded-2xl shadow-lg transform rotate-[-6deg] group-hover:rotate-0 transition-transform duration-500">
                   <img src="https://salt.tikicdn.com/cache/750x750/ts/product/6e/04/b3/c2759e6659c20a4d46c764e40292276c.jpg.webp" className="w-32 h-32 object-contain" alt="Gift"/>
                   <div className="text-center font-bold text-gray-900 mt-2">Casio 570VN</div>
                   <div className="text-center font-black text-red-500">0đ</div>
                </div>
                <div className="bg-white p-4 rounded-2xl shadow-lg transform rotate-[6deg] translate-y-4 group-hover:rotate-0 group-hover:translate-y-0 transition-transform duration-500 hidden sm:block">
                   <img src="https://cdn.fahasa.com/media/flashmagazine/images/page_images/giao_trinh_giai_tich_1/2020_05_21_10_45_22_1-390x510.jpg" className="w-32 h-32 object-contain" alt="Gift"/>
                   <div className="text-center font-bold text-gray-900 mt-2">Giải Tích 1</div>
                   <div className="text-center font-black text-red-500">0đ</div>
                </div>
              </div>

              <div className="md:ml-auto">
                <button className="bg-white text-orange-600 px-8 py-4 rounded-xl font-black text-lg shadow-xl hover:bg-gray-50 transition-all active:scale-95 flex items-center gap-2">
                  SĂN NGAY <ChevronRight size={20}/>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
      {/* =====================================================================
          SECTION F: WHY CHOOSE US (TRUST INDICATORS)
          Lý do chọn Chợ BK thay vì các nền tảng khác
      ====================================================================== */}
      <section className="py-24 bg-white relative overflow-hidden">
        {/* Background Decorative Line */}
        <div className="absolute top-1/2 left-0 w-full h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent"></div>
        
        <div className="max-w-7xl mx-auto px-4 relative z-10">
          <SectionHeader 
            title="Tại sao chọn Chợ BK?" 
            subtitle="Nền tảng được xây dựng bởi sinh viên, dành cho sinh viên, với tiêu chí An toàn - Tiết kiệm - Văn minh."
            centered
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mt-16">
            {/* Feature 1 */}
            <div className="group text-center">
              <div className="relative w-24 h-24 mx-auto mb-8">
                <div className="absolute inset-0 bg-blue-100 rounded-full scale-0 group-hover:scale-100 transition-transform duration-500 ease-out"></div>
                <div className="relative w-full h-full bg-white border-2 border-blue-50 text-[#00418E] rounded-full flex items-center justify-center shadow-lg group-hover:-translate-y-2 transition-transform duration-300">
                  <ShieldCheck size={40} strokeWidth={1.5} />
                </div>
              </div>
              <h3 className="text-xl font-black text-gray-900 mb-4 group-hover:text-[#00418E] transition-colors">
                Xác thực Sinh viên
              </h3>
              <p className="text-gray-500 leading-relaxed px-4">
                100% tài khoản đăng bán đều phải xác thực qua Email sinh viên 
                <span className="font-bold text-gray-700 bg-gray-100 px-1 mx-1 rounded">@hcmut.edu.vn</span>.
                Loại bỏ hoàn toàn rủi ro lừa đảo từ người lạ.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="group text-center">
              <div className="relative w-24 h-24 mx-auto mb-8">
                <div className="absolute inset-0 bg-indigo-100 rounded-full scale-0 group-hover:scale-100 transition-transform duration-500 ease-out"></div>
                <div className="relative w-full h-full bg-white border-2 border-indigo-50 text-indigo-600 rounded-full flex items-center justify-center shadow-lg group-hover:-translate-y-2 transition-transform duration-300">
                  <MapPin size={40} strokeWidth={1.5} />
                </div>
              </div>
              <h3 className="text-xl font-black text-gray-900 mb-4 group-hover:text-indigo-600 transition-colors">
                Giao dịch tại Trường
              </h3>
              <p className="text-gray-500 leading-relaxed px-4">
                Khuyến khích gặp mặt trực tiếp tại các địa điểm an toàn như 
                <span className="font-bold text-gray-700 mx-1">Sảnh H6, A4, Thư viện</span>.
                Kiểm tra hàng kỹ lưỡng trước khi thanh toán.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="group text-center">
              <div className="relative w-24 h-24 mx-auto mb-8">
                <div className="absolute inset-0 bg-teal-100 rounded-full scale-0 group-hover:scale-100 transition-transform duration-500 ease-out"></div>
                <div className="relative w-full h-full bg-white border-2 border-teal-50 text-teal-600 rounded-full flex items-center justify-center shadow-lg group-hover:-translate-y-2 transition-transform duration-300">
                  <Users size={40} strokeWidth={1.5} />
                </div>
              </div>
              <h3 className="text-xl font-black text-gray-900 mb-4 group-hover:text-teal-600 transition-colors">
                Cộng đồng Văn minh
              </h3>
              <p className="text-gray-500 leading-relaxed px-4">
                Hệ thống đánh giá tín nhiệm (Reputation Score) minh bạch. 
                Đội ngũ Admin là sinh viên Bách Khoa hỗ trợ giải quyết tranh chấp 24/7.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          SECTION G: TESTIMONIALS (STUDENT FEEDBACK)
          Đánh giá từ người dùng thực tế
      ====================================================================== */}
      <section className="py-24 bg-[#F8FAFC]">
        <div className="max-w-7xl mx-auto px-4">
          <SectionHeader 
            title="Sinh viên nói gì?" 
            subtitle="Hơn 15,000 sinh viên Bách Khoa đã tin tưởng và sử dụng."
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {TESTIMONIALS.map((item, idx) => (
              <div 
                key={item.id} 
                className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all duration-300 relative group"
              >
                {/* Quote Icon */}
                <div className="absolute top-8 right-8 text-gray-100 group-hover:text-blue-50 transition-colors">
                  <Quote size={60} />
                </div>

                <div className="flex items-center gap-1 mb-6">
                  {[...Array(5)].map((_, i) => (
                    <Star 
                      key={i} 
                      size={16} 
                      className={`${i < item.rating ? 'fill-yellow-400 text-yellow-400' : 'fill-gray-200 text-gray-200'}`} 
                    />
                  ))}
                </div>

                <p className="text-gray-600 text-lg mb-8 relative z-10 leading-relaxed">
                  "{item.content}"
                </p>

                <div className="flex items-center gap-4 mt-auto">
                  <div className="relative">
                    <img 
                      src={item.avatar} 
                      alt={item.name} 
                      className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-md"
                    />
                    <div className="absolute -bottom-1 -right-1 bg-green-500 w-4 h-4 rounded-full border-2 border-white"></div>
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900">{item.name}</h4>
                    <p className="text-xs text-[#00418E] font-bold uppercase tracking-wider">{item.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =====================================================================
          SECTION H: FAQ (ACCORDION)
          Câu hỏi thường gặp
      ====================================================================== */}
      <section className="py-24 bg-white">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-black text-gray-900 mb-4">Câu hỏi thường gặp</h2>
            <p className="text-gray-500">Giải đáp những thắc mắc phổ biến nhất của các bạn tân sinh viên.</p>
          </div>

          <div className="space-y-4">
            {FAQS.map((faq, idx) => (
              <details 
                key={idx} 
                className="group bg-gray-50 rounded-2xl border border-gray-100 open:bg-white open:shadow-lg open:border-blue-100 transition-all duration-300"
              >
                <summary className="flex items-center justify-between p-6 cursor-pointer list-none">
                  <h4 className="font-bold text-gray-800 text-lg group-hover:text-[#00418E] transition-colors">
                    {faq.question}
                  </h4>
                  <span className="p-2 bg-white rounded-full shadow-sm text-gray-400 group-open:rotate-180 group-open:bg-[#00418E] group-open:text-white transition-all duration-300">
                    <ChevronDown size={20} />
                  </span>
                </summary>
                <div className="px-6 pb-6 text-gray-600 leading-relaxed border-t border-gray-100/50 pt-4 animate-fadeIn">
                  {faq.answer}
                </div>
              </details>
            ))}
          </div>
          
          <div className="mt-12 text-center">
            <p className="text-gray-500 mb-4">Vẫn còn thắc mắc?</p>
            <button className="px-8 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full font-bold transition-all">
              Liên hệ hỗ trợ
            </button>
          </div>
        </div>
      </section>

      {/* =====================================================================
          SECTION I: FINAL CTA (BIG BANNER)
          Lời kêu gọi hành động cuối cùng
      ====================================================================== */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto relative rounded-[3rem] overflow-hidden bg-[#00418E] text-white shadow-2xl">
          {/* Background Pattern */}
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
          <div className="absolute -left-20 -bottom-20 w-96 h-96 bg-blue-500/30 rounded-full blur-[80px]"></div>
          <div className="absolute -right-20 -top-20 w-96 h-96 bg-purple-500/30 rounded-full blur-[80px]"></div>

          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between p-12 md:p-24 gap-12">
            <div className="max-w-2xl text-center md:text-left">
              <h2 className="text-4xl md:text-5xl font-black mb-6 leading-tight">
                Bạn có đồ cũ cần bán? <br/>
                <span className="text-yellow-300">Đăng ngay, bán liền tay!</span>
              </h2>
              <p className="text-blue-100 text-lg mb-10 font-medium">
                Tiếp cận hàng ngàn sinh viên Bách Khoa mỗi ngày. 
                Hoàn toàn miễn phí và không thu chiết khấu.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
                <button 
                  onClick={() => navigate('/post')}
                  className="px-10 py-4 bg-white text-[#00418E] rounded-2xl font-black text-lg shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <Sparkles size={20} className="text-yellow-500"/> Đăng Tin Ngay
                </button>
                <button 
                  onClick={() => navigate('/auth')}
                  className="px-10 py-4 bg-transparent border-2 border-white/30 text-white rounded-2xl font-bold hover:bg-white/10 transition-all"
                >
                  Đăng ký thành viên
                </button>
              </div>
            </div>

            {/* Decor Image */}
            <div className="relative w-64 h-64 md:w-80 md:h-80 flex-shrink-0 animate-float">
              <div className="absolute inset-0 bg-gradient-to-tr from-yellow-400 to-orange-500 rounded-full opacity-20 blur-2xl animate-pulse"></div>
              <img 
                src="https://cdn3d.iconscout.com/3d/premium/thumb/megaphone-3d-icon-download-in-png-blend-fbx-gltf-file-formats--loudspeaker-voice-speaker-volume-marketing-advertisement-pack-business-icons-4952778.png" 
                alt="Megaphone" 
                className="w-full h-full object-contain relative z-10 drop-shadow-2xl"
              />
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          SECTION J: FOOTER (FULL DETAILS)
          Chân trang chi tiết chuẩn Thương mại điện tử
      ====================================================================== */}
      <footer className="bg-[#0F172A] text-slate-300 pt-20 pb-10 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
            
            {/* Column 1: Brand */}
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-[#00418E] rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-900/50">
                  <GraduationCap size={28} />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-white tracking-tight">CHỢ BK</h3>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Student Marketplace</p>
                </div>
              </div>
              <p className="text-slate-400 leading-relaxed text-sm">
                Dự án phi lợi nhuận hỗ trợ sinh viên ĐH Bách Khoa TP.HCM trao đổi tài liệu, đồ dùng học tập.
                <br/>Kết nối - Chia sẻ - Tiết kiệm.
              </p>
              <div className="flex gap-4">
                {[Facebook, Instagram, Youtube, Twitter].map((Icon, i) => (
                  <a key={i} href="#" className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:bg-[#00418E] hover:text-white transition-all duration-300">
                    <Icon size={18} />
                  </a>
                ))}
              </div>
            </div>

            {/* Column 2: Quick Links */}
            <div>
              <h4 className="text-white font-bold mb-6 uppercase text-sm tracking-widest">Khám phá</h4>
              <ul className="space-y-4 text-sm font-medium">
                {['Về chúng tôi', 'Quy chế hoạt động', 'Chính sách bảo mật', 'Giải quyết tranh chấp', 'Tuyển dụng Admin'].map(item => (
                  <li key={item}>
                    <a href="#" className="hover:text-[#00418E] transition-colors flex items-center gap-2 group">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-600 group-hover:bg-[#00418E] transition-colors"></span>
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Column 3: Categories */}
            <div>
              <h4 className="text-white font-bold mb-6 uppercase text-sm tracking-widest">Danh mục</h4>
              <ul className="space-y-4 text-sm font-medium">
                {CATEGORIES.map(cat => (
                  <li key={cat.id}>
                    <a href={`/market?cat=${cat.id}`} className="hover:text-[#00418E] transition-colors flex items-center gap-2 group">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-600 group-hover:bg-[#00418E] transition-colors"></span>
                      {cat.name}
                    </a>
                  </li>
                ))}
                <li>
                  <a href="/market" className="text-[#00418E] font-bold hover:underline">Xem tất cả...</a>
                </li>
              </ul>
            </div>

            {/* Column 4: Contact */}
            <div>
              <h4 className="text-white font-bold mb-6 uppercase text-sm tracking-widest">Liên hệ</h4>
              <ul className="space-y-4 text-sm">
                <li className="flex items-start gap-3">
                  <MapPin size={20} className="text-[#00418E] shrink-0 mt-0.5" />
                  <span>268 Lý Thường Kiệt, Phường 14, Quận 10, TP.HCM (Cơ sở 1)</span>
                </li>
                <li className="flex items-start gap-3">
                  <MapPin size={20} className="text-[#00418E] shrink-0 mt-0.5" />
                  <span>Khu phố Tân Lập, Phường Đông Hòa, TP. Dĩ An (Cơ sở 2)</span>
                </li>
                <li className="flex items-center gap-3">
                  <Mail size={20} className="text-[#00418E] shrink-0" />
                  <a href="mailto:support@chobk.com" className="hover:text-white transition-colors">support@chobk.com</a>
                </li>
                <li className="flex items-center gap-3">
                  <Phone size={20} className="text-[#00418E] shrink-0" />
                  <a href="tel:0123456789" className="hover:text-white transition-colors">0123.456.789</a>
                </li>
              </ul>
            </div>

          </div>

          <div className="border-t border-slate-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-slate-500 font-medium">
            <p>&copy; {new Date().getFullYear()} Chợ BK - Dự án cộng đồng sinh viên.</p>
            <div className="flex gap-6">
              <a href="#" className="hover:text-white transition-colors">Điều khoản sử dụng</a>
              <a href="#" className="hover:text-white transition-colors">Chính sách an toàn</a>
              <a href="#" className="hover:text-white transition-colors">Sitemap</a>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
};

export default HomePage;
