import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, Sparkles, ArrowRight, Zap, ShieldCheck, Users, 
  BookOpen, Calculator, Shirt, Plug, Monitor, GraduationCap
} from 'lucide-react';
import { supabase } from '../services/supabase';
import { Product } from '../types';
import ProductCard from '../components/ProductCard';
import ProductSkeleton from '../components/ProductSkeleton';

const CATEGORIES = [
  { id: 'Giáo trình', name: 'Giáo trình', icon: <BookOpen className="w-6 h-6"/>, color: 'bg-blue-50 text-[#00418E]', desc: 'Sách, tài liệu cũ' },
  { id: 'Đồ điện tử', name: 'Đồ điện tử', icon: <Plug className="w-6 h-6"/>, color: 'bg-indigo-50 text-indigo-600', desc: 'Máy tính, phụ kiện' },
  { id: 'Dụng cụ', name: 'Dụng cụ', icon: <Calculator className="w-6 h-6"/>, color: 'bg-teal-50 text-teal-600', desc: 'Thước, bút, Casio' },
  { id: 'Khác', name: 'Đồ khác', icon: <Shirt className="w-6 h-6"/>, color: 'bg-orange-50 text-orange-600', desc: 'Đồng phục, balo...' },
];

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [recentProducts, setRecentProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ users: 0, products: 0, transactions: 0 });

  useEffect(() => {
    fetchRecentProducts();
    const interval = setInterval(() => {
      setStats(prev => ({
        users: prev.users < 2500 ? prev.users + 50 : 2500,
        products: prev.products < 850 ? prev.products + 20 : 850,
        transactions: prev.transactions < 1200 ? prev.transactions + 30 : 1200
      }));
    }, 20);
    return () => clearInterval(interval);
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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      navigate(`/market?search=${encodeURIComponent(searchTerm.trim())}`);
    }
  };

  return (
    <div className="min-h-screen bg-white font-sans text-[#1a1a1a] selection:bg-[#00418E] selection:text-white">
      
      {/* ================= HERO SECTION (PREMIUM BK STYLE) ================= */}
      <div className="relative w-full h-[700px] flex items-center justify-center bg-[#00418E] overflow-hidden">
        {/* Background Image với hiệu ứng Parallax nhẹ */}
        <div className="absolute inset-0 bg-[url('https://hcmut.edu.vn/img/campus/campus-1.jpg')] bg-cover bg-center opacity-20 mix-blend-overlay scale-105 animate-pulse-slow"></div>
        
        {/* Decorative Gradients */}
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-gradient-to-b from-white/10 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-gradient-to-t from-blue-400/20 to-transparent rounded-full blur-3xl translate-y-1/3 -translate-x-1/4 pointer-events-none"></div>

        <div className="relative z-10 text-center px-4 w-full max-w-5xl -mt-10">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-6 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white text-xs font-bold uppercase tracking-widest mb-8 hover:bg-white/20 transition-all cursor-default shadow-lg">
            <GraduationCap className="w-4 h-4 text-yellow-400" />
            Cộng đồng sinh viên Bách Khoa TP.HCM
          </div>

          {/* Headline */}
          <h1 className="text-5xl md:text-7xl font-black text-white mb-8 leading-tight drop-shadow-2xl tracking-tight">
            Trao Đổi Đồ Cũ <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-200 via-white to-blue-200 animate-shine">Thông Minh & Tiết Kiệm</span>
          </h1>
          
          <p className="text-blue-100 text-lg md:text-xl mb-12 max-w-2xl mx-auto font-medium leading-relaxed opacity-90">
            Nền tảng mua bán giáo trình, thiết bị điện tử uy tín dành riêng cho BKers. 
            Kết nối trực tiếp, giao dịch an toàn tại trường.
          </p>

          {/* Search Bar - Glassmorphism */}
          <div className="max-w-2xl mx-auto relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-400 to-teal-400 rounded-full blur opacity-20 group-hover:opacity-40 transition duration-500"></div>
            <form onSubmit={handleSearch} className="relative flex items-center bg-white/95 backdrop-blur-xl rounded-full shadow-2xl p-2 transition-transform transform hover:scale-[1.02]">
              <input 
                type="text" 
                placeholder="Bạn đang tìm gì? (VD: Giải tích 1, Casio 580...)" 
                className="flex-1 bg-transparent border-none outline-none text-lg text-gray-800 placeholder:text-gray-400 px-6 h-14"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <button type="submit" className="h-12 bg-[#00418E] hover:bg-[#003370] text-white px-8 rounded-full font-bold text-sm transition-all flex items-center gap-2 shadow-lg active:scale-95">
                <Search className="w-4 h-4"/> Tìm kiếm
              </button>
            </form>
          </div>

          {/* Live Stats */}
          <div className="flex flex-wrap justify-center gap-10 md:gap-20 mt-20 text-white">
            {[
              { label: "Tin đã đăng", val: stats.products },
              { label: "Thành viên", val: stats.users },
              { label: "Lượt giao dịch", val: stats.transactions }
            ].map((stat, idx) => (
              <div key={idx} className="text-center group cursor-default">
                <p className="text-4xl md:text-5xl font-black group-hover:text-yellow-300 transition-colors duration-300">{stat.val}+</p>
                <p className="text-[10px] opacity-70 uppercase font-bold tracking-widest mt-2">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-20 space-y-32">
        
        {/* ================= 2. DANH MỤC (CLEAN GRID) ================= */}
        <div>
          <div className="flex justify-between items-end mb-10 border-b border-gray-100 pb-4">
            <div>
                <h2 className="text-3xl font-black text-[#00418E] mb-2 tracking-tight">Khám phá danh mục</h2>
                <p className="text-gray-500 text-sm">Tìm kiếm dễ dàng theo nhóm sản phẩm</p>
            </div>
            <button onClick={() => navigate('/market')} className="text-sm font-bold text-gray-500 hover:text-[#00418E] flex items-center transition-colors px-4 py-2 rounded-lg hover:bg-blue-50 group">
                Xem tất cả <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform"/>
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
            {CATEGORIES.map((cat) => (
              <div 
                key={cat.id} 
                onClick={() => navigate(`/market?cat=${cat.id}`)}
                className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all duration-300 cursor-pointer flex items-center gap-5 group"
              >
                <div className={`p-4 rounded-2xl ${cat.color} group-hover:scale-110 transition-transform shadow-inner`}>{cat.icon}</div>
                <div>
                  <h3 className="font-bold text-gray-900 group-hover:text-[#00418E] transition-colors text-lg">{cat.name}</h3>
                  <p className="text-xs text-gray-400 mt-1 font-medium">{cat.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ================= 3. AI BANNER (MODERN GRADIENT) ================= */}
        <div className="relative overflow-hidden rounded-[3rem] bg-[#00418E] shadow-2xl group transform hover:scale-[1.01] transition-transform duration-500">
          {/* Decorative background */}
          <div className="absolute top-0 right-0 w-[700px] h-[700px] bg-blue-500/20 rounded-full blur-[120px]"></div>
          <div className="absolute bottom-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>

          <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between p-12 md:p-20 gap-16">
            
            {/* Left Content */}
            <div className="max-w-xl text-white">
              <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-1.5 rounded-full text-xs font-bold mb-6 border border-white/20 shadow-lg">
                <Sparkles className="w-3 h-3 text-yellow-300" /> Powered by Gemini AI
              </div>
              <h2 className="text-4xl md:text-5xl font-black mb-6 leading-tight">
                Đăng tin siêu tốc <br/>
                với <span className="text-yellow-300 underline decoration-white/20 underline-offset-8">Trợ lý AI</span>
              </h2>
              <p className="text-blue-100 text-lg mb-10 leading-relaxed font-light">
                Bạn lười viết mô tả? Không biết bán giá bao nhiêu? <br/>
                Để AI của Chợ BK lo hết từ A đến Z cho bạn chỉ trong 30 giây.
              </p>
              <div className="flex flex-wrap gap-4">
                <button onClick={() => navigate('/post')} className="bg-white text-[#00418E] px-10 py-4 rounded-2xl font-black text-lg shadow-xl hover:shadow-2xl hover:bg-gray-50 transition-all active:scale-95 flex items-center gap-2">
                  <Sparkles size={20}/> Thử Ngay
                </button>
                <button onClick={() => navigate('/market')} className="px-8 py-4 rounded-2xl font-bold text-white border-2 border-white/20 hover:bg-white/10 transition-all">
                  Dạo chợ trước
                </button>
              </div>
            </div>

            {/* Right Content - TERMINAL MOCKUP REFINED */}
            <div className="w-full max-w-lg transform rotate-2 group-hover:rotate-0 transition-transform duration-700">
                <div className="bg-[#0f172a]/95 backdrop-blur-2xl rounded-2xl p-6 border border-white/10 shadow-2xl font-mono text-sm leading-relaxed relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>
                    <div className="flex gap-2 mb-6 opacity-80">
                        <div className="w-3 h-3 rounded-full bg-[#ff5f56]"></div>
                        <div className="w-3 h-3 rounded-full bg-[#ffbd2e]"></div>
                        <div className="w-3 h-3 rounded-full bg-[#27c93f]"></div>
                    </div>
                    
                    <div className="space-y-6 font-medium">
                        <div>
                            <p className="text-blue-400 flex items-center"><span className="mr-3 text-pink-500">$</span> user.input("Bán giáo trình giải tích 1 cũ")</p>
                            <div className="mt-2 pl-5 border-l-2 border-white/10 text-xs">
                                <p className="text-gray-500 mb-1">// AI đang phân tích...</p>
                                <p className="text-emerald-400">Generating smart title & description...</p>
                            </div>
                        </div>
                        
                        <div className="bg-white/5 rounded-lg p-4 border border-white/5">
                            <p className="text-yellow-300 font-bold mb-1">Tiêu đề gợi ý:</p>
                            <p className="text-gray-300 mb-3">"Giáo trình Giải tích 1 - ĐHQG HCM - Còn mới 95%"</p>
                            <p className="text-yellow-300 font-bold mb-1">Giá đề xuất:</p>
                            <p className="text-gray-300">35.000đ - 50.000đ</p>
                        </div>
                        
                        <div className="flex items-center gap-2 text-gray-500 animate-pulse">
                            <span className="text-blue-500">➜</span>
                            <span className="bg-blue-500 w-2 h-4 block"></span>
                        </div>
                    </div>
                </div>
            </div>

          </div>
        </div>

        {/* ================= 4. MỚI LÊN SÀN ================= */}
        <div>
          <div className="flex items-center gap-4 mb-10">
            <div className="p-3 bg-blue-50 rounded-2xl text-[#00418E] shadow-sm"><Zap className="w-8 h-8 fill-current"/></div>
            <div>
                <h2 className="text-3xl font-black text-gray-900 tracking-tight">Mới lên sàn</h2>
                <p className="text-gray-500 text-sm mt-1">Những món đồ vừa được đăng bán gần đây</p>
            </div>
          </div>
          
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {[1, 2, 3, 4].map(n => <ProductSkeleton key={n} />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {recentProducts.map(p => <ProductCard key={p.id} product={p} />)}
            </div>
          )}
          
          <div className="mt-16 text-center">
            <button onClick={() => navigate('/market')} className="px-12 py-4 bg-white border-2 border-gray-100 text-gray-600 rounded-full font-bold hover:border-[#00418E] hover:text-[#00418E] hover:shadow-xl transition-all transform hover:-translate-y-1">
              Xem tất cả sản phẩm
            </button>
          </div>
        </div>

        {/* ================= 5. FEATURES (MINIMALIST CARDS) ================= */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-gray-50 rounded-[2.5rem] p-10 text-center border border-transparent hover:border-blue-100 hover:bg-white hover:shadow-2xl transition-all group duration-500">
            <div className="w-24 h-24 bg-white text-[#00418E] rounded-full flex items-center justify-center mx-auto mb-8 shadow-md group-hover:scale-110 group-hover:bg-[#00418E] group-hover:text-white transition-all duration-500"><ShieldCheck className="w-10 h-10"/></div>
            <h3 className="text-xl font-bold mb-4 text-gray-900">An toàn tuyệt đối</h3>
            <p className="text-gray-500 leading-relaxed text-sm">Hệ thống xác thực sinh viên qua MSSV và Email Bách Khoa. Giảm thiểu rủi ro lừa đảo.</p>
          </div>
          <div className="bg-gray-50 rounded-[2.5rem] p-10 text-center border border-transparent hover:border-indigo-100 hover:bg-white hover:shadow-2xl transition-all group duration-500">
            <div className="w-24 h-24 bg-white text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-8 shadow-md group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-500"><Monitor className="w-10 h-10"/></div>
            <h3 className="text-xl font-bold mb-4 text-gray-900">Giao diện hiện đại</h3>
            <p className="text-gray-500 leading-relaxed text-sm">Trải nghiệm mượt mà trên mọi thiết bị. Tính năng Chat Realtime và thông báo tức thì.</p>
          </div>
          <div className="bg-gray-50 rounded-[2.5rem] p-10 text-center border border-transparent hover:border-teal-100 hover:bg-white hover:shadow-2xl transition-all group duration-500">
            <div className="w-24 h-24 bg-white text-teal-600 rounded-full flex items-center justify-center mx-auto mb-8 shadow-md group-hover:scale-110 group-hover:bg-teal-600 group-hover:text-white transition-all duration-500"><Users className="w-10 h-10"/></div>
            <h3 className="text-xl font-bold mb-4 text-gray-900">Cộng đồng lớn mạnh</h3>
            <p className="text-gray-500 leading-relaxed text-sm">Kết nối hàng chục ngàn sinh viên trong trường. Dễ dàng tìm được món đồ ưng ý.</p>
          </div>
        </div>

      </div>
    </div>
  );
};

export default HomePage;
