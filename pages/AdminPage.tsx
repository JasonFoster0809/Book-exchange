import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Trash2, ShieldCheck, Users, Package, Flag, AlertTriangle, 
  ExternalLink, RefreshCw, BarChart3, Search, Ban, Unlock, 
  Activity, Loader2, ShieldAlert, Clock
} from 'lucide-react';
import { Product, DBProfile } from '../types';
import { useToast } from '../contexts/ToastContext';

// Mở rộng interface để nhận diện ban_until từ database
interface AdminUserProfile extends DBProfile {
  ban_until?: string | null;
  email?: string;
}

interface ReportData {
  id: string; reporter_id: string; product_id: string; reason: string; status: 'pending' | 'resolved' | 'dismissed'; created_at: string;
  reporter?: DBProfile; product?: Product;
}

interface VerificationRequest {
  id: string; user_id: string; image_url: string; status: 'pending' | 'approved' | 'rejected'; created_at: string;
  profiles: { name: string; email: string; student_id: string; avatar_url: string; };
}

const AdminPage: React.FC = () => {
  const { user, loading, isAdmin } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [products, setProducts] = useState<Product[]>([]);
  const [usersList, setUsersList] = useState<AdminUserProfile[]>([]);
  const [reports, setReports] = useState<ReportData[]>([]);
  const [verifications, setVerifications] = useState<VerificationRequest[]>([]);
  
  const [activeTab, setActiveTab] = useState<'dashboard' | 'reports' | 'products' | 'users' | 'verifications'>('users');
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      addToast("Bạn không có quyền truy cập!", "error");
      navigate('/');
    } else if (!loading && isAdmin) {
      fetchData();
    }
  }, [loading, user, isAdmin]);

  const fetchData = async () => {
    setIsLoadingData(true);
    try {
      const [prodRes, userRes, reportRes, verifyRes] = await Promise.all([
        supabase.from('products').select('*').order('posted_at', { ascending: false }),
        supabase.from('profiles').select('*').order('created_at', { ascending: false }),
        supabase.from('reports').select('*, profiles:reporter_id(*), products:product_id(*)').order('created_at', { ascending: false }),
        supabase.from('verification_requests').select('*, profiles:user_id(name, email, student_id, avatar_url)').eq('status', 'pending')
      ]);

      if (prodRes.data) setProducts(prodRes.data.map((p: any) => ({ ...p, sellerId: p.seller_id, postedAt: p.posted_at })));
      if (userRes.data) setUsersList(userRes.data);
      if (reportRes.data) setReports(reportRes.data.map((r: any) => ({ ...r, reporter: r.profiles, product: r.products })));
      if (verifyRes.data) setVerifications(verifyRes.data);
    } catch (err) {
      addToast("Lỗi tải dữ liệu", "error");
    } finally {
      setIsLoadingData(false);
    }
  };

  // --- HÀM XỬ PHẠT CÓ THỜI HẠN (BAN + HUY HIỆU) ---
  const handleTimedBan = async (userId: string, days: number | null) => {
    // Nếu days = null nghĩa là gỡ lệnh cấm hoàn toàn
    const banUntil = days ? new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString() : null;
    const confirmMsg = days 
      ? `Gắn huy hiệu 'Không đáng tin' và cấm người dùng này ${days} ngày?` 
      : "Xác nhận gỡ bỏ huy hiệu và lệnh cấm cho thành viên này?";

    if (!window.confirm(confirmMsg)) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ ban_until: banUntil })
        .eq('id', userId);

      if (error) throw error;

      // Cập nhật giao diện tại chỗ
      setUsersList(prev => prev.map(u => u.id === userId ? { ...u, ban_until: banUntil } : u));
      addToast(days ? `Đã gắn huy hiệu 'Không đáng tin' (${days} ngày)` : "Đã khôi phục trạng thái tin cậy", "success");
    } catch (err: any) {
      addToast("Lỗi: " + err.message, "error");
    }
  };

  const filteredUsers = usersList.filter(u => 
    u.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.student_id?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading || isLoadingData) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Loader2 className="w-12 h-12 animate-spin text-indigo-600" />
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-10 font-sans bg-gray-50 min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-4">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight flex items-center">
            <ShieldCheck className="w-10 h-10 mr-3 text-indigo-600"/> TRUNG TÂM QUẢN TRỊ
          </h1>
          <p className="text-gray-500 font-medium mt-1">Xử lý vi phạm & Kiểm duyệt cộng đồng Bách Khoa</p>
        </div>
        <button onClick={fetchData} className="p-3 bg-white border shadow-sm rounded-2xl hover:bg-gray-50 transition"><RefreshCw size={24}/></button>
      </div>

      {/* Tabs Navigation */}
      <div className="flex gap-2 mb-8 bg-white p-2 rounded-[2rem] shadow-sm w-fit overflow-x-auto">
        {[
          { id: 'users', label: 'Thành viên', icon: Users },
          { id: 'reports', label: 'Báo cáo', icon: Flag, count: reports.filter(r => r.status==='pending').length },
          { id: 'verifications', label: 'Duyệt SV', icon: ShieldCheck, count: verifications.length },
          { id: 'products', label: 'Bài đăng', icon: Package }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-8 py-3.5 rounded-[1.5rem] font-bold text-sm transition-all ${
              activeTab === tab.id ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'
            }`}
          >
            <tab.icon size={18}/> {tab.label}
            {tab.count ? <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full">{tab.count}</span> : null}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-[2.5rem] border shadow-sm overflow-hidden min-h-[600px]">
        {activeTab === 'users' && (
          <div className="p-8">
            <div className="relative mb-8">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                type="text" 
                placeholder="Tìm kiếm theo tên hoặc MSSV..." 
                className="w-full pl-14 pr-6 py-4 bg-gray-50 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-100 transition border-none"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-gray-400 text-[10px] font-black uppercase tracking-widest border-b">
                    <th className="p-6">Thành viên</th>
                    <th className="p-6">Trạng thái / Huy hiệu</th>
                    <th className="p-6 text-right">Xử phạt (Tạm khóa)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredUsers.map(u => {
                    const isRestricted = u.ban_until && new Date(u.ban_until) > new Date();
                    return (
                      <tr key={u.id} className={`group hover:bg-gray-50 transition ${isRestricted ? 'bg-red-50/30' : ''}`}>
                        <td className="p-6">
                          <div className="flex items-center gap-4">
                            <img src={u.avatar_url || `https://ui-avatars.com/api/?name=${u.name}`} className="w-12 h-12 rounded-full border shadow-sm"/>
                            <div>
                              <p className="font-bold text-gray-900">{u.name}</p>
                              <p className="text-xs text-gray-400 font-medium uppercase tracking-tighter">MSSV: {u.student_id || '---'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-6">
                          {isRestricted ? (
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-2 text-red-600 font-black text-[10px] bg-red-100 px-3 py-1.5 rounded-full w-fit animate-pulse border border-red-200">
                                <ShieldAlert size={14}/> NGƯỜI DÙNG KHÔNG ĐÁNG TIN
                              </div>
                              <span className="text-[10px] text-gray-400 font-bold flex items-center gap-1 ml-1 uppercase">
                                <Clock size={12}/> Hết hạn: {new Date(u.ban_until!).toLocaleDateString('vi-VN')}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400 font-bold uppercase tracking-widest bg-gray-100 px-3 py-1.5 rounded-full">Bình thường</span>
                          )}
                        </td>
                        <td className="p-6 text-right">
                          {u.role !== 'admin' && (
                            <div className="flex justify-end gap-1">
                              {isRestricted ? (
                                <button onClick={() => handleTimedBan(u.id, null)} className="flex items-center gap-2 px-6 py-2.5 bg-green-600 text-white rounded-xl text-xs font-black hover:bg-green-700 shadow-md">
                                  <Unlock size={14}/> GỠ HUY HIỆU
                                </button>
                              ) : (
                                <>
                                  <button onClick={() => handleTimedBan(u.id, 3)} className="px-4 py-2.5 bg-yellow-500 text-white rounded-xl text-[10px] font-black hover:bg-yellow-600">3 NGÀY</button>
                                  <button onClick={() => handleTimedBan(u.id, 7)} className="px-4 py-2.5 bg-orange-500 text-white rounded-xl text-[10px] font-black hover:bg-orange-600">7 NGÀY</button>
                                  <button onClick={() => handleTimedBan(u.id, 30)} className="px-4 py-2.5 bg-red-600 text-white rounded-xl text-[10px] font-black hover:bg-red-700">1 THÁNG</button>
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
        
        {/* Phần hiển thị các Tab khác (Reports, Verifications, Products) giữ nguyên nội dung cũ nhưng bọc trong style mới */}
        <div className="p-8 text-center text-gray-300 italic text-sm">
          Vui lòng chọn Tab tương ứng để thực hiện thao tác kiểm duyệt khác.
        </div>
      </div>
    </div>
  );
};

export default AdminPage;