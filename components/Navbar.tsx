import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  LogIn, PlusCircle, Home, ShoppingBag, 
  User, LogOut, ShieldCheck, Heart, Package 
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from './LanguageSwitcher'; 
import NotificationMenu from './NotificationMenu'; // <--- IMPORT COMPONENT MỚI
import bkLogo from '../assets/logo.jpg'; 

const Navbar: React.FC = () => {
  const { user, signOut, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  const userMenuRef = useRef<HTMLDivElement>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const isActive = (path: string) => location.pathname === path 
    ? 'text-[#034EA2] border-[#034EA2] font-bold' 
    : 'text-gray-500 border-transparent hover:text-gray-900 hover:border-gray-300';

  // Xử lý đóng User Menu khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (userMenuRef.current && !userMenuRef.current.contains(target)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await signOut();
    setShowUserMenu(false);
    navigate('/auth');
  };

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          
          {/* --- LEFT SIDE: LOGO & LINKS --- */}
          <div className="flex">
            <Link to="/" className="flex-shrink-0 flex items-center group">
              <img 
                src={bkLogo} 
                alt="Logo BK" 
                className="h-10 w-auto object-contain transition-transform group-hover:scale-105" 
              />
              <div className="ml-3 flex flex-col justify-center">
                <span className="text-xl font-black text-[#034EA2] leading-none tracking-tight group-hover:text-[#003875] transition-colors">BK MARKET</span>
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest hidden md:block">Chợ sinh viên</span>
              </div>
            </Link>
            
            <div className="hidden sm:ml-10 sm:flex sm:space-x-8">
              <Link to="/" className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-all ${isActive('/')}`}>
                {t('nav.home')}
              </Link>
              <Link to="/market" className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-all ${isActive('/market')}`}>
                {t('nav.market')}
              </Link>
              <Link to="/chat" className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-all ${isActive('/chat')}`}>
                {t('nav.chat')}
              </Link>
            </div>
          </div>
          
          {/* --- RIGHT SIDE: ACTIONS --- */}
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="hidden sm:block">
              <LanguageSwitcher />
            </div>

            <Link to="/post" className="hidden sm:inline-flex items-center px-4 py-2 border border-transparent text-sm font-bold rounded-xl text-white bg-[#034EA2] hover:bg-[#003875] shadow-md hover:shadow-lg transition-all active:scale-95">
              <PlusCircle className="h-4 w-4 mr-2" /> {t('nav.post')}
            </Link>

            {user ? (
              <div className="flex items-center gap-1 sm:gap-3">
                
                {/* Saved Items */}
                <Link 
                  to={location.pathname === '/saved' ? '/market' : '/saved'} 
                  className="hidden sm:block p-2 rounded-full text-gray-500 hover:bg-gray-100 transition-colors" 
                  title={location.pathname === '/saved' ? "Quay lại chợ" : "Tin đã lưu"}
                >
                  <Heart className={`h-6 w-6 ${location.pathname === '/saved' ? 'text-red-500 fill-red-500' : ''}`} />
                </Link>

                {/* ========================================= */}
                {/* 🔥 THAY THẾ TOÀN BỘ LOGIC NOTI CŨ Ở ĐÂY 🔥 */}
                {/* ========================================= */}
                <NotificationMenu />
                {/* ========================================= */}

                {/* User Menu Dropdown */}
                <div className="relative" ref={userMenuRef}>
                  <button 
                    onClick={() => setShowUserMenu(!showUserMenu)} 
                    className="flex items-center p-0.5 rounded-full border-2 border-transparent hover:border-blue-200 transition-all focus:outline-none ml-1"
                  >
                    <img 
                      className="h-9 w-9 rounded-full object-cover bg-gray-100 shadow-sm border border-gray-200" 
                      src={user.avatar || `https://ui-avatars.com/api/?name=${user.name}&background=random`} 
                      alt="User profile" 
                    />
                  </button>
                  
                  {showUserMenu && (
                    <div className="absolute right-0 mt-2 w-64 rounded-xl shadow-2xl py-1 bg-white ring-1 ring-black ring-opacity-5 z-50 border border-gray-100 animate-in fade-in slide-in-from-top-2">
                      <div className="px-4 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-white">
                        <p className="text-[10px] font-bold text-[#034EA2] uppercase tracking-wider mb-1">{t('nav.login_as')}</p>
                        <p className="text-sm font-black text-gray-900 truncate">{user.name}</p>
                        <p className="text-xs text-gray-500 truncate">{user.email}</p>
                      </div>
                      
                      <div className="py-2">
                        <Link to="/profile" className="flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-[#034EA2] transition-colors" onClick={() => setShowUserMenu(false)}>
                          <User className="w-4 h-4 mr-3 text-gray-400" /> {t('nav.profile')}
                        </Link>

                        <Link to="/my-items" className="flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-[#034EA2] transition-colors" onClick={() => setShowUserMenu(false)}>
                          <Package className="w-4 h-4 mr-3 text-gray-400" /> Quản lý tin đăng
                        </Link>

                        <Link to="/saved" className="flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-[#034EA2] transition-colors" onClick={() => setShowUserMenu(false)}>
                          <Heart className="w-4 h-4 mr-3 text-gray-400" /> Tin đã lưu
                        </Link>
                        
                        {isAdmin && (
                          <Link to="/admin" className="flex items-center px-4 py-2.5 text-sm text-purple-700 hover:bg-purple-50 font-bold transition-colors" onClick={() => setShowUserMenu(false)}>
                            <ShieldCheck className="w-4 h-4 mr-3 text-purple-500" /> {t('nav.admin')}
                          </Link>
                        )}
                      </div>

                      <div className="border-t border-gray-100 mt-1 pt-1">
                        <button onClick={handleLogout} className="flex w-full items-center px-4 py-3 text-sm text-red-600 hover:bg-red-50 font-bold transition-colors">
                          <LogOut className="w-4 h-4 mr-3" /> {t('nav.logout')}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <Link to="/auth" className="inline-flex items-center px-6 py-2 border border-transparent text-sm font-bold rounded-xl text-white bg-[#034EA2] hover:bg-[#003875] shadow-md transition-all active:scale-95">
                <LogIn className="h-4 w-4 mr-2" /> {t('nav.login')}
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* MOBILE BOTTOM BAR */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around items-center py-2 z-40 pb-safe shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
        <Link to="/" className={`flex flex-col items-center p-2 transition-colors ${location.pathname === '/' ? 'text-[#034EA2]' : 'text-gray-400'}`}>
          <Home className="h-6 w-6" /><span className="text-[10px] mt-1 font-medium">{t('nav.home')}</span>
        </Link>
        <Link to="/market" className={`flex flex-col items-center p-2 transition-colors ${location.pathname === '/market' ? 'text-[#034EA2]' : 'text-gray-400'}`}>
          <ShoppingBag className="h-6 w-6" /><span className="text-[10px] mt-1 font-medium">{t('nav.market')}</span>
        </Link>
        
        <Link to="/post" className="flex flex-col items-center -mt-8">
          <div className="bg-[#034EA2] text-white p-3.5 rounded-full shadow-xl border-4 border-white active:scale-90 transition-transform hover:shadow-2xl">
            <PlusCircle className="h-6 w-6" />
          </div>
          <span className="text-[10px] mt-1 font-bold text-[#034EA2]">{t('nav.post')}</span>
        </Link>

        <Link 
          to={location.pathname === '/saved' ? '/market' : '/saved'} 
          className={`flex flex-col items-center p-2 transition-colors ${location.pathname === '/saved' ? 'text-[#034EA2]' : 'text-gray-400'}`}
        >
          <Heart className={`h-6 w-6 ${location.pathname === '/saved' ? 'fill-current' : ''}`} />
          <span className="text-[10px] mt-1 font-medium">{location.pathname === '/saved' ? t('nav.market') : (t('nav.saved') || 'Đã lưu')}</span>
        </Link>
        
        <Link to={user ? "/profile" : "/auth"} className={`flex flex-col items-center p-2 transition-colors ${location.pathname === '/profile' || location.pathname === '/my-items' ? 'text-[#034EA2]' : 'text-gray-400'}`}>
          <User className="h-6 w-6" />
          <span className="text-[10px] mt-1 font-medium">{user ? t('nav.profile') : t('nav.login')}</span>
        </Link>
      </div>
    </nav>
  );
};

export default Navbar;
