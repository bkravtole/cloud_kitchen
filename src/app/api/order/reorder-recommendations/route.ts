import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db/mongodb';

/**
 * GET /api/order/reorder-recommendations
 * 
 * Get reorder suggestions based on customer's order history
 * 
 * Query params:
 * - userPhone: string (required)
 * - restaurantId: string (required)
 * 
 * Returns:
 * {
 *   success: boolean,
 *   data: {
 *     frequentItems: Array({ itemId, name, price, timesOrdered }),
 *     lastOrdered: Array({ itemId, name, price, orderedAt }),
 *     recommendations: Array({ itemId, name, price, reason })
 *   }
 * }
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userPhone = searchParams.get('userPhone');
    const restaurantId = searchParams.get('restaurantId');

    if (!userPhone || !restaurantId) {
      return NextResponse.json(
        { success: false, error: 'userPhone and restaurantId are required' },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();
    const ordersCollection = db.collection('orders');
    const menusCollection = db.collection('menus');

    // Get customer's orders from this restaurant
    const orders = await ordersCollection
      .find({
        userPhone,
        restaurantId,
        status: 'DELIVERED',
      })
      .sort({ createdAt: -1 })
      .limit(20)
      .toArray();

    if (orders.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          frequentItems: [],
          lastOrdered: [],
          recommendations: [],
        },
      });
    }

    // Analyze items frequency
    const itemFrequency = new Map<string, { name: string; price: number; count: number; itemId: string }>();

    orders.forEach((order: any) => {
      order.items?.forEach((item: any) => {
        const key = item.itemId || item.name;
        if (!itemFrequency.has(key)) {
          itemFrequency.set(key, {
            itemId: item.itemId,
            name: item.name,
            price: item.price,
            count: 0,
          });
        }
        const existing = itemFrequency.get(key)!;
        existing.count += 1;
      });
    });

    // Get frequent items (ordered 2+ times)
    const frequentItems = Array.from(itemFrequency.values())
      .filter((item) => item.count >= 2)
      .sort((a, b) => b.count - a.count)
      .map((item) => ({
        itemId: item.itemId,
        name: item.name,
        price: item.price,
        timesOrdered: item.count,
      }));

    // Get last ordered items
    const lastOrderedSet = new Set<string>();
    const lastOrdered: any[] = [];

    orders.slice(0, 3).forEach((order: any) => {
      order.items?.forEach((item: any) => {
        const key = item.itemId || item.name;
        if (!lastOrderedSet.has(key) && lastOrdered.length < 5) {
          lastOrderedSet.add(key);
          lastOrdered.push({
            itemId: item.itemId,
            name: item.name,
            price: item.price,
            orderedAt: order.createdAt,
          });
        }
      });
    });

    // Get recommendations (popular items customer hasn't tried)
    const customerItemIds = new Set(itemFrequency.keys());
    
    const popularItems = await menusCollection
      .find({
        restaurantId,
        isAvailable: true,
        itemId: { $nin: Array.from(customerItemIds) }, // Items not ordered before
      })
      .sort({ rating: -1 })
      .limit(5)
      .toArray();

    const recommendations = popularItems.map((item: any) => ({
      itemId: item.itemId,
      name: item.name,
      price: item.price,
      reason: frequentItems.length > 0 
        ? `Similar to your favorite: ${frequentItems[0].name}`
        : 'Popular on our menu',
    }));

    return NextResponse.json({
      success: true,
      data: {
        frequentItems: frequentItems.slice(0, 5),
        lastOrdered: lastOrdered.slice(0, 5),
        recommendations: recommendations.slice(0, 5),
      },
    });
  } catch (error: any) {
    console.error('Reorder recommendations error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
