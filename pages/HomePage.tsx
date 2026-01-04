import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Search, Sparkles, ArrowRight, Zap, ShieldCheck, Users, 
  BookOpen, Calculator, Shirt, Plug, ChevronDown, Monitor, 
  Code, Cpu, GraduationCap, Terminal, Star, Quote, 
  HelpCircle, ChevronRight, ChevronLeft, Bell, MapPin, 
  CheckCircle2, Play, Pause, TrendingUp
} from 'lucide-react';
import { supabase } from '../services/supabase';
import { Product } from '../types';
import { useAuth } from '../contexts/AuthContext';

// ============================================================================
// 1. TYPES & INTERFACES
// ============================================================================

interface StatCounter {
  id: string;
  label: string;
  value: number;
  suffix: string;
  icon: React.ReactNode;
}

interface Testimonial {
  id: number;
  name: string;
  role: string;
  avatar: string;
  content: string;
  rating: number;
}

interface FaqItem {
  question: string;
  answer: string;
}

// ============================================================================
// 2. CONSTANTS & MOCK DATA
// ============================================================================

const THEME_COLOR = "#00418E"; // BK Cobalt Blue

const CATEGORIES = [
  { 
    id: 'Giáo trình', 
    name: 'Giáo trình & Tài liệu', 
    icon: <BookOpen className="w-8 h-8"/>, 
    color: 'bg-blue-50 text-[#00418E]', 
    desc: 'Sách, slide bài giảng, đề thi cũ',
    count: 1240 
  },
  { 
    id: 'Đồ điện tử', 
    name: 'Đồ điện tử & PK', 
    icon: <Plug className="w-8 h-8"/>, 
    color: 'bg-indigo-50 text-indigo-600', 
    desc: 'Laptop, chuột, phím, tai nghe',
    count: 856 
  },
  { 
    id: 'Dụng cụ', 
    name: 'Dụng cụ học tập', 
    icon: <Calculator className="w-8 h-8"/>, 
    color: 'bg-teal-50 text-teal-600', 
    desc: 'Máy tính Casio, thước vẽ, bảng',
    count: 542 
  },
  { 
    id: 'Khác', 
    name: 'Đồ dùng khác', 
    icon: <Shirt className="w-8 h-8"/>, 
    color: 'bg-orange-50 text-orange-600', 
    desc: 'Đồng phục, balo, quạt máy...',
    count: 320 
  },
];

const TESTIMONIALS: Testimonial[] = [
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

const FAQS: FaqItem[] = [
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
// 3. SUB-COMPONENTS (INTERNAL)
// ============================================================================

/**
 * Component hiển thị tiêu đề Section đồng bộ
 */
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

/**
 * Component Card sản phẩm phiên bản Home (Tối giản hơn Market)
 */
const HomeProductCard = ({ product, onClick }: { product: Product, onClick: () => void }) => (
  <div 
    onClick={onClick}
    className="group bg-white rounded-3xl border border-gray-100 overflow-hidden hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 cursor-pointer flex flex-col h-full"
  >
    <div className="aspect-[4/3] relative overflow-hidden bg-gray-50">
      <img 
        src={product.images[0] || 'https://via.placeholder.com/300'} 
        alt={product.title} 
        className="w-full h-full object-contain mix-blend-multiply transition-transform duration-700 group-hover:scale-110" 
      />
      <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold text-[#00418E] shadow-sm">
        {product.condition}
      </div>
      {product.price === 0 && (
        <div className="absolute bottom-3 left-3 bg-red-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-sm animate-pulse">
          Tặng miễn phí
        </div>
      )}
    </div>
    <div className="p-5 flex flex-col flex-1">
      <div className="flex items-center gap-2 mb-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
        <span className="bg-blue-50 text-[#00418E] px-2 py-0.5 rounded-md">{product.category}</span>
        <span>•</span>
        <span>{new Date(product.postedAt).toLocaleDateString('vi-VN')}</span>
      </div>
      <h3 className="font-bold text-gray-900 text-lg mb-2 line-clamp-2 group-hover:text-[#00418E] transition-colors">
        {product.title}
      </h3>
      <div className="mt-auto pt-4 flex items-center justify-between border-t border-gray-50">
        <span className="text-xl font-black text-[#00418E]">
          {product.price === 0 ? '0đ' : `${product.price.toLocaleString('vi-VN')}₫`}
        </span>
        <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-[#00418E] group-hover:text-white transition-all">
          <ArrowRight size={16} />
        </div>
      </div>
    </div>
  </div>
);

/**
 * Component AI Terminal Mockup (Hiệu ứng gõ code)
 */
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
    
    // Reset animation loop
    const runAnimation = () => {
      setLines([]);
      sequence.forEach(({ text, delay, color }, index) => {
        const timeout = setTimeout(() => {
          setLines(prev => [...prev, `<span class="${color}">${text}</span>`]);
        }, delay);
        timeouts.push(timeout);
      });
    };

    runAnimation();
    const interval = setInterval(runAnimation, 6000);

    return () => {
      timeouts.forEach(clearTimeout);
      clearInterval(interval);
    };
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

// ============================================================================
// 4. MAIN COMPONENT
// ============================================================================

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  
  // Data States
  const [recentProducts, setRecentProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Animation States
  const [stats, setStats] = useState({ users: 0, products: 0, transactions: 0 });
  const [activeFaq, setActiveFaq] = useState<number | null>(0);
  const [currentTestimonial, setCurrentTestimonial] = useState(0);

  // --- 4.1 DATA FETCHING ---
  useEffect(() => {
    fetchRecentProducts();
    
    // Counter Animation Logic
    const targetStats = { users: 2540, products: 860, transactions: 1420 };
    const duration = 2000; // 2 seconds
    const steps = 50;
    const intervalTime = duration / steps;
    
    let currentStep = 0;
    const timer = setInterval(() => {
      currentStep++;
      const progress = currentStep / steps;
      // Ease-out cubic function
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

  // --- 4.2 HANDLERS ---
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      navigate(`/market?search=${encodeURIComponent(searchTerm.trim())}`);
    }
  };

  const nextTestimonial = () => {
    setCurrentTestimonial((prev) => (prev + 1) % TESTIMONIALS.length);
  };

  const prevTestimonial = () => {
    setCurrentTestimonial((prev) => (prev - 1 + TESTIMONIALS.length) % TESTIMONIALS.length);
  };

  // ==========================================================================
  // 5. RENDER UI
  // ==========================================================================
  return (
    <div className="min-h-screen bg-white font-sans text-[#1a1a1a] selection:bg-[#00418E] selection:text-white">
      
      {/* ---------------------------------------------------------------------
          HERO SECTION: PARALLAX & SEARCH
      ---------------------------------------------------------------------- */}
      <div className="relative w-full h-[750px] bg-[#00418E] overflow-hidden flex items-center justify-center">
        {/* Animated Background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-1/2 -right-1/2 w-[1000px] h-[1000px] bg-white/5 rounded-full blur-[100px] animate-pulse-slow"></div>
          <div className="absolute -bottom-1/2 -left-1/2 w-[800px] h-[800px] bg-blue-400/10 rounded-full blur-[80px]"></div>
          <div className="absolute inset-0 bg-[url('https://hcmut.edu.vn/img/campus/campus-1.jpg')] bg-cover bg-center opacity-10 mix-blend-overlay scale-110"></div>
        </div>

        <div className="relative z-10 w-full max-w-5xl px-4 text-center -mt-10">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white text-xs font-black uppercase tracking-[0.2em] mb-8 hover:bg-white/20 transition-all cursor-default shadow-xl animate-fadeIn">
            <GraduationCap className="w-4 h-4 text-yellow-400" />
            Cộng đồng sinh viên Bách Khoa
          </div>

          {/* Main Title */}
          <h1 className="text-5xl md:text-7xl font-black text-white mb-8 leading-tight drop-shadow-2xl tracking-tighter animate-slideUp">
            Trao Đổi Đồ Cũ <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-200 via-white to-blue-200 animate-shine">Thông Minh & Tiết Kiệm</span>
          </h1>
          
          <p className="text-blue-100 text-lg md:text-xl mb-12 max-w-2xl mx-auto font-medium leading-relaxed opacity-90 animate-slideUp delay-100">
            Nền tảng mua bán giáo trình, thiết bị điện tử uy tín dành riêng cho BKers. 
            Kết nối trực tiếp, giao dịch an toàn tại trường.
          </p>

          {/* Search Input (Glassmorphism) */}
          <div className="max-w-2xl mx-auto relative group animate-slideUp delay-200">
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-400 to-teal-400 rounded-full blur opacity-20 group-hover:opacity-40 transition duration-500"></div>
            <form onSubmit={handleSearch} className="relative flex items-center bg-white/95 backdrop-blur-xl rounded-full shadow-2xl p-2 transition-transform transform hover:scale-[1.01]">
              <input 
                type="text" 
                placeholder="Bạn muốn tìm gì? (VD: Giải tích 1, Casio 580...)" 
                className="flex-1 bg-transparent border-none outline-none text-lg text-gray-800 placeholder:text-gray-400 px-6 h-14 font-medium"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <button type="submit" className="h-12 bg-[#00418E] hover:bg-[#003370] text-white px-8 rounded-full font-bold text-sm transition-all flex items-center gap-2 shadow-lg active:scale-95">
                <Search className="w-4 h-4"/> <span className="hidden sm:inline">Tìm kiếm</span>
              </button>
            </form>
          </div>

          {/* Live Stats */}
          <div className="flex flex-wrap justify-center gap-12 mt-20 text-white animate-fadeIn delay-300">
            {[
              { id: 'posts', val: stats.products, label: 'Tin đã đăng' },
              { id: 'users', val: stats.users, label: 'Thành viên' },
              { id: 'trans', val: stats.transactions, label: 'Giao dịch' }
            ].map(item => (
              <div key={item.id} className="text-center group cursor-default">
                <p className="text-4xl md:text-5xl font-black group-hover:text-yellow-300 transition-colors duration-300">{item.val}+</p>
                <p className="text-[10px] opacity-60 uppercase font-bold tracking-widest mt-2">{item.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Scroll Down Indicator */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce text-white/50">
          <ChevronDown size={32} />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4">
        
        {/* ---------------------------------------------------------------------
            SECTION 1: FEATURED CATEGORIES
        ---------------------------------------------------------------------- */}
        <section className="py-24 border-b border-gray-100">
          <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-4">
            <div>
              <h2 className="text-3xl font-black text-[#00418E] mb-3 tracking-tight">Khám phá danh mục</h2>
              <p className="text-gray-500 font-medium">Dễ dàng tìm kiếm món đồ bạn cần theo nhóm sản phẩm.</p>
            </div>
            <button 
              onClick={() => navigate('/market')} 
              className="group flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-[#00418E] transition-colors px-5 py-3 rounded-xl hover:bg-blue-50"
            >
              Xem tất cả <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1"/>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
            {CATEGORIES.map((cat) => (
              <div 
                key={cat.id} 
                onClick={() => navigate(`/market?cat=${cat.id}`)}
                className="group relative bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all duration-300 cursor-pointer overflow-hidden"
              >
                <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${cat.color.split(' ')[0]} to-transparent rounded-bl-[100px] opacity-50 group-hover:scale-150 transition-transform duration-500`}></div>
                <div className={`relative w-16 h-16 rounded-2xl ${cat.color} flex items-center justify-center mb-6 shadow-sm group-hover:rotate-6 transition-transform`}>
                  {cat.icon}
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-[#00418E] transition-colors">{cat.name}</h3>
                <p className="text-sm text-gray-500 mb-4 line-clamp-2">{cat.desc}</p>
                <div className="flex items-center text-xs font-bold text-gray-400 uppercase tracking-wider group-hover:text-[#00418E] transition-colors">
                  {cat.count} sản phẩm <ChevronRight size={14} className="ml-1"/>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ---------------------------------------------------------------------
            SECTION 2: AI POWER BANNER
        ---------------------------------------------------------------------- */}
        <section className="py-24">
          <div className="relative rounded-[3rem] bg-[#00418E] shadow-2xl overflow-hidden group">
            {/* Background Decoration */}
            <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-blue-500/20 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2"></div>
            <div className="absolute bottom-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>

            <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between p-12 md:p-24 gap-16">
              
              {/* Left: Text Content */}
              <div className="max-w-xl text-white">
                <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full text-xs font-bold mb-8 border border-white/20 shadow-lg">
                  <Sparkles className="w-4 h-4 text-yellow-300" /> Tính năng độc quyền
                </div>
                <h2 className="text-4xl md:text-6xl font-black mb-8 leading-tight">
                  Đăng tin siêu tốc <br/>
                  với <span className="text-yellow-300 underline decoration-white/20 underline-offset-8">Trợ lý AI</span>
                </h2>
                <p className="text-blue-100 text-lg mb-10 leading-relaxed font-light opacity-90">
                  Bạn lười viết mô tả? Không biết bán giá bao nhiêu? <br/>
                  AI sẽ tự động phân tích hình ảnh, viết nội dung và gợi ý giá bán phù hợp nhất chỉ trong 30 giây.
                </p>
                <div className="flex flex-wrap gap-4">
                  <button onClick={() => navigate('/post')} className="bg-white text-[#00418E] px-10 py-4 rounded-2xl font-black text-lg shadow-xl hover:shadow-2xl hover:scale-105 transition-all active:scale-95 flex items-center gap-3">
                    <Sparkles size={20}/> Thử Ngay
                  </button>
                  <button onClick={() => navigate('/market')} className="px-10 py-4 rounded-2xl font-bold text-white border-2 border-white/20 hover:bg-white/10 transition-all">
                    Xem demo
                  </button>
                </div>
              </div>

              {/* Right: AI Terminal Mockup */}
              <div className="w-full max-w-lg transform rotate-2 group-hover:rotate-0 transition-transform duration-700 hover:scale-105">
                <AITerminal />
              </div>

            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------------------
            SECTION 3: RECENT PRODUCTS
        ---------------------------------------------------------------------- */}
        <section className="py-24 border-b border-gray-100">
          <SectionHeader 
            title="Mới Lên Sàn" 
            subtitle="Những món đồ vừa được đăng bán gần đây. Hãy nhanh tay liên hệ trước khi có người khác chốt đơn!"
          />
          
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {[1, 2, 3, 4].map(n => (
                <div key={n} className="bg-gray-100 rounded-3xl h-[400px] animate-pulse"></div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {recentProducts.map((p, idx) => (
                <div key={p.id} className="animate-in fade-in slide-in-from-bottom-8 duration-700" style={{ animationDelay: `${idx * 100}ms` }}>
                  <HomeProductCard 
                    product={p} 
                    onClick={() => navigate(`/product/${p.id}`)}
                  />
                </div>
              ))}
            </div>
          )}
          
          <div className="mt-16 text-center">
            <button onClick={() => navigate('/market')} className="px-12 py-4 bg-white border-2 border-gray-100 text-gray-600 rounded-full font-bold hover:border-[#00418E] hover:text-[#00418E] hover:shadow-xl transition-all transform hover:-translate-y-1 tracking-widest text-sm uppercase">
              Xem tất cả sản phẩm
            </button>
          </div>
        </section>

        {/* ---------------------------------------------------------------------
            SECTION 4: TESTIMONIALS (ĐÁNH GIÁ)
        ---------------------------------------------------------------------- */}
        <section className="py-24 bg-gray-50 -mx-4 px-4 md:px-0">
          <div className="max-w-7xl mx-auto">
            <SectionHeader 
              title="Sinh viên nói gì về Chợ BK?" 
              centered 
            />
            
            <div className="max-w-4xl mx-auto relative">
              {/* Card */}
              <div className="bg-white p-12 rounded-[3rem] shadow-xl text-center relative overflow-hidden">
                <Quote size={60} className="absolute top-8 left-8 text-gray-100 rotate-180" />
                
                <div className="relative z-10">
                  <div className="flex justify-center mb-6">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} size={24} className={`${i < TESTIMONIALS[currentTestimonial].rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'} mx-1`} />
                    ))}
                  </div>
                  
                  <p className="text-2xl md:text-3xl text-gray-800 font-medium mb-10 leading-normal italic">
                    "{TESTIMONIALS[currentTestimonial].content}"
                  </p>
                  
                  <div className="flex items-center justify-center gap-4">
                    <img 
                      src={TESTIMONIALS[currentTestimonial].avatar} 
                      alt={TESTIMONIALS[currentTestimonial].name} 
                      className="w-16 h-16 rounded-full border-4 border-blue-50"
                    />
                    <div className="text-left">
                      <h4 className="font-bold text-lg text-[#00418E]">{TESTIMONIALS[currentTestimonial].name}</h4>
                      <p className="text-sm text-gray-500 font-medium">{TESTIMONIALS[currentTestimonial].role}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Navigation Buttons */}
              <button onClick={prevTestimonial} className="absolute top-1/2 -left-4 md:-left-16 -translate-y-1/2 p-4 bg-white rounded-full shadow-lg text-gray-400 hover:text-[#00418E] hover:scale-110 transition-all">
                <ChevronLeft size={24} />
              </button>
              <button onClick={nextTestimonial} className="absolute top-1/2 -right-4 md:-right-16 -translate-y-1/2 p-4 bg-white rounded-full shadow-lg text-gray-400 hover:text-[#00418E] hover:scale-110 transition-all">
                <ChevronRight size={24} />
              </button>
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------------------
            SECTION 5: WHY CHOOSE US & FAQ
        ---------------------------------------------------------------------- */}
        <section className="py-24 grid grid-cols-1 lg:grid-cols-2 gap-16">
          {/* Why Choose Us */}
          <div>
            <h2 className="text-3xl font-black text-gray-900 mb-8">Tại sao chọn Chợ BK?</h2>
            <div className="space-y-8">
              <div className="flex gap-6">
                <div className="w-16 h-16 bg-blue-50 text-[#00418E] rounded-2xl flex items-center justify-center shrink-0">
                  <ShieldCheck size={32}/>
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-2">Xác thực Sinh viên</h3>
                  <p className="text-gray-500 leading-relaxed">Chỉ những tài khoản có email @hcmut.edu.vn mới được phép đăng tin, giảm thiểu tối đa rủi ro lừa đảo.</p>
                </div>
              </div>
              <div className="flex gap-6">
                <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shrink-0">
                  <Monitor size={32}/>
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-2">Giao diện hiện đại</h3>
                  <p className="text-gray-500 leading-relaxed">Trải nghiệm mượt mà trên cả điện thoại và máy tính. Tích hợp Chat Realtime và Thông báo.</p>
                </div>
              </div>
              <div className="flex gap-6">
                <div className="w-16 h-16 bg-teal-50 text-teal-600 rounded-2xl flex items-center justify-center shrink-0">
                  <Users size={32}/>
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-2">Cộng đồng lớn mạnh</h3>
                  <p className="text-gray-500 leading-relaxed">Kết nối hơn 20.000 sinh viên trong trường. Dễ dàng tìm được món đồ ưng ý hoặc pass đồ nhanh chóng.</p>
                </div>
              </div>
            </div>
          </div>

          {/* FAQ Accordion */}
          <div>
            <h2 className="text-3xl font-black text-gray-900 mb-8 flex items-center gap-3">
              <HelpCircle size={32} className="text-[#00418E]"/> Câu hỏi thường gặp
            </h2>
            <div className="space-y-4">
              {FAQS.map((faq, index) => (
                <div 
                  key={index} 
                  className={`border rounded-2xl overflow-hidden transition-all duration-300 ${activeFaq === index ? 'border-[#00418E] bg-blue-50/50' : 'border-gray-200 bg-white hover:border-gray-300'}`}
                >
                  <button 
                    onClick={() => setActiveFaq(activeFaq === index ? null : index)}
                    className="w-full flex items-center justify-between p-6 text-left font-bold text-gray-900"
                  >
                    {faq.question}
                    <ChevronDown size={20} className={`transition-transform duration-300 ${activeFaq === index ? 'rotate-180 text-[#00418E]' : 'text-gray-400'}`} />
                  </button>
                  <div 
                    className={`overflow-hidden transition-all duration-300 ease-in-out ${activeFaq === index ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'}`}
                  >
                    <p className="px-6 pb-6 text-gray-600 leading-relaxed">{faq.answer}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

      </div>

      {/* ---------------------------------------------------------------------
          SECTION 6: CALL TO ACTION (FOOTER TEASER)
      ---------------------------------------------------------------------- */}
      <div className="bg-[#00418E] py-20 text-center text-white relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
        <div className="relative z-10 max-w-3xl mx-auto px-4">
          <Bell className="w-16 h-16 mx-auto mb-6 text-yellow-300 animate-bounce" />
          <h2 className="text-4xl md:text-5xl font-black mb-6">Bạn có đồ cũ cần bán?</h2>
          <p className="text-xl text-blue-100 mb-10 font-medium">Đăng tin ngay hôm nay để tiếp cận hàng ngàn sinh viên Bách Khoa.</p>
          <button onClick={() => navigate('/post')} className="bg-white text-[#00418E] px-12 py-5 rounded-full font-black text-xl shadow-2xl hover:scale-105 transition-transform active:scale-95">
            Đăng Tin Ngay
          </button>
        </div>
      </div>

    </div>
  );
};

export default HomePage;
