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
import MyItemsPage from './pages/MyItemsPage'; 
import { AuthProvider, useAuth } from './contexts/AuthContext'; 
import { ToastProvider } from './contexts/ToastContext'; 
import { useTranslation } from 'react-i18next';

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

function App() {
  const { t } = useTranslation();

  return (
    <AuthProvider>
      <ToastProvider>
        <HashRouter>
          <div className="flex flex-col min-h-screen font-sans text-gray-900 bg-gray-50">
            <ScrollToTop />
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
                
                {/* Profile: Xem của mình & Xem của người khác */}
                <Route path="/profile" element={<PrivateRoute><ProfilePage /></PrivateRoute>} />
                <Route path="/profile/:id" element={<PrivateRoute><ProfilePage /></PrivateRoute>} />
                
                {/* Quản lý tin đăng (Góc của tôi) */}
                <Route path="/my-items" element={<PrivateRoute><MyItemsPage /></PrivateRoute>} />
                
                {/* --- SỬA Ở ĐÂY: Thêm ?tab=saved để MyItemsPage biết đường mở đúng tab --- */}
                <Route path="/saved" element={<Navigate to="/my-items?tab=saved" replace />} />
                
                <Route path="/admin" element={<PrivateRoute><AdminPage /></PrivateRoute>} />
                
                {/* --- REDIRECTS (Xử lý link cũ) --- */}
                <Route path="/marketplace" element={<Navigate to="/market" replace />} />
                <Route path="/post-item" element={<Navigate to="/post" replace />} />
                <Route path="/my-listings" element={<Navigate to="/my-items" replace />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>
          </div>
        </HashRouter>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;