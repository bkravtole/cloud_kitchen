'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface OrderItem {
  itemId: string;
  name: string;
  price: number;
  quantity: number;
}

interface Order {
  orderId: string;
  restaurantId: string;
  restaurantName: string;
  items: OrderItem[];
  total: number;
  status: string;
  createdAt: string;
  itemCount: number;
}

export default function OrderHistoryPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedRestaurant, setSelectedRestaurant] = useState<string>('all');
  const [pagination, setPagination] = useState({ total: 0, limit: 20, skip: 0 });
  const userPhone = '919876543210'; // From auth context in real app

  useEffect(() => {
    fetchOrderHistory();
  }, [pagination.skip]);

  const fetchOrderHistory = async () => {
    setLoading(true);
    setError('');

    try {
      const res = await fetch(
        `/api/order/history?userPhone=${userPhone}&limit=${pagination.limit}&skip=${pagination.skip}`
      );
      const data = await res.json();

      if (data.success) {
        setOrders(data.data);
        setPagination(data.pagination);
      } else {
        setError(data.error);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReorder = async (order: Order) => {
    // In a real app, this would:
    // 1. Add all items from order to cart
    // 2. Navigate to checkout
    console.log('Reordering:', order.orderId);
    alert(`Added ${order.itemCount} items to cart from ${order.restaurantName}!`);
  };

  const filteredOrders =
    selectedRestaurant === 'all'
      ? orders
      : orders.filter((o) => o.restaurantId === selectedRestaurant);

  const uniqueRestaurants = Array.from(new Set(orders.map((o) => o.restaurantName)));

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DELIVERED':
        return 'bg-green-100 text-green-800';
      case 'PREPARING':
        return 'bg-blue-100 text-blue-800';
      case 'READY':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'DELIVERED':
        return '✅';
      case 'PREPARING':
        return '👨‍🍳';
      case 'READY':
        return '📦';
      default:
        return '📝';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <p className="text-xl text-gray-600">Loading your order history...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100">
      {/* Header */}
      <div className="bg-white shadow-lg">
        <div className="max-w-5xl mx-auto px-6 py-6">
          <div className="flex items-center gap-3 mb-4">
            <Link href="/" className="text-orange-600 hover:text-orange-800 text-sm">
              ← Back
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">📋 Order History</h1>
          </div>
          <p className="text-gray-600">View all your past orders and reorder your favorites</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {orders.length === 0 ? (
          <div className="bg-white rounded-lg shadow-lg p-12 text-center">
            <div className="text-6xl mb-4">🍽️</div>
            <p className="text-xl font-semibold text-gray-900 mb-2">No orders yet</p>
            <p className="text-gray-600 mb-6">Start ordering from your favorite restaurants!</p>
            <Link
              href="/"
              className="inline-block px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition font-medium"
            >
              Browse Restaurants
            </Link>
          </div>
        ) : (
          <>
            {/* Restaurant Filter */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Filter by Restaurant
              </label>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => setSelectedRestaurant('all')}
                  className={`px-4 py-2 rounded-full font-medium transition ${
                    selectedRestaurant === 'all'
                      ? 'bg-orange-600 text-white'
                      : 'bg-white text-gray-700 border-2 border-gray-300 hover:border-orange-600'
                  }`}
                >
                  All Restaurants ({orders.length})
                </button>
                {uniqueRestaurants.map((restaurant) => {
                  const count = orders.filter((o) => o.restaurantName === restaurant).length;
                  return (
                    <button
                      key={restaurant}
                      onClick={() =>
                        setSelectedRestaurant(orders.find((o) => o.restaurantName === restaurant)?.restaurantId || 'all')
                      }
                      className={`px-4 py-2 rounded-full font-medium transition ${
                        selectedRestaurant === orders.find((o) => o.restaurantName === restaurant)?.restaurantId
                          ? 'bg-orange-600 text-white'
                          : 'bg-white text-gray-700 border-2 border-gray-300 hover:border-orange-600'
                      }`}
                    >
                      {restaurant} ({count})
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Orders List */}
            <div className="space-y-4">
              {filteredOrders.map((order) => (
                <div key={order.orderId} className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition">
                  {/* Order Header */}
                  <div className="bg-gradient-to-r from-orange-50 to-amber-50 p-4 border-b border-orange-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-3">
                          <h3 className="text-lg font-bold text-gray-900">{order.restaurantName}</h3>
                          <span
                            className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(
                              order.status
                            )}`}
                          >
                            {getStatusIcon(order.status)} {order.status}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{formatDate(order.createdAt)}</p>
                      </div>
                      <p className="text-2xl font-bold text-orange-600">₹{order.total.toFixed(2)}</p>
                    </div>
                  </div>

                  {/* Order Items */}
                  <div className="p-4 bg-white">
                    <div className="mb-4">
                      <p className="text-sm font-semibold text-gray-700 mb-2">Items ({order.itemCount}):</p>
                      <div className="space-y-2">
                        {order.items.slice(0, 3).map((item, idx) => (
                          <div key={idx} className="flex justify-between text-sm">
                            <span className="text-gray-700">
                              {item.quantity}× {item.name}
                            </span>
                            <span className="text-gray-900 font-medium">₹{(item.price * item.quantity).toFixed(2)}</span>
                          </div>
                        ))}
                        {order.items.length > 3 && (
                          <p className="text-sm text-gray-500 italic">
                            +{order.items.length - 3} more items
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Order ID */}
                    <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-600">Order ID</p>
                      <p className="font-mono text-sm text-gray-900 break-all">{order.orderId}</p>
                    </div>

                    {/* Reorder Button */}
                    {order.status === 'DELIVERED' && (
                      <button
                        onClick={() => handleReorder(order)}
                        className="w-full px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition font-medium text-sm"
                      >
                        🔄 Reorder
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {pagination.total > pagination.limit && (
              <div className="flex justify-between items-center mt-8">
                <button
                  onClick={() =>
                    setPagination((p) => ({
                      ...p,
                      skip: Math.max(0, p.skip - p.limit),
                    }))
                  }
                  disabled={pagination.skip === 0}
                  className="px-4 py-2 bg-white rounded-lg border-2 border-orange-600 text-orange-600 hover:bg-orange-50 transition font-medium disabled:opacity-50"
                >
                  ← Previous
                </button>

                <span className="text-sm text-gray-600">
                  Page {Math.floor(pagination.skip / pagination.limit) + 1} of{' '}
                  {Math.ceil(pagination.total / pagination.limit)}
                </span>

                <button
                  onClick={() =>
                    setPagination((p) => ({
                      ...p,
                      skip: p.skip + p.limit,
                    }))
                  }
                  disabled={pagination.skip + pagination.limit >= pagination.total}
                  className="px-4 py-2 bg-white rounded-lg border-2 border-orange-600 text-orange-600 hover:bg-orange-50 transition font-medium disabled:opacity-50"
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
