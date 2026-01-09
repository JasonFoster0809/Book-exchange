import React, { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../services/supabase";
import { useNavigate } from "react-router-dom";
import {
  Trash2, ShieldCheck, Users, Package, Flag, Search, Ban, Unlock,
  Loader2, ShieldAlert, CheckCircle2, Eye, BarChart3, GraduationCap,
  X, AlertTriangle, Clock, Save
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
    body { background-color: #F8FAFC; color: #0F172A; font-family: 'Inter', sans-serif; }
    
    .glass-panel { 
      background: rgba(255, 255, 255, 0.8); 
      backdrop-filter: blur(20px); 
      border: 1px solid rgba(255, 255, 255, 0.6); 
      box-shadow: 0 20px 40px -10px rgba(0, 65, 142, 0.1); 
    }
    
    .animate-enter { animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
    @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
    
    /* Custom Scrollbar */
    .table-container::-webkit-scrollbar { height: 6px; width: 6px; }
    .table-container::-webkit-scrollbar-thumb { background: #CBD5E1; border-radius: 4px; }
    
    /* Modal Animation */
    .modal-overlay { animation: fadeIn 0.2s forwards; }
    .modal-content { animation: scaleUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes scaleUp { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
  `}</style>
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
  
  // UI & Filter
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'verifications' | 'reports' | 'products'>('overview');
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // --- BAN MODAL STATE ---
  const [isBanModalOpen, setIsBanModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [banType, setBanType] = useState<'temporary' | 'permanent' | 'unban'>('temporary');
  const [banDuration, setBanDuration] = useState<number>(3); // Số ngày mặc định
  const [banReason, setBanReason] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

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
    } catch (err) { console.error(err); } 
    finally { setIsLoadingData(false); }
  };

  // --- OPEN MODAL ---
  const openBanModal = (targetUser: AdminUser) => {
    setSelectedUser(targetUser);
    // Set default state based on current user status
    if (targetUser.is_banned) {
        setBanType('unban');
        setBanReason("");
    } else {
        setBanType('temporary');
        setBanDuration(3);
        setBanReason("");
    }
    setIsBanModalOpen(true);
  };

  // --- SUBMIT BAN ---
  const handleSubmitBan = async () => {
    if (!selectedUser) return;
    setIsProcessing(true);

    try {
      let isBanned = false;
      let banUntil = null;
      let finalReason = null;

      if (banType !== 'unban') {
        isBanned = true;
        finalReason = banReason.trim() || (banType === 'permanent' ? "Vi phạm nghiêm trọng" : "Vi phạm quy định");
        
        if (banType === 'temporary') {
          banUntil = new Date(Date.now() + banDuration * 24 * 60 * 60 * 1000).toISOString();
        } else {
          // Vĩnh viễn = 100 năm
          banUntil = new Date(Date.now() + 36500 * 24 * 60 * 60 * 1000).toISOString();
        }
      }

      const { error } = await supabase
        .from("profiles")
        .update({ 
          is_banned: isBanned, 
          ban_until: banUntil,
          ban_reason: finalReason
        })
        .eq("id", selectedUser.id);

      if (error) throw error;

      // Update UI
      setUsers(prev => prev.map(u => u.id === selectedUser.id ? { 
        ...u, 
        is_banned: isBanned, 
        ban_until: banUntil,
        ban_reason: finalReason 
      } : u));

      addToast("Cập nhật thành công!", "success");
      setIsBanModalOpen(false);
    } catch (err: any) {
      addToast(err.message, "error");
    } finally {
      setIsProcessing(false);
    }
  };

  // --- OTHER ACTIONS ---
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
      <div className="fixed inset-0 -z-10 bg-slate-50"></div>

      <div className="max-w-7xl mx-auto px-4">
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-end mb-10 animate-enter gap-6">
          <div>
            <h1 className="text-4xl font-black text-[#00418E] mb-2 flex items-center gap-3">
              <ShieldCheck size={40} className="text-[#00B0F0]" /> Quản trị
            </h1>
            <p className="text-slate-500 font-medium">Xin chào, {user?.name}</p>
          </div>
          <div className="flex gap-3">
             <div className="bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-200 text-center">
                <span className="block text-[10px] font-bold text-slate-400 uppercase">Thành viên</span>
                <span className="text-xl font-black text-[#00418E]">{users.length}</span>
             </div>
             <div className="bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-200 text-center">
                <span className="block text-[10px] font-bold text-slate-400 uppercase">Chờ duyệt</span>
                <span className="text-xl font-black text-orange-500">{verifications.length}</span>
             </div>
          </div>
        </div>

        {/* NAV TABS */}
        <div className="flex gap-2 overflow-x-auto pb-4 mb-6 hide-scrollbar animate-enter">
          {[
            { id: 'overview', icon: BarChart3, label: 'Tổng quan' },
            { id: 'users', icon: Users, label: 'Người dùng' },
            { id: 'verifications', icon: GraduationCap, label: 'Duyệt SV', badge: verifications.length },
            { id: 'reports', icon: Flag, label: 'Báo cáo', badge: reports.filter(r => r.status === 'pending').length },
            { id: 'products', icon: Package, label: 'Sản phẩm' }
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-[#00418E] text-white shadow-lg' : 'bg-white text-slate-500 hover:bg-slate-50'}`}>
              <tab.icon size={18} /> {tab.label} {tab.badge ? <span className="ml-1 px-1.5 py-0.5 rounded-full bg-red-500 text-white text-[10px]">{tab.badge}</span> : null}
            </button>
          ))}
        </div>

        {/* MAIN CONTENT */}
        <div className="animate-enter">
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
              <div className="p-6 border-b border-white/50 flex justify-between items-center bg-white/40">
                <h3 className="text-xl font-bold">Danh sách thành viên</h3>
                <div className="relative w-72"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} /><input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Tìm kiếm..." className="w-full pl-10 pr-4 py-2.5 rounded-xl border-none bg-white focus:ring-2 focus:ring-blue-100 outline-none transition-all text-sm font-medium"/></div>
              </div>
              <div className="overflow-x-auto table-container max-h-[600px]">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50/90 text-xs font-bold text-slate-500 uppercase sticky top-0 z-10 backdrop-blur-sm">
                    <tr><th className="p-5">Thành viên</th><th className="p-5">Trạng thái</th><th className="p-5">Xác thực</th><th className="p-5 text-right">Thao tác</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredUsers.map(u => {
                      const isBanned = u.is_banned; 
                      return (
                        <tr key={u.id} className={`hover:bg-blue-50/30 transition-colors ${isBanned ? 'bg-red-50/30' : ''}`}>
                          <td className="p-5">
                            <div className="flex items-center gap-3">
                              <img src={u.avatar_url || `https://ui-avatars.com/api/?name=${u.name}`} className="w-10 h-10 rounded-full bg-white shadow-sm object-cover" />
                              <div>
                                <p className="font-bold text-slate-800 text-sm">{u.name}</p>
                                <p className="text-xs text-slate-500">{u.email}</p>
                                <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">{u.role} • MSSV: {u.student_code || '---'}</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-5">
                            {isBanned ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-100 text-red-700 text-xs font-bold"><ShieldAlert size={12}/> Bị cấm</span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-green-100 text-green-700 text-xs font-bold"><CheckCircle2 size={12}/> Hoạt động</span>
                            )}
                          </td>
                          <td className="p-5">{u.verified_status === 'verified' ? <span className="text-blue-600 font-bold text-xs">Đã xác thực</span> : <span className="text-slate-400 text-xs">Chưa xác thực</span>}</td>
                          <td className="p-5 text-right">
                            {u.role !== 'admin' && (
                              <button onClick={() => openBanModal(u)} className={`px-4 py-2 rounded-lg font-bold text-xs transition-colors ${isBanned ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-red-100 text-red-700 hover:bg-red-200'}`}>
                                {isBanned ? <><Unlock size={14} className="inline mr-1"/> Mở khóa</> : <><Ban size={14} className="inline mr-1"/> Xử lý</>}
                              </button>
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

          {/* ... (Các tab Reports, Verifications, Products giữ nguyên) ... */}
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

      {/* --- BAN MODAL (NEW UI) --- */}
      {isBanModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-overlay bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden modal-content">
            {/* Modal Header */}
            <div className="bg-[#00418E] px-6 py-4 flex justify-between items-center">
              <h3 className="text-white font-bold text-lg flex items-center gap-2">
                <AlertTriangle size={20} className="text-yellow-400"/> Xử lý vi phạm
              </h3>
              <button onClick={() => setIsBanModalOpen(false)} className="bg-white/20 p-1.5 rounded-full text-white hover:bg-white/30"><X size={16}/></button>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              <div className="flex items-center gap-3 mb-6 p-3 bg-slate-50 rounded-xl border border-slate-100">
                <img src={selectedUser.avatar_url || `https://ui-avatars.com/api/?name=${selectedUser.name}`} className="w-12 h-12 rounded-full border-2 border-white shadow-sm"/>
                <div>
                  <p className="font-bold text-slate-800">{selectedUser.name}</p>
                  <p className="text-xs text-slate-500">{selectedUser.email}</p>
                </div>
              </div>

              <div className="space-y-4">
                {/* Actions */}
                <div className="grid grid-cols-3 gap-2 bg-slate-100 p-1 rounded-xl">
                  {[
                    { id: 'unban', label: 'Mở khóa' },
                    { id: 'temporary', label: 'Tạm khóa' },
                    { id: 'permanent', label: 'Vĩnh viễn' }
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => setBanType(opt.id as any)}
                      className={`py-2 rounded-lg text-xs font-bold transition-all ${banType === opt.id ? 'bg-white shadow text-[#00418E]' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                {/* Duration Input */}
                {banType === 'temporary' && (
                  <div className="animate-enter">
                    <label className="text-xs font-bold text-slate-500 mb-1.5 block">Thời gian (ngày)</label>
                    <div className="relative">
                      <input 
                        type="number" 
                        min="1" 
                        value={banDuration} 
                        onChange={e => setBanDuration(parseInt(e.target.value) || 1)}
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:border-[#00418E] outline-none"
                      />
                      <Clock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                    </div>
                  </div>
                )}

                {/* Reason Input */}
                {banType !== 'unban' && (
                  <div className="animate-enter">
                    <label className="text-xs font-bold text-slate-500 mb-1.5 block">Lý do xử phạt <span className="text-red-500">*</span></label>
                    <textarea 
                      rows={3}
                      value={banReason}
                      onChange={e => setBanReason(e.target.value)}
                      placeholder="VD: Spam tin nhắn, bom hàng..."
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:border-[#00418E] outline-none resize-none"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50">
              <button onClick={() => setIsBanModalOpen(false)} className="px-5 py-2.5 rounded-xl font-bold text-slate-500 hover:bg-slate-200 transition-colors text-sm">Hủy bỏ</button>
              <button 
                onClick={handleSubmitBan} 
                disabled={isProcessing || (banType !== 'unban' && !banReason.trim())}
                className="px-6 py-2.5 rounded-xl font-bold text-white bg-[#00418E] hover:bg-[#00306b] shadow-lg shadow-blue-900/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm transition-all"
              >
                {isProcessing ? <Loader2 size={16} className="animate-spin"/> : <Save size={16}/>}
                Lưu thay đổi
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminPage;
