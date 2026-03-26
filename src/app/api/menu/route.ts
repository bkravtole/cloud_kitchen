'use server';

import { NextResponse, NextRequest } from 'next/server';
import { connectToDatabase } from '@/lib/db/mongodb';
import { MenuService } from '@/lib/services/menu';
import { IMenuItem } from '@/types';
import { errorResponse, logStructured } from '@/lib/utils';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get('restaurantId');

    if (!restaurantId) {
      return NextResponse.json(
        { success: false, error: 'restaurantId is required' },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();
    const menuService = new MenuService(db);

    const menu = await menuService.getMenuByRestaurant(restaurantId);

    return NextResponse.json(
      {
        success: true,
        data: menu,
        count: menu.length,
      },
      { status: 200 }
    );
  } catch (error) {
    logStructured('error', 'Menu GET error', { error });
    return NextResponse.json(errorResponse('Failed to fetch menu'), { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { restaurantId, name, price, category, tags, isAvailable, spiceLevel, serves, itemId } = body;

    // Validation
    if (!restaurantId || !name || !price || !category || !itemId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: restaurantId, name, price, category, itemId',
        },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();
    const menuService = new MenuService(db);

    const newItem: Omit<IMenuItem, '_id' | 'createdAt' | 'updatedAt'> = {
      itemId,
      restaurantId,
      name,
      description: body.description || '',
      price: parseFloat(price),
      category,
      tags: tags || [],
      spiceLevel: (parseInt(spiceLevel) || 3) as 1 | 2 | 3 | 4 | 5,
      serves: parseInt(serves) || 1,
      isAvailable: isAvailable !== false,
      preparationTime: body.preparationTime || 15,
    };

    const result = await menuService.addMenuItem(newItem);

    logStructured('info', 'Menu item created', { itemId, restaurantId });

    return NextResponse.json(
      {
        success: true,
        data: { ...newItem, _id: result.insertedId },
      },
      { status: 201 }
    );
  } catch (error) {
    logStructured('error', 'Menu POST error', { error });
    return NextResponse.json(errorResponse('Failed to create menu item'), { status: 500 });
  }
}
