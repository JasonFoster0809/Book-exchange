import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, Sparkles, ArrowRight, Zap, ShieldCheck, Users, 
  BookOpen, Calculator, Shirt, Plug, ChevronDown, Monitor, 
  Code, Cpu, GraduationCap, Terminal
} from 'lucide-react';
import { supabase } from '../services/supabase';
import { Product } from '../types';
import ProductCard from '../components/ProductCard';
import ProductSkeleton from '../components/ProductSkeleton';

// Danh mục chính
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
  
  // State cho hiệu ứng nhảy số
  const [stats, setStats] = useState({ users: 0, products: 0, transactions: 0 });

  // Load dữ liệu và chạy hiệu ứng
  useEffect(() => {
    fetchRecentProducts();
    
    // Hiệu ứng tăng số (Counter Animation)
    let u = 0, p = 0, t = 0;
    const interval = setInterval(() => {
      if (u < 2500) u += 50;
      if (p < 850) p += 20;
      if (t < 1200) t += 30;
      setStats({ users: u, products: p, transactions: t });
      
      if (u >= 2500 && p >= 850 && t >= 1200) clearInterval(interval);
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
      // Fix lỗi tìm kiếm bằng cách mã hóa URL
      navigate(`/market?search=${encodeURIComponent(searchTerm.trim())}`);
    }
  };

  return (
    <div className="min-h-screen bg-white font-sans text-[#1a1a1a]">
      
      {/* ================= HERO SECTION (BK STYLE) ================= */}
      <div className="relative w-full h-[680px] overflow-hidden flex items-center justify-center bg-[#00418E]">
        {/* Background Image mờ */}
        <div className="absolute inset-0 bg-[url('https://hcmut.edu.vn/img/campus/campus-1.jpg')] bg-cover bg-center opacity-20 mix-blend-overlay"></div>
        
        {/* Các khối trang trí (Blobs) */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-400/20 rounded-full blur-3xl translate-y-1/3 -translate-x-1/4"></div>

        <div className="relative z-10 text-center px-4 w-full max-w-5xl -mt-10">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white text-xs font-bold uppercase tracking-widest mb-8 animate-fadeIn hover:bg-white/20 transition-all cursor-default">
            <GraduationCap className="w-4 h-4 text-yellow-400" />
            Cộng đồng sinh viên Bách Khoa TP.HCM
          </div>

          {/* Headline */}
          <h1 className="text-5xl md:text-7xl font-black text-white mb-6 leading-tight drop-shadow-2xl animate-slideUp">
            Trao Đổi Đồ Cũ <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-200 via-white to-blue-200">Thông Minh & Tiết Kiệm</span>
          </h1>
          
          <p className="text-blue-100 text-lg md:text-xl mb-12 max-w-2xl mx-auto font-medium animate-slideUp delay-100 leading-relaxed">
            Nền tảng mua bán giáo trình, thiết bị điện tử uy tín dành riêng cho BKers. 
            Kết nối trực tiếp, giao dịch an toàn tại trường.
          </p>

          {/* Search Bar */}
          <div className="max-w-2xl mx-auto relative group animate-slideUp delay-200">
            <form onSubmit={handleSearch} className="relative flex items-center">
              <input 
                type="text" 
                placeholder="Bạn đang tìm gì? (VD: Giải tích 1, Casio 580...)" 
                className="w-full h-16 pl-8 pr-40 rounded-full border-4 border-white/10 bg-white/95 backdrop-blur-xl shadow-2xl focus:border-blue-300 outline-none text-lg text-gray-800 placeholder:text-gray-400 transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <button type="submit" className="absolute right-2 h-12 bg-[#00418E] hover:bg-[#003370] text-white px-8 rounded-full font-bold text-sm transition-all flex items-center gap-2 shadow-lg active:scale-95">
                <Search className="w-4 h-4"/> Tìm kiếm
              </button>
            </form>
          </div>

          {/* Live Stats */}
          <div className="flex flex-wrap justify-center gap-8 md:gap-16 mt-20 text-white animate-fadeIn delay-300">
            <div className="text-center group cursor-default">
                <p className="text-4xl font-black group-hover:text-yellow-300 transition-colors">{stats.products}+</p>
                <p className="text-[10px] opacity-70 uppercase font-bold tracking-widest mt-1">Tin đã đăng</p>
            </div>
            <div className="w-px bg-white/20 h-12 self-center hidden md:block"></div>
            <div className="text-center group cursor-default">
                <p className="text-4xl font-black group-hover:text-yellow-300 transition-colors">{stats.users}+</p>
                <p className="text-[10px] opacity-70 uppercase font-bold tracking-widest mt-1">Thành viên</p>
            </div>
            <div className="w-px bg-white/20 h-12 self-center hidden md:block"></div>
            <div className="text-center group cursor-default">
                <p className="text-4xl font-black group-hover:text-yellow-300 transition-colors">{stats.transactions}+</p>
                <p className="text-[10px] opacity-70 uppercase font-bold tracking-widest mt-1">Lượt giao dịch</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-16">
        
        {/* ================= 2. DANH MỤC ================= */}
        <div className="mb-24">
          <div className="flex justify-between items-end mb-10">
            <div>
                <h2 className="text-3xl font-black text-[#00418E] mb-2">Khám phá danh mục</h2>
                <p className="text-gray-500 text-sm">Tìm kiếm dễ dàng theo nhóm sản phẩm</p>
            </div>
            <button onClick={() => navigate('/market')} className="text-sm font-bold text-gray-500 hover:text-[#00418E] flex items-center transition-colors px-4 py-2 rounded-lg hover:bg-blue-50">
                Xem tất cả <ArrowRight className="w-4 h-4 ml-1"/>
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
            {CATEGORIES.map((cat) => (
              <div 
                key={cat.id} 
                onClick={() => navigate(`/market?cat=${cat.id}`)}
                className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all cursor-pointer flex items-center gap-5 group duration-300"
              >
                <div className={`p-4 rounded-2xl ${cat.color} group-hover:scale-110 transition-transform shadow-sm`}>{cat.icon}</div>
                <div>
                  <h3 className="font-bold text-gray-900 group-hover:text-[#00418E] transition-colors text-lg">{cat.name}</h3>
                  <p className="text-xs text-gray-400 mt-1 font-medium">{cat.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ================= 3. AI BANNER (TÍNH NĂNG XỊN) ================= */}
        <div className="mb-24 relative overflow-hidden rounded-[3rem] bg-[#00418E] shadow-2xl group">
          {/* Decorative background */}
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-500/20 rounded-full blur-[120px]"></div>
          <div className="absolute bottom-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>

          <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between p-12 md:p-20 gap-16">
            
            {/* Left Content */}
            <div className="max-w-xl text-white">
              <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-1.5 rounded-full text-xs font-bold mb-6 border border-white/20">
                <Sparkles className="w-3 h-3 text-yellow-300" /> Powered by Gemini AI
              </div>
              <h2 className="text-4xl md:text-5xl font-black mb-6 leading-tight">
                Đăng tin thông minh <br/>
                chỉ trong <span className="text-yellow-300 underline decoration-white/20 underline-offset-8">30 giây!</span>
              </h2>
              <p className="text-blue-100 text-lg mb-10 leading-relaxed font-light">
                Bạn lười viết mô tả? Không biết bán giá bao nhiêu? <br/>
                Để AI của Chợ BK lo hết từ A đến Z cho bạn.
              </p>
              <div className="flex flex-wrap gap-4">
                <button onClick={() => navigate('/post')} className="bg-white text-[#00418E] px-10 py-4 rounded-xl font-black text-lg shadow-xl hover:shadow-2xl hover:scale-105 transition-all active:scale-95 flex items-center gap-2">
                  <Sparkles size={20}/> Thử Ngay
                </button>
                <button onClick={() => navigate('/market')} className="px-8 py-4 rounded-xl font-bold text-white border-2 border-white/20 hover:bg-white/10 transition-all">
                  Dạo chợ
                </button>
              </div>
            </div>

            {/* Right Content - TERMINAL MOCKUP (PHẦN NÀY LÀM FILE DÀI RA NHƯNG ĐẸP) */}
            <div className="w-full max-w-lg transform rotate-3 hover:rotate-0 transition-transform duration-700">
                <div className="bg-[#0f172a]/95 backdrop-blur-xl rounded-2xl p-6 border border-white/10 shadow-2xl font-mono text-sm leading-relaxed relative overflow-hidden">
                    {/* Header Terminal */}
                    <div className="flex items-center justify-between mb-6 border-b border-white/10 pb-4">
                        <div className="flex gap-2">
                            <div className="w-3 h-3 rounded-full bg-[#ff5f56]"></div>
                            <div className="w-3 h-3 rounded-full bg-[#ffbd2e]"></div>
                            <div className="w-3 h-3 rounded-full bg-[#27c93f]"></div>
                        </div>
                        <div className="text-xs text-gray-500 font-bold">gemini-ai-assistant</div>
                    </div>
                    
                    {/* Code Content */}
                    <div className="space-y-5">
                        <div>
                            <p className="text-blue-400 flex items-center font-bold"><span className="mr-2 text-pink-500">$</span> user.input("Bán giáo trình giải tích 1 cũ")</p>
                            <div className="mt-2 pl-4 border-l-2 border-blue-500/30">
                                <p className="text-gray-400 text-xs mb-1">// AI Processing...</p>
                                <p className="text-green-300">Generating title & description...</p>
                            </div>
                        </div>
                        
                        <div>
                            <p className="text-blue-400 flex items-center font-bold"><span className="mr-2 text-pink-500">$</span> ai.output()</p>
                            <div className="bg-black/50 rounded-lg p-4 mt-2 border border-white/5">
                                <p className="text-yellow-300 font-bold">Tiêu đề:</p>
                                <p className="text-gray-300 mb-2">"Giáo trình Giải tích 1 - ĐHQG HCM - Còn mới 95%"</p>
                                <p className="text-yellow-300 font-bold">Gợi ý giá:</p>
                                <p className="text-gray-300">35.000đ - 50.000đ</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 text-gray-500">
                            <span className="text-blue-500">➜</span>
                            <span className="animate-pulse bg-blue-500 w-2 h-4 block"></span>
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
                <h2 className="text-3xl font-black text-gray-900">Mới lên sàn</h2>
                <p className="text-gray-500 text-sm mt-1">Những món đồ vừa được đăng bán gần đây</p>
            </div>
          </div>
          
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map(n => <ProductSkeleton key={n} />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {recentProducts.map(p => <ProductCard key={p.id} product={p} />)}
            </div>
          )}
          
          <div className="mt-16 text-center">
            <button onClick={() => navigate('/market')} className="px-12 py-4 bg-white border-2 border-gray-100 text-gray-600 rounded-full font-bold hover:border-[#00418E] hover:text-[#00418E] hover:shadow-lg transition-all transform hover:-translate-y-1">
              Xem tất cả sản phẩm
            </button>
          </div>
        </div>

        {/* ================= 5. TẠI SAO CHỌN BK MARKET ================= */}
        <div className="mt-32 grid grid-cols-1 md:grid-cols-3 gap-10 px-4">
          <div className="bg-gray-50 rounded-[2rem] p-8 text-center border border-gray-100 hover:bg-white hover:shadow-xl transition-all group">
            <div className="w-24 h-24 bg-white text-[#00418E] rounded-full flex items-center justify-center mx-auto mb-6 shadow-md group-hover:scale-110 transition-transform"><ShieldCheck className="w-10 h-10"/></div>
            <h3 className="text-xl font-bold mb-3 text-gray-900">An toàn tuyệt đối</h3>
            <p className="text-gray-500 leading-relaxed text-sm">Hệ thống xác thực sinh viên qua MSSV và Email Bách Khoa. Giảm thiểu rủi ro lừa đảo.</p>
          </div>
          <div className="bg-gray-50 rounded-[2rem] p-8 text-center border border-gray-100 hover:bg-white hover:shadow-xl transition-all group">
            <div className="w-24 h-24 bg-white text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-md group-hover:scale-110 transition-transform"><Monitor className="w-10 h-10"/></div>
            <h3 className="text-xl font-bold mb-3 text-gray-900">Giao diện hiện đại</h3>
            <p className="text-gray-500 leading-relaxed text-sm">Trải nghiệm mượt mà trên mọi thiết bị. Tính năng Chat Realtime và thông báo tức thì.</p>
          </div>
          <div className="bg-gray-50 rounded-[2rem] p-8 text-center border border-gray-100 hover:bg-white hover:shadow-xl transition-all group">
            <div className="w-24 h-24 bg-white text-teal-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-md group-hover:scale-110 transition-transform"><Users className="w-10 h-10"/></div>
            <h3 className="text-xl font-bold mb-3 text-gray-900">Cộng đồng lớn mạnh</h3>
            <p className="text-gray-500 leading-relaxed text-sm">Kết nối hàng chục ngàn sinh viên trong trường. Dễ dàng tìm được món đồ ưng ý.</p>
          </div>
        </div>

      </div>
    </div>
  );
};

export default HomePage;
