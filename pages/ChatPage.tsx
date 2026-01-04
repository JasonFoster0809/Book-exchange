import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useToast } from '../contexts/ToastContext';
import { 
  Send, Image as ImageIcon, MapPin, CheckCircle, 
  MessageCircle, ArrowLeft, Loader, ShoppingBag, 
  ShieldAlert, MoreVertical, Search, Phone, 
  CornerDownRight, Zap 
} from 'lucide-react'; 
import { playMessageSound } from '../utils/audio';

// ============================================================================
// 1. VISUAL ENGINE (CSS ANIMATIONS)
// ============================================================================
const ChatStyles = () => (
  <style>{`
    /* Custom Scrollbar for Chat List & Messages */
    .chat-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
    .chat-scrollbar::-webkit-scrollbar-track { background: transparent; }
    .chat-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 10px; }
    .chat-scrollbar:hover::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.2); }

    /* Message Pop Animation */
    @keyframes msg-pop {
      0% { opacity: 0; transform: scale(0.9) translateY(10px); }
      100% { opacity: 1; transform: scale(1) translateY(0); }
    }
    .animate-msg { animation: msg-pop 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }

    /* Slide In Animation for Tools */
    @keyframes slide-in-up {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .animate-slide-in { animation: slide-in-up 0.3s ease-out forwards; }

    /* Glass Effects */
    .glass-header {
      background: rgba(255, 255, 255, 0.85);
      backdrop-filter: blur(12px);
      border-bottom: 1px solid rgba(0,0,0,0.05);
    }
    
    .glass-input {
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(16px);
      border-top: 1px solid rgba(0,0,0,0.05);
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
  const productId = searchParams.get('productId'); 
  
  // Data State
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeConversation, setActiveConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [partnerProfile, setPartnerProfile] = useState<any>(null);
  
  // UI State
  const [newMessage, setNewMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);
  const [uploadingImg, setUploadingImg] = useState(false);
  const [showTools, setShowTools] = useState(false); // Toggle Quick Tools

  const scrollRef = useRef<HTMLDivElement>(null);

  // --- 1. LOGIC & REALTIME ---
  useEffect(() => { if(user) fetchConversations(); }, [user]);

  useEffect(() => {
      if (partnerIdParam && user) checkAndCreateConversation(partnerIdParam);
  }, [partnerIdParam, user, conversations.length]);

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
          // Note: In real app, sort by updated_at desc
      
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
          return formatted;
      }
      return [];
  };

  const checkAndCreateConversation = async (pId: string) => {
      if (!user || user.id === pId) return;
      let currentList = conversations.length === 0 ? await fetchConversations() || [] : conversations;
      const existing = currentList.find((c: any) => c.partnerId === pId);

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

  // --- ACTIONS ---
  const handleConfirmTransaction = async () => {
    if (!activeConversation || !user || isRestricted) return addToast("Không thể thực hiện.", "error");
    
    // Auto-detect product if available
    let targetProductId = productId;
    if (!targetProductId) {
      const { data: latest } = await supabase.from('products').select('id').eq('seller_id', user.id).eq('status', 'available').order('posted_at', { ascending: false }).limit(1).maybeSingle();
      targetProductId = latest?.id;
    }

    if (!targetProductId) return addToast("Bạn chưa có sản phẩm nào để bán.", "warning");
    if (!window.confirm("Xác nhận đã bán thành công cho người này?")) return;

    setIsConfirming(true);
    try {
      await supabase.from('products').update({ status: 'sold', buyer_id: partnerProfile?.id }).eq('id', targetProductId);
      await supabase.from('messages').insert({ conversation_id: activeConversation, sender_id: user.id, content: `🎉 ĐÃ XÁC NHẬN BÁN THÀNH CÔNG!`, type: 'text' });
      addToast("Giao dịch hoàn tất!", "success");
    } catch (e: any) { addToast(e.message, "error"); } 
    finally { setIsConfirming(false); }
  };

  const handleSendMessage = async (text: string = newMessage, type: 'text' | 'location' = 'text') => {
    if (isRestricted || !text.trim() || !activeConversation || !user) return;
    
    const { error } = await supabase.from('messages').insert({ conversation_id: activeConversation, sender_id: user.id, content: text, type });
    
    if (!error) {
        setNewMessage('');
        setShowTools(false);
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

  const isPartnerBanned = partnerProfile?.ban_until && new Date(partnerProfile.ban_until) > new Date();
  const filteredConversations = conversations.filter(c => c.partnerName?.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="max-w-7xl mx-auto h-[calc(100vh-64px)] flex bg-[#F8FAFC] font-sans overflow-hidden">
      <ChatStyles />
      
      {/* --- LEFT SIDEBAR (LIST) --- */}
      <div className={`w-full md:w-[350px] lg:w-[400px] border-r border-gray-200 bg-white flex flex-col z-20 ${activeConversation ? 'hidden md:flex' : 'flex'}`}>
         
         {/* Sidebar Header */}
         <div className="p-5 border-b border-gray-100 flex flex-col gap-4">
           <div className="flex justify-between items-center">
             <h2 className="font-black text-2xl text-slate-800">Tin nhắn</h2>
             <div className="p-2 bg-blue-50 text-blue-600 rounded-full"><ShoppingBag size={20} /></div>
           </div>
           
           {/* Search Bar */}
           <div className="relative">
             <input 
                type="text" 
                placeholder="Tìm kiếm..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-gray-50 border-none rounded-xl pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-100 transition-all font-medium text-slate-700 placeholder-slate-400"
             />
             <Search className="absolute left-3 top-2.5 text-slate-400" size={18}/>
           </div>
         </div>

         {/* Conversation List */}
         <div className="flex-1 overflow-y-auto chat-scrollbar p-3 space-y-1">
             {filteredConversations.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-sm">Chưa có tin nhắn nào</div>
             ) : (
                filteredConversations.map(conv => (
                 <div 
                    key={conv.id} 
                    onClick={() => { setActiveConversation(conv.id); fetchPartnerInfo(conv.partnerId); }} 
                    className={`p-3 flex items-center gap-4 rounded-2xl cursor-pointer transition-all duration-200 group relative overflow-hidden ${activeConversation === conv.id ? 'bg-blue-50 border border-blue-100 shadow-sm' : 'hover:bg-gray-50 border border-transparent'}`}
                 >
                     <div className="relative shrink-0">
                        <img src={conv.partnerAvatar || 'https://via.placeholder.com/50'} className="w-12 h-12 rounded-full border-2 border-white shadow-sm object-cover bg-gray-200"/>
                        {conv.isPartnerRestricted ? (
                            <span className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow"><ShieldAlert size={14} className="text-red-500" /></span>
                        ) : (
                            <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></span>
                        )}
                     </div>
                     <div className="flex-1 min-w-0">
                       <div className="flex justify-between items-center mb-0.5">
                          <p className={`font-bold truncate ${activeConversation === conv.id ? 'text-[#00418E]' : 'text-slate-700'}`}>{conv.partnerName}</p>
                          <span className="text-[10px] text-slate-400 font-medium">{new Date(conv.created_at || Date.now()).toLocaleDateString()}</span>
                       </div>
                       <p className={`text-xs truncate ${activeConversation === conv.id ? 'text-blue-600/70 font-medium' : 'text-slate-500'}`}>
                          {conv.isPartnerRestricted ? "Tài khoản bị hạn chế" : "Nhấn để xem tin nhắn..."}
                       </p>
                     </div>
                     {activeConversation === conv.id && <div className="absolute left-0 top-1/2 -translate-y-1/2 h-8 w-1 bg-[#00418E] rounded-r-full"></div>}
                 </div>
             )))}
         </div>
      </div>

      {/* --- RIGHT CHAT AREA --- */}
      <div className={`flex-1 flex flex-col bg-[#F1F5F9] relative ${!activeConversation ? 'hidden md:flex' : 'flex'}`}>
          {activeConversation ? (
              <>
                  {/* Chat Header */}
                  <div className="glass-header px-6 py-4 flex justify-between items-center z-30 shadow-sm">
                        <div className="flex items-center gap-4">
                            <button onClick={() => setActiveConversation(null)} className="md:hidden p-2 -ml-2 hover:bg-slate-100 rounded-full transition-colors"><ArrowLeft size={20}/></button>
                            
                            {partnerProfile ? (
                                <div className="flex items-center gap-3">
                                    <div className="relative">
                                        <img src={partnerProfile.avatar_url || 'https://via.placeholder.com/40'} className="w-10 h-10 rounded-full border border-gray-200 shadow-sm object-cover" />
                                        <div className="absolute -bottom-0.5 -right-0.5 bg-green-500 w-2.5 h-2.5 rounded-full border-2 border-white animate-pulse"></div>
                                    </div>
                                    <div>
                                        <h3 className="font-black text-slate-800 text-base">{partnerProfile.name}</h3>
                                        <span className="text-xs text-green-600 font-bold flex items-center gap-1">
                                            Online
                                        </span>
                                    </div>
                                </div>
                            ) : <div className="h-10 w-32 bg-gray-200 rounded-lg animate-pulse"/>}
                        </div>

                        <div className="flex items-center gap-3">
                          <button 
                            onClick={handleConfirmTransaction} 
                            disabled={isConfirming || isRestricted || isPartnerBanned} 
                            className="hidden sm:flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-green-600 text-white px-4 py-2 rounded-xl font-bold text-xs shadow-lg shadow-green-500/30 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:shadow-none"
                          >
                            {isConfirming ? <Loader size={14} className="animate-spin"/> : <CheckCircle size={16}/>}
                            <span>CHỐT ĐƠN</span>
                          </button>
                          <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"><Phone size={20}/></button>
                          <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"><MoreVertical size={20}/></button>
                        </div>
                  </div>

                  {/* Messages List */}
                  <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-[#F1F5F9] chat-scrollbar">
                      
                      {/* Safety Banner */}
                      {isPartnerBanned ? (
                        <div className="mx-auto max-w-lg bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3 shadow-sm animate-msg">
                           <ShieldAlert className="text-red-500 shrink-0 mt-0.5" />
                           <div>
                              <h4 className="text-sm font-bold text-red-700">Cảnh báo rủi ro</h4>
                              <p className="text-xs text-red-600 mt-1">Tài khoản này đang bị hạn chế do vi phạm chính sách. Vui lòng không chuyển khoản trước.</p>
                           </div>
                        </div>
                      ) : (
                        <div className="mx-auto max-w-md bg-blue-50/50 border border-blue-100 rounded-xl p-3 text-center shadow-sm">
                           <p className="text-xs text-blue-600 font-medium">🛡️ Mẹo: Giao dịch tại H6 hoặc Thư viện để đảm bảo an toàn.</p>
                        </div>
                      )}

                      {/* Messages Loop */}
                      {messages.map((msg, idx) => {
                          const isMe = msg.sender_id === user?.id;
                          return (
                              <div key={idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-msg`} style={{animationDelay: `${idx * 0.05}s`}}>
                                  {!isMe && <img src={partnerProfile?.avatar_url} className="w-8 h-8 rounded-full border border-white shadow-sm mr-2 self-end mb-1"/>}
                                  
                                  <div className={`max-w-[75%] sm:max-w-[65%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                      <div 
                                        className={`px-4 py-3 shadow-sm relative text-sm leading-relaxed ${
                                            isMe 
                                            ? 'bg-gradient-to-br from-[#00418E] to-[#0065D1] text-white rounded-2xl rounded-tr-none' 
                                            : 'bg-white text-slate-700 rounded-2xl rounded-tl-none border border-gray-100'
                                        }`}
                                      >
                                          {msg.type === 'image' ? (
                                              <img 
                                                src={msg.image_url} 
                                                className="rounded-lg max-h-64 object-cover hover:scale-[1.02] transition-transform cursor-zoom-in border border-white/20" 
                                                onClick={() => window.open(msg.image_url)} 
                                              />
                                          ) : msg.type === 'location' ? (
                                              <div className="flex items-center gap-2 font-bold"><MapPin size={18} className={isMe ? 'text-white' : 'text-red-500'}/> {msg.content}</div>
                                          ) : (
                                              msg.content
                                          )}
                                      </div>
                                      <span className="text-[10px] text-slate-400 mt-1 px-1 font-medium">{new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                  </div>
                              </div>
                          );
                      })}
                      <div ref={scrollRef} />
                  </div>

                  {/* Input Area */}
                  <div className="p-4 bg-white border-t border-gray-100 z-30">
                      
                      {/* Tools & Quick Replies Toggle */}
                      {showTools && (
                          <div className="mb-3 animate-slide-in space-y-3">
                              {/* Locations */}
                              <div className="flex gap-2 overflow-x-auto chat-scrollbar pb-1">
                                  {SUGGESTED_LOCATIONS.map((loc, i) => (
                                      <button key={i} onClick={() => handleSendMessage(loc, 'location')} className="flex-shrink-0 px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-bold border border-red-100 hover:bg-red-100 transition-colors flex items-center gap-1">
                                          <MapPin size={12}/> {loc.replace('📍 ','')}
                                      </button>
                                  ))}
                              </div>
                              {/* Quick Text */}
                              <div className="flex gap-2 overflow-x-auto chat-scrollbar pb-1">
                                  {QUICK_REPLIES.map((text, i) => (
                                      <button key={i} onClick={() => handleSendMessage(text)} className="flex-shrink-0 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold border border-blue-100 hover:bg-blue-100 transition-colors flex items-center gap-1">
                                          <Zap size={12}/> {text}
                                      </button>
                                  ))}
                              </div>
                          </div>
                      )}

                      {/* Main Input Bar */}
                      {isRestricted || isPartnerBanned ? (
                        <div className="flex items-center justify-center gap-2 p-3 bg-slate-100 text-slate-500 rounded-xl text-sm font-bold">
                           <ShieldAlert size={18}/> Chức năng chat tạm thời bị khóa.
                        </div>
                      ) : (
                        <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="flex items-end gap-2 relative">
                            {/* Attachment Button */}
                            <label className="p-3 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl cursor-pointer transition-colors">
                                {uploadingImg ? <Loader size={24} className="animate-spin"/> : <ImageIcon size={24}/>}
                                <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={uploadingImg} />
                            </label>

                            {/* Tools Toggle */}
                            <button type="button" onClick={() => setShowTools(!showTools)} className={`p-3 rounded-xl transition-colors ${showTools ? 'bg-indigo-100 text-indigo-600' : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50'}`}>
                                <CornerDownRight size={24}/>
                            </button>

                            {/* Text Input */}
                            <div className="flex-1 bg-slate-100 rounded-2xl flex items-center px-4 py-3 focus-within:ring-2 focus-within:ring-blue-100 focus-within:bg-white transition-all">
                                <input 
                                    type="text" 
                                    value={newMessage} 
                                    onChange={(e) => setNewMessage(e.target.value)} 
                                    placeholder="Nhập tin nhắn..." 
                                    className="flex-1 bg-transparent outline-none text-sm font-medium text-slate-800 placeholder-slate-400"
                                />
                            </div>

                            {/* Send Button */}
                            <button 
                                type="submit" 
                                disabled={!newMessage.trim()} 
                                className="p-3 bg-[#00418E] text-white rounded-xl hover:bg-[#003370] disabled:opacity-50 disabled:hover:bg-[#00418E] shadow-lg shadow-blue-500/30 transition-all active:scale-95"
                            >
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
