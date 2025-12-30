import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';
import { useNavigate } from 'react-router-dom';
import { Trash2, ShieldCheck, Users, Package } from 'lucide-react';
import { Product, DBProfile } from '../types';

const AdminPage: React.FC = () => {
  const { isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [usersList, setUsersList] = useState<DBProfile[]>([]);
  const [activeTab, setActiveTab] = useState<'products' | 'users'>('products');

  useEffect(() => {
    // Nếu load xong mà không phải admin thì đá về trang chủ
    if (!loading && !isAdmin) {
      navigate('/'); 
    } else if (isAdmin) {
      fetchData();
    }
  }, [loading, isAdmin, navigate]);

  const fetchData = async () => {
    // Lấy danh sách sản phẩm
    const { data: prodData } = await supabase.from('products').select('*').order('created_at', { ascending: false });
    if (prodData) setProducts(prodData as any);

    // Lấy danh sách user
    const { data: userData } = await supabase.from('profiles').select('*');
    if (userData) setUsersList(userData as DBProfile[]);
  };

  const handleDeleteProduct = async (id: string) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa sản phẩm này không?')) {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (!error) {
        setProducts(products.filter(p => p.id !== id));
      } else {
        alert("Lỗi khi xóa sản phẩm: " + error.message);
      }
    }
  };

  const handleVerifyUser = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase.from('profiles').update({ is_verified: !currentStatus }).eq('id', id);
    if (!error) {
      setUsersList(usersList.map(u => u.id === id ? { ...u, is_verified: !currentStatus } : u));
    } else {
        alert("Lỗi khi cập nhật trạng thái: " + error.message);
    }
  };

  if (loading) return <div className="p-10 text-center">Đang kiểm tra quyền truy cập...</div>;
  if (!isAdmin) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Admin Dashboard</h1>

      {/* Tabs chuyển đổi */}
      <div className="flex space-x-4 mb-6">
        <button 
            onClick={() => setActiveTab('products')} 
            className={`flex items-center px-4 py-2 rounded-md transition-colors ${activeTab === 'products' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 border hover:bg-gray-50'}`}
        >
          <Package className="w-5 h-5 mr-2" /> Quản lý Sản phẩm
        </button>
        <button 
            onClick={() => setActiveTab('users')} 
            className={`flex items-center px-4 py-2 rounded-md transition-colors ${activeTab === 'users' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 border hover:bg-gray-50'}`}
        >
          <Users className="w-5 h-5 mr-2" /> Quản lý Người dùng
        </button>
      </div>

      {/* Nội dung danh sách */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg border border-gray-200">
        {activeTab === 'products' ? (
          <ul className="divide-y divide-gray-200">
            {products.length === 0 && <li className="p-4 text-center text-gray-500">Chưa có sản phẩm nào.</li>}
            {products.map((product) => (
              <li key={product.id} className="px-4 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                <div className="flex items-center">
                  <div className="h-10 w-10 bg-gray-200 rounded-md flex-shrink-0 overflow-hidden border border-gray-300">
                     {product.images?.[0] ? <img src={product.images[0]} className="w-full h-full object-cover" alt="product"/> : <span className="flex items-center justify-center h-full text-xs text-gray-400">No img</span>}
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-indigo-600 truncate max-w-xs">{product.title}</p>
                    <p className="text-xs text-gray-500">{Number(product.price).toLocaleString()}đ • {product.category}</p>
                  </div>
                </div>
                <button 
                    onClick={() => handleDeleteProduct(product.id)} 
                    className="text-red-600 hover:text-red-900 p-2 rounded-full hover:bg-red-50"
                    title="Xóa sản phẩm"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <ul className="divide-y divide-gray-200">
             {usersList.length === 0 && <li className="p-4 text-center text-gray-500">Chưa có user nào.</li>}
            {usersList.map((usr) => (
              <li key={usr.id} className="px-4 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                <div className="flex items-center">
                  <img src={usr.avatar_url || 'https://via.placeholder.com/50'} alt="" className="h-10 w-10 rounded-full object-cover mr-3 border border-gray-200" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{usr.name || 'No Name'}</p>
                    <p className="text-xs text-gray-500">{usr.student_id ? `MSSV: ${usr.student_id}` : 'Chưa có MSSV'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                   <span className={`text-xs px-2 py-1 rounded-full border ${usr.role === 'admin' ? 'bg-purple-100 text-purple-800 border-purple-200' : 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                       {usr.role}
                   </span>
                   <button 
                        onClick={() => handleVerifyUser(usr.id, usr.is_verified)} 
                        className={`p-1.5 rounded-full border transition-colors ${usr.is_verified ? 'text-green-600 bg-green-50 border-green-200 hover:bg-green-100' : 'text-gray-400 bg-gray-50 border-gray-200 hover:bg-gray-100'}`}
                        title={usr.is_verified ? "Hủy xác thực" : "Xác thực người dùng này"}
                   >
                        <ShieldCheck className="w-5 h-5" />
                    </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default AdminPage;