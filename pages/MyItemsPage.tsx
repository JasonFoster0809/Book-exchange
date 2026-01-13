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

// --- COMPONENT: CONFIRM MODAL ---
const ConfirmModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  isDanger = false 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onConfirm: () => void; 
  title: string; 
  message: string; 
  isDanger?: boolean;
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden scale-100 animate-in zoom-in-95 duration-200">
        <div className="p-6 text-center">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${isDanger ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-500'}`}>
            {isDanger ? <Trash2 size={32} /> : <AlertTriangle size={32} />}
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
          <p className="text-gray-500 text-sm leading-relaxed">{message}</p>
        </div>
        <div className="flex border-t border-gray-100">
          <button 
            onClick={onClose}
            className="flex-1 py-4 text-gray-600 font-bold hover:bg-gray-50 transition-colors border-r border-gray-100"
          >
            Hủy bỏ
          </button>
          <button 
            onClick={() => { onConfirm(); onClose(); }}
            className={`flex-1 py-4 font-bold text-white transition-colors ${isDanger ? 'bg-red-500 hover:bg-red-600' : 'bg-[#034EA2] hover:bg-blue-700'}`}
          >
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
  
  // State cho Modal
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    action: () => void;
    isDanger: boolean;
  }>({
    isOpen: false,
    title: '',
    message: '',
    action: () => {},
    isDanger: false
  });

  const [stats, setStats] = useState({
    totalViews: 0,
    totalProducts: 0,
    soldCount: 0
  });

  useEffect(() => {
    if (user) fetchData();
    else navigate('/auth');
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (!user) return;

      // 1. LẤY TIN TÔI ĐĂNG (Fix lỗi posted_at -> created_at)
      const { data: myProducts, error: err1 } = await supabase
        .from('products')
        // Join thêm profile để lấy thông tin seller chuẩn
        .select('*, seller:profiles!seller_id(name, avatar_url, verified_status)') 
        .eq('seller_id', user.id)
        .order('created_at', { ascending: false }); // <-- ĐÃ SỬA LỖI TẠI ĐÂY

      if (err1) throw err1;

      // 2. LẤY TIN ĐÃ LƯU (Fix lỗi join relation)
      const { data: savedData, error: err2 } = await supabase
        .from('saved_products')
        .select(`
          product:products (
            *,
            seller:profiles!seller_id(name, avatar_url, verified_status)
          )
        `)
        .eq('user_id', user.id);

      if (err2) throw err2;

      // 3. Map dữ liệu Selling
      const myItemsMap = (myProducts || []).map((p: any) => ({
        ...p,
        sellerId: p.seller_id,
        postedAt: p.created_at, // Map từ created_at
        tradeMethod: p.trade_method,
        seller: p.seller
      }));

      // 4. Map dữ liệu Saved
      const savedItemsMap = (savedData || [])
        // @ts-ignore
        .map((item: any) => item.product)
        .filter((p: any) => p !== null)
        .map((p: any) => ({
            ...p,
            sellerId: p.seller_id,
            postedAt: p.created_at, // Map từ created_at
            tradeMethod: p.trade_method,
            seller: p.seller
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
      title: isSaved ? "Bỏ lưu tin này?" : "Xóa vĩnh viễn?",
      message: isSaved 
        ? "Tin này sẽ bị xóa khỏi danh sách đã lưu của bạn." 
        : "Hành động này không thể hoàn tác. Bạn chắc chắn muốn xóa tin đăng này chứ?",
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
      <ConfirmModal 
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.action}
        title={confirmModal.title}
        message={confirmModal.message}
        isDanger={confirmModal.isDanger}
      />

      <div className="max-w-5xl mx-auto px-4">
        <div className="mb-10">
            <h1 className="text-3xl font-black text-[#034EA2] mb-6 flex items-center">
                <LayoutDashboard className="w-8 h-8 mr-3"/> Góc Của Tôi
            </h1>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-blue-100 flex items-center justify-between">
                    <div>
                        <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">Tổng lượt xem</p>
                        <p className="text-3xl font-black text-[#034EA2] mt-1">{stats.totalViews}</p>
                    </div>
                    <div className="bg-blue-50 p-3 rounded-full text-[#034EA2]"><Eye className="w-6 h-6"/></div>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-blue-100 flex items-center justify-between">
                    <div>
                        <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">Tin đã đăng</p>
                        <p className="text-3xl font-black text-[#034EA2] mt-1">{stats.totalProducts}</p>
                    </div>
                    <div className="bg-purple-50 p-3 rounded-full text-purple-600"><Package className="w-6 h-6"/></div>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-blue-100 flex items-center justify-between">
                    <div>
                        <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">Đã bán thành công</p>
                        <p className="text-3xl font-black text-green-600 mt-1">{stats.soldCount}</p>
                    </div>
                    <div className="bg-green-50 p-3 rounded-full text-green-600"><TrendingUp className="w-6 h-6"/></div>
                </div>
            </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden min-h-[500px]">
            <div className="flex border-b border-gray-100">
                <button 
                    onClick={() => setActiveTab('selling')}
                    className={`flex-1 py-4 text-center font-bold text-sm flex justify-center items-center transition-all ${activeTab === 'selling' ? 'text-[#034EA2] border-b-2 border-[#034EA2] bg-blue-50/50' : 'text-gray-500 hover:bg-gray-50'}`}
                >
                    <Package className="w-4 h-4 mr-2"/> Tin Tôi Đăng ({sellingItems.length})
                </button>
                <button 
                    onClick={() => setActiveTab('saved')}
                    className={`flex-1 py-4 text-center font-bold text-sm flex justify-center items-center transition-all ${activeTab === 'saved' ? 'text-red-500 border-b-2 border-red-500 bg-red-50/50' : 'text-gray-500 hover:bg-gray-50'}`}
                >
                    <Heart className="w-4 h-4 mr-2"/> Đã Lưu ({savedItems.length})
                </button>
            </div>

            <div className="p-6">
                {(activeTab === 'selling' ? sellingItems : savedItems).length === 0 ? (
                    <div className="text-center py-20">
                        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300">
                            {activeTab === 'selling' ? <ShoppingBag size={40}/> : <Heart size={40}/>}
                        </div>
                        <p className="text-gray-500 font-medium">Chưa có tin nào ở đây cả.</p>
                        {activeTab === 'selling' && (
                            <Link to="/post" className="mt-4 inline-block bg-[#034EA2] text-white px-6 py-2 rounded-xl font-bold hover:bg-[#003875]">Đăng tin ngay</Link>
                        )}
                    </div>
                ) : (
                    <div className="space-y-4">
                        {(activeTab === 'selling' ? sellingItems : savedItems).map((item) => (
                            <div key={item.id} className="flex flex-col md:flex-row gap-4 bg-white border border-gray-100 p-4 rounded-xl hover:shadow-md transition-shadow group">
                                <Link to={`/product/${item.id}`} className="w-full md:w-32 h-32 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden relative">
                                    <img src={item.images?.[0] || 'https://via.placeholder.com/150'} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt={item.title}/>
                                    {item.status === ProductStatus.SOLD && (
                                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                            <span className="text-white text-xs font-bold border px-2 py-1 rounded">ĐÃ BÁN</span>
                                        </div>
                                    )}
                                </Link>

                                <div className="flex-1 flex flex-col justify-between">
                                    <div>
                                        <div className="flex justify-between items-start">
                                            <Link to={`/product/${item.id}`} className="font-bold text-gray-900 text-lg hover:text-[#034EA2] line-clamp-1">{item.title}</Link>
                                            <span className="font-extrabold text-[#034EA2]">{item.price === 0 ? 'Tặng Free' : item.price.toLocaleString() + ' đ'}</span>
                                        </div>
                                        
                                        <div className="flex items-center gap-3 mt-3 text-xs text-gray-400 font-medium">
                                            <span className="bg-gray-100 px-2 py-1 rounded text-gray-600">{item.category}</span>
                                            <span className="flex items-center"><Eye className="w-3 h-3 mr-1"/> {item.view_count || 0} lượt xem</span>
                                            <span>• {new Date(item.postedAt).toLocaleDateString('vi-VN')}</span>
                                        </div>
                                    </div>

                                    {/* Actions Section */}
                                    <div className="mt-4 pt-4 border-t border-gray-50 flex justify-end items-center gap-2">
                                        {activeTab === 'selling' ? (
                                            <>
                                                <button 
                                                    onClick={() => navigate(`/edit-item/${item.id}`)}
                                                    className="text-xs font-bold px-3 py-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 flex items-center transition-colors"
                                                >
                                                    <Edit3 className="w-3.5 h-3.5 mr-1"/> Sửa tin
                                                </button>

                                                <button 
                                                    onClick={() => handleStatusToggle(item)}
                                                    className={`text-xs font-bold px-3 py-2 rounded-lg flex items-center transition ${item.status === ProductStatus.SOLD ? 'bg-green-50 text-green-600 hover:bg-green-100' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                                                >
                                                    {item.status === ProductStatus.SOLD ? <><CheckCircle2 className="w-3 h-3 mr-1"/> Đăng bán lại</> : <><XCircle className="w-3 h-3 mr-1"/> Đã bán</>}
                                                </button>
                                                
                                                <button 
                                                    onClick={() => requestDelete(item.id, false)} 
                                                    className="p-2 text-gray-400 hover:text-red-500 transition-colors" 
                                                    title="Xóa tin"
                                                >
                                                    <Trash2 className="w-4 h-4"/>
                                                </button>
                                            </>
                                        ) : (
                                            <button 
                                                onClick={() => requestDelete(item.id, true)} 
                                                className="text-xs font-bold px-3 py-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 flex items-center"
                                            >
                                                <Heart className="w-3 h-3 mr-1 fill-current"/> Bỏ lưu
                                            </button>
                                        )}
                                        
                                        <div className="w-[1px] h-4 bg-gray-200 mx-1"></div>
                                        
                                        <Link to={`/product/${item.id}`} className="text-xs font-bold px-4 py-2 rounded-lg bg-[#034EA2] text-white hover:bg-[#003875] flex items-center">
                                            Xem <ChevronRight className="w-3 h-3 ml-1"/>
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
