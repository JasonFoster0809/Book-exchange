import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';
import { useSearchParams, Link } from 'react-router-dom';
import { Send, Image as ImageIcon, MoreVertical, MapPin, Clock, Calendar, CheckCircle, MessageCircle } from 'lucide-react'; 
// 1. IMPORT HÀM PHÁT ÂM THANH
import { playMessageSound } from '../utils/audio';

// Danh sách địa điểm an toàn
const SAFE_LOCATIONS = [
    "Thư viện Trung tâm",
    "Canteen B1",
    "Sảnh tòa nhà A",
    "Cổng chính (Cổng 1)",
    "Nhà xe sinh viên",
    "Ghế đá hồ nước"
];

const ChatPage: React.FC = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const partnerId = searchParams.get('partnerId');
  
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeConversation, setActiveConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [partnerProfile, setPartnerProfile] = useState<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // State cho Modal Hẹn gặp
  const [showMeetupModal, setShowMeetupModal] = useState(false);
  const [meetupLocation, setMeetupLocation] = useState(SAFE_LOCATIONS[0]);
  const [meetupTime, setMeetupTime] = useState('');

  useEffect(() => {
     if(user) fetchConversations();
  }, [user]);

  // Logic kiểm tra khi có partnerId từ URL
  useEffect(() => {
     if (partnerId && user) {
         checkAndCreateConversation(partnerId);
     }
  }, [partnerId, user, conversations.length]);

  // --- LOGIC REALTIME NHẬN TIN NHẮN & ÂM THANH ---
  useEffect(() => {
    if (activeConversation) {
        fetchMessages(activeConversation);
        
        const channel = supabase.channel(`chat:${activeConversation}`)
            .on('postgres_changes', { 
                event: 'INSERT', 
                schema: 'public', 
                table: 'messages', 
                filter: `conversation_id=eq.${activeConversation}` 
            }, 
            (payload) => {
                const newMsg = payload.new;
                setMessages(prev => [...prev, newMsg]);

                // 2. KÍCH HOẠT ÂM THANH
                // Chỉ kêu nếu người gửi KHÔNG PHẢI LÀ MÌNH
                if (user && newMsg.sender_id !== user.id) {
                    console.log("🔊 Tin nhắn mới -> Ting!");
                    playMessageSound();
                }
            })
            .subscribe();
            
        return () => { supabase.removeChannel(channel); };
    }
  }, [activeConversation, user]); // Thêm user vào dependency

  useEffect(() => {
      scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchConversations = async () => {
      if (!user) return;
      
      const { data } = await supabase
          .from('conversations')
          .select(`
            *, 
            p1:profiles!participant1(name, avatar_url), 
            p2:profiles!participant2(name, avatar_url)
          `)
          .or(`participant1.eq.${user.id},participant2.eq.${user.id}`);
      
      if(data) {
          const formatted = data.map((c: any) => {
              const isP1 = c.participant1 === user.id;
              const partnerData = isP1 ? c.p2 : c.p1;
              return {
                  ...c,
                  partnerName: partnerData?.name || "Người dùng",
                  partnerAvatar: partnerData?.avatar_url || "https://via.placeholder.com/40",
                  partnerId: isP1 ? c.participant2 : c.participant1
              };
          });
          setConversations(formatted);
          return formatted;
      }
      return [];
  };

  const checkAndCreateConversation = async (pId: string) => {
      if (!user || user.id === pId) return;

      let currentList = conversations;
      if (currentList.length === 0) {
          currentList = await fetchConversations() || [];
      }

      const existing = currentList.find((c: any) => 
          (c.participant1 === user.id && c.participant2 === pId) ||
          (c.participant1 === pId && c.participant2 === user.id)
      );

      if (existing) {
          setActiveConversation(existing.id);
          fetchPartnerInfo(pId);
      } else {
          const { data: newConv, error } = await supabase
              .from('conversations')
              .insert({ participant1: user.id, participant2: pId })
              .select()
              .single();
          
          if (newConv) {
              await fetchConversations();
              setActiveConversation(newConv.id);
              fetchPartnerInfo(pId);
          } else if (error) {
              console.error("Lỗi tạo chat:", error);
              fetchConversations();
          }
      }
  };

  const fetchPartnerInfo = async (pId: string) => {
      const { data } = await supabase.from('profiles').select('*').eq('id', pId).single();
      setPartnerProfile(data);
  };

  const fetchMessages = async (convId: string) => {
      const { data } = await supabase.from('messages').select('*').eq('conversation_id', convId).order('created_at', { ascending: true });
      if (data) setMessages(data);
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!newMessage.trim() || !activeConversation || !user) return;

    await supabase.from('messages').insert({
        conversation_id: activeConversation,
        sender_id: user.id,
        content: newMessage,
        type: 'text'
    });
    setNewMessage('');
  };

  const handleSendMeetup = async () => {
      if (!activeConversation || !user || !meetupTime) {
          alert("Vui lòng chọn thời gian!");
          return;
      }
      
      const meetupContent = `📅 LỊCH HẸN GIAO DỊCH\n📍 Tại: ${meetupLocation}\n⏰ Lúc: ${meetupTime}`;

      await supabase.from('messages').insert({
          conversation_id: activeConversation,
          sender_id: user.id,
          content: meetupContent,
          type: 'text'
      });

      setShowMeetupModal(false);
      setMeetupTime('');
  };

  const isMeetupMessage = (content: string) => content.startsWith('📅 LỊCH HẸN GIAO DỊCH');

  return (
    <div className="max-w-6xl mx-auto h-[calc(100vh-64px)] flex bg-white border-x border-gray-200">
      
      {/* SIDEBAR DANH SÁCH CHAT */}
      <div className={`w-full md:w-1/3 border-r border-gray-200 flex flex-col ${activeConversation ? 'hidden md:flex' : 'flex'}`}>
         <div className="p-4 border-b border-gray-100 bg-gray-50">
             <h2 className="font-bold text-lg text-gray-800">Tin nhắn</h2>
         </div>
         <div className="flex-1 overflow-y-auto">
             {conversations.map(conv => (
                 <div 
                    key={conv.id} 
                    onClick={() => { 
                        setActiveConversation(conv.id); 
                        fetchPartnerInfo(conv.partnerId); 
                    }}
                    className={`p-4 flex items-center gap-3 cursor-pointer hover:bg-gray-50 transition ${activeConversation === conv.id ? 'bg-indigo-50' : ''}`}
                 >
                     <img src={conv.partnerAvatar} className="w-12 h-12 rounded-full border border-gray-200 object-cover"/>
                     <div>
                         <p className="font-bold text-gray-900">{conv.partnerName}</p>
                         <p className="text-xs text-gray-500 truncate">Bấm để xem tin nhắn</p>
                     </div>
                 </div>
             ))}
             {conversations.length === 0 && <p className="text-gray-400 text-center mt-10 text-sm">Chưa có tin nhắn nào</p>}
         </div>
      </div>

      {/* KHUNG CHAT CHÍNH */}
      <div className={`flex-1 flex flex-col ${!activeConversation ? 'hidden md:flex' : 'flex'}`}>
          {activeConversation ? (
              <>
                  {/* Chat Header */}
                  <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-white shadow-sm z-10">
                      <div className="flex items-center gap-3">
                          <button onClick={() => setActiveConversation(null)} className="md:hidden text-gray-500 mr-2">←</button>
                          {partnerProfile && (
                              <Link to={`/profile/${partnerProfile.id}`} className="flex items-center gap-3 hover:opacity-80">
                                  <img src={partnerProfile.avatar_url || 'https://via.placeholder.com/40'} className="w-10 h-10 rounded-full border" />
                                  <div>
                                      <p className="font-bold text-gray-900">{partnerProfile.name}</p>
                                      {partnerProfile.is_verified && <span className="text-[10px] text-blue-600 bg-blue-50 px-1.5 rounded border border-blue-100">Đã xác thực</span>}
                                  </div>
                              </Link>
                          )}
                      </div>
                      <button className="text-gray-400 hover:text-gray-600"><MoreVertical size={20}/></button>
                  </div>

                  {/* Messages List */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                      {messages.map((msg, idx) => {
                          const isMe = msg.sender_id === user?.id;
                          const isMeetup = isMeetupMessage(msg.content);

                          return (
                              <div key={idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                  {!isMe && <img src={partnerProfile?.avatar_url} className="w-8 h-8 rounded-full mr-2 mt-1"/>}
                                  
                                  <div className={`max-w-[70%] rounded-2xl px-4 py-2 shadow-sm ${
                                      isMeetup 
                                        ? (isMe ? 'bg-indigo-600 text-white' : 'bg-white border-2 border-indigo-100 text-gray-800') 
                                        : (isMe ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-800')
                                  }`}>
                                      {isMeetup ? (
                                          <div className="flex flex-col gap-1">
                                              <div className="flex items-center font-bold border-b border-white/20 pb-1 mb-1">
                                                  <Calendar className="w-4 h-4 mr-2"/> LỜI MỜI GIAO DỊCH
                                              </div>
                                              <div className="text-sm">
                                                  {msg.content.replace('📅 LỊCH HẸN GIAO DỊCH\n', '').split('\n').map((line:string, i:number) => (
                                                      <p key={i} className="mb-0.5">{line}</p>
                                                  ))}
                                              </div>
                                              {!isMe && (
                                                  <div className="mt-2 pt-2 border-t border-gray-100 text-center">
                                                      <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-full">Hãy xác nhận lại với người bán</span>
                                                  </div>
                                              )}
                                          </div>
                                      ) : (
                                          <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
                                      )}
                                      <p className={`text-[10px] mt-1 text-right ${isMe ? 'text-blue-100' : 'text-gray-400'}`}>
                                          {new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                      </p>
                                  </div>
                              </div>
                          );
                      })}
                      <div ref={scrollRef} />
                  </div>

                  {/* Input Area */}
                  <div className="p-3 bg-white border-t border-gray-200">
                      <form onSubmit={handleSendMessage} className="flex gap-2 items-end">
                          <button 
                            type="button" 
                            className="p-3 text-gray-500 hover:bg-gray-100 rounded-full transition"
                            title="Gửi ảnh (Demo)"
                          >
                              <ImageIcon size={20}/>
                          </button>
                          
                          <button 
                            type="button" 
                            onClick={() => setShowMeetupModal(true)}
                            className="p-3 text-indigo-600 hover:bg-indigo-50 rounded-full transition"
                            title="Tạo lịch hẹn giao dịch"
                          >
                              <Calendar size={20}/>
                          </button>

                          <div className="flex-1 relative">
                              <input 
                                  type="text" 
                                  value={newMessage}
                                  onChange={(e) => setNewMessage(e.target.value)}
                                  placeholder="Nhập tin nhắn..." 
                                  className="w-full border border-gray-300 rounded-full py-3 px-4 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-gray-50"
                              />
                          </div>
                          <button type="submit" disabled={!newMessage.trim()} className="p-3 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 disabled:opacity-50 transition shadow-md">
                              <Send size={20} />
                          </button>
                      </form>
                  </div>
              </>
          ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-300 bg-gray-50">
                  <MessageCircle size={64} className="mb-4 opacity-50"/>
                  <p className="text-lg">Chọn một cuộc hội thoại để bắt đầu</p>
              </div>
          )}
      </div>

      {/* MODAL TẠO LỊCH HẸN */}
      {showMeetupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden">
                <div className="bg-indigo-600 p-4 text-white flex justify-between items-center">
                    <h3 className="font-bold flex items-center"><Calendar className="mr-2"/> Hẹn gặp giao dịch</h3>
                    <button onClick={() => setShowMeetupModal(false)} className="hover:bg-indigo-700 p-1 rounded"><span className="text-xl">&times;</span></button>
                </div>
                
                <div className="p-5 space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1 flex items-center"><MapPin size={16} className="mr-1"/> Địa điểm</label>
                        <select 
                            value={meetupLocation}
                            onChange={(e) => setMeetupLocation(e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                        >
                            {SAFE_LOCATIONS.map(loc => <option key={loc} value={loc}>{loc}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1 flex items-center"><Clock size={16} className="mr-1"/> Thời gian</label>
                        <input 
                            type="time" 
                            value={meetupTime}
                            onChange={(e) => setMeetupTime(e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                        />
                    </div>
                    
                    <button 
                        onClick={handleSendMeetup}
                        className="w-full bg-indigo-600 text-white font-bold py-3 rounded-lg hover:bg-indigo-700 transition flex justify-center items-center shadow-md mt-2"
                    >
                        <Send size={18} className="mr-2"/> Gửi lời mời
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default ChatPage;