import React, { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../services/supabase";
import { useNavigate } from "react-router-dom";
import {
  Trash2, ShieldCheck, Users, Package, Flag, Search, Ban, Unlock,
  Loader2, ShieldAlert, CheckCircle2, Eye, BarChart3, GraduationCap,
  MoreVertical, ExternalLink
} from "lucide-react";
import { Product, VerificationRequest } from "../types";
import { useToast } from "../contexts/ToastContext";

// --- TYPES MỞ RỘNG ---
// Interface cho User trong bảng Admin
interface AdminUser {
  id: string;
  name: string | null;
  email?: string;
  avatar_url: string | null;
  student_code: string | null;
  verified_status: string;
  role: string;
  is_banned: boolean;
  ban_until: string | null;
  created_at: string;
}

// Interface cho Product trong bảng Admin (Kèm thông tin người bán)
interface AdminProduct extends Product {
  seller_name?: string;
  seller_student_code?: string;
  seller_avatar?: string;
}

// --- STYLES ---
const VisualEngine = () => (
  <style>{`
    :root { --primary: #00418E; }
    body { background-color: #F8FAFC; color: #0F172A; font-family: 'Inter', sans-serif; }
    .glass-panel { background: rgba(255, 255, 255, 0.75); backdrop-filter: blur(20px); border: 1px solid rgba(255, 255, 255, 0.6); box-shadow: 0 8px 32px rgba(0, 0, 0, 0.05); }
    .animate-enter { animation: slideUp 0.5s ease-out forwards; }
    @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
    .table-row-hover:hover { background-color: rgba(255, 255, 255, 0.8); transform: scale(1.005); transition: all 0.2s; }
  `}</style>
);

const AdminPage: React.FC = () => {
  const { user, loading, isAdmin } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  // Data State
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [products, setProducts] = useState<AdminProduct[]>([]); // Dùng AdminProduct
  const [verifications, setVerifications] = useState<VerificationRequest[]>([]);
  const [reports, setReports] = useState<any[]>([]); // Simplified for brevity
  
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'products' | 'verifications'>('overview');
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
      // 1. Fetch Users
      const { data: usersData } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
      
      // 2. Fetch Products + Seller Info (JOIN)
      // Quan trọng: Lấy thông tin seller để Admin biết ai đăng bài
      const { data: prodData } = await supabase
        .from("products")
        .select(`
          *,
          profiles:seller_id (name, student_code, avatar_url)
        `)
        .order("created_at", { ascending: false });

      // 3. Fetch Verifications
      const { data: verifyData } = await supabase
        .from("verification_requests")
        .select(`*, profiles:user_id(name, email, student_code, avatar_url)`)
        .eq("status", "pending");

      if (usersData) setUsers(usersData);
      
      if (prodData) {
        // Map dữ liệu để hiển thị dễ hơn
        const mappedProducts = prodData.map((p: any) => ({
          ...p,
          seller_name: p.profiles?.name || "Unknown",
          seller_student_code: p.profiles?.student_code || "---",
          seller_avatar: p.profiles?.avatar_url
        }));
        setProducts(mappedProducts);
      }

      if (verifyData) setVerifications(verifyData as any);

    } catch (err) {
      console.error(err);
      addToast("Lỗi tải dữ liệu admin", "error");
    } finally {
      setIsLoadingData(false);
    }
  };

  // --- ACTIONS ---
  const handleDeleteProduct = async (prodId: string) => {
    if (!confirm("Bạn chắc chắn muốn xóa bài đăng này vĩnh viễn?")) return;
    try {
      const { error } = await supabase.from("products").delete().eq("id", prodId);
      if (error) throw error;
      setProducts(prev => prev.filter(p => p.id !== prodId));
      addToast("Đã xóa bài đăng", "success");
    } catch (err) {
      addToast("Lỗi khi xóa", "error");
    }
  };

  const handleBanUser = async (userId: string, isBanned: boolean) => {
    if (!confirm(isBanned ? "Mở khóa thành viên này?" : "Cấm thành viên này?")) return;
    try {
      await supabase.from("profiles").update({ is_banned: !isBanned }).eq("id", userId);
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_banned: !isBanned } : u));
      addToast("Đã cập nhật trạng thái", "success");
    } catch (err) { addToast("Lỗi cập nhật", "error"); }
  };

  const handleVerify = async (reqId: string, userId: string, status: 'approved' | 'rejected', code?: string) => {
    try {
      await supabase.from("verification_requests").update({ status }).eq("id", reqId);
      if (status === 'approved' && code) {
        await supabase.from("profiles").update({ verified_status: 'verified', student_code: code }).eq("id", userId);
      }
      setVerifications(prev => prev.filter(v => v.id !== reqId));
      addToast("Đã xử lý yêu cầu", "success");
    } catch (err) { addToast("Lỗi xử lý", "error"); }
  };

  if (loading || isLoadingData) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-[#00418E] w-12 h-12"/></div>;

  return (
    <div className="min-h-screen pt-24 pb-12 font-sans text-slate-800">
      <VisualEngine />
      <div className="fixed inset-0 -z-10 bg-gradient-to-br from-blue-50 to-slate-100"></div>

      <div className="max-w-7xl mx-auto px-4">
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-10 animate-enter">
          <div>
            <h1 className="text-4xl font-black text-[#00418E] mb-2 flex items-center gap-3">
              <ShieldCheck size={40} className="text-[#00B0F0]" /> Admin Dashboard
            </h1>
            <p className="text-slate-500 font-medium">Hệ thống quản lý tập trung Marketplace</p>
          </div>
          <div className="flex gap-4 mt-4 md:mt-0">
            <div className="glass-panel px-6 py-3 rounded-2xl flex flex-col items-center">
              <span className="text-xs font-bold text-slate-400 uppercase">Thành viên</span>
              <span className="text-2xl font-black text-[#00418E]">{users.length}</span>
            </div>
            <div className="glass-panel px-6 py-3 rounded-2xl flex flex-col items-center">
              <span className="text-xs font-bold text-slate-400 uppercase">Bài đăng</span>
              <span className="text-2xl font-black text-green-600">{products.length}</span>
            </div>
          </div>
        </div>

        {/* TABS */}
        <div className="flex gap-2 overflow-x-auto pb-4 mb-6 hide-scrollbar animate-enter">
          {[
            { id: 'overview', icon: BarChart3, label: 'Tổng quan' },
            { id: 'users', icon: Users, label: 'Thành viên' },
            { id: 'products', icon: Package, label: 'Quản lý Tin đăng' }, // Tab này quan trọng
            { id: 'verifications', icon: GraduationCap, label: 'Xét duyệt SV', badge: verifications.length }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all whitespace-nowrap ${
                activeTab === tab.id 
                  ? 'bg-[#00418E] text-white shadow-lg shadow-blue-500/30' 
                  : 'bg-white text-slate-500 hover:bg-white hover:text-[#00418E]'
              }`}
            >
              <tab.icon size={18} /> {tab.label}
              {tab.badge ? <span className="ml-1 px-1.5 py-0.5 rounded-full bg-red-500 text-white text-[10px]">{tab.badge}</span> : null}
            </button>
          ))}
        </div>

        {/* --- MAIN CONTENT --- */}
        <div className="animate-enter">
          
          {/* TAB: PRODUCTS (QUẢN LÝ BÀI ĐĂNG - LIÊN KẾT VỚI POST ITEM) */}
          {activeTab === 'products' && (
            <div className="glass-panel rounded-[2rem] overflow-hidden">
              <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-white/50">
                <h3 className="text-xl font-bold text-slate-800">Tất cả bài đăng ({products.length})</h3>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
                  <input 
                    placeholder="Tìm tên bài, tên người bán..." 
                    className="pl-10 pr-4 py-2 rounded-xl border-none bg-white shadow-sm focus:ring-2 focus:ring-[#00418E] outline-none"
                    onChange={e => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase">
                    <tr>
                      <th className="p-5">Sản phẩm</th>
                      <th className="p-5">Giá bán</th>
                      <th className="p-5">Người bán (Seller)</th>
                      <th className="p-5">Ngày đăng</th>
                      <th className="p-5 text-right">Hành động</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {products.filter(p => 
                      p.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                      p.seller_name?.toLowerCase().includes(searchTerm.toLowerCase())
                    ).map(p => (
                      <tr key={p.id} className="table-row-hover bg-white/40">
                        <td className="p-5">
                          <div className="flex items-center gap-3">
                            <img src={p.images?.[0] || 'https://via.placeholder.com/50'} className="w-12 h-12 rounded-lg object-cover bg-slate-200 border border-white shadow-sm"/>
                            <div>
                              <p className="font-bold text-slate-800 line-clamp-1">{p.title}</p>
                              <p className="text-xs text-slate-500">{p.category}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-5 font-bold text-[#00418E]">{p.price.toLocaleString()}đ</td>
                        <td className="p-5">
                          <div className="flex items-center gap-2">
                            <img src={p.seller_avatar || `https://ui-avatars.com/api/?name=${p.seller_name}`} className="w-6 h-6 rounded-full"/>
                            <div>
                              <p className="text-sm font-bold text-slate-700">{p.seller_name}</p>
                              <p className="text-[10px] text-slate-400 font-mono">MSSV: {p.seller_student_code}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-5 text-sm text-slate-500">{new Date(p.created_at || '').toLocaleDateString()}</td>
                        <td className="p-5 text-right">
                          <div className="flex justify-end gap-2">
                            <button onClick={() => window.open(`/product/${p.id}`, '_blank')} className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100" title="Xem bài">
                              <Eye size={16}/>
                            </button>
                            <button onClick={() => handleDeleteProduct(p.id)} className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100" title="Xóa bài">
                              <Trash2 size={16}/>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB: USERS */}
          {activeTab === 'users' && (
            <div className="glass-panel rounded-[2rem] overflow-hidden">
              <div className="p-6 border-b border-slate-200 bg-white/50"><h3 className="text-xl font-bold">Danh sách thành viên</h3></div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase">
                    <tr><th className="p-5">User</th><th className="p-5">Trạng thái</th><th className="p-5 text-right">Thao tác</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {users.map(u => (
                      <tr key={u.id} className="table-row-hover bg-white/40">
                        <td className="p-5">
                          <div className="flex items-center gap-3">
                            <img src={u.avatar_url || `https://ui-avatars.com/api/?name=${u.name}`} className="w-10 h-10 rounded-full"/>
                            <div>
                              <p className="font-bold text-slate-800">{u.name}</p>
                              <p className="text-xs text-slate-500">{u.email} • MSSV: {u.student_code || '---'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-5">
                          {u.is_banned ? <span className="text-red-600 font-bold text-xs bg-red-50 px-2 py-1 rounded">Bị cấm</span> : <span className="text-green-600 font-bold text-xs bg-green-50 px-2 py-1 rounded">Hoạt động</span>}
                        </td>
                        <td className="p-5 text-right">
                          <button onClick={() => handleBanUser(u.id, u.is_banned)} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${u.is_banned ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {u.is_banned ? 'Mở khóa' : 'Cấm'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB: VERIFICATIONS */}
          {activeTab === 'verifications' && (
            <div className="grid md:grid-cols-2 gap-6">
              {verifications.length === 0 ? <div className="col-span-full py-10 text-center text-slate-400">Không có yêu cầu nào.</div> :
              verifications.map(req => (
                <div key={req.id} className="glass-panel p-6 rounded-[2rem] flex gap-4">
                  <div className="w-1/3 bg-slate-200 rounded-xl overflow-hidden cursor-pointer" onClick={() => window.open(req.image_url)}>
                    <img src={req.image_url} className="w-full h-full object-cover"/>
                  </div>
                  <div className="flex-1 flex flex-col">
                    <div className="mb-4">
                      <h4 className="font-bold text-slate-800">{req.profiles?.name}</h4>
                      <p className="text-xs text-slate-500">{req.profiles?.email}</p>
                      <div className="mt-2 bg-blue-50 p-2 rounded-lg border border-blue-100">
                        <p className="text-[10px] text-blue-500 font-bold uppercase">MSSV Khai báo</p>
                        <p className="text-lg font-mono font-black text-blue-700">{req.student_code}</p>
                      </div>
                    </div>
                    <div className="mt-auto flex gap-2">
                      <button onClick={() => handleVerify(req.id, req.user_id, 'rejected')} className="flex-1 py-2 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold">Từ chối</button>
                      <button onClick={() => handleVerify(req.id, req.user_id, 'approved', req.student_code)} className="flex-1 py-2 bg-green-500 text-white rounded-lg text-xs font-bold shadow-lg shadow-green-500/30">Duyệt</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="glass-panel p-10 rounded-[2rem] text-center">
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 text-[#00418E]"><BarChart3 size={32}/></div>
              <h2 className="text-2xl font-black text-slate-800">Tổng quan hệ thống</h2>
              <p className="text-slate-500 mt-2">Chọn các tab phía trên để quản lý chi tiết.</p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default AdminPage;
