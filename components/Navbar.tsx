import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShoppingBag, MessageCircle, User, PlusCircle, Search } from 'lucide-react';
import { CURRENT_USER } from '../constants';

const Navbar: React.FC = () => {
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path ? 'text-indigo-600' : 'text-gray-500 hover:text-gray-900';

  return (
    <nav className="bg-white shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <Link to="/" className="flex-shrink-0 flex items-center">
              <ShoppingBag className="h-8 w-8 text-indigo-600" />
              <span className="ml-2 text-xl font-bold text-gray-900 hidden sm:block">UniMarket</span>
            </Link>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              <Link to="/" className={`${isActive('/')} inline-flex items-center px-1 pt-1 border-b-2 border-transparent text-sm font-medium`}>
                Home
              </Link>
              <Link to="/market" className={`${isActive('/market')} inline-flex items-center px-1 pt-1 border-b-2 border-transparent text-sm font-medium`}>
                Marketplace
              </Link>
              <Link to="/chat" className={`${isActive('/chat')} inline-flex items-center px-1 pt-1 border-b-2 border-transparent text-sm font-medium`}>
                Messages
              </Link>
            </div>
          </div>
          <div className="flex items-center space-x-4">
             <Link to="/market" className="p-2 text-gray-400 hover:text-gray-500 sm:hidden">
              <Search className="h-6 w-6" />
            </Link>
            <Link to="/post" className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
              <PlusCircle className="mr-2 h-4 w-4" />
              Post Item
            </Link>
            <div className="flex-shrink-0 relative ml-4">
               <Link to="/profile" className="flex items-center">
                 <img className="h-8 w-8 rounded-full object-cover border border-gray-200" src={CURRENT_USER.avatar} alt="User" />
               </Link>
            </div>
          </div>
        </div>
      </div>
      {/* Mobile Nav */}
      <div className="sm:hidden flex justify-around border-t border-gray-200 bg-white py-2 fixed bottom-0 w-full z-40">
         <Link to="/" className={`flex flex-col items-center p-2 ${isActive('/')}`}>
            <ShoppingBag className="h-6 w-6" />
            <span className="text-xs">Home</span>
         </Link>
         <Link to="/market" className={`flex flex-col items-center p-2 ${isActive('/market')}`}>
            <Search className="h-6 w-6" />
            <span className="text-xs">Browse</span>
         </Link>
         <Link to="/chat" className={`flex flex-col items-center p-2 ${isActive('/chat')}`}>
            <MessageCircle className="h-6 w-6" />
            <span className="text-xs">Chat</span>
         </Link>
          <Link to="/profile" className={`flex flex-col items-center p-2 ${isActive('/profile')}`}>
            <User className="h-6 w-6" />
            <span className="text-xs">Profile</span>
         </Link>
      </div>
    </nav>
  );
};

export default Navbar;