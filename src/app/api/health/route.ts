'use server';

import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db/mongodb';

export async function GET() {
  try {
    const { db } = await connectToDatabase();
    
    // Check database connection
    const adminDb = db.admin();
    await adminDb.ping();

    return NextResponse.json(
      {
        success: true,
        message: 'CloudKitchen API is healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Health check failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Health check failed',
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
