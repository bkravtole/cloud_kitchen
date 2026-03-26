<<<<<<< HEAD
# 🚀 Phase 2 - Week 5: Real-time Updates Implementation

**Timeline:** ~3-4 days | **Priority:** HIGH (enables live kitchen + customer tracking)  
**Goal:** Replace polling with Server-Sent Events (SSE) for instant updates

---

## 🎯 Objectives

- Replace 5-second polling with instant WebSocket/SSE connections
- **Kitchen Dashboard:** Orders appear in real-time (< 100ms latency)
- **Customer Tracking:** Customers see order status updates live
- **Performance:** Reduce server load by 80% vs polling

---

## 📋 Implementation Plan (Step-by-Step)

### **Step 1: Add SSE Utility & Connection Manager** (30 mins)

**Why?** SSE (Server-Sent Events) is simpler than WebSocket for one-way server→client updates, perfect for order status streams.

**File:** `src/lib/sse/connectionManager.ts` (NEW)

```typescript
/**
 * SSE Connection Manager
 * Handles subscriptions and broadcasts
 */

interface Subscriber {
  restaurantId?: string;  // for kitchen dashboard
  userPhone?: string;      // for customer order tracking
  controller: ReadableStreamDefaultController<Uint8Array>;
}

class SSEConnectionManager {
  private subscribers: Map<string, Subscriber[]> = new Map();

  subscribe(subscriberId: string, subscriber: Subscriber) {
    if (!this.subscribers.has(subscriberId)) {
      this.subscribers.set(subscriberId, []);
    }
    this.subscribers.get(subscriberId)!.push(subscriber);
    console.log(`[SSE] Client subscribed: ${subscriberId}`);
  }

  unsubscribe(subscriberId: string, controller: ReadableStreamDefaultController<Uint8Array>) {
    if (!this.subscribers.has(subscriberId)) return;
    
    const index = this.subscribers
      .get(subscriberId)!
      .findIndex(s => s.controller === controller);
    
    if (index > -1) {
      this.subscribers.get(subscriberId)!.splice(index, 1);
      console.log(`[SSE] Client unsubscribed: ${subscriberId}`);
    }
  }

  broadcast(channel: 'kitchen' | 'customer', data: any, context: string) {
    const contextKey = context; // e.g., "rest_001" or "919876543210"
    const subscribers = this.subscribers.get(contextKey) || [];

    console.log(`[SSE] Broadcasting to ${subscribers.length} clients on ${contextKey}`);

    subscribers.forEach(subscriber => {
      try {
        const sseMessage = `data: ${JSON.stringify(data)}\n\n`;
        subscriber.controller.enqueue(
          new TextEncoder().encode(sseMessage)
        );
      } catch (error) {
        console.error(`[SSE] Error broadcasting to subscriber:`, error);
        this.unsubscribe(contextKey, subscriber.controller);
      }
    });
  }

  getActiveConnections(): number {
    return Array.from(this.subscribers.values()).reduce((total, subs) => total + subs.length, 0);
  }
}

export const sseManager = new SSEConnectionManager();
```

---

### **Step 2: Create Kitchen Dashboard SSE Endpoint** (45 mins)

**File:** `src/app/api/stream/kitchen/route.ts` (NEW)

```typescript
import { NextRequest } from 'next/server';
import { sseManager } from '@/lib/sse/connectionManager';
import { logStructured } from '@/lib/utils';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const restaurantId = searchParams.get('restaurantId');

  if (!restaurantId) {
    return new Response('restaurantId required', { status: 400 });
  }

  logStructured('info', 'Kitchen SSE Connected', { restaurantId });

  const stream = new ReadableStream({
    start(controller) {
      // Subscribe to updates for this restaurant
      sseManager.subscribe(restaurantId, {
        restaurantId,
        controller,
      });

      // Send initial connection message
      const message = `data: ${JSON.stringify({ event: 'connected', restaurantId })}\n\n`;
      controller.enqueue(new TextEncoder().encode(message));

      // Cleanup on close
      const cleanup = () => {
        logStructured('info', 'Kitchen SSE Disconnected', { restaurantId });
        sseManager.unsubscribe(restaurantId, controller);
      };

      request.signal.addEventListener('abort', cleanup);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
```

---

### **Step 3: Create Customer Order Tracking SSE Endpoint** (45 mins)

**File:** `src/app/api/stream/order/route.ts` (NEW)

```typescript
import { NextRequest } from 'next/server';
import { sseManager } from '@/lib/sse/connectionManager';
import { logStructured } from '@/lib/utils';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userPhone = searchParams.get('userPhone');

  if (!userPhone) {
    return new Response('userPhone required', { status: 400 });
  }

  logStructured('info', 'Customer Order SSE Connected', { userPhone });

  const stream = new ReadableStream({
    start(controller) {
      // Subscribe to order updates for this customer
      sseManager.subscribe(userPhone, {
        userPhone,
        controller,
      });

      // Send initial connection message
      const message = `data: ${JSON.stringify({ event: 'connected', userPhone })}\n\n`;
      controller.enqueue(new TextEncoder().encode(message));

      // Cleanup on close
      const cleanup = () => {
        logStructured('info', 'Customer Order SSE Disconnected', { userPhone });
        sseManager.unsubscribe(userPhone, controller);
      };

      request.signal.addEventListener('abort', cleanup);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
```

---

### **Step 4: Update Order Status API to Broadcast Changes** (30 mins)

**File:** `src/app/api/order/[orderId]/route.ts` (UPDATE)

```typescript
// Add to existing PATCH handler after updating order status:

import { sseManager } from '@/lib/sse/connectionManager';

// After: await orderService.updateOrderStatus(...)

// Broadcast to kitchen dashboard
sseManager.broadcast('kitchen', {
  event: 'order_updated',
  orderId,
  status: newStatus,
  timestamp: new Date(),
}, restaurantId);

// Broadcast to customer
sseManager.broadcast('customer', {
  event: 'order_updated',
  orderId,
  status: newStatus,
  timestamp: new Date(),
}, userPhone);

logStructured('info', 'Order status broadcast', { 
  orderId, 
  status: newStatus,
  broadcasted: ['kitchen', 'customer']
});
```

---

### **Step 5: Update Kitchen Dashboard to Use SSE** (1.5 hours)

**File:** `src/app/dashboard/page.tsx` (REPLACE polling with SSE)

```typescript
'use client';

import { useEffect, useState, useRef } from 'react';
import { IOrder } from '@/types';
import { OrderStatus } from '@/types';

export default function KitchenDashboard() {
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
    CONFIRMED: 'bg-blue-100 text-blue-800',
    PREPARING: 'bg-purple-100 text-purple-800',
    READY: 'bg-green-100 text-green-800',
    DELIVERED: 'bg-gray-100 text-gray-800',
  };

  const ordersByStatus = {
    NEW: orders.filter(o => o.status === 'CONFIRMED'),
    PREPARING: orders.filter(o => o.status === 'PREPARING'),
    READY: orders.filter(o => o.status === 'READY'),
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Connection Status */}
      <div className="mb-6 flex items-center gap-2">
        <div className={`w-3 h-3 rounded-full ${connectionStatus === 'connected' ? 'bg-green-500' : connectionStatus === 'connecting' ? 'bg-yellow-500' : 'bg-red-500'}`} />
        <span className="text-sm font-medium">
          {connectionStatus === 'connected'
            ? '🟢 Live Updates Active'
            : connectionStatus === 'connecting'
            ? '🟡 Connecting...'
            : '🔴 Disconnected'}
        </span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-2xl font-bold">{ordersByStatus.NEW.length}</div>
          <div className="text-sm text-gray-600">New Orders</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-2xl font-bold">{ordersByStatus.PREPARING.length}</div>
          <div className="text-sm text-gray-600">Preparing</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-2xl font-bold">{ordersByStatus.READY.length}</div>
          <div className="text-sm text-gray-600">Ready for Delivery</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-2xl font-bold">{orders.length}</div>
          <div className="text-sm text-gray-600">Total Orders</div>
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
              <th className="px-6 py-3 text-left text-sm font-semibold">Status</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                  {loading ? 'Loading orders...' : 'No orders yet'}
                </td>
              </tr>
            ) : (
              orders.map(order => (
                <tr key={order.orderId} className="border-b hover:bg-gray-50">
                  <td className="px-6 py-3 text-sm font-mono">{order.orderId}</td>
                  <td className="px-6 py-3 text-sm">{order.userName}</td>
                  <td className="px-6 py-3 text-sm">{order.items?.length || 0} items</td>
                  <td className="px-6 py-3">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[order.status]}`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-6 py-3">
                    <select
                      value={order.status}
                      onChange={e => handleStatusChange(order.orderId, e.target.value as OrderStatus)}
                      className="px-3 py-1 border rounded text-sm"
                    >
                      <option value="CONFIRMED">Confirm</option>
                      <option value="PREPARING">Start Prep</option>
                      <option value="READY">Ready</option>
                      <option value="DELIVERED">Mark Delivered</option>
                    </select>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

---

### **Step 6: Create Customer Order Tracking Page** (1 hour)

**File:** `src/app/order-status/page.tsx` (NEW)

```typescript
'use client';

import { useState, useEffect, useRef } from 'react';
import { IOrder } from '@/types';

export default function OrderTrackingPage() {
  const [orders, setOrders] = useState<IOrder[]>([]);
  const [userPhone, setUserPhone] = useState('');
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected' | 'idle'>('idle');
  const eventSourceRef = useRef<EventSource | null>(null);

  const handleTrack = (phone: string) => {
    setUserPhone(phone);
    connectToStream(phone);
  };

  const connectToStream = async (phone: string) => {
    setConnectionStatus('connecting');

    // Fetch initial orders
    try {
      const res = await fetch(`/api/order?userPhone=${phone}`);
      const data = await res.json();
      setOrders(data.data || []);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    }

    // Connect to SSE
    const eventSource = new EventSource(`/api/stream/order?userPhone=${phone}`);

    eventSource.onopen = () => {
      setConnectionStatus('connected');
      console.log('✅ Connected to order tracking');
    };

    eventSource.onmessage = event => {
      const data = JSON.parse(event.data);

      if (data.event === 'order_updated') {
        setOrders(prev =>
          prev.map(order =>
            order.orderId === data.orderId
              ? { ...order, status: data.status }
              : order
          )
        );
      }
    };

    eventSource.onerror = () => {
      setConnectionStatus('disconnected');
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

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Track Your Order</h1>

      {!userPhone ? (
        <div className="bg-white p-6 rounded-lg shadow">
          <input
            type="tel"
            placeholder="Enter your phone number"
            className="w-full px-4 py-2 border rounded-lg mb-4"
            onKeyPress={e => {
              if (e.key === 'Enter') {
                handleTrack((e.target as HTMLInputElement).value);
              }
            }}
          />
          <button
            onClick={() => {
              const input = document.querySelector('input[type="tel"]') as HTMLInputElement;
              handleTrack(input.value);
            }}
            className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700"
          >
            Track Order
          </button>
        </div>
      ) : (
        <div>
          {/* Connection Status */}
          <div className="mb-6 flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${connectionStatus === 'connected' ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-sm">
              {connectionStatus === 'connected' ? '🟢 Connected' : '🔴 Disconnected'}
            </span>
          </div>

          {/* Orders */}
          {orders.length === 0 ? (
            <div className="bg-yellow-50 p-4 rounded-lg">No active orders for this number</div>
          ) : (
            orders.map(order => (
              <div key={order.orderId} className="bg-white p-6 rounded-lg shadow mb-4">
                <div className="mb-4">
                  <h2 className="font-semibold text-lg">Order #{order.orderId.slice(-8)}</h2>
                  <p className="text-sm text-gray-600">Total: ₹{order.total}</p>
                </div>

                {/* Status Timeline */}
                <div className="space-y-3">
                  {statusSteps.map((step, idx) =>
                    idx <= statusSteps.indexOf(order.status) ? (
                      <div key={step} className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                          ✓
                        </div>
                        <span className="font-medium">{step}</span>
                        {step === order.status && <span className="text-xs bg-blue-100 px-2 py-1 rounded">Current</span>}
                      </div>
                    ) : (
                      <div key={step} className="flex items-center gap-3 opacity-50">
                        <div className="w-8 h-8 bg-gray-300 rounded-full" />
                        <span>{step}</span>
                      </div>
                    )
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
```

---

## 🧪 Testing Real-time Updates

### **Test 1: Kitchen Dashboard Live Updates**

```bash
# Terminal 1: Start dev server
npm run dev

# Terminal 2: Create an order (from TESTING_GUIDE.md)
curl -X POST http://localhost:3000/api/order \
  -H "Content-Type: application/json" \
  -d '{"userPhone":"919876543210","userName":"John","restaurantId":"rest_001","items":[]}'

# Terminal 3: Open kitchen dashboard in browser
# http://localhost:3000/dashboard

# Terminal 4: Update order status
curl -X PATCH http://localhost:3000/api/order/ord_1234567_abc123 \
  -H "Content-Type: application/json" \
  -d '{"status":"PREPARING","restaurantId":"rest_001"}'

# Expected: Dashboard updates instantly without page refresh
```

### **Test 2: Customer Order Tracking**

```bash
# Open order tracking page
# http://localhost:3000/order-status

# Enter your phone number
# See initial orders load + live updates

# Update order status from kitchen dashboard
# Expected: Tracking page updates in real-time
```

### **Test 3: Connection Monitoring**

```bash
# Check SSE active connections (add to dashboard):
curl http://localhost:3000/api/stream/health

# Expected output shows connected clients
```

---

## 📊 Architecture Changes

### **Before (Polling)**
```
Browser polls /api/order every 5 seconds
  ↓ (even if no changes)
Server queries MongoDB
  ↓ (500 queries/min for 100 users)
High latency + high server load
```

### **After (SSE)**
```
Browser connects to /api/stream/kitchen (once)
  ↓ (stays connected)
Server maintains connection pool
  ↓ (only 1-2 connections per user)
Server broadcasts updates instantly
  ↓ (when order status changes)
Low latency + low server load
```

---

## 🚀 Next Steps After Week 5

Once real-time updates are working:

1. **Week 6:** Implement delivery tracking system
   - Assign delivery boys to orders
   - Track delivery boy location
   - Update customer on ETA

2. **Week 7:** Build analytics dashboard
   - Order history
   - Revenue metrics
   - Peak hours analysis
   - Reorder recommendations

---

## ✅ Week 5 Completion Checklist

- [ ] SSE Connection Manager created
- [ ] Kitchen dashboard SSE endpoint working
- [ ] Customer order tracking SSE endpoint working
- [ ] Order update API broadcasts changes
- [ ] Kitchen dashboard uses SSE (not polling)
- [ ] Customer tracking page shows live updates
- [ ] Tested with 5+ orders in parallel
- [ ] Connection status indicators visible
- [ ] No memory leaks (connections cleanup properly)
- [ ] Ready for Week 6

---

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| SSE not connecting | Check CORS headers, verify restaurantId param |
| Updates not showing | Ensure broadcast() is called after updateOrderStatus() |
| Memory leak | Verify cleanup in useEffect return functions |
| Stale connections | Add heartbeat ping every 30s (optional) |

---

**Ready to implement? Start with Step 1 next!**
=======
# 🚀 Phase 2 - Week 5: Real-time Updates Implementation

**Timeline:** ~3-4 days | **Priority:** HIGH (enables live kitchen + customer tracking)  
**Goal:** Replace polling with Server-Sent Events (SSE) for instant updates

---

## 🎯 Objectives

- Replace 5-second polling with instant WebSocket/SSE connections
- **Kitchen Dashboard:** Orders appear in real-time (< 100ms latency)
- **Customer Tracking:** Customers see order status updates live
- **Performance:** Reduce server load by 80% vs polling

---

## 📋 Implementation Plan (Step-by-Step)

### **Step 1: Add SSE Utility & Connection Manager** (30 mins)

**Why?** SSE (Server-Sent Events) is simpler than WebSocket for one-way server→client updates, perfect for order status streams.

**File:** `src/lib/sse/connectionManager.ts` (NEW)

```typescript
/**
 * SSE Connection Manager
 * Handles subscriptions and broadcasts
 */

interface Subscriber {
  restaurantId?: string;  // for kitchen dashboard
  userPhone?: string;      // for customer order tracking
  controller: ReadableStreamDefaultController<Uint8Array>;
}

class SSEConnectionManager {
  private subscribers: Map<string, Subscriber[]> = new Map();

  subscribe(subscriberId: string, subscriber: Subscriber) {
    if (!this.subscribers.has(subscriberId)) {
      this.subscribers.set(subscriberId, []);
    }
    this.subscribers.get(subscriberId)!.push(subscriber);
    console.log(`[SSE] Client subscribed: ${subscriberId}`);
  }

  unsubscribe(subscriberId: string, controller: ReadableStreamDefaultController<Uint8Array>) {
    if (!this.subscribers.has(subscriberId)) return;
    
    const index = this.subscribers
      .get(subscriberId)!
      .findIndex(s => s.controller === controller);
    
    if (index > -1) {
      this.subscribers.get(subscriberId)!.splice(index, 1);
      console.log(`[SSE] Client unsubscribed: ${subscriberId}`);
    }
  }

  broadcast(channel: 'kitchen' | 'customer', data: any, context: string) {
    const contextKey = context; // e.g., "rest_001" or "919876543210"
    const subscribers = this.subscribers.get(contextKey) || [];

    console.log(`[SSE] Broadcasting to ${subscribers.length} clients on ${contextKey}`);

    subscribers.forEach(subscriber => {
      try {
        const sseMessage = `data: ${JSON.stringify(data)}\n\n`;
        subscriber.controller.enqueue(
          new TextEncoder().encode(sseMessage)
        );
      } catch (error) {
        console.error(`[SSE] Error broadcasting to subscriber:`, error);
        this.unsubscribe(contextKey, subscriber.controller);
      }
    });
  }

  getActiveConnections(): number {
    return Array.from(this.subscribers.values()).reduce((total, subs) => total + subs.length, 0);
  }
}

export const sseManager = new SSEConnectionManager();
```

---

### **Step 2: Create Kitchen Dashboard SSE Endpoint** (45 mins)

**File:** `src/app/api/stream/kitchen/route.ts` (NEW)

```typescript
import { NextRequest } from 'next/server';
import { sseManager } from '@/lib/sse/connectionManager';
import { logStructured } from '@/lib/utils';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const restaurantId = searchParams.get('restaurantId');

  if (!restaurantId) {
    return new Response('restaurantId required', { status: 400 });
  }

  logStructured('info', 'Kitchen SSE Connected', { restaurantId });

  const stream = new ReadableStream({
    start(controller) {
      // Subscribe to updates for this restaurant
      sseManager.subscribe(restaurantId, {
        restaurantId,
        controller,
      });

      // Send initial connection message
      const message = `data: ${JSON.stringify({ event: 'connected', restaurantId })}\n\n`;
      controller.enqueue(new TextEncoder().encode(message));

      // Cleanup on close
      const cleanup = () => {
        logStructured('info', 'Kitchen SSE Disconnected', { restaurantId });
        sseManager.unsubscribe(restaurantId, controller);
      };

      request.signal.addEventListener('abort', cleanup);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
```

---

### **Step 3: Create Customer Order Tracking SSE Endpoint** (45 mins)

**File:** `src/app/api/stream/order/route.ts` (NEW)

```typescript
import { NextRequest } from 'next/server';
import { sseManager } from '@/lib/sse/connectionManager';
import { logStructured } from '@/lib/utils';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userPhone = searchParams.get('userPhone');

  if (!userPhone) {
    return new Response('userPhone required', { status: 400 });
  }

  logStructured('info', 'Customer Order SSE Connected', { userPhone });

  const stream = new ReadableStream({
    start(controller) {
      // Subscribe to order updates for this customer
      sseManager.subscribe(userPhone, {
        userPhone,
        controller,
      });

      // Send initial connection message
      const message = `data: ${JSON.stringify({ event: 'connected', userPhone })}\n\n`;
      controller.enqueue(new TextEncoder().encode(message));

      // Cleanup on close
      const cleanup = () => {
        logStructured('info', 'Customer Order SSE Disconnected', { userPhone });
        sseManager.unsubscribe(userPhone, controller);
      };

      request.signal.addEventListener('abort', cleanup);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
```

---

### **Step 4: Update Order Status API to Broadcast Changes** (30 mins)

**File:** `src/app/api/order/[orderId]/route.ts` (UPDATE)

```typescript
// Add to existing PATCH handler after updating order status:

import { sseManager } from '@/lib/sse/connectionManager';

// After: await orderService.updateOrderStatus(...)

// Broadcast to kitchen dashboard
sseManager.broadcast('kitchen', {
  event: 'order_updated',
  orderId,
  status: newStatus,
  timestamp: new Date(),
}, restaurantId);

// Broadcast to customer
sseManager.broadcast('customer', {
  event: 'order_updated',
  orderId,
  status: newStatus,
  timestamp: new Date(),
}, userPhone);

logStructured('info', 'Order status broadcast', { 
  orderId, 
  status: newStatus,
  broadcasted: ['kitchen', 'customer']
});
```

---

### **Step 5: Update Kitchen Dashboard to Use SSE** (1.5 hours)

**File:** `src/app/dashboard/page.tsx` (REPLACE polling with SSE)

```typescript
'use client';

import { useEffect, useState, useRef } from 'react';
import { IOrder } from '@/types';
import { OrderStatus } from '@/types';

export default function KitchenDashboard() {
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
    CONFIRMED: 'bg-blue-100 text-blue-800',
    PREPARING: 'bg-purple-100 text-purple-800',
    READY: 'bg-green-100 text-green-800',
    DELIVERED: 'bg-gray-100 text-gray-800',
  };

  const ordersByStatus = {
    NEW: orders.filter(o => o.status === 'CONFIRMED'),
    PREPARING: orders.filter(o => o.status === 'PREPARING'),
    READY: orders.filter(o => o.status === 'READY'),
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Connection Status */}
      <div className="mb-6 flex items-center gap-2">
        <div className={`w-3 h-3 rounded-full ${connectionStatus === 'connected' ? 'bg-green-500' : connectionStatus === 'connecting' ? 'bg-yellow-500' : 'bg-red-500'}`} />
        <span className="text-sm font-medium">
          {connectionStatus === 'connected'
            ? '🟢 Live Updates Active'
            : connectionStatus === 'connecting'
            ? '🟡 Connecting...'
            : '🔴 Disconnected'}
        </span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-2xl font-bold">{ordersByStatus.NEW.length}</div>
          <div className="text-sm text-gray-600">New Orders</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-2xl font-bold">{ordersByStatus.PREPARING.length}</div>
          <div className="text-sm text-gray-600">Preparing</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-2xl font-bold">{ordersByStatus.READY.length}</div>
          <div className="text-sm text-gray-600">Ready for Delivery</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-2xl font-bold">{orders.length}</div>
          <div className="text-sm text-gray-600">Total Orders</div>
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
              <th className="px-6 py-3 text-left text-sm font-semibold">Status</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                  {loading ? 'Loading orders...' : 'No orders yet'}
                </td>
              </tr>
            ) : (
              orders.map(order => (
                <tr key={order.orderId} className="border-b hover:bg-gray-50">
                  <td className="px-6 py-3 text-sm font-mono">{order.orderId}</td>
                  <td className="px-6 py-3 text-sm">{order.userName}</td>
                  <td className="px-6 py-3 text-sm">{order.items?.length || 0} items</td>
                  <td className="px-6 py-3">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[order.status]}`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-6 py-3">
                    <select
                      value={order.status}
                      onChange={e => handleStatusChange(order.orderId, e.target.value as OrderStatus)}
                      className="px-3 py-1 border rounded text-sm"
                    >
                      <option value="CONFIRMED">Confirm</option>
                      <option value="PREPARING">Start Prep</option>
                      <option value="READY">Ready</option>
                      <option value="DELIVERED">Mark Delivered</option>
                    </select>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

---

### **Step 6: Create Customer Order Tracking Page** (1 hour)

**File:** `src/app/order-status/page.tsx` (NEW)

```typescript
'use client';

import { useState, useEffect, useRef } from 'react';
import { IOrder } from '@/types';

export default function OrderTrackingPage() {
  const [orders, setOrders] = useState<IOrder[]>([]);
  const [userPhone, setUserPhone] = useState('');
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected' | 'idle'>('idle');
  const eventSourceRef = useRef<EventSource | null>(null);

  const handleTrack = (phone: string) => {
    setUserPhone(phone);
    connectToStream(phone);
  };

  const connectToStream = async (phone: string) => {
    setConnectionStatus('connecting');

    // Fetch initial orders
    try {
      const res = await fetch(`/api/order?userPhone=${phone}`);
      const data = await res.json();
      setOrders(data.data || []);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    }

    // Connect to SSE
    const eventSource = new EventSource(`/api/stream/order?userPhone=${phone}`);

    eventSource.onopen = () => {
      setConnectionStatus('connected');
      console.log('✅ Connected to order tracking');
    };

    eventSource.onmessage = event => {
      const data = JSON.parse(event.data);

      if (data.event === 'order_updated') {
        setOrders(prev =>
          prev.map(order =>
            order.orderId === data.orderId
              ? { ...order, status: data.status }
              : order
          )
        );
      }
    };

    eventSource.onerror = () => {
      setConnectionStatus('disconnected');
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

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Track Your Order</h1>

      {!userPhone ? (
        <div className="bg-white p-6 rounded-lg shadow">
          <input
            type="tel"
            placeholder="Enter your phone number"
            className="w-full px-4 py-2 border rounded-lg mb-4"
            onKeyPress={e => {
              if (e.key === 'Enter') {
                handleTrack((e.target as HTMLInputElement).value);
              }
            }}
          />
          <button
            onClick={() => {
              const input = document.querySelector('input[type="tel"]') as HTMLInputElement;
              handleTrack(input.value);
            }}
            className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700"
          >
            Track Order
          </button>
        </div>
      ) : (
        <div>
          {/* Connection Status */}
          <div className="mb-6 flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${connectionStatus === 'connected' ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-sm">
              {connectionStatus === 'connected' ? '🟢 Connected' : '🔴 Disconnected'}
            </span>
          </div>

          {/* Orders */}
          {orders.length === 0 ? (
            <div className="bg-yellow-50 p-4 rounded-lg">No active orders for this number</div>
          ) : (
            orders.map(order => (
              <div key={order.orderId} className="bg-white p-6 rounded-lg shadow mb-4">
                <div className="mb-4">
                  <h2 className="font-semibold text-lg">Order #{order.orderId.slice(-8)}</h2>
                  <p className="text-sm text-gray-600">Total: ₹{order.total}</p>
                </div>

                {/* Status Timeline */}
                <div className="space-y-3">
                  {statusSteps.map((step, idx) =>
                    idx <= statusSteps.indexOf(order.status) ? (
                      <div key={step} className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                          ✓
                        </div>
                        <span className="font-medium">{step}</span>
                        {step === order.status && <span className="text-xs bg-blue-100 px-2 py-1 rounded">Current</span>}
                      </div>
                    ) : (
                      <div key={step} className="flex items-center gap-3 opacity-50">
                        <div className="w-8 h-8 bg-gray-300 rounded-full" />
                        <span>{step}</span>
                      </div>
                    )
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
```

---

## 🧪 Testing Real-time Updates

### **Test 1: Kitchen Dashboard Live Updates**

```bash
# Terminal 1: Start dev server
npm run dev

# Terminal 2: Create an order (from TESTING_GUIDE.md)
curl -X POST http://localhost:3000/api/order \
  -H "Content-Type: application/json" \
  -d '{"userPhone":"919876543210","userName":"John","restaurantId":"rest_001","items":[]}'

# Terminal 3: Open kitchen dashboard in browser
# http://localhost:3000/dashboard

# Terminal 4: Update order status
curl -X PATCH http://localhost:3000/api/order/ord_1234567_abc123 \
  -H "Content-Type: application/json" \
  -d '{"status":"PREPARING","restaurantId":"rest_001"}'

# Expected: Dashboard updates instantly without page refresh
```

### **Test 2: Customer Order Tracking**

```bash
# Open order tracking page
# http://localhost:3000/order-status

# Enter your phone number
# See initial orders load + live updates

# Update order status from kitchen dashboard
# Expected: Tracking page updates in real-time
```

### **Test 3: Connection Monitoring**

```bash
# Check SSE active connections (add to dashboard):
curl http://localhost:3000/api/stream/health

# Expected output shows connected clients
```

---

## 📊 Architecture Changes

### **Before (Polling)**
```
Browser polls /api/order every 5 seconds
  ↓ (even if no changes)
Server queries MongoDB
  ↓ (500 queries/min for 100 users)
High latency + high server load
```

### **After (SSE)**
```
Browser connects to /api/stream/kitchen (once)
  ↓ (stays connected)
Server maintains connection pool
  ↓ (only 1-2 connections per user)
Server broadcasts updates instantly
  ↓ (when order status changes)
Low latency + low server load
```

---

## 🚀 Next Steps After Week 5

Once real-time updates are working:

1. **Week 6:** Implement delivery tracking system
   - Assign delivery boys to orders
   - Track delivery boy location
   - Update customer on ETA

2. **Week 7:** Build analytics dashboard
   - Order history
   - Revenue metrics
   - Peak hours analysis
   - Reorder recommendations

---

## ✅ Week 5 Completion Checklist

- [ ] SSE Connection Manager created
- [ ] Kitchen dashboard SSE endpoint working
- [ ] Customer order tracking SSE endpoint working
- [ ] Order update API broadcasts changes
- [ ] Kitchen dashboard uses SSE (not polling)
- [ ] Customer tracking page shows live updates
- [ ] Tested with 5+ orders in parallel
- [ ] Connection status indicators visible
- [ ] No memory leaks (connections cleanup properly)
- [ ] Ready for Week 6

---

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| SSE not connecting | Check CORS headers, verify restaurantId param |
| Updates not showing | Ensure broadcast() is called after updateOrderStatus() |
| Memory leak | Verify cleanup in useEffect return functions |
| Stale connections | Add heartbeat ping every 30s (optional) |

---

**Ready to implement? Start with Step 1 next!**
>>>>>>> 6dc15d4717b3046085b2739292e7a7c90c812cab
