'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface MenuItem {
  itemId: string;
  name: string;
  price: number;
  reasoning: string;
  confidence: number;
  category: string;
  tags: string[];
  complementaryItems?: string[];
  mealTiming?: string;
}

interface UserProfile {
  totalOrders: number;
  favoriteCategories: string[];
  spicePreference: number;
  dietaryRestrictions: string[];
}

interface RecommendationsData {
  personalized: MenuItem[];
  combinations: MenuItem[];
  trending: MenuItem[];
  userProfile?: UserProfile;
}

export default function AdvancedRecommendationsPage() {
  const [recommendations, setRecommendations] = useState<RecommendationsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const userPhone = '919876543210'; // From auth in real app
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

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return 'text-green-600';
    if (confidence >= 0.75) return 'text-blue-600';
    return 'text-orange-600';
  };

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 0.9) return '⭐ Perfect Match';
    if (confidence >= 0.75) return '✅ Good Match';
    return '👍 Interesting';
  };

  const getMealTimingEmoji = (timing: string) => {
    switch (timing) {
      case 'breakfast':
        return '🌅';
      case 'lunch':
        return '☀️';
      case 'dinner':
        return '🌙';
      case 'snack':
        return '🍿';
      default:
        return '🍽️';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-100 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4">🤖</div>
          <p className="text-xl text-gray-700 font-medium">Analyzing your preferences...</p>
          <p className="text-gray-600 mt-2">Using AI to find your perfect meal</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="text-center">
          <p className="text-2xl text-red-600 mb-4">Error</p>
          <p className="text-gray-700">{error}</p>
        </div>
      </div>
    );
  }

  if (!recommendations) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-blue-50">
      {/* Header */}
      <div className="bg-white shadow-lg sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/" className="text-indigo-600 hover:text-indigo-800 text-sm">
                ← Back
              </Link>
              <h1 className="text-3xl font-bold text-gray-900">🤖 AI Smart Recommendations</h1>
            </div>
            <button
              onClick={() => fetchAdvancedRecommendations()}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition text-sm"
            >
              🔄 Refresh
            </button>
          </div>
          <p className="text-gray-600 mt-2">
            Personalized suggestions based on your taste, preferences, and order history
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* User Profile Card */}
        {recommendations.userProfile && (
          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg shadow-lg p-6 mb-8">
            <h2 className="text-2xl font-bold mb-4">👤 Your Profile</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <p className="text-indigo-100">Total Orders</p>
                <p className="text-3xl font-bold">{recommendations.userProfile.totalOrders}</p>
              </div>
              <div>
                <p className="text-indigo-100">Spice Level</p>
                <p className="text-3xl font-bold">
                  {recommendations.userProfile.spicePreference}/5 {Array(recommendations.userProfile.spicePreference).fill('🌶️ ').join('')}
                </p>
              </div>
              <div>
                <p className="text-indigo-100">Favorites</p>
                <p className="text-xl font-semibold">{recommendations.userProfile.favoriteCategories.slice(0, 2).join(', ')}</p>
              </div>
              <div>
                <p className="text-indigo-100">Dietary</p>
                <p className="text-xl font-semibold">
                  {recommendations.userProfile.dietaryRestrictions.length > 0
                    ? recommendations.userProfile.dietaryRestrictions.join(', ')
                    : 'None'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Personalized Recommendations */}
        {recommendations.personalized.length > 0 && (
          <div className="mb-12">
            <div className="flex items-center gap-2 mb-6">
              <h2 className="text-3xl font-bold text-gray-900">🎯 Personalized Just For You</h2>
              <span className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm font-bold">
                {recommendations.personalized.length}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {recommendations.personalized.map((item, idx) => (
                <div
                  key={idx}
                  className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition cursor-pointer group"
                  onClick={() => setSelectedItem(item)}
                >
                  {/* Card Header */}
                  <div className="bg-gradient-to-r from-indigo-100 to-purple-100 p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">{item.name}</h3>
                        <p className="text-sm text-gray-600">{item.category}</p>
                      </div>
                      <span className={`text-2xl font-bold ${getConfidenceColor(item.confidence)}`}>
                        {(item.confidence * 100).toFixed(0)}%
                      </span>
                    </div>

                    {/* Confidence Label */}
                    <div className="inline-block mt-2 px-2 py-1 bg-white rounded-full text-xs font-semibold text-indigo-600">
                      {getConfidenceLabel(item.confidence)}
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-4">
                    {/* Reasoning */}
                    <p className="text-gray-700 text-sm mb-3 italic">{item.reasoning}</p>

                    {/* Price & Tags */}
                    <div className="mb-3">
                      <p className="text-2xl font-bold text-indigo-600 mb-2">₹{item.price}</p>
                      <div className="flex flex-wrap gap-1">
                        {item.tags.slice(0, 3).map((tag, i) => (
                          <span
                            key={i}
                            className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs"
                          >
                            {tag}
                          </span>
                        ))}
                        {item.tags.length > 3 && (
                          <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs">
                            +{item.tags.length - 3}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Meal Timing */}
                    {item.mealTiming && (
                      <p className="text-sm text-gray-600">
                        {getMealTimingEmoji(item.mealTiming)} Best for {item.mealTiming}
                      </p>
                    )}
                  </div>

                  {/* Add to Cart Button */}
                  <button className="w-full px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 transition font-medium group-hover:translate-y-[-2px]">
                    Add to Cart
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Meal Combinations */}
        {recommendations.combinations.length > 0 && (
          <div className="mb-12">
            <div className="flex items-center gap-2 mb-6">
              <h2 className="text-3xl font-bold text-gray-900">🍽️ Complete Meal Combinations</h2>
              <span className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm font-bold">
                Curated
              </span>
            </div>

            <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-orange-500">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {recommendations.combinations.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-4 p-4 bg-orange-50 rounded-lg">
                    <div className="text-3xl flex-shrink-0">🥘</div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-gray-900">{item.name}</h3>
                      <p className="text-sm text-gray-600">{item.category}</p>
                      <p className="text-sm text-gray-700 mt-2">{item.reasoning}</p>
                      <p className="text-orange-600 font-bold mt-2">₹{item.price}</p>
                    </div>
                    <button className="px-3 py-1 bg-orange-600 text-white rounded text-sm hover:bg-orange-700 transition flex-shrink-0">
                      Add
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Trending Items */}
        {recommendations.trending.length > 0 && (
          <div className="mb-12">
            <div className="flex items-center gap-2 mb-6">
              <h2 className="text-3xl font-bold text-gray-900">🔥 Trending Right Now</h2>
              <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-bold">
                Popular
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {recommendations.trending.map((item, idx) => (
                <div
                  key={idx}
                  className="bg-gradient-to-br from-red-50 to-orange-50 rounded-lg p-6 shadow-lg hover:shadow-xl transition border-t-4 border-red-500"
                >
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-lg font-bold text-gray-900">{item.name}</h3>
                    <span className="text-2xl">🔥</span>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{item.category}</p>
                  <p className="text-sm text-gray-700 italic mb-4">{item.reasoning}</p>
                  <div className="flex justify-between items-center">
                    <p className="text-2xl font-bold text-red-600">₹{item.price}</p>
                    <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm font-medium">
                      Try It
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* No Recommendations */}
        {recommendations.personalized.length === 0 &&
          recommendations.combinations.length === 0 &&
          recommendations.trending.length === 0 && (
            <div className="bg-white rounded-lg shadow-lg p-12 text-center">
              <p className="text-xl text-gray-600">No recommendations available yet.</p>
              <p className="text-gray-500 mt-2">Place your first order to get personalized suggestions!</p>
            </div>
          )}

        {/* Browse Menu Button */}
        <div className="text-center py-8">
          <Link
            href="/"
            className="inline-block px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition font-medium"
          >
            🍽️ Browse Full Menu
          </Link>
        </div>
      </div>
    </div>
  );
}
