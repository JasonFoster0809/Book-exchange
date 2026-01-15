import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { supabase } from '../services/supabase';
import { User } from '../types';
import { ShieldAlert, LogOut, Clock, AlertTriangle, Mail } from 'lucide-react';

// --- TYPES ---
interface DBProfile {
  id: string;
  name: string | null;
  email?: string;
  avatar_url: string | null;
  role: string;
  // is_banned: boolean; // Bỏ cái này, dùng thời gian để quyết định
  verified_status: string;
  student_code: string | null;
  ban_reason?: string;
  banned_until?: string | null; // SỬA: Dùng banned_until cho khớp Admin
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  isRestricted: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, name: string, studentId: string) => Promise<{ error: any }>;
  signOut: () => Promise<{ error: any }>; 
  resetPassword: (email: string) => Promise<{ error: any }>;
  updatePassword: (newPassword: string) => Promise<{ error: any }>;
}

// --- BANNED OVERLAY COMPONENT ---
const BannedOverlay = ({ info, onLogout }: { info: { reason: string; until: string | null }, onLogout: () => void }) => {
  // Logic hiển thị thời gian còn lại
  const isPermanent = !info.until || new Date(info.until).getFullYear() > 2100;
  
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#0F172A]/95 backdrop-blur-md p-4 animate-in fade-in zoom-in duration-300">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden relative">
        <div className="bg-red-500 h-2 w-full absolute top-0"></div>
        
        <div className="p-8 text-center">
          <div className="mx-auto w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-6 animate-pulse">
            <ShieldAlert size={40} className="text-red-600" />
          </div>

          <h2 className="text-2xl font-black text-slate-900 mb-2">Tài khoản bị tạm khóa</h2>
          <p className="text-slate-500 text-sm mb-8 leading-relaxed">
            Hệ thống phát hiện hoạt động vi phạm tiêu chuẩn cộng đồng từ tài khoản của bạn.
          </p>
          
          <div className="bg-slate-50 rounded-2xl p-4 mb-6 border border-slate-100 text-left space-y-3">
            <div className="flex items-start gap-3">
              <AlertTriangle size={18} className="text-orange-500 shrink-0 mt-0.5"/>
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase block">Lý do</span>
                <span className="text-sm font-bold text-slate-800">{info.reason}</span>
              </div>
            </div>
            <div className="h-px bg-slate-200 w-full"></div>
            <div className="flex items-start gap-3">
              <Clock size={18} className="text-blue-500 shrink-0 mt-0.5"/>
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase block">Mở khóa vào lúc</span>
                <span className="text-sm font-bold text-slate-800">
                  {isPermanent ? "Vĩnh viễn" : new Date(info.until!).toLocaleString('vi-VN')}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <button onClick={onLogout} className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition-all flex items-center justify-center gap-2">
              <LogOut size={16}/> Đăng xuất ngay
            </button>
            <a href="mailto:support@bkmart.vn" className="w-full py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-50 transition-all flex items-center justify-center gap-2">
              <Mail size={16}/> Khiếu nại
            </a>
          </div>
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
  const [bannedInfo, setBannedInfo] = useState<{ reason: string; until: string | null } | null>(null);
  const mounted = useRef(false);

  // Hàm xử lý Profile và Check Ban
  const fetchProfile = async (sessionUser: any) => {
    try {
      let { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', sessionUser.id)
        .maybeSingle();

      // Tự động tạo profile nếu chưa có (Fallback)
      if (!data) {
        const meta = sessionUser.user_metadata || {};
        const newProfile = {
          id: sessionUser.id,
          name: meta.full_name || meta.name || sessionUser.email?.split('@')[0],
          email: sessionUser.email,
          student_code: meta.student_code || null,
          avatar_url: meta.avatar_url,
          role: 'user',
          verified_status: 'unverified',
        };
        const { data: created } = await supabase.from('profiles').insert(newProfile).select().single();
        data = created;
      }

      if (data && mounted.current) {
        const profile = data as unknown as DBProfile;

        // --- 🔴 LOGIC CHECK BAN QUAN TRỌNG ---
        if (profile.banned_until) {
          const banDate = new Date(profile.banned_until);
          const now = new Date();

          if (banDate > now) {
            // Nếu thời gian khóa > hiện tại => BỊ BAN
            setBannedInfo({
              reason: profile.ban_reason || 'Vi phạm quy định sàn',
              until: profile.banned_until
            });
            
            // Xóa user khỏi state để chặn truy cập, nhưng KHÔNG gọi signOut ngay
            // để giữ session cho việc hiển thị Overlay
            setUser(null); 
            setIsAdmin(false);
            setLoading(false);
            return; 
          }
        }
        // -------------------------------------

        // Nếu không bị ban (hoặc đã hết hạn)
        setBannedInfo(null);

        const userRole = profile.role === 'admin' ? 'admin' : 'user';
        
        setUser({
          id: profile.id,
          email: sessionUser.email,
          name: profile.name || 'User',
          studentId: profile.student_code || '', 
          avatar: profile.avatar_url || '',
          isVerified: profile.verified_status === 'verified',
          role: userRole,
          banned: false, // Tại đây chắc chắn không bị ban
          banUntil: null
        });
        
        setIsAdmin(userRole === 'admin');
      }
    } catch (error) {
      console.error("Auth Error:", error);
      if (mounted.current) setUser(null);
    } finally {
      if (mounted.current) setLoading(false);
    }
  };

  useEffect(() => {
    mounted.current = true;
    
    // Check session lúc khởi động
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) fetchProfile(session.user);
      else setLoading(false);
    });

    // Lắng nghe thay đổi (Login, Logout)
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (mounted.current) {
        if (session?.user) {
          fetchProfile(session.user);
        } else {
          setUser(null);
          setIsAdmin(false);
          setLoading(false);
          setBannedInfo(null); // Clear ban info khi logout thật
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
    setUser(null);
    window.location.href = '/'; 
  };

  // Các hàm Auth cơ bản
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
  const resetPassword = async (email: string) => supabase.auth.resetPasswordForEmail(email);
  const updatePassword = async (newPassword: string) => supabase.auth.updateUser({ password: newPassword });

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin, isRestricted, signIn, signUp, signOut, resetPassword, updatePassword }}>
      {/* ƯU TIÊN HIỂN THỊ OVERLAY NẾU BỊ BAN */}
      {bannedInfo ? (
        <BannedOverlay info={bannedInfo} onLogout={handleLogout} />
      ) : (
        !loading ? children : (
          <div className="h-screen flex items-center justify-center bg-white">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )
      )}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
