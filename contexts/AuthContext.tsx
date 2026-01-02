import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { supabase } from '../services/supabase';
import { User, DBProfile } from '../types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
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
  const mounted = useRef(false);

  // --- HÀM LẤY THÔNG TIN CHI TIẾT NGƯỜI DÙNG ---
  const fetchProfile = async (sessionUser: any) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', sessionUser.id)
        .single();

      if (data && mounted.current) {
        const profile = data as DBProfile & { banned?: boolean };

        // 1. KIỂM TRA TRẠNG THÁI BỊ KHÓA (BANNED)
        if (profile.banned === true) {
          await supabase.auth.signOut(); // Xóa phiên đăng nhập ngay lập tức
          setUser(null);
          setIsAdmin(false);
          setLoading(false);
          // Thông báo cho người dùng
          alert("Tài khoản của bạn đã bị khóa do vi phạm chính sách của BK Market.");
          return;
        }

        // 2. PHÂN QUYỀN ADMIN
        const userRole = profile.role === 'admin' ? 'admin' : 'user';
        
        const userData: User = {
          id: profile.id,
          email: sessionUser.email,
          name: profile.name || sessionUser.user_metadata?.name || 'User',
          studentId: profile.student_id || '',
          avatar: profile.avatar_url || sessionUser.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${profile.name || 'User'}&background=random`,
          isVerified: profile.is_verified,
          role: userRole
        };
        
        setUser(userData);
        setIsAdmin(userRole === 'admin');
      } else if (!data && mounted.current) {
        // Fallback nếu không tìm thấy profile (trường hợp hiếm)
        setUser({
          id: sessionUser.id,
          email: sessionUser.email,
          name: sessionUser.user_metadata?.name || sessionUser.email?.split('@')[0],
          studentId: '',
          avatar: sessionUser.user_metadata?.avatar_url || 'https://via.placeholder.com/150',
          isVerified: false,
          role: 'user'
        });
        setIsAdmin(false);
      }
    } catch (error) {
      console.error("Lỗi xác thực hệ thống:", error);
    } finally {
      if (mounted.current) setLoading(false);
    }
  };

  useEffect(() => {
    mounted.current = true;

    // Kiểm tra session khi ứng dụng khởi chạy
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchProfile(session.user);
      } else {
        if (mounted.current) setLoading(false);
      }
    });

    // Lắng nghe sự thay đổi trạng thái đăng nhập (Realtime Auth)
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (mounted.current) {
        if ((event === 'SIGNED_IN' || event === 'USER_UPDATED') && session?.user) {
          fetchProfile(session.user);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setIsAdmin(false);
          setLoading(false);
        }
      }
    });

    return () => {
      mounted.current = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  // --- CÁC HÀM TIỆN ÍCH ---

  const signIn = async (email: string, password: string) => {
    return await supabase.auth.signInWithPassword({ email, password });
  };

  const signUp = async (email: string, password: string, name: string, studentId: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name, student_id: studentId } },
    });

    if (error) return { error };

    if (data.user) {
      // Tạo profile mặc định trong Database
      await supabase.from('profiles').insert({
        id: data.user.id,
        name: name,
        student_id: studentId,
        email: email,
        avatar_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`,
        role: 'user',
        is_verified: false,
        banned: false // Mặc định không bị khóa
      });
    }
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
    <AuthContext.Provider value={{ user, loading, isAdmin, signIn, signUp, signOut, resetPassword, updatePassword }}>
      {!loading ? children : (
        <div className="h-screen flex items-center justify-center bg-gray-50">
          <div className="flex flex-col items-center">
             <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mb-4"></div>
             <p className="text-gray-500 font-bold animate-pulse">Đang xác thực hệ thống...</p>
          </div>
        </div>
      )}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);