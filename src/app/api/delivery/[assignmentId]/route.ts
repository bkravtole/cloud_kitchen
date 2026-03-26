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

    // Validate status transitions
    const validTransitions: Record<string, string[]> = {
      ASSIGNED: ['PICKED_UP', 'FAILED'],
      PICKED_UP: ['IN_TRANSIT', 'FAILED'],
      IN_TRANSIT: ['DELIVERED', 'FAILED'],
      DELIVERED: [],
      FAILED: [],
    };

    if (!validTransitions[assignment.status]?.includes(status)) {
      return NextResponse.json(
        errorResponse(`Cannot transition from ${assignment.status} to ${status}`),
        { status: 400 }
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

    logStructured('info', 'Delivery status updated', {
      assignmentId,
      oldStatus: assignment.status,
      newStatus: status,
    });

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
  _request: NextRequest,
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
        assignment,
        deliveryBoy: deliveryBoy ? {
          name: deliveryBoy.name,
          phone: deliveryBoy.phone,
          vehicleType: deliveryBoy.vehicleType,
          vehicleNumber: deliveryBoy.vehicleNumber,
          rating: deliveryBoy.avgRating,
          totalDeliveries: deliveryBoy.totalDeliveries,
        } : null,
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
