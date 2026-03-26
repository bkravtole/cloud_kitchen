import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db/mongodb';
import { IMenuItem } from '@/types';
import {
  getAdvancedRecommendations,
  getMealCombinations,
  analyzeUserPreferences,
  getTrendingRecommendations,
} from '@/lib/services/advanced-recommendations';

/**
 * GET /api/recommendations/advanced
 *
 * Get AI-powered personalized recommendations based on:
 * - User preferences and dietary restrictions
 * - Order history and patterns
 * - Time of day and season
 * - Meal combinations
 * - Trending items
 *
 * Query params:
 * - userPhone: string (required for personalized)
 * - restaurantId: string (required)
 * - includeCombo: boolean (default: true) - include meal combinations
 * - includeTrending: boolean (default: true) - include trending items
 * - limit: number (default: 5)
 *
 * Response:
 * {
 *   success: boolean,
 *   data: {
 *     personalized: [...],
 *     combinations: [...],
 *     trending: [...],
 *     userProfile: {...}
 *   }
 * }
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userPhone = searchParams.get('userPhone');
    const restaurantId = searchParams.get('restaurantId');
    const includeCombo = searchParams.get('includeCombo') !== 'false';
    const includeTrending = searchParams.get('includeTrending') !== 'false';
    const limit = parseInt(searchParams.get('limit') || '5');

    if (!restaurantId) {
      return NextResponse.json(
        { success: false, error: 'restaurantId is required' },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();
    const menusCollection = db.collection('menus');
    const ordersCollection = db.collection('orders');

    // Get available menu
    const menu = (await menusCollection
      .find({ restaurantId, isAvailable: true })
      .limit(100)
      .toArray()) as any[] as IMenuItem[];

    if (menu.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          personalized: [],
          combinations: [],
          trending: [],
        },
      });
    }

    const result: any = {
      personalized: [],
      combinations: [],
      trending: [],
    };

    // If userPhone provided, get personalized recommendations
    if (userPhone) {
      // Get user's order history
      const userOrders = await ordersCollection
        .find({
          userPhone,
          restaurantId,
          status: 'DELIVERED',
        })
        .sort({ createdAt: -1 })
        .limit(20)
        .toArray();

      // Build order patterns
      const itemFrequency = new Map<string, { count: number; dates: Date[] }>();
      const orderedItems: any[] = [];

      userOrders.forEach((order: any) => {
        order.items?.forEach((item: any) => {
          orderedItems.push(item);
          const key = item.name;

          if (!itemFrequency.has(key)) {
            itemFrequency.set(key, { count: 0, dates: [] });
          }

          const entry = itemFrequency.get(key)!;
          entry.count++;
          entry.dates.push(new Date(order.createdAt));
        });
      });

      // Determine average time of order
      const getTimeOfDay = (dates: Date[]) => {
        const hours = dates.map(d => d.getHours());
        const avgHour = hours.reduce((a, b) => a + b, 0) / hours.length;

        if (avgHour >= 6 && avgHour < 12) return 'morning';
        if (avgHour >= 12 && avgHour < 17) return 'afternoon';
        if (avgHour >= 17 && avgHour < 21) return 'evening';
        return 'night';
      };

      const orderPatterns = Array.from(itemFrequency.entries()).map(([name, data]) => ({
        itemName: name,
        timesOrdered: data.count,
        lastOrderedDate: data.dates[0],
        avgTimeOfOrder: getTimeOfDay(data.dates),
        averageSpend: menu.find(m => m.name === name)?.price || 0,
      }));

      // Analyze user preferences
      const userPreferences = analyzeUserPreferences(orderedItems);

      // Get AI recommendations
      const personalized = await getAdvancedRecommendations(
        userPreferences,
        orderPatterns,
        menu,
        limit
      );

      result.personalized = personalized;
      result.userProfile = {
        totalOrders: userOrders.length,
        favoriteCategories: userPreferences.favoriteCategories,
        spicePreference: userPreferences.spicePreference,
        dietaryRestrictions: userPreferences.dietaryRestrictions,
      };

      // Get meal combinations if requested
      if (includeCombo && personalized.length > 0) {
        const primaryItem = menu.find(m => m.name === personalized[0].name);
        if (primaryItem) {
          try {
            const combinations = await getMealCombinations(primaryItem, menu, 3);
            result.combinations = combinations.items.map((item: any) => ({
              itemId: item.itemId,
              name: item.name,
              price: item.price,
              reasoning: combinations.reasoning,
              confidence: 0.9,
              category: item.category,
              tags: item.tags,
            }));
          } catch (error) {
            console.error('Combination error:', error);
          }
        }
      }
    }

    // Get trending items if requested
    if (includeTrending) {
      try {
        const recentOrders = await ordersCollection
          .find({
            restaurantId,
            status: 'DELIVERED',
            createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }, // Last 7 days
          })
          .toArray();

        const trendingItems = new Map<string, number>();
        recentOrders.forEach((order: any) => {
          order.items?.forEach((item: any) => {
            trendingItems.set(item.name, (trendingItems.get(item.name) || 0) + 1);
          });
        });

        const trending = await getTrendingRecommendations(
          Array.from(trendingItems.entries())
            .map(([name, count]) => ({ itemName: name, count }))
            .sort((a, b) => b.count - a.count),
          menu,
          3
        );

        result.trending = trending;
      } catch (error) {
        console.error('Trending error:', error);
      }
    }

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('Advanced recommendations error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
