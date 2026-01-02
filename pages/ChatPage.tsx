import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { useToast } from '../contexts/ToastContext';
import { 
  Send, Image as ImageIcon, MoreVertical, MapPin, 
  CheckCircle, MessageCircle, Phone, ArrowLeft, X, Loader, ShoppingBag 
} from 'lucide-react'; 
import { playMessageSound } from '../utils/audio';

const SUGGESTED_LOCATIONS = [
    "Thư viện Trung tâm", "Canteen B1", "Sảnh tòa nhà A", 
    "Cổng chính (Lý Thường Kiệt)", "Nhà xe sinh viên", "Ghế đá hồ nước"
];

const ChatPage: React.FC = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Tham số từ URL
  const partnerId = searchParams.get('partnerId');
  const productId = searchParams.get('productId'); 
  
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeConversation, setActiveConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [partnerProfile, setPartnerProfile] = useState<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isConfirming, setIsConfirming] = useState(false);
  const [uploadingImg, setUploadingImg] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [customLocation, setCustomLocation] = useState('');

  // --- 1. KHỞI TẠO & REALTIME ---
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

  // --- 2. CÁC HÀM XỬ LÝ DỮ LIỆU ---
  const fetchConversations = async () => {
      if (!user) return;
      const { data } = await supabase.from('conversations')
          .select(`*, p1:profiles!participant1(name, avatar_url), p2:profiles!participant2(name, avatar_url)`)
          .or(`participant1.eq.${user.id},participant2.eq.${user.id}`);
      
      if(data) {
          const formatted = data.map((c: any) => {
              const isP1 = c.participant1 === user.id;
              return { 
                ...c, 
                partnerName: isP1 ? c.p2?.name : c.p1?.name, 
                partnerAvatar: isP1 ? c.p2?.avatar_url : c.p1?.avatar_url, 
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

  // --- 3. XỬ LÝ GIAO DỊCH (MỚI TÍCH HỢP) ---
  const handleConfirmTransaction = async () => {
    if (!activeConversation || !user) return;

    let targetProductId = productId;

    // Nếu URL không có productId cụ thể, tìm món đồ 'available' mới nhất của user
    if (!targetProductId) {
      const { data: latest } = await supabase
        .from('products')
        .select('id')
        .eq('seller_id', user.id)
        .eq('status', 'available')
        .order('posted_at', { ascending: false })
        .limit(1)
        .single();
      targetProductId = latest?.id;
    }

    if (!targetProductId) {
      return addToast("Không tìm thấy món đồ nào đang rao bán của bạn để xác nhận.", "warning");
    }

    const isConfirmed = window.confirm("Bạn xác nhận đã giao dịch thành công món đồ này? Trạng thái món đồ sẽ chuyển thành 'Đã bán'.");
    if (!isConfirmed) return;

    setIsConfirming(true);
    try {
      // 1. Cập nhật trạng thái sản phẩm
      const { error: updateError } = await supabase
        .from('products')
        .update({ status: 'sold' })
        .eq('id', targetProductId);

      if (updateError) throw updateError;

      // 2. Gửi tin nhắn tự động thông báo
      await supabase.from('messages').insert({
        conversation_id: activeConversation,
        sender_id: user.id,
        content: `✅ GIAO DỊCH THÀNH CÔNG!\nNgười bán đã xác nhận hoàn tất giao dịch món đồ này.`,
        type: 'text'
      });

      addToast("Đã xác nhận giao dịch thành công!", "success");
    } catch (error: any) {
      addToast("Lỗi: " + error.message, "error");
    } finally {
      setIsConfirming(false);
    }
  };

  // --- 4. GỬI TIN NHẮN (TEXT / IMAGE / LOCATION) ---
  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!newMessage.trim() || !activeConversation || !user) return;
    await supabase.from('messages').insert({ conversation_id: activeConversation, sender_id: user.id, content: newMessage, type: 'text' });
    setNewMessage('');
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0] || !activeConversation || !user) return;
    setUploadingImg(true);
    try {
        const file = e.target.files[0];
        const fileName = `${activeConversation}/${Date.now()}`;
        await supabase.storage.from('product-images').upload(fileName, file);
        const { data } = supabase.storage.from('product-images').getPublicUrl(fileName);
        
        await supabase.from('messages').insert({
            conversation_id: activeConversation,
            sender_id: user.id,
            content: 'Đã gửi một ảnh',
            type: 'image',
            image_url: data.publicUrl
        });
    } catch (error: any) {
        addToast('Lỗi: ' + error.message, 'error');
    } finally {
        setUploadingImg(false);
    }
  };

  const handleSendLocation = async (loc: string) => {
      if (!activeConversation || !user || !loc.trim()) return;
      await supabase.from('messages').insert({
          conversation_id: activeConversation,
          sender_id: user.id,
          content: loc,
          type: 'location'
      });
      setShowLocationModal(false);
      setCustomLocation('');
  };

  return (
    <div className="max-w-6xl mx-auto h-[calc(100vh-64px)] flex bg-white border-x border-gray-200 font-sans">
      
      {/* SIDEBAR */}
      <div className={`w-full md:w-1/3 border-r border-gray-200 flex flex-col ${activeConversation ? 'hidden md:flex' : 'flex'}`}>
         <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
           <h2 className="font-bold text-lg text-gray-800">Tin nhắn</h2>
           <ShoppingBag size={20} className="text-gray-400" />
         </div>
         <div className="flex-1 overflow-y-auto">
             {conversations.map(conv => (
                 <div key={conv.id} onClick={() => { setActiveConversation(conv.id); fetchPartnerInfo(conv.partnerId); }} className={`p-4 flex items-center gap-3 cursor-pointer hover:bg-gray-50 transition ${activeConversation === conv.id ? 'bg-indigo-50 border-r-4 border-indigo-500' : ''}`}>
                     <img src={conv.partnerAvatar || 'https://via.placeholder.com/50'} className="w-12 h-12 rounded-full border border-gray-200 object-cover"/>
                     <div className="flex-1 min-w-0">
                       <p className="font-bold text-gray-900 truncate">{conv.partnerName}</p>
                       <p className="text-xs text-gray-500 truncate">Nhấn để tiếp tục trò chuyện</p>
                     </div>
                 </div>
             ))}
             {conversations.length === 0 && <div className="text-center mt-20 text-gray-400 p-4"><MessageCircle size={40} className="mx-auto mb-2 opacity-20"/> Chưa có cuộc hội thoại nào</div>}
         </div>
      </div>

      {/* KHUNG CHAT CHÍNH */}
      <div className={`flex-1 flex flex-col ${!activeConversation ? 'hidden md:flex' : 'flex'}`}>
          {activeConversation ? (
              <>
                  {/* Header Khung Chat */}
                  <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-white shadow-sm z-10">
                      <div className="flex items-center gap-3 min-w-0">
                          <button onClick={() => setActiveConversation(null)} className="md:hidden text-gray-500 mr-1"><ArrowLeft size={20}/></button>
                          {partnerProfile && (
                              <div className="flex items-center gap-3 min-w-0">
                                  <img src={partnerProfile.avatar_url || 'https://via.placeholder.com/40'} className="w-10 h-10 rounded-full border flex-shrink-0" />
                                  <div className="min-w-0">
                                      <p className="font-bold text-gray-900 truncate">{partnerProfile.name}</p>
                                      <span className="text-[10px] text-green-600 font-bold uppercase tracking-wider flex items-center"><span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1 animate-pulse"></span>Trực tuyến</span>
                                  </div>
                              </div>
                          )}
                      </div>

                      {/* NÚT XÁC NHẬN GIAO DỊCH */}
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={handleConfirmTransaction}
                          disabled={isConfirming}
                          className="flex items-center gap-2 bg-green-600 text-white px-3 py-2 rounded-xl font-bold text-[10px] sm:text-xs hover:bg-green-700 transition-all shadow-md disabled:opacity-50"
                        >
                          {isConfirming ? <Loader size={14} className="animate-spin"/> : <CheckCircle size={14}/>}
                          <span className="hidden sm:inline">XÁC NHẬN ĐÃ BÁN</span>
                          <span className="sm:hidden">ĐÃ BÁN</span>
                        </button>
                        <button className="p-2 hover:bg-gray-100 rounded-full text-gray-400"><MoreVertical size={20}/></button>
                      </div>
                  </div>

                  {/* Messages List */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#F2F4F7]">
                      {messages.map((msg, idx) => {
                          const isMe = msg.sender_id === user?.id;
                          return (
                              <div key={idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                  <div className={`max-w-[80%] rounded-2xl px-4 py-2 shadow-sm relative ${isMe ? 'bg-[#0084FF] text-white rounded-br-none' : 'bg-white text-gray-800 rounded-bl-none border'}`}>
                                      {msg.type === 'image' ? (
                                          <img src={msg.image_url} className="rounded-lg max-h-60 cursor-pointer" onClick={() => window.open(msg.image_url)} />
                                      ) : msg.type === 'location' ? (
                                          <div className="flex items-center gap-2 py-1">
                                            <MapPin size={18} className={isMe ? 'text-white' : 'text-red-500'}/>
                                            <span className="font-bold underline">{msg.content}</span>
                                          </div>
                                      ) : (
                                          <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                                      )}
                                      <p className={`text-[9px] mt-1 text-right opacity-70`}>
                                          {new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                      </p>
                                  </div>
                              </div>
                          );
                      })}
                      <div ref={scrollRef} />
                  </div>

                  {/* Input Area */}
                  <div className="p-3 bg-white border-t border-gray-200 relative">
                      {showLocationModal && (
                          <div className="absolute bottom-20 left-4 right-4 md:w-80 bg-white shadow-2xl rounded-2xl border p-4 z-20">
                              <div className="flex justify-between items-center mb-3">
                                  <h4 className="font-bold text-sm flex items-center"><MapPin size={16} className="mr-1 text-red-500"/> Gửi vị trí hẹn</h4>
                                  <button onClick={() => setShowLocationModal(false)}><X size={18}/></button>
                              </div>
                              <div className="space-y-1 mb-3">
                                  {SUGGESTED_LOCATIONS.map(loc => (
                                      <button key={loc} onClick={() => handleSendLocation(loc)} className="w-full text-left px-3 py-2 text-xs hover:bg-indigo-50 rounded-lg transition truncate font-medium">📍 {loc}</button>
                                  ))}
                              </div>
                          </div>
                      )}

                      <form onSubmit={handleSendMessage} className="flex gap-2 items-center max-w-4xl mx-auto">
                          <label className="p-2.5 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-full cursor-pointer transition">
                              {uploadingImg ? <Loader size={20} className="animate-spin"/> : <ImageIcon size={20}/>}
                              <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={uploadingImg} />
                          </label>
                          <button type="button" onClick={() => setShowLocationModal(!showLocationModal)} className={`p-2.5 rounded-full ${showLocationModal ? 'bg-red-100 text-red-500' : 'text-gray-500 bg-gray-100'}`}><MapPin size={20}/></button>
                          <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Nhập tin nhắn..." className="flex-1 bg-gray-100 rounded-full py-2.5 px-4 outline-none text-sm" />
                          <button type="submit" disabled={!newMessage.trim()} className="p-2.5 bg-[#0084FF] text-white rounded-full hover:bg-blue-600 disabled:opacity-50"><Send size={18}/></button>
                      </form>
                  </div>
              </>
          ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-300 bg-gray-50">
                  <MessageCircle size={80} className="mb-4 opacity-10"/>
                  <p className="text-lg font-bold">Chọn một cuộc trò chuyện</p>
              </div>
          )}
      </div>
    </div>
  );
};

export default ChatPage;