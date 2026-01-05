import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useToast } from '../contexts/ToastContext';
import { 
  Send, Image as ImageIcon, MapPin, CheckCircle, 
  MessageCircle, ArrowLeft, Loader, ShoppingBag, 
  ShieldAlert, Phone, MoreVertical, Search, 
  CornerDownRight, Zap, AlertCircle, Check, X
} from 'lucide-react'; 
import { playMessageSound } from '../utils/audio';

// ============================================================================
// 1. STYLES
// ============================================================================
const ChatStyles = () => (
  <style>{`
    .chat-scrollbar::-webkit-scrollbar { width: 6px; }
    .chat-scrollbar::-webkit-scrollbar-track { background: transparent; }
    .chat-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 10px; }
    
    .msg-bubble { max-width: 75%; padding: 12px 16px; border-radius: 18px; position: relative; font-size: 14px; line-height: 1.5; }
    .msg-me { background: #0084FF; color: white; border-bottom-right-radius: 4px; margin-left: auto; }
    .msg-you { background: #E4E6EB; color: #050505; border-bottom-left-radius: 4px; margin-right: auto; }
    
    .transaction-card {
      background: white; border-bottom: 1px solid #E5E7EB; 
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
      z-index: 20;
    }
  `}</style>
);

const QUICK_REPLIES = ["Sản phẩm còn mới không?", "Có bớt giá không bạn?", "Giao dịch ở H6 nhé?", "Cho mình xem thêm ảnh thật"];

const ChatPage: React.FC = () => {
  const { user, isRestricted } = useAuth(); 
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Lấy ID từ URL
  const partnerIdParam = searchParams.get('partnerId');
  const productIdParam = searchParams.get('productId'); 
  
  // State
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeConversation, setActiveConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [partnerProfile, setPartnerProfile] = useState<any>(null);
  
  // --- STATE QUAN TRỌNG CHO GIAO DỊCH ---
  const [targetProduct, setTargetProduct] = useState<any>(null); // Sản phẩm đang giao dịch
  
  const [newMessage, setNewMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // 1. Init Data
  useEffect(() => { if(user) fetchConversations(); }, [user]);

  // 2. Xử lý Logic vào từ trang Product (Ghim sản phẩm)
  useEffect(() => {
    const initChat = async () => {
        if (!user || !partnerIdParam) return;
        
        // Fetch Product Data để ghim
        if (productIdParam) {
            const { data } = await supabase.from('products').select('*').eq('id', productIdParam).single();
            setTargetProduct(data);
        }

        await checkAndCreateConversation(partnerIdParam);
    };
    initChat();
  }, [partnerIdParam, productIdParam, user]);

  // 3. Realtime Messages & Product Status Updates
  useEffect(() => {
    if (!activeConversation) return;
    fetchMessages(activeConversation);

    const channel = supabase.channel(`chat_room:${activeConversation}`)
        // Lắng nghe tin nhắn mới
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${activeConversation}` }, (payload) => {
            setMessages(prev => [...prev, payload.new]);
            if (user && payload.new.sender_id !== user.id) playMessageSound();
        })
        // Lắng nghe thay đổi trạng thái sản phẩm (Realtime Status Update)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'products', filter: `id=eq.${productIdParam}` }, (payload) => {
            if (targetProduct && payload.new.id === targetProduct.id) {
                setTargetProduct({ ...targetProduct, ...payload.new });
            }
        })
        .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [activeConversation, user, targetProduct?.id]);

  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // --- API CALLS ---
  const fetchConversations = async () => {
      if (!user) return;
      const { data } = await supabase.from('conversations').select(`*, p1:profiles!participant1(name, avatar_url), p2:profiles!participant2(name, avatar_url)`).or(`participant1.eq.${user.id},participant2.eq.${user.id}`).order('updated_at', { ascending: false });
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
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', pId).single();
      setPartnerProfile(profile);
  };

  const fetchMessages = async (convId: string) => {
      const { data } = await supabase.from('messages').select('*').eq('conversation_id', convId).order('created_at', { ascending: true });
      if (data) setMessages(data);
  };

  // ========================================================================
  // CORE TRANSACTION LOGIC (XỬ LÝ TRẠNG THÁI MUA BÁN)
  // ========================================================================

  const isSeller = user && targetProduct && user.id === targetProduct.sellerId;
  const isBuyer = user && targetProduct && user.id !== targetProduct.sellerId;

  // 1. NGƯỜI MUA: Gửi yêu cầu giao dịch
  const handleRequestDeal = async () => {
      if (!activeConversation || !user) return;
      setIsProcessing(true);
      try {
          // Gửi tin nhắn hệ thống dạng request
          await supabase.from('messages').insert({
              conversation_id: activeConversation, sender_id: user.id, type: 'text',
              content: `👋 TÔI MUỐN MUA MÓN NÀY!\nBạn xác nhận giao dịch nhé?`
          });
          addToast("Đã gửi yêu cầu mua!", "success");
      } catch (error) { console.error(error); } 
      finally { setIsProcessing(false); }
  };

  // 2. NGƯỜI BÁN: Chấp nhận giao dịch (Chuyển Available -> Pending)
  const handleAcceptDeal = async () => {
      if (!targetProduct || !activeConversation) return;
      if (!window.confirm("Xác nhận bán cho người này? Sản phẩm sẽ chuyển sang trạng thái 'Đang giao dịch'.")) return;
      
      setIsProcessing(true);
      try {
          // Update DB: Status -> Pending, Gán buyer_id
          await supabase.from('products')
              .update({ status: 'pending', buyer_id: partnerProfile.id })
              .eq('id', targetProduct.id);
          
          // Thông báo
          await supabase.from('messages').insert({
              conversation_id: activeConversation, sender_id: user?.id, type: 'text',
              content: `✅ ĐÃ XÁC NHẬN!\nSản phẩm đang được giữ cho bạn. Hãy hẹn gặp để trao đổi.`
          });
          
          // Update Local State ngay lập tức
          setTargetProduct({ ...targetProduct, status: 'pending', buyer_id: partnerProfile.id });
          addToast("Đã chấp nhận giao dịch!", "success");
      } catch (error) { console.error(error); }
      finally { setIsProcessing(false); }
  };

  // 3. NGƯỜI BÁN: Hoàn tất (Chuyển Pending -> Sold)
  const handleFinishDeal = async () => {
      if (!targetProduct || !activeConversation) return;
      if (!window.confirm("Bạn đã nhận tiền và giao hàng xong?")) return;

      setIsProcessing(true);
      try {
          // Update DB: Status -> Sold
          await supabase.from('products').update({ status: 'sold' }).eq('id', targetProduct.id);

          // Thông báo
          await supabase.from('messages').insert({
              conversation_id: activeConversation, sender_id: user?.id, type: 'text',
              content: `🎉 GIAO DỊCH THÀNH CÔNG!\nCảm ơn bạn đã ủng hộ.`
          });

          setTargetProduct({ ...targetProduct, status: 'sold' });
          addToast("Giao dịch hoàn tất!", "success");
      } catch (error) { console.error(error); }
      finally { setIsProcessing(false); }
  };

  // 4. HỦY GIAO DỊCH (Nếu cần) - Reset về Available
  const handleCancelDeal = async () => {
      if (!targetProduct || !activeConversation) return;
      if (!window.confirm("Hủy giao dịch này và đăng bán lại?")) return;

      setIsProcessing(true);
      try {
          await supabase.from('products').update({ status: 'available', buyer_id: null }).eq('id', targetProduct.id);
          await supabase.from('messages').insert({
              conversation_id: activeConversation, sender_id: user?.id, type: 'text',
              content: `⚠️ ĐÃ HỦY GIAO DỊCH.`
          });
          setTargetProduct({ ...targetProduct, status: 'available', buyer_id: null });
      } catch (error) { console.error(error); }
      finally { setIsProcessing(false); }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
      e?.preventDefault();
      if (!newMessage.trim() || !activeConversation || !user) return;
      const { error } = await supabase.from('messages').insert({ conversation_id: activeConversation, sender_id: user.id, content: newMessage, type: 'text' });
      if (!error) { setNewMessage(''); await supabase.from('conversations').update({ updated_at: new Date().toISOString() }).eq('id', activeConversation); }
  };

  const filteredConversations = conversations.filter(c => c.partnerName?.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="max-w-7xl mx-auto h-[calc(100vh-64px)] flex bg-white font-sans overflow-hidden">
      <ChatStyles />
      
      {/* --- SIDEBAR --- */}
      <div className={`w-full md:w-1/3 border-r border-gray-200 flex flex-col ${activeConversation ? 'hidden md:flex' : 'flex'}`}>
         <div className="p-4 border-b">
            <h2 className="font-bold text-2xl mb-4">Chat</h2>
            <div className="relative">
               <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Tìm kiếm..." className="w-full bg-gray-100 rounded-full px-4 py-2 pl-10 text-sm outline-none"/>
               <Search className="absolute left-3 top-2.5 text-gray-400" size={16}/>
            </div>
         </div>
         <div className="flex-1 overflow-y-auto chat-scrollbar">
            {filteredConversations.map(conv => (
               <div key={conv.id} onClick={() => { setActiveConversation(conv.id); fetchPartnerInfoInternal(conv.partnerId); setTargetProduct(null); }} className={`p-3 flex gap-3 cursor-pointer hover:bg-gray-50 ${activeConversation === conv.id ? 'bg-blue-50' : ''}`}>
                  <img src={conv.partnerAvatar || 'https://via.placeholder.com/50'} className="w-12 h-12 rounded-full object-cover border"/>
                  <div className="flex-1 min-w-0">
                     <p className="font-bold truncate">{conv.partnerName}</p>
                     <p className="text-xs text-gray-500 truncate">Nhấn để xem tin nhắn</p>
                  </div>
               </div>
            ))}
         </div>
      </div>

      {/* --- CHAT AREA --- */}
      <div className={`flex-1 flex flex-col relative ${!activeConversation ? 'hidden md:flex' : 'flex'}`}>
         {activeConversation ? (
            <>
               {/* HEADER */}
               <div className="h-16 border-b flex items-center px-4 justify-between bg-white shadow-sm z-10">
                  <div className="flex items-center gap-3">
                     <button onClick={() => setActiveConversation(null)} className="md:hidden"><ArrowLeft/></button>
                     {partnerProfile && (
                        <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate(`/profile/${partnerProfile.id}`)}>
                           <img src={partnerProfile.avatar_url || 'https://via.placeholder.com/40'} className="w-10 h-10 rounded-full border"/>
                           <div>
                              <h3 className="font-bold text-sm">{partnerProfile.name}</h3>
                              <span className="text-xs text-green-500 font-bold">Đang hoạt động</span>
                           </div>
                        </div>
                     )}
                  </div>
                  <Phone className="text-blue-500 cursor-pointer"/>
               </div>

               {/* === TRANSACTION DASHBOARD (GHIM) === */}
               {targetProduct && (
                  <div className="transaction-card p-4 bg-blue-50 border-b border-blue-100 flex flex-col gap-3 sticky top-0">
                     <div className="flex gap-4 items-center">
                        <img src={targetProduct.images?.[0] || 'https://via.placeholder.com/80'} className="w-16 h-16 rounded-lg object-cover border bg-white"/>
                        <div className="flex-1">
                           <div className="flex items-center gap-2 mb-1">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded text-white uppercase ${targetProduct.status === 'sold' ? 'bg-red-500' : targetProduct.status === 'pending' ? 'bg-orange-500' : 'bg-green-500'}`}>
                                 {targetProduct.status === 'available' ? 'CÒN HÀNG' : targetProduct.status === 'pending' ? 'ĐANG GD' : 'ĐÃ BÁN'}
                              </span>
                           </div>
                           <h4 className="font-bold text-slate-800 text-sm line-clamp-1">{targetProduct.title}</h4>
                           <p className="text-red-600 font-black">{targetProduct.price === 0 ? 'Miễn phí' : `${targetProduct.price.toLocaleString()}đ`}</p>
                        </div>
                     </div>

                     {/* LOGIC NÚT BẤM (QUAN TRỌNG) */}
                     <div className="flex gap-2 pt-2 border-t border-blue-200/50">
                        {isBuyer && targetProduct.status === 'available' && (
                           <button onClick={handleRequestDeal} disabled={isProcessing} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-bold text-sm shadow-sm transition-all flex justify-center items-center gap-2">
                              {isProcessing ? <Loader size={16} className="animate-spin"/> : <ShoppingBag size={16}/>} Yêu cầu mua
                           </button>
                        )}

                        {isSeller && targetProduct.status === 'available' && (
                           <div className="flex-1 text-center text-xs text-gray-500 italic py-2">Đang đợi người mua yêu cầu...</div>
                        )}

                        {isSeller && targetProduct.status === 'available' && messages.length > 0 && (
                           <button onClick={handleAcceptDeal} disabled={isProcessing} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-bold text-sm shadow-sm transition-all">
                              Chấp nhận giao dịch
                           </button>
                        )}

                        {isSeller && targetProduct.status === 'pending' && (
                           <>
                              <button onClick={handleFinishDeal} disabled={isProcessing} className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg font-bold text-sm shadow-sm flex justify-center gap-2">
                                 <CheckCircle size={16}/> Hoàn tất
                              </button>
                              <button onClick={handleCancelDeal} disabled={isProcessing} className="px-3 bg-gray-200 hover:bg-gray-300 text-gray-600 rounded-lg font-bold text-sm">
                                 Hủy
                              </button>
                           </>
                        )}

                        {isBuyer && targetProduct.status === 'pending' && (
                           <div className="flex-1 bg-orange-100 text-orange-700 py-2 rounded-lg font-bold text-xs text-center border border-orange-200">
                              Đang chờ người bán xác nhận hoàn tất...
                           </div>
                        )}

                        {targetProduct.status === 'sold' && (
                           <div className="flex-1 bg-gray-100 text-gray-500 py-2 rounded-lg font-bold text-xs text-center flex justify-center items-center gap-2">
                              <CheckCircle size={14}/> Giao dịch thành công
                           </div>
                        )}
                     </div>
                  </div>
               )}

               {/* MESSAGES */}
               <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-white chat-scrollbar">
                  {messages.map((msg, idx) => {
                     const isMe = msg.sender_id === user?.id;
                     
                     // Style riêng cho tin nhắn hệ thống (Giao dịch)
                     if (msg.content.includes("YÊU CẦU") || msg.content.includes("ĐÃ XÁC NHẬN") || msg.content.includes("GIAO DỊCH THÀNH CÔNG")) {
                        return (
                           <div key={idx} className="flex justify-center my-4">
                              <span className="text-[11px] font-bold text-gray-500 bg-gray-100 px-3 py-1 rounded-full border border-gray-200 text-center whitespace-pre-wrap">
                                 {msg.content}
                              </span>
                           </div>
                        )
                     }

                     return (
                        <div key={idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-msg`}>
                           {!isMe && <img src={partnerProfile?.avatar_url} className="w-8 h-8 rounded-full mr-2 self-end mb-1 border"/>}
                           <div className={`msg-bubble ${isMe ? 'msg-me' : 'msg-you'}`}>
                              {msg.type === 'image' ? (
                                <img src={msg.image_url} className="rounded-lg max-w-[200px]" onClick={() => window.open(msg.image_url)}/>
                              ) : (
                                <p>{msg.content}</p>
                              )}
                           </div>
                        </div>
                     );
                  })}
                  <div ref={scrollRef} />
               </div>

               {/* INPUT */}
               <div className="p-3 bg-white border-t">
                  <div className="flex gap-2 overflow-x-auto pb-2 chat-scrollbar">
                     {QUICK_REPLIES.map((t, i) => (
                        <button key={i} onClick={() => setNewMessage(t)} className="whitespace-nowrap px-3 py-1 bg-gray-100 text-xs rounded-full hover:bg-gray-200 text-gray-700 font-medium transition">{t}</button>
                     ))}
                  </div>
                  <form onSubmit={handleSendMessage} className="flex items-end gap-2 mt-1">
                     <button type="button" className="p-2 text-blue-500 hover:bg-blue-50 rounded-full"><ImageIcon size={24}/></button>
                     <div className="flex-1 bg-gray-100 rounded-2xl px-4 py-2">
                        <input value={newMessage} onChange={e => setNewMessage(e.target.value)} placeholder="Nhập tin nhắn..." className="w-full bg-transparent outline-none text-sm text-black"/>
                     </div>
                     <button type="submit" disabled={!newMessage.trim()} className="p-2 text-blue-600 hover:bg-blue-50 rounded-full disabled:opacity-50"><Send size={24}/></button>
                  </form>
               </div>
            </>
         ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-300">
               <MessageCircle size={64} className="mb-4"/>
               <p className="font-bold">Chọn hội thoại để bắt đầu</p>
            </div>
         )}
      </div>
    </div>
  );
};

// Helper để fetch trong component con nếu cần
const fetchPartnerInfoInternal = async (pId: string) => {
    // Logic fetch profile...
};

export default ChatPage;
