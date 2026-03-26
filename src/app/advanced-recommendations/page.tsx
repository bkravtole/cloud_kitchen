'use client';

import { useState, useEffect } from 'react';


// ... (Interfaces remain the same as your snippet)

export default function AdvancedRecommendationsPage() {
  const [recommendations, setRecommendations] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // FIXED: Now being used in the Modal below
  const [selectedItem, setSelectedItem] = useState<any | null>(null); 
  
  const userPhone = '919876543210'; 
  const restaurantId = 'rest_001';

  useEffect(() => {
    fetchAdvancedRecommendations();
  }, []);

  const fetchAdvancedRecommendations = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(
        `/api/recommendations/advanced?userPhone=${userPhone}&restaurantId=${restaurantId}&includeCombo=true&includeTrending=true`
      );
      const data = await res.json();
      if (data.success) setRecommendations(data.data);
      else setError(data.error);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ... (Helper functions: getConfidenceColor, getConfidenceLabel, getMealTimingEmoji remain the same)

  if (loading) return ( /* ... Loading State ... */ <div className="p-20 text-center">Loading...</div> );
  if (error) return ( /* ... Error State ... */ <div className="p-20 text-center text-red-500">{error}</div> );
  if (!recommendations) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-blue-50 relative">
      
      {/* --- ADDED: ITEM DETAIL MODAL --- */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-2xl font-bold text-gray-900">{selectedItem.name}</h2>
                <button 
                  onClick={() => setSelectedItem(null)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >✕</button>
              </div>
              <p className="text-indigo-600 font-bold text-xl mb-4">₹{selectedItem.price}</p>
              <div className="bg-indigo-50 p-4 rounded-lg mb-4">
                <p className="text-sm font-semibold text-indigo-800 mb-1">Why we picked this:</p>
                <p className="text-gray-700 italic text-sm">{selectedItem.reasoning}</p>
              </div>
              <div className="flex flex-wrap gap-2 mb-6">
                {selectedItem.tags.map((tag : any, i : any) => (
                  <span key={i} className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">#{tag}</span>
                ))}
              </div>
              <button className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition">
                Add to Cart
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- Rest of your Header & Profile Card --- */}
      <div className="bg-white shadow-lg sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
           <h1 className="text-3xl font-bold text-gray-900">🤖 AI Smart Recommendations</h1>
           <button onClick={fetchAdvancedRecommendations} className="px-4 py-2 bg-indigo-600 text-white rounded-lg">Refresh</button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Personalized Section */}
        {recommendations.personalized.length > 0 && (
          <div className="mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">🎯 Personalized Just For You</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {recommendations.personalized.map((item : any, idx : any) => (
                <div
                  key={idx}
                  className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition cursor-pointer group"
                  onClick={() => setSelectedItem(item)} // This triggers the modal
                >
                  {/* ... Card content same as before ... */}
                  <div className="p-4">
                    <h3 className="text-lg font-bold">{item.name}</h3>
                    <p className="text-2xl font-bold text-indigo-600">₹{item.price}</p>
                    <button className="w-full mt-4 px-4 py-2 bg-indigo-600 text-white rounded">
                      Add to Cart
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* ... Rest of your Combinations and Trending UI ... */}
      </div>
    </div>
  );
}