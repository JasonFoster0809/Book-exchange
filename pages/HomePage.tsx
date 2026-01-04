import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Search, ArrowRight, Zap, ShieldCheck, Users, 
  BookOpen, Calculator, Shirt, Monitor, Grid, MapPin, 
  Flame, Gift, Eye, ShoppingBag, PlusCircle, 
  Heart, Package, ChevronRight, Sparkles, TrendingUp,
  MoreHorizontal, ChevronDown, Activity, Bell, X,
  Clock, CheckCircle2, Star, Cpu
} from 'lucide-react';
import { supabase } from '../services/supabase';
import { Product, ProductCategory } from '../types';

// ============================================================================
// 1. ADVANCED VISUAL ENGINE (CSS IN JS)
// ============================================================================
const VisualEngine = () => (
  <style>{`
    :root {
      --primary: #00418E; /* HCMUT Blue */
      --secondary: #00B0F0;
      --accent: #FFD700;
      --dark: #0F172A;
    }
    
    body { 
      background-color: #F8FAFC;
      color: #1E293B;
      overflow-x: hidden;
    }

    /* --- Aurora Background --- */
    .aurora-container {
      position: absolute;
      top: 0; left: 0; right: 0; height: 100vh;
      overflow: hidden;
      z-index: 0;
      background: radial-gradient(circle at 50% 0%, #1e293b 0%, #0f172a 100%);
    }
    
    .aurora-blob {
      position: absolute;
      border-radius: 50%;
      filter: blur(80px);
      opacity: 0.5;
      animation: float 20s infinite alternate cubic-bezier(0.4, 0, 0.2, 1);
    }
    .blob-1 { top: -10%; left: -10%; width: 50vw; height: 50vw; background: #4f46e5; animation-delay: -5s; }
    .blob-2 { bottom: -10%; right: -10%; width: 40vw; height: 40vw; background: #ec4899; animation-delay: -10s; }
    .blob-3 { top: 40%; left: 40%; width: 30vw; height: 30vw; background: #06b6d4; animation-delay: -15s; }

    /* --- Animations --- */
    @keyframes float { 
      0% { transform: translate(0, 0) scale(1); } 
      100% { transform: translate(30px, -30px) scale(1.1); } 
    }
    @keyframes slideUp { 
      from { opacity: 0; transform: translateY(40px); } 
      to { opacity: 1; transform: translateY(0); } 
    }
    @keyframes slideInRight {
      from { opacity: 0; transform: translateX(50px); }
      to { opacity: 1; transform: translateX(0); }
    }
    @keyframes shine {
      0% { left: -100%; opacity: 0; }
      50% { opacity: 0.5; }
      100% { left: 100%; opacity: 0; }
    }
    @keyframes pulse-ring {
      0% { box-shadow: 0 0 0 0 rgba(0, 65, 142, 0.7); }
      70% { box-shadow: 0 0 0 15px rgba(0, 65, 142, 0); }
      100% { box-shadow: 0 0 0 0 rgba(0, 65, 142, 0); }
    }
    @keyframes marquee {
      0% { transform: translateX(0); }
      100% { transform: translateX(-50%); }
    }

    /* --- Utilities --- */
    .animate-enter { animation: slideUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; opacity: 0; }
    .animate-slide-right { animation: slideInRight 0.5s ease-out forwards; }
    .animate-shine { position: absolute; top: 0; width: 50%; height: 100%; background: linear-gradient(to right, transparent, rgba(255,255,255,0.2), transparent); transform: skewX(-20deg); animation: shine 3s infinite; }
    .animate-marquee { animation: marquee 40s linear infinite; }
    .animate-marquee:hover { animation-play-state: paused; }

    /* --- Glassmorphism --- */
    .glass-card {
      background: rgba(255, 255, 255, 0.7);
      backdrop-filter: blur(20px);
      border: 1px solid rgba(255, 255, 255, 0.5);
      box-shadow: 0 10px 40px -10px rgba(0,0,0,0.1);
      transition: all 0.3s ease;
    }
    .glass-card-dark {
      background: rgba(15, 23, 42, 0.6);
      backdrop-filter: blur(20px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      box-shadow: 0 10px 40px -10px rgba(0,0,0,0.3);
    }
    
    .glass-card:hover { transform: translateY(-5px); box-shadow: 0 20px 50px -10px rgba(0,0,0,0.15); }

    .text-gradient {
      background: linear-gradient(135deg, #60A5FA 0%, #A78BFA 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .hide-scrollbar::-webkit-scrollbar { display: none; }
  `}</style>
);

// ============================================================================
// 2. MOCK DATA & CONFIG
// ============================================================================

const MAIN_ACTIONS = [
  { id: 'market', title: 'Dạo Chợ', desc: 'Săn đồ cũ giá hời', icon: <ShoppingBag size={32} className="text-cyan-400"/>, link: '/market', color: 'hover:border-cyan-400/50' },
  { id: 'post', title: 'Đăng Tin', desc: 'Bán đồ trong 30s', icon: <PlusCircle size={32} className="text-pink-400"/>, link: '/post-item', color: 'hover:border-pink-400/50' },
  { id: 'saved', title: 'Yêu Thích', desc: 'Sản phẩm đã lưu', icon: <Heart size={32} className="text-red-400"/>, link: '/saved', color: 'hover:border-red-400/50' },
  { id: 'items', title: 'Đơn Hàng', desc: 'Quản lý tin đăng', icon: <Package size={32} className="text-yellow-400"/>, link: '/my-items', color: 'hover:border-yellow-400/50' },
];

const CATEGORIES = [
  { id: ProductCategory.TEXTBOOK, label: 'Giáo trình', icon: <BookOpen/> },
  { id: ProductCategory.ELECTRONICS, label: 'Điện tử', icon: <Monitor/> },
  { id: ProductCategory.SUPPLIES, label: 'Dụng cụ', icon: <Calculator/> },
  { id: ProductCategory.CLOTHING, label: 'Đồng phục', icon: <Shirt/> },
  { id: ProductCategory.OTHER, label: 'Khác', icon: <MoreHorizontal/> },
];

const LIVE_ACTIVITIES = [
  "Nam vừa đăng bán 'Giáo trình Giải tích 1' - 50k",
  "Linh vừa mua 'Máy tính Casio 580VNX'",
  "Minh vừa đăng bán 'Laptop Dell XPS 13'",
  "Hoàng vừa yêu cầu giao dịch 'Bàn học gấp gọn'",
  "Trang vừa đăng bán 'Áo khoa size M'"
];

// ============================================================================
// 3. COMPLEX SUB-COMPONENTS
// ============================================================================

// 3.1. Typewriter Effect
const Typewriter = ({ texts }: { texts: string[] }) => {
  const [text, setText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [loopNum, setLoopNum] = useState(0);
  const [typingSpeed, setTypingSpeed] = useState(150);

  useEffect(() => {
    const handleType = () => {
      const i = loopNum % texts.length;
      const fullText = texts[i];
      setText(isDeleting ? fullText.substring(0, text.length - 1) : fullText.substring(0, text.length + 1));
      setTypingSpeed(isDeleting ? 30 : 100);

      if (!isDeleting && text === fullText) setTimeout(() => setIsDeleting(true), 2000);
      else if (isDeleting && text === '') { setIsDeleting(false); setLoopNum(loopNum + 1); }
    };
    const timer = setTimeout(handleType, typingSpeed);
    return () => clearTimeout(timer);
  }, [text, isDeleting]);

  return <span className="text-slate-400 font-mono">{text}<span className="animate-pulse text-blue-500">|</span></span>;
};

// 3.2. Live Activity Notification (Giả lập)
const LiveActivityFeed = () => {
  const [activity, setActivity] = useState(LIVE_ACTIVITIES[0]);
  const [show, setShow] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setShow(false);
      setTimeout(() => {
        setActivity(LIVE_ACTIVITIES[Math.floor(Math.random() * LIVE_ACTIVITIES.length)]);
        setShow(true);
      }, 500);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className={`fixed bottom-8 right-8 z-50 transition-all duration-500 transform ${show ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
      <div className="bg-white/90 backdrop-blur-md p-4 rounded-2xl shadow-2xl border border-white/50 flex items-center gap-4 max-w-sm">
        <div className="relative">
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
            <Bell size={18} className="text-blue-600"/>
          </div>
          <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>
        </div>
        <div>
          <p className="text-xs font-bold text-slate-400 uppercase mb-0.5">Hoạt động mới</p>
          <p className="text-sm font-bold text-slate-800 line-clamp-1">{activity}</p>
        </div>
        <button onClick={() => setShow(false)} className="text-slate-400 hover:text-slate-600"><X size={16}/></button>
      </div>
    </div>
  );
};

// 3.3. Product Card (Minimal & Animated)
const ProductCard = ({ product }: { product: Product }) => {
  const navigate = useNavigate();
  return (
    <div 
      onClick={() => navigate(`/product/${product.id}`)}
      className="group bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all duration-500 cursor-pointer border border-gray-100 relative"
    >
      <div className="aspect-[4/3] relative overflow-hidden bg-gray-100">
        <img 
          src={product.images[0] || 'https://via.placeholder.com/300'} 
          alt={product.title} 
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 mix-blend-multiply"
        />
        {product.price === 0 && (
          <div className="absolute top-3 right-3 bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-lg shadow-lg animate-pulse flex items-center gap-1">
            <Gift size={10}/> FREE
          </div>
        )}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-[2px]">
           <button className="bg-white text-slate-900 px-4 py-2 rounded-full font-bold text-xs transform scale-90 group-hover:scale-100 transition-transform shadow-lg">Xem chi tiết</button>
        </div>
      </div>
      <div className="p-5">
        <div className="flex justify-between items-start mb-2">
           <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded border border-blue-100 uppercase tracking-wider">{product.category}</span>
           <span className="text-[10px] text-slate-400 font-mono">{new Date(product.postedAt).toLocaleDateString()}</span>
        </div>
        <h3 className="font-bold text-slate-800 text-lg mb-1 truncate group-hover:text-blue-600 transition-colors">{product.title}</h3>
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
           <span className="font-black text-slate-900 text-lg">
             {product.price === 0 ? '0đ' : `${product.price.toLocaleString()}đ`}
           </span>
           <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all">
              <ShoppingBag size={14}/>
           </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 4. MAIN PAGE
// ============================================================================

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'new' | 'cheap' | 'textbook'>('new');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      let query = supabase.from('products').select('*').eq('status', 'available').limit(8);
      
      if (activeTab === 'new') query = query.order('posted_at', { ascending: false });
      else if (activeTab === 'cheap') query = query.order('price', { ascending: true });
      else if (activeTab === 'textbook') query = query.eq('category', ProductCategory.TEXTBOOK);

      const { data } = await query;
      if (data) setProducts(data.map((p: any) => ({ ...p, sellerId: p.seller_id, images: p.images || [], postedAt: p.posted_at })));
      setLoading(false);
    };
    fetchProducts();
  }, [activeTab]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if(search.trim()) navigate(`/market?search=${encodeURIComponent(search)}`);
  };

  return (
    <div className="min-h-screen font-sans selection:bg-blue-500 selection:text-white pb-20">
      <VisualEngine />
      <LiveActivityFeed />

      {/* =================================================================
          1. HERO SECTION (THE PORTAL)
      ================================================================== */}
      <section className="relative w-full overflow-hidden bg-[#0F172A] text-white pt-24 pb-32">
        <div className="aurora-container">
          <div className="blob blob-1"/>
          <div className="blob blob-2"/>
          <div className="blob blob-3"/>
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.05]"></div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 text-center">
          <div className="animate-enter flex justify-center mb-8">
             <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 shadow-xl cursor-default group hover:bg-white/20 transition-colors">
                <Sparkles size={14} className="text-yellow-400 group-hover:rotate-12 transition-transform"/>
                <span className="text-xs font-bold tracking-[0.2em] uppercase">Chợ Sinh Viên Bách Khoa Official</span>
             </div>
          </div>

          <div className="animate-enter" style={{ animationDelay: '100ms' }}>
            <h1 className="text-6xl md:text-8xl font-black leading-tight mb-6 drop-shadow-2xl">
              Cũ Người <br/>
              <span className="text-gradient animate-pulse">Mới Ta</span>
            </h1>
            <p className="text-slate-300 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed font-light">
              Nền tảng trao đổi đồ cũ thông minh dành riêng cho sinh viên HCMUT. <br/>
              <strong className="text-white">An toàn - Tiết kiệm - Nhanh chóng.</strong>
            </p>
          </div>

          {/* Search Portal */}
          <div className="animate-enter w-full max-w-2xl mx-auto relative group z-20" style={{ animationDelay: '200ms' }}>
             <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full blur opacity-25 group-hover:opacity-60 transition duration-1000 animate-pulse"></div>
             <form onSubmit={handleSearch} className="relative flex items-center bg-slate-900/80 backdrop-blur-xl rounded-full border border-white/10 p-2 shadow-2xl transition-all hover:scale-[1.01]">
                <Search className="ml-4 text-slate-400" size={20}/>
                <div className="flex-1 ml-4 h-12 flex items-center overflow-hidden">
                  {!search && <div className="absolute pointer-events-none text-sm"><Typewriter texts={["Tìm 'Giải tích 1'...", "Tìm 'Casio 580VNX'...", "Tìm 'Áo Khoa size L'..."]} /></div>}
                  <input value={search} onChange={(e) => setSearch(e.target.value)} className="w-full h-full bg-transparent border-none outline-none text-white placeholder-transparent z-10"/>
                </div>
                <button className="h-10 px-8 bg-blue-600 hover:bg-blue-500 text-white rounded-full font-bold transition-all shadow-lg shadow-blue-500/30 flex items-center gap-2 overflow-hidden relative">
                  <span className="relative z-10">Tìm kiếm</span>
                  <div className="animate-shine"></div>
                </button>
             </form>
          </div>

          {/* Portal Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-20 px-4 animate-enter" style={{ animationDelay: '300ms' }}>
             {MAIN_ACTIONS.map((action) => (
                <Link to={action.link} key={action.id} className={`glass-card-dark p-6 rounded-3xl flex flex-col items-center justify-center text-center gap-4 group cursor-pointer border border-white/10 hover:border-white/30 transition-all duration-300 ${action.color}`}>
                   <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner border border-white/5">
                      {action.icon}
                   </div>
                   <div>
                      <h3 className="font-bold text-white text-lg group-hover:text-blue-300 transition-colors">{action.title}</h3>
                      <p className="text-slate-400 text-xs mt-1 uppercase tracking-wider">{action.desc}</p>
                   </div>
                </Link>
             ))}
          </div>
        </div>
      </section>

      {/* =================================================================
          2. MARKET SHOWCASE (TABS & GRID)
      ================================================================== */}
      <section className="py-20 max-w-7xl mx-auto px-4">
         {/* Tabs */}
         <div className="flex flex-col md:flex-row items-center justify-between mb-10 gap-6">
            <div className="flex gap-2 bg-white p-1.5 rounded-full border border-gray-200 shadow-sm overflow-x-auto max-w-full">
               {[
                 { id: 'new', label: 'Mới nhất', icon: <Flame size={16}/> },
                 { id: 'cheap', label: 'Giá tốt', icon: <TrendingUp size={16}/> },
                 { id: 'textbook', label: 'Giáo trình', icon: <BookOpen size={16}/> }
               ].map(tab => (
                 <button 
                   key={tab.id}
                   onClick={() => setActiveTab(tab.id as any)}
                   className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-bold transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-[#00418E] text-white shadow-md' : 'text-slate-500 hover:bg-gray-100'}`}
                 >
                   {tab.icon} {tab.label}
                 </button>
               ))}
            </div>
            <Link to="/market" className="flex items-center gap-1 text-sm font-bold text-blue-600 hover:underline group">
               Xem tất cả <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform"/>
            </Link>
         </div>

         {/* Grid */}
         <div className="grid grid-cols-2 md:grid-cols-4 gap-6 min-h-[400px]">
            {loading 
              ? [...Array(8)].map((_, i) => (
                  <div key={i} className="bg-white rounded-3xl border border-gray-100 p-4 space-y-4">
                    <div className="aspect-[4/3] bg-gray-100 rounded-2xl animate-pulse"/>
                    <div className="h-4 bg-gray-100 rounded w-3/4 animate-pulse"/>
                    <div className="h-4 bg-gray-100 rounded w-1/2 animate-pulse"/>
                  </div>
                ))
              : products.map((p, i) => (
                  <div key={p.id} className="animate-enter" style={{ animationDelay: `${i * 50}ms` }}>
                    <ProductCard product={p}/>
                  </div>
                ))
            }
         </div>
      </section>

      {/* =================================================================
          3. HOW IT WORKS (STEP BY STEP)
      ================================================================== */}
      <section className="py-20 bg-white border-y border-gray-100">
         <div className="max-w-7xl mx-auto px-4">
            <div className="text-center mb-16">
               <h2 className="text-4xl font-black text-[#00418E] mb-4">Giao dịch trong 3 bước</h2>
               <p className="text-slate-500 text-lg">Đơn giản hóa quy trình mua bán cho sinh viên</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-10 relative">
               {/* Connector Line */}
               <div className="hidden md:block absolute top-12 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-blue-200 to-transparent z-0"></div>

               {[
                 { step: "01", title: "Tìm kiếm", desc: "Tìm món đồ bạn cần hoặc đăng bán món đồ cũ.", icon: <Search size={32}/> },
                 { step: "02", title: "Kết nối", desc: "Chat trực tiếp với người bán để chốt giá.", icon: <MessageCircle size={32}/> },
                 { step: "03", title: "Giao dịch", desc: "Hẹn gặp tại trường và nhận hàng.", icon: <CheckCircle2 size={32}/> }
               ].map((s, i) => (
                 <div key={i} className="relative z-10 flex flex-col items-center text-center group">
                    <div className="w-24 h-24 bg-white rounded-full border-4 border-blue-50 flex items-center justify-center shadow-xl mb-6 group-hover:scale-110 group-hover:border-blue-200 transition-all duration-500">
                       <div className="text-blue-600 group-hover:text-blue-500 transition-colors">{s.icon}</div>
                    </div>
                    <span className="text-6xl font-black text-slate-100 absolute top-0 -z-10 select-none group-hover:text-blue-50 transition-colors">{s.step}</span>
                    <h3 className="text-xl font-bold text-slate-800 mb-2">{s.title}</h3>
                    <p className="text-slate-500 text-sm max-w-xs">{s.desc}</p>
                 </div>
               ))}
            </div>
         </div>
      </section>

      {/* =================================================================
          4. CATEGORY MARQUEE
      ================================================================== */}
      <div className="py-12 overflow-hidden bg-[#F8FAFC]">
         <div className="flex w-[200%] animate-marquee hover:[animation-play-state:paused]">
            {[...CATEGORIES, ...CATEGORIES].map((cat, i) => (
               <Link 
                 key={i} 
                 to={`/market?cat=${encodeURIComponent(cat.id)}`}
                 className="flex-shrink-0 mx-4 flex items-center gap-3 px-8 py-4 bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-lg hover:border-blue-200 hover:-translate-y-1 transition-all group cursor-pointer"
               >
                  <div className="p-2 bg-blue-50 rounded-lg text-blue-600 group-hover:scale-110 transition-transform">{cat.icon}</div>
                  <span className="font-bold text-slate-700 group-hover:text-blue-600">{cat.label}</span>
               </Link>
            ))}
         </div>
      </div>

      {/* =================================================================
          5. FOOTER
      ================================================================== */}
      <footer className="bg-[#0F172A] text-white pt-20 pb-10 border-t border-white/10">
         <div className="max-w-7xl mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
               <div className="col-span-1 md:col-span-2">
                  <div className="flex items-center gap-2 mb-6">
                     <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center"><ShoppingBag className="text-white"/></div>
                     <span className="text-2xl font-black tracking-tight">CHỢ BK</span>
                  </div>
                  <p className="text-slate-400 max-w-sm leading-relaxed mb-6">
                     Dự án phi lợi nhuận hỗ trợ sinh viên ĐH Bách Khoa TP.HCM. <br/>
                     Kết nối đam mê - Chia sẻ tri thức.
                  </p>
               </div>
               <div>
                  <h4 className="font-bold mb-6 text-blue-400">Khám phá</h4>
                  <ul className="space-y-3 text-slate-400">
                     <li><Link to="/market" className="hover:text-white transition-colors">Dạo chợ</Link></li>
                     <li><Link to="/post-item" className="hover:text-white transition-colors">Đăng tin</Link></li>
                     <li><a href="#" className="hover:text-white transition-colors">Quy định</a></li>
                  </ul>
               </div>
               <div>
                  <h4 className="font-bold mb-6 text-blue-400">Liên hệ</h4>
                  <ul className="space-y-3 text-slate-400">
                     <li className="flex items-center gap-2"><MapPin size={16}/> 268 Lý Thường Kiệt</li>
                     <li className="flex items-center gap-2"><Users size={16}/> Team Dev BK</li>
                  </ul>
               </div>
            </div>
            <div className="border-t border-white/10 pt-8 flex justify-between items-center text-xs text-slate-500">
               <p>&copy; 2024 Chợ BK Team. Made with ❤️ by HCMUT Students.</p>
               <div className="flex gap-4">
                  <a href="#" className="hover:text-white">Điều khoản</a>
                  <a href="#" className="hover:text-white">Bảo mật</a>
               </div>
            </div>
         </div>
      </footer>

    </div>
  );
};

export default HomePage;
