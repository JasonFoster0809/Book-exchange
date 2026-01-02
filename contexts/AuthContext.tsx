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
  // --- THÊM 2 HÀM MỚI ---
  resetPassword: (email: string) => Promise<{ error: any }>;
  updatePassword: (newPassword: string) => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;

    const fetchProfile = async (sessionUser: any) => {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', sessionUser.id)
          .single();

        if (data) {
          const profile = data as DBProfile;
          const userData: User = {
            id: profile.id,
            email: sessionUser.email,
            name: profile.name || sessionUser.user_metadata?.name || 'User',
            studentId: profile.student_id || '',
            avatar: profile.avatar_url || sessionUser.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${profile.name || 'User'}`,
            isVerified: profile.is_verified,
            role: profile.role as 'user' | 'admin'
          };
          
          if(mounted.current) {
            setUser(userData);
            setIsAdmin(profile.role === 'admin');
          }
        } else {
            if(mounted.current) {
                setUser({
                    id: sessionUser.id,
                    email: sessionUser.email,
                    name: sessionUser.user_metadata?.name || sessionUser.email?.split('@')[0],
                    studentId: sessionUser.user_metadata?.student_id || '',
                    avatar: sessionUser.user_metadata?.avatar_url || 'https://via.placeholder.com/150',
                    isVerified: false,
                    role: 'user'
                });
            }
        }
      } catch (error) {
        console.error("Lỗi fetch profile:", error);
      } finally {
        if(mounted.current) setLoading(false);
      }
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchProfile(session.user);
      } else {
        if(mounted.current) setLoading(false);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setLoading(true);
        fetchProfile(session.user);
      } else if (event === 'SIGNED_OUT') {
        if(mounted.current) {
            setUser(null);
            setIsAdmin(false);
            setLoading(false);
        }
      } else if (event === 'PASSWORD_RECOVERY') {
        // Sự kiện này kích hoạt khi user click vào link reset password từ email
        console.log("Đang trong chế độ khôi phục mật khẩu");
      }
    });

    return () => {
      mounted.current = false;
      listener.subscription.unsubscribe();
    };
  }, []);

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
        await supabase.from('profiles').insert({
            id: data.user.id,
            name: name,
            student_id: studentId,
            email: email,
            avatar_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`,
            role: 'user',
            is_verified: false
        });
    }
    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setIsAdmin(false);
    setLoading(false);
  };

  // --- HÀM 1: GỬI EMAIL KHÔI PHỤC ---
  const resetPassword = async (email: string) => {
    // Lưu ý: URL này phải trùng với URL bạn cài đặt trong Supabase Dashboard
    const resetUrl = `${window.location.origin}/#/reset-password`;
    return await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: resetUrl,
    });
  };

  // --- HÀM 2: CẬP NHẬT MẬT KHẨU MỚI ---
  const updatePassword = async (newPassword: string) => {
    return await supabase.auth.updateUser({
      password: newPassword
    });
  };

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin, signIn, signUp, signOut, resetPassword, updatePassword }}>
      {!loading ? children : (
        <div className="h-screen flex items-center justify-center bg-gray-50">
          <div className="flex flex-col items-center">
             <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mb-4"></div>
             <p className="text-gray-500 text-sm">Đang tải dữ liệu...</p>
          </div>
        </div>
      )}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);