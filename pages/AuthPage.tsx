import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../services/supabase";
import { useToast } from "../contexts/ToastContext";
import { 
  Mail, 
  Lock, 
  User, 
  ArrowRight, 
  Loader, 
  Sparkles,
  CheckCircle,
  AlertCircle
} from "lucide-react";

// --- STYLES ---
const GlobalStyles = () => (
  <style>{`
    :root { --primary: #00418E; --secondary: #00B0F0; }
    body { font-family: 'Inter', system-ui, sans-serif; overflow-x: hidden; }
    
    /* Animations */
    @keyframes blob { 0% { transform: translate(0px, 0px) scale(1); } 33% { transform: translate(30px, -50px) scale(1.1); } 66% { transform: translate(-20px, 20px) scale(0.9); } 100% { transform: translate(0px, 0px) scale(1); } }
    @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }

    .animate-blob { animation: blob 7s infinite; }
    .animate-enter { animation: fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; opacity: 0; }
    .delay-100 { animation-delay: 100ms; }
    .delay-200 { animation-delay: 200ms; }

    /* Glass Panel */
    .glass-panel { 
      background: rgba(255, 255, 255, 0.75); 
      backdrop-filter: blur(16px); 
      -webkit-backdrop-filter: blur(16px); 
      border: 1px solid rgba(255, 255, 255, 0.5); 
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.1); 
    }
    
    .input-group:focus-within { border-color: #00418E; box-shadow: 0 0 0 4px rgba(0, 65, 142, 0.1); }
  `}</style>
);

const AnimatedBackground = () => (
  <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10 bg-[#F8FAFC]">
    <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-300 rounded-full mix-blend-multiply filter blur-[128px] opacity-40 animate-blob"></div>
    <div className="absolute top-0 right-1/4 w-96 h-96 bg-purple-300 rounded-full mix-blend-multiply filter blur-[128px] opacity-40 animate-blob animation-delay-2000"></div>
    <div className="absolute -bottom-32 left-1/3 w-96 h-96 bg-cyan-300 rounded-full mix-blend-multiply filter blur-[128px] opacity-40 animate-blob animation-delay-4000"></div>
    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
  </div>
);

const AuthPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { addToast } = useToast();
  
  // State
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    fullName: "",
  });

  // Toggle Mode
  const toggleMode = () => {
    setIsLogin(!isLogin);
    setFormData({ email: "", password: "", fullName: "" });
  };

  // Handle Input Change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Main Auth Handler
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        // --- LOGIC ĐĂNG NHẬP ---
        const { error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });
        
        if (error) throw error;
        
        addToast("Đăng nhập thành công!", "success");
        navigate("/"); 
      } else {
        // --- LOGIC ĐĂNG KÝ ---
        if (!formData.fullName.trim()) {
          throw new Error("Vui lòng nhập họ tên đầy đủ.");
        }

        const { error } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            // Quan trọng: Gửi metadata để Trigger trong SQL tự động tạo Profile
            data: {
              full_name: formData.fullName,
              name: formData.fullName, // Gửi cả 2 trường để chắc chắn khớp logic DB
              avatar_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.fullName)}&background=random`
            },
          },
        });

        if (error) throw error;

        addToast("Đăng ký thành công! Vui lòng kiểm tra email để xác thực.", "info");
        setIsLogin(true); // Chuyển về trang đăng nhập
      }
    } catch (error: any) {
      console.error("Auth Error:", error);
      let msg = error.message;
      if (msg === "Invalid login credentials") msg = "Email hoặc mật khẩu không đúng.";
      if (msg.includes("already registered")) msg = "Email này đã được đăng ký.";
      addToast(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 pt-20 relative">
      <GlobalStyles />
      <AnimatedBackground />

      <div className="w-full max-w-md animate-enter">
        {/* Logo / Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-500/30 mb-4">
            <span className="font-black text-xl">BK</span>
          </div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">
            {isLogin ? "Chào mừng trở lại!" : "Tham gia cộng đồng"}
          </h1>
          <p className="text-slate-500 mt-2 text-sm font-medium">
            {isLogin 
              ? "Đăng nhập để tiếp tục mua bán và trao đổi." 
              : "Tạo tài khoản miễn phí chỉ trong 30 giây."}
          </p>
        </div>

        {/* Main Card */}
        <div className="glass-panel rounded-3xl p-8 transition-all duration-500">
          <form onSubmit={handleAuth} className="space-y-5">
            
            {/* Full Name (Register Only) */}
            {!isLogin && (
              <div className="space-y-1.5 animate-enter">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider ml-1">Họ và tên</label>
                <div className="input-group flex items-center gap-3 bg-white/60 border border-slate-200 rounded-xl px-4 py-3 transition-all">
                  <User size={18} className="text-slate-400" />
                  <input
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    placeholder="Nguyễn Văn A"
                    className="flex-1 bg-transparent outline-none text-sm font-medium text-slate-800 placeholder-slate-400"
                    required={!isLogin}
                  />
                </div>
              </div>
            )}

            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider ml-1">Email</label>
              <div className="input-group flex items-center gap-3 bg-white/60 border border-slate-200 rounded-xl px-4 py-3 transition-all">
                <Mail size={18} className="text-slate-400" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="name@example.com"
                  className="flex-1 bg-transparent outline-none text-sm font-medium text-slate-800 placeholder-slate-400"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider ml-1">Mật khẩu</label>
              <div className="input-group flex items-center gap-3 bg-white/60 border border-slate-200 rounded-xl px-4 py-3 transition-all">
                <Lock size={18} className="text-slate-400" />
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="flex-1 bg-transparent outline-none text-sm font-medium text-slate-800 placeholder-slate-400"
                  required
                  minLength={6}
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 mt-2 rounded-xl bg-gradient-to-r from-[#00418E] to-[#00B0F0] text-white font-bold text-sm shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader size={20} className="animate-spin" />
              ) : (
                <>
                  {isLogin ? "Đăng nhập" : "Tạo tài khoản"}
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          {/* Switch Mode */}
          <div className="mt-6 pt-6 border-t border-slate-200 text-center">
            <p className="text-sm text-slate-500 mb-4">
              {isLogin ? "Chưa có tài khoản?" : "Đã có tài khoản?"}
            </p>
            <button
              onClick={toggleMode}
              className="px-6 py-2 rounded-full border border-slate-200 bg-white/50 text-slate-700 text-sm font-bold hover:bg-white hover:border-[#00418E] hover:text-[#00418E] transition-all shadow-sm"
            >
              {isLogin ? "Đăng ký ngay" : "Đăng nhập"}
            </button>
          </div>
        </div>

        {/* Footer Info */}
        <div className="mt-8 text-center text-xs text-slate-400 font-medium">
          <p>© {new Date().getFullYear()} HCMUT Marketplace. Bảo mật & An toàn.</p>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
