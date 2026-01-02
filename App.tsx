import React, { useEffect, useState } from 'react';
import { HashRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import HomePage from './pages/HomePage';
import MarketplacePage from './pages/MarketplacePage';
import ProductDetailPage from './pages/ProductDetailPage';
import PostItemPage from './pages/PostItemPage';
import ChatPage from './pages/ChatPage';
import ProfilePage from './pages/ProfilePage';
import AuthPage from './pages/AuthPage'; 
import AdminPage from './pages/AdminPage';
import MyItemsPage from './pages/MyItemsPage'; 
// Import Contexts & Services
import { AuthProvider, useAuth } from './contexts/AuthContext'; 
import { ToastProvider } from './contexts/ToastContext'; 
import { supabase } from './services/supabase'; 
// Import Component Modal mới làm
import RoleSelectionModal from './components/RoleSelectionModal'; 

// Component cuộn lên đầu trang khi chuyển trang
const ScrollToTop = () => {
  const { pathname } = useLocation();
  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
};

// Route bảo vệ (Chỉ cho user đã đăng nhập)
const PrivateRoute = ({ children }: { children: JSX.Element }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#034EA2]"></div>
      </div>
    );
  }
  
  return user ? children : <Navigate to="/auth" replace />;
};

// --- COMPONENT CON: Chứa toàn bộ Logic & Giao diện ---
const AppContent = () => {
  const { user, loading } = useAuth();
  const [needsRoleSelection, setNeedsRoleSelection] = useState(false);
  const [checkingRole, setCheckingRole] = useState(false);

  // LOGIC: Kiểm tra xem user đã chọn vai trò (Sinh viên/Người ngoài) chưa
  useEffect(() => {
    const checkUserRole = async () => {
      if (user) {
        setCheckingRole(true);
        try {
          // Lấy thông tin profile
          const { data, error } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();
          
          // Nếu chưa có role (null hoặc rỗng) -> Hiện Modal
          if (!error && (!data.role || data.role === '')) {
            setNeedsRoleSelection(true);
          } else {
            setNeedsRoleSelection(false);
          }
        } catch (e) {
          console.error("Error checking role:", e);
        } finally {
          setCheckingRole(false);
        }
      } else {
        setNeedsRoleSelection(false);
        setCheckingRole(false);
      }
    };

    checkUserRole();
  }, [user]);

  // Màn hình chờ khi đang tải Auth hoặc đang check Role
  if (loading || checkingRole) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#034EA2]"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen font-sans text-gray-900 bg-gray-50">
      <ScrollToTop />
      
      {/* MODAL CHỌN ROLE: Sẽ hiện đè lên tất cả nếu user chưa có role */}
      {needsRoleSelection && (
        <RoleSelectionModal onComplete={() => setNeedsRoleSelection(false)} />
      )}

      <Navbar />
      
      <main className="flex-grow pb-20 sm:pb-0">
        <Routes>
          {/* --- CÁC TRANG PUBLIC --- */}
          <Route path="/" element={<HomePage />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/market" element={<MarketplacePage />} />
          <Route path="/product/:id" element={<ProductDetailPage />} />
          
          {/* --- CÁC TRANG CẦN ĐĂNG NHẬP --- */}
          <Route path="/post" element={<PrivateRoute><PostItemPage /></PrivateRoute>} />
          
          {/* Chat */}
          <Route path="/chat" element={<PrivateRoute><ChatPage /></PrivateRoute>} />
          <Route path="/chat/:userId" element={<PrivateRoute><ChatPage /></PrivateRoute>} />
          
          {/* Profile */}
          <Route path="/profile" element={<PrivateRoute><ProfilePage /></PrivateRoute>} />
          <Route path="/profile/:id" element={<PrivateRoute><ProfilePage /></PrivateRoute>} />
          
          {/* Quản lý tin đăng */}
          <Route path="/my-items" element={<PrivateRoute><MyItemsPage /></PrivateRoute>} />
          
          {/* Redirects */}
          <Route path="/saved" element={<Navigate to="/my-items?tab=saved" replace />} />
          <Route path="/admin" element={<PrivateRoute><AdminPage /></PrivateRoute>} />
          
          {/* Link cũ redirects */}
          <Route path="/marketplace" element={<Navigate to="/market" replace />} />
          <Route path="/post-item" element={<Navigate to="/post" replace />} />
          <Route path="/my-listings" element={<Navigate to="/my-items" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
};

// --- COMPONENT CHÍNH: Chỉ chứa các Providers ---
function App() {
  return (
    <HashRouter>
      <AuthProvider>
        <ToastProvider>
           {/* Gọi AppContent ở trong để sử dụng được useAuth */}
           <AppContent />
        </ToastProvider>
      </AuthProvider>
    </HashRouter>
  );
}

export default App;