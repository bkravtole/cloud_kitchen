'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

interface DeliveryAssignment {
  assignmentId: string;
  deliveryBoyId: string;
  deliveryBoyName: string;
  deliveryBoyPhone: string;
  vehicleType: string;
  status: string;
  orderCount: number;
  latitude: number;
  longitude: number;
  distanceRemaining: number;
  estimatedDeliveryTime: string;
  firstDeliveryAddress: string;
}

export default function KitchenDeliveryDashboard() {
  const [assignments, setAssignments] = useState<DeliveryAssignment[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'connecting'>('disconnected');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ activeDeliveries: 0, pendingOrders: 0, completedToday: 0 });
  const eventSourceRef = useRef<EventSource | null>(null);
  const restaurantIdRef = useRef('rest_001'); // In real app, from auth context

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const res = await fetch(`/api/delivery/assignments?restaurantId=${restaurantIdRef.current}&status=ACTIVE`);
        const data = await res.json();

        if (data.success) {
          setAssignments(data.data || []);
          updateStats(data.data || []);
        }
      } catch (err) {
        console.error('Error fetching assignments:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
    connectToStream();

    return () => {
      eventSourceRef.current?.close();
    };
  }, []);

  const connectToStream = () => {
    const eventSource = new EventSource(`/api/stream/kitchen?restaurantId=${restaurantIdRef.current}`);

    eventSource.onopen = () => {
      setConnectionStatus('connected');
    };

    eventSource.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);

        if (msg.event === 'delivery_assigned') {
          setAssignments((prev) => {
            const exists = prev.some((a) => a.assignmentId === msg.assignmentId);
            if (exists) return prev;
            return [msg.assignment, ...prev];
          });
        }

        if (msg.event === 'delivery_location_update') {
          setAssignments((prev) =>
            prev.map((a) =>
              a.assignmentId === msg.assignmentId
                ? {
                    ...a,
                    latitude: msg.latitude,
                    longitude: msg.longitude,
                    distanceRemaining: msg.distanceRemaining,
                  }
                : a
            )
          );
        }

        if (msg.event === 'delivery_status_update') {
          setAssignments((prev) =>
            msg.status === 'DELIVERED'
              ? prev.filter((a) => a.assignmentId !== msg.assignmentId)
              : prev.map((a) =>
                  a.assignmentId === msg.assignmentId ? { ...a, status: msg.status } : a
                )
          );
        }
      } catch (error) {
        console.error('Error parsing SSE message:', error);
      }
    };

    eventSource.onerror = () => {
      setConnectionStatus('disconnected');
      eventSource.close();
    };

    eventSourceRef.current = eventSource;
  };

  const updateStats = (deliveries: DeliveryAssignment[]) => {
    setStats({
      activeDeliveries: deliveries.length,
      pendingOrders: deliveries.reduce((sum, d) => sum + d.orderCount, 0),
      completedToday: Math.floor(Math.random() * 50) + 10, // Placeholder
    });
  };

  const statusColors: Record<string, { bg: string; text: string; icon: string }> = {
    ASSIGNED: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: '📦' },
    PICKED_UP: { bg: 'bg-blue-100', text: 'text-blue-800', icon: '✅' },
    IN_TRANSIT: { bg: 'bg-purple-100', text: 'text-purple-800', icon: '🚴' },
  };

  const getVehicleIcon = (type: string) => {
    switch (type) {
      case 'bike':
        return '🏍️';
      case 'scooter':
        return '🛴';
      case 'car':
        return '🚗';
      default:
        return '🚗';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-100">
      {/* Header */}
      <div className="bg-white shadow-lg">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/" className="text-indigo-600 hover:text-indigo-800 text-sm">
                ← Back
              </Link>
              <h1 className="text-3xl font-bold text-gray-900">🍕 Kitchen Delivery Dashboard</h1>
            </div>
            <div className="flex items-center gap-3">
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
                {connectionStatus === 'connected' ? '🟢 Live' : connectionStatus === 'connecting' ? '🟡 Connecting' : '🔴 Offline'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Active Deliveries</p>
                <p className="text-4xl font-bold text-indigo-600">{stats.activeDeliveries}</p>
              </div>
              <div className="text-5xl">🚴</div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Orders in Transit</p>
                <p className="text-4xl font-bold text-orange-600">{stats.pendingOrders}</p>
              </div>
              <div className="text-5xl">📦</div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Completed Today</p>
                <p className="text-4xl font-bold text-green-600">{stats.completedToday}</p>
              </div>
              <div className="text-5xl">✅</div>
            </div>
          </div>
        </div>

        {/* Active Deliveries */}
        <div className="bg-white rounded-lg shadow-lg">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900">Active Deliveries</h2>
          </div>

          {assignments.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-xl text-gray-600">No active deliveries</p>
              <p className="text-sm text-gray-500 mt-1">All orders have been delivered or are awaiting pickup</p>
            </div>
          ) : (
            <div className="divide-y">
              {assignments.map((assignment) => {
                const colors = statusColors[assignment.status] || statusColors.ASSIGNED;

                return (
                  <div
                    key={assignment.assignmentId}
                    className="p-6 hover:bg-gray-50 transition"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      {/* Delivery Boy Info */}
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Delivery Boy</p>
                        <p className="text-lg font-bold text-gray-900">{assignment.deliveryBoyName}</p>
                        <p className="text-sm text-gray-600">📱 {assignment.deliveryBoyPhone}</p>
                        <p className="text-xs text-gray-500 mt-1">{assignment.deliveryBoyId}</p>
                      </div>

                      {/* Vehicle & Orders */}
                      <div>
                        <div className="mb-3">
                          <p className="text-sm text-gray-600 mb-1">Vehicle</p>
                          <p className="text-lg font-bold text-gray-900">
                            {getVehicleIcon(assignment.vehicleType)} {assignment.vehicleType.toUpperCase()}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 mb-1">Orders</p>
                          <p className="text-lg font-bold text-blue-600">{assignment.orderCount} orders</p>
                        </div>
                      </div>

                      {/* Status & Location */}
                      <div>
                        <div className={`${colors.bg} ${colors.text} p-3 rounded-lg text-center mb-3`}>
                          <p className="text-2xl">{colors.icon}</p>
                          <p className="font-bold text-sm">{assignment.status}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 mb-1">Distance Remaining</p>
                          <p className="text-lg font-bold text-gray-900">
                            {assignment.distanceRemaining.toFixed(1)} km
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Address */}
                    <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <p className="text-sm text-gray-600 mb-1">Current Delivery Address</p>
                      <p className="text-gray-900 font-medium">{assignment.firstDeliveryAddress}</p>
                    </div>

                    {/* Action Button */}
                    <div className="mt-4">
                      <Link
                        href={`/kitchen/delivery/${assignment.assignmentId}`}
                        className="inline-block px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition text-sm font-medium"
                      >
                        View Details →
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
