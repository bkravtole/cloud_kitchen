'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

interface DeliveryTracking {
  assignmentId: string;
  deliveryBoyId: string;
  deliveryBoyName: string;
  deliveryBoyPhone: string;
  vehicleType: string;
  vehicleNumber?: string;
  status: string;
  latitude: number;
  longitude: number;
  estimatedDeliveryTime: string;
  distanceRemaining: number;
  deliveryAddress: string;
  eta: string;
}

export default function DeliveryTrackingPage() {
  const [assignmentId, setAssignmentId] = useState('');
  const [inputId, setInputId] = useState('');
  const [tracking, setTracking] = useState<DeliveryTracking | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'connecting'>('disconnected');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const eventSourceRef = useRef<EventSource | null>(null);

  const handleTrack = async (id: string) => {
    if (!id.trim()) {
      setError('Please enter an assignment ID');
      return;
    }

    setLoading(true);
    setError('');
    setConnectionStatus('connecting');

    try {
      // Fetch initial data
      const res = await fetch(`/api/delivery/location?assignmentId=${id}`);
      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || 'Assignment not found');
      }

      setTracking(data.data);
      setAssignmentId(id);
      connectToStream(id);
    } catch (err: any) {
      setError(err.message);
      setConnectionStatus('disconnected');
    } finally {
      setLoading(false);
    }
  };

  const connectToStream = (id: string) => {
    // Close existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    // Connect to kitchen SSE for delivery updates
    const eventSource = new EventSource('/api/stream/kitchen?restaurantId=rest_001');

    eventSource.onopen = () => {
      setConnectionStatus('connected');
      setError('');
      console.log('✅ Connected to delivery tracking stream');
    };

    eventSource.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);

        if (msg.event === 'delivery_location_update' && msg.assignmentId === id) {
          // Update location
          setTracking((prev) =>
            prev
              ? {
                  ...prev,
                  latitude: msg.latitude,
                  longitude: msg.longitude,
                  distanceRemaining:
                    calculateDistance(
                      msg.latitude,
                      msg.longitude,
                      prev.latitude,
                      prev.longitude
                    ) / 1.609, // Convert to km
                }
              : null
          );
        }

        if (msg.event === 'delivery_status_update' && msg.assignmentId === id) {
          // Update status
          setTracking((prev) =>
            prev
              ? {
                  ...prev,
                  status: msg.status,
                }
              : null
          );
        }
      } catch (error) {
        console.error('Error parsing SSE message:', error);
      }
    };

    eventSource.onerror = () => {
      setConnectionStatus('disconnected');
      setError('Lost connection to tracking service');
      eventSource.close();
    };

    eventSourceRef.current = eventSource;
  };

  useEffect(() => {
    return () => {
      eventSourceRef.current?.close();
    };
  }, []);

  const statusSteps = ['ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED'];
  const statusIcons: Record<string, string> = {
    ASSIGNED: '📦',
    PICKED_UP: '✅',
    IN_TRANSIT: '🚴',
    DELIVERED: '🎉',
  };

  const statusColors: Record<string, string> = {
    ASSIGNED: 'bg-yellow-100 text-yellow-800',
    PICKED_UP: 'bg-blue-100 text-blue-800',
    IN_TRANSIT: 'bg-purple-100 text-purple-800',
    DELIVERED: 'bg-green-100 text-green-800',
  };

  const getStatusDescription = (status: string) => {
    switch (status) {
      case 'ASSIGNED':
        return 'Order assigned to delivery boy';
      case 'PICKED_UP':
        return 'Order picked up from restaurant';
      case 'IN_TRANSIT':
        return 'On the way to you';
      case 'DELIVERED':
        return 'Order delivered successfully';
      default:
        return 'Unknown status';
    }
  };

  // Haversine distance calculation
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371 * 1000; // Earth's radius in meters
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  if (!assignmentId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 p-6">
        <div className="max-w-md mx-auto mt-12">
          {/* Header */}
          <div className="text-center mb-8">
            <Link href="/" className="text-sm text-blue-600 hover:text-blue-800 mb-6 inline-block">
              ← Back to Home
            </Link>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">📍 Track Your Delivery</h1>
            <p className="text-gray-600">Enter your assignment ID to track in real-time</p>
          </div>

          {/* Search Form */}
          <div className="bg-white p-8 rounded-lg shadow-lg">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Assignment ID
                </label>
                <input
                  type="text"
                  placeholder="da_1234567_xyz..."
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none font-mono text-sm"
                  value={inputId}
                  onChange={(e) => setInputId(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleTrack(inputId);
                    }
                  }}
                />
              </div>

              {error && <p className="text-red-600 text-sm">{error}</p>}

              <button
                onClick={() => handleTrack(inputId)}
                disabled={loading}
                className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50"
              >
                {loading ? 'Loading...' : 'Track Delivery'}
              </button>
            </div>

            {/* Demo Info */}
            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-800">
                <strong>💡 Demo:</strong> Assignment IDs are returned when you assign a delivery boy to an order through the API.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!tracking) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-gray-600">Loading delivery details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Link href="/" className="text-sm text-blue-600 hover:text-blue-800">
            ← Back
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Your Delivery</h1>
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
            <span className="text-xs font-medium">
              {connectionStatus === 'connected' ? '🟢 Live' : connectionStatus === 'connecting' ? '🟡 Connecting' : '🔴 Offline'}
            </span>
          </div>
        </div>

        {/* Delivery Boy Info Card */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-sm text-gray-600">Delivery Boy</p>
              <p className="text-lg font-bold text-gray-900">{tracking.deliveryBoyName}</p>
              <p className="text-sm text-gray-600">📱 {tracking.deliveryBoyPhone}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Vehicle</p>
              <p className="text-lg font-bold text-gray-900">
                {tracking.vehicleType === 'bike'
                  ? '🏍️ Bike'
                  : tracking.vehicleType === 'scooter'
                  ? '🛴 Scooter'
                  : '🚗 Car'}
              </p>
              {tracking.vehicleNumber && <p className="text-sm text-gray-600">{tracking.vehicleNumber}</p>}
            </div>
          </div>

          {/* Current Status */}
          <div className={`p-4 rounded-lg ${statusColors[tracking.status]} text-center`}>
            <p className="text-3xl mb-2">{statusIcons[tracking.status]}</p>
            <p className="font-bold text-lg">{tracking.status}</p>
            <p className="text-sm mt-1">{getStatusDescription(tracking.status)}</p>
          </div>
        </div>

        {/* Distance & ETA */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow">
            <p className="text-sm text-gray-600 mb-1">Distance Remaining</p>
            <p className="text-2xl font-bold text-blue-600">{tracking.distanceRemaining.toFixed(1)} km</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <p className="text-sm text-gray-600 mb-1">Estimated Arrival</p>
            <p className="text-2xl font-bold text-green-600">
              {tracking.eta ? new Date(tracking.eta).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '...'}
            </p>
          </div>
        </div>

        {/* Status Timeline */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h3 className="font-bold text-lg mb-4">Delivery Progress</h3>
          <div className="space-y-4">
            {statusSteps.map((step, idx) => {
              const isComplete = statusSteps.indexOf(tracking.status) >= idx;
              const isCurrent = tracking.status === step;

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
                    <p className={`font-semibold ${isComplete ? 'text-gray-900' : 'text-gray-400'}`}>
                      {step}
                    </p>
                    {isCurrent && (
                      <p className="text-xs text-blue-600 font-medium">
                        Current step
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

        {/* Delivery Address */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <p className="text-sm text-gray-600 mb-2">Delivery Address</p>
          <p className="text-lg font-semibold text-gray-900 mb-4">{tracking.deliveryAddress}</p>

          {tracking.status === 'DELIVERED' && (
            <div className="p-4 bg-green-50 rounded-lg border-2 border-green-200">
              <p className="text-green-800 font-semibold">✅ Order Delivered</p>
              <p className="text-sm text-green-700 mt-1">Thank you for ordering with CloudKitchen!</p>
            </div>
          )}

          {tracking.status !== 'DELIVERED' && (
            <div className="p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
              <p className="text-blue-800 font-semibold">📍 Live Tracking Active</p>
              <p className="text-sm text-blue-700 mt-1">Delivery boy location updates automatically</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
