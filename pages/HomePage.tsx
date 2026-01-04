import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Search, ArrowRight, Zap, ShieldCheck, Users, 
  BookOpen, Calculator, Shirt, Plug, ChevronDown, 
  MapPin, CheckCircle2, Flame, Gift, Tag, Eye, 
  Share2, Facebook, Instagram, Youtube, Twitter, 
  Mail, Phone, ShoppingBag, Clock, Grid, Layout, 
  Sparkles, Star, TrendingUp, Monitor, Cpu, Ghost, MoreHorizontal
} from 'lucide-react';
import { supabase } from '../services/supabase';
import { Product, ProductCategory, ProductCondition } from '../types';

// ============================================================================
// 1. GLOBAL STYLES & KEYFRAMES INJECTION (THE ART CORE)
// ============================================================================
// Giữ nguyên toàn bộ CSS để đảm bảo độ mượt và hiệu ứng "ảo diệu"
const GlobalStyles = () => (
  <style>{`
    @keyframes float {
      0%, 100% { transform: translateY(0px); }
      50% { transform: translateY(-20px); }
    }
    @keyframes float-delayed {
      0%, 100% { transform: translateY(0px); }
      50% { transform: translateY(-15px); }
    }
    @keyframes shine {
      0% { left: -100%; opacity: 0; }
      50% { opacity: 0.5; }
      100% { left: 100%; opacity: 0; }
    }
    @keyframes blob {
      0% { transform: translate(0px, 0px) scale(1); }
      33% { transform: translate(30px, -50px) scale(1.1); }
      66% { transform: translate(-20px, 20px) scale(0.9); }
      100% { transform: translate(0px, 0px) scale(1); }
    }
    @keyframes scroll-left {
      0% { transform: translateX(0); }
      100% { transform: translateX(-50%); }
    }
    .animate-float { animation: float 6s ease-in-out infinite; }
    .animate-float-delayed { animation: float-delayed 7s ease-in-out infinite; animation-delay: 2s; }
    .animate-blob { animation: blob 7s infinite; }
    .animate-shine { position: absolute; top: 0; width: 50%; height: 100%; background: linear-gradient(to right, transparent, rgba(255,255,255,0.3), transparent); transform: skewX(-20deg); animation: shine 3s infinite; }
    .animate-scroll { animation: scroll-left 40s linear infinite; }
    
    .glass-panel {
      background: rgba(255, 255, 255, 0.7);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.5);
    }
    
    .reveal-item { opacity: 0; transform: translateY(30px); transition: all 0.8s cubic-bezier(0.5, 0, 0, 1); }
    .reveal-item.active { opacity: 1; transform: translateY(0); }

    /* Custom Scrollbar for sleek look */
    ::-webkit-scrollbar { width: 8px; }
    ::-webkit-scrollbar-track { background: #f1f1f1; }
    ::-webkit-scrollbar-thumb { background: #c1c1c1; border-radius: 4px; }
    ::-webkit-scrollbar-thumb:hover { background: #a8a8a8; }
  `}</style>
);

// ============================================================================
// 2. TYPES & CONFIG (UPDATED TO MATCH types.ts)
// ============================================================================

const THEME = {
  primary: '#00418E', // Cobalt Blue - Màu thương hiệu Bách Khoa
  secondary: '#00B0F0',
  accent: '#FFD700',
};

// ĐÃ SỬA: Đồng bộ danh mục với Product Category trong types.ts
const CATEGORIES = [
  { 
    id: ProductCategory.TEXTBOOK, 
    label: 'Giáo trình', 
    icon: <BookOpen size={28}/>, 
    bg: 'bg-blue-100', text: 'text-blue-600', 
    desc: 'Sách, Slide, Đề thi cũ' 
  },
  { 
    id: ProductCategory.ELECTRONICS, 
    label: 'Điện tử', 
    icon: <Monitor size={28}/>, 
    bg: 'bg-indigo-100', text: 'text-indigo-600', 
    desc: 'Laptop, Chuột, Máy tính' 
  },
  { 
    id: ProductCategory.SUPPLIES, 
    label: 'Dụng cụ', 
    icon: <Calculator size={28}/>, 
    bg: 'bg-green-100', text: 'text-green-600', 
    desc: 'Casio, Thước, Bảng vẽ' 
  },
  { 
    id: ProductCategory.CLOTHING, 
    label: 'Đồng phục', 
    icon: <Shirt size={28}/>, 
    bg: 'bg-orange-100', text: 'text-orange-600', 
    desc: 'Áo Khoa, Balo, Giày' 
  },
  { 
    id: ProductCategory.OTHER, 
    label: 'Khác', 
    icon: <MoreHorizontal size={28}/>, 
    bg: 'bg-purple-100', text: 'text-purple-600', 
    desc: 'Nội thất, Xe cộ, ...' 
  },
];

const TRUST_BADGES = [
  { title: "Xác thực 100%", desc: "Email sinh viên @hcmut.edu.vn", icon: <ShieldCheck size={32}/>, color: "text-blue-500" },
  { title: "An toàn", desc: "Giao dịch tại H6, Thư viện", icon: <MapPin size={32}/>, color: "text-green-500" },
  { title: "Cộng đồng", desc: "25,000+ Thành viên Bách Khoa", icon: <Users size={32}/>, color: "text-purple-500" },
];

// ============================================================================
// 3. ANIMATED COMPONENTS (HOOKS & HELPERS)
// ============================================================================

/**
 * RevealOnScroll: Component bao bọc để tạo hiệu ứng "trượt lên" khi cuộn tới
 */
const RevealOnScroll = ({ children, delay = 0, className = "" }: { children: React.ReactNode, delay?: number, className?: string }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsVisible(true);
        observer.unobserve(entry.target);
      }
    }, { threshold: 0.1 });

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div 
      ref={ref} 
      className={`reveal-item ${isVisible ? 'active' : ''} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
};

/**
 * Counter: Hiệu ứng số nhảy (Gamification)
 */
const Counter = ({ end, duration = 2000, suffix = "" }: { end: number, duration?: number, suffix?: string }) => {
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
  return <span>{count.toLocaleString()}{suffix}</span>;
};

/**
 * Typewriter: Hiệu ứng gõ chữ tìm kiếm thông minh
 */
const TypewriterInput = ({ onSearch }: { onSearch: (val: string) => void }) => {
  const placeholders = ["Tìm 'Giáo trình Giải tích 1'...", "Tìm 'Casio 580VNX cũ'...", "Tìm 'Áo Khoa size L'..."];
  const [text, setText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [loopNum, setLoopNum] = useState(0);
  const [typingSpeed, setTypingSpeed] = useState(150);
  const [inputValue, setInputValue] = useState("");

  useEffect(() => {
    const handleType = () => {
      const i = loopNum % placeholders.length;
      const fullText = placeholders[i];
      setText(isDeleting ? fullText.substring(0, text.length - 1) : fullText.substring(0, text.length + 1));
      setTypingSpeed(isDeleting ? 30 : 100);

      if (!isDeleting && text === fullText) {
        setTimeout(() => setIsDeleting(true), 1500);
      } else if (isDeleting && text === "") {
        setIsDeleting(false);
        setLoopNum(loopNum + 1);
      }
    };
    const timer = setTimeout(handleType, typingSpeed);
    return () => clearTimeout(timer);
  }, [text, isDeleting, loopNum, typingSpeed]);

  return (
    <div className="relative w-full group">
      <div className="absolute -inset-1 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 rounded-full blur opacity-25 group-hover:opacity-75 transition duration-1000 animate-pulse"></div>
      <form 
        onSubmit={(e) => { e.preventDefault(); onSearch(inputValue); }}
        className="relative flex items-center bg-white/95 backdrop-blur-xl rounded-full shadow-2xl p-2 transition-transform transform hover:scale-[1.01] border border-white/50"
      >
        <Search className="ml-4 text-gray-400 w-6 h-6" />
        <input 
          type="text" 
          className="w-full h-14 pl-4 pr-12 bg-transparent border-none outline-none text-lg text-gray-800 font-medium placeholder-gray-400"
          placeholder={text} // Hiệu ứng placeholder chạy chạy
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
        />
        <button className="bg-[#00418E] text-white px-8 h-12 rounded-full font-bold hover:bg-[#003370] transition-all shadow-lg active:scale-95 flex items-center gap-2 overflow-hidden relative group/btn">
          <span className="relative z-10">TÌM KIẾM</span>
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/btn:animate-[shine_1s_infinite]"></div>
        </button>
      </form>
    </div>
  );
};

// ============================================================================
// 4. MAIN HOMEPAGE COMPONENT
// ============================================================================

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Parallax State (Hiệu ứng di chuột nền)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // Handle Mouse Move for Parallax
  const handleMouseMove = (e: React.MouseEvent) => {
    const x = (e.clientX - window.innerWidth / 2) / 40;
    const y = (e.clientY - window.innerHeight / 2) / 40;
    setMousePos({ x, y });
  };

  // Fetch Real Data from Supabase
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const { data } = await supabase
          .from('products')
          .select('*, profiles:seller_id(name, avatar_url)')
          .eq('status', 'available')
          .order('posted_at', { ascending: false })
          .limit(8);

        if (data) {
          const mapped = data.map((item: any) => ({
            ...item, 
            sellerId: item.seller_id, 
            tradeMethod: item.trade_method, 
            postedAt: item.posted_at, 
            status: item.status, 
            seller: item.profiles, 
            view_count: item.view_count || 0
          }));
          setProducts(mapped);
        }
      } catch (e) { console.error(e); } finally { setLoading(false); }
    };
    fetchData();
  }, []);

  const handleSearch = (term: string) => {
    if(term.trim()) navigate(`/market?search=${encodeURIComponent(term)}`);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans text-slate-800 overflow-x-hidden selection:bg-[#00418E] selection:text-white">
      <GlobalStyles />

      {/* =================================================================
          1. HERO SECTION (PARALLAX + ANIMATED BACKGROUND)
      ================================================================== */}
      <section 
        className="relative w-full min-h-[850px] flex items-center justify-center overflow-hidden bg-[#00418E]"
        onMouseMove={handleMouseMove}
      >
        {/* Animated Background Layers */}
        <div className="absolute inset-0 z-0 pointer-events-none">
          {/* Background Image BK */}
          <div className="absolute inset-0 bg-[url('https://hcmut.edu.vn/img/campus/campus-1.jpg')] bg-cover bg-center opacity-10 mix-blend-overlay scale-110 grayscale"></div>
          <div className="absolute inset-0 bg-gradient-to-b from-[#00418E]/95 via-[#00418E]/85 to-[#F8FAFC]"></div>
          
          {/* Moving Blobs (Hiệu ứng đốm sáng di chuyển theo chuột) */}
          <div 
            className="absolute top-[-10%] right-[-5%] w-[800px] h-[800px] bg-blue-400/20 rounded-full blur-[100px] animate-float"
            style={{ transform: `translate(${mousePos.x}px, ${mousePos.y}px)` }}
          ></div>
          <div 
            className="absolute bottom-[20%] left-[-10%] w-[600px] h-[600px] bg-purple-500/20 rounded-full blur-[80px] animate-float-delayed"
            style={{ transform: `translate(${mousePos.x * -1}px, ${mousePos.y * -1}px)` }}
          ></div>
          
          {/* Grid Pattern Overlay */}
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5"></div>
        </div>

        {/* Hero Content */}
        <div className="relative z-10 w-full max-w-6xl px-4 flex flex-col items-center text-center mt-[-60px]">
          
          {/* Badge */}
          <RevealOnScroll className="inline-flex items-center gap-3 px-6 py-2.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white shadow-2xl mb-8 hover:bg-white/20 transition-all cursor-default group">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-yellow-500"></span>
            </span>
            <span className="text-xs font-black uppercase tracking-[0.2em] group-hover:tracking-[0.25em] transition-all">Cộng đồng Sinh Viên Bách Khoa</span>
          </RevealOnScroll>

          {/* Main Headline */}
          <RevealOnScroll delay={200}>
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-black text-white mb-6 leading-[1.1] tracking-tight drop-shadow-2xl">
              Cũ Người <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-200 via-white to-blue-200 animate-pulse">
                Mới Ta.
              </span>
            </h1>
          </RevealOnScroll>

          <RevealOnScroll delay={400}>
            <p className="text-blue-100 text-lg md:text-2xl mb-12 max-w-3xl font-medium leading-relaxed opacity-90">
              Sàn giao dịch đồ cũ thông minh, an toàn & tiết kiệm.
              <br/>Kết nối hơn <strong className="text-yellow-300">25,000+</strong> thành viên HCMUT.
            </p>
          </RevealOnScroll>

          {/* Search */}
          <RevealOnScroll delay={600} className="w-full max-w-2xl mb-16">
            <TypewriterInput onSearch={handleSearch} />
          </RevealOnScroll>

          {/* Stats Counters */}
          <div className="grid grid-cols-3 gap-6 md:gap-24 text-white w-full max-w-4xl border-t border-white/10 pt-10 px-4">
            {[
              { label: "Sản phẩm", val: 8500, suffix: "+" },
              { label: "Thành viên", val: 25000, suffix: "+" },
              { label: "Giao dịch", val: 14200, suffix: "+" },
            ].map((stat, i) => (
              <RevealOnScroll key={i} delay={800 + i * 100}>
                <div className="text-center group cursor-default">
                  <p className="text-3xl md:text-5xl font-black group-hover:scale-110 transition-transform duration-500 group-hover:text-yellow-300 drop-shadow-md">
                    <Counter end={stat.val} suffix={stat.suffix} />
                  </p>
                  <p className="text-[10px] md:text-sm uppercase font-bold tracking-widest opacity-70 mt-2">{stat.label}</p>
                </div>
              </RevealOnScroll>
            ))}
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce text-white/50 cursor-pointer hover:text-white transition-colors">
          <ChevronDown size={32} strokeWidth={3} />
        </div>
      </section>

      {/* =================================================================
          2. MARQUEE CATEGORIES (DANH MỤC TRƯỢT NGANG)
      ================================================================== */}
      <div className="bg-white py-12 border-b border-gray-100 overflow-hidden relative shadow-sm z-20">
        <div className="flex w-[200%] animate-scroll hover:[animation-play-state:paused]">
          {[...CATEGORIES, ...CATEGORIES].map((cat, i) => (
            <div 
              key={i} 
              onClick={() => navigate(`/market?cat=${cat.id}`)}
              className="flex-shrink-0 w-64 mx-6 p-6 rounded-2xl bg-gray-50 border border-gray-100 flex items-center gap-4 cursor-pointer hover:bg-white hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group"
            >
              <div className={`w-14 h-14 rounded-full ${cat.bg} ${cat.text} flex items-center justify-center transition-transform group-hover:scale-110 group-hover:rotate-12`}>
                {cat.icon}
              </div>
              <div>
                <h4 className="font-bold text-gray-800 group-hover:text-[#00418E] transition-colors text-lg">{cat.label}</h4>
                <p className="text-xs text-gray-500 mt-1">{cat.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* =================================================================
          3. FEATURED PRODUCTS (SẢN PHẨM MỚI - GRID)
      ================================================================== */}
      <section className="py-24 max-w-7xl mx-auto px-4">
        <RevealOnScroll>
          <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="p-2 bg-red-100 text-red-500 rounded-lg animate-pulse"><Flame size={20} fill="currentColor"/></div>
                <span className="text-red-500 font-bold uppercase tracking-widest text-sm">Hot New Items</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-black text-[#1E293B]">Vừa Lên Sàn</h2>
            </div>
            <button 
              onClick={() => navigate('/market')} 
              className="group flex items-center gap-2 px-6 py-3 bg-white border-2 border-gray-200 rounded-xl font-bold text-gray-600 hover:border-[#00418E] hover:text-[#00418E] transition-all hover:shadow-lg"
            >
              Xem tất cả <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform"/>
            </button>
          </div>
        </RevealOnScroll>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {loading ? (
            // Skeleton Loading Animation
            [...Array(8)].map((_, i) => (
              <div key={i} className="bg-white rounded-3xl h-[400px] border border-gray-100 p-4 space-y-4 shadow-sm">
                <div className="h-56 bg-gray-200 rounded-2xl animate-pulse w-full"></div>
                <div className="h-6 bg-gray-200 rounded-full w-3/4 animate-pulse"></div>
                <div className="h-4 bg-gray-200 rounded-full w-1/2 animate-pulse"></div>
                <div className="h-10 bg-gray-200 rounded-xl w-full mt-4 animate-pulse"></div>
              </div>
            ))
          ) : (
            products.map((product, idx) => (
              <RevealOnScroll key={product.id} delay={idx * 100}>
                <div 
                  onClick={() => navigate(`/product/${product.id}`)}
                  className="group bg-white rounded-3xl border border-gray-100 overflow-hidden hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] hover:-translate-y-2 transition-all duration-500 cursor-pointer flex flex-col h-full relative"
                >
                  {/* Image Container with Zoom Effect */}
                  <div className="aspect-[4/3] relative overflow-hidden bg-gray-50">
                    <img 
                      src={product.images[0] || 'https://via.placeholder.com/400'} 
                      alt={product.title} 
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 mix-blend-multiply" 
                      loading="lazy"
                    />
                    
                    {/* Badges */}
                    <div className="absolute top-4 left-4 flex flex-col gap-2">
                      {product.price === 0 && (
                        <span className="bg-red-500 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-lg animate-pulse flex items-center gap-1">
                          <Gift size={12} /> 0Đ
                        </span>
                      )}
                      <span className="bg-white/90 backdrop-blur text-gray-700 text-[10px] font-bold px-3 py-1 rounded-full shadow-sm border border-white">
                        {product.condition}
                      </span>
                    </div>

                    {/* Hover Actions */}
                    <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-3 backdrop-blur-[2px]">
                      <button className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-[#00418E] hover:scale-110 transition-transform shadow-xl">
                        <Eye size={24} />
                      </button>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-6 flex flex-col flex-1">
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                      <span className="bg-blue-50 text-[#00418E] px-2 py-0.5 rounded border border-blue-100">{product.category}</span>
                      <span>•</span> {new Date(product.postedAt).toLocaleDateString('vi-VN')}
                    </div>
                    <h3 className="font-bold text-gray-900 text-lg mb-4 line-clamp-2 group-hover:text-[#00418E] transition-colors leading-snug min-h-[56px]">{product.title}</h3>
                    <div className="mt-auto pt-4 border-t border-gray-100 flex justify-between items-center">
                      <span className="text-2xl font-black text-[#00418E]">
                        {product.price === 0 ? 'Tặng miễn phí' : `${product.price.toLocaleString('vi-VN')}đ`}
                      </span>
                      <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-[#00418E] group-hover:text-white transition-all">
                        <ArrowRight size={16}/>
                      </div>
                    </div>
                  </div>
                </div>
              </RevealOnScroll>
            ))
          )}
        </div>
      </section>

      {/* =================================================================
          4. AI BANNER (HOVER 3D EFFECT)
      ================================================================== */}
      <section className="py-20 px-4">
        <RevealOnScroll>
          <div className="max-w-7xl mx-auto relative rounded-[3rem] overflow-hidden bg-[#0F172A] shadow-2xl group perspective-1000">
            {/* Animated Background */}
            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-600/20 rounded-full blur-[120px] animate-pulse"></div>
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[120px] animate-pulse animation-delay-2000"></div>
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20"></div>

            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-16 p-12 md:p-24 items-center">
              <div className="space-y-8">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-lg bg-blue-500/20 text-blue-300 text-xs font-bold uppercase tracking-widest border border-blue-500/30 shadow-lg shadow-blue-500/10">
                  <Sparkles size={14}/> AI Powered
                </div>
                <h2 className="text-5xl md:text-6xl font-black text-white leading-[1.1]">
                  Đăng tin <br/> 
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">Siêu Tốc Độ.</span>
                </h2>
                <p className="text-slate-400 text-lg leading-relaxed max-w-md">
                  Công nghệ Gemini AI sẽ tự động phân tích hình ảnh, viết mô tả và định giá sản phẩm chỉ trong 30 giây. Tiết kiệm thời gian, tăng hiệu quả.
                </p>
                <div className="flex flex-wrap gap-4 pt-4">
                  <button onClick={() => navigate('/post')} className="px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-lg shadow-blue-600/30 transition-all hover:scale-105 active:scale-95 flex items-center gap-2">
                    <Zap size={20} className="fill-current"/> Thử Ngay
                  </button>
                  <button onClick={() => navigate('/market')} className="px-8 py-4 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-xl font-bold transition-all">
                    Xem Demo
                  </button>
                </div>
              </div>

              {/* 3D Floating Elements Simulation */}
              <div className="relative h-[400px] flex items-center justify-center transform group-hover:rotate-y-6 transition-transform duration-700">
                {/* Main Card */}
                <div className="absolute z-20 w-72 bg-white/10 backdrop-blur-xl border border-white/20 p-6 rounded-3xl shadow-2xl animate-float">
                  <div className="h-40 bg-white/5 rounded-xl mb-4 flex items-center justify-center border border-white/10">
                    <Monitor size={48} className="text-blue-400 opacity-80"/>
                  </div>
                  <div className="space-y-3">
                    <div className="h-3 w-2/3 bg-white/20 rounded-full"></div>
                    <div className="h-3 w-full bg-white/10 rounded-full"></div>
                    <div className="h-3 w-1/2 bg-white/10 rounded-full"></div>
                  </div>
                  <div className="mt-6 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                      <CheckCircle2 size={16} className="text-green-400"/>
                    </div>
                    <span className="text-xs font-bold text-green-400">AI Analysis Complete</span>
                  </div>
                </div>

                {/* Floating Bubbles */}
                <div className="absolute top-10 right-10 bg-purple-500/80 p-4 rounded-2xl shadow-xl animate-float-delayed z-30">
                  <Cpu className="text-white" size={24}/>
                </div>
                <div className="absolute bottom-20 left-0 bg-blue-500/80 p-4 rounded-2xl shadow-xl animate-float z-30">
                  <Tag className="text-white" size={24}/>
                </div>
              </div>
            </div>
          </div>
        </RevealOnScroll>
      </section>

      {/* =================================================================
          5. TRUST & FEATURES (HOVER CARDS)
      ================================================================== */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <RevealOnScroll>
            <div className="text-center mb-20">
              <h2 className="text-4xl font-black text-[#1E293B] mb-4">An Tâm Tuyệt Đối</h2>
              <p className="text-gray-500 text-lg">Nền tảng được xây dựng với tiêu chuẩn bảo mật cao nhất dành cho sinh viên.</p>
            </div>
          </RevealOnScroll>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {TRUST_BADGES.map((item, idx) => (
              <RevealOnScroll key={idx} delay={idx * 150}>
                <div className="group p-10 rounded-[2.5rem] bg-gray-50 border border-transparent hover:bg-white hover:border-gray-100 hover:shadow-2xl transition-all duration-500 text-center">
                  <div className={`w-20 h-20 mx-auto rounded-3xl bg-white shadow-sm flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-500 ${item.color}`}>
                    {item.icon}
                  </div>
                  <h3 className="text-xl font-black text-gray-900 mb-3">{item.title}</h3>
                  <p className="text-gray-500 leading-relaxed">{item.desc}</p>
                </div>
              </RevealOnScroll>
            ))}
          </div>
        </div>
      </section>

      {/* =================================================================
          6. FOOTER (CLEAN & MINIMAL)
      ================================================================== */}
      <footer className="bg-white border-t border-gray-100 pt-20 pb-10">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-12 mb-16">
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-[#00418E] rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-200">
                  <ShoppingBag size={24}/>
                </div>
                <span className="text-2xl font-black text-[#00418E] tracking-tight">CHỢ BK</span>
              </div>
              <p className="text-gray-500 leading-relaxed text-sm">
                Dự án phi lợi nhuận hỗ trợ sinh viên ĐH Bách Khoa TP.HCM.
                <br/>Kết nối - Chia sẻ - Tiết kiệm.
              </p>
              <div className="flex gap-4">
                {[Facebook, Instagram, Youtube].map((Icon, i) => (
                  <a key={i} href="#" className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-[#00418E] hover:text-white transition-all hover:-translate-y-1">
                    <Icon size={18}/>
                  </a>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-bold text-gray-900 mb-6 uppercase text-xs tracking-widest">Khám phá</h4>
              <ul className="space-y-4 text-sm text-gray-500">
                {['Về chúng tôi', 'Quy chế hoạt động', 'Chính sách bảo mật', 'Tuyển dụng Admin'].map(Link => (
                  <li key={Link}><a href="#" className="hover:text-[#00418E] transition-colors">{Link}</a></li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-gray-900 mb-6 uppercase text-xs tracking-widest">Danh mục</h4>
              <ul className="space-y-4 text-sm text-gray-500">
                {CATEGORIES.map(cat => (
                  <li key={cat.id}><Link to={`/market?cat=${cat.id}`} className="hover:text-[#00418E] transition-colors">{cat.label}</Link></li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-gray-900 mb-6 uppercase text-xs tracking-widest">Liên hệ</h4>
              <ul className="space-y-4 text-sm text-gray-500">
                <li className="flex items-center gap-3"><MapPin size={18} className="text-[#00418E]"/> 268 Lý Thường Kiệt, Q.10</li>
                <li className="flex items-center gap-3"><Mail size={18} className="text-[#00418E]"/> support@chobk.com</li>
                <li className="flex items-center gap-3"><Phone size={18} className="text-[#00418E]"/> 0123.456.789</li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-gray-400 font-medium">
            <p>&copy; {new Date().getFullYear()} Chợ BK Team. All rights reserved.</p>
            <div className="flex gap-8">
              <a href="#" className="hover:text-[#00418E]">Điều khoản</a>
              <a href="#" className="hover:text-[#00418E]">Bảo mật</a>
              <a href="#" className="hover:text-[#00418E]">Sitemap</a>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
};

export default HomePage;
