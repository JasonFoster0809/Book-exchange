import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Search, Sparkles, ArrowRight, Zap, ShieldCheck, Users, 
  BookOpen, Calculator, Shirt, Plug, ChevronDown, Monitor, 
  Code, Cpu, GraduationCap, Terminal, Star, Quote, 
  HelpCircle, ChevronRight, ChevronLeft, Bell, MapPin, 
  CheckCircle2, Play, Pause, TrendingUp, Flame, Gift,
  Tag, Eye, Share2, Facebook, Instagram, Youtube, Twitter, 
  Mail, Phone, ShoppingBag, MessageCircle, Clock, Heart,
  AlertCircle, ArrowUpRight
} from 'lucide-react';
import { supabase } from '../services/supabase';
import { Product } from '../types';
import { useAuth } from '../contexts/AuthContext';

// ============================================================================
// 1. SYSTEM CONFIGURATION & TYPES
// ============================================================================

const CONFIG = {
  colors: {
    primary: '#00418E', // BK Cobalt Blue
    secondary: '#00B0F0', // BK Light Blue
    accent: '#FFD700', // Gold
    dark: '#0F172A',
    light: '#F8FAFC',
  },
  animation: {
    slow: '1000ms',
    medium: '500ms',
    fast: '300ms',
  }
};

// Mở rộng Product type cho hiển thị UI
interface ExtendedProduct extends Product {
  badge?: 'new' | 'hot' | 'sale';
}

interface Testimonial {
  id: number;
  name: string;
  role: string;
  avatar: string;
  content: string;
  rating: number;
}

// ============================================================================
// 2. MOCK DATA (RICH CONTENT)
// ============================================================================

const TRENDING_KEYWORDS = [
  "Giải tích 1", "Đại số tuyến tính", "Casio 580VNX", 
  "Áo khoác BK", "Chuột Logitech", "Bàn phím cơ", 
  "Giáo trình Triết", "Quạt máy cũ"
];

const CATEGORIES_DATA = [
  { 
    id: 'giao-trinh', 
    name: 'Tài liệu học tập', 
    sub: 'Giáo trình, Slide, Đề thi', 
    icon: <BookOpen size={28} />, 
    gradient: 'from-blue-500 to-cyan-500',
    bg: 'bg-blue-50',
    text: 'text-blue-600',
    count: 2450 
  },
  { 
    id: 'cong-nghe', 
    name: 'Đồ công nghệ', 
    sub: 'Laptop, Điện thoại, Phụ kiện', 
    icon: <Cpu size={28} />, 
    gradient: 'from-indigo-500 to-purple-500',
    bg: 'bg-indigo-50',
    text: 'text-indigo-600',
    count: 1280 
  },
  { 
    id: 'dung-cu', 
    name: 'Dụng cụ & VP phẩm', 
    icon: <Calculator size={28} />, 
    sub: 'Máy tính, Thước, Bảng vẽ', 
    gradient: 'from-emerald-500 to-teal-500',
    bg: 'bg-emerald-50',
    text: 'text-emerald-600',
    count: 850 
  },
  { 
    id: 'thoi-trang', 
    name: 'Thời trang BK', 
    sub: 'Đồng phục, Balo, Áo khoa', 
    icon: <Shirt size={28} />, 
    gradient: 'from-orange-500 to-red-500',
    bg: 'bg-orange-50',
    text: 'text-orange-600',
    count: 420 
  },
  { 
    id: 'gia-dung', 
    name: 'Đồ gia dụng KTX', 
    sub: 'Quạt, Ổ cắm, Kệ sách', 
    icon: <Plug size={28} />, 
    gradient: 'from-pink-500 to-rose-500',
    bg: 'bg-pink-50',
    text: 'text-pink-600',
    count: 630 
  },
  { 
    id: 'xe-co', 
    name: 'Phương tiện đi lại', 
    sub: 'Xe đạp, Xe máy, Phụ tùng', 
    icon: <MapPin size={28} />, 
    gradient: 'from-gray-600 to-gray-800',
    bg: 'bg-gray-100',
    text: 'text-gray-700',
    count: 150 
  }
];

const TESTIMONIALS_DATA: Testimonial[] = [
  {
    id: 1,
    name: "Nguyễn Văn An",
    role: "K20 - Khoa học máy tính",
    avatar: "https://i.pravatar.cc/150?u=1",
    content: "Mình tìm được giáo trình cũ giá rẻ hơn 70% so với mua mới. Giao dịch ngay tại sảnh H6 rất tiện và an toàn.",
    rating: 5
  },
  {
    id: 2,
    name: "Trần Thị Bích",
    role: "K21 - Quản lý công nghiệp",
    avatar: "https://i.pravatar.cc/150?u=2",
    content: "Tính năng AI tự định giá giúp mình bán cái laptop cũ nhanh gọn lẹ mà không sợ bị hớ. Rất recommend!",
    rating: 5
  },
  {
    id: 3,
    name: "Lê Hoàng Cường",
    role: "K19 - Cơ khí",
    avatar: "https://i.pravatar.cc/150?u=3",
    content: "Cộng đồng văn minh, admin hỗ trợ nhiệt tình. Đây là nơi tốt nhất để pass đồ cho sinh viên BK.",
    rating: 4
  }
];

const FAQ_DATA = [
  {
    question: "Làm sao để đảm bảo không bị lừa đảo?",
    answer: "Chợ BK yêu cầu 100% tài khoản đăng bán phải xác thực qua Email sinh viên (@hcmut.edu.vn). Chúng tôi cũng khuyến khích giao dịch trực tiếp tại khuôn viên trường."
  },
  {
    question: "Đăng tin có mất phí không?",
    answer: "Hoàn toàn MIỄN PHÍ! Chợ BK là dự án phi lợi nhuận hỗ trợ cộng đồng sinh viên, không thu phí trung gian."
  },
  {
    question: "Tôi có thể bán đồ không phải đồ học tập không?",
    answer: "Có, bạn có thể bán các vật dụng đời sống như quạt, tủ vải, xe đạp... miễn là hợp pháp và phù hợp với sinh viên."
  },
  {
    question: "Làm thế nào để tin của tôi lên xu hướng?",
    answer: "Hãy chụp ảnh rõ nét, viết mô tả chi tiết và để mức giá hợp lý. Các tin có nhiều lượt xem và lưu sẽ tự động lên Top."
  }
];

// ============================================================================
// 3. UTILITY HOOKS
// ============================================================================

/** Hook hiệu ứng gõ chữ (Typewriter) */
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

/** Hook hiệu ứng Parallax theo chuột */
const useParallax = (strength: number = 20) => {
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const { clientX, clientY } = e;
    const x = (clientX - window.innerWidth / 2) / strength;
    const y = (clientY - window.innerHeight / 2) / strength;
    setOffset({ x, y });
  }, [strength]);

  return { offset, handleMouseMove };
};

/** Hook đếm số (Counter Animation) */
const useCounter = (end: number, duration = 2000) => {
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
};

// ============================================================================
// 4. ATOMIC COMPONENTS (UI BLOCKS)
// ============================================================================

const SectionTitle = ({ title, subtitle, centered = false, light = false }: any) => (
  <div className={`mb-12 ${centered ? 'text-center' : ''}`}>
    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full ${light ? 'bg-white/10 text-white border-white/20' : 'bg-blue-50 text-[#00418E] border-blue-100'} border text-xs font-black uppercase tracking-widest mb-4 animate-fadeIn`}>
      <Sparkles size={14} className={light ? 'text-yellow-400' : 'text-[#00418E]'} />
      Chợ Bách Khoa
    </div>
    <h2 className={`text-3xl md:text-5xl font-black mb-4 tracking-tight leading-tight ${light ? 'text-white' : 'text-gray-900'}`}>
      {title}
    </h2>
    {subtitle && (
      <p className={`text-lg max-w-2xl leading-relaxed ${centered ? 'mx-auto' : ''} ${light ? 'text-blue-100' : 'text-gray-500'}`}>
        {subtitle}
      </p>
    )}
    <div className={`h-1.5 w-24 bg-gradient-to-r from-[#00418E] to-[#00B0F0] rounded-full mt-6 ${centered ? 'mx-auto' : ''}`}></div>
  </div>
);

const ProductCardFlagship = ({ product, onClick }: { product: Product, onClick: () => void }) => (
  <div 
    onClick={onClick}
    className="group bg-white rounded-[2rem] border border-gray-100 overflow-hidden hover:shadow-[0_20px_50px_rgba(0,0,0,0.1)] hover:-translate-y-2 transition-all duration-500 cursor-pointer flex flex-col h-full relative"
  >
    {/* Image Container */}
    <div className="aspect-[4/3] relative overflow-hidden bg-gray-50">
      <img 
        src={product.images[0] || 'https://via.placeholder.com/400'} 
        alt={product.title} 
        className="w-full h-full object-contain mix-blend-multiply transition-transform duration-700 group-hover:scale-110" 
      />
      
      {/* Badges */}
      <div className="absolute top-4 left-4 flex gap-2">
        {product.condition === 'Mới' && (
          <span className="bg-emerald-500 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-lg flex items-center gap-1">
            <Sparkles size={10} /> NEW
          </span>
        )}
        {product.price === 0 && (
          <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-lg animate-pulse flex items-center gap-1">
            <Gift size={10} /> FREE
          </span>
        )}
      </div>

      {/* Action Overlay */}
      <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-3 backdrop-blur-[2px]">
        <button className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-gray-700 hover:text-red-500 hover:scale-110 transition-all shadow-xl">
          <Heart size={20} />
        </button>
        <button className="w-10 h-10 bg-[#00418E] rounded-full flex items-center justify-center text-white hover:bg-[#003370] hover:scale-110 transition-all shadow-xl">
          <Eye size={20} />
        </button>
      </div>
    </div>

    {/* Content */}
    <div className="p-6 flex flex-col flex-1 relative">
      <div className="flex items-center gap-2 mb-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
        <span className="bg-blue-50 text-[#00418E] px-2 py-1 rounded-md">{product.category}</span>
        <span>•</span>
        <span className="flex items-center gap-1"><Clock size={10}/> {new Date(product.postedAt).toLocaleDateString('vi-VN')}</span>
      </div>
      
      <h3 className="font-bold text-gray-900 text-lg mb-2 line-clamp-2 group-hover:text-[#00418E] transition-colors leading-snug">
        {product.title}
      </h3>
      
      <div className="mt-auto pt-4 flex items-center justify-between border-t border-gray-50">
        <div className="flex flex-col">
          <span className="text-xs text-gray-400 font-medium line-through decoration-red-400">
            {product.price > 0 ? `${(product.price * 1.2).toLocaleString()}đ` : ''}
          </span>
          <span className="text-xl font-black text-[#00418E]">
            {product.price === 0 ? '0đ' : `${product.price.toLocaleString('vi-VN')}đ`}
          </span>
        </div>
        <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-[#00418E] group-hover:text-white transition-all transform group-hover:rotate-[-45deg]">
          <ArrowRight size={18} />
        </div>
      </div>
    </div>
  </div>
);

const AITerminal = () => {
  const [lines, setLines] = useState<string[]>([]);
  useEffect(() => {
    const sequence = [
      { text: '> user.upload("IMG_2024.jpg")', delay: 500, color: 'text-white' },
      { text: '> ai.vision.analyze()...', delay: 1500, color: 'text-gray-400' },
      { text: '> object: "Giáo trình Giải tích 1"', delay: 2500, color: 'text-green-400' },
      { text: '> condition: "Like New (98%)"', delay: 3500, color: 'text-cyan-400' },
      { text: '> ai.pricing.suggest(45000)...', delay: 4500, color: 'text-yellow-400' },
      { text: '> post.create() -> SUCCESS', delay: 5500, color: 'text-blue-400' },
    ];
    let timeouts: NodeJS.Timeout[] = [];
    const runAnimation = () => {
      setLines([]);
      sequence.forEach(({ text, delay, color }) => {
        timeouts.push(setTimeout(() => {
          setLines(prev => [...prev, `<span class="${color}">${text}</span>`]);
        }, delay));
      });
    };
    runAnimation();
    const interval = setInterval(runAnimation, 7000);
    return () => { timeouts.forEach(clearTimeout); clearInterval(interval); };
  }, []);

  return (
    <div className="w-full bg-[#0F172A]/95 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl overflow-hidden font-mono text-sm group hover:scale-[1.02] transition-transform duration-500">
      <div className="bg-[#1E293B] px-4 py-3 flex items-center gap-2 border-b border-white/5">
        <div className="flex gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
          <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
          <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
        </div>
        <div className="ml-4 text-xs font-bold text-gray-500 uppercase tracking-widest">gemini-vision-pro.js</div>
      </div>
      <div className="p-6 h-72 flex flex-col justify-end relative">
        {lines.map((line, idx) => (
          <div key={idx} className="mb-2 animate-in fade-in slide-in-from-left-2 duration-300" dangerouslySetInnerHTML={{ __html: line }} />
        ))}
        <div className="flex items-center gap-2 mt-2">
          <span className="text-[#00418E] font-bold">➜</span>
          <span className="w-2 h-5 bg-[#00418E] animate-pulse block"></span>
        </div>
        {/* Glow effect inside terminal */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-[80px] pointer-events-none"></div>
      </div>
    </div>
  );
};

const SearchBar = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const placeholder = useTypewriter(["Tìm 'Giáo trình'...", "Tìm 'Laptop cũ'...", "Tìm 'Casio 580'..."]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) navigate(`/market?search=${encodeURIComponent(query.trim())}`);
  };

  return (
    <div className="relative z-30 w-full max-w-2xl mx-auto group">
      <div className={`absolute -inset-1 bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 rounded-full blur opacity-25 group-hover:opacity-75 transition duration-1000 ${isFocused ? 'opacity-100' : ''}`}></div>
      <form onSubmit={handleSearch} className="relative flex items-center bg-white/95 backdrop-blur-2xl rounded-full shadow-2xl p-2 transition-transform transform hover:scale-[1.01]">
        <div className="hidden md:flex items-center pl-6 pr-4 border-r border-gray-200 cursor-pointer hover:bg-gray-50 h-full rounded-l-full">
          <span className="text-sm font-bold text-gray-600 mr-2">Tất cả</span><ChevronDown size={14} className="text-gray-400" />
        </div>
        <div className="flex-1 relative">
          <input 
            type="text" 
            value={query} 
            onChange={(e) => setQuery(e.target.value)} 
            onFocus={() => setIsFocused(true)} 
            onBlur={() => setTimeout(() => setIsFocused(false), 200)} 
            className="w-full h-14 pl-6 pr-12 bg-transparent border-none outline-none text-lg text-gray-800 font-medium placeholder-transparent" 
            placeholder="Search..." 
          />
          {!query && <div className="absolute left-6 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 text-lg">{placeholder}</div>}
        </div>
        <div className="pr-1">
          <button className="h-12 w-12 md:w-auto md:px-8 bg-[#00418E] hover:bg-[#003370] text-white rounded-full flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95">
            <Search size={20} /><span className="hidden md:inline font-bold">Tìm kiếm</span>
          </button>
        </div>
      </form>
      
      {isFocused && (
        <div className="absolute top-full left-0 right-0 mt-4 bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-gray-100 p-6 animate-in fade-in slide-in-from-top-4 duration-200 z-50">
          <div className="flex items-center gap-2 mb-4 text-xs font-bold text-gray-400 uppercase tracking-widest"><TrendingUp size={14} /> Xu hướng tìm kiếm</div>
          <div className="flex flex-wrap gap-3">
            {TRENDING_KEYWORDS.map((item, idx) => (
              <button key={idx} onMouseDown={() => { setQuery(item); navigate(`/market?search=${encodeURIComponent(item)}`); }} className="px-4 py-2 bg-gray-50 hover:bg-blue-50 text-gray-600 hover:text-[#00418E] rounded-xl text-sm font-medium transition-all flex items-center gap-2 group">
                <Search size={14} className="text-gray-300 group-hover:text-blue-400" />{item}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// 5. MAIN PAGE COMPONENT
// ============================================================================

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { offset, handleMouseMove } = useParallax(40);
  
  const [recentProducts, setRecentProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFaq, setActiveFaq] = useState<number | null>(0);
  
  // Counters
  const countUsers = useCounter(25400, 2500);
  const countProducts = useCounter(8650, 2500);
  const countTrans = useCounter(14200, 2500);

  // --- Data Fetching ---
  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data } = await supabase
          .from('products')
          .select('*, profiles:seller_id(name, avatar_url)')
          .eq('status', 'available')
          .order('posted_at', { ascending: false })
          .limit(8);

        if (data) {
          const mapped: Product[] = data.map((item: any) => ({
              ...item, sellerId: item.seller_id, tradeMethod: item.trade_method, postedAt: item.posted_at, 
              status: item.status, seller: item.profiles, view_count: item.view_count || 0
          }));
          setRecentProducts(mapped);
        }
      } catch (e) { console.error(e); } finally { setLoading(false); }
    };
    fetchData();
  }, []);

  return (
    <div className="min-h-screen bg-white font-sans text-[#1a1a1a] selection:bg-[#00418E] selection:text-white overflow-x-hidden">
      
      {/* =====================================================================
          HERO SECTION: PARALLAX & SEARCH
      ====================================================================== */}
      <section 
        className="relative w-full h-[850px] bg-[#00418E] overflow-hidden flex items-center justify-center"
        onMouseMove={handleMouseMove}
      >
        {/* Background Layers */}
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-[url('https://hcmut.edu.vn/img/campus/campus-1.jpg')] bg-cover bg-center opacity-10 mix-blend-overlay scale-110 animate-pulse-slow"></div>
          <div className="absolute inset-0 bg-gradient-to-b from-[#00418E]/90 via-[#00418E]/80 to-[#00418E]"></div>
          
          {/* Parallax Blobs */}
          <div className="absolute top-[-10%] right-[-5%] w-[800px] h-[800px] bg-blue-500/30 rounded-full blur-[120px] animate-blob mix-blend-screen" style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }}></div>
          <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-purple-500/20 rounded-full blur-[100px] animate-blob animation-delay-2000 mix-blend-screen" style={{ transform: `translate(${offset.x * -1}px, ${offset.y * -1}px)` }}></div>
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
        </div>

        {/* Hero Content */}
        <div className="relative z-20 w-full max-w-6xl px-4 text-center pt-20">
          {/* Badge */}
          <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white shadow-2xl mb-12 hover:bg-white/20 transition-all cursor-default animate-bounce-slow">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-yellow-500"></span>
            </span>
            <span className="text-xs font-black uppercase tracking-[0.2em]">Cộng đồng sinh viên Bách Khoa</span>
          </div>

          {/* Headline */}
          <h1 className="text-6xl md:text-8xl font-black text-white mb-8 leading-[1.1] tracking-tighter drop-shadow-2xl animate-slideUp">
            Sàn Giao Dịch <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-200 via-white to-cyan-200 animate-shine bg-[length:200%_auto]">
              Đồ Cũ Sinh Viên
            </span>
          </h1>

          <p className="text-blue-100 text-lg md:text-2xl mb-16 max-w-3xl mx-auto font-medium leading-relaxed opacity-90 animate-slideUp delay-100">
            Nền tảng mua bán giáo trình, thiết bị điện tử uy tín dành riêng cho BKers. 
            Kết nối trực tiếp, an toàn, nhanh chóng.
          </p>

          {/* Search */}
          <div className="animate-slideUp delay-200 mb-24">
            <SearchBar />
          </div>

          {/* Stats */}
          <div className="flex flex-wrap justify-center gap-12 md:gap-24 text-white animate-fadeIn delay-300 pt-8 border-t border-white/10 max-w-4xl mx-auto">
            {[
              { val: countUsers, label: 'Thành viên', icon: <Users className="w-5 h-5 text-blue-300"/> },
              { val: countProducts, label: 'Tin đăng', icon: <Share2 className="w-5 h-5 text-purple-300"/> },
              { val: countTrans, label: 'Lượt tương tác', icon: <MessageCircle className="w-5 h-5 text-green-300"/> }
            ].map((item, idx) => (
              <div key={idx} className="text-center group cursor-default">
                <div className="flex items-center justify-center gap-2 text-white/60 mb-2 text-xs font-bold uppercase tracking-widest group-hover:text-white transition-colors">
                  {item.icon} {item.label}
                </div>
                <p className="text-4xl md:text-5xl font-black group-hover:scale-110 transition-transform duration-300 flex items-baseline justify-center">
                  {item.val.toLocaleString()}<span className="text-2xl text-blue-300">+</span>
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-60 animate-bounce cursor-pointer" onClick={() => window.scrollTo({top: 800, behavior: 'smooth'})}>
          <span className="text-[10px] font-bold text-white uppercase tracking-widest">Khám phá</span>
          <ChevronDown className="text-white w-6 h-6" />
        </div>
      </section>

      {/* =====================================================================
          SECTION 2: BENTO GRID CATEGORIES
      ====================================================================== */}
      <div className="bg-[#F8FAFC] relative z-10 rounded-t-[4rem] -mt-20 pt-32 pb-24 shadow-[0_-20px_60px_rgba(0,0,0,0.1)]">
        <div className="max-w-7xl mx-auto px-4">
          <SectionTitle 
            title="Khám Phá Danh Mục" 
            subtitle="Tìm kiếm dễ dàng hơn với các nhóm sản phẩm được phân loại chi tiết."
          />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 auto-rows-[200px]">
            {CATEGORIES_DATA.map((cat, idx) => (
              <div 
                key={cat.id}
                onClick={() => navigate(`/market?cat=${cat.id}`)}
                className={`group relative overflow-hidden rounded-[2.5rem] p-10 cursor-pointer transition-all duration-500 hover:shadow-2xl hover:-translate-y-2 bg-white border border-gray-100 ${idx === 0 || idx === 3 ? 'md:col-span-2' : ''}`}
              >
                {/* Hover Gradient */}
                <div className={`absolute inset-0 bg-gradient-to-br ${cat.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-500`}></div>
                
                {/* Decor Circle */}
                <div className="absolute -bottom-10 -right-10 w-40 h-40 rounded-full border-[30px] border-gray-50 group-hover:border-blue-50/50 transition-colors duration-500"></div>

                <div className="relative z-10 h-full flex flex-col justify-between">
                  <div className="flex justify-between items-start">
                    <div className={`w-20 h-20 rounded-3xl ${cat.bg} ${cat.text} flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-500`}>
                      {cat.icon}
                    </div>
                    <span className="bg-gray-100 text-gray-500 text-xs font-bold px-3 py-1.5 rounded-full group-hover:bg-[#00418E] group-hover:text-white transition-colors">
                      {cat.count}+
                    </span>
                  </div>
                  
                  <div>
                    <h3 className="text-2xl font-black text-gray-900 mb-2 flex items-center gap-2 group-hover:text-[#00418E] transition-colors">
                      {cat.name}
                      <ArrowRight size={24} className="opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
                    </h3>
                    <p className="text-gray-500 font-medium group-hover:text-gray-700 transition-colors">
                      {cat.sub}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* =====================================================================
          SECTION 3: AI POWER SHOWCASE (DARK)
      ====================================================================== */}
      <section className="py-32 bg-[#0F172A] relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-blue-600/20 rounded-full blur-[150px] animate-pulse-slow"></div>
          <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-purple-600/20 rounded-full blur-[150px] animate-pulse-slow animation-delay-2000"></div>
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20"></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
            
            {/* Left Content */}
            <div className="order-2 lg:order-1">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-widest mb-8">
                <Cpu size={14} className="animate-spin-slow" /> Công nghệ độc quyền
              </div>
              
              <h2 className="text-5xl md:text-7xl font-black text-white mb-8 leading-[1.1]">
                Đăng tin <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">Siêu Tốc</span> <br/>
                với Trợ lý AI
              </h2>
              
              <p className="text-slate-400 text-xl mb-12 leading-relaxed max-w-lg">
                Quên đi việc đau đầu nghĩ caption. <strong className="text-white">Gemini Vision Pro</strong> sẽ phân tích ảnh và tạo nội dung bán hàng chuyên nghiệp trong 30 giây.
              </p>

              <div className="space-y-8 mb-12">
                {[
                  { title: "Tự động viết mô tả", desc: "Tạo nội dung hấp dẫn, đầy đủ thông số.", icon: <Code className="text-blue-400"/> },
                  { title: "Định giá thông minh", desc: "Gợi ý mức giá phù hợp thị trường.", icon: <TrendingUp className="text-green-400"/> },
                  { title: "Gắn thẻ tự động", desc: "Phân loại danh mục chính xác.", icon: <Tag className="text-purple-400"/> }
                ].map((feature, idx) => (
                  <div key={idx} className="flex gap-6 group">
                    <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0 group-hover:bg-white/10 transition-colors group-hover:scale-110 duration-300">
                      {feature.icon}
                    </div>
                    <div>
                      <h4 className="text-white font-bold text-xl mb-1 group-hover:text-blue-400 transition-colors">{feature.title}</h4>
                      <p className="text-slate-500">{feature.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-4">
                <button onClick={() => navigate('/post')} className="px-10 py-5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black text-lg shadow-lg shadow-blue-600/30 transition-all hover:scale-105 active:scale-95 flex items-center gap-3">
                  <Sparkles size={20} /> Trải nghiệm ngay
                </button>
                <button onClick={() => navigate('/market')} className="px-10 py-5 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-2xl font-bold text-lg transition-all">
                  Xem Demo
                </button>
              </div>
            </div>

            {/* Right Visualizer */}
            <div className="order-1 lg:order-2 perspective-1000">
              <div className="transform rotate-y-[-5deg] rotate-x-[5deg] hover:rotate-0 transition-transform duration-700 ease-out">
                <AITerminal />
                {/* Decoration Card */}
                <div className="absolute -bottom-10 -left-10 bg-white/10 backdrop-blur-md p-6 rounded-3xl border border-white/20 shadow-2xl animate-float animation-delay-1000">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center border border-green-500/30">
                      <CheckCircle2 className="text-green-400" size={24} />
                    </div>
                    <div>
                      <p className="text-white font-bold">Hoàn tất xử lý</p>
                      <p className="text-green-400 text-sm font-mono">0.8s processing</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* =====================================================================
          SECTION 4: LIVE FEED - NEW ARRIVALS
      ====================================================================== */}
      <section className="py-24 bg-white relative">
        <div className="max-w-7xl mx-auto px-4">
          
          <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 bg-red-50 text-red-500 rounded-xl animate-pulse">
                  <Flame size={28} />
                </div>
                <span className="text-red-500 font-black uppercase tracking-widest text-sm">Vừa cập nhật</span>
              </div>
              <h2 className="text-5xl font-black text-gray-900 tracking-tight">Mới Lên Sàn</h2>
            </div>

            <div className="flex items-center bg-gray-100 p-1.5 rounded-2xl">
              {['Tất cả', 'Giáo trình', 'Công nghệ', 'Góc 0Đ'].map((tab, i) => (
                <button 
                  key={tab}
                  className={`px-8 py-3 rounded-xl text-sm font-bold transition-all ${i === 0 ? 'bg-white shadow-md text-[#00418E]' : 'hover:bg-white/50 text-gray-500'}`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          <div className="min-h-[600px]">
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                {[...Array(8)].map((_, n) => (
                  <div key={n} className="bg-white rounded-[2rem] h-[450px] border border-gray-100 shadow-sm flex flex-col overflow-hidden">
                    <div className="h-64 bg-gray-200 animate-pulse"></div>
                    <div className="p-6 space-y-4 flex-1">
                      <div className="h-4 bg-gray-200 rounded-full w-24 animate-pulse"></div>
                      <div className="h-6 bg-gray-200 rounded-full w-full animate-pulse"></div>
                      <div className="h-6 bg-gray-200 rounded-full w-2/3 animate-pulse"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                {recentProducts.map((product, idx) => (
                  <div 
                    key={product.id} 
                    className="animate-in fade-in slide-in-from-bottom-8 duration-700 fill-mode-backwards"
                    style={{ animationDelay: `${idx * 100}ms` }}
                  >
                    <ProductCardFlagship 
                      product={product} 
                      onClick={() => navigate(`/product/${product.id}`)}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-24 text-center">
            <button 
              onClick={() => navigate('/market')}
              className="group relative inline-flex items-center justify-center px-14 py-5 font-black text-white transition-all duration-200 bg-[#00418E] rounded-full hover:bg-[#003370] hover:shadow-2xl hover:-translate-y-1 focus:outline-none overflow-hidden"
            >
              <span className="relative z-10 flex items-center gap-3 uppercase tracking-widest text-sm">
                Xem tất cả 2,450+ món đồ <ArrowRight size={18} className="group-hover:translate-x-2 transition-transform"/>
              </span>
              <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent z-0"></div>
            </button>
          </div>

        </div>
      </section>

      {/* =====================================================================
          SECTION 5: FLASH SALE BANNER
      ====================================================================== */}
      <section className="py-12 bg-[#F8FAFC]">
        <div className="max-w-7xl mx-auto px-4">
          <div className="relative rounded-[3rem] overflow-hidden shadow-2xl group cursor-pointer transform hover:scale-[1.01] transition-transform duration-500">
            <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-pink-600"></div>
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/diagmonds-light.png')] opacity-20"></div>
            
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between p-16 gap-10 text-white">
              <div className="text-center md:text-left max-w-xl">
                <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-5 py-2 rounded-full text-xs font-bold mb-6 border border-white/30 animate-pulse">
                  <Clock size={14} /> KẾT THÚC TRONG: 02:45:12
                </div>
                <h3 className="text-5xl md:text-6xl font-black mb-6 leading-tight">FLASH SALE 0Đ</h3>
                <p className="text-white/90 text-xl font-medium">
                  Sự kiện dọn nhà KTX cuối kỳ. Hàng ngàn món đồ được tặng miễn phí mỗi ngày.
                </p>
              </div>
              
              <div className="flex gap-6">
                 {/* Mock Flash Sale Items */}
                 {[1, 2].map(i => (
                   <div key={i} className={`bg-white p-4 rounded-3xl shadow-xl transform transition-transform duration-500 ${i===1 ? 'rotate-3 translate-y-4' : '-rotate-3'} group-hover:rotate-0 group-hover:translate-y-0`}>
                      <div className="w-32 h-32 bg-gray-100 rounded-2xl mb-3 flex items-center justify-center">
                        <Gift className="text-orange-500" size={40}/>
                      </div>
                      <div className="text-center">
                        <div className="text-xs font-bold text-gray-400 line-through">150.000đ</div>
                        <div className="text-2xl font-black text-red-500">0đ</div>
                      </div>
                   </div>
                 ))}
              </div>

              <div className="md:ml-auto">
                <button className="bg-white text-orange-600 px-10 py-5 rounded-2xl font-black text-xl shadow-xl hover:bg-gray-50 transition-all active:scale-95 flex items-center gap-2">
                  SĂN NGAY <ChevronRight size={24}/>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          SECTION 6: TRUST INDICATORS
      ====================================================================== */}
      <section className="py-32 bg-white relative overflow-hidden">
        <div className="absolute top-1/2 left-0 w-full h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent"></div>
        
        <div className="max-w-7xl mx-auto px-4 relative z-10">
          <SectionTitle title="Tại sao chọn Chợ BK?" subtitle="Nền tảng được xây dựng bởi sinh viên, dành cho sinh viên." centered />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mt-20">
            <div className="group text-center">
              <div className="relative w-32 h-32 mx-auto mb-10">
                <div className="absolute inset-0 bg-blue-100 rounded-full scale-0 group-hover:scale-100 transition-transform duration-500 ease-out"></div>
                <div className="relative w-full h-full bg-white border-2 border-blue-50 text-[#00418E] rounded-full flex items-center justify-center shadow-lg group-hover:-translate-y-4 transition-transform duration-300">
                  <ShieldCheck size={48} strokeWidth={1.5} />
                </div>
              </div>
              <h3 className="text-2xl font-black text-gray-900 mb-4 group-hover:text-[#00418E] transition-colors">Xác thực Sinh viên</h3>
              <p className="text-gray-500 leading-relaxed px-4">100% tài khoản phải có email <span className="font-bold text-gray-700">@hcmut.edu.vn</span>. Loại bỏ rủi ro lừa đảo.</p>
            </div>

            <div className="group text-center">
              <div className="relative w-32 h-32 mx-auto mb-10">
                <div className="absolute inset-0 bg-indigo-100 rounded-full scale-0 group-hover:scale-100 transition-transform duration-500 ease-out"></div>
                <div className="relative w-full h-full bg-white border-2 border-indigo-50 text-indigo-600 rounded-full flex items-center justify-center shadow-lg group-hover:-translate-y-4 transition-transform duration-300">
                  <MapPin size={48} strokeWidth={1.5} />
                </div>
              </div>
              <h3 className="text-2xl font-black text-gray-900 mb-4 group-hover:text-indigo-600 transition-colors">Giao dịch An toàn</h3>
              <p className="text-gray-500 leading-relaxed px-4">Khuyến khích gặp mặt trực tiếp tại <span className="font-bold text-gray-700">H6, Thư viện</span> để kiểm tra hàng.</p>
            </div>

            <div className="group text-center">
              <div className="relative w-32 h-32 mx-auto mb-10">
                <div className="absolute inset-0 bg-teal-100 rounded-full scale-0 group-hover:scale-100 transition-transform duration-500 ease-out"></div>
                <div className="relative w-full h-full bg-white border-2 border-teal-50 text-teal-600 rounded-full flex items-center justify-center shadow-lg group-hover:-translate-y-4 transition-transform duration-300">
                  <Users size={48} strokeWidth={1.5} />
                </div>
              </div>
              <h3 className="text-2xl font-black text-gray-900 mb-4 group-hover:text-teal-600 transition-colors">Cộng đồng Văn minh</h3>
              <p className="text-gray-500 leading-relaxed px-4">Hệ thống đánh giá tín nhiệm. Admin hỗ trợ giải quyết tranh chấp 24/7.</p>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          SECTION 7: TESTIMONIALS & FAQ
      ====================================================================== */}
      <section className="py-32 bg-[#F8FAFC]">
        <div className="max-w-7xl mx-auto px-4">
          <SectionTitle title="Góc Nhìn Sinh Viên" subtitle="Hơn 15,000 sinh viên Bách Khoa đã tin tưởng." />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 mb-32">
            {TESTIMONIALS_DATA.map((item) => (
              <div key={item.id} className="bg-white p-10 rounded-[2.5rem] shadow-sm hover:shadow-2xl transition-all duration-300 relative group border border-gray-100">
                <Quote size={60} className="absolute top-8 right-8 text-gray-100 group-hover:text-blue-50 transition-colors" />
                <div className="flex gap-1 mb-6">{[...Array(5)].map((_, i) => (<Star key={i} size={18} className={`${i < item.rating ? 'fill-yellow-400 text-yellow-400' : 'fill-gray-200 text-gray-200'}`} />))}</div>
                <p className="text-gray-600 text-lg mb-8 relative z-10 leading-relaxed italic">"{item.content}"</p>
                <div className="flex items-center gap-4 mt-auto">
                  <img src={item.avatar} alt={item.name} className="w-14 h-14 rounded-full object-cover border-2 border-white shadow-md" />
                  <div><h4 className="font-bold text-gray-900 text-lg">{item.name}</h4><p className="text-xs text-[#00418E] font-bold uppercase tracking-wider">{item.role}</p></div>
                </div>
              </div>
            ))}
          </div>

          {/* FAQ Accordion */}
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-black text-center mb-12">Câu hỏi thường gặp</h2>
            <div className="space-y-4">
              {FAQ_DATA.map((faq, idx) => (
                <div key={idx} className={`border rounded-3xl overflow-hidden transition-all duration-300 ${activeFaq === idx ? 'border-[#00418E] bg-white shadow-lg' : 'border-gray-200 bg-white hover:border-blue-200'}`}>
                  <button onClick={() => setActiveFaq(activeFaq === idx ? null : idx)} className="w-full flex items-center justify-between p-6 text-left font-bold text-lg text-gray-800">
                    {faq.question}
                    <ChevronDown size={24} className={`transition-transform duration-300 ${activeFaq === idx ? 'rotate-180 text-[#00418E]' : 'text-gray-400'}`} />
                  </button>
                  <div className={`overflow-hidden transition-all duration-300 ${activeFaq === idx ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'}`}>
                    <p className="px-6 pb-8 text-gray-600 leading-relaxed text-lg">{faq.answer}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          SECTION 8: FINAL CTA BANNER
      ====================================================================== */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto relative rounded-[3rem] overflow-hidden bg-[#00418E] text-white shadow-2xl">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
          <div className="absolute -left-20 -bottom-20 w-[500px] h-[500px] bg-blue-500/30 rounded-full blur-[100px]"></div>
          
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between p-16 md:p-28 gap-16">
            <div className="max-w-2xl text-center md:text-left">
              <h2 className="text-5xl md:text-6xl font-black mb-8 leading-tight">
                Bạn có đồ cũ cần bán? <br/>
                <span className="text-yellow-300">Đăng ngay, bán liền tay!</span>
              </h2>
              <p className="text-blue-100 text-xl mb-12 font-medium">Tiếp cận hàng ngàn sinh viên Bách Khoa mỗi ngày. Hoàn toàn miễn phí.</p>
              <div className="flex flex-col sm:flex-row gap-6 justify-center md:justify-start">
                <button onClick={() => navigate('/post')} className="px-12 py-5 bg-white text-[#00418E] rounded-2xl font-black text-xl shadow-xl hover:scale-105 transition-transform flex items-center justify-center gap-3"><Sparkles size={24} className="text-yellow-500"/> Đăng Tin Ngay</button>
                <button onClick={() => navigate('/auth')} className="px-12 py-5 bg-transparent border-2 border-white/30 text-white rounded-2xl font-bold text-xl hover:bg-white/10 transition-all">Đăng ký</button>
              </div>
            </div>
            
            {/* Decor Image */}
            <div className="relative w-80 h-80 hidden lg:block animate-float">
               <div className="absolute inset-0 bg-gradient-to-tr from-yellow-400 to-orange-500 rounded-full opacity-20 blur-3xl animate-pulse"></div>
               <Bell size={320} className="text-white drop-shadow-2xl rotate-12"/>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          SECTION 9: MEGA FOOTER
      ====================================================================== */}
      <footer className="bg-[#0F172A] text-slate-300 pt-24 pb-12 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-16 mb-20">
            <div className="space-y-8">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-[#00418E] rounded-2xl flex items-center justify-center text-white shadow-lg"><GraduationCap size={32} /></div>
                <div><h3 className="text-2xl font-black text-white tracking-tight">CHỢ BK</h3><p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Student Marketplace</p></div>
              </div>
              <p className="text-slate-400 leading-relaxed">Dự án phi lợi nhuận hỗ trợ sinh viên ĐH Bách Khoa TP.HCM. Kết nối - Chia sẻ - Tiết kiệm.</p>
              <div className="flex gap-4">{[Facebook, Instagram, Youtube, Twitter].map((Icon, i) => (<a key={i} href="#" className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:bg-[#00418E] hover:text-white transition-all hover:-translate-y-1"><Icon size={20} /></a>))}</div>
            </div>
            
            <div>
              <h4 className="text-white font-bold mb-8 uppercase text-sm tracking-widest">Danh mục</h4>
              <ul className="space-y-4 font-medium">{CATEGORIES_DATA.map(cat => (<li key={cat.id}><a href={`/market?cat=${cat.id}`} className="hover:text-[#00418E] transition-colors flex items-center gap-2 group"><span className="w-1.5 h-1.5 rounded-full bg-slate-600 group-hover:bg-[#00418E] transition-colors"></span> {cat.name}</a></li>))}</ul>
            </div>

            <div>
              <h4 className="text-white font-bold mb-8 uppercase text-sm tracking-widest">Hỗ trợ</h4>
              <ul className="space-y-4 font-medium">{['Về chúng tôi', 'Quy chế hoạt động', 'Chính sách bảo mật', 'Giải quyết tranh chấp'].map(item => (<li key={item}><a href="#" className="hover:text-[#00418E] transition-colors flex items-center gap-2 group"><span className="w-1.5 h-1.5 rounded-full bg-slate-600 group-hover:bg-[#00418E] transition-colors"></span> {item}</a></li>))}</ul>
            </div>

            <div>
              <h4 className="text-white font-bold mb-8 uppercase text-sm tracking-widest">Liên hệ</h4>
              <ul className="space-y-5">
                <li className="flex items-start gap-4"><MapPin size={24} className="text-[#00418E] shrink-0" /><span>268 Lý Thường Kiệt, Q.10, TP.HCM</span></li>
                <li className="flex items-center gap-4"><Mail size={24} className="text-[#00418E] shrink-0" /><span>support@chobk.com</span></li>
                <li className="flex items-center gap-4"><Phone size={24} className="text-[#00418E] shrink-0" /><span>0123.456.789</span></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-800 pt-10 flex flex-col md:flex-row justify-between items-center gap-6 text-sm font-medium text-slate-500">
            <p>&copy; {new Date().getFullYear()} Chợ BK. All rights reserved.</p>
            <div className="flex gap-8"><a href="#" className="hover:text-white">Điều khoản</a><a href="#" className="hover:text-white">Bảo mật</a><a href="#" className="hover:text-white">Sitemap</a></div>
          </div>
        </div>
      </footer>

    </div>
  );
};

export default HomePage;
