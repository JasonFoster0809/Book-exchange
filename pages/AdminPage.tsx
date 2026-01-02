import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Trash2, ShieldCheck, Users, Package, Flag, XCircle, AlertTriangle, 
  ExternalLink, RefreshCw, Check, X, Clock, BarChart3, Search, Ban, Lock, Unlock, 
  TrendingUp, Download, PieChart, DollarSign, Activity
} from 'lucide-react';
import { Product, DBProfile } from '../types';

// --- INTERFACES MỞ RỘNG CHO ADMIN ---

// [FIX] Mở rộng DBProfile để thêm trường banned (nếu DB có) mà không cần sửa file types.ts gốc
interface AdminUserProfile extends DBProfile {
  banned?: boolean; 
}

interface ReportData {
  id: string; reporter_id: string; product_id: string; reason: string; status: 'pending' | 'resolved' | 'dismissed'; created_at: string;
  reporter?: DBProfile; product?: Product;
}

interface VerificationRequest {
  id: string; user_id: string; image_url: string; status: 'pending' | 'approved' | 'rejected'; created_at: string;
  profiles: { name: string; email: string; student_id: string; avatar_url: string; };
}

interface ChartData { date: string; count: number; fullDate: string; }

const AdminPage: React.FC = () => {
  // [FIX] Lấy user từ useAuth thay vì isAdmin (vì useAuth thường không trả về isAdmin trực tiếp)
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  
  // [FIX] Tự tính toán isAdmin dựa trên role của user
  const isAdmin = user?.role === 'admin' || user?.user_metadata?.role === 'admin';

  // --- STATES ---
  const [products, setProducts] = useState<Product[]>([]);
  const [usersList, setUsersList] = useState<AdminUserProfile[]>([]);
  const [reports, setReports] = useState<ReportData[]>([]);
  const [verifications, setVerifications] = useState<VerificationRequest[]>([]);
  const [weeklyStats, setWeeklyStats] = useState<ChartData[]>([]);
  
  const [activeTab, setActiveTab] = useState<'dashboard' | 'reports' | 'products' | 'users' | 'verifications'>('dashboard');
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // --- DERIVED STATS (Tính toán số liệu) ---
  const totalRevenue = useMemo(() => {
      // Tính tổng giá trị các món ĐÃ BÁN (status = 'sold')
      return products.filter(p => p.status === 'sold').reduce((sum, p) => sum + p.price, 0);
  }, [products]);

  const categoryStats = useMemo(() => {
      const stats: Record<string, number> = {};
      products.forEach(p => {
          // Ép kiểu string để tránh lỗi nếu category là Enum
          const catName = String(p.category);
          stats[catName] = (stats[catName] || 0) + 1;
      });
      return Object.entries(stats).sort((a, b) => b[1] - a[1]);
  }, [products]);

  // --- EFFECT ---
  useEffect(() => {
    if (loading) return;
    // Nếu không phải admin thì đá về trang chủ
    if (!user || !isAdmin) { 
        navigate('/'); 
    } else { 
        fetchData(); 
    }
  }, [loading, user, isAdmin, navigate]);

  // --- FETCH DATA ---
  const fetchData = async () => {
    setIsLoadingData(true);
    try {
        // 1. REPORTS
        const { data: rawReports } = await supabase.from('reports').select('*').order('created_at', { ascending: false });
        if (rawReports && rawReports.length > 0) {
            const reporterIds = [...new Set(rawReports.map(r => r.reporter_id))];
            const productIds = [...new Set(rawReports.map(r => r.product_id))];
            
            const [usersRes, productsRes] = await Promise.all([
                supabase.from('profiles').select('*').in('id', reporterIds),
                supabase.from('products').select('*').in('id', productIds)
            ]);
            
            const usersMap = new Map(usersRes.data?.map(u => [u.id, u]) || []);
            const productsMap = new Map(productsRes.data?.map(p => [p.id, p]) || []);
            
            const fullReports = rawReports.map(r => {
                const rawProduct = productsMap.get(r.product_id);
                // Map dữ liệu product từ DB sang chuẩn Product interface
                let mappedProduct: Product | undefined = undefined;
                if (rawProduct) {
                    mappedProduct = {
                        ...rawProduct,
                        sellerId: rawProduct.seller_id,
                        tradeMethod: rawProduct.trade_method,
                        postedAt: rawProduct.posted_at,
                        isLookingToBuy: rawProduct.is_looking_to_buy,
                        // Fix lỗi: status có thể khác biệt giữa DB và Type
                        status: rawProduct.status,
                        images: rawProduct.images || []
                    } as Product;
                }

                return { 
                    ...r, 
                    reporter: usersMap.get(r.reporter_id), 
                    product: mappedProduct 
                };
            });
            setReports(fullReports as ReportData[]);
        } else { setReports([]); }

        // 2. PRODUCTS & CHART
        const { data: prodData } = await supabase.from('products').select('*').order('posted_at', { ascending: false });
        if (prodData) {
            const mappedProds: Product[] = prodData.map((item: any) => ({
                ...item, 
                sellerId: item.seller_id, 
                tradeMethod: item.trade_method, 
                postedAt: item.posted_at, 
                isLookingToBuy: item.is_looking_to_buy, 
                status: item.status,
                images: item.images || []
            }));
            setProducts(mappedProds);

            // Calculate Weekly Stats
            const stats: ChartData[] = [];
            const today = new Date();
            for (let i = 6; i >= 0; i--) {
                const d = new Date(); d.setDate(today.getDate() - i);
                const start = new Date(d.setHours(0, 0, 0, 0));
                const end = new Date(d.setHours(23, 59, 59, 999));
                const count = prodData.filter((p: any) => { const pDate = new Date(p.posted_at); return pDate >= start && pDate <= end; }).length;
                stats.push({ date: start.toLocaleDateString('vi-VN', { weekday: 'short' }), fullDate: start.toLocaleDateString('vi-VN', { day: 'numeric', month: 'numeric' }), count });
            }
            setWeeklyStats(stats);
        }

        // 3. USERS & VERIFICATIONS
        const { data: userData } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
        if (userData) setUsersList(userData as AdminUserProfile[]);

        // Fix query verification: Dùng cú pháp chuẩn của Supabase join
        const { data: verifyData } = await supabase
            .from('verification_requests')
            .select(`
                *,
                profiles:user_id (name, email, student_id, avatar_url)
            `)
            .eq('status', 'pending')
            .order('created_at', { ascending: false });
            
        if (verifyData) {
             // Ép kiểu an toàn
             const mappedVerify = verifyData.map((v: any) => ({
                 ...v,
                 profiles: Array.isArray(v.profiles) ? v.profiles[0] : v.profiles
             }));
             setVerifications(mappedVerify as VerificationRequest[]);
        }

    } catch (err) { console.error("Error:", err); } finally { setIsLoadingData(false); }
  };

  // --- EXPORT FUNCTION ---
  const exportToCSV = (data: any[], filename: string) => {
      if (!data.length) return alert("Không có dữ liệu để xuất!");
      // Loại bỏ các field object phức tạp trước khi xuất để tránh lỗi [object Object]
      const cleanData = data.map(item => {
          const newItem: any = {};
          Object.keys(item).forEach(key => {
              if (typeof item[key] !== 'object' || item[key] === null) {
                  newItem[key] = item[key];
              }
          });
          return newItem;
      });

      const headers = Object.keys(cleanData[0]).join(',');
      const rows = cleanData.map(row => Object.values(row).map(value => `"${value}"`).join(',')).join('\n');
      
      const blob = new Blob([`\uFEFF${headers}\n${rows}`], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${filename}_${new Date().toISOString().slice(0,10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  // --- ACTIONS HANDLERS ---
  const handleResolveReport = async (reportId: string, productId: string) => {
      if(!confirm("XÓA VĨNH VIỄN sản phẩm này?")) return;
      await supabase.from('products').delete().eq('id', productId);
      await supabase.from('reports').update({ status: 'resolved' }).eq('id', reportId);
      fetchData();
  };
  const handleDismissReport = async (reportId: string) => {
      await supabase.from('reports').update({ status: 'dismissed' }).eq('id', reportId);
      fetchData();
  };
  const handleDeleteProduct = async (id: string) => {
    if (window.confirm('Xóa vĩnh viễn?')) {
      await supabase.from('products').delete().eq('id', id);
      setProducts(products.filter(p => p.id !== id));
    }
  };
  const handleVerifyAction = async (req: VerificationRequest, action: 'approved' | 'rejected') => {
      const { error } = await supabase.from('verification_requests').update({ status: action }).eq('id', req.id);
      if (error) return alert(error.message);
      if (action === 'approved') {
          await supabase.from('profiles').update({ is_verified: true }).eq('id', req.user_id);
          setUsersList(prev => prev.map(u => u.id === req.user_id ? { ...u, is_verified: true } : u));
      }
      setVerifications(prev => prev.filter(item => item.id !== req.id));
  };
  const handleToggleBan = async (userId: string, currentStatus: boolean) => {
      if (!confirm(`Xác nhận ${currentStatus ? "MỞ KHÓA" : "KHÓA"} tài khoản này?`)) return;
      // Lưu ý: Cần đảm bảo cột 'banned' tồn tại trong bảng profiles trên Supabase
      const { error } = await supabase.from('profiles').update({ banned: !currentStatus }).eq('id', userId);
      if (!error) setUsersList(prev => prev.map(u => u.id === userId ? { ...u, banned: !currentStatus } : u));
      else alert("Lỗi: " + error.message);
  };

  const maxChartValue = Math.max(...weeklyStats.map(s => s.count), 1);
  const filteredProducts = products.filter(p => p.title.toLowerCase().includes(searchTerm.toLowerCase()));

  if (loading) return <div className="p-20 text-center text-gray-500">Đang tải...</div>;
  if (!isAdmin) return <div className="p-20 text-center text-red-500 font-bold">Không có quyền truy cập</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 min-h-screen bg-gray-50 font-sans">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-black text-gray-900 flex items-center text-[#034EA2]">
                <ShieldCheck className="w-8 h-8 mr-3"/> BK ADMIN <span className="ml-3 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">v2.0</span>
            </h1>
            <p className="text-sm text-gray-500 mt-1 ml-11">Trung tâm kiểm soát hệ thống & Phân tích dữ liệu</p>
          </div>
          <div className="flex gap-3">
              <button onClick={() => window.open('/', '_blank')} className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-bold text-gray-700 hover:bg-gray-50 shadow-sm transition">
                  <ExternalLink className="w-4 h-4 mr-2" /> Xem trang chủ
              </button>
              <button onClick={fetchData} className="flex items-center px-4 py-2 bg-[#034EA2] text-white rounded-lg text-sm font-bold hover:bg-[#003875] shadow-md transition active:scale-95">
                  <RefreshCw className={`w-4 h-4 mr-2 ${isLoadingData ? 'animate-spin' : ''}`} /> Cập nhật
              </button>
          </div>
      </div>

      {/* TABS */}
      <div className="bg-white rounded-xl shadow-sm p-1.5 mb-6 inline-flex border border-gray-200 overflow-x-auto max-w-full gap-1">
        {[
            { id: 'dashboard', label: 'Tổng quan', icon: BarChart3, count: 0, color: 'text-gray-600' },
            { id: 'reports', label: 'Báo cáo', icon: Flag, count: reports.filter(r => r.status === 'pending').length, color: 'text-red-600' },
            { id: 'verifications', label: 'Duyệt SV', icon: ShieldCheck, count: verifications.length, color: 'text-blue-600' },
            { id: 'products', label: 'Sản phẩm', icon: Package, count: products.length, color: 'text-indigo-600' },
            { id: 'users', label: 'Người dùng', icon: Users, count: usersList.length, color: 'text-green-600' },
        ].map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all whitespace-nowrap flex items-center ${activeTab === tab.id ? 'bg-gray-100 text-gray-900 shadow-inner' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}`}>
                <tab.icon className={`w-4 h-4 mr-2 ${activeTab === tab.id ? tab.color : ''}`} /> {tab.label}
                {tab.count > 0 && tab.id !== 'dashboard' && <span className={`ml-2 px-2 py-0.5 rounded-full text-[10px] ${activeTab === tab.id ? 'bg-white shadow-sm' : 'bg-gray-100'}`}>{tab.count}</span>}
            </button>
        ))}
      </div>

      <div className="bg-white shadow-xl rounded-2xl border border-gray-200 overflow-hidden min-h-[600px]">
        
        {/* --- TAB 0: DASHBOARD --- */}
        {activeTab === 'dashboard' && (
            <div className="p-8">
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white p-6 rounded-2xl border border-blue-100 shadow-sm relative overflow-hidden group">
                        <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition"><Users size={64} className="text-blue-600"/></div>
                        <p className="text-gray-500 text-xs font-bold uppercase mb-1">Tổng thành viên</p>
                        <p className="text-4xl font-black text-gray-900">{usersList.length}</p>
                    </div>
                    <div className="bg-white p-6 rounded-2xl border border-purple-100 shadow-sm relative overflow-hidden group">
                        <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition"><Package size={64} className="text-purple-600"/></div>
                        <p className="text-gray-500 text-xs font-bold uppercase mb-1">Tổng tin đăng</p>
                        <p className="text-4xl font-black text-gray-900">{products.length}</p>
                        <p className="text-xs text-purple-600 mt-2 flex items-center font-bold">{products.filter(p => p.status === 'available').length} đang hiển thị</p>
                    </div>
                    <div className="bg-white p-6 rounded-2xl border border-orange-100 shadow-sm relative overflow-hidden group">
                        <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition"><DollarSign size={64} className="text-orange-600"/></div>
                        <p className="text-gray-500 text-xs font-bold uppercase mb-1">GMV (Tổng giao dịch)</p>
                        <p className="text-3xl font-black text-gray-900">{totalRevenue.toLocaleString()} <span className="text-sm text-gray-400">VNĐ</span></p>
                        <p className="text-xs text-orange-600 mt-2 flex items-center font-bold">Từ {products.filter(p => p.status === 'sold').length} đơn đã bán</p>
                    </div>
                    <div className="bg-gradient-to-br from-red-500 to-red-600 p-6 rounded-2xl text-white shadow-lg shadow-red-100 relative overflow-hidden">
                        <div className="absolute right-0 top-0 p-4 opacity-20"><Activity size={64}/></div>
                        <p className="text-red-100 text-xs font-bold uppercase mb-1">Cần xử lý gấp</p>
                        <p className="text-4xl font-black">{reports.filter(r => r.status === 'pending').length + verifications.length}</p>
                        <p className="text-xs text-red-100 mt-2 opacity-80">Báo cáo & Xác thực</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Chart: Activity */}
                    <div className="lg:col-span-2">
                        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center"><BarChart3 className="w-5 h-5 mr-2 text-[#034EA2]"/> Xu hướng tin đăng mới</h3>
                        <div className="h-72 flex items-end justify-between gap-3 p-6 border border-gray-100 rounded-2xl bg-gray-50/50 relative">
                            <div className="absolute inset-0 flex flex-col justify-between p-6 pointer-events-none opacity-10">
                                <div className="border-t border-gray-400 w-full"></div><div className="border-t border-gray-400 w-full"></div><div className="border-t border-gray-400 w-full"></div><div className="border-t border-gray-400 w-full"></div>
                            </div>
                            {weeklyStats.map((stat, i) => (
                                <div key={i} className="flex-1 flex flex-col items-center group relative z-10 h-full justify-end">
                                    <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-all bg-gray-800 text-white text-xs py-1 px-3 rounded-lg shadow-lg mb-2 font-bold z-20">
                                        {stat.fullDate}: {stat.count} tin
                                    </div>
                                    <div className={`w-full max-w-[50px] rounded-t-lg transition-all duration-500 ease-out relative ${i===6 ? 'bg-[#034EA2]' : 'bg-blue-200 hover:bg-blue-300'}`} style={{ height: `${Math.max((stat.count / maxChartValue) * 100, 2)}%` }}></div>
                                    <div className="mt-3 text-xs font-bold text-gray-400">{i===6 ? 'Hôm nay' : stat.date}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Chart: Categories */}
                    <div>
                        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center"><PieChart className="w-5 h-5 mr-2 text-purple-600"/> Phân bố danh mục</h3>
                        <div className="bg-white border border-gray-100 rounded-2xl p-6 h-72 overflow-y-auto custom-scrollbar">
                            <div className="space-y-4">
                                {categoryStats.map(([cat, count], idx) => (
                                    <div key={idx}>
                                        <div className="flex justify-between text-xs font-bold mb-1">
                                            <span className="text-gray-700">{cat || 'Khác'}</span>
                                            <span className="text-gray-500">{count} ({Math.round(count/products.length*100)}%)</span>
                                        </div>
                                        <div className="w-full bg-gray-100 rounded-full h-2">
                                            <div className="bg-indigo-500 h-2 rounded-full" style={{ width: `${(count/products.length)*100}%`, opacity: 1 - (idx * 0.1) }}></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* --- TAB 1: REPORTS --- */}
        {activeTab === 'reports' && (
              <div className="divide-y divide-gray-100">
                 {reports.length === 0 ? (
                     <div className="p-20 text-center text-gray-400 flex flex-col items-center"><ShieldCheck className="w-16 h-16 mb-4 text-green-200"/><p>Không có báo cáo nào.</p></div>
                 ) : (
                   reports.map((report) => (
                   <div key={report.id} className={`p-6 transition hover:bg-gray-50 ${report.status !== 'pending' ? 'opacity-60 bg-gray-50' : ''}`}>
                       <div className="flex flex-col md:flex-row gap-6">
                           <div className="w-24 h-24 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 border border-gray-200 relative">
                               {report.product?.images?.[0] ? <img src={report.product.images[0]} className="w-full h-full object-cover" /> : <div className="flex flex-col items-center justify-center h-full text-[10px] text-gray-400 p-2 text-center bg-gray-50"><XCircle className="w-6 h-6 mb-1 opacity-20"/>Mất ảnh</div>}
                           </div>
                           <div className="flex-1">
                               <div className="flex items-center flex-wrap gap-2 mb-2">
                                   <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold border border-red-200 flex items-center"><AlertTriangle className="w-3 h-3 mr-1"/> {report.reason}</span>
                                   <span className={`text-xs font-mono px-2 py-0.5 rounded border uppercase ${report.status === 'pending' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : 'bg-gray-100 text-gray-500'}`}>{report.status}</span>
                                   <span className="text-xs text-gray-400 ml-auto">{new Date(report.created_at).toLocaleString('vi-VN')}</span>
                               </div>
                               {report.product ? (
                                   <Link to={`/product/${report.product.id}`} target="_blank" className="text-lg font-bold text-gray-900 hover:text-indigo-600 hover:underline flex items-center gap-2 mb-1">{report.product.title} <ExternalLink className="w-4 h-4 text-gray-400"/></Link>
                               ) : <p className="text-gray-400 italic font-medium">Sản phẩm gốc không còn tồn tại.</p>}
                               <div className="text-sm text-gray-500">Báo bởi: <b>{report.reporter?.name || 'Ẩn danh'}</b></div>
                           </div>
                           {report.status === 'pending' && report.product && (
                               <div className="flex flex-col gap-2 min-w-[160px] justify-center border-l pl-6 border-gray-100">
                                   <button onClick={() => handleResolveReport(report.id, report.product!.id)} className="w-full py-2 px-4 bg-red-600 hover:bg-red-700 text-white rounded-md text-xs font-bold shadow-sm transition flex items-center justify-center"><Trash2 className="w-3.5 h-3.5 mr-2" /> XÓA BÀI NÀY</button>
                                   <button onClick={() => handleDismissReport(report.id)} className="w-full py-2 px-4 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-md text-xs font-bold transition flex items-center justify-center"><XCircle className="w-3.5 h-3.5 mr-2" /> BỎ QUA</button>
                               </div>
                           )}
                       </div>
                   </div>
                   ))
                 )}
             </div>
        )}

        {/* --- TAB 2: VERIFICATIONS --- */}
        {activeTab === 'verifications' && (
             <div className="divide-y divide-gray-100">
                 {verifications.length === 0 ? (
                     <div className="p-20 text-center text-gray-400 flex flex-col items-center"><ShieldCheck className="w-16 h-16 mb-4 text-blue-200"/><p>Không có yêu cầu xác thực mới.</p></div>
                 ) : (
                     verifications.map((req) => (
                        <div key={req.id} className="p-6 transition hover:bg-gray-50 flex flex-col lg:flex-row gap-6">
                            <div className="w-full lg:w-1/3">
                                <p className="text-xs font-bold text-gray-500 mb-2 uppercase">Ảnh thẻ sinh viên</p>
                                <div className="rounded-lg overflow-hidden border border-gray-200 bg-black shadow-sm group">
                                    <img src={req.image_url} className="w-full h-auto object-contain max-h-[300px] transition-transform group-hover:scale-105" />
                                </div>
                            </div>
                            <div className="flex-1 flex flex-col justify-between">
                                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 mb-4">
                                    <div className="flex items-center gap-3 mb-3">
                                        <img src={req.profiles.avatar_url || 'https://via.placeholder.com/40'} className="w-10 h-10 rounded-full border border-blue-200" />
                                        <div><p className="font-bold text-gray-900">{req.profiles.name}</p><p className="text-xs text-blue-600">{req.profiles.email}</p></div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div><p className="text-gray-500 text-xs">MSSV đăng ký:</p><p className="font-mono font-bold text-lg text-gray-800">{req.profiles.student_id || 'Chưa nhập'}</p></div>
                                        <div><p className="text-gray-500 text-xs">Ngày gửi:</p><p className="font-medium text-gray-700 flex items-center"><Clock className="w-3 h-3 mr-1"/> {new Date(req.created_at).toLocaleString('vi-VN')}</p></div>
                                    </div>
                                </div>
                                <div className="flex gap-3 mt-auto pt-2">
                                    <button onClick={() => handleVerifyAction(req, 'approved')} className="flex-1 py-3 px-4 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold shadow-sm transition flex items-center justify-center"><Check className="w-5 h-5 mr-2" /> Duyệt</button>
                                    <button onClick={() => handleVerifyAction(req, 'rejected')} className="flex-1 py-3 px-4 bg-white border border-red-200 text-red-600 hover:bg-red-50 rounded-lg font-bold transition flex items-center justify-center"><X className="w-5 h-5 mr-2" /> Từ chối</button>
                                </div>
                            </div>
                        </div>
                     ))
                 )}
             </div>
        )}

        {/* --- TAB 3: PRODUCTS --- */}
        {activeTab === 'products' && (
          <div>
            <div className="p-4 border-b border-gray-100 bg-gray-50 flex gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4"/>
                    <input type="text" placeholder="Tìm kiếm sản phẩm..." className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none text-sm" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                </div>
                <button onClick={() => exportToCSV(products, 'Products_Export')} className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-bold hover:bg-green-700 transition">
                    <Download className="w-4 h-4 mr-2"/> Xuất Excel
                </button>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50"><tr><th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Sản phẩm</th><th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Giá & Status</th><th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Ngày đăng</th><th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase">Hành động</th></tr></thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                      {filteredProducts.map((product) => (
                          <tr key={product.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4"><div className="flex items-center"><div className="h-10 w-10 flex-shrink-0 bg-gray-100 rounded overflow-hidden border border-gray-200"><img className="h-full w-full object-cover" src={product.images[0] || ''} /></div><div className="ml-4"><div className="text-sm font-medium text-gray-900 line-clamp-1 max-w-xs">{product.title}</div><div className="text-xs text-gray-500">{product.category}</div></div></div></td>
                              <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm text-gray-900 font-bold">{product.price.toLocaleString()} đ</div><span className={`px-2 text-[10px] font-semibold rounded-full ${product.status === 'sold' ? 'bg-gray-100 text-gray-500' : 'bg-green-50 text-green-700'}`}>{product.status === 'sold' ? 'Đã bán' : 'Đang bán'}</span></td>
                              <td className="px-6 py-4 text-xs text-gray-500">{new Date(product.postedAt).toLocaleDateString('vi-VN')}</td>
                              <td className="px-6 py-4 text-right"><button onClick={() => handleDeleteProduct(product.id)} className="text-red-600 hover:text-red-900 bg-red-50 p-2 rounded-full hover:bg-red-100 transition"><Trash2 className="w-4 h-4" /></button></td>
                          </tr>
                      ))}
                  </tbody>
              </table>
            </div>
          </div>
        )}

        {/* --- TAB 4: USERS --- */}
        {activeTab === 'users' && (
          <div>
            <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-end">
                <button onClick={() => exportToCSV(usersList, 'Users_Export')} className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-bold hover:bg-green-700 transition">
                    <Download className="w-4 h-4 mr-2"/> Xuất Excel
                </button>
            </div>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50"><tr><th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">User</th><th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">MSSV</th><th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Role</th><th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase">Trạng thái</th></tr></thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {usersList.map((usr) => (
                            <tr key={usr.id} className={`hover:bg-gray-50 ${usr.banned ? 'bg-red-50' : ''}`}>
                                <td className="px-6 py-4"><div className="flex items-center"><img className="h-8 w-8 rounded-full border" src={usr.avatar_url || 'https://via.placeholder.com/30'}/><div className="ml-4"><div className="text-sm font-medium text-gray-900">{usr.name}</div><div className="text-xs text-gray-500">{usr.email}</div></div></div></td>
                                <td className="px-6 py-4 text-sm font-mono">{usr.student_id || '---'}</td>
                                <td className="px-6 py-4 text-sm">{usr.role === 'admin' ? <span className="bg-purple-100 text-purple-800 px-2 py-0.5 rounded text-xs font-bold">ADMIN</span> : 'User'}</td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${usr.is_verified ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{usr.is_verified ? 'Verified' : 'Unverified'}</span>
                                        {usr.role !== 'admin' && (
                                            <button onClick={() => handleToggleBan(usr.id, usr.banned || false)} className={`px-3 py-1 rounded-full text-xs font-bold flex items-center transition ${usr.banned ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-red-100 text-red-600 hover:bg-red-200'}`}>
                                                {usr.banned ? <><Unlock className="w-3 h-3 mr-1"/> Mở</> : <><Ban className="w-3 h-3 mr-1"/> Khóa</>}
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPage;