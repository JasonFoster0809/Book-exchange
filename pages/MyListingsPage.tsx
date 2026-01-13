import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  ArrowLeft, Plus, Package, Edit3, Trash2, Eye, 
  MoreVertical, CheckCircle2, AlertCircle, Loader2, RotateCcw 
} from "lucide-react";
import { supabase } from "../services/supabase";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import { Product } from "../types";

// --- STYLES ---
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
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // --- FETCH DATA ---
  useEffect(() => {
    const fetchMyListings = async () => {
      if (!user) return;
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('products')
          .select(`
            *, 
            seller:profiles!seller_id ( name, avatar_url, verified_status )
          `)
          .eq('seller_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;

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
  const handleDelete = async (id: string) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa tin này không?")) return;
    setDeletingId(id);
    try {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
      
      setProducts(prev => prev.filter(p => p.id !== id));
      addToast("Đã xóa tin đăng", "success");
    } catch (err) {
      addToast("Không thể xóa tin", "error");
    } finally {
      setDeletingId(null);
    }
  };

  const handleMarkSold = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'sold' ? 'available' : 'sold';
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
              <ArrowLeft size={20}/>
            </button>
            <div>
              <h1 className="text-2xl font-black text-[#00418E]">Quản Lý Tin Đăng</h1>
              <p className="text-slate-500 text-sm">Bạn đang có {products.length} tin.</p>
            </div>
          </div>
          <button onClick={() => navigate('/post')} className="bg-[#00418E] text-white px-5 py-2.5 rounded-xl font-bold shadow-lg hover:shadow-blue-900/20 flex items-center gap-2 transition-all">
            <Plus size={18}/> Đăng tin mới
          </button>
        </div>

        {/* List */}
        <div className="space-y-4 animate-enter" style={{animationDelay: '100ms'}}>
          {products.length === 0 ? (
            <div className="text-center py-20 bg-white/50 rounded-[2rem] border-2 border-dashed border-slate-200">
              <Package size={64} className="mx-auto mb-4 text-slate-300"/>
              <h3 className="text-lg font-bold text-slate-600">Chưa có tin đăng nào</h3>
              <p className="text-slate-400 text-sm mb-6">Hãy chia sẻ những món đồ cũ của bạn ngay nhé!</p>
              <button onClick={() => navigate('/post')} className="text-[#00418E] font-bold hover:underline">Đăng tin ngay</button>
            </div>
          ) : (
            products.map((p) => (
              <div key={p.id} className="glass-panel p-4 rounded-2xl flex gap-4 items-center group hover:border-blue-200 transition-all">
                {/* Image */}
                <div className="w-24 h-24 flex-shrink-0 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 relative">
                  {p.images && p.images.length > 0 ? (
                    <img src={p.images[0]} className="w-full h-full object-cover" alt={p.title}/>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400"><Package size={24}/></div>
                  )}
                  {p.status === 'sold' && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <span className="text-white text-xs font-bold uppercase border border-white px-2 py-1 rounded">Đã bán</span>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-slate-900 truncate pr-4 text-lg">{p.title}</h3>
                      <p className="text-[#00418E] font-black">{new Intl.NumberFormat('vi-VN').format(p.price)}đ</p>
                    </div>
                    {/* Status Badge */}
                    <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase ${p.status === 'sold' ? 'bg-slate-100 text-slate-500' : 'bg-green-100 text-green-700'}`}>
                      {p.status === 'sold' ? 'Đã bán' : 'Đang hiển thị'}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-4 mt-2 text-xs text-slate-500 font-medium">
                    <span className="flex items-center gap-1"><Eye size={14}/> {p.view_count} lượt xem</span>
                    <span>•</span>
                    <span>{new Date(p.postedAt).toLocaleDateString('vi-VN')}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 border-l pl-4 border-slate-100">
                  <button onClick={() => handleMarkSold(p.id, p.status)} className={`p-2 rounded-xl transition-colors ${p.status === 'sold' ? 'bg-orange-50 text-orange-600 hover:bg-orange-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}`} title={p.status === 'sold' ? "Đăng bán lại" : "Đánh dấu đã bán"}>
                    {p.status === 'sold' ? <RotateCcw size={18}/> : <CheckCircle2 size={18}/>}
                  </button>
                  <button onClick={() => navigate(`/edit-item/${p.id}`)} className="p-2 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors" title="Sửa tin">
                    <Edit3 size={18}/>
                  </button>
                  <button onClick={() => handleDelete(p.id)} disabled={deletingId === p.id} className="p-2 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 transition-colors disabled:opacity-50" title="Xóa tin">
                    {deletingId === p.id ? <Loader2 size={18} className="animate-spin"/> : <Trash2 size={18}/>}
                  </button>
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
