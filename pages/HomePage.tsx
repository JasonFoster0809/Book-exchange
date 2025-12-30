import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, Calculator, PenTool, Shirt } from 'lucide-react';
import ProductCard from '../components/ProductCard';
import { MOCK_PRODUCTS } from '../constants';

const HomePage: React.FC = () => {
  const featuredProducts = MOCK_PRODUCTS.slice(0, 4);

  const categories = [
    { name: 'Textbooks', icon: BookOpen, color: 'bg-blue-100 text-blue-600' },
    { name: 'Electronics', icon: Calculator, color: 'bg-orange-100 text-orange-600' },
    { name: 'Supplies', icon: PenTool, color: 'bg-green-100 text-green-600' },
    { name: 'Uniforms', icon: Shirt, color: 'bg-purple-100 text-purple-600' },
  ];

  return (
    <div className="min-h-screen pb-16">
      {/* Hero Section */}
      <div className="relative bg-indigo-800">
        <div className="absolute inset-0">
          <img
            className="w-full h-full object-cover opacity-20"
            src="https://picsum.photos/id/20/1920/600"
            alt="University Library"
          />
        </div>
        <div className="relative max-w-7xl mx-auto py-24 px-4 sm:py-32 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl">
            Pass it on, keep learning.
          </h1>
          <p className="mt-6 text-xl text-indigo-100 max-w-3xl">
            The trusted marketplace for students. Buy and sell textbooks, calculators, and gear securely using your Student ID.
          </p>
          <div className="mt-10 flex gap-4">
             <Link to="/market" className="bg-white border border-transparent rounded-md py-3 px-8 inline-flex items-center justify-center text-base font-medium text-indigo-700 hover:bg-indigo-50">
                Browse Items
             </Link>
             <Link to="/post" className="bg-indigo-600 border border-transparent rounded-md py-3 px-8 inline-flex items-center justify-center text-base font-medium text-white hover:bg-indigo-700 opacity-90 border-white/20">
                Sell an Item
             </Link>
          </div>
        </div>
      </div>

      {/* Categories */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Browse by Category</h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {categories.map((cat) => (
            <Link key={cat.name} to={`/market?cat=${cat.name}`} className="group relative rounded-xl border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md transition-all flex flex-col items-center text-center cursor-pointer">
              <div className={`p-4 rounded-full ${cat.color} mb-3 group-hover:scale-110 transition-transform`}>
                <cat.icon className="h-6 w-6" />
              </div>
              <span className="font-semibold text-gray-900">{cat.name}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Featured Items */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 bg-gray-50">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Recent Listings</h2>
          <Link to="/market" className="text-indigo-600 font-medium hover:text-indigo-500 flex items-center">
            View all <ArrowRight className="ml-1 h-4 w-4" />
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-y-10 sm:grid-cols-2 gap-x-6 lg:grid-cols-4 xl:gap-x-8">
          {featuredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
      
      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
         <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div className="p-6">
               <div className="mx-auto w-12 h-12 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mb-4 font-bold text-xl">1</div>
               <h3 className="font-bold text-lg mb-2">Verified Students</h3>
               <p className="text-gray-600 text-sm">Every user is verified via Student ID (MSSV) for a trusted community.</p>
            </div>
            <div className="p-6">
               <div className="mx-auto w-12 h-12 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mb-4 font-bold text-xl">2</div>
               <h3 className="font-bold text-lg mb-2">Smart Lockers</h3>
               <p className="text-gray-600 text-sm">Busy schedule? Use our secure campus lockers for indirect exchanges.</p>
            </div>
            <div className="p-6">
               <div className="mx-auto w-12 h-12 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mb-4 font-bold text-xl">3</div>
               <h3 className="font-bold text-lg mb-2">Request Items</h3>
               <p className="text-gray-600 text-sm">Can't find it? Post a "Looking to Buy" request and let sellers find you.</p>
            </div>
         </div>
      </div>
    </div>
  );
};

export default HomePage;