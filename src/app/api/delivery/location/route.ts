'use server';

import { NextResponse, NextRequest } from 'next/server';
import { connectToDatabase } from '@/lib/db/mongodb';
import { DeliveryService } from '@/lib/services/delivery';
import { logStructured, errorResponse, successResponse } from '@/lib/utils';
import { sseManager } from '@/lib/sse/connectionManager';

/**
 * POST /api/delivery/location
 * Update delivery boy location (called frequently from mobile app)
 * GPS updates approximately every 5-10 seconds
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

    // Broadcast location update to customers and kitchen
    assignments.forEach((assignment) => {
      // Broadcast to customer: delivery boy location
      sseManager.broadcast('customer', {
        event: 'delivery_location_update',
        assignmentId: assignment.assignmentId,
        latitude,
        longitude,
        timestamp: new Date().toISOString(),
      }, assignment.customerPhone);

      // Broadcast to kitchen: delivery boy location
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
      successResponse({ message: 'Location updated', assignmentsAffected: assignments.length }),
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

    // Calculate ETA (assume 25 km/h average speed)
    const etaMinutes = Math.ceil((distanceRemaining / 25) * 60);
    const eta = new Date(Date.now() + etaMinutes * 60 * 1000);

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
        eta,
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

/**
 * Calculate distance between two coordinates (Haversine formula)
 * Returns distance in kilometers
 */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
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
  return R * c;
}
