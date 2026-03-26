'use server';

import { NextResponse, NextRequest } from 'next/server';
import { connectToDatabase } from '@/lib/db/mongodb';
import { OrderService } from '@/lib/services/order';
import { logStructured, errorResponse } from '@/lib/utils';

/**
 * POST /api/order - Create order from cart
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userPhone, userName, restaurantId, restaurantName, items, specialInstructions, userEmail } =
      body;

    if (!userPhone || !restaurantId || !items || items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: userPhone, restaurantId, items' },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();
    const orderService = new OrderService(db);

    const { order, paymentLink } = await orderService.createOrder(
      userPhone,
      userName || 'Customer',
      restaurantId,
      restaurantName,
      items,
      specialInstructions,
      userEmail
    );

    return NextResponse.json(
      {
        success: true,
        data: {
          orderId: order.orderId,
          total: order.total,
          paymentLink,
          razorpayOrderId: order.razorpayOrderId,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    logStructured('error', 'Order POST error', { error });
    return NextResponse.json(errorResponse('Failed to create order'), { status: 500 });
  }
}

/**
 * GET /api/order - Get orders
 * Query params: orderId, userPhone, restaurantId (required)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('orderId');
    const userPhone = searchParams.get('userPhone');
    const restaurantId = searchParams.get('restaurantId');

    if (!restaurantId) {
      return NextResponse.json(
        { success: false, error: 'restaurantId is required' },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();
    const orderService = new OrderService(db);

    let orders = [];

    if (orderId) {
      const order = await orderService.getOrder(orderId, restaurantId);
      orders = order ? [order] : [];
    } else if (userPhone) {
      orders = await orderService.getOrdersByUser(userPhone, restaurantId);
    } else {
      // Get all orders for restaurant (recent)
      orders = await orderService.getOrdersByRestaurant(restaurantId, undefined, 50);
    }

    return NextResponse.json(
      {
        success: true,
        data: orders,
        count: orders.length,
      },
      { status: 200 }
    );
  } catch (error) {
    logStructured('error', 'Order GET error', { error });
    return NextResponse.json(errorResponse('Failed to fetch orders'), { status: 500 });
  }
}
