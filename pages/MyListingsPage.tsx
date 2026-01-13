import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  ArrowLeft, Plus, Package, Edit3, Trash2, Eye, 
  RotateCcw, CheckCircle2, Loader2, MoreVertical 
} from "lucide-react";
import { supabase } from "../services/supabase";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import { Product } from "../types";

// --- STYLES (Đồng bộ với PostItemPage) ---
const VisualEngine = () => (
  <style>{`
    :root { --primary: #00418E; }
    body { background-color: #F8FAFC; color: #0F172A; }
    
    .glass-panel { 
      background: rgba(255, 255, 255, 0.85); 
      backdrop-filter: blur(20px); 
      border: 1px solid rgba(255, 255, 255, 0.6); 
      box-shadow: 0 20px 40px -10px rgba(0, 65, 142, 0.1); 
    }
    
    .status-badge-sold { background: #F1F5F9; color: #64748B; border: 1px solid #E2E8F0; }
    .status-badge-active { background: #DCFCE7; color: #15803D; border: 1px solid #BBF7D0; }
    
    .animate-enter { animation: slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
    @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
  `}</style>
);

const MyListingsPage: React.FC = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // --- FETCH DATA ---
  useEffect(() => {
    const fetchMyListings = async () => {
      if (!user) return;
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('products')
          // Lấy tin do chính user đăng
          .select(`
            *, 
            seller:profiles!seller_id ( name, avatar_url, verified_status )
          `)
          .eq('seller_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;

        // Map dữ liệu
        const mappedProducts = (data || []).map((p: any) => ({
          ...p,
          sellerId: p.seller_id,
          postedAt: p.created_at,
          tradeMethod: p.trade_method,
          location: p.location_name,
          images: p.images || [],
          view_count: p.view_count || 0,
          status: p.status || 'available'
        }));

        setProducts(mappedProducts);
      } catch (err: any) {
        console.error(err);
        addToast("Lỗi tải tin đăng", "error");
      } finally {
        setLoading(false);
      }
    };

    fetchMyListings();
  }, [user]);

  // --- ACTIONS ---
  
  // 1. Xóa tin
  const handleDelete = async (id: string) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa tin này không? Hành động này không thể hoàn tác.")) return;
    setProcessingId(id);
    try {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
      
      setProducts(prev => prev.filter(p => p.id !== id));
      addToast("Đã xóa tin đăng", "success");
    } catch (err) {
      addToast("Không thể xóa tin", "error");
    } finally {
      setProcessingId(null);
    }
  };

  // 2. Đánh dấu Đã bán / Đăng lại
  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'sold' ? 'available' : 'sold';
    setProcessingId(id);
    try {
      const { error } = await supabase
        .from('products')
        .update({ status: newStatus })
        .eq('id', id);
        
      if (error) throw error;
      
      setProducts(prev => prev.map(p => p.id === id ? { ...p, status: newStatus } : p));
      addToast(newStatus === 'sold' ? "Đã đánh dấu đã bán" : "Đã đăng bán lại", "success");
    } catch (err) {
      addToast("Lỗi cập nhật trạng thái", "error");
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-[#00418E]" size={40}/></div>;

  return (
    <div className="min-h-screen pt-20 pb-20 font-sans text-slate-800">
      <VisualEngine />
      <div className="fixed inset-0 -z-10 bg-gradient-to-br from-blue-50 to-white"></div>

      <div className="max-w-5xl mx-auto px-4">
        {/* Header */}
        <div className="flex justify-between items-center mb-8 animate-enter">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/profile')} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
              <ArrowLeft size={24} className="text-slate-600"/>
            </button>
            <div>
              <h1 className="text-3xl font-black text-[#00418E]">Quản Lý Tin Đăng</h1>
              <p className="text-slate-500 font-medium">Bạn đang có {products.length} tin đăng.</p>
            </div>
          </div>
          <button onClick={() => navigate('/post')} className="bg-[#00418E] text-white px-6 py-3 rounded-2xl font-bold shadow-lg hover:shadow-blue-900/20 hover:scale-105 active:scale-95 flex items-center gap-2 transition-all">
            <Plus size={20}/> Đăng tin mới
          </button>
        </div>

        {/* Product List */}
        <div className="space-y-4 animate-enter" style={{animationDelay: '100ms'}}>
          {products.length === 0 ? (
            <div className="text-center py-32 bg-white/60 backdrop-blur-md rounded-[2.5rem] border-2 border-dashed border-slate-200">
              <Package size={64} className="mx-auto mb-6 text-slate-300"/>
              <h3 className="text-xl font-bold text-slate-700 mb-2">Chưa có tin đăng nào</h3>
              <p className="text-slate-400 font-medium mb-8">Hãy dọn dẹp góc học tập và đăng bán những món đồ cũ ngay nhé!</p>
              <button onClick={() => navigate('/post')} className="text-[#00418E] font-bold hover:underline text-lg">Đăng tin ngay &rarr;</button>
            </div>
          ) : (
            products.map((p) => (
              <div key={p.id} className="glass-panel p-4 rounded-3xl flex flex-col sm:flex-row gap-5 group border border-transparent hover:border-blue-200 transition-all">
                
                {/* Image Section */}
                <div className="w-full sm:w-32 h-32 flex-shrink-0 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 relative shadow-sm">
                  {p.images && p.images.length > 0 ? (
                    <img src={p.images[0]} className={`w-full h-full object-cover transition-all ${p.status === 'sold' ? 'grayscale opacity-70' : ''}`} alt={p.title}/>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400"><Package size={32}/></div>
                  )}
                  {p.status === 'sold' && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center backdrop-blur-[1px]">
                      <span className="text-white text-xs font-black uppercase border-2 border-white px-3 py-1 rounded-full tracking-wider">Đã bán</span>
                    </div>
                  )}
                </div>

                {/* Content Section */}
                <div className="flex-1 min-w-0 py-1 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start gap-4 mb-2">
                      <h3 className="font-bold text-slate-900 text-lg line-clamp-1 leading-snug">{p.title}</h3>
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wide shrink-0 ${p.status === 'sold' ? 'status-badge-sold' : 'status-badge-active'}`}>
                        {p.status === 'sold' ? 'Đã bán' : 'Đang bán'}
                      </span>
                    </div>
                    <p className="text-[#00418E] font-black text-xl mb-1">{new Intl.NumberFormat('vi-VN').format(p.price)}đ</p>
                    <div className="flex items-center gap-4 text-xs text-slate-500 font-bold">
                      <span className="flex items-center gap-1 bg-white px-2 py-1 rounded-lg"><Eye size={14} className="text-blue-400"/> {p.view_count} lượt xem</span>
                      <span className="text-slate-300">|</span>
                      <span>{new Date(p.postedAt).toLocaleDateString('vi-VN')}</span>
                    </div>
                  </div>

                  {/* Actions Toolbar */}
                  <div className="flex items-center gap-2 mt-4 sm:mt-0 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                    
                    {/* Nút Đổi trạng thái */}
                    <button 
                      onClick={() => handleToggleStatus(p.id, p.status)} 
                      disabled={processingId === p.id}
                      className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${p.status === 'sold' 
                        ? 'bg-orange-50 text-orange-600 hover:bg-orange-100 border border-orange-100' 
                        : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-100'}`}
                    >
                      {processingId === p.id ? <Loader2 size={14} className="animate-spin"/> : (p.status === 'sold' ? <RotateCcw size={14}/> : <CheckCircle2 size={14}/>)}
                      {p.status === 'sold' ? "Đăng lại" : "Đã bán"}
                    </button>

                    <div className="w-px h-6 bg-slate-200 mx-1 hidden sm:block"></div>

                    {/* Nút Sửa */}
                    <button 
                      onClick={() => navigate(`/edit-item/${p.id}`)} 
                      className="p-2.5 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 hover:scale-110 transition-all" 
                      title="Chỉnh sửa"
                    >
                      <Edit3 size={18}/>
                    </button>

                    {/* Nút Xóa */}
                    <button 
                      onClick={() => handleDelete(p.id)} 
                      disabled={processingId === p.id}
                      className="p-2.5 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 hover:scale-110 transition-all disabled:opacity-50" 
                      title="Xóa tin"
                    >
                      {processingId === p.id ? <Loader2 size={18} className="animate-spin"/> : <Trash2 size={18}/>}
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default MyListingsPage;
