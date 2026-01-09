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
      // 1. Thử lấy profile từ bảng 'profiles'
      // Sử dụng maybeSingle() thay vì single() để tránh lỗi 406 nếu không tìm thấy
      let { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', sessionUser.id)
        .maybeSingle();

      // 2. LOGIC MỚI: TỰ ĐỘNG TẠO PROFILE NẾU KHÔNG TÌM THẤY
      if (!data) {
        console.warn("Profile chưa tồn tại, đang tự động tạo mới...");
        
        // Lấy thông tin từ Metadata của Auth
        const meta = sessionUser.user_metadata || {};
        const displayName = meta.full_name || meta.name || sessionUser.email?.split('@')[0] || 'User';
        
        const newProfile = {
          id: sessionUser.id,
          name: displayName,
          email: sessionUser.email,
          student_code: meta.student_code || null,
          avatar_url: meta.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=random`,
          role: 'user',
          verified_status: 'unverified',
          is_banned: false
        };

        // Insert thủ công
        const { data: createdData, error: createError } = await supabase
          .from('profiles')
          .insert(newProfile)
          .select()
          .single();

        if (createError) {
          console.error("Lỗi tự tạo profile:", createError);
          // Nếu tạo lỗi (ví dụ do RLS), ta vẫn cho đăng nhập nhưng với user tạm
          setUser({
            id: sessionUser.id,
            email: sessionUser.email,
            name: displayName,
            studentId: '',
            avatar: newProfile.avatar_url,
            isVerified: false,
            role: 'user'
          });
          if (mounted.current) setLoading(false);
          return;
        }

        data = createdData; 
      }

      if (data && mounted.current) {
        // Ép kiểu về DBProfile
        const profile = data as DBProfile; 

        // 3. KIỂM TRA BAN
        if (profile.is_banned) {
          await supabase.auth.signOut();
          setUser(null);
          setIsAdmin(false);
          setLoading(false);
          alert(`Tài khoản bị khóa: ${profile.ban_reason || 'Vi phạm chính sách'}`);
          return;
        }

        // 4. MAPPING DỮ LIỆU
        const userRole = profile.role === 'admin' ? 'admin' : 'user';
        const finalName = profile.name || 'User';
        
        const userData: User = {
          id: profile.id,
          email: sessionUser.email,
          name: finalName,
          studentId: profile.student_code || '', 
          avatar: profile.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(finalName)}&background=random`,
          isVerified: profile.verified_status === 'verified',
          role: userRole,
          banned: profile.is_banned,
          banUntil: profile.ban_until
        };
        
        setUser(userData);
        setIsAdmin(userRole === 'admin');
        setIsRestricted(false); 
      }
    } catch (error) {
      console.error("Lỗi AuthContext (Final Catch):", error);
      // Fallback cuối cùng để không crash app
      if (mounted.current) setUser(null);
    } finally {
      if (mounted.current) setLoading(false);
    }
  };

  useEffect(() => {
    mounted.current = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchProfile(session.user);
      } else {
        if (mounted.current) setLoading(false);
      }
    });

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
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { 
        data: { 
          full_name: name,
          student_code: studentId 
        } 
      },
    });
    return { error: error || null };
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
