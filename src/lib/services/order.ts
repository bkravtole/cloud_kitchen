import { Db } from 'mongodb';
import { IOrder, OrderStatus } from '@/types';
import { generateOrderId, logStructured } from '@/lib/utils';
import { getRazorpayService } from './razorpay';

export class OrderService {
  private db: Db;

  constructor(db: Db) {
    this.db = db;
  }

  async createOrder(
    userPhone: string,
    userName: string,
    restaurantId: string,
    restaurantName: string,
    items: any[],
    specialInstructions?: string,
    userEmail?: string
  ): Promise<{ order: IOrder; paymentLink?: string }> {
    try {
      const orderId = generateOrderId();
      const subtotal = items.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
      );
      const tax = Math.round(subtotal * 0.05);
      const deliveryCharges = 30;
      const total = subtotal + tax + deliveryCharges;

      const newOrder: IOrder = {
        orderId,
        userPhone,
        userName,
        restaurantId,
        restaurantName,
        items,
        specialInstructions,
        subtotal,
        tax,
        deliveryCharges,
        total,
        status: OrderStatus.CREATED,
        paymentStatus: 'PENDING',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await this.db.collection<IOrder>('orders').insertOne(newOrder as any);

      logStructured('info', 'Order created', {
        orderId,
        userPhone,
        restaurantId,
        total,
      });

      // Generate payment link
      let paymentLink;
      try {
        const razorpayService = getRazorpayService();
        const { shortUrl, razorpayOrderId } = await razorpayService.generatePaymentLink({
          orderId,
          amount: total,
          customerName: userName,
          customerPhone: userPhone,
          customerEmail: userEmail || 'customer@cloudkitchen.local',
          description: `CloudKitchen Order ${orderId} from ${restaurantName}`,
          redirectUrl: `${process.env.NEXT_PUBLIC_API_URL}/api/payment/success?orderId=${orderId}`,
        });

        // Update order with razorpay ID
        await this.db.collection<IOrder>('orders').updateOne(
          { orderId },
          {
            $set: {
              razorpayOrderId,
            },
          }
        );

        paymentLink = shortUrl;
      } catch (error) {
        logStructured('warn', 'Payment link generation failed', { error, orderId });
        // Continue without payment link - can retry later
      }

      return {
        order: newOrder,
        paymentLink,
      };
    } catch (error) {
      logStructured('error', 'Order creation failed', { error });
      throw error;
    }
  }

  async getOrder(orderId: string, restaurantId: string): Promise<IOrder | null> {
    return await this.db
      .collection<IOrder>('orders')
      .findOne({ orderId, restaurantId });
  }

  async getOrdersByUser(
    userPhone: string,
    restaurantId: string,
    limit: number = 10
  ): Promise<IOrder[]> {
    return await this.db
      .collection<IOrder>('orders')
      .find({ userPhone, restaurantId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();
  }

  async getOrdersByRestaurant(
    restaurantId: string,
    status?: OrderStatus,
    limit: number = 50
  ): Promise<IOrder[]> {
    const query: any = { restaurantId };
    if (status) {
      query.status = status;
    }

    return await this.db
      .collection<IOrder>('orders')
      .find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();
  }

  async updateOrderStatus(
    orderId: string,
    restaurantId: string,
    newStatus: OrderStatus
  ): Promise<IOrder | null> {
    return (
      await this.db.collection<IOrder>('orders').findOneAndUpdate(
        { orderId, restaurantId },
        {
          $set: {
            status: newStatus,
            updatedAt: new Date(),
            ...(newStatus === OrderStatus.DELIVERED && {
              completedAt: new Date(),
            }),
          },
        },
        { returnDocument: 'after' }
      )
    ).value as IOrder | null;
  }

  async updatePaymentStatus(
    orderId: string,
    paymentId: string,
    status: 'AUTHORIZED' | 'FAILED' | 'REFUNDED'
  ): Promise<IOrder | null> {
    const newOrderStatus = status === 'AUTHORIZED' ? OrderStatus.CONFIRMED : OrderStatus.FAILED;

    return (
      await this.db.collection<IOrder>('orders').findOneAndUpdate(
        { orderId },
        {
          $set: {
            paymentStatus: status,
            paymentId,
            status: newOrderStatus,
            updatedAt: new Date(),
          },
        },
        { returnDocument: 'after' }
      )
    ).value as IOrder | null;
  }
}

export async function initializeOrderService(db: Db): Promise<OrderService> {
  return new OrderService(db);
}
