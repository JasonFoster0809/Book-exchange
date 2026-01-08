import React, { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../services/supabase";
import { useNavigate } from "react-router-dom";
import {
  Trash2,
  ShieldCheck,
  Users,
  Package,
  Flag,
  Search,
  Ban,
  Unlock,
  Loader2,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Eye,
  Filter,
  BarChart3,
  Calendar,
  AlertTriangle,
  GraduationCap
} from "lucide-react";
import { Product, DBProfile, Report, VerificationRequest } from "../types";
import { useToast } from "../contexts/ToastContext";

// --- TYPES MỞ RỘNG CHO ADMIN ---
interface AdminUser extends DBProfile {
  product_count?: number;
  report_count?: number;
}

interface AdminReport extends Report {
  reporter_name?: string;
  reporter_avatar?: string;
  product_title?: string;
  product_image?: string;
}

// --- STYLES & ANIMATION ---
const VisualEngine = () => (
  <style>{`
    :root { --primary: #00418E; --secondary: #00B0F0; }
    body { background-color: #F8FAFC; color: #0F172A; font-family: 'Inter', system-ui, sans-serif; }
    
    .glass-panel { 
      background: rgba(255, 255, 255, 0.7); 
      backdrop-filter: blur(24px); 
      -webkit-backdrop-filter: blur(24px);
      border: 1px solid rgba(255, 255, 255, 0.5); 
      box-shadow: 0 16px 40px -10px rgba(0, 65, 142, 0.1); 
    }
    
    .admin-card-hover { transition: all 0.3s ease; }
    .admin-card-hover:hover { transform: translateY(-4px); box-shadow: 0 20px 40px -10px rgba(0, 65, 142, 0.15); }
    
    /* Animations */
    @keyframes blob { 
      0% { transform: translate(0px, 0px) scale(1); } 
      33% { transform: translate(30px, -50px) scale(1.1); } 
      66% { transform: translate(-20px, 20px) scale(0.9); } 
      100% { transform: translate(0px, 0px) scale(1); } 
    }
    .animate-blob { animation: blob 10s infinite; }
    .animate-enter { animation: slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; opacity: 0; }
    @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
    
    /* Custom Scrollbar for Table */
    .table-container::-webkit-scrollbar { height: 8px; width: 8px; }
    .table-container::-webkit-scrollbar-thumb { background: #CBD5E1; border-radius: 4px; }
  `}</style>
);

const AnimatedBackground = () => (
  <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
    <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-slate-50 to-blue-50/50"></div>
    <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-400/20 rounded-full mix-blend-multiply filter blur-[120px] animate-blob"></div>
    <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-400/20 rounded-full mix-blend-multiply filter blur-[120px] animate-blob animation-delay-2000"></div>
  </div>
);

// --- COMPONENT CHÍNH ---
const AdminPage: React.FC = () => {
  const { user, loading, isAdmin } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  // Data State
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [verifications, setVerifications] = useState<VerificationRequest[]>([]);
  
  // UI State
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'verifications' | 'reports' | 'products'>('overview');
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");

  // --- INIT DATA ---
  useEffect(() => {
    if (!loading) {
      if (!user || !isAdmin) {
        addToast("Bạn không có quyền truy cập trang quản trị!", "error");
        navigate("/");
      } else {
        fetchAdminData();
      }
    }
  }, [loading, user, isAdmin]);

  const fetchAdminData = async () => {
    setIsLoadingData(true);
    try {
      // 1. Fetch Users
      const { data: usersData } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      // 2. Fetch Reports (Join)
      const { data: reportsData } = await supabase
        .from("reports")
        .select(`
          *,
          reporter:profiles!reporter_id(name, avatar_url),
          product:products!product_id(title, images)
        `)
        .order("created_at", { ascending: false });

      // 3. Fetch Verifications (Join)
      const { data: verifyData } = await supabase
        .from("verification_requests")
        .select(`
          *,
          profiles:user_id(name, email, avatar_url, student_code)
        `)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      // 4. Fetch Products
      const { data: prodData } = await supabase
        .from("products")
        .select("*, profiles:seller_id(name)")
        .order("created_at", { ascending: false })
        .limit(50);

      if (usersData) setUsers(usersData as AdminUser[]);
      if (verifyData) setVerifications(verifyData as unknown as VerificationRequest[]);
      if (prodData) setProducts(prodData as unknown as Product[]);
      
      if (reportsData) {
        // Map data cho dễ dùng
        const mappedReports = reportsData.map((r: any) => ({
          ...r,
          reporter_name: r.reporter?.name || "Ẩn danh",
          reporter_avatar: r.reporter?.avatar_url,
          product_title: r.product?.title || "Sản phẩm đã xóa",
          product_image: r.product?.images?.[0]
        }));
        setReports(mappedReports);
      }

    } catch (err) {
      console.error(err);
      addToast("Lỗi tải dữ liệu", "error");
    } finally {
      setIsLoadingData(false);
    }
  };

  // --- ACTIONS ---

  const handleBanUser = async (userId: string, duration: number | null) => {
    // duration: số ngày cấm. null = mở khóa. 9999 = vĩnh viễn.
    const isBanned = !!duration;
    const banUntil = duration 
      ? new Date(Date.now() + duration * 24 * 60 * 60 * 1000).toISOString() 
      : null;
    
    const confirmMsg = duration 
      ? `Xác nhận CẤM người dùng này ${duration === 9999 ? "vĩnh viễn" : `${duration} ngày`}?` 
      : "Xác nhận MỞ KHÓA cho người dùng này?";
      
    if (!window.confirm(confirmMsg)) return;

    try {
      const { error } = await supabase
        .from("profiles")
        .update({ is_banned: isBanned, ban_until: banUntil })
        .eq("id", userId);

      if (error) throw error;

      setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_banned: isBanned, ban_until: banUntil } : u));
      addToast("Đã cập nhật trạng thái người dùng", "success");
    } catch (err: any) {
      addToast(err.message, "error");
    }
  };

  const handleVerify = async (reqId: string, userId: string, status: 'approved' | 'rejected', studentCode?: string) => {
    try {
      // 1. Update Request
      await supabase.from("verification_requests").update({ status }).eq("id", reqId);
      
      // 2. Update Profile if Approved
      if (status === 'approved' && studentCode) {
        await supabase.from("profiles").update({ 
          verified_status: 'verified',
          student_code: studentCode 
        }).eq("id", userId);
      }

      setVerifications(prev => prev.filter(v => v.id !== reqId));
      addToast(status === 'approved' ? "Đã duyệt xác thực!" : "Đã từ chối.", "success");
    } catch (err) {
      addToast("Lỗi xử lý", "error");
    }
  };

  const handleResolveReport = async (reportId: string) => {
    try {
      await supabase.from("reports").update({ status: 'resolved' }).eq("id", reportId);
      setReports(prev => prev.map(r => r.id === reportId ? { ...r, status: 'resolved' } : r));
      addToast("Đã giải quyết báo cáo", "success");
    } catch (err) {
      addToast("Lỗi cập nhật", "error");
    }
  };

  const handleDeleteProduct = async (prodId: string) => {
    if (!window.confirm("Xóa sản phẩm này vĩnh viễn?")) return;
    try {
      await supabase.from("products").delete().eq("id", prodId);
      setProducts(prev => prev.filter(p => p.id !== prodId));
      addToast("Đã xóa sản phẩm", "success");
    } catch (err) {
      addToast("Lỗi xóa sản phẩm", "error");
    }
  };

  // --- RENDER HELPERS ---
  const filteredUsers = users.filter(u => 
    u.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.student_code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading || isLoadingData) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="w-12 h-12 text-[#00418E] animate-spin" />
        <p className="text-slate-500 font-medium animate-pulse">Đang tải dữ liệu quản trị...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen pt-24 pb-12 font-sans text-slate-800">
      <VisualEngine />
      <AnimatedBackground />

      <div className="max-w-7xl mx-auto px-4">
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-end mb-10 animate-enter gap-6">
          <div>
            <h1 className="text-4xl font-black text-[#00418E] mb-2 flex items-center gap-3">
              <ShieldCheck size={40} className="text-[#00B0F0]" />
              Trung tâm Quản trị
            </h1>
            <p className="text-slate-500 font-medium">
              Xin chào, <span className="font-bold text-slate-800">{user?.name}</span>. Hệ thống hoạt động bình thường.
            </p>
          </div>
          
          {/* Stats Bar */}
          <div className="flex gap-4">
            <div className="glass-panel px-6 py-3 rounded-2xl flex flex-col items-center min-w-[100px]">
              <span className="text-xs font-bold text-slate-400 uppercase">Thành viên</span>
              <span className="text-2xl font-black text-[#00418E]">{users.length}</span>
            </div>
            <div className="glass-panel px-6 py-3 rounded-2xl flex flex-col items-center min-w-[100px]">
              <span className="text-xs font-bold text-slate-400 uppercase">Chờ duyệt</span>
              <span className="text-2xl font-black text-orange-500">{verifications.length}</span>
            </div>
            <div className="glass-panel px-6 py-3 rounded-2xl flex flex-col items-center min-w-[100px]">
              <span className="text-xs font-bold text-slate-400 uppercase">Báo cáo</span>
              <span className="text-2xl font-black text-red-500">{reports.filter(r => r.status === 'pending').length}</span>
            </div>
          </div>
        </div>

        {/* NAVIGATION TABS */}
        <div className="flex gap-2 overflow-x-auto pb-4 mb-6 hide-scrollbar animate-enter" style={{animationDelay: '100ms'}}>
          {[
            { id: 'overview', icon: BarChart3, label: 'Tổng quan' },
            { id: 'users', icon: Users, label: 'Người dùng' },
            { id: 'verifications', icon: GraduationCap, label: 'Xét duyệt SV', badge: verifications.length },
            { id: 'reports', icon: Flag, label: 'Báo cáo vi phạm', badge: reports.filter(r => r.status === 'pending').length },
            { id: 'products', icon: Package, label: 'Sản phẩm' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all whitespace-nowrap ${
                activeTab === tab.id 
                  ? 'bg-[#00418E] text-white shadow-lg shadow-blue-500/30 scale-105' 
                  : 'bg-white/60 text-slate-500 hover:bg-white hover:text-[#00418E]'
              }`}
            >
              <tab.icon size={18} />
              {tab.label}
              {tab.badge ? <span className="ml-1 px-1.5 py-0.5 rounded-full bg-red-500 text-white text-[10px]">{tab.badge}</span> : null}
            </button>
          ))}
        </div>

        {/* --- MAIN CONTENT PANELS --- */}
        <div className="animate-enter" style={{animationDelay: '200ms'}}>
          
          {/* 1. OVERVIEW TAB */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="glass-panel p-8 rounded-[2rem] col-span-full md:col-span-1">
                <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                  <ShieldAlert className="text-orange-500" /> Cần xử lý ngay
                </h3>
                {verifications.length === 0 && reports.filter(r => r.status === 'pending').length === 0 ? (
                  <div className="py-10 text-center text-slate-400">
                    <CheckCircle2 size={48} className="mx-auto mb-4 text-green-500/50" />
                    <p>Mọi thứ đều ổn! Không có yêu cầu mới.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {verifications.slice(0, 3).map(v => (
                      <div key={v.id} className="flex items-center gap-4 p-4 rounded-2xl bg-white/50 border border-white">
                        <div className="p-2 bg-orange-100 text-orange-600 rounded-xl"><GraduationCap size={20}/></div>
                        <div className="flex-1">
                          <p className="font-bold text-sm text-slate-800">Yêu cầu xác thực SV</p>
                          <p className="text-xs text-slate-500">{v.profiles?.name} - {v.profiles?.student_code || '---'}</p>
                        </div>
                        <button onClick={() => setActiveTab('verifications')} className="text-xs font-bold text-blue-600 hover:underline">Xem</button>
                      </div>
                    ))}
                    {reports.filter(r => r.status === 'pending').slice(0, 3).map(r => (
                      <div key={r.id} className="flex items-center gap-4 p-4 rounded-2xl bg-white/50 border border-white">
                        <div className="p-2 bg-red-100 text-red-600 rounded-xl"><Flag size={20}/></div>
                        <div className="flex-1">
                          <p className="font-bold text-sm text-slate-800">Báo cáo vi phạm</p>
                          <p className="text-xs text-slate-500 line-clamp-1">{r.reason}</p>
                        </div>
                        <button onClick={() => setActiveTab('reports')} className="text-xs font-bold text-blue-600 hover:underline">Xem</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="glass-panel p-8 rounded-[2rem] flex flex-col justify-center items-center text-center">
                <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center text-[#00418E] mb-4">
                  <BarChart3 size={32} />
                </div>
                <h3 className="text-2xl font-black text-slate-800 mb-2">Hệ thống ổn định</h3>
                <p className="text-slate-500 max-w-xs">
                  Hiện có {users.length} thành viên và {products.length} sản phẩm đang hoạt động trên sàn.
                </p>
              </div>
            </div>
          )}

          {/* 2. USERS TAB */}
          {activeTab === 'users' && (
            <div className="glass-panel rounded-[2rem] overflow-hidden">
              <div className="p-6 border-b border-white/50 flex flex-col md:flex-row gap-4 justify-between items-center">
                <h3 className="text-xl font-bold text-slate-800">Danh sách thành viên</h3>
                <div className="relative w-full md:w-96">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    placeholder="Tìm theo tên, email, MSSV..." 
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border-none bg-white/50 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all text-sm font-medium"
                  />
                </div>
              </div>
              <div className="overflow-x-auto table-container">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50/80 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    <tr>
                      <th className="p-6">Thành viên</th>
                      <th className="p-6">Trạng thái</th>
                      <th className="p-6">Xác thực</th>
                      <th className="p-6 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredUsers.map(u => {
                      const isBanned = u.is_banned || (u.ban_until && new Date(u.ban_until) > new Date());
                      return (
                        <tr key={u.id} className={`hover:bg-white/40 transition-colors ${isBanned ? 'bg-red-50/50' : ''}`}>
                          <td className="p-6">
                            <div className="flex items-center gap-3">
                              <img src={u.avatar_url || `https://ui-avatars.com/api/?name=${u.name}`} className="w-10 h-10 rounded-full bg-white shadow-sm object-cover" />
                              <div>
                                <p className="font-bold text-slate-800 text-sm">{u.name}</p>
                                <p className="text-xs text-slate-500">{u.email}</p>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mt-0.5">
                                  {u.role} • MSSV: {u.student_code || '---'}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="p-6">
                            {isBanned ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-100 text-red-700 text-xs font-bold">
                                <ShieldAlert size={12}/> Bị cấm
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-green-100 text-green-700 text-xs font-bold">
                                <CheckCircle2 size={12}/> Hoạt động
                              </span>
                            )}
                          </td>
                          <td className="p-6">
                            {u.verified_status === 'verified' ? (
                              <span className="text-blue-600 font-bold text-xs">Đã xác thực</span>
                            ) : (
                              <span className="text-slate-400 text-xs">Chưa xác thực</span>
                            )}
                          </td>
                          <td className="p-6 text-right">
                            {u.role !== 'admin' && (
                              <div className="flex justify-end gap-2">
                                {isBanned ? (
                                  <button onClick={() => handleBanUser(u.id, null)} className="p-2 rounded-lg bg-green-100 text-green-600 hover:bg-green-200 transition-colors" title="Mở khóa">
                                    <Unlock size={16} />
                                  </button>
                                ) : (
                                  <>
                                    <button onClick={() => handleBanUser(u.id, 3)} className="px-3 py-1.5 rounded-lg bg-orange-100 text-orange-700 text-xs font-bold hover:bg-orange-200 transition-colors">3 ngày</button>
                                    <button onClick={() => handleBanUser(u.id, 9999)} className="p-2 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition-colors" title="Cấm vĩnh viễn">
                                      <Ban size={16} />
                                    </button>
                                  </>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 3. VERIFICATIONS TAB */}
          {activeTab === 'verifications' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {verifications.length === 0 ? (
                <div className="col-span-full glass-panel p-12 rounded-[2rem] text-center text-slate-400">
                  <CheckCircle2 size={64} className="mx-auto mb-4 opacity-20" />
                  <p className="text-lg font-medium">Tuyệt vời! Không còn yêu cầu nào.</p>
                </div>
              ) : verifications.map(req => (
                <div key={req.id} className="glass-panel p-6 rounded-[2rem] flex flex-col sm:flex-row gap-6 animate-enter hover:shadow-lg transition-all">
                  <div className="sm:w-1/3 relative group cursor-zoom-in">
                    <div className="aspect-[3/4] rounded-2xl overflow-hidden bg-slate-200 border-4 border-white shadow-sm">
                      <img 
                        src={req.image_url} 
                        className="w-full h-full object-cover transition-transform group-hover:scale-110" 
                        onClick={() => window.open(req.image_url, '_blank')}
                      />
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl pointer-events-none">
                      <Eye className="text-white drop-shadow-md" />
                    </div>
                  </div>
                  <div className="flex-1 flex flex-col">
                    <div className="mb-4">
                      <div className="flex items-center gap-2 mb-1">
                        <img src={req.profiles?.avatar_url || 'https://via.placeholder.com/30'} className="w-6 h-6 rounded-full" />
                        <h4 className="font-bold text-slate-800">{req.profiles?.name}</h4>
                      </div>
                      <p className="text-xs text-slate-500 mb-3">{req.profiles?.email}</p>
                      
                      <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
                        <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wider mb-1">MSSV Khai báo</p>
                        <p className="text-lg font-black text-blue-700 font-mono tracking-widest">{req.student_code || '---'}</p>
                      </div>
                    </div>
                    
                    <div className="mt-auto grid grid-cols-2 gap-3">
                      <button 
                        onClick={() => handleVerify(req.id, req.user_id, 'rejected')}
                        className="py-3 rounded-xl bg-slate-100 text-slate-600 font-bold text-sm hover:bg-slate-200 transition-colors"
                      >
                        Từ chối
                      </button>
                      <button 
                        onClick={() => handleVerify(req.id, req.user_id, 'approved', req.student_code)}
                        className="py-3 rounded-xl bg-green-500 text-white font-bold text-sm shadow-lg shadow-green-500/30 hover:bg-green-600 transition-colors"
                      >
                        Chấp thuận
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 4. REPORTS TAB */}
          {activeTab === 'reports' && (
            <div className="space-y-4">
              {reports.map(report => (
                <div key={report.id} className={`glass-panel p-6 rounded-3xl flex flex-col md:flex-row gap-6 animate-enter ${report.status === 'resolved' ? 'opacity-60 grayscale' : 'border-l-4 border-l-red-500'}`}>
                  <div className="shrink-0">
                    <div className="w-16 h-16 rounded-2xl bg-slate-100 overflow-hidden border border-white shadow-sm">
                      <img src={report.product_image || 'https://via.placeholder.com/100'} className="w-full h-full object-cover" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <span className="inline-block px-2 py-0.5 rounded-md bg-red-100 text-red-600 text-[10px] font-bold uppercase mb-1">
                          Lý do: {report.reason}
                        </span>
                        <h4 className="font-bold text-slate-800 text-lg">Sản phẩm: {report.product_title}</h4>
                      </div>
                      <span className="text-xs text-slate-400 font-medium">
                        {new Date(report.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-500 mb-4">
                      <Flag size={14} className="text-red-400" />
                      Báo cáo bởi: <span className="font-bold text-slate-700">{report.reporter_name}</span>
                    </div>
                    
                    {report.status === 'pending' && (
                      <div className="flex gap-3">
                        <button 
                          onClick={() => window.open(`/product/${report.product_id}`, '_blank')}
                          className="px-4 py-2 rounded-lg bg-slate-100 text-slate-600 text-xs font-bold hover:bg-slate-200"
                        >
                          Xem bài đăng
                        </button>
                        <button 
                          onClick={() => handleResolveReport(report.id)}
                          className="px-4 py-2 rounded-lg bg-green-100 text-green-700 text-xs font-bold hover:bg-green-200"
                        >
                          Đánh dấu đã xử lý
                        </button>
                        <button 
                          onClick={() => handleDeleteProduct(report.product_id)}
                          className="px-4 py-2 rounded-lg bg-red-100 text-red-600 text-xs font-bold hover:bg-red-200 ml-auto"
                        >
                          Xóa bài đăng
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {reports.length === 0 && <div className="text-center py-10 text-slate-400">Chưa có báo cáo nào.</div>}
            </div>
          )}

          {/* 5. PRODUCTS TAB (Simplified) */}
          {activeTab === 'products' && (
            <div className="glass-panel p-6 rounded-[2rem]">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {products.map(p => (
                  <div key={p.id} className="flex gap-3 p-3 rounded-2xl bg-white/50 border border-white hover:bg-white transition-colors group">
                    <img src={p.images?.[0] || 'https://via.placeholder.com/80'} className="w-20 h-20 rounded-xl object-cover bg-slate-200" />
                    <div className="flex-1 flex flex-col justify-between overflow-hidden">
                      <div>
                        <h4 className="font-bold text-slate-800 text-sm truncate">{p.title}</h4>
                        <p className="text-xs text-[#00418E] font-bold">{p.price.toLocaleString()}đ</p>
                      </div>
                      <div className="flex justify-between items-end">
                        <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{p.category}</span>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => window.open(`/product/${p.id}`, '_blank')} className="p-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100"><Eye size={14}/></button>
                          <button onClick={() => handleDeleteProduct(p.id)} className="p-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100"><Trash2 size={14}/></button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default AdminPage;
