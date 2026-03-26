'use server';

import { NextResponse, NextRequest } from 'next/server';
import { connectToDatabase } from '@/lib/db/mongodb';
import { OrderService } from '@/lib/services/order';
import { logStructured, errorResponse } from '@/lib/utils';
import crypto from 'crypto';

/**
 * POST /api/payment/webhook
 * Razorpay webhook for payment confirmation
 * 
 * Verify signature before processing
 */
export async function POST(request: NextRequest) {
  try {
    const signature = request.headers.get('X-Razorpay-Signature');
    const body = await request.text();

    if (!signature) {
      logStructured('warn', 'Razorpay webhook missing signature');
      return NextResponse.json({ success: false }, { status: 400 });
    }

    // Verify signature
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
      .update(body)
      .digest('hex');

    if (signature !== expectedSignature) {
      logStructured('warn', 'Razorpay webhook invalid signature', { signature });
      return NextResponse.json({ success: false }, { status: 401 });
    }

    const payload = JSON.parse(body);
    const { event, payload: data } = payload;

    logStructured('info', 'Razorpay webhook received', {
      event,
      paymentLinkId: data?.payment_link?.id,
    });

    const { db } = await connectToDatabase();
    const orderService = new OrderService(db);

    if (event === 'payment.authorized' || event === 'payment.captured') {
      const orderId = data.notes?.orderId;
      const paymentId = data.id;
      const amount = data.amount ? data.amount / 100 : 0;

      if (!orderId) {
        logStructured('warn', 'Payment webhook missing orderId');
        return NextResponse.json({ success: true }, { status: 200 });
      }

      // Find order to get restaurantId
      const order = await db.collection('orders').findOne({ orderId });
      if (!order) {
        logStructured('warn', 'Order not found for payment', { orderId });
        return NextResponse.json({ success: true }, { status: 200 });
      }

      // Update payment status
      await orderService.updatePaymentStatus(orderId, paymentId, 'AUTHORIZED');

      logStructured('info', 'Payment confirmed', {
        orderId,
        paymentId,
        amount,
      });

      // TODO: Send WhatsApp notification to customer
      // TODO: Send notification to kitchen/restaurant
    } else if (event === 'payment.failed') {
      const orderId = data.notes?.orderId;
      const paymentId = data.id;

      if (orderId) {
        await orderService.updatePaymentStatus(orderId, paymentId, 'FAILED');

        logStructured('info', 'Payment failed', { orderId, paymentId });
        // TODO: Send failure notification
      }
    }

\n    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    logStructured('error', 'Razorpay webhook error', { error });
    return NextResponse.json(errorResponse('Webhook failed', 500), { status: 500 });
  }
}
      }

      logStructured('info', 'Payment confirmed', {
        razorpayOrderId,
        razorpayPaymentId,
        amount,
      });
    }

    return NextResponse.json(
      {
        success: true,
      },
      { status: 200 }
    );
  } catch (error) {
    logStructured('error', 'Razorpay webhook error', { error });
    return NextResponse.json(errorResponse('Webhook processing failed', 500), { status: 500 });
  }
}
