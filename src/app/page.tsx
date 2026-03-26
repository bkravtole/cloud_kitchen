import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600">
      {/* Navigation Bar */}
      <nav className="bg-white bg-opacity-10 backdrop-blur-md sticky top-0 z-50 border-b border-white border-opacity-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-white">🍕 CloudKitchen</h1>
          <div className="hidden md:flex gap-6 text-white text-sm">
            <Link href="/dashboard" className="hover:text-gray-200 transition">
              Dashboard
            </Link>
            <Link href="/kitchen/delivery-dashboard" className="hover:text-gray-200 transition">
              Deliveries
            </Link>
            <Link href="/orders/history" className="hover:text-gray-200 transition">
              Orders
            </Link>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto">
          {/* Hero Section */}
          <div className="text-center text-white mb-16">
            <h1 className="text-6xl font-bold mb-6">CloudKitchen Platform</h1>
            <p className="text-2xl mb-4 opacity-90">
              🤖 AI-Powered WhatsApp Ordering System
            </p>
            <p className="text-lg opacity-80 max-w-2xl mx-auto">
              Complete end-to-end restaurant management with AI recommendations, real-time delivery tracking, and analytics
            </p>
          </div>

          {/* Phase & Progress */}
          <div className="bg-white bg-opacity-10 backdrop-blur-md rounded-xl p-8 mb-12 border border-white border-opacity-20">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-white mb-2">📊 Phase 2: Enhancement</h2>
              <p className="text-xl text-white opacity-90">Weeks 1-7 Complete ✅</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-green-400 to-green-600 rounded-lg p-4 text-white">
                <p className="text-3xl mb-2">✅</p>
                <p className="font-semibold">Week 1-4</p>
                <p className="text-sm opacity-90">MVP Foundation</p>
              </div>

              <div className="bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg p-4 text-white">
                <p className="text-3xl mb-2">✅</p>
                <p className="font-semibold">Week 5</p>
                <p className="text-sm opacity-90">Real-time Updates</p>
              </div>

              <div className="bg-gradient-to-br from-orange-400 to-orange-600 rounded-lg p-4 text-white">
                <p className="text-3xl mb-2">✅</p>
                <p className="font-semibold">Week 6</p>
                <p className="text-sm opacity-90">Delivery System</p>
              </div>

              <div className="bg-gradient-to-br from-pink-400 to-pink-600 rounded-lg p-4 text-white">
                <p className="text-3xl mb-2">✅</p>
                <p className="font-semibold">Week 7</p>
                <p className="text-sm opacity-90">Analytics & Polish</p>
              </div>
            </div>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {/* Kitchen Dashboard */}
            <Link
              href="/dashboard"
              className="group bg-white rounded-lg shadow-xl overflow-hidden hover:shadow-2xl transition hover:translate-y-[-4px]"
            >
              <div className="bg-gradient-to-r from-indigo-500 to-blue-600 p-6 text-white">
                <p className="text-4xl mb-3">👨‍🍳</p>
                <h3 className="text-2xl font-bold mb-2">Kitchen Dashboard</h3>
                <p className="text-sm opacity-90">Real-time order management</p>
              </div>
              <div className="p-6">
                <ul className="space-y-2 text-gray-700 text-sm">
                  <li>✓ Live order updates (SSE)</li>
                  <li>✓ Order status management</li>
                  <li>✓ Table management</li>
                </ul>
              </div>
            </Link>

            {/* Delivery Dashboard */}
            <Link
              href="/kitchen/delivery-dashboard"
              className="group bg-white rounded-lg shadow-xl overflow-hidden hover:shadow-2xl transition hover:translate-y-[-4px]"
            >
              <div className="bg-gradient-to-r from-orange-500 to-red-600 p-6 text-white">
                <p className="text-4xl mb-3">🚴</p>
                <h3 className="text-2xl font-bold mb-2">Delivery Dashboard</h3>
                <p className="text-sm opacity-90">Monitor all deliveries</p>
              </div>
              <div className="p-6">
                <ul className="space-y-2 text-gray-700 text-sm">
                  <li>✓ Active delivery tracking</li>
                  <li>✓ Assign delivery boys</li>
                  <li>✓ Real-time location updates</li>
                </ul>
              </div>
            </Link>

            {/* Analytics Dashboard */}
            <Link
              href="/kitchen/analytics"
              className="group bg-white rounded-lg shadow-xl overflow-hidden hover:shadow-2xl transition hover:translate-y-[-4px]"
            >
              <div className="bg-gradient-to-r from-purple-500 to-pink-600 p-6 text-white">
                <p className="text-4xl mb-3">📊</p>
                <h3 className="text-2xl font-bold mb-2">Analytics Dashboard</h3>
                <p className="text-sm opacity-90">Insights and metrics</p>
              </div>
              <div className="p-6">
                <ul className="space-y-2 text-gray-700 text-sm">
                  <li>✓ Revenue metrics</li>
                  <li>✓ Top items report</li>
                  <li>✓ Peak hours analysis</li>
                </ul>
              </div>
            </Link>

            {/* Delivery Tracking */}
            <Link
              href="/delivery-tracking"
              className="group bg-white rounded-lg shadow-xl overflow-hidden hover:shadow-2xl transition hover:translate-y-[-4px]"
            >
              <div className="bg-gradient-to-r from-green-500 to-teal-600 p-6 text-white">
                <p className="text-4xl mb-3">📍</p>
                <h3 className="text-2xl font-bold mb-2">Track Delivery</h3>
                <p className="text-sm opacity-90">Real-time delivery tracking</p>
              </div>
              <div className="p-6">
                <ul className="space-y-2 text-gray-700 text-sm">
                  <li>✓ Live location tracking</li>
                  <li>✓ ETA updates</li>
                  <li>✓ Delivery boy details</li>
                </ul>
              </div>
            </Link>

            {/* Order History */}
            <Link
              href="/orders/history"
              className="group bg-white rounded-lg shadow-xl overflow-hidden hover:shadow-2xl transition hover:translate-y-[-4px]"
            >
              <div className="bg-gradient-to-r from-amber-500 to-orange-600 p-6 text-white">
                <p className="text-4xl mb-3">📋</p>
                <h3 className="text-2xl font-bold mb-2">Order History</h3>
                <p className="text-sm opacity-90">View past orders</p>
              </div>
              <div className="p-6">
                <ul className="space-y-2 text-gray-700 text-sm">
                  <li>✓ Order timeline</li>
                  <li>✓ Filter by restaurant</li>
                  <li>✓ Reorder feature</li>
                </ul>
              </div>
            </Link>

            {/* Recommendations */}
            <Link
              href="/recommendations"
              className="group bg-white rounded-lg shadow-xl overflow-hidden hover:shadow-2xl transition hover:translate-y-[-4px]"
            >
              <div className="bg-gradient-to-r from-rose-500 to-pink-600 p-6 text-white">
                <p className="text-4xl mb-3">🎯</p>
                <h3 className="text-2xl font-bold mb-2">Recommendations</h3>
                <p className="text-sm opacity-90">AI-powered suggestions</p>
              </div>
              <div className="p-6">
                <ul className="space-y-2 text-gray-700 text-sm">
                  <li>✓ Your favorites</li>
                  <li>✓ Recently ordered</li>
                  <li>✓ AI suggestions</li>
                </ul>
              </div>
            </Link>

            {/* Advanced AI Recommendations */}
            <Link
              href="/advanced-recommendations"
              className="group bg-white rounded-lg shadow-xl overflow-hidden hover:shadow-2xl transition hover:translate-y-[-4px] lg:col-span-1 relative overflow-visible"
            >
              <div className="absolute -top-3 -right-3 bg-gradient-to-r from-purple-500 to-indigo-600 text-white px-3 py-1 rounded-full text-xs font-bold">
                ⭐ NEW
              </div>
              <div className="bg-gradient-to-r from-purple-600 to-indigo-700 p-6 text-white">
                <p className="text-4xl mb-3">🤖</p>
                <h3 className="text-2xl font-bold mb-2">Advanced AI</h3>
                <p className="text-sm opacity-90">Smart personalized meals</p>
              </div>
              <div className="p-6">
                <ul className="space-y-2 text-gray-700 text-sm">
                  <li>✓ Personalized by Groq AI</li>
                  <li>✓ Meal combinations</li>
                  <li>✓ Trending items</li>
                </ul>
              </div>
            </Link>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 text-white">
            <div className="bg-white bg-opacity-10 backdrop-blur-md rounded-lg p-6 border border-white border-opacity-20">
              <p className="text-5xl font-bold mb-2">7</p>
              <p className="text-lg opacity-90">Weeks Completed</p>
            </div>

            <div className="bg-white bg-opacity-10 backdrop-blur-md rounded-lg p-6 border border-white border-opacity-20">
              <p className="text-5xl font-bold mb-2">6+</p>
              <p className="text-lg opacity-90">Features Live</p>
            </div>

            <div className="bg-white bg-opacity-10 backdrop-blur-md rounded-lg p-6 border border-white border-opacity-20">
              <p className="text-5xl font-bold mb-2">∞</p>
              <p className="text-lg opacity-90">Scalability Ready</p>
            </div>
          </div>

          {/* CTA Section */}
          <div className="bg-white bg-opacity-10 backdrop-blur-md rounded-2xl p-12 border border-white border-opacity-20 text-center text-white mb-8">
            <h2 className="text-3xl font-bold mb-4">Ready to Explore?</h2>
            <p className="text-lg mb-8 opacity-90">
              Jump into any section to see the CloudKitchen platform in action
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                href="/dashboard"
                className="bg-white text-indigo-600 font-semibold px-8 py-3 rounded-lg hover:bg-opacity-90 transition"
              >
                👨‍🍳 Go to Kitchen
              </Link>
              <Link
                href="/kitchen/analytics"
                className="bg-pink-500 text-white font-semibold px-8 py-3 rounded-lg hover:bg-pink-600 transition"
              >
                📊 View Analytics
              </Link>
            </div>
          </div>

          {/* Tech Stack */}
          <div className="bg-white bg-opacity-10 backdrop-blur-md rounded-lg p-8 border border-white border-opacity-20 text-white">
            <h3 className="text-xl font-bold mb-4">🛠️ Tech Stack</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="font-semibold">Frontend</p>
                <p className="opacity-75">Next.js 14, React, TailwindCSS</p>
              </div>
              <div>
                <p className="font-semibold">Backend</p>
                <p className="opacity-75">Next.js API Routes, TypeScript</p>
              </div>
              <div>
                <p className="font-semibold">Database</p>
                <p className="opacity-75">MongoDB Atlas</p>
              </div>
              <div>
                <p className="font-semibold">Real-time</p>
                <p className="opacity-75">Server-Sent Events (SSE)</p>
              </div>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-white border-opacity-20 text-center text-white text-sm opacity-75">
            <p>📚 See the documentation in the repo root for the complete implementation guide</p>
          </div>
        </div>
      </div>
    </main>
  );
}
