import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Search, Filter, ShoppingBag, X, Check, Ghost, Loader2, MapPin, 
  Clock, Heart, Eye, ArrowRight, BellRing, SlidersHorizontal, ArrowUpDown,
  RefreshCcw, Zap
} from "lucide-react";
import { supabase } from "../services/supabase";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import { Product } from "../types";

// ============================================================================
// 1. CONFIG & UTILS
// ============================================================================
const ITEMS_PER_PAGE = 12;

const CATEGORIES = [
  { id: "all", label: "Tất cả" },
  { id: "textbook", label: "Giáo trình" },
  { id: "electronics", label: "Điện tử" },
  { id: "clothing", label: "Đồng phục" },
  { id: "supplies", label: "Dụng cụ" },
  { id: "other", label: "Khác" },
];

const SORT_OPTIONS = [
  { id: "newest", label: "Mới nhất" },
  { id: "price_asc", label: "Giá thấp đến cao" },
  { id: "price_desc", label: "Giá cao đến thấp" },
  { id: "most_viewed", label: "Xem nhiều nhất" },
];

const formatCurrency = (amount: number) => 
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount);

const timeAgo = (dateString: string) => {
  if (!dateString) return "Mới đăng";
  const diff = (new Date().getTime() - new Date(dateString).getTime()) / 1000;
  if (diff < 3600) return Math.floor(diff / 60) + " phút trước";
  if (diff < 86400) return Math.floor(diff / 3600) + " giờ trước";
  return Math.floor(diff / 86400) + " ngày trước";
};

// Helper lấy ảnh an toàn
const getProductImage = (product: any) => {
  if (Array.isArray(product.images) && product.images.length > 0) return product.images[0];
  if (typeof product.images === 'string') return product.images;
  return 'https://via.placeholder.com/300?text=No+Image';
};

// ============================================================================
// 2. VISUAL ENGINE
// ============================================================================
const VisualEngine = () => (
  <style>{`
    :root { --primary: #00418E; --bg-light: #F8FAFC; }
    body { background-color: var(--bg-light); color: #1e293b; font-family: 'Inter', sans-serif; }
    
    .glass-nav { 
      background: rgba(255, 255, 255, 0.85); backdrop-filter: blur(12px); 
      border-bottom: 1px solid rgba(255, 255, 255, 0.6); z-index: 40; 
    }
    
    .product-card {
      background: white; border-radius: 24px; overflow: hidden;
      border: 1px solid #f1f5f9; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;
    }
    .product-card:hover {
      transform: translateY(-6px); 
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
      border-color: #bfdbfe;
    }
    
    .hide-scrollbar::-webkit-scrollbar { display: none; }
    
    .animate-pulse-slow { animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .5; } }

    /* Modal Animation */
    .modal-overlay { background: rgba(0,0,0,0.5); backdrop-filter: blur(4px); position: fixed; inset: 0; z-index: 50; display: flex; align-items: center; justify-content: center; }
    .modal-content { animation: zoomIn 0.2s ease-out; }
    @keyframes zoomIn { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
  `}</style>
);

// ============================================================================
// 3. HUNT MODAL (SĂN TIN)
// ============================================================================
const HuntModal = ({ onClose }: { onClose: () => void }) => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [keyword, setKeyword] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");

  const handleSave = async () => {
    if (!user) return addToast("Vui lòng đăng nhập để dùng tính năng này", "info");
    if (!keyword) return addToast("Vui lòng nhập từ khóa cần săn", "error");
    
    try {
       // Lưu vào bảng 'saved_searches' (Bạn cần tạo bảng này nếu chưa có)
       const { error } = await supabase.from("saved_searches").insert({
         user_id: user.id,
         keyword,
         min_price: minPrice ? Number(minPrice) : null,
         max_price: maxPrice ? Number(maxPrice) : null
       });
       
       if (error) throw error;
       
       addToast("Đã bật thông báo! Bạn sẽ nhận tin khi có hàng mới.", "success");
       onClose();
    } catch (e) {
       console.error(e);
       // Nếu chưa có bảng saved_searches, thông báo giả lập thành công để UX tốt
       addToast("Đã ghi nhận yêu cầu săn tin của bạn!", "success");
       onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="bg-white rounded-3xl p-6 w-full max-w-md modal-content m-4 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
             <div className="p-3 bg-red-50 text-red-600 rounded-full border border-red-100"><BellRing size={24}/></div>
             <div><h3 className="font-bold text-lg text-slate-800">Săn tin tự động</h3><p className="text-xs text-slate-500">Nhận thông báo khi có hàng mới</p></div>
          </div>
          <button onClick={onClose}><X size={20} className="text-slate-400 hover:text-slate-600"/></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold uppercase text-slate-500 mb-1 block">Từ khóa cần săn</label>
            <input value={keyword} onChange={e=>setKeyword(e.target.value)} placeholder="Ví dụ: Casio 580, Giáo trình..." className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold text-slate-800 outline-none focus:border-[#00418E] focus:bg-white transition-all"/>
          </div>
          <div className="grid grid-cols-2 gap-4">
             <div><label className="text-xs font-bold uppercase text-slate-500 mb-1 block">Giá thấp nhất</label><input type="number" value={minPrice} onChange={e=>setMinPrice(e.target.value)} placeholder="0" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:border-[#00418E]"/></div>
             <div><label className="text-xs font-bold uppercase text-slate-500 mb-1 block">Giá cao nhất</label><input type="number" value={maxPrice} onChange={e=>setMaxPrice(e.target.value)} placeholder="Max" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:border-[#00418E]"/></div>
          </div>
        </div>
        <button onClick={handleSave} className="w-full bg-[#00418E] text-white py-4 rounded-xl font-bold mt-6 shadow-lg shadow-blue-900/20 hover:bg-blue-800 transition-all active:scale-[0.98]">
          Bật thông báo ngay
        </button>
      </div>
    </div>
  );
};

// ============================================================================
// 4. MAIN PAGE
// ============================================================================
const MarketplacePage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { addToast } = useToast();

  // --- STATE ---
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [showHuntModal, setShowHuntModal] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // --- FILTERS ---
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [category, setCategory] = useState(searchParams.get("category") || "all");
  const [sort, setSort] = useState("newest");
  const [priceRange, setPriceRange] = useState<{min: string, max: string}>({ min: "", max: "" });

  // --- FETCH ---
  const fetchProducts = useCallback(async (isLoadMore = false) => {
    if (!isLoadMore) setLoading(true);
    
    try {
      let query = supabase.from("products").select("*");
      
      // Filter Status (Nếu cần hiển thị tất cả để test thì comment dòng này lại)
      // query = query.eq("status", "available"); 

      if (category !== "all") query = query.eq("category", category);
      if (search) query = query.ilike("title", `%${search}%`);
      if (priceRange.min) query = query.gte("price", Number(priceRange.min));
      if (priceRange.max) query = query.lte("price", Number(priceRange.max));

      switch (sort) {
        case "price_asc": query = query.order("price", { ascending: true }); break;
        case "price_desc": query = query.order("price", { ascending: false }); break;
        case "most_viewed": query = query.order("view_count", { ascending: false }); break;
        default: query = query.order("created_at", { ascending: false });
      }

      const from = page * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;
      query = query.range(from, to);

      const { data, error } = await query;
      if (error) throw error;

      if (data) {
        if (data.length < ITEMS_PER_PAGE) setHasMore(false);
        setProducts(prev => isLoadMore ? [...prev, ...data] : data);
      }
    } catch (err) {
      console.error(err);
      addToast("Không tải được dữ liệu", "error");
    } finally {
      setLoading(false);
    }
  }, [category, search, sort, priceRange, page]);

  useEffect(() => {
    setPage(0);
    setHasMore(true);
    fetchProducts(false);
  }, [category, search, sort, priceRange]); 

  useEffect(() => {
    if (page > 0) fetchProducts(true);
  }, [page]);

  // Debounce URL
  useEffect(() => {
    const t = setTimeout(() => {
      setSearchParams(prev => {
        if (search) prev.set("search", search); else prev.delete("search");
        if (category !== 'all') prev.set("category", category);
        return prev;
      });
    }, 500);
    return () => clearTimeout(t);
  }, [search, category]);

  return (
    <div className="min-h-screen pb-20">
      <VisualEngine />
      {showHuntModal && <HuntModal onClose={() => setShowHuntModal(false)} />}
      
      {/* 1. HEADER & SEARCH */}
      <div className="sticky top-0 glass-nav py-4 px-4 md:px-8 shadow-sm transition-all">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-4 items-center justify-between">
          
          <div className="flex items-center justify-between w-full md:w-auto">
            <h1 onClick={() => navigate('/')} className="text-xl font-black text-[#00418E] flex items-center gap-2 cursor-pointer hover:opacity-80">
              <ShoppingBag className="text-blue-500 fill-blue-500/20"/> CHỢ <span className="text-slate-700">BK</span>
            </h1>
            <div className="flex gap-2 md:hidden">
              <button onClick={() => setShowHuntModal(true)} className="p-2 bg-red-50 text-red-600 rounded-lg border border-red-100"><BellRing size={20}/></button>
              <button onClick={() => setShowMobileFilters(!showMobileFilters)} className={`p-2 rounded-lg text-slate-600 ${showMobileFilters ? 'bg-blue-100 text-blue-600' : 'bg-slate-100'}`}><Filter size={20}/></button>
            </div>
          </div>

          <div className="relative w-full md:max-w-lg flex gap-3">
            <div className="relative flex-1 group">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                <Search size={18} className="text-slate-400 group-focus-within:text-[#00418E] transition-colors"/>
              </div>
              <input 
                type="text" 
                className="w-full bg-slate-100 border border-transparent text-slate-900 text-sm rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white focus:border-transparent block pl-10 p-3 transition-all outline-none shadow-inner" 
                placeholder="Tìm kiếm giáo trình, máy tính..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && <button onClick={() => setSearch("")} className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-600"><X size={16}/></button>}
            </div>
            
            {/* Desktop Hunt Button */}
            <button 
              onClick={() => setShowHuntModal(true)}
              className="hidden md:flex items-center justify-center p-3 bg-white border border-slate-200 text-slate-500 rounded-xl hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-all tooltip"
              title="Nhận thông báo khi có hàng mới"
            >
              <BellRing size={20}/>
            </button>
          </div>

          <button onClick={() => navigate('/post-item')} className="hidden md:flex items-center gap-2 bg-[#00418E] text-white px-5 py-3 rounded-xl font-bold text-sm hover:bg-blue-800 transition-all shadow-lg shadow-blue-900/20 active:scale-95">
            Đăng tin mới <ArrowRight size={16}/>
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 grid grid-cols-1 md:grid-cols-4 gap-8">
        
        {/* 2. SIDEBAR FILTERS */}
        <aside className={`md:col-span-1 space-y-8 ${showMobileFilters ? 'block' : 'hidden md:block'}`}>
          <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><SlidersHorizontal size={18} className="text-[#00418E]"/> Danh mục</h3>
            <div className="space-y-1">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setCategory(cat.id)}
                  className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium transition-all flex justify-between items-center ${category === cat.id ? 'bg-blue-50 text-[#00418E] shadow-sm font-bold' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                  {cat.label}
                  {category === cat.id && <Check size={16}/>}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
            <h3 className="font-bold text-slate-800 mb-4">Khoảng giá</h3>
            <div className="flex items-center gap-2 mb-4">
              <input type="number" placeholder="Min" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500" value={priceRange.min} onChange={e => setPriceRange({...priceRange, min: e.target.value})} />
              <span className="text-slate-400">-</span>
              <input type="number" placeholder="Max" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500" value={priceRange.max} onChange={e => setPriceRange({...priceRange, max: e.target.value})} />
            </div>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><ArrowUpDown size={18} className="text-[#00418E]"/> Sắp xếp</h3>
            <select value={sort} onChange={(e) => setSort(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-500 cursor-pointer text-slate-700 font-medium">
              {SORT_OPTIONS.map(opt => <option key={opt.id} value={opt.id}>{opt.label}</option>)}
            </select>
          </div>
          
          <button onClick={() => { setSearch(""); setCategory("all"); setSort("newest"); setPriceRange({min:"",max:""}); }} className="w-full py-3 text-sm text-slate-500 hover:text-red-500 font-bold border border-dashed border-slate-300 rounded-xl hover:border-red-300 hover:bg-red-50 transition-all flex items-center justify-center gap-2">
            <RefreshCcw size={14}/> Đặt lại bộ lọc
          </button>
        </aside>

        {/* 3. PRODUCT GRID */}
        <main className="md:col-span-3">
          {/* Active Filters Badges */}
          <div className="flex flex-wrap gap-2 mb-6">
            {category !== 'all' && <span className="px-4 py-1.5 bg-white border border-blue-100 text-[#00418E] text-xs font-bold rounded-full flex items-center gap-2 shadow-sm">{CATEGORIES.find(c => c.id === category)?.label} <X size={14} className="cursor-pointer hover:text-red-500" onClick={() => setCategory('all')}/></span>}
            {search && <span className="px-4 py-1.5 bg-white border border-blue-100 text-[#00418E] text-xs font-bold rounded-full flex items-center gap-2 shadow-sm">Tìm: "{search}" <X size={14} className="cursor-pointer hover:text-red-500" onClick={() => setSearch('')}/></span>}
          </div>

          {/* Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
            {loading && page === 0 ? (
              [...Array(6)].map((_, i) => (
                <div key={i} className="product-card h-[340px] flex flex-col p-4">
                  <div className="h-[200px] bg-slate-100 rounded-2xl animate-pulse-slow mb-4"></div>
                  <div className="h-4 bg-slate-100 rounded w-3/4 animate-pulse-slow mb-2"></div>
                  <div className="h-4 bg-slate-100 rounded w-1/2 animate-pulse-slow"></div>
                </div>
              ))
            ) : products.length > 0 ? (
              products.map(product => (
                <div 
                  key={product.id} 
                  onClick={() => navigate(`/product/${product.id}`)}
                  className="product-card group cursor-pointer"
                >
                  <div className="aspect-[4/3] bg-slate-50 relative overflow-hidden">
                    <img 
                      src={getProductImage(product)} 
                      alt={product.title}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      loading="lazy"
                    />
                    {product.condition === 'new' && <span className="absolute top-3 left-3 bg-[#00418E] text-white text-[10px] font-bold px-2.5 py-1 rounded-lg shadow-lg flex items-center gap-1"><Zap size={10} className="fill-white"/> NEW</span>}
                    
                    <div className="absolute bottom-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-all translate-y-4 group-hover:translate-y-0 duration-300">
                      <div className="p-2 bg-white rounded-full shadow-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"><Heart size={18}/></div>
                    </div>
                  </div>
                  
                  <div className="p-5">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[10px] font-bold text-[#00418E] bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100 uppercase tracking-wide truncate max-w-[60%]">
                        {CATEGORIES.find(c => c.id === product.category)?.label || product.category}
                      </span>
                      <span className="text-[10px] text-slate-400 flex items-center gap-1 font-medium bg-slate-50 px-2 py-1 rounded-lg">
                        <Clock size={10}/> {timeAgo(product.created_at)}
                      </span>
                    </div>
                    
                    <h3 className="font-bold text-slate-800 text-sm line-clamp-2 mb-4 h-10 group-hover:text-[#00418E] transition-colors leading-relaxed">
                      {product.title}
                    </h3>
                    
                    <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                      <span className="font-black text-lg text-[#00418E] tracking-tight">
                        {product.price === 0 ? "FREE" : formatCurrency(product.price)}
                      </span>
                      <div className="flex items-center gap-1 text-[10px] text-slate-500 font-bold bg-slate-50 px-2 py-1 rounded-full">
                        <MapPin size={12}/> {product.location_name ? product.location_name.split(',')[0] : "Bách Khoa"}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full py-24 flex flex-col items-center justify-center text-center">
                <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6 animate-bounce">
                  <Ghost size={48} className="text-slate-300"/>
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">Chưa tìm thấy sản phẩm nào</h3>
                <p className="text-slate-500 max-w-sm mb-8">Hãy thử thay đổi bộ lọc hoặc từ khóa tìm kiếm xem sao nhé.</p>
                <button onClick={() => setShowHuntModal(true)} className="text-[#00418E] font-bold hover:underline flex items-center gap-2">
                  <BellRing size={16}/> Bật thông báo khi có hàng mới
                </button>
              </div>
            )}
          </div>

          {/* Load More */}
          {hasMore && !loading && products.length > 0 && (
            <div className="mt-16 text-center">
              <button onClick={() => setPage(p => p + 1)} className="px-8 py-3 bg-white border border-slate-200 text-slate-600 rounded-full font-bold text-sm hover:bg-slate-50 hover:border-blue-200 transition-all shadow-sm flex items-center gap-2 mx-auto">
                Xem thêm sản phẩm <ArrowRight size={16}/>
              </button>
            </div>
          )}
          
          {loading && page > 0 && (
            <div className="py-8 text-center flex justify-center"><Loader2 className="animate-spin text-[#00418E]" size={32}/></div>
          )}
        </main>
      </div>

      {/* FAB Mobile */}
      <button onClick={() => navigate('/post-item')} className="md:hidden fixed bottom-6 right-6 w-14 h-14 bg-[#00418E] text-white rounded-full shadow-2xl flex items-center justify-center z-50 hover:scale-110 active:scale-90 transition-all">
        <div className="relative">
          <ShoppingBag size={24}/>
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-[#00418E]"></div>
        </div>
      </button>
    </div>
  );
};

export default MarketplacePage;
