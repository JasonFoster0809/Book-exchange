import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, Sparkles, ArrowRight, Zap, ShieldCheck, Users, 
  BookOpen, Calculator, Shirt, Plug, ChevronDown, Terminal, Monitor
} from 'lucide-react';
import { supabase } from '../services/supabase';
import { Product } from '../types';
import ProductCard from '../components/ProductCard';
import ProductSkeleton from '../components/ProductSkeleton';

// Danh mục với Icon và màu sắc
const CATEGORIES = [
  { id: 'Giáo trình', name: 'Giáo trình', icon: <BookOpen className="w-6 h-6"/>, color: 'bg-blue-100 text-blue-600' },
  { id: 'Đồ điện tử', name: 'Đồ điện tử', icon: <Plug className="w-6 h-6"/>, color: 'bg-purple-100 text-purple-600' },
  { id: 'Dụng cụ học tập', name: 'Dụng cụ', icon: <Calculator className="w-6 h-6"/>, color: 'bg-green-100 text-green-600' },
  { id: 'Thời trang', name: 'Đồng phục', icon: <Shirt className="w-6 h-6"/>, color: 'bg-pink-100 text-pink-600' },
];

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [recentProducts, setRecentProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Stats Animation State
  const [stats, setStats] = useState({ users: 0, products: 0, transactions: 0 });

  useEffect(() => {
    fetchRecentProducts();
    // Hiệu ứng nhảy số
    let u = 0, p = 0, t = 0;
    const interval = setInterval(() => {
      if (u < 1500) u += 25;
      if (p < 500) p += 10;
      if (t < 1000) t += 20;
      setStats({ users: u, products: p, transactions: t });
      if (u >= 1500 && p >= 500 && t >= 1000) clearInterval(interval);
    }, 30);
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
    if (searchTerm.trim()) navigate(`/market?search=${encodeURIComponent(searchTerm)}`);
  };

  return (
    <div className="min-h-screen bg-white font-sans">
      
      {/* ================= HERO SECTION ================= */}
      <div className="relative w-full h-[650px] overflow-hidden flex items-center justify-center">
        {/* Background BK mờ */}
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: "url('https://upload.wikimedia.org/wikipedia/commons/thumb/e/e8/Hcmut_official.jpg/1200px-Hcmut_official.jpg')" }}></div>
        {/* Lớp phủ Gradient Xanh BK */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#034EA2]/90 via-[#2575fc]/80 to-white/5 backdrop-blur-[2px]"></div>

        <div className="relative z-10 text-center px-4 w-full max-w-5xl -mt-10">
          
          {/* Badge Cộng đồng */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white text-xs font-bold uppercase tracking-widest mb-6 shadow-lg animate-fadeIn">
            <Sparkles className="w-4 h-4 text-yellow-300" />
            Cộng đồng sinh viên Bách Khoa TP.HCM
          </div>

          {/* Tiêu đề lớn */}
          <h1 className="text-5xl md:text-7xl font-black text-white mb-6 leading-tight drop-shadow-xl animate-slideUp">
            Cũ người <span className="text-[#00B0F0]">Mới ta</span><br/>
            Tiết kiệm tối đa!
          </h1>
          
          <p className="text-white/90 text-lg md:text-xl mb-10 max-w-2xl mx-auto font-medium drop-shadow-md animate-slideUp delay-100">
            Sàn giao dịch đồ cũ an toàn, tiện lợi và thông minh dành riêng cho sinh viên Bách Khoa.
          </p>

          {/* Thanh tìm kiếm */}
          <div className="max-w-3xl mx-auto relative group animate-slideUp delay-200">
            <form onSubmit={handleSearch} className="relative">
              <input 
                type="text" 
                placeholder="Bạn đang tìm gì? (VD: Casio 580, Giáo trình...)" 
                className="w-full h-16 pl-8 pr-40 rounded-full border-4 border-white/20 bg-white shadow-2xl focus:border-[#00B0F0] outline-none text-lg text-gray-700 transition-all placeholder:text-gray-400"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <button type="submit" className="absolute right-2 top-2 h-12 bg-[#034EA2] text-white px-8 rounded-full font-bold text-sm hover:bg-[#003875] transition-all flex items-center shadow-lg active:scale-95">
                <Search className="w-4 h-4 mr-2"/> Tìm kiếm
              </button>
            </form>
          </div>

          {/* Thống kê (Live Stats) */}
          <div className="flex justify-center gap-10 md:gap-20 mt-16 text-white animate-fadeIn delay-300">
            <div className="text-center">
              <p className="text-3xl md:text-4xl font-black">{stats.products}+</p>
              <p className="text-[10px] md:text-xs opacity-80 uppercase font-bold tracking-widest mt-1">Tin đăng</p>
            </div>
            <div className="w-px bg-white/30 h-10 self-center"></div>
            <div className="text-center">
              <p className="text-3xl md:text-4xl font-black">{stats.users}+</p>
              <p className="text-[10px] md:text-xs opacity-80 uppercase font-bold tracking-widest mt-1">Thành viên</p>
            </div>
            <div className="w-px bg-white/30 h-10 self-center"></div>
            <div className="text-center">
              <p className="text-3xl md:text-4xl font-black">{stats.transactions}+</p>
              <p className="text-[10px] md:text-xs opacity-80 uppercase font-bold tracking-widest mt-1">Giao dịch</p>
            </div>
          </div>

          {/* Mũi tên chỉ xuống */}
          <div className="absolute -bottom-20 left-1/2 -translate-x-1/2 animate-bounce opacity-70">
            <ChevronDown className="w-8 h-8 text-white" />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-16">
        
        {/* ================= 2. DANH MỤC ================= */}
        <div className="mb-20">
          <div className="flex justify-between items-end mb-8">
            <h2 className="text-3xl font-black text-[#034EA2]">Danh mục phổ biến</h2>
            <button onClick={() => navigate('/market')} className="text-sm font-bold text-gray-500 hover:text-[#034EA2] flex items-center transition-colors">
              Xem tất cả <ArrowRight className="w-4 h-4 ml-1"/>
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {CATEGORIES.map((cat) => (
              <div 
                key={cat.id} 
                onClick={() => navigate(`/market?cat=${cat.id}`)}
                className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer flex items-center gap-4 group"
              >
                <div className={`p-4 rounded-2xl ${cat.color} group-hover:scale-110 transition-transform`}>{cat.icon}</div>
                <div>
                  <h3 className="font-bold text-gray-900 group-hover:text-[#034EA2] transition-colors">{cat.name}</h3>
                  <p className="text-xs text-gray-400 mt-1">100+ sản phẩm</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ================= 3. AI BANNER (MÀU TÍM) ================= */}
        <div className="mb-24 relative overflow-hidden rounded-[3rem] bg-gradient-to-r from-[#5B42F3] to-[#AF40FF] shadow-2xl group">
          
          {/* Background decoration */}
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>

          <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between p-10 md:p-16 gap-12">
            
            {/* Left Content */}
            <div className="max-w-xl text-white">
              <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-1.5 rounded-full text-xs font-bold mb-6 border border-white/20">
                <Sparkles className="w-3 h-3 text-yellow-300" /> Powered by Gemini AI
              </div>
              <h2 className="text-4xl md:text-5xl font-black mb-6 leading-tight">
                Đăng tin thông minh <br/>
                chỉ trong <span className="underline decoration-yellow-400 underline-offset-4">30 giây!</span>
              </h2>
              <p className="text-indigo-100 text-lg mb-8 leading-relaxed">
                Bạn lười viết mô tả? Không biết bán giá bao nhiêu? <br/>
                Để AI của chúng tôi lo hết từ A đến Z.
              </p>
              <div className="flex flex-wrap gap-4">
                <button onClick={() => navigate('/post')} className="bg-white text-[#5B42F3] px-8 py-4 rounded-xl font-black text-lg shadow-lg hover:shadow-xl hover:bg-gray-50 transition-all active:scale-95">
                  Thử Ngay
                </button>
                <button onClick={() => navigate('/market')} className="px-8 py-4 rounded-xl font-bold text-white border-2 border-white/30 hover:bg-white/10 transition-all">
                  Dạo chợ trước
                </button>
              </div>
            </div>

            {/* Right Content - Mockup Code Terminal */}
            <div className="w-full max-w-md transform rotate-3 hover:rotate-0 transition-transform duration-500">
                <div className="bg-[#1e1e1e]/90 backdrop-blur-xl rounded-2xl p-6 border border-white/10 shadow-2xl font-mono text-sm leading-relaxed">
                    {/* Traffic Lights */}
                    <div className="flex gap-2 mb-6">
                        <div className="w-3 h-3 rounded-full bg-[#ff5f56]"></div>
                        <div className="w-3 h-3 rounded-full bg-[#ffbd2e]"></div>
                        <div className="w-3 h-3 rounded-full bg-[#27c93f]"></div>
                    </div>
                    
                    {/* Code Content */}
                    <div className="space-y-4">
                        <div>
                            <p className="text-green-400 flex items-center"><span className="mr-2">$</span> ai_write("Máy tính cũ")</p>
                            <p className="text-gray-300 mt-2 pl-4 border-l-2 border-white/10">
                                Output: "Máy tính Casio 580VN X, ngoại hình 98%, phím nảy tanh tách, bao test..."
                            </p>
                        </div>
                        <div>
                            <p className="text-green-400 flex items-center"><span className="mr-2">$</span> estimate_price("Good")</p>
                            <p className="text-gray-300 mt-2 pl-4 border-l-2 border-white/10">
                                Output: "Giá gợi ý: 350.000đ - 400.000đ"
                            </p>
                        </div>
                        <div className="animate-pulse text-green-400">_</div>
                    </div>
                </div>
            </div>

          </div>
        </div>

        {/* ================= 4. MỚI LÊN SÀN ================= */}
        <div>
          <div className="flex items-center gap-3 mb-8">
            <div className="p-3 bg-orange-100 rounded-xl text-orange-600"><Zap className="w-6 h-6 fill-current"/></div>
            <h2 className="text-3xl font-black text-gray-900">Mới lên sàn</h2>
          </div>
          
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map(n => <ProductSkeleton key={n} />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {recentProducts.map(p => <ProductCard key={p.id} product={p} />)}
            </div>
          )}
          
          <div className="mt-12 text-center">
            <button onClick={() => navigate('/market')} className="px-10 py-4 bg-white border-2 border-gray-200 text-gray-700 rounded-full font-bold hover:bg-gray-50 hover:border-gray-300 transition-all">
              Xem tất cả sản phẩm
            </button>
          </div>
        </div>

        {/* ================= 5. FEATURES ================= */}
        <div className="mt-32 grid grid-cols-1 md:grid-cols-3 gap-12 text-center px-4">
          <div>
            <div className="w-20 h-20 bg-blue-50 text-[#034EA2] rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-sm"><ShieldCheck className="w-10 h-10"/></div>
            <h3 className="text-xl font-bold mb-3 text-gray-900">An toàn tuyệt đối</h3>
            <p className="text-gray-500 leading-relaxed">Xác thực sinh viên qua MSSV và Email Bách Khoa. Hạn chế tối đa lừa đảo và bom hàng.</p>
          </div>
          <div>
            <div className="w-20 h-20 bg-purple-50 text-purple-600 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-sm"><Monitor className="w-10 h-10"/></div>
            <h3 className="text-xl font-bold mb-3 text-gray-900">Giao diện hiện đại</h3>
            <p className="text-gray-500 leading-relaxed">Trải nghiệm mượt mà trên cả điện thoại và máy tính. Đăng tin siêu tốc với hỗ trợ của AI.</p>
          </div>
          <div>
            <div className="w-20 h-20 bg-green-50 text-green-600 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-sm"><Users className="w-10 h-10"/></div>
            <h3 className="text-xl font-bold mb-3 text-gray-900">Cộng đồng lớn mạnh</h3>
            <p className="text-gray-500 leading-relaxed">Kết nối hơn 20.000 sinh viên trong trường. Tìm đồ dễ dàng, mua bán nhanh gọn lẹ.</p>
          </div>
        </div>

      </div>
    </div>
  );
};

export default HomePage;