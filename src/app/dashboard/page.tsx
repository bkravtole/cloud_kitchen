'use client';

import { useState, useEffect, useRef } from 'react';
import { IOrder } from '@/types';
import { OrderStatus } from '@/types';

export default function Dashboard() {
  const [orders, setOrders] = useState<IOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected'>('connecting');
  const eventSourceRef = useRef<EventSource | null>(null);
  const restaurantId = 'rest_001'; // TODO: Get from session/auth

  useEffect(() => {
    // Initial data load
    const fetchInitialOrders = async () => {
      try {
        const res = await fetch(`/api/order?restaurantId=${restaurantId}`);
        const data = await res.json();
        setOrders(data.data || []);
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch orders:', error);
        setLoading(false);
      }
    };

    fetchInitialOrders();

    // Connect to SSE stream
    const eventSource = new EventSource(`/api/stream/kitchen?restaurantId=${restaurantId}`);

    eventSource.onopen = () => {
      setConnectionStatus('connected');
      console.log('✅ SSE Connected to kitchen stream');
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.event === 'connected') {
          console.log('Kitchen dashboard connected:', data);
          return;
        }

        if (data.event === 'heartbeat') {
          // Silently ignore heartbeats
          return;
        }

        if (data.event === 'order_updated') {
          // Update order in local state
          setOrders(prevOrders =>
            prevOrders.map(order =>
              order.orderId === data.orderId
                ? { ...order, status: data.status as OrderStatus }
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
      console.error('❌ SSE Connection error');
      eventSource.close();
    };

    eventSourceRef.current = eventSource;

    return () => {
      eventSource.close();
    };
  }, []);

  const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    try {
      const res = await fetch(`/api/order/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          restaurantId,
        }),
      });

      if (!res.ok) throw new Error('Failed to update status');

      // No need to manually update - SSE will push the update!
      console.log(`Order ${orderId} status update sent to server`);
    } catch (error) {
      console.error('Failed to update order status:', error);
    }
  };

  const statusColors: Record<OrderStatus, string> = {
    CREATED: 'bg-yellow-100 text-yellow-800',
    PAYMENT_PENDING: 'bg-orange-100 text-orange-800',
    CONFIRMED: 'bg-blue-100 text-blue-800',
    PREPARING: 'bg-purple-100 text-purple-800',
    READY: 'bg-green-100 text-green-800',
    ASSIGNED: 'bg-cyan-100 text-cyan-800',
    PICKED_UP: 'bg-indigo-100 text-indigo-800',
    DELIVERED: 'bg-gray-100 text-gray-800',
    CANCELLED: 'bg-red-100 text-red-800',
    FAILED: 'bg-red-100 text-red-800',
  };

  const ordersByStatus = {
    NEW: orders.filter(o => o.status === 'CONFIRMED'),
    PREPARING: orders.filter(o => o.status === 'PREPARING'),
    READY: orders.filter(o => o.status === 'READY'),
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p className="text-xl text-gray-600">Loading orders...</p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Connection Status */}
      <div className="mb-6 flex items-center gap-2 p-3 bg-white rounded-lg shadow-sm border">
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
            ? '🟢 Live Updates Active'
            : connectionStatus === 'connecting'
            ? '🟡 Connecting...'
            : '🔴 Disconnected'}
        </span>
      </div>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Kitchen Dashboard</h1>
        <p className="text-gray-600">Real-time order management with live updates</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-gray-500 text-sm font-semibold">New Orders</h3>
          <p className="text-3xl font-bold">{ordersByStatus.NEW.length}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-gray-500 text-sm font-semibold">Preparing</h3>
          <p className="text-3xl font-bold">{ordersByStatus.PREPARING.length}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-gray-500 text-sm font-semibold">Ready</h3>
          <p className="text-3xl font-bold">{ordersByStatus.READY.length}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-gray-500 text-sm font-semibold">Total Orders</h3>
          <p className="text-3xl font-bold">{orders.length}</p>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-100 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold">Order ID</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Customer</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Items</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Amount</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Status</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                  No orders yet
                </td>
              </tr>
            ) : (
              orders.map(order => (
                <tr key={order.orderId} className="border-b hover:bg-gray-50 transition">
                  <td className="px-6 py-3 text-sm font-mono font-semibold">{order.orderId}</td>
                  <td className="px-6 py-3">
                    <div>
                      <p className="font-semibold text-sm">{order.userName}</p>
                      <p className="text-xs text-gray-600">{order.userPhone}</p>
                    </div>
                  </td>
                  <td className="px-6 py-3 text-sm">{order.items?.length || 0} items</td>
                  <td className="px-6 py-3 text-sm font-semibold">₹{order.total}</td>
                  <td className="px-6 py-3">
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[order.status]}`}
                    >
                      {order.status}
                    </span>
                  </td>
                  <td className="px-6 py-3">
                    <select
                      value={order.status}
                      onChange={e => handleStatusChange(order.orderId, e.target.value as OrderStatus)}
                      className="px-3 py-1 border border-gray-300 rounded text-sm font-medium hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="CONFIRMED">Confirm</option>
                      <option value="PREPARING">Preparing</option>
                      <option value="READY">Ready</option>
                      <option value="DELIVERED">Delivered</option>
                    </select>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer Note */}
      <div className="mt-6 text-sm text-gray-500">
        <p>✨ Live updates powered by Server-Sent Events (SSE) - page auto-syncs when order status changes</p>
      </div>
    </div>
  );
}
