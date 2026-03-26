import { MongoClient, Db } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB = 'cloudkitchen';

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable');
}

interface CachedConnection {
  client: MongoClient | null;
  db: Db | null;
}

const cached: CachedConnection = {
  client: null,
  db: null,
};

export async function connectToDatabase(): Promise<{ client: MongoClient; db: Db }> {
  if (cached.client && cached.db) {
    console.log('✅ Using cached MongoDB connection');
    return { client: cached.client, db: cached.db };
  }

  try {
    console.log('🔄 Connecting to MongoDB...');
    const client = new MongoClient(MONGODB_URI!);
    
    await client.connect();
    console.log('✅ Connected to MongoDB');

    const db = client.db(MONGODB_DB);

    // Create indexes
    await createIndexes(db);

    // Cache connection
    cached.client = client;
    cached.db = db;

    return { client, db };
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    throw error;
  }
}

async function createIndexes(db: Db): Promise<void> {
  try {
    // Users indexes
    await db.collection('users').createIndex({ phone: 1 }, { unique: true });

    // Menu indexes
    await db.collection('menus').createIndex({ restaurantId: 1, isAvailable: 1 });
    await db.collection('menus').createIndex({ tags: 1, restaurantId: 1 });
    await db.collection('menus').createIndex({ category: 1, restaurantId: 1 });

    // Cart indexes
    await db.collection('carts').createIndex({ userPhone: 1, restaurantId: 1 }, { unique: true });
    await db.collection('carts').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });

    // Order indexes
    await db.collection('orders').createIndex({ restaurantId: 1, status: 1 });
    await db.collection('orders').createIndex({ userPhone: 1, createdAt: -1 });
    await db.collection('orders').createIndex({ paymentId: 1 });
    await db.collection('orders').createIndex({ orderId: 1 }, { unique: true });

    // Delivery boys indexes
    await db.collection('delivery_boys').createIndex({ restaurantId: 1, status: 1 });
    await db.collection('delivery_boys').createIndex({ deliveryBoyId: 1 }, { unique: true });
    await db.collection('delivery_boys').createIndex({ phone: 1 });

    // Delivery assignments indexes
    await db.collection('delivery_assignments').createIndex({ orderId: 1 }, { unique: true });
    await db.collection('delivery_assignments').createIndex({ deliveryBoyId: 1 });
    await db.collection('delivery_assignments').createIndex({ restaurantId: 1, status: 1 });
    await db.collection('delivery_assignments').createIndex({ assignmentId: 1 }, { unique: true });
    await db.collection('delivery_assignments').createIndex({ assignedAt: 1 }, { expireAfterSeconds: 604800 }); // TTL: 7 days

    // Payment transactions indexes
    await db.collection('payment_transactions').createIndex({ orderId: 1 }, { unique: true });
    await db.collection('payment_transactions').createIndex({ razorpayPaymentId: 1 }, { unique: true });

    // Restaurant indexes
    await db.collection('restaurants').createIndex({ restaurantId: 1 }, { unique: true });
    await db.collection('restaurants').createIndex({ coordinates: '2dsphere' });

    console.log('✅ Database indexes created');
  } catch (error) {
    console.error('⚠️ Index creation error (may already exist):', error);
  }
}

export async function disconnectFromDatabase(): Promise<void> {
  if (cached.client) {
    await cached.client.close();
    cached.client = null;
    cached.db = null;
    console.log('✅ Disconnected from MongoDB');
  }
}

export function getDatabase(): Db {
  if (!cached.db) {
    throw new Error('Database not connected. Call connectToDatabase() first');
  }
  return cached.db;
}
