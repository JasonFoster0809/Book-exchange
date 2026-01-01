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
import MyListingsPage from './pages/MyListingsPage'; // Đảm bảo file này tồn tại
import SavedProductsPage from './pages/SavedProductsPage'; // Đảm bảo file này tồn tại
import { AuthProvider, useAuth } from './contexts/AuthContext'; 
import { ToastProvider } from './contexts/ToastContext'; 
import { useTranslation } from 'react-i18next';

const ScrollToTop = () => {
  const { pathname } = useLocation();
  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
};

// Sửa lại PrivateRoute để chắc chắn không bị loop trắng màn hình
const PrivateRoute = ({ children }: { children: JSX.Element }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
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
                <Route path="/" element={<HomePage />} />
                <Route path="/auth" element={<AuthPage />} />
                <Route path="/market" element={<MarketplacePage />} />
                <Route path="/product/:id" element={<ProductDetailPage />} />
                
                {/* Routes bảo vệ */}
                <Route path="/post" element={<PrivateRoute><PostItemPage /></PrivateRoute>} />
                <Route path="/chat" element={<PrivateRoute><ChatPage /></PrivateRoute>} />
                <Route path="/chat/:userId" element={<PrivateRoute><ChatPage /></PrivateRoute>} />
                <Route path="/profile" element={<PrivateRoute><ProfilePage /></PrivateRoute>} />
                <Route path="/my-listings" element={<PrivateRoute><MyListingsPage /></PrivateRoute>} />
                <Route path="/saved" element={<PrivateRoute><SavedProductsPage /></PrivateRoute>} />
                <Route path="/admin" element={<PrivateRoute><AdminPage /></PrivateRoute>} />
                
                {/* Redirects */}
                <Route path="/marketplace" element={<Navigate to="/market" replace />} />
                <Route path="/post-item" element={<Navigate to="/post" replace />} />
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