import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db/mongodb';

/**
 * GET /api/analytics/overview
 * 
 * Get high-level analytics for restaurant
 * 
 * Query params:
 * - restaurantId: string (required)
 * - dateRange: 'today' | 'week' | 'month' (default: 'today')
 * 
 * Returns:
 * {
 *   success: boolean,
 *   data: {
 *     totalOrders: number,
 *     totalRevenue: number,
 *     averageOrderValue: number,
 *     conversionRate: number,
 *     topItems: Array({ itemId, name, quantity, revenue }),
 *     ordersByStatus: Object({ CONFIRMED, PREPARING, READY, DELIVERED }),
 *     ordersByHour: Array({ hour, count })
 *   }
 * }
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get('restaurantId');
    const dateRange = searchParams.get('dateRange') || 'today';

    if (!restaurantId) {
      return NextResponse.json(
        { success: false, error: 'restaurantId is required' },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();
    const ordersCollection = db.collection('orders');

    // Calculate date range
    const now = new Date();
    let startDate = new Date();

    switch (dateRange) {
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'today':
      default:
        startDate.setHours(0, 0, 0, 0);
        break;
    }

    // Get all orders in date range
    const orders = await ordersCollection
      .find({
        restaurantId,
        createdAt: { $gte: startDate, $lte: now },
        status: { $in: ['CONFIRMED', 'PREPARING', 'READY', 'DELIVERED'] },
      })
      .toArray();

    // Calculate metrics
    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((sum: number, order: any) => sum + (order.total || 0), 0);
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Group by status
    const ordersByStatus = {
      CONFIRMED: orders.filter((o: any) => o.status === 'CONFIRMED').length,
      PREPARING: orders.filter((o: any) => o.status === 'PREPARING').length,
      READY: orders.filter((o: any) => o.status === 'READY').length,
      DELIVERED: orders.filter((o: any) => o.status === 'DELIVERED').length,
    };

    // Top items
    const itemMap = new Map<string, any>();
    orders.forEach((order: any) => {
      order.items?.forEach((item: any) => {
        const key = item.itemId || item.name;
        if (!itemMap.has(key)) {
          itemMap.set(key, {
            itemId: item.itemId,
            name: item.name,
            quantity: 0,
            revenue: 0,
          });
        }
        const existing = itemMap.get(key)!;
        existing.quantity += item.quantity || 1;
        existing.revenue += (item.price * (item.quantity || 1)) || 0;
      });
    });

    const topItems = Array.from(itemMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // Orders by hour
    const hourMap = new Map<number, number>();
    for (let i = 0; i < 24; i++) {
      hourMap.set(i, 0);
    }

    orders.forEach((order: any) => {
      const hour = new Date(order.createdAt).getHours();
      hourMap.set(hour, (hourMap.get(hour) || 0) + 1);
    });

    const ordersByHour = Array.from(hourMap.entries()).map(([hour, count]) => ({
      hour,
      count,
    }));

    return NextResponse.json({
      success: true,
      data: {
        totalOrders,
        totalRevenue: totalRevenue.toFixed(2),
        averageOrderValue: averageOrderValue.toFixed(2),
        conversionRate: totalOrders > 0 ? 95 : 0, // Placeholder
        topItems,
        ordersByStatus,
        ordersByHour,
      },
    });
  } catch (error: any) {
    console.error('Analytics overview error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
