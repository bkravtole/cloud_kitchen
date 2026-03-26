'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface RecommendedItem {
  itemId: string;
  name: string;
  price: number;
  timesOrdered?: number;
  orderedAt?: string;
  reason?: string;
}

interface RecommendationsData {
  frequentItems: RecommendedItem[];
  lastOrdered: RecommendedItem[];
  recommendations: RecommendedItem[];
}

export default function ReorderRecommendationsPage() {
  const [recommendations, setRecommendations] = useState<RecommendationsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedRestaurant] = useState('rest_001');
  const userPhone = '919876543210'; // From auth context in real app

  useEffect(() => {
    fetchRecommendations();
  }, [selectedRestaurant]);

  const fetchRecommendations = async () => {
    setLoading(true);
    setError('');

    try {
      const res = await fetch(
        `/api/order/reorder-recommendations?userPhone=${userPhone}&restaurantId=${selectedRestaurant}`
      );
      const data = await res.json();

      if (data.success) {
        setRecommendations(data.data);
      } else {
        setError(data.error);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = (item: RecommendedItem, section: string) => {
    console.log(`Added ${item.name} to cart from ${section}`);
    alert(`Added ${item.name} to cart! 🛒`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <p className="text-xl text-gray-600">Loading recommendations...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <p className="text-xl text-red-600">{error}</p>
      </div>
    );
  }

  if (!recommendations) {
    return null;
  }

  const hasAnyRecommendations =
    recommendations.frequentItems.length > 0 ||
    recommendations.lastOrdered.length > 0 ||
    recommendations.recommendations.length > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-rose-100">
      {/* Header */}
      <div className="bg-white shadow-lg sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <div className="flex items-center gap-3 mb-4">
            <Link href="/" className="text-rose-600 hover:text-rose-800 text-sm">
              ← Back
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">🎯 Reorder Recommendations</h1>
          </div>
          <p className="text-gray-600">Your personalized suggestions based on order history</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {!hasAnyRecommendations ? (
          <div className="bg-white rounded-lg shadow-lg p-12 text-center">
            <div className="text-6xl mb-4">🔍</div>
            <p className="text-xl font-semibold text-gray-900 mb-2">No recommendations yet</p>
            <p className="text-gray-600 mb-6">Place your first order to get personalized recommendations!</p>
            <Link
              href="/"
              className="inline-block px-6 py-3 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition font-medium"
            >
              Start Ordering
            </Link>
          </div>
        ) : (
          <>
            {/* Your Favorites */}
            {recommendations.frequentItems.length > 0 && (
              <div className="mb-12">
                <div className="flex items-center gap-2 mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">❤️ Your Favorites</h2>
                  <span className="px-3 py-1 bg-rose-100 text-rose-800 rounded-full text-sm font-semibold">
                    {recommendations.frequentItems.length}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {recommendations.frequentItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition"
                    >
                      <div className="p-4 bg-gradient-to-r from-rose-50 to-pink-50">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h3 className="text-lg font-bold text-gray-900">{item.name}</h3>
                            <p className="text-sm text-gray-600">
                              🔄 Ordered {item.timesOrdered} times
                            </p>
                          </div>
                          <div className="text-2xl">⭐</div>
                        </div>

                        <p className="text-2xl font-bold text-rose-600">₹{item.price.toFixed(2)}</p>
                      </div>

                      <div className="p-4 bg-white border-t border-gray-100">
                        <button
                          onClick={() => handleAddToCart(item, 'favorites')}
                          className="w-full px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition font-medium"
                        >
                          Add to Cart
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recently Ordered */}
            {recommendations.lastOrdered.length > 0 && (
              <div className="mb-12">
                <div className="flex items-center gap-2 mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">⏰ Recently Ordered</h2>
                  <span className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-sm font-semibold">
                    {recommendations.lastOrdered.length}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {recommendations.lastOrdered.map((item, idx) => {
                    const daysAgo = item.orderedAt
                      ? Math.floor(
                          (new Date().getTime() - new Date(item.orderedAt).getTime()) /
                            (1000 * 60 * 60 * 24)
                        )
                      : 0;

                    return (
                      <div
                        key={idx}
                        className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition"
                      >
                        <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <h3 className="text-lg font-bold text-gray-900">{item.name}</h3>
                              <p className="text-sm text-gray-600">
                                📅 {daysAgo === 0 ? 'Today' : `${daysAgo} days ago`}
                              </p>
                            </div>
                            <div className="text-2xl">🕐</div>
                          </div>

                          <p className="text-2xl font-bold text-amber-600">₹{item.price.toFixed(2)}</p>
                        </div>

                        <div className="p-4 bg-white border-t border-gray-100">
                          <button
                            onClick={() => handleAddToCart(item, 'recently-ordered')}
                            className="w-full px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition font-medium"
                          >
                            Add to Cart
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Recommended For You */}
            {recommendations.recommendations.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">💡 Recommended For You</h2>
                  <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-semibold">
                    {recommendations.recommendations.length}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {recommendations.recommendations.map((item, idx) => (
                    <div
                      key={idx}
                      className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition"
                    >
                      <div className="p-4 bg-gradient-to-r from-purple-50 to-violet-50">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h3 className="text-lg font-bold text-gray-900">{item.name}</h3>
                            <p className="text-xs text-gray-600 mt-1">{item.reason}</p>
                          </div>
                          <div className="text-2xl">✨</div>
                        </div>

                        <p className="text-2xl font-bold text-purple-600">₹{item.price.toFixed(2)}</p>
                      </div>

                      <div className="p-4 bg-white border-t border-gray-100">
                        <button
                          onClick={() => handleAddToCart(item, 'recommendations')}
                          className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-medium"
                        >
                          Add to Cart
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Browse Menu Button */}
            <div className="mt-12 text-center">
              <Link
                href="/"
                className="inline-block px-8 py-3 bg-gradient-to-r from-rose-600 to-pink-600 text-white rounded-lg hover:from-rose-700 hover:to-pink-700 transition font-medium text-lg"
              >
                🍽️ Browse Full Menu
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
