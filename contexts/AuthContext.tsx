import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { supabase } from '../services/supabase';
import { User, DBProfile } from '../types';

// 1. Cập nhật Interface để bao gồm signIn và signUp
interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>; // Thêm dòng này
  signUp: (email: string, password: string, name: string, studentId: string) => Promise<{ error: any }>; // Thêm dòng này
  signOut: () => Promise<void>;
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
            console.warn("Chưa tìm thấy profile, dùng thông tin meta tạm thời");
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
        setUser((prev) => {
            if (!prev || prev.id !== session.user.id) {
                setLoading(true);
                fetchProfile(session.user);
            }
            return prev;
        });
      } else if (event === 'SIGNED_OUT') {
        if(mounted.current) {
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

  // 2. Thêm hàm SignIn
  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  // 3. Thêm hàm SignUp (kèm metadata để lưu tên & MSSV)
  const signUp = async (email: string, password: string, name: string, studentId: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: name,
          student_id: studentId, // Lưu ý: key này phải khớp với trigger bên Supabase nếu có
        },
      },
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setIsAdmin(false);
    setLoading(false);
  };

  // 4. Export đầy đủ các hàm trong value
  return (
    <AuthContext.Provider value={{ user, loading, isAdmin, signIn, signUp, signOut }}>
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