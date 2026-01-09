import React, { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../services/supabase";
import { useNavigate } from "react-router-dom";
import {
  Trash2, ShieldCheck, Users, Package, Flag, Search, Ban, Unlock,
  Loader2, ShieldAlert, CheckCircle2, Eye, BarChart3, GraduationCap
} from "lucide-react";
import { Product, DBProfile, Report, VerificationRequest } from "../types";
import { useToast } from "../contexts/ToastContext";

// --- TYPES ---
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

// --- STYLES ---
const VisualEngine = () => (
  <style>{`
    :root { --primary: #00418E; }
    body { background-color: #F8FAFC; color: #0F172A; }
    .glass-panel { background: rgba(255, 255, 255, 0.7); backdrop-filter: blur(24px); border: 1px solid rgba(255, 255, 255, 0.5); box-shadow: 0 16px 40px -10px rgba(0, 65, 142, 0.1); }
    .animate-enter { animation: slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; opacity: 0; }
    @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
    .table-container::-webkit-scrollbar { height: 8px; width: 8px; }
    .table-container::-webkit-scrollbar-thumb { background: #CBD5E1; border-radius: 4px; }
  `}</style>
);

const AnimatedBackground = () => (
  <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
    <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-slate-50 to-blue-50/50"></div>
    <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-400/20 rounded-full mix-blend-multiply filter blur-[120px]"></div>
    <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-400/20 rounded-full mix-blend-multiply filter blur-[120px]"></div>
  </div>
);

const AdminPage: React.FC = () => {
  const { user, loading, isAdmin } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  // Data
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [verifications, setVerifications] = useState<VerificationRequest[]>([]);
  
  // UI
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'verifications' | 'reports' | 'products'>('overview');
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (!loading) {
      if (!user || !isAdmin) {
        addToast("Bạn không có quyền truy cập!", "error");
        navigate("/");
      } else {
        fetchAdminData();
      }
    }
  }, [loading, user, isAdmin]);

  const fetchAdminData = async () => {
    setIsLoadingData(true);
    try {
      const { data: usersData } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
      const { data: reportsData } = await supabase.from("reports").select(`*, reporter:profiles!reporter_id(name, avatar_url), product:products!product_id(title, images)`).order("created_at", { ascending: false });
      const { data: verifyData } = await supabase.from("verification_requests").select(`*, profiles:user_id(name, email, avatar_url, student_code)`).eq("status", "pending").order("created_at", { ascending: false });
      const { data: prodData } = await supabase.from("products").select("*, profiles:seller_id(name)").order("created_at", { ascending: false }).limit(50);

      if (usersData) setUsers(usersData as AdminUser[]);
      if (verifyData) setVerifications(verifyData as unknown as VerificationRequest[]);
      if (prodData) setProducts(prodData as unknown as Product[]);
      
      if (reportsData) {
        const mappedReports = reportsData.map((r: any) => ({
          ...r,
          reporter_name: r.reporter?.name || "Ẩn danh",
          reporter_avatar: r.reporter?.avatar_url,
          product_title: r.product?.title || "Sản phẩm đã xóa",
          product_image: r.product?.images?.[0]
        }));
        setReports(mappedReports);
      }
    } catch (err) { console.error(err); addToast("Lỗi tải dữ liệu", "error"); } 
    finally { setIsLoadingData(false); }
  };

  // --- LOGIC BAN ĐÃ ĐƯỢC FIX ---
  const handleBanUser = async (userId: string, duration: number | null) => {
    // duration: null = mở khóa
    // duration: 9999 = vĩnh viễn (set 100 năm)
    
    let isBanned = false;
    let banUntil = null;
    let banReason = null;

    if (duration) {
      isBanned = true;
      // Nếu là vĩnh viễn (9999), set thời gian +100 năm để ProfilePage luôn hiển thị bị cấm
      const daysToAdd = duration === 9999 ? 36500 : duration; 
      banUntil = new Date(Date.now() + daysToAdd * 24 * 60 * 60 * 1000).toISOString();
      
      banReason = duration === 9999 
        ? "Vi phạm nghiêm trọng (Khóa vĩnh viễn)" 
        : `Vi phạm quy định (Tạm khóa ${duration} ngày)`;
    }

    const confirmMsg = duration 
      ? `Xác nhận CẤM người dùng này ${duration === 9999 ? "vĩnh viễn" : `${duration} ngày`}?` 
      : "Xác nhận MỞ KHÓA cho người dùng này?";
      
    if (!window.confirm(confirmMsg)) return;

    try {
      const { error } = await supabase
        .from("profiles")
        .update({ 
          is_banned: isBanned, 
          ban_until: banUntil,
          ban_reason: banReason // Cập nhật lý do
        })
        .eq("id", userId);

      if (error) throw error;

      // Cập nhật UI ngay lập tức
      setUsers(prev => prev.map(u => u.id === userId ? { 
        ...u, 
        is_banned: isBanned, 
        ban_until: banUntil,
        ban_reason: banReason 
      } : u));
      
      addToast("Đã cập nhật trạng thái người dùng", "success");
    } catch (err: any) { addToast(err.message, "error"); }
  };

  const handleVerify = async (reqId: string, userId: string, status: 'approved' | 'rejected', studentCode?: string) => {
    try {
      await supabase.from("verification_requests").update({ status }).eq("id", reqId);
      if (status === 'approved' && studentCode) {
        await supabase.from("profiles").update({ verified_status: 'verified', student_code: studentCode }).eq("id", userId);
      }
      setVerifications(prev => prev.filter(v => v.id !== reqId));
      addToast(status === 'approved' ? "Đã duyệt!" : "Đã từ chối.", "success");
    } catch (err) { addToast("Lỗi xử lý", "error"); }
  };

  const handleResolveReport = async (reportId: string) => {
    try {
      await supabase.from("reports").update({ status: 'resolved' }).eq("id", reportId);
      setReports(prev => prev.map(r => r.id === reportId ? { ...r, status: 'resolved' } : r));
      addToast("Đã giải quyết", "success");
    } catch (err) { addToast("Lỗi cập nhật", "error"); }
  };

  const handleDeleteProduct = async (prodId: string) => {
    if (!window.confirm("Xóa sản phẩm này vĩnh viễn?")) return;
    try {
      await supabase.from("products").delete().eq("id", prodId);
      setProducts(prev => prev.filter(p => p.id !== prodId));
      addToast("Đã xóa sản phẩm", "success");
    } catch (err) { addToast("Lỗi xóa", "error"); }
  };

  const filteredUsers = users.filter(u => 
    u.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.student_code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading || isLoadingData) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-12 h-12 text-[#00418E] animate-spin" /></div>;

  return (
    <div className="min-h-screen pt-24 pb-12 font-sans text-slate-800">
      <VisualEngine />
      <AnimatedBackground />

      <div className="max-w-7xl mx-auto px-4">
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-end mb-10 animate-enter gap-6">
          <div>
            <h1 className="text-4xl font-black text-[#00418E] mb-2 flex items-center gap-3"><ShieldCheck size={40} className="text-[#00B0F0]" /> Admin Dashboard</h1>
            <p className="text-slate-500 font-medium">Xin chào, <span className="font-bold text-slate-800">{user?.name}</span>.</p>
          </div>
          <div className="flex gap-4">
            <div className="glass-panel px-6 py-3 rounded-2xl flex flex-col items-center min-w-[100px]">
              <span className="text-xs font-bold text-slate-400 uppercase">Thành viên</span>
              <span className="text-2xl font-black text-[#00418E]">{users.length}</span>
            </div>
            <div className="glass-panel px-6 py-3 rounded-2xl flex flex-col items-center min-w-[100px]">
              <span className="text-xs font-bold text-slate-400 uppercase">Chờ duyệt</span>
              <span className="text-2xl font-black text-orange-500">{verifications.length}</span>
            </div>
          </div>
        </div>

        {/* TABS */}
        <div className="flex gap-2 overflow-x-auto pb-4 mb-6 hide-scrollbar animate-enter">
          {[
            { id: 'overview', icon: BarChart3, label: 'Tổng quan' },
            { id: 'users', icon: Users, label: 'Người dùng' },
            { id: 'verifications', icon: GraduationCap, label: 'Duyệt SV', badge: verifications.length },
            { id: 'reports', icon: Flag, label: 'Báo cáo', badge: reports.filter(r => r.status === 'pending').length },
            { id: 'products', icon: Package, label: 'Sản phẩm' }
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-[#00418E] text-white shadow-lg' : 'bg-white/60 text-slate-500 hover:bg-white'}`}>
              <tab.icon size={18} /> {tab.label} {tab.badge ? <span className="ml-1 px-1.5 py-0.5 rounded-full bg-red-500 text-white text-[10px]">{tab.badge}</span> : null}
            </button>
          ))}
        </div>

        {/* CONTENT */}
        <div className="animate-enter">
          {/* ... (Các phần Overview, Verifications, Reports, Products giữ nguyên) ... */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="glass-panel p-8 rounded-[2rem]">
                <h3 className="text-xl font-bold mb-6 flex items-center gap-2"><ShieldAlert className="text-orange-500" /> Cần xử lý ngay</h3>
                {verifications.length === 0 && reports.filter(r => r.status === 'pending').length === 0 ? (
                  <div className="py-10 text-center text-slate-400"><CheckCircle2 size={48} className="mx-auto mb-4 opacity-20" /><p>Mọi thứ đều ổn!</p></div>
                ) : (
                  <div className="space-y-4">
                    {verifications.slice(0, 3).map(v => (
                      <div key={v.id} className="flex items-center gap-4 p-4 rounded-2xl bg-white/50 border border-white">
                        <div className="p-2 bg-orange-100 text-orange-600 rounded-xl"><GraduationCap size={20}/></div>
                        <div className="flex-1"><p className="font-bold text-sm">Duyệt SV: {v.profiles?.name}</p></div>
                        <button onClick={() => setActiveTab('verifications')} className="text-xs font-bold text-blue-600">Xem</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="glass-panel rounded-[2rem] overflow-hidden">
              <div className="p-6 border-b border-white/50 flex justify-between items-center">
                <h3 className="text-xl font-bold">Danh sách thành viên</h3>
                <div className="relative w-96"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} /><input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Tìm kiếm..." className="w-full pl-10 pr-4 py-2.5 rounded-xl border-none bg-white/50 focus:bg-white transition-all text-sm font-medium"/></div>
              </div>
              <div className="overflow-x-auto table-container">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50/80 text-xs font-bold text-slate-500 uppercase">
                    <tr><th className="p-6">Thành viên</th><th className="p-6">Trạng thái</th><th className="p-6">Xác thực</th><th className="p-6 text-right">Thao tác</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredUsers.map(u => {
                      const isBanned = u.is_banned; 
                      return (
                        <tr key={u.id} className={`hover:bg-white/40 transition-colors ${isBanned ? 'bg-red-50/50' : ''}`}>
                          <td className="p-6">
                            <div className="flex items-center gap-3">
                              <img src={u.avatar_url || `https://ui-avatars.com/api/?name=${u.name}`} className="w-10 h-10 rounded-full bg-white shadow-sm object-cover" />
                              <div><p className="font-bold text-slate-800 text-sm">{u.name}</p><p className="text-xs text-slate-500">{u.email}</p><p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">{u.role} • MSSV: {u.student_code || '---'}</p></div>
                            </div>
                          </td>
                          <td className="p-6">
                            {isBanned ? <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-100 text-red-700 text-xs font-bold"><ShieldAlert size={12}/> Bị cấm</span> : <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-green-100 text-green-700 text-xs font-bold"><CheckCircle2 size={12}/> Hoạt động</span>}
                          </td>
                          <td className="p-6">{u.verified_status === 'verified' ? <span className="text-blue-600 font-bold text-xs">Đã xác thực</span> : <span className="text-slate-400 text-xs">Chưa xác thực</span>}</td>
                          <td className="p-6 text-right">
                            {u.role !== 'admin' && (
                              <div className="flex justify-end gap-2">
                                {isBanned ? (
                                  <button onClick={() => handleBanUser(u.id, null)} className="p-2 rounded-lg bg-green-100 text-green-600 hover:bg-green-200 transition-colors" title="Mở khóa"><Unlock size={16} /></button>
                                ) : (
                                  <>
                                    <button onClick={() => handleBanUser(u.id, 3)} className="px-3 py-1.5 rounded-lg bg-orange-100 text-orange-700 text-xs font-bold hover:bg-orange-200 transition-colors">3 ngày</button>
                                    <button onClick={() => handleBanUser(u.id, 9999)} className="p-2 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition-colors" title="Cấm vĩnh viễn"><Ban size={16} /></button>
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

          {activeTab === 'verifications' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {verifications.map(req => (
                <div key={req.id} className="glass-panel p-6 rounded-[2rem] flex gap-6 animate-enter">
                  <div className="w-1/3 relative cursor-zoom-in" onClick={() => window.open(req.image_url, '_blank')}><img src={req.image_url} className="w-full h-32 object-cover rounded-xl bg-slate-200 border-2 border-white shadow-sm"/></div>
                  <div className="flex-1 flex flex-col">
                    <div className="mb-4">
                      <h4 className="font-bold text-slate-800">{req.profiles?.name}</h4>
                      <p className="text-xs text-slate-500 mb-2">{req.profiles?.email}</p>
                      <div className="bg-blue-50 border border-blue-100 rounded-lg p-2"><p className="text-[10px] font-bold text-blue-400 uppercase">MSSV</p><p className="text-lg font-black text-blue-700 font-mono">{req.student_code}</p></div>
                    </div>
                    <div className="mt-auto grid grid-cols-2 gap-2">
                      <button onClick={() => handleVerify(req.id, req.user_id, 'rejected')} className="py-2 rounded-lg bg-slate-100 text-slate-600 font-bold text-xs">Từ chối</button>
                      <button onClick={() => handleVerify(req.id, req.user_id, 'approved', req.student_code)} className="py-2 rounded-lg bg-green-500 text-white font-bold text-xs shadow-lg shadow-green-500/30">Duyệt</button>
                    </div>
                  </div>
                </div>
              ))}
              {verifications.length === 0 && <div className="col-span-full py-10 text-center text-slate-400">Không có yêu cầu nào.</div>}
            </div>
          )}

          {activeTab === 'reports' && (
            <div className="space-y-4">
              {reports.map(report => (
                <div key={report.id} className={`glass-panel p-6 rounded-3xl flex gap-6 animate-enter ${report.status === 'resolved' ? 'opacity-60 grayscale' : 'border-l-4 border-l-red-500'}`}>
                  <div className="shrink-0 w-16 h-16 rounded-2xl bg-slate-100 overflow-hidden"><img src={report.product_image} className="w-full h-full object-cover" /></div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-2">
                      <div><span className="inline-block px-2 py-0.5 rounded-md bg-red-100 text-red-600 text-[10px] font-bold uppercase mb-1">Lý do: {report.reason}</span><h4 className="font-bold text-slate-800">Sản phẩm: {report.product_title}</h4></div>
                      <span className="text-xs text-slate-400 font-medium">{new Date(report.created_at).toLocaleDateString()}</span>
                    </div>
                    {report.status === 'pending' && (
                      <div className="flex gap-2">
                        <button onClick={() => handleResolveReport(report.id)} className="px-3 py-1.5 rounded-lg bg-green-100 text-green-700 text-xs font-bold">Xử lý xong</button>
                        <button onClick={() => handleDeleteProduct(report.product_id)} className="px-3 py-1.5 rounded-lg bg-red-100 text-red-600 text-xs font-bold ml-auto">Xóa bài đăng</button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'products' && (
            <div className="glass-panel p-6 rounded-[2rem]">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {products.map(p => (
                  <div key={p.id} className="flex gap-3 p-3 rounded-2xl bg-white/50 border border-white hover:bg-white transition-colors group">
                    <img src={p.images?.[0]} className="w-16 h-16 rounded-xl object-cover bg-slate-200" />
                    <div className="flex-1 flex flex-col justify-between">
                      <div><h4 className="font-bold text-slate-800 text-xs truncate">{p.title}</h4><p className="text-xs text-[#00418E] font-bold">{p.price.toLocaleString()}đ</p></div>
                      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleDeleteProduct(p.id)} className="p-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100"><Trash2 size={12}/></button>
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
