import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Users, Package, AlertTriangle, 
  Search, LogOut, CheckCircle, Trash2, 
  Shield, Ban, Eye, ChevronLeft, ChevronRight,
  Activity, Calendar, ArrowUpRight, TrendingUp, 
  XCircle, AlertCircle, X, Download, Filter, MoreHorizontal
} from "lucide-react";
import { supabase } from "../services/supabase";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";

// ============================================================================
// 1. TYPES & UTILS
// ============================================================================
const ITEMS_PER_PAGE = 10;

// Helper để xử lý dữ liệu join từ Supabase an toàn (Fix lỗi crash)
const safeGet = (data: any, field: string, fallback: string = 'N/A') => {
  if (!data) return fallback;
  if (Array.isArray(data)) return data[0]?.[field] || fallback;
  return data[field] || fallback;
};

// Format tiền tệ
const formatMoney = (amount: number) => 
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);

// Format ngày tháng
const formatDate = (dateString: string) => 
  new Date(dateString).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });

// Check trạng thái Ban
const getBanStatus = (bannedUntil: string | null) => {
  if (!bannedUntil) return { isBanned: false, label: 'Hoạt động', color: 'bg-emerald-100 text-emerald-700' };
  const now = new Date();
  const banDate = new Date(bannedUntil);
  
  if (banDate > now) {
    const diffTime = Math.abs(banDate.getTime() - now.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return { 
      isBanned: true, 
      label: diffDays > 3650 ? 'Khóa vĩnh viễn' : `Khóa ${diffDays} ngày`, 
      color: 'bg-rose-100 text-rose-700' 
    };
  }
  return { isBanned: false, label: 'Hoạt động', color: 'bg-emerald-100 text-emerald-700' };
};

// Interfaces
interface DashboardStats {
  totalUsers: number;
  totalProducts: number;
  pendingReports: number;
  marketValue: number;
}

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  type: 'danger' | 'info' | 'success';
  onConfirm: () => void;
  onClose: () => void;
}

interface BanModalProps {
  isOpen: boolean;
  userName: string;
  onConfirm: (days: number | null) => void;
  onClose: () => void;
}

// ============================================================================
// 2. VISUAL ENGINE (CSS)
// ============================================================================
const GlobalStyles = () => (
  <style>{`
    :root { --primary: #0F172A; --accent: #3B82F6; --bg: #F1F5F9; }
    body { background-color: var(--bg); font-family: 'Inter', sans-serif; color: #334155; }
    
    /* Layout */
    .admin-container { display: flex; height: 100vh; overflow: hidden; }
    .sidebar { width: 260px; background: var(--primary); color: #94A3B8; display: flex; flex-direction: column; flex-shrink: 0; }
    .main-area { flex: 1; display: flex; flex-direction: column; overflow: hidden; background: var(--bg); }
    .content-scroll { flex: 1; overflow-y: auto; padding: 32px; }

    /* Components */
    .nav-item { display: flex; items-center; gap: 12px; padding: 14px 24px; font-weight: 500; transition: all 0.2s; cursor: pointer; border-left: 3px solid transparent; }
    .nav-item:hover { background: rgba(255,255,255,0.05); color: #F8FAFC; }
    .nav-item.active { background: rgba(59, 130, 246, 0.1); color: white; border-left-color: var(--accent); }

    .stat-card { background: white; padding: 24px; border-radius: 12px; border: 1px solid #E2E8F0; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
    
    .data-table { width: 100%; border-collapse: collapse; text-align: left; }
    .data-table th { background: #F8FAFC; padding: 16px; font-size: 12px; font-weight: 700; text-transform: uppercase; color: #64748B; border-bottom: 1px solid #E2E8F0; }
    .data-table td { padding: 16px; border-bottom: 1px solid #E2E8F0; font-size: 14px; }
    .data-table tr:hover { background: #F8FAFC; }

    /* Modals */
    .modal-overlay { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(4px); z-index: 50; display: flex; align-items: center; justify-content: center; animation: fadeIn 0.2s; }
    .modal-box { background: white; border-radius: 16px; padding: 24px; width: 100%; max-width: 400px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1); animation: scaleIn 0.2s; }
    
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes scaleIn { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
    
    .skeleton-row { height: 60px; background: #E2E8F0; margin-bottom: 8px; border-radius: 8px; animation: pulse 1.5s infinite; }
    @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } }
  `}</style>
);

// ============================================================================
// 3. SUB-COMPONENTS
// ============================================================================

// --- Confirm Modal ---
const ConfirmModal = ({ isOpen, title, message, type, onConfirm, onClose }: ConfirmModalProps) => {
  if (!isOpen) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box text-center" onClick={e => e.stopPropagation()}>
        <div className={`w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center ${type === 'danger' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
          {type === 'danger' ? <AlertCircle size={24}/> : <CheckCircle size={24}/>}
        </div>
        <h3 className="text-lg font-bold text-slate-900 mb-2">{title}</h3>
        <p className="text-sm text-slate-500 mb-6">{message}</p>
        <div className="flex gap-3 justify-center">
          <button onClick={onClose} className="px-4 py-2 border rounded-lg font-bold text-slate-600 hover:bg-slate-50">Hủy</button>
          <button onClick={onConfirm} className={`px-4 py-2 rounded-lg font-bold text-white shadow-lg ${type === 'danger' ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}`}>Xác nhận</button>
        </div>
      </div>
    </div>
  );
};

// --- Ban Duration Modal ---
const BanModal = ({ isOpen, userName, onConfirm, onClose }: BanModalProps) => {
  if (!isOpen) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold flex items-center gap-2"><Ban size={20} className="text-red-500"/> Khóa tài khoản</h3>
          <button onClick={onClose}><X size={20} className="text-slate-400"/></button>
        </div>
        <p className="text-sm text-slate-500 mb-4">Chọn thời gian khóa cho <strong>{userName}</strong>:</p>
        <div className="grid grid-cols-2 gap-3 mb-6">
          {[{l:"1 Ngày", v:1}, {l:"3 Ngày", v:3}, {l:"1 Tuần", v:7}, {l:"1 Tháng", v:30}, {l:"Vĩnh viễn", v:36500}].map(opt => (
            <button key={opt.v} onClick={() => onConfirm(opt.v)} className="py-2 border rounded-lg text-sm font-medium hover:border-red-500 hover:text-red-500 hover:bg-red-50 transition-all">{opt.l}</button>
          ))}
        </div>
        <button onClick={onClose} className="w-full text-sm text-slate-400 font-bold hover:underline">Hủy bỏ</button>
      </div>
    </div>
  );
};

// --- Stat Card ---
const StatCard = ({ title, value, icon: Icon, color }: any) => (
  <div className="stat-card flex items-start justify-between">
    <div>
      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">{title}</p>
      <h3 className="text-2xl font-black text-slate-800">{value}</h3>
    </div>
    <div className={`p-3 rounded-xl ${color} bg-opacity-10 text-opacity-100`}><Icon size={24}/></div>
  </div>
);

// --- Table Skeleton ---
const TableSkeleton = () => (
  <div className="w-full">
    {[...Array(5)].map((_, i) => <div key={i} className="skeleton-row"></div>)}
  </div>
);

// ============================================================================
// 4. MAIN PAGE
// ============================================================================
const AdminPage = () => {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { addToast } = useToast();

  // --- STATE ---
  const [tab, setTab] = useState<'dashboard' | 'users' | 'products' | 'reports'>('dashboard');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({ totalUsers: 0, totalProducts: 0, pendingReports: 0, marketValue: 0 });
  const [dataList, setDataList] = useState<any[]>([]); // Dữ liệu chung cho bảng
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  
  // Modals State
  const [modal, setModal] = useState<any>({ isOpen: false, type: 'info' });
  const [banModal, setBanModal] = useState<any>({ isOpen: false });

  // --- AUTH CHECK ---
  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      addToast("Truy cập bị từ chối. Khu vực dành riêng cho Admin.", "error");
      navigate("/");
    }
  }, [user, isAdmin, loading, navigate]);

  // --- DATA FETCHING ---
  const fetchStats = async () => {
    try {
      const [u, p, r, price] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('products').select('*', { count: 'exact', head: true }),
        supabase.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('products').select('price').eq('status', 'available')
      ]);
      
      const totalValue = price.data?.reduce((acc, item) => acc + (item.price || 0), 0) || 0;
      setStats({
        totalUsers: u.count || 0,
        totalProducts: p.count || 0,
        pendingReports: r.count || 0,
        marketValue: totalValue
      });
    } catch (e) { console.error("Stats Error:", e); }
  };

  const fetchDataList = useCallback(async () => {
    setLoading(true);
    const from = page * ITEMS_PER_PAGE;
    const to = from + ITEMS_PER_PAGE - 1;
    
    try {
      let query;
      if (tab === 'users') {
        query = supabase.from('profiles').select('*').order('created_at', { ascending: false }).range(from, to);
        if (search) query = query.ilike('email', `%${search}%`);
      } else if (tab === 'products') {
        // QUAN TRỌNG: Sửa lỗi join, lấy seller(name)
        query = supabase.from('products').select('*, seller:profiles(name)').order('created_at', { ascending: false }).range(from, to);
        if (search) query = query.ilike('title', `%${search}%`);
      } else if (tab === 'reports') {
        query = supabase.from('reports').select('*, reporter:profiles!reporter_id(name), product:products(id, title)').order('created_at', { ascending: false }).range(from, to);
      }

      if (query) {
        const { data, error } = await query;
        if (error) throw error;
        setDataList(data || []);
      }
    } catch (err) {
      console.error("Fetch Error:", err);
      addToast("Lỗi tải dữ liệu", "error");
    } finally {
      setLoading(false);
    }
  }, [tab, page, search]);

  useEffect(() => {
    if (tab === 'dashboard') fetchStats();
    else fetchDataList();
  }, [tab, page, search, fetchDataList]);

  // --- ACTIONS ---
  const handleBan = (id: string, days: number | null) => {
    setBanModal({ isOpen: false }); // Close modal first
    const banUntil = days ? new Date(Date.now() + days * 86400000).toISOString() : null;
    
    supabase.from('profiles').update({ banned_until: banUntil }).eq('id', id)
      .then(({ error }) => {
        if (!error) {
          addToast(days ? `Đã khóa ${days} ngày` : "Đã mở khóa", "success");
          fetchDataList();
        } else addToast("Lỗi cập nhật", "error");
      });
  };

  const handleDelete = (id: string, type: 'product' | 'report') => {
    setModal({ isOpen: false });
    const table = type === 'product' ? 'products' : 'reports';
    supabase.from(table).delete().eq('id', id)
      .then(({ error }) => {
        if (!error) {
          addToast("Đã xóa thành công", "success");
          fetchDataList();
        } else addToast("Lỗi xóa dữ liệu", "error");
      });
  };

  const handleResolveReport = (id: string, status: string) => {
    setModal({ isOpen: false });
    supabase.from('reports').update({ status }).eq('id', id)
      .then(({ error }) => {
        if (!error) {
          addToast("Đã cập nhật báo cáo", "success");
          fetchDataList();
        } else addToast("Lỗi hệ thống", "error");
      });
  };

  if (!isAdmin) return null;

  return (
    <div className="admin-container">
      <GlobalStyles />
      
      {/* Modals */}
      <ConfirmModal {...modal} onClose={() => setModal({ ...modal, isOpen: false })} />
      <BanModal {...banModal} onClose={() => setBanModal({ ...banModal, isOpen: false })} onConfirm={(days) => handleBan(banModal.userId, days)} />

      {/* Sidebar */}
      <aside className="sidebar">
        <div className="h-16 flex items-center px-6 border-b border-slate-700/50">
          <Shield className="text-blue-500 mr-3" size={24}/> 
          <span className="font-bold text-white text-lg tracking-tight">ADMIN CP</span>
        </div>
        <nav className="flex-1 py-6 px-2 space-y-1">
          {[
            { id: 'dashboard', label: 'Tổng quan', icon: LayoutDashboard },
            { id: 'users', label: 'Thành viên', icon: Users },
            { id: 'products', label: 'Tin đăng', icon: Package },
            { id: 'reports', label: 'Khiếu nại', icon: AlertTriangle },
          ].map((item) => (
            <button 
              key={item.id} 
              onClick={() => { setTab(item.id as any); setPage(0); setSearch(""); }}
              className={`nav-item w-full rounded-lg ${tab === item.id ? 'active' : ''}`}
            >
              <item.icon size={18} /> {item.label}
              {item.id === 'reports' && stats.pendingReports > 0 && (
                <span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{stats.pendingReports}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-slate-700/50">
          <button onClick={() => navigate('/')} className="nav-item w-full rounded-lg text-slate-400 hover:text-white justify-center border border-slate-600">
            <LogOut size={16} /> Quay về Website
          </button>
        </div>
      </aside>

      {/* Main Area */}
      <div className="main-area">
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 flex-shrink-0">
          <h2 className="text-xl font-bold text-slate-800 capitalize">{tab === 'dashboard' ? 'Dashboard' : `Quản lý ${tab}`}</h2>
          <div className="flex items-center gap-4">
            <div className="text-right hidden md:block">
              <p className="text-sm font-bold text-slate-700">{user?.name}</p>
              <p className="text-xs text-slate-500 uppercase font-bold text-blue-600">Admin</p>
            </div>
            <img src={user?.avatar || "https://via.placeholder.com/40"} className="w-9 h-9 rounded-full border border-slate-200"/>
          </div>
        </header>

        {/* Content */}
        <div className="content-scroll">
          {tab === 'dashboard' ? (
            <div className="max-w-6xl mx-auto space-y-8 animate-enter">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <StatCard title="Tổng Thành Viên" value={stats.totalUsers} icon={Users} color="bg-blue-500 text-blue-600"/>
                <StatCard title="Tổng Tin Đăng" value={stats.totalProducts} icon={Package} color="bg-indigo-500 text-indigo-600"/>
                <StatCard title="Khiếu Nại Chờ Xử Lý" value={stats.pendingReports} icon={AlertTriangle} color="bg-rose-500 text-rose-600"/>
                <StatCard title="Tổng Giá Trị Sàn" value={new Intl.NumberFormat('vi-VN', { notation: "compact" }).format(stats.marketValue)} icon={TrendingUp} color="bg-emerald-500 text-emerald-600"/>
              </div>
              <div className="bg-white p-12 rounded-xl border border-dashed border-slate-300 text-center">
                <Activity size={48} className="mx-auto text-slate-300 mb-4"/>
                <h3 className="text-lg font-bold text-slate-700">Hệ thống đang hoạt động ổn định</h3>
                <p className="text-slate-500">Dữ liệu được cập nhật theo thời gian thực từ Supabase Database.</p>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full">
              {/* Toolbar */}
              <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
                  <input 
                    placeholder="Tìm kiếm..." 
                    className="pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm w-64 focus:border-blue-500 outline-none"
                    value={search} onChange={e => setSearch(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0} className="p-2 border bg-white rounded hover:bg-slate-50 disabled:opacity-50"><ChevronLeft size={16}/></button>
                  <span className="px-4 py-2 text-sm font-bold bg-white border rounded">Trang {page + 1}</span>
                  <button onClick={() => setPage(page + 1)} className="p-2 border bg-white rounded hover:bg-slate-50"><ChevronRight size={16}/></button>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                {loading ? <div className="p-6"><TableSkeleton/></div> : (
                  <table className="data-table">
                    <thead>
                      <tr>
                        {tab === 'users' && <><th>User</th><th>Email</th><th>Role</th><th>Ngày tạo</th><th>Trạng thái</th><th className="text-right">Hành động</th></>}
                        {tab === 'products' && <><th>Sản phẩm</th><th>Giá</th><th>Người bán</th><th>Ngày đăng</th><th className="text-right">Hành động</th></>}
                        {tab === 'reports' && <><th>Lý do</th><th>Người báo cáo</th><th>Sản phẩm</th><th>Trạng thái</th><th className="text-right">Hành động</th></>}
                      </tr>
                    </thead>
                    <tbody>
                      {/* Users Row */}
                      {tab === 'users' && dataList.map((u: any) => {
                        const { isBanned, label, color } = getBanStatus(u.banned_until);
                        return (
                          <tr key={u.id}>
                            <td className="font-bold">{u.name}</td>
                            <td className="font-mono text-xs text-slate-500">{u.email}</td>
                            <td><span className="bg-slate-100 px-2 py-1 rounded text-xs font-bold uppercase">{u.role}</span></td>
                            <td>{formatDate(u.created_at)}</td>
                            <td><span className={`text-xs font-bold px-2 py-1 rounded-full ${color}`}>{label}</span></td>
                            <td className="text-right">
                              {u.role !== 'admin' && (
                                <button 
                                  onClick={() => isBanned ? handleBan(u.id, null) : setBanModal({ isOpen: true, userId: u.id, userName: u.name })}
                                  className={`p-2 rounded hover:bg-slate-100 ${isBanned ? 'text-emerald-600' : 'text-rose-600'}`}
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
                      {tab === 'products' && dataList.map((p: any) => (
                        <tr key={p.id}>
                          <td className="font-bold max-w-xs truncate" title={p.title}>{p.title}</td>
                          <td className="font-mono text-blue-600 font-bold">{formatMoney(p.price)}</td>
                          <td>{safeGet(p.seller, 'name')}</td>
                          <td>{formatDate(p.created_at)}</td>
                          <td className="text-right flex justify-end gap-2">
                            <a href={`/product/${p.id}`} target="_blank" rel="noreferrer" className="p-2 text-blue-500 hover:bg-blue-50 rounded"><Eye size={18}/></a>
                            <button 
                              onClick={() => setModal({ 
                                isOpen: true, title: "Xóa tin đăng?", message: "Hành động này không thể hoàn tác.", 
                                type: 'danger', onConfirm: () => handleDelete(p.id, 'product') 
                              })} 
                              className="p-2 text-rose-500 hover:bg-rose-50 rounded"
                            >
                              <Trash2 size={18}/>
                            </button>
                          </td>
                        </tr>
                      ))}

                      {/* Reports Row */}
                      {tab === 'reports' && dataList.map((r: any) => (
                        <tr key={r.id}>
                          <td className="font-bold text-rose-600">{r.reason}</td>
                          <td>{safeGet(r.reporter, 'name')}</td>
                          <td><a href={`/product/${r.product?.id}`} target="_blank" className="text-blue-600 hover:underline">{safeGet(r.product, 'title', 'Sản phẩm đã xóa')}</a></td>
                          <td><span className={`text-xs font-bold px-2 py-1 rounded-full ${r.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-emerald-100 text-emerald-700'}`}>{r.status}</span></td>
                          <td className="text-right">
                            {r.status === 'pending' && (
                              <div className="flex justify-end gap-2">
                                <button 
                                  onClick={() => setModal({ 
                                    isOpen: true, title: "Xóa bài viết?", message: "Bài viết bị báo cáo sẽ bị xóa vĩnh viễn.", 
                                    type: 'danger', onConfirm: () => handleDelete(r.product?.id, 'product') 
                                  })}
                                  className="p-1.5 bg-rose-50 text-rose-600 rounded hover:bg-rose-100" title="Xóa bài"
                                >
                                  <Trash2 size={16}/>
                                </button>
                                <button 
                                  onClick={() => setModal({ 
                                    isOpen: true, title: "Đã xử lý?", message: "Đánh dấu báo cáo này là đã giải quyết.", 
                                    type: 'success', onConfirm: () => handleResolveReport(r.id, 'resolved') 
                                  })}
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
                {!loading && dataList.length === 0 && (
                  <div className="p-12 text-center text-slate-400">Không có dữ liệu nào.</div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminPage;
