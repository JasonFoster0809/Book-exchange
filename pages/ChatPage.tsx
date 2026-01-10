import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useToast } from '../contexts/ToastContext';
import { 
  Send, Image as ImageIcon, Phone, ArrowLeft, Loader2, ShoppingBag, 
  CheckCircle2, Search, MessageCircle, MoreVertical, X, AlertCircle
} from 'lucide-react'; 
import { playMessageSound } from '../utils/audio';

// ============================================================================
// STYLES & VISUAL ENGINE
// ============================================================================
const VisualEngine = () => (
  <style>{`
    /* Custom Scrollbar */
    .chat-scrollbar::-webkit-scrollbar { width: 5px; }
    .chat-scrollbar::-webkit-scrollbar-track { background: transparent; }
    .chat-scrollbar::-webkit-scrollbar-thumb { background: #CBD5E1; border-radius: 10px; }
    .chat-scrollbar::-webkit-scrollbar-thumb:hover { background: #94A3B8; }
    
    /* Message Bubbles */
    .msg-bubble { 
      max-width: 75%; padding: 10px 16px; border-radius: 18px; 
      position: relative; font-size: 14px; line-height: 1.5; word-wrap: break-word; 
      box-shadow: 0 1px 2px rgba(0,0,0,0.05);
    }
    .msg-me { 
      background: linear-gradient(135deg, #00418E 0%, #0065D1 100%); 
      color: white; border-bottom-right-radius: 4px; margin-left: auto; 
    }
    .msg-you { 
      background: #FFFFFF; color: #1E293B; border: 1px solid #F1F5F9;
      border-bottom-left-radius: 4px; margin-right: auto; 
    }
    
    /* Transaction Card */
    .transaction-card {
      background: #F8FAFC; border-bottom: 1px solid #E2E8F0; 
      z-index: 20; backdrop-filter: blur(10px);
    }

    /* Animations */
    .animate-slide-in { animation: slideIn 0.3s ease-out forwards; }
    @keyframes slideIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
  `}</style>
);

const QUICK_REPLIES = ["Sản phẩm còn mới không?", "Có bớt giá không bạn?", "Giao dịch ở H6 nhé?", "Cho mình xem thêm ảnh thật"];

const ChatPage: React.FC = () => {
  const { user } = useAuth(); 
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Params từ URL (khi bấm từ trang Product Detail / Profile)
  const partnerIdParam = searchParams.get('partnerId');
  const productIdParam = searchParams.get('productId'); 
  
  // State Data
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeConversation, setActiveConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [partnerProfile, setPartnerProfile] = useState<any>(null);
  
  // State Giao dịch
  const [targetProduct, setTargetProduct] = useState<any>(null); 
  
  // State UI
  const [newMessage, setNewMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [loadingConv, setLoadingConv] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  // 1. Fetch Conversations khi vào trang
  useEffect(() => { 
    if(user) fetchConversations(); 
  }, [user]);

  // 2. Logic "Nhảy" vào chat từ trang khác (Deep Linking)
  useEffect(() => {
    const initChat = async () => {
        if (!user || !partnerIdParam) return;
        
        // Nếu có productId -> Lấy thông tin để ghim
        if (productIdParam) {
            const { data } = await supabase.from('products').select('*').eq('id', productIdParam).single();
            if (data) setTargetProduct(data);
        }

        // Tạo hoặc Tìm hội thoại
        await checkAndCreateConversation(partnerIdParam);
    };
    initChat();
  }, [partnerIdParam, productIdParam, user]);

  // 3. Realtime Listener (Tin nhắn & Trạng thái sản phẩm)
  useEffect(() => {
    if (!activeConversation) return;
    fetchMessages(activeConversation);

    const channel = supabase.channel(`chat_room:${activeConversation}`)
        // Listen tin nhắn mới
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${activeConversation}` }, (payload) => {
            setMessages(prev => {
                if (prev.some(m => m.id === payload.new.id)) return prev;
                return [...prev, payload.new];
            });
            if (user && payload.new.sender_id !== user.id) playMessageSound();
            setTimeout(scrollToBottom, 100);
        })
        // Listen trạng thái sản phẩm (nếu đang ghim)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'products', filter: `id=eq.${targetProduct?.id}` }, (payload) => {
            if (targetProduct && payload.new.id === targetProduct.id) {
                setTargetProduct({ ...targetProduct, ...payload.new });
            }
        })
        .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [activeConversation, user, targetProduct?.id]);

  useEffect(() => { scrollToBottom(); }, [messages]);

  const scrollToBottom = () => scrollRef.current?.scrollIntoView({ behavior: 'smooth' });

  // --- API FUNCTIONS ---

  const fetchConversations = async () => {
      setLoadingConv(true);
      if (!user) return;
      
      // Query phức tạp để lấy thông tin partner từ 2 phía
      const { data } = await supabase
          .from('conversations')
          .select(`*, p1:profiles!participant1(id, name, avatar_url), p2:profiles!participant2(id, name, avatar_url)`)
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
                  partnerId: partner?.id
              };
          });
          setConversations(formatted);
      }
      setLoadingConv(false);
  };

  const checkAndCreateConversation = async (pId: string) => {
      if (!user) return;
      
      // Check existing
      const { data: existing } = await supabase.from('conversations')
          .select('id')
          .or(`and(participant1.eq.${user.id},participant2.eq.${pId}),and(participant1.eq.${pId},participant2.eq.${user.id})`)
          .maybeSingle();

      if (existing) {
          setActiveConversation(existing.id);
      } else {
          // Create new
          const { data: newConv } = await supabase.from('conversations')
              .insert({ participant1: user.id, participant2: pId })
              .select()
              .single();
          
          if (newConv) {
              setActiveConversation(newConv.id);
              await fetchConversations(); // Refresh list sidebar
          }
      }
      fetchPartnerInfoInternal(pId);
  };

  const fetchMessages = async (convId: string) => {
      const { data } = await supabase.from('messages')
          .select('*')
          .eq('conversation_id', convId)
          .order('created_at', { ascending: true });
      if (data) setMessages(data);
  };

  const fetchPartnerInfoInternal = async (pId: string) => {
      if (!pId) return;
      const { data } = await supabase.from('profiles').select('*').eq('id', pId).single();
      if (data) setPartnerProfile(data);
  };

  // --- TRANSACTION HANDLERS ---

  const handleSendMessage = async (e?: React.FormEvent, content: string = newMessage) => {
      e?.preventDefault();
      if (!content.trim() || !activeConversation || !user) return;

      setNewMessage(''); // Clear input

      const { error } = await supabase.from('messages').insert({ 
          conversation_id: activeConversation, 
          sender_id: user.id, 
          content: content, 
          type: 'text' 
      });

      if (!error) {
          // Update timestamp để conversation nổi lên đầu
          await supabase.from('conversations').update({ updated_at: new Date().toISOString() }).eq('id', activeConversation);
          // Không cần setMessages thủ công vì đã có Realtime
      } else {
          setNewMessage(content); // Revert nếu lỗi
          addToast("Lỗi gửi tin nhắn", "error");
      }
  };

  // 1. Gửi yêu cầu mua
  const handleRequestDeal = async () => {
      if (!activeConversation || !user) return;
      setIsProcessing(true);
      await handleSendMessage(undefined, `👋 TÔI MUỐN MUA MÓN NÀY!\nBạn xác nhận giao dịch nhé?`);
      setIsProcessing(false);
      addToast("Đã gửi yêu cầu mua", "success");
  };

  // 2. Chấp nhận bán (Available -> Pending)
  const handleAcceptDeal = async () => {
      if (!targetProduct || !activeConversation) return;
      if (!confirm("Xác nhận bán cho người này? Sản phẩm sẽ chuyển sang trạng thái 'Đang giao dịch'.")) return;
      
      setIsProcessing(true);
      try {
          await supabase.from('products').update({ status: 'pending', buyer_id: partnerProfile.id }).eq('id', targetProduct.id);
          await handleSendMessage(undefined, `✅ ĐÃ XÁC NHẬN!\nSản phẩm đang được giữ cho bạn.`);
          setTargetProduct({ ...targetProduct, status: 'pending' });
          addToast("Đã xác nhận giao dịch", "success");
      } catch(e) { console.error(e); }
      finally { setIsProcessing(false); }
  };

  // 3. Hoàn tất (Pending -> Sold)
  const handleFinishDeal = async () => {
      if (!targetProduct || !activeConversation) return;
      if (!confirm("Xác nhận đã giao hàng và nhận tiền?")) return;

      setIsProcessing(true);
      try {
          await supabase.from('products').update({ status: 'sold' }).eq('id', targetProduct.id);
          await handleSendMessage(undefined, `🎉 GIAO DỊCH THÀNH CÔNG!\nCảm ơn bạn đã ủng hộ.`);
          setTargetProduct({ ...targetProduct, status: 'sold' });
          addToast("Giao dịch thành công!", "success");
      } catch(e) { console.error(e); }
      finally { setIsProcessing(false); }
  };

  // 4. Hủy (Pending -> Available)
  const handleCancelDeal = async () => {
      if (!targetProduct || !activeConversation) return;
      if (!confirm("Hủy giao dịch này và đăng bán lại?")) return;

      setIsProcessing(true);
      try {
          await supabase.from('products').update({ status: 'available', buyer_id: null }).eq('id', targetProduct.id);
          await handleSendMessage(undefined, `⚠️ ĐÃ HỦY GIAO DỊCH.`);
          setTargetProduct({ ...targetProduct, status: 'available', buyer_id: null });
          addToast("Đã hủy giao dịch", "info");
      } catch(e) { console.error(e); }
      finally { setIsProcessing(false); }
  };

  // Roles
  const isSeller = user && targetProduct && user.id === targetProduct.seller_id;
  const isBuyer = user && targetProduct && user.id !== targetProduct.seller_id;

  // Filter List
  const filteredConversations = conversations.filter(c => c.partnerName?.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="max-w-7xl mx-auto h-[calc(100vh-64px)] flex bg-[#F1F5F9] font-sans overflow-hidden">
      <VisualEngine />
      
      {/* --- SIDEBAR --- */}
      <div className={`w-full md:w-[360px] bg-white border-r border-slate-200 flex flex-col ${activeConversation ? 'hidden md:flex' : 'flex'}`}>
         {/* Sidebar Header */}
         <div className="p-4 border-b border-slate-100">
            <h2 className="font-black text-2xl mb-4 text-[#00418E]">Tin nhắn</h2>
            <div className="relative">
               <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Tìm kiếm..." className="w-full bg-slate-100 rounded-xl px-4 py-2.5 pl-10 text-sm outline-none focus:ring-2 focus:ring-[#00418E]/20 transition-all"/>
               <Search className="absolute left-3 top-3 text-slate-400" size={16}/>
            </div>
         </div>
         
         {/* Conversations List */}
         <div className="flex-1 overflow-y-auto chat-scrollbar">
            {loadingConv ? (
                <div className="flex justify-center pt-10"><Loader2 className="animate-spin text-slate-400"/></div>
            ) : filteredConversations.length === 0 ? (
                <div className="text-center pt-10 px-6">
                    <MessageCircle className="mx-auto text-slate-200 mb-2" size={48}/>
                    <p className="text-slate-400 text-sm">Chưa có tin nhắn nào.</p>
                </div>
            ) : (
                filteredConversations.map(conv => (
                   <div key={conv.id} onClick={() => { setActiveConversation(conv.id); fetchPartnerInfoInternal(conv.partnerId); setTargetProduct(null); }} 
                        className={`p-4 flex gap-3 cursor-pointer hover:bg-slate-50 transition-colors border-b border-slate-50 ${activeConversation === conv.id ? 'bg-blue-50/50 border-l-4 border-l-[#00418E]' : 'border-l-4 border-l-transparent'}`}>
                      <div className="relative">
                          <img src={conv.partnerAvatar || 'https://via.placeholder.com/50'} className="w-12 h-12 rounded-full object-cover border border-slate-200 bg-white"/>
                      </div>
                      <div className="flex-1 min-w-0 flex flex-col justify-center">
                         <p className={`font-bold text-sm truncate ${activeConversation === conv.id ? 'text-[#00418E]' : 'text-slate-800'}`}>{conv.partnerName}</p>
                         <p className="text-xs text-slate-500 truncate mt-0.5">Nhấn để xem tin nhắn</p>
                      </div>
                   </div>
                ))
            )}
         </div>
      </div>

      {/* --- CHAT AREA --- */}
      <div className={`flex-1 flex flex-col relative bg-[#F8FAFC] ${!activeConversation ? 'hidden md:flex' : 'flex'}`}>
         {activeConversation ? (
            <>
               {/* 1. Header */}
               <div className="h-16 border-b border-slate-200 bg-white/80 backdrop-blur-md flex items-center px-4 justify-between shadow-sm z-30 sticky top-0">
                  <div className="flex items-center gap-3">
                     <button onClick={() => setActiveConversation(null)} className="md:hidden p-2 hover:bg-slate-100 rounded-full text-slate-600"><ArrowLeft size={20}/></button>
                     {partnerProfile && (
                        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate(`/profile/${partnerProfile.id}`)}>
                           <div className="relative">
                               <img src={partnerProfile.avatar_url || 'https://via.placeholder.com/40'} className="w-10 h-10 rounded-full border border-slate-200 object-cover"/>
                               <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                           </div>
                           <div>
                              <h3 className="font-bold text-sm text-slate-800">{partnerProfile.name}</h3>
                              <span className="text-xs text-green-600 font-medium flex items-center gap-1">Đang hoạt động</span>
                           </div>
                        </div>
                     )}
                  </div>
                  <div className="flex gap-2">
                      <button className="p-2 text-slate-500 hover:bg-slate-100 rounded-full"><Phone size={20}/></button>
                      <button className="p-2 text-slate-500 hover:bg-slate-100 rounded-full"><MoreVertical size={20}/></button>
                  </div>
               </div>

               {/* 2. Transaction Dashboard (Sticky) */}
               {targetProduct && (
                  <div className="transaction-card p-4 animate-slide-in">
                     <div className="flex gap-4 items-start bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                        <img src={targetProduct.images?.[0] || 'https://via.placeholder.com/80'} className="w-16 h-16 rounded-lg object-cover border border-slate-100 bg-slate-50"/>
                        <div className="flex-1 min-w-0">
                           <div className="flex items-center gap-2 mb-1">
                              <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md text-white uppercase tracking-wider ${targetProduct.status === 'sold' ? 'bg-slate-500' : targetProduct.status === 'pending' ? 'bg-orange-500' : 'bg-green-500'}`}>
                                 {targetProduct.status === 'available' ? 'Đang bán' : targetProduct.status === 'pending' ? 'Đang giao dịch' : 'Đã bán'}
                              </span>
                              <h4 className="font-bold text-slate-800 text-sm truncate">{targetProduct.title}</h4>
                           </div>
                           <p className="text-[#00418E] font-black text-lg">{targetProduct.price === 0 ? 'Miễn phí' : `${targetProduct.price.toLocaleString()}đ`}</p>
                        </div>
                        <button onClick={() => setTargetProduct(null)} className="text-slate-400 hover:text-slate-600"><X size={16}/></button>
                     </div>

                     {/* Action Buttons */}
                     <div className="flex gap-2 mt-3">
                        {isBuyer && targetProduct.status === 'available' && (
                           <button onClick={handleRequestDeal} disabled={isProcessing} className="flex-1 bg-[#00418E] hover:bg-[#00306b] text-white py-2.5 rounded-xl font-bold text-sm shadow-sm transition-all flex justify-center items-center gap-2 active:scale-95">
                              {isProcessing ? <Loader2 size={16} className="animate-spin"/> : <ShoppingBag size={16}/>} Yêu cầu mua
                           </button>
                        )}

                        {isSeller && targetProduct.status === 'available' && (
                           <button onClick={handleAcceptDeal} disabled={isProcessing} className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-xl font-bold text-sm shadow-sm transition-all flex justify-center items-center gap-2 active:scale-95">
                              <CheckCircle2 size={16}/> Chấp nhận giao dịch
                           </button>
                        )}

                        {isSeller && targetProduct.status === 'pending' && (
                           <>
                              <button onClick={handleFinishDeal} disabled={isProcessing} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl font-bold text-sm shadow-sm flex justify-center items-center gap-2">
                                 <CheckCircle2 size={16}/> Hoàn tất
                              </button>
                              <button onClick={handleCancelDeal} disabled={isProcessing} className="px-4 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-bold text-sm">
                                 Hủy
                              </button>
                           </>
                        )}

                        {isBuyer && targetProduct.status === 'pending' && (
                           <div className="flex-1 bg-orange-50 text-orange-700 py-2.5 rounded-xl font-bold text-xs text-center border border-orange-200 flex items-center justify-center gap-2">
                              <Loader2 size={14} className="animate-spin"/> Đang chờ người bán xác nhận...
                           </div>
                        )}

                        {targetProduct.status === 'sold' && (
                           <div className="flex-1 bg-slate-100 text-slate-500 py-2.5 rounded-xl font-bold text-xs text-center border border-slate-200 flex justify-center items-center gap-2">
                              <CheckCircle2 size={14}/> Giao dịch đã hoàn tất
                           </div>
                        )}
                     </div>
                  </div>
               )}

               {/* 3. Messages List */}
               <div className="flex-1 overflow-y-auto p-4 space-y-3 chat-scrollbar bg-[#F8FAFC]">
                  {messages.length === 0 && (
                      <div className="flex flex-col items-center justify-center h-full text-slate-400 opacity-60">
                          <ShoppingBag size={48} className="mb-2"/>
                          <p className="font-medium text-sm">Bắt đầu trò chuyện để mua bán ngay!</p>
                      </div>
                  )}
                  
                  {messages.map((msg, idx) => {
                     const isMe = msg.sender_id === user?.id;
                     const isSystem = msg.content?.includes("TÔI MUỐN MUA") || msg.content?.includes("ĐÃ XÁC NHẬN") || msg.content?.includes("GIAO DỊCH");

                     if (isSystem) {
                         return (
                             <div key={idx} className="flex justify-center my-6">
                                 <div className="bg-slate-100 border border-slate-200 text-slate-600 px-4 py-2 rounded-full text-xs font-bold shadow-sm flex items-center gap-2">
                                     <AlertCircle size={12} className="text-[#00418E]"/>
                                     <span className="whitespace-pre-wrap text-center">{msg.content}</span>
                                 </div>
                             </div>
                         )
                     }

                     return (
                        <div key={idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-slide-in`}>
                           {!isMe && <img src={partnerProfile?.avatar_url} className="w-8 h-8 rounded-full mr-2 self-end border border-slate-200 bg-white"/>}
                           <div className={`msg-bubble ${isMe ? 'msg-me' : 'msg-you'}`}>
                              {msg.type === 'image' ? <img src={msg.image_url} className="rounded-lg max-w-[200px] border border-white/20"/> : <p>{msg.content}</p>}
                           </div>
                        </div>
                     );
                  })}
                  <div ref={scrollRef} className="h-2"/>
               </div>

               {/* 4. Input Area */}
               <div className="p-3 bg-white border-t border-slate-200">
                  <div className="flex gap-2 overflow-x-auto pb-3 chat-scrollbar">
                     {QUICK_REPLIES.map((t, i) => (
                        <button key={i} onClick={() => handleSendMessage(undefined, t)} className="whitespace-nowrap px-3 py-1.5 bg-slate-50 border border-slate-200 text-xs rounded-full hover:bg-[#00418E] hover:text-white hover:border-[#00418E] text-slate-600 font-bold transition-all">
                            {t}
                        </button>
                     ))}
                  </div>
                  <form onSubmit={(e) => handleSendMessage(e)} className="flex items-center gap-2">
                     <button type="button" className="p-2.5 text-slate-400 hover:text-[#00418E] hover:bg-blue-50 rounded-full transition-colors"><ImageIcon size={22}/></button>
                     <div className="flex-1 bg-slate-100 rounded-full px-5 py-3 focus-within:ring-2 focus-within:ring-[#00418E]/20 transition-all">
                        <input value={newMessage} onChange={e => setNewMessage(e.target.value)} placeholder="Nhập tin nhắn..." className="w-full bg-transparent outline-none text-sm text-slate-800 placeholder:text-slate-400"/>
                     </div>
                     <button type="submit" disabled={!newMessage.trim()} className="p-3 bg-[#00418E] hover:bg-[#00306b] text-white rounded-full disabled:opacity-50 disabled:cursor-not-allowed shadow-md transition-all active:scale-95">
                        <Send size={20}/>
                     </button>
                  </form>
               </div>
            </>
         ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-300 bg-[#F8FAFC]">
               <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-6 shadow-sm border border-slate-100">
                  <MessageCircle size={48} className="text-slate-200"/>
               </div>
               <p className="font-bold text-slate-400">Chọn một cuộc hội thoại để bắt đầu</p>
            </div>
         )}
      </div>
    </div>
  );
};

export default ChatPage;
