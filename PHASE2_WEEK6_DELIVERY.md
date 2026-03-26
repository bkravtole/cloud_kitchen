# 🚚 Phase 2 - Week 6: Delivery System Implementation

**Timeline:** ~4-5 days | **Priority:** HIGH (enables order fulfillment)  
**Goal:** Implement delivery boy management, real-time location tracking, and customer ETAs

---

## 🎯 Objectives

- **Delivery Boy Management:** Assign, track, and manage delivery personnel
- **Real-time Location:** Live GPS tracking with < 5 second updates
- **ETA Calculation:** Smart ETA based on distance + traffic patterns
- **SSE Integration:** Extend Week 5 SSE for delivery status broadcasts
- **Multi-state App:** Unassigned → Assigned → In Transit → Delivered

---

## 📋 Step-by-Step Implementation

### **Step 1: Add Delivery Boy Types** (30 mins)

**Why?** Need new TypeScript interfaces for delivery system

**File:** `src/types/index.ts` (ADD)

```typescript
// Delivery System Types

/**
 * DeliveryBoy status enum
 */
export enum DeliveryBoyStatus {
  OFFLINE = 'OFFLINE',            // Not available
  ONLINE = 'ONLINE',              // Available for orders
  ON_DELIVERY = 'ON_DELIVERY',    // Currently delivering
  BREAK = 'BREAK',                // Break time
}

/**
 * Delivery Boy Document
 */
export interface IDeliveryBoy {
  _id?: string;
  deliveryBoyId: string;           // Unique identifier (db_001)
  name: string;
  phone: string;                    // Contact number
  email?: string;
  status: DeliveryBoyStatus;        // Current status
  restaurantId: string;             // Assigned restaurant
  
  // Location
  latitude: number;                 // Last known latitude
  longitude: number;                // Last known longitude
  lastLocationUpdate: Date;         // When location was last updated
  
  // Rating
  avgRating: number;                // 1-5 stars
  totalDeliveries: number;          // Lifetime deliveries
  
  // Vehicle
  vehicleType: 'bike' | 'scooter' | 'car';
  vehicleNumber?: string;           // License plate
  
  // Documents
  licenseNumber?: string;
  aadharNumber?: string;
  
  // Payment
  totalEarnings: number;            // In rupees
  bankAccount?: string;             // For payments
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Delivery Assignment Document
 */
export interface IDeliveryAssignment {
  _id?: string;
  assignmentId: string;             // Unique (da_001)
  orderId: string;                  // Order being delivered
  deliveryBoyId: string;            // Assigned delivery boy
  restaurantId: string;             // Which restaurant
  
  // Locations
  pickupLat?: number;               // Restaurant location
  pickupLng?: number;
  deliveryLat?: number;             // Customer location
  deliveryLng?: number;
  
  // Status
  status: 'ASSIGNED' | 'PICKED_UP' | 'IN_TRANSIT' | 'DELIVERED' | 'FAILED';
  
  // Tracking
  assignedAt: Date;
  pickedUpAt?: Date;
  deliveredAt?: Date;
  
  // ETA
  estimatedDeliveryTime: Date;      // Calculated ETA
  actualDeliveryTime?: Date;
  
  // Details
  customerPhone: string;
  customerName: string;
  userName: string;
  deliveryAddress: string;
  orderTotal: number;
  
  // Proof
  deliveryProof?: string;           // Photo URL
  otp?: string;                     // One-time password for verification
  otpVerified: boolean;
  
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Location Update (sent via SSE stream)
 */
export interface ILocationUpdate {
  deliveryBoyId: string;
  latitude: number;
  longitude: number;
  timestamp: Date;
  accuracy?: number;                // GPS accuracy in meters
}

/**
 * Delivery Tracking for Customer
 */
export interface IDeliveryTracking {
  assignmentId: string;
  deliveryBoyId: string;
  deliveryBoyName: string;
  deliveryBoyPhone: string;
  vehicleType: string;
  vehicleNumber?: string;
  
  status: string;
  latitude: number;
  longitude: number;
  
  pickupAddress: string;
  deliveryAddress: string;
  
  estimatedDeliveryTime: Date;
  distanceRemaining: number;        // In kilometers
}
```

**MongoDB Indexes to Add to `src/lib/db/mongodb.ts`:**

```typescript
// In createIndexes() function, add:

db.collection('delivery_boys').createIndex({ restaurantId: 1, status: 1 });
db.collection('delivery_boys').createIndex({ deliveryBoyId: 1 }, { unique: true });
db.collection('delivery_boys').createIndex({ phone: 1 });

db.collection('delivery_assignments').createIndex({ orderId: 1 }, { unique: true });
db.collection('delivery_assignments').createIndex({ deliveryBoyId: 1 });
db.collection('delivery_assignments').createIndex({ restaurantId: 1, status: 1 });
db.collection('delivery_assignments').createIndex({ assignedAt: 1 }, { expireAfterSeconds: 604800 }); // TTL: 7 days
```

---

### **Step 2: Create Delivery Boy Service** (1.5 hours)

**File:** `src/lib/services/delivery.ts` (NEW)

```typescript
import { Db, ObjectId } from 'mongodb';
import {
  IDeliveryBoy,
  IDeliveryAssignment,
  DeliveryBoyStatus,
  ILocationUpdate,
} from '@/types';
import { generateId, logStructured } from '@/lib/utils';

export class DeliveryService {
  constructor(private db: Db) {}

  /**
   * Register a new delivery boy
   */
  async createDeliveryBoy(data: Omit<IDeliveryBoy, '_id' | 'createdAt' | 'updatedAt'>) {
    const deliveryBoy: IDeliveryBoy = {
      ...data,
      deliveryBoyId: `db_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await this.db.collection('delivery_boys').insertOne(deliveryBoy as any);

    logStructured('info', 'Delivery boy created', {
      deliveryBoyId: deliveryBoy.deliveryBoyId,
      name: deliveryBoy.name,
      restaurantId: deliveryBoy.restaurantId,
    });

    return deliveryBoy;
  }

  /**
   * Get delivery boy by ID
   */
  async getDeliveryBoy(deliveryBoyId: string) {
    return this.db.collection('delivery_boys').findOne({ deliveryBoyId });
  }

  /**
   * Get available delivery boys for a restaurant
   */
  async getAvailableDeliveryBoys(restaurantId: string): Promise<IDeliveryBoy[]> {
    const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);

    return this.db
      .collection('delivery_boys')
      .find({
        restaurantId,
        status: DeliveryBoyStatus.ONLINE,
        lastLocationUpdate: { $gte: sixHoursAgo },
      })
      .toArray() as Promise<IDeliveryBoy[]>;
  }

  /**
   * Update delivery boy location
   */
  async updateLocation(
    deliveryBoyId: string,
    latitude: number,
    longitude: number,
    accuracy?: number
  ) {
    const result = await this.db.collection('delivery_boys').updateOne(
      { deliveryBoyId },
      {
        $set: {
          latitude,
          longitude,
          lastLocationUpdate: new Date(),
          updatedAt: new Date(),
        },
      }
    );

    logStructured('info', 'Location updated', {
      deliveryBoyId,
      latitude,
      longitude,
    });

    return result;
  }

  /**
   * Update delivery boy status
   */
  async updateDeliveryBoyStatus(deliveryBoyId: string, status: DeliveryBoyStatus) {
    const result = await this.db.collection('delivery_boys').updateOne(
      { deliveryBoyId },
      {
        $set: { status, updatedAt: new Date() },
      }
    );

    logStructured('info', 'Delivery boy status updated', {
      deliveryBoyId,
      status,
    });

    return result;
  }

  /**
   * Assign delivery job to a boy
   * Smart algorithm (nearest + available + highest rating)
   */
  async assignDelivery(
    orderId: string,
    restaurantId: string,
    pickupLat: number,
    pickupLng: number,
    deliveryLat: number,
    deliveryLng: number,
    customerPhone: string,
    customerName: string,
    deliveryAddress: string,
    orderTotal: number
  ): Promise<IDeliveryAssignment | null> {
    // Get available delivery boys
    const availableBoys = await this.getAvailableDeliveryBoys(restaurantId);

    if (availableBoys.length === 0) {
      logStructured('warn', 'No available delivery boys', { restaurantId });
      return null;
    }

    // Calculate distance for each boy (Haversine formula)
    const boysWithDistance = availableBoys.map((boy) => ({
      ...boy,
      distance: this.calculateDistance(boy.latitude, boy.longitude, pickupLat, pickupLng),
    }));

    // Sort by distance, then by rating (nearest + best rated first)
    boysWithDistance.sort((a, b) => {
      const distDiff = a.distance - b.distance;
      if (Math.abs(distDiff) < 0.5) {
        // Within 0.5km, sort by rating
        return b.avgRating - a.avgRating;
      }
      return distDiff;
    });

    // Assign to nearest available boy
    const selectedBoy = boysWithDistance[0];

    // Calculate ETA (assume avg 25 km/h delivery speed)
    const deliveryDistance = this.calculateDistance(
      pickupLat,
      pickupLng,
      deliveryLat,
      deliveryLng
    );
    const estimatedMinutes = Math.ceil((deliveryDistance / 25) * 60) + 15; // +15 min buffer
    const estimatedDeliveryTime = new Date(Date.now() + estimatedMinutes * 60 * 1000);

    // Create assignment
    const assignment: IDeliveryAssignment = {
      assignmentId: `da_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      orderId,
      deliveryBoyId: selectedBoy.deliveryBoyId,
      restaurantId,
      pickupLat,
      pickupLng,
      deliveryLat,
      deliveryLng,
      status: 'ASSIGNED',
      assignedAt: new Date(),
      customerPhone,
      customerName,
      userName: customerName,
      deliveryAddress,
      orderTotal,
      estimatedDeliveryTime,
      otpVerified: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await this.db.collection('delivery_assignments').insertOne(assignment as any);

    logStructured('info', 'Delivery assigned', {
      assignmentId: assignment.assignmentId,
      orderId,
      deliveryBoyId: selectedBoy.deliveryBoyId,
      estimatedMinutes,
    });

    return assignment;
  }

  /**
   * Get assignment by order ID
   */
  async getAssignmentByOrderId(orderId: string): Promise<IDeliveryAssignment | null> {
    return this.db.collection('delivery_assignments').findOne({ orderId });
  }

  /**
   * Get active assignments for delivery boy
   */
  async getActiveAssignments(deliveryBoyId: string): Promise<IDeliveryAssignment[]> {
    return this.db
      .collection('delivery_assignments')
      .find({
        deliveryBoyId,
        status: { $in: ['ASSIGNED', 'PICKED_UP', 'IN_TRANSIT'] },
      })
      .toArray() as Promise<IDeliveryAssignment[]>;
  }

  /**
   * Update assignment status
   */
  async updateAssignmentStatus(
    assignmentId: string,
    status: 'ASSIGNED' | 'PICKED_UP' | 'IN_TRANSIT' | 'DELIVERED' | 'FAILED'
  ) {
    const update: any = {
      status,
      updatedAt: new Date(),
    };

    if (status === 'PICKED_UP') {
      update.pickedUpAt = new Date();
    } else if (status === 'DELIVERED') {
      update.deliveredAt = new Date();
    }

    const result = await this.db.collection('delivery_assignments').updateOne(
      { assignmentId },
      { $set: update }
    );

    logStructured('info', 'Assignment status updated', {
      assignmentId,
      status,
    });

    return result;
  }

  /**
   * Verify OTP for delivery
   */
  async verifyOTP(assignmentId: string, otp: string): Promise<boolean> {
    const assignment = await this.db.collection('delivery_assignments').findOne({ assignmentId });

    if (!assignment || assignment.otp !== otp) {
      logStructured('warn', 'OTP verification failed', { assignmentId });
      return false;
    }

    await this.db.collection('delivery_assignments').updateOne(
      { assignmentId },
      { $set: { otpVerified: true } }
    );

    return true;
  }

  /**
   * Calculate distance between two coordinates (Haversine formula)
   * Returns distance in kilometers
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return distance;
  }

  /**
   * Get delivery statistics for a restaurant
   */
  async getDeliveryStats(restaurantId: string, days: number = 7) {
    const sinceDatetime = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const stats = await this.db
      .collection('delivery_assignments')
      .aggregate([
        {
          $match: {
            restaurantId,
            createdAt: { $gte: sinceDatetime },
          },
        },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            avgDeliveryTime: {
              $avg: {
                $subtract: ['$deliveredAt', '$assignedAt'],
              },
            },
          },
        },
      ])
      .toArray();

    return stats;
  }
}
```

---

### **Step 3: Create Delivery Assignment API** (1 hour)

**File:** `src/app/api/delivery/assign/route.ts` (NEW)

```typescript
'use server';

import { NextResponse, NextRequest } from 'next/server';
import { connectToDatabase } from '@/lib/db/mongodb';
import { DeliveryService } from '@/lib/services/delivery';
import { OrderService } from '@/lib/services/order';
import { logStructured, errorResponse, successResponse } from '@/lib/utils';
import { sseManager } from '@/lib/sse/connectionManager';

/**
 * POST /api/delivery/assign
 * Assign a delivery boy to an order
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      orderId,
      restaurantId,
      pickupLat,
      pickupLng,
      deliveryLat,
      deliveryLng,
      customerPhone,
      customerName,
      deliveryAddress,
      orderTotal,
    } = body;

    // Validate inputs
    if (!orderId || !restaurantId) {
      return NextResponse.json(
        errorResponse('orderId and restaurantId required'),
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();
    const deliveryService = new DeliveryService(db);
    const orderService = new OrderService(db);

    // Assign delivery
    const assignment = await deliveryService.assignDelivery(
      orderId,
      restaurantId,
      pickupLat || 12.9716, // Default: Bangalore
      pickupLng || 77.5946,
      deliveryLat || 12.9352,
      deliveryLng || 77.6245,
      customerPhone || 'N/A',
      customerName || 'Customer',
      deliveryAddress || 'Unknown',
      orderTotal || 0
    );

    if (!assignment) {
      return NextResponse.json(
        { success: false, error: 'No delivery boys available' },
        { status: 503 }
      );
    }

    // Update order with assignment
    await orderService.updateOrderStatus(orderId, restaurantId, 'CONFIRMED');

    // Broadcast to kitchen: assignment made
    sseManager.broadcast('kitchen', {
      event: 'delivery_assigned',
      orderId,
      assignmentId: assignment.assignmentId,
      deliveryBoyId: assignment.deliveryBoyId,
      estimatedDeliveryTime: assignment.estimatedDeliveryTime,
      timestamp: new Date().toISOString(),
    }, restaurantId);

    // Broadcast to customer: delivery assigned
    sseManager.broadcast('customer', {
      event: 'delivery_assigned',
      orderId,
      assignmentId: assignment.assignmentId,
      estimatedDeliveryTime: assignment.estimatedDeliveryTime,
      timestamp: new Date().toISOString(),
    }, customerPhone);

    logStructured('info', 'Delivery assignment successful', {
      orderId,
      assignmentId: assignment.assignmentId,
    });

    return NextResponse.json(
      successResponse(assignment),
      { status: 201 }
    );
  } catch (error) {
    logStructured('error', 'Delivery assign error', { error });
    return NextResponse.json(
      errorResponse('Failed to assign delivery'),
      { status: 500 }
    );
  }
}
```

---

### **Step 4: Location Tracking Endpoint** (45 mins)

**File:** `src/app/api/delivery/location/route.ts` (NEW)

```typescript
'use server';

import { NextResponse, NextRequest } from 'next/server';
import { connectToDatabase } from '@/lib/db/mongodb';
import { DeliveryService } from '@/lib/services/delivery';
import { logStructured, errorResponse, successResponse } from '@/lib/utils';
import { sseManager } from '@/lib/sse/connectionManager';

/**
 * POST /api/delivery/location
 * Update delivery boy location (called frequently from mobile app)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { deliveryBoyId, latitude, longitude, accuracy, restaurantId } = body;

    if (!deliveryBoyId || latitude === undefined || longitude === undefined) {
      return NextResponse.json(
        errorResponse('deliveryBoyId, latitude, longitude required'),
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();
    const deliveryService = new DeliveryService(db);

    // Update location
    await deliveryService.updateLocation(deliveryBoyId, latitude, longitude, accuracy);

    // Get active assignments for this delivery boy
    const assignments = await deliveryService.getActiveAssignments(deliveryBoyId);

    // Broadcast location update to customers
    assignments.forEach((assignment) => {
      sseManager.broadcast('customer', {
        event: 'delivery_location_update',
        assignmentId: assignment.assignmentId,
        latitude,
        longitude,
        timestamp: new Date().toISOString(),
      }, assignment.customerPhone);

      // Also broadcast to kitchen
      if (restaurantId) {
        sseManager.broadcast('kitchen', {
          event: 'delivery_location_update',
          assignmentId: assignment.assignmentId,
          deliveryBoyId,
          latitude,
          longitude,
          timestamp: new Date().toISOString(),
        }, restaurantId);
      }
    });

    return NextResponse.json(
      successResponse({ message: 'Location updated' }),
      { status: 200 }
    );
  } catch (error) {
    logStructured('error', 'Location update error', { error });
    return NextResponse.json(
      errorResponse('Failed to update location'),
      { status: 500 }
    );
  }
}

/**
 * GET /api/delivery/location
 * Get current location of delivery boy (for tracking)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const assignmentId = searchParams.get('assignmentId');

    if (!assignmentId) {
      return NextResponse.json(
        errorResponse('assignmentId required'),
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();
    const assignment = await db.collection('delivery_assignments').findOne({ assignmentId });

    if (!assignment) {
      return NextResponse.json(
        errorResponse('Assignment not found'),
        { status: 404 }
      );
    }

    const deliveryBoy = await db.collection('delivery_boys').findOne({
      deliveryBoyId: assignment.deliveryBoyId,
    });

    if (!deliveryBoy) {
      return NextResponse.json(
        errorResponse('Delivery boy not found'),
        { status: 404 }
      );
    }

    // Calculate distance remaining
    const distanceRemaining = calculateDistance(
      deliveryBoy.latitude,
      deliveryBoy.longitude,
      assignment.deliveryLat,
      assignment.deliveryLng
    );

    return NextResponse.json(
      successResponse({
        assignmentId,
        deliveryBoyId: deliveryBoy.deliveryBoyId,
        deliveryBoyName: deliveryBoy.name,
        deliveryBoyPhone: deliveryBoy.phone,
        vehicleType: deliveryBoy.vehicleType,
        vehicleNumber: deliveryBoy.vehicleNumber,
        status: assignment.status,
        latitude: deliveryBoy.latitude,
        longitude: deliveryBoy.longitude,
        estimatedDeliveryTime: assignment.estimatedDeliveryTime,
        distanceRemaining: Math.max(0, distanceRemaining),
      }),
      { status: 200 }
    );
  } catch (error) {
    logStructured('error', 'Get location error', { error });
    return NextResponse.json(
      errorResponse('Failed to get location'),
      { status: 500 }
    );
  }
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
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
}
```

---

### **Step 5: Delivery Management API** (45 mins)

**File:** `src/app/api/delivery/[assignmentId]/route.ts` (NEW)

```typescript
'use server';

import { NextResponse, NextRequest } from 'next/server';
import { connectToDatabase } from '@/lib/db/mongodb';
import { DeliveryService } from '@/lib/services/delivery';
import { logStructured, errorResponse, successResponse } from '@/lib/utils';
import { sseManager } from '@/lib/sse/connectionManager';

/**
 * PATCH /api/delivery/[assignmentId]
 * Update delivery assignment status
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { assignmentId: string } }
) {
  try {
    const { assignmentId } = params;
    const body = await request.json();
    const { status } = body;

    if (!status) {
      return NextResponse.json(
        errorResponse('status required'),
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();
    const deliveryService = new DeliveryService(db);

    // Get current assignment
    const assignment = await db.collection('delivery_assignments').findOne({ assignmentId });

    if (!assignment) {
      return NextResponse.json(
        errorResponse('Assignment not found'),
        { status: 404 }
      );
    }

    // Update status
    await deliveryService.updateAssignmentStatus(assignmentId, status);

    // Get updated assignment
    const updated = await db.collection('delivery_assignments').findOne({ assignmentId });

    // Broadcast status update to customer
    sseManager.broadcast('customer', {
      event: 'delivery_status_update',
      orderId: assignment.orderId,
      assignmentId,
      status,
      timestamp: new Date().toISOString(),
    }, assignment.customerPhone);

    // Broadcast to kitchen
    sseManager.broadcast('kitchen', {
      event: 'delivery_status_update',
      orderId: assignment.orderId,
      assignmentId,
      deliveryBoyId: assignment.deliveryBoyId,
      status,
      timestamp: new Date().toISOString(),
    }, assignment.restaurantId);

    return NextResponse.json(
      successResponse(updated),
      { status: 200 }
    );
  } catch (error) {
    logStructured('error', 'Delivery update error', { error });
    return NextResponse.json(
      errorResponse('Failed to update delivery'),
      { status: 500 }
    );
  }
}

/**
 * GET /api/delivery/[assignmentId]
 * Get delivery assignment details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { assignmentId: string } }
) {
  try {
    const { assignmentId } = params;

    const { db } = await connectToDatabase();
    const assignment = await db.collection('delivery_assignments').findOne({ assignmentId });

    if (!assignment) {
      return NextResponse.json(
        errorResponse('Assignment not found'),
        { status: 404 }
      );
    }

    const deliveryBoy = await db.collection('delivery_boys').findOne({
      deliveryBoyId: assignment.deliveryBoyId,
    });

    return NextResponse.json(
      successResponse({
        ...assignment,
        deliveryBoy,
      }),
      { status: 200 }
    );
  } catch (error) {
    logStructured('error', 'Get delivery error', { error });
    return NextResponse.json(
      errorResponse('Failed to get delivery'),
      { status: 500 }
    );
  }
}
```

---

### **Step 6: Delivery Boy Registration Page** (1 hour)

**File:** `src/app/delivery-signup/page.tsx` (NEW)

```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function DeliverySignupPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    vehicleType: 'bike' as const,
    vehicleNumber: '',
    licenseNumber: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/delivery/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          restaurantId: 'rest_001',
          latitude: 12.9716,
          longitude: 77.5946,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      setSuccess('✅ Registration successful! Your delivery boy ID is: ' + data.data.deliveryBoyId);
      setTimeout(() => router.push('/'), 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 p-6">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">🚚 Join Our Delivery Team</h1>
          <p className="text-gray-600">Sign up to start earning</p>
        </div>

        <div className="bg-white p-8 rounded-lg shadow-lg">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Full Name
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-orange-500 focus:outline-none"
                placeholder="John Doe"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-orange-500 focus:outline-none"
                placeholder="9876543210"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-orange-500 focus:outline-none"
                placeholder="john@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Vehicle Type
              </label>
              <select
                name="vehicleType"
                value={formData.vehicleType}
                onChange={handleChange}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-orange-500 focus:outline-none"
              >
                <option value="bike">📱 Bike</option>
                <option value="scooter">🛴 Scooter</option>
                <option value="car">🚗 Car</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Vehicle Number
              </label>
              <input
                type="text"
                name="vehicleNumber"
                value={formData.vehicleNumber}
                onChange={handleChange}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-orange-500 focus:outline-none"
                placeholder="KA01AB1234"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                License Number
              </label>
              <input
                type="text"
                name="licenseNumber"
                value={formData.licenseNumber}
                onChange={handleChange}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-orange-500 focus:outline-none"
                placeholder="DL00001234"
              />
            </div>

            {error && <div className="p-3 bg-red-100 border border-red-400 text-red-800 rounded">{error}</div>}
            {success && (
              <div className="p-3 bg-green-100 border border-green-400 text-green-800 rounded">
                {success}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-orange-600 text-white font-bold rounded-lg hover:bg-orange-700 transition disabled:opacity-50"
            >
              {loading ? 'Registering...' : 'Register as Delivery Boy'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
```

---

### **Step 7: Delivery Status Tracking Page** (1 hour)

**File:** `src/app/delivery-tracking/page.tsx` (NEW)

```typescript
'use client';

import { useState, useEffect, useRef } from 'react';

export default function DeliveryTrackingPage() {
  const [assignmentId, setAssignmentId] = useState('');
  const [inputId, setInputId] = useState('');
  const [tracking, setTracking] = useState<any>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected'>('disconnected');
  const eventSourceRef = useRef<EventSource | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);

  const handleTrack = async (id: string) => {
    if (!id) return;
    
    setAssignmentId(id);
    
    // Fetch initial data
    const res = await fetch(`/api/delivery/location?assignmentId=${id}`);
    const data = await res.json();
    
    if (data.success) {
      setTracking(data.data);
    }

    // Connect to SSE for location updates
    const eventSource = new EventSource(
      `/api/stream/kitchen?restaurantId=${localStorage.getItem('restaurantId') || 'rest_001'}`
    );

    eventSource.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.event === 'delivery_location_update' && msg.assignmentId === id) {
        setTracking((prev: any) => ({
          ...prev,
          latitude: msg.latitude,
          longitude: msg.longitude,
        }));
        setConnectionStatus('connected');
      }
    };

    eventSourceRef.current = eventSource;
  };

  useEffect(() => {
    return () => {
      eventSourceRef.current?.close();
    };
  }, []);

  if (!assignmentId) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-md mx-auto mt-20">
          <h1 className="text-3xl font-bold mb-6">Track Delivery</h1>
          <div className="bg-white p-6 rounded-lg shadow">
            <input
              type="text"
              placeholder="Enter assignment ID"
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg mb-4"
              value={inputId}
              onChange={(e) => setInputId(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleTrack(inputId)}
            />
            <button
              onClick={() => handleTrack(inputId)}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
            >
              Track
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-bold">Delivery Tracking</h1>
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${connectionStatus === 'connected' ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-sm">{connectionStatus === 'connected' ? 'Live' : 'Offline'}</span>
            </div>
          </div>

          {tracking && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Delivery Boy</p>
                  <p className="font-semibold">{tracking.deliveryBoyName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Vehicle</p>
                  <p className="font-semibold">{tracking.vehicleType} • {tracking.vehicleNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Status</p>
                  <p className="font-semibold text-lg">{tracking.status}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Distance Remaining</p>
                  <p className="font-semibold">{tracking.distanceRemaining?.toFixed(2)} km</p>
                </div>
              </div>

              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-800">
                  📍 Current: {tracking.latitude?.toFixed(4)}, {tracking.longitude?.toFixed(4)}
                </p>
                <p className="text-sm text-blue-800 mt-2">
                  🎯 Destination: {tracking.deliveryAddress}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

---

### **Step 8: Delivery Registration API** (30 mins)

**File:** `src/app/api/delivery/register/route.ts` (NEW)

```typescript
'use server';

import { NextResponse, NextRequest } from 'next/server';
import { connectToDatabase } from '@/lib/db/mongodb';
import { DeliveryService } from '@/lib/services/delivery';
import { errorResponse, successResponse, logStructured } from '@/lib/utils';
import { DeliveryBoyStatus } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      phone,
      email,
      vehicleType,
      vehicleNumber,
      licenseNumber,
      restaurantId,
      latitude,
      longitude,
    } = body;

    if (!name || !phone || !restaurantId) {
      return NextResponse.json(
        errorResponse('name, phone, restaurantId required'),
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();
    const deliveryService = new DeliveryService(db);

    // Create delivery boy
    const deliveryBoy = await deliveryService.createDeliveryBoy({
      name,
      phone,
      email,
      vehicleType,
      vehicleNumber,
      licenseNumber,
      restaurantId,
      latitude: latitude || 12.9716,
      longitude: longitude || 77.5946,
      status: DeliveryBoyStatus.ONLINE,
      avgRating: 5,
      totalDeliveries: 0,
      totalEarnings: 0,
    });

    logStructured('info', 'Delivery boy registered', {
      deliveryBoyId: deliveryBoy.deliveryBoyId,
      name,
    });

    return NextResponse.json(
      successResponse(deliveryBoy),
      { status: 201 }
    );
  } catch (error) {
    logStructured('error', 'Delivery registration error', { error });
    return NextResponse.json(
      errorResponse('Registration failed'),
      { status: 500 }
    );
  }
}
```

---

## 🧪 Testing Week 6

### **Test 1: Register as Delivery Boy**

```bash
# Open browser
http://localhost:3000/delivery-signup

# Or via curl:
curl -X POST http://localhost:3000/api/delivery/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Ravi",
    "phone": "9123456789",
    "email": "ravi@delivery.com",
    "vehicleType": "bike",
    "vehicleNumber": "KA01AB1234",
    "licenseNumber": "DL123456",
    "restaurantId": "rest_001",
    "latitude": 12.9716,
    "longitude": 77.5946
  }' | jq .data.deliveryBoyId
```

### **Test 2: Assign Delivery to Order**

```bash
# Create an order first (from Phase 1)
ORDER_ID=$(curl -X POST http://localhost:3000/api/order ... | jq -r .data.orderId)

# Assign delivery
curl -X POST http://localhost:3000/api/delivery/assign \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "'$ORDER_ID'",
    "restaurantId": "rest_001",
    "pickupLat": 12.9716,
    "pickupLng": 77.5946,
    "deliveryLat": 12.9352,
    "deliveryLng": 77.6245,
    "customerPhone": "919876543210",
    "customerName": "Amit",
    "deliveryAddress": "123 Main St",
    "orderTotal": 500
  }' | jq .data.assignmentId
```

### **Test 3: Update Delivery Boy Location**

```bash
# Get deliveryBoyId from registration
DB_ID="db_1711234567_abc123"

# Simulate location update every 5 seconds
for i in {1..5}; do
  LAT=$((120 + i*100))
  LNG=$((770 + i*100))
  
  curl -X POST http://localhost:3000/api/delivery/location \
    -H "Content-Type: application/json" \
    -d '{
      "deliveryBoyId": "'$DB_ID'",
      "latitude": 12.'$LAT',
      "longitude": 77.'$LNG'",
      "restaurantId": "rest_001"
    }'
  
  sleep 5
done

# Watch:
# - Kitchen dashboard for delivery status
# - Customer tracking page for live location
```

### **Test 4: Update Delivery Status**

```bash
# Get assignmentId from delivery assignment
ASSIGNMENT_ID="da_1711234567_abc123"

# Picked up
curl -X PATCH http://localhost:3000/api/delivery/$ASSIGNMENT_ID \
  -H "Content-Type: application/json" \
  -d '{"status":"PICKED_UP"}'

# In transit
curl -X PATCH http://localhost:3000/api/delivery/$ASSIGNMENT_ID \
  -H "Content-Type: application/json" \
  -d '{"status":"IN_TRANSIT"}'

# Delivered
curl -X PATCH http://localhost:3000/api/delivery/$ASSIGNMENT_ID \
  -H "Content-Type: application/json" \
  -d '{"status":"DELIVERED"}'
```

---

## 📊 End-to-End Flow (Week 5 + 6)

```
Customer                 Kitchen              DeliveryBoy          Backend
   |                       |                      |                  |
   |-- WhatsApp msg ------->|                      |                  |
   |                        |-- SSE update ------->|                  |
   |                        |                      |                  |
   |-- Places order --------|                      |                  |
   |                        |-- Assign delivery -->|                  |
   |<-- SSE:delivery -------|                      |                  |
   |   assigned             |                      |                  |
   |                        |                      |-- GPS update -----|
   |                        |                      |                  |
   |<-- SSE:location -------|----- location -------|                  |
   |    update              |                      |                  |
   |                        |                      |                  |
   |<-- SSE:delivered ------|--- status update ----|                  |
   |                        |                      |                  |
```

---

## ✅ Week 6 Completion Checklist

- [ ] Added delivery types to schema
- [ ] DeliveryService created with CRUD + assignment logic
- [ ] Delivery assignment API working
- [ ] Location tracking endpoint returning distances
- [ ] Delivery management API updating statuses
- [ ] Delivery signup page accessible
- [ ] Delivery registration API working
- [ ] Delivery boy location updates broadcasting to customers
- [ ] Order assignment triggers SSE broadcast
- [ ] Tested with 5+ deliveries in parallel
- [ ] Ready for Week 7 (Analytics)

---

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| No delivery boys available | Ensure delivery boys registered with status ONLINE |
| Location not updating in customer view | Check SSE connection in browser console |
| ETA calculation wrong | Verify pickup & delivery coordinates |
| Assignment fails | Check MongoDB indexes created |

---

**Ready to start implementing? Begin with Step 1!**
