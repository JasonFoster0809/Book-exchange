import React from 'react';
import { CURRENT_USER } from '../constants';
import { ShieldCheck, LogOut, Settings, CreditCard } from 'lucide-react';

const ProfilePage: React.FC = () => {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="bg-indigo-600 h-32 w-full"></div>
        <div className="px-6 relative">
           <img 
             src={CURRENT_USER.avatar} 
             alt="Avatar" 
             className="w-24 h-24 rounded-full border-4 border-white absolute -top-12 shadow-md object-cover"
           />
           <div className="pt-14 pb-6">
             <h1 className="text-2xl font-bold text-gray-900 flex items-center">
               {CURRENT_USER.name}
               {CURRENT_USER.isVerified && <ShieldCheck className="w-6 h-6 text-blue-500 ml-2" />}
             </h1>
             <p className="text-gray-500 text-sm">Student ID: {CURRENT_USER.studentId}</p>
             <p className="text-gray-500 text-sm">Email: student@university.edu.vn (Hidden)</p>
           </div>
        </div>
        
        <div className="border-t border-gray-200">
           <dl>
             <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6 hover:bg-gray-100 cursor-pointer transition">
               <dt className="text-sm font-medium text-gray-500 flex items-center">
                 <ShieldCheck className="w-5 h-5 mr-2 text-gray-400" /> Verification Status
               </dt>
               <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2 flex items-center">
                 <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-bold">Verified</span>
                 <span className="ml-2 text-gray-400 text-xs">(2-Factor Auth Enabled)</span>
               </dd>
             </div>
             
             <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6 hover:bg-gray-50 cursor-pointer transition">
               <dt className="text-sm font-medium text-gray-500 flex items-center">
                 <CreditCard className="w-5 h-5 mr-2 text-gray-400" /> Payment Methods
               </dt>
               <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                 Linked QR Code (VietQR)
               </dd>
             </div>

             <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6 hover:bg-gray-100 cursor-pointer transition">
               <dt className="text-sm font-medium text-gray-500 flex items-center">
                 <Settings className="w-5 h-5 mr-2 text-gray-400" /> Settings
               </dt>
               <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                 Change Password, Notification Preferences
               </dd>
             </div>

             <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6 hover:bg-red-50 cursor-pointer transition">
               <dt className="text-sm font-medium text-red-500 flex items-center">
                 <LogOut className="w-5 h-5 mr-2" /> Sign Out
               </dt>
               <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                 
               </dd>
             </div>
           </dl>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;