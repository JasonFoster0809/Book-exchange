import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { supabase } from '../services/supabase';
import { User } from '../types';
import { ShieldAlert, LogOut, Lock, Clock, AlertTriangle } from 'lucide-react';

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
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: any }>;
  updatePassword: (newPassword: string) => Promise<{ error: any }>;
}

// --- BAN OVERLAY COMPONENT ---
const BannedOverlay = ({ info, onLogout }: { info: { reason: string; until: string | null }, onLogout: () => void }) => {
  const isPermanent = !info.until || new Date(info.until).getFullYear() > 2100;
  
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-red-100">
        <div className="bg-red-50 p-8 text-center border-b border-red-100">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
            <ShieldAlert size={40} className="text-red-600" />
          </div>
          <h2 className="text-2xl font-black text-red-700 mb-2">Tài khoản bị khóa</h2>
          <p className="text-red-600/80 font-medium">Quyền truy cập của bạn đã bị tạm ngưng.</p>
        </div>
        
        <div className="p-8 space-y-6">
          <div className="space-y-4">
            <div className="flex items-start gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
              <div className="p-2 bg-white rounded-lg shadow-sm shrink-0">
                <AlertTriangle size={20} className="text-orange-500" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase mb-1">Lý do vi phạm</p>
                <p className="font-bold text-slate-800 text-sm leading-relaxed">{info.reason}</p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
              <div className="p-2 bg-white rounded-lg shadow-sm shrink-0">
                <Clock size={20} className="text-blue-500" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase mb-1">Thời hạn mở khóa</p>
                <p className="font-bold text-slate-800 text-sm">
                  {isPermanent ? "Vĩnh viễn" : new Date(info.until!).toLocaleDateString('vi-VN', { 
                    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' 
                  })}
                </p>
              </div>
            </div>
          </div>

          <button 
            onClick={onLogout}
            className="w-full py-3.5 bg-slate-900 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-800 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <LogOut size={18} /> Đăng xuất ngay
          </button>
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
  
  // State mới để quản lý thông tin Ban
  const [bannedInfo, setBannedInfo] = useState<{ reason: string; until: string | null } | null>(null);
  
  const mounted = useRef(false);

  const fetchProfile = async (sessionUser: any) => {
    try {
      let { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', sessionUser.id)
        .maybeSingle();

      // Auto-create Profile if missing
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
          await supabase.auth.signOut();
          setUser(null);
          setLoading(false);
          return;
        }
        data = created;
      }

      if (data && mounted.current) {
        const profile = data as unknown as DBProfile;

        // 1. NẾU BỊ BAN -> HIỆN OVERLAY (Không dùng alert nữa)
        if (profile.is_banned) {
          await supabase.auth.signOut(); // Logout khỏi session
          setUser(null);
          setIsAdmin(false);
          setLoading(false);
          // Set state để hiện màn hình chặn
          setBannedInfo({
            reason: profile.ban_reason || 'Vi phạm chính sách cộng đồng',
            until: profile.ban_until || null
          });
          return;
        }

        // Reset ban info nếu user sạch
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
        if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session?.user) {
          fetchProfile(session.user);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setIsAdmin(false);
          setLoading(false);
          // Không clear bannedInfo ở đây để giữ màn hình thông báo nếu vừa bị kick
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
    setBannedInfo(null); // Clear màn hình Ban khi user chủ động bấm nút Logout trên Overlay
    window.location.href = '/'; // Reload nhẹ để sạch state
  };

  // Các hàm Auth khác giữ nguyên...
  const signIn = async (email: string, password: string) => supabase.auth.signInWithPassword({ email, password });
  const signUp = async (email: string, password: string, name: string, studentId: string) => {
    const { error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: name, student_code: studentId } } });
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
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
          </div>
        )
      )}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
