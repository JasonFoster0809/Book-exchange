import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Users, Package, AlertTriangle, 
  Search, Bell, LogOut, CheckCircle, XCircle, Trash2, 
  Shield, Ban, Eye, TrendingUp, DollarSign, Activity, Menu
} from "lucide-react";
import { supabase } from "../services/supabase";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";

// ============================================================================
// 1. TYPES & VISUAL ENGINE
// ============================================================================

interface DashboardStats {
  totalUsers: number;
  totalProducts: number;
  pendingReports: number;
  totalMarketValue: number; // Tổng giá trị hàng hóa đang rao bán
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
  product: { id: string; title: string; seller_id: string } | null; // Product có thể null nếu đã bị xóa
}

const VisualEngine = () => (
  <style>{`
    :root { 
      --primary: #00388D;
      --bg-body: #F1F5F9;
      --bg-sidebar: #1E293B;
    }
    body { background-color: var(--bg-body); color: #334155; font-family: 'Inter', sans-serif; }
    
    /* Layout */
    .admin-layout { display: flex; min-height: 100vh; }
    
    /* Sidebar */
    .sidebar { width: 260px; background-color: var(--bg-sidebar); color: #94A3B8; flex-shrink: 0; transition: all 0.3s; }
    .sidebar-link {
      display: flex; items-center; gap: 12px; padding: 12px 20px;
      font-weight: 500; font-size: 0.9rem; transition: all 0.2s;
      border-left: 3px solid transparent;
    }
    .sidebar-link:hover { background-color: rgba(255,255,255,0.05); color: #F8FAFC; }
    .sidebar-link.active { background-color: rgba(59, 130, 246, 0.1); color: #60A5FA; border-left-color: #60A5FA; }

    /* Content */
    .main-content { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
    .top-header { background: white; border-bottom: 1px solid #E2E8F0; height: 64px; padding: 0 24px; display: flex; align-items: center; justify-content: space-between; }

    /* Cards */
    .stat-card { background: white; padding: 24px; border-radius: 12px; border: 1px solid #E2E8F0; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
    
    /* Tables */
    .data-table-wrapper { background: white; border-radius: 12px; border: 1px solid #E2E8F0; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
    .data-table { w-full; text-align: left; border-collapse: collapse; width: 100%; }
    .data-table th { background: #F8FAFC; padding: 16px; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; color: #64748B; border-bottom: 1px solid #E2E8F0; }
    .data-table td { padding: 16px; border-bottom: 1px solid #E2E8F0; font-size: 0.875rem; color: #334155; }
    .data-table tr:last-child td { border-bottom: none; }
    .data-table tr:hover { background-color: #F8FAFC; }

    /* Badges */
    .badge { padding: 4px 10px; border-radius: 99px; font-size: 0.75rem; font-weight: 600; display: inline-block; }
    .badge.green { background: #DCFCE7; color: #166534; }
    .badge.red { background: #FEE2E2; color: #991B1B; }
    .badge.yellow { background: #FEF3C7; color: #92400E; }
    .badge.blue { background: #DBEAFE; color: #1E40AF; }

    .hide-scrollbar::-webkit-scrollbar { display: none; }
  `}</style>
);

// ============================================================================
// 2. MAIN COMPONENT
// ============================================================================
const AdminPage = () => {
  const { user, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const { addToast } = useToast();
  
  // State
  const [activeTab, setActiveTab] = useState<'dashboard' | 'users' | 'products' | 'reports'>('dashboard');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({ totalUsers: 0, totalProducts: 0, pendingReports: 0, totalMarketValue: 0 });
  const [users, setUsers] = useState<UserData[]>([]);
  const [reports, setReports] = useState<ReportData[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  // Check Permission
  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      addToast("Truy cập bị từ chối. Khu vực dành riêng cho Admin.", "error");
      navigate("/");
    }
  }, [user, isAdmin, loading, navigate]);

  // Fetch REAL Data from Supabase
  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Get Stats (Real Count)
      const { count: uCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
      const { count: pCount } = await supabase.from('products').select('*', { count: 'exact', head: true });
      const { count: rCount } = await supabase.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'pending');
      
      // Calculate Total Market Value (Sum of price)
      const { data: priceData } = await supabase.from('products').select('price').eq('status', 'available');
      const totalValue = priceData?.reduce((acc, curr) => acc + (curr.price || 0), 0) || 0;

      setStats({
        totalUsers: uCount || 0,
        totalProducts: pCount || 0,
        pendingReports: rCount || 0,
        totalMarketValue: totalValue
      });

      // 2. Get Lists
      if (activeTab === 'users') {
        let q = supabase.from('profiles').select('*').order('created_at', { ascending: false });
        if (searchTerm) q = q.ilike('email', `%${searchTerm}%`);
        const { data } = await q.limit(50);
        setUsers(data as any || []);
      }
      
      if (activeTab === 'products') {
        let q = supabase.from('products').select(`*, seller:profiles(name)`).order('created_at', { ascending: false });
        if (searchTerm) q = q.ilike('title', `%${searchTerm}%`);
        const { data } = await q.limit(50);
        setProducts(data || []);
      }

      if (activeTab === 'reports') {
        const { data } = await supabase.from('reports')
          .select(`*, reporter:profiles!reporter_id(name), product:products(id, title, seller_id)`)
          .order('created_at', { ascending: false });
        setReports(data as any || []);
      }

    } catch (error) {
      console.error(error);
      addToast("Lỗi tải dữ liệu", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [activeTab, searchTerm]);

  // Actions
  const handleToggleBan = async (userId: string, currentRole: string) => {
    const newRole = currentRole === 'banned' ? 'user' : 'banned';
    if (!confirm(newRole === 'banned' ? 'Khóa tài khoản này?' : 'Mở khóa tài khoản này?')) return;

    const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', userId);
    if (!error) {
      addToast("Cập nhật trạng thái thành công", "success");
      fetchData(); // Reload data
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm("Xóa vĩnh viễn tin đăng này?")) return;
    const { error } = await supabase.from('products').delete().eq('id', productId);
    if (!error) {
      addToast("Đã xóa tin đăng", "success");
      fetchData();
    }
  };

  const handleResolveReport = async (reportId: string, action: 'resolved' | 'dismissed') => {
    const { error } = await supabase.from('reports').update({ status: action }).eq('id', reportId);
    if (!error) {
      addToast("Đã cập nhật trạng thái báo cáo", "success");
      fetchData();
    }
  };

  if (!isAdmin) return null;

  return (
    <div className="admin-layout">
      <VisualEngine />

      {/* --- SIDEBAR --- */}
      <aside className="sidebar">
        <div className="h-16 flex items-center px-6 border-b border-slate-700/50">
          <Shield className="text-blue-400 mr-2" size={24}/>
          <span className="font-bold text-white text-lg tracking-tight">ADMIN CP</span>
        </div>

        <nav className="p-4 space-y-1">
          {[
            { id: 'dashboard', label: 'Tổng quan', icon: LayoutDashboard },
            { id: 'users', label: 'Người dùng', icon: Users },
            { id: 'products', label: 'Tin đăng', icon: Package },
            { id: 'reports', label: 'Báo cáo vi phạm', icon: AlertTriangle },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => { setActiveTab(item.id as any); setSearchTerm(""); }}
              className={`sidebar-link w-full rounded-lg ${activeTab === item.id ? 'active' : ''}`}
            >
              <item.icon size={18} />
              <span className="flex-1 text-left">{item.label}</span>
              {item.id === 'reports' && stats.pendingReports > 0 && (
                <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{stats.pendingReports}</span>
              )}
            </button>
          ))}
        </nav>

        <div className="absolute bottom-0 left-0 w-full p-4 border-t border-slate-700/50">
          <button onClick={() => navigate('/')} className="sidebar-link w-full rounded-lg text-slate-400 hover:text-white">
            <LogOut size={18} /> Thoát
          </button>
        </div>
      </aside>

      {/* --- MAIN CONTENT --- */}
      <div className="main-content">
        {/* Top Header */}
        <header className="top-header">
          <h2 className="text-xl font-bold text-slate-800 capitalize">{activeTab === 'dashboard' ? 'Dashboard' : activeTab}</h2>
          
          <div className="flex items-center gap-4">
            {activeTab !== 'dashboard' && (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
                <input 
                  placeholder="Tìm kiếm..." 
                  className="bg-slate-100 border-none rounded-lg pl-10 pr-4 py-2 text-sm text-slate-700 w-64 outline-none focus:ring-2 focus:ring-blue-500/20"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            )}
            <div className="h-8 w-[1px] bg-slate-200"></div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold text-slate-700">{user?.name}</span>
              <img src={user?.avatar || "https://ui-avatars.com/api/?name=Admin"} className="w-8 h-8 rounded-full border border-slate-200"/>
            </div>
          </div>
        </header>

        {/* Content Body */}
        <div className="p-8 overflow-y-auto bg-[#F1F5F9] flex-1">
          
          {/* 1. DASHBOARD OVERVIEW */}
          {activeTab === 'dashboard' && (
            <div className="max-w-6xl mx-auto space-y-8 animate-enter">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="stat-card">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-slate-500 text-xs font-bold uppercase mb-1">Thành viên</p>
                      <h3 className="text-3xl font-black text-slate-800">{stats.totalUsers}</h3>
                    </div>
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-lg"><Users size={24}/></div>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-slate-500 text-xs font-bold uppercase mb-1">Tin đăng</p>
                      <h3 className="text-3xl font-black text-slate-800">{stats.totalProducts}</h3>
                    </div>
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg"><Package size={24}/></div>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-slate-500 text-xs font-bold uppercase mb-1">Giá trị sàn</p>
                      <h3 className="text-2xl font-black text-slate-800 tracking-tight">
                        {new Intl.NumberFormat('vi-VN', { notation: "compact", compactDisplay: "short" }).format(stats.totalMarketValue)} ₫
                      </h3>
                    </div>
                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg"><DollarSign size={24}/></div>
                  </div>
                </div>
                <div className="stat-card border-l-4 border-l-red-500">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-slate-500 text-xs font-bold uppercase mb-1">Báo cáo mới</p>
                      <h3 className="text-3xl font-black text-red-600">{stats.pendingReports}</h3>
                    </div>
                    <div className="p-3 bg-red-50 text-red-600 rounded-lg animate-pulse"><AlertTriangle size={24}/></div>
                  </div>
                </div>
              </div>

              {/* Recent Activity Section could go here */}
              <div className="bg-white p-8 rounded-xl border border-slate-200 text-center py-16">
                <Activity size={48} className="mx-auto text-slate-300 mb-4"/>
                <h3 className="text-lg font-bold text-slate-700">Hệ thống hoạt động ổn định</h3>
                <p className="text-slate-500 text-sm">Dữ liệu được cập nhật theo thời gian thực từ Database.</p>
              </div>
            </div>
          )}

          {/* 2. USERS TABLE */}
          {activeTab === 'users' && (
            <div className="data-table-wrapper animate-enter">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Người dùng</th>
                    <th>Email</th>
                    <th>Vai trò</th>
                    <th>Ngày tham gia</th>
                    <th>Trạng thái</th>
                    <th className="text-right">Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td>
                        <div className="flex items-center gap-3">
                          <img src={u.avatar_url || `https://ui-avatars.com/api/?name=${u.name}`} className="w-8 h-8 rounded-full bg-slate-100"/>
                          <span className="font-bold text-slate-700">{u.name}</span>
                        </div>
                      </td>
                      <td className="font-mono text-xs">{u.email}</td>
                      <td><span className="bg-slate-100 px-2 py-1 rounded text-xs font-bold uppercase">{u.role}</span></td>
                      <td>{new Date(u.created_at).toLocaleDateString('vi-VN')}</td>
                      <td>
                        <span className={`badge ${u.role === 'banned' ? 'red' : 'green'}`}>
                          {u.role === 'banned' ? 'Banned' : 'Active'}
                        </span>
                      </td>
                      <td className="text-right">
                        {u.role !== 'admin' && (
                          <button 
                            onClick={() => handleToggleBan(u.id, u.role)}
                            className={`p-2 rounded hover:bg-slate-100 ${u.role === 'banned' ? 'text-green-600' : 'text-red-600'}`}
                            title={u.role === 'banned' ? "Mở khóa" : "Khóa"}
                          >
                            {u.role === 'banned' ? <CheckCircle size={18}/> : <Ban size={18}/>}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* 3. PRODUCTS TABLE */}
          {activeTab === 'products' && (
            <div className="data-table-wrapper animate-enter">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Sản phẩm</th>
                    <th>Giá bán</th>
                    <th>Người bán</th>
                    <th>Ngày đăng</th>
                    <th className="text-right">Tùy chọn</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => (
                    <tr key={p.id}>
                      <td className="max-w-xs">
                        <div className="flex items-center gap-3">
                          <img src={p.images?.[0] || 'https://via.placeholder.com/40'} className="w-10 h-10 rounded object-cover bg-slate-100"/>
                          <span className="font-bold text-slate-700 truncate">{p.title}</span>
                        </div>
                      </td>
                      <td className="font-mono text-blue-600 font-bold">{new Intl.NumberFormat('vi-VN', {style: 'currency', currency: 'VND'}).format(p.price)}</td>
                      <td>{p.seller?.name || 'Unknown'}</td>
                      <td>{new Date(p.created_at).toLocaleDateString('vi-VN')}</td>
                      <td className="text-right">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => window.open(`/product/${p.id}`, '_blank')} className="p-2 text-blue-500 hover:bg-blue-50 rounded"><Eye size={18}/></button>
                          <button onClick={() => handleDeleteProduct(p.id)} className="p-2 text-red-500 hover:bg-red-50 rounded"><Trash2 size={18}/></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* 4. REPORTS CENTER */}
          {activeTab === 'reports' && (
            <div className="space-y-4 animate-enter">
              {reports.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-xl border border-slate-200">
                  <Shield size={48} className="mx-auto text-emerald-500 mb-4"/>
                  <h3 className="text-lg font-bold text-slate-800">Tuyệt vời! Không có báo cáo vi phạm.</h3>
                </div>
              ) : (
                reports.map((report) => (
                  <div key={report.id} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-6">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`badge ${report.status === 'pending' ? 'yellow' : 'green'}`}>{report.status}</span>
                        <span className="text-xs text-slate-400">{new Date(report.created_at).toLocaleString('vi-VN')}</span>
                      </div>
                      <h4 className="font-bold text-slate-800 text-lg mb-1">Lý do: {report.reason}</h4>
                      <div className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100">
                        <p><strong>Người báo cáo:</strong> {report.reporter?.name || 'Ẩn danh'}</p>
                        <p><strong>Sản phẩm:</strong> {report.product ? (
                          <a href={`/product/${report.product.id}`} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">{report.product.title}</a>
                        ) : <span className="text-red-500 italic">Sản phẩm đã bị xóa</span>}</p>
                      </div>
                    </div>
                    
                    {report.status === 'pending' && (
                      <div className="flex flex-col gap-2 justify-center border-l pl-6 border-slate-100">
                        {report.product && (
                          <button onClick={() => handleDeleteProduct(report.product!.id)} className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition-colors">
                            <Trash2 size={14}/> Xóa bài đăng
                          </button>
                        )}
                        <div className="flex gap-2">
                          <button onClick={() => handleResolveReport(report.id, 'dismissed')} className="flex-1 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-bold">
                            Bỏ qua
                          </button>
                          <button onClick={() => handleResolveReport(report.id, 'resolved')} className="flex-1 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold">
                            Đã xử lý
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default AdminPage;
