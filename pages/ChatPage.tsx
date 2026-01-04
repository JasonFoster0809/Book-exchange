import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useToast } from '../contexts/ToastContext';
import { 
  Send, Image as ImageIcon, MapPin, CheckCircle, 
  MessageCircle, ArrowLeft, X, Loader, ShoppingBag, 
  ShieldAlert, MoreVertical, Search, Phone, Calendar,
  CornerDownRight, Zap, Clock, Package
} from 'lucide-react'; 
import { playMessageSound } from '../utils/audio';

// ============================================================================
// 1. VISUAL ENGINE (CSS ANIMATIONS)
// ============================================================================
const ChatStyles = () => (
  <style>{`
    /* Custom Scrollbar */
    .chat-scrollbar::-webkit-scrollbar { width: 6px; }
    .chat-scrollbar::-webkit-scrollbar-track { background: transparent; }
    .chat-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 10px; }
    .chat-scrollbar:hover::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.2); }

    /* Animations */
    @keyframes msg-pop {
      0% { opacity: 0; transform: scale(0.9) translateY(10px); }
      100% { opacity: 1; transform: scale(1) translateY(0); }
    }
    .animate-msg { animation: msg-pop 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }

    @keyframes slide-up {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .animate-slide-up { animation: slide-up 0.3s ease-out forwards; }

    @keyframes pulse-soft {
      0%, 100% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.05); opacity: 0.8; }
    }
    .animate-pulse-soft { animation: pulse-soft 2s infinite; }

    /* Glass Effects */
    .glass-header {
      background: rgba(255, 255, 255, 0.85);
      backdrop-filter: blur(12px);
      border-bottom: 1px solid rgba(0,0,0,0.05);
    }
    
    .glass-panel {
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(16px);
      box-shadow: 0 10px 40px -10px rgba(0,0,0,0.1);
    }
  `}</style>
);

// ============================================================================
// 2. CONFIG DATA
// ============================================================================

const SUGGESTED_LOCATIONS = [
    "📍 Thư viện Trung tâm", "📍 Canteen B4", "📍 Sảnh H6", 
    "📍 Cổng Lý Thường Kiệt", "📍 Nhà xe SV", "📍 Ghế đá hồ nước"
];

const QUICK_REPLIES = [
    "Sản phẩm còn không ạ?", "Có fix giá thêm không?", 
    "Cho mình xem thêm ảnh thật đi", "Giao dịch lúc 12h trưa nay nhé?"
];

// ============================================================================
// 3. MAIN COMPONENT
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
  const [isConfirming, setIsConfirming] = useState(false);
  const [uploadingImg, setUploadingImg] = useState(false);
  const [showTools, setShowTools] = useState(false); 
  
  // Appointment State
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [appointLoc, setAppointLoc] = useState(SUGGESTED_LOCATIONS[0]);
  const [appointTime, setAppointTime] = useState('');

  const scrollRef = useRef<HTMLDivElement>(null);

  // --- 1. LOGIC & REALTIME ---
  useEffect(() => { if(user) fetchConversations(); }, [user]);

  // Handle Product Context from URL
  useEffect(() => {
    const initChat = async () => {
        if (!user || !partnerIdParam) return;
        
        // Fetch product info if exists
        if (productIdParam) {
            const { data } = await supabase.from('products').select('*').eq('id', productIdParam).single();
            setTargetProduct(data);
        }

        await checkAndCreateConversation(partnerIdParam);
    };
    initChat();
  }, [partnerIdParam, productIdParam, user]);

  useEffect(() => {
    if (activeConversation) {
        fetchMessages(activeConversation);
        const channel = supabase.channel(`chat:${activeConversation}`)
            .on('postgres_changes', { 
                event: 'INSERT', schema: 'public', table: 'messages', 
                filter: `conversation_id=eq.${activeConversation}` 
            }, (payload) => {
                setMessages(prev => [...prev, payload.new]);
                if (user && payload.new.sender_id !== user.id) playMessageSound();
            })
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }
  }, [activeConversation, user]);

  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // --- API FUNCTIONS ---
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
      
      // Check local list first
      let existing = conversations.find((c: any) => c.partnerId === pId);
      
      if (!existing) {
          // Check DB if not in local list
          const { data } = await supabase.from('conversations')
            .select('id')
            .or(`and(participant1.eq.${user.id},participant2.eq.${pId}),and(participant1.eq.${pId},participant2.eq.${user.id})`)
            .maybeSingle();
            
          if (data) {
             existing = { id: data.id }; // Simplified, will refetch full details
          } else {
             const { data: newConv } = await supabase.from('conversations').insert({ participant1: user.id, participant2: pId }).select().single();
             existing = newConv;
          }
          await fetchConversations(); // Refresh list
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

  // --- ACTIONS ---
  
  // 1. Chốt đơn (Sold)
  const handleConfirmTransaction = async () => {
    if (!activeConversation || !user || isRestricted) return;
    
    // Ưu tiên sản phẩm đang chat, nếu không thì lấy sản phẩm mới nhất của mình
    let productToSell = targetProduct;
    if (!productToSell) {
       const { data } = await supabase.from('products').select('*').eq('seller_id', user.id).eq('status', 'available').order('posted_at', { ascending: false }).limit(1).maybeSingle();
       productToSell = data;
    }

    if (!productToSell) return addToast("Bạn không có sản phẩm nào để bán trong cuộc trò chuyện này.", "warning");
    if (!window.confirm(`Xác nhận đã bán "${productToSell.title}" cho người này?`)) return;

    setIsConfirming(true);
    try {
      // Update Product Status -> SOLD
      await supabase.from('products').update({ status: 'sold', buyer_id: partnerProfile?.id }).eq('id', productToSell.id);
      
      // Send System Message
      await supabase.from('messages').insert({ 
          conversation_id: activeConversation, 
          sender_id: user.id, 
          content: `🎉 GIAO DỊCH THÀNH CÔNG!\nSản phẩm: ${productToSell.title}`, 
          type: 'text' 
      });
      
      setTargetProduct({ ...productToSell, status: 'sold' });
      addToast("Đã chốt đơn thành công!", "success");
    } catch (e: any) { addToast(e.message, "error"); } 
    finally { setIsConfirming(false); }
  };

  // 2. Gửi tin nhắn (Text / Location / Appointment)
  const handleSendMessage = async (text: string = newMessage, type: 'text' | 'location' = 'text') => {
    if (isRestricted || !text.trim() || !activeConversation || !user) return;
    
    // Logic: Nếu đây là tin nhắn đầu tiên và có targetProduct (đang Available) -> Chuyển sang Pending
    if (messages.length === 0 && targetProduct && targetProduct.status === 'available') {
        await supabase.from('products').update({ status: 'pending' }).eq('id', targetProduct.id);
        setTargetProduct({ ...targetProduct, status: 'pending' });
    }

    const { error } = await supabase.from('messages').insert({ conversation_id: activeConversation, sender_id: user.id, content: text, type });
    
    if (!error) {
        setNewMessage('');
        setShowTools(false);
        await supabase.from('conversations').update({ updated_at: new Date().toISOString() }).eq('id', activeConversation);
    }
  };

  // 3. Gửi ảnh
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isRestricted || !e.target.files?.[0] || !activeConversation || !user) return;
    setUploadingImg(true);
    try {
        const file = e.target.files[0];
        const fileName = `${activeConversation}/${Date.now()}`;
        await supabase.storage.from('product-images').upload(fileName, file);
        const { data } = supabase.storage.from('product-images').getPublicUrl(fileName);
        await handleSendMessage('Đã gửi ảnh', 'image' as any); // Lưu ý: Cần update logic backend để nhận type image đúng cách hoặc gửi link trong content
        // Tạm thời gửi link ảnh trong content cho đơn giản nếu DB chưa support cột image_url riêng cho message
        await supabase.from('messages').insert({ 
            conversation_id: activeConversation, 
            sender_id: user.id, 
            content: 'Đã gửi một ảnh', 
            type: 'image', 
            image_url: data.publicUrl 
        });
    } catch (error: any) { addToast(error.message, 'error'); } 
    finally { setUploadingImg(false); }
  };

  // 4. Gửi Lời Hẹn (Appointment)
  const handleSendAppointment = () => {
      if (!appointLoc || !appointTime) return addToast("Vui lòng chọn địa điểm và thời gian", "warning");
      const content = `📅 LỜI HẸN GIAO DỊCH\n📍 Tại: ${appointLoc.replace('📍 ','')}\n⏰ Lúc: ${new Date(appointTime).toLocaleString('vi-VN')}`;
      handleSendMessage(content, 'text'); // Gửi dưới dạng text có format đặc biệt
      setShowAppointmentModal(false);
  };

  const isPartnerBanned = partnerProfile?.ban_until && new Date(partnerProfile.ban_until) > new Date();
  const filteredConversations = conversations.filter(c => c.partnerName?.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="max-w-7xl mx-auto h-[calc(100vh-64px)] flex bg-[#F8FAFC] font-sans overflow-hidden">
      <ChatStyles />
      
      {/* --- SIDEBAR --- */}
      <div className={`w-full md:w-[350px] lg:w-[400px] border-r border-gray-200 bg-white flex flex-col z-20 ${activeConversation ? 'hidden md:flex' : 'flex'}`}>
         <div className="p-5 border-b border-gray-100 flex flex-col gap-4">
           <div className="flex justify-between items-center">
             <h2 className="font-black text-2xl text-slate-800">Tin nhắn</h2>
             <div className="p-2 bg-blue-50 text-blue-600 rounded-full"><ShoppingBag size={20} /></div>
           </div>
           <div className="relative">
             <input type="text" placeholder="Tìm kiếm..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-gray-50 border-none rounded-xl pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-100 transition-all font-medium placeholder-slate-400"/>
             <Search className="absolute left-3 top-2.5 text-slate-400" size={18}/>
           </div>
         </div>
         <div className="flex-1 overflow-y-auto chat-scrollbar p-3 space-y-1">
             {filteredConversations.length === 0 ? <div className="text-center py-10 text-slate-400 text-sm">Chưa có tin nhắn nào</div> :
                filteredConversations.map(conv => (
                 <div key={conv.id} onClick={() => { setActiveConversation(conv.id); fetchPartnerInfo(conv.partnerId); setTargetProduct(null); }} 
                    className={`p-3 flex items-center gap-4 rounded-2xl cursor-pointer transition-all duration-200 group relative ${activeConversation === conv.id ? 'bg-blue-50 border border-blue-100 shadow-sm' : 'hover:bg-gray-50 border border-transparent'}`}>
                     <div className="relative shrink-0">
                        <img src={conv.partnerAvatar || 'https://via.placeholder.com/50'} className="w-12 h-12 rounded-full border-2 border-white shadow-sm object-cover"/>
                        {conv.isPartnerRestricted ? <span className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow"><ShieldAlert size={14} className="text-red-500" /></span> : <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></span>}
                     </div>
                     <div className="flex-1 min-w-0">
                       <div className="flex justify-between items-center mb-0.5">
                          <p className={`font-bold truncate ${activeConversation === conv.id ? 'text-[#00418E]' : 'text-slate-700'}`}>{conv.partnerName}</p>
                          <span className="text-[10px] text-slate-400 font-medium">{new Date(conv.updated_at || Date.now()).toLocaleDateString()}</span>
                       </div>
                       <p className="text-xs truncate text-slate-500">{conv.isPartnerRestricted ? "Tài khoản bị hạn chế" : "Nhấn để xem tin nhắn..."}</p>
                     </div>
                 </div>
             ))}
         </div>
      </div>

      {/* --- CHAT AREA --- */}
      <div className={`flex-1 flex flex-col bg-[#F1F5F9] relative ${!activeConversation ? 'hidden md:flex' : 'flex'}`}>
          {activeConversation ? (
              <>
                  {/* HEADER */}
                  <div className="glass-header px-6 py-4 flex justify-between items-center z-30 shadow-sm">
                        <div className="flex items-center gap-4">
                            <button onClick={() => setActiveConversation(null)} className="md:hidden p-2 -ml-2 hover:bg-slate-100 rounded-full"><ArrowLeft size={20}/></button>
                            {partnerProfile ? (
                                <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate(`/profile/${partnerProfile.id}`)}>
                                    <div className="relative">
                                        <img src={partnerProfile.avatar_url || 'https://via.placeholder.com/40'} className="w-10 h-10 rounded-full border border-gray-200 shadow-sm object-cover" />
                                        <div className="absolute -bottom-0.5 -right-0.5 bg-green-500 w-2.5 h-2.5 rounded-full border-2 border-white animate-pulse"></div>
                                    </div>
                                    <div>
                                        <h3 className="font-black text-slate-800 text-base">{partnerProfile.name}</h3>
                                        <span className="text-xs text-green-600 font-bold flex items-center gap-1">Online</span>
                                    </div>
                                </div>
                            ) : <div className="h-10 w-32 bg-gray-200 rounded-lg animate-pulse"/>}
                        </div>
                        <div className="flex items-center gap-3">
                          <button onClick={handleConfirmTransaction} disabled={isConfirming || isRestricted || isPartnerBanned} className="hidden sm:flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-green-600 text-white px-4 py-2 rounded-xl font-bold text-xs shadow-lg shadow-green-500/30 hover:scale-105 active:scale-95 transition-all disabled:opacity-50">
                            {isConfirming ? <Loader size={14} className="animate-spin"/> : <CheckCircle size={16}/>} <span>CHỐT ĐƠN</span>
                          </button>
                          <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full"><Phone size={20}/></button>
                        </div>
                  </div>

                  {/* MESSAGES */}
                  <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-[#F1F5F9] chat-scrollbar flex flex-col">
                      
                      {/* PRODUCT CONTEXT BUBBLE */}
                      {targetProduct && (
                          <div className="mx-auto w-full max-w-sm bg-white rounded-2xl p-3 shadow-md border border-blue-100 flex gap-3 animate-slide-up cursor-pointer hover:shadow-lg transition-all" onClick={() => navigate(`/product/${targetProduct.id}`)}>
                              <img src={targetProduct.images?.[0] || 'https://via.placeholder.com/80'} className="w-16 h-16 rounded-xl object-cover bg-gray-100"/>
                              <div className="flex-1 min-w-0">
                                  <p className="text-xs text-blue-500 font-bold uppercase tracking-wider mb-1">Đang trao đổi về</p>
                                  <h4 className="font-bold text-slate-800 truncate text-sm">{targetProduct.title}</h4>
                                  <p className="text-red-500 font-black text-sm mt-1">{targetProduct.price === 0 ? 'FREE' : `${targetProduct.price.toLocaleString()}đ`}</p>
                              </div>
                              <div className="flex flex-col justify-center">
                                  <span className={`text-[10px] px-2 py-1 rounded-full font-bold uppercase ${targetProduct.status === 'sold' ? 'bg-red-100 text-red-600' : targetProduct.status === 'pending' ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'}`}>
                                      {targetProduct.status === 'available' ? 'Có sẵn' : targetProduct.status === 'pending' ? 'Đang GD' : 'Đã bán'}
                                  </span>
                              </div>
                          </div>
                      )}

                      {/* SAFETY BANNER */}
                      {isPartnerBanned ? (
                        <div className="mx-auto max-w-lg bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3 shadow-sm animate-msg">
                           <ShieldAlert className="text-red-500 shrink-0 mt-0.5" />
                           <div><h4 className="text-sm font-bold text-red-700">Cảnh báo rủi ro</h4><p className="text-xs text-red-600 mt-1">Tài khoản này đang bị hạn chế. Vui lòng không chuyển khoản trước.</p></div>
                        </div>
                      ) : (
                        <div className="mx-auto max-w-md bg-blue-50/50 border border-blue-100 rounded-xl p-3 text-center shadow-sm">
                           <p className="text-xs text-blue-600 font-medium">🛡️ Mẹo: Giao dịch tại H6 hoặc Thư viện để đảm bảo an toàn.</p>
                        </div>
                      )}

                      {messages.map((msg, idx) => {
                          const isMe = msg.sender_id === user?.id;
                          return (
                              <div key={idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-msg`} style={{animationDelay: `${idx * 0.05}s`}}>
                                  {!isMe && <img src={partnerProfile?.avatar_url} className="w-8 h-8 rounded-full border border-white shadow-sm mr-2 self-end mb-1"/>}
                                  <div className={`max-w-[75%] sm:max-w-[65%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                      <div className={`px-4 py-3 shadow-sm relative text-sm leading-relaxed ${isMe ? 'bg-gradient-to-br from-[#00418E] to-[#0065D1] text-white rounded-2xl rounded-tr-none' : 'bg-white text-slate-700 rounded-2xl rounded-tl-none border border-gray-100'}`}>
                                          {msg.type === 'image' ? <img src={msg.image_url} className="rounded-lg max-h-64 object-cover hover:scale-[1.02] transition-transform cursor-zoom-in border border-white/20" onClick={() => window.open(msg.image_url)} /> 
                                          : msg.type === 'location' ? <div className="flex items-center gap-2 font-bold"><MapPin size={18} className={isMe ? 'text-white' : 'text-red-500'}/> {msg.content}</div>
                                          : <p className="whitespace-pre-wrap">{msg.content}</p>}
                                      </div>
                                      <span className="text-[10px] text-slate-400 mt-1 px-1 font-medium">{new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                  </div>
                              </div>
                          );
                      })}
                      <div ref={scrollRef} />
                  </div>

                  {/* INPUT */}
                  <div className="p-4 bg-white border-t border-gray-100 z-30">
                      {/* TOOLS: Quick Replies & Location Modal Toggle */}
                      {showTools && (
                          <div className="mb-3 animate-slide-up space-y-3">
                              <div className="flex gap-2 overflow-x-auto chat-scrollbar pb-1">
                                  {QUICK_REPLIES.map((text, i) => (
                                      <button key={i} onClick={() => handleSendMessage(text)} className="flex-shrink-0 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold border border-blue-100 hover:bg-blue-100 transition-colors flex items-center gap-1"><Zap size={12}/> {text}</button>
                                  ))}
                              </div>
                          </div>
                      )}

                      {/* APPOINTMENT MODAL (POPUP) */}
                      {showAppointmentModal && (
                          <div className="absolute bottom-20 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-white glass-panel rounded-2xl border border-white/50 p-5 z-50 animate-slide-up">
                              <div className="flex justify-between items-center mb-4">
                                  <h4 className="font-black text-slate-800 flex items-center gap-2"><Calendar className="text-blue-500" size={18}/> Tạo Lịch Hẹn</h4>
                                  <button onClick={() => setShowAppointmentModal(false)} className="p-1 hover:bg-slate-100 rounded-full"><X size={18}/></button>
                              </div>
                              <div className="space-y-4">
                                  <div>
                                      <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Địa điểm</label>
                                      <div className="grid grid-cols-2 gap-2">
                                          {SUGGESTED_LOCATIONS.map(loc => (
                                              <button key={loc} onClick={() => setAppointLoc(loc)} className={`text-xs p-2 rounded-lg border text-left truncate ${appointLoc === loc ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'}`}>{loc.replace('📍 ','')}</button>
                                          ))}
                                      </div>
                                  </div>
                                  <div>
                                      <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Thời gian</label>
                                      <input type="datetime-local" value={appointTime} onChange={e => setAppointTime(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-sm outline-none focus:border-blue-500 font-medium"/>
                                  </div>
                                  <button onClick={handleSendAppointment} className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-blue-500/30 active:scale-95 transition-transform">GỬI LỜI HẸN</button>
                              </div>
                          </div>
                      )}

                      {/* MAIN INPUT */}
                      {isRestricted || isPartnerBanned ? (
                        <div className="flex items-center justify-center gap-2 p-3 bg-slate-100 text-slate-500 rounded-xl text-sm font-bold"><ShieldAlert size={18}/> Chức năng chat tạm thời bị khóa.</div>
                      ) : (
                        <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="flex items-end gap-2 relative">
                            <label className="p-3 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl cursor-pointer transition-colors">
                                {uploadingImg ? <Loader size={24} className="animate-spin"/> : <ImageIcon size={24}/>}
                                <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={uploadingImg} />
                            </label>
                            
                            {/* Appointment Button */}
                            <button type="button" onClick={() => setShowAppointmentModal(!showAppointmentModal)} className={`p-3 rounded-xl transition-colors ${showAppointmentModal ? 'bg-red-100 text-red-500' : 'text-slate-400 hover:text-red-500 hover:bg-red-50'}`}>
                                <MapPin size={24}/>
                            </button>

                            {/* Tools Toggle */}
                            <button type="button" onClick={() => setShowTools(!showTools)} className={`p-3 rounded-xl transition-colors ${showTools ? 'bg-indigo-100 text-indigo-600' : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50'}`}>
                                <CornerDownRight size={24}/>
                            </button>

                            <div className="flex-1 bg-slate-100 rounded-2xl flex items-center px-4 py-3 focus-within:ring-2 focus-within:ring-blue-100 focus-within:bg-white transition-all">
                                <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Nhập tin nhắn..." className="flex-1 bg-transparent outline-none text-sm font-medium text-slate-800 placeholder-slate-400"/>
                            </div>
                            <button type="submit" disabled={!newMessage.trim()} className="p-3 bg-[#00418E] text-white rounded-xl hover:bg-[#003370] disabled:opacity-50 disabled:hover:bg-[#00418E] shadow-lg shadow-blue-500/30 transition-all active:scale-95">
                                <Send size={20} className="ml-0.5"/>
                            </button>
                        </form>
                      )}
                  </div>
              </>
          ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-300 bg-[#F8FAFC]">
                  <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-sm mb-6 animate-bounce">
                      <MessageCircle size={48} className="text-slate-200 fill-slate-50"/>
                  </div>
                  <h3 className="text-xl font-black text-slate-400">Chưa chọn hội thoại</h3>
                  <p className="text-sm font-medium text-slate-400/70 mt-2">Chọn một người bạn để bắt đầu trò chuyện</p>
              </div>
          )}
      </div>
    </div>
  );
};

export default ChatPage;
