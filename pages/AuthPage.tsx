import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { BookOpen, Mail, Lock, User, ArrowRight, Loader } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';

const AuthPage: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    // studentId đã bị xóa khỏi đây, sẽ hỏi sau
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // --- ĐÃ BỎ VALIDATE DUÔI EMAIL ---
    
    if (formData.password.length < 6) {
        addToast("Mật khẩu phải có ít nhất 6 ký tự.", "warning");
        return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        const { error } = await signIn(formData.email, formData.password);
        if (error) throw error;
        addToast("Chào mừng bạn quay trở lại! 🎉", "success");
      } else {
        if (!formData.name) {
            addToast("Vui lòng điền Họ và tên.", "warning");
            setLoading(false);
            return;
        }
        // Lưu ý: Hàm signUp cần sửa lại trong AuthContext để cho phép studentId là null hoặc string rỗng
        // Hoặc bạn truyền tạm string rỗng vào đây
        const { error } = await signUp(formData.email, formData.password, formData.name, ""); 
        if (error) throw error;
        addToast("Đăng ký thành công! Hãy kiểm tra email để xác thực.", "success");
      }
      navigate('/');
    } catch (error: any) {
      console.error(error);
      let msg = error.message;
      if (msg.includes("Invalid login credentials")) msg = "Sai email hoặc mật khẩu.";
      if (msg.includes("User already registered")) msg = "Email này đã được đăng ký.";
      addToast(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="mx-auto h-16 w-16 bg-indigo-600 rounded-2xl flex items-center justify-center rotate-3 shadow-lg mb-4">
             <BookOpen className="h-10 w-10 text-white" />
        </div>
        <h2 className="text-3xl font-extrabold text-gray-900">
          {isLogin ? 'Chào mừng trở lại' : 'Gia nhập UniMarket'}
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          Cộng đồng trao đổi giáo trình & đồ dùng sinh viên
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl shadow-gray-100 sm:rounded-xl sm:px-10 border border-gray-100">
          <form className="space-y-5" onSubmit={handleSubmit}>
            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Họ và tên</label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><User className="h-5 w-5 text-gray-400" /></div>
                  <input type="text" required className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md py-2" placeholder="Nguyễn Văn A" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
                </div>
              </div>
              // --- ĐÃ XÓA Ô NHẬP MSSV TẠI ĐÂY ---
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Mail className="h-5 w-5 text-gray-400" /></div>
                <input type="email" required className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md py-2" placeholder="example@gmail.com" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Mật khẩu</label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Lock className="h-5 w-5 text-gray-400" /></div>
                <input type="password" required className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md py-2" placeholder="••••••••" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} />
              </div>
            </div>

            <div>
              <button 
                type="submit" 
                disabled={loading}
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading ? <Loader className="animate-spin h-5 w-5" /> : (isLogin ? 'Đăng Nhập' : 'Đăng Ký')}
              </button>
            </div>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-300" /></div>
              <div className="relative flex justify-center text-sm"><span className="px-2 bg-white text-gray-500">Hoặc</span></div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-3">
              <button 
                onClick={() => {
                    setFormData({ email: '', password: '', name: '' }); // Reset form
                    setIsLogin(!isLogin);
                }}
                className="w-full flex justify-center items-center py-2.5 px-4 border border-gray-300 rounded-lg shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all group"
              >
                {isLogin ? (
                    <>Tạo tài khoản mới <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" /></>
                ) : (
                    <>Đã có tài khoản? Đăng nhập ngay</>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;