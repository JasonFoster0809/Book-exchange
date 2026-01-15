import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Users, Package, AlertTriangle, 
  Search, LogOut, CheckCircle, Trash2, 
  Shield, Ban, Eye, ChevronLeft, ChevronRight,
  Activity, Calendar, ArrowUpRight, ArrowDown, ArrowUp,
  TrendingUp, XCircle, AlertCircle, X, Clock, Download, Filter
} from "lucide-react";
import { supabase } from "../services/supabase";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";

// ============================================================================
// 1. TYPES & CONFIG
// ============================================================================
const ITEMS_PER_PAGE = 10;

interface DashboardStats {
  totalUsers: number;
  totalProducts: number;
  pendingReports: number;
  revenue: number;
}

interface ChartData {
  date: string;
  users: number;
  products: number;
}

interface ActivityLog {
  id: string;
  type: 'user_join' | 'new_product';
  message: string;
  time: string;
}

interface UserData {
  id: string;
  email: string;
  name: string;
  avatar_url: string;
  role: string;
  banned_until: string | null;
  created_at: string;
}

// Modal States
interface ConfirmModalState {
  isOpen: boolean;
  title: string;
  message: string;
  type: 'danger' | 'info' | 'success';
  onConfirm: () => void;
}

interface BanModalState {
  isOpen: boolean;
  userId: string | null;
  userName: string;
}

// Helper Functions
const getSellerName = (seller: any) => {
  if (Array.isArray(seller)) return seller[0]?.name || 'Ẩn danh';
  return seller?.name || 'Ẩn danh';
};

const isBanned = (dateString: string | null) => {
  if (!dateString) return false;
  return new Date(dateString) > new Date();
};

const getBanLabel = (dateString: string | null) => {
  if (!dateString || !isBanned(dateString)) return "Active";
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(date.getTime() - now.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > 3650 ? "Vĩnh viễn" : `${diffDays} ngày`;
};

const exportToCSV = (data: any[], filename: string) => {
  const csvContent = "data:text/csv;charset=utf-8," + 
    Object.keys(data[0]).join(",") + "\n" + 
    data.map(row => Object.values(row).map(v => `"${v}"`).join(",")).join("\n");
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `${filename}_${new Date().toISOString().slice(0,10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// ============================================================================
// 2. VISUAL ENGINE
// ============================================================================
const VisualEngine = () => (
  <style>{`
    :root { --primary: #0F172A; --accent: #3B82F6; --bg-body: #F8FAFC; --border: #E2E8F0; }
    body { background-color: var(--bg-body); color: #334155; font-family: 'Inter', sans-serif; }
    
    .admin-layout { display: flex; min-height: 100vh; }
    .sidebar { width: 260px; background-color: var(--primary); color: #94A3B8; flex-shrink: 0; display: flex; flex-direction: column; transition: all 0.3s; }
    .sidebar-link { display: flex; items-center; gap: 12px; padding: 14px 24px; font-weight: 500; font-size: 0.9rem; transition: all 0.2s; border-left: 3px solid transparent; color: #94A3B8; }
    .sidebar-link:hover { background-color: rgba(255,255,255,0.05); color: #F8FAFC; }
    .sidebar-link.active { background-color: rgba(59, 130, 246, 0.1); color: white; border-left-color: var(--accent); }

    .main-content { flex: 1; display: flex; flex-direction: column; height: 100vh; overflow: hidden; }
    .top-header { background: white; border-bottom: 1px solid var(--border); height: 64px; padding: 0 32px; display: flex; align-items: center; justify-content: space-between; }

    .stat-card { background: white; padding: 24px; border-radius: 12px; border: 1px solid var(--border); box-shadow: 0 1px 2px rgba(0,0,0,0.05); transition: transform 0.2s; }
    .stat-card:hover { transform: translateY(-2px); }
    
    .table-wrapper { background: white; border-radius: 12px; border: 1px solid var(--border); overflow: hidden; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
    .data-table { width: 100%; text-align: left; border-collapse: collapse; }
    .data-table th { background: #F8FAFC; padding: 16px 24px; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; color: #64748B; border-bottom: 1px solid var(--border); cursor: pointer; user-select: none; }
    .data-table th:hover { background: #F1F5F9; color: var(--accent); }
    .data-table td { padding: 16px 24px; border-bottom: 1px solid var(--border); font-size: 0.875rem; }
    .data-table tr:hover { background-color: #F8FAFC; }

    .modal-backdrop { position: fixed; inset: 0; z-index: 100; background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; animation: fadeIn 0.2s ease-out; }
    .modal-box { background: white; width: 100%; max-width: 400px; border-radius: 16px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1); overflow: hidden; animation: scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1); }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } } @keyframes scaleIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }

    .badge { padding: 4px 10px; border-radius: 99px; font-size: 0.7rem; font-weight: 700; display: inline-flex; items-center; gap: 4px; }
    .badge-green { background: #DCFCE7; color: #166534; }
    .badge-red { background: #FEE2E2; color: #991B1B; }
    .badge-yellow { background: #FEF3C7; color: #92400E; }
    
    .skeleton-row { height: 60px; background: #f1f5f9; margin-bottom: 1px; animation: pulse 1.5s infinite; }
    @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } }
    
    .hide-scrollbar::-webkit-scrollbar { display: none; }
    .animate-enter { animation: slideUp 0.4s ease-out forwards; opacity: 0; }
    @keyframes slideUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
  `}</style>
);

// ============================================================================
// 3. SUB-COMPONENTS
// ============================================================================

const StatCard = ({ title, value, icon: Icon, color }: any) => (
  <div className="stat-card flex items-start justify-between group">
    <div>
      <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">{title}</p>
      <h3 className="text-3xl font-black text-slate-800 tracking-tight">{value}</h3>
    </div>
    <div className={`p-3 rounded-xl ${color} bg-opacity-10 text-opacity-100 group-hover:scale-110 transition-transform`}>
      <Icon size={24} className={color.replace('bg-', 'text-')}/>
    </div>
  </div>
);

const ConfirmDialog = ({ config, onClose }: { config: ConfirmModalState, onClose: () => void }) => {
  if (!config.isOpen) return null;
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="p-6 text-center">
          <div className={`mx-auto mb-4 w-12 h-12 rounded-full flex items-center justify-center ${config.type === 'danger' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
            {config.type === 'danger' ? <AlertCircle size={24} /> : <CheckCircle size={24} />}
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-2">{config.title}</h3>
          <p className="text-sm text-slate-500 mb-6">{config.message}</p>
          <div className="flex gap-3 justify-center">
            <button onClick={onClose} className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 font-bold hover:bg-slate-50 transition-colors">Hủy bỏ</button>
            <button onClick={() => { config.onConfirm(); onClose(); }} className={`px-4 py-2 rounded-lg text-white font-bold shadow-lg transition-transform active:scale-95 ${config.type === 'danger' ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}`}>Xác nhận</button>
          </div>
        </div>
      </div>
    </div>
  );
};

const BanDurationDialog = ({ config, onClose, onConfirm }: { config: BanModalState, onClose: () => void, onConfirm: (days: number | null) => void }) => {
  if (!config.isOpen) return null;
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Ban size={20} className="text-red-500"/> Khóa tài khoản</h3>
            <button onClick={onClose}><X size={20} className="text-slate-400 hover:text-slate-600"/></button>
          </div>
          <p className="text-sm text-slate-500 mb-4">Chọn thời gian khóa cho <strong className="text-slate-800">{config.userName}</strong>.</p>
          <div className="grid grid-cols-2 gap-3 mb-6">
            {[{l:"1 Ngày", v:1}, {l:"3 Ngày", v:3}, {l:"1 Tuần", v:7}, {l:"1 Tháng", v:30}, {l:"Vĩnh viễn", v:36500}].map((opt) => (
              <button key={opt.v} onClick={() => { onConfirm(opt.v); onClose(); }} className="py-3 border border-slate-200 rounded-lg text-sm font-bold text-slate-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all">{opt.l}</button>
            ))}
          </div>
          <button onClick={onClose} className="w-full py-2 text-sm text-slate-400 font-bold hover:text-slate-600">Hủy bỏ</button>
        </div>
      </div>
    </div>
  );
};

const TableSkeleton = () => (
  <div className="w-full animate-pulse">
    {[...Array(5)].map((_, i) => <div key={i} className="skeleton-row rounded-lg"></div>)}
  </div>
);

// ============================================================================
// 4. MAIN ADMIN PAGE
// ============================================================================
const AdminPage = () => {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { addToast } = useToast();
  
  const [activeTab, setActiveTab] = useState<'dashboard' | 'users' | 'products' | 'reports'>('dashboard');
  const [stats, setStats] = useState<DashboardStats>({ totalUsers: 0, totalProducts: 0, pendingReports: 0, revenue: 0 });
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  
  const [users, setUsers] = useState<UserData[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  
  // NEW: Sorting & Filtering
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' }>({ key: 'created_at', direction: 'desc' });
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const [modalConfig, setModalConfig] = useState<ConfirmModalState>({ isOpen: false, title: "", message: "", type: "info", onConfirm: () => {} });
  const [banModal, setBanModal] = useState<BanModalState>({ isOpen: false, userId: null, userName: "" });

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      addToast("Truy cập bị từ chối.", "error");
      navigate("/");
    }
  }, [user, isAdmin, loading]);

  // --- ACTIONS ---
  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const { count: uCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
      const { count: pCount } = await supabase.from('products').select('*', { count: 'exact', head: true });
      const { count: rCount } = await supabase.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'pending');
      const { data: priceData } = await supabase.from('products').select('price').eq('status', 'available');
      const totalVal = priceData?.reduce((a, b) => a + (b.price || 0), 0) || 0;

      setStats({ totalUsers: uCount || 0, totalProducts: pCount || 0, pendingReports: rCount || 0, revenue: totalVal });

      // Mock Chart & Activity (Simulated for visualization)
      const today = new Date();
      const chart = Array.from({length: 7}, (_, i) => {
        const d = new Date(today); d.setDate(d.getDate() - (6-i));
        return { date: d.toLocaleDateString('vi-VN').slice(0,5), users: Math.floor(Math.random()*5), products: Math.floor(Math.random()*10) };
      });
      setChartData(chart);

      const { data: uLogs } = await supabase.from('profiles').select('id, name, created_at').order('created_at', { ascending: false }).limit(5);
      const { data: pLogs } = await supabase.from('products').select('id, title, created_at, seller:profiles(name)').order('created_at', { ascending: false }).limit(5);
      const mixedLogs: ActivityLog[] = [
        ...(uLogs?.map(u => ({ id: u.id, type: 'user_join', message: `${u.name} tham gia`, time: u.created_at } as ActivityLog)) || []),
        ...(pLogs?.map(p => ({ id: p.id, type: 'new_product', message: `${getSellerName(p.seller)} đăng tin "${p.title}"`, time: p.created_at } as ActivityLog)) || [])
      ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 10);
      setActivities(mixedLogs);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const fetchTableData = async () => {
    setLoading(true);
    const from = page * ITEMS_PER_PAGE;
    const to = from + ITEMS_PER_PAGE - 1;
    try {
      // USERS
      if (activeTab === 'users') {
        let q = supabase.from('profiles').select('*').order(sortConfig.key, { ascending: sortConfig.direction === 'asc' });
        if (searchTerm) q = q.ilike('email', `%${searchTerm}%`);
        if (statusFilter === 'banned') q = q.not('banned_until', 'is', null);
        const { data } = await q.range(from, to);
        setUsers(data as UserData[] || []);
      } 
      // PRODUCTS
      else if (activeTab === 'products') {
        let q = supabase.from('products').select('*, seller:profiles(name)').order(sortConfig.key, { ascending: sortConfig.direction === 'asc' });
        if (searchTerm) q = q.ilike('title', `%${searchTerm}%`);
        if (statusFilter === 'sold') q = q.eq('status', 'sold');
        const { data } = await q.range(from, to);
        setProducts(data || []);
      } 
      // REPORTS
      else if (activeTab === 'reports') {
        const { data } = await supabase.from('reports').select('*, reporter:profiles!reporter_id(name), product:products(id, title)').order('created_at', { ascending: false }).range(from, to);
        setReports(data || []);
      }
    } catch(e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => {
    if (activeTab === 'dashboard') fetchDashboardData();
    else fetchTableData();
  }, [activeTab, page, searchTerm, sortConfig, statusFilter]);

  // Handlers
  const handleSort = (key: string) => {
    setSortConfig(current => ({ key, direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc' }));
  };

  const handleExport = () => {
    if(activeTab === 'users') exportToCSV(users, 'users_export');
    if(activeTab === 'products') exportToCSV(products, 'products_export');
    addToast("Đang tải xuống...", "success");
  };

  const confirmAction = (title: string, message: string, type: 'danger' | 'info', action: () => void) => {
    setModalConfig({ isOpen: true, title, message, type, onConfirm: action });
  };

  const initiateBanUser = (user: UserData) => {
    if (isBanned(user.banned_until)) {
      confirmAction("Mở khóa?", `Cho phép ${user.name} truy cập lại?`, 'info', async () => {
        await supabase.from('profiles').update({ banned_until: null }).eq('id', user.id);
        addToast("Đã mở khóa", "success");
        fetchTableData();
      });
    } else {
      setBanModal({ isOpen: true, userId: user.id, userName: user.name });
    }
  };

  const executeBanUser = async (days: number | null) => {
    if (!banModal.userId || !days) return;
    const banUntil = new Date(); banUntil.setDate(banUntil.getDate() + days);
    await supabase.from('profiles').update({ banned_until: banUntil.toISOString() }).eq('id', banModal.userId);
    addToast("Đã khóa tài khoản", "success");
    fetchTableData();
  };

  const handleDeleteProduct = (id: string) => {
    confirmAction("Xóa tin đăng?", "Hành động này không thể hoàn tác.", 'danger', async () => {
      await supabase.from('products').delete().eq('id', id);
      addToast("Đã xóa", "success");
      fetchTableData();
    });
  };

  const handleResolveReport = (id: string, status: 'resolved' | 'dismissed') => {
    confirmAction(status === 'resolved' ? "Đánh dấu đã xử lý?" : "Bỏ qua báo cáo?", "", 'info', async () => {
      await supabase.from('reports').update({ status }).eq('id', id);
      addToast("Đã cập nhật", "success");
      fetchTableData();
    });
  };

  if (!isAdmin) return null;

  return (
    <div className="admin-layout">
      <VisualEngine />
      <ConfirmDialog config={modalConfig} onClose={() => setModalConfig({...modalConfig, isOpen: false})} />
      <BanDurationDialog config={banModal} onClose={() => setBanModal({...banModal, isOpen: false})} onConfirm={executeBanUser} />

      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="h-16 flex items-center px-6 border-b border-slate-700/50">
          <Shield className="text-blue-500 mr-3" size={24}/> <span className="font-bold text-white text-xl tracking-tight">ADMIN CP</span>
        </div>
        <div className="flex-1 py-6 px-3 space-y-1">
          {[{ id: 'dashboard', l: 'Tổng quan', i: LayoutDashboard }, { id: 'users', l: 'Thành viên', i: Users }, { id: 'products', l: 'Tin đăng', i: Package }, { id: 'reports', l: 'Khiếu nại', i: AlertTriangle }].map((item) => (
            <button key={item.id} onClick={() => { setActiveTab(item.id as any); setPage(0); }} className={`sidebar-link w-full rounded-lg ${activeTab === item.id ? 'active' : ''}`}>
              <item.i size={18} /> <span className="flex-1 text-left">{item.l}</span>
              {item.id === 'reports' && stats.pendingReports > 0 && <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{stats.pendingReports}</span>}
            </button>
          ))}
        </div>
        <div className="p-4 border-t border-slate-700/50"><button onClick={() => navigate('/')} className="sidebar-link w-full rounded-lg text-slate-400 hover:text-white justify-center border border-slate-600 hover:border-slate-400"><LogOut size={16} /> Thoát</button></div>
      </aside>

      {/* CONTENT */}
      <main className="main-content bg-[#F1F5F9]">
        <header className="top-header sticky top-0 z-20">
          <h2 className="text-xl font-bold text-slate-800 capitalize">{activeTab === 'dashboard' ? 'Dashboard' : 'Quản lý dữ liệu'}</h2>
          <div className="flex items-center gap-3"><div className="text-right hidden md:block"><p className="text-sm font-bold text-slate-700">{user?.name}</p><p className="text-xs text-slate-500 uppercase font-bold text-blue-600">Admin</p></div><img src={user?.avatar || "https://ui-avatars.com/api/?name=Admin"} className="w-9 h-9 rounded-full border border-slate-200"/></div>
        </header>

        <div className="flex-1 overflow-y-auto p-8">
          {activeTab === 'dashboard' && (
            <div className="max-w-7xl mx-auto space-y-6 animate-enter">
              <div className="dashboard-grid">
                <StatCard title="Thành viên" value={stats.totalUsers} icon={Users} color="bg-blue-500"/>
                <StatCard title="Tin đăng" value={stats.totalProducts} icon={Package} color="bg-indigo-500"/>
                <StatCard title="Khiếu nại" value={stats.pendingReports} icon={AlertTriangle} color="bg-rose-500"/>
                <StatCard title="Tổng giá trị sàn" value={`${new Intl.NumberFormat('vi-VN', { notation: "compact" }).format(stats.revenue)}₫`} icon={TrendingUp} color="bg-emerald-500"/>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                  <div className="flex justify-between items-center mb-8"><h3 className="font-bold text-slate-800 flex items-center gap-2"><Activity size={18} className="text-blue-500"/> Tăng trưởng tuần qua</h3></div>
                  <div className="h-64 flex items-end justify-between gap-4 px-2">
                    {chartData.map((d, i) => (
                      <div key={i} className="flex-1 flex flex-col justify-end gap-1 group relative">
                        <div className="w-full bg-blue-500 rounded-t opacity-80 hover:opacity-100 transition-all chart-bar" style={{height: `${Math.max(d.products * 8, 4)}%`}}></div>
                        <div className="w-full bg-slate-300 rounded-t opacity-80 hover:opacity-100 transition-all chart-bar" style={{height: `${Math.max(d.users * 8, 4)}%`}}></div>
                        <span className="text-[10px] text-slate-400 text-center mt-2 font-medium">{d.date}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                  <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2"><Calendar size={18} className="text-orange-500"/> Hoạt động mới</h3>
                  <div className="space-y-6 overflow-y-auto flex-1 pr-2">
                    {activities.map((act) => (
                      <div key={act.id} className="flex gap-3 items-start">
                        <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${act.type === 'user_join' ? 'bg-blue-500' : 'bg-emerald-500'}`}></div>
                        <div><p className="text-sm text-slate-700 font-medium leading-snug">{act.message}</p><p className="text-xs text-slate-400 mt-1">{new Date(act.time).toLocaleString('vi-VN')}</p></div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab !== 'dashboard' && (
            <div className="animate-enter">
              <div className="flex justify-between items-center mb-6">
                <div className="flex gap-3 items-center">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
                    <input placeholder="Tìm kiếm..." className="pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm w-64 focus:border-blue-500 outline-none" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}/>
                  </div>
                  {activeTab !== 'reports' && (
                    <div className="relative group">
                      <select className="pl-3 pr-8 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:border-blue-500 outline-none cursor-pointer appearance-none" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                        <option value="all">Tất cả trạng thái</option>
                        {activeTab === 'users' ? <option value="banned">Đã khóa</option> : <option value="sold">Đã bán</option>}
                      </select>
                      <Filter size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"/>
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  {(activeTab === 'users' || activeTab === 'products') && (
                    <button onClick={handleExport} className="px-3 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-slate-50"><Download size={16}/> Xuất CSV</button>
                  )}
                  <div className="h-full w-[1px] bg-slate-300 mx-2"></div>
                  <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0} className="p-2 border rounded hover:bg-white disabled:opacity-50"><ChevronLeft size={16}/></button>
                  <button onClick={() => setPage(page + 1)} className="p-2 border rounded hover:bg-white"><ChevronRight size={16}/></button>
                </div>
              </div>

              <div className="table-wrapper">
                {loading ? <div className="p-6"><TableSkeleton/></div> : (
                  <table className="data-table">
                    <thead>
                      <tr>
                        {activeTab === 'users' && (
                          <>
                            <th onClick={() => handleSort('name')}>User {sortConfig.key === 'name' && (sortConfig.direction === 'asc' ? <ArrowUp size={12} className="inline"/> : <ArrowDown size={12} className="inline"/>)}</th>
                            <th>Email</th>
                            <th onClick={() => handleSort('created_at')}>Ngày tạo</th>
                            <th>Trạng thái</th>
                            <th className="text-right">Hành động</th>
                          </>
                        )}
                        {activeTab === 'products' && (
                          <>
                            <th onClick={() => handleSort('title')}>Sản phẩm</th>
                            <th onClick={() => handleSort('price')}>Giá bán</th>
                            <th>Người bán</th>
                            <th onClick={() => handleSort('created_at')}>Ngày đăng</th>
                            <th className="text-right">Action</th>
                          </>
                        )}
                        {activeTab === 'reports' && <><th>Lý do</th><th>Người báo cáo</th><th>Sản phẩm</th><th>Status</th><th className="text-right">Action</th></>}
                      </tr>
                    </thead>
                    <tbody>
                      {/* USERS */}
                      {activeTab === 'users' && users.map(u => {
                        const banned = isBanned(u.banned_until);
                        return (
                          <tr key={u.id}>
                            <td className="font-bold text-slate-700">{u.name}</td>
                            <td className="font-mono text-xs">{u.email}</td>
                            <td>{new Date(u.created_at).toLocaleDateString('vi-VN')}</td>
                            <td><span className={`badge ${banned ? 'badge-red' : 'badge-green'}`}>{getBanLabel(u.banned_until)}</span></td>
                            <td className="text-right">
                              {u.role !== 'admin' && (
                                <button onClick={() => initiateBanUser(u)} className={`p-2 rounded hover:bg-slate-100 ${banned ? 'text-green-600' : 'text-red-600'}`} title={banned ? "Mở khóa" : "Khóa tài khoản"}>
                                  {banned ? <CheckCircle size={18}/> : <Ban size={18}/>}
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}

                      {/* PRODUCTS */}
                      {activeTab === 'products' && products.map(p => (
                        <tr key={p.id}>
                          <td className="font-bold text-slate-700 max-w-xs truncate">{p.title}</td>
                          <td className="font-mono text-blue-600 font-bold">{new Intl.NumberFormat('vi-VN').format(p.price)}₫</td>
                          <td>{getSellerName(p.seller)}</td>
                          <td>{new Date(p.created_at).toLocaleDateString('vi-VN')}</td>
                          <td className="text-right">
                            <button onClick={() => window.open(`/product/${p.id}`, '_blank')} className="p-2 text-blue-500 hover:bg-blue-50 rounded"><Eye size={18}/></button>
                            <button onClick={() => handleDeleteProduct(p.id)} className="p-2 text-red-500 hover:bg-red-50 rounded"><Trash2 size={18}/></button>
                          </td>
                        </tr>
                      ))}

                      {/* REPORTS */}
                      {activeTab === 'reports' && reports.map(r => (
                        <tr key={r.id}>
                          <td className="font-bold text-slate-700">{r.reason}</td>
                          <td>{r.reporter?.name || 'Ẩn danh'}</td>
                          <td><a href={`/product/${r.product?.id}`} target="_blank" className="text-blue-600 hover:underline">{r.product?.title || 'Đã xóa'}</a></td>
                          <td><span className={`badge ${r.status === 'pending' ? 'badge-yellow' : 'badge-green'}`}>{r.status}</span></td>
                          <td className="text-right">
                            {r.status === 'pending' && (
                              <div className="flex justify-end gap-2">
                                <button onClick={() => handleDeleteProduct(r.product?.id)} className="text-red-600 hover:bg-red-50 p-1.5 rounded" title="Xóa bài"><Trash2 size={16}/></button>
                                <button onClick={() => handleResolveReport(r.id, 'dismissed')} className="text-slate-500 hover:bg-slate-100 p-1.5 rounded" title="Bỏ qua"><XCircle size={16}/></button>
                                <button onClick={() => handleResolveReport(r.id, 'resolved')} className="text-green-600 hover:bg-green-50 p-1.5 rounded" title="Đã xử lý"><CheckCircle size={16}/></button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

// Helper components missing in previous snippets
const TableSkeleton = () => (
  <div className="w-full animate-pulse">
    {[...Array(5)].map((_, i) => <div key={i} className="skeleton-row rounded-lg"></div>)}
  </div>
);

export default AdminPage;
