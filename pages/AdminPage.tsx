import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Users, Package, AlertTriangle, 
  Search, LogOut, CheckCircle, Trash2, 
  Shield, Ban, Eye, ChevronLeft, ChevronRight,
  Activity, Calendar, ArrowUpRight, 
  TrendingUp, XCircle // <--- ĐÃ BỔ SUNG IMPORT TẠI ĐÂY
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

// Helper để lấy tên người bán an toàn
const getSellerName = (seller: any) => {
  if (Array.isArray(seller)) return seller[0]?.name || 'Ẩn danh';
  return seller?.name || 'Ẩn danh';
};

// ============================================================================
// 2. VISUAL ENGINE (CSS)
// ============================================================================
const VisualEngine = () => (
  <style>{`
    :root { 
      --primary: #0F172A; 
      --accent: #3B82F6;
      --bg-body: #F8FAFC;
      --border: #E2E8F0;
    }
    body { background-color: var(--bg-body); color: #334155; font-family: 'Inter', sans-serif; }
    
    /* Layout */
    .admin-layout { display: flex; min-height: 100vh; }
    
    /* Sidebar */
    .sidebar { 
      width: 260px; background-color: var(--primary); color: #94A3B8; 
      flex-shrink: 0; display: flex; flex-direction: column; 
      transition: all 0.3s;
    }
    .sidebar-link {
      display: flex; items-center; gap: 12px; padding: 14px 24px;
      font-weight: 500; font-size: 0.9rem; transition: all 0.2s;
      border-left: 3px solid transparent; color: #94A3B8;
    }
    .sidebar-link:hover { background-color: rgba(255,255,255,0.05); color: #F8FAFC; }
    .sidebar-link.active { 
      background-color: rgba(59, 130, 246, 0.1); color: white; 
      border-left-color: var(--accent); 
    }

    /* Content */
    .main-content { flex: 1; display: flex; flex-direction: column; height: 100vh; overflow: hidden; }
    .top-header { 
      background: white; border-bottom: 1px solid var(--border); height: 64px; 
      padding: 0 32px; display: flex; align-items: center; justify-content: space-between;
    }

    /* Dashboard Grid */
    .dashboard-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 24px; margin-bottom: 24px; }
    .stat-card { 
      background: white; padding: 24px; border-radius: 12px; 
      border: 1px solid var(--border); box-shadow: 0 1px 2px rgba(0,0,0,0.05); 
    }

    /* Chart Bar */
    .chart-bar {
      transition: height 1s ease-out;
      border-radius: 4px 4px 0 0;
      min-height: 4px;
    }

    /* Tables */
    .table-wrapper { 
      background: white; border-radius: 12px; border: 1px solid var(--border); 
      overflow: hidden; box-shadow: 0 1px 2px rgba(0,0,0,0.05); 
    }
    .data-table { width: 100%; text-align: left; border-collapse: collapse; }
    .data-table th { 
      background: #F8FAFC; padding: 16px 24px; font-size: 0.75rem; 
      font-weight: 700; text-transform: uppercase; color: #64748B; 
      border-bottom: 1px solid var(--border); 
    }
    .data-table td { padding: 16px 24px; border-bottom: 1px solid var(--border); font-size: 0.875rem; }
    .data-table tr:hover { background-color: #F8FAFC; }

    /* Utilities */
    .badge { padding: 4px 10px; border-radius: 99px; font-size: 0.7rem; font-weight: 700; display: inline-flex; items-center; gap: 4px; }
    .badge-green { background: #DCFCE7; color: #166534; }
    .badge-red { background: #FEE2E2; color: #991B1B; }
    .badge-yellow { background: #FEF3C7; color: #92400E; }
    .badge-blue { background: #DBEAFE; color: #1E40AF; }

    .hide-scrollbar::-webkit-scrollbar { display: none; }
    .animate-enter { animation: slideUp 0.4s ease-out forwards; opacity: 0; }
    @keyframes slideUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
  `}</style>
);

// ============================================================================
// 3. SUB-COMPONENTS
// ============================================================================

const StatCard = ({ title, value, icon: Icon, color }: any) => (
  <div className="stat-card flex items-start justify-between group hover:border-blue-200 transition-colors">
    <div>
      <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">{title}</p>
      <h3 className="text-3xl font-black text-slate-800 tracking-tight">{value}</h3>
    </div>
    <div className={`p-3 rounded-xl ${color} bg-opacity-10 text-opacity-100 group-hover:scale-110 transition-transform`}>
      <Icon size={24} className={color.replace('bg-', 'text-')}/>
    </div>
  </div>
);

// ============================================================================
// 4. MAIN ADMIN PAGE
// ============================================================================
const AdminPage = () => {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { addToast } = useToast();
  
  // Tabs & Navigation
  const [activeTab, setActiveTab] = useState<'dashboard' | 'users' | 'products' | 'reports'>('dashboard');
  
  // Data States
  const [stats, setStats] = useState<DashboardStats>({ totalUsers: 0, totalProducts: 0, pendingReports: 0, revenue: 0 });
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  
  // List States with Pagination
  const [users, setUsers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");

  // Security Check
  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      addToast("Truy cập bị từ chối.", "error");
      navigate("/");
    }
  }, [user, isAdmin, loading]);

  // --- DATA FETCHING ENGINE ---
  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // 1. Basic Counts
      const { count: uCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
      const { count: pCount } = await supabase.from('products').select('*', { count: 'exact', head: true });
      const { count: rCount } = await supabase.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'pending');
      
      // 2. Real Market Value
      const { data: priceData } = await supabase.from('products').select('price').eq('status', 'available');
      const totalVal = priceData?.reduce((a, b) => a + (b.price || 0), 0) || 0;

      setStats({
        totalUsers: uCount || 0,
        totalProducts: pCount || 0,
        pendingReports: rCount || 0,
        revenue: totalVal
      });

      // 3. Chart Data (Last 7 Days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
      
      const { data: recentUsers } = await supabase.from('profiles').select('created_at').gte('created_at', sevenDaysAgo.toISOString());
      const { data: recentProducts } = await supabase.from('products').select('created_at').gte('created_at', sevenDaysAgo.toISOString());

      const chartMap = new Map<string, {users: number, products: number}>();
      
      // Initialize 7 days
      for(let i=0; i<7; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        chartMap.set(d.toLocaleDateString('vi-VN'), { users: 0, products: 0 });
      }

      recentUsers?.forEach(u => {
        const key = new Date(u.created_at).toLocaleDateString('vi-VN');
        if(chartMap.has(key)) chartMap.get(key)!.users++;
      });
      recentProducts?.forEach(p => {
        const key = new Date(p.created_at).toLocaleDateString('vi-VN');
        if(chartMap.has(key)) chartMap.get(key)!.products++;
      });

      setChartData(Array.from(chartMap.entries()).map(([date, val]) => ({ date, ...val })).reverse());

      // 4. Activity Feed (Merged Stream)
      const { data: uLogs } = await supabase.from('profiles').select('id, name, created_at').order('created_at', { ascending: false }).limit(5);
      const { data: pLogs } = await supabase.from('products').select('id, title, created_at, seller:profiles(name)').order('created_at', { ascending: false }).limit(5);

      const mixedLogs: ActivityLog[] = [
        ...(uLogs?.map(u => ({ id: u.id, type: 'user_join', message: `${u.name} đã tham gia hệ thống`, time: u.created_at } as ActivityLog)) || []),
        ...(pLogs?.map(p => ({ 
            id: p.id, 
            type: 'new_product', 
            message: `${getSellerName(p.seller)} đăng bán "${p.title}"`,
            time: p.created_at 
        } as ActivityLog)) || [])
      ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 10);

      setActivities(mixedLogs);

    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const fetchTableData = async () => {
    setLoading(true);
    const from = page * ITEMS_PER_PAGE;
    const to = from + ITEMS_PER_PAGE - 1;

    try {
      if (activeTab === 'users') {
        let q = supabase.from('profiles').select('*').order('created_at', { ascending: false });
        if (searchTerm) q = q.ilike('email', `%${searchTerm}%`);
        const { data } = await q.range(from, to);
        setUsers(data || []);
      } 
      else if (activeTab === 'products') {
        let q = supabase.from('products').select('*, seller:profiles(name)').order('created_at', { ascending: false });
        if (searchTerm) q = q.ilike('title', `%${searchTerm}%`);
        const { data } = await q.range(from, to);
        setProducts(data || []);
      }
      else if (activeTab === 'reports') {
        const { data } = await supabase.from('reports')
          .select('*, reporter:profiles!reporter_id(name), product:products(id, title)')
          .order('created_at', { ascending: false })
          .range(from, to);
        setReports(data || []);
      }
    } catch(e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => {
    if (activeTab === 'dashboard') fetchDashboardData();
    else fetchTableData();
  }, [activeTab, page, searchTerm]);

  // Actions
  const handleAction = async (action: string, id: string, payload?: any) => {
    if(!confirm("Xác nhận thực hiện hành động này?")) return;
    try {
      if(action === 'ban_user') await supabase.from('profiles').update({ role: payload }).eq('id', id);
      if(action === 'delete_product') await supabase.from('products').delete().eq('id', id);
      if(action === 'resolve_report') await supabase.from('reports').update({ status: payload }).eq('id', id);
      
      addToast("Thành công", "success");
      fetchTableData(); // Reload
    } catch(e) { addToast("Có lỗi xảy ra", "error"); }
  };

  if (!isAdmin) return null;

  return (
    <div className="admin-layout">
      <VisualEngine />

      {/* --- SIDEBAR --- */}
      <aside className="sidebar">
        <div className="h-16 flex items-center px-6 border-b border-slate-700/50">
          <Shield className="text-blue-500 mr-3" size={24}/>
          <span className="font-bold text-white text-xl tracking-tight">ADMIN CP</span>
        </div>

        <div className="flex-1 py-6 px-3 space-y-1">
          {[
            { id: 'dashboard', label: 'Tổng quan', icon: LayoutDashboard },
            { id: 'users', label: 'Thành viên', icon: Users },
            { id: 'products', label: 'Tin đăng', icon: Package },
            { id: 'reports', label: 'Khiếu nại', icon: AlertTriangle },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => { setActiveTab(item.id as any); setPage(0); setSearchTerm(""); }}
              className={`sidebar-link w-full rounded-lg ${activeTab === item.id ? 'active' : ''}`}
            >
              <item.icon size={18} />
              <span className="flex-1 text-left">{item.label}</span>
              {item.id === 'reports' && stats.pendingReports > 0 && <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{stats.pendingReports}</span>}
            </button>
          ))}
        </div>

        <div className="p-4 border-t border-slate-700/50">
          <button onClick={() => navigate('/')} className="sidebar-link w-full rounded-lg text-slate-400 hover:text-white justify-center border border-slate-600 hover:border-slate-400">
            <LogOut size={16} /> Về trang chủ
          </button>
        </div>
      </aside>

      {/* --- CONTENT --- */}
      <main className="main-content bg-[#F1F5F9]">
        <header className="top-header sticky top-0 z-20">
          <h2 className="text-xl font-bold text-slate-800 capitalize">{activeTab === 'dashboard' ? 'Dashboard' : 'Quản lý dữ liệu'}</h2>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="text-right hidden md:block">
                <p className="text-sm font-bold text-slate-700">{user?.name}</p>
                <p className="text-xs text-slate-500 uppercase font-bold text-blue-600">Administrator</p>
              </div>
              <img src={user?.avatar || "https://ui-avatars.com/api/?name=Admin"} className="w-9 h-9 rounded-full border border-slate-200"/>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8">
          {/* DASHBOARD */}
          {activeTab === 'dashboard' && (
            <div className="max-w-7xl mx-auto space-y-6 animate-enter">
              {/* Stats Cards */}
              <div className="dashboard-grid">
                <StatCard title="Thành viên" value={stats.totalUsers} icon={Users} color="bg-blue-500"/>
                <StatCard title="Tin đăng" value={stats.totalProducts} icon={Package} color="bg-indigo-500"/>
                <StatCard title="Khiếu nại" value={stats.pendingReports} icon={AlertTriangle} color="bg-rose-500"/>
                <StatCard title="Tổng giá trị sàn" value={`${new Intl.NumberFormat('vi-VN', { notation: "compact" }).format(stats.revenue)}₫`} icon={TrendingUp} color="bg-emerald-500"/>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Real Chart */}
                <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                  <div className="flex justify-between items-center mb-8">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2"><Activity size={18} className="text-blue-500"/> Tăng trưởng 7 ngày qua</h3>
                  </div>
                  <div className="h-64 flex items-end justify-between gap-4 px-2">
                    {chartData.map((d, i) => (
                      <div key={i} className="flex-1 flex flex-col justify-end gap-1 group relative">
                        {/* Tooltip */}
                        <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs p-2 rounded opacity-0 group-hover:opacity-100 transition-opacity z-10 whitespace-nowrap">
                          {d.date}: {d.products} Tin, {d.users} Mem
                        </div>
                        {/* Bars */}
                        <div className="w-full bg-blue-500 rounded-t opacity-80 hover:opacity-100 transition-all chart-bar" style={{height: `${Math.max(d.products * 5, 4)}%`}}></div>
                        <div className="w-full bg-slate-300 rounded-t opacity-80 hover:opacity-100 transition-all chart-bar" style={{height: `${Math.max(d.users * 5, 4)}%`}}></div>
                        <span className="text-[10px] text-slate-400 text-center mt-2 font-medium">{d.date.slice(0,5)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-center gap-6 mt-6">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-500"><span className="w-3 h-3 bg-blue-500 rounded-full"></span> Tin đăng mới</div>
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-500"><span className="w-3 h-3 bg-slate-300 rounded-full"></span> Thành viên mới</div>
                  </div>
                </div>

                {/* Activity Feed */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                  <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2"><Calendar size={18} className="text-orange-500"/> Hoạt động mới</h3>
                  <div className="space-y-6 overflow-y-auto flex-1 pr-2">
                    {activities.map((act) => (
                      <div key={act.id} className="flex gap-3 items-start">
                        <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${act.type === 'user_join' ? 'bg-blue-500' : 'bg-emerald-500'}`}></div>
                        <div>
                          <p className="text-sm text-slate-700 font-medium leading-snug">{act.message}</p>
                          <p className="text-xs text-slate-400 mt-1">{new Date(act.time).toLocaleString('vi-VN')}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* LIST VIEWS (Users, Products, Reports) */}
          {activeTab !== 'dashboard' && (
            <div className="animate-enter">
              <div className="flex justify-between items-center mb-6">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
                  <input 
                    placeholder="Tìm kiếm..." 
                    className="pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm w-64 focus:border-blue-500 outline-none"
                    value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0} className="p-2 border rounded hover:bg-white disabled:opacity-50"><ChevronLeft size={16}/></button>
                  <span className="px-4 py-2 text-sm font-bold text-slate-600 bg-white border rounded">Trang {page + 1}</span>
                  <button onClick={() => setPage(page + 1)} className="p-2 border rounded hover:bg-white"><ChevronRight size={16}/></button>
                </div>
              </div>

              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      {activeTab === 'users' && <><th>User</th><th>Email</th><th>Role</th><th>Ngày tạo</th><th>Status</th><th className="text-right">Action</th></>}
                      {activeTab === 'products' && <><th>Sản phẩm</th><th>Giá</th><th>Người bán</th><th>Ngày đăng</th><th className="text-right">Action</th></>}
                      {activeTab === 'reports' && <><th>Lý do</th><th>Người báo cáo</th><th>Sản phẩm</th><th>Status</th><th className="text-right">Action</th></>}
                    </tr>
                  </thead>
                  <tbody>
                    {/* USERS ROW */}
                    {activeTab === 'users' && users.map(u => (
                      <tr key={u.id}>
                        <td className="font-bold text-slate-700">{u.name}</td>
                        <td className="font-mono text-xs">{u.email}</td>
                        <td><span className="bg-slate-100 px-2 py-1 rounded text-xs font-bold uppercase">{u.role}</span></td>
                        <td>{new Date(u.created_at).toLocaleDateString('vi-VN')}</td>
                        <td><span className={`badge ${u.role === 'banned' ? 'badge-red' : 'badge-green'}`}>{u.role === 'banned' ? 'Banned' : 'Active'}</span></td>
                        <td className="text-right">
                          {u.role !== 'admin' && (
                            <button onClick={() => handleAction('ban_user', u.id, u.role === 'banned' ? 'user' : 'banned')} className={`p-2 rounded hover:bg-slate-100 ${u.role === 'banned' ? 'text-green-600' : 'text-red-600'}`}>
                              {u.role === 'banned' ? <CheckCircle size={18}/> : <Ban size={18}/>}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}

                    {/* PRODUCTS ROW */}
                    {activeTab === 'products' && products.map(p => (
                      <tr key={p.id}>
                        <td className="font-bold text-slate-700 max-w-xs truncate">{p.title}</td>
                        <td className="font-mono text-blue-600 font-bold">{new Intl.NumberFormat('vi-VN').format(p.price)}₫</td>
                        <td>{getSellerName(p.seller)}</td>
                        <td>{new Date(p.created_at).toLocaleDateString('vi-VN')}</td>
                        <td className="text-right">
                          <button onClick={() => window.open(`/product/${p.id}`, '_blank')} className="p-2 text-blue-500 hover:bg-blue-50 rounded"><Eye size={18}/></button>
                          <button onClick={() => handleAction('delete_product', p.id)} className="p-2 text-red-500 hover:bg-red-50 rounded"><Trash2 size={18}/></button>
                        </td>
                      </tr>
                    ))}

                    {/* REPORTS ROW */}
                    {activeTab === 'reports' && reports.map(r => (
                      <tr key={r.id}>
                        <td className="font-bold text-slate-700">{r.reason}</td>
                        <td>{r.reporter?.name || 'Ẩn danh'}</td>
                        <td><a href={`/product/${r.product?.id}`} target="_blank" className="text-blue-600 hover:underline">{r.product?.title || 'Đã xóa'}</a></td>
                        <td><span className={`badge ${r.status === 'pending' ? 'badge-yellow' : 'badge-green'}`}>{r.status}</span></td>
                        <td className="text-right">
                          {r.status === 'pending' && (
                            <div className="flex justify-end gap-2">
                              <button onClick={() => handleAction('delete_product', r.product?.id)} className="text-red-600 hover:bg-red-50 p-1.5 rounded" title="Xóa bài"><Trash2 size={16}/></button>
                              <button onClick={() => handleAction('resolve_report', r.id, 'dismissed')} className="text-slate-500 hover:bg-slate-100 p-1.5 rounded" title="Bỏ qua"><XCircle size={16}/></button>
                              <button onClick={() => handleAction('resolve_report', r.id, 'resolved')} className="text-green-600 hover:bg-green-50 p-1.5 rounded" title="Đã xử lý"><CheckCircle size={16}/></button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default AdminPage;
