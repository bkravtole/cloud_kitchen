import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db/mongodb';

/**
 * GET /api/order/history
 * 
 * Get past orders for a customer
 * 
 * Query params:
 * - userPhone: string (required)
 * - limit: number (default: 20)
 * - skip: number (default: 0)
 * 
 * Returns:
 * {
 *   success: boolean,
 *   data: Array({
 *     orderId: string,
 *     restaurantId: string,
 *     restaurantName: string,
 *     items: Array,
 *     total: number,
 *     status: string,
 *     createdAt: Date
 *   }),
 *   pagination: { total, limit, skip }
 * }
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userPhone = searchParams.get('userPhone');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = parseInt(searchParams.get('skip') || '0');

    if (!userPhone) {
      return NextResponse.json(
        { success: false, error: 'userPhone is required' },
        { status: 400 }
      );
    }

    const db = await connectToDatabase();
    const ordersCollection = db.collection('orders');
    const restaurantsCollection = db.collection('restaurants');

    // Get total count
    const total = await ordersCollection.countDocuments({
      userPhone,
      status: { $in: ['CONFIRMED', 'PREPARING', 'READY', 'DELIVERED'] },
    });

    // Get paginated orders
    const orders = await ordersCollection
      .find({
        userPhone,
        status: { $in: ['CONFIRMED', 'PREPARING', 'READY', 'DELIVERED'] },
      })
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .toArray();

    // Enrich with restaurant names
    const enrichedOrders = await Promise.all(
      orders.map(async (order: any) => {
        const restaurant = await restaurantsCollection.findOne({
          restaurantId: order.restaurantId,
        });

        return {
          orderId: order.orderId,
          restaurantId: order.restaurantId,
          restaurantName: restaurant?.name || 'Unknown Restaurant',
          items: order.items || [],
          total: order.total,
          status: order.status,
          createdAt: order.createdAt,
          itemCount: (order.items || []).length,
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: enrichedOrders,
      pagination: { total, limit, skip },
    });
  } catch (error: any) {
    console.error('Order history error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
