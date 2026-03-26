'use server';

import { NextResponse, NextRequest } from 'next/server';
import { processUserMessage } from '@/lib/services/groq';
import { connectToDatabase } from '@/lib/db/mongodb';
import { logStructured, errorResponse } from '@/lib/utils';
import { MenuService } from '@/lib/services/menu';

/**
 * POST /api/ai/process
 * Process user message with Groq AI
 * 
 * Payload:
 * {
 *   "userMessage": "Show me spicy food",
 *   "restaurantId": "rest_123",
 *   "restaurantName": "My Restaurant",
 *   "userPhone": "919876543210"
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userMessage, restaurantId, restaurantName, userPhone } = body;

    if (!userMessage || !restaurantId || !restaurantName) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();
    const menuService = new MenuService(db);

    // Get restaurant menu
    const menu = await menuService.getMenuByRestaurant(restaurantId);

    if (menu.length === 0) {
      logStructured('warn', 'No menu found for restaurant', { restaurantId });
      return NextResponse.json(
        {
          success: true,
          data: {
            intent: 'HELP',
            entities: {},
            suggestedItems: [],
            conversationalResponse: 'We currently have no menu items available.',
            suggestedActions: ['HELP'],
            confidence: 0,
          },
        },
        { status: 200 }
      );
    }

    // Get user's previous orders (optional)
    const previousOrders = await db
      .collection('orders')
      .find({ userPhone, restaurantId })
      .sort({ createdAt: -1 })
      .limit(5)
      .toArray();

    // Process message with Groq
    const aiResponse = await processUserMessage(userMessage, menu as any, restaurantName, previousOrders);

    // Map suggested items to menu items
    if (aiResponse.suggestedItems.length > 0) {
      const suggestedMenuItems = menu.filter(item =>
        aiResponse.suggestedItems.some(
          suggested => suggested.toLowerCase() === item.name.toLowerCase()
        )
      );
      aiResponse.suggestedItems = suggestedMenuItems.map(item => item.itemId);
    }

    logStructured('info', 'AI processing completed', {
      restaurantId,
      userPhone,
      intent: aiResponse.intent,
      confidence: aiResponse.confidence,
    });

    return NextResponse.json(
      {
        success: true,
        data: aiResponse,
      },
      { status: 200 }
    );
  } catch (error) {
    logStructured('error', 'AI processing error', { error });
    return NextResponse.json(errorResponse('Failed to process message'), { status: 500 });
  }
}
