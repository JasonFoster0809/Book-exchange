import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { supabase } from '../services/supabase';
import { User, DBProfile } from '../types';

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

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isRestricted, setIsRestricted] = useState(false);
  const mounted = useRef(false);

  const fetchProfile = async (sessionUser: any) => {
    try {
      // Fetch profile từ bảng 'profiles' (SQL mới)
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', sessionUser.id)
        .single();

      if (error) {
        console.warn("Chưa tìm thấy profile, chờ trigger...", error);
        // Có thể retry hoặc fallback nếu cần, nhưng thường trigger chạy rất nhanh
      }

      if (data && mounted.current) {
        // Ép kiểu về DBProfile (snake_case)
        const profile = data as DBProfile; 

        // 1. KIỂM TRA BAN
        if (profile.is_banned) {
          await supabase.auth.signOut();
          setUser(null);
          setIsAdmin(false);
          setLoading(false);
          alert(`Tài khoản bị khóa: ${profile.ban_reason || 'Vi phạm chính sách'}`);
          return;
        }

        // 2. PHÂN QUYỀN
        const userRole = profile.role === 'admin' ? 'admin' : 'user';
        
        // 3. MAPPING DỮ LIỆU (DB snake_case -> App camelCase)
        // Đây là bước quan trọng để "đồng nhất" dữ liệu
        const displayName = profile.name || sessionUser.user_metadata?.full_name || 'User';
        
        const userData: User = {
          id: profile.id,
          email: sessionUser.email,
          name: displayName,
          // Map đúng cột student_code từ DB
          studentId: profile.student_code || '', 
          avatar: profile.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=random`,
          // Map trạng thái xác thực
          isVerified: profile.verified_status === 'verified',
          role: userRole,
          // Map thông tin cấm (nếu cần dùng ở UI)
          banned: profile.is_banned,
          banUntil: profile.ban_until
        };
        
        setUser(userData);
        setIsAdmin(userRole === 'admin');
        setIsRestricted(false); 
      }
    } catch (error) {
      console.error("Lỗi lấy thông tin profile:", error);
      if (mounted.current) setUser(null);
    } finally {
      if (mounted.current) setLoading(false);
    }
  };

  useEffect(() => {
    mounted.current = true;

    // Kiểm tra session hiện tại
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchProfile(session.user);
      } else {
        if (mounted.current) setLoading(false);
      }
    });

    // Lắng nghe thay đổi Auth (Đăng nhập/Đăng xuất)
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (mounted.current) {
        if ((event === 'SIGNED_IN' || event === 'USER_UPDATED' || event === 'TOKEN_REFRESHED') && session?.user) {
          fetchProfile(session.user);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setIsAdmin(false);
          setIsRestricted(false);
          setLoading(false);
        }
      }
    });

    return () => {
      mounted.current = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  // --- ACTIONS ---

  const signIn = async (email: string, password: string) => {
    return await supabase.auth.signInWithPassword({ email, password });
  };

  const signUp = async (email: string, password: string, name: string, studentId: string) => {
    // Gửi thông tin vào metadata để Trigger SQL bắt được và tạo Profile
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { 
        data: { 
          full_name: name,      // Trigger sẽ lấy cái này vào cột `name`
          student_code: studentId // Trigger sẽ lấy cái này vào cột `student_code`
        } 
      },
    });

    if (error) return { error };
    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const resetPassword = async (email: string) => {
    const resetUrl = `${window.location.origin}/#/reset-password`;
    return await supabase.auth.resetPasswordForEmail(email, { redirectTo: resetUrl });
  };

  const updatePassword = async (newPassword: string) => {
    return await supabase.auth.updateUser({ password: newPassword });
  };

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin, isRestricted, signIn, signUp, signOut, resetPassword, updatePassword }}>
      {!loading ? children : (
        <div className="h-screen flex items-center justify-center bg-white">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
        </div>
      )}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
