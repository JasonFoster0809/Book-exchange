import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Users, Package, AlertTriangle, Settings, 
  Search, Bell, LogOut, CheckCircle, XCircle, Trash2, 
  MoreVertical, Shield, Ban, Eye, Filter, ArrowUpRight, 
  ArrowDownRight, Activity, Menu, X, ChevronRight
} from "lucide-react";
import { supabase } from "../services/supabase";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";

// ============================================================================
// 1. TYPES & STYLES
// ============================================================================

interface AdminStats {
  totalUsers: number;
  totalProducts: number;
  totalReports: number;
  revenue: number; // Giả lập (nếu có thu phí)
}

interface UserData {
  id: string;
  email: string;
  name: string;
  avatar_url: string;
  role: string;
  created_at: string;
}

interface ReportData {
  id: string;
  reason: string;
  status: 'pending' | 'resolved' | 'dismissed';
  created_at: string;
  reporter: { name: string };
  product: { id: string; title: string; seller_id: string };
}

const VisualEngine = () => (
  <style>{`
    :root { 
      --cobalt-900: #002147; 
      --cobalt-600: #0047AB; 
      --bg-admin: #F1F5F9;
    }
    body { background-color: var(--bg-admin); color: #334155; font-family: 'Inter', sans-serif; }
    
    /* Sidebar */
    .sidebar {
      background: linear-gradient(180deg, #002147 0%, #001529 100%);
      color: white;
    }
    .sidebar-link {
      transition: all 0.2s;
      border-right: 3px solid transparent;
      opacity: 0.7;
    }
    .sidebar-link:hover, .sidebar-link.active {
      background: rgba(255, 255, 255, 0.1);
      opacity: 1;
      border-right-color: #00E5FF;
    }

    /* Cards */
    .stat-card {
      background: white;
      border-radius: 16px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
      border: 1px solid #E2E8F0;
      transition: transform 0.2s;
    }
    .stat-card:hover { transform: translateY(-2px); box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); }

    /* Tables */
    .table-container {
      background: white;
      border-radius: 16px;
      border: 1px solid #E2E8F0;
      overflow: hidden;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
    }
    th { background-color: #F8FAFC; color: #64748B; font-weight: 700; text-transform: uppercase; font-size: 0.75rem; letter-spacing: 0.05em; }
    tr:hover td { background-color: #F8FAFC; }

    /* Utilities */
    .badge { padding: 2px 8px; border-radius: 9999px; font-size: 0.7rem; font-weight: 700; text-transform: uppercase; }
    .badge-success { background: #DCFCE7; color: #166534; }
    .badge-warning { background: #FEF3C7; color: #92400E; }
    .badge-danger { background: #FEE2E2; color: #991B1B; }
    .badge-info { background: #DBEAFE; color: #1E40AF; }

    .hide-scrollbar::-webkit-scrollbar { display: none; }
    .animate-enter { animation: slideUp 0.4s ease-out forwards; opacity: 0; }
    @keyframes slideUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
  `}</style>
);

// ============================================================================
// 2. SUB-COMPONENTS
// ============================================================================

const StatCard = ({ title, value, icon: Icon, trend, color }: any) => (
  <div className="stat-card p-6 flex items-start justify-between">
    <div>
      <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">{title}</p>
      <h3 className="text-3xl font-black text-slate-800 mb-2">{value}</h3>
      <div className={`flex items-center gap-1 text-xs font-bold ${trend > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
        {trend > 0 ? <ArrowUpRight size={14}/> : <ArrowDownRight size={14}/>}
        {Math.abs(trend)}% tuần qua
      </div>
    </div>
    <div className={`p-3 rounded-2xl ${color} bg-opacity-10 text-opacity-100`}>
      <Icon size={24} className={color.replace('bg-', 'text-')}/>
    </div>
  </div>
);

// ============================================================================
// 3. MAIN ADMIN PAGE
// ============================================================================
const AdminPage = () => {
  const { user, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const { addToast } = useToast();
  
  // State
  const [activeTab, setActiveTab] = useState<'dashboard' | 'users' | 'products' | 'reports'>('dashboard');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AdminStats>({ totalUsers: 0, totalProducts: 0, totalReports: 0, revenue: 0 });
  const [users, setUsers] = useState<UserData[]>([]);
  const [reports, setReports] = useState<ReportData[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [isSidebarOpen, setSidebarOpen] = useState(true);

  // Security Check
  useEffect(() => {
    // Note: Logic check isAdmin thực tế cần strict hơn ở backend RLS
    if (!loading && (!user || !isAdmin)) {
      addToast("Truy cập bị từ chối. Chỉ dành cho Admin.", "error");
      navigate("/");
    }
  }, [user, isAdmin, loading, navigate]);

  // Fetch Data
  const fetchAllData = async () => {
    setLoading(true);
    try {
      // 1. Stats Counters
      const { count: userCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
      const { count: productCount } = await supabase.from('products').select('*', { count: 'exact', head: true });
      const { count: reportCount } = await supabase.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'pending');
      
      setStats({
        totalUsers: userCount || 0,
        totalProducts: productCount || 0,
        totalReports: reportCount || 0,
        revenue: 0 // Mock
      });

      // 2. Lists
      const { data: uData } = await supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(20);
      const { data: rData } = await supabase.from('reports').select(`*, reporter:profiles!reporter_id(name), product:products(id, title, seller_id)`).order('created_at', { ascending: false });
      const { data: pData } = await supabase.from('products').select(`*, seller:profiles(name)`).order('created_at', { ascending: false }).limit(20);

      setUsers(uData as any || []);
      setReports(rData as any || []);
      setProducts(pData || []);

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAllData(); }, []);

  // Actions
  const handleBanUser = async (userId: string, currentRole: string) => {
    const newRole = currentRole === 'banned' ? 'user' : 'banned';
    if(!confirm(`Bạn có chắc muốn ${newRole === 'banned' ? 'KHÓA' : 'MỞ KHÓA'} tài khoản này?`)) return;
    
    const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', userId);
    if (!error) {
        addToast("Cập nhật trạng thái thành công", "success");
        setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
    } else addToast("Lỗi hệ thống", "error");
  };

  const handleDeleteProduct = async (productId: string) => {
    if(!confirm("Xóa vĩnh viễn sản phẩm này?")) return;
    const { error } = await supabase.from('products').delete().eq('id', productId);
    if (!error) {
        setProducts(products.filter(p => p.id !== productId));
        addToast("Đã xóa sản phẩm", "success");
    }
  };

  const handleReportAction = async (reportId: string, status: 'resolved' | 'dismissed') => {
    const { error } = await supabase.from('reports').update({ status }).eq('id', reportId);
    if (!error) {
        setReports(reports.map(r => r.id === reportId ? { ...r, status } : r));
        addToast(`Đã ${status === 'resolved' ? 'xử lý' : 'bỏ qua'} báo cáo`, "success");
    }
  };

  if (!isAdmin) return null;

  return (
    <div className="flex min-h-screen bg-[#F1F5F9] font-sans">
      <VisualEngine />

      {/* --- SIDEBAR --- */}
      <aside className={`sidebar fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 flex flex-col shadow-2xl`}>
        <div className="h-16 flex items-center px-6 border-b border-white/10">
          <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center font-black text-white mr-3">A</div>
          <span className="font-bold text-lg tracking-tight">BK ADMIN</span>
        </div>

        <nav className="flex-1 px-3 py-6 space-y-1">
          {[
            { id: 'dashboard', label: 'Tổng quan', icon: LayoutDashboard },
            { id: 'users', label: 'Người dùng', icon: Users },
            { id: 'products', label: 'Tin đăng', icon: Package },
            { id: 'reports', label: 'Báo cáo', icon: AlertTriangle },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={`sidebar-link w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium ${activeTab === item.id ? 'active bg-white/10 text-white' : 'text-slate-300 hover:text-white'}`}
            >
              <item.icon size={18} />
              {item.label}
              {item.id === 'reports' && stats.totalReports > 0 && <span className="ml-auto bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{stats.totalReports}</span>}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-white/10">
          <button onClick={() => navigate('/')} className="w-full flex items-center gap-3 px-4 py-3 text-slate-300 hover:text-white text-sm font-medium transition-colors rounded-lg hover:bg-white/5">
            <LogOut size={18} /> Quay về Website
          </button>
        </div>
      </aside>

      {/* --- MAIN CONTENT --- */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 z-10">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="md:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-lg">
              <Menu size={20}/>
            </button>
            <h2 className="text-xl font-bold text-slate-800 hidden md:block capitalize">{activeTab === 'dashboard' ? 'Bảng điều khiển' : activeTab}</h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
              <input placeholder="Tìm kiếm nhanh..." className="bg-slate-100 border-none rounded-full pl-10 pr-4 py-2 text-sm text-slate-700 w-64 outline-none focus:ring-2 focus:ring-blue-500/20"/>
            </div>
            <button className="p-2 text-slate-500 hover:bg-slate-100 rounded-full relative">
              <Bell size={20}/>
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full border border-white"></span>
            </button>
            <div className="flex items-center gap-3 pl-4 border-l border-slate-200">
              <div className="text-right hidden md:block">
                <p className="text-sm font-bold text-slate-700">{user?.name || "Admin"}</p>
                <p className="text-xs text-slate-500">Super Admin</p>
              </div>
              <img src={user?.avatar || "https://ui-avatars.com/api/?name=Admin"} className="w-9 h-9 rounded-full border border-slate-200"/>
            </div>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="max-w-7xl mx-auto space-y-8 animate-enter">
            
            {/* 1. DASHBOARD TAB */}
            {activeTab === 'dashboard' && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <StatCard title="Tổng Thành Viên" value={stats.totalUsers} icon={Users} trend={12} color="bg-blue-500"/>
                  <StatCard title="Tổng Tin Đăng" value={stats.totalProducts} icon={Package} trend={8} color="bg-purple-500"/>
                  <StatCard title="Cần Xử Lý" value={stats.totalReports} icon={AlertTriangle} trend={-5} color="bg-rose-500"/>
                  <StatCard title="Lượt Truy Cập" value="15.2k" icon={Activity} trend={24} color="bg-emerald-500"/>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="font-bold text-slate-800">Hoạt động gần đây</h3>
                      <button className="text-blue-600 text-sm font-bold hover:underline">Xem tất cả</button>
                    </div>
                    <div className="h-64 flex items-end gap-2">
                       {[40, 60, 45, 70, 50, 80, 65, 90, 75, 60, 85, 95].map((h, i) => (
                         <div key={i} className="flex-1 bg-blue-500/10 hover:bg-blue-500 rounded-t transition-all group relative" style={{height: `${h}%`}}>
                           <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">{h}</div>
                         </div>
                       ))}
                    </div>
                  </div>
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <h3 className="font-bold text-slate-800 mb-6">Trạng thái hệ thống</h3>
                    <div className="space-y-4">
                      {[{l: "Server Uptime", v: "99.9%", s: "success"}, {l: "Database", v: "Healthy", s: "success"}, {l: "Storage", v: "45% Used", s: "warning"}, {l: "Errors", v: "0", s: "success"}].map((item, i) => (
                        <div key={i} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                          <span className="text-sm font-medium text-slate-600">{item.l}</span>
                          <span className={`badge badge-${item.s === 'success' ? 'success' : 'warning'}`}>{item.v}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* 2. USERS TAB */}
            {activeTab === 'users' && (
              <div className="table-container">
                <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-white">
                  <h3 className="font-bold text-slate-800">Danh sách thành viên</h3>
                  <div className="flex gap-2">
                    <input placeholder="Tìm email..." className="pro-input py-2 px-3 text-xs w-64"/>
                    <button className="p-2 bg-slate-100 rounded text-slate-600 hover:bg-slate-200"><Filter size={16}/></button>
                  </div>
                </div>
                <table className="w-full text-left text-sm text-slate-600">
                  <thead>
                    <tr>
                      <th className="p-4">User</th>
                      <th className="p-4">Vai trò</th>
                      <th className="p-4">Ngày tham gia</th>
                      <th className="p-4">Trạng thái</th>
                      <th className="p-4 text-right">Hành động</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {users.map((u) => (
                      <tr key={u.id} className="transition-colors">
                        <td className="p-4 flex items-center gap-3">
                          <img src={u.avatar_url || `https://ui-avatars.com/api/?name=${u.name}`} className="w-8 h-8 rounded-full bg-slate-200"/>
                          <div>
                            <p className="font-bold text-slate-800">{u.name}</p>
                            <p className="text-xs text-slate-400">{u.email}</p>
                          </div>
                        </td>
                        <td className="p-4"><span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-bold border border-slate-200 uppercase">{u.role}</span></td>
                        <td className="p-4">{new Date(u.created_at).toLocaleDateString('vi-VN')}</td>
                        <td className="p-4">
                          <span className={`badge ${u.role === 'banned' ? 'badge-danger' : 'badge-success'}`}>
                            {u.role === 'banned' ? 'Banned' : 'Active'}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          {u.role !== 'admin' && (
                            <button 
                              onClick={() => handleBanUser(u.id, u.role)}
                              className={`p-2 rounded transition-colors ${u.role === 'banned' ? 'text-emerald-600 hover:bg-emerald-50' : 'text-rose-600 hover:bg-rose-50'}`}
                              title={u.role === 'banned' ? "Mở khóa" : "Khóa tài khoản"}
                            >
                              {u.role === 'banned' ? <CheckCircle size={16}/> : <Ban size={16}/>}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* 3. PRODUCTS TAB */}
            {activeTab === 'products' && (
              <div className="table-container">
                <div className="p-5 border-b border-slate-200 bg-white">
                  <h3 className="font-bold text-slate-800">Quản lý tin đăng</h3>
                </div>
                <table className="w-full text-left text-sm text-slate-600">
                  <thead>
                    <tr>
                      <th className="p-4">Sản phẩm</th>
                      <th className="p-4">Giá bán</th>
                      <th className="p-4">Người bán</th>
                      <th className="p-4">Ngày đăng</th>
                      <th className="p-4 text-right">Tùy chọn</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {products.map((p) => (
                      <tr key={p.id}>
                        <td className="p-4 flex items-center gap-3 max-w-xs">
                          <img src={p.images?.[0] || 'https://via.placeholder.com/40'} className="w-10 h-10 rounded bg-slate-100 object-cover"/>
                          <p className="font-bold text-slate-800 truncate">{p.title}</p>
                        </td>
                        <td className="p-4 font-mono font-bold text-[#0047AB]">{new Intl.NumberFormat('vi-VN', {style:'currency', currency:'VND'}).format(p.price)}</td>
                        <td className="p-4">{p.seller?.name || 'Unknown'}</td>
                        <td className="p-4">{new Date(p.created_at).toLocaleDateString('vi-VN')}</td>
                        <td className="p-4 text-right">
                          <div className="flex justify-end gap-2">
                            <a href={`/product/${p.id}`} target="_blank" rel="noreferrer" className="p-2 text-blue-500 hover:bg-blue-50 rounded"><Eye size={16}/></a>
                            <button onClick={() => handleDeleteProduct(p.id)} className="p-2 text-rose-500 hover:bg-rose-50 rounded"><Trash2 size={16}/></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* 4. REPORTS TAB */}
            {activeTab === 'reports' && (
              <div className="space-y-4">
                {reports.length === 0 ? (
                  <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
                    <Shield size={48} className="mx-auto text-emerald-500 mb-4"/>
                    <h3 className="text-lg font-bold text-slate-800">Không có báo cáo vi phạm</h3>
                    <p className="text-slate-500 text-sm">Cộng đồng đang hoạt động tốt!</p>
                  </div>
                ) : (
                  reports.map((report) => (
                    <div key={report.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start gap-4 animate-enter">
                      <div className="bg-rose-50 p-3 rounded-full text-rose-600 shrink-0"><AlertTriangle size={24}/></div>
                      <div className="flex-1 w-full">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-bold text-slate-800 text-lg">Lý do: {report.reason}</h4>
                          <span className={`badge ${report.status === 'pending' ? 'badge-warning' : 'badge-success'}`}>{report.status}</span>
                        </div>
                        <p className="text-slate-500 text-sm mb-4">
                          Báo cáo bởi <strong className="text-slate-800">{report.reporter?.name || 'Ẩn danh'}</strong> <br/>
                          Về sản phẩm: <a href={`/product/${report.product?.id}`} target="_blank" className="text-blue-600 hover:underline font-medium">{report.product?.title || 'Sản phẩm đã bị xóa'}</a>
                        </p>
                        
                        {report.status === 'pending' && (
                          <div className="flex gap-3 pt-2 border-t border-slate-100">
                            <button onClick={() => handleDeleteProduct(report.product?.id)} className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-colors">
                              <Trash2 size={14}/> Xóa tin đăng
                            </button>
                            <button onClick={() => handleReportAction(report.id, 'dismissed')} className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-bold transition-colors">
                              <XCircle size={14}/> Bỏ qua
                            </button>
                            <button onClick={() => handleReportAction(report.id, 'resolved')} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors">
                              <CheckCircle size={14}/> Đánh dấu đã xử lý
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminPage;
