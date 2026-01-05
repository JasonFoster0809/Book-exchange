import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useToast } from '../contexts/ToastContext';
import { 
  Send, Image as ImageIcon, MapPin, CheckCircle, 
  MessageCircle, ArrowLeft, X, Loader, ShoppingBag, 
  ShieldAlert, Phone, Video, Info, Smile, ThumbsUp,
  MoreHorizontal, CornerDownRight, Zap, PlayCircle, Lock
} from 'lucide-react'; 
import { playMessageSound } from '../utils/audio';

// ============================================================================
// 1. MESSENGER VISUAL ENGINE (CSS)
// ============================================================================
const MessengerStyles = () => (
  <style>{`
    :root {
      --messenger-blue: #0084FF;
      --messenger-bg: #F0F2F5;
      --messenger-bubble-grey: #E4E6EB;
      --messenger-text-primary: #050505;
      --messenger-text-secondary: #65676B;
    }

    body { background-color: white; }

    /* Custom Scrollbar */
    .chat-scrollbar::-webkit-scrollbar { width: 6px; }
    .chat-scrollbar::-webkit-scrollbar-track { background: transparent; }
    .chat-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 10px; }
    .chat-scrollbar:hover::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.2); }

    /* Animations */
    @keyframes slide-up { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    .animate-enter { animation: slide-up 0.2s ease-out forwards; }

    /* Messenger Specifics */
    .bubble-me {
      background: var(--messenger-blue);
      color: white;
      border-radius: 18px 18px 4px 18px;
    }
    .bubble-you {
      background: var(--messenger-bubble-grey);
      color: var(--messenger-text-primary);
      border-radius: 18px 18px 18px 4px;
    }
    .input-pill {
      background: #F0F2F5;
      border-radius: 20px;
    }
    .hover-bg { transition: background 0.2s; }
    .hover-bg:hover { background-color: rgba(0, 0, 0, 0.05); }
    
    .active-conversation {
      background-color: #EBF5FF; /* Light blue highlight */
    }
  `}</style>
);

const SUGGESTED_LOCATIONS = [ "📍 Thư viện BK", "📍 Canteen B4", "📍 Sảnh H6", "📍 Cổng Lý Thường Kiệt", "📍 Nhà xe SV", "📍 Ghế đá hồ nước" ];
const QUICK_REPLIES = ["Sản phẩm còn không ạ?", "Có fix giá thêm không?", "Cho mình xem thêm ảnh thật đi", "Giao dịch lúc 12h trưa nay nhé?"];

// ============================================================================
// 2. MAIN COMPONENT
// ============================================================================

const ChatPage: React.FC = () => {
  const { user, isRestricted } = useAuth(); 
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const partnerIdParam = searchParams.get('partnerId');
  const productIdParam = searchParams.get('productId'); 
  
  // Data State
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeConversation, setActiveConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [partnerProfile, setPartnerProfile] = useState<any>(null);
  const [targetProduct, setTargetProduct] = useState<any>(null);
  
  // UI State
  const [newMessage, setNewMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadingImg, setUploadingImg] = useState(false);
  const [showTools, setShowTools] = useState(false); 
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [appointLoc, setAppointLoc] = useState(SUGGESTED_LOCATIONS[0]);
  const [appointTime, setAppointTime] = useState('');

  const scrollRef = useRef<HTMLDivElement>(null);

  // --- INIT LOGIC ---
  useEffect(() => { if(user) fetchConversations(); }, [user]);

  // Handle URL Params (Create/Open Chat)
  useEffect(() => {
    const initChat = async () => {
        if (!user || !partnerIdParam) return;
        
        // 1. Fetch Product Info
        if (productIdParam) {
            const { data } = await supabase.from('products').select('*').eq('id', productIdParam).single();
            setTargetProduct(data);
        }

        // 2. Check/Create Conversation
        await checkAndCreateConversation(partnerIdParam);
    };
    initChat();
  }, [partnerIdParam, productIdParam, user]);

  // Realtime Subscription
  useEffect(() => {
    if (activeConversation) {
        fetchMessages(activeConversation);
        const channel = supabase.channel(`chat:${activeConversation}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${activeConversation}` }, (payload) => {
                setMessages(prev => [...prev, payload.new]);
                if (user && payload.new.sender_id !== user.id) playMessageSound();
                fetchConversations(); // Update list order
            })
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }
  }, [activeConversation, user]);

  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // --- API HELPERS ---
  const fetchConversations = async () => {
      if (!user) return;
      const { data } = await supabase.from('conversations')
          .select(`*, p1:profiles!participant1(name, avatar_url, ban_until), p2:profiles!participant2(name, avatar_url, ban_until)`)
          .or(`participant1.eq.${user.id},participant2.eq.${user.id}`)
          .order('updated_at', { ascending: false });
      
      if(data) {
          const formatted = data.map((c: any) => {
              const isP1 = c.participant1 === user.id;
              const partner = isP1 ? c.p2 : c.p1;
              return { 
                  ...c, 
                  partnerName: partner?.name || "Người dùng", 
                  partnerAvatar: partner?.avatar_url, 
                  partnerId: isP1 ? c.participant2 : c.participant1, 
                  isPartnerRestricted: partner?.ban_until && new Date(partner.ban_until) > new Date() 
              };
          });
          setConversations(formatted);
      }
  };

  const checkAndCreateConversation = async (pId: string) => {
      if (!user || user.id === pId) return;
      let existing = conversations.find((c: any) => c.partnerId === pId);
      
      if (!existing) {
          const { data } = await supabase.from('conversations').select('id')
            .or(`and(participant1.eq.${user.id},participant2.eq.${pId}),and(participant1.eq.${pId},participant2.eq.${user.id})`)
            .maybeSingle();
            
          if (data) {
             existing = { id: data.id };
          } else {
             const { data: newConv } = await supabase.from('conversations').insert({ participant1: user.id, participant2: pId }).select().single();
             existing = newConv;
          }
          await fetchConversations();
      }

      if (existing) {
          setActiveConversation(existing.id);
          fetchPartnerInfoInternal(pId); // Đổi tên hàm để tránh nhầm lẫn
      }
  };

  // Đổi tên hàm này để tránh trùng lặp
  const fetchPartnerInfoInternal = async (pId: string) => {
      const { data } = await supabase.from('profiles').select('*').eq('id', pId).single();
      setPartnerProfile(data);
  };

  const fetchMessages = async (convId: string) => {
      const { data } = await supabase.from('messages').select('*').eq('conversation_id', convId).order('created_at', { ascending: true });
      if (data) setMessages(data);
  };

  // --- TRANSACTION FLOW ---
  const handleRequestTransaction = async () => {
      if (!activeConversation || !user || !targetProduct) return;
      if (messages.length === 0) return addToast("Hãy nhắn tin trước khi yêu cầu giao dịch.", "warning");
      
      setIsProcessing(true);
      try {
          // Gửi tin nhắn đặc biệt
          await supabase.from('messages').insert({ 
              conversation_id: activeConversation, sender_id: user.id, type: 'text',
              content: `🔵 YÊU CẦU GIAO DỊCH\nTôi muốn mua sản phẩm "${targetProduct.title}".`
          });
          addToast("Đã gửi yêu cầu!", "success");
      } catch(e) { console.error(e); } finally { setIsProcessing(false); }
  };

  const handleAcceptTransaction = async () => {
      if (!activeConversation || !user || !targetProduct) return;
      if (!window.confirm("Xác nhận giao dịch?")) return;
      setIsProcessing(true);
      try {
          await supabase.from('products').update({ status: 'pending', buyer_id: partnerProfile?.id }).eq('id', targetProduct.id);
          await supabase.from('messages').insert({ 
              conversation_id: activeConversation, sender_id: user.id, type: 'text', 
              content: `🟡 ĐÃ CHẤP NHẬN\nSản phẩm "${targetProduct.title}" đang ở trạng thái chờ giao dịch.` 
          });
          setTargetProduct({ ...targetProduct, status: 'pending', buyerId: partnerProfile?.id });
      } catch(e) { console.error(e); } finally { setIsProcessing(false); }
  };

  const handleCompleteTransaction = async () => {
      if (!activeConversation || !user || !targetProduct) return;
      if (!window.confirm("Xác nhận hoàn tất?")) return;
      setIsProcessing(true);
      try {
          await supabase.from('products').update({ status: 'sold' }).eq('id', targetProduct.id);
          await supabase.from('messages').insert({ 
              conversation_id: activeConversation, sender_id: user.id, type: 'text', 
              content: `🟢 GIAO DỊCH THÀNH CÔNG\nSản phẩm "${targetProduct.title}" đã được bán.` 
          });
          setTargetProduct({ ...targetProduct, status: 'sold' });
      } catch(e) { console.error(e); } finally { setIsProcessing(false); }
  };

  // --- MESSAGING ---
  const handleSendMessage = async (text: string = newMessage, type: 'text' | 'location' = 'text') => {
    if (isRestricted || !text.trim() || !activeConversation || !user) return;
    const { error } = await supabase.from('messages').insert({ conversation_id: activeConversation, sender_id: user.id, content: text, type });
    if (!error) { 
        setNewMessage(''); 
        setShowTools(false);
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
    } catch (error: any) { addToast(error.message, 'error'); } finally { setUploadingImg(false); }
  };

  const handleSendAppointment = () => {
      if (!appointLoc || !appointTime) return addToast("Vui lòng nhập đủ thông tin", "warning");
      handleSendMessage(`📅 HẸN GIAO DỊCH\n📍 ${appointLoc.replace('📍 ','')}\n⏰ ${new Date(appointTime).toLocaleString('vi-VN')}`, 'text'); 
      setShowAppointmentModal(false);
  };

  const isPartnerBanned = partnerProfile?.ban_until && new Date(partnerProfile.ban_until) > new Date();
  const isSeller = user && targetProduct && user.id === targetProduct.sellerId;
  const isBuyer = user && targetProduct && user.id !== targetProduct.sellerId;
  const filteredConversations = conversations.filter(c => c.partnerName?.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="max-w-[100vw] h-[calc(100vh-64px)] flex bg-white font-sans overflow-hidden">
      <MessengerStyles />
      
      {/* --- SIDEBAR (Left Panel) --- */}
      <div className={`w-full md:w-[360px] border-r border-gray-200 bg-white flex flex-col z-20 ${activeConversation ? 'hidden md:flex' : 'flex'}`}>
         
         {/* Sidebar Header */}
         <div className="p-4 flex flex-col gap-3">
           <div className="flex justify-between items-center px-2">
             <h2 className="font-bold text-2xl text-black">Chat</h2>
             <div className="flex gap-2">
                <button className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition"><MoreHorizontal size={20}/></button>
                <button className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition"><Video size={20}/></button>
             </div>
           </div>
           {/* Search Pill */}
           <div className="relative">
             <input 
                type="text" 
                placeholder="Tìm kiếm trên Messenger" 
                value={searchTerm} 
                onChange={e => setSearchTerm(e.target.value)} 
                className="w-full bg-[#F0F2F5] border-none rounded-full pl-10 pr-4 py-2.5 text-[15px] text-black placeholder-gray-500 focus:ring-0"
             />
             <Search className="absolute left-3 top-2.5 text-gray-500" size={18}/>
           </div>
         </div>

         {/* Conversation List */}
         <div className="flex-1 overflow-y-auto chat-scrollbar px-2">
             {filteredConversations.length === 0 ? (
                 <div className="text-center py-10 text-gray-400 text-sm">Chưa có tin nhắn nào</div>
             ) : (
                filteredConversations.map(conv => (
                 <div 
                    key={conv.id} 
                    onClick={() => { setActiveConversation(conv.id); fetchPartnerInfoInternal(conv.partnerId); setTargetProduct(null); }} 
                    className={`p-2.5 flex items-center gap-3 rounded-lg cursor-pointer transition-colors ${activeConversation === conv.id ? 'active-conversation' : 'hover:bg-gray-100'}`}
                 >
                     <div className="relative">
                        <img src={conv.partnerAvatar || 'https://via.placeholder.com/56'} className="w-14 h-14 rounded-full object-cover border border-gray-100"/>
                        {conv.isPartnerRestricted && <span className="absolute bottom-0 right-0 p-0.5 bg-white rounded-full"><ShieldAlert size={14} className="text-red-500"/></span>}
                     </div>
                     <div className="flex-1 min-w-0 flex flex-col justify-center">
                       <p className={`text-[15px] truncate ${activeConversation === conv.id ? 'font-semibold text-black' : 'font-medium text-black'}`}>{conv.partnerName}</p>
                       <div className="flex items-center gap-1 text-[13px] text-gray-500">
                          <p className="truncate max-w-[140px]">{conv.isPartnerRestricted ? "Tài khoản bị hạn chế" : "Bạn: Xin chào..."}</p>
                          <span>•</span>
                          <span>{new Date(conv.updated_at || Date.now()).toLocaleDateString([], {day:'2-digit', month:'2-digit'})}</span>
                       </div>
                     </div>
                 </div>
             )))}
         </div>
      </div>

      {/* --- CHAT WINDOW (Right Panel) --- */}
      <div className={`flex-1 flex flex-col bg-white relative ${!activeConversation ? 'hidden md:flex' : 'flex'}`}>
          {activeConversation ? (
              <>
                  {/* CHAT HEADER */}
                  <div className="h-[60px] px-4 flex justify-between items-center shadow-sm border-b border-gray-200 z-10 bg-white">
                        <div className="flex items-center gap-3">
                            <button onClick={() => setActiveConversation(null)} className="md:hidden p-2 -ml-2 hover:bg-gray-100 rounded-full text-messenger-blue"><ArrowLeft size={24}/></button>
                            {partnerProfile && (
                                <div className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-1 rounded-lg transition" onClick={() => navigate(`/profile/${partnerProfile.id}`)}>
                                    <div className="relative">
                                        <img src={partnerProfile.avatar_url || 'https://via.placeholder.com/40'} className="w-10 h-10 rounded-full object-cover border border-gray-100" />
                                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-[17px] text-black leading-tight">{partnerProfile.name}</h3>
                                        <span className="text-[12px] text-gray-500">Đang hoạt động</span>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="flex items-center gap-1 text-messenger-blue">
                          <button className="p-2.5 hover:bg-gray-100 rounded-full"><Phone size={22}/></button>
                          <button className="p-2.5 hover:bg-gray-100 rounded-full"><Video size={22}/></button>
                          <button className="p-2.5 hover:bg-gray-100 rounded-full"><Info size={22}/></button>
                        </div>
                  </div>

                  {/* MESSAGES AREA */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-white chat-scrollbar flex flex-col">
                      
                      {/* --- PRODUCT CARD (MARKETPLACE STYLE) --- */}
                      {targetProduct && (
                          <div className="mx-auto w-full max-w-sm bg-white rounded-2xl p-4 shadow-sm border border-gray-200 mb-6 mt-2">
                              <div className="flex gap-4 items-start pb-4 border-b border-gray-100">
                                  <img src={targetProduct.images?.[0] || 'https://via.placeholder.com/100'} className="w-20 h-20 rounded-lg object-cover bg-gray-100"/>
                                  <div className="flex-1 min-w-0">
                                      <h4 className="font-bold text-black text-[17px] leading-snug">{targetProduct.title}</h4>
                                      <p className="text-black font-medium">{targetProduct.price === 0 ? 'Miễn phí' : `${targetProduct.price.toLocaleString()}đ`}</p>
                                      <div className={`mt-1 inline-flex px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wide ${targetProduct.status==='sold'?'bg-red-100 text-red-600':targetProduct.status==='pending'?'bg-orange-100 text-orange-600':'bg-green-100 text-green-600'}`}>
                                          {targetProduct.status === 'available' ? 'Có sẵn' : targetProduct.status === 'pending' ? 'Đang giao dịch' : 'Đã bán'}
                                      </div>
                                  </div>
                              </div>

                              {/* TRANSACTION ACTION BUTTONS */}
                              <div className="pt-3 flex flex-col gap-2">
                                  {isBuyer && targetProduct.status === 'available' && (
                                      <button onClick={handleRequestTransaction} disabled={isProcessing} className="w-full py-2 bg-gray-200 hover:bg-gray-300 text-black rounded-lg font-bold text-sm transition-all">
                                          {isProcessing ? <Loader size={16} className="animate-spin mx-auto"/> : 'Gửi yêu cầu mua'}
                                      </button>
                                  )}
                                  
                                  {isSeller && targetProduct.status === 'available' && (
                                      <div className="text-center text-[13px] text-gray-500 py-1">Đang chờ người mua gửi yêu cầu...</div>
                                  )}

                                  {isSeller && targetProduct.status === 'available' && messages.length > 0 && (
                                      <button onClick={handleAcceptTransaction} disabled={isProcessing} className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-sm transition-all">
                                          Chấp nhận giao dịch
                                      </button>
                                  )}

                                  {isSeller && targetProduct.status === 'pending' && (
                                      <button onClick={handleCompleteTransaction} disabled={isProcessing} className="w-full py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold text-sm transition-all">
                                          Đánh dấu đã bán
                                      </button>
                                  )}

                                  {isBuyer && targetProduct.status === 'pending' && (
                                      <div className="w-full py-2 bg-orange-50 text-orange-600 rounded-lg font-bold text-sm text-center border border-orange-200">
                                          Đang chờ người bán xác nhận...
                                      </div>
                                  )}
                              </div>
                          </div>
                      )}

                      {/* --- SAFETY WARNING --- */}
                      {isPartnerBanned && (
                        <div className="mx-auto max-w-md bg-red-50 border border-red-100 rounded-xl p-3 flex gap-3 items-center text-red-700 text-sm mb-4">
                           <ShieldAlert size={20}/>
                           <span>Cảnh báo: Tài khoản này đang bị hạn chế. Cẩn trọng khi giao dịch.</span>
                        </div>
                      )}

                      {/* --- MESSAGES LOOP --- */}
                      {messages.map((msg, idx) => {
                          const isMe = msg.sender_id === user?.id;
                          const showAvatar = !isMe && (idx === messages.length - 1 || messages[idx + 1]?.sender_id === user?.id);
                          
                          // Styling for System/Transaction Messages
                          if (msg.content.includes("YÊU CẦU GIAO DỊCH") || msg.content.includes("ĐÃ CHẤP NHẬN") || msg.content.includes("GIAO DỊCH THÀNH CÔNG")) {
                              return (
                                  <div key={idx} className="flex justify-center my-4 animate-enter">
                                      <div className="bg-gray-50 border border-gray-200 text-gray-600 px-4 py-2 rounded-full text-xs font-bold text-center shadow-sm">
                                          {msg.content}
                                      </div>
                                  </div>
                              );
                          }

                          return (
                              <div key={idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'} group animate-enter`}>
                                  {!isMe && (
                                      <div className="w-7 mr-2 flex flex-col justify-end">
                                          {showAvatar ? <img src={partnerProfile?.avatar_url} className="w-7 h-7 rounded-full border border-gray-100 shadow-sm"/> : <div className="w-7"/>}
                                      </div>
                                  )}
                                  
                                  <div className={`max-w-[70%] ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                                      <div className={`px-4 py-2.5 text-[15px] leading-snug shadow-sm ${isMe ? 'bubble-me' : 'bubble-you'}`}>
                                          {msg.type === 'image' ? (
                                              <img src={msg.image_url} className="rounded-lg max-h-64 object-cover cursor-pointer hover:opacity-90" onClick={() => window.open(msg.image_url)}/>
                                          ) : msg.type === 'location' ? (
                                              <div className="flex items-center gap-2 font-bold"><MapPin size={18}/> {msg.content}</div>
                                          ) : (
                                              <p className="whitespace-pre-wrap">{msg.content}</p>
                                          )}
                                      </div>
                                      {/* Timestamp on hover */}
                                      <span className="text-[10px] text-gray-400 mt-1 px-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                          {new Date(msg.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                                      </span>
                                  </div>
                              </div>
                          );
                      })}
                      <div ref={scrollRef} />
                  </div>

                  {/* INPUT AREA */}
                  <div className="p-3 bg-white z-30">
                      {showTools && (
                          <div className="mb-2 flex gap-2 overflow-x-auto chat-scrollbar pb-2">
                              {QUICK_REPLIES.map((text, i) => (
                                  <button key={i} onClick={() => handleSendMessage(text)} className="flex-shrink-0 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-full text-xs font-bold border border-blue-100 hover:bg-blue-100 transition-colors">
                                      {text}
                                  </button>
                              ))}
                          </div>
                      )}

                      {/* APPOINTMENT MODAL */}
                      {showAppointmentModal && (
                          <div className="absolute bottom-20 left-4 right-4 md:w-80 bg-white rounded-2xl shadow-2xl border border-gray-200 p-4 z-50 animate-enter">
                              <div className="flex justify-between mb-3"><h4 className="font-bold flex items-center gap-2 text-sm"><Calendar size={16}/> Hẹn giờ</h4><button onClick={() => setShowAppointmentModal(false)}><X size={16}/></button></div>
                              <div className="space-y-2">
                                  <div className="grid grid-cols-2 gap-2">{SUGGESTED_LOCATIONS.map(loc => <button key={loc} onClick={() => setAppointLoc(loc)} className={`text-[11px] p-2 rounded border truncate ${appointLoc===loc?'bg-blue-600 text-white':'bg-gray-50'}`}>{loc.replace('📍 ','')}</button>)}</div>
                                  <input type="datetime-local" value={appointTime} onChange={e => setAppointTime(e.target.value)} className="w-full border p-2 rounded text-sm bg-gray-50"/>
                                  <button onClick={handleSendAppointment} className="w-full bg-blue-600 text-white py-2 rounded font-bold text-sm">Xác nhận</button>
                              </div>
                          </div>
                      )}

                      {isRestricted ? (
                        <div className="p-3 bg-gray-100 text-gray-500 rounded-2xl text-center text-sm font-bold flex justify-center items-center gap-2"><Lock size={16}/> Bạn không thể nhắn tin.</div>
                      ) : (
                        <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="flex items-end gap-2">
                            <div className="flex gap-1 pb-2">
                                <button type="button" onClick={() => setShowTools(!showTools)} className="p-2 hover:bg-gray-100 rounded-full text-messenger-blue transition"><CornerDownRight size={20}/></button>
                                <label className="p-2 hover:bg-gray-100 rounded-full text-messenger-blue transition cursor-pointer">
                                    {uploadingImg ? <Loader size={20} className="animate-spin"/> : <ImageIcon size={20}/>}
                                    <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={uploadingImg} />
                                </label>
                                <button type="button" onClick={() => setShowAppointmentModal(!showAppointmentModal)} className="p-2 hover:bg-gray-100 rounded-full text-messenger-blue transition"><MapPin size={20}/></button>
                            </div>
                            
                            <div className="flex-1 bg-[#F0F2F5] rounded-[20px] flex items-center px-4 py-2.5 transition-all focus-within:ring-1 focus-within:ring-gray-300">
                                <input 
                                    type="text" 
                                    value={newMessage} 
                                    onChange={(e) => setNewMessage(e.target.value)} 
                                    placeholder="Aa" 
                                    className="flex-1 bg-transparent outline-none text-[15px] text-black placeholder-gray-500"
                                />
                                <button type="button" className="text-messenger-blue hover:scale-110 transition"><Smile size={20}/></button>
                            </div>

                            <button 
                                type="submit" 
                                className="p-2 text-messenger-blue hover:bg-blue-50 rounded-full transition-colors self-center"
                            >
                                {newMessage.trim() ? <Send size={20} className="ml-0.5 fill-current"/> : <ThumbsUp size={20} className="fill-current"/>}
                            </button>
                        </form>
                      )}
                  </div>
              </>
          ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                  <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                      <MessageCircle size={48} className="text-gray-300"/>
                  </div>
                  <h2 className="text-2xl font-bold text-black mb-2">Chào mừng đến với Messenger</h2>
                  <p className="text-gray-500 max-w-xs">Chọn một đoạn chat để bắt đầu nhắn tin với người bán hoặc bạn bè.</p>
              </div>
          )}
      </div>
    </div>
  );
};

export default ChatPage;
