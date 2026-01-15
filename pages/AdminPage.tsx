import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Users, Package, AlertTriangle, 
  Search, LogOut, CheckCircle, Trash2, 
  Shield, Ban, Eye, ChevronLeft, ChevronRight,
  Activity, TrendingUp, X, Filter, MoreHorizontal,
  Calendar, DollarSign, XCircle, AlertCircle
} from "lucide-react";
import { supabase } from "../services/supabase";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";

// ============================================================================
// 1. CONFIG & UTILS
// ============================================================================
const ITEMS_PER_PAGE = 10;

// Helper: Xử lý dữ liệu relation an toàn (tránh lỗi null/undefined/array)
const safeGet = (data: any, field: string, fallback = "N/A") => {
  if (!data) return fallback;
  if (Array.isArray(data)) return data[0]?.[field] || fallback;
  return data[field] || fallback;
};

// Helper: Format tiền
const formatCurrency = (amount: number) => 
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);

// Helper: Format ngày
const formatDate = (dateString: string) => 
  new Date(dateString).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });

// Helper: Check trạng thái Ban
const getBanStatus = (bannedUntil: string | null) => {
  if (!bannedUntil) return { isBanned: false, label: 'Hoạt động', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
  const now = new Date();
  const banDate = new Date(bannedUntil);
  if (banDate > now) {
    const diff = Math.ceil(Math.abs(banDate.getTime() - now.getTime()) / (86400000));
    return { 
      isBanned: true, 
      label: diff > 3650 ? 'Vĩnh viễn' : `Khóa ${diff} ngày`, 
      color: 'bg-rose-100 text-rose-700 border-rose-200' 
    };
  }
  return { isBanned: false, label: 'Hoạt động', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
};

// ============================================================================
// 2. VISUAL ENGINE (CSS)
// ============================================================================
const VisualEngine = () => (
  <style>{`
    :root { --primary: #0F172A; --accent: #3B82F6; --bg: #F8FAFC; --border: #E2E8F0; }
    body { background-color: var(--bg); color: #334155; font-family: 'Inter', sans-serif; }
    
    /* Layout Framework */
    .admin-layout { display: flex; height: 100vh; overflow: hidden; }
    .sidebar { width: 260px; background: var(--primary); color: #94A3B8; display: flex; flex-direction: column; flex-shrink: 0; transition: width 0.3s; }
    .main-content { flex: 1; display: flex; flex-direction: column; background: var(--bg); overflow: hidden; }
    
    /* Components */
    .sidebar-item { display: flex; items-center; gap: 12px; padding: 14px 24px; font-weight: 500; transition: all 0.2s; border-left: 3px solid transparent; cursor: pointer; }
    .sidebar-item:hover { background: rgba(255,255,255,0.05); color: #fff; }
    .sidebar-item.active { background: rgba(59, 130, 246, 0.1); color: #fff; border-left-color: var(--accent); }

    .stat-card { background: #fff; padding: 24px; border-radius: 16px; border: 1px solid var(--border); box-shadow: 0 1px 3px rgba(0,0,0,0.05); transition: transform 0.2s; }
    .stat-card:hover { transform: translateY(-2px); box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }

    /* Table Styles */
    .table-container { background: #fff; border-radius: 12px; border: 1px solid var(--border); overflow: hidden; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
    .data-table { width: 100%; border-collapse: collapse; text-align: left; }
    .data-table th { background: #F8FAFC; padding: 16px 24px; font-size: 12px; font-weight: 700; text-transform: uppercase; color: #64748B; border-bottom: 1px solid var(--border); }
    .data-table td { padding: 16px 24px; border-bottom: 1px solid var(--border); font-size: 14px; vertical-align: middle; }
    .data-table tr:last-child td { border-bottom: none; }
    .data-table tr:hover { background-color: #F1F5F9; }

    /* Input Fix (Padding Left) */
    .search-input { width: 100%; padding: 10px 16px 10px 44px; border: 1px solid var(--border); border-radius: 10px; outline: none; font-size: 14px; transition: all 0.2s; }
    .search-input:focus { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1); }

    /* Modals */
    .modal-overlay { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.5); backdrop-filter: blur(4px); z-index: 50; display: flex; align-items: center; justify-content: center; animation: fadeIn 0.2s; }
    .modal-content { background: #fff; border-radius: 16px; width: 100%; max-width: 420px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1); overflow: hidden; animation: scaleIn 0.2s; }
    
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes scaleIn { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
    
    .skeleton-bar { height: 56px; background: #F1F5F9; margin-bottom: 2px; animation: pulse 1.5s infinite; }
    @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.6; } 100% { opacity: 1; } }
  `}</style>
);

// ============================================================================
// 3. COMPONENTS
// ============================================================================

const StatCard = ({ title, value, icon: Icon, colorClass }: any) => (
  <div className="stat-card flex items-start justify-between">
    <div>
      <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">{title}</p>
      <h3 className="text-3xl font-black text-slate-800">{value}</h3>
    </div>
    <div className={`p-3 rounded-xl ${colorClass} bg-opacity-10 text-opacity-100`}>
      <Icon size={24} />
    </div>
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
        <p className="text-slate-500 text-sm mb-8 leading-relaxed">{message}</p>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 border border-slate-300 rounded-lg font-bold text-slate-600 hover:bg-slate-50">Hủy bỏ</button>
          <button onClick={onConfirm} className={`flex-1 py-2.5 rounded-lg font-bold text-white shadow-lg ${type === 'danger' ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}`}>Xác nhận</button>
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
          <p className="text-sm text-slate-500 mb-4">Chọn thời gian khóa đối với <strong>{userName}</strong>:</p>
          <div className="grid grid-cols-2 gap-3 mb-6">
            {[{l:"1 Ngày", v:1}, {l:"3 Ngày", v:3}, {l:"1 Tuần", v:7}, {l:"1 Tháng", v:30}, {l:"Vĩnh viễn", v:3650}].map((opt) => (
              <button key={opt.v} onClick={() => onConfirm(opt.v)} className="py-2.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:border-red-500 hover:text-red-600 hover:bg-red-50 transition-all">{opt.l}</button>
            ))}
          </div>
          <button onClick={onClose} className="w-full text-center text-xs font-bold text-slate-400 hover:text-slate-600 uppercase tracking-wide">Hủy bỏ thao tác</button>
        </div>
      </div>
    </div>
  );
};

const TableSkeleton = () => (
  <div className="w-full animate-pulse rounded-lg overflow-hidden">
    {[...Array(6)].map((_, i) => <div key={i} className="skeleton-bar bg-slate-100"></div>)}
  </div>
);

// ============================================================================
// 4. MAIN ADMIN PAGE
// ============================================================================
const AdminPage = () => {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { addToast } = useToast();

  // --- STATE ---
  const [activeTab, setActiveTab] = useState<'dashboard' | 'users' | 'products' | 'reports'>('dashboard');
  const [stats, setStats] = useState({ totalUsers: 0, totalProducts: 0, pendingReports: 0, marketValue: 0 });
  
  // Data Lists
  const [dataList, setDataList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");

  // Modals
  const [modal, setModal] = useState({ isOpen: false, title: "", message: "", type: "info", onConfirm: () => {} });
  const [banModal, setBanModal] = useState({ isOpen: false, userId: null, userName: "" });

  // --- SECURITY CHECK ---
  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      addToast("Không có quyền truy cập", "error");
      navigate("/");
    }
  }, [user, isAdmin, loading, navigate]);

  // --- FETCHING LOGIC ---
  const fetchStats = async () => {
    try {
      const [u, p, r, val] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('products').select('*', { count: 'exact', head: true }),
        supabase.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('products').select('price').eq('status', 'available')
      ]);
      const totalVal = val.data?.reduce((sum, item) => sum + (item.price || 0), 0) || 0;
      setStats({ totalUsers: u.count || 0, totalProducts: p.count || 0, pendingReports: r.count || 0, marketValue: totalVal });
    } catch (e) { console.error(e); }
  };

  const fetchDataList = useCallback(async () => {
    setLoading(true);
    const from = page * ITEMS_PER_PAGE;
    const to = from + ITEMS_PER_PAGE - 1;
    
    try {
      let query;
      if (activeTab === 'users') {
        query = supabase.from('profiles').select('*').order('created_at', { ascending: false }).range(from, to);
        if (searchTerm) query = query.ilike('email', `%${searchTerm}%`);
      } else if (activeTab === 'products') {
        // Fix: Query đúng relation
        query = supabase.from('products').select('*, seller:profiles(name)').order('created_at', { ascending: false }).range(from, to);
        if (searchTerm) query = query.ilike('title', `%${searchTerm}%`);
      } else if (activeTab === 'reports') {
        query = supabase.from('reports').select('*, reporter:profiles!reporter_id(name), product:products(id, title)').order('created_at', { ascending: false }).range(from, to);
      }

      if (query) {
        const { data, error } = await query;
        if (error) throw error;
        setDataList(data || []);
      }
    } catch (e) { console.error(e); } 
    finally { setLoading(false); }
  }, [activeTab, page, searchTerm]);

  useEffect(() => {
    if (activeTab === 'dashboard') fetchStats();
    else fetchDataList();
  }, [activeTab, page, searchTerm, fetchDataList]);

  // --- ACTIONS HANDLERS ---
  const handleBanUser = (id: string, days: number | null) => {
    setBanModal({ ...banModal, isOpen: false });
    const banUntil = days ? new Date(Date.now() + days * 86400000).toISOString() : null;
    supabase.from('profiles').update({ banned_until: banUntil }).eq('id', id).then(({ error }) => {
      if (!error) { addToast(days ? "Đã khóa tài khoản" : "Đã mở khóa", "success"); fetchDataList(); }
    });
  };

  const deleteItem = (id: string, table: 'products' | 'reports') => {
    setModal({ ...modal, isOpen: false });
    supabase.from(table).delete().eq('id', id).then(({ error }) => {
      if (!error) { addToast("Đã xóa thành công", "success"); fetchDataList(); }
    });
  };

  const resolveReport = (id: string, status: string) => {
    setModal({ ...modal, isOpen: false });
    supabase.from('reports').update({ status }).eq('id', id).then(({ error }) => {
      if (!error) { addToast("Đã cập nhật trạng thái", "success"); fetchDataList(); }
    });
  };

  if (!isAdmin) return null;

  return (
    <div className="admin-layout">
      <VisualEngine />
      
      {/* Dialogs */}
      <ConfirmDialog {...modal} onClose={() => setModal({ ...modal, isOpen: false })} />
      <BanDialog {...banModal} onClose={() => setBanModal({ ...banModal, isOpen: false })} onConfirm={(d: number) => handleBanUser(banModal.userId!, d)} />

      {/* 1. SIDEBAR */}
      <aside className="sidebar">
        <div className="h-16 flex items-center px-6 border-b border-slate-700/50">
          <Shield className="text-blue-500 mr-3" size={24}/> 
          <span className="font-bold text-white text-lg tracking-tight">ADMIN CP</span>
        </div>
        
        <div className="flex-1 py-6 px-2 space-y-1">
          {[
            { id: 'dashboard', label: 'Tổng quan', icon: LayoutDashboard },
            { id: 'users', label: 'Thành viên', icon: Users },
            { id: 'products', label: 'Tin đăng', icon: Package },
            { id: 'reports', label: 'Khiếu nại', icon: AlertTriangle },
          ].map((item) => (
            <div 
              key={item.id} 
              onClick={() => { setActiveTab(item.id as any); setPage(0); setSearchTerm(""); }}
              className={`sidebar-item rounded-lg ${activeTab === item.id ? 'active' : ''}`}
            >
              <item.icon size={18} /> {item.label}
              {item.id === 'reports' && stats.pendingReports > 0 && (
                <span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{stats.pendingReports}</span>
              )}
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-slate-700/50">
          <button onClick={() => navigate('/')} className="w-full flex items-center justify-center gap-2 py-3 rounded-lg border border-slate-600 text-slate-400 hover:text-white hover:border-slate-400 transition-colors text-sm font-bold">
            <LogOut size={16}/> Về trang chủ
          </button>
        </div>
      </aside>

      {/* 2. MAIN CONTENT */}
      <main className="main-content">
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0 sticky top-0 z-20">
          <h2 className="text-xl font-bold text-slate-800 capitalize">{activeTab === 'dashboard' ? 'Dashboard' : `Quản lý ${activeTab}`}</h2>
          <div className="flex items-center gap-3">
            <div className="text-right hidden md:block">
              <p className="text-sm font-bold text-slate-700">{user?.name}</p>
              <p className="text-xs text-slate-500 uppercase font-bold text-blue-600">Administrator</p>
            </div>
            <img src={user?.avatar || "https://ui-avatars.com/api/?name=Admin"} className="w-9 h-9 rounded-full border border-slate-200"/>
          </div>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-8 bg-[#F8FAFC]">
          
          {/* DASHBOARD VIEW */}
          {activeTab === 'dashboard' && (
            <div className="max-w-7xl mx-auto space-y-8 animate-enter">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="Thành viên" value={stats.totalUsers} icon={Users} colorClass="bg-blue-500 text-blue-600"/>
                <StatCard title="Tin đăng" value={stats.totalProducts} icon={Package} colorClass="bg-indigo-500 text-indigo-600"/>
                <StatCard title="Khiếu nại" value={stats.pendingReports} icon={AlertTriangle} colorClass="bg-rose-500 text-rose-600"/>
                <StatCard title="Giá trị sàn" value={new Intl.NumberFormat('vi-VN', { notation: "compact" }).format(stats.marketValue)} icon={DollarSign} colorClass="bg-emerald-500 text-emerald-600"/>
              </div>
              
              <div className="bg-white p-12 rounded-2xl border border-dashed border-slate-300 text-center">
                <Activity size={48} className="mx-auto text-slate-300 mb-4"/>
                <h3 className="text-lg font-bold text-slate-700">Hệ thống đang hoạt động ổn định</h3>
                <p className="text-slate-500 text-sm mt-1">Dữ liệu được cập nhật theo thời gian thực từ Database Supabase.</p>
              </div>
            </div>
          )}

          {/* LIST VIEWS */}
          {activeTab !== 'dashboard' && (
            <div className="animate-enter max-w-7xl mx-auto">
              {/* Toolbar */}
              <div className="flex justify-between items-center mb-6">
                <div className="relative w-80">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
                  <input 
                    className="search-input" 
                    placeholder="Tìm kiếm theo tên, email..." 
                    value={searchTerm} 
                    onChange={e => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0} className="p-2 bg-white border rounded-lg hover:bg-slate-50 disabled:opacity-50"><ChevronLeft size={18}/></button>
                  <span className="px-4 py-2 bg-white border rounded-lg text-sm font-bold text-slate-600">Trang {page + 1}</span>
                  <button onClick={() => setPage(page + 1)} className="p-2 bg-white border rounded-lg hover:bg-slate-50"><ChevronRight size={18}/></button>
                </div>
              </div>

              {/* Table */}
              <div className="table-container">
                {loading ? <div className="p-6"><TableSkeleton/></div> : (
                  <table className="data-table">
                    <thead>
                      <tr>
                        {activeTab === 'users' && <><th>Tên</th><th>Email</th><th>Ngày tạo</th><th>Trạng thái</th><th className="text-right">Hành động</th></>}
                        {activeTab === 'products' && <><th>Sản phẩm</th><th>Giá</th><th>Người bán</th><th>Ngày đăng</th><th className="text-right">Hành động</th></>}
                        {activeTab === 'reports' && <><th>Lý do</th><th>Người báo cáo</th><th>Sản phẩm</th><th>Trạng thái</th><th className="text-right">Hành động</th></>}
                      </tr>
                    </thead>
                    <tbody>
                      {/* Users Row */}
                      {activeTab === 'users' && dataList.map((u: any) => {
                        const { isBanned, label, color } = getBanStatus(u.banned_until);
                        return (
                          <tr key={u.id}>
                            <td className="font-bold text-slate-700">{u.name}</td>
                            <td className="text-slate-500">{u.email}</td>
                            <td>{formatDate(u.created_at)}</td>
                            <td><span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${color}`}>{label}</span></td>
                            <td className="text-right">
                              {u.role !== 'admin' && (
                                <button 
                                  onClick={() => isBanned ? handleBanUser(u.id, null) : setBanModal({ isOpen: true, userId: u.id, userName: u.name })}
                                  className={`p-2 rounded-lg transition-colors ${isBanned ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' : 'bg-rose-50 text-rose-600 hover:bg-rose-100'}`}
                                  title={isBanned ? "Mở khóa" : "Khóa tài khoản"}
                                >
                                  {isBanned ? <CheckCircle size={18}/> : <Ban size={18}/>}
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}

                      {/* Products Row */}
                      {activeTab === 'products' && dataList.map((p: any) => (
                        <tr key={p.id}>
                          <td className="font-bold text-slate-700 max-w-xs truncate" title={p.title}>{p.title}</td>
                          <td className="font-mono font-bold text-blue-600">{formatCurrency(p.price)}</td>
                          <td>{safeGet(p.seller, 'name')}</td>
                          <td>{formatDate(p.created_at)}</td>
                          <td className="text-right flex justify-end gap-2">
                            <button onClick={() => window.open(`/product/${p.id}`, '_blank')} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg"><Eye size={18}/></button>
                            <button 
                              onClick={() => setModal({ isOpen: true, title: "Xóa sản phẩm?", message: "Hành động này không thể hoàn tác.", type: 'danger', onConfirm: () => deleteItem(p.id, 'products') })}
                              className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg"
                            >
                              <Trash2 size={18}/>
                            </button>
                          </td>
                        </tr>
                      ))}

                      {/* Reports Row */}
                      {activeTab === 'reports' && dataList.map((r: any) => (
                        <tr key={r.id}>
                          <td className="font-bold text-rose-600">{r.reason}</td>
                          <td>{safeGet(r.reporter, 'name')}</td>
                          <td><a href={`/product/${r.product?.id}`} target="_blank" className="text-blue-600 hover:underline">{safeGet(r.product, 'title', 'Sản phẩm đã xóa')}</a></td>
                          <td><span className={`text-xs font-bold px-2.5 py-1 rounded-full ${r.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-emerald-100 text-emerald-700'}`}>{r.status}</span></td>
                          <td className="text-right">
                            {r.status === 'pending' && (
                              <div className="flex justify-end gap-2">
                                <button 
                                  onClick={() => setModal({ isOpen: true, title: "Xóa bài viết?", message: "Bài này sẽ bị xóa khỏi hệ thống.", type: 'danger', onConfirm: () => deleteItem(r.product?.id, 'products') })}
                                  className="p-1.5 bg-rose-50 text-rose-600 rounded hover:bg-rose-100" title="Xóa bài"
                                >
                                  <Trash2 size={16}/>
                                </button>
                                <button 
                                  onClick={() => setModal({ isOpen: true, title: "Đã xử lý?", message: "Đánh dấu báo cáo là xong.", type: 'success', onConfirm: () => resolveReport(r.id, 'resolved') })}
                                  className="p-1.5 bg-emerald-50 text-emerald-600 rounded hover:bg-emerald-100" title="Xong"
                                >
                                  <CheckCircle size={16}/>
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                {!loading && dataList.length === 0 && <div className="p-12 text-center text-slate-400">Chưa có dữ liệu nào.</div>}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default AdminPage;
