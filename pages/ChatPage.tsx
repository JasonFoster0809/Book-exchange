import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useToast } from '../contexts/ToastContext';
import { 
  Send, Image as ImageIcon, MapPin, CheckCircle, 
  MessageCircle, ArrowLeft, X, Loader, ShoppingBag, 
  ShieldAlert, MoreVertical, Search, Phone, Calendar,
  CornerDownRight, Zap, PlayCircle, Lock
} from 'lucide-react'; 
import { playMessageSound } from '../utils/audio';

// ... (Giữ nguyên Style và Config Data để đảm bảo UI đẹp) ...
const ChatStyles = () => (
  <style>{`
    .chat-scrollbar::-webkit-scrollbar { width: 6px; }
    .chat-scrollbar::-webkit-scrollbar-track { background: transparent; }
    .chat-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 10px; }
    .chat-scrollbar:hover::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.2); }
    @keyframes slide-up { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
    .animate-slide-up { animation: slide-up 0.3s ease-out forwards; }
    .glass-header { background: rgba(255, 255, 255, 0.9); backdrop-filter: blur(12px); border-bottom: 1px solid rgba(0,0,0,0.05); }
  `}</style>
);

const SUGGESTED_LOCATIONS = [
    "📍 Thư viện Trung tâm", "📍 Canteen B4", "📍 Sảnh H6", 
    "📍 Cổng Lý Thường Kiệt", "📍 Nhà xe SV", "📍 Ghế đá hồ nước"
];
const QUICK_REPLIES = ["Sản phẩm còn không ạ?", "Có fix giá thêm không?", "Cho mình xem thêm ảnh thật đi", "Giao dịch lúc 12h trưa nay nhé?"];

const ChatPage: React.FC = () => {
  const { user, isRestricted } = useAuth(); 
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const partnerIdParam = searchParams.get('partnerId');
  const productIdParam = searchParams.get('productId'); 
  
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeConversation, setActiveConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [partnerProfile, setPartnerProfile] = useState<any>(null);
  
  // Sản phẩm đang được ghim
  const [targetProduct, setTargetProduct] = useState<any>(null);
  
  const [newMessage, setNewMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isProcessing, setIsProcessing] = useState(false); // Trạng thái xử lý giao dịch
  const [uploadingImg, setUploadingImg] = useState(false);
  const [showTools, setShowTools] = useState(false); 
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [appointLoc, setAppointLoc] = useState(SUGGESTED_LOCATIONS[0]);
  const [appointTime, setAppointTime] = useState('');

  const scrollRef = useRef<HTMLDivElement>(null);

  // --- INIT ---
  useEffect(() => { if(user) fetchConversations(); }, [user]);

  // Xử lý khi vào từ URL (có partnerId và productId)
  useEffect(() => {
    const initChat = async () => {
        if (!user || !partnerIdParam) return;
        
        // 1. Lấy thông tin sản phẩm để ghim
        if (productIdParam) {
            const { data } = await supabase.from('products').select('*').eq('id', productIdParam).single();
            setTargetProduct(data);
        }

        // 2. Mở hoặc tạo hội thoại
        await checkAndCreateConversation(partnerIdParam);
    };
    initChat();
  }, [partnerIdParam, productIdParam, user]);

  useEffect(() => {
    if (activeConversation) {
        fetchMessages(activeConversation);
        const channel = supabase.channel(`chat:${activeConversation}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${activeConversation}` }, (payload) => {
                setMessages(prev => [...prev, payload.new]);
                if (user && payload.new.sender_id !== user.id) playMessageSound();
            })
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }
  }, [activeConversation, user]);

  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // --- API ---
  const fetchConversations = async () => {
      if (!user) return;
      const { data } = await supabase.from('conversations').select(`*, p1:profiles!participant1(name, avatar_url, ban_until), p2:profiles!participant2(name, avatar_url, ban_until)`).or(`participant1.eq.${user.id},participant2.eq.${user.id}`).order('updated_at', { ascending: false });
      if(data) {
          const formatted = data.map((c: any) => {
              const isP1 = c.participant1 === user.id;
              const partner = isP1 ? c.p2 : c.p1;
              return { ...c, partnerName: partner?.name || "Người dùng", partnerAvatar: partner?.avatar_url, partnerId: isP1 ? c.participant2 : c.participant1, isPartnerRestricted: partner?.ban_until && new Date(partner.ban_until) > new Date() };
          });
          setConversations(formatted);
      }
  };

  const checkAndCreateConversation = async (pId: string) => {
      if (!user || user.id === pId) return;
      let existing = conversations.find((c: any) => c.partnerId === pId);
      if (!existing) {
          const { data } = await supabase.from('conversations').select('id').or(`and(participant1.eq.${user.id},participant2.eq.${pId}),and(participant1.eq.${pId},participant2.eq.${user.id})`).maybeSingle();
          if (data) existing = { id: data.id };
          else {
             const { data: newConv } = await supabase.from('conversations').insert({ participant1: user.id, participant2: pId }).select().single();
             existing = newConv;
          }
          await fetchConversations();
      }
      if (existing) {
          setActiveConversation(existing.id);
          fetchPartnerInfo(pId);
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

  // --- LOGIC GIAO DỊCH 3 BƯỚC ---
  
  // 1. Buyer: Gửi yêu cầu giao dịch
  const handleRequestTransaction = async () => {
      if (!activeConversation || !user || !targetProduct) return;
      
      // Kiểm tra xem đã chat chưa (Logic: Có ít nhất 1 tin nhắn cũ)
      // Nếu chưa chat, không cho request (để tránh spam)
      if (messages.length === 0) {
          return addToast("Hãy nhắn tin trao đổi trước khi yêu cầu giao dịch.", "warning");
      }

      setIsProcessing(true);
      try {
          await supabase.from('messages').insert({ 
              conversation_id: activeConversation, sender_id: user.id, type: 'text',
              content: `👋 Tôi muốn mua sản phẩm "${targetProduct.title}". Bạn có thể xác nhận giao dịch không?`
          });
          addToast("Đã gửi yêu cầu giao dịch!", "success");
      } catch(e) { console.error(e); }
      finally { setIsProcessing(false); }
  };

  // 2. Seller: Chấp nhận giao dịch (Available -> Pending)
  const handleAcceptTransaction = async () => {
      if (!activeConversation || !user || !targetProduct) return;
      if (!window.confirm("Xác nhận chấp nhận giao dịch? Sản phẩm sẽ chuyển sang trạng thái 'Đang giao dịch'.")) return;
      
      setIsProcessing(true);
      try {
          await supabase.from('products').update({ status: 'pending', buyer_id: partnerProfile?.id }).eq('id', targetProduct.id);
          await supabase.from('messages').insert({ 
              conversation_id: activeConversation, sender_id: user.id, type: 'text',
              content: `✅ Đã chấp nhận giao dịch! Sản phẩm "${targetProduct.title}" hiện đang được giữ cho bạn.`
          });
          setTargetProduct({ ...targetProduct, status: 'pending', buyerId: partnerProfile?.id });
          addToast("Đã chấp nhận giao dịch!", "success");
      } catch(e) { console.error(e); }
      finally { setIsProcessing(false); }
  };

  // 3. Seller: Hoàn tất giao dịch (Pending -> Sold)
  const handleCompleteTransaction = async () => {
      if (!activeConversation || !user || !targetProduct) return;
      if (!window.confirm("Bạn đã nhận tiền và giao hàng thành công?")) return;

      setIsProcessing(true);
      try {
          await supabase.from('products').update({ status: 'sold' }).eq('id', targetProduct.id);
          await supabase.from('messages').insert({ 
              conversation_id: activeConversation, sender_id: user.id, type: 'text',
              content: `🎉 GIAO DỊCH HOÀN TẤT! Cảm ơn bạn đã mua hàng.`
          });
          setTargetProduct({ ...targetProduct, status: 'sold' });
          addToast("Chúc mừng! Giao dịch thành công.", "success");
      } catch(e) { console.error(e); }
      finally { setIsProcessing(false); }
  };

  const handleSendMessage = async (text: string = newMessage, type: 'text' | 'location' = 'text') => {
    if (isRestricted || !text.trim() || !activeConversation || !user) return;
    const { error } = await supabase.from('messages').insert({ conversation_id: activeConversation, sender_id: user.id, content: text, type });
    if (!error) {
        setNewMessage(''); setShowTools(false);
        await supabase.from('conversations').update({ updated_at: new Date().toISOString() }).eq('id', activeConversation);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isRestricted || !e.target.files?.[0] || !activeConversation || !user) return;
    setUploadingImg(true);
    try {
        const file = e.target.files[0];
        const fileName = `${activeConversation}/${Date.now()}`;
        await supabase.storage.from('product-images').upload(fileName, file);
        const { data } = supabase.storage.from('product-images').getPublicUrl(fileName);
        await supabase.from('messages').insert({ conversation_id: activeConversation, sender_id: user.id, content: 'Đã gửi ảnh', type: 'image', image_url: data.publicUrl });
    } catch (error: any) { addToast(error.message, 'error'); } 
    finally { setUploadingImg(false); }
  };

  const handleSendAppointment = () => {
      if (!appointLoc || !appointTime) return addToast("Vui lòng chọn địa điểm và thời gian", "warning");
      const content = `📅 LỜI HẸN GIAO DỊCH\n📍 Tại: ${appointLoc.replace('📍 ','')}\n⏰ Lúc: ${new Date(appointTime).toLocaleString('vi-VN')}`;
      handleSendMessage(content, 'text'); setShowAppointmentModal(false);
  };

  const isSeller = user && targetProduct && user.id === targetProduct.sellerId;
  const isBuyer = user && targetProduct && user.id !== targetProduct.sellerId;
  const filteredConversations = conversations.filter(c => c.partnerName?.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="max-w-7xl mx-auto h-[calc(100vh-64px)] flex bg-[#F8FAFC] font-sans overflow-hidden">
      <ChatStyles />
      
      {/* SIDEBAR */}
      <div className={`w-full md:w-[350px] lg:w-[400px] border-r border-gray-200 bg-white flex flex-col z-20 ${activeConversation ? 'hidden md:flex' : 'flex'}`}>
         <div className="p-5 border-b border-gray-100 flex flex-col gap-4">
           <div className="flex justify-between items-center"><h2 className="font-black text-2xl text-slate-800">Tin nhắn</h2><div className="p-2 bg-blue-50 text-blue-600 rounded-full"><ShoppingBag size={20} /></div></div>
           <div className="relative"><input type="text" placeholder="Tìm kiếm..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full bg-gray-50 border-none rounded-xl pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-100 transition-all font-medium placeholder-slate-400"/><Search className="absolute left-3 top-2.5 text-slate-400" size={18}/></div>
         </div>
         <div className="flex-1 overflow-y-auto chat-scrollbar p-3 space-y-1">
             {filteredConversations.map(conv => (
                 <div key={conv.id} onClick={() => { setActiveConversation(conv.id); fetchPartnerInfo(conv.partnerId); setTargetProduct(null); }} className={`p-3 flex items-center gap-4 rounded-2xl cursor-pointer transition-all ${activeConversation === conv.id ? 'bg-blue-50 border border-blue-100' : 'hover:bg-gray-50 border border-transparent'}`}>
                     <img src={conv.partnerAvatar || 'https://via.placeholder.com/50'} className="w-12 h-12 rounded-full border border-gray-200 object-cover"/>
                     <div className="flex-1 min-w-0"><p className="font-bold truncate">{conv.partnerName}</p><p className="text-xs text-slate-500 truncate">Nhấn để xem tin nhắn...</p></div>
                 </div>
             ))}
         </div>
      </div>

      {/* CHAT AREA */}
      <div className={`flex-1 flex flex-col bg-[#F1F5F9] relative ${!activeConversation ? 'hidden md:flex' : 'flex'}`}>
          {activeConversation ? (
              <>
                  <div className="glass-header px-6 py-4 flex justify-between items-center z-30 shadow-sm">
                        <div className="flex items-center gap-4">
                            <button onClick={() => setActiveConversation(null)} className="md:hidden p-2 -ml-2 hover:bg-slate-100 rounded-full"><ArrowLeft size={20}/></button>
                            {partnerProfile && (
                                <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate(`/profile/${partnerProfile.id}`)}>
                                    <div className="relative"><img src={partnerProfile.avatar_url || 'https://via.placeholder.com/40'} className="w-10 h-10 rounded-full border border-gray-200 shadow-sm object-cover" /><div className="absolute -bottom-0.5 -right-0.5 bg-green-500 w-2.5 h-2.5 rounded-full border-2 border-white animate-pulse"></div></div>
                                    <div><h3 className="font-black text-slate-800 text-base">{partnerProfile.name}</h3><span className="text-xs text-green-600 font-bold flex items-center gap-1">Online</span></div>
                                </div>
                            )}
                        </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-[#F1F5F9] chat-scrollbar flex flex-col">
                      
                      {/* KHUNG GHIM SẢN PHẨM & NÚT GIAO DỊCH */}
                      {targetProduct && (
                          <div className="mx-auto w-full max-w-md bg-white rounded-2xl p-4 shadow-lg border border-indigo-100 animate-slide-up flex flex-col gap-4 sticky top-0 z-10">
                              <div className="flex gap-3 items-center border-b border-gray-100 pb-3 cursor-pointer" onClick={() => navigate(`/product/${targetProduct.id}`)}>
                                  <img src={targetProduct.images?.[0] || 'https://via.placeholder.com/80'} className="w-16 h-16 rounded-xl object-cover bg-gray-100"/>
                                  <div className="flex-1 min-w-0">
                                      <p className="text-xs text-indigo-500 font-bold uppercase tracking-wider mb-1">Đang trao đổi về</p>
                                      <h4 className="font-bold text-slate-900 truncate text-sm">{targetProduct.title}</h4>
                                      <p className="text-red-500 font-black text-sm mt-1">{targetProduct.price === 0 ? 'FREE' : `${targetProduct.price.toLocaleString()}đ`}</p>
                                  </div>
                                  <div className="flex flex-col justify-center items-end">
                                      <span className={`text-[10px] px-2 py-1 rounded-full font-bold uppercase ${targetProduct.status==='sold'?'bg-red-100 text-red-600':targetProduct.status==='pending'?'bg-orange-100 text-orange-600':'bg-green-100 text-green-600'}`}>
                                          {targetProduct.status === 'available' ? 'Có sẵn' : targetProduct.status === 'pending' ? 'Đang GD' : 'Đã bán'}
                                      </span>
                                  </div>
                              </div>

                              {/* --- TRANSACTION CONTROLS --- */}
                              <div className="flex justify-center w-full">
                                  {/* 1. BUYER: Request Transaction */}
                                  {isBuyer && targetProduct.status === 'available' && (
                                      <button onClick={handleRequestTransaction} disabled={isProcessing} className="w-full py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-sm shadow-md hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 active:scale-95">
                                          {isProcessing ? <Loader size={16} className="animate-spin"/> : <PlayCircle size={16}/>} 
                                          YÊU CẦU GIAO DỊCH
                                      </button>
                                  )}
                                  
                                  {/* 2. SELLER: Accept Transaction */}
                                  {isSeller && targetProduct.status === 'available' && (
                                      <div className="w-full flex flex-col gap-2">
                                          <div className="text-xs text-center text-gray-500 italic mb-1">Đang chờ người mua gửi yêu cầu hoặc tin nhắn...</div>
                                          <button onClick={handleAcceptTransaction} disabled={isProcessing} className="w-full py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm shadow-md hover:bg-blue-700 transition-all active:scale-95">
                                              CHẤP NHẬN GIAO DỊCH
                                          </button>
                                      </div>
                                  )}

                                  {/* 3. SELLER: Complete Transaction */}
                                  {isSeller && targetProduct.status === 'pending' && (
                                      <button onClick={handleCompleteTransaction} disabled={isProcessing} className="w-full py-2.5 bg-green-600 text-white rounded-xl font-bold text-sm shadow-md hover:bg-green-700 transition-all flex items-center justify-center gap-2 active:scale-95">
                                          {isProcessing ? <Loader size={16} className="animate-spin"/> : <CheckCircle size={16}/>} 
                                          HOÀN TẤT GIAO DỊCH (ĐÃ BÁN)
                                      </button>
                                  )}

                                  {/* 4. BUYER: Waiting View */}
                                  {isBuyer && targetProduct.status === 'pending' && (
                                      <div className="w-full py-2 bg-orange-50 text-orange-600 rounded-xl font-bold text-xs border border-orange-200 text-center flex items-center justify-center gap-2">
                                          <Loader size={14} className="animate-spin"/> Đang chờ người bán hoàn tất...
                                      </div>
                                  )}

                                  {/* 5. FINISHED */}
                                  {targetProduct.status === 'sold' && (
                                      <div className="w-full py-2 bg-gray-100 text-gray-500 rounded-xl font-bold text-xs border border-gray-200 text-center flex items-center justify-center gap-2">
                                          <CheckCircle size={14}/> Giao dịch đã kết thúc
                                      </div>
                                  )}
                              </div>
                          </div>
                      )}

                      {/* MESSAGES LIST */}
                      {messages.map((msg, idx) => {
                          const isMe = msg.sender_id === user?.id;
                          return (
                              <div key={idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-msg`}>
                                  {!isMe && <img src={partnerProfile?.avatar_url} className="w-8 h-8 rounded-full border border-white shadow-sm mr-2 self-end mb-1"/>}
                                  <div className={`max-w-[75%] px-4 py-2 rounded-2xl text-sm ${isMe ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-white text-slate-800 rounded-tl-none border'}`}>
                                      {msg.type === 'image' ? <img src={msg.image_url} className="rounded-lg max-h-60 cursor-pointer" onClick={() => window.open(msg.image_url)}/> 
                                      : <p className="whitespace-pre-wrap">{msg.content}</p>}
                                      <p className="text-[9px] opacity-70 mt-1 text-right">{new Date(msg.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</p>
                                  </div>
                              </div>
                          );
                      })}
                      <div ref={scrollRef} />
                  </div>

                  {/* INPUT */}
                  <div className="p-4 bg-white border-t border-gray-100 z-30">
                      {showTools && (
                          <div className="mb-3 animate-slide-up flex gap-2 overflow-x-auto chat-scrollbar pb-1">
                              {QUICK_REPLIES.map((text, i) => <button key={i} onClick={() => handleSendMessage(text)} className="flex-shrink-0 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold border border-blue-100 hover:bg-blue-100">{text}</button>)}
                          </div>
                      )}
                      
                      {/* APPOINTMENT MODAL */}
                      {showAppointmentModal && (
                          <div className="absolute bottom-20 left-4 right-4 md:w-96 bg-white rounded-2xl shadow-2xl border p-4 z-50 animate-slide-up">
                              <div className="flex justify-between mb-4"><h4 className="font-bold flex items-center gap-2"><Calendar size={18}/> Tạo Lịch Hẹn</h4><button onClick={() => setShowAppointmentModal(false)}><X size={18}/></button></div>
                              <div className="space-y-3">
                                  <div className="grid grid-cols-2 gap-2">{SUGGESTED_LOCATIONS.map(loc => <button key={loc} onClick={() => setAppointLoc(loc)} className={`text-xs p-2 rounded border truncate ${appointLoc===loc?'bg-blue-600 text-white':'bg-slate-50'}`}>{loc.replace('📍 ','')}</button>)}</div>
                                  <input type="datetime-local" value={appointTime} onChange={e => setAppointTime(e.target.value)} className="w-full border p-2 rounded text-sm"/>
                                  <button onClick={handleSendAppointment} className="w-full bg-blue-600 text-white py-2 rounded font-bold">Gửi</button>
                              </div>
                          </div>
                      )}

                      {/* MAIN INPUT FORM */}
                      {isRestricted ? (
                        <div className="flex items-center justify-center gap-2 p-3 bg-slate-100 text-slate-500 rounded-xl text-sm font-bold"><Lock size={16}/> Chat bị khóa.</div>
                      ) : (
                        <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="flex items-end gap-2">
                            <label className="p-3 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl cursor-pointer">
                                {uploadingImg ? <Loader size={24} className="animate-spin"/> : <ImageIcon size={24}/>}
                                <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={uploadingImg} />
                            </label>
                            <button type="button" onClick={() => setShowAppointmentModal(!showAppointmentModal)} className="p-3 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl"><MapPin size={24}/></button>
                            <button type="button" onClick={() => setShowTools(!showTools)} className="p-3 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl"><CornerDownRight size={24}/></button>
                            <div className="flex-1 bg-slate-100 rounded-2xl flex items-center px-4 py-3"><input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Nhập tin nhắn..." className="flex-1 bg-transparent outline-none text-sm"/></div>
                            <button type="submit" disabled={!newMessage.trim()} className="p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50"><Send size={20}/></button>
                        </form>
                      )}
                  </div>
              </>
          ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-300">
                  <MessageCircle size={80} className="mb-4 opacity-20"/>
                  <p className="text-lg font-bold">Chọn hội thoại để bắt đầu</p>
              </div>
          )}
      </div>
    </div>
  );
};

export default ChatPage;
