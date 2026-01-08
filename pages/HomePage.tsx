import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Search, ArrowRight, Zap, Users, BookOpen, Calculator, Shirt,
  Monitor, Grid, Flame, Gift, Eye, ShoppingBag, PlusCircle, Heart,
  Package, ChevronRight, Sparkles, Clock, Smile, Rocket, PlayCircle,
  Ghost, WifiOff, MoreHorizontal, Smartphone, MapPin, TrendingUp,
  Filter, ShieldCheck, Star
} from "lucide-react";
import { supabase } from "../services/supabase";
import { Product, ProductCategory, ProductCondition, ProductStatus } from "../types";

// --- CONFIGURATION ---
const CATEGORIES = [
  { id: "all", label: "Khám phá", icon: <Grid size={18} /> },
  { id: ProductCategory.TEXTBOOK, label: "Giáo trình", icon: <BookOpen size={18} /> },
  { id: ProductCategory.ELECTRONICS, label: "Công nghệ", icon: <Monitor size={18} /> },
  { id: ProductCategory.SUPPLIES, label: "Dụng cụ", icon: <Calculator size={18} /> },
  { id: ProductCategory.CLOTHING, label: "Thời trang", icon: <Shirt size={18} /> },
  { id: ProductCategory.OTHER, label: "Khác", icon: <MoreHorizontal size={18} /> },
];

enum SortOption {
  NEWEST = "newest",
  PRICE_ASC = "price_asc",
  PRICE_DESC = "price_desc",
  MOST_VIEWED = "most_viewed",
}

interface FilterState {
  category: string | "all";
  sort: SortOption;
  search: string;
}

// --- VISUAL ENGINE ---
const VisualEngine = () => (
  <style>{`
    :root {
      --primary: #00418E;
      --secondary: #00B0F0;
      --accent: #7C3AED;
    }
    body { background-color: #F8FAFC; color: #0F172A; font-family: 'Inter', sans-serif; overflow-x: hidden; }
    
    /* Scrollbar */
    ::-webkit-scrollbar { width: 6px; height: 6px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: #CBD5E1; border-radius: 10px; }
    ::-webkit-scrollbar-thumb:hover { background: var(--primary); }

    /* Animations */
    @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-15px); } }
    @keyframes blob { 
      0% { transform: translate(0px, 0px) scale(1); } 
      33% { transform: translate(30px, -50px) scale(1.1); } 
      66% { transform: translate(-20px, 20px) scale(0.9); } 
      100% { transform: translate(0px, 0px) scale(1); } 
    }
    @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
    @keyframes fadeInUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes textGradient { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }

    .animate-float { animation: float 6s ease-in-out infinite; }
    .animate-blob { animation: blob 10s infinite; }
    .animate-enter { animation: fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; opacity: 0; }
    .animate-text-gradient { background-size: 200% auto; animation: textGradient 4s linear infinite; }
    
    /* Stagger Delays */
    .delay-100 { animation-delay: 100ms; }
    .delay-200 { animation-delay: 200ms; }
    .delay-300 { animation-delay: 300ms; }

    /* Glassmorphism */
    .glass-panel {
      background: rgba(255, 255, 255, 0.65);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid rgba(255, 255, 255, 0.5);
      box-shadow: 0 8px 32px 0 rgba(0, 65, 142, 0.05);
    }
    .glass-card {
      background: rgba(255, 255, 255, 0.8);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.6);
      transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    }
    .glass-card:hover {
      transform: translateY(-8px) scale(1.01);
      box-shadow: 0 20px 40px -10px rgba(0, 65, 142, 0.15);
      border-color: var(--secondary);
      background: white;
    }

    /* Skeleton */
    .skeleton-shimmer {
      background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
    }
  `}</style>
);

const AnimatedBackground = () => (
  <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
    <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-blue-50/50 via-white to-slate-50"></div>
    <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-400/20 rounded-full mix-blend-multiply filter blur-[120px] animate-blob"></div>
    <div className="absolute top-[20%] right-[-10%] w-[40%] h-[40%] bg-cyan-400/20 rounded-full mix-blend-multiply filter blur-[120px] animate-blob animation-delay-2000"></div>
    <div className="absolute bottom-[-10%] left-[20%] w-[50%] h-[50%] bg-purple-400/20 rounded-full mix-blend-multiply filter blur-[120px] animate-blob animation-delay-4000"></div>
  </div>
);

// --- UTILS ---
const Utils = {
  formatCurrency: (amount: number) => new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(amount),
  timeAgo: (date: string) => {
    if (!date) return "Vừa xong";
    const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
    if (seconds > 86400) return Math.floor(seconds / 86400) + " ngày trước";
    if (seconds > 3600) return Math.floor(seconds / 3600) + " giờ trước";
    if (seconds > 60) return Math.floor(seconds / 60) + " phút trước";
    return "Vừa xong";
  }
};

// --- COMPONENTS ---

const ProductCard: React.FC<{ product: Product }> = ({ product }) => {
  const navigate = useNavigate();
  const [loaded, setLoaded] = useState(false);
  const image = product.images && product.images.length > 0 ? product.images[0] : "https://placehold.co/400x300?text=No+Image";

  return (
    <div onClick={() => navigate(`/product/${product.id}`)} className="glass-card group relative flex h-full cursor-pointer flex-col overflow-hidden rounded-[1.5rem]">
      {/* Image Container */}
      <div className="relative aspect-4/3 overflow-hidden bg-slate-100">
        {!loaded && <div className="skeleton-shimmer absolute inset-0" />}
        <img
          src={image}
          alt={product.title}
          className={`h-full w-full object-cover transition-all duration-700 group-hover:scale-110 ${loaded ? 'opacity-100' : 'opacity-0'}`}
          onLoad={() => setLoaded(true)}
        />
        
        {/* Overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"></div>
        
        {/* Tags */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
          {product.price === 0 && (
            <span className="flex items-center gap-1 rounded-full bg-red-500/90 backdrop-blur-sm px-2.5 py-1 text-[10px] font-bold text-white shadow-lg border border-red-400">
              <Gift size={10} /> TẶNG
            </span>
          )}
          {product.condition === ProductCondition.NEW && (
            <span className="flex items-center gap-1 rounded-full bg-emerald-500/90 backdrop-blur-sm px-2.5 py-1 text-[10px] font-bold text-white shadow-lg border border-emerald-400">
              <Sparkles size={10} /> MỚI 100%
            </span>
          )}
        </div>

        {/* Action Button */}
        <button className="absolute bottom-3 right-3 translate-y-12 rounded-full bg-white p-3 text-[#00418E] shadow-xl transition-all duration-300 hover:bg-[#00418E] hover:text-white group-hover:translate-y-0">
          <ArrowRight size={18} />
        </button>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-5">
        <div className="mb-2 flex items-center justify-between">
          <span className="rounded-lg bg-blue-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[#00418E] group-hover:bg-[#00418E] group-hover:text-white transition-colors">
            {product.category}
          </span>
          <span className="flex items-center gap-1 text-[10px] text-slate-400 font-medium">
            <Clock size={10} /> {Utils.timeAgo(product.postedAt || product.created_at || '')}
          </span>
        </div>
        
        <h3 className="mb-2 line-clamp-2 text-sm font-bold text-slate-800 leading-relaxed group-hover:text-[#00418E] transition-colors">
          {product.title}
        </h3>
        
        <div className="mt-auto border-t border-slate-100 pt-3 flex items-center justify-between">
          <div>
            <span className="block text-lg font-black tracking-tight text-slate-900 group-hover:text-[#00418E] transition-colors">
              {product.price === 0 ? "0đ" : Utils.formatCurrency(product.price)}
            </span>
            {product.price === 0 && <span className="text-[10px] text-green-600 font-bold">Miễn phí</span>}
          </div>
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-lg">
            <Eye size={14} /> {product.view_count || 0}
          </div>
        </div>
      </div>
    </div>
  );
};

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<FilterState>({ category: "all", sort: SortOption.NEWEST, search: "" });
  const { products, loading, error, refetch } = useProducts(filter);

  return (
    <div className="relative min-h-screen">
      <VisualEngine />
      <AnimatedBackground />

      {/* --- HERO SECTION --- */}
      <section className="relative px-4 pt-32 pb-20 overflow-hidden">
        {/* Decorative Icons */}
        <div className="absolute inset-0 pointer-events-none z-0">
          <div className="animate-float absolute top-20 left-[10%] text-blue-500/10"><BookOpen size={80} /></div>
          <div className="animate-float absolute top-40 right-[15%] text-cyan-500/10 delay-200"><Monitor size={100} /></div>
          <div className="animate-float absolute bottom-20 left-[20%] text-purple-500/10 delay-500"><Rocket size={60} /></div>
        </div>

        <div className="relative z-10 mx-auto max-w-5xl text-center">
          <div className="animate-enter inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white/60 backdrop-blur-md px-4 py-1.5 shadow-sm mb-8">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            <span className="text-xs font-bold tracking-widest text-slate-600 uppercase">Sàn giao dịch SV Bách Khoa</span>
          </div>
          
          <h1 className="animate-enter delay-100 mb-6 text-5xl font-black tracking-tight text-slate-900 md:text-7xl drop-shadow-sm">
            Trao đổi đồ cũ <br />
            <span className="animate-text-gradient bg-gradient-to-r from-[#00418E] via-[#00B0F0] to-[#7C3AED] bg-clip-text text-transparent">
              Thông minh & Tiết kiệm
            </span>
          </h1>

          <p className="animate-enter delay-200 mx-auto mb-10 max-w-2xl text-lg font-medium text-slate-500 md:text-xl leading-relaxed">
            Tìm giáo trình, laptop, và dụng cụ học tập giá rẻ ngay tại trường. <br className="hidden md:block"/>
            Kết nối trực tiếp, giao dịch an toàn.
          </p>

          {/* SEARCH BAR */}
          <div className="animate-enter delay-300 relative mx-auto w-full max-w-2xl mb-16 group">
            <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-blue-400 to-cyan-400 opacity-30 blur-lg transition duration-500 group-hover:opacity-60"></div>
            <form 
              onSubmit={(e) => { e.preventDefault(); const val = (e.target as any)[0].value; if(val) navigate(`/market?search=${encodeURIComponent(val)}`); }}
              className="relative flex items-center rounded-full border border-white/80 bg-white/90 p-2 shadow-xl backdrop-blur-xl transition-transform hover:scale-[1.01]"
            >
              <Search className="ml-4 text-slate-400 group-focus-within:text-[#00418E]" size={22} />
              <input
                placeholder="Bạn đang tìm gì? (VD: Giải tích 1, Casio 580...)"
                className="h-12 w-full border-none bg-transparent px-4 text-base font-bold text-slate-800 placeholder-slate-400 outline-none"
              />
              <button className="flex h-12 w-32 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#00418E] to-[#0065D1] px-6 text-sm font-bold text-white shadow-lg transition-all hover:shadow-blue-500/30 active:scale-95">
                Tìm kiếm
              </button>
            </form>
          </div>

          {/* QUICK ACTIONS */}
          <div className="animate-enter delay-300 grid grid-cols-2 gap-4 px-4 md:grid-cols-4 max-w-4xl mx-auto">
            {[
              { title: "Dạo Chợ", desc: "Săn deal hời", icon: <ShoppingBag size={24} />, link: "/market", color: "text-cyan-600", bg: "bg-cyan-50" },
              { title: "Đăng Tin", desc: "Bán nhanh gọn", icon: <PlusCircle size={24} />, link: "/post-item", color: "text-indigo-600", bg: "bg-indigo-50" },
              { title: "Đã Lưu", desc: "Món yêu thích", icon: <Heart size={24} />, link: "/saved", color: "text-pink-600", bg: "bg-pink-50" },
              { title: "Quản Lý", desc: "Tin của tôi", icon: <Package size={24} />, link: "/my-items", color: "text-orange-600", bg: "bg-orange-50" },
            ].map((item, i) => (
              <Link to={item.link} key={i} className="glass-card group flex cursor-pointer flex-col items-center justify-center gap-3 rounded-3xl p-6 text-center hover:border-blue-200">
                <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${item.bg} ${item.color} shadow-sm transition-transform group-hover:rotate-12 group-hover:scale-110`}>
                  {item.icon}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">{item.title}</h3>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-1">{item.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* --- CATEGORY NAV --- */}
      <div className="sticky top-0 z-40 border-y border-white/30 bg-white/80 py-4 shadow-sm backdrop-blur-xl transition-all">
        <div className="mx-auto max-w-7xl overflow-x-auto px-4 hide-scrollbar">
          <div className="flex min-w-max justify-center gap-3">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setFilter({ ...filter, category: cat.id })}
                className={`flex items-center gap-2 rounded-full border px-6 py-2.5 text-sm font-bold transition-all active:scale-95 ${
                  filter.category === cat.id
                    ? "border-[#00418E] bg-[#00418E] text-white shadow-lg shadow-blue-500/20"
                    : "border-transparent bg-white/50 text-slate-600 hover:bg-white hover:text-[#00418E] hover:shadow-md"
                }`}
              >
                {cat.icon}
                <span>{cat.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* --- PRODUCTS SECTION --- */}
      <section className="mx-auto max-w-7xl px-4 py-16 min-h-[800px]">
        <div className="mb-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-center md:text-left">
            <h2 className="text-3xl font-black text-slate-900 flex items-center justify-center md:justify-start gap-3">
              <div className="p-2 bg-orange-100 rounded-xl text-orange-600"><TrendingUp size={24} /></div>
              {filter.category === 'all' ? 'Mới lên sàn' : 'Kết quả lọc'}
            </h2>
            <p className="text-slate-500 font-medium mt-2 ml-1">
              {loading ? "Đang tải dữ liệu..." : `Tìm thấy ${products.length} tin đăng phù hợp`}
            </p>
          </div>
          
          <div className="flex items-center gap-2 bg-white p-1 rounded-2xl shadow-sm border border-slate-200">
            {[
              { id: SortOption.NEWEST, label: "Mới nhất" },
              { id: SortOption.PRICE_ASC, label: "Giá rẻ" },
              { id: SortOption.MOST_VIEWED, label: "Phổ biến" }
            ].map(opt => (
              <button
                key={opt.id}
                onClick={() => setFilter({...filter, sort: opt.id})}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${filter.sort === opt.id ? 'bg-slate-800 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {loading ? [...Array(8)].map((_, i) => (
            <div key={i} className="h-[360px] rounded-[1.5rem] bg-white p-4 shadow-sm border border-slate-100">
              <div className="skeleton-shimmer h-[200px] w-full rounded-2xl mb-4" />
              <div className="skeleton-shimmer h-4 w-3/4 rounded mb-2" />
              <div className="skeleton-shimmer h-4 w-1/2 rounded" />
            </div>
          )) : error ? (
            <div className="col-span-full py-20 text-center glass-panel rounded-[2rem]">
              <WifiOff size={48} className="mx-auto text-red-400 mb-4" />
              <h3 className="text-xl font-bold text-slate-800">Mất kết nối</h3>
              <button onClick={refetch} className="mt-4 px-6 py-2 bg-slate-800 text-white rounded-xl font-bold hover:scale-105 transition-transform">Thử lại</button>
            </div>
          ) : products.length > 0 ? (
            products.map(p => (
              <div key={p.id} className="animate-enter">
                <ProductCard product={p} />
              </div>
            ))
          ) : (
            <div className="col-span-full py-24 text-center border-2 border-dashed border-slate-200 rounded-[3rem] bg-slate-50/50">
              <Ghost size={64} className="mx-auto text-slate-300 mb-6" />
              <h3 className="text-2xl font-black text-slate-800">Chưa có tin nào</h3>
              <p className="text-slate-500 mb-8">Hãy là người đầu tiên đăng bán!</p>
              <Link to="/post-item" className="px-8 py-3 bg-[#00418E] text-white rounded-2xl font-bold shadow-lg hover:shadow-blue-500/30 transition-all">Đăng tin ngay</Link>
            </div>
          )}
        </div>

        {products.length > 0 && !loading && (
          <div className="mt-20 text-center">
            <Link to="/market" className="group inline-flex items-center gap-3 rounded-full border-2 border-slate-200 bg-white px-8 py-3 text-sm font-bold text-slate-700 transition-all hover:border-[#00418E] hover:text-[#00418E]">
              Xem tất cả tin đăng <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        )}
      </section>

      {/* --- TRUST BADGES --- */}
      <section className="border-y border-white/40 bg-white/40 backdrop-blur-sm py-16 mb-20">
        <div className="mx-auto max-w-7xl px-4 grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { label: "Xác thực sinh viên", icon: <ShieldCheck />, color: "text-blue-600" },
            { label: "Giao dịch an toàn", icon: <Package />, color: "text-green-600" },
            { label: "Cộng đồng lớn mạnh", icon: <Users />, color: "text-purple-600" },
            { label: "Hỗ trợ 24/7", icon: <Smile />, color: "text-orange-600" },
          ].map((item, i) => (
            <div key={i} className="flex flex-col items-center text-center gap-3">
              <div className={`p-4 rounded-2xl bg-white shadow-sm ${item.color}`}>{item.icon}</div>
              <span className="font-bold text-slate-700 text-sm uppercase tracking-wide">{item.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* --- AI BANNER --- */}
      <section className="mx-auto max-w-7xl px-4 mb-24">
        <div className="relative overflow-hidden rounded-[3rem] bg-[#0F172A] p-12 text-white shadow-2xl group">
          <div className="absolute top-0 right-0 -mt-20 -mr-20 h-[600px] w-[600px] rounded-full bg-[#00418E]/30 blur-[100px] transition-all duration-1000 group-hover:bg-[#00B0F0]/20"></div>
          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-wider backdrop-blur">
                <Zap size={14} className="text-yellow-400 fill-yellow-400" /> AI Technology
              </div>
              <h2 className="text-4xl md:text-6xl font-black leading-tight">
                Đăng tin <br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400 animate-pulse">Siêu Tốc Độ</span>
              </h2>
              <p className="text-slate-400 text-lg max-w-md">Không cần nhập liệu. AI tự động phân tích ảnh, điền giá và mô tả chỉ trong 3 giây.</p>
              <div className="flex gap-4">
                <button onClick={() => navigate('/post-item')} className="px-8 py-4 bg-white text-slate-900 rounded-2xl font-bold shadow-lg hover:scale-105 transition-transform flex items-center gap-2">
                  <Rocket size={20} className="text-blue-600" /> Thử ngay
                </button>
                <button className="px-8 py-4 bg-white/10 text-white rounded-2xl font-bold hover:bg-white/20 transition-colors">
                  Xem Demo
                </button>
              </div>
            </div>
            {/* AI Visual */}
            <div className="hidden lg:block relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-3xl blur-2xl opacity-20 animate-pulse"></div>
              <div className="relative bg-slate-800/80 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl transform rotate-3 transition-transform group-hover:rotate-0">
                <div className="flex items-center gap-4 mb-6 border-b border-white/10 pb-4">
                  <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/40">
                    <Sparkles size={24} />
                  </div>
                  <div>
                    <h4 className="font-bold text-lg">AI Analysis</h4>
                    <p className="text-xs text-blue-400">Processing image...</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="h-4 w-3/4 bg-slate-700 rounded animate-pulse"></div>
                  <div className="h-4 w-1/2 bg-slate-700 rounded animate-pulse"></div>
                  <div className="h-24 w-full bg-slate-700 rounded-xl mt-4 animate-pulse"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- FOOTER --- */}
      <footer className="border-t border-slate-200 bg-white/50 pt-16 pb-8 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 text-center">
          <div className="mb-8 flex justify-center">
            <div className="h-16 w-16 bg-[#00418E] rounded-2xl flex items-center justify-center text-white text-2xl font-black shadow-lg shadow-blue-900/20">BK</div>
          </div>
          <p className="text-slate-500 font-medium mb-8">Dự án phi lợi nhuận hỗ trợ sinh viên ĐH Bách Khoa TP.HCM</p>
          <div className="flex justify-center gap-8 text-sm font-bold text-slate-600 mb-12">
            <Link to="/market" className="hover:text-[#00418E]">Dạo chợ</Link>
            <Link to="/post-item" className="hover:text-[#00418E]">Đăng tin</Link>
            <a href="#" className="hover:text-[#00418E]">Điều khoản</a>
            <a href="#" className="hover:text-[#00418E]">Liên hệ</a>
          </div>
          <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">&copy; {new Date().getFullYear()} HCMUT Student Project.</p>
        </div>
      </footer>
    </div>
  );
};

// --- DATA FETCHING (Giữ nguyên logic cũ nhưng map đúng types) ---
function useProducts(filter: FilterState) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase.from("products").select("*").eq("status", "available");
      if (filter.category !== "all") query = query.eq("category", filter.category);
      if (filter.search) query = query.ilike("title", `%${filter.search}%`);
      
      if (filter.sort === SortOption.NEWEST) query = query.order("created_at", { ascending: false });
      else if (filter.sort === SortOption.PRICE_ASC) query = query.order("price", { ascending: true });
      else if (filter.sort === SortOption.PRICE_DESC) query = query.order("price", { ascending: false });
      else if (filter.sort === SortOption.MOST_VIEWED) query = query.order("view_count", { ascending: false });

      const { data, error: dbError } = await query.limit(24);
      if (dbError) throw dbError;

      // Map Data to UI Interface
      const mapped = (data || []).map((p: any) => ({
        ...p,
        sellerId: p.seller_id,
        postedAt: p.created_at,
        tradeMethod: p.trade_method,
        location: p.location_name,
        images: p.images || []
      }));

      setProducts(mapped);
    } catch (err: any) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);
  return { products, loading, error, refetch: fetchProducts };
}

export default HomePage;
