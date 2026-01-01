import React, { Suspense } from 'react'; // 1. Import Suspense
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

import './i18n'; 

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

// 2. Tạo component Loading đơn giản
const LoadingScreen = () => (
  <div className="h-screen w-screen flex items-center justify-center bg-gray-50">
     <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
  </div>
);

root.render(
  <React.StrictMode>
    {/* 3. Bọc App trong Suspense */}
    <Suspense fallback={<LoadingScreen />}>
      <App />
    </Suspense>
  </React.StrictMode>
);