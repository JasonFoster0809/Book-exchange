import React, { useState } from 'react';
import { ProductCategory, ProductCondition, TradeMethod } from '../types';
import { Sparkles, Camera, UploadCloud } from 'lucide-react';
import { generateProductDescription } from '../services/geminiService';

const PostItemPage: React.FC = () => {
  const [formData, setFormData] = useState({
    title: '',
    price: '',
    category: ProductCategory.TEXTBOOK,
    condition: ProductCondition.GOOD,
    details: '', // User's raw input
    description: '', // Final description (can be AI generated)
    tradeMethod: TradeMethod.BOTH,
    type: 'sell' // 'sell' or 'buy'
  });

  const [isGenerating, setIsGenerating] = useState(false);

  const handleAiGenerate = async () => {
    if (!formData.title || !formData.details) {
      alert("Please enter a title and some details first.");
      return;
    }
    setIsGenerating(true);
    const desc = await generateProductDescription(
      formData.title,
      formData.condition,
      formData.category,
      formData.details
    );
    setFormData(prev => ({ ...prev, description: desc }));
    setIsGenerating(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert("Listing created successfully! (Mock Action)");
    // In a real app, send to backend
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
        <div className="md:grid md:grid-cols-3 md:gap-6">
          <div className="md:col-span-1">
            <h3 className="text-lg font-medium leading-6 text-gray-900">Post Item</h3>
            <p className="mt-1 text-sm text-gray-500">
              Share information about the item you want to sell or buy.
            </p>
          </div>
          <div className="mt-5 md:mt-0 md:col-span-2">
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-6 gap-6">
                
                {/* Type Selection */}
                <div className="col-span-6">
                    <div className="flex gap-4">
                        <label className="flex items-center">
                            <input type="radio" name="type" value="sell" checked={formData.type === 'sell'} onChange={e => setFormData({...formData, type: e.target.value})} className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300" />
                            <span className="ml-2 text-sm font-medium text-gray-700">I'm Selling</span>
                        </label>
                        <label className="flex items-center">
                            <input type="radio" name="type" value="buy" checked={formData.type === 'buy'} onChange={e => setFormData({...formData, type: e.target.value})} className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300" />
                            <span className="ml-2 text-sm font-medium text-gray-700">I'm Looking to Buy</span>
                        </label>
                    </div>
                </div>

                {/* Title */}
                <div className="col-span-6">
                  <label htmlFor="title" className="block text-sm font-medium text-gray-700">Title</label>
                  <input
                    type="text"
                    name="title"
                    id="title"
                    required
                    className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 border"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                  />
                </div>

                {/* Category & Condition */}
                <div className="col-span-6 sm:col-span-3">
                  <label htmlFor="category" className="block text-sm font-medium text-gray-700">Category</label>
                  <select
                    id="category"
                    name="category"
                    className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value as ProductCategory})}
                  >
                    {Object.values(ProductCategory).map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div className="col-span-6 sm:col-span-3">
                  <label htmlFor="condition" className="block text-sm font-medium text-gray-700">Condition</label>
                  <select
                    id="condition"
                    name="condition"
                    className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    value={formData.condition}
                    onChange={(e) => setFormData({...formData, condition: e.target.value as ProductCondition})}
                  >
                     {Object.values(ProductCondition).map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                {/* Price */}
                <div className="col-span-6 sm:col-span-3">
                  <label htmlFor="price" className="block text-sm font-medium text-gray-700">Price (VND)</label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <input
                      type="number"
                      name="price"
                      id="price"
                      className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-3 pr-12 sm:text-sm border-gray-300 rounded-md p-2 border"
                      placeholder="0"
                      value={formData.price}
                      onChange={(e) => setFormData({...formData, price: e.target.value})}
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 sm:text-sm">VND</span>
                    </div>
                  </div>
                </div>

                <div className="col-span-6 sm:col-span-3">
                    <label htmlFor="tradeMethod" className="block text-sm font-medium text-gray-700">Trade Method</label>
                     <select
                        id="tradeMethod"
                        name="tradeMethod"
                        className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        value={formData.tradeMethod}
                        onChange={(e) => setFormData({...formData, tradeMethod: e.target.value as TradeMethod})}
                    >
                         {Object.values(TradeMethod).map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>

                {/* Description AI Section */}
                <div className="col-span-6">
                  <div className="flex justify-between items-center mb-1">
                      <label htmlFor="details" className="block text-sm font-medium text-gray-700">
                        Quick Notes / Key Details
                      </label>
                  </div>
                  <input
                    type="text"
                    id="details"
                    className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border mb-3"
                    placeholder="e.g., Bought 2 years ago, highlighted chapter 1, price negotiable"
                    value={formData.details}
                    onChange={(e) => setFormData({...formData, details: e.target.value})}
                  />
                  
                  <div className="flex justify-between items-center mb-1">
                    <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                        Full Description
                    </label>
                    <button
                        type="button"
                        onClick={handleAiGenerate}
                        disabled={isGenerating}
                        className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded shadow-sm text-white bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700"
                    >
                        <Sparkles className="h-3 w-3 mr-1" />
                        {isGenerating ? 'Generating...' : 'Auto-Write with AI'}
                    </button>
                  </div>
                  <textarea
                    id="description"
                    name="description"
                    rows={4}
                    className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                  />
                </div>

                {/* Image Upload Mock */}
                <div className="col-span-6">
                  <label className="block text-sm font-medium text-gray-700">Item Photos</label>
                  <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                    <div className="space-y-1 text-center">
                      <Camera className="mx-auto h-12 w-12 text-gray-400" />
                      <div className="flex text-sm text-gray-600">
                        <label
                          htmlFor="file-upload"
                          className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500"
                        >
                          <span>Upload a file</span>
                          <input id="file-upload" name="file-upload" type="file" className="sr-only" />
                        </label>
                        <p className="pl-1">or drag and drop</p>
                      </div>
                      <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
                    </div>
                  </div>
                </div>

              </div>
              <div className="px-4 py-3 bg-gray-50 text-right sm:px-6 mt-4 -mx-6 -mb-6 rounded-b-lg">
                <button
                  type="submit"
                  className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Post Listing
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PostItemPage;