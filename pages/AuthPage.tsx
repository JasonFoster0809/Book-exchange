import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Mail, Lock, User, ArrowRight, Loader2, 
  Chrome, CheckCircle, ArrowLeft, Star 
} from "lucide-react";
import { supabase } from "../services/supabase";
import { useToast } from "../contexts/ToastContext";

// ============================================================================
// 1. VISUAL ENGINE (CSS STYLES)
// ============================================================================
const VisualEngine = () => (
  <style>{`
    :root { --primary: #00418E; }
    body { background-color: #F8FAFC; margin: 0; font-family: 'Inter', sans-serif; }
    
    .auth-container { min-height: 100vh; display: flex; overflow: hidden; }
    
    /* LEFT SIDE (ARTWORK) */
    .auth-art {
      flex: 1.2; 
      background: linear-gradient(135deg, #00418E 0%, #002147 100%);
      position: relative; 
      overflow: hidden; 
      display: none; 
      flex-direction: column;
      justify-content: center; 
      padding: 4rem; 
      color: white;
    }
    .auth-art::before {
      content: ''; position: absolute; top: -20%; right: -20%; width: 600px; height: 600px;
      background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 60%);
      border-radius: 50%;
    }
    .auth-art::after {
      content: ''; position: absolute; bottom: -10%; left: -10%; width: 400px; height: 400px;
      background: radial-gradient(circle, rgba(0, 229, 255, 0.15) 0%, transparent 60%);
      border-radius: 50%;
    }
    @media (min-width: 1024px) { .auth-art { display: flex; } }

    /* RIGHT SIDE (FORM) */
    .auth-form-wrapper {
      flex: 1; display: flex; align-items: center; justify-content: center;
      background: white; padding: 2rem; position: relative;
    }
    
    .input-group { position: relative; margin-bottom: 1.25rem; transition: all 0.2s; }
    
    .input-icon {
      position: absolute; left: 16px; top: 50%; transform: translateY(-50%);
      color: #94a3b8; transition: color 0.2s; pointer-events: none;
    }
    
    .custom-input {
      width: 100%; padding: 14px 16px 14px 48px;
      border: 1px solid #e2e8f0; border-radius: 12px;
      font-size: 15px; outline: none; transition: all 0.2s;
      background: #f8fafc; color: #1e293b;
    }
    .custom-input:focus {
      border-color: #00418E; background: white;
      box-shadow: 0 0 0 4px rgba(0, 65, 142, 0.1);
    }
    .custom-input:focus ~ .input-icon { color: #00418E; }

    .btn-primary {
      width: 100%; padding: 14px; border-radius: 12px;
      background: #00418E; color: white; font-weight: 700;
      display: flex; align-items: center; justify-content: center; gap: 8px;
      transition: all 0.2s; box-shadow: 0 4px 6px -1px rgba(0, 65, 142, 0.2);
      border: none; cursor: pointer;
    }
    .btn-primary:hover { background: #00306b; transform: translateY(-1px); }
    .btn-primary:active { transform: translateY(0); }
    .btn-primary:disabled { opacity: 0.7; cursor: not-allowed; }

    .social-btn {
      flex: 1; padding: 12px; border-radius: 12px;
      border: 1px solid #e2e8f0; background: white;
      font-weight: 600; color: #475569; display: flex; align-items: center; justify-content: center; gap: 8px;
      transition: all 0.2s; cursor: pointer;
    }
    .social-btn:hover { background: #f8fafc; border-color: #cbd5e1; }

    .glass-card {
      background: rgba(255,255,255,0.1); backdrop-filter: blur(10px);
      border: 1px solid rgba(255,255,255,0.2); border-radius: 16px; padding: 20px;
    }

    .animate-fade-in { animation: fadeIn 0.4s ease-out; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
  `}</style>
);

// ============================================================================
// 2. MAIN COMPONENT
// ============================================================================
const AuthPage = () => {
  const navigate = useNavigate();
  const { addToast } = useToast();
  
  // State quản lý chế độ hiển thị và dữ liệu form
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>('login');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ name: "", email: "", password: "" });

  // --- XỬ LÝ LOGIC ---
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. ĐĂNG NHẬP
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });
        if (error) throw error;
        addToast("Chào mừng trở lại!", "success");
        navigate('/');
      } 
      
      // 2. ĐĂNG KÝ
      else if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: { full_name: formData.name }
          }
        });
        if (error) throw error;
        
        // Tạo profile ngay lập tức để tránh lỗi dữ liệu
        if (data.user) {
          const { error: profileError } = await supabase.from('profiles').insert({
            id: data.user.id,
            email: formData.email,
            name: formData.name,
            role: 'user'
          });
          // Nếu profile đã tồn tại (lỗi duplicate), bỏ qua lỗi này
          if (profileError && profileError.code !== '23505') {
             console.error("Lỗi tạo profile:", profileError);
          }
        }
        
        addToast("Đăng ký thành công! Vui lòng kiểm tra email xác nhận.", "success");
        setMode('login');
      }
      
      // 3. QUÊN MẬT KHẨU
      else if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(formData.email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        addToast("Đã gửi link khôi phục vào email của bạn!", "success");
        setMode('login');
      }
    } catch (err: any) {
      addToast(err.message || "Có lỗi xảy ra, vui lòng thử lại", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          queryParams: { access_type: 'offline', prompt: 'consent' },
          redirectTo: window.location.origin
        }
      });
      if (error) throw error;
    } catch (error: any) {
      addToast("Lỗi đăng nhập Google: " + error.message, "error");
    }
  };

  return (
    <div className="auth-container">
      <VisualEngine />

      {/* --- PHẦN TRÁI (ARTWORK & GIỚI THIỆU) --- */}
      <div className="auth-art">
        <div className="relative z-10 max-w-xl">
          <div className="mb-8 inline-flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full backdrop-blur-md border border-white/20">
            <CheckCircle size={16} className="text-[#4ade80]"/> 
            <span className="text-sm font-bold tracking-wide">Cộng đồng Sinh viên Bách Khoa</span>
          </div>
          
          <h1 className="text-6xl font-black mb-6 leading-tight tracking-tight">
            Trao đổi giáo trình <br/> 
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-200 to-cyan-200">
              Kết nối đam mê.
            </span>
          </h1>
          
          <p className="text-blue-100 text-lg leading-relaxed mb-10 opacity-90 max-w-lg">
            Nền tảng mua bán, trao đổi đồ dùng học tập độc quyền dành riêng cho sinh viên. 
            Tiết kiệm chi phí, giao dịch an toàn ngay tại trường.
          </p>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="glass-card">
              <div className="flex items-center gap-2 mb-2">
                <Star className="text-yellow-400 fill-yellow-400" size={20}/>
                <h3 className="font-bold text-2xl">5.000+</h3>
              </div>
              <p className="text-sm text-blue-200 font-medium">Sinh viên tin dùng</p>
            </div>
            <div className="glass-card">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="text-green-400" size={20}/>
                <h3 className="font-bold text-2xl">12.000+</h3>
              </div>
              <p className="text-sm text-blue-200 font-medium">Giao dịch thành công</p>
            </div>
          </div>
        </div>
      </div>

      {/* --- PHẦN PHẢI (FORM ĐĂNG NHẬP) --- */}
      <div className="auth-form-wrapper">
        <button 
          onClick={() => navigate('/')} 
          className="absolute top-6 left-6 p-2 rounded-full hover:bg-slate-100 text-slate-500 transition-colors"
          title="Về trang chủ"
        >
          <ArrowLeft size={24}/>
        </button>

        <div className="w-full max-w-md animate-fade-in">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-black text-slate-900 mb-2">
              {mode === 'login' ? 'Chào mừng trở lại!' : mode === 'signup' ? 'Tạo tài khoản mới' : 'Khôi phục mật khẩu'}
            </h2>
            <p className="text-slate-500">
              {mode === 'login' 
                ? 'Nhập thông tin để tiếp tục truy cập.' 
                : mode === 'signup' 
                  ? 'Tham gia cộng đồng sinh viên ngay hôm nay.' 
                  : 'Nhập email để nhận hướng dẫn lấy lại mật khẩu.'}
            </p>
          </div>

          <form onSubmit={handleAuth}>
            {mode === 'signup' && (
              <div className="input-group">
                <input 
                  type="text" 
                  placeholder="Họ và tên của bạn" 
                  className="custom-input" 
                  required
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})}
                />
                <User className="input-icon" size={20}/>
              </div>
            )}

            <div className="input-group">
              <input 
                type="email" 
                placeholder="Địa chỉ Email (ưu tiên email SV)" 
                className="custom-input" 
                required
                value={formData.email} 
                onChange={e => setFormData({...formData, email: e.target.value})}
              />
              <Mail className="input-icon" size={20}/>
            </div>

            {mode !== 'forgot' && (
              <div className="input-group">
                <input 
                  type="password" 
                  placeholder="Mật khẩu (tối thiểu 6 ký tự)" 
                  className="custom-input" 
                  required 
                  minLength={6}
                  value={formData.password} 
                  onChange={e => setFormData({...formData, password: e.target.value})}
                />
                <Lock className="input-icon" size={20}/>
              </div>
            )}

            {mode === 'login' && (
              <div className="flex justify-end mb-6">
                <button type="button" onClick={() => setMode('forgot')} className="text-sm font-bold text-[#00418E] hover:underline">
                  Quên mật khẩu?
                </button>
              </div>
            )}

            <button disabled={loading} className="btn-primary mb-8">
              {loading ? <Loader2 className="animate-spin" size={20}/> : <ArrowRight size={20}/>}
              {mode === 'login' ? 'Đăng nhập' : mode === 'signup' ? 'Đăng ký ngay' : 'Gửi link khôi phục'}
            </button>

            {mode !== 'forgot' && (
              <>
                <div className="relative mb-8">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200"></div></div>
                  <div className="relative flex justify-center text-sm"><span className="px-4 bg-white text-slate-500 font-medium">Hoặc tiếp tục với</span></div>
                </div>

                <div className="flex gap-4 mb-8">
                  <button type="button" onClick={handleGoogleLogin} className="social-btn group">
                    <Chrome size={20} className="text-slate-500 group-hover:text-red-500 transition-colors"/> 
                    <span>Google</span>
                  </button>
                </div>
              </>
            )}
          </form>

          <div className="text-center text-sm font-medium text-slate-600">
            {mode === 'login' ? (
              <>Chưa có tài khoản? <button onClick={() => setMode('signup')} className="text-[#00418E] font-bold hover:underline ml-1">Đăng ký ngay</button></>
            ) : (
              <>Đã có tài khoản? <button onClick={() => setMode('login')} className="text-[#00418E] font-bold hover:underline ml-1">Đăng nhập</button></>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
