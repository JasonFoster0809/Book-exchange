import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import {
  Mail, Lock, User, ArrowRight, Loader2,
  GraduationCap, BookOpen, CheckCircle2, AlertCircle
} from "lucide-react";

// --- STYLES ---
const VisualEngine = () => (
  <style>{`
    :root { --primary: #00418E; }
    body { background-color: #F8FAFC; }
    
    .auth-input {
      width: 100%;
      padding: 14px 16px 14px 48px;
      border-radius: 12px;
      border: 1px solid #E2E8F0;
      background: #F8FAFC;
      font-weight: 500;
      transition: all 0.2s;
      outline: none;
    }
    .auth-input:focus {
      background: #FFFFFF;
      border-color: var(--primary);
      box-shadow: 0 0 0 4px rgba(0, 65, 142, 0.1);
    }
    
    .auth-btn {
      position: relative;
      overflow: hidden;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .auth-btn:active { transform: scale(0.98); }
    
    .animate-fade-in { animation: fadeIn 0.5s ease-out forwards; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
  `}</style>
);

const AuthPage: React.FC = () => {
  const navigate = useNavigate();
  const { signIn, signUp } = useAuth();
  const { addToast } = useToast();

  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  
  // Form State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [studentId, setStudentId] = useState("");

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        // --- LOGIC ĐĂNG NHẬP ---
        const { error } = await signIn(email, password);
        if (error) throw error;
        addToast("Chào mừng trở lại! 👋", "success");
        navigate("/");
      } else {
        // --- LOGIC ĐĂNG KÝ ---
        if (!email.endsWith("@hcmut.edu.vn") && !email.endsWith("@bachkhoa.edu.vn")) {
           // Có thể mở rộng cho gmail thường nếu muốn, nhưng đây là ví dụ check mail BK
           // addToast("Khuyên dùng email sinh viên (@hcmut.edu.vn)", "info");
        }
        
        if (!name || !studentId) {
          throw new Error("Vui lòng điền đầy đủ Tên và MSSV");
        }

        const { error } = await signUp(email, password, name, studentId);
        if (error) throw error;
        
        addToast("Đăng ký thành công! Đang đăng nhập...", "success");
        navigate("/");
      }
    } catch (err: any) {
      console.error(err);
      let msg = err.message;
      if (msg.includes("Invalid login")) msg = "Sai email hoặc mật khẩu.";
      if (msg.includes("already registered")) msg = "Email này đã được sử dụng.";
      addToast(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex font-sans text-slate-800 bg-white">
      <VisualEngine />

      {/* --- LEFT COLUMN: BRANDING & IMAGE --- */}
      <div className="hidden lg:flex w-1/2 bg-[#00418E] relative overflow-hidden flex-col justify-between p-12 text-white">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1541339907198-e021fc9d13f1?q=80&w=1000&auto=format&fit=crop')] bg-cover bg-center opacity-20 mix-blend-overlay"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-[#00418E]/80 to-[#00204a]/90"></div>
        
        {/* Decorative Circles */}
        <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-blue-400/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-96 h-96 bg-cyan-400/20 rounded-full blur-3xl"></div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-white/10 backdrop-blur rounded-xl flex items-center justify-center border border-white/20">
              <BookOpen size={24} className="text-white"/>
            </div>
            <span className="text-xl font-bold tracking-wide">BK BOOK EXCHANGE</span>
          </div>
        </div>

        <div className="relative z-10 max-w-lg">
          <h1 className="text-5xl font-black mb-6 leading-tight">
            Nơi trao đổi tri thức <br/>
            <span className="text-[#00B0F0]">Sinh viên Bách Khoa</span>
          </h1>
          <p className="text-lg text-blue-100/80 mb-8 leading-relaxed">
            Tham gia cộng đồng hơn 5,000 sinh viên. Mua bán giáo trình cũ, chia sẻ tài liệu và kết nối với những người bạn cùng chí hướng.
          </p>
          <div className="flex gap-4">
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur px-4 py-2 rounded-lg border border-white/10">
              <CheckCircle2 size={16} className="text-[#00B0F0]"/> <span>Uy tín</span>
            </div>
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur px-4 py-2 rounded-lg border border-white/10">
              <CheckCircle2 size={16} className="text-[#00B0F0]"/> <span>Tiện lợi</span>
            </div>
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur px-4 py-2 rounded-lg border border-white/10">
              <CheckCircle2 size={16} className="text-[#00B0F0]"/> <span>Miễn phí</span>
            </div>
          </div>
        </div>

        <div className="relative z-10 text-sm text-blue-200/60">
          © 2024 BK Book Exchange. Built for HCMUT Students.
        </div>
      </div>

      {/* --- RIGHT COLUMN: FORM --- */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 relative">
        <div className="max-w-[420px] w-full animate-fade-in">
          
          {/* Mobile Header (Only visible on small screens) */}
          <div className="lg:hidden mb-8 text-center">
            <div className="w-12 h-12 bg-[#00418E] rounded-xl flex items-center justify-center text-white mx-auto mb-4">
              <BookOpen size={24}/>
            </div>
            <h2 className="text-2xl font-bold text-[#00418E]">BK Book Exchange</h2>
          </div>

          <div className="text-center mb-8">
            <h2 className="text-3xl font-black text-slate-900 mb-2">
              {isLogin ? "Chào mừng trở lại!" : "Tạo tài khoản mới"}
            </h2>
            <p className="text-slate-500">
              {isLogin ? "Nhập thông tin để tiếp tục." : "Bắt đầu hành trình trao đổi sách ngay hôm nay."}
            </p>
          </div>

          {/* Toggle Switch */}
          <div className="flex bg-slate-100 p-1 rounded-xl mb-8">
            <button
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${isLogin ? 'bg-white text-[#00418E] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Đăng nhập
            </button>
            <button
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${!isLogin ? 'bg-white text-[#00418E] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Đăng ký
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleAuth} className="space-y-5">
            {!isLogin && (
              <>
                <div className="relative group">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#00418E] transition-colors" size={20}/>
                  <input
                    required
                    placeholder="Họ và tên"
                    className="auth-input"
                    value={name}
                    onChange={e => setName(e.target.value)}
                  />
                </div>
                <div className="relative group">
                  <GraduationCap className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#00418E] transition-colors" size={20}/>
                  <input
                    required
                    placeholder="Mã số sinh viên (MSSV)"
                    className="auth-input"
                    value={studentId}
                    onChange={e => setStudentId(e.target.value)}
                  />
                </div>
              </>
            )}

            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#00418E] transition-colors" size={20}/>
              <input
                required
                type="email"
                placeholder="Email (Khuyên dùng email SV)"
                className="auth-input"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#00418E] transition-colors" size={20}/>
                <input
                  required
                  type="password"
                  placeholder="Mật khẩu"
                  className="auth-input"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
              </div>
              {isLogin && (
                <div className="flex justify-end">
                  <button type="button" onClick={() => navigate('/reset-password')} className="text-xs font-bold text-[#00418E] hover:underline">
                    Quên mật khẩu?
                  </button>
                </div>
              )}
            </div>

            <button
              disabled={loading}
              className="auth-btn w-full bg-[#00418E] hover:bg-[#00306b] text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2"
            >
              {loading ? (
                <Loader2 className="animate-spin" />
              ) : (
                <>
                  {isLogin ? "Đăng Nhập" : "Đăng Ký Ngay"} <ArrowRight size={20}/>
                </>
              )}
            </button>
          </form>

          {/* Social / Footer */}
          <div className="mt-8 text-center">
            <p className="text-slate-400 text-xs mb-4">Hoặc tiếp tục với</p>
            <div className="flex gap-3 justify-center">
              <button className="p-3 rounded-full border border-slate-200 hover:bg-slate-50 transition-colors" title="Google (Coming soon)">
                <svg className="w-5 h-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
              </button>
              {/* Thêm các icon khác nếu cần */}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default AuthPage;
