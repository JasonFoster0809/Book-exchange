import React from 'react';
import { useTranslation } from 'react-i18next';

const LanguageSwitcher: React.FC = () => {
  const { i18n } = useTranslation();

  const toggleLanguage = () => {
    const newLang = i18n.language === 'vi' ? 'en' : 'vi';
    i18n.changeLanguage(newLang);
  };

  return (
    <button 
      onClick={toggleLanguage}
      className="flex items-center gap-1 px-3 py-1 rounded-full border border-gray-300 bg-white hover:bg-gray-50 transition text-sm font-bold text-gray-700"
      title="Switch Language"
    >
      {i18n.language === 'vi' ? (
        <>🇻🇳 VN</>
      ) : (
        <>🇺🇸 EN</>
      )}
    </button>
  );
};

export default LanguageSwitcher;