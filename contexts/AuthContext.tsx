import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from "../services/supabase";
import { User } from '../types';
import { ShieldAlert, LogOut, Clock, AlertTriangle, Loader2 } from 'lucide-react';
import { useToast } from './ToastContext';

// --- TYPES ---
interface DBProfile {
  id: string;
  name: string | null;
  email?: string;
  avatar_url: string | null;
  role: string;
  verified_status: string;
  student_code: string | null;
  ban_reason?: string;
  banned_until?: string | null;
  bio?: string;
  major?: string;
  academic_year?: string;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  isRestricted: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signInWithGoogle: () => Promise<{ error: any }>;
  signUp: (email: string, password: string, name: string, studentId: string) => Promise<{ error: any }>;
  signOut: () => Promise<{ error: any }>; 
  resetPassword: (email: string) => Promise<{ error: any }>;
  updatePassword: (newPassword: string) => Promise<{ error: any }>;
  refreshProfile: () => Promise<void>;
}

// --- VISUAL ENGINE ---
const VisualEngine = () => (
  <style>{`
    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
      20%, 40%, 60%, 80% { transform: translateX(4px); }
    }
    .shake-animation { animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both; }
    .glass-danger {
      background: rgba(255, 255, 255, 0.9);
      backdrop-filter: blur(20px);
      border: 1px solid rgba(239, 68, 68, 0.2);
      box-shadow: 0 20px 50px -12px rgba(239, 68, 68, 0.25);
    }
  `}</style>
);

// --- COMPONENT: MÀN HÌNH CHẶN KHI BỊ KHÓA ---
const BannedOverlay = ({ info, onLogout }: { info: { reason: string; until: string | null }, onLogout: () => void }) => {
  const isPermanent = !info.until || new Date(info.until).getFullYear() > 2100;
  
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#0F172A]/90 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <VisualEngine />
      <div className="w-full max-w-md glass-danger rounded-3xl overflow-hidden relative shake-animation">
        <div className="h-1.5 bg-gradient-to-r from-red-500 via-orange-500 to-red-500 w-full absolute top-0"></div>
        <div className="p-8 text-center">
          <div className="mx-auto w-24 h-24 bg-red-50 rounded-full flex items-center justify-center mb-6 border-4 border-white shadow-lg">
            <ShieldAlert size={48} className="text-red-600" />
          </div>

          <h2 className="text-2xl font-black text-slate-900 mb-2">Tài khoản bị tạm khóa</h2>
          <p className="text-slate-500 text-sm mb-8 px-4">
            Hệ thống phát hiện hoạt động vi phạm tiêu chuẩn cộng đồng từ tài khoản này.
          </p>
          
          <div className="bg-red-50/50 rounded-2xl p-5 mb-6 text-left space-y-4 border border-red-100">
            <div className="flex gap-3 items-start">
              <div className="p-1.5 bg-orange-100 text-orange-600 rounded-lg shrink-0 mt-0.5"><AlertTriangle size={16}/></div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Lý do khóa</span>
                <span className="text-sm font-bold text-slate-800">{info.reason}</span>
              </div>
            </div>
            <div className="h-px bg-red-200/50 w-full"></div>
            <div className="flex gap-3 items-start">
              <div className="p-1.5 bg-blue-100 text-blue-600 rounded-lg shrink-0 mt-0.5"><Clock size={16}/></div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Thời hạn mở khóa</span>
                <span className="text-sm font-bold text-slate-800">
                  {isPermanent ? "Vĩnh viễn" : new Date(info.until!).toLocaleString('vi-VN')}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <button onClick={onLogout} className="w-full py-3.5 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 hover:scale-[1.02] transition-all flex items-center justify-center gap-2 shadow-xl shadow-slate-900/10">
              <LogOut size={18}/> Đăng xuất ngay
            </button>
            <a href="mailto:support@bkmart.vn" className="block w-full py-2 text-slate-400 text-xs font-bold hover:text-blue-600 transition-colors">
              Khiếu nại về quyết định này
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
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [bannedInfo, setBannedInfo] = useState<{ reason: string; until: string | null } | null>(null);
  
  const isRestricted = !!bannedInfo;
  const mounted = useRef(false);
  const { addToast } = useToast();

  // 1. Hàm lấy Profile & Check Ban & Đồng bộ Google
  const fetchProfile = async (sessionData: Session) => {
    try {
      const userId = sessionData.user.id;
      const meta = sessionData.user.user_metadata;
      
      let { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      // --- LOGIC 1: TỰ TẠO PROFILE NẾU CHƯA CÓ (Lần đầu login Google) ---
      if (!data && !error) {
        const newProfile = {
          id: userId,
          name: meta.full_name || meta.name || sessionData.user.email?.split('@')[0],
          email: sessionData.user.email,
          avatar_url: meta.avatar_url || meta.picture,
          role: 'user',
          verified_status: 'unverified',
          created_at: new Date().toISOString()
        };
        const { data: created, error: createErr } = await supabase.from('profiles').insert(newProfile).select().single();
        if (!createErr) data = created;
      }

      // --- LOGIC 2: ĐỒNG BỘ AVATAR/TÊN TỪ GOOGLE (Nâng cấp) ---
      if (data && sessionData.user.app_metadata.provider === 'google') {
        const googleAvatar = meta.avatar_url || meta.picture;
        const googleName = meta.full_name || meta.name;
        
        // Chỉ update nếu có sự thay đổi để tránh spam database
        if ((googleAvatar && googleAvatar !== data.avatar_url) || (googleName && googleName !== data.name)) {
           await supabase.from('profiles').update({
             avatar_url: googleAvatar,
             name: googleName
           }).eq('id', userId);
           
           // Cập nhật lại data local để hiển thị ngay lập tức
           data.avatar_url = googleAvatar;
           data.name = googleName;
        }
      }

      if (data && mounted.current) {
        const profile = data as unknown as DBProfile;

        // --- CHECK BAN ---
        if (profile.banned_until) {
          const banDate = new Date(profile.banned_until);
          if (banDate > new Date()) {
            setBannedInfo({
              reason: profile.ban_reason || 'Vi phạm chính sách cộng đồng',
              until: profile.banned_until
            });
            setUser(null); setIsAdmin(false); setLoading(false);
            return;
          }
        }
        setBannedInfo(null);
        // ----------------

        const safeRole = (profile.role === 'admin' ? 'admin' : 'user') as 'user' | 'admin';

        setUser({
          id: profile.id,
          email: sessionData.user.email || '',
          name: profile.name || 'User',
          studentId: profile.student_code || '', 
          avatar: profile.avatar_url || `https://ui-avatars.com/api/?name=${profile.name}&background=random`,
          isVerified: profile.verified_status === 'verified',
          role: safeRole,
          banned: false,
          banUntil: null,
          bio: profile.bio,
          major: profile.major,
          academicYear: profile.academic_year
        });
        
        setIsAdmin(safeRole === 'admin');
      }
    } catch (error) {
      console.error("Auth Fetch Error:", error);
    } finally {
      if (mounted.current) setLoading(false);
    }
  };

  // 2. Lifecycle
  useEffect(() => {
    mounted.current = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSession(session);
        fetchProfile(session);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted.current) {
        setSession(session);
        if (session) {
          fetchProfile(session);
        } else {
          setUser(null); setIsAdmin(false); setBannedInfo(null); setLoading(false);
        }
      }
    });

    return () => {
      mounted.current = false;
      subscription.unsubscribe();
    };
  }, []);

  // 3. Auth Actions
  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    setBannedInfo(null); setUser(null); setSession(null);
    return { error };
  };

  const signIn = async (e: string, p: string) => supabase.auth.signInWithPassword({ email: e, password: p });
  
  const signInWithGoogle = async () => {
    // Tự động lấy URL hiện tại để quay về đúng nơi (Fix lỗi redirect khi deploy)
    const redirectTo = window.location.origin; 
    return supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        queryParams: { access_type: 'offline', prompt: 'consent' },
        redirectTo: redirectTo
      }
    });
  };

  const signUp = async (e: string, p: string, name: string, sid: string) => {
    return supabase.auth.signUp({ 
      email: e, password: p, 
      options: { data: { full_name: name, student_code: sid } } 
    });
  };

  const signOut = async () => handleLogout();
  const resetPassword = async (e: string) => supabase.auth.resetPasswordForEmail(e);
  const updatePassword = async (p: string) => supabase.auth.updateUser({ password: p });

  // MỚI: Hàm refresh profile thủ công
  const refreshProfile = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) await fetchProfile(session);
  };

  return (
    <AuthContext.Provider value={{ 
      session, user, loading, isAdmin, isRestricted, 
      signIn, signInWithGoogle, signUp, signOut, resetPassword, updatePassword, refreshProfile 
    }}>
      {bannedInfo ? (
        <BannedOverlay info={bannedInfo} onLogout={handleLogout} />
      ) : (
        !loading ? children : (
          <div className="h-screen flex items-center justify-center bg-white flex-col gap-4">
            <Loader2 className="w-10 h-10 text-[#00418E] animate-spin" />
            <p className="text-slate-400 text-sm font-bold animate-pulse">Đang tải dữ liệu...</p>
          </div>
        )
      )}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};
