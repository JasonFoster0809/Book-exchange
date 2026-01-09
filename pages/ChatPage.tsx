import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useToast } from '../contexts/ToastContext';
import { 
  Send, Image as ImageIcon, Phone, ArrowLeft, Loader, ShoppingBag, 
  CheckCircle, Search, MessageCircle
} from 'lucide-react'; 
import { playMessageSound } from '../utils/audio';

// ============================================================================
// STYLES
// ============================================================================
const ChatStyles = () => (
  <style>{`
    .chat-scrollbar::-webkit-scrollbar { width: 6px; }
    .chat-scrollbar::-webkit-scrollbar-track { background: transparent; }
    .chat-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 10px; }
    
    .msg-bubble { max-width: 75%; padding: 10px 16px; border-radius: 18px; position: relative; font-size: 14px; line-height: 1.5; word-wrap: break-word; }
    .msg-me { background: #0084FF; color: white; border-bottom-right-radius: 4px; margin-left: auto; }
    .msg-you { background: #E4E6EB; color: #050505; border-bottom-left-radius: 4px; margin-right: auto; }
    
    .transaction-card {
      background: #F0F9FF; border-bottom: 1px solid #BAE6FD; 
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); z-index: 20;
    }
  `}</style>
);

const QUICK_REPLIES = ["Sản phẩm còn mới không?", "Có bớt giá không bạn?", "Giao dịch ở H6 nhé?", "Cho mình xem thêm ảnh thật"];

const ChatPage: React.FC = () => {
  const { user } = useAuth(); 
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Params từ URL (khi bấm từ trang khác sang)
  const partnerIdParam = searchParams.get('partnerId');
  const productIdParam = searchParams.get('productId'); 
  
  // State
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeConversation, setActiveConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [partnerProfile, setPartnerProfile] = useState<any>(null);
  const [targetProduct, setTargetProduct] = useState<any>(null); // Sản phẩm đang giao dịch
  
  const [newMessage, setNewMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // 1. Fetch danh sách hội thoại khi vào trang
  useEffect(() => { if(user) fetchConversations(); }, [user]);

  // 2. Xử lý Logic "Nhảy" vào chat từ trang Profile/Product
  useEffect(() => {
    const initChat = async () => {
        if (!user || !partnerIdParam) return;
        
        // Lấy thông tin sản phẩm để ghim (nếu có)
        if (productIdParam) {
            const { data } = await supabase.from('products').select('*').eq('id', productIdParam).single();
            setTargetProduct(data);
        }

        // Tìm hoặc Tạo cuộc trò chuyện mới
        await checkAndCreateConversation(partnerIdParam);
    };
    initChat();
  }, [partnerIdParam, productIdParam, user]);

  // 3. Realtime Listener (Tin nhắn + Trạng thái sản phẩm)
  useEffect(() => {
    if (!activeConversation) return;
    fetchMessages(activeConversation);

    const channel = supabase.channel(`chat_room:${activeConversation}`)
        // Tin nhắn mới
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${activeConversation}` }, (payload) => {
            setMessages(prev => {
                if (prev.some(m => m.id === payload.new.id)) return prev;
                return [...prev, payload.new];
            });
            if (user && payload.new.sender_id !== user.id) playMessageSound();
            // Cuộn xuống khi có tin nhắn mới
            setTimeout(scrollToBottom, 100);
        })
        // Cập nhật trạng thái sản phẩm (Sold/Pending)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'products', filter: `id=eq.${productIdParam}` }, (payload) => {
            if (targetProduct && payload.new.id === targetProduct.id) {
                setTargetProduct({ ...targetProduct, ...payload.new });
            }
        })
        .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [activeConversation, user, targetProduct?.id]);

  // Scroll effect
  useEffect(() => { scrollToBottom(); }, [messages]);

  const scrollToBottom = () => {
      scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

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
      
      // Kiểm tra xem đã có conversation chưa
      // Cú pháp 'or' phức tạp để check cả 2 chiều (A-B hoặc B-A)
      const { data: existing } = await supabase.from('conversations')
          .select('id')
          .or(`and(participant1.eq.${user.id},participant2.eq.${pId}),and(participant1.eq.${pId},participant2.eq.${user.id})`)
          .maybeSingle();

      if (existing) {
          setActiveConversation(existing.id);
      } else {
          // Chưa có -> Tạo mới
          const { data: newConv, error } = await supabase.from('conversations')
              .insert({ participant1: user.id, participant2: pId })
              .select()
              .single();
          
          if (newConv) {
              setActiveConversation(newConv.id);
              // Quan trọng: Gọi lại list để cập nhật sidebar ngay lập tức
              await fetchConversations(); 
          }
      }
      
      // Lấy thông tin partner để hiển thị trên Header
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
  const handleSendMessage = async (e?: React.FormEvent) => {
      e?.preventDefault();
      if (!newMessage.trim() || !activeConversation || !user) return;

      const content = newMessage;
      setNewMessage(''); // Clear input ngay để mượt

      const { error } = await supabase.from('messages').insert({ 
          conversation_id: activeConversation, 
          sender_id: user.id, 
          content: content, 
          type: 'text' 
      });

      if (!error) {
          // Update time cho conversation để nó nhảy lên đầu
          await supabase.from('conversations').update({ updated_at: new Date().toISOString() }).eq('id', activeConversation);
          fetchConversations(); // Refresh list
      } else {
          setNewMessage(content); // Restore nếu lỗi
          console.error("Lỗi gửi tin:", error);
      }
  };

  // Logic giao dịch (Mua/Bán/Hoàn tất) - Giữ nguyên logic cũ nhưng clean hơn
  const handleRequestDeal = async () => {
      if (!activeConversation || !user) return;
      setIsProcessing(true);
      await supabase.from('messages').insert({ conversation_id: activeConversation, sender_id: user.id, content: `👋 TÔI MUỐN MUA MÓN NÀY!\nBạn xác nhận giao dịch nhé?` });
      setIsProcessing(false);
  };

  const handleAcceptDeal = async () => {
      if (!targetProduct || !activeConversation) return;
      if (!window.confirm("Xác nhận bán?")) return;
      setIsProcessing(true);
      await supabase.from('products').update({ status: 'pending', buyer_id: partnerProfile.id }).eq('id', targetProduct.id);
      await supabase.from('messages').insert({ conversation_id: activeConversation, sender_id: user?.id, content: `✅ ĐÃ XÁC NHẬN!\nSản phẩm đang được giữ cho bạn.` });
      setTargetProduct({ ...targetProduct, status: 'pending' });
      setIsProcessing(false);
  };

  const handleFinishDeal = async () => {
      if (!targetProduct || !activeConversation) return;
      if (!window.confirm("Đã giao hàng xong?")) return;
      setIsProcessing(true);
      await supabase.from('products').update({ status: 'sold' }).eq('id', targetProduct.id);
      await supabase.from('messages').insert({ conversation_id: activeConversation, sender_id: user?.id, content: `🎉 GIAO DỊCH THÀNH CÔNG!` });
      setTargetProduct({ ...targetProduct, status: 'sold' });
      setIsProcessing(false);
  };

  const isSeller = user && targetProduct && user.id === targetProduct.seller_id;
  const isBuyer = user && targetProduct && user.id !== targetProduct.seller_id;

  // Filter Search SideBar
  const filteredConversations = conversations.filter(c => c.partnerName?.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="max-w-7xl mx-auto h-[calc(100vh-64px)] flex bg-white font-sans overflow-hidden">
      <ChatStyles />
      
      {/* --- SIDEBAR LIST --- */}
      <div className={`w-full md:w-1/3 border-r border-gray-200 flex flex-col ${activeConversation ? 'hidden md:flex' : 'flex'}`}>
         <div className="p-4 border-b">
            <h2 className="font-bold text-2xl mb-4 text-[#00418E]">Tin nhắn</h2>
            <div className="relative">
               <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Tìm bạn bè..." className="w-full bg-gray-100 rounded-full px-4 py-2 pl-10 text-sm outline-none focus:ring-2 focus:ring-blue-100"/>
               <Search className="absolute left-3 top-2.5 text-gray-400" size={16}/>
            </div>
         </div>
         <div className="flex-1 overflow-y-auto chat-scrollbar">
            {filteredConversations.length === 0 && <p className="text-center text-gray-400 mt-10 text-sm">Chưa có tin nhắn nào</p>}
            {filteredConversations.map(conv => (
               <div key={conv.id} onClick={() => { setActiveConversation(conv.id); fetchPartnerInfoInternal(conv.partnerId); setTargetProduct(null); }} className={`p-4 flex gap-3 cursor-pointer hover:bg-gray-50 transition-colors border-b border-gray-50 ${activeConversation === conv.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''}`}>
                  <img src={conv.partnerAvatar || 'https://via.placeholder.com/50'} className="w-12 h-12 rounded-full object-cover border border-gray-200"/>
                  <div className="flex-1 min-w-0">
                     <p className="font-bold truncate text-slate-800">{conv.partnerName}</p>
                     <p className="text-xs text-gray-500 truncate mt-1">Nhấn để xem tin nhắn</p>
                  </div>
               </div>
            ))}
         </div>
      </div>

      {/* --- MAIN CHAT WINDOW --- */}
      <div className={`flex-1 flex flex-col relative bg-white ${!activeConversation ? 'hidden md:flex' : 'flex'}`}>
         {activeConversation ? (
            <>
               {/* HEADER */}
               <div className="h-16 border-b flex items-center px-4 justify-between bg-white shadow-sm z-30">
                  <div className="flex items-center gap-3">
                     <button onClick={() => setActiveConversation(null)} className="md:hidden p-2 hover:bg-gray-100 rounded-full"><ArrowLeft/></button>
                     {partnerProfile && (
                        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate(`/profile/${partnerProfile.id}`)}>
                           <img src={partnerProfile.avatar_url || 'https://via.placeholder.com/40'} className="w-10 h-10 rounded-full border border-green-400 p-0.5"/>
                           <div>
                              <h3 className="font-bold text-sm text-slate-800">{partnerProfile.name}</h3>
                              <span className="text-[10px] text-green-600 font-bold flex items-center gap-1">● Đang hoạt động</span>
                           </div>
                        </div>
                     )}
                  </div>
                  <button className="p-2 text-blue-600 hover:bg-blue-50 rounded-full"><Phone size={20}/></button>
               </div>

               {/* TRANSACTION CARD (GHIM) */}
               {targetProduct && (
                  <div className="transaction-card p-3 flex flex-col gap-2 sticky top-0">
                     <div className="flex gap-3 items-center">
                        <img src={targetProduct.images?.[0]} className="w-12 h-12 rounded-md object-cover border"/>
                        <div className="flex-1">
                           <h4 className="font-bold text-sm line-clamp-1">{targetProduct.title}</h4>
                           <p className="text-red-600 font-bold text-xs">{targetProduct.price === 0 ? 'Miễn phí' : `${targetProduct.price.toLocaleString()}đ`}</p>
                        </div>
                     </div>
                     <div className="flex gap-2">
                        {isBuyer && targetProduct.status === 'available' && (
                           <button onClick={handleRequestDeal} disabled={isProcessing} className="flex-1 bg-blue-600 text-white py-1.5 rounded text-xs font-bold shadow-sm">Yêu cầu mua</button>
                        )}
                        {isSeller && targetProduct.status === 'available' && (
                           <button onClick={handleAcceptDeal} disabled={isProcessing} className="flex-1 bg-green-600 text-white py-1.5 rounded text-xs font-bold shadow-sm">Chốt bán</button>
                        )}
                        {isSeller && targetProduct.status === 'pending' && (
                           <button onClick={handleFinishDeal} disabled={isProcessing} className="flex-1 bg-blue-600 text-white py-1.5 rounded text-xs font-bold shadow-sm">Hoàn tất</button>
                        )}
                        <span className="flex-1 bg-gray-100 text-gray-500 py-1.5 rounded text-xs font-bold text-center uppercase border">
                           {targetProduct.status === 'available' ? 'Đang bán' : targetProduct.status === 'pending' ? 'Đang giao dịch' : 'Đã bán'}
                        </span>
                     </div>
                  </div>
               )}

               {/* MESSAGES LIST */}
               <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#F0F2F5] chat-scrollbar">
                  {messages.map((msg, idx) => {
                     const isMe = msg.sender_id === user?.id;
                     return (
                        <div key={idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                           {!isMe && <img src={partnerProfile?.avatar_url} className="w-8 h-8 rounded-full mr-2 self-end border"/>}
                           <div className={`msg-bubble ${isMe ? 'msg-me' : 'msg-you'}`}>
                              {msg.type === 'image' ? <img src={msg.image_url} className="rounded-lg max-w-[200px]"/> : <p>{msg.content}</p>}
                           </div>
                        </div>
                     );
                  })}
                  <div ref={scrollRef} className="h-1" />
               </div>

               {/* INPUT AREA */}
               <div className="p-3 bg-white border-t">
                  <div className="flex gap-2 overflow-x-auto pb-2 chat-scrollbar">
                     {QUICK_REPLIES.map((t, i) => (
                        <button key={i} onClick={() => setNewMessage(t)} className="whitespace-nowrap px-3 py-1 bg-gray-100 text-xs rounded-full hover:bg-gray-200 text-slate-700 transition">{t}</button>
                     ))}
                  </div>
                  <form onSubmit={handleSendMessage} className="flex items-center gap-2 mt-1">
                     <button type="button" className="p-2 text-slate-400 hover:text-blue-500"><ImageIcon size={22}/></button>
                     <div className="flex-1 bg-gray-100 rounded-full px-4 py-2.5">
                        <input value={newMessage} onChange={e => setNewMessage(e.target.value)} placeholder="Nhập tin nhắn..." className="w-full bg-transparent outline-none text-sm text-slate-900"/>
                     </div>
                     <button type="submit" disabled={!newMessage.trim()} className="p-2 text-blue-600 hover:bg-blue-50 rounded-full disabled:opacity-50"><Send size={22}/></button>
                  </form>
               </div>
            </>
         ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-300 bg-slate-50">
               <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <MessageCircle size={48} className="text-gray-300"/>
               </div>
               <p className="font-bold text-gray-400">Chọn một cuộc hội thoại để bắt đầu</p>
            </div>
         )}
      </div>
    </div>
  );
};

export default ChatPage;
