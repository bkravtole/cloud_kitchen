'use server';

import { NextResponse, NextRequest } from 'next/server';
import { connectToDatabase } from '@/lib/db/mongodb';
import { MenuService } from '@/lib/services/menu';
import { processUserMessage } from '@/lib/services/groq';
import { get11zaService } from '@/lib/services/11za';
import { logStructured, formatPhoneNumber } from '@/lib/utils';

// Change '11za' to 'ElevenZa' or 'Webhook11za'
interface ElevenZaWebhookPayload {
  from: string;
  text: string;
  messageId: string;
  timestamp: number;
  type?: 'text' | 'button_response' | 'list_response';
}

/**
 * POST /api/webhook/11za
 * Receives WhatsApp messages from 11za
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { from, text, messageId, type } = body as ElevenZaWebhookPayload;

    if (!from || !text || !messageId) {
      logStructured('warn', '11za webhook missing fields', { from, messageId });
      return NextResponse.json({ success: true }, { status: 200 }); // Return 200 to ack
    }

    logStructured('info', '11za message received', {
      from,
      messageId,
      text: text.substring(0, 50),
      type,
    });

    try {
      const fromPhone = formatPhoneNumber(from);
      const restaurantId = 'rest_001'; // TODO: Get from user preferences/database

      const { db } = await connectToDatabase();
      const menuService = new MenuService(db);

      // Get menu for restaurant
      const menu = await menuService.getMenuByRestaurant(restaurantId);

      if (!menu || menu.length === 0) {
        await get11zaService().sendTextMessage(
          fromPhone,
          "Sorry, the menu is not available right now. Please try again later."
        );
        return NextResponse.json({ success: true }, { status: 200 });
      }

      // Get previous orders
      const previousOrders = await db
        .collection('orders')
        .find({ userPhone: fromPhone, restaurantId })
        .sort({ createdAt: -1 })
        .limit(3)
        .toArray();

      // Process message with AI
      const aiResponse = await processUserMessage(
        text,
        menu as any,
        'CloudKitchen',
        previousOrders
      );

      logStructured('info', 'AI processing complete', {
        intent: aiResponse.intent,
        confidence: aiResponse.confidence,
      });

      // Format and send response
      let responseMessage = aiResponse.conversationalResponse;

      if (aiResponse.suggestedItems && aiResponse.suggestedItems.length > 0) {
        const suggestedMenuItems = menu.filter(item =>
          aiResponse.suggestedItems.some(
            id => id.toLowerCase() === item.itemId.toLowerCase()
          )
        );

       if (suggestedMenuItems.length > 0) {
  // Using backticks allows real line breaks
  responseMessage += `*Recommended Items:*`;
  suggestedMenuItems.forEach((item, idx) => {
    responseMessage += `${idx + 1}. ${item.name} - ₹${item.price}\n`;
  });
}
      }

      // Send response
      await get11zaService().sendTextMessage(fromPhone, responseMessage);

      return NextResponse.json({ success: true }, { status: 200 });
    } catch (processError) {
      logStructured('error', 'Error processing 11za message', { processError });
      // Still return 200 to acknowledge receipt
      return NextResponse.json({ success: true }, { status: 200 });
    }
  } catch (error) {
    logStructured('error', '11za webhook error', { error });
    return NextResponse.json({ success: true }, { status: 200 }); // Always return 200
  }
}
