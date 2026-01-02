import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { useToast } from '../contexts/ToastContext';
import { 
  Send, Image as ImageIcon, MoreVertical, MapPin, 
  Calendar, CheckCircle, MessageCircle, Phone, ArrowLeft, X, Loader 
} from 'lucide-react'; 
import { playMessageSound } from '../utils/audio';

// Danh sách địa điểm gợi ý (Vẫn giữ để tiện chọn nhanh)
const SUGGESTED_LOCATIONS = [
    "Thư viện Trung tâm", "Canteen B1", "Sảnh tòa nhà A", 
    "Cổng chính (Lý Thường Kiệt)", "Nhà xe sinh viên", "Ghế đá hồ nước"
];

const ChatPage: React.FC = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const partnerId = searchParams.get('partnerId');
  
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeConversation, setActiveConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [partnerProfile, setPartnerProfile] = useState<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State mới: Upload & Location
  const [uploadingImg, setUploadingImg] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [customLocation, setCustomLocation] = useState('');

  // --- 1. LOGIC KHỞI TẠO & REALTIME ---
  useEffect(() => { if(user) fetchConversations(); }, [user]);

  useEffect(() => {
      if (partnerId && user) checkAndCreateConversation(partnerId);
  }, [partnerId, user, conversations.length]);

  useEffect(() => {
    if (activeConversation) {
        fetchMessages(activeConversation);
        const channel = supabase.channel(`chat:${activeConversation}`)
            .on('postgres_changes', { 
                event: 'INSERT', schema: 'public', table: 'messages', 
                filter: `conversation_id=eq.${activeConversation}` 
            }, (payload) => {
                setMessages(prev => [...prev, payload.new]);
                if (user && payload.new.sender_id !== user.id) {
                    playMessageSound();
                }
            })
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }
  }, [activeConversation, user]);

  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // --- 2. CÁC HÀM API ---
  const fetchConversations = async () => {
      if (!user) return;
      const { data } = await supabase.from('conversations')
          .select(`*, p1:profiles!participant1(name, avatar_url), p2:profiles!participant2(name, avatar_url)`)
          .or(`participant1.eq.${user.id},participant2.eq.${user.id}`);
      
      if(data) {
          const formatted = data.map((c: any) => {
              const isP1 = c.participant1 === user.id;
              return { ...c, partnerName: isP1 ? c.p2?.name : c.p1?.name, partnerAvatar: isP1 ? c.p2?.avatar_url : c.p1?.avatar_url, partnerId: isP1 ? c.participant2 : c.participant1 };
          });
          setConversations(formatted);
          return formatted;
      }
      return [];
  };

  const checkAndCreateConversation = async (pId: string) => {
      if (!user || user.id === pId) return;
      let currentList = conversations.length === 0 ? await fetchConversations() || [] : conversations;
      const existing = currentList.find((c: any) => (c.participant1 === user.id && c.participant2 === pId) || (c.participant1 === pId && c.participant2 === user.id));

      if (existing) {
          setActiveConversation(existing.id);
          fetchPartnerInfo(pId);
      } else {
          const { data: newConv } = await supabase.from('conversations').insert({ participant1: user.id, participant2: pId }).select().single();
          if (newConv) {
              await fetchConversations();
              setActiveConversation(newConv.id);
              fetchPartnerInfo(pId);
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

  // --- 3. XỬ LÝ GỬI TIN NHẮN (TEXT / ẢNH / LOCATION) ---
  
  // Gửi Text
  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!newMessage.trim() || !activeConversation || !user) return;
    await supabase.from('messages').insert({ conversation_id: activeConversation, sender_id: user.id, content: newMessage, type: 'text' });
    setNewMessage('');
  };

  // Gửi Ảnh (MỚI)
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0] || !activeConversation || !user) return;
    setUploadingImg(true);
    try {
        const file = e.target.files[0];
        const fileName = `${activeConversation}/${Date.now()}-${Math.random()}`;
        // Dùng bucket 'chat-images' (nhớ tạo bucket này trong Supabase)
        // Hoặc dùng tạm 'product-images' nếu lười tạo
        await supabase.storage.from('product-images').upload(fileName, file);
        const { data } = supabase.storage.from('product-images').getPublicUrl(fileName);
        
        await supabase.from('messages').insert({
            conversation_id: activeConversation,
            sender_id: user.id,
            content: 'Đã gửi một ảnh',
            type: 'image',
            image_url: data.publicUrl // Lưu link ảnh vào cột image_url
        });
    } catch (error: any) {
        addToast('Lỗi upload ảnh: ' + error.message, 'error');
    } finally {
        setUploadingImg(false);
        if(fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Gửi Địa điểm (MỚI - Hỗ trợ cả gợi ý và nhập tay)
  const handleSendLocation = async (loc: string) => {
      if (!activeConversation || !user || !loc.trim()) return;
      await supabase.from('messages').insert({
          conversation_id: activeConversation,
          sender_id: user.id,
          content: loc, // Lưu địa điểm vào content
          type: 'location' // Đánh dấu loại tin nhắn
      });
      setShowLocationModal(false);
      setCustomLocation('');
      addToast('Đã gửi vị trí', 'success');
  };

  return (
    <div className="max-w-6xl mx-auto h-[calc(100vh-64px)] flex bg-white border-x border-gray-200 font-sans">
      
      {/* SIDEBAR */}
      <div className={`w-full md:w-1/3 border-r border-gray-200 flex flex-col ${activeConversation ? 'hidden md:flex' : 'flex'}`}>
         <div className="p-4 border-b border-gray-100 bg-gray-50"><h2 className="font-bold text-lg text-gray-800">Tin nhắn</h2></div>
         <div className="flex-1 overflow-y-auto">
             {conversations.map(conv => (
                 <div key={conv.id} onClick={() => { setActiveConversation(conv.id); fetchPartnerInfo(conv.partnerId); }} className={`p-4 flex items-center gap-3 cursor-pointer hover:bg-gray-50 transition ${activeConversation === conv.id ? 'bg-indigo-50' : ''}`}>
                     <img src={conv.partnerAvatar} className="w-12 h-12 rounded-full border border-gray-200 object-cover"/>
                     <div><p className="font-bold text-gray-900">{conv.partnerName}</p><p className="text-xs text-gray-500 truncate">Bấm để xem tin nhắn</p></div>
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
                          <button onClick={() => setActiveConversation(null)} className="md:hidden text-gray-500 mr-2"><ArrowLeft/></button>
                          {partnerProfile && (
                              <Link to={`/profile/${partnerProfile.id}`} className="flex items-center gap-3 hover:opacity-80">
                                  <img src={partnerProfile.avatar_url || 'https://via.placeholder.com/40'} className="w-10 h-10 rounded-full border" />
                                  <div>
                                      <p className="font-bold text-gray-900 flex items-center">{partnerProfile.name} {partnerProfile.is_verified && <CheckCircle size={14} className="ml-1 text-blue-500"/>}</p>
                                      <span className="text-xs text-green-600 flex items-center"><div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>Online</span>
                                  </div>
                              </Link>
                          )}
                      </div>
                      <div className="flex gap-2">
                          <button className="p-2 hover:bg-gray-100 rounded-full"><Phone size={20} className="text-gray-500"/></button>
                          <button className="p-2 hover:bg-gray-100 rounded-full"><MoreVertical size={20} className="text-gray-500"/></button>
                      </div>
                  </div>

                  {/* Messages List */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#F2F4F7]">
                      {messages.map((msg, idx) => {
                          const isMe = msg.sender_id === user?.id;
                          // Kiểm tra loại tin nhắn để render
                          const isImage = msg.type === 'image' || msg.image_url;
                          const isLocation = msg.type === 'location';

                          return (
                              <div key={idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                  {!isMe && <img src={partnerProfile?.avatar_url} className="w-8 h-8 rounded-full mr-2 mt-1 self-end"/>}
                                  
                                  <div className={`max-w-[75%] rounded-2xl px-4 py-2 shadow-sm relative text-sm ${
                                      isMe ? 'bg-[#0084FF] text-white rounded-br-none' : 'bg-white text-gray-800 rounded-bl-none border border-gray-200'
                                  }`}>
                                      {/* A. Render Ảnh */}
                                      {isImage ? (
                                          <div className="-mx-2 -my-1">
                                              <img src={msg.image_url} className="rounded-xl max-w-full h-auto max-h-64 object-cover cursor-pointer hover:opacity-95" onClick={() => window.open(msg.image_url)} />
                                          </div>
                                      ) : 
                                      /* B. Render Địa điểm */
                                      isLocation ? (
                                          <div className="flex items-center gap-2">
                                              <div className={`p-2 rounded-full ${isMe ? 'bg-white/20' : 'bg-red-50 text-red-500'}`}><MapPin size={20}/></div>
                                              <div>
                                                  <span className="block text-[10px] uppercase opacity-75 font-bold mb-0.5">Địa điểm hẹn</span>
                                                  <span className="font-semibold text-base">{msg.content}</span>
                                              </div>
                                          </div>
                                      ) : 
                                      /* C. Render Text thường */
                                      (
                                          <p className="whitespace-pre-wrap">{msg.content}</p>
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

                  {/* Input Area (ĐÃ NÂNG CẤP) */}
                  <div className="p-3 bg-white border-t border-gray-200 relative">
                      {/* Modal Chọn Địa Điểm (Popup ngay trên input) */}
                      {showLocationModal && (
                          <div className="absolute bottom-20 left-4 right-4 md:left-12 md:w-80 bg-white shadow-xl rounded-xl border border-gray-200 p-4 z-20 animate-in slide-in-from-bottom-5">
                              <div className="flex justify-between items-center mb-3">
                                  <h4 className="font-bold text-gray-800 flex items-center"><MapPin size={16} className="mr-2 text-red-500"/> Gửi vị trí</h4>
                                  <button onClick={() => setShowLocationModal(false)} className="text-gray-400 hover:text-gray-600"><X size={18}/></button>
                              </div>
                              <div className="space-y-2 mb-3 max-h-40 overflow-y-auto custom-scrollbar">
                                  {SUGGESTED_LOCATIONS.map(loc => (
                                      <button key={loc} onClick={() => handleSendLocation(loc)} className="w-full text-left px-3 py-2 text-sm bg-gray-50 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition text-gray-700 truncate">📍 {loc}</button>
                                  ))}
                              </div>
                              <div className="flex gap-2 border-t border-gray-100 pt-3">
                                  <input type="text" placeholder="Nhập địa điểm khác..." className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-blue-500" value={customLocation} onChange={(e) => setCustomLocation(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSendLocation(customLocation)} />
                                  <button onClick={() => handleSendLocation(customLocation)} disabled={!customLocation} className="bg-blue-600 text-white p-2 rounded-lg disabled:opacity-50"><Send size={16}/></button>
                              </div>
                          </div>
                      )}

                      <form onSubmit={handleSendMessage} className="flex gap-2 items-end max-w-4xl mx-auto">
                          {/* Nút Upload Ảnh */}
                          <label className={`p-2.5 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-full cursor-pointer transition ${uploadingImg ? 'opacity-50 cursor-not-allowed' : ''}`}>
                              {uploadingImg ? <Loader size={20} className="animate-spin"/> : <ImageIcon size={20}/>}
                              <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={uploadingImg} ref={fileInputRef} />
                          </label>
                          
                          {/* Nút Vị trí */}
                          <button type="button" onClick={() => setShowLocationModal(!showLocationModal)} className={`p-2.5 rounded-full transition ${showLocationModal ? 'bg-red-100 text-red-500' : 'text-gray-500 bg-gray-100 hover:bg-gray-200'}`}>
                              <MapPin size={20}/>
                          </button>

                          <div className="flex-1 relative">
                              <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Nhập tin nhắn..." className="w-full border-none bg-gray-100 rounded-full py-2.5 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm text-gray-800" />
                          </div>
                          
                          <button type="submit" disabled={!newMessage.trim()} className="p-2.5 bg-[#0084FF] text-white rounded-full hover:bg-blue-600 disabled:opacity-50 transition shadow-sm">
                              <Send size={18} className="ml-0.5" />
                          </button>
                      </form>
                  </div>
              </>
          ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-300 bg-gray-50">
                  <MessageCircle size={64} className="mb-4 opacity-50"/>
                  <p className="text-lg font-medium">Chọn một cuộc hội thoại để bắt đầu</p>
              </div>
          )}
      </div>
    </div>
  );
};

export default ChatPage;