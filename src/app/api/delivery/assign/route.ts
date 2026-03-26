'use server';

import { NextResponse, NextRequest } from 'next/server';
import { connectToDatabase } from '@/lib/db/mongodb';
import { DeliveryService } from '@/lib/services/delivery';
import { logStructured, errorResponse, successResponse } from '@/lib/utils';
import { sseManager } from '@/lib/sse/connectionManager';

/**
 * POST /api/delivery/assign
 * Assign a delivery boy to an order
 * Triggered after payment confirmation
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
      userName,
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
      userName || customerName || 'Customer',
      deliveryAddress || 'Unknown',
      orderTotal || 0
    );

    if (!assignment) {
      logStructured('warn', 'No available delivery boys', { restaurantId });
      return NextResponse.json(
        { success: false, error: 'No delivery boys available' },
        { status: 503 }
      );
    }

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
    if (customerPhone) {
      sseManager.broadcast('customer', {
        event: 'delivery_assigned',
        orderId,
        assignmentId: assignment.assignmentId,
        estimatedDeliveryTime: assignment.estimatedDeliveryTime,
        timestamp: new Date().toISOString(),
      }, customerPhone);
    }

    logStructured('info', 'Delivery assignment successful', {
      orderId,
      assignmentId: assignment.assignmentId,
      deliveryBoyId: assignment.deliveryBoyId,
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

/**
 * GET /api/delivery/assign
 * Get available delivery boys for a restaurant
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get('restaurantId');

    if (!restaurantId) {
      return NextResponse.json(
        errorResponse('restaurantId required'),
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();
    const deliveryService = new DeliveryService(db);

    const availableBoys = await deliveryService.getAvailableDeliveryBoys(restaurantId);

    return NextResponse.json(
      successResponse({
        availableDeliveryBoys: availableBoys.length,
        deliveryBoys: availableBoys.map((boy) => ({
          deliveryBoyId: boy.deliveryBoyId,
          name: boy.name,
          phone: boy.phone,
          vehicleType: boy.vehicleType,
          rating: boy.avgRating,
          totalDeliveries: boy.totalDeliveries,
        })),
      }),
      { status: 200 }
    );
  } catch (error) {
    logStructured('error', 'Get available delivery boys error', { error });
    return NextResponse.json(
      errorResponse('Failed to get delivery boys'),
      { status: 500 }
    );
  }
}
