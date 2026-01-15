import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { Session } from '@supabase/supabase-js';
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
  verified_status: string;
  student_code: string | null;
  ban_reason?: string;
  banned_until?: string | null; // Cột quan trọng để check ban
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, name: string, studentId: string) => Promise<{ error: any }>;
  signOut: () => Promise<{ error: any }>;
  resetPassword: (email: string) => Promise<{ error: any }>;
  updatePassword: (newPassword: string) => Promise<{ error: any }>;
}

// --- COMPONENT: MÀN HÌNH CHẶN KHI BỊ KHÓA ---
const BannedOverlay = ({ info, onLogout }: { info: { reason: string; until: string | null }, onLogout: () => void }) => {
  const isPermanent = !info.until || new Date(info.until).getFullYear() > 2100;
  
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#0F172A] p-4 animate-in fade-in duration-300">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden relative">
        <div className="h-2 bg-red-600 w-full absolute top-0"></div>
        <div className="p-8 text-center">
          <div className="mx-auto w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-6 border border-red-100">
            <ShieldAlert size={40} className="text-red-600" />
          </div>

          <h2 className="text-2xl font-black text-slate-900 mb-2">Tài khoản bị tạm khóa</h2>
          <p className="text-slate-500 text-sm mb-8">
            Tài khoản của bạn đã bị hạn chế truy cập do vi phạm quy định cộng đồng.
          </p>
          
          <div className="bg-slate-50 rounded-xl p-5 mb-6 text-left space-y-4 border border-slate-100">
            <div className="flex gap-3">
              <AlertTriangle size={18} className="text-orange-500 shrink-0 mt-0.5"/>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Lý do</span>
                <span className="text-sm font-bold text-slate-800">{info.reason}</span>
              </div>
            </div>
            <div className="h-px bg-slate-200 w-full"></div>
            <div className="flex gap-3">
              <Clock size={18} className="text-blue-500 shrink-0 mt-0.5"/>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Mở khóa vào lúc</span>
                <span className="text-sm font-bold text-slate-800">
                  {isPermanent ? "Vĩnh viễn" : new Date(info.until!).toLocaleString('vi-VN')}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <button onClick={onLogout} className="w-full py-3 bg-slate-900 text-white rounded-lg font-bold text-sm hover:bg-slate-800 transition-all flex items-center justify-center gap-2">
              <LogOut size={16}/> Đăng xuất
            </button>
            <a href="mailto:support@bkmart.vn" className="block w-full py-3 text-slate-500 text-xs font-bold hover:text-blue-600 hover:underline">
              Liên hệ hỗ trợ
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
  
  // State quản lý thông tin bị khóa
  const [bannedInfo, setBannedInfo] = useState<{ reason: string; until: string | null } | null>(null);
  
  const mounted = useRef(false);

  // 1. Hàm lấy Profile & Check Ban
  const fetchProfile = async (sessionData: Session) => {
    try {
      const userId = sessionData.user.id;
      
      // Lấy profile từ DB
      let { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      // Nếu chưa có profile -> Tự tạo (Auto-create)
      if (!data && !error) {
        const meta = sessionData.user.user_metadata || {};
        const newProfile = {
          id: userId,
          name: meta.full_name || meta.name || sessionData.user.email?.split('@')[0],
          email: sessionData.user.email,
          student_code: meta.student_code || null,
          role: 'user',
          verified_status: 'unverified',
        };
        const { data: created, error: createErr } = await supabase.from('profiles').insert(newProfile).select().single();
        if (!createErr) data = created;
      }

      if (data && mounted.current) {
        const profile = data as unknown as DBProfile;

        // --- CHECK BAN LOGIC ---
        if (profile.banned_until) {
          const banDate = new Date(profile.banned_until);
          const now = new Date();

          if (banDate > now) {
            // Nếu thời gian khóa > hiện tại => BỊ BAN
            setBannedInfo({
              reason: profile.ban_reason || 'Vi phạm chính sách',
              until: profile.banned_until
            });
            
            // Xóa quyền truy cập ngay lập tức
            setUser(null); 
            setIsAdmin(false);
            setLoading(false);
            return; // Dừng, không set User nữa
          }
        }
        // -----------------------

        // Nếu sạch -> Set User vào State
        setBannedInfo(null);
        
        setUser({
          id: profile.id,
          email: sessionData.user.email,
          name: profile.name || 'User',
          studentId: profile.student_code || '', 
          avatar: profile.avatar_url || '',
          isVerified: profile.verified_status === 'verified',
          role: profile.role,
          banned: false,
          banUntil: null
        });
        
        setIsAdmin(profile.role === 'admin');
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

    // Lấy session ban đầu
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSession(session);
        fetchProfile(session);
      } else {
        setLoading(false);
      }
    });

    // Lắng nghe thay đổi (Login/Logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted.current) {
        setSession(session);
        if (session) {
          fetchProfile(session);
        } else {
          setUser(null);
          setIsAdmin(false);
          setBannedInfo(null);
          setLoading(false);
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
    await supabase.auth.signOut();
    setBannedInfo(null);
    setUser(null);
    setSession(null);
    window.location.href = '/'; 
  };

  const signIn = async (e: string, p: string) => supabase.auth.signInWithPassword({ email: e, password: p });
  
  const signUp = async (e: string, p: string, name: string, sid: string) => {
    return supabase.auth.signUp({ 
      email: e, password: p, 
      options: { data: { full_name: name, student_code: sid } } 
    });
  };

  const signOut = async () => handleLogout();
  const resetPassword = async (e: string) => supabase.auth.resetPasswordForEmail(e);
  const updatePassword = async (p: string) => supabase.auth.updateUser({ password: p });

  return (
    <AuthContext.Provider value={{ session, user, loading, isAdmin, signIn, signUp, signOut, resetPassword, updatePassword }}>
      {/* ƯU TIÊN 1: Hiển thị màn hình khóa nếu bị ban */}
      {bannedInfo ? (
        <BannedOverlay info={bannedInfo} onLogout={handleLogout} />
      ) : (
        /* ƯU TIÊN 2: Hiển thị loading hoặc app */
        loading ? (
          <div className="h-screen flex items-center justify-center bg-white">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : children
      )}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};
