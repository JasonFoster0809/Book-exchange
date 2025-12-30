import React, { useState, useEffect } from 'react';
import { Search, Filter, Sparkles } from 'lucide-react';
import { MOCK_PRODUCTS } from '../constants';
import ProductCard from '../components/ProductCard';
import { ProductCategory, Product } from '../types';
import { smartSearchInterpreter } from '../services/geminiService';

const MarketplacePage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [products, setProducts] = useState<Product[]>(MOCK_PRODUCTS);
  const [isSearching, setIsSearching] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);

  // Simple local filter
  useEffect(() => {
    let filtered = MOCK_PRODUCTS;

    if (selectedCategory !== 'All') {
      filtered = filtered.filter(p => p.category === selectedCategory);
    }

    if (searchTerm && !isSearching) { // Only standard filter if not doing AI search
       const lower = searchTerm.toLowerCase();
       filtered = filtered.filter(p => p.title.toLowerCase().includes(lower) || p.description.toLowerCase().includes(lower));
    }

    setProducts(filtered);
  }, [searchTerm, selectedCategory, isSearching]);

  const handleSmartSearch = async () => {
      if (!searchTerm) return;
      setIsSearching(true);
      setAiSuggestion("Analyzing query with AI...");

      const result = await smartSearchInterpreter(searchTerm);
      
      if (result) {
          let filtered = MOCK_PRODUCTS;
          
          // Apply AI suggested category
          if (result.category) {
              setSelectedCategory(result.category);
              filtered = filtered.filter(p => p.category === result.category);
          }

          // Apply AI keywords
          if (result.keywords.length > 0) {
              filtered = filtered.filter(p => {
                  const content = (p.title + " " + p.description).toLowerCase();
                  return result.keywords.some(k => content.includes(k.toLowerCase()));
              });
          }
          setProducts(filtered);
          setAiSuggestion(`AI Filtered by Category: ${result.category || 'Any'} & Keywords: ${result.keywords.join(', ')}`);
      } else {
          setAiSuggestion("AI search unavailable, using standard search.");
      }
      setIsSearching(false);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
        <h1 className="text-3xl font-bold text-gray-900">Marketplace</h1>
        
        <div className="flex-1 max-w-lg w-full">
            <div className="relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                    type="text"
                    className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 pr-12 sm:text-sm border-gray-300 rounded-md py-3"
                    placeholder="Search by name, course code (e.g., MATH101)..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSmartSearch()}
                />
                <div className="absolute inset-y-0 right-0 flex items-center">
                    <button 
                        onClick={handleSmartSearch}
                        className="p-2 text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 rounded-r-md border-l border-gray-300 flex items-center gap-1 text-xs font-medium h-full px-3"
                        disabled={isSearching}
                    >
                        {isSearching ? '...' : <><Sparkles className="w-3 h-3" /> AI Search</>}
                    </button>
                </div>
            </div>
            {aiSuggestion && (
                <p className="mt-2 text-xs text-indigo-600 flex items-center">
                    <Sparkles className="w-3 h-3 mr-1" /> {aiSuggestion}
                </p>
            )}
        </div>
      </div>

      <div className="flex overflow-x-auto pb-4 gap-2 mb-6 scrollbar-hide">
        {['All', ...Object.values(ProductCategory)].map((cat) => (
          <button
            key={cat}
            onClick={() => { setSelectedCategory(cat); setSearchTerm(''); setAiSuggestion(null); }}
            className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              selectedCategory === cat
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
        {products.length === 0 && (
            <div className="col-span-full text-center py-20 bg-white rounded-lg border border-dashed border-gray-300">
                <p className="text-gray-500">No products found matching your criteria.</p>
                <button 
                    onClick={() => {setSearchTerm(''); setSelectedCategory('All'); setAiSuggestion(null);}} 
                    className="mt-4 text-indigo-600 font-medium hover:underline"
                >
                    Clear all filters
                </button>
            </div>
        )}
      </div>
    </div>
  );
};

export default MarketplacePage;