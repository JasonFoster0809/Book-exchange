import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { supabase } from '../services/supabase';
import { User } from '../types';
import { ShieldAlert, LogOut, Lock, Clock, AlertTriangle, Mail, ChevronRight } from 'lucide-react';

// --- TYPES ---
interface DBProfile {
  id: string;
  name: string | null;
  email?: string;
  avatar_url: string | null;
  role: string;
  is_banned: boolean;
  verified_status: string;
  student_code: string | null;
  ban_reason?: string;
  ban_until?: string | null;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  isRestricted: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, name: string, studentId: string) => Promise<{ error: any }>;
  // Đã sửa lại kiểu trả về để khớp với Supabase v2
  signOut: () => Promise<{ error: any }>; 
  resetPassword: (email: string) => Promise<{ error: any }>;
  updatePassword: (newPassword: string) => Promise<{ error: any }>;
}

// --- PROFESSIONAL BANNED OVERLAY ---
const BannedOverlay = ({ info, onLogout }: { info: { reason: string; until: string | null }, onLogout: () => void }) => {
  const isPermanent = !info.until || new Date(info.until).getFullYear() > 2100;
  
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#0F172A]/90 backdrop-blur-xl p-4 animate-in fade-in duration-500">
      <div className="w-full max-w-lg bg-white rounded-[2rem] shadow-2xl overflow-hidden border border-white/10 ring-1 ring-black/5 relative">
        {/* Header Decor */}
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-red-500 via-orange-500 to-red-500"></div>
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-red-500/10 rounded-full blur-3xl"></div>
        
        <div className="p-8 md:p-10 text-center">
          {/* Icon Animation */}
          <div className="relative mx-auto mb-6 w-24 h-24">
            <div className="absolute inset-0 bg-red-100 rounded-full animate-ping opacity-20"></div>
            <div className="relative bg-red-50 w-full h-full rounded-full flex items-center justify-center border border-red-100 shadow-inner">
              <ShieldAlert size={48} className="text-red-600 drop-shadow-sm" />
            </div>
          </div>

          <h2 className="text-3xl font-black text-slate-900 mb-3 tracking-tight">Tài khoản bị hạn chế</h2>
          <p className="text-slate-500 text-lg leading-relaxed mb-8">
            Chúng tôi rất tiếc, nhưng tài khoản của bạn hiện không thể truy cập vào hệ thống.
          </p>
        
          <div className="space-y-4 mb-8 text-left">
            {/* Reason Card */}
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 flex gap-4 transition-transform hover:scale-[1.02]">
              <div className="bg-white p-2.5 rounded-xl shadow-sm border border-slate-100 h-fit text-orange-500">
                <AlertTriangle size={20} />
              </div>
              <div>
                <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Lý do vi phạm</span>
                <span className="block font-bold text-slate-800 text-sm md:text-base">
                  {info.reason || "Vi phạm tiêu chuẩn cộng đồng"}
                </span>
              </div>
            </div>

            {/* Time Card */}
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 flex gap-4 transition-transform hover:scale-[1.02]">
              <div className="bg-white p-2.5 rounded-xl shadow-sm border border-slate-100 h-fit text-blue-500">
                <Clock size={20} />
              </div>
              <div>
                <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Thời gian mở khóa</span>
                <span className="block font-bold text-slate-800 text-sm md:text-base">
                  {isPermanent ? (
                    <span className="text-red-600">Vĩnh viễn</span>
                  ) : (
                    new Date(info.until!).toLocaleDateString('vi-VN', { 
                      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' 
                    })
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-3">
            <button 
              onClick={onLogout}
              className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-sm transition-all shadow-lg hover:shadow-slate-900/20 flex items-center justify-center gap-2 group"
            >
              <LogOut size={18} className="text-slate-400 group-hover:text-white transition-colors" /> 
              Đăng xuất tài khoản
            </button>
            
            <a 
              href="mailto:support@hcmut.edu.vn?subject=Khieu_nai_khoa_tai_khoan"
              className="w-full py-4 bg-white border border-slate-200 text-slate-600 hover:text-[#00418E] hover:border-blue-200 hover:bg-blue-50 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2"
            >
              <Mail size={18} /> Gửi khiếu nại
            </a>
          </div>
        </div>
        
        {/* Footer */}
        <div className="bg-slate-50 py-3 px-8 text-center border-t border-slate-100">
           <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest">
             BK Book Exchange Security
           </p>
        </div>
      </div>
    </div>
  );
};

// --- MAIN CONTEXT ---
const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isRestricted, setIsRestricted] = useState(false);
  
  // State quản lý thông tin Ban
  const [bannedInfo, setBannedInfo] = useState<{ reason: string; until: string | null } | null>(null);
  
  const mounted = useRef(false);

  const fetchProfile = async (sessionUser: any) => {
    try {
      let { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', sessionUser.id)
        .maybeSingle();

      // Auto-create Profile if missing (Fail-safe)
      if (!data) {
        console.warn("Profile chưa tồn tại. Đang khởi tạo...");
        const meta = sessionUser.user_metadata || {};
        const displayName = meta.full_name || meta.name || sessionUser.email?.split('@')[0] || 'User';
        
        const newProfile = {
          id: sessionUser.id,
          name: displayName,
          email: sessionUser.email,
          student_code: meta.student_code || null,
          avatar_url: meta.avatar_url,
          role: 'user',
          verified_status: 'unverified',
          is_banned: false
        };

        const { data: created, error: createErr } = await supabase.from('profiles').insert(newProfile).select().single();
        if (createErr) {
          // Nếu tạo lỗi, logout để tránh kẹt
          await supabase.auth.signOut();
          setUser(null);
          setLoading(false);
          return;
        }
        data = created;
      }

      if (data && mounted.current) {
        const profile = data as unknown as DBProfile;

        // --- KIỂM TRA BAN ---
        if (profile.is_banned) {
          await supabase.auth.signOut(); // Force logout logic
          setUser(null);
          setIsAdmin(false);
          setLoading(false);
          
          // Hiện Overlay thông báo
          setBannedInfo({
            reason: profile.ban_reason || 'Vi phạm chính sách cộng đồng',
            until: profile.ban_until || null
          });
          return;
        }

        // Reset nếu user sạch
        setBannedInfo(null);

        const userRole = profile.role === 'admin' ? 'admin' : 'user';
        const finalName = profile.name || 'User';
        
        setUser({
          id: profile.id,
          email: sessionUser.email,
          name: finalName,
          studentId: profile.student_code || '', 
          avatar: profile.avatar_url || '',
          isVerified: profile.verified_status === 'verified',
          role: userRole,
          banned: profile.is_banned,
          banUntil: profile.ban_until
        });
        
        setIsAdmin(userRole === 'admin');
        setIsRestricted(false); 
      }
    } catch (error: any) {
      console.error("Lỗi Auth:", error);
      if (error?.message?.includes("Refresh Token")) {
         await supabase.auth.signOut();
         setUser(null);
      }
      if (mounted.current) setUser(null);
    } finally {
      if (mounted.current) setLoading(false);
    }
  };

  useEffect(() => {
    mounted.current = true;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) fetchProfile(session.user);
      else setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (mounted.current) {
        if ((event === 'SIGNED_IN' || event === 'USER_UPDATED' || event === 'TOKEN_REFRESHED') && session?.user) {
          fetchProfile(session.user);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setIsAdmin(false);
          setLoading(false);
          // Không clear bannedInfo ở đây để giữ overlay nếu cần
        }
      }
    });

    return () => {
      mounted.current = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setBannedInfo(null);
    window.location.href = '/'; 
  };

  // --- EXPORTED FUNCTIONS ---
  const signIn = async (email: string, password: string) => supabase.auth.signInWithPassword({ email, password });
  
  const signUp = async (email: string, password: string, name: string, studentId: string) => {
    const { error } = await supabase.auth.signUp({ 
      email, 
      password, 
      options: { data: { full_name: name, student_code: studentId } } 
    });
    return { error };
  };

  const signOut = async () => await supabase.auth.signOut(); 
  
  const resetPassword = async (email: string) => supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/#/reset-password` });
  
  const updatePassword = async (newPassword: string) => supabase.auth.updateUser({ password: newPassword });

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin, isRestricted, signIn, signUp, signOut, resetPassword, updatePassword }}>
      {bannedInfo ? (
        <BannedOverlay info={bannedInfo} onLogout={handleLogout} />
      ) : (
        !loading ? children : (
          <div className="h-screen flex items-center justify-center bg-white">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#00418E]"></div>
          </div>
        )
      )}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
