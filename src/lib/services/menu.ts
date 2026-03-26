import { connectToDatabase } from '@/lib/db/mongodb';
import { IMenuItem } from '@/types';
import { Db } from 'mongodb';

export interface MenuServiceOptions {
  db: Db;
}

export class MenuService {
  private db: Db;

  constructor(db: Db) {
    this.db = db;
  }

  async addMenuItem(item: Omit<IMenuItem, '_id' | 'createdAt' | 'updatedAt'>) {
    return await this.db.collection<IMenuItem>('menus').insertOne({
      ...item,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);
  }

  async getMenuByRestaurant(restaurantId: string) {
    return await this.db
      .collection<IMenuItem>('menus')
      .find({ restaurantId, isAvailable: true })
      .toArray();
  }

  async getMenuItemById(itemId: string) {
    return await this.db.collection<IMenuItem>('menus').findOne({ itemId });
  }

  async updateMenuItem(itemId: string, updates: Partial<IMenuItem>) {
    return await this.db
      .collection<IMenuItem>('menus')
      .findOneAndUpdate(
        { itemId },
        {
          $set: {
            ...updates,
            updatedAt: new Date(),
          },
        },
        { returnDocument: 'after' }
      );
  }

  async deleteMenuItem(itemId: string) {
    return await this.db.collection<IMenuItem>('menus').deleteOne({ itemId });
  }

  async searchMenu(restaurantId: string, query: string) {
    return await this.db
      .collection<IMenuItem>('menus')
      .find({
        restaurantId,
        isAvailable: true,
        $text: { $search: query },
      })
      .toArray();
  }

  async getMenuByCategory(restaurantId: string, category: string) {
    return await this.db
      .collection<IMenuItem>('menus')
      .find({ restaurantId, category, isAvailable: true })
      .toArray();
  }

  async getMenuByTags(restaurantId: string, tags: string[]) {
    return await this.db
      .collection<IMenuItem>('menus')
      .find({
        restaurantId,
        isAvailable: true,
        tags: { $in: tags },
      })
      .toArray();
  }
}

export async function initializeMenuService(): Promise<MenuService> {
  const { db } = await connectToDatabase();
  return new MenuService(db);
}
