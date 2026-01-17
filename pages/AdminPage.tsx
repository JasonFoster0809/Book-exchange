import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Users, Package, AlertTriangle, 
  Search, LogOut, CheckCircle, Trash2, 
  Shield, Ban, Eye, ChevronLeft, ChevronRight,
  X, DollarSign, AlertCircle
} from "lucide-react";
import { supabase } from "../services/supabase";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";

// ============================================================================
// 1. CONFIG & UTILS
// ============================================================================
const ITEMS_PER_PAGE = 10;

// Helper: Lấy dữ liệu nested an toàn (tránh lỗi undefined/null)
const safeGet = (data: any, field: string, fallback = "N/A") => {
  if (!data) return fallback;
  if (Array.isArray(data) && data.length > 0) return data[0]?.[field] || fallback;
  if (typeof data === 'object') return data?.[field] || fallback;
  return fallback;
};

const formatCurrency = (amount: number) => 
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);

const formatDate = (dateString: string) => 
  new Date(dateString).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

const getBanStatus = (bannedUntil: string | null) => {
  if (!bannedUntil) return { label: 'Hoạt động', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', isBanned: false };
  const now = new Date();
  const banDate = new Date(bannedUntil);
  if (banDate > now) {
    const diff = Math.ceil((banDate.getTime() - now.getTime()) / (86400000));
    return { 
      label: diff > 3650 ? 'Vĩnh viễn' : `Khóa ${diff} ngày`, 
      color: 'bg-rose-100 text-rose-700 border-rose-200',
      isBanned: true
    };
  }
  return { label: 'Hoạt động', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', isBanned: false };
};

// ============================================================================
// 2. STYLES
// ============================================================================
const VisualEngine = () => (
  <style>{`
    :root { --primary: #0F172A; --accent: #3B82F6; --bg: #F8FAFC; --border: #E2E8F0; }
    body { background-color: var(--bg); color: #334155; font-family: 'Inter', sans-serif; }
    
    .admin-layout { display: flex; height: 100vh; overflow: hidden; }
    .sidebar { width: 260px; background: var(--primary); color: #94A3B8; display: flex; flex-direction: column; flex-shrink: 0; }
    .main-content { flex: 1; display: flex; flex-direction: column; background: var(--bg); overflow: hidden; }
    
    .sidebar-item { display: flex; items-center; gap: 12px; padding: 14px 24px; font-weight: 500; cursor: pointer; border-left: 3px solid transparent; transition: all 0.2s; }
    .sidebar-item:hover { background: rgba(255,255,255,0.05); color: #fff; }
    .sidebar-item.active { background: rgba(59, 130, 246, 0.1); color: #fff; border-left-color: var(--accent); }

    .stat-card { background: #fff; padding: 24px; border-radius: 16px; border: 1px solid var(--border); box-shadow: 0 2px 4px rgba(0,0,0,0.02); }
    
    .table-container { background: #fff; border-radius: 12px; border: 1px solid var(--border); overflow: hidden; }
    .data-table { width: 100%; border-collapse: collapse; text-align: left; }
    .data-table th { background: #F8FAFC; padding: 16px 24px; font-size: 12px; font-weight: 700; color: #64748B; border-bottom: 1px solid var(--border); text-transform: uppercase; }
    .data-table td { padding: 16px 24px; border-bottom: 1px solid var(--border); font-size: 14px; vertical-align: middle; }
    .data-table tr:hover { background-color: #F1F5F9; }

    .search-input { width: 100%; padding: 10px 16px 10px 44px; border: 1px solid var(--border); border-radius: 10px; outline: none; font-size: 14px; transition: all 0.2s; }
    .search-input:focus { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1); }

    .modal-overlay { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(4px); z-index: 50; display: flex; align-items: center; justify-content: center; animation: fadeIn 0.2s; }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    .modal-content { background: #fff; border-radius: 16px; width: 100%; max-width: 420px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1); overflow: hidden; animation: scaleIn 0.2s; }
    @keyframes scaleIn { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
    
    .skeleton-bar { height: 50px; background: #F1F5F9; margin-bottom: 2px; animation: pulse 1.5s infinite; }
    @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.6; } 100% { opacity: 1; } }
  `}</style>
);

// ============================================================================
// 3. COMPONENTS
// ============================================================================

const StatCard = ({ title, value, icon: Icon, colorClass }: any) => (
  <div className="stat-card flex items-start justify-between hover:translate-y-[-2px] transition-transform duration-300">
    <div><p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">{title}</p><h3 className="text-3xl font-black text-slate-800">{value}</h3></div>
    <div className={`p-3 rounded-xl ${colorClass} bg-opacity-10 text-opacity-100`}><Icon size={24} /></div>
  </div>
);

const ConfirmDialog = ({ isOpen, title, message, type, onConfirm, onClose }: any) => {
  if (!isOpen) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content p-6 text-center" onClick={e => e.stopPropagation()}>
        <div className={`w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center ${type === 'danger' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
          {type === 'danger' ? <AlertCircle size={28}/> : <CheckCircle size={28}/>}
        </div>
        <h3 className="text-xl font-bold text-slate-900 mb-2">{title}</h3>
        <p className="text-slate-500 text-sm mb-8">{message}</p>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 border border-slate-300 rounded-lg font-bold text-slate-600 hover:bg-slate-50">Hủy</button>
          <button onClick={() => { onConfirm(); onClose(); }} className={`flex-1 py-2.5 rounded-lg font-bold text-white shadow-lg ${type === 'danger' ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}`}>Xác nhận</button>
        </div>
      </div>
    </div>
  );
};

const BanDialog = ({ isOpen, userName, onConfirm, onClose }: any) => {
  if (!isOpen) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="p-5 border-b border-slate-100 flex justify-between items-center">
          <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2"><Ban size={20} className="text-red-500"/> Khóa tài khoản</h3>
          <button onClick={onClose}><X size={20} className="text-slate-400 hover:text-slate-600"/></button>
        </div>
        <div className="p-6">
          <p className="text-sm text-slate-500 mb-4">Chọn thời gian khóa cho <strong>{userName}</strong>:</p>
          <div className="grid grid-cols-2 gap-3 mb-6">
            {[{l:"1 Ngày", v:1}, {l:"3 Ngày", v:3}, {l:"1 Tuần", v:7}, {l:"1 Tháng", v:30}, {l:"Vĩnh viễn", v:3650}].map((opt) => (
              <button key={opt.v} onClick={() => { onConfirm(opt.v); onClose(); }} className="py-2.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:border-red-500 hover:text-red-600 hover:bg-red-50 transition-all">{opt.l}</button>
            ))}
          </div>
          <button onClick={onClose} className="w-full text-center text-xs font-bold text-slate-400 hover:text-slate-600 uppercase tracking-wide">Hủy bỏ thao tác</button>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 4. MAIN PAGE
// ============================================================================
const AdminPage = () => {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [activeTab, setActiveTab] = useState<'dashboard' | 'users' | 'products' | 'reports'>('dashboard');
  const [stats, setStats] = useState({ totalUsers: 0, totalProducts: 0, pendingReports: 0, marketValue: 0 });
  const [dataList, setDataList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  
  const [modal, setModal] = useState({ isOpen: false, title: "", message: "", type: "info", onConfirm: () => {} });
  const [banModal, setBanModal] = useState({ isOpen: false, userId: null, userName: "" });

  // Security Check (Nếu cần kích hoạt, bỏ comment)
  /*
  useEffect(() => {
    if (!user || !isAdmin) {
      addToast("Bạn không có quyền truy cập!", "error");
      navigate("/");
    }
  }, [user, isAdmin, navigate]);
  */

  // Fetch Stats (Dashboard)
  const fetchStats = async () => {
    setLoading(true);
    try {
      const [u, p, r, price] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('products').select('*', { count: 'exact', head: true }),
        supabase.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('products').select('price').eq('status', 'available')
      ]);
      const totalVal = price.data?.reduce((sum, item) => sum + (item.price || 0), 0) || 0;
      setStats({ totalUsers: u.count || 0, totalProducts: p.count || 0, pendingReports: r.count || 0, marketValue: totalVal });
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  // Fetch List Data
  const fetchDataList = useCallback(async () => {
    setLoading(true);
    const from = page * ITEMS_PER_PAGE;
    const to = from + ITEMS_PER_PAGE - 1;
    
    try {
      let query;
      // USERS
      if (activeTab === 'users') {
        query = supabase.from('profiles').select('*').order('created_at', { ascending: false }).range(from, to);
        if (search) query = query.ilike('email', `%${search}%`);
      } 
      // PRODUCTS
      else if (activeTab === 'products') {
        // Lưu ý: Cần Foreign Key 'products.seller_id' -> 'profiles.id'
        query = supabase.from('products')
          .select('*, seller:profiles(name, email)') 
          .order('created_at', { ascending: false }).range(from, to);
        
        if (search) query = query.ilike('title', `%${search}%`);
      } 
      // REPORTS
      else if (activeTab === 'reports') {
        query = supabase.from('reports')
          .select('*, reporter:profiles!reporter_id(name), product:products(id, title)') 
          .order('created_at', { ascending: false }).range(from, to);
      }

      if (query) {
        const { data, error } = await query;
        if (error) throw error;
        setDataList(data || []);
      }
    } catch (err: any) {
      console.error("Lỗi tải dữ liệu:", err);
      // Xử lý lỗi nếu chưa setup Foreign Key
      if (err.code === "PGRST200" || err.code === "42P01") {
         addToast("Lỗi Database: Chưa liên kết bảng (Foreign Key).", "error");
      }
    } finally {
      setLoading(false);
    }
  }, [activeTab, page, search, addToast]);

  useEffect(() => {
    if (activeTab === 'dashboard') fetchStats();
    else fetchDataList();
  }, [activeTab, page, search, fetchDataList]);

  // Handlers
  const handleBan = async (id: string, days: number | null) => {
    const banUntil = days ? new Date(Date.now() + days * 86400000).toISOString() : null;
    try {
      await supabase.from('profiles').update({ banned_until: banUntil }).eq('id', id);
      addToast(days ? "Đã khóa tài khoản" : "Đã mở khóa", "success");
      fetchDataList();
    } catch (e) { addToast("Lỗi cập nhật", "error"); }
  };

  const deleteItem = async (id: string, table: 'products' | 'reports') => {
    try {
      await supabase.from(table).delete().eq('id', id);
      addToast("Đã xóa thành công", "success");
      fetchDataList();
    } catch (e) { addToast("Lỗi xóa dữ liệu", "error"); }
  };

  const resolveReport = async (id: string, status: string) => {
    try {
      await supabase.from('reports').update({ status }).eq('id', id);
      addToast("Đã cập nhật trạng thái", "success");
      fetchDataList();
    } catch (e) { addToast("Lỗi cập nhật", "error"); }
  };

  // --- RENDER ---
  return (
    <div className="admin-layout">
      <VisualEngine />
      <ConfirmDialog {...modal} onClose={() => setModal({ ...modal, isOpen: false })} />
      <BanDialog {...banModal} onClose={() => setBanModal({ ...banModal, isOpen: false })} onConfirm={(d: number) => handleBan(banModal.userId, d)} />

      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="h-16 flex items-center px-6 border-b border-slate-700/50">
          <Shield className="text-blue-500 mr-3" size={24}/> 
          <span className="font-bold text-white text-lg tracking-tight">ADMIN CP</span>
        </div>
        <nav className="flex-1 py-6 space-y-1">
          {[
            { id: 'dashboard', label: 'Tổng quan', icon: LayoutDashboard },
            { id: 'users', label: 'Thành viên', icon: Users },
            { id: 'products', label: 'Tin đăng', icon: Package },
            { id: 'reports', label: 'Khiếu nại', icon: AlertTriangle },
          ].map((item) => (
            <div key={item.id} onClick={() => { setActiveTab(item.id as any); setPage(0); setSearch(""); }} className={`sidebar-item ${activeTab === item.id ? 'active' : ''}`}>
              <item.icon size={18} /> {item.label}
              {item.id === 'reports' && stats.pendingReports > 0 && <span className="ml-auto bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full">{stats.pendingReports}</span>}
            </div>
          ))}
        </nav>
        <div className="p-4 border-t border-slate-700/50">
          <button onClick={() => navigate('/')} className="w-full flex items-center justify-center gap-2 py-3 rounded-lg border border-slate-600 text-slate-400 hover:text-white hover:border-slate-400 text-sm font-bold transition-colors">
            <LogOut size={16}/> Về trang chủ
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <main className="main-content">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 sticky top-0 z-20">
          <h2 className="text-xl font-bold text-slate-800 capitalize">{activeTab === 'dashboard' ? 'Dashboard' : `Quản lý ${activeTab}`}</h2>
          <div className="flex items-center gap-3">
            <div className="text-right hidden md:block">
              <p className="text-sm font-bold text-slate-700">{user?.name || 'Admin'}</p>
              <p className="text-xs text-slate-500 font-bold text-blue-600">Super Admin</p>
            </div>
            <img src={user?.avatar || "https://ui-avatars.com/api/?name=Admin"} className="w-9 h-9 rounded-full border border-slate-200"/>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 bg-[#F8FAFC]">
          {activeTab === 'dashboard' ? (
            <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard title="Thành viên" value={stats.totalUsers} icon={Users} colorClass="bg-blue-500 text-blue-600"/>
              <StatCard title="Tin đăng" value={stats.totalProducts} icon={Package} colorClass="bg-indigo-500 text-indigo-600"/>
              <StatCard title="Khiếu nại" value={stats.pendingReports} icon={AlertTriangle} colorClass="bg-rose-500 text-rose-600"/>
              <StatCard title="Giá trị sàn" value={new Intl.NumberFormat('vi-VN', { notation: "compact" }).format(stats.marketValue)} icon={DollarSign} colorClass="bg-emerald-500 text-emerald-600"/>
            </div>
          ) : (
            <div className="max-w-7xl mx-auto">
              <div className="flex justify-between items-center mb-6">
                <div className="relative w-80">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
                  <input className="search-input pl-11" placeholder="Tìm kiếm..." value={search} onChange={e => setSearch(e.target.value)}/>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0} className="p-2 bg-white border rounded-lg hover:bg-slate-50 disabled:opacity-50"><ChevronLeft size={18}/></button>
                  <span className="px-4 py-2 bg-white border rounded-lg text-sm font-bold text-slate-600 flex items-center">Trang {page + 1}</span>
                  <button onClick={() => setPage(page + 1)} disabled={dataList.length < ITEMS_PER_PAGE} className="p-2 bg-white border rounded-lg hover:bg-slate-50 disabled:opacity-50"><ChevronRight size={18}/></button>
                </div>
              </div>

              <div className="table-container">
                {loading ? (
                  <div className="p-6">{[...Array(6)].map((_, i) => <div key={i} className="skeleton-bar"/>)}</div>
                ) : (
                  <table className="data-table">
                    <thead>
                      <tr>
                        {activeTab === 'users' && <><th>Tên</th><th>Email</th><th>Ngày tạo</th><th>Trạng thái</th><th className="text-right">Hành động</th></>}
                        {activeTab === 'products' && <><th>Sản phẩm</th><th>Giá</th><th>Người bán</th><th>Ngày đăng</th><th className="text-right">Hành động</th></>}
                        {activeTab === 'reports' && <><th>Lý do</th><th>Người báo cáo</th><th>Sản phẩm</th><th>Trạng thái</th><th className="text-right">Hành động</th></>}
                      </tr>
                    </thead>
                    <tbody>
                      {activeTab === 'users' && dataList.map((u: any) => {
                        const { label, color, isBanned } = getBanStatus(u.banned_until);
                        return (
                          <tr key={u.id}>
                            <td className="font-bold">{u.name}</td>
                            <td className="text-slate-500">{u.email}</td>
                            <td>{formatDate(u.created_at)}</td>
                            <td><span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${color}`}>{label}</span></td>
                            <td className="text-right">
                              {u.role !== 'admin' && (
                                <button onClick={() => isBanned ? handleBan(u.id, null) : setBanModal({ isOpen: true, userId: u.id, userName: u.name })} className={`p-2 rounded-lg transition-colors ${isBanned ? 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100' : 'text-rose-600 bg-rose-50 hover:bg-rose-100'}`}>
                                  {isBanned ? <CheckCircle size={18}/> : <Ban size={18}/>}
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}

                      {activeTab === 'products' && dataList.map((p: any) => (
                        <tr key={p.id}>
                          <td className="font-bold max-w-xs truncate">{p.title}</td>
                          <td className="font-mono font-bold text-blue-600">{formatCurrency(p.price)}</td>
                          <td>{safeGet(p.seller, 'name', 'Ẩn danh')}</td>
                          <td>{formatDate(p.created_at)}</td>
                          <td className="text-right flex justify-end gap-2">
                            <button onClick={() => window.open(`#/product/${p.id}`, '_blank')} className="p-2 text-blue-500 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"><Eye size={18}/></button>
                            <button onClick={() => setModal({ isOpen: true, title: "Xóa tin?", message: "Hành động này không thể hoàn tác.", type: 'danger', onConfirm: () => deleteItem(p.id, 'products') })} className="p-2 text-rose-500 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors"><Trash2 size={18}/></button>
                          </td>
                        </tr>
                      ))}

                      {activeTab === 'reports' && dataList.map((r: any) => (
                        <tr key={r.id}>
                          <td className="font-bold text-rose-600">{r.reason}</td>
                          <td>{safeGet(r.reporter, 'name', 'Ẩn danh')}</td>
                          <td><a href={`#/product/${r.product?.id}`} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">{safeGet(r.product, 'title', 'SP đã xóa')}</a></td>
                          <td><span className={`text-xs font-bold px-2 py-1 rounded-full ${r.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-emerald-100 text-emerald-700'}`}>{r.status === 'pending' ? 'Chờ xử lý' : 'Đã xong'}</span></td>
                          <td className="text-right flex justify-end gap-2">
                            {r.status === 'pending' && (
                              <>
                                <button onClick={() => setModal({ isOpen: true, title: "Xóa bài viết?", message: "Bài viết bị tố cáo sẽ bị xóa vĩnh viễn.", type: 'danger', onConfirm: () => deleteItem(r.product?.id, 'products') })} className="p-2 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded transition-colors"><Trash2 size={16}/></button>
                                <button onClick={() => setModal({ isOpen: true, title: "Đánh dấu đã xong?", message: "Xác nhận đã xử lý báo cáo này.", type: 'success', onConfirm: () => resolveReport(r.id, 'resolved') })} className="p-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded transition-colors"><CheckCircle size={16}/></button>
                              </>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                {!loading && dataList.length === 0 && <div className="p-12 text-center text-slate-400">Không có dữ liệu hiển thị.</div>}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default AdminPage;
