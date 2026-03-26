'use server';

import { NextResponse, NextRequest } from 'next/server';
import { connectToDatabase } from '@/lib/db/mongodb';
import { MenuService } from '@/lib/services/menu';
import { processUserMessage } from '@/lib/services/groq';
import { get11zaService } from '@/lib/services/11za';
import { logStructured, formatPhoneNumber } from '@/lib/utils';

/**
 * POST /api/webhook/11za
 * Receives WhatsApp messages from 11za
 * Handles multiple payload format variations from 11za
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Extract fields from various possible formats
    const from = body.from || body.sender || body.phone;
    const messageId = body.messageId || body.wamid || body.id || '';
    
    // Try multiple field names for message content
    let text = body.text || body.body || body.message || '';
    
    // 11za real payload has 'content' field
    if (!text && body.content) {
      text = typeof body.content === 'string' 
        ? body.content 
        : JSON.stringify(body.content);
    }

    logStructured('info', '11za webhook received', {
      from,
      messageId,
      textProvided: !!text,
      contentField: body.content ? typeof body.content : 'missing',
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
        bodyKeys: Object.keys(body),
      });
      
      // Still send acknowledgment but don't process
      const ackMessage = "Thanks for your message! Please send a text description of what you'd like to order.";
      try {
        await get11zaService().sendTextMessage(from, ackMessage);
      } catch (e: any) {
        logStructured('error', 'Failed to send ack message', { 
          error: e?.message || String(e),
          stack: e?.stack 
        });
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
      // Validate and format phone number
      let fromPhone: string;
      try {
        fromPhone = formatPhoneNumber(from);
      } catch (phoneError: any) {
        logStructured('warn', 'Phone number format error', {
          originalNumber: from,
          error: phoneError?.message
        });
        // Use raw phone number if formatting fails
        fromPhone = from.replace(/\D/g, '');
      }
      
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
    } catch (processError: any) {
      logStructured('error', 'Error processing 11za message', { 
        error: processError?.message || String(processError),
        stack: processError?.stack,
        type: typeof processError
      });
      // Still return 200 to acknowledge receipt
      return NextResponse.json({ success: true }, { status: 200 });
    }
  } catch (error: any) {
    logStructured('error', '11za webhook error', { 
      error: error?.message || String(error),
      stack: error?.stack,
      type: typeof error
    });
    return NextResponse.json({ success: true }, { status: 200 }); // Always return 200
  }
}
