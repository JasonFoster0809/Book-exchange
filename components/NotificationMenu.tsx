import React, { useEffect, useState, useRef } from 'react';
import { Bell, Check, Info, MessageSquare, ShoppingBag } from 'lucide-react';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { playNotificationSound } from '../utils/audio';

// Định nghĩa kiểu dữ liệu cho thông báo
interface Notification {
  id: string;
  type: 'message' | 'order_request' | 'order_confirm' | 'system';
  title: string;
  content: string;
  link: string;
  is_read: boolean;
  created_at: string;
}

const NotificationMenu = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // 1. Fetch thông báo ban đầu
  const fetchNotifications = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (data) {
      setNotifications(data);
      setUnreadCount(data.filter((n: any) => !n.is_read).length);
    }
  };

  // 2. Lắng nghe Realtime
  useEffect(() => {
    if (!user) return;
    fetchNotifications();

    const channel = supabase.channel('my_notifications')
      .on(
        'postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, 
        (payload) => {
          // Khi có thông báo mới
          const newNoti = payload.new as Notification;
          playNotificationSound(); // Phát âm thanh
          
          setNotifications(prev => [newNoti, ...prev]);
          setUnreadCount(prev => prev + 1);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  // 3. Đóng menu khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 4. Xử lý khi click vào 1 thông báo
  const handleItemClick = async (noti: Notification) => {
    // Nếu chưa đọc thì đánh dấu đã đọc
    if (!noti.is_read) {
      await supabase.from('notifications').update({ is_read: true }).eq('id', noti.id);
      setUnreadCount(prev => Math.max(0, prev - 1));
      setNotifications(prev => prev.map(n => n.id === noti.id ? { ...n, is_read: true } : n));
    }
    
    setIsOpen(false);
    
    // Điều hướng trang
    if (noti.link) {
      navigate(noti.link);
    }
  };

  // 5. Đánh dấu tất cả là đã đọc
  const markAllRead = async () => {
    if (unreadCount === 0) return;
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', user?.id).eq('is_read', false);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  // Helper: Chọn icon dựa trên loại thông báo
  const getIcon = (type: string) => {
    switch (type) {
      case 'message': return <MessageSquare size={16} className="text-blue-500" />;
      case 'order_request': return <ShoppingBag size={16} className="text-orange-500" />;
      case 'order_confirm': return <Check size={16} className="text-green-500" />;
      default: return <Info size={16} className="text-slate-500" />;
    }
  };

  return (
    <div className="relative" ref={menuRef}>
      {/* Icon Chuông trên Navbar */}
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className="p-2 text-slate-600 hover:bg-slate-100 rounded-full relative transition-all active:scale-95"
      >
        <Bell size={22} />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border-2 border-white animate-bounce shadow-sm">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Menu Xổ Xuống */}
      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-white rounded-xl shadow-2xl border border-slate-100 overflow-hidden z-[60] animate-in fade-in zoom-in-95 duration-200 origin-top-right">
          
          {/* Header của Menu */}
          <div className="p-3 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 backdrop-blur-sm">
            <h3 className="font-bold text-sm text-slate-700">Thông báo</h3>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-xs text-[#00418E] font-medium hover:underline flex items-center gap-1 hover:bg-blue-50 px-2 py-1 rounded-md transition-colors">
                <Check size={14}/> Đã đọc tất cả
              </button>
            )}
          </div>

          {/* Danh sách thông báo */}
          <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
            {notifications.length === 0 ? (
              <div className="p-8 text-center flex flex-col items-center justify-center text-slate-400">
                <Bell size={32} className="mb-2 opacity-20" />
                <p className="text-sm">Không có thông báo nào.</p>
              </div>
            ) : (
              notifications.map(noti => (
                <div 
                  key={noti.id} 
                  onClick={() => handleItemClick(noti)}
                  className={`p-4 border-b border-slate-50 cursor-pointer hover:bg-slate-50 transition-all flex gap-3 relative group ${!noti.is_read ? 'bg-blue-50/30' : 'bg-white'}`}
                >
                  {/* Chấm xanh chưa đọc */}
                  {!noti.is_read && (
                    <div className="absolute left-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-[#00418E]"></div>
                  )}

                  {/* Icon loại thông báo */}
                  <div className={`mt-1 w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-slate-100 group-hover:bg-white border border-slate-100 group-hover:border-slate-200 transition-colors`}>
                    {getIcon(noti.type)}
                  </div>

                  {/* Nội dung */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm mb-0.5 ${!noti.is_read ? 'font-bold text-slate-800' : 'font-medium text-slate-700'}`}>
                      {noti.title}
                    </p>
                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                      {noti.content}
                    </p>
                    <span className="text-[10px] text-slate-400 mt-1.5 block font-medium">
                      {new Date(noti.created_at).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'})} • {new Date(noti.created_at).toLocaleDateString('vi-VN')}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
          
          {/* Footer (Optional) */}
          <div className="p-2 bg-slate-50 text-center border-t border-slate-100">
             <button onClick={() => setIsOpen(false)} className="text-xs text-slate-500 hover:text-slate-800 font-medium">Đóng</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationMenu;
