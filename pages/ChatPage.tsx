import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { Send, Search, MoreVertical, Phone, Video, ArrowLeft, Image as ImageIcon, Smile, Paperclip, Circle, MessageCircle } from 'lucide-react';

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
}

interface ChatPartner {
  id: string;
  name: string;
  avatar: string;
  lastMessage?: string;
  lastMessageTime?: string;
  isOnline?: boolean;
}

const ChatPage: React.FC = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const [conversations, setConversations] = useState<ChatPartner[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [activePartner, setActivePartner] = useState<ChatPartner | null>(null);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const urlPartnerId = searchParams.get('partnerId');

  // Helper an toàn để format thời gian
  const safeFormatTime = (isoString: string | undefined) => {
      if (!isoString) return '';
      try {
          return new Date(isoString).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
      } catch (e) { return ''; }
  };

  // 1. Fetch Conversations (Danh sách chat)
  useEffect(() => {
    if (!user) return;
    const fetchConversations = async () => {
      try {
          // Lấy tin nhắn liên quan đến mình
          const { data: allMsg, error } = await supabase
              .from('messages')
              .select(`
                *,
                sender:sender_id(id, name, avatar_url),
                receiver:receiver_id(id, name, avatar_url)
              `)
              .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
              .order('created_at', { ascending: false });

          if (error) throw error;

          const partnerMap = new Map<string, ChatPartner>();

          if (allMsg) {
              allMsg.forEach((msg: any) => {
                  // Xác định ai là đối phương
                  const isMeSender = msg.sender_id === user.id;
                  // Kiểm tra null an toàn (quan trọng để tránh crash)
                  const partnerData = isMeSender ? msg.receiver : msg.sender;
                  
                  if (partnerData && !partnerMap.has(partnerData.id)) {
                      partnerMap.set(partnerData.id, {
                          id: partnerData.id,
                          name: partnerData.name || 'Người dùng',
                          avatar: partnerData.avatar_url || 'https://via.placeholder.com/150',
                          lastMessage: msg.content,
                          lastMessageTime: msg.created_at,
                          isOnline: false // Giả lập
                      });
                  }
              });
          }
          setConversations(Array.from(partnerMap.values()));
      } catch (err) {
          console.error("Lỗi tải chat:", err);
      } finally {
          setLoading(false);
      }
    };
    fetchConversations();
  }, [user]);

  // 2. Xử lý URL Partner ID (Mở chat từ link)
  useEffect(() => {
    const handleUrlPartner = async () => {
        if (!urlPartnerId || !user) return;
        
        // Tìm trong danh sách đã có
        const existing = conversations.find(c => c.id === urlPartnerId);
        if (existing) {
            setActivePartner(existing);
        } else {
            // Nếu chưa có, fetch thông tin user đó
            try {
                const { data } = await supabase.from('profiles').select('*').eq('id', urlPartnerId).single();
                if (data) {
                    setActivePartner({
                        id: data.id,
                        name: data.name || 'Người dùng',
                        avatar: data.avatar_url || 'https://via.placeholder.com/150',
                        lastMessage: '',
                        lastMessageTime: ''
                    });
                }
            } catch (e) { console.error(e); }
        }
    };
    if (!loading) handleUrlPartner();
  }, [urlPartnerId, conversations, user, loading]);

  // 3. Fetch Tin nhắn chi tiết & Realtime
  useEffect(() => {
    if (!activePartner || !user) return;

    const fetchMessages = async () => {
        const { data } = await supabase
            .from('messages')
            .select('*')
            .or(`and(sender_id.eq.${user.id},receiver_id.eq.${activePartner.id}),and(sender_id.eq.${activePartner.id},receiver_id.eq.${user.id})`)
            .order('created_at', { ascending: true });
        
        if (data) setMessages(data);
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    };
    fetchMessages();

    // Realtime Subscription
    const channel = supabase.channel('chat_room')
        .on('postgres_changes', { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'messages',
            filter: `receiver_id=eq.${user.id}` 
        }, (payload) => {
            const newMsg = payload.new as Message;
            if (newMsg.sender_id === activePartner.id) {
                setMessages(prev => [...prev, newMsg]);
                setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
            } else {
                addToast(`Có tin nhắn mới!`, 'info');
            }
        })
        .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [activePartner, user]);

  const handleSendMessage = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!inputMessage.trim() || !user || !activePartner) return;

      const content = inputMessage.trim();
      setInputMessage('');
      setSending(true);

      // UI Update ngay lập tức (Optimistic)
      const tempMsg: Message = {
          id: Math.random().toString(),
          sender_id: user.id,
          receiver_id: activePartner.id,
          content: content,
          created_at: new Date().toISOString()
      };
      setMessages(prev => [...prev, tempMsg]);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);

      // Gửi Server
      const { error } = await supabase.from('messages').insert({
          sender_id: user.id,
          receiver_id: activePartner.id,
          content: content
      });

      if (error) {
          addToast("Lỗi gửi tin: " + error.message, "error");
      }
      setSending(false);
  };

  if (!user) return <div className="p-20 text-center">Vui lòng đăng nhập.</div>;

  return (
    <div className="h-[calc(100vh-64px)] bg-gray-100 flex overflow-hidden">
      
      {/* SIDEBAR DANH SÁCH */}
      <div className={`w-full md:w-80 bg-white border-r border-gray-200 flex flex-col ${activePartner ? 'hidden md:flex' : 'flex'}`}>
          <div className="p-4 border-b border-gray-100 sticky top-0 bg-white z-10">
              <h2 className="text-xl font-bold text-gray-800">Tin nhắn</h2>
              <div className="mt-2 relative bg-gray-100 rounded-full flex items-center px-4 py-2">
                  <Search className="w-4 h-4 text-gray-500 mr-2"/>
                  <input type="text" placeholder="Tìm người dùng..." className="bg-transparent border-none outline-none text-sm w-full"/>
              </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar">
              {loading ? <div className="p-4 text-center text-sm text-gray-400">Đang tải...</div> : 
               conversations.length === 0 ? <div className="p-8 text-center text-gray-400 text-sm">Chưa có cuộc trò chuyện nào.</div> :
               conversations.map(c => (
                  <div key={c.id} onClick={() => setActivePartner(c)} className={`flex items-center px-4 py-3 cursor-pointer hover:bg-gray-50 transition ${activePartner?.id === c.id ? 'bg-indigo-50 border-r-4 border-indigo-600' : ''}`}>
                      <img src={c.avatar} className="w-12 h-12 rounded-full object-cover border border-gray-200 mr-3" />
                      <div className="flex-1 min-w-0">
                          <div className="flex justify-between">
                              <h3 className="text-sm font-bold text-gray-900 truncate">{c.name}</h3>
                              <span className="text-[10px] text-gray-400">{safeFormatTime(c.lastMessageTime)}</span>
                          </div>
                          <p className="text-xs text-gray-500 truncate">{c.lastMessage}</p>
                      </div>
                  </div>
               ))
              }
          </div>
      </div>

      {/* CỬA SỔ CHAT */}
      {activePartner ? (
          <div className="flex-1 flex flex-col bg-white w-full">
              {/* Header */}
              <div className="h-16 border-b border-gray-200 flex items-center justify-between px-4 bg-white shadow-sm z-20">
                  <div className="flex items-center">
                      <button onClick={() => setActivePartner(null)} className="md:hidden mr-2 p-2 rounded-full hover:bg-gray-100"><ArrowLeft className="w-5 h-5"/></button>
                      <Link to={`/profile/${activePartner.id}`}><img src={activePartner.avatar} className="w-10 h-10 rounded-full object-cover border" /></Link>
                      <div className="ml-3">
                          <h3 className="font-bold text-gray-900 text-sm">{activePartner.name}</h3>
                          <span className="text-xs text-green-600 flex items-center"><Circle className="w-2 h-2 fill-current mr-1"/> Online</span>
                      </div>
                  </div>
                  <div className="flex gap-2">
                      <button className="p-2 bg-indigo-50 text-indigo-600 rounded-full hover:bg-indigo-100"><Phone className="w-4 h-4"/></button>
                      <button className="p-2 bg-indigo-50 text-indigo-600 rounded-full hover:bg-indigo-100"><Video className="w-4 h-4"/></button>
                  </div>
              </div>

              {/* Message List */}
              <div className="flex-1 overflow-y-auto p-4 bg-gray-50 space-y-3 custom-scrollbar">
                  {messages.map((msg, index) => {
                      const isMe = msg.sender_id === user.id;
                      return (
                          <div key={msg.id || index} className={`flex w-full ${isMe ? 'justify-end' : 'justify-start'}`}>
                              {!isMe && <img src={activePartner.avatar} className="w-8 h-8 rounded-full mr-2 self-end mb-1"/>}
                              <div className={`max-w-[75%] px-4 py-2 rounded-2xl text-sm ${isMe ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-white text-gray-800 border border-gray-200 rounded-bl-none'}`}>
                                  {msg.content}
                                  <div className={`text-[9px] text-right mt-1 ${isMe ? 'text-indigo-200' : 'text-gray-400'}`}>{safeFormatTime(msg.created_at)}</div>
                              </div>
                          </div>
                      );
                  })}
                  <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-gray-200 flex items-center gap-2">
                  <div className="flex gap-1">
                      <button type="button" className="p-2 text-gray-400 hover:text-indigo-600"><ImageIcon className="w-5 h-5"/></button>
                      <button type="button" className="p-2 text-gray-400 hover:text-indigo-600"><Paperclip className="w-5 h-5"/></button>
                  </div>
                  <input 
                      type="text" 
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      placeholder="Nhập tin nhắn..." 
                      className="flex-1 bg-gray-100 border-none rounded-full px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                  <button disabled={!inputMessage.trim() || sending} className="bg-indigo-600 text-white p-2.5 rounded-full hover:bg-indigo-700 disabled:opacity-50 transition">
                      <Send className="w-4 h-4 ml-0.5" />
                  </button>
              </form>
          </div>
      ) : (
          <div className="hidden md:flex flex-1 flex-col items-center justify-center bg-gray-50 text-center p-8">
              <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm">
                  <MessageCircle className="w-12 h-12 text-indigo-300" />
              </div>
              <h2 className="text-xl font-bold text-gray-800">Chào, {user.name}!</h2>
              <p className="text-gray-500 mt-2">Chọn một cuộc hội thoại để bắt đầu nhắn tin.</p>
          </div>
      )}
    </div>
  );
};

export default ChatPage;