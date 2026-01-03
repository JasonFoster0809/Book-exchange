import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { supabase } from '../services/supabase';
import { User, DBProfile } from '../types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  isRestricted: boolean; // Trạng thái có đang mang huy hiệu/bị phạt không
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
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', sessionUser.id)
        .single();

      if (error) throw error;

      if (data && mounted.current) {
        // Ép kiểu để nhận diện các cột xử phạt mới
        const profile = data as DBProfile & { banned?: boolean, ban_until?: string | null };

        // 1. KIỂM TRA BAN VĨNH VIỄN
        if (profile.banned === true) {
          await supabase.auth.signOut();
          setUser(null);
          setIsAdmin(false);
          setLoading(false);
          alert("Tài khoản của bạn đã bị khóa vĩnh viễn do vi phạm chính sách.");
          return;
        }

        // 2. KIỂM TRA BAN CÓ THỜI HẠN (Huy hiệu không đáng tin)
        const restrictedStatus = profile.ban_until 
          ? new Date(profile.ban_until) > new Date() 
          : false;
        setIsRestricted(restrictedStatus);

        const userRole = profile.role === 'admin' ? 'admin' : 'user';
        
        const userData: User = {
          id: profile.id,
          email: sessionUser.email,
          name: profile.name || sessionUser.user_metadata?.name || 'User',
          studentId: profile.student_id || '',
          avatar: profile.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.name || 'User')}&background=random`,
          isVerified: profile.is_verified || false,
          role: userRole,
          banUntil: profile.ban_until // Đảm bảo trong interface User đã có trường này
        };
        
        setUser(userData);
        setIsAdmin(userRole === 'admin');
      }
    } catch (error) {
      console.error("Lỗi xác thực hệ thống:", error);
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

    // Lắng nghe thay đổi trạng thái Auth
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (mounted.current) {
        if ((event === 'SIGNED_IN' || event === 'USER_UPDATED') && session?.user) {
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
        avatar_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}`,
        role: 'user',
        is_verified: false,
        banned: false,
        ban_until: null
      });
    }
    return { error: null };
  };

  // Sửa lỗi Promise<{error}> không khớp với Promise<void>
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