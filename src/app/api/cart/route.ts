'use server';

import { NextResponse, NextRequest } from 'next/server';
import { connectToDatabase } from '@/lib/db/mongodb';
import { CartService } from '@/lib/services/cart';
import { logStructured, errorResponse } from '@/lib/utils';

// GET /api/cart?userPhone=919876543210&restaurantId=rest_123
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userPhone = searchParams.get('userPhone');
    const restaurantId = searchParams.get('restaurantId');

    if (!userPhone || !restaurantId) {
      return NextResponse.json(
        { success: false, error: 'userPhone and restaurantId are required' },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();
    const cartService = new CartService(db);

    const cart = await cartService.getCart(userPhone, restaurantId);

    if (!cart) {
      return NextResponse.json(
        { success: true, data: null, message: 'No active cart' },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: cart,
      },
      { status: 200 }
    );
  } catch (error) {
    logStructured('error', 'Cart GET error', { error });
    return NextResponse.json(errorResponse('Failed to fetch cart'), { status: 500 });
  }
}

// POST /api/cart - Add item to cart
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userPhone, restaurantId, item } = body;

    if (!userPhone || !restaurantId || !item) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();
    const cartService = new CartService(db);

    const updatedCart = await cartService.addItemToCart(userPhone, restaurantId, item);

    logStructured('info', 'Item added to cart', {
      userPhone,
      restaurantId,
      itemId: item.itemId,
    });

    return NextResponse.json(
      {
        success: true,
        data: updatedCart,
      },
      { status: 200 }
    );
  } catch (error) {
    logStructured('error', 'Cart POST error', { error });
    return NextResponse.json(errorResponse('Failed to add item to cart'), { status: 500 });
  }
}
