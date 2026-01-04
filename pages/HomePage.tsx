import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Search, Sparkles, ArrowRight, Zap, ShieldCheck, Users, 
  BookOpen, Calculator, Shirt, Plug, ChevronDown, Monitor, 
  Code, Cpu, GraduationCap, Terminal, Star, Quote, 
  HelpCircle, ChevronRight, ChevronLeft, Bell, MapPin, 
  CheckCircle2, Play, Pause, TrendingUp, Flame, Gift,
  Tag, Eye, Share2, Facebook, Instagram, Youtube, Twitter, 
  Mail, Phone, ShoppingBag, MessageCircle
} from 'lucide-react';
import { supabase } from '../services/supabase';
import { Product } from '../types';
import { useAuth } from '../contexts/AuthContext';

// ============================================================================
// 1. CONSTANTS & MOCK DATA
// ============================================================================

const TRENDING_SEARCHES = [
  "Giải tích 1", "Đại số tuyến tính", "Casio 580VNX", 
  "Áo khoác BK", "Chuột Logitech", "Bàn phím cơ"
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

const TESTIMONIALS = [
  {
    id: 1,
    name: "Nguyễn Văn A",
    role: "K20 - Khoa học máy tính",
    avatar: "https://i.pravatar.cc/150?u=1",
    content: "Nhờ Chợ BK mà mình mua được con Casio 580 giá siêu hời, rẻ hơn mua mới cả 300k. Giao dịch ngay tại H6 rất an tâm.",
    rating: 5
  },
  {
    id: 2,
    name: "Trần Thị B",
    role: "K21 - Quản lý công nghiệp",
    avatar: "https://i.pravatar.cc/150?u=2",
    content: "Tính năng đăng tin bằng AI quá đỉnh! Mình chỉ cần gõ tên sách, nó tự viết mô tả hay hơn cả mình viết.",
    rating: 5
  },
  {
    id: 3,
    name: "Lê Hoàng C",
    role: "K19 - Cơ khí",
    avatar: "https://i.pravatar.cc/150?u=3",
    content: "Cộng đồng văn minh, không sợ lừa đảo như mua trên Facebook. Highly recommend cho các bạn tân sinh viên.",
    rating: 4
  }
];

const FAQS = [
  {
    question: "Làm sao để đảm bảo không bị lừa đảo?",
    answer: "Chợ BK yêu cầu xác thực qua Email sinh viên (@hcmut.edu.vn). Ngoài ra, chúng tôi khuyến khích giao dịch trực tiếp tại khuôn viên trường."
  },
  {
    question: "Đăng tin có mất phí không?",
    answer: "Hoàn toàn miễn phí! Chợ BK là dự án phi lợi nhuận hỗ trợ sinh viên."
  },
  {
    question: "Tôi có thể bán đồ không phải đồ học tập không?",
    answer: "Có, miễn là vật dụng hợp pháp và phù hợp với đời sống sinh viên (quạt, tủ vải, xe đạp...)."
  }
];

// ============================================================================
// 2. UTILITY HOOKS
// ============================================================================

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
// 3. SUB-COMPONENTS
// ============================================================================

const SectionHeader = ({ title, subtitle, centered = false }: { title: string, subtitle?: string, centered?: boolean }) => (
  <div className={`mb-12 ${centered ? 'text-center' : ''}`}>
    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-[#00418E] text-xs font-black uppercase tracking-widest mb-3 ${centered ? 'mx-auto' : ''}`}>
      <Sparkles size={14} /> Chợ Bách Khoa
    </div>
    <h2 className="text-3xl md:text-4xl font-black text-gray-900 leading-tight tracking-tight mb-4">
      {title}
    </h2>
    {subtitle && (
      <p className="text-gray-500 text-lg max-w-2xl leading-relaxed mx-auto">
        {subtitle}
      </p>
    )}
    <div className={`h-1.5 w-20 bg-[#00418E] rounded-full mt-6 ${centered ? 'mx-auto' : ''}`}></div>
  </div>
);

const AITerminal = () => {
  const [lines, setLines] = useState<string[]>([]);
  useEffect(() => {
    const sequence = [
      { text: '> user.input("Bán sách Giải tích 1")', delay: 500, color: 'text-white' },
      { text: '> ai.analyzing_image()...', delay: 1500, color: 'text-gray-400' },
      { text: '> ai.detect_condition("99%")', delay: 2500, color: 'text-green-400' },
      { text: '> ai.suggest_price(45000)', delay: 3500, color: 'text-yellow-400' },
      { text: '> ai.generate_description()... DONE', delay: 4500, color: 'text-blue-400' },
    ];
    let timeouts: NodeJS.Timeout[] = [];
    const runAnimation = () => {
      setLines([]);
      sequence.forEach(({ text, delay, color }) => {
        const timeout = setTimeout(() => {
          setLines(prev => [...prev, `<span class="${color}">${text}</span>`]);
        }, delay);
        timeouts.push(timeout);
      });
    };
    runAnimation();
    const interval = setInterval(runAnimation, 6000);
    return () => { timeouts.forEach(clearTimeout); clearInterval(interval); };
  }, []);

  return (
    <div className="w-full bg-[#0F172A] rounded-xl border border-white/10 shadow-2xl overflow-hidden font-mono text-xs md:text-sm">
      <div className="bg-[#1E293B] px-4 py-2 flex items-center gap-2 border-b border-white/5">
        <div className="w-3 h-3 rounded-full bg-red-500"></div>
        <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
        <div className="w-3 h-3 rounded-full bg-green-500"></div>
        <div className="ml-2 text-gray-500 font-bold">gemini-vision-pro</div>
      </div>
      <div className="p-6 h-64 flex flex-col justify-end">
        {lines.map((line, idx) => (
          <div key={idx} className="mb-2" dangerouslySetInnerHTML={{ __html: line }} />
        ))}
        <div className="flex items-center gap-2">
          <span className="text-[#00418E] font-bold">➜</span>
          <span className="w-2 h-4 bg-[#00418E] animate-pulse"></span>
        </div>
      </div>
    </div>
  );
};

const HomeProductCard = ({ product, onClick }: { product: Product, onClick: () => void }) => (
  <div onClick={onClick} className="group bg-white rounded-3xl border border-gray-100 overflow-hidden hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 cursor-pointer flex flex-col h-full">
    <div className="aspect-[4/3] relative overflow-hidden bg-gray-50">
      <img src={product.images[0] || 'https://via.placeholder.com/300'} alt={product.title} className="w-full h-full object-contain mix-blend-multiply transition-transform duration-700 group-hover:scale-110" />
      <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold text-[#00418E] shadow-sm">{product.condition}</div>
      {product.price === 0 && <div className="absolute bottom-3 left-3 bg-red-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-sm animate-pulse">Tặng miễn phí</div>}
    </div>
    <div className="p-5 flex flex-col flex-1">
      <div className="flex items-center gap-2 mb-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
        <span className="bg-blue-50 text-[#00418E] px-2 py-0.5 rounded-md">{product.category}</span>
        <span>•</span>
        <span>{new Date(product.postedAt).toLocaleDateString('vi-VN')}</span>
      </div>
      <h3 className="font-bold text-gray-900 text-lg mb-2 line-clamp-2 group-hover:text-[#00418E] transition-colors">{product.title}</h3>
      <div className="mt-auto pt-4 flex items-center justify-between border-t border-gray-50">
        <span className="text-xl font-black text-[#00418E]">{product.price === 0 ? '0đ' : `${product.price.toLocaleString('vi-VN')}₫`}</span>
        <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-[#00418E] group-hover:text-white transition-all"><ArrowRight size={16} /></div>
      </div>
    </div>
  </div>
);

const ModernSearchBar = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const placeholderText = useTypewriter(["Tìm 'Giáo trình'...", "Tìm 'Casio 580'...", "Tìm 'Laptop'..."]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) navigate(`/market?search=${encodeURIComponent(query.trim())}`);
  };

  return (
    <div className="relative z-20 w-full max-w-3xl mx-auto group">
      <div className={`absolute -inset-1 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 rounded-full blur opacity-25 group-hover:opacity-75 transition duration-1000 ${isFocused ? 'opacity-100' : ''}`}></div>
      <form onSubmit={handleSearch} className="relative flex items-center bg-white/95 backdrop-blur-xl rounded-full shadow-2xl p-2 transition-transform transform hover:scale-[1.01]">
        <div className="hidden md:flex items-center pl-6 pr-4 border-r border-gray-200 cursor-pointer hover:bg-gray-50/50 h-full rounded-l-full">
          <span className="text-sm font-bold text-gray-600 mr-2">Tất cả</span><ChevronDown size={14} className="text-gray-400" />
        </div>
        <div className="flex-1 relative">
          <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} onFocus={() => setIsFocused(true)} onBlur={() => setTimeout(() => setIsFocused(false), 200)} className="w-full h-16 pl-6 pr-12 bg-transparent border-none outline-none text-lg text-gray-800 font-medium placeholder-transparent" placeholder="Search..." />
          {!query && <div className="absolute left-6 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 text-lg">{placeholderText}</div>}
        </div>
        <div className="pr-2">
          <button type="submit" className="h-12 w-12 md:w-auto md:px-8 bg-[#00418E] hover:bg-[#003370] text-white rounded-full flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95">
            <Search size={20} /><span className="hidden md:inline font-bold">Tìm kiếm</span>
          </button>
        </div>
      </form>
      {isFocused && (
        <div className="absolute top-full left-0 right-0 mt-4 bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-gray-100 p-6 animate-in fade-in slide-in-from-top-4 duration-200 z-50">
          <div className="flex items-center gap-2 mb-4 text-xs font-bold text-gray-400 uppercase tracking-widest"><TrendingUp size={14} /> Xu hướng tìm kiếm</div>
          <div className="flex flex-wrap gap-3">
            {TRENDING_SEARCHES.map((item, idx) => (
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
// 4. MAIN PAGE COMPONENT
// ============================================================================

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { position, handleMouseMove } = useParallax(30);
  
  const [recentProducts, setRecentProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ users: 0, products: 0, transactions: 0 });
  const [activeFaq, setActiveFaq] = useState<number | null>(0);
  const [currentTestimonial, setCurrentTestimonial] = useState(0);

  useEffect(() => {
    fetchRecentProducts();
    const targetStats = { users: 2540, products: 860, transactions: 1420 };
    const duration = 2000;
    const steps = 50;
    const intervalTime = duration / steps;
    let currentStep = 0;
    const timer = setInterval(() => {
      currentStep++;
      const progress = currentStep / steps;
      const ease = 1 - Math.pow(1 - progress, 3);
      setStats({
        users: Math.floor(targetStats.users * ease),
        products: Math.floor(targetStats.products * ease),
        transactions: Math.floor(targetStats.transactions * ease)
      });
      if (currentStep >= steps) clearInterval(timer);
    }, intervalTime);
    return () => clearInterval(timer);
  }, []);

  const fetchRecentProducts = async () => {
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

  const nextTestimonial = () => setCurrentTestimonial((prev) => (prev + 1) % TESTIMONIALS.length);
  const prevTestimonial = () => setCurrentTestimonial((prev) => (prev - 1 + TESTIMONIALS.length) % TESTIMONIALS.length);

  return (
    <div className="min-h-screen bg-white font-sans text-[#1a1a1a] selection:bg-[#00418E] selection:text-white overflow-x-hidden">
      
      {/* SECTION 1: HERO */}
      <section 
        className="relative w-full h-[750px] bg-[#00418E] overflow-hidden flex items-center justify-center"
        onMouseMove={handleMouseMove}
      >
        <div className="absolute inset-0 bg-[url('https://hcmut.edu.vn/img/campus/campus-1.jpg')] bg-cover bg-center opacity-10 mix-blend-overlay scale-110"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-[#00418E]/90 to-[#00418E] z-10"></div>
        <div className="absolute top-[-10%] right-[-5%] w-[800px] h-[800px] bg-blue-500/30 rounded-full blur-[120px] animate-blob mix-blend-screen" style={{ transform: `translate(${position.x}px, ${position.y}px)` }}></div>
        
        <div className="relative z-20 w-full max-w-6xl px-4 text-center">
          <div className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white text-xs font-black uppercase tracking-[0.2em] mb-8 hover:bg-white/20 transition-all cursor-default shadow-xl animate-fadeIn">
            <GraduationCap className="w-4 h-4 text-yellow-400" /> Cộng đồng sinh viên Bách Khoa
          </div>
          <h1 className="text-5xl md:text-8xl font-black text-white mb-8 leading-tight drop-shadow-2xl tracking-tighter animate-slideUp">
            Sàn Giao Dịch <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-200 via-white to-cyan-200 animate-shine">Đồ Cũ Sinh Viên</span>
          </h1>
          <p className="text-blue-100 text-lg md:text-2xl mb-14 max-w-3xl mx-auto font-medium leading-relaxed opacity-90 animate-slideUp delay-100">
            Kết nối hơn <span className="text-yellow-300 font-bold">{stats.users.toLocaleString()}+</span> sinh viên. Mua bán giáo trình, thiết bị an toàn tại trường.
          </p>
          <div className="animate-slideUp delay-200 mb-20"><ModernSearchBar /></div>
          <div className="flex flex-wrap justify-center gap-12 text-white animate-fadeIn delay-300">
            {[
              { id: 'posts', val: stats.products, label: 'Tin đã đăng' },
              { id: 'trans', val: stats.transactions, label: 'Giao dịch' },
              { id: 'trust', val: '100%', label: 'Xác thực' }
            ].map(item => (
              <div key={item.id} className="text-center group cursor-default">
                <p className="text-4xl md:text-5xl font-black group-hover:text-yellow-300 transition-colors duration-300">{item.val}</p>
                <p className="text-[10px] opacity-60 uppercase font-bold tracking-widest mt-2">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 2: BENTO CATEGORIES */}
      <div className="bg-[#F8FAFC] relative z-10 rounded-t-[3rem] -mt-16 pt-24 pb-20 shadow-[0_-20px_50px_rgba(0,0,0,0.1)]">
        <div className="max-w-7xl mx-auto px-4">
          <SectionHeader title="Khám Phá Danh Mục" subtitle="Tìm kiếm dễ dàng hơn với các nhóm sản phẩm được phân loại chi tiết." />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-[180px]">
            {CATEGORIES_DETAILED.map((cat, idx) => (
              <div key={cat.id} onClick={() => navigate(`/market?cat=${cat.id}`)} className={`group relative overflow-hidden rounded-[2rem] p-8 cursor-pointer transition-all duration-500 hover:shadow-2xl hover:-translate-y-1 ${idx === 0 || idx === 3 ? 'md:col-span-2 bg-white' : 'bg-white'}`}>
                <div className={`absolute inset-0 bg-gradient-to-br ${cat.color} opacity-0 group-hover:opacity-5 transition-opacity duration-500`}></div>
                <div className="relative z-10 h-full flex flex-col justify-between">
                  <div className="flex justify-between items-start">
                    <div className={`w-16 h-16 rounded-2xl ${cat.bg} ${cat.text} flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-500`}>{cat.icon}</div>
                    <span className="bg-gray-100 text-gray-500 text-[10px] font-bold px-2 py-1 rounded-full group-hover:bg-[#00418E] group-hover:text-white transition-colors">{cat.count}+</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-1 flex items-center gap-2 group-hover:text-[#00418E] transition-colors">{cat.name} <ArrowRight size={18} className="opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" /></h3>
                    <p className="text-sm text-gray-500 font-medium group-hover:text-gray-700 transition-colors">{cat.sub}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* SECTION 3: AI POWER */}
      <section className="py-24 bg-[#0F172A] relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20"></div>
        <div className="max-w-7xl mx-auto px-4 relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="order-2 lg:order-1">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-widest mb-8"><Cpu size={14} /> Công nghệ độc quyền</div>
            <h2 className="text-4xl md:text-6xl font-black text-white mb-8 leading-tight">Đăng tin <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">Siêu Tốc</span> <br/>với Trợ lý AI</h2>
            <p className="text-slate-400 text-lg mb-10 leading-relaxed max-w-lg">Quên đi việc đau đầu nghĩ caption hay định giá sản phẩm. <strong className="text-white">Gemini Vision Pro</strong> sẽ phân tích và tạo nội dung bán hàng chuyên nghiệp trong 30 giây.</p>
            <div className="space-y-6 mb-12">
                {[ { title: "Tự động viết mô tả", icon: <Code className="text-blue-400"/> }, { title: "Định giá thông minh", icon: <TrendingUp className="text-green-400"/> }, { title: "Gắn thẻ tự động", icon: <Tag className="text-purple-400"/> } ].map((f, i) => (
                  <div key={i} className="flex gap-4 group"><div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0 group-hover:bg-white/10 transition-colors">{f.icon}</div><div><h4 className="text-white font-bold text-lg mb-1 group-hover:text-blue-400 transition-colors">{f.title}</h4></div></div>
                ))}
            </div>
            <button onClick={() => navigate('/post')} className="px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-lg transition-all hover:scale-105 active:scale-95 flex items-center gap-2"><Sparkles size={20} /> Trải nghiệm ngay</button>
          </div>
          <div className="order-1 lg:order-2 transform rotate-y-[-5deg] rotate-x-[5deg] hover:rotate-0 transition-transform duration-700 ease-out"><AITerminal /></div>
        </div>
      </section>

      {/* SECTION 4: LIVE FEED */}
      <section className="py-24 bg-white relative">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
            <div>
              <div className="flex items-center gap-3 mb-3"><div className="p-2 bg-red-50 text-red-500 rounded-lg animate-pulse"><Flame size={24} /></div><span className="text-red-500 font-bold uppercase tracking-widest text-sm">Vừa cập nhật</span></div>
              <h2 className="text-4xl font-black text-gray-900 tracking-tight">Mới Lên Sàn</h2>
            </div>
            <div className="flex items-center bg-gray-100 p-1.5 rounded-xl">{['Tất cả', 'Giáo trình', 'Công nghệ', 'Góc 0Đ'].map((tab) => (<button key={tab} className="px-6 py-2.5 rounded-lg text-sm font-bold transition-all hover:bg-white hover:shadow-sm focus:bg-white focus:shadow-md focus:text-[#00418E] text-gray-500">{tab}</button>))}</div>
          </div>
          <div className="min-h-[500px]">
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">{[1, 2, 3, 4].map((n) => (<div key={n} className="bg-gray-100 rounded-3xl h-[420px] animate-pulse"></div>))}</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                {recentProducts.map((product, idx) => (
                  <div key={product.id} className="animate-in fade-in slide-in-from-bottom-8 duration-700 fill-mode-backwards" style={{ animationDelay: `${idx * 100}ms` }}><HomeProductCard product={product} onClick={() => navigate(`/product/${product.id}`)} /></div>
                ))}
              </div>
            )}
          </div>
          <div className="mt-20 text-center"><button onClick={() => navigate('/market')} className="group relative inline-flex items-center justify-center px-12 py-4 font-black text-white transition-all duration-200 bg-[#00418E] rounded-full hover:bg-[#003370] hover:shadow-xl hover:-translate-y-1">Xem tất cả sản phẩm <ArrowRight size={16} className="ml-2 group-hover:translate-x-1 transition-transform"/></button></div>
        </div>
      </section>

      {/* SECTION 5: FLASH SALE */}
      <section className="py-12 bg-[#F8FAFC]">
        <div className="max-w-7xl mx-auto px-4">
          <div className="relative rounded-[2.5rem] overflow-hidden shadow-xl group cursor-pointer">
            <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-pink-600"></div>
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between p-12 gap-8 text-white">
              <div className="text-center md:text-left">
                <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-4 py-1.5 rounded-full text-xs font-bold mb-4 border border-white/30 animate-pulse"><Gift size={14} /> KẾT THÚC TRONG: 02:45:12</div>
                <h3 className="text-4xl md:text-5xl font-black mb-4">FLASH SALE 0Đ</h3>
                <p className="text-white/90 text-lg font-medium max-w-md">Sự kiện dọn nhà KTX cuối kỳ. Hàng ngàn món đồ được tặng miễn phí mỗi ngày.</p>
              </div>
              <div className="md:ml-auto"><button className="bg-white text-orange-600 px-8 py-4 rounded-xl font-black text-lg shadow-xl hover:bg-gray-50 transition-all active:scale-95 flex items-center gap-2">SĂN NGAY <ChevronRight size={20}/></button></div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 6: WHY CHOOSE US */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <SectionHeader title="Tại sao chọn Chợ BK?" subtitle="An toàn - Tiết kiệm - Văn minh." centered />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mt-16">
            <div className="group text-center">
              <div className="relative w-24 h-24 mx-auto mb-8"><div className="absolute inset-0 bg-blue-100 rounded-full scale-0 group-hover:scale-100 transition-transform duration-500"></div><div className="relative w-full h-full bg-white border-2 border-blue-50 text-[#00418E] rounded-full flex items-center justify-center shadow-lg group-hover:-translate-y-2 transition-transform"><ShieldCheck size={40} /></div></div>
              <h3 className="text-xl font-black text-gray-900 mb-4 group-hover:text-[#00418E] transition-colors">Xác thực Sinh viên</h3>
              <p className="text-gray-500 px-4">100% tài khoản đăng bán đều phải xác thực qua Email sinh viên @hcmut.edu.vn.</p>
            </div>
            <div className="group text-center">
              <div className="relative w-24 h-24 mx-auto mb-8"><div className="absolute inset-0 bg-indigo-100 rounded-full scale-0 group-hover:scale-100 transition-transform duration-500"></div><div className="relative w-full h-full bg-white border-2 border-indigo-50 text-indigo-600 rounded-full flex items-center justify-center shadow-lg group-hover:-translate-y-2 transition-transform"><MapPin size={40} /></div></div>
              <h3 className="text-xl font-black text-gray-900 mb-4 group-hover:text-indigo-600 transition-colors">Giao dịch tại Trường</h3>
              <p className="text-gray-500 px-4">Khuyến khích gặp mặt trực tiếp tại các địa điểm an toàn như Sảnh H6, A4, Thư viện.</p>
            </div>
            <div className="group text-center">
              <div className="relative w-24 h-24 mx-auto mb-8"><div className="absolute inset-0 bg-teal-100 rounded-full scale-0 group-hover:scale-100 transition-transform duration-500"></div><div className="relative w-full h-full bg-white border-2 border-teal-50 text-teal-600 rounded-full flex items-center justify-center shadow-lg group-hover:-translate-y-2 transition-transform"><Users size={40} /></div></div>
              <h3 className="text-xl font-black text-gray-900 mb-4 group-hover:text-teal-600 transition-colors">Cộng đồng Văn minh</h3>
              <p className="text-gray-500 px-4">Hệ thống đánh giá tín nhiệm minh bạch. Admin hỗ trợ giải quyết tranh chấp 24/7.</p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 7: TESTIMONIALS */}
      <section className="py-24 bg-[#F8FAFC]">
        <div className="max-w-7xl mx-auto px-4">
          <SectionHeader title="Sinh viên nói gì?" subtitle="Hơn 15,000 sinh viên Bách Khoa đã tin tưởng và sử dụng." />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {TESTIMONIALS.map((item) => (
              <div key={item.id} className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all duration-300 relative group">
                <Quote size={60} className="absolute top-8 right-8 text-gray-100 group-hover:text-blue-50 transition-colors" />
                <div className="flex items-center gap-1 mb-6">{[...Array(5)].map((_, i) => (<Star key={i} size={16} className={`${i < item.rating ? 'fill-yellow-400 text-yellow-400' : 'fill-gray-200 text-gray-200'}`} />))}</div>
                <p className="text-gray-600 text-lg mb-8 relative z-10 leading-relaxed">"{item.content}"</p>
                <div className="flex items-center gap-4 mt-auto">
                  <img src={item.avatar} alt={item.name} className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-md" />
                  <div><h4 className="font-bold text-gray-900">{item.name}</h4><p className="text-xs text-[#00418E] font-bold uppercase tracking-wider">{item.role}</p></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 8: FAQ */}
      <section className="py-24 bg-white">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-16"><h2 className="text-3xl font-black text-gray-900 mb-4">Câu hỏi thường gặp</h2><p className="text-gray-500">Giải đáp những thắc mắc phổ biến nhất.</p></div>
          <div className="space-y-4">
            {FAQS.map((faq, idx) => (
              <details key={idx} className="group bg-gray-50 rounded-2xl border border-gray-100 open:bg-white open:shadow-lg open:border-blue-100 transition-all duration-300">
                <summary className="flex items-center justify-between p-6 cursor-pointer list-none"><h4 className="font-bold text-gray-800 text-lg group-hover:text-[#00418E] transition-colors">{faq.question}</h4><span className="p-2 bg-white rounded-full shadow-sm text-gray-400 group-open:rotate-180 group-open:bg-[#00418E] group-open:text-white transition-all duration-300"><ChevronDown size={20} /></span></summary>
                <div className="px-6 pb-6 text-gray-600 leading-relaxed border-t border-gray-100/50 pt-4">{faq.answer}</div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 9: FOOTER CTA */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto relative rounded-[3rem] overflow-hidden bg-[#00418E] text-white shadow-2xl">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between p-12 md:p-24 gap-12">
            <div className="max-w-2xl text-center md:text-left">
              <h2 className="text-4xl md:text-5xl font-black mb-6 leading-tight">Bạn có đồ cũ cần bán? <br/><span className="text-yellow-300">Đăng ngay, bán liền tay!</span></h2>
              <p className="text-blue-100 text-lg mb-10 font-medium">Tiếp cận hàng ngàn sinh viên Bách Khoa mỗi ngày. Hoàn toàn miễn phí.</p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
                <button onClick={() => navigate('/post')} className="px-10 py-4 bg-white text-[#00418E] rounded-2xl font-black text-lg shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2"><Sparkles size={20} className="text-yellow-500"/> Đăng Tin Ngay</button>
                <button onClick={() => navigate('/auth')} className="px-10 py-4 bg-transparent border-2 border-white/30 text-white rounded-2xl font-bold hover:bg-white/10 transition-all">Đăng ký thành viên</button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-[#0F172A] text-slate-300 pt-20 pb-10 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
            <div className="space-y-6">
              <div className="flex items-center gap-3"><div className="w-12 h-12 bg-[#00418E] rounded-xl flex items-center justify-center text-white shadow-lg"><GraduationCap size={28} /></div><div><h3 className="text-2xl font-black text-white tracking-tight">CHỢ BK</h3><p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Student Marketplace</p></div></div>
              <p className="text-slate-400 leading-relaxed text-sm">Dự án phi lợi nhuận hỗ trợ sinh viên ĐH Bách Khoa TP.HCM. Kết nối - Chia sẻ - Tiết kiệm.</p>
              <div className="flex gap-4">{[Facebook, Instagram, Youtube, Twitter].map((Icon, i) => (<a key={i} href="#" className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:bg-[#00418E] hover:text-white transition-all"><Icon size={18} /></a>))}</div>
            </div>
            <div><h4 className="text-white font-bold mb-6 uppercase text-sm tracking-widest">Khám phá</h4><ul className="space-y-4 text-sm font-medium">{['Về chúng tôi', 'Quy chế hoạt động', 'Chính sách bảo mật'].map(item => (<li key={item}><a href="#" className="hover:text-[#00418E] transition-colors">{item}</a></li>))}</ul></div>
            <div><h4 className="text-white font-bold mb-6 uppercase text-sm tracking-widest">Liên hệ</h4><ul className="space-y-4 text-sm"><li className="flex items-start gap-3"><MapPin size={20} className="text-[#00418E] shrink-0" /><span>268 Lý Thường Kiệt, Q.10, TP.HCM</span></li><li className="flex items-center gap-3"><Mail size={20} className="text-[#00418E] shrink-0" /><span>support@chobk.com</span></li></ul></div>
          </div>
          <div className="border-t border-slate-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-slate-500"><p>&copy; {new Date().getFullYear()} Chợ BK.</p></div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
