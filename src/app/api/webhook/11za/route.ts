'use server';

import { NextResponse, NextRequest } from 'next/server';
import { connectToDatabase } from '@/lib/db/mongodb';
import { MenuService } from '@/lib/services/menu';
import { processUserMessage } from '@/lib/services/groq';
import { get11zaService } from '@/lib/services/11za';
import { logStructured, formatPhoneNumber } from '@/lib/utils';

// 11za WhatsApp webhook payload - handles multiple format variations
interface ElevenZaWebhookPayload {
  from: string;
  text?: string;
  body?: string;
  message?: string;
  content?: string;
  messageId?: string;
  wamid?: string;
  id?: string;
  timestamp?: number;
  type?: 'text' | 'button_response' | 'list_response';
}

/**
 * POST /api/webhook/11za
 * Receives WhatsApp messages from 11za
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Extract fields from various possible formats
    const from = body.from || body.sender || body.phone;
    const text = body.text || body.body || body.message || body.content || '';
    const messageId = body.messageId || body.wamid || body.id || '';

    logStructured('info', '11za webhook received', {
      from,
      messageId,
      textProvided: !!text,
      bodyKeys: Object.keys(body),
    });

    if (!from || !messageId) {
      logStructured('warn', '11za webhook missing required fields', { 
        from, 
        messageId,
        allData: body 
      });
      return NextResponse.json({ success: true }, { status: 200 }); // Return 200 to ack
    }

    // If no text, it might be a media/button message
    if (!text) {
      logStructured('warn', '11za webhook: no text content', {
        from,
        messageId,
        type: body.type,
      });
      
      // Still send acknowledgment but don't process
      const ackMessage = "Thanks for your message! Please send a text description of what you'd like to order.";
      try {
        await get11zaService().sendTextMessage(from, ackMessage);
      } catch (e) {
        logStructured('error', 'Failed to send ack message', { error: e });
      }
      
      return NextResponse.json({ success: true }, { status: 200 });
    }

    logStructured('info', '11za message received with text', {
      from,
      messageId,
      textLength: text.length,
      textPreview: text.substring(0, 50),
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
