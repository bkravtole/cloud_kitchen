import { Db } from 'mongodb';
import {
  IDeliveryBoy,
  IDeliveryAssignment,
  DeliveryBoyStatus,
} from '@/types';
import { logStructured } from '@/lib/utils';

export class DeliveryService {
  constructor(private db: Db) {}

  /**
   * Register a new delivery boy
   */
  async createDeliveryBoy(data: Omit<IDeliveryBoy, '_id' | 'deliveryBoyId' | 'createdAt' | 'updatedAt'>) {
    const deliveryBoy: IDeliveryBoy = {
      ...data,
      deliveryBoyId: `db_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await this.db.collection('delivery_boys').insertOne(deliveryBoy as any);

    logStructured('info', 'Delivery boy created', {
      deliveryBoyId: deliveryBoy.deliveryBoyId,
      name: deliveryBoy.name,
      restaurantId: deliveryBoy.restaurantId,
    });

    return deliveryBoy;
  }

  /**
   * Get delivery boy by ID
   */
  async getDeliveryBoy(deliveryBoyId: string) {
    return this.db.collection('delivery_boys').findOne({ deliveryBoyId });
  }

  /**
   * Get available delivery boys for a restaurant
   */
  async getAvailableDeliveryBoys(restaurantId: string): Promise<IDeliveryBoy[]> {
    const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);

    return (await this.db
      .collection('delivery_boys')
      .find({
        restaurantId,
        status: DeliveryBoyStatus.ONLINE,
        lastLocationUpdate: { $gte: sixHoursAgo },
      })
      .toArray()) as any as IDeliveryBoy[];
  }

  /**
   * Update delivery boy location
   */
  async updateLocation(
    deliveryBoyId: string,
    latitude: number,
    longitude: number
  ) {
    const result = await this.db.collection('delivery_boys').updateOne(
      { deliveryBoyId },
      {
        $set: {
          latitude,
          longitude,
          lastLocationUpdate: new Date(),
          updatedAt: new Date(),
        },
      }
    );

    logStructured('info', 'Location updated', {
      deliveryBoyId,
      latitude,
      longitude,
    });

    return result;
  }

  /**
   * Update delivery boy status
   */
  async updateDeliveryBoyStatus(deliveryBoyId: string, status: DeliveryBoyStatus) {
    const result = await this.db.collection('delivery_boys').updateOne(
      { deliveryBoyId },
      {
        $set: { status, updatedAt: new Date() },
      }
    );

    logStructured('info', 'Delivery boy status updated', {
      deliveryBoyId,
      status,
    });

    return result;
  }

  /**
   * Assign delivery job to a boy
   * Smart algorithm (nearest + available + highest rating)
   */
  async assignDelivery(
    orderId: string,
    restaurantId: string,
    pickupLat: number,
    pickupLng: number,
    deliveryLat: number,
    deliveryLng: number,
    customerPhone: string,
    customerName: string,
    userName: string,
    deliveryAddress: string,
    orderTotal: number
  ): Promise<IDeliveryAssignment | null> {
    // Get available delivery boys
    const availableBoys = await this.getAvailableDeliveryBoys(restaurantId);

    if (availableBoys.length === 0) {
      logStructured('warn', 'No available delivery boys', { restaurantId });
      return null;
    }

    // Calculate distance for each boy (Haversine formula)
    const boysWithDistance = availableBoys.map((boy) => ({
      ...boy,
      distance: this.calculateDistance(boy.latitude, boy.longitude, pickupLat, pickupLng),
    }));

    // Sort by distance, then by rating (nearest + best rated first)
    boysWithDistance.sort((a, b) => {
      const distDiff = a.distance - b.distance;
      if (Math.abs(distDiff) < 0.5) {
        // Within 0.5km, sort by rating
        return b.avgRating - a.avgRating;
      }
      return distDiff;
    });

    // Assign to nearest available boy
    const selectedBoy = boysWithDistance[0];

    // Calculate ETA (assume avg 25 km/h delivery speed)
    const deliveryDistance = this.calculateDistance(
      pickupLat,
      pickupLng,
      deliveryLat,
      deliveryLng
    );
    const estimatedMinutes = Math.ceil((deliveryDistance / 25) * 60) + 15; // +15 min buffer
    const estimatedDeliveryTime = new Date(Date.now() + estimatedMinutes * 60 * 1000);

    // Create assignment
    const assignment: IDeliveryAssignment = {
      assignmentId: `da_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      orderId,
      deliveryBoyId: selectedBoy.deliveryBoyId,
      restaurantId,
      pickupLat,
      pickupLng,
      deliveryLat,
      deliveryLng,
      status: 'ASSIGNED',
      assignedAt: new Date(),
      customerPhone,
      customerName,
      userName: userName || customerName,
      deliveryAddress,
      orderTotal,
      estimatedDeliveryTime,
      otpVerified: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await this.db.collection('delivery_assignments').insertOne(assignment as any);

    logStructured('info', 'Delivery assigned', {
      assignmentId: assignment.assignmentId,
      orderId,
      deliveryBoyId: selectedBoy.deliveryBoyId,
      estimatedMinutes,
    });

    return assignment;
  }

  /**
   * Get assignment by order ID
   */
  async getAssignmentByOrderId(orderId: string): Promise<IDeliveryAssignment | null> {
    return (await this.db.collection('delivery_assignments').findOne({ orderId })) as any as IDeliveryAssignment | null;
  }

  /**
   * Get active assignments for delivery boy
   */
  async getActiveAssignments(deliveryBoyId: string): Promise<IDeliveryAssignment[]> {
    return (await this.db
      .collection('delivery_assignments')
      .find({
        deliveryBoyId,
        status: { $in: ['ASSIGNED', 'PICKED_UP', 'IN_TRANSIT'] },
      })
      .toArray()) as any as IDeliveryAssignment[];
  }

  /**
   * Update assignment status
   */
  async updateAssignmentStatus(
    assignmentId: string,
    status: 'ASSIGNED' | 'PICKED_UP' | 'IN_TRANSIT' | 'DELIVERED' | 'FAILED'
  ) {
    const update: any = {
      status,
      updatedAt: new Date(),
    };

    if (status === 'PICKED_UP') {
      update.pickedUpAt = new Date();
    } else if (status === 'DELIVERED') {
      update.deliveredAt = new Date();
    }

    const result = await this.db.collection('delivery_assignments').updateOne(
      { assignmentId },
      { $set: update }
    );

    logStructured('info', 'Assignment status updated', {
      assignmentId,
      status,
    });

    return result;
  }

  /**
   * Verify OTP for delivery
   */
  async verifyOTP(assignmentId: string, otp: string): Promise<boolean> {
    const assignment = await this.db.collection('delivery_assignments').findOne({ assignmentId });

    if (!assignment || assignment.otp !== otp) {
      logStructured('warn', 'OTP verification failed', { assignmentId });
      return false;
    }

    await this.db.collection('delivery_assignments').updateOne(
      { assignmentId },
      { $set: { otpVerified: true } }
    );

    return true;
  }

  /**
   * Calculate distance between two coordinates (Haversine formula)
   * Returns distance in kilometers
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return distance;
  }

  /**
   * Get delivery statistics for a restaurant
   */
  async getDeliveryStats(restaurantId: string, days: number = 7) {
    const sinceDatetime = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const stats = await this.db
      .collection('delivery_assignments')
      .aggregate([
        {
          $match: {
            restaurantId,
            createdAt: { $gte: sinceDatetime },
          },
        },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            avgDeliveryTime: {
              $avg: {
                $subtract: ['$deliveredAt', '$assignedAt'],
              },
            },
          },
        },
      ])
      .toArray();

    return stats;
  }
}
