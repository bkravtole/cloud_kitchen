// User Types
export interface IUser {
  _id?: string;
  phone: string;
  name: string;
  email?: string;
  preferences: {
    spiceLevel: 1 | 2 | 3 | 4 | 5;
    dietaryRestrictions: string[];
    language: 'en' | 'hi';
  };
  createdAt?: Date;
  updatedAt?: Date;
}

// Restaurant Types
export interface IRestaurant {
  _id?: string;
  restaurantId: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  cuisineType: string[];
  operatingHours: {
    open: string;
    close: string;
  };
  coordinates: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
  };
  rating: number;
  totalOrders: number;
  createdAt?: Date;
  updatedAt?: Date;
}

// Menu Item Types
export interface IMenuItem {
  _id?: string;
  itemId: string;
  restaurantId: string;
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  category: string;
  tags: string[]; // e.g., ['spicy', 'vegan', 'bestseller']
  image?: string;
  spiceLevel: 1 | 2 | 3 | 4 | 5;
  serves: number;
  isAvailable: boolean;
  preparationTime: number; // in minutes
  addons?: {
    name: string;
    price: number;
  }[];
  createdAt?: Date;
  updatedAt?: Date;
}

// Cart Types
export interface ICartItem {
  itemId: string;
  name: string;
  price: number;
  quantity: number;
  addons?: {
    name: string;
    price: number;
    quantity: number;
  }[];
  specialInstructions?: string;
}

export interface ICart {
  _id?: string;
  userPhone: string;
  restaurantId: string;
  restaurantName: string;
  items: ICartItem[];
  subtotal: number;
  tax: number;
  deliveryCharges: number;
  total: number;
  expiresAt: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

// Order Types
export enum OrderStatus {
  CREATED = 'CREATED',
  PAYMENT_PENDING = 'PAYMENT_PENDING',
  CONFIRMED = 'CONFIRMED',
  PREPARING = 'PREPARING',
  READY = 'READY',
  ASSIGNED = 'ASSIGNED',
  PICKED_UP = 'PICKED_UP',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
  FAILED = 'FAILED',
}

export interface IOrder {
  _id?: string;
  orderId: string;
  userPhone: string;
  userName: string;
  restaurantId: string;
  restaurantName: string;
  items: ICartItem[];
  specialInstructions?: string;
  subtotal: number;
  tax: number;
  deliveryCharges: number;
  total: number;
  status: OrderStatus;
  paymentStatus: 'PENDING' | 'AUTHORIZED' | 'FAILED' | 'REFUNDED';
  paymentId?: string;
  razorpayOrderId?: string;
  deliveryBoyId?: string;
  estimatedDeliveryTime?: number; // in minutes
  createdAt?: Date;
  updatedAt?: Date;
  completedAt?: Date;
}

// Delivery System Types

/**
 * Delivery Boy Status Enum
 */
export enum DeliveryBoyStatus {
  OFFLINE = 'OFFLINE',            // Not available
  ONLINE = 'ONLINE',              // Available for orders
  ON_DELIVERY = 'ON_DELIVERY',    // Currently delivering
  BREAK = 'BREAK',                // Break time
}

/**
 * Delivery Boy Document
 */
export interface IDeliveryBoy {
  _id?: string;
  deliveryBoyId: string;           // Unique identifier (db_001)
  name: string;
  phone: string;                    // Contact number
  email?: string;
  status: DeliveryBoyStatus;        // Current status
  restaurantId: string;             // Assigned restaurant
  
  // Location
  latitude: number;                 // Last known latitude
  longitude: number;                // Last known longitude
  lastLocationUpdate: Date;         // When location was last updated
  
  // Rating
  avgRating: number;                // 1-5 stars
  totalDeliveries: number;          // Lifetime deliveries
  
  // Vehicle
  vehicleType: 'bike' | 'scooter' | 'car';
  vehicleNumber?: string;           // License plate
  
  // Documents
  licenseNumber?: string;
  aadharNumber?: string;
  
  // Payment
  totalEarnings: number;            // In rupees
  bankAccount?: string;             // For payments
  
  // Timestamps
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Delivery Assignment Document
 */
export interface IDeliveryAssignment {
  _id?: string;
  assignmentId: string;             // Unique (da_001)
  orderId: string;                  // Order being delivered
  deliveryBoyId: string;            // Assigned delivery boy
  restaurantId: string;             // Which restaurant
  
  // Locations
  pickupLat?: number;               // Restaurant location
  pickupLng?: number;
  deliveryLat?: number;             // Customer location
  deliveryLng?: number;
  
  // Status
  status: 'ASSIGNED' | 'PICKED_UP' | 'IN_TRANSIT' | 'DELIVERED' | 'FAILED';
  
  // Tracking
  assignedAt: Date;
  pickedUpAt?: Date;
  deliveredAt?: Date;
  
  // ETA
  estimatedDeliveryTime: Date;      // Calculated ETA
  actualDeliveryTime?: Date;
  
  // Details
  customerPhone: string;
  customerName: string;
  userName: string;
  deliveryAddress: string;
  orderTotal: number;
  
  // Proof
  deliveryProof?: string;           // Photo URL
  otp?: string;                     // One-time password for verification
  otpVerified: boolean;
  
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Location Update (sent via SSE stream)
 */
export interface ILocationUpdate {
  deliveryBoyId: string;
  latitude: number;
  longitude: number;
  timestamp: Date;
  accuracy?: number;                // GPS accuracy in meters
}

/**
 * Delivery Tracking for Customer
 */
export interface IDeliveryTracking {
  assignmentId: string;
  deliveryBoyId: string;
  deliveryBoyName: string;
  deliveryBoyPhone: string;
  vehicleType: string;
  vehicleNumber?: string;
  
  status: string;
  latitude: number;
  longitude: number;
  
  pickupAddress: string;
  deliveryAddress: string;
  
  estimatedDeliveryTime: Date;
  distanceRemaining: number;        // In kilometers
}

// Payment Transaction Types
export interface IPaymentTransaction {
  _id?: string;
  orderId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature?: string;
  amount: number;
  currency: string;
  status: 'AUTHORIZED' | 'FAILED' | 'REFUNDED';
  method?: string;
  customerEmail: string;
  customerPhone: string;
  webhookReceived: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

// AI Response Types
export interface AIResponse {
  intent: 'GET_RECOMMENDATION' | 'ORDER' | 'TRACK' | 'QUESTION' | 'MENU' | 'HELP';
  entities: {
    spiceLevel?: number;
    people?: number;
    dietary?: string[];
    category?: string;
    itemName?: string;
  };
  suggestedItems: string[];
  conversationalResponse: string;
  suggestedActions: string[];
  confidence: number;
}

// API Response Types
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  code?: number;
}

// Auth Types
export interface AuthPayload {
  restaurantId: string;
  role: 'admin' | 'staff';
  exp?: number;
}
