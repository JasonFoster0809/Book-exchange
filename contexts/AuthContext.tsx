import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { supabase } from '../services/supabase';
import { User } from '../types';

// Định nghĩa kiểu dữ liệu khớp với DB mới
interface DBProfile {
  id: string;
  name: string; // hoặc full_name tùy bạn sửa trong SQL
  avatar_url: string | null;
  role: string;
  is_banned: boolean; // DB mới dùng is_banned
  verified_status: string; // DB mới dùng verified_status (enum)
  student_code: string | null; // DB mới dùng student_code
  ban_reason?: string;
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

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isRestricted, setIsRestricted] = useState(false);
  const mounted = useRef(false);

  const fetchProfile = async (sessionUser: any) => {
    try {
      // Fetch profile từ bảng mới
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', sessionUser.id)
        .single();

      if (error) throw error;

      if (data && mounted.current) {
        // Ép kiểu sang DBProfile để mapping
        const profile = data as unknown as DBProfile; 

        // 1. KIỂM TRA BAN (Cột is_banned)
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
        
        // 3. MAPPING DỮ LIỆU TỪ DB MỚI -> CONTEXT USER
        // Lưu ý: user_metadata thường chứa tên lúc đăng ký, dùng làm fallback
        const displayName = profile.name || sessionUser.user_metadata?.full_name || sessionUser.user_metadata?.name || 'User';
        
        const userData: User = {
          id: profile.id,
          email: sessionUser.email,
          name: displayName,
          // DB dùng student_code, User type dùng studentId
          studentId: profile.student_code || '', 
          avatar: profile.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=random`,
          // Kiểm tra verified_status thay vì is_verified
          isVerified: profile.verified_status === 'verified',
          role: userRole,
        };
        
        setUser(userData);
        setIsAdmin(userRole === 'admin');
        // Logic restricted có thể mở rộng sau nếu cần
        setIsRestricted(false); 
      }
    } catch (error) {
      console.error("Lỗi lấy thông tin profile:", error);
      // Nếu lỗi fetch profile nhưng auth vẫn ok, có thể logout để an toàn
      if (mounted.current) setUser(null);
    } finally {
      if (mounted.current) setLoading(false);
    }
  };

  useEffect(() => {
    mounted.current = true;

    // Kiểm tra session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchProfile(session.user);
      } else {
        if (mounted.current) setLoading(false);
      }
    });

    // Lắng nghe thay đổi Auth
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
    // 1. Đăng ký Auth (Gửi metadata để Trigger DB tự tạo profile)
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { 
        data: { 
          full_name: name, // Gửi full_name để khớp với logic trigger handle_new_user
          name: name,      // Gửi cả name cho chắc
          student_code: studentId // Gửi student_code vào metadata nếu muốn lưu ngay (tùy trigger)
        } 
      },
    });

    if (error) return { error };

    // 2. KHÔNG CẦN INSERT THỦ CÔNG VÀO PROFILES NỮA!
    // Vì script SQL mới đã có Trigger "on_auth_user_created" tự động làm việc này.
    // Nếu insert ở đây sẽ bị lỗi "Duplicate Key".

    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const resetPassword = async (email: string) => {
    // Lưu ý: Cần cấu hình Redirect URL trong Supabase Dashboard -> Auth -> URL Configuration
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
