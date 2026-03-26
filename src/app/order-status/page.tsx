'use client';

import { useState, useEffect, useRef } from 'react';
import { IOrder } from '@/types';
import Link from 'next/link';

export default function OrderTrackingPage() {
  const [orders, setOrders] = useState<IOrder[]>([]);
  const [userPhone, setUserPhone] = useState('');
  const [inputPhone, setInputPhone] = useState('');
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected' | 'idle'>('idle');
  const [error, setError] = useState('');
  const eventSourceRef = useRef<EventSource | null>(null);

  const handleTrack = (phone: string) => {
    if (!phone) {
      setError('Please enter a phone number');
      return;
    }
    if (!/^\d{10}$/.test(phone.replace(/\D/g, ''))) {
      setError('Please enter a valid 10-digit phone number');
      return;
    }
    setError('');
    setUserPhone(phone);
    connectToStream(phone);
  };

  const connectToStream = async (phone: string) => {
    setConnectionStatus('connecting');

    try {
      // Fetch initial orders
      const res = await fetch(`/api/order?userPhone=${phone}`);
      const data = await res.json();
      setOrders(data.data || []);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
      setError('Failed to fetch orders');
    }

    // Close existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    // Connect to SSE
    const eventSource = new EventSource(`/api/stream/order?userPhone=${phone}`);

    eventSource.onopen = () => {
      setConnectionStatus('connected');
      setError('');
      console.log('✅ Connected to order tracking');
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.event === 'connected') {
          console.log('Customer tracking connected:', data);
          return;
        }

        if (data.event === 'heartbeat') {
          // Silently ignore heartbeats
          return;
        }

        if (data.event === 'order_updated') {
          setOrders((prev) =>
            prev.map((order) =>
              order.orderId === data.orderId
                ? { ...order, status: data.status }
                : order
            )
          );
          console.log(`Order ${data.orderId} updated to ${data.status}`);
        }
      } catch (error) {
        console.error('Error parsing SSE message:', error);
      }
    };

    eventSource.onerror = () => {
      setConnectionStatus('disconnected');
      setError('Connection lost. Please refresh the page.');
      eventSource.close();
    };

    eventSourceRef.current = eventSource;
  };

  useEffect(() => {
    return () => {
      eventSourceRef.current?.close();
    };
  }, []);

  const statusSteps = ['CREATED', 'CONFIRMED', 'PREPARING', 'READY', 'DELIVERED'];
  const statusIcons: Record<string, string> = {
    CREATED: '📝',
    CONFIRMED: '✅',
    PREPARING: '👨‍🍳',
    READY: '📦',
    DELIVERED: '🚚',
  };

  // const statusColors: Record<string, string> = {
  //   CREATED: 'bg-gray-100 text-gray-800',
  //   CONFIRMED: 'bg-blue-100 text-blue-800',
  //   PREPARING: 'bg-purple-100 text-purple-800',
  //   READY: 'bg-green-100 text-green-800',
  //   DELIVERED: 'bg-green-100 text-green-800',
  // };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <Link href="/" className="text-sm text-blue-600 hover:text-blue-800 mb-6 inline-block">
          ← Back to Home
        </Link>

        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">📍 Track Your Order</h1>
          <p className="text-gray-600">Enter your phone number to see real-time updates</p>
        </div>

        {/* Search Section */}
        {!userPhone ? (
          <div className="bg-white p-8 rounded-lg shadow-lg mb-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Phone Number
                </label>
                <div className="flex gap-2">
                  <input
                    type="tel"
                    placeholder="Enter your 10-digit phone number"
                    className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                    value={inputPhone}
                    onChange={(e) => setInputPhone(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleTrack(inputPhone);
                      }
                    }}
                  />
                  <button
                    onClick={() => handleTrack(inputPhone)}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
                  >
                    Track
                  </button>
                </div>
              </div>
              {error && <p className="text-red-600 text-sm">{error}</p>}
            </div>

            {/* Demo Hint */}
            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-800">
                <strong>Demo:</strong> Use phone number <code className="bg-white px-2 py-1 rounded">9876543210</code> to test
              </p>
            </div>
          </div>
        ) : (
          <div>
            {/* Connection Status */}
            <div className="mb-6 p-3 bg-white rounded-lg shadow-sm border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      connectionStatus === 'connected'
                        ? 'bg-green-500'
                        : connectionStatus === 'connecting'
                        ? 'bg-yellow-500'
                        : 'bg-red-500'
                    }`}
                  />
                  <span className="text-sm font-medium">
                    {connectionStatus === 'connected'
                      ? '🟢 Connected - Getting live updates'
                      : connectionStatus === 'connecting'
                      ? '🟡 Connecting...'
                      : '🔴 Disconnected'}
                  </span>
                </div>
                <button
                  onClick={() => {
                    setUserPhone('');
                    setInputPhone('');
                    setOrders([]);
                  }}
                  className="text-xs px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Orders */}
            {orders.length === 0 ? (
              <div className="bg-white p-8 rounded-lg shadow-lg text-center">
                <p className="text-gray-600 text-lg">
                  {connectionStatus === 'connecting'
                    ? 'Loading your orders...'
                    : 'No active orders for this number yet'}
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {orders.map((order) => (
                  <div key={order.orderId} className="bg-white p-6 rounded-lg shadow-lg">
                    {/* Order Header */}
                    <div className="border-b pb-4 mb-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h2 className="font-bold text-lg text-gray-900">
                            Order #{order.orderId.slice(-8).toUpperCase()}
                          </h2>
                          <p className="text-sm text-gray-600">
                            {new Date(order.createdAt || new Date()).toLocaleDateString()} at{' '}
                            {new Date(order.createdAt || new Date()).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-blue-600">₹{order.total}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {order.status === 'DELIVERED' ? '✅ Delivered' : 'In Progress'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Status Timeline */}
                    <div className="mb-6">
                      <h3 className="text-sm font-semibold text-gray-700 mb-4">Order Status</h3>
                      <div className="space-y-3">
                        {statusSteps.map((step, idx) => {
                          const isComplete = statusSteps.indexOf(order.status) >= idx;
                          const isCurrent = order.status === step;

                          return (
                            <div key={step} className="flex items-center gap-4">
                              <div
                                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg transition ${
                                  isComplete
                                    ? 'bg-green-500 text-white'
                                    : 'bg-gray-300 text-gray-600'
                                } ${isCurrent ? 'ring-2 ring-blue-500 ring-offset-2' : ''}`}
                              >
                                {statusIcons[step]}
                              </div>
                              <div className="flex-1">
                                <p
                                  className={`font-semibold ${
                                    isComplete
                                      ? 'text-gray-900'
                                      : 'text-gray-400'
                                  }`}
                                >
                                  {step}
                                </p>
                                {isCurrent && (
                                  <p className="text-xs text-blue-600 font-medium">
                                    Current status
                                  </p>
                                )}
                              </div>
                              {isCurrent && (
                                <span className="px-3 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full animate-pulse">
                                  In Progress
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Order Items */}
                    <div className="border-t pt-4">
                      <h3 className="text-sm font-semibold text-gray-700 mb-3">Items</h3>
                      <div className="space-y-2">
                        {order.items?.map((item: any, idx: number) => (
                          <div key={idx} className="flex justify-between text-sm">
                            <span className="text-gray-600">
                              {item.quantity}x {item.name}
                            </span>
                            <span className="font-semibold text-gray-900">
                              ₹{item.price * item.quantity}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Estimated Delivery */}
                    {order.status !== 'DELIVERED' && (
                      <div className="mt-4 p-3 bg-blue-50 rounded border border-blue-200">
                        <p className="text-sm text-blue-800">
                          <strong>Estimated delivery:</strong> ~30-45 minutes after pickup
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {error && (
              <div className="mt-6 p-4 bg-red-50 rounded-lg border border-red-200">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-600">
          <p>
            ✨ Live order tracking powered by real-time updates
            <br />
            <span className="text-xs">Updates appear instantly when order status changes</span>
          </p>
        </div>
      </div>
    </div>
  );
}
