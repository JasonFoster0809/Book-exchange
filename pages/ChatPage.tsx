import React, { useState } from 'react';
import { MOCK_USERS, CURRENT_USER } from '../constants';
import { Send } from 'lucide-react';

const ChatPage: React.FC = () => {
  const [activeChat, setActiveChat] = useState('u2');
  const [messages, setMessages] = useState([
    { id: '1', senderId: 'u2', text: 'Hi! Is the Calculus book still available?', timestamp: Date.now() - 100000 },
    { id: '2', senderId: 'u1', text: 'Yes it is. Are you on campus today?', timestamp: Date.now() - 50000 },
  ]);
  const [newMessage, setNewMessage] = useState('');

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    setMessages([...messages, {
      id: Date.now().toString(),
      senderId: CURRENT_USER.id,
      text: newMessage,
      timestamp: Date.now()
    }]);
    setNewMessage('');
  };

  const otherUser = MOCK_USERS[activeChat];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 h-[calc(100vh-4rem)]">
      <div className="bg-white rounded-lg shadow-lg overflow-hidden h-full flex border border-gray-200">
        
        {/* Sidebar */}
        <div className="w-1/3 border-r border-gray-200 bg-gray-50 flex flex-col">
           <div className="p-4 border-b border-gray-200">
             <h2 className="text-lg font-bold text-gray-800">Messages</h2>
           </div>
           <div className="overflow-y-auto flex-1">
             <button 
                onClick={() => setActiveChat('u2')}
                className={`w-full p-4 flex items-center hover:bg-gray-100 transition-colors ${activeChat === 'u2' ? 'bg-white border-l-4 border-indigo-600 shadow-sm' : ''}`}
             >
                <img src={MOCK_USERS['u2'].avatar} alt="" className="w-10 h-10 rounded-full object-cover" />
                <div className="ml-3 text-left">
                  <p className="text-sm font-medium text-gray-900">{MOCK_USERS['u2'].name}</p>
                  <p className="text-xs text-gray-500 truncate">Are you on campus today?</p>
                </div>
             </button>
             {/* Mock another conversation */}
             <button 
                onClick={() => setActiveChat('u3')}
                className={`w-full p-4 flex items-center hover:bg-gray-100 transition-colors ${activeChat === 'u3' ? 'bg-white border-l-4 border-indigo-600 shadow-sm' : ''}`}
             >
                <img src={MOCK_USERS['u3'].avatar} alt="" className="w-10 h-10 rounded-full object-cover" />
                <div className="ml-3 text-left">
                  <p className="text-sm font-medium text-gray-900">{MOCK_USERS['u3'].name}</p>
                  <p className="text-xs text-gray-500 truncate">Thanks!</p>
                </div>
             </button>
           </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col bg-white">
           <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center">
                 <img src={otherUser?.avatar} alt="" className="w-8 h-8 rounded-full object-cover mr-2" />
                 <span className="font-bold text-gray-900">{otherUser?.name}</span>
              </div>
              <button className="text-xs text-indigo-600 font-medium hover:underline">View Profile</button>
           </div>

           <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-gray-50">
              {messages.map((msg) => {
                const isMe = msg.senderId === CURRENT_USER.id;
                return (
                  <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-xs md:max-w-md px-4 py-2 rounded-lg shadow-sm ${isMe ? 'bg-indigo-600 text-white' : 'bg-white text-gray-800 border border-gray-200'}`}>
                      <p className="text-sm">{msg.text}</p>
                    </div>
                  </div>
                );
              })}
           </div>

           <div className="p-4 border-t border-gray-200 bg-white">
             <form onSubmit={handleSend} className="flex gap-2">
               <input 
                 type="text" 
                 className="flex-1 border border-gray-300 rounded-full px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                 placeholder="Type a message..."
                 value={newMessage}
                 onChange={(e) => setNewMessage(e.target.value)}
               />
               <button 
                 type="submit" 
                 className="bg-indigo-600 text-white rounded-full p-2 hover:bg-indigo-700 transition-colors"
               >
                 <Send className="w-5 h-5" />
               </button>
             </form>
           </div>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;