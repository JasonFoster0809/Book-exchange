import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useToast } from '../contexts/ToastContext';
import { 
  Send, Image as ImageIcon, Phone, ArrowLeft, Loader2, ShoppingBag, 
  CheckCircle2, Search, MessageCircle, MoreVertical, X, AlertCircle,
  Truck, DollarSign, XCircle, User, Flag, Trash, MapPin, Smile, CheckCheck,
  ExternalLink, Maximize2, ChevronDown
} from 'lucide-react'; 
import { playMessageSound } from '../utils/audio';

// ============================================================================
// STYLES & VISUAL ENGINE
// ============================================================================
const VisualEngine = () => (
  <style>{`
    /* Scrollbar tinh tế */
    .chat-scrollbar::-webkit-scrollbar { width: 6px; }
    .chat-scrollbar::-webkit-scrollbar-track { background: transparent; }
    .chat-scrollbar::-webkit-scrollbar-thumb { background: #CBD5E1; border-radius: 10px; }
    .chat-scrollbar::-webkit-scrollbar-thumb:hover { background: #94A3B8; }
    
    /* Bong bóng chat */
    .msg-bubble { 
      max-width: 75%; padding: 10px 14px; border-radius: 18px; 
      position: relative; font-size: 14px; line-height: 1.5; word-wrap: break-word; 
      box-shadow: 0 1px 2px rgba(0,0,0,0.05); transition: all 0.2s;
    }
    .msg-me { 
      background: linear-gradient(135deg, #00418E 0%, #0065D1 100%); 
      color: white; border-bottom-right-radius: 4px; margin-left: auto; 
    }
    .msg-you { 
      background: #FFFFFF; color: #1E293B; border: 1px solid #F1F5F9;
      border-bottom-left-radius: 4px; margin-right: auto; 
    }
    .msg-image { padding: 4px; background: transparent; border: none; box-shadow: none; }
    
    /* Card giao dịch */
    .transaction-card {
      background: rgba(255, 255, 255, 0.95); border-bottom: 1px solid #E2E8F0; 
      z-index: 20; backdrop-filter: blur(12px);
    }
    
    /* Hiệu ứng tin nhắn mới */
    .animate-slide-in { animation: slideIn 0.3s ease-out forwards; }
    @keyframes slideIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

    /* Hiệu ứng số đỏ (Badge) nảy lên */
    .badge-pop { animation: pop 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
    @keyframes pop { 0% { transform: scale(0); } 50% { transform: scale(1.2); } 100% { transform: scale(1); } }

    /* Typing Dots */
    .typing-dot { width: 6px; height: 6px; background: #94a3b8; border-radius: 50%; animation: typing 1.4s infinite ease-in-out both; }
    .typing-dot:nth-child(1) { animation-delay: -0.32s; }
    .typing-dot:nth-child(2) { animation-delay: -0.16s; }
    @keyframes typing { 0%, 80%, 100% { transform: scale(0); } 40% { transform: scale(1); } }

    /* Menu & Dropdown */
    .context-menu {
      position: absolute; background: white; border: 1px solid #e2e8f0; 
      border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.15); z-index: 50;
      min-width: 160px; overflow: hidden; animation: fadeIn 0.1s ease-out;
    }
    .context-item {
      padding: 10px 14px; font-size: 13px; color: #ef4444; font-weight: 600;
      display: flex; items-center; gap: 8px; cursor: pointer; transition: background 0.2s;
    }
    .context-item:hover { background: #fef2f2; }

    .dropdown-menu {
      position: absolute; top: 100%; right: 0; margin-top: 8px;
      background: white; border: 1px solid #E2E8F0; border-radius: 12px;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
      width: 220px; overflow: hidden; z-index: 50; animation: fadeIn 0.1s ease-out;
    }
    .dropdown-item {
      display: flex; items-center; gap: 10px; width: 100%;
      padding: 12px 16px; text-align: left; font-size: 14px; font-weight: 500;
      color: #475569; transition: all 0.2s;
    }
    .dropdown-item:hover { background: #F8FAFC; color: #00418E; }
    .dropdown-item.danger { color: #EF4444; } .dropdown-item.danger:hover { background: #FEF2F2; }

    /* Date Divider - Căn giữa */
    .date-divider {
      display: flex; justify-content: center; align-items: center; margin: 24px 0; position: relative;
    }
    .date-divider span {
      background: #E2E8F0; color: #64748B; font-size: 11px; font-weight: 600;
      padding: 4px 12px; border-radius: 999px; z-index: 10;
    }
  `}</style>
);

const QUICK_REPLIES = ["Sản phẩm còn mới không?", "Có bớt giá không bạn?", "Giao dịch ở H6 nhé?", "Cho mình xem thêm ảnh thật"];
const COMMON_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "😡"];

// Component xem ảnh phóng to
const ImageModal = ({ src, onClose }: { src: string, onClose: () => void }) => (
  <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in" onClick={onClose}>
    <button className="absolute top-4 right-4 text-white/70 hover:text-white p-2"><X size={32}/></button>
    <img src={src} className="max-w-full max-h-[90vh] rounded-lg object-contain shadow-2xl" onClick={(e) => e.stopPropagation()}/>
  </div>
);

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
  const [loadingConv, setLoadingConv] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, msgId: string } | null>(null);

  // Derived State
  const isSeller = user && targetProduct && user.id === targetProduct.seller_id;
  const isBuyer = user && targetProduct && user.id !== targetProduct.seller_id;

  const scrollRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<any>(null);

  // ============================================================================
  // 1. DATA FETCHING (QUAN TRỌNG: LẤY SỐ TIN CHƯA ĐỌC)
  // ============================================================================
  const fetchConversations = async () => {
      setLoadingConv(true);
      if (!user) return;
      
      const { data: convData } = await supabase.from('conversations')
        .select(`*, p1:profiles!participant1(id, name, avatar_url), p2:profiles!participant2(id, name, avatar_url)`)
        .or(`participant1.eq.${user.id},participant2.eq.${user.id}`)
        .order('updated_at', { ascending: false });

      if (convData) {
          const enriched = await Promise.all(convData.map(async (c: any) => {
              const partner = c.participant1 === user.id ? c.p2 : c.p1;
              
              // Đếm số tin nhắn chưa đọc (is_read = false) từ người kia gửi (sender_id != user.id)
              const { count } = await supabase.from('messages')
                .select('*', { count: 'exact', head: true })
                .eq('conversation_id', c.id)
                .neq('sender_id', user.id)
                .eq('is_read', false);

              return { 
                  ...c, 
                  partnerName: partner?.name || "User", 
                  partnerAvatar: partner?.avatar_url, 
                  partnerId: partner?.id,
                  unread_count: count || 0 // Số lượng này sẽ dùng để hiện Badge
              };
          }));
          setConversations(enriched);
      }
      setLoadingConv(false);
  };

  useEffect(() => { if(user) fetchConversations(); }, [user]);

  // Deep Link
  useEffect(() => {
    const initChat = async () => {
        if (!user || !partnerIdParam) return;
        if (productIdParam) {
            const { data } = await supabase.from('products').select('*').eq('id', productIdParam).single();
            if (data) setTargetProduct(data);
        }
        await checkAndCreateConversation(partnerIdParam, productIdParam);
    };
    initChat();
  }, [partnerIdParam, productIdParam, user]);

  // ============================================================================
  // 2. REALTIME (CẬP NHẬT BADGE & LIST)
  // ============================================================================
  useEffect(() => {
    if (!user) return;
    const channel = supabase.channel('global_chat_updates')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, async (payload) => {
          const newMsg = payload.new;
          if (newMsg.sender_id !== user.id) {
              playMessageSound();
              
              // NẾU ĐANG KHÔNG XEM HỘI THOẠI NÀY -> TĂNG BADGE
              if (activeConversation !== newMsg.conversation_id) {
                  setConversations(prev => {
                      const exists = prev.find(c => c.id === newMsg.conversation_id);
                      if (exists) {
                          return prev.map(c => 
                              c.id === newMsg.conversation_id 
                              ? { 
                                  ...c, 
                                  last_message: newMsg.content, 
                                  updated_at: newMsg.created_at, 
                                  unread_count: (Number(c.unread_count) || 0) + 1 // Tăng số đỏ
                                }
                              : c
                          ).sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
                      } else {
                          fetchConversations(); // Reload nếu là hội thoại mới tinh
                          return prev;
                      }
                  });
              } 
              // NẾU ĐANG XEM -> MARK READ NGAY
              else {
                  await supabase.from('messages').update({ is_read: true }).eq('id', newMsg.id);
                  setConversations(prev => prev.map(c => 
                      c.id === newMsg.conversation_id 
                      ? { ...c, last_message: newMsg.content, updated_at: newMsg.created_at } 
                      : c
                  ).sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()));
              }
          }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'conversations' }, (payload) => {
          setConversations(prev => prev.map(c => 
             c.id === payload.new.id ? { ...c, ...payload.new } : c
          ).sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, activeConversation]);

  // Handler: Khi click vào hội thoại -> Xóa Badge đỏ
  const handleSelectConversation = async (convId: string, partnerId: string) => {
      setActiveConversation(convId);
      fetchPartnerInfoInternal(partnerId);
      setTargetProduct(null); 
      
      // XÓA SỐ ĐỎ TRÊN UI NGAY LẬP TỨC
      setConversations(prev => prev.map(c => c.id === convId ? { ...c, unread_count: 0 } : c));
      
      // CẬP NHẬT DB LÀ ĐÃ ĐỌC
      if(user) {
          await supabase.from('messages').update({ is_read: true })
            .eq('conversation_id', convId)
            .neq('sender_id', user.id)
            .eq('is_read', false);
      }
  };

  // Realtime trong phòng chat
  useEffect(() => {
    if (!activeConversation) return;
    fetchMessages(activeConversation);
    if (!targetProduct) fetchPinnedProduct(activeConversation);

    const channel = supabase.channel(`chat_room:${activeConversation}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${activeConversation}` }, (payload) => {
            const newMsg = payload.new;
            setMessages(prev => {
                if (prev.some(m => m.id === newMsg.id)) return prev;
                return [...prev, newMsg];
            });
            // Mark read realtime
            if (newMsg.sender_id !== user?.id) {
                supabase.from('messages').update({ is_read: true }).eq('id', newMsg.id);
            }
            setTimeout(scrollToBottom, 100);
        })
        .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'messages' }, (payload) => {
            setMessages(prev => prev.filter(m => m.id !== payload.old.id));
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'products' }, (payload) => {
            if (targetProduct && payload.new.id === targetProduct.id) {
                setTargetProduct({ ...targetProduct, ...payload.new });
            }
        })
        .on('broadcast', { event: 'typing' }, (payload) => {
            if (payload.payload.userId !== user?.id) {
                setPartnerTyping(true);
                clearTimeout(typingTimeoutRef.current);
                typingTimeoutRef.current = setTimeout(() => setPartnerTyping(false), 2000);
            }
        })
        .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [activeConversation]);

  // Helpers
  const checkAndCreateConversation = async (pId: string, prodId: string | null) => {
      if (!user) return;
      let convId = null;
      const { data: existing } = await supabase.from('conversations').select('id').or(`and(participant1.eq.${user.id},participant2.eq.${pId}),and(participant1.eq.${pId},participant2.eq.${user.id})`).maybeSingle();

      if (existing) { convId = existing.id; } 
      else {
          const { data: newConv } = await supabase.from('conversations').insert({ participant1: user.id, participant2: pId }).select().single();
          if (newConv) { convId = newConv.id; await fetchConversations(); }
      }

      if (convId) {
          handleSelectConversation(convId, pId);
          if (prodId) {
              await supabase.from('conversations').update({ current_product_id: prodId }).eq('id', convId);
              const { data: pData } = await supabase.from('products').select('*').eq('id', prodId).single();
              if (pData) setTargetProduct(pData);
          }
      }
  };

  const fetchPinnedProduct = async (convId: string) => {
      const { data: conv } = await supabase.from('conversations').select('current_product_id').eq('id', convId).single();
      if (conv?.current_product_id) {
          const { data: prod } = await supabase.from('products').select('*').eq('id', conv.current_product_id).single();
          if (prod) setTargetProduct(prod);
      } else { setTargetProduct(null); }
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

  const handleSendMessage = async (e?: React.FormEvent, content: string = newMessage, type: 'text' | 'image' | 'location' = 'text') => {
      e?.preventDefault();
      if ((!content.trim() && type === 'text') || !activeConversation || !user) return;
      setNewMessage('');
      setShowEmojiPicker(false);
      
      const { error } = await supabase.from('messages').insert({ conversation_id: activeConversation, sender_id: user.id, content: content, type: type });
      if (!error) {
          const lastMsgText = type === 'image' ? '[Hình ảnh]' : type === 'location' ? '[Vị trí]' : content;
          await supabase.from('conversations').update({ last_message: lastMsgText, updated_at: new Date().toISOString() }).eq('id', activeConversation);
      }
  };

  const handleTyping = (e: any) => {
      setNewMessage(e.target.value);
      if (activeConversation) {
          supabase.channel(`chat_room:${activeConversation}`).send({ type: 'broadcast', event: 'typing', payload: { userId: user?.id } });
      }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files || !e.target.files.length || !user || !activeConversation) return;
      setUploading(true);
      const file = e.target.files[0];
      const fileName = `${activeConversation}/${Date.now()}_${file.name}`;
      try {
          const { error: uploadError } = await supabase.storage.from('chat-images').upload(fileName, file);
          if (uploadError) throw uploadError;
          const { data } = supabase.storage.from('chat-images').getPublicUrl(fileName);
          await handleSendMessage(undefined, data.publicUrl, 'image');
      } catch (err) { addToast("Lỗi gửi ảnh", "error"); } finally { setUploading(false); }
  };

  const handleSendLocation = () => {
      if (!navigator.geolocation) return addToast("Trình duyệt không hỗ trợ vị trí", "error");
      navigator.geolocation.getCurrentPosition((pos) => {
          const link = `https://www.google.com/maps?q=${pos.coords.latitude},${pos.coords.longitude}`;
          handleSendMessage(undefined, link, 'location');
      }, () => addToast("Không thể lấy vị trí", "error"));
  };

  const handleDeleteMessage = async (msgId: string) => {
      if (!confirm("Thu hồi tin nhắn này?")) return;
      await supabase.from('messages').delete().eq('id', msgId);
      setContextMenu(null);
  };

  const handleUnpinProduct = async () => {
      if (!activeConversation) return;
      await supabase.from('conversations').update({ current_product_id: null }).eq('id', activeConversation);
      setTargetProduct(null); setIsMenuOpen(false); addToast("Đã gỡ ghim", "info");
  };

  const handleViewProfile = () => {
      if(partnerProfile) navigate(`/profile/${partnerProfile.id}`);
      setIsMenuOpen(false);
  }

  const handleDealAction = async (action: string) => {
      if (!targetProduct || !activeConversation) return;
      setIsProcessing(true);
      try {
          if (action === 'request') {
              await handleSendMessage(undefined, `👋 TÔI MUỐN MUA MÓN NÀY!\nBạn xác nhận giao dịch nhé?`);
              addToast("Đã gửi yêu cầu", "success");
          } else if (action === 'confirm') {
              await supabase.from('products').update({ status: 'pending', buyer_id: partnerProfile.id }).eq('id', targetProduct.id);
              await handleSendMessage(undefined, `✅ ĐÃ XÁC NHẬN BÁN!\nSản phẩm đang được giữ cho bạn.`);
              setTargetProduct({ ...targetProduct, status: 'pending' });
          } else if (action === 'finish') {
              await supabase.from('products').update({ status: 'sold' }).eq('id', targetProduct.id);
              await handleSendMessage(undefined, `🎉 GIAO DỊCH THÀNH CÔNG!\nCảm ơn bạn đã ủng hộ.`);
              setTargetProduct({ ...targetProduct, status: 'sold' });
          } else if (action === 'cancel') {
              await supabase.from('products').update({ status: 'available', buyer_id: null }).eq('id', targetProduct.id);
              await handleSendMessage(undefined, `⚠️ ĐÃ HỦY GIAO DỊCH.`);
              setTargetProduct({ ...targetProduct, status: 'available', buyer_id: null });
          }
      } catch(e) { console.error(e); } finally { setIsProcessing(false); }
  };

  const filteredConversations = conversations.filter(c => c.partnerName?.toLowerCase().includes(searchTerm.toLowerCase()));

  // UI Helpers
  const formatMessageDate = (dateStr: string) => {
      const d = new Date(dateStr); const now = new Date();
      if(d.toDateString() === now.toDateString()) return "Hôm nay";
      const y = new Date(now); y.setDate(now.getDate()-1);
      if(d.toDateString() === y.toDateString()) return "Hôm qua";
      return d.toLocaleDateString('vi-VN');
  }

  const renderMessageContent = (msg: any) => {
      if (msg.type === 'image') return (
        <div className="relative group cursor-pointer" onClick={() => setPreviewImage(msg.content)}>
            <img src={msg.content} className="rounded-lg max-w-[200px] border border-white/20 transition-transform group-hover:scale-[1.02]"/>
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100"><Maximize2 size={20} className="text-white drop-shadow-md"/></div>
        </div>
      );
      if (msg.type === 'location') return (<a href={msg.content} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-blue-100 underline hover:text-white font-medium"><MapPin size={16}/> Vị trí hiện tại <ExternalLink size={12}/></a>);
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      const parts = msg.content.split(urlRegex);
      return <p>{parts.map((part: string, i: number) => part.match(urlRegex) ? <a key={i} href={part} target="_blank" rel="noreferrer" className="text-blue-200 hover:underline">{part}</a> : part)}</p>;
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setIsMenuOpen(false);
      if (contextMenu) setContextMenu(null);
      if (showEmojiPicker && !(event.target as Element).closest('.emoji-btn')) setShowEmojiPicker(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    const container = containerRef.current;
    if (container) {
        const handleScroll = () => {
            const { scrollTop, scrollHeight, clientHeight } = container;
            setShowScrollBtn(scrollHeight - scrollTop - clientHeight > 300);
        };
        container.addEventListener('scroll', handleScroll);
        return () => { document.removeEventListener("mousedown", handleClickOutside); container.removeEventListener('scroll', handleScroll); }
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [contextMenu, showEmojiPicker]);

  useEffect(() => { scrollToBottom(); }, [messages]);
  const scrollToBottom = () => scrollRef.current?.scrollIntoView({ behavior: 'smooth' });

  return (
    <div className="max-w-7xl mx-auto h-[calc(100vh-64px)] flex bg-[#F1F5F9] font-sans overflow-hidden">
      <VisualEngine />
      {previewImage && <ImageModal src={previewImage} onClose={() => setPreviewImage(null)} />}
      
      {/* SIDEBAR */}
      <div className={`w-full md:w-[360px] bg-white border-r border-slate-200 flex flex-col ${activeConversation ? 'hidden md:flex' : 'flex'}`}>
         <div className="p-4 border-b border-slate-100 bg-white z-10">
            <h2 className="font-black text-2xl mb-4 text-[#00418E]">Tin nhắn</h2>
            <div className="relative">
               <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Tìm kiếm..." className="w-full bg-slate-100 rounded-xl px-4 py-2.5 pl-10 text-sm outline-none focus:ring-2 focus:ring-[#00418E]/20 transition-all"/>
               <Search className="absolute left-3 top-3 text-slate-400" size={16}/>
            </div>
         </div>
         <div className="flex-1 overflow-y-auto chat-scrollbar">
            {loadingConv ? <div className="flex justify-center pt-10"><Loader2 className="animate-spin text-slate-400"/></div> : filteredConversations.length === 0 ? <div className="text-center pt-10 px-6"><MessageCircle className="mx-auto text-slate-200 mb-2" size={48}/><p className="text-slate-400 text-sm">Chưa có tin nhắn nào.</p></div> : filteredConversations.map(conv => (
               <div key={conv.id} onClick={() => handleSelectConversation(conv.id, conv.partnerId)} className={`p-4 flex gap-3 cursor-pointer hover:bg-slate-50 transition-colors border-b border-slate-50 ${activeConversation === conv.id ? 'bg-blue-50/50 border-l-4 border-l-[#00418E]' : 'border-l-4 border-l-transparent'}`}>
                  <img src={conv.partnerAvatar || 'https://via.placeholder.com/50'} className="w-12 h-12 rounded-full object-cover border border-slate-200 bg-white"/>
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <div className="flex justify-between items-center">
                          <p className={`font-bold text-sm truncate ${activeConversation === conv.id ? 'text-[#00418E]' : 'text-slate-800'}`}>{conv.partnerName}</p>
                          <span className="text-[10px] text-slate-400 whitespace-nowrap">{conv.updated_at ? new Date(conv.updated_at).toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'}) : ''}</span>
                      </div>
                      <div className="flex justify-between items-center mt-0.5">
                          <p className={`text-xs truncate max-w-[200px] ${conv.unread_count > 0 ? 'text-slate-900 font-bold' : 'text-slate-500 font-medium'}`}>{conv.last_message || "Bắt đầu trò chuyện"}</p>
                          {/* ======================= */}
                          {/* 🔴 VÒNG TRÒN ĐỎ (BADGE) */}
                          {/* ======================= */}
                          {conv.unread_count > 0 && (
                            <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full badge-pop min-w-[20px] text-center shadow-sm border border-white flex items-center justify-center">
                              {conv.unread_count > 99 ? '99+' : conv.unread_count}
                            </span>
                          )}
                      </div>
                  </div>
               </div>
            ))}
         </div>
      </div>

      {/* CHAT AREA */}
      <div className={`flex-1 flex flex-col relative bg-[#F8FAFC] ${!activeConversation ? 'hidden md:flex' : 'flex'}`}>
         {activeConversation ? (
            <>
               {/* HEADER */}
               <div className="h-16 border-b border-slate-200 bg-white/80 backdrop-blur-md flex items-center px-4 justify-between shadow-sm z-30 sticky top-0">
                  <div className="flex items-center gap-3">
                     <button onClick={() => setActiveConversation(null)} className="md:hidden p-2 -ml-2 text-slate-600"><ArrowLeft size={20}/></button>
                     {partnerProfile && (
                        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate(`/profile/${partnerProfile.id}`)}>
                           <div className="relative">
                               <img src={partnerProfile.avatar_url || 'https://via.placeholder.com/40'} className="w-10 h-10 rounded-full border border-slate-200 object-cover"/>
                               <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                           </div>
                           <div>
                              <div className="flex items-center gap-2">
                                <h3 className="font-bold text-sm text-slate-800">{partnerProfile.name}</h3>
                                {targetProduct && (
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isBuyer ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>
                                        {isBuyer ? 'Người bán' : 'Người mua'}
                                    </span>
                                )}
                              </div>
                              <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                                  {partnerTyping ? 'Đang soạn tin...' : 'Đang hoạt động'}
                              </span>
                           </div>
                        </div>
                     )}
                  </div>
                  <div className="flex gap-2 relative" ref={menuRef}>
                      <button className="p-2 text-slate-500 hover:bg-slate-100 rounded-full"><Phone size={20}/></button>
                      <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 text-slate-500 hover:bg-slate-100 rounded-full"><MoreVertical size={20}/></button>
                      
                      {isMenuOpen && (
                          <div className="dropdown-menu">
                              <button onClick={handleViewProfile} className="dropdown-item"><User size={16}/> Xem trang cá nhân</button>
                              {targetProduct && <button onClick={handleUnpinProduct} className="dropdown-item"><XCircle size={16}/> Gỡ ghim sản phẩm</button>}
                              <button className="dropdown-item"><Flag size={16}/> Báo cáo người dùng</button>
                              <div className="h-px bg-slate-100 my-1"></div>
                              <button className="dropdown-item danger"><Trash size={16}/> Xóa cuộc trò chuyện</button>
                          </div>
                      )}
                  </div>
               </div>

               {/* TRANSACTION DASHBOARD */}
               {targetProduct && (
                  <div className="transaction-card p-4 animate-slide-in">
                     <div className="flex gap-4 items-start bg-white p-3 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
                        <div className={`absolute top-0 left-0 bottom-0 w-1.5 ${targetProduct.status === 'sold' ? 'bg-slate-500' : targetProduct.status === 'pending' ? 'bg-orange-500' : 'bg-green-500'}`}></div>
                        <img src={targetProduct.images?.[0] || 'https://via.placeholder.com/80'} className="w-16 h-16 rounded-lg object-cover border border-slate-100 bg-slate-50 ml-2"/>
                        <div className="flex-1 min-w-0">
                           <div className="flex items-center gap-2 mb-1">
                              <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md text-white uppercase tracking-wider ${targetProduct.status === 'sold' ? 'bg-slate-500' : targetProduct.status === 'pending' ? 'bg-orange-500' : 'bg-green-500'}`}>
                                 {targetProduct.status === 'available' ? 'ĐANG BÁN' : targetProduct.status === 'pending' ? 'ĐANG GIAO DỊCH' : 'ĐÃ BÁN'}
                              </span>
                              <h4 className="font-bold text-slate-800 text-sm truncate">{targetProduct.title}</h4>
                           </div>
                           <p className="text-[#00418E] font-black text-lg">{targetProduct.price === 0 ? 'Miễn phí' : `${targetProduct.price.toLocaleString()}đ`}</p>
                        </div>
                     </div>

                     <div className="flex gap-2 mt-3">
                        {isBuyer && targetProduct.status === 'available' && <button onClick={() => handleDealAction('request')} disabled={isProcessing} className="flex-1 bg-[#00418E] text-white py-3 rounded-xl font-bold text-sm shadow-sm flex justify-center items-center gap-2 active:scale-95 transition-all hover:bg-[#00306b]"><ShoppingBag size={16}/> Yêu cầu mua</button>}
                        {isSeller && targetProduct.status === 'available' && <button onClick={() => handleDealAction('confirm')} disabled={isProcessing} className="flex-1 bg-green-600 text-white py-3 rounded-xl font-bold text-sm shadow-sm flex justify-center items-center gap-2 active:scale-95 transition-all hover:bg-green-700"><CheckCircle2 size={18}/> Xác nhận bán</button>}
                        {isSeller && targetProduct.status === 'pending' && <><button onClick={() => handleDealAction('finish')} className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold text-sm shadow-sm transition-all hover:bg-blue-700"><DollarSign size={16} className="inline mr-1"/> Đã giao</button><button onClick={() => handleDealAction('cancel')} className="px-4 bg-slate-200 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-300 transition-all"><XCircle size={16}/></button></>}
                        {isBuyer && targetProduct.status === 'pending' && <div className="flex-1 bg-orange-50 text-orange-700 py-3 rounded-xl font-bold text-xs text-center border border-orange-200 flex items-center justify-center gap-2"><Loader2 size={14} className="animate-spin"/> Đang chờ xác nhận...</div>}
                        {targetProduct.status === 'sold' && <div className="flex-1 bg-slate-100 text-slate-500 py-3 rounded-xl font-bold text-xs text-center border border-slate-200 flex justify-center items-center gap-2"><Truck size={16}/> Giao dịch đã hoàn tất</div>}
                     </div>
                  </div>
               )}

               {/* MESSAGES */}
               <div className="flex-1 overflow-y-auto p-4 space-y-3 chat-scrollbar bg-[#F8FAFC]" ref={containerRef}>
                  {messages.map((msg, idx) => {
                      const isMe = msg.sender_id === user?.id;
                      const isSystem = msg.content?.includes("TÔI MUỐN MUA") || msg.content?.includes("ĐÃ XÁC NHẬN") || msg.content?.includes("GIAO DỊCH") || msg.content?.includes("ĐÃ HỦY");
                      const prevMsg = messages[idx-1];
                      const showDate = !prevMsg || new Date(msg.created_at).toDateString() !== new Date(prevMsg.created_at).toDateString();

                      return (
                         <React.Fragment key={idx}>
                             {showDate && <div className="date-divider"><span>{formatMessageDate(msg.created_at)}</span></div>}
                             {isSystem ? (
                                 <div className="flex justify-center my-6"><div className="bg-slate-100 border border-slate-200 text-slate-600 px-4 py-2 rounded-full text-xs font-bold shadow-sm flex items-center gap-2"><AlertCircle size={12} className="text-[#00418E]"/><span className="whitespace-pre-wrap text-center">{msg.content}</span></div></div>
                             ) : (
                                 <div className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-slide-in group relative`}>
                                    {!isMe && <img src={partnerProfile?.avatar_url} className="w-8 h-8 rounded-full mr-2 self-end border border-slate-200 bg-white"/>}
                                    <div 
                                        className={`msg-bubble ${isMe ? 'msg-me' : 'msg-you'} ${msg.type === 'image' ? 'msg-image' : ''}`}
                                        onContextMenu={(e) => {
                                            if(isMe) {
                                                e.preventDefault();
                                                setContextMenu({ x: e.clientX, y: e.clientY, msgId: msg.id });
                                            }
                                        }}
                                    >
                                       {renderMessageContent(msg)}
                                       <div className={`text-[10px] mt-1 flex items-center justify-end gap-1 ${isMe ? 'text-blue-100' : 'text-slate-400'} ${msg.type === 'image' ? 'hidden' : ''}`}>
                                          {new Date(msg.created_at).toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'})}
                                          {isMe && <CheckCheck size={12} className={msg.is_read ? "text-white" : "opacity-50"} />}
                                       </div>
                                    </div>
                                 </div>
                             )}
                         </React.Fragment>
                      );
                  })}
                  {partnerTyping && (
                     <div className="flex gap-2 items-end">
                        <img src={partnerProfile?.avatar_url} className="w-6 h-6 rounded-full" />
                        <div className="bg-white border border-slate-100 px-4 py-3 rounded-2xl rounded-bl-sm flex gap-1 items-center shadow-sm">
                           <div className="typing-dot"></div><div className="typing-dot"></div><div className="typing-dot"></div>
                        </div>
                     </div>
                  )}
                  <div ref={scrollRef} className="h-2"/>
                  {showScrollBtn && <button onClick={scrollToBottom} className="fixed bottom-24 right-8 bg-white p-3 rounded-full shadow-lg border border-slate-200 text-[#00418E] animate-bounce z-40 hover:bg-blue-50"><ChevronDown size={20} /></button>}
                  {contextMenu && (
                      <div className="context-menu" style={{ top: contextMenu.y, left: contextMenu.x }}>
                          <div className="context-item" onClick={() => handleDeleteMessage(contextMenu.msgId)}>
                              <Trash size={14}/> Thu hồi tin nhắn
                          </div>
                      </div>
                  )}
               </div>

               {/* INPUT */}
               <div className="p-3 bg-white border-t border-slate-200">
                  <div className="flex gap-2 overflow-x-auto pb-3 chat-scrollbar">
                     {QUICK_REPLIES.map((t, i) => (
                        <button key={i} onClick={() => handleSendMessage(undefined, t)} className="whitespace-nowrap px-3 py-1.5 bg-slate-50 border border-slate-200 text-xs rounded-full hover:bg-[#00418E] hover:text-white hover:border-[#00418E] text-slate-600 font-bold transition-all">{t}</button>
                     ))}
                  </div>
                  <form onSubmit={(e) => handleSendMessage(e)} className="flex items-center gap-2 relative">
                      <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={handleImageUpload} />
                      <div className="flex gap-1">
                          <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2 text-slate-400 hover:text-[#00418E] hover:bg-blue-50 rounded-full transition-colors" disabled={uploading}>
                              {uploading ? <Loader2 size={20} className="animate-spin"/> : <ImageIcon size={20}/>}
                          </button>
                          <button type="button" onClick={handleSendLocation} className="p-2 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-full transition-colors"><MapPin size={20}/></button>
                      </div>
                      <div className="flex-1 bg-slate-100 rounded-full px-4 py-3 focus-within:ring-2 focus-within:ring-[#00418E]/20 transition-all flex items-center gap-2">
                         <input value={newMessage} onChange={handleTyping} placeholder="Nhập tin nhắn..." className="flex-1 bg-transparent outline-none text-sm text-slate-800 placeholder:text-slate-400"/>
                         <button type="button" onClick={() => setShowEmojiPicker(!showEmojiPicker)} className="text-slate-400 hover:text-orange-500 emoji-btn"><Smile size={18}/></button>
                      </div>
                      <button type="submit" disabled={!newMessage.trim()} className="p-3 bg-[#00418E] hover:bg-[#00306b] text-white rounded-full disabled:opacity-50 shadow-md transition-all active:scale-95"><Send size={18}/></button>
                      {showEmojiPicker && (
                          <div className="absolute bottom-16 right-16 bg-white border border-slate-200 rounded-xl shadow-lg p-2 grid grid-cols-6 gap-2 emoji-btn animate-slide-in z-50">
                              {COMMON_EMOJIS.map(e => (
                                  <button key={e} type="button" onClick={() => setNewMessage(prev => prev + e)} className="text-xl hover:bg-slate-100 p-1 rounded transition-colors">{e}</button>
                              ))}
                          </div>
                      )}
                  </form>
               </div>
            </>
         ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-300 bg-[#F8FAFC]">
               <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-6 shadow-sm border border-slate-100"><MessageCircle size={48} className="text-slate-200"/></div>
               <p className="font-bold text-slate-400">Chọn một cuộc hội thoại để bắt đầu</p>
            </div>
         )}
      </div>
    </div>
  );
};

export default ChatPage;
