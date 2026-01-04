import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Search, ArrowRight, Zap, ShieldCheck, Users, 
  BookOpen, Calculator, Shirt, Plug, ChevronDown, 
  ChevronRight, ChevronLeft, Bell, MapPin, 
  CheckCircle2, TrendingUp, Flame, Gift,
  Tag, Eye, Share2, Facebook, Instagram, Youtube, 
  Twitter, Mail, Phone, ShoppingBag, Filter,
  LayoutGrid, Clock, Star, RefreshCw, AlertCircle
} from 'lucide-react';
import { supabase } from '../services/supabase';
import { Product } from '../types';
import { useAuth } from '../contexts/AuthContext';

// ============================================================================
// 1. SYSTEM CONFIG & TYPES
// ============================================================================

/**
 * Cấu hình màu sắc chủ đạo - BK Cobalt Blue
 */
const THEME = {
  primary: '#00418E',
  primaryHover: '#003370',
  secondary: '#00B0F0',
  accent: '#FFC107',
  bg: '#F8F9FA',
  text: '#1E293B',
  muted: '#64748B',
  border: '#E2E8F0'
};

interface CategoryItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  desc: string;
  color: string;
}

interface StatMetric {
  label: string;
  value: number;
  icon: React.ReactNode;
  suffix?: string;
}

// ============================================================================
// 2. STATIC CONFIGURATION (Nav, Categories)
// ============================================================================

const MAIN_CATEGORIES: CategoryItem[] = [
  { 
    id: 'giao-trinh', 
    label: 'Giáo trình & Tài liệu', 
    desc: 'Sách đại cương, chuyên ngành',
    icon: <BookOpen size={24} />, 
    color: 'text-blue-600 bg-blue-50'
  },
  { 
    id: 'dien-tu', 
    label: 'Thiết bị điện tử', 
    desc: 'Laptop, Điện thoại, Phụ kiện',
    icon: <Plug size={24} />, 
    color: 'text-indigo-600 bg-indigo-50'
  },
  { 
    id: 'dung-cu', 
    label: 'Dụng cụ học tập', 
    desc: 'Máy tính Casio, Thước, Bảng',
    icon: <Calculator size={24} />, 
    color: 'text-emerald-600 bg-emerald-50'
  },
  { 
    id: 'thoi-trang', 
    label: 'Thời trang & Đồng phục', 
    desc: 'Áo khoa, Balo, Giày dép',
    icon: <Shirt size={24} />, 
    color: 'text-orange-600 bg-orange-50'
  },
  { 
    id: 'noi-that', 
    label: 'Nội thất KTX', 
    desc: 'Quạt, Bàn học, Tủ vải',
    icon: <LayoutGrid size={24} />, 
    color: 'text-purple-600 bg-purple-50'
  },
  { 
    id: 'phuong-tien', 
    label: 'Phương tiện đi lại', 
    desc: 'Xe đạp, Xe máy cũ',
    icon: <MapPin size={24} />, 
    color: 'text-rose-600 bg-rose-50'
  }
];

const TRUST_FEATURES = [
  {
    title: "Xác thực Sinh viên",
    desc: "100% tài khoản người bán được xác minh qua Email sinh viên (@hcmut.edu.vn).",
    icon: <ShieldCheck size={32} />,
    color: "text-blue-600"
  },
  {
    title: "Giao dịch An toàn",
    desc: "Khuyến khích gặp mặt trực tiếp tại khuôn viên trường (H6, Thư viện) để kiểm tra.",
    icon: <MapPin size={32} />,
    color: "text-green-600"
  },
  {
    title: "Cộng đồng Văn minh",
    desc: "Hệ thống đánh giá tín nhiệm minh bạch. Đội ngũ Admin hỗ trợ 24/7.",
    icon: <Users size={32} />,
    color: "text-purple-600"
  }
];

// ============================================================================
// 3. CUSTOM HOOKS (LOGIC)
// ============================================================================

/**
 * Hook lấy số liệu thống kê thực tế từ Database
 * (Thay vì mock data ảo)
 */
const useRealtimeStats = () => {
  const [stats, setStats] = useState<StatMetric[]>([
    { label: 'Tin đăng hoạt động', value: 0, icon: <ShoppingBag size={18}/> },
    { label: 'Người dùng xác thực', value: 0, icon: <Users size={18}/> },
    { label: 'Lượt giao dịch', value: 0, icon: <RefreshCw size={18}/> }
  ]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // 1. Đếm số sản phẩm available
        const { count: productCount } = await supabase
          .from('products')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'available');

        // 2. Đếm số user (giả định bảng profiles)
        const { count: userCount } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true });

        // 3. Đếm số sản phẩm đã bán (sold) coi như lượt giao dịch
        const { count: soldCount } = await supabase
          .from('products')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'sold');

        setStats([
          { label: 'Tin đăng', value: productCount || 0, icon: <ShoppingBag size={18}/> },
          { label: 'Thành viên', value: userCount || 0, icon: <Users size={18}/> },
          { label: 'Đã bán', value: soldCount || 0, icon: <CheckCircle2 size={18}/> }
        ]);
      } catch (error) {
        console.error("Error fetching stats:", error);
      }
    };

    fetchStats();
  }, []);

  return stats;
};

/**
 * Hook xử lý hiệu ứng Sticky Header khi cuộn
 */
const useStickyHeader = (threshold = 100) => {
  const [isSticky, setIsSticky] = useState(false);
  useEffect(() => {
    const handleScroll = () => {
      setIsSticky(window.scrollY > threshold);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [threshold]);
  return isSticky;
};

// ============================================================================
// 4. UI COMPONENTS (ATOMIC DESIGN)
// ============================================================================

/**
 * Component tiêu đề Section chuẩn
 */
const SectionHeader = ({ title, subtitle, action }: { title: string, subtitle?: string, action?: React.ReactNode }) => (
  <div className="flex flex-col md:flex-row justify-between items-end mb-8 gap-4 border-b border-gray-100 pb-6">
    <div className="space-y-2">
      <h2 className="text-3xl font-black text-[#1E293B] tracking-tight flex items-center gap-3">
        {title}
      </h2>
      {subtitle && <p className="text-gray-500 font-medium text-sm md:text-base max-w-2xl">{subtitle}</p>}
    </div>
    {action && (
      <div className="shrink-0">
        {action}
      </div>
    )}
  </div>
);

/**
 * Component Card sản phẩm (Clean & Info-focused)
 */
const ProductCard = ({ product }: { product: Product }) => {
  const navigate = useNavigate();
  
  return (
    <div 
      onClick={() => navigate(`/product/${product.id}`)}
      className="group bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-xl hover:border-blue-200 transition-all duration-300 cursor-pointer flex flex-col h-full relative"
    >
      {/* Image Area */}
      <div className="aspect-square relative overflow-hidden bg-gray-50">
        {product.images[0] ? (
          <img 
            src={product.images[0]} 
            alt={product.title} 
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300">
            <ShoppingBag size={40} />
          </div>
        )}
        
        {/* Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {product.price === 0 && (
            <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded shadow-sm flex items-center gap-1">
              <Gift size={10} /> 0Đ
            </span>
          )}
          {product.condition === 'Mới' && (
            <span className="bg-emerald-500 text-white text-[10px] font-bold px-2 py-1 rounded shadow-sm">
              NEW
            </span>
          )}
        </div>

        {/* Hover Action */}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300 flex justify-center">
          <span className="text-white text-xs font-bold flex items-center gap-1">
            Xem chi tiết <ArrowRight size={12} />
          </span>
        </div>
      </div>

      {/* Info Area */}
      <div className="p-4 flex flex-col flex-1">
        <div className="flex items-center gap-2 mb-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
          <span className="bg-gray-100 px-1.5 py-0.5 rounded text-[#00418E]">{product.category}</span>
          <span>•</span>
          <span className="flex items-center gap-1"><Clock size={10}/> {new Date(product.postedAt).toLocaleDateString('vi-VN')}</span>
        </div>

        <h3 className="font-bold text-gray-800 text-sm mb-2 line-clamp-2 group-hover:text-[#00418E] transition-colors flex-1" title={product.title}>
          {product.title}
        </h3>

        <div className="mt-3 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[10px] text-gray-400 font-medium line-through">
              {product.price > 0 ? `${(product.price * 1.15).toLocaleString()}đ` : ''}
            </span>
            <span className="text-lg font-black text-[#00418E]">
              {product.price === 0 ? 'Miễn phí' : `${product.price.toLocaleString('vi-VN')}đ`}
            </span>
          </div>
          <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-[#00418E] group-hover:text-white transition-all">
            <ShoppingBag size={14} />
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Component Skeleton Loading (Khi chưa tải xong dữ liệu)
 */
const ProductSkeleton = () => (
  <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-3">
    <div className="aspect-square bg-gray-200 rounded-lg animate-pulse"></div>
    <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse"></div>
    <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse"></div>
    <div className="flex justify-between pt-2">
      <div className="h-6 bg-gray-200 rounded w-1/3 animate-pulse"></div>
      <div className="h-8 w-8 bg-gray-200 rounded-full animate-pulse"></div>
    </div>
  </div>
);

// ============================================================================
// 5. MAIN COMPONENT (HOMEPAGE)
// ============================================================================

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const stats = useRealtimeStats();
  const isSticky = useStickyHeader();

  // State Management
  const [searchTerm, setSearchTerm] = useState('');
  const [recentProducts, setRecentProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'books' | 'tech'>('all');

  // Fetch Data Thật từ Supabase
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        let query = supabase
          .from('products')
          .select('*, profiles:seller_id(name, avatar_url)')
          .eq('status', 'available')
          .order('posted_at', { ascending: false })
          .limit(8);

        // Simple Tab Filtering Logic
        if (activeTab === 'books') query = query.eq('category', 'Giáo trình');
        if (activeTab === 'tech') query = query.eq('category', 'Đồ điện tử');

        const { data, error } = await query;
        if (error) throw error;

        if (data) {
          const mapped: Product[] = data.map((item: any) => ({
            ...item, sellerId: item.seller_id, tradeMethod: item.trade_method, postedAt: item.posted_at, 
            status: item.status, seller: item.profiles, view_count: item.view_count || 0
          }));
          setRecentProducts(mapped);
        }
      } catch (err) {
        console.error("Error fetching products:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [activeTab]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      navigate(`/market?search=${encodeURIComponent(searchTerm.trim())}`);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] font-sans text-[#1E293B]">
      
      {/* =================================================================
          HEADER SECTION (HERO + SEARCH)
      ================================================================== */}
      <header className="relative bg-white overflow-hidden">
        {/* Decorative Background Patterns */}
        <div className="absolute inset-0 bg-[#F1F5F9] skew-y-3 origin-top-left translate-y-[-50%] z-0"></div>
        <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-blue-50 to-transparent opacity-50 z-0"></div>

        <div className="relative z-10 pt-16 pb-24 md:pt-24 md:pb-32 max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            
            {/* Left Column: Text & Search */}
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 border border-blue-100 text-[#00418E] text-xs font-bold uppercase tracking-wider animate-in fade-in slide-in-from-bottom-4 duration-700">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00418E]"></span>
                </span>
                Cộng đồng Sinh viên Bách Khoa
              </div>

              <h1 className="text-5xl md:text-6xl lg:text-7xl font-black text-[#0F172A] leading-[1.1] tracking-tight">
                Trao đổi đồ cũ <br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00418E] to-[#00B0F0]">
                  Thông Minh hơn.
                </span>
              </h1>

              <p className="text-lg text-gray-500 max-w-lg leading-relaxed">
                Nền tảng mua bán giáo trình, thiết bị điện tử an toàn dành riêng cho sinh viên Bách Khoa. 
                Tiết kiệm chi phí, kết nối cộng đồng.
              </p>

              {/* Modern Search Input */}
              <form onSubmit={handleSearch} className="relative max-w-md w-full group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400 group-focus-within:text-[#00418E] transition-colors" />
                </div>
                <input 
                  type="text" 
                  className="block w-full pl-12 pr-4 py-4 bg-white border-2 border-gray-100 rounded-2xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#00418E] focus:ring-4 focus:ring-blue-50 transition-all shadow-sm hover:shadow-md"
                  placeholder="Bạn đang tìm gì? (VD: Giải tích 1)"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <button type="submit" className="absolute right-2 top-2 bottom-2 bg-[#00418E] text-white px-6 rounded-xl font-bold hover:bg-[#003370] transition-colors shadow-lg shadow-blue-900/20">
                  Tìm
                </button>
              </form>

              {/* Stats Row */}
              <div className="flex items-center gap-8 pt-4 border-t border-gray-100">
                {stats.map((stat, index) => (
                  <div key={index} className="flex flex-col">
                    <span className="text-2xl font-black text-[#0F172A]">{stat.value.toLocaleString()}+</span>
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">{stat.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Column: Hero Visuals */}
            <div className="relative hidden lg:block">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-100 rounded-full blur-3xl opacity-50 animate-pulse"></div>
              
              <div className="relative grid grid-cols-2 gap-4">
                <div className="space-y-4 pt-12">
                  <div className="bg-white p-4 rounded-2xl shadow-xl border border-gray-50 transform hover:-translate-y-2 transition-transform duration-500">
                    <div className="h-32 bg-gray-100 rounded-xl mb-3 overflow-hidden">
                        <img src="https://salt.tikicdn.com/cache/750x750/ts/product/6e/04/b3/c2759e6659c20a4d46c764e40292276c.jpg.webp" className="w-full h-full object-cover" alt="Casio"/>
                    </div>
                    <div className="h-2 w-20 bg-gray-200 rounded mb-2"></div>
                    <div className="h-4 w-32 bg-blue-100 rounded"></div>
                  </div>
                  <div className="bg-[#00418E] p-6 rounded-2xl shadow-xl text-white transform hover:-translate-y-2 transition-transform duration-500 delay-100">
                    <ShieldCheck size={32} className="mb-4 text-blue-300"/>
                    <h3 className="font-bold text-lg mb-1">An toàn tuyệt đối</h3>
                    <p className="text-blue-100 text-sm opacity-80">Xác thực sinh viên qua Email trường.</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="bg-white p-6 rounded-2xl shadow-xl border border-gray-50 transform hover:-translate-y-2 transition-transform duration-500 delay-75">
                    <div className="flex items-center gap-3 mb-4">
                       <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600"><TrendingUp size={20}/></div>
                       <div>
                          <p className="text-xs text-gray-500 font-bold">Tiết kiệm</p>
                          <p className="font-black text-lg">70%</p>
                       </div>
                    </div>
                    <p className="text-sm text-gray-500">So với mua mới</p>
                  </div>
                  <div className="bg-white p-4 rounded-2xl shadow-xl border border-gray-50 transform hover:-translate-y-2 transition-transform duration-500 delay-150">
                    <div className="h-40 bg-gray-100 rounded-xl mb-3 overflow-hidden">
                        <img src="https://cdn.fahasa.com/media/flashmagazine/images/page_images/giao_trinh_giai_tich_1/2020_05_21_10_45_22_1-390x510.jpg" className="w-full h-full object-cover" alt="Sach"/>
                    </div>
                    <div className="flex justify-between items-center">
                        <div className="h-4 w-24 bg-gray-200 rounded"></div>
                        <div className="h-6 w-12 bg-red-100 rounded-full"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </header>

      {/* =================================================================
          CATEGORIES GRID
      ================================================================== */}
      <section className="py-20 px-4 max-w-7xl mx-auto">
        <SectionHeader 
          title="Danh Mục Nổi Bật" 
          subtitle="Tìm kiếm nhanh chóng theo nhu cầu của bạn."
          action={
            <button onClick={() => navigate('/market')} className="text-[#00418E] font-bold text-sm hover:underline flex items-center gap-1">
              Xem tất cả <ArrowRight size={16}/>
            </button>
          }
        />
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {MAIN_CATEGORIES.map((cat) => (
            <div 
              key={cat.id}
              onClick={() => navigate(`/market?cat=${cat.id}`)}
              className="group bg-white border border-gray-200 rounded-2xl p-6 flex flex-col items-center text-center hover:border-blue-300 hover:shadow-lg transition-all duration-300 cursor-pointer"
            >
              <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-4 transition-transform group-hover:scale-110 ${cat.color}`}>
                {cat.icon}
              </div>
              <h3 className="font-bold text-gray-800 text-sm group-hover:text-[#00418E] transition-colors">{cat.label}</h3>
              <p className="text-xs text-gray-400 mt-1 line-clamp-1">{cat.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* =================================================================
          LATEST PRODUCTS (LIVE FEED)
      ================================================================== */}
      <section className="py-20 bg-white border-y border-gray-100">
        <div className="max-w-7xl mx-auto px-4">
          <SectionHeader 
            title="Mới Lên Sàn" 
            subtitle="Những món đồ vừa được các bạn sinh viên đăng bán."
            action={
              <div className="flex bg-gray-100 p-1 rounded-lg">
                <button 
                  onClick={() => setActiveTab('all')}
                  className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${activeTab === 'all' ? 'bg-white text-[#00418E] shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                >
                  Tất cả
                </button>
                <button 
                  onClick={() => setActiveTab('books')}
                  className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${activeTab === 'books' ? 'bg-white text-[#00418E] shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                >
                  Giáo trình
                </button>
                <button 
                  onClick={() => setActiveTab('tech')}
                  className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${activeTab === 'tech' ? 'bg-white text-[#00418E] shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                >
                  Công nghệ
                </button>
              </div>
            }
          />

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {loading ? (
              [...Array(8)].map((_, i) => <ProductSkeleton key={i} />)
            ) : (
              recentProducts.map(product => (
                <ProductCard key={product.id} product={product} />
              ))
            )}
          </div>

          <div className="mt-12 text-center">
            <button 
              onClick={() => navigate('/market')}
              className="inline-flex items-center gap-2 px-8 py-3 bg-white border-2 border-[#00418E] text-[#00418E] rounded-xl font-bold hover:bg-[#00418E] hover:text-white transition-all duration-300"
            >
              Xem thêm 200+ sản phẩm khác <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </section>

      {/* =================================================================
          FEATURES & TRUST
      ================================================================== */}
      <section className="py-24 px-4 bg-[#F8FAFC]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-black text-[#1E293B] mb-4">Tại sao chọn Chợ BK?</h2>
            <p className="text-gray-500 max-w-2xl mx-auto">Nền tảng mua bán an toàn, minh bạch và tiện lợi nhất dành cho sinh viên Bách Khoa.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {TRUST_FEATURES.map((feature, idx) => (
              <div key={idx} className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-lg transition-all duration-300">
                <div className={`w-14 h-14 rounded-xl bg-gray-50 flex items-center justify-center mb-6 ${feature.color}`}>
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{feature.title}</h3>
                <p className="text-gray-500 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =================================================================
          CALL TO ACTION (BANNER)
      ================================================================== */}
      <section className="py-12 px-4">
        <div className="max-w-7xl mx-auto relative rounded-3xl overflow-hidden bg-[#00418E] text-white shadow-2xl">
          {/* Background Texture */}
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
          <div className="absolute right-0 top-0 w-1/2 h-full bg-gradient-to-l from-[#00B0F0] to-transparent opacity-30"></div>

          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between p-12 gap-8">
            <div className="space-y-4 text-center md:text-left">
              <h2 className="text-3xl md:text-4xl font-black">Bạn có đồ cũ cần bán?</h2>
              <p className="text-blue-100 text-lg">Đăng tin miễn phí, tiếp cận hàng ngàn sinh viên ngay hôm nay.</p>
            </div>
            
            <div className="flex gap-4">
              <button 
                onClick={() => navigate('/post')}
                className="px-8 py-4 bg-white text-[#00418E] rounded-xl font-bold shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center gap-2"
              >
                <Zap size={20} className="fill-current" /> Đăng Tin Ngay
              </button>
              <button 
                onClick={() => navigate('/auth')}
                className="px-8 py-4 bg-blue-700/50 text-white rounded-xl font-bold hover:bg-blue-700 transition-all border border-blue-500/30"
              >
                Đăng ký
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* =================================================================
          FOOTER (MEGA)
      ================================================================== */}
      <footer className="bg-white border-t border-gray-200 pt-16 pb-8 text-sm">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
            {/* Brand */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-[#00418E] rounded-lg flex items-center justify-center text-white">
                  <ShoppingBag size={20} />
                </div>
                <span className="text-xl font-black text-[#00418E]">CHỢ BK</span>
              </div>
              <p className="text-gray-500 leading-relaxed">
                Dự án phi lợi nhuận hỗ trợ sinh viên ĐH Bách Khoa TP.HCM. 
                Kết nối - Chia sẻ - Tiết kiệm.
              </p>
              <div className="flex gap-4 pt-2">
                <a href="#" className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-blue-100 hover:text-blue-600 transition-all"><Facebook size={16}/></a>
                <a href="#" className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-pink-100 hover:text-pink-600 transition-all"><Instagram size={16}/></a>
                <a href="#" className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-red-100 hover:text-red-600 transition-all"><Youtube size={16}/></a>
              </div>
            </div>

            {/* Links */}
            <div>
              <h4 className="font-bold text-gray-900 mb-4 uppercase text-xs tracking-wider">Về chúng tôi</h4>
              <ul className="space-y-3 text-gray-500">
                <li><Link to="/about" className="hover:text-[#00418E] transition-colors">Giới thiệu</Link></li>
                <li><Link to="/rules" className="hover:text-[#00418E] transition-colors">Quy chế hoạt động</Link></li>
                <li><Link to="/policy" className="hover:text-[#00418E] transition-colors">Chính sách bảo mật</Link></li>
                <li><Link to="/careers" className="hover:text-[#00418E] transition-colors">Tuyển dụng Admin</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-gray-900 mb-4 uppercase text-xs tracking-wider">Hỗ trợ</h4>
              <ul className="space-y-3 text-gray-500">
                <li><Link to="/help" className="hover:text-[#00418E] transition-colors">Trung tâm trợ giúp</Link></li>
                <li><Link to="/safety" className="hover:text-[#00418E] transition-colors">An toàn mua bán</Link></li>
                <li><Link to="/contact" className="hover:text-[#00418E] transition-colors">Liên hệ</Link></li>
                <li><Link to="/report" className="hover:text-[#00418E] transition-colors">Báo cáo lừa đảo</Link></li>
              </ul>
            </div>

            {/* Contact Info */}
            <div>
              <h4 className="font-bold text-gray-900 mb-4 uppercase text-xs tracking-wider">Liên hệ</h4>
              <ul className="space-y-4 text-gray-500">
                <li className="flex items-start gap-3">
                  <MapPin size={18} className="text-[#00418E] shrink-0 mt-0.5" />
                  <span>268 Lý Thường Kiệt, Phường 14, Quận 10, TP.HCM</span>
                </li>
                <li className="flex items-center gap-3">
                  <Mail size={18} className="text-[#00418E] shrink-0" />
                  <a href="mailto:support@chobk.com" className="hover:text-[#00418E]">support@chobk.com</a>
                </li>
                <li className="flex items-center gap-3">
                  <Phone size={18} className="text-[#00418E] shrink-0" />
                  <a href="tel:0123456789" className="hover:text-[#00418E]">0123.456.789</a>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-gray-400 font-medium">
            <p>&copy; {new Date().getFullYear()} Chợ BK Team. All rights reserved.</p>
            <div className="flex gap-6">
              <a href="#" className="hover:text-gray-600">Điều khoản</a>
              <a href="#" className="hover:text-gray-600">Bảo mật</a>
              <a href="#" className="hover:text-gray-600">Sitemap</a>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
};

export default HomePage;
