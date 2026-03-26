import Razorpay from 'razorpay';
import { logStructured } from '@/lib/utils';

interface PaymentLinkParams {
  orderId: string;
  amount: number;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  description: string;
  redirectUrl: string;
}

export interface PaymentLinkResponse {
  shortUrl: string;
  razorpayOrderId: string;
  paymentLinkId: string;
}

export class RazorpayService {
  private razorpay: Razorpay;

  constructor() {
    this.razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID!,
      key_secret: process.env.RAZORPAY_KEY_SECRET!,
    });
  }

  async generatePaymentLink(params: PaymentLinkParams): Promise<PaymentLinkResponse> {
    try {
      const paymentLink = await this.razorpay.paymentLink.create({
        amount: Math.round(params.amount * 100), // Convert to paise
        currency: 'INR',
        accept_partial: false,
        customer: {
          name: params.customerName,
          contact: params.customerPhone,
          email: params.customerEmail,
        },
        notify: {
          sms: true,
          email: true,
        },
        reminder_enable: true,
        notes: {
          orderId: params.orderId,
        },
        callback_url: params.redirectUrl,
        callback_method: 'get',
        description: params.description,
      });

      logStructured('info', 'Payment link created', {
        orderId: params.orderId,
        paymentLinkId: paymentLink.id,
        amount: params.amount,
      });

      return {
        shortUrl: paymentLink.short_url,
        razorpayOrderId: paymentLink.id,
        paymentLinkId: paymentLink.id,
      };
    } catch (error) {
      logStructured('error', 'Payment link creation failed', { error, params });
      throw error;
    }
  }

  async verifyPaymentLink(paymentLinkId: string): Promise<any> {
    try {
      const paymentLink = await this.razorpay.paymentLink.fetch(paymentLinkId);
      return paymentLink;
    } catch (error) {
      logStructured('error', 'Failed to fetch payment link', { error, paymentLinkId });
      throw error;
    }
  }
}

export function getRazorpayService(): RazorpayService {
  return new RazorpayService();
}
