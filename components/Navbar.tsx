import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { BookOpen, LogIn, Bell, MessageCircle, PlusCircle, Home, ShoppingBag, User, LogOut, ShieldCheck } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';
// 1. IMPORT THÊM 2 CÁI NÀY
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from './LanguageSwitcher'; 

interface Notification {
  id: string;
  content: string;
  link: string;
  is_read: boolean;
  created_at: string;
}

const Navbar: React.FC = () => {
  const { user, signOut, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  
  // 2. KHAI BÁO HOOK DỊCH THUẬT
  const { t } = useTranslation();

  // Notification State (GIỮ NGUYÊN)
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotiMenu, setShowNotiMenu] = useState(false);
  const unreadCount = notifications.filter(n => !n.is_read).length;

  const isActive = (path: string) => location.pathname === path ? 'text-indigo-600 font-semibold' : 'text-gray-500 hover:text-gray-900';

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
        setShowNotiMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!user) return;
    const fetchNotifications = async () => {
      const { data } = await supabase.from('notifications').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(10);
      if (data) setNotifications(data);
    };
    fetchNotifications();

    const channel = supabase.channel('realtime-notifications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, 
      (payload) => setNotifications(prev => [payload.new as Notification, ...prev]))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const handleRead = async (noti: Notification) => {
    if (!noti.is_read) {
      await supabase.from('notifications').update({ is_read: true }).eq('id', noti.id);
      setNotifications(prev => prev.map(n => n.id === noti.id ? { ...n, is_read: true } : n));
    }
    setShowNotiMenu(false);
    if (noti.link) navigate(noti.link);
  };

  const handleLogout = async () => {
      await signOut();
      setShowUserMenu(false);
      navigate('/auth');
  };

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo & Desktop Menu */}
          <div className="flex">
            <Link to="/" className="flex-shrink-0 flex items-center">
              <BookOpen className="h-8 w-8 text-indigo-600" />
              <span className="ml-2 text-xl font-bold text-gray-900 hidden md:block">UniMarket</span>
            </Link>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              {/* 3. THAY TEXT BẰNG t('key') */}
              <Link to="/" className={`inline-flex items-center px-1 pt-1 border-b-2 border-transparent text-sm font-medium ${isActive('/')}`}>{t('nav.home')}</Link>
              <Link to="/market" className={`inline-flex items-center px-1 pt-1 border-b-2 border-transparent text-sm font-medium ${isActive('/market')}`}>{t('nav.market')}</Link>
              <Link to="/chat" className={`inline-flex items-center px-1 pt-1 border-b-2 border-transparent text-sm font-medium ${isActive('/chat')}`}>{t('nav.chat')}</Link>
            </div>
          </div>
          
          {/* Right Side */}
          <div className="flex items-center gap-2 sm:gap-4" ref={menuRef}>
            
            {/* 4. CHÈN NÚT ĐỔI NGÔN NGỮ VÀO ĐÂY */}
            <div className="hidden sm:block">
                <LanguageSwitcher />
            </div>

            <Link to="/post" className="hidden sm:inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-colors">
              <PlusCircle className="h-4 w-4 mr-2" /> {t('nav.post')}
            </Link>

            {user ? (
              <>
                {/* Notification Bell (GIỮ NGUYÊN) */}
                <div className="relative">
                    <button onClick={() => setShowNotiMenu(!showNotiMenu)} className="p-2 rounded-full text-gray-400 hover:text-gray-500 focus:outline-none relative transition-transform active:scale-95">
                        <Bell className={`h-6 w-6 ${unreadCount > 0 ? 'text-indigo-600' : ''}`} />
                        {unreadCount > 0 && <span className="absolute top-1 right-1 h-2.5 w-2.5 bg-red-500 rounded-full ring-2 ring-white"></span>}
                    </button>
                    {showNotiMenu && (
                        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl py-2 ring-1 ring-black ring-opacity-5 max-h-96 overflow-y-auto z-50 animate-fadeIn">
                            {notifications.length === 0 ? <div className="px-4 py-4 text-center text-sm text-gray-500">Không có thông báo</div> : notifications.map(n => (
                                <div key={n.id} onClick={() => handleRead(n)} className={`px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-50 last:border-0 ${!n.is_read ? 'bg-indigo-50/50' : ''}`}>
                                    <p className="text-sm text-gray-800 line-clamp-2">{n.content}</p>
                                    <p className="text-[10px] text-gray-400 mt-1">{new Date(n.created_at).toLocaleDateString('vi-VN')}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* User Dropdown */}
                <div className="relative ml-2">
                  <button onClick={() => setShowUserMenu(!showUserMenu)} className="bg-white rounded-full flex text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 items-center">
                    <img className="h-8 w-8 rounded-full object-cover border border-gray-200" src={user.avatar || "https://via.placeholder.com/100"} alt="" />
                  </button>
                  
                  {showUserMenu && (
                    <div className="origin-top-right absolute right-0 mt-2 w-56 rounded-lg shadow-xl py-1 bg-white ring-1 ring-black ring-opacity-5 z-50 animate-fadeIn">
                      <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50">
                        <p className="text-xs text-gray-500">Đang đăng nhập là</p>
                        <p className="text-sm font-bold text-gray-900 truncate">{user.name}</p>
                      </div>
                      
                      <div className="py-1">
                        {/* 5. THÊM NÚT ĐỔI NGÔN NGỮ CHO MOBILE (HIỆN KHI MỞ MENU) */}
                        <div className="sm:hidden px-4 py-2 flex justify-between items-center">
                            <span className="text-sm text-gray-700">Ngôn ngữ:</span>
                            <LanguageSwitcher />
                        </div>

                        <Link to="/profile" className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-600" onClick={() => setShowUserMenu(false)}>
                            <User className="w-4 h-4 mr-2" /> {t('nav.profile')}
                        </Link>
                        
                        {isAdmin && (
                            <Link to="/admin" className="flex items-center px-4 py-2 text-sm text-purple-700 hover:bg-purple-50 hover:text-purple-800 font-medium" onClick={() => setShowUserMenu(false)}>
                                <ShieldCheck className="w-4 h-4 mr-2" /> {t('nav.admin')}
                            </Link>
                        )}
                      </div>

                      <div className="border-t border-gray-100 py-1">
                        <button onClick={handleLogout} className="flex w-full items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50">
                            <LogOut className="w-4 h-4 mr-2" /> {t('nav.logout')}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <Link to="/auth" className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm">
                <LogIn className="h-4 w-4 mr-2" /> {t('nav.login')}
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* MOBILE BOTTOM NAV */}
      <div className="sm:hidden fixed bottom-0 w-full bg-white border-t border-gray-200 flex justify-around py-2 z-40 pb-safe">
          <Link to="/" className={`flex flex-col items-center p-2 ${isActive('/')}`}><Home className="h-6 w-6" /><span className="text-[10px] mt-1">{t('nav.home')}</span></Link>
          <Link to="/market" className={`flex flex-col items-center p-2 ${isActive('/market')}`}><ShoppingBag className="h-6 w-6" /><span className="text-[10px] mt-1">{t('nav.market')}</span></Link>
          <Link to="/post" className={`flex flex-col items-center p-2 ${isActive('/post')}`}><div className="bg-indigo-600 text-white p-2 rounded-full -mt-6 shadow-lg border-4 border-white"><PlusCircle className="h-6 w-6" /></div></Link>
          <Link to="/chat" className={`flex flex-col items-center p-2 ${isActive('/chat')}`}><MessageCircle className="h-6 w-6" /><span className="text-[10px] mt-1">{t('nav.chat')}</span></Link>
          
          {isAdmin ? (
              <Link to="/admin" className={`flex flex-col items-center p-2 ${isActive('/admin')}`}><ShieldCheck className="h-6 w-6" /><span className="text-[10px] mt-1">{t('nav.admin')}</span></Link>
          ) : (
              <Link to={user ? "/profile" : "/auth"} className={`flex flex-col items-center p-2 ${isActive('/profile')}`}><User className="h-6 w-6" /><span className="text-[10px] mt-1">{user ? t('nav.profile') : t('nav.login')}</span></Link>
          )}
      </div>
    </nav>
  );
};

export default Navbar;