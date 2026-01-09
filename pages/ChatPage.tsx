import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useToast } from '../contexts/ToastContext';
import { 
  Send, Image as ImageIcon, Phone, Search, 
  ArrowLeft, MoreVertical, ShoppingBag, CheckCircle, 
  XCircle, Clock, ShieldCheck, CornerDownRight
} from 'lucide-react'; 
import { playMessageSound } from '../utils/audio';

// --- STYLES ---
const VisualEngine = () => (
  <style>{`
    :root { --primary: #00418E; --bg-chat: #F0F4F8; }
    
    .chat-container { height: calc(100vh - 64px); background-color: var(--bg-chat); }
    
    .glass-sidebar {
      background: rgba(255, 255, 255, 0.8);
      backdrop-filter: blur(12px);
      border-right: 1px solid rgba(255, 255, 255, 0.6);
    }

    .chat-window {
      background-image: radial-gradient(#cbd5e1 1px, transparent 1px);
      background-size: 20px 20px;
      background-color: #F8FAFC;
    }

    .msg-bubble {
      max-width: 75%;
      padding: 12px 16px;
      border-radius: 20px;
      position: relative;
      font-size: 14px;
      line-height: 1.5;
      box-shadow: 0 2px 4px rgba(0,0,0,0.05);
    }
    
    .msg-me {
      background: linear-gradient(135deg, #00418E, #0065D1);
      color: white;
      border-bottom-right-radius: 4px;
      margin-left: auto;
    }
    
    .msg-you {
      background: white;
      color: #1E293B;
      border-bottom-left-radius: 4px;
      margin-right: auto;
      border: 1px solid #E2E8F0;
    }

    .system-msg {
      font-size: 11px;
      font-weight: 600;
      color: #64748B;
      background: #F1F5F9;
      padding: 4px 12px;
      border-radius: 12px;
      margin: 16px auto;
      text-align: center;
      width: fit-content;
      border: 1px solid #E2E8F0;
    }

    .custom-scrollbar::-webkit-scrollbar { width: 5px; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: #CBD5E1; border-radius: 10px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
  `}</style>
);

const QUICK_REPLIES = ["Sản phẩm còn mới không?", "Có bớt giá không bạn?", "Giao dịch ở H6 nhé?", "Cho mình xem thêm ảnh thật"];

const ChatPage: React.FC = () => {
  const { user } = useAuth(); 
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
  const scrollRef = useRef<HTMLDivElement>(null);

  // --- INITIALIZATION ---
  useEffect(() => { if(user) fetchConversations(); }, [user]);

  useEffect(() => {
    const initChat = async () => {
        if (!user || !partnerIdParam) return;
        
        // Load Product info if entering from product page
        if (productIdParam) {
            const { data } = await supabase.from('products').select('*').eq('id', productIdParam).single();
            setTargetProduct(data);
        }

        await checkAndCreateConversation(partnerIdParam);
    };
    initChat();
  }, [partnerIdParam, productIdParam, user]);

  // --- REALTIME SUBSCRIPTION ---
  useEffect(() => {
    if (!activeConversation) return;
    fetchMessages(activeConversation);

    const channel = supabase.channel(`chat:${activeConversation}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${activeConversation}` }, (payload) => {
            setMessages(prev => {
                if (prev.some(m => m.id === payload.new.id)) return prev;
                return [...prev, payload.new];
            });
            if (user && payload.new.sender_id !== user.id) playMessageSound();
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'products', filter: `id=eq.${productIdParam}` }, (payload) => {
            if (targetProduct && payload.new.id === targetProduct.id) {
                setTargetProduct({ ...targetProduct, ...payload.new });
            }
        })
        .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [activeConversation, user, targetProduct?.id]);

  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // --- API FUNCTIONS ---
  const fetchConversations = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('conversations')
        .select(`*, p1:profiles!participant1(name, avatar_url), p2:profiles!participant2(name, avatar_url)`)
        .or(`participant1.eq.${user.id},participant2.eq.${user.id}`)
        .order('updated_at', { ascending: false });
        
      if(data) {
          const formatted = data.map((c: any) => ({
              ...c, 
              partnerName: c.participant1 === user.id ? c.p2?.name : c.p1?.name,
              partnerAvatar: c.participant1 === user.id ? c.p2?.avatar_url : c.p1?.avatar_url,
              partnerId: c.participant1 === user.id ? c.participant2 : c.participant1
          }));
          setConversations(formatted);
      }
  };

  const checkAndCreateConversation = async (pId: string) => {
      if (!user) return;
      const { data: existing } = await supabase.from('conversations').select('id').or(`and(participant1.eq.${user.id},participant2.eq.${pId}),and(participant1.eq.${pId},participant2.eq.${user.id})`).maybeSingle();
      if (existing) {
          setActiveConversation(existing.id);
      } else {
          const { data: newConv } = await supabase.from('conversations').insert({ participant1: user.id, participant2: pId }).select().single();
          if (newConv) setActiveConversation(newConv.id);
      }
      fetchPartnerInfoInternal(pId);
  };

  const fetchMessages = async (convId: string) => {
      const { data } = await supabase.from('messages').select('*').eq('conversation_id', convId).order('created_at', { ascending: true });
      if (data) setMessages(data);
  };

  const fetchPartnerInfoInternal = async (pId: string) => {
      if (!pId) return;
      const { data } = await supabase.from('profiles').select('*').eq('id', pId).single();
      if (data) setPartnerProfile(data);
  };

  // --- TRANSACTION HANDLERS ---
  const isSeller = user && targetProduct && user.id === targetProduct.seller_id;
  const isBuyer = user && targetProduct && user.id !== targetProduct.seller_id;

  const handleTransactionAction = async (action: 'request' | 'accept' | 'finish' | 'cancel') => {
      if (!activeConversation || !user || !targetProduct) return;
      setIsProcessing(true);
      
      try {
          let sysMsg = "";
          let newStatus = targetProduct.status;
          let buyerId = targetProduct.buyer_id;

          if (action === 'request') {
              sysMsg = `👋 TÔI MUỐN MUA!\nBạn xác nhận giao dịch nhé?`;
          } else if (action === 'accept') {
              if (!window.confirm("Xác nhận bán cho người này?")) return;
              newStatus = 'pending';
              buyerId = partnerProfile.id;
              sysMsg = `✅ ĐÃ XÁC NHẬN!\nSản phẩm đang được giữ. Hãy hẹn gặp để trao đổi.`;
          } else if (action === 'finish') {
              if (!window.confirm("Đã giao hàng và nhận tiền?")) return;
              newStatus = 'sold';
              sysMsg = `🎉 GIAO DỊCH THÀNH CÔNG!\nCảm ơn bạn đã ủng hộ.`;
          } else if (action === 'cancel') {
              if (!window.confirm("Hủy giao dịch này?")) return;
              newStatus = 'available';
              buyerId = null;
              sysMsg = `⚠️ ĐÃ HỦY GIAO DỊCH.`;
          }

          if (action !== 'request') {
              await supabase.from('products').update({ status: newStatus, buyer_id: buyerId }).eq('id', targetProduct.id);
              setTargetProduct({ ...targetProduct, status: newStatus, buyer_id: buyerId });
          }

          await supabase.from('messages').insert({
              conversation_id: activeConversation, sender_id: user.id, type: 'text', content: sysMsg
          });
          
          fetchMessages(activeConversation);
          addToast("Thao tác thành công", "success");
      } catch (e) { console.error(e); }
      finally { setIsProcessing(false); }
  };

  // --- SEND MESSAGE ---
  const handleSendMessage = async (e?: React.FormEvent) => {
      e?.preventDefault();
      if (!newMessage.trim() || !activeConversation || !user) return;

      const content = newMessage;
      setNewMessage(''); 

      const { data, error } = await supabase.from('messages').insert({ 
          conversation_id: activeConversation, 
          sender_id: user.id, 
          content: content, 
          type: 'text' 
      }).select().single();

      if (!error && data) { 
          await supabase.from('conversations').update({ updated_at: new Date().toISOString() }).eq('id', activeConversation);
          setMessages(prev => [...prev, data]);
      } else {
          setNewMessage(content);
      }
  };

  const filteredConversations = conversations.filter(c => c.partnerName?.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="max-w-7xl mx-auto chat-container flex overflow-hidden shadow-2xl m-0 md:my-4 md:rounded-2xl border border-white/50">
      <VisualEngine />
      
      {/* === LEFT SIDEBAR === */}
      <div className={`w-full md:w-80 lg:w-96 glass-sidebar flex flex-col ${activeConversation ? 'hidden md:flex' : 'flex'}`}>
         {/* Sidebar Header */}
         <div className="p-5 border-b border-slate-100">
            <h2 className="font-black text-2xl text-slate-800 mb-4">Tin nhắn</h2>
            <div className="relative group">
               <input 
                 value={searchTerm} 
                 onChange={e => setSearchTerm(e.target.value)} 
                 placeholder="Tìm kiếm..." 
                 className="w-full bg-slate-100 rounded-xl px-4 py-2.5 pl-10 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-[#00418E]/20 transition-all"
               />
               <Search className="absolute left-3 top-2.5 text-slate-400 group-focus-within:text-[#00418E]" size={18}/>
            </div>
         </div>

         {/* Conversation List */}
         <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-1">
            {filteredConversations.map(conv => (
               <div 
                 key={conv.id} 
                 onClick={() => { setActiveConversation(conv.id); fetchPartnerInfoInternal(conv.partnerId); setTargetProduct(null); }} 
                 className={`p-3 flex gap-3 cursor-pointer rounded-xl transition-all ${activeConversation === conv.id ? 'bg-[#00418E]/5 border border-[#00418E]/10' : 'hover:bg-white hover:shadow-sm'}`}
               >
                  <div className="relative">
                    <img src={conv.partnerAvatar || 'https://via.placeholder.com/50'} className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm"/>
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                     <p className={`font-bold text-sm truncate ${activeConversation === conv.id ? 'text-[#00418E]' : 'text-slate-700'}`}>{conv.partnerName}</p>
                     <p className="text-xs text-slate-400 truncate">Nhấn để xem tin nhắn</p>
                  </div>
               </div>
            ))}
         </div>
      </div>

      {/* === RIGHT CHAT AREA === */}
      <div className={`flex-1 flex flex-col relative chat-window ${!activeConversation ? 'hidden md:flex' : 'flex'}`}>
         {activeConversation ? (
            <>
               {/* 1. HEADER */}
               <div className="h-16 px-6 flex items-center justify-between bg-white/90 backdrop-blur border-b border-slate-100 shadow-sm z-20">
                  <div className="flex items-center gap-3">
                     <button onClick={() => setActiveConversation(null)} className="md:hidden p-2 -ml-2 text-slate-500"><ArrowLeft/></button>
                     {partnerProfile && (
                        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate(`/profile/${partnerProfile.id}`)}>
                           <img src={partnerProfile.avatar_url} className="w-10 h-10 rounded-full border border-slate-200 shadow-sm"/>
                           <div>
                              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1">
                                {partnerProfile.name}
                                {partnerProfile.verified_status === 'verified' && <ShieldCheck size={14} className="text-blue-500"/>}
                              </h3>
                              <span className="text-xs text-green-600 font-bold flex items-center gap-1"><span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span> Online</span>
                           </div>
                        </div>
                     )}
                  </div>
                  <div className="flex gap-2">
                    <button className="p-2 text-slate-400 hover:text-[#00418E] hover:bg-blue-50 rounded-full transition-colors"><Phone size={20}/></button>
                    <button className="p-2 text-slate-400 hover:text-[#00418E] hover:bg-blue-50 rounded-full transition-colors"><MoreVertical size={20}/></button>
                  </div>
               </div>

               {/* 2. TRANSACTION CARD (PINNED) */}
               {targetProduct && (
                  <div className="p-4 mx-6 mt-4 bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row gap-4 items-center animate-in slide-in-from-top-2">
                     <img src={targetProduct.images?.[0]} className="w-16 h-16 rounded-xl object-cover bg-slate-100 border border-slate-200"/>
                     <div className="flex-1 text-center md:text-left">
                        <div className="flex items-center justify-center md:justify-start gap-2 mb-1">
                           <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider text-white ${targetProduct.status === 'sold' ? 'bg-slate-500' : targetProduct.status === 'pending' ? 'bg-orange-500' : 'bg-green-500'}`}>
                              {targetProduct.status === 'available' ? 'Đang bán' : targetProduct.status === 'pending' ? 'Đang giao dịch' : 'Đã bán'}
                           </span>
                        </div>
                        <h4 className="font-bold text-slate-800 text-sm line-clamp-1">{targetProduct.title}</h4>
                        <p className="text-[#00418E] font-black">{targetProduct.price === 0 ? 'Miễn phí' : `${targetProduct.price.toLocaleString()}đ`}</p>
                     </div>

                     {/* Action Buttons */}
                     <div className="flex gap-2 w-full md:w-auto">
                        {isBuyer && targetProduct.status === 'available' && (
                           <button onClick={() => handleTransactionAction('request')} disabled={isProcessing} className="flex-1 bg-[#00418E] hover:bg-[#00306b] text-white py-2 px-4 rounded-xl font-bold text-xs shadow-lg shadow-blue-900/20 transition-all flex items-center justify-center gap-2">
                              <ShoppingBag size={16}/> Mua ngay
                           </button>
                        )}
                        {isSeller && targetProduct.status === 'available' && messages.length > 0 && (
                           <button onClick={() => handleTransactionAction('accept')} disabled={isProcessing} className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-xl font-bold text-xs shadow-lg shadow-green-600/20 transition-all flex items-center justify-center gap-2">
                              <CheckCircle size={16}/> Chốt đơn
                           </button>
                        )}
                        {isSeller && targetProduct.status === 'pending' && (
                           <>
                              <button onClick={() => handleTransactionAction('finish')} className="flex-1 bg-green-600 text-white py-2 px-3 rounded-xl font-bold text-xs shadow-md">Hoàn tất</button>
                              <button onClick={() => handleTransactionAction('cancel')} className="bg-slate-100 text-slate-600 py-2 px-3 rounded-xl font-bold text-xs hover:bg-slate-200">Hủy</button>
                           </>
                        )}
                        {targetProduct.status === 'sold' && (
                           <div className="px-4 py-2 bg-slate-100 text-slate-500 rounded-xl font-bold text-xs flex items-center gap-2">
                              <CheckCircle size={14}/> Giao dịch thành công
                           </div>
                        )}
                     </div>
                  </div>
               )}

               {/* 3. MESSAGES LIST */}
               <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-3">
                  {messages.map((msg, idx) => {
                     const senderId = msg.sender_id || msg.senderId; 
                     const content = msg.content || msg.text;
                     const isMe = senderId === user?.id;
                     
                     // System Message Style
                     if (content && (content.includes("YÊU CẦU") || content.includes("ĐÃ XÁC NHẬN") || content.includes("GIAO DỊCH THÀNH CÔNG") || content.includes("HỦY GIAO DỊCH"))) {
                        return <div key={idx} className="system-msg">{content}</div>
                     }

                     return (
                        <div key={idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-in fade-in zoom-in-95 duration-200`}>
                           {!isMe && <img src={partnerProfile?.avatar_url} className="w-8 h-8 rounded-full mr-2 self-end mb-1 border border-white shadow-sm"/>}
                           <div className={`msg-bubble ${isMe ? 'msg-me' : 'msg-you'}`}>
                              {msg.type === 'image' ? (
                                <img src={msg.image_url} className="rounded-lg max-w-[240px] cursor-pointer hover:opacity-90 transition-opacity" onClick={() => window.open(msg.image_url)}/>
                              ) : (
                                <p>{content}</p>
                              )}
                              <span className={`text-[10px] absolute bottom-1 ${isMe ? 'right-3 text-blue-200' : 'left-3 text-slate-400'} opacity-0 group-hover:opacity-100 transition-opacity`}>
                                {new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                              </span>
                           </div>
                        </div>
                     );
                  })}
                  <div ref={scrollRef} />
               </div>

               {/* 4. INPUT AREA */}
               <div className="p-4 bg-white border-t border-slate-100">
                  {/* Quick Replies */}
                  <div className="flex gap-2 overflow-x-auto pb-3 custom-scrollbar">
                     {QUICK_REPLIES.map((t, i) => (
                        <button key={i} onClick={() => setNewMessage(t)} className="whitespace-nowrap px-4 py-1.5 bg-slate-50 border border-slate-200 text-xs rounded-full hover:bg-blue-50 hover:text-[#00418E] hover:border-blue-100 text-slate-600 font-medium transition-colors">
                           {t}
                        </button>
                     ))}
                  </div>
                  
                  <form onSubmit={handleSendMessage} className="flex items-end gap-3 mt-1">
                     <button type="button" className="p-3 text-slate-400 hover:text-[#00418E] hover:bg-blue-50 rounded-full transition-colors"><ImageIcon size={24}/></button>
                     <div className="flex-1 bg-slate-100 rounded-2xl px-5 py-3 focus-within:bg-white focus-within:ring-2 focus-within:ring-[#00418E]/20 focus-within:shadow-sm transition-all border border-transparent focus-within:border-blue-100">
                        <input 
                          value={newMessage} 
                          onChange={e => setNewMessage(e.target.value)} 
                          placeholder="Nhập tin nhắn..." 
                          className="w-full bg-transparent outline-none text-sm text-slate-800 font-medium placeholder:text-slate-400"
                        />
                     </div>
                     <button 
                       type="submit" 
                       disabled={!newMessage.trim()} 
                       className="p-3 bg-[#00418E] text-white rounded-full hover:bg-[#00306b] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-900/20 transition-all active:scale-95"
                     >
                        <Send size={20}/>
                     </button>
                  </form>
               </div>
            </>
         ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-300 bg-slate-50/50">
               <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-sm mb-6">
                  <CornerDownRight size={40} className="text-slate-200"/>
               </div>
               <p className="font-bold text-lg text-slate-400">Chọn một hội thoại để bắt đầu</p>
               <p className="text-sm">Kết nối với cộng đồng sinh viên Bách Khoa</p>
            </div>
         )}
      </div>
    </div>
  );
};

export default ChatPage;
