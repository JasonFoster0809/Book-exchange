import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Trash2, ShieldCheck, Users, Package, Flag, XCircle, AlertTriangle, 
  ExternalLink, RefreshCw, Check, X, Clock, BarChart3, Search, Ban, Unlock, 
  TrendingUp, Activity, Loader2, Filter
} from 'lucide-react';
import { Product, DBProfile } from '../types';
import { useToast } from '../contexts/ToastContext';

interface AdminUserProfile extends DBProfile {
  banned?: boolean; 
  email?: string;
}

interface ReportData {
  id: string; reporter_id: string; product_id: string; reason: string; status: 'pending' | 'resolved' | 'dismissed'; created_at: string;
  reporter?: DBProfile; product?: Product;
}

interface VerificationRequest {
  id: string; user_id: string; image_url: string; status: 'pending' | 'approved' | 'rejected'; created_at: string;
  profiles: { name: string; email: string; student_id: string; avatar_url: string; };
}

const AdminPage: React.FC = () => {
  const { user, loading, isAdmin } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [products, setProducts] = useState<Product[]>([]);
  const [usersList, setUsersList] = useState<AdminUserProfile[]>([]);
  const [reports, setReports] = useState<ReportData[]>([]);
  const [verifications, setVerifications] = useState<VerificationRequest[]>([]);
  
  const [activeTab, setActiveTab] = useState<'dashboard' | 'reports' | 'products' | 'users' | 'verifications'>('dashboard');
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // --- 1. KIỂM TRA QUYỀN TRUY CẬP ---
  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      addToast("Bạn không có quyền truy cập trang quản trị!", "error");
      navigate('/');
    } else if (!loading && isAdmin) {
      fetchData();
    }
  }, [loading, user, isAdmin, navigate]);

  // --- 2. LẤY DỮ LIỆU TỔNG HỢP ---
  const fetchData = async () => {
    setIsLoadingData(true);
    try {
      const [prodRes, userRes, reportRes, verifyRes] = await Promise.all([
        supabase.from('products').select('*').order('posted_at', { ascending: false }),
        supabase.from('profiles').select('*').order('created_at', { ascending: false }),
        supabase.from('reports').select('*, profiles:reporter_id(*), products:product_id(*)').order('created_at', { ascending: false }),
        supabase.from('verification_requests').select('*, profiles:user_id(name, email, student_id, avatar_url)').eq('status', 'pending')
      ]);

      if (prodRes.data) setProducts(prodRes.data.map((p: any) => ({ ...p, sellerId: p.seller_id, postedAt: p.posted_at })));
      if (userRes.data) setUsersList(userRes.data);
      if (reportRes.data) setReports(reportRes.data.map((r: any) => ({ ...r, reporter: r.profiles, product: r.products })));
      if (verifyRes.data) setVerifications(verifyRes.data);
    } catch (err) {
      addToast("Lỗi đồng bộ dữ liệu hệ thống", "error");
    } finally {
      setIsLoadingData(false);
    }
  };

  // --- 3. HÀNH ĐỘNG XÓA SẢN PHẨM VĨNH VIỄN ---
  const handleDeleteProduct = async (id: string) => {
    if (!window.confirm("XÁC NHẬN: Xóa vĩnh viễn bài đăng này khỏi hệ thống?")) return;
    try {
      // Nhờ ON DELETE CASCADE trong SQL, các bảng tin lưu/báo cáo sẽ tự xóa theo
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
      
      setProducts(prev => prev.filter(p => p.id !== id));
      setReports(prev => prev.filter(r => r.product_id !== id));
      addToast("Đã xóa sản phẩm thành công", "success");
    } catch (err: any) {
      addToast("Lỗi xóa sản phẩm: " + err.message, "error");
    }
  };

  // --- 4. HÀNH ĐỘNG XÓA NGƯỜI DÙNG VĨNH VIỄN (CASCADE) ---
  const handleDeleteUserCompletely = async (userId: string) => {
    if (userId === user?.id) return addToast("Bạn không thể tự xóa chính mình!", "warning");
    
    const confirm = window.confirm("CẢNH BÁO: Hành động này sẽ xóa sạch Profile, Toàn bộ sản phẩm, Tin nhắn và Bình luận của người dùng này. Bạn chắc chắn chứ?");
    if (!confirm) return;

    try {
      // Chỉ cần xóa ở bảng profiles, SQL CASCADE sẽ lo phần còn lại
      const { error } = await supabase.from('profiles').delete().eq('id', userId);
      if (error) throw error;

      setUsersList(prev => prev.filter(u => u.id !== userId));
      // Dọn dẹp cả list sản phẩm/báo cáo đang hiển thị nếu thuộc user này
      setProducts(prev => prev.filter(p => p.sellerId !== userId));
      
      addToast("Đã dọn dẹp sạch sẽ dữ liệu người dùng", "success");
    } catch (err: any) {
      addToast("Lỗi xóa người dùng: " + err.message, "error");
    }
  };

  // --- 5. HÀNH ĐỘNG KHÓA (BAN) USER ---
  const handleToggleBan = async (userId: string, currentBanned: boolean) => {
    if (userId === user?.id) return addToast("Không thể khóa chính mình!", "warning");
    
    const action = currentBanned ? "Mở khóa" : "KHÓA";
    if (!window.confirm(`Xác nhận ${action} tài khoản này?`)) return;
    
    try {
      const { error } = await supabase.from('profiles').update({ banned: !currentBanned }).eq('id', userId);
      if (error) throw error;
      
      setUsersList(prev => prev.map(u => u.id === userId ? { ...u, banned: !currentBanned } : u));
      addToast(`Đã ${action} người dùng`, "success");
    } catch (err: any) {
      addToast("Lỗi: " + err.message, "error");
    }
  };

  // --- 6. DUYỆT BÁO CÁO VI PHẠM ---
  const handleResolveReport = async (reportId: string, productId: string) => {
    try {
      await handleDeleteProduct(productId);
      await supabase.from('reports').update({ status: 'resolved' }).eq('id', reportId);
      setReports(prev => prev.map(r => r.id === reportId ? { ...r, status: 'resolved' } : r));
    } catch (err: any) {
      addToast("Lỗi xử lý báo cáo", "error");
    }
  };

  const filteredProducts = products.filter(p => p.title.toLowerCase().includes(searchTerm.toLowerCase()));

  if (loading || isLoadingData) return (
    <div className="min-h-screen flex items-center justify-center bg-white"><Loader2 className="w-10 h-10 animate-spin text-indigo-600" /></div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-10 font-sans">
      {/* HEADER QUẢN TRỊ */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight flex items-center uppercase">
            <ShieldCheck className="w-10 h-10 mr-3 text-red-600"/> Hệ thống Admin
          </h1>
          <p className="text-gray-500 font-medium mt-1 ml-1">Kiểm soát nội dung và người dùng hệ thống BK Market</p>
        </div>
        <div className="flex gap-3">
          <button onClick={fetchData} className="p-3 bg-gray-100 rounded-2xl hover:bg-gray-200 transition"><RefreshCw size={20}/></button>
          <Link to="/" className="flex items-center gap-2 bg-gray-900 text-white px-6 py-3 rounded-2xl font-bold hover:bg-black transition">
            <ExternalLink size={18}/> Ra Trang Chủ
          </Link>
        </div>
      </div>

      {/* TABS NAVIGATION */}
      <div className="flex gap-2 mb-8 bg-gray-100/50 p-1.5 rounded-[2rem] w-fit overflow-x-auto max-w-full">
        {[
          { id: 'dashboard', label: 'Bảng tin', icon: BarChart3 },
          { id: 'reports', label: 'Báo cáo', icon: Flag, count: reports.filter(r => r.status==='pending').length },
          { id: 'verifications', label: 'Duyệt SV', icon: ShieldCheck, count: verifications.length },
          { id: 'products', label: 'Bài đăng', icon: Package },
          { id: 'users', label: 'Thành viên', icon: Users },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-6 py-3 rounded-[1.5rem] font-bold text-sm transition-all whitespace-nowrap ${
              activeTab === tab.id ? 'bg-white text-indigo-600 shadow-sm border' : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            <tab.icon size={18}/> {tab.label}
            {tab.count ? <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full ml-1">{tab.count}</span> : null}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-[2.5rem] border shadow-sm overflow-hidden min-h-[500px]">
        
        {/* TAB: DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div className="p-10 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-8 bg-blue-50 rounded-[2rem] border border-blue-100">
              <Users className="text-blue-600 mb-3" size={32} />
              <p className="text-gray-500 text-xs font-black uppercase tracking-widest">Người dùng</p>
              <p className="text-4xl font-black text-gray-900">{usersList.length}</p>
            </div>
            <div className="p-8 bg-indigo-50 rounded-[2rem] border border-indigo-100">
              <Package className="text-indigo-600 mb-3" size={32} />
              <p className="text-gray-500 text-xs font-black uppercase tracking-widest">Sản phẩm</p>
              <p className="text-4xl font-black text-gray-900">{products.length}</p>
            </div>
            <div className="p-8 bg-red-50 rounded-[2rem] border border-red-100">
              <AlertTriangle className="text-red-600 mb-3" size={32} />
              <p className="text-gray-500 text-xs font-black uppercase tracking-widest">Báo cáo vi phạm</p>
              <p className="text-4xl font-black text-gray-900">{reports.length}</p>
            </div>
          </div>
        )}

        {/* TAB: REPORTS */}
        {activeTab === 'reports' && (
          <div className="divide-y divide-gray-50">
            {reports.length === 0 ? (
              <div className="p-20 text-center text-gray-400 font-bold italic">Không có báo cáo nào cần xử lý.</div>
            ) : (
              reports.map(r => (
                <div key={r.id} className={`p-8 flex gap-8 hover:bg-gray-50 transition ${r.status !== 'pending' ? 'opacity-40 bg-gray-50' : ''}`}>
                  <div className="w-20 h-20 rounded-2xl bg-gray-100 overflow-hidden border flex-shrink-0">
                    {r.product?.images?.[0] ? <img src={r.product.images[0]} className="w-full h-full object-cover"/> : <Package className="w-full h-full p-6 text-gray-300"/>}
                  </div>
                  <div className="flex-1">
                    <div className="flex gap-2 mb-2">
                      <span className="bg-red-100 text-red-700 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-tighter border border-red-200">{r.reason}</span>
                      <span className="text-xs text-gray-400">{new Date(r.created_at).toLocaleDateString()}</span>
                    </div>
                    <h3 className="font-bold text-gray-900 text-lg">{r.product?.title || 'Sản phẩm đã bị xóa trước đó'}</h3>
                    <p className="text-xs text-gray-500">Báo cáo bởi: <span className="font-bold text-gray-700">{r.reporter?.name}</span></p>
                  </div>
                  {r.status === 'pending' && r.product && (
                    <div className="flex flex-col gap-2 min-w-[120px]">
                      <button onClick={() => handleResolveReport(r.id, r.product_id)} className="bg-red-600 text-white py-3 rounded-2xl text-xs font-black hover:bg-red-700">XÓA BÀI</button>
                      <button onClick={() => supabase.from('reports').update({status:'dismissed'}).eq('id', r.id).then(fetchData)} className="bg-gray-100 text-gray-500 py-3 rounded-2xl text-xs font-black hover:bg-gray-200 transition">BỎ QUA</button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* TAB: PRODUCTS */}
        {activeTab === 'products' && (
          <div className="p-6">
            <div className="relative mb-6">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" size={20}/>
              <input type="text" placeholder="Tìm kiếm tên sản phẩm..." className="w-full pl-14 pr-6 py-4 bg-gray-50 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-50 transition" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50/50">
                  <tr className="text-gray-400 text-[10px] font-black uppercase tracking-widest border-b">
                    <th className="p-5">Sản phẩm</th>
                    <th className="p-5">Giá</th>
                    <th className="p-5">Ngày đăng</th>
                    <th className="p-5 text-right">Hành động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredProducts.map(p => (
                    <tr key={p.id} className="hover:bg-gray-50 transition group">
                      <td className="p-5 flex items-center gap-4">
                        <img src={p.images[0]} className="w-12 h-12 rounded-xl object-cover border" />
                        <div>
                          <p className="font-bold text-gray-900 line-clamp-1">{p.title}</p>
                          <p className="text-[10px] text-gray-400 font-bold uppercase">{p.category}</p>
                        </div>
                      </td>
                      <td className="p-5 font-bold text-indigo-600">{p.price.toLocaleString()}đ</td>
                      <td className="p-5 text-xs text-gray-400 font-medium">{new Date(p.postedAt).toLocaleDateString()}</td>
                      <td className="p-5 text-right">
                        <button onClick={() => handleDeleteProduct(p.id)} className="p-3 text-red-500 hover:bg-red-50 rounded-2xl transition"><Trash2 size={20}/></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB: USERS */}
        {activeTab === 'users' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
                <thead className="bg-gray-50/50">
                  <tr className="text-gray-400 text-[10px] font-black uppercase tracking-widest border-b">
                    <th className="p-6">Thành viên</th>
                    <th className="p-6">MSSV</th>
                    <th className="p-6">Vai trò</th>
                    <th className="p-6 text-right">Thao tác quản trị</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {usersList.map(u => (
                    <tr key={u.id} className={`hover:bg-gray-50 transition ${u.banned ? 'bg-red-50/20' : ''}`}>
                      <td className="p-6 flex items-center gap-4">
                        <img src={u.avatar_url || `https://ui-avatars.com/api/?name=${u.name}`} className="w-12 h-12 rounded-full border shadow-sm"/>
                        <div>
                          <p className="font-bold text-gray-900">{u.name}</p>
                          <p className="text-xs text-gray-400 font-medium italic">{u.email}</p>
                        </div>
                      </td>
                      <td className="p-6 font-mono font-black text-gray-500 uppercase tracking-tighter">{u.student_id || 'Chưa cập nhật'}</td>
                      <td className="p-6">
                        <span className={`text-[10px] font-black px-3 py-1 rounded-full border ${u.role === 'admin' ? 'bg-purple-100 text-purple-700 border-purple-200' : 'bg-blue-50 text-blue-700 border-blue-100'}`}>
                          {u.role?.toUpperCase()}
                        </span>
                      </td>
                      <td className="p-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {u.role !== 'admin' && (
                            <>
                              <button 
                                onClick={() => handleToggleBan(u.id, !!u.banned)} 
                                className={`px-5 py-2.5 rounded-2xl text-xs font-black transition shadow-sm ${
                                  u.banned ? 'bg-green-600 text-white hover:bg-green-700 shadow-green-100' : 'bg-red-100 text-red-600 hover:bg-red-200 shadow-red-100'
                                }`}
                              >
                                {u.banned ? <><Unlock className="inline mr-1" size={14}/> MỞ KHÓA</> : <><Ban className="inline mr-1" size={14}/> KHÓA</>}
                              </button>
                              
                              <button 
                                onClick={() => handleDeleteUserCompletely(u.id)}
                                className="p-2.5 bg-gray-100 text-gray-400 hover:bg-red-600 hover:text-white rounded-2xl transition border border-transparent hover:border-red-700 shadow-sm"
                                title="Xóa vĩnh viễn khỏi Database"
                              >
                                <Trash2 size={18}/>
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
            </table>
          </div>
        )}

        {/* TAB: VERIFICATIONS */}
        {activeTab === 'verifications' && (
           <div className="p-8">
              {verifications.length === 0 ? (
                <div className="text-center py-20 text-gray-400 font-bold italic">Tất cả yêu cầu đã được duyệt.</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {verifications.map(req => (
                    <div key={req.id} className="p-6 bg-gray-50 rounded-[2rem] border-2 border-transparent hover:border-indigo-100 transition shadow-sm">
                      <div className="flex gap-4 mb-6">
                         <img src={req.profiles.avatar_url} className="w-14 h-14 rounded-full border shadow-sm" />
                         <div>
                            <p className="font-bold text-gray-900 text-lg">{req.profiles.name}</p>
                            <p className="text-xs text-gray-500 font-medium italic">MSSV: {req.profiles.student_id}</p>
                         </div>
                      </div>
                      <div className="aspect-video bg-black rounded-3xl overflow-hidden mb-6 group cursor-zoom-in" onClick={() => window.open(req.image_url)}>
                         <img src={req.image_url} className="w-full h-full object-contain group-hover:scale-105 transition duration-500" />
                      </div>
                      <div className="flex gap-3">
                         <button onClick={() => supabase.from('verification_requests').update({status:'approved'}).eq('id', req.id).then(() => supabase.from('profiles').update({is_verified:true}).eq('id', req.user_id)).then(fetchData)} className="flex-1 bg-green-600 text-white py-4 rounded-2xl font-black text-sm hover:bg-green-700 transition shadow-lg shadow-green-100 uppercase">Duyệt</button>
                         <button onClick={() => supabase.from('verification_requests').update({status:'rejected'}).eq('id', req.id).then(fetchData)} className="flex-1 bg-white border-2 border-red-100 text-red-600 py-4 rounded-2xl font-black text-sm hover:bg-red-50 transition uppercase">Từ chối</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
           </div>
        )}
      </div>
    </div>
  );
};

export default AdminPage;