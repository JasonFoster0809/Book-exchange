import React from 'react';
import { useTranslation } from 'react-i18next';

const LanguageSwitcher: React.FC = () => {
  const { i18n } = useTranslation();

  const toggleLanguage = () => {
    // Lấy ngôn ngữ thực tế đang sử dụng (resolvedLanguage chuẩn hơn language)
    const currentLang = i18n.resolvedLanguage || i18n.language;
    
    // Kiểm tra lỏng hơn: Nếu bắt đầu bằng 'vi' (ví dụ 'vi', 'vi-VN') thì chuyển sang 'en'
    const newLang = currentLang.startsWith('vi') ? 'en' : 'vi';
    
    i18n.changeLanguage(newLang);
  };

  // Xác định trạng thái hiện tại để hiển thị
  const currentLang = i18n.resolvedLanguage || i18n.language;
  const isVietnamese = currentLang.startsWith('vi');

  return (
    <button 
      onClick={toggleLanguage}
      className="flex items-center gap-1 px-3 py-1 rounded-full border border-gray-300 bg-white hover:bg-gray-50 transition text-sm font-bold text-gray-700"
      title="Switch Language"
    >
      {isVietnamese ? (
        <>🇻🇳 VN</>
      ) : (
        <>🇺🇸 EN</>
      )}
    </button>
  );
};

export default LanguageSwitcher;
