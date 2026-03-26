import { Db } from 'mongodb';
import { ICart, ICartItem } from '@/types';

export class CartService {
  private db: Db;

  constructor(db: Db) {
    this.db = db;
  }

  async createCart(
    userPhone: string,
    restaurantId: string,
    restaurantName: string
  ): Promise<ICart> {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 2); // 2 hours expiry

    const cart: ICart = {
      userPhone,
      restaurantId,
      restaurantName,
      items: [],
      subtotal: 0,
      tax: 0,
      deliveryCharges: 30, // Default delivery charges
      total: 0,
      expiresAt,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await this.db.collection<ICart>('carts').insertOne(cart as any);
    return { ...cart, _id: result.insertedId.toString() };
  }

  async getCart(userPhone: string, restaurantId: string): Promise<ICart | null> {
    return await this.db
      .collection<ICart>('carts')
      .findOne({ userPhone, restaurantId });
  }

  async addItemToCart(
    userPhone: string,
    restaurantId: string,
    item: ICartItem
  ): Promise<ICart | null> {
    let cart = await this.getCart(userPhone, restaurantId);

    if (!cart) {
      cart = await this.createCart(userPhone, restaurantId, '');
    }

    // Check if item already exists
    const existingItemIndex = cart.items.findIndex(i => i.itemId === item.itemId);

    if (existingItemIndex > -1) {
      // Update quantity
      cart.items[existingItemIndex].quantity += item.quantity;
    } else {
      // Add new item
      cart.items.push(item);
    }

    cart.subtotal = this.calculateSubtotal(cart.items);
    cart.tax = Math.round(cart.subtotal * 0.05); // 5% tax
    cart.total = cart.subtotal + cart.tax + cart.deliveryCharges;
    cart.updatedAt = new Date();

    await this.db
      .collection<ICart>('carts')
      .updateOne(
        { userPhone, restaurantId },
        {
          $set: {
            items: cart.items,
            subtotal: cart.subtotal,
            tax: cart.tax,
            total: cart.total,
            updatedAt: cart.updatedAt,
          },
        }
      );

    return cart;
  }

  async removeItemFromCart(
    userPhone: string,
    restaurantId: string,
    itemId: string
  ): Promise<ICart | null> {
    const cart = await this.getCart(userPhone, restaurantId);

    if (!cart) {
      throw new Error('Cart not found');
    }

    cart.items = cart.items.filter(item => item.itemId !== itemId);
    cart.subtotal = this.calculateSubtotal(cart.items);
    cart.tax = Math.round(cart.subtotal * 0.05);
    cart.total = cart.subtotal + cart.tax + cart.deliveryCharges;
    cart.updatedAt = new Date();

    await this.db
      .collection<ICart>('carts')
      .updateOne(
        { userPhone, restaurantId },
        {
          $set: {
            items: cart.items,
            subtotal: cart.subtotal,
            tax: cart.tax,
            total: cart.total,
            updatedAt: cart.updatedAt,
          },
        }
      );

    return cart;
  }

  async clearCart(userPhone: string, restaurantId: string): Promise<void> {
    await this.db.collection<ICart>('carts').deleteOne({ userPhone, restaurantId });
  }

  async getCartSummary(userPhone: string, restaurantId: string): Promise<any> {
    const cart = await this.getCart(userPhone, restaurantId);

    if (!cart) {
      return null;
    }

    return {
      itemCount: cart.items.length,
      subtotal: cart.subtotal,
      tax: cart.tax,
      deliveryCharges: cart.deliveryCharges,
      total: cart.total,
      expiresAt: cart.expiresAt,
    };
  }

  private calculateSubtotal(items: ICartItem[]): number {
    return items.reduce((sum, item) => {
      let itemTotal = item.price * item.quantity;
      if (item.addons) {
        itemTotal += item.addons.reduce((addonSum, addon) => addonSum + addon.price * addon.quantity, 0);
      }
      return sum + itemTotal;
    }, 0);
  }
}

export async function initializeCartService(db: Db): Promise<CartService> {
  return new CartService(db);
}
