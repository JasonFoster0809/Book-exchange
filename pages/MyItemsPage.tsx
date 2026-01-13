import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import { 
  Package, Heart, TrendingUp, Eye, Trash2, 
  CheckCircle2, RotateCcw, ChevronRight, ShoppingBag, LayoutDashboard,
  Edit3, AlertTriangle, X, Sparkles
} from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import { Product, ProductStatus } from '../types';

// --- VISUAL ENGINE: Animation & Styles ---
const VisualEngine = () => (
  <style>{`
    :root { --primary: #00418E; }
    body { background-color: #F8FAFC; color: #0F172A; }
    
    /* Animation: Modal Nảy & Mờ dần */
    @keyframes modalEnter {
      0% { opacity: 0; transform: scale(0.9) translateY(10px); }
      50% { transform: scale(1.02) translateY(-2px); }
      100% { opacity: 1; transform: scale(1) translateY(0); }
    }
    .animate-modal { animation: modalEnter 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
    
    /* Animation: Slide lên cho danh sách */
    @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
    .animate-enter { animation: slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }

    /* Gradient Text */
    .text-gradient {
      background: linear-gradient(135deg, #00418E 0%, #3B82F6 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
  `}</style>
);

// --- COMPONENT: STAT CARD (Thẻ thống kê đẹp) ---
const StatCard = ({ label, value, icon: Icon, color }: { label: string, value: number, icon: any, color: string }) => (
  <div className="bg-white p-5 rounded-[20px] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex items-center justify-between hover:scale-[1.02] transition-transform duration-300">
    <div>
      <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-3xl font-black ${color}`}>{value}</p>
    </div>
    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${color.replace('text-', 'bg-').replace('600', '50')} ${color}`}>
      <Icon size={24} />
    </div>
  </div>
);

// --- COMPONENT: PREMIUM MODAL ---
const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message, isDanger }: any) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-md transition-opacity" onClick={onClose} />
      <div className="relative bg-white rounded-[2rem] w-full max-w-sm p-6 shadow-2xl animate-modal border border-white/50">
        <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-50 text-slate-400 transition-colors"><X size={20}/></button>
        
        <div className="text-center pt-4 pb-6">
          <div className={`w-20 h-20 mx-auto mb-5 rounded-full flex items-center justify-center ${isDanger ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-600'}`}>
            {isDanger ? <Trash2 size={32}/> : <AlertTriangle size={32}/>}
          </div>
          <h3 className="text-2xl font-black text-slate-800 mb-2">{title}</h3>
          <p className="text-slate-500 text-sm font-medium leading-relaxed px-4">{message}</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button onClick={onClose} className="py-3.5 rounded-xl font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 transition-colors">Đóng</button>
          <button onClick={() => { onConfirm(); onClose(); }} className={`py-3.5 rounded-xl font-bold text-white shadow-lg hover:shadow-xl hover:translate-y-[-2px] transition-all ${isDanger ? 'bg-red-500 shadow-red-200' : 'bg-[#00418E] shadow-blue-200'}`}>
            Xác nhận
          </button>
        </div>
      </div>
    </div>
  );
};

const MyItemsPage: React.FC = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'selling' | 'saved'>('selling');
  const [sellingItems, setSellingItems] = useState<Product[]>([]);
  const [savedItems, setSavedItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [modal, setModal] = useState({ isOpen: false, title: '', message: '', action: () => {}, isDanger: false });
  const [stats, setStats] = useState({ views: 0, total: 0, sold: 0 });

  useEffect(() => {
    if (!user) navigate('/auth');
    else fetchData();
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Lấy tin đăng (Đã fix created_at)
      const { data: myData } = await supabase
        .from('products')
        .select('*, seller:profiles!seller_id(name, avatar_url, verified_status)')
        .eq('seller_id', user!.id)
        .order('created_at', { ascending: false });

      // 2. Lấy tin đã lưu
      const { data: savedData } = await supabase
        .from('saved_products')
        .select(`product:products (*, seller:profiles!seller_id(name, avatar_url, verified_status))`)
        .eq('user_id', user!.id);

      const myItems = (myData || []).map((p: any) => ({ ...p, sellerId: p.seller_id, postedAt: p.created_at, seller: p.seller }));
      const savedList = (savedData || []).map((i: any) => i.product).filter((p: any) => p).map((p: any) => ({ ...p, sellerId: p.seller_id, postedAt: p.created_at, seller: p.seller }));

      setSellingItems(myItems);
      setSavedItems(savedList);
      setStats({
        views: myItems.reduce((acc: number, cur: any) => acc + (cur.view_count || 0), 0),
        total: myItems.length,
        sold: myItems.filter((p: any) => p.status === ProductStatus.SOLD).length
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Actions
  const openDeleteModal = (id: string, isSaved: boolean) => {
    setModal({
      isOpen: true,
      title: isSaved ? "Bỏ lưu tin?" : "Xóa tin đăng?",
      message: isSaved ? "Tin này sẽ bị gỡ khỏi danh sách yêu thích." : "Hành động này không thể hoàn tác. Bạn chắc chứ?",
      isDanger: true,
      action: async () => {
        if (isSaved) {
          await supabase.from('saved_products').delete().eq('user_id', user!.id).eq('product_id', id);
          setSavedItems(prev => prev.filter(p => p.id !== id));
          addToast("Đã bỏ lưu", "success");
        } else {
          await supabase.from('products').delete().eq('id', id);
          setSellingItems(prev => prev.filter(p => p.id !== id));
          addToast("Đã xóa tin", "success");
        }
      }
    });
  };

  const toggleStatus = async (item: Product) => {
    const newStatus = item.status === ProductStatus.SOLD ? 'available' : 'sold';
    // @ts-ignore
    await supabase.from('products').update({ status: newStatus }).eq('id', item.id);
    setSellingItems(prev => prev.map(p => p.id === item.id ? { ...p, status: newStatus } : p));
    addToast("Đã cập nhật trạng thái", "success");
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]"><div className="w-10 h-10 border-4 border-[#00418E] border-t-transparent rounded-full animate-spin"/></div>;

  const currentItems = activeTab === 'selling' ? sellingItems : savedItems;

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24 pt-8 font-sans">
      <VisualEngine />
      <ConfirmModal {...modal} onClose={() => setModal({ ...modal, isOpen: false })} onConfirm={modal.action} />

      <div className="max-w-5xl mx-auto px-4">
        {/* HEADER */}
        <div className="mb-10 animate-enter">
          <h1 className="text-3xl font-black text-slate-800 mb-6 flex items-center gap-3">
            <LayoutDashboard className="text-[#00418E]" size={32}/> 
            <span className="text-gradient">Góc Của Tôi</span>
          </h1>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard label="Tổng lượt xem" value={stats.views} icon={Eye} color="text-blue-600" />
            <StatCard label="Tin đang bán" value={stats.total} icon={Package} color="text-indigo-600" />
            <StatCard label="Đã bán xong" value={stats.sold} icon={TrendingUp} color="text-emerald-600" />
          </div>
        </div>

        {/* MAIN CONTENT */}
        <div className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden animate-enter" style={{animationDelay: '0.1s'}}>
          
          {/* Tabs */}
          <div className="flex border-b border-slate-100 bg-slate-50/50">
            {[
              { id: 'selling', label: 'Tin Tôi Đăng', icon: Package, count: sellingItems.length, color: 'text-[#00418E]' },
              { id: 'saved', label: 'Đã Lưu', icon: Heart, count: savedItems.length, color: 'text-red-500' }
            ].map((tab) => (
              <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 py-5 flex items-center justify-center gap-2 text-sm font-bold transition-all relative ${activeTab === tab.id ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <tab.icon size={18} className={activeTab === tab.id ? tab.color : ''} />
                {tab.label} <span className="bg-slate-100 px-2 py-0.5 rounded-full text-xs">{tab.count}</span>
                {activeTab === tab.id && <div className="absolute bottom-0 left-0 w-full h-[3px] bg-[#00418E] rounded-t-full"/>}
              </button>
            ))}
          </div>

          {/* List */}
          <div className="p-6 md:p-8 min-h-[400px]">
            {currentItems.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-20">
                <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6 shadow-inner">
                  {activeTab === 'selling' ? <ShoppingBag className="text-slate-300" size={40}/> : <Heart className="text-slate-300" size={40}/>}
                </div>
                <h3 className="text-xl font-bold text-slate-700 mb-2">Chưa có gì ở đây cả</h3>
                <p className="text-slate-400 text-sm mb-8 max-w-xs mx-auto">Hãy bắt đầu đăng bán những món đồ cũ hoặc lưu lại những món bạn thích nhé.</p>
                {activeTab === 'selling' && (
                  <Link to="/post" className="bg-[#00418E] text-white px-8 py-3 rounded-2xl font-bold shadow-lg shadow-blue-200 hover:shadow-blue-300 hover:translate-y-[-2px] transition-all flex items-center gap-2">
                    <Sparkles size={18}/> Đăng tin ngay
                  </Link>
                )}
              </div>
            ) : (
              <div className="space-y-5">
                {currentItems.map((item) => (
                  <div key={item.id} className="group bg-white border border-slate-100 rounded-3xl p-4 hover:border-blue-200 hover:shadow-lg transition-all flex flex-col sm:flex-row gap-5">
                    {/* Image */}
                    <div className="w-full sm:w-36 h-36 flex-shrink-0 bg-slate-100 rounded-2xl overflow-hidden relative">
                      <img src={item.images?.[0]} className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 ${item.status === ProductStatus.SOLD ? 'grayscale' : ''}`} alt={item.title}/>
                      {item.status === ProductStatus.SOLD && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center backdrop-blur-sm">
                          <span className="text-white text-xs font-black border border-white px-3 py-1 rounded-full uppercase tracking-widest">Đã Bán</span>
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 flex flex-col justify-between py-1">
                      <div>
                        <div className="flex justify-between items-start gap-4 mb-2">
                          <Link to={`/product/${item.id}`} className="font-bold text-slate-800 text-lg line-clamp-1 hover:text-[#00418E] transition-colors">{item.title}</Link>
                          <span className="font-black text-[#00418E] text-lg whitespace-nowrap">{new Intl.NumberFormat('vi-VN').format(item.price)}đ</span>
                        </div>
                        <div className="flex items-center gap-4 text-xs font-bold text-slate-400 mb-4">
                          <span className="bg-slate-50 px-3 py-1.5 rounded-lg text-slate-600 border border-slate-100">{item.category}</span>
                          <span className="flex items-center gap-1"><Eye size={14}/> {item.view_count || 0}</span>
                          <span className="ml-auto text-[10px] uppercase tracking-wide">{new Date(item.postedAt).toLocaleDateString('vi-VN')}</span>
                        </div>
                      </div>

                      {/* Actions Toolbar */}
                      <div className="flex items-center justify-end gap-2 border-t border-slate-50 pt-4 mt-2">
                        {activeTab === 'selling' ? (
                          <>
                            <button onClick={() => navigate(`/edit-item/${item.id}`)} className="p-2.5 rounded-xl bg-slate-50 text-slate-600 hover:bg-blue-50 hover:text-blue-600 transition-colors" title="Sửa">
                              <Edit3 size={18}/>
                            </button>
                            <button onClick={() => toggleStatus(item)} className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors ${item.status === ProductStatus.SOLD ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}>
                              {item.status === ProductStatus.SOLD ? <RotateCcw size={16}/> : <CheckCircle2 size={16}/>}
                              {item.status === ProductStatus.SOLD ? 'Đăng lại' : 'Đã bán'}
                            </button>
                            <button onClick={() => openDeleteModal(item.id, false)} className="p-2.5 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 transition-colors" title="Xóa">
                              <Trash2 size={18}/>
                            </button>
                          </>
                        ) : (
                          <button onClick={() => openDeleteModal(item.id, true)} className="px-4 py-2.5 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 text-xs font-bold flex items-center gap-2 transition-colors">
                            <Heart size={16} className="fill-current"/> Bỏ lưu
                          </button>
                        )}
                        <div className="w-[1px] h-6 bg-slate-200 mx-2"></div>
                        <Link to={`/product/${item.id}`} className="px-5 py-2.5 rounded-xl bg-[#00418E] text-white text-xs font-bold hover:shadow-lg hover:shadow-blue-200 transition-all flex items-center gap-1">
                          Xem <ChevronRight size={14}/>
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyItemsPage;
