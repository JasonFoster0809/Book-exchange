import React from 'react';
import { useAuth } from '../contexts/AuthContext'; // Import hook
import { ShieldCheck, LogOut, Settings, CreditCard } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ProfilePage: React.FC = () => {
  const { user, signOut } = useAuth(); // Lấy hàm signOut
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate('/'); // Quay về trang chủ sau khi đăng xuất
  };

  if (!user) {
      return (
          <div className="flex flex-col items-center justify-center min-h-[50vh]">
              <p className="text-gray-500 mb-4">Bạn chưa đăng nhập.</p>
              <button 
                onClick={() => navigate('/auth')}
                className="bg-indigo-600 text-white px-4 py-2 rounded-md"
              >
                Đến trang Đăng nhập
              </button>
          </div>
      );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="bg-indigo-600 h-32 w-full"></div>
        <div className="px-6 relative">
           <img 
             src={user.avatar || 'https://via.placeholder.com/150'} 
             alt="Avatar" 
             className="w-24 h-24 rounded-full border-4 border-white absolute -top-12 shadow-md object-cover bg-white"
           />
           <div className="pt-14 pb-6">
             <h1 className="text-2xl font-bold text-gray-900 flex items-center">
               {user.name}
               {user.isVerified && <ShieldCheck className="w-6 h-6 text-blue-500 ml-2" />}
             </h1>
             <p className="text-gray-500 text-sm">MSSV: {user.studentId || 'Chưa cập nhật'}</p>
             <p className="text-gray-500 text-sm">Email: {user.email}</p>
           </div>
        </div>
        
        <div className="border-t border-gray-200">
           <dl>
             {/* Các phần khác giữ nguyên */}
             
             {/* Nút Đăng xuất */}
             <div 
               onClick={handleLogout} 
               className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6 hover:bg-red-50 cursor-pointer transition border-t border-gray-100"
             >
               <dt className="text-sm font-medium text-red-500 flex items-center">
                 <LogOut className="w-5 h-5 mr-2" /> Đăng xuất
               </dt>
               <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                 Thoát khỏi tài khoản hiện tại
               </dd>
             </div>
           </dl>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;