import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import { 
  Package, Heart, TrendingUp, Eye, Trash2, 
  CheckCircle2, XCircle, ChevronRight, ShoppingBag, LayoutDashboard,
  Edit3, AlertTriangle, X
} from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import { Product, ProductStatus } from '../types';

// --- STYLES & ANIMATION ---
const VisualEngine = () => (
  <style>{`
    :root { --primary: #00418E; }
    body { background-color: #F8FAFC; color: #0F172A; }
    
    /* Hiệu ứng nảy (Bouncy) cho Modal */
    @keyframes modalPop {
      0% { opacity: 0; transform: scale(0.95) translateY(10px); }
      50% { transform: scale(1.02) translateY(-2px); }
      100% { opacity: 1; transform: scale(1) translateY(0); }
    }
    .animate-modal-pop { animation: modalPop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
    
    .glass-panel { 
      background: rgba(255, 255, 255, 0.85); 
      backdrop-filter: blur(20px); 
      border: 1px solid rgba(255, 255, 255, 0.6); 
      box-shadow: 0 20px 40px -10px rgba(0, 65, 142, 0.1); 
    }
  `}</style>
);

// --- COMPONENT: CONFIRM MODAL (PREMIUM UI) ---
const ConfirmModal = ({ 
  isOpen, onClose, onConfirm, title, message, isDanger = false 
}: { 
  isOpen: boolean; onClose: () => void; onConfirm: () => void; title: string; message: string; isDanger?: boolean;
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop mờ dần */}
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div className="relative bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden animate-modal-pop border border-white/50">
        <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
          <X size={20} />
        </button>

        <div className="p-8 text-center">
          <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner ${isDanger ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-500'}`}>
            <div className={`w-14 h-14 rounded-full flex items-center justify-center ${isDanger ? 'bg-red-100' : 'bg-blue-100'}`}>
              {isDanger ? <Trash2 size={28} /> : <AlertTriangle size={28} />}
            </div>
          </div>
          
          <h3 className="text-2xl font-black text-slate-800 mb-3">{title}</h3>
          <p className="text-slate-500 font-medium text-sm leading-relaxed px-4">{message}</p>
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-3">
          <button 
            onClick={onClose}
            className="flex-1 py-3.5 rounded-xl font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 hover:border-slate-300 transition-all shadow-sm"
          >
            Hủy bỏ
          </button>
          <button 
            onClick={() => { onConfirm(); onClose(); }}
            className={`flex-1 py-3.5 rounded-xl font-bold text-white shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-95 transition-all ${isDanger ? 'bg-gradient-to-r from-red-500 to-red-600 shadow-red-200' : 'bg-gradient-to-r from-[#00418E] to-blue-600 shadow-blue-200'}`}
          >
            Đồng ý
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
  
  // State cho Modal
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean; title: string; message: string; action: () => void; isDanger: boolean;
  }>({ isOpen: false, title: '', message: '', action: () => {}, isDanger: false });

  const [stats, setStats] = useState({ totalViews: 0, totalProducts: 0, soldCount: 0 });

  useEffect(() => {
    if (user) fetchData();
    else navigate('/auth');
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (!user) return;

      // 1. LẤY TIN TÔI ĐĂNG (Đã fix created_at)
      const { data: myProducts, error: err1 } = await supabase
        .from('products')
        .select('*, seller:profiles!seller_id(name, avatar_url, verified_status)') 
        .eq('seller_id', user.id)
        .order('created_at', { ascending: false });

      if (err1) throw err1;

      // 2. LẤY TIN ĐÃ LƯU
      const { data: savedData, error: err2 } = await supabase
        .from('saved_products')
        .select(`product:products (*, seller:profiles!seller_id(name, avatar_url, verified_status))`)
        .eq('user_id', user.id);

      if (err2) throw err2;

      // Map dữ liệu
      const myItemsMap = (myProducts || []).map((p: any) => ({
        ...p, sellerId: p.seller_id, postedAt: p.created_at, tradeMethod: p.trade_method, seller: p.seller
      }));

      const savedItemsMap = (savedData || [])
        // @ts-ignore
        .map((item: any) => item.product)
        .filter((p: any) => p !== null)
        .map((p: any) => ({
            ...p, sellerId: p.seller_id, postedAt: p.created_at, tradeMethod: p.trade_method, seller: p.seller
      }));

      setSellingItems(myItemsMap);
      setSavedItems(savedItemsMap);

      const totalViews = myItemsMap.reduce((acc: number, cur: any) => acc + (cur.view_count || 0), 0);
      const soldCount = myItemsMap.filter((p: any) => p.status === ProductStatus.SOLD).length;

      setStats({ totalViews, totalProducts: myItemsMap.length, soldCount });

    } catch (error) {
      console.error(error);
      addToast("Lỗi tải dữ liệu", "error");
    } finally {
      setLoading(false);
    }
  };

  const requestDelete = (id: string, isSaved: boolean) => {
    setConfirmModal({
      isOpen: true,
      title: isSaved ? "Bỏ lưu tin?" : "Xóa tin này?",
      message: isSaved 
        ? "Tin này sẽ bị gỡ khỏi danh sách yêu thích của bạn." 
        : "Tin đăng sẽ bị xóa vĩnh viễn và không thể khôi phục. Bạn chắc chứ?",
      isDanger: true,
      action: () => handleDelete(id, isSaved)
    });
  };

  const handleDelete = async (id: string, isSaved: boolean) => {
    if (!user) return;
    try {
        if (isSaved) {
            await supabase.from('saved_products').delete().eq('user_id', user.id).eq('product_id', id);
            setSavedItems(prev => prev.filter(p => p.id !== id));
            addToast("Đã bỏ lưu tin", "info");
        } else {
            await supabase.from('products').delete().eq('id', id);
            setSellingItems(prev => prev.filter(p => p.id !== id));
            addToast("Đã xóa tin đăng", "success");
        }
    } catch (error) {
        addToast("Có lỗi xảy ra", "error");
    }
  };

  const handleStatusToggle = async (product: Product) => {
      const newStatus = product.status === ProductStatus.SOLD ? 'available' : 'sold';
      // @ts-ignore
      const { error } = await supabase.from('products').update({ status: newStatus }).eq('id', product.id);
      
      if (!error) {
          setSellingItems(prev => prev.map(p => p.id === product.id ? {...p, status: newStatus as ProductStatus} : p));
          addToast(newStatus === 'sold' ? "Đã đánh dấu Đã Bán" : "Đã đăng bán lại", "success");
      }
  };

  if (loading) return <div className="min-h-screen flex justify-center items-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#034EA2]"></div></div>;

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-20 pt-6">
      <VisualEngine />
      <ConfirmModal 
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.action}
        title={confirmModal.title}
        message={confirmModal.message}
        isDanger={confirmModal.isDanger}
      />

      <div className="max-w-5xl mx-auto px-4">
        
        {/* HEADER STATS */}
        <div className="mb-10 animate-modal-pop">
            <h1 className="text-3xl font-black text-[#034EA2] mb-6 flex items-center">
                <LayoutDashboard className="w-8 h-8 mr-3"/> Góc Của Tôi
            </h1>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-blue-100 flex items-center justify-between hover:shadow-md transition-all">
                    <div>
                        <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">Tổng lượt xem</p>
                        <p className="text-3xl font-black text-[#034EA2] mt-1">{stats.totalViews}</p>
                    </div>
                    <div className="bg-blue-50 p-4 rounded-2xl text-[#034EA2]"><Eye className="w-6 h-6"/></div>
                </div>
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-blue-100 flex items-center justify-between hover:shadow-md transition-all">
                    <div>
                        <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">Tin đã đăng</p>
                        <p className="text-3xl font-black text-[#034EA2] mt-1">{stats.totalProducts}</p>
                    </div>
                    <div className="bg-purple-50 p-4 rounded-2xl text-purple-600"><Package className="w-6 h-6"/></div>
                </div>
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-blue-100 flex items-center justify-between hover:shadow-md transition-all">
                    <div>
                        <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">Đã bán</p>
                        <p className="text-3xl font-black text-green-600 mt-1">{stats.soldCount}</p>
                    </div>
                    <div className="bg-green-50 p-4 rounded-2xl text-green-600"><TrendingUp className="w-6 h-6"/></div>
                </div>
            </div>
        </div>

        {/* LIST CONTENT */}
        <div className="bg-white rounded-[2rem] shadow-sm border border-gray-200 overflow-hidden min-h-[500px] animate-modal-pop" style={{animationDelay: '0.1s'}}>
            <div className="flex border-b border-gray-100">
                <button 
                    onClick={() => setActiveTab('selling')}
                    className={`flex-1 py-5 text-center font-bold text-sm flex justify-center items-center transition-all ${activeTab === 'selling' ? 'text-[#034EA2] border-b-2 border-[#034EA2] bg-blue-50/30' : 'text-gray-400 hover:bg-gray-50'}`}
                >
                    <Package className="w-4 h-4 mr-2"/> Tin Tôi Đăng ({sellingItems.length})
                </button>
                <button 
                    onClick={() => setActiveTab('saved')}
                    className={`flex-1 py-5 text-center font-bold text-sm flex justify-center items-center transition-all ${activeTab === 'saved' ? 'text-red-500 border-b-2 border-red-500 bg-red-50/30' : 'text-gray-400 hover:bg-gray-50'}`}
                >
                    <Heart className="w-4 h-4 mr-2"/> Đã Lưu ({savedItems.length})
                </button>
            </div>

            <div className="p-6">
                {(activeTab === 'selling' ? sellingItems : savedItems).length === 0 ? (
                    <div className="text-center py-20">
                        <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6 text-gray-300 border-4 border-white shadow-sm">
                            {activeTab === 'selling' ? <ShoppingBag size={40}/> : <Heart size={40}/>}
                        </div>
                        <p className="text-gray-500 font-bold text-lg mb-2">Chưa có tin nào ở đây cả.</p>
                        <p className="text-gray-400 text-sm mb-6">Hãy hoạt động sôi nổi hơn nhé!</p>
                        {activeTab === 'selling' && (
                            <Link to="/post" className="inline-flex items-center gap-2 bg-[#034EA2] text-white px-8 py-3 rounded-xl font-bold hover:bg-[#003875] hover:scale-105 transition-all shadow-lg shadow-blue-900/20">
                                Đăng tin ngay
                            </Link>
                        )}
                    </div>
                ) : (
                    <div className="space-y-4">
                        {(activeTab === 'selling' ? sellingItems : savedItems).map((item) => (
                            <div key={item.id} className="flex flex-col md:flex-row gap-5 bg-white border border-gray-100 p-4 rounded-2xl hover:shadow-lg hover:border-blue-100 transition-all group">
                                <Link to={`/product/${item.id}`} className="w-full md:w-36 h-36 flex-shrink-0 bg-gray-100 rounded-xl overflow-hidden relative shadow-inner">
                                    <img src={item.images?.[0] || 'https://via.placeholder.com/150'} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt={item.title}/>
                                    {item.status === ProductStatus.SOLD && (
                                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-[2px]">
                                            <span className="text-white text-[10px] font-black border-2 border-white px-3 py-1 rounded-full uppercase tracking-wider">ĐÃ BÁN</span>
                                        </div>
                                    )}
                                </Link>

                                <div className="flex-1 flex flex-col justify-between py-1">
                                    <div>
                                        <div className="flex justify-between items-start gap-4">
                                            <Link to={`/product/${item.id}`} className="font-bold text-gray-900 text-lg hover:text-[#034EA2] line-clamp-1 leading-snug">{item.title}</Link>
                                            <span className="font-extrabold text-[#034EA2] text-lg whitespace-nowrap">{item.price === 0 ? 'Tặng Free' : item.price.toLocaleString() + ' đ'}</span>
                                        </div>
                                        
                                        <div className="flex items-center gap-3 mt-3 text-xs text-gray-400 font-bold">
                                            <span className="bg-gray-100 px-3 py-1.5 rounded-lg text-gray-600 border border-gray-200">{item.category}</span>
                                            <span className="flex items-center bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg"><Eye className="w-3 h-3 mr-1"/> {item.view_count || 0}</span>
                                            <span className="ml-auto">{new Date(item.postedAt).toLocaleDateString('vi-VN')}</span>
                                        </div>
                                    </div>

                                    {/* Actions Section */}
                                    <div className="mt-5 pt-4 border-t border-gray-50 flex justify-end items-center gap-3">
                                        {activeTab === 'selling' ? (
                                            <>
                                                <button 
                                                    onClick={() => navigate(`/edit-item/${item.id}`)}
                                                    className="text-xs font-bold px-4 py-2.5 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 flex items-center transition-colors"
                                                >
                                                    <Edit3 className="w-3.5 h-3.5 mr-1.5"/> Sửa
                                                </button>

                                                <button 
                                                    onClick={() => handleStatusToggle(item)}
                                                    className={`text-xs font-bold px-4 py-2.5 rounded-xl flex items-center transition ${item.status === ProductStatus.SOLD ? 'bg-green-50 text-green-700 hover:bg-green-100' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                                                >
                                                    {item.status === ProductStatus.SOLD ? <><CheckCircle2 className="w-3.5 h-3.5 mr-1.5"/> Đăng lại</> : <><XCircle className="w-3.5 h-3.5 mr-1.5"/> Đã bán</>}
                                                </button>
                                                
                                                <button 
                                                    onClick={() => requestDelete(item.id, false)} 
                                                    className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all" 
                                                    title="Xóa tin"
                                                >
                                                    <Trash2 className="w-4 h-4"/>
                                                </button>
                                            </>
                                        ) : (
                                            <button 
                                                onClick={() => requestDelete(item.id, true)} 
                                                className="text-xs font-bold px-4 py-2.5 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 flex items-center transition-all"
                                            >
                                                <Heart className="w-3.5 h-3.5 mr-1.5 fill-current"/> Bỏ lưu
                                            </button>
                                        )}
                                        
                                        <div className="w-[1px] h-6 bg-gray-200 mx-1"></div>
                                        
                                        <Link to={`/product/${item.id}`} className="text-xs font-bold px-5 py-2.5 rounded-xl bg-[#034EA2] text-white hover:bg-[#003875] hover:shadow-lg hover:shadow-blue-900/20 flex items-center transition-all">
                                            Xem <ChevronRight className="w-3.5 h-3.5 ml-1"/>
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
