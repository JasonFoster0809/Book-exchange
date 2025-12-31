import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Send, User as UserIcon, MoreVertical, Phone, Video, Tag, X, CheckCircle } from 'lucide-react'; // Thêm icon Tag, X, CheckCircle
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';
import { Product } from '../types';

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
}

interface ChatPartner {
  id: string;
  name: string;
  avatar: string;
  lastMessage?: string;
  lastTime?: string;
}

const ChatPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const partnerIdParam = searchParams.get('partnerId');

  const [activePartnerId, setActivePartnerId] = useState<string | null>(null);
  const [partners, setPartners] = useState<ChatPartner[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  
  // State cho Modal Chốt đơn
  const [showSellModal, setShowSellModal] = useState(false);
  const [myProducts, setMyProducts] = useState<Product[]>([]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 1. Tải danh sách hội thoại
  useEffect(() => {
    if (!user) return;
    const fetchConversations = async () => {
      setLoading(true);
      const { data, error } = await supabase.from('messages').select(`*, sender:sender_id(id, name, avatar_url), receiver:receiver_id(id, name, avatar_url)`).or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`).order('created_at', { ascending: false });

      if (!error && data) {
        const rawMessages = data as any[];
        const partnerMap = new Map<string, ChatPartner>();
        rawMessages.forEach((msg) => {
          const isMe = msg.sender_id === user.id;
          const partner = isMe ? msg.receiver : msg.sender;
          if (partner && partner.id !== user.id && !partnerMap.has(partner.id)) {
             partnerMap.set(partner.id, { id: partner.id, name: partner.name || 'Người dùng', avatar: partner.avatar_url || 'https://via.placeholder.com/150', lastMessage: msg.content, lastTime: msg.created_at });
          }
        });

        if (partnerIdParam && !partnerMap.has(partnerIdParam) && partnerIdParam !== user.id) {
           const { data: newPartner } = await supabase.from('profiles').select('*').eq('id', partnerIdParam).single();
           if (newPartner) {
              setPartners([{ id: newPartner.id, name: newPartner.name, avatar: newPartner.avatar_url, lastMessage: 'Bắt đầu cuộc trò chuyện', lastTime: new Date().toISOString() }, ...Array.from(partnerMap.values())]);
              setActivePartnerId(newPartner.id);
              setLoading(false);
              return;
           }
        }
        setPartners(Array.from(partnerMap.values()));
        if (partnerIdParam) setActivePartnerId(partnerIdParam);
        else if (partnerMap.size > 0) setActivePartnerId(partnerMap.keys().next().value);
      }
      setLoading(false);
    };
    fetchConversations();
  }, [user, partnerIdParam]);

  // 2. Tải tin nhắn & Realtime
  useEffect(() => {
      if (!user || !activePartnerId) return;
      const fetchMessages = async () => {
          const { data } = await supabase.from('messages').select('*').or(`and(sender_id.eq.${user.id},receiver_id.eq.${activePartnerId}),and(sender_id.eq.${activePartnerId},receiver_id.eq.${user.id})`).order('created_at', { ascending: true });
          if (data) setMessages(data);
          scrollToBottom();
      };
      fetchMessages();

      const channel = supabase.channel(`chat:${activePartnerId}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `receiver_id=eq.${user.id}` }, (payload) => {
            const newMsg = payload.new as Message;
            if (newMsg.sender_id === activePartnerId) { setMessages(prev => [...prev, newMsg]); scrollToBottom(); }
        }).subscribe();
      return () => { supabase.removeChannel(channel); };
  }, [activePartnerId, user]);

  // 3. Hàm tải sản phẩm của mình để bán
  const fetchMyProducts = async () => {
      if (!user) return;
      const { data } = await supabase
          .from('products')
          .select('*')
          .eq('seller_id', user.id)
          .eq('is_sold', false); // Chỉ lấy hàng chưa bán
      
      if (data) {
          setMyProducts(data.map((item: any) => ({
              id: item.id, sellerId: item.seller_id, title: item.title, description: item.description, price: item.price, category: item.category, condition: item.condition, images: item.images || [], tradeMethod: item.trade_method, postedAt: item.posted_at, isLookingToBuy: item.is_looking_to_buy
          })));
          setShowSellModal(true);
      }
  };

  // 4. Hàm Chốt đơn
  const handleConfirmSell = async (product: Product) => {
      if (!user || !activePartnerId) return;
      if (!confirm(`Xác nhận bán "${product.title}" cho người này?`)) return;

      // Update Product
      const { error } = await supabase.from('products').update({ is_sold: true, buyer_id: activePartnerId }).eq('id', product.id);

      if (!error) {
          // Gửi tin nhắn thông báo tự động
          const confirmMsg = `🎉 Đã chốt đơn thành công sản phẩm: ${product.title}. Cảm ơn bạn đã mua hàng!`;
          await supabase.from('messages').insert({ sender_id: user.id, receiver_id: activePartnerId, content: confirmMsg });
          
          // Cập nhật UI local
          setMessages(prev => [...prev, { id: Date.now().toString(), sender_id: user.id, receiver_id: activePartnerId, content: confirmMsg, created_at: new Date().toISOString() }]);
          scrollToBottom();
          setShowSellModal(false);
          alert("Đã chốt đơn thành công!");
      } else {
          alert("Lỗi: " + error.message);
      }
  };

  const scrollToBottom = () => setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !activePartnerId) return;
    const text = newMessage.trim();
    setNewMessage('');
    const tempId = Date.now().toString();
    setMessages(prev => [...prev, { id: tempId, sender_id: user.id, receiver_id: activePartnerId, content: text, created_at: new Date().toISOString() }]);
    scrollToBottom();
    const { error } = await supabase.from('messages').insert({ sender_id: user.id, receiver_id: activePartnerId, content: text });
    if (error) setMessages(prev => prev.filter(m => m.id !== tempId));
  };

  if (!user) return <div className="text-center py-20">Vui lòng đăng nhập.</div>;
  const activePartner = partners.find(p => p.id === activePartnerId);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 h-[calc(100vh-4rem)]">
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden h-full flex border border-gray-100 relative">
        
        {/* Sidebar */}
        <div className={`w-full md:w-80 border-r border-gray-200 bg-white flex flex-col ${activePartnerId ? 'hidden md:flex' : 'flex'}`}>
           <div className="p-5 border-b border-gray-100 bg-gray-50/50"><h2 className="text-xl font-bold text-gray-800">Đoạn chat</h2></div>
           <div className="overflow-y-auto flex-1">
             {partners.map(partner => (
                 <button key={partner.id} onClick={() => setActivePartnerId(partner.id)} className={`w-full p-4 flex items-center hover:bg-gray-50 transition-all ${activePartnerId === partner.id ? 'bg-indigo-50 border-l-4 border-indigo-600' : 'border-l-4 border-transparent'}`}>
                    <img src={partner.avatar} className="w-12 h-12 rounded-full object-cover border border-gray-200" />
                    <div className="ml-3 text-left overflow-hidden flex-1">
                      <div className="flex justify-between items-center"><p className="text-sm font-bold text-gray-900 truncate">{partner.name}</p></div>
                      <p className="text-xs text-gray-500 truncate mt-1">{partner.lastMessage || '...'}</p>
                    </div>
                 </button>
             ))}
           </div>
        </div>

        {/* Chat Area */}
        <div className={`flex-1 flex flex-col bg-white ${!activePartnerId ? 'hidden md:flex' : 'flex'}`}>
           {activePartnerId ? (
               <>
                <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-white shadow-sm z-10">
                    <div className="flex items-center">
                        <button onClick={() => setActivePartnerId(null)} className="md:hidden mr-3 text-gray-500">&larr;</button>
                        <Link to={`/profile/${activePartnerId}`}><img src={activePartner?.avatar} className="w-10 h-10 rounded-full object-cover border border-gray-100 mr-3" /></Link>
                        <div><Link to={`/profile/${activePartnerId}`} className="font-bold text-gray-900 hover:text-indigo-600">{activePartner?.name}</Link><span className="text-xs text-green-500 flex items-center"><span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1"></span> Online</span></div>
                    </div>
                    
                    {/* NÚT CHỐT ĐƠN */}
                    <button 
                        onClick={fetchMyProducts}
                        className="flex items-center px-3 py-1.5 bg-green-100 text-green-700 rounded-full text-xs font-bold hover:bg-green-200 transition-colors"
                        title="Bán sản phẩm cho người này"
                    >
                        <Tag className="w-4 h-4 mr-1" /> Chốt đơn
                    </button>
                </div>

                <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-gray-50">
                    {messages.map((msg) => {
                        const isMe = msg.sender_id === user.id;
                        return (
                        <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[75%] px-5 py-3 rounded-2xl shadow-sm text-sm ${isMe ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-white text-gray-800 rounded-bl-none border border-gray-100'}`}>
                                {msg.content}
                            </div>
                        </div>
                        );
                    })}
                    <div ref={messagesEndRef} />
                </div>

                <div className="p-4 bg-white border-t border-gray-100">
                    <form onSubmit={handleSend} className="flex gap-3 items-center">
                        <input type="text" className="flex-1 bg-gray-100 border-0 rounded-full px-5 py-3 focus:ring-2 focus:ring-indigo-500 outline-none text-sm" placeholder="Nhập tin nhắn..." value={newMessage} onChange={(e) => setNewMessage(e.target.value)} />
                        <button type="submit" className="bg-indigo-600 text-white rounded-full p-3 hover:bg-indigo-700" disabled={!newMessage.trim()}><Send className="w-5 h-5" /></button>
                    </form>
                </div>
               </>
           ) : <div className="flex-1 flex flex-col items-center justify-center text-gray-400 bg-gray-50"><UserIcon className="w-16 h-16 mb-4 opacity-20" /><p>Chọn hội thoại</p></div>}
        </div>

        {/* MODAL CHỌN SẢN PHẨM ĐỂ BÁN */}
        {showSellModal && (
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col">
                    <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                        <h3 className="font-bold text-lg text-gray-800">Chọn sản phẩm để chốt đơn</h3>
                        <button onClick={() => setShowSellModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5"/></button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {myProducts.length === 0 ? (
                            <p className="text-center text-gray-500 py-4">Bạn không có sản phẩm nào đang bán.</p>
                        ) : (
                            myProducts.map(p => (
                                <button 
                                    key={p.id} 
                                    onClick={() => handleConfirmSell(p)}
                                    className="w-full flex items-center p-3 border border-gray-200 rounded-lg hover:bg-indigo-50 hover:border-indigo-200 transition-all text-left group"
                                >
                                    <img src={p.images[0]} className="w-12 h-12 rounded object-cover bg-gray-200" />
                                    <div className="ml-3 flex-1">
                                        <p className="font-bold text-sm text-gray-900 group-hover:text-indigo-700 line-clamp-1">{p.title}</p>
                                        <p className="text-xs text-indigo-600 font-medium">{p.price.toLocaleString()} đ</p>
                                    </div>
                                    <CheckCircle className="w-5 h-5 text-gray-300 group-hover:text-indigo-600" />
                                </button>
                            ))
                        )}
                    </div>
                </div>
            </div>
        )}

      </div>
    </div>
  );
};

export default ChatPage;