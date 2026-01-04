/**
 * PROJECT: BOOK EXCHANGE - HCMUT
 * MODULE: HOMEPAGE (LANDING PORTAL)
 * AUTHOR: HCMUT STUDENT TEAM
 * VERSION: 4.0.0 (ENTERPRISE EDITION)
 * * DESCRIPTION:
 * Trang chủ tích hợp Visual Engine cao cấp, Canvas Animation,
 * Real-time Data Feed và hệ thống điều hướng thông minh.
 */

import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Search, ArrowRight, Zap, ShieldCheck, Users, 
  BookOpen, Calculator, Shirt, Monitor, Grid, MapPin, 
  Flame, Gift, Eye, ShoppingBag, PlusCircle, 
  Heart, Package, ChevronRight, Sparkles, TrendingUp,
  MoreHorizontal, ChevronDown, Activity, Bell, X,
  Clock, CheckCircle2, Star, Cpu, Globe, Anchor,
  Award, BarChart3, Calendar, Coffee, Command, Hash,
  HelpCircle, Info, Layers, Layout, LifeBuoy, Link2,
  Loader2, Menu, MessageSquare, MousePointer2, Percent,
  Rocket, Server, Settings, Share2, Smartphone, Smile,
  Target, Terminal, Trophy, Truck, UserCheck, Wallet, Wifi
} from 'lucide-react';
import { supabase } from '../services/supabase';
import { Product, ProductCategory } from '../types';

// ============================================================================
// PART 1: ADVANCED CONFIGURATION & CONSTANTS
// ============================================================================

const CONFIG = {
  APP_NAME: "BK EXCHANGE",
  TAGLINE: "Nền tảng trao đổi học liệu số 1 Bách Khoa",
  ANIMATION_DURATION: 300,
  SCROLL_THRESHOLD: 50,
  MAX_PRODUCTS_DISPLAY: 8,
  AUTO_PLAY_INTERVAL: 5000,
};

const THEME = {
  colors: {
    primary: '#00418E', // HCMUT Official Blue
    secondary: '#00B0F0', // Cyan
    accent: '#FFD700', // Gold
    dark: '#0F172A', // Slate 900
    light: '#F8FAFC', // Slate 50
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',
  },
  fonts: {
    heading: "'Inter', sans-serif",
    body: "'Inter', sans-serif",
    mono: "'JetBrains Mono', monospace",
  }
};

const CATEGORIES = [
  { id: ProductCategory.TEXTBOOK, label: 'Giáo trình', icon: <BookOpen/>, desc: 'Sách, Slide, Đề thi cũ', color: 'text-blue-500', bg: 'bg-blue-50' },
  { id: ProductCategory.ELECTRONICS, label: 'Điện tử', icon: <Monitor/>, desc: 'Laptop, Chuột, Phím', color: 'text-purple-500', bg: 'bg-purple-50' },
  { id: ProductCategory.SUPPLIES, label: 'Dụng cụ', icon: <Calculator/>, desc: 'Casio, Thước, Bảng', color: 'text-green-500', bg: 'bg-green-50' },
  { id: ProductCategory.CLOTHING, label: 'Đồng phục', icon: <Shirt/>, desc: 'Áo Khoa, Balo, Giày', color: 'text-orange-500', bg: 'bg-orange-50' },
  { id: ProductCategory.OTHER, label: 'Khác', icon: <MoreHorizontal/>, desc: 'Nội thất, Xe cộ...', color: 'text-gray-500', bg: 'bg-gray-50' },
];

const MAIN_ACTIONS = [
  { 
    id: 'market', 
    title: 'Dạo Chợ', 
    desc: 'Săn đồ cũ giá hời', 
    icon: <ShoppingBag size={32} className="text-cyan-400"/>, 
    link: '/market', 
    gradient: 'from-cyan-500/20 to-blue-500/20',
    border: 'group-hover:border-cyan-400/50'
  },
  { 
    id: 'post', 
    title: 'Đăng Tin', 
    desc: 'Bán đồ trong 30s', 
    icon: <PlusCircle size={32} className="text-pink-400"/>, 
    link: '/post-item', 
    gradient: 'from-pink-500/20 to-rose-500/20',
    border: 'group-hover:border-pink-400/50'
  },
  { 
    id: 'saved', 
    title: 'Yêu Thích', 
    desc: 'Sản phẩm đã lưu', 
    icon: <Heart size={32} className="text-red-400"/>, 
    link: '/saved', 
    gradient: 'from-red-500/20 to-orange-500/20',
    border: 'group-hover:border-red-400/50'
  },
  { 
    id: 'items', 
    title: 'Quản Lý', 
    desc: 'Đơn hàng của tôi', 
    icon: <Package size={32} className="text-yellow-400"/>, 
    link: '/my-items', 
    gradient: 'from-yellow-500/20 to-amber-500/20',
    border: 'group-hover:border-yellow-400/50'
  },
];

const MOCK_ACTIVITIES = [
  { user: "Nguyễn Văn A", action: "đăng bán", item: "Giáo trình Giải tích 1", time: "vừa xong" },
  { user: "Trần Thị B", action: "đã mua", item: "Máy tính Casio 580VNX", time: "2 phút trước" },
  { user: "Lê Hoàng C", action: "yêu cầu giao dịch", item: "Bàn học gấp gọn", time: "5 phút trước" },
  { user: "Phạm Minh D", action: "đăng bán", item: "Laptop Dell XPS cũ", time: "10 phút trước" },
  { user: "Vũ Tuấn E", action: "bình luận vào", item: "Áo khoa size L", time: "12 phút trước" },
];

const TOP_SELLERS = [
  { id: 1, name: "Minh Tuấn", role: "K20 - CK", sales: 142, rating: 4.9, avatar: "https://i.pravatar.cc/150?u=1" },
  { id: 2, name: "Thanh Hằng", role: "K21 - KT", sales: 98, rating: 5.0, avatar: "https://i.pravatar.cc/150?u=2" },
  { id: 3, name: "Đức Anh", role: "K19 - IT", sales: 85, rating: 4.8, avatar: "https://i.pravatar.cc/150?u=3" },
];

const TESTIMONIALS = [
  { id: 1, text: "Nhờ BK Exchange mà mình mua được giáo trình rẻ hơn 50% so với sách mới. Cực kỳ uy tín!", author: "Bạn Lan - K22", role: "Sinh viên năm 2" },
  { id: 2, text: "Bán đồ cũ chưa bao giờ nhanh đến thế. Đăng tin buổi sáng, chiều đã có người qua lấy.", author: "Bạn Hùng - K19", role: "Sinh viên năm cuối" },
  { id: 3, text: "Giao diện đẹp, dễ sử dụng. Tính năng chat real-time rất tiện lợi để ép giá :))", author: "Bạn Nam - K21", role: "Sinh viên năm 3" },
];

// ============================================================================
// PART 2: THE ENGINE ROOM (STYLES & UTILS)
// ============================================================================

const GlobalStyles = () => (
  <style>{`
    /* --- Base Resets & Typography --- */
    ::selection { background: #00418E; color: white; }
    
    /* --- Advanced Scrollbar --- */
    ::-webkit-scrollbar { width: 8px; height: 8px; }
    ::-webkit-scrollbar-track { background: #0F172A; }
    ::-webkit-scrollbar-thumb { background: #334155; border-radius: 4px; border: 2px solid #0F172A; }
    ::-webkit-scrollbar-thumb:hover { background: #475569; }

    /* --- Animations Library --- */
    @keyframes float { 
      0%, 100% { transform: translateY(0); } 
      50% { transform: translateY(-20px); } 
    }
    @keyframes pulse-ring {
      0% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7); }
      70% { box-shadow: 0 0 0 20px rgba(59, 130, 246, 0); }
      100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); }
    }
    @keyframes shimmer {
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }
    @keyframes slide-up {
      from { opacity: 0; transform: translateY(30px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
    @keyframes marquee {
      0% { transform: translateX(0); }
      100% { transform: translateX(-50%); }
    }
    @keyframes meteor {
      0% { transform: rotate(215deg) translateX(0); opacity: 1; }
      70% { opacity: 1; }
      100% { transform: rotate(215deg) translateX(-500px); opacity: 0; }
    }

    /* --- Utility Classes --- */
    .animate-float { animation: float 6s ease-in-out infinite; }
    .animate-pulse-ring { animation: pulse-ring 2s infinite; }
    .animate-shimmer { 
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
      background-size: 200% 100%;
      animation: shimmer 2s infinite linear;
    }
    .animate-enter { animation: slide-up 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; opacity: 0; }
    .animate-marquee { animation: marquee 40s linear infinite; }
    
    .stagger-1 { animation-delay: 100ms; }
    .stagger-2 { animation-delay: 200ms; }
    .stagger-3 { animation-delay: 300ms; }
    .stagger-4 { animation-delay: 400ms; }

    /* --- Glassmorphism --- */
    .glass-dark {
      background: rgba(15, 23, 42, 0.6);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.05);
    }
    .glass-light {
      background: rgba(255, 255, 255, 0.8);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.5);
    }

    /* --- Text Gradients --- */
    .text-gradient-primary {
      background: linear-gradient(135deg, #60A5FA 0%, #A78BFA 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .text-gradient-gold {
      background: linear-gradient(135deg, #FDE68A 0%, #F59E0B 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    /* --- Meteor Effect --- */
    .meteor-effect {
      position: absolute;
      top: 50%;
      left: 50%;
      height: 2px;
      width: 100px;
      background: linear-gradient(90deg, #ffffff, transparent);
      opacity: 0;
      transform: rotate(215deg);
      animation: meteor 2s linear infinite;
    }
    .meteor-effect::before {
      content: "";
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      width: 50px;
      height: 1px;
      background: linear-gradient(90deg, #ffffff, transparent);
    }

    /* --- Hide Scrollbar --- */
    .hide-scrollbar::-webkit-scrollbar { display: none; }
  `}</style>
);

// ============================================================================
// PART 3: REUSABLE UI COMPONENTS (ATOMICS)
// ============================================================================

/**
 * Animated Counter Component
 * Counts up from 0 to end value
 */
const Counter = ({ end, suffix = "", duration = 2000 }: { end: number, suffix?: string, duration?: number }) => {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    let startTime: number;
    let animationFrame: number;

    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      setCount(Math.floor(progress * end));
      if (progress < 1) {
        animationFrame = requestAnimationFrame(step);
      }
    };

    animationFrame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animationFrame);
  }, [end, duration]);

  return <span>{count.toLocaleString()}{suffix}</span>;
};

/**
 * Typewriter Component
 * Simulates typing and deleting text
 */
const Typewriter = ({ words }: { words: string[] }) => {
  const [index, setIndex] = useState(0);
  const [subIndex, setSubIndex] = useState(0);
  const [reverse, setReverse] = useState(false);
  const [blink, setBlink] = useState(true);

  // Blinking cursor
  useEffect(() => {
    const timeout = setInterval(() => setBlink((prev) => !prev), 500);
    return () => clearInterval(timeout);
  }, []);

  // Typing logic
  useEffect(() => {
    if (subIndex === words[index].length + 1 && !reverse) {
      setTimeout(() => setReverse(true), 1000); // Wait before deleting
      return;
    }

    if (subIndex === 0 && reverse) {
      setReverse(false);
      setIndex((prev) => (prev + 1) % words.length); // Next word
      return;
    }

    const timeout = setTimeout(() => {
      setSubIndex((prev) => prev + (reverse ? -1 : 1));
    }, Math.max(reverse ? 75 : subIndex === words[index].length ? 1000 : 150, parseInt((Math.random() * 350).toString()) / 10)); // Random typing speed

    return () => clearTimeout(timeout);
  }, [subIndex, index, reverse, words]);

  return (
    <span className="font-mono text-slate-400">
      {`${words[index].substring(0, subIndex)}`}
      <span className={`${blink ? 'opacity-100' : 'opacity-0'} text-blue-500 font-bold`}>|</span>
    </span>
  );
};

/**
 * Canvas Starfield Background
 * Creates a moving starfield effect for the hero section
 */
const StarfieldCanvas = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;

    const stars: { x: number; y: number; z: number }[] = [];
    const numStars = 800;
    const speed = 0.5;

    for (let i = 0; i < numStars; i++) {
      stars.push({
        x: Math.random() * width - width / 2,
        y: Math.random() * height - height / 2,
        z: Math.random() * width,
      });
    }

    const animate = () => {
      ctx.fillStyle = '#0F172A';
      ctx.fillRect(0, 0, width, height);

      stars.forEach((star) => {
        star.z -= speed;
        if (star.z <= 0) {
          star.x = Math.random() * width - width / 2;
          star.y = Math.random() * height - height / 2;
          star.z = width;
        }

        const x = (star.x / star.z) * width + width / 2;
        const y = (star.y / star.z) * height + height / 2;
        const size = (1 - star.z / width) * 2;

        if (x >= 0 && x <= width && y >= 0 && y <= height) {
          const brightness = 1 - star.z / width;
          ctx.fillStyle = `rgba(255, 255, 255, ${brightness})`;
          ctx.beginPath();
          ctx.arc(x, y, size, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      requestAnimationFrame(animate);
    };

    const handleResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
    };

    window.addEventListener('resize', handleResize);
    animate();

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 z-0 opacity-40 pointer-events-none" />;
};

// ============================================================================
// PART 4: FEATURE COMPONENTS
// ============================================================================

const LiveActivityFeed = () => {
  const [currentActivity, setCurrentActivity] = useState(MOCK_ACTIVITIES[0]);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsVisible(false); // Fade out
      setTimeout(() => {
        const randomIdx = Math.floor(Math.random() * MOCK_ACTIVITIES.length);
        setCurrentActivity(MOCK_ACTIVITIES[randomIdx]);
        setIsVisible(true); // Fade in
      }, 500);
    }, 6000); // Change every 6 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <div className={`fixed bottom-8 right-8 z-50 transition-all duration-500 transform ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
      <div className="glass-light p-4 rounded-2xl shadow-2xl border border-white/50 flex items-center gap-4 max-w-sm backdrop-blur-xl">
        <div className="relative shrink-0">
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
            <Bell size={20} className="text-blue-600"/>
          </div>
          <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>
        </div>
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Hoạt động mới</span>
            <span className="text-[10px] text-gray-400">• {currentActivity.time}</span>
          </div>
          <p className="text-sm text-slate-700 leading-tight">
            <span className="font-bold">{currentActivity.user}</span> {currentActivity.action} <span className="font-bold text-[#00418E]">"{currentActivity.item}"</span>
          </p>
        </div>
        <button onClick={() => setIsVisible(false)} className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 p-1"><X size={14}/></button>
      </div>
    </div>
  );
};

const ProductCard = ({ product }: { product: Product }) => {
  const navigate = useNavigate();
  
  // Calculate mock "heat" level based on views
  const isHot = (product.view_count || 0) > 500;

  return (
    <div 
      onClick={() => navigate(`/product/${product.id}`)}
      className="group relative bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 cursor-pointer border border-gray-100 h-full flex flex-col"
    >
      {/* Image Area */}
      <div className="aspect-[4/3] relative overflow-hidden bg-gray-50">
        <img 
          src={product.images[0] || 'https://via.placeholder.com/300'} 
          alt={product.title} 
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 mix-blend-multiply"
          loading="lazy"
        />
        
        {/* Overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"/>
        
        <div className="absolute top-3 left-3 flex flex-col gap-2">
          {product.price === 0 && (
            <span className="bg-red-500 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-lg animate-pulse flex items-center gap-1">
              <Gift size={12}/> 0Đ
            </span>
          )}
          {isHot && (
            <span className="bg-orange-500 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-lg flex items-center gap-1">
              <Flame size={12}/> HOT
            </span>
          )}
        </div>

        <button className="absolute bottom-4 right-4 bg-white text-slate-900 px-4 py-2 rounded-full font-bold text-xs shadow-lg transform translate-y-10 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 flex items-center gap-2">
          <Eye size={14}/> Xem ngay
        </button>
      </div>

      {/* Info Area */}
      <div className="p-5 flex flex-col flex-1">
        <div className="flex justify-between items-center mb-2">
           <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded border border-blue-100 uppercase tracking-wider">{product.category}</span>
           <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1"><Clock size={10}/> {new Date(product.postedAt).toLocaleDateString()}</span>
        </div>
        
        <h3 className="font-bold text-slate-800 text-lg mb-1 truncate group-hover:text-blue-600 transition-colors" title={product.title}>
          {product.title}
        </h3>
        
        <div className="mt-auto pt-4 border-t border-gray-50 flex items-center justify-between">
           <div>
             <span className="font-black text-slate-900 text-xl tracking-tight">
               {product.price === 0 ? 'Miễn phí' : `${product.price.toLocaleString()}đ`}
             </span>
             {product.price > 0 && <p className="text-[10px] text-gray-400 line-through">Giá gốc: {(product.price * 1.2).toLocaleString()}đ</p>}
           </div>
           <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">
              <ShoppingBag size={18}/>
           </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// PART 5: MAIN HOMEPAGE COMPOSITION
// ============================================================================

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  
  // States
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'new' | 'cheap' | 'textbook'>('new');
  const [search, setSearch] = useState('');
  const [scrolled, setScrolled] = useState(false);

  // Effects
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      let query = supabase.from('products').select('*').eq('status', 'available').limit(8);
      
      // Filter Logic
      if (activeTab === 'new') query = query.order('posted_at', { ascending: false });
      else if (activeTab === 'cheap') query = query.order('price', { ascending: true });
      else if (activeTab === 'textbook') query = query.eq('category', ProductCategory.TEXTBOOK);

      const { data } = await query;
      if (data) {
        setProducts(data.map((p: any) => ({ ...p, sellerId: p.seller_id, images: p.images || [], postedAt: p.posted_at })));
      }
      setLoading(false);
    };
    fetchProducts();
  }, [activeTab]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if(search.trim()) navigate(`/market?search=${encodeURIComponent(search)}`);
  };

  return (
    <div className="min-h-screen font-sans selection:bg-blue-600 selection:text-white pb-0 bg-slate-900">
      <VisualEngine />
      <LiveActivityFeed />

      {/* =================================================================
          1. ULTRA HERO SECTION (3D PORTAL)
      ================================================================== */}
      <section className="relative w-full min-h-[100vh] flex flex-col justify-center items-center overflow-hidden text-white pt-20">
        
        {/* Background Layer */}
        <StarfieldCanvas />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900/0 via-slate-900/50 to-slate-900 z-0 pointer-events-none"></div>
        
        {/* Floating Meteors */}
        {[...Array(5)].map((_, i) => (
          <span key={i} className="meteor-effect" style={{ top: `${Math.random() * 50}%`, left: `${Math.random() * 100}%`, animationDelay: `${Math.random() * 5}s` }}></span>
        ))}

        <div className="relative z-10 w-full max-w-7xl px-4 text-center">
          
          {/* Animated Badge */}
          <div className="animate-enter flex justify-center mb-8">
             <div className="inline-flex items-center gap-3 px-6 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-md shadow-[0_0_30px_rgba(79,70,229,0.3)] cursor-default hover:bg-white/10 transition-all duration-300 group">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                </span>
                <span className="text-xs font-bold tracking-[0.2em] uppercase bg-clip-text text-transparent bg-gradient-to-r from-blue-300 to-purple-300">
                  Cổng thông tin Sinh Viên Bách Khoa
                </span>
                <div className="w-px h-4 bg-white/20 mx-2"></div>
                <span className="text-xs text-slate-400 group-hover:text-white transition-colors">v4.0 Enterprise</span>
             </div>
          </div>

          {/* Headline with Gradient */}
          <div className="animate-enter" style={{ animationDelay: '100ms' }}>
            <h1 className="text-6xl md:text-8xl lg:text-9xl font-black leading-tight mb-6 tracking-tighter drop-shadow-2xl">
              Cũ Người <br/>
              <span className="text-gradient-primary animate-pulse-ring rounded-3xl px-4 inline-block">Mới Ta</span>
            </h1>
            <p className="text-slate-400 text-lg md:text-2xl max-w-3xl mx-auto mb-12 leading-relaxed font-light">
              Nền tảng trao đổi học liệu và đồ dùng công nghệ <br className="hidden md:block"/>
              dành riêng cho cộng đồng <strong className="text-blue-400">HCMUT - Vietnam National University</strong>.
            </p>
          </div>

          {/* Search Portal (Glassmorphism Input) */}
          <div className="animate-enter w-full max-w-3xl mx-auto relative group z-20 mb-20" style={{ animationDelay: '200ms' }}>
             <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 rounded-full blur opacity-30 group-hover:opacity-60 transition duration-1000 animate-pulse"></div>
             <form onSubmit={handleSearch} className="relative flex items-center bg-slate-900/90 backdrop-blur-2xl rounded-full border border-white/10 p-2 shadow-2xl transition-all hover:scale-[1.01] hover:border-white/20">
                <Search className="ml-6 text-slate-400 group-hover:text-white transition-colors" size={24}/>
                <div className="flex-1 ml-4 h-14 flex items-center overflow-hidden relative">
                  {!search && (
                    <div className="absolute inset-0 flex items-center text-lg pointer-events-none">
                      <Typewriter words={["Tìm 'Giáo trình Giải tích 1'...", "Tìm 'Casio 580VNX cũ'...", "Tìm 'Laptop Dell XPS'...", "Tìm 'Áo Khoa size L'..."]} />
                    </div>
                  )}
                  <input 
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full h-full bg-transparent border-none outline-none text-white text-lg placeholder-transparent z-10"
                  />
                </div>
                <button className="h-12 px-10 bg-blue-600 hover:bg-blue-500 text-white rounded-full font-bold text-lg transition-all shadow-[0_0_20px_rgba(37,99,235,0.5)] hover:shadow-[0_0_30px_rgba(37,99,235,0.8)] flex items-center gap-2 overflow-hidden relative group/btn active:scale-95">
                  <span className="relative z-10">Tìm kiếm</span>
                  <div className="animate-shine"></div>
                </button>
             </form>
          </div>

          {/* 3D Cards Grid (The Gateway) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 px-4 animate-enter" style={{ animationDelay: '300ms' }}>
             {MAIN_ACTIONS.map((action, i) => (
                <Link 
                  to={action.link} 
                  key={action.id} 
                  className={`glass-dark p-8 rounded-3xl flex flex-col items-center justify-center text-center gap-6 group cursor-pointer border border-white/5 hover:border-white/20 transition-all duration-500 hover:-translate-y-2 relative overflow-hidden ${action.border}`}
                >
                   {/* Card Background Glow */}
                   <div className={`absolute inset-0 bg-gradient-to-br ${action.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`}></div>
                   
                   <div className="w-20 h-20 rounded-2xl bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform duration-500 border border-white/10 group-hover:border-white/30 shadow-inner relative z-10">
                      {action.icon}
                   </div>
                   <div className="relative z-10">
                      <h3 className="font-bold text-white text-xl group-hover:text-blue-300 transition-colors">{action.title}</h3>
                      <p className="text-slate-400 text-xs mt-2 font-medium tracking-wide uppercase">{action.desc}</p>
                   </div>
                </Link>
             ))}
          </div>

          {/* Scroll Down Hint */}
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-bounce opacity-50 hover:opacity-100 transition-opacity cursor-pointer">
            <span className="text-xs uppercase tracking-widest text-slate-400">Khám phá</span>
            <ChevronDown size={24} className="text-white"/>
          </div>

        </div>
      </section>

      {/* =================================================================
          2. MARKET SHOWCASE SECTION (LIGHT MODE BG)
      ================================================================== */}
      <section className="py-24 bg-[#F8FAFC] relative rounded-t-[3rem] -mt-10 z-20 shadow-[0_-20px_50px_rgba(0,0,0,0.5)]">
         <div className="max-w-7xl mx-auto px-6">
           
           {/* Section Header with Tabs */}
           <div className="flex flex-col md:flex-row items-center justify-between mb-16 gap-8">
              <div className="text-center md:text-left">
                <h2 className="text-4xl font-black text-slate-900 flex items-center gap-3 justify-center md:justify-start">
                   <div className="p-3 bg-orange-500/10 rounded-2xl text-orange-600"><Flame size={32} className="fill-orange-500"/></div>
                   Thị trường sôi động
                </h2>
                <p className="text-slate-500 mt-2 text-lg">Cập nhật những món đồ vừa được sinh viên đăng bán.</p>
              </div>

              {/* Advanced Tabs */}
              <div className="flex gap-2 bg-white p-1.5 rounded-full border border-gray-200 shadow-sm overflow-x-auto max-w-full">
                 {[
                   { id: 'new', label: 'Mới nhất', icon: <Clock size={16}/> },
                   { id: 'cheap', label: 'Giá tốt', icon: <TrendingUp size={16}/> },
                   { id: 'textbook', label: 'Học liệu', icon: <BookOpen size={16}/> }
                 ].map(tab => (
                   <button 
                     key={tab.id}
                     onClick={() => setActiveTab(tab.id as any)}
                     className={`flex items-center gap-2 px-6 py-3 rounded-full text-sm font-bold transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-[#00418E] text-white shadow-lg' : 'text-slate-500 hover:bg-gray-100'}`}
                   >
                     {tab.icon} {tab.label}
                   </button>
                 ))}
              </div>
           </div>

           {/* Product Grid */}
           <div className="grid grid-cols-2 md:grid-cols-4 gap-8 min-h-[400px]">
              {loading 
                ? [...Array(8)].map((_, i) => (
                    <div key={i} className="bg-white rounded-3xl border border-gray-100 p-4 space-y-4 shadow-sm">
                      <div className="aspect-[4/3] bg-gray-100 rounded-2xl animate-pulse"/>
                      <div className="h-4 bg-gray-100 rounded w-3/4 animate-pulse"/>
                      <div className="h-4 bg-gray-100 rounded w-1/2 animate-pulse"/>
                      <div className="flex justify-between mt-4">
                        <div className="h-8 w-20 bg-gray-100 rounded-full animate-pulse"/>
                        <div className="h-8 w-8 bg-gray-100 rounded-full animate-pulse"/>
                      </div>
                    </div>
                  ))
                : products.map((p, i) => (
                    <div key={p.id} className="animate-enter" style={{ animationDelay: `${i * 50}ms` }}>
                      <ProductCard product={p}/>
                    </div>
                  ))
              }
           </div>

           <div className="mt-16 text-center">
              <Link to="/market" className="inline-flex items-center gap-2 px-8 py-4 bg-white border-2 border-gray-200 hover:border-blue-600 text-slate-700 hover:text-blue-600 rounded-full font-bold text-lg transition-all group shadow-sm hover:shadow-xl">
                 Xem toàn bộ thị trường <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform"/>
              </Link>
           </div>
         </div>
      </section>

      {/* =================================================================
          3. COMMUNITY STATS & LEADERBOARD (DARK MODE SECTION)
      ================================================================== */}
      <section className="py-24 bg-[#0F172A] text-white relative overflow-hidden">
         <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>
         
         <div className="max-w-7xl mx-auto px-6 relative z-10">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
               
               {/* Left: Stats */}
               <div className="space-y-12">
                  <div className="inline-block px-4 py-1.5 bg-yellow-500/20 text-yellow-400 rounded-lg text-xs font-bold uppercase tracking-widest border border-yellow-500/30">
                    <Activity size={14} className="inline mr-2"/> Thống kê thời gian thực
                  </div>
                  <h2 className="text-5xl font-black leading-tight">
                    Cộng đồng <br/> <span className="text-blue-500">Lớn mạnh nhất</span>
                  </h2>
                  <p className="text-slate-400 text-lg max-w-md">
                    Dữ liệu cho thấy sự tin tưởng của sinh viên đối với nền tảng BK Exchange trong học kỳ này.
                  </p>

                  <div className="grid grid-cols-2 gap-8">
                     {[
                       { val: 8500, label: "Sản phẩm đã bán", icon: <Package size={24} className="text-blue-400"/> },
                       { val: 25000, label: "Thành viên", icon: <Users size={24} className="text-purple-400"/> },
                       { val: 98, label: "% Hài lòng", icon: <Smile size={24} className="text-green-400"/>, suffix: "%" },
                       { val: 12000, label: "Lượt tìm kiếm/ngày", icon: <Search size={24} className="text-orange-400"/> },
                     ].map((s, i) => (
                       <div key={i} className="bg-white/5 border border-white/10 p-6 rounded-2xl backdrop-blur-sm hover:bg-white/10 transition-colors">
                          <div className="mb-4">{s.icon}</div>
                          <div className="text-4xl font-black text-white mb-1">
                            <Counter end={s.val} suffix={s.suffix || "+"} />
                          </div>
                          <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">{s.label}</div>
                       </div>
                     ))}
                  </div>
               </div>

               {/* Right: Leaderboard */}
               <div className="bg-gradient-to-b from-slate-800 to-slate-900 rounded-[2.5rem] border border-white/10 p-8 shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/20 rounded-full blur-[100px]"></div>
                  
                  <div className="flex items-center justify-between mb-8 relative z-10">
                     <h3 className="text-2xl font-black flex items-center gap-3">
                       <Trophy className="text-yellow-400 fill-yellow-400" size={28}/> 
                       Top Sellers Tuần
                     </h3>
                     <button className="text-xs font-bold text-blue-400 hover:text-white transition-colors">Xem BXH đầy đủ</button>
                  </div>

                  <div className="space-y-4 relative z-10">
                     {TOP_SELLERS.map((seller, idx) => (
                        <div key={seller.id} className="flex items-center gap-4 p-4 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 transition-all cursor-pointer group">
                           <div className="font-black text-2xl w-8 text-center text-slate-600 group-hover:text-white transition-colors">
                             {idx + 1}
                           </div>
                           <img src={seller.avatar} alt={seller.name} className="w-12 h-12 rounded-full border-2 border-slate-700 group-hover:border-blue-500 transition-colors"/>
                           <div className="flex-1">
                              <h4 className="font-bold text-white group-hover:text-blue-400 transition-colors">{seller.name}</h4>
                              <p className="text-xs text-slate-400">{seller.role}</p>
                           </div>
                           <div className="text-right">
                              <div className="font-black text-white">{seller.sales} đơn</div>
                              <div className="text-xs text-yellow-400 flex items-center gap-1 justify-end">
                                <Star size={10} fill="currentColor"/> {seller.rating}
                              </div>
                           </div>
                        </div>
                     ))}
                  </div>

                  <div className="mt-8 p-4 bg-blue-600/20 border border-blue-500/30 rounded-xl text-center">
                     <p className="text-sm font-medium text-blue-200">
                        🏆 Đua top ngay để nhận huy hiệu <strong>"Uy Tín"</strong> và quà tặng từ Bách Khoa!
                     </p>
                  </div>
               </div>

            </div>
         </div>
      </section>

      {/* =================================================================
          4. MARQUEE & TESTIMONIALS
      ================================================================== */}
      <section className="py-20 bg-white overflow-hidden">
         <div className="text-center mb-16">
            <h2 className="text-3xl font-black text-slate-900">Sinh viên nói gì về BK Exchange?</h2>
         </div>
         
         <div className="relative w-full overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-white to-transparent z-10"></div>
            <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-white to-transparent z-10"></div>
            
            <div className="flex w-[200%] animate-marquee hover:[animation-play-state:paused]">
               {[...TESTIMONIALS, ...TESTIMONIALS, ...TESTIMONIALS].map((item, i) => (
                  <div key={i} className="flex-shrink-0 w-[400px] mx-6 p-8 bg-gray-50 rounded-3xl border border-gray-100 hover:shadow-xl transition-shadow cursor-default">
                     <div className="flex gap-1 mb-4 text-yellow-400">
                        {[1,2,3,4,5].map(s => <Star key={s} size={16} fill="currentColor"/>)}
                     </div>
                     <p className="text-slate-700 text-lg font-medium leading-relaxed mb-6">"{item.text}"</p>
                     <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center font-black text-blue-600 text-xs">
                           {item.author.charAt(0)}
                        </div>
                        <div>
                           <h5 className="font-bold text-slate-900">{item.author}</h5>
                           <p className="text-xs text-slate-500">{item.role}</p>
                        </div>
                     </div>
                  </div>
               ))}
            </div>
         </div>
      </section>

      {/* =================================================================
          5. CATEGORY STRIP (NAV)
      ================================================================== */}
      <div className="py-10 border-t border-gray-100 bg-[#F8FAFC]">
         <div className="max-w-7xl mx-auto px-6">
            <div className="flex flex-wrap justify-center gap-4">
               {CATEGORIES.map(cat => (
                  <Link 
                    key={cat.id} 
                    to={`/market?cat=${encodeURIComponent(cat.id)}`}
                    className="flex items-center gap-3 px-6 py-4 bg-white rounded-2xl shadow-sm border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all group"
                  >
                     <div className={`p-2 rounded-lg ${cat.bg} ${cat.color} group-hover:scale-110 transition-transform`}>{cat.icon}</div>
                     <div className="text-left">
                        <h6 className="font-bold text-slate-800 group-hover:text-blue-600 transition-colors">{cat.label}</h6>
                        <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">{cat.desc}</p>
                     </div>
                  </Link>
               ))}
            </div>
         </div>
      </div>

      {/* =================================================================
          6. MEGA FOOTER
      ================================================================== */}
      <footer className="bg-[#0F172A] text-slate-400 pt-24 pb-12 border-t border-white/5">
         <div className="max-w-7xl mx-auto px-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-20">
               {/* Brand Column */}
               <div className="space-y-6">
                  <div className="flex items-center gap-3 text-white">
                     <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/20">
                        <ShoppingBag size={24}/>
                     </div>
                     <span className="text-2xl font-black tracking-tight">CHỢ BK</span>
                  </div>
                  <p className="leading-relaxed">
                     Dự án phi lợi nhuận hỗ trợ sinh viên ĐH Bách Khoa TP.HCM (HCMUT). 
                     Xây dựng môi trường mua bán văn minh, hiện đại.
                  </p>
                  <div className="flex gap-4 pt-2">
                     {['facebook', 'instagram', 'github', 'youtube'].map(icon => (
                        <a key={icon} href="#" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/20 hover:text-white transition-all">
                           <Globe size={18}/>
                        </a>
                     ))}
                  </div>
               </div>

               {/* Links Columns */}
               <div>
                  <h4 className="font-bold text-white mb-6">Khám phá</h4>
                  <ul className="space-y-4">
                     <li><Link to="/market" className="hover:text-blue-400 transition-colors">Dạo chợ online</Link></li>
                     <li><Link to="/post-item" className="hover:text-blue-400 transition-colors">Đăng tin bán</Link></li>
                     <li><Link to="/saved" className="hover:text-blue-400 transition-colors">Sản phẩm yêu thích</Link></li>
                     <li><a href="#" className="hover:text-blue-400 transition-colors">Sự kiện & Khuyến mãi</a></li>
                  </ul>
               </div>

               <div>
                  <h4 className="font-bold text-white mb-6">Hỗ trợ</h4>
                  <ul className="space-y-4">
                     <li><a href="#" className="hover:text-blue-400 transition-colors">Trung tâm trợ giúp</a></li>
                     <li><a href="#" className="hover:text-blue-400 transition-colors">Quy định đăng tin</a></li>
                     <li><a href="#" className="hover:text-blue-400 transition-colors">Chính sách bảo mật</a></li>
                     <li><a href="#" className="hover:text-blue-400 transition-colors">Báo cáo lừa đảo</a></li>
                  </ul>
               </div>

               <div>
                  <h4 className="font-bold text-white mb-6">Liên hệ</h4>
                  <ul className="space-y-4">
                     <li className="flex items-start gap-3">
                        <MapPin size={20} className="text-blue-500 shrink-0 mt-1"/>
                        <span>268 Lý Thường Kiệt, P.14, Q.10, TP.HCM (Tòa nhà H6)</span>
                     </li>
                     <li className="flex items-center gap-3">
                        <Server size={20} className="text-blue-500 shrink-0"/>
                        <span>support@hcmut.edu.vn</span>
                     </li>
                     <li className="flex items-center gap-3">
                        <Smartphone size={20} className="text-blue-500 shrink-0"/>
                        <span>(028) 3864 7256</span>
                     </li>
                  </ul>
               </div>
            </div>

            {/* Bottom Bar */}
            <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 text-xs font-medium uppercase tracking-wider">
               <p>&copy; {new Date().getFullYear()} HCMUT Student Team. All rights reserved.</p>
               <div className="flex gap-8">
                  <a href="#" className="hover:text-white transition-colors">Điều khoản</a>
                  <a href="#" className="hover:text-white transition-colors">Bảo mật</a>
                  <a href="#" className="hover:text-white transition-colors">Sitemap</a>
               </div>
            </div>
         </div>
      </footer>

    </div>
  );
};

export default HomePage;
