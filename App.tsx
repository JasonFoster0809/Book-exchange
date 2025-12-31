import React from 'react';
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
import { AuthProvider, useAuth } from './contexts/AuthContext'; 
// Import ToastProvider mới tạo
import { ToastProvider } from './contexts/ToastContext'; 
// 1. THÊM IMPORT DỊCH THUẬT
import { useTranslation } from 'react-i18next';

const ScrollToTop = () => {
  const { pathname } = useLocation();
  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
};

// Component bảo vệ các Route yêu cầu đăng nhập
const PrivateRoute = ({ children }: { children: JSX.Element }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
     return <div className="min-h-screen flex items-center justify-center">Đang tải...</div>;
  }
  
  return user ? children : <Navigate to="/auth" />;
};

function App() {
  // 2. KHAI BÁO HOOK DỊCH
  const { t } = useTranslation();

  return (
    <AuthProvider>
      <ToastProvider> {/* Bọc ToastProvider ở đây để toàn bộ App dùng được thông báo */}
        <HashRouter>
          <div className="flex flex-col min-h-screen font-sans text-gray-900 bg-gray-50">
            <ScrollToTop />
            <Navbar />
            <main className="flex-grow">
              <Routes>
                {/* Public Routes */}
                <Route path="/" element={<HomePage />} />
                <Route path="/auth" element={<AuthPage />} />
                <Route path="/admin" element={<AdminPage />} />
                <Route path="/market" element={<MarketplacePage />} />
                <Route path="/product/:id" element={<ProductDetailPage />} />
                
                {/* Private Routes (Cần đăng nhập mới vào được) */}
                <Route path="/post" element={
                  <PrivateRoute>
                    <PostItemPage />
                  </PrivateRoute>
                } />
                
                <Route path="/chat" element={
                  <PrivateRoute>
                    <ChatPage />
                  </PrivateRoute>
                } />

                {/* Profile Routes */}
                {/* 1. Xem chính mình (Private) */}
                <Route path="/profile" element={
                  <PrivateRoute>
                    <ProfilePage />
                  </PrivateRoute>
                } />
                
                {/* 2. Xem người khác (Public - ai cũng xem được) */}
                <Route path="/profile/:id" element={<ProfilePage />} />
                
              </Routes>
            </main>
            <footer className="bg-white border-t border-gray-200 mt-auto">
              <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
                <p className="text-center text-sm text-gray-500">
                  {/* 3. SỬ DỤNG TỪ KHÓA DỊCH THAY VÌ TEXT CỨNG */}
                  {t('footer.copyright')}
                </p>
              </div>
            </footer>
          </div>
        </HashRouter>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;