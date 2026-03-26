'use server';

import { NextResponse, NextRequest } from 'next/server';
import { connectToDatabase } from '@/lib/db/mongodb';
import { DeliveryService } from '@/lib/services/delivery';
import { errorResponse, successResponse, logStructured } from '@/lib/utils';
import { DeliveryBoyStatus } from '@/types';

/**
 * POST /api/delivery/register
 * Register a new delivery boy
 */
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

    // Validate required fields
    if (!name || !phone || !restaurantId) {
      return NextResponse.json(
        errorResponse('name, phone, restaurantId required'),
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();
    const deliveryService = new DeliveryService(db);

    // Check if phone already registered
    const existing = await db.collection('delivery_boys').findOne({ phone });
    if (existing) {
      return NextResponse.json(
        errorResponse('Phone number already registered'),
        { status: 409 }
      );
    }

    // Create delivery boy
    const deliveryBoy = await deliveryService.createDeliveryBoy({
      name,
      phone,
      email,
      vehicleType: vehicleType || 'bike',
      vehicleNumber,
      licenseNumber,
      restaurantId,
      latitude: latitude || 12.9716,
      longitude: longitude || 77.5946,
      lastLocationUpdate: new Date(),
      status: DeliveryBoyStatus.ONLINE,
      avgRating: 5.0,
      totalDeliveries: 0,
      totalEarnings: 0,
    });

    logStructured('info', 'Delivery boy registered', {
      deliveryBoyId: deliveryBoy.deliveryBoyId,
      name,
      phone,
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
