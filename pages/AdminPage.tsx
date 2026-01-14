import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Users, Package, AlertTriangle, Settings, 
  Search, Bell, LogOut, CheckCircle, XCircle, Trash2,ShieldCheck,
  MoreVertical, Shield, ShieldAlert, Ban, Eye, Filter,
  ArrowUpRight, ArrowDownRight, Activity
} from "lucide-react";
import { supabase } from "../services/supabase";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";

// ============================================================================
// 1. TYPES & VISUAL ENGINE
// ============================================================================

interface AdminStats {
  totalUsers: number;
  totalProducts: number;
  totalReports: number;
  totalRevenue: number; // Giả lập
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
    :root { --admin-bg: #0f172a; --admin-card: #1e293b; --admin-accent: #3b82f6; }
    body { background-color: var(--admin-bg); color: #e2e8f0; }
    
    .glass-panel {
      background: rgba(30, 41, 59, 0.7);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    }

    .sidebar-link {
      transition: all 0.2s;
      border-left: 3px solid transparent;
    }
    .sidebar-link.active {
      background: rgba(59, 130, 246, 0.1);
      border-left-color: #3b82f6;
      color: #60a5fa;
    }

    .table-row:hover { background-color: rgba(255,255,255,0.03); }
    
    /* Scrollbar */
    ::-webkit-scrollbar { width: 6px; height: 6px; }
    ::-webkit-scrollbar-track { background: #0f172a; }
    ::-webkit-scrollbar-thumb { background: #334155; border-radius: 3px; }

    /* Animations */
    .animate-fade-in { animation: fadeIn 0.4s ease-out; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
  `}</style>
);

// ============================================================================
// 2. SUB-COMPONENTS
// ============================================================================

// --- Stat Card ---
const StatCard = ({ title, value, icon: Icon, trend, color }: any) => (
  <div className="glass-panel p-6 rounded-2xl relative overflow-hidden group">
    <div className={`absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity ${color}`}>
      <Icon size={64} />
    </div>
    <div className="relative z-10">
      <p className="text-slate-400 text-sm font-medium uppercase tracking-wider mb-1">{title}</p>
      <h3 className="text-3xl font-black text-white mb-2">{value}</h3>
      <div className={`flex items-center gap-1 text-xs font-bold ${trend > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
        {trend > 0 ? <ArrowUpRight size={14}/> : <ArrowDownRight size={14}/>}
        {Math.abs(trend)}% so với tháng trước
      </div>
    </div>
  </div>
);

// --- Status Badge ---
const StatusBadge = ({ status }: { status: string }) => {
  const styles: any = {
    active: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    banned: "bg-rose-500/10 text-rose-400 border-rose-500/20",
    pending: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    resolved: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  };
  const labels: any = { active: "Hoạt động", banned: "Đã khóa", pending: "Chờ xử lý", resolved: "Đã xong" };
  
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${styles[status] || styles.pending}`}>
      {labels[status] || status}
    </span>
  );
};

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
  const [stats, setStats] = useState<AdminStats>({ totalUsers: 0, totalProducts: 0, totalReports: 0, totalRevenue: 0 });
  const [users, setUsers] = useState<UserData[]>([]);
  const [reports, setReports] = useState<ReportData[]>([]);
  const [products, setProducts] = useState<any[]>([]); // Dùng lại type Product nếu cần

  // Check Admin
  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      addToast("Bạn không có quyền truy cập!", "error");
      navigate("/");
    }
  }, [user, isAdmin, loading, navigate]);

  // Fetch Data
  const fetchAllData = async () => {
    setLoading(true);
    try {
      // 1. Stats
      const { count: userCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
      const { count: productCount } = await supabase.from('products').select('*', { count: 'exact', head: true });
      const { count: reportCount } = await supabase.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'pending');
      
      setStats({
        totalUsers: userCount || 0,
        totalProducts: productCount || 0,
        totalReports: reportCount || 0,
        totalRevenue: 15400000 // Fake data cho đẹp
      });

      // 2. Data Lists
      const { data: userData } = await supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(50);
      const { data: reportData } = await supabase.from('reports').select(`*, reporter:profiles!reporter_id(name), product:products(id, title, seller_id)`).order('created_at', { ascending: false });
      const { data: productData } = await supabase.from('products').select(`*, seller:profiles(name)`).order('created_at', { ascending: false }).limit(50);

      setUsers(userData as any || []);
      setReports(reportData as any || []);
      setProducts(productData || []);

    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAllData(); }, []);

  // Actions
  const handleBanUser = async (userId: string, isBanned: boolean) => {
    if(!confirm(isBanned ? "Mở khóa tài khoản này?" : "Khóa tài khoản này vĩnh viễn?")) return;
    
    // Logic thực tế cần update field banned_until hoặc status trong bảng profiles
    // Ở đây mình giả lập update state
    const { error } = await supabase.from('profiles').update({ role: isBanned ? 'user' : 'banned' }).eq('id', userId);
    
    if (!error) {
        addToast(isBanned ? "Đã mở khóa user" : "Đã khóa user", "success");
        setUsers(users.map(u => u.id === userId ? { ...u, role: isBanned ? 'user' : 'banned' } : u));
    } else {
        addToast("Lỗi cập nhật", "error");
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if(!confirm("Xóa sản phẩm này? Hành động không thể hoàn tác.")) return;
    await supabase.from('products').delete().eq('id', productId);
    setProducts(products.filter(p => p.id !== productId));
    addToast("Đã xóa sản phẩm", "success");
  };

  const handleResolveReport = async (reportId: string, action: 'resolved' | 'dismissed') => {
    await supabase.from('reports').update({ status: action }).eq('id', reportId);
    setReports(reports.map(r => r.id === reportId ? { ...r, status: action } : r));
    addToast("Đã xử lý báo cáo", "success");
  };

  if (!isAdmin) return null; // Prevent flash

  return (
    <div className="min-h-screen flex font-sans text-slate-300">
      <VisualEngine />

      {/* --- SIDEBAR --- */}
      <aside className="w-64 bg-[#0f172a] border-r border-slate-800 flex flex-col fixed h-full z-20">
        <div className="p-6 flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-black text-white">A</div>
          <span className="font-bold text-white text-lg tracking-tight">ADMIN CP</span>
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-4">
          {[
            { id: 'dashboard', label: 'Tổng quan', icon: LayoutDashboard },
            { id: 'users', label: 'Người dùng', icon: Users },
            { id: 'products', label: 'Sản phẩm', icon: Package },
            { id: 'reports', label: 'Báo cáo', icon: AlertTriangle },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={`sidebar-link w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium ${activeTab === item.id ? 'active' : 'hover:bg-slate-800/50 hover:text-white'}`}
            >
              <item.icon size={18} /> {item.label}
              {item.id === 'reports' && stats.totalReports > 0 && (
                <span className="ml-auto bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{stats.totalReports}</span>
              )}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button onClick={() => navigate('/')} className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-slate-400 hover:text-white transition-colors">
            <LogOut size={18} /> Về trang chủ
          </button>
        </div>
      </aside>

      {/* --- MAIN CONTENT --- */}
      <main className="flex-1 ml-64 p-8 relative">
        {/* Header */}
        <header className="flex justify-between items-center mb-8 animate-fade-in">
          <div>
            <h1 className="text-3xl font-black text-white mb-1">
              {activeTab === 'dashboard' && 'Dashboard'}
              {activeTab === 'users' && 'Quản lý Người dùng'}
              {activeTab === 'products' && 'Quản lý Sản phẩm'}
              {activeTab === 'reports' && 'Trung tâm Báo cáo'}
            </h1>
            <p className="text-sm text-slate-500">Cập nhật lần cuối: {new Date().toLocaleTimeString('vi-VN')}</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16}/>
              <input 
                placeholder="Tìm kiếm..." 
                className="bg-[#1e293b] border border-slate-700 rounded-full pl-10 pr-4 py-2 text-sm text-white focus:border-blue-500 outline-none w-64"
              />
            </div>
            <button className="p-2 bg-[#1e293b] rounded-full text-slate-400 hover:text-white border border-slate-700 relative">
              <Bell size={20}/>
              <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-[#0f172a]"></span>
            </button>
            <img src={user?.avatar || "https://ui-avatars.com/api/?name=Admin"} className="w-10 h-10 rounded-full border-2 border-blue-500"/>
          </div>
        </header>

        {/* Content Area */}
        <div className="animate-fade-in">
          
          {/* 1. DASHBOARD TAB */}
          {activeTab === 'dashboard' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="Tổng người dùng" value={stats.totalUsers} icon={Users} trend={12} color="text-blue-500"/>
                <StatCard title="Tin đăng hoạt động" value={stats.totalProducts} icon={Package} trend={8} color="text-emerald-500"/>
                <StatCard title="Báo cáo chờ xử lý" value={stats.totalReports} icon={AlertTriangle} trend={-5} color="text-rose-500"/>
                <StatCard title="Tổng giá trị GD" value="15.4M" icon={Activity} trend={24} color="text-purple-500"/>
              </div>

              {/* Fake Chart Area */}
              <div className="grid grid-cols-3 gap-6">
                <div className="col-span-2 glass-panel p-6 rounded-2xl h-80 flex flex-col">
                  <h3 className="text-lg font-bold text-white mb-6">Truy cập & Tương tác (30 ngày)</h3>
                  <div className="flex-1 flex items-end gap-2 px-4">
                    {[30, 45, 35, 50, 40, 60, 55, 70, 65, 50, 60, 75, 45, 55, 80].map((h, i) => (
                      <div key={i} className="flex-1 bg-blue-600/20 hover:bg-blue-500 rounded-t-sm transition-all relative group" style={{ height: `${h}%` }}>
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-white text-black text-xs font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">{h * 10}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="col-span-1 glass-panel p-6 rounded-2xl h-80">
                  <h3 className="text-lg font-bold text-white mb-4">Danh mục phổ biến</h3>
                  <div className="space-y-4">
                    {[{l:"Sách/Giáo trình", v:45, c:"bg-orange-500"}, {l:"Điện tử", v:30, c:"bg-blue-500"}, {l:"Dụng cụ", v:15, c:"bg-emerald-500"}, {l:"Khác", v:10, c:"bg-slate-500"}].map((c, i) => (
                      <div key={i}>
                        <div className="flex justify-between text-xs mb-1 text-slate-400"><span>{c.l}</span><span>{c.v}%</span></div>
                        <div className="w-full bg-slate-700 rounded-full h-2"><div className={`h-2 rounded-full ${c.c}`} style={{width: `${c.v}%`}}></div></div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 2. USERS TAB */}
          {activeTab === 'users' && (
            <div className="glass-panel rounded-2xl overflow-hidden">
              <table className="w-full text-left text-sm text-slate-400">
                <thead className="bg-[#1e293b] text-slate-200 font-bold uppercase text-xs tracking-wider">
                  <tr>
                    <th className="p-4">Người dùng</th>
                    <th className="p-4">Vai trò</th>
                    <th className="p-4">Ngày tham gia</th>
                    <th className="p-4">Trạng thái</th>
                    <th className="p-4 text-right">Hành động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {users.map((u) => (
                    <tr key={u.id} className="table-row transition-colors">
                      <td className="p-4 flex items-center gap-3">
                        <img src={u.avatar_url || `https://ui-avatars.com/api/?name=${u.name}`} className="w-9 h-9 rounded-full bg-slate-700"/>
                        <div>
                          <p className="font-bold text-white">{u.name}</p>
                          <p className="text-xs">{u.email}</p>
                        </div>
                      </td>
                      <td className="p-4"><span className="bg-slate-800 px-2 py-1 rounded text-xs font-bold border border-slate-700">{u.role}</span></td>
                      <td className="p-4">{new Date(u.created_at).toLocaleDateString('vi-VN')}</td>
                      <td className="p-4"><StatusBadge status={u.role === 'banned' ? 'banned' : 'active'} /></td>
                      <td className="p-4 text-right">
                        {u.role !== 'admin' && (
                          <button 
                            onClick={() => handleBanUser(u.id, u.role === 'banned')}
                            className={`p-2 rounded-lg transition-colors ${u.role === 'banned' ? 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20' : 'bg-rose-500/10 text-rose-500 hover:bg-rose-500/20'}`}
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

          {/* 3. REPORTS TAB (CRITICAL FOR ADMIN) */}
          {activeTab === 'reports' && (
            <div className="space-y-4">
              {reports.length === 0 ? (
                <div className="p-12 text-center glass-panel rounded-2xl">
                  <ShieldCheck size={48} className="mx-auto text-emerald-500 mb-4"/>
                  <h3 className="text-xl font-bold text-white">Tuyệt vời!</h3>
                  <p className="text-slate-400">Không có báo cáo vi phạm nào.</p>
                </div>
              ) : (
                reports.map((report) => (
                  <div key={report.id} className="glass-panel p-6 rounded-2xl flex items-start gap-4 animate-fade-in border-l-4 border-rose-500">
                    <div className="bg-rose-500/10 p-3 rounded-full text-rose-500 shrink-0"><AlertTriangle size={24}/></div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-bold text-white text-lg">{report.reason}</h4>
                        <span className="text-xs text-slate-500">{new Date(report.created_at).toLocaleString('vi-VN')}</span>
                      </div>
                      <p className="text-slate-400 text-sm mb-4">
                        Báo cáo bởi <strong className="text-white">{report.reporter?.name || 'Ẩn danh'}</strong> về sản phẩm: 
                        <a href={`/product/${report.product?.id}`} target="_blank" className="text-blue-400 hover:underline ml-1 font-bold">
                          {report.product?.title || 'Sản phẩm đã xóa'}
                        </a>
                      </p>
                      {report.status === 'pending' ? (
                        <div className="flex gap-3">
                          <button onClick={() => handleDeleteProduct(report.product?.id)} className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-sm font-bold transition-colors">
                            <Trash2 size={16}/> Xóa bài đăng
                          </button>
                          <button onClick={() => handleResolveReport(report.id, 'dismissed')} className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-bold transition-colors">
                            <XCircle size={16}/> Bỏ qua
                          </button>
                          <button onClick={() => handleResolveReport(report.id, 'resolved')} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-bold transition-colors">
                            <CheckCircle size={16}/> Đã xử lý
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs font-bold text-emerald-500 flex items-center gap-1"><CheckCircle size={12}/> Đã giải quyết</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* 4. PRODUCTS TAB */}
          {activeTab === 'products' && (
            <div className="glass-panel rounded-2xl overflow-hidden">
              <table className="w-full text-left text-sm text-slate-400">
                <thead className="bg-[#1e293b] text-slate-200 font-bold uppercase text-xs tracking-wider">
                  <tr>
                    <th className="p-4">Sản phẩm</th>
                    <th className="p-4">Giá</th>
                    <th className="p-4">Người bán</th>
                    <th className="p-4">Ngày đăng</th>
                    <th className="p-4 text-right">Hành động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {products.map((p) => (
                    <tr key={p.id} className="table-row transition-colors">
                      <td className="p-4 flex items-center gap-3 max-w-xs">
                        <img src={p.images?.[0] || 'https://via.placeholder.com/40'} className="w-10 h-10 rounded-lg object-cover bg-slate-700"/>
                        <p className="font-bold text-white truncate">{p.title}</p>
                      </td>
                      <td className="p-4 font-mono text-emerald-400">{new Intl.NumberFormat('vi-VN', {style:'currency', currency:'VND'}).format(p.price)}</td>
                      <td className="p-4">{p.seller?.name || 'Unknown'}</td>
                      <td className="p-4">{new Date(p.created_at).toLocaleDateString('vi-VN')}</td>
                      <td className="p-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => window.open(`/product/${p.id}`, '_blank')} className="p-2 text-blue-400 hover:bg-blue-500/10 rounded-lg"><Eye size={16}/></button>
                          <button onClick={() => handleDeleteProduct(p.id)} className="p-2 text-rose-400 hover:bg-rose-500/10 rounded-lg"><Trash2 size={16}/></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

        </div>
      </main>
    </div>
  );
};

export default AdminPage;

