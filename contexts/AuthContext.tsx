import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { User, DBProfile } from '../types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true); // Mặc định là đang tải
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // 1. Kiểm tra session ngay khi F5
    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          // Nếu có session, lấy thông tin profile
          await fetchProfile(session.user.id, session.user.email);
        } else {
          // Không có session -> Không phải lỗi, chỉ là chưa đăng nhập
          setLoading(false);
        }
      } catch (error) {
        console.error("Lỗi khởi tạo Auth:", error);
        setLoading(false);
      }
    };

    initAuth();

    // 2. Lắng nghe sự kiện Login/Logout
    const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setLoading(true);
        await fetchProfile(session.user.id, session.user.email);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setIsAdmin(false);
        setLoading(false);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string, email?: string) => {
    try {
      // Gọi database lấy thông tin chi tiết
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (data) {
        // TRƯỜNG HỢP 1: Có dữ liệu profile đầy đủ
        const profile = data as DBProfile;
        setUser({
          id: profile.id,
          email: email,
          name: profile.name || email?.split('@')[0] || 'User', // Fallback name
          studentId: profile.student_id || '',
          avatar: profile.avatar_url || `https://ui-avatars.com/api/?name=${email}&background=random`,
          isVerified: profile.is_verified,
          role: profile.role as 'user' | 'admin'
        });
        setIsAdmin(profile.role === 'admin');
      } else {
        // TRƯỜNG HỢP 2: Đã đăng nhập nhưng chưa có trong bảng 'profiles' (Lỗi trigger hoặc delay)
        // -> Vẫn cho đăng nhập để không bị trắng màn hình
        console.warn("Không tìm thấy profile trong DB, dùng thông tin tạm.");
        setUser({
          id: userId,
          email: email,
          name: email?.split('@')[0] || 'User',
          studentId: '',
          avatar: `https://ui-avatars.com/api/?name=${email}&background=random`,
          isVerified: false,
          role: 'user'
        });
        setIsAdmin(false);
      }
    } catch (error) {
      console.error("Lỗi khi fetch profile:", error);
    } finally {
      // QUAN TRỌNG: Luôn tắt loading dù thành công hay thất bại
      setLoading(false);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setIsAdmin(false);
    // Có thể thêm navigate('/auth') ở đây nếu muốn
  };

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin, signOut }}>
      {/* Chỉ render con khi đã tải xong, tránh lỗi trắng màn hình do user null */}
      {!loading ? children : (
        <div className="h-screen flex items-center justify-center bg-gray-50">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      )}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);