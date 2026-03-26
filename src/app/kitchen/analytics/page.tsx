'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Analytics {
  totalOrders: number;
  totalRevenue: string;
  averageOrderValue: string;
  conversionRate: number;
  topItems: Array<{ itemId: string; name: string; quantity: number; revenue: number }>;
  ordersByStatus: { CONFIRMED: number; PREPARING: number; READY: number; DELIVERED: number };
  ordersByHour: Array<{ hour: number; count: number }>;
}

type DateRange = 'today' | 'week' | 'month';

export default function AnalyticsDashboard() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>('today');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const restaurantId = 'rest_001'; // From auth context in real app

  useEffect(() => {
    fetchAnalytics();
  }, [dateRange]);

  const fetchAnalytics = async () => {
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`/api/analytics/overview?restaurantId=${restaurantId}&dateRange=${dateRange}`);
      const data = await res.json();

      if (data.success) {
        setAnalytics(data.data);
      } else {
        setError(data.error);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <p className="text-xl text-gray-600">Loading analytics...</p>
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

  if (!analytics) {
    return null;
  }

  const statusIcons: Record<string, string> = {
    CONFIRMED: '📦',
    PREPARING: '👨‍🍳',
    READY: '✅',
    DELIVERED: '🚚',
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-white shadow-lg sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Link href="/" className="text-indigo-600 hover:text-indigo-800 text-sm">
                ← Back
              </Link>
              <h1 className="text-3xl font-bold text-gray-900">📊 Analytics Dashboard</h1>
            </div>
          </div>

          {/* Date Range Selector */}
          <div className="flex gap-2">
            {(['today', 'week', 'month'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setDateRange(range)}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  dateRange === range
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {range === 'today' ? 'Today' : range === 'week' ? 'This Week' : 'This Month'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Orders */}
          <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Total Orders</p>
                <p className="text-4xl font-bold text-gray-900 mt-2">{analytics.totalOrders}</p>
              </div>
              <div className="text-5xl opacity-20">📦</div>
            </div>
            <p className="text-xs text-gray-500 mt-2">+12% from last period</p>
          </div>

          {/* Revenue */}
          <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Total Revenue</p>
                <p className="text-4xl font-bold text-gray-900 mt-2">₹{analytics.totalRevenue}</p>
              </div>
              <div className="text-5xl opacity-20">💰</div>
            </div>
            <p className="text-xs text-gray-500 mt-2">+8% from last period</p>
          </div>

          {/* Average Order Value */}
          <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-orange-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Avg Order Value</p>
                <p className="text-4xl font-bold text-gray-900 mt-2">₹{analytics.averageOrderValue}</p>
              </div>
              <div className="text-5xl opacity-20">📈</div>
            </div>
            <p className="text-xs text-gray-500 mt-2">Target: ₹500</p>
          </div>

          {/* Conversion Rate */}
          <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-purple-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Conversion Rate</p>
                <p className="text-4xl font-bold text-gray-900 mt-2">{analytics.conversionRate}%</p>
              </div>
              <div className="text-5xl opacity-20">🎯</div>
            </div>
            <p className="text-xs text-gray-500 mt-2">Target: 85%</p>
          </div>
        </div>

        {/* Orders by Status */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Status Breakdown */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Orders by Status</h2>
            <div className="space-y-4">
              {Object.entries(analytics.ordersByStatus).map(([status, count]) => {
                const total = analytics.totalOrders || 1;
                const percentage = ((count / total) * 100).toFixed(1);
                const colors: Record<string, string> = {
                  CONFIRMED: 'bg-yellow-500',
                  PREPARING: 'bg-blue-500',
                  READY: 'bg-green-500',
                  DELIVERED: 'bg-purple-500',
                };

                return (
                  <div key={status}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{statusIcons[status] || '📦'}</span>
                        <span className="font-medium text-gray-700">{status}</span>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-gray-900">{count}</p>
                        <p className="text-xs text-gray-500">{percentage}%</p>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${colors[status] || 'bg-gray-400'}`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Peak Hours */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Orders by Hour</h2>
            <div className="flex items-end justify-around h-48 gap-1">
              {analytics.ordersByHour.map((entry) => {
                const maxCount = Math.max(...analytics.ordersByHour.map((e) => e.count), 1);
                const height = ((entry.count / maxCount) * 100).toFixed(0);

                return (
                  <div key={entry.hour} className="flex flex-col items-center gap-2 flex-1">
                    <div
                      className="w-full bg-indigo-500 rounded-t-lg hover:bg-indigo-600 transition cursor-pointer"
                      style={{ height: `${height}%`, minHeight: '4px' }}
                      title={`${entry.hour}:00 - ${entry.count} orders`}
                    />
                    <p className="text-xs text-gray-600 w-full text-center">{entry.hour}:00</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Top Items */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">🏆 Top Selling Items</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b-2 border-gray-200">
                <tr>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Item Name</th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-700">Quantity Sold</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Revenue</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">% of Total</th>
                </tr>
              </thead>
              <tbody>
                {analytics.topItems.slice(0, 10).map((item, idx) => {
                  const totalRevenue = parseFloat(analytics.totalRevenue);
                  const percentage = totalRevenue > 0 ? ((item.revenue / totalRevenue) * 100).toFixed(1) : '0';

                  return (
                    <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50 transition">
                      <td className="py-3 px-4">
                        <p className="font-medium text-gray-900">{item.name}</p>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="inline-block bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                          {item.quantity}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-gray-900">
                        ₹{item.revenue.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="text-green-600 font-medium">{percentage}%</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
