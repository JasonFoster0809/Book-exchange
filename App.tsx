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
import ResetPasswordPage from './pages/ResetPasswordPage'; 

import { AuthProvider, useAuth } from './contexts/AuthContext'; 
import { ToastProvider } from './contexts/ToastContext'; 
import { supabase } from './services/supabase'; 
import RoleSelectionModal from './components/RoleSelectionModal'; 

const ScrollToTop = () => {
  const { pathname } = useLocation();
  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
};

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

const AppContent = () => {
  const { user, loading } = useAuth();
  const [needsRoleSelection, setNeedsRoleSelection] = useState(false);
  const [checkingRole, setCheckingRole] = useState(false);

  useEffect(() => {
    const checkUserRole = async () => {
      if (user) {
        setCheckingRole(true);
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();
          
          if (!error && (!data?.role || data.role === '')) {
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
      
      {needsRoleSelection && (
        <RoleSelectionModal onComplete={() => setNeedsRoleSelection(false)} />
      )}

      <Navbar />
      
      <main className="flex-grow pb-20 sm:pb-0">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/market" element={<MarketplacePage />} />
          <Route path="/product/:id" element={<ProductDetailPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          
          {/* --- CÁC ROUTE ĐĂNG TIN / SỬA TIN --- */}
          {/* Route đăng mới bình thường */}
          <Route path="/post" element={<PrivateRoute><PostItemPage /></PrivateRoute>} />
          
          {/* FIX: Thêm Route nhận ID để chỉnh sửa món đồ */}
          <Route path="/edit-item/:id" element={<PrivateRoute><PostItemPage /></PrivateRoute>} />
          
          <Route path="/chat" element={<PrivateRoute><ChatPage /></PrivateRoute>} />
          <Route path="/chat/:userId" element={<PrivateRoute><ChatPage /></PrivateRoute>} />
          
          <Route path="/profile" element={<PrivateRoute><ProfilePage /></PrivateRoute>} />
          <Route path="/profile/:id" element={<PrivateRoute><ProfilePage /></PrivateRoute>} />
          
          <Route path="/my-items" element={<PrivateRoute><MyItemsPage /></PrivateRoute>} />
          
          <Route path="/saved" element={<Navigate to="/my-items?tab=saved" replace />} />
          <Route path="/admin" element={<PrivateRoute><AdminPage /></PrivateRoute>} />
          
          <Route path="/marketplace" element={<Navigate to="/market" replace />} />
          {/* Thêm redirect phòng trường hợp link cũ là /post/:id */}
          <Route path="/post/:id" element={<Navigate to="/edit-item/:id" replace />} /> 
          <Route path="/post-item" element={<Navigate to="/post" replace />} />
          <Route path="/my-listings" element={<Navigate to="/my-items" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
};

function App() {
  return (
    <HashRouter>
      <AuthProvider>
        <ToastProvider>
           <AppContent />
        </ToastProvider>
      </AuthProvider>
    </HashRouter>
  );
}

export default App;