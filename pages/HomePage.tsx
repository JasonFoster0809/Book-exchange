import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { ArrowRight, BookOpen, Smartphone, PenTool, Shirt } from 'lucide-react';
import ProductCard from '../components/ProductCard';
import { Product } from '../types';
import { useTranslation } from 'react-i18next'; // Import dịch

const HomePage: React.FC = () => {
  const { t } = useTranslation(); // Hook dịch
  const [latestProducts, setLatestProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLatest = async () => {
      const { data } = await supabase
        .from('products')
        .select('*')
        .eq('is_sold', false)
        .order('posted_at', { ascending: false })
        .limit(4); // Lấy 4 tin mới nhất

      if (data) {
        setLatestProducts(data.map((item: any) => ({
            id: item.id, sellerId: item.seller_id, title: item.title, description: item.description, price: item.price, category: item.category, condition: item.condition, images: item.images || [], tradeMethod: item.trade_method, postedAt: item.posted_at, isLookingToBuy: item.is_looking_to_buy
        })));
      }
      setLoading(false);
    };
    fetchLatest();
  }, []);

  // Danh mục kèm icon và key dịch tương ứng
  const categories = [
    { name: t('home.cat.textbook'), icon: <BookOpen className="w-6 h-6 text-blue-500" />, path: "Textbook" },
    { name: t('home.cat.electronics'), icon: <Smartphone className="w-6 h-6 text-purple-500" />, path: "Electronics" },
    { name: t('home.cat.supplies'), icon: <PenTool className="w-6 h-6 text-green-500" />, path: "School Supplies" },
    { name: t('home.cat.clothing'), icon: <Shirt className="w-6 h-6 text-pink-500" />, path: "Uniforms/Clothing" },
  ];

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-700 text-white py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between">
            <div className="md:w-1/2 mb-10 md:mb-0">
                <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4 leading-tight">
                    {t('home.hero_title')}
                </h1>
                <p className="text-lg text-indigo-100 mb-8 max-w-xl">
                    {t('home.hero_subtitle')}
                </p>
                <div className="flex gap-4">
                    <Link to="/market" className="bg-white text-indigo-600 px-6 py-3 rounded-full font-bold hover:bg-gray-100 transition shadow-lg">
                        {t('home.explore_btn')}
                    </Link>
                    <Link to="/post" className="bg-indigo-500 bg-opacity-30 border border-indigo-400 text-white px-6 py-3 rounded-full font-bold hover:bg-opacity-40 transition backdrop-blur-sm">
                        {t('home.sell_btn')}
                    </Link>
                </div>
            </div>
            
            {/* Hình ảnh minh họa (Giữ nguyên hoặc thay ảnh khác tùy bạn) */}
            <div className="md:w-1/2 flex justify-center relative">
                 <div className="absolute inset-0 bg-white opacity-10 blur-3xl rounded-full"></div>
                 <img src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" alt="Students" className="relative rounded-2xl shadow-2xl transform -rotate-3 hover:rotate-0 transition duration-500 max-w-sm md:max-w-md border-4 border-white/20"/>
            </div>
        </div>
      </div>

      {/* Popular Categories */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 w-full">
          <h2 className="text-2xl font-bold text-gray-900 mb-8">{t('home.popular_cat')}</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {categories.map((cat, idx) => (
                  <Link key={idx} to={`/market?category=${cat.path}`} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md hover:border-indigo-200 transition flex flex-col items-center justify-center text-center group">
                      <div className="bg-gray-50 p-4 rounded-full mb-3 group-hover:scale-110 transition duration-300">
                          {cat.icon}
                      </div>
                      <span className="font-medium text-gray-800 group-hover:text-indigo-600">{cat.name}</span>
                  </Link>
              ))}
          </div>
      </div>

      {/* Latest Items */}
      <div className="bg-gray-50 py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
              <div className="flex justify-between items-end mb-8">
                  <h2 className="text-2xl font-bold text-gray-900">{t('home.latest_items')}</h2>
                  <Link to="/market" className="text-indigo-600 font-medium hover:text-indigo-800 flex items-center">
                      {t('home.view_all')} <ArrowRight className="w-4 h-4 ml-1"/>
                  </Link>
              </div>
              
              {loading ? (
                  <div className="text-center py-20 text-gray-500">{t('home.loading')}</div>
              ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                      {latestProducts.length > 0 ? (
                          latestProducts.map(product => (
                              <ProductCard key={product.id} product={product} />
                          ))
                      ) : (
                          <div className="col-span-full text-center py-10 text-gray-400">{t('home.no_items')}</div>
                      )}
                  </div>
              )}
          </div>
      </div>
    </div>
  );
};

export default HomePage;