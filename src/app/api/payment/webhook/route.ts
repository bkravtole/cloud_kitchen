'use server';

import { NextResponse, NextRequest } from 'next/server';
import { connectToDatabase } from '@/lib/db/mongodb';
import { OrderService } from '@/lib/services/order';
import { logStructured, errorResponse } from '@/lib/utils';
import crypto from 'crypto';

/**
 * POST /api/payment/webhook
 * Razorpay webhook for payment confirmation
 */
export async function POST(request: NextRequest) {
  try {
    const signature = request.headers.get('X-Razorpay-Signature');
    const body = await request.text();

    if (!signature) {
      logStructured('warn', 'Razorpay webhook missing signature');
      return NextResponse.json({ success: false }, { status: 400 });
    }

    // 1. Verify Signature
    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!secret) {
      logStructured('error', 'RAZORPAY_KEY_SECRET is not defined');
      return NextResponse.json({ success: false }, { status: 500 });
    }

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(body)
      .digest('hex');

    if (signature !== expectedSignature) {
      logStructured('warn', 'Razorpay webhook invalid signature', { signature });
      return NextResponse.json({ success: false }, { status: 401 });
    }

    // 2. Parse Payload
    const payload = JSON.parse(body);
    const { event, payload: data } = payload;
    
    // Razorpay sends payment data inside nested objects (e.g., data.payment.entity)
    const paymentEntity = data?.payment?.entity;
    const orderId = paymentEntity?.notes?.orderId;
    const paymentId = paymentEntity?.id;

    logStructured('info', 'Razorpay webhook received', {
      event,
      orderId,
      paymentId,
    });

    const { db } = await connectToDatabase();
    const orderService = new OrderService(db);

    // 3. Process Events
    if (event === 'payment.captured' || event === 'payment.authorized') {
      if (!orderId) {
        logStructured('warn', 'Payment webhook missing orderId in notes');
        return NextResponse.json({ success: true }, { status: 200 });
      }

      // Update payment status in DB
      await orderService.updatePaymentStatus(orderId, paymentId, 'AUTHORIZED');

      logStructured('info', 'Payment confirmed and updated', {
        orderId,
        paymentId,
      });

      // TODO: Trigger WhatsApp notifications here
    } 
    else if (event === 'payment.failed') {
      if (orderId) {
        await orderService.updatePaymentStatus(orderId, paymentId, 'FAILED');
        logStructured('info', 'Payment marked as failed', { orderId, paymentId });
      }
    }

    return NextResponse.json({ success: true }, { status: 200 });

  } catch (error) {
    logStructured('error', 'Razorpay webhook processing failed', { 
      message: error instanceof Error ? error.message : 'Unknown error' 
    });
    return NextResponse.json(errorResponse('Webhook processing failed', 500), { status: 500 });
  }
}