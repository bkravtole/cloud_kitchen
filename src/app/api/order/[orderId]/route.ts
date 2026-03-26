'use server';

import { NextResponse, NextRequest } from 'next/server';
import { connectToDatabase } from '@/lib/db/mongodb';
import { OrderService } from '@/lib/services/order';
import { logStructured, errorResponse } from '@/lib/utils';
import { sseManager } from '@/lib/sse/connectionManager';
import { OrderStatus } from '@/types';

/**
 * PATCH /api/order/:orderId/status
 * Update order status (for kitchen dashboard)
 */
export async function PATCH(request: NextRequest, { params }: { params: { orderId: string } }) {
  try {
    const { orderId } = params;
    const body = await request.json();
    const { status, restaurantId } = body;

    if (!status || !restaurantId) {
      return NextResponse.json(
        { success: false, error: 'status and restaurantId are required' },
        { status: 400 }
      );
    }

    // Validate status
    if (!Object.values(OrderStatus).includes(status)) {
      return NextResponse.json(
        { success: false, error: `Invalid status: ${status}` },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();
    const orderService = new OrderService(db);

    const updatedOrder = await orderService.updateOrderStatus(orderId, restaurantId, status);

    if (!updatedOrder) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }

    logStructured('info', 'Order status updated', {
      orderId,
      status,
      restaurantId,
    });

    // Broadcast update to kitchen dashboard (SSE)
    sseManager.broadcast('kitchen', {
      event: 'order_updated',
      orderId,
      status,
      timestamp: new Date().toISOString(),
    }, restaurantId);

    // Broadcast update to customer (SSE)
    if (updatedOrder.userPhone) {
      sseManager.broadcast('customer', {
        event: 'order_updated',
        orderId,
        status,
        timestamp: new Date().toISOString(),
      }, updatedOrder.userPhone);
    }

    return NextResponse.json(
      {
        success: true,
        data: updatedOrder,
      },
      { status: 200 }
    );
  } catch (error) {
    logStructured('error', 'Order PATCH error', { error });
    return NextResponse.json(errorResponse('Failed to update order'), { status: 500 });
  }
}
