import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';
import { useNavigate, Link } from 'react-router-dom';
import { Trash2, ShieldCheck, Users, Package, Flag, XCircle, AlertTriangle, ExternalLink, RefreshCw } from 'lucide-react';
import { Product, DBProfile } from '../types';

// Định nghĩa Interface nội bộ để tránh lỗi nếu file types.ts chưa update
interface ReportData {
  id: string;
  reporter_id: string;
  product_id: string;
  reason: string;
  status: 'pending' | 'resolved' | 'dismissed';
  created_at: string;
  // Dữ liệu đã map
  reporter?: DBProfile;
  product?: Product;
}

const AdminPage: React.FC = () => {
  const { isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  
  const [products, setProducts] = useState<Product[]>([]);
  const [usersList, setUsersList] = useState<DBProfile[]>([]);
  const [reports, setReports] = useState<ReportData[]>([]);
  
  const [activeTab, setActiveTab] = useState<'reports' | 'products' | 'users'>('reports');
  const [isLoadingData, setIsLoadingData] = useState(false);

  useEffect(() => {
    if (!loading && !isAdmin) {
      navigate('/'); 
    } else if (isAdmin) {
      fetchData();
    }
  }, [loading, isAdmin, navigate]);

  const fetchData = async () => {
    setIsLoadingData(true);
    try {
        // --- 1. XỬ LÝ BÁO CÁO (REPORTS) - CÁCH AN TOÀN ---
        // Lấy danh sách báo cáo thô
        const { data: rawReports, error: rError } = await supabase
            .from('reports')
            .select('*')
            .order('created_at', { ascending: false });

        if (rError) console.error("Lỗi tải reports:", rError);

        if (rawReports && rawReports.length > 0) {
            // Lấy danh sách ID cần thiết
            const reporterIds = [...new Set(rawReports.map(r => r.reporter_id))];
            const productIds = [...new Set(rawReports.map(r => r.product_id))];

            // Tải thông tin User & Product song song
            const [usersRes, productsRes] = await Promise.all([
                supabase.from('profiles').select('*').in('id', reporterIds),
                supabase.from('products').select('*').in('id', productIds)
            ]);

            const usersMap = new Map(usersRes.data?.map(u => [u.id, u]) || []);
            const productsMap = new Map(productsRes.data?.map(p => [p.id, p]) || []);

            // Ghép dữ liệu (Manual Join)
            const fullReports = rawReports.map(r => ({
                ...r,
                reporter: usersMap.get(r.reporter_id),
                product: productsMap.get(r.product_id) ? {
                    // Map snake_case từ DB sang camelCase của Product interface
                    id: productsMap.get(r.product_id).id,
                    title: productsMap.get(r.product_id).title,
                    price: productsMap.get(r.product_id).price,
                    images: productsMap.get(r.product_id).images || [],
                    isSold: productsMap.get(r.product_id).is_sold
                } : null
            }));
            
            setReports(fullReports as ReportData[]);
        } else {
            setReports([]);
        }

        // --- 2. XỬ LÝ SẢN PHẨM (PRODUCTS) ---
        // Sắp xếp theo posted_at để hiển thị đúng thứ tự đăng
        const { data: prodData } = await supabase
            .from('products')
            .select('*')
            .order('posted_at', { ascending: false });
            
        if (prodData) {
            const mappedProds: Product[] = prodData.map((item: any) => ({
                id: item.id,
                sellerId: item.seller_id,
                title: item.title,
                description: item.description,
                price: item.price,
                category: item.category,
                condition: item.condition,
                images: item.images || [],
                tradeMethod: item.trade_method,
                postedAt: item.posted_at,
                isLookingToBuy: item.is_looking_to_buy,
                isSold: item.is_sold
            }));
            setProducts(mappedProds);
        }

        // --- 3. XỬ LÝ NGƯỜI DÙNG (USERS) ---
        const { data: userData } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
        if (userData) setUsersList(userData as DBProfile[]);

    } catch (err) {
        console.error("Lỗi tổng quát:", err);
    } finally {
        setIsLoadingData(false);
    }
  };

  // --- ACTIONS ---
  const handleResolveReport = async (reportId: string, productId: string) => {
      if(!confirm("Hành động này sẽ XÓA VĨNH VIỄN sản phẩm bị báo cáo. Bạn chắc chứ?")) return;

      // Xóa sản phẩm
      await supabase.from('products').delete().eq('id', productId);
      // Cập nhật report
      await supabase.from('reports').update({ status: 'resolved' }).eq('id', reportId);
      
      alert("Đã xử lý xong!");
      fetchData();
  };

  const handleDismissReport = async (reportId: string) => {
      await supabase.from('reports').update({ status: 'dismissed' }).eq('id', reportId);
      fetchData();
  };

  const handleDeleteProduct = async (id: string) => {
    if (window.confirm('Xóa sản phẩm này vĩnh viễn?')) {
      await supabase.from('products').delete().eq('id', id);
      setProducts(products.filter(p => p.id !== id));
    }
  };

  const handleVerifyUser = async (id: string, currentStatus: boolean) => {
    await supabase.from('profiles').update({ is_verified: !currentStatus }).eq('id', id);
    setUsersList(usersList.map(u => u.id === id ? { ...u, is_verified: !currentStatus } : u));
  };

  if (loading) return <div className="p-20 text-center text-gray-500">Đang kiểm tra quyền Admin...</div>;
  if (!isAdmin) return <div className="p-20 text-center text-red-500 font-bold">Truy cập bị từ chối. Bạn không phải Admin.</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 min-h-screen bg-gray-50">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-sm text-gray-500 mt-1">Hệ thống quản trị UniMarket</p>
          </div>
          <button onClick={fetchData} className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm transition">
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoadingData ? 'animate-spin' : ''}`} /> Làm mới
          </button>
      </div>

      {/* Tabs Menu */}
      <div className="bg-white rounded-xl shadow-sm p-1 mb-6 inline-flex border border-gray-200 overflow-x-auto max-w-full">
        <button 
            onClick={() => setActiveTab('reports')} 
            className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all whitespace-nowrap flex items-center ${activeTab === 'reports' ? 'bg-red-50 text-red-600 shadow-sm ring-1 ring-red-200' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}`}
        >
          <Flag className="w-4 h-4 mr-2" /> 
          Báo cáo 
          {reports.filter(r => r.status === 'pending').length > 0 && (
             <span className="ml-2 bg-red-600 text-white px-2 py-0.5 rounded-full text-xs">
                 {reports.filter(r => r.status === 'pending').length}
             </span>
          )}
        </button>
        <button 
            onClick={() => setActiveTab('products')} 
            className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all whitespace-nowrap flex items-center ${activeTab === 'products' ? 'bg-indigo-50 text-indigo-600 shadow-sm ring-1 ring-indigo-200' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}`}
        >
          <Package className="w-4 h-4 mr-2" /> Sản phẩm <span className="ml-2 text-xs font-normal bg-gray-100 px-2 py-0.5 rounded-full text-gray-600">{products.length}</span>
        </button>
        <button 
            onClick={() => setActiveTab('users')} 
            className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all whitespace-nowrap flex items-center ${activeTab === 'users' ? 'bg-green-50 text-green-600 shadow-sm ring-1 ring-green-200' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}`}
        >
          <Users className="w-4 h-4 mr-2" /> Người dùng <span className="ml-2 text-xs font-normal bg-gray-100 px-2 py-0.5 rounded-full text-gray-600">{usersList.length}</span>
        </button>
      </div>

      {/* --- NỘI DUNG --- */}
      <div className="bg-white shadow-lg rounded-xl border border-gray-200 overflow-hidden min-h-[500px]">
        
        {/* === TAB 1: BÁO CÁO (Đã cải tiến hiển thị) === */}
        {activeTab === 'reports' && (
             <div className="divide-y divide-gray-100">
                {reports.length === 0 ? (
                    <div className="p-20 text-center text-gray-400 flex flex-col items-center">
                        <ShieldCheck className="w-16 h-16 mb-4 text-green-200"/>
                        <p className="text-lg font-medium text-gray-900">Sạch bóng!</p>
                        <p className="text-sm">Hiện không có báo cáo vi phạm nào.</p>
                    </div>
                ) : (
                    reports.map((report) => (
                    <div key={report.id} className={`p-6 transition hover:bg-gray-50 ${report.status !== 'pending' ? 'opacity-60 bg-gray-50' : ''}`}>
                        <div className="flex flex-col md:flex-row gap-6">
                            {/* Ảnh sản phẩm bị report */}
                            <div className="w-24 h-24 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 border border-gray-200 relative group">
                                {report.product?.images?.[0] ? (
                                    <img src={report.product.images[0]} className="w-full h-full object-cover" alt="Spam"/>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-full text-[10px] text-gray-400 p-2 text-center bg-gray-50">
                                        <XCircle className="w-6 h-6 mb-1 opacity-20"/>
                                        Mất ảnh / Đã xóa
                                    </div>
                                )}
                            </div>

                            <div className="flex-1">
                                <div className="flex items-center flex-wrap gap-2 mb-2">
                                    <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold border border-red-200 flex items-center">
                                        <AlertTriangle className="w-3 h-3 mr-1"/> {report.reason}
                                    </span>
                                    <span className={`text-xs font-mono px-2 py-0.5 rounded border uppercase ${report.status === 'pending' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : 'bg-gray-100 text-gray-500'}`}>
                                        {report.status}
                                    </span>
                                    <span className="text-xs text-gray-400 ml-auto">
                                        {new Date(report.created_at).toLocaleString('vi-VN')}
                                    </span>
                                </div>

                                {report.product ? (
                                    <Link to={`/product/${report.product.id}`} target="_blank" className="text-lg font-bold text-gray-900 hover:text-indigo-600 hover:underline flex items-center gap-2 mb-1">
                                        {report.product.title} <ExternalLink className="w-4 h-4 text-gray-400"/>
                                    </Link>
                                ) : <p className="text-gray-400 italic font-medium">Sản phẩm gốc không còn tồn tại.</p>}

                                <div className="text-sm text-gray-500 flex items-center gap-2">
                                    <img src={report.reporter?.avatar_url || 'https://via.placeholder.com/20'} className="w-5 h-5 rounded-full border" />
                                    <span>Báo bởi: <b>{report.reporter?.name || 'Ẩn danh'}</b></span>
                                </div>
                            </div>

                            {/* Actions */}
                            {report.status === 'pending' && report.product && (
                                <div className="flex flex-col gap-2 min-w-[160px] justify-center border-l pl-6 border-gray-100">
                                    <button 
                                        onClick={() => handleResolveReport(report.id, report.product!.id)}
                                        className="w-full py-2 px-4 bg-red-600 hover:bg-red-700 text-white rounded-md text-xs font-bold shadow-sm transition flex items-center justify-center"
                                    >
                                        <Trash2 className="w-3.5 h-3.5 mr-2" /> XÓA BÀI NÀY
                                    </button>
                                    <button 
                                        onClick={() => handleDismissReport(report.id)}
                                        className="w-full py-2 px-4 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-md text-xs font-bold transition flex items-center justify-center"
                                    >
                                        <XCircle className="w-3.5 h-3.5 mr-2" /> BỎ QUA
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                    ))
                )}
             </div>
        )}

        {/* === TAB 2: SẢN PHẨM (Dạng bảng chuyên nghiệp) === */}
        {activeTab === 'products' && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sản phẩm</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Giá & Trạng thái</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ngày đăng</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Hành động</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {products.map((product) => (
                        <tr key={product.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4">
                                <div className="flex items-center">
                                    <div className="h-10 w-10 flex-shrink-0 bg-gray-100 rounded overflow-hidden border border-gray-200">
                                        <img className="h-full w-full object-cover" src={product.images[0] || ''} alt="" />
                                    </div>
                                    <div className="ml-4">
                                        <div className="text-sm font-medium text-gray-900 line-clamp-1 max-w-xs" title={product.title}>{product.title}</div>
                                        <div className="text-xs text-gray-500">{product.category} • {product.condition}</div>
                                    </div>
                                </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900 font-bold">{product.price.toLocaleString()} đ</div>
                                <span className={`px-2 inline-flex text-[10px] leading-5 font-semibold rounded-full ${product.isSold ? 'bg-gray-100 text-gray-500 border border-gray-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>
                                    {product.isSold ? 'Đã bán' : 'Đang bán'}
                                </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500">
                                {new Date(product.postedAt).toLocaleDateString('vi-VN')}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <button onClick={() => handleDeleteProduct(product.id)} className="text-red-600 hover:text-red-900 bg-red-50 p-2 rounded-full hover:bg-red-100 transition" title="Xóa">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
          </div>
        )}

        {/* === TAB 3: NGƯỜI DÙNG === */}
        {activeTab === 'users' && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Người dùng</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">MSSV</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vai trò</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Xác thực</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {usersList.map((usr) => (
                        <tr key={usr.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                    <div className="h-8 w-8 flex-shrink-0">
                                        <img className="h-8 w-8 rounded-full border border-gray-200" src={usr.avatar_url || ''} alt="" />
                                    </div>
                                    <div className="ml-4">
                                        <div className="text-sm font-medium text-gray-900">{usr.name}</div>
                                    </div>
                                </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                                {usr.student_id || '---'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {usr.role === 'admin' 
                                    ? <span className="bg-purple-100 text-purple-800 px-2 py-0.5 rounded text-xs font-bold border border-purple-200">ADMIN</span> 
                                    : <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs border border-gray-200">User</span>
                                }
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <button 
                                    onClick={() => handleVerifyUser(usr.id, usr.is_verified)}
                                    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold transition-colors ${
                                        usr.is_verified 
                                        ? 'bg-green-100 text-green-800 hover:bg-green-200 border border-green-200' 
                                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200 border border-gray-200'
                                    }`}
                                >
                                    <ShieldCheck className={`w-3 h-3 mr-1 ${usr.is_verified ? 'fill-green-800' : ''}`} />
                                    {usr.is_verified ? 'Đã xác thực' : 'Chờ xác thực'}
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
          </div>
        )}

      </div>
    </div>
  );
};

export default AdminPage;