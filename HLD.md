# CloudKitchen Platform - Final High-Level Design (HLD)

**Version:** 1.0  
**Date:** March 2026  
**Stack:** Next.js | MongoDB | Groq AI | 11za | Razorpay

---

## 📋 Executive Summary

CloudKitchen is a **WhatsApp-first food ordering platform** powered by AI-driven recommendation engine using Groq. The system enables restaurants to manage orders, inventory, and delivery through an integrated dashboard while customers interact via natural language commands on WhatsApp.

**Key USP:** Intelligent AI-powered food recommendations with intent detection and menu mapping via conversational WhatsApp interface.

---

## 🏗️ System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    CUSTOMER LAYER (WhatsApp)                     │
│                                                                     │
│  User → Natural Language Input → 11za Webhook Handler             │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│              11za MESSAGING & WEBHOOK LAYER                       │
│  • Message Reception  • Button Handling  • List Selections       │
│  • Response Routing   • Session Management                       │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│          NEXT.JS BACKEND (API Layer) - App Router                │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  API Routes (/api/*)                                     │   │
│  │  ├─ /webhook/11za        (Message ingestion)             │   │
│  │  ├─ /auth                (Tenant management)             │   │
│  │  ├─ /menu                (Menu CRUD)                     │   │
│  │  ├─ /order               (Order lifecycle)               │   │
│  │  ├─ /cart                (Cart operations)               │   │
│  │  ├─ /ai/process          (AI request handling)           │   │
│  │  ├─ /payment/webhook     (Razorpay callbacks)            │   │
│  │  └─ /delivery            (Delivery tracking)             │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  BUSINESS LOGIC LAYER                                   │   │
│  │  ├─ AIService         (Groq integration)                │   │
│  │  ├─ MenuService       (Menu management)                 │   │
│  │  ├─ OrderService      (Order orchestration)             │   │
│  │  ├─ CartService       (State management)                │   │
│  │  ├─ PaymentService    (Razorpay integration)            │   │
│  │  ├─ DeliveryService   (Delivery boy assignment)         │   │
│  │  └─ NotificationService (11za outbound)                 │   │
│  └──────────────────────────────────────────────────────────┘   │
└──────────────────────────┬──────────────────────────────────────┘
                           │
              ┌────────────┼─────────────┐
              ↓            ↓             ↓
        ┌──────────┐  ┌─────────┐  ┌────────────┐
        │ MongoDB  │  │ Redis   │  │ Groq API   │
        │ (Primary)│  │(Optional)  │ (LLM)      │
        └──────────┘  └─────────┘  └────────────┘
              
┌─────────────────────────────────────────────────────────────────┐
│     NEXT.JS FRONTEND (Pages/Components) - Kitchen Dashboard      │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Pages:                                                  │   │
│  │  ├─ /dashboard         (Main view)                       │   │
│  │  ├─ /orders            (Active orders)                   │   │
│  │  ├─ /menu-management   (Edit menu)                       │   │
│  │  ├─ /delivery-tracking (Assign delivery boys)            │   │
│  │  └─ /analytics         (Order stats)                     │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 💾 Core Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | Next.js 14+ (App Router) + React | Kitchen Dashboard UI |
| **Backend** | Next.js 14+ (API Routes) | APIs, webhooks, business logic |
| **Database** | MongoDB | All data storage (primary) |
| **Cache/Session** | Redis (optional) | Cart state, session management |
| **AI/LLM** | Groq API | Intent detection, recommendations |
| **Messaging** | 11za SDK | WhatsApp integration |
| **Payments** | Razorpay | Payment processing |
| **Deployment** | Vercel / Self-hosted | Server hosting |

---

## 🧩 Core Modules Deep Dive

### 1. 🧠 AI Service (MANDATORY — Your USP)

**Purpose:** Understand customer intent and provide intelligent recommendations.

#### Architecture
```
Customer Message → Tokenization → Groq Model → JSON Output
                                        ↓
                              {intent, entities, items, message}
```

#### Request Flow
```
POST /api/ai/process

Input:
{
  "userMessage": "Give me some spicy food for 2 people",
  "userId": "91xxxxxxxxxx",
  "restaurantId": "rest_123",
  "previousOrders": [], // For personalization
  "menuContext": [] // Available items
}

Processing Pipeline:
1. Extract Intent → "GET_RECOMMENDATION"
2. Extract Entities → {spiceLevel: "high", people: 2}
3. Query Menu DB → Filter items by tag "spicy", serves: 2
4. Generate Response → Groq creates conversational reply
5. Format for WhatsApp → Buttons/List

Output:
{
  "intent": "GET_RECOMMENDATION",
  "confidence": 0.95,
  "entities": {
    "spiceLevel": "high",
    "servings": 2,
    "category": "food"
  },
  "items": [
    {
      "id": "item_001",
      "name": "Spicy Chicken Biryani",
      "price": 220,
      "tags": ["spicy", "rice", "chicken"]
    },
    {
      "id": "item_002",
      "name": "Paneer Tikka Masala",
      "price": 180,
      "tags": ["spicy", "paneer", "gravy"]
    }
  ],
  "message": "🔥 For 2 people, try these spicy delights...",
  "suggestedActions": ["ADD_TO_CART", "CUSTOMIZE", "SEE_SIMILAR"]
}
```

#### AI Responsibilities
- **Intent Detection:** Classify user intent (order, recommend, track, ask questions)
- **Entity Extraction:** Pull spice level, servings, dietary preferences
- **Menu Matching:** Use tags to find relevant items in MongoDB
- **Upsell Logic:** Suggest complementary items with context
- **Conversation:** Generate human-like responses

#### Prompt Template (Groq)
```
You are a helpful restaurant AI assistant. Current menu has these items: [MENU_JSON]
User said: "[USER_MESSAGE]"
User's previous orders: [HISTORY]

Respond with JSON:
{
  "intent": "RECOMMEND|ORDER|TRACK|QUESTION",
  "spiceLevel": "info from entities",
  "servings": "number",
  "recommendedItems": [ids],
  "response": "friendly message",
  "followUp": "next question"
}
```

---

### 2. 🛒 Cart Service

**Challenge:** WhatsApp is stateless — must persist cart across sessions.

#### Storage Strategy

**Option A (MVP - Recommended):** MongoDB
```javascript
// MongoDB Collection: carts
{
  "_id": ObjectId,
  "userPhone": "919876543210",
  "restaurantId": "rest_123",
  "items": [
    {
      "itemId": "item_001",
      "name": "Biryani",
      "quantity": 1,
      "price": 220,
      "customizations": [
        { "addon": "extra rice", "price": 50 }
      ]
    }
  ],
  "subtotal": 270,
  "tax": 50,
  "total": 320,
  "expiresAt": ISODate("2026-03-25T20:00:00Z"), // 2 hour expiry
  "createdAt": ISODate,
  "updatedAt": ISODate
}
```

**Option B (Scale):** Redis
```
Key: cart:91987654321:rest_123
Type: Hash
Expiry: 2 hours TTL
```

#### Cart Operations
- **Add Item:** POST /api/cart/add
- **Remove Item:** DELETE /api/cart/items/:itemId
- **Update Quantity:** PATCH /api/cart/items/:itemId
- **Get Cart:** GET /api/cart/:userId
- **Clear Cart:** DELETE /api/cart/:userId
- **Checkout:** POST /api/cart/checkout (triggers Order creation)

---

### 3. 📦 Order Service

**Flow:** Cart → Confirm → Payment → Order Created → Kitchen View

#### Order Lifecycle
```
CREATED → PAYMENT_PENDING → CONFIRMED → PREPARING → READY → ASSIGNED → DELIVERED
   ↓
[Payment webhook confirms]
   ↓
[Customer sees "Your order is being prepared"]
   ↓
[Kitchen marks READY]
   ↓
[Delivery boy assigned]
   ↓
[Status updates sent to customer]
```

#### MongoDB Schema
```javascript
// Collection: orders
{
  "_id": ObjectId,
  "orderId": "ord_1234567", // Human-readable
  "userPhone": "919876543210",
  "restaurantId": "rest_123",
  "items": [
    {
      "itemId": "item_001",
      "name": "Spicy Biryani",
      "quantity": 1,
      "price": 220,
      "customizations": []
    }
  ],
  "subtotal": 220,
  "tax": 40,
  "deliveryFee": 50,
  "total": 310,
  "status": "CONFIRMED", // CREATED|PAYMENT_PENDING|CONFIRMED|PREPARING|READY|ASSIGNED|DELIVERED
  "paymentMethod": "razorpay",
  "paymentId": "pay_2Tz3Qg9X7Zq", // Razorpay payment_id
  "paymentStatus": "COMPLETED",
  "deliveryBoyId": "boy_456",
  "deliveryBoyPhone": "919123456789",
  "estimatedDeliveryTime": ISODate,
  "actualDeliveryTime": ISODate,
  "notes": "Make it extra spicy",
  "createdAt": ISODate,
  "updatedAt": ISODate,
  "timestamps": {
    "confirmed": ISODate,
    "preparing": ISODate,
    "ready": ISODate,
    "assigned": ISODate,
    "delivered": ISODate
  }
}
```

#### API Endpoints
```
POST /api/order/create          → Create order from cart
GET /api/order/:orderId          → Get order details
PATCH /api/order/:orderId        → Update order status
GET /api/order/user/:phone       → Get user's orders
POST /api/order/:orderId/rate    → Rate order + leave review
```

---

### 4. 🍽️ Menu Service

**Storage:** MongoDB (indexed by restaurant, tags, availability)

#### MongoDB Schema
```javascript
// Collection: menus
{
  "_id": ObjectId,
  "itemId": "item_001",
  "restaurantId": "rest_123",
  "name": "Spicy Chicken Biryani",
  "description": "Fragrant rice cooked with chicken and spices",
  "category": "RICE_CURRY", // APPETIZERS|RICE_CURRY|GRAVY|BREADS|DESSERTS
  "price": 220,
  "image": "url_to_image",
  "tags": ["spicy", "rice", "chicken", "non-veg", "dum-cooked"],
  "spiceLevel": 3, // 1-5
  "serves": 2,
  "dietaryInfo": ["non-vegetarian"],
  "ingredients": ["chicken", "basmati rice", "yogurt"],
  "isAvailable": true,
  "availableFrom": "11:00", // HH:MM format
  "availableUntil": "22:00",
  "preparationTime": 30, // in minutes
  "calories": 450,
  "addons": [
    {
      "name": "Extra Rice",
      "price": 50,
      "type": "ADDON"
    },
    {
      "name": "Raita (100ml)",
      "price": 30,
      "type": "SIDE"
    }
  ],
  "bestseller": true,
  "rating": 4.5,
  "reviews": 150,
  "createdAt": ISODate,
  "updatedAt": ISODate
}

// Indexes for optimal queries:
// db.menus.createIndex({ restaurantId: 1, isAvailable: 1 })
// db.menus.createIndex({ tags: 1, restaurantId: 1 })
// db.menus.createIndex({ category: 1, restaurantId: 1 })
```

#### API Endpoints
```
GET /api/menu/:restaurantId           → Get all menu items
GET /api/menu/:restaurantId/category/:cat → Get by category
POST /api/menu                         → Create item (admin)
PATCH /api/menu/:itemId                → Update item (admin)
DELETE /api/menu/:itemId               → Delete item (admin)
GET /api/menu/search?q=spicy&rest=rest_123 → Search menu
```

#### AI Integration
- AI queries this collection to find matching items based on tags
- Tags heavily influence recommendation accuracy

---

### 5. 🚚 Delivery Service

**Design:** Restaurant manages own delivery boys.

#### Delivery Boy Schema
```javascript
// Collection: delivery_boys
{
  "_id": ObjectId,
  "deliveryBoyId": "boy_456",
  "restaurantId": "rest_123",
  "name": "Ravi Kumar",
  "phone": "919234567890",
  "email": "ravi@example.com",
  "status": "AVAILABLE", // AVAILABLE|BUSY|OFFLINE|ON_LEAVE
  "currentLocation": {
    "type": "Point",
    "coordinates": [28.6139, 77.2090] // [longitude, latitude]
  },
  "assignedOrders": ["ord_001", "ord_002"],
  "totalDeliveries": 450,
  "averageRating": 4.7,
  "joinDate": ISODate,
  "documentsVerified": true,
  "lastActiveAt": ISODate
}
```

#### Delivery Flow
```
Order Status: READY
        ↓
Find Available Delivery Boy → Groq can optimize assignment
        ↓
Send WhatsApp: "New order available for delivery"
        ↓
Delivery Boy Accepts → Status: ASSIGNED
        ↓
Send customer tracking link
        ↓
On Pickup → Status: PICKED_UP
        ↓
On Delivery → Status: DELIVERED
        ↓
Send rating prompt to customer
```

#### API Endpoints
```
GET /api/delivery/boys/:restaurantId         → List available boys
POST /api/delivery/assign/:orderId           → Assign delivery
PATCH /api/delivery/boys/:boyId/status       → Update boy status
GET /api/delivery/boy/:boyId/location        → Get realtime location
POST /api/delivery/order/:orderId/track      → Track specific order
```

---

### 6. 🍳 Kitchen Dashboard (Next.js Frontend)

**Tech:** Next.js Pages Router (or React components) + Tailwind/ShadcnUI

#### Dashboard Features

```
┌─────────────────────────────────────┐
│    Kitchen Dashboard Main Page      │
└─────────────────────────────────────┘
         │
    ┌────┴────┬──────────┬─────────┐
    ↓         ↓          ↓         ↓
  NEW      PREP       READY    HISTORY
 ORDERS   ORDERS    ORDERS    ORDERS
    
NEW ORDERS:
├─ Order #1234
│  ├─ 2x Biryani
│  ├─ 1x Raita
│  ├─ Notes: "Extra spicy"
│  └─ [ACCEPT] [REJECT] [PREP]
│
├─ Order #1235 (Auto-accept if configured)

PREP ORDERS:
├─ Order #1234
│  ├─ Status: "Preparing (5 mins left)"
│  ├─ Items: 2x Biryani, 1x Raita
│  └─ [READY] [DELAY] [CANCEL]

READY ORDERS:
├─ Order #1230
│  ├─ Delivery boy "Ravi" assigned
│  ├─ Delivery boy location: 2km away
│  └─ [PICKUP_DONE] [DELIVERED]
```

#### Dashboard Pages

##### 1. `/dashboard` (Main View)
- Real-time order count (new, preparing, ready)
- Quick stats (orders today, revenue, avg prep time)
- WebSocket connection for live updates

##### 2. `/orders` (Order Management)
- Detailed order view with customer notes
- Multi-actions: Accept/Reject, Prep, Ready, Delivered
- Search by order ID or phone
- Filter by status

##### 3. `/menu-management` (Edit Menu)
- Add/edit/delete menu items
- Batch upload via CSV
- Manage availability
- Set pricing and addons

##### 4. `/delivery-tracking` (Delivery Management)
- List delivery boys with status
- Assign manually or auto-assign
- View delivery boy location
- Performance analytics

##### 5. `/analytics` (Insights)
- Revenue chart (daily/weekly/monthly)
- Popular items report
- Peak hours analysis
- Delivery time analytics

---

### 7. 💳 Payment Service

**Provider:** Razorpay (for MVP, scalable to Stripe later)

#### Payment Flow
```
Cart → [Checkout] → Generate Razorpay Link
                           ↓
                    Send via WhatsApp
                           ↓
  Customer Clicks → Razorpay Hosted Page
                           ↓
             Enter UPI/Card Details
                           ↓
        Razorpay Webhook → /api/payment/webhook
                           ↓
      Update Order Status → PAYMENT_CONFIRMED
                           ↓
    Send WhatsApp Confirmation → Customer
```

#### Implementation

```javascript
// /api/payment/create
POST /api/payment/create

Request:
{
  "orderId": "ord_1234567",
  "amount": 31000, // in paise (310 rupees)
  "userPhone": "919876543210"
}

Response:
{
  "paymentLink": "https://rzp.io/i/xyzabc",
  "paymentId": "pay_2Tz3Qg9X7Zq"
}

// /api/payment/webhook (Razorpay callback)
POST /api/payment/webhook
Headers: X-Razorpay-Signature (verify)

Payload from Razorpay:
{
  "event": "payment.authorized",
  "payload": {
    "payment": {
      "id": "pay_2Tz3Qg9X7Zq",
      "status": "authorized",
      "amount": 31000,
      "notes": { "orderId": "ord_1234567" }
    }
  }
}

Action: Update order.paymentStatus = "COMPLETED"
Then: Send WhatsApp confirmation + Tell kitchen
```

#### Razorpay Setup
```bash
# npm install razorpay

// Environment variables (.env.local)
RAZORPAY_KEY_ID=key_xxxxxxxxxx
RAZORPAY_KEY_SECRET=secret_xxxxxxxxxx
RAZORPAY_WEBHOOK_SECRET=webhook_xxxxxxxxxx
```

---

### 8. 🔔 Notification Layer (11za)

**Outbound Communication:** Backend → 11za → WhatsApp → Customer

#### Message Types

| Event | Message | Action |
|-------|---------|--------|
| **Order Confirmed** | Your order #1234 placed! Preparing in kitchen. | Show order tracking |
| **Order Preparing** | Your Biryani is being cooked 👨‍🍳 | Button: "Estimated 15 mins" |
| **Order Ready** | Your food is ready! Ravi is on the way (2km away) | Show delivery boy info |
| **Order Out for Delivery** | Ravi (delivery boy) started delivery. Current location: ... | Live tracking button |
| **Order Delivered** | Your order delivered! Rate your experience 🌟 | 5-star rating buttons |
| **Generic Message** | Any business updates or promotions | Text + buttons |

#### API Integration with 11za

```javascript
// Service: NotificationService

async sendOrder Confirmation(orderId, userPhone) {
  const order = await Order.findById(orderId);
  
  await 11za.sendMessage({
    to: userPhone,
    type: "text",
    content: `✅ Order #${order.orderId} confirmed!\n💰 Total: ₹${order.total}\n⏱️ Ready in: 25 mins`
  });

  await 11za.sendButtons({
    to: userPhone,
    bodyText: "What would you like to do?",
    buttons: [
      { id: "track_order", title: "Track Order" },
      { id: "contact_restaurant", title: "Call Restaurant" },
      { id: "cancel_order", title: "Cancel" }
    ]
  });
}

async sendDeliveryUpdate(orderId, deliveryBoy, location) {
  const order = await Order.findById(orderId);
  
  await 11za.sendMessage({
    to: order.userPhone,
    type: "location",
    latitude: location.lat,
    longitude: location.lng,
    locationName: `${deliveryBoy.name} - ${deliveryBoy.phone}`
  });
}

async sendPaymentLink(orderId, paymentLink) {
  const order = await Order.findById(orderId);
  
  await 11za.sendMessage({
    to: order.userPhone,
    type: "text",
    content: `💳 Complete payment for ₹${order.total}:\n${paymentLink}`
  });
}
```

---

## 🔗 Integration Flows

### Flow 1: Customer Asks for Recommendation (AI Flow)

```
Step 1: Customer sends WhatsApp message
  "Give me spicy food for 2 people"

Step 2: 11za webhook receives → /api/webhook/11za/message
  {
    "from": "919876543210",
    "message": "Give me spicy food for 2 people",
    "timestamp": "2026-03-25T18:30:00Z"
  }

Step 3: Find or create user cart session

Step 4: Call POST /api/ai/process
  Input: 
  {
    "userMessage": "Give me spicy food for 2 people",
    "userId": "919876543210",
    "restaurantId": "rest_123"
  }

Step 5: Groq processes → Returns JSON
  {
    "intent": "GET_RECOMMENDATION",
    "entities": { "spiceLevel": "high", "servings": 2 },
    "items": [...],
    "message": "🔥 For 2 people, try these...",
    "suggestedActions": ["ADD_TO_CART"]
  }

Step 6: Format for WhatsApp → Send back via 11za
  sendButtons({
    bodyText: "🔥 For 2 people, try these spicy delights:\n1. Spicy Biryani ₹220\n2. Paneer Tikka ₹180",
    buttons: [
      { id: "add_item:item_001:1", title: "Add Biryani" },
      { id: "add_item:item_002:1", title: "Add Paneer" },
      { id: "see_menu", title: "See Full Menu" }
    ]
  })

Step 7: User clicks [Add Biryani]

Step 8: /api/webhook/11za/button-click
  { buttonId: "add_item:item_001:1" }

Step 9: Add to cart → POST /api/cart/add
  {
    "itemId": "item_001",
    "quantity": 1,
    "userPhone": "919876543210"
  }

Step 10: Confirm via WhatsApp
  "✅ Added Spicy Biryani to cart. Total: ₹220"
  [Checkout] [Add More]
```

### Flow 2: Order Placement to Delivery

```
Step 1: User sends [Checkout] button click

Step 2: POST /api/order/create
  {
    "userPhone": "919876543210",
    "restaurantId": "rest_123"
  }

Step 3: System creates order + generates Razorpay link
  Order Status: PAYMENT_PENDING
  Payment Link: https://rzp.io/i/abc123

Step 4: Send payment link via 11za
  "Your order is ₹310. Pay here: [Link]"

Step 5: Customer pays on Razorpay

Step 6: Razorpay → Webhook: /api/payment/webhook
  Confirms payment

Step 7: Update order.paymentStatus = "COMPLETED"
  Order Status: CONFIRMED

Step 8: Send WhatsApp confirmation
  "✅ Payment received! Your order is in the kitchen"

Step 9: Kitchen Dashboard shows new order
  Restaurant staff marks [PREPARING]

Step 10: Order Status → PREPARING
  Customer gets: "👨‍🍳 Your food is being cooked"

Step 11: Staff marks [READY]
  Order Status → READY

Step 12: Auto-assign or manual assign delivery boy
  Order Status → ASSIGNED
  Send WhatsApp: "Ravi is on the way! [Track]"

Step 13: Delivery boy app updates status
  PICKED_UP → Send tracking to customer
  DELIVERED → Order Status → DELIVERED

Step 14: Send rating prompt
  "How was your experience? ⭐⭐⭐⭐⭐"

Step 15: Customer rates + submits feedback
  Stored in orders.review collection
```

### Flow 3: Kitchen Dashboard Order Management

```
New Order Arrives
    ↓
[Kitchen Dashboard Refresh - WebSocket]
    ↓
Display with Order #1234
├─ Items: 2x Biryani, 1x Raita
├─ Customer: 919876543210
├─ Notes: "Extra spicy"
└─ Actions: [ACCEPT] [REJECT]
    ↓
Kitchen Staff clicks [ACCEPT]
    ↓
POST /api/order/1234/status → "CONFIRMED" + "PREPARING"
    ↓
Kitchen Dashboard shows in PREP section
Dashboard updates: "5 mins remaining" (auto-countdown)
    ↓
When ready:
Kitchen Staff clicks [READY]
    ↓
POST /api/order/1234/status → "READY"
    ├─ 11za sends: "Your food is ready!"
    ├─ Triggers auto-assign delivery boy
    └─ Dashboard moves to READY section
    ↓
Delivery Boy appears → Picks up order
    ├─ Dashboard: "Ravi picked up"
    └─ Customer: "Your food is on the way"
    ↓
On Delivery:
Kitchen Dashboard shows [DELIVERED BUTTON]
    ↓
Staff confirms delivery
    ├─ Order Status: DELIVERED
    ├─ Customer gets rating prompt
    └─ Order moves to HISTORY
```

---

## 💾 MongoDB Collections Schema

```javascript
// 1. USERS COLLECTION
db.users.insertOne({
  _id: ObjectId(),
  phone: "918866666666",
  name: "Amit Kumar",
  restaurants: ["rest_123"],
  preferences: {
    spiceLevel: 3,
    dietaryRestrictions: ["vegetarian"],
    defaultAddress: "..."
  },
  createdAt: ISODate,
  lastOrderDate: ISODate
})

// 2. RESTAURANTS COLLECTION
db.restaurants.insertOne({
  _id: ObjectId(),
  restaurantId: "rest_123",
  name: "Raj Restaurant",
  phone: "01143332222",
  email: "contact@raj.com",
  address: "123 Main St, Delhi",
  cuisineType: ["Indian", "North Indian"],
  isActive: true,
  deliveryRadius: 5, // km
  deliveryFee: 50,
  minOrderValue: 150,
  operatingHours: {
    open: "11:00",
    close: "22:00",
    closedOn: ["MONDAY"]
  },
  coordinates: {
    type: "Point",
    coordinates: [28.6139, 77.2090]
  },
  avgPrepTime: 25, // minutes
  rating: 4.6,
  createdAt: ISODate
})

// 3. MENU ITEMS COLLECTION
db.menus.insertOne({
  _id: ObjectId(),
  itemId: "item_001",
  restaurantId: "rest_123",
  name: "Spicy Chicken Biryani",
  price: 220,
  category: "RICE_CURRY",
  tags: ["spicy", "chicken", "non-veg"],
  isAvailable: true,
  createdAt: ISODate
})

// 4. CARTS COLLECTION
db.carts.insertOne({
  _id: ObjectId(),
  userPhone: "918866666666",
  restaurantId: "rest_123",
  items: [
    {
      itemId: "item_001",
      quantity: 1,
      price: 220
    }
  ],
  total: 220,
  expiresAt: ISODate("2026-03-26T00:00:00Z"),
  createdAt: ISODate
})

// 5. ORDERS COLLECTION
db.orders.insertOne({
  _id: ObjectId(),
  orderId: "ord_1234567",
  userPhone: "918866666666",
  restaurantId: "rest_123",
  items: [...],
  total: 310,
  status: "CONFIRMED",
  paymentStatus: "COMPLETED",
  deliveryBoyId: "boy_456",
  createdAt: ISODate,
  updatedAt: ISODate
})

// 6. DELIVERY BOYS COLLECTION
db.delivery_boys.insertOne({
  _id: ObjectId(),
  deliveryBoyId: "boy_456",
  restaurantId: "rest_123",
  name: "Ravi Kumar",
  phone: "919234567890",
  status: "AVAILABLE",
  totalDeliveries: 450,
  averageRating: 4.7,
  createdAt: ISODate
})

// 7. PAYMENT TRANSACTIONS COLLECTION
db.payment_transactions.insertOne({
  _id: ObjectId(),
  orderId: "ord_1234567",
  paymentId: "pay_2Tz3Qg9X7Zq",
  amount: 31000, // paise
  status: "COMPLETED",
  method: "razorpay",
  webhookReceived: true,
  createdAt: ISODate
})

// 8. ADMIN/RESTAURANT ACCOUNTS
db.restaurant_admins.insertOne({
  _id: ObjectId(),
  restaurantId: "rest_123",
  email: "admin@raj.com",
  hashedPassword: "...",
  role: "ADMIN",
  permissions: ["VIEW_ORDERS", "UPDATE_MENU", "VIEW_ANALYTICS"],
  createdAt: ISODate
})
```

---

## 🚀 MVP Implementation Plan

### **Phase 1: Core Features (Weeks 1-4)**
✅ **Goal:** Functional WhatsApp ordering with AI recommendations

#### Week 1-2: Backend Foundation
- [ ] Setup Next.js + MongoDB
- [ ] Create core collections (menu, orders, users, carts)
- [ ] Implement auth + tenant isolation
- [ ] Build API routes (CRUD for menu, cart, order basics)

#### Week 3: AI Integration
- [ ] Integrate Groq API
- [ ] Build AI service with prompt templates
- [ ] Test intent detection + entity extraction
- [ ] Integrate with menu matching

#### Week 4: WhatsApp + Payments
- [ ] Setup 11za webhook handling
- [ ] Integrate Razorpay payment links
- [ ] Build basic notification service
- [ ] End-to-end test: Message → AI → Cart → Payment

#### Deliverable
- Restaurant can receive WhatsApp orders
- Customer gets AI recommendations
- Orders processed through Razorpay

---

### **Phase 2: Enhanced Features (Weeks 5-7)**
✅ **Goal:** Full kitchen dashboard + delivery tracking

- [ ] Build kitchen dashboard UI (React/Next.js)
- [ ] WebSocket integration for real-time updates
- [ ] Delivery boy assignment system
- [ ] Order status tracking + notifications
- [ ] Analytics dashboard basics

#### Deliverable
- Kitchen staff can manage orders
- Delivery boys assigned + tracked
- Customer gets real-time updates

---

### **Phase 3: Scale & Optimization (Weeks 8+)**
- [ ] Redis integration for cart (optional but recommended)
- [ ] Multi-restaurant support (swiggy-like discovery)
- [ ] Advanced AI: Upsell, reorder recommendations
- [ ] Performance optimization
- [ ] Production deployment

---

## ⚠️ Key Architectural Challenges & Solutions

### Challenge 1: State Management in Stateless WhatsApp

**Problem:** WhatsApp doesn't maintain session state.

**Solution:**
- Store cart in MongoDB with 2-hour TTL
- Use user phone + restaurant ID as composite key
- Implement cart expiry cleanup job

### Challenge 2: AI Accuracy

**Problem:** Groq might misunderstand intent or extract wrong entities.

**Solution:**
- Build comprehensive prompt templates
- Tag menu items (heavily use tags for matching)
- Add confidence scoring
- Fallback to human flow if confidence < 0.75

### Challenge 3: Order Synchronization

**Problem:** Multiple updates (kitchen, delivery, payment) happening concurrently.

**Solution:**
- Use MongoDB transactions (multi-doc ACID)
- Implement strict status machine
- Add idempotency keys to webhooks

### Challenge 4: WhatsApp UX Limitations

**Problem:** Can't show rich UI like web apps.

**Solution:**
- Use WhatsApp buttons for primary actions
- Interactive lists for menu browsing
- Template messages for consistency
- Quick replies for common flows

---

## 🔐 Security Considerations

1. **API Security**
   - JWT for restaurant admin dashboard
   - API key validation for 11za + Razorpay
   - Rate limiting on AI endpoint
   - Input validation + sanitization

2. **Data Protection**
   - Encrypt sensitive fields (phone, payment details)
   - HTTPS only
   - MongoDB field-level encryption for PII

3. **Webhook Verification**
   - Verify Razorpay signature (X-Razorpay-Signature)
   - Verify 11za webhook authenticity
   - Implement replay attack prevention

4. **Multi-tenancy**
   - Enforce restaurantId in all queries
   - Row-level security in MongoDB
   - Separate API keys per restaurant

---

## 📊 Performance Targets

| Metric | Target |
|--------|--------|
| **AI Response Time** | < 2 seconds |
| **Order Creation** | < 500ms |
| **Dashboard Load** | < 1 second |
| **Concurrent Users** | 1000+ (Phase 1) |
| **Database Query** | < 100ms (p99) |
| **WhatsApp Message Delivery** | < 5 seconds |

**Optimization Strategy:**
- Redis caching for menu
- Database indexing on hot fields (restaurantId, userPhone)
- CDN for images
- Lazy load dashboard components

---

## 🌍 Deployment Architecture

```
┌─────────────────────────┐
│   GitHub (Source)       │
└────────────┬────────────┘
             │ Push
             ↓
┌─────────────────────────┐
│  Vercel (Deployment)    │
│  • Next.js Auto-deploy  │
│  • Serverless functions │
│  • Edge functions       │
└────────────┬────────────┘
             │
    ┌────────┼────────┐
    ↓        ↓        ↓
  MongoDB  Groq    11za
  Atlas    API     API
  (Cloud)
```

**Environment Setup:**
```bash
# .env.local
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/cloudkitchen
GROQ_API_KEY=gsk_xxxxxxxxxxxxx
GROQ_MODEL_ID=mixtral-8x7b-32768
ELEVENZA_API_KEY=xxxx
ELEVANZA_WEBHOOK_SECRET=xxxx
RAZORPAY_KEY_ID=xxxxx
RAZORPAY_KEY_SECRET=xxxxx
NEXT_PUBLIC_API_URL=https://yourdomain.com
```

---

## 🔄 Future Enhancements

1. **Advanced AI**
   - Personalized recommendations based on order history
   - "Your usual?" feature
   - Seasonal recommendations

2. **Multi-Restaurant**
   - Discovery feed (like Swiggy)
   - Cross-restaurant comparison
   - Rating system

3. **Analytics**
   - Predictive demand forecasting
   - Peak hour optimization
   - AI-driven pricing recommendations

4. **Loyalty**
   - Rewards program
   - Referral system
   - VIP tier management

5. **Compliance**
   - Order tracking for delivery mandates
   - Tax compliance export
   - GST bill generation

---

## 📝 Quick Start Commands

```bash
# Clone & Setup
git clone <repo>
cd cloudkitchen
npm install

# Environment
cp .env.example .env.local
# Fill in secrets

# Development
npm run dev
# Opens http://localhost:3000

# Database
# MongoDB Atlas: Create cluster, get connection string

# Build
npm run build
npm run start

# Deploy to Vercel
vercel deploy
```

---

## 📚 API Quick Reference

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/webhook/11za` | POST | Signature | WhatsApp messages |
| `/api/ai/process` | POST | API Key | AI recommendations |
| `/api/cart/*` | GET/POST | Phone | Cart operations |
| `/api/order/*` | GET/POST | Phone | Order lifecycle |
| `/api/menu/:rest` | GET | Public | Browse menu |
| `/api/payment/webhook` | POST | Signature | Razorpay callbacks |
| `/dashboard/*` | GET | JWT | Kitchen dashboard |

---

**Document Status:** Final v1.0  
**Last Updated:** March 2026  
**Next Review:** After Phase 1 completion

# CloudKitchen Platform - Final High-Level Design (HLD)

**Version:** 1.0  
**Date:** March 2026  
**Stack:** Next.js | MongoDB | Groq AI | 11za | Razorpay

---

## 📋 Executive Summary

CloudKitchen is a **WhatsApp-first food ordering platform** powered by AI-driven recommendation engine using Groq. The system enables restaurants to manage orders, inventory, and delivery through an integrated dashboard while customers interact via natural language commands on WhatsApp.

**Key USP:** Intelligent AI-powered food recommendations with intent detection and menu mapping via conversational WhatsApp interface.

---

## 🏗️ System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    CUSTOMER LAYER (WhatsApp)                     │
│                                                                     │
│  User → Natural Language Input → 11za Webhook Handler             │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│              11za MESSAGING & WEBHOOK LAYER                       │
│  • Message Reception  • Button Handling  • List Selections       │
│  • Response Routing   • Session Management                       │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│          NEXT.JS BACKEND (API Layer) - App Router                │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  API Routes (/api/*)                                     │   │
│  │  ├─ /webhook/11za        (Message ingestion)             │   │
│  │  ├─ /auth                (Tenant management)             │   │
│  │  ├─ /menu                (Menu CRUD)                     │   │
│  │  ├─ /order               (Order lifecycle)               │   │
│  │  ├─ /cart                (Cart operations)               │   │
│  │  ├─ /ai/process          (AI request handling)           │   │
│  │  ├─ /payment/webhook     (Razorpay callbacks)            │   │
│  │  └─ /delivery            (Delivery tracking)             │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  BUSINESS LOGIC LAYER                                   │   │
│  │  ├─ AIService         (Groq integration)                │   │
│  │  ├─ MenuService       (Menu management)                 │   │
│  │  ├─ OrderService      (Order orchestration)             │   │
│  │  ├─ CartService       (State management)                │   │
│  │  ├─ PaymentService    (Razorpay integration)            │   │
│  │  ├─ DeliveryService   (Delivery boy assignment)         │   │
│  │  └─ NotificationService (11za outbound)                 │   │
│  └──────────────────────────────────────────────────────────┘   │
└──────────────────────────┬──────────────────────────────────────┘
                           │
              ┌────────────┼─────────────┐
              ↓            ↓             ↓
        ┌──────────┐  ┌─────────┐  ┌────────────┐
        │ MongoDB  │  │ Redis   │  │ Groq API   │
        │ (Primary)│  │(Optional)  │ (LLM)      │
        └──────────┘  └─────────┘  └────────────┘
              
┌─────────────────────────────────────────────────────────────────┐
│     NEXT.JS FRONTEND (Pages/Components) - Kitchen Dashboard      │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Pages:                                                  │   │
│  │  ├─ /dashboard         (Main view)                       │   │
│  │  ├─ /orders            (Active orders)                   │   │
│  │  ├─ /menu-management   (Edit menu)                       │   │
│  │  ├─ /delivery-tracking (Assign delivery boys)            │   │
│  │  └─ /analytics         (Order stats)                     │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 💾 Core Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | Next.js 14+ (App Router) + React | Kitchen Dashboard UI |
| **Backend** | Next.js 14+ (API Routes) | APIs, webhooks, business logic |
| **Database** | MongoDB | All data storage (primary) |
| **Cache/Session** | Redis (optional) | Cart state, session management |
| **AI/LLM** | Groq API | Intent detection, recommendations |
| **Messaging** | 11za SDK | WhatsApp integration |
| **Payments** | Razorpay | Payment processing |
| **Deployment** | Vercel / Self-hosted | Server hosting |

---

## 🧩 Core Modules Deep Dive

### 1. 🧠 AI Service (MANDATORY — Your USP)

**Purpose:** Understand customer intent and provide intelligent recommendations.

#### Architecture
```
Customer Message → Tokenization → Groq Model → JSON Output
                                        ↓
                              {intent, entities, items, message}
```

#### Request Flow
```
POST /api/ai/process

Input:
{
  "userMessage": "Give me some spicy food for 2 people",
  "userId": "91xxxxxxxxxx",
  "restaurantId": "rest_123",
  "previousOrders": [], // For personalization
  "menuContext": [] // Available items
}

Processing Pipeline:
1. Extract Intent → "GET_RECOMMENDATION"
2. Extract Entities → {spiceLevel: "high", people: 2}
3. Query Menu DB → Filter items by tag "spicy", serves: 2
4. Generate Response → Groq creates conversational reply
5. Format for WhatsApp → Buttons/List

Output:
{
  "intent": "GET_RECOMMENDATION",
  "confidence": 0.95,
  "entities": {
    "spiceLevel": "high",
    "servings": 2,
    "category": "food"
  },
  "items": [
    {
      "id": "item_001",
      "name": "Spicy Chicken Biryani",
      "price": 220,
      "tags": ["spicy", "rice", "chicken"]
    },
    {
      "id": "item_002",
      "name": "Paneer Tikka Masala",
      "price": 180,
      "tags": ["spicy", "paneer", "gravy"]
    }
  ],
  "message": "🔥 For 2 people, try these spicy delights...",
  "suggestedActions": ["ADD_TO_CART", "CUSTOMIZE", "SEE_SIMILAR"]
}
```

#### AI Responsibilities
- **Intent Detection:** Classify user intent (order, recommend, track, ask questions)
- **Entity Extraction:** Pull spice level, servings, dietary preferences
- **Menu Matching:** Use tags to find relevant items in MongoDB
- **Upsell Logic:** Suggest complementary items with context
- **Conversation:** Generate human-like responses

#### Prompt Template (Groq)
```
You are a helpful restaurant AI assistant. Current menu has these items: [MENU_JSON]
User said: "[USER_MESSAGE]"
User's previous orders: [HISTORY]

Respond with JSON:
{
  "intent": "RECOMMEND|ORDER|TRACK|QUESTION",
  "spiceLevel": "info from entities",
  "servings": "number",
  "recommendedItems": [ids],
  "response": "friendly message",
  "followUp": "next question"
}
```

---

### 2. 🛒 Cart Service

**Challenge:** WhatsApp is stateless — must persist cart across sessions.

#### Storage Strategy

**Option A (MVP - Recommended):** MongoDB
```javascript
// MongoDB Collection: carts
{
  "_id": ObjectId,
  "userPhone": "919876543210",
  "restaurantId": "rest_123",
  "items": [
    {
      "itemId": "item_001",
      "name": "Biryani",
      "quantity": 1,
      "price": 220,
      "customizations": [
        { "addon": "extra rice", "price": 50 }
      ]
    }
  ],
  "subtotal": 270,
  "tax": 50,
  "total": 320,
  "expiresAt": ISODate("2026-03-25T20:00:00Z"), // 2 hour expiry
  "createdAt": ISODate,
  "updatedAt": ISODate
}
```

**Option B (Scale):** Redis
```
Key: cart:91987654321:rest_123
Type: Hash
Expiry: 2 hours TTL
```

#### Cart Operations
- **Add Item:** POST /api/cart/add
- **Remove Item:** DELETE /api/cart/items/:itemId
- **Update Quantity:** PATCH /api/cart/items/:itemId
- **Get Cart:** GET /api/cart/:userId
- **Clear Cart:** DELETE /api/cart/:userId
- **Checkout:** POST /api/cart/checkout (triggers Order creation)

---

### 3. 📦 Order Service

**Flow:** Cart → Confirm → Payment → Order Created → Kitchen View

#### Order Lifecycle
```
CREATED → PAYMENT_PENDING → CONFIRMED → PREPARING → READY → ASSIGNED → DELIVERED
   ↓
[Payment webhook confirms]
   ↓
[Customer sees "Your order is being prepared"]
   ↓
[Kitchen marks READY]
   ↓
[Delivery boy assigned]
   ↓
[Status updates sent to customer]
```

#### MongoDB Schema
```javascript
// Collection: orders
{
  "_id": ObjectId,
  "orderId": "ord_1234567", // Human-readable
  "userPhone": "919876543210",
  "restaurantId": "rest_123",
  "items": [
    {
      "itemId": "item_001",
      "name": "Spicy Biryani",
      "quantity": 1,
      "price": 220,
      "customizations": []
    }
  ],
  "subtotal": 220,
  "tax": 40,
  "deliveryFee": 50,
  "total": 310,
  "status": "CONFIRMED", // CREATED|PAYMENT_PENDING|CONFIRMED|PREPARING|READY|ASSIGNED|DELIVERED
  "paymentMethod": "razorpay",
  "paymentId": "pay_2Tz3Qg9X7Zq", // Razorpay payment_id
  "paymentStatus": "COMPLETED",
  "deliveryBoyId": "boy_456",
  "deliveryBoyPhone": "919123456789",
  "estimatedDeliveryTime": ISODate,
  "actualDeliveryTime": ISODate,
  "notes": "Make it extra spicy",
  "createdAt": ISODate,
  "updatedAt": ISODate,
  "timestamps": {
    "confirmed": ISODate,
    "preparing": ISODate,
    "ready": ISODate,
    "assigned": ISODate,
    "delivered": ISODate
  }
}
```

#### API Endpoints
```
POST /api/order/create          → Create order from cart
GET /api/order/:orderId          → Get order details
PATCH /api/order/:orderId        → Update order status
GET /api/order/user/:phone       → Get user's orders
POST /api/order/:orderId/rate    → Rate order + leave review
```

---

### 4. 🍽️ Menu Service

**Storage:** MongoDB (indexed by restaurant, tags, availability)

#### MongoDB Schema
```javascript
// Collection: menus
{
  "_id": ObjectId,
  "itemId": "item_001",
  "restaurantId": "rest_123",
  "name": "Spicy Chicken Biryani",
  "description": "Fragrant rice cooked with chicken and spices",
  "category": "RICE_CURRY", // APPETIZERS|RICE_CURRY|GRAVY|BREADS|DESSERTS
  "price": 220,
  "image": "url_to_image",
  "tags": ["spicy", "rice", "chicken", "non-veg", "dum-cooked"],
  "spiceLevel": 3, // 1-5
  "serves": 2,
  "dietaryInfo": ["non-vegetarian"],
  "ingredients": ["chicken", "basmati rice", "yogurt"],
  "isAvailable": true,
  "availableFrom": "11:00", // HH:MM format
  "availableUntil": "22:00",
  "preparationTime": 30, // in minutes
  "calories": 450,
  "addons": [
    {
      "name": "Extra Rice",
      "price": 50,
      "type": "ADDON"
    },
    {
      "name": "Raita (100ml)",
      "price": 30,
      "type": "SIDE"
    }
  ],
  "bestseller": true,
  "rating": 4.5,
  "reviews": 150,
  "createdAt": ISODate,
  "updatedAt": ISODate
}

// Indexes for optimal queries:
// db.menus.createIndex({ restaurantId: 1, isAvailable: 1 })
// db.menus.createIndex({ tags: 1, restaurantId: 1 })
// db.menus.createIndex({ category: 1, restaurantId: 1 })
```

#### API Endpoints
```
GET /api/menu/:restaurantId           → Get all menu items
GET /api/menu/:restaurantId/category/:cat → Get by category
POST /api/menu                         → Create item (admin)
PATCH /api/menu/:itemId                → Update item (admin)
DELETE /api/menu/:itemId               → Delete item (admin)
GET /api/menu/search?q=spicy&rest=rest_123 → Search menu
```

#### AI Integration
- AI queries this collection to find matching items based on tags
- Tags heavily influence recommendation accuracy

---

### 5. 🚚 Delivery Service

**Design:** Restaurant manages own delivery boys.

#### Delivery Boy Schema
```javascript
// Collection: delivery_boys
{
  "_id": ObjectId,
  "deliveryBoyId": "boy_456",
  "restaurantId": "rest_123",
  "name": "Ravi Kumar",
  "phone": "919234567890",
  "email": "ravi@example.com",
  "status": "AVAILABLE", // AVAILABLE|BUSY|OFFLINE|ON_LEAVE
  "currentLocation": {
    "type": "Point",
    "coordinates": [28.6139, 77.2090] // [longitude, latitude]
  },
  "assignedOrders": ["ord_001", "ord_002"],
  "totalDeliveries": 450,
  "averageRating": 4.7,
  "joinDate": ISODate,
  "documentsVerified": true,
  "lastActiveAt": ISODate
}
```

#### Delivery Flow
```
Order Status: READY
        ↓
Find Available Delivery Boy → Groq can optimize assignment
        ↓
Send WhatsApp: "New order available for delivery"
        ↓
Delivery Boy Accepts → Status: ASSIGNED
        ↓
Send customer tracking link
        ↓
On Pickup → Status: PICKED_UP
        ↓
On Delivery → Status: DELIVERED
        ↓
Send rating prompt to customer
```

#### API Endpoints
```
GET /api/delivery/boys/:restaurantId         → List available boys
POST /api/delivery/assign/:orderId           → Assign delivery
PATCH /api/delivery/boys/:boyId/status       → Update boy status
GET /api/delivery/boy/:boyId/location        → Get realtime location
POST /api/delivery/order/:orderId/track      → Track specific order
```

---

### 6. 🍳 Kitchen Dashboard (Next.js Frontend)

**Tech:** Next.js Pages Router (or React components) + Tailwind/ShadcnUI

#### Dashboard Features

```
┌─────────────────────────────────────┐
│    Kitchen Dashboard Main Page      │
└─────────────────────────────────────┘
         │
    ┌────┴────┬──────────┬─────────┐
    ↓         ↓          ↓         ↓
  NEW      PREP       READY    HISTORY
 ORDERS   ORDERS    ORDERS    ORDERS
    
NEW ORDERS:
├─ Order #1234
│  ├─ 2x Biryani
│  ├─ 1x Raita
│  ├─ Notes: "Extra spicy"
│  └─ [ACCEPT] [REJECT] [PREP]
│
├─ Order #1235 (Auto-accept if configured)

PREP ORDERS:
├─ Order #1234
│  ├─ Status: "Preparing (5 mins left)"
│  ├─ Items: 2x Biryani, 1x Raita
│  └─ [READY] [DELAY] [CANCEL]

READY ORDERS:
├─ Order #1230
│  ├─ Delivery boy "Ravi" assigned
│  ├─ Delivery boy location: 2km away
│  └─ [PICKUP_DONE] [DELIVERED]
```

#### Dashboard Pages

##### 1. `/dashboard` (Main View)
- Real-time order count (new, preparing, ready)
- Quick stats (orders today, revenue, avg prep time)
- WebSocket connection for live updates

##### 2. `/orders` (Order Management)
- Detailed order view with customer notes
- Multi-actions: Accept/Reject, Prep, Ready, Delivered
- Search by order ID or phone
- Filter by status

##### 3. `/menu-management` (Edit Menu)
- Add/edit/delete menu items
- Batch upload via CSV
- Manage availability
- Set pricing and addons

##### 4. `/delivery-tracking` (Delivery Management)
- List delivery boys with status
- Assign manually or auto-assign
- View delivery boy location
- Performance analytics

##### 5. `/analytics` (Insights)
- Revenue chart (daily/weekly/monthly)
- Popular items report
- Peak hours analysis
- Delivery time analytics

---

### 7. 💳 Payment Service

**Provider:** Razorpay (for MVP, scalable to Stripe later)

#### Payment Flow
```
Cart → [Checkout] → Generate Razorpay Link
                           ↓
                    Send via WhatsApp
                           ↓
  Customer Clicks → Razorpay Hosted Page
                           ↓
             Enter UPI/Card Details
                           ↓
        Razorpay Webhook → /api/payment/webhook
                           ↓
      Update Order Status → PAYMENT_CONFIRMED
                           ↓
    Send WhatsApp Confirmation → Customer
```

#### Implementation

```javascript
// /api/payment/create
POST /api/payment/create

Request:
{
  "orderId": "ord_1234567",
  "amount": 31000, // in paise (310 rupees)
  "userPhone": "919876543210"
}

Response:
{
  "paymentLink": "https://rzp.io/i/xyzabc",
  "paymentId": "pay_2Tz3Qg9X7Zq"
}

// /api/payment/webhook (Razorpay callback)
POST /api/payment/webhook
Headers: X-Razorpay-Signature (verify)

Payload from Razorpay:
{
  "event": "payment.authorized",
  "payload": {
    "payment": {
      "id": "pay_2Tz3Qg9X7Zq",
      "status": "authorized",
      "amount": 31000,
      "notes": { "orderId": "ord_1234567" }
    }
  }
}

Action: Update order.paymentStatus = "COMPLETED"
Then: Send WhatsApp confirmation + Tell kitchen
```

#### Razorpay Setup
```bash
# npm install razorpay

// Environment variables (.env.local)
RAZORPAY_KEY_ID=key_xxxxxxxxxx
RAZORPAY_KEY_SECRET=secret_xxxxxxxxxx
RAZORPAY_WEBHOOK_SECRET=webhook_xxxxxxxxxx
```

---

### 8. 🔔 Notification Layer (11za)

**Outbound Communication:** Backend → 11za → WhatsApp → Customer

#### Message Types

| Event | Message | Action |
|-------|---------|--------|
| **Order Confirmed** | Your order #1234 placed! Preparing in kitchen. | Show order tracking |
| **Order Preparing** | Your Biryani is being cooked 👨‍🍳 | Button: "Estimated 15 mins" |
| **Order Ready** | Your food is ready! Ravi is on the way (2km away) | Show delivery boy info |
| **Order Out for Delivery** | Ravi (delivery boy) started delivery. Current location: ... | Live tracking button |
| **Order Delivered** | Your order delivered! Rate your experience 🌟 | 5-star rating buttons |
| **Generic Message** | Any business updates or promotions | Text + buttons |

#### API Integration with 11za

```javascript
// Service: NotificationService

async sendOrder Confirmation(orderId, userPhone) {
  const order = await Order.findById(orderId);
  
  await 11za.sendMessage({
    to: userPhone,
    type: "text",
    content: `✅ Order #${order.orderId} confirmed!\n💰 Total: ₹${order.total}\n⏱️ Ready in: 25 mins`
  });

  await 11za.sendButtons({
    to: userPhone,
    bodyText: "What would you like to do?",
    buttons: [
      { id: "track_order", title: "Track Order" },
      { id: "contact_restaurant", title: "Call Restaurant" },
      { id: "cancel_order", title: "Cancel" }
    ]
  });
}

async sendDeliveryUpdate(orderId, deliveryBoy, location) {
  const order = await Order.findById(orderId);
  
  await 11za.sendMessage({
    to: order.userPhone,
    type: "location",
    latitude: location.lat,
    longitude: location.lng,
    locationName: `${deliveryBoy.name} - ${deliveryBoy.phone}`
  });
}

async sendPaymentLink(orderId, paymentLink) {
  const order = await Order.findById(orderId);
  
  await 11za.sendMessage({
    to: order.userPhone,
    type: "text",
    content: `💳 Complete payment for ₹${order.total}:\n${paymentLink}`
  });
}
```

---

## 🔗 Integration Flows

### Flow 1: Customer Asks for Recommendation (AI Flow)

```
Step 1: Customer sends WhatsApp message
  "Give me spicy food for 2 people"

Step 2: 11za webhook receives → /api/webhook/11za/message
  {
    "from": "919876543210",
    "message": "Give me spicy food for 2 people",
    "timestamp": "2026-03-25T18:30:00Z"
  }

Step 3: Find or create user cart session

Step 4: Call POST /api/ai/process
  Input: 
  {
    "userMessage": "Give me spicy food for 2 people",
    "userId": "919876543210",
    "restaurantId": "rest_123"
  }

Step 5: Groq processes → Returns JSON
  {
    "intent": "GET_RECOMMENDATION",
    "entities": { "spiceLevel": "high", "servings": 2 },
    "items": [...],
    "message": "🔥 For 2 people, try these...",
    "suggestedActions": ["ADD_TO_CART"]
  }

Step 6: Format for WhatsApp → Send back via 11za
  sendButtons({
    bodyText: "🔥 For 2 people, try these spicy delights:\n1. Spicy Biryani ₹220\n2. Paneer Tikka ₹180",
    buttons: [
      { id: "add_item:item_001:1", title: "Add Biryani" },
      { id: "add_item:item_002:1", title: "Add Paneer" },
      { id: "see_menu", title: "See Full Menu" }
    ]
  })

Step 7: User clicks [Add Biryani]

Step 8: /api/webhook/11za/button-click
  { buttonId: "add_item:item_001:1" }

Step 9: Add to cart → POST /api/cart/add
  {
    "itemId": "item_001",
    "quantity": 1,
    "userPhone": "919876543210"
  }

Step 10: Confirm via WhatsApp
  "✅ Added Spicy Biryani to cart. Total: ₹220"
  [Checkout] [Add More]
```

### Flow 2: Order Placement to Delivery

```
Step 1: User sends [Checkout] button click

Step 2: POST /api/order/create
  {
    "userPhone": "919876543210",
    "restaurantId": "rest_123"
  }

Step 3: System creates order + generates Razorpay link
  Order Status: PAYMENT_PENDING
  Payment Link: https://rzp.io/i/abc123

Step 4: Send payment link via 11za
  "Your order is ₹310. Pay here: [Link]"

Step 5: Customer pays on Razorpay

Step 6: Razorpay → Webhook: /api/payment/webhook
  Confirms payment

Step 7: Update order.paymentStatus = "COMPLETED"
  Order Status: CONFIRMED

Step 8: Send WhatsApp confirmation
  "✅ Payment received! Your order is in the kitchen"

Step 9: Kitchen Dashboard shows new order
  Restaurant staff marks [PREPARING]

Step 10: Order Status → PREPARING
  Customer gets: "👨‍🍳 Your food is being cooked"

Step 11: Staff marks [READY]
  Order Status → READY

Step 12: Auto-assign or manual assign delivery boy
  Order Status → ASSIGNED
  Send WhatsApp: "Ravi is on the way! [Track]"

Step 13: Delivery boy app updates status
  PICKED_UP → Send tracking to customer
  DELIVERED → Order Status → DELIVERED

Step 14: Send rating prompt
  "How was your experience? ⭐⭐⭐⭐⭐"

Step 15: Customer rates + submits feedback
  Stored in orders.review collection
```

### Flow 3: Kitchen Dashboard Order Management

```
New Order Arrives
    ↓
[Kitchen Dashboard Refresh - WebSocket]
    ↓
Display with Order #1234
├─ Items: 2x Biryani, 1x Raita
├─ Customer: 919876543210
├─ Notes: "Extra spicy"
└─ Actions: [ACCEPT] [REJECT]
    ↓
Kitchen Staff clicks [ACCEPT]
    ↓
POST /api/order/1234/status → "CONFIRMED" + "PREPARING"
    ↓
Kitchen Dashboard shows in PREP section
Dashboard updates: "5 mins remaining" (auto-countdown)
    ↓
When ready:
Kitchen Staff clicks [READY]
    ↓
POST /api/order/1234/status → "READY"
    ├─ 11za sends: "Your food is ready!"
    ├─ Triggers auto-assign delivery boy
    └─ Dashboard moves to READY section
    ↓
Delivery Boy appears → Picks up order
    ├─ Dashboard: "Ravi picked up"
    └─ Customer: "Your food is on the way"
    ↓
On Delivery:
Kitchen Dashboard shows [DELIVERED BUTTON]
    ↓
Staff confirms delivery
    ├─ Order Status: DELIVERED
    ├─ Customer gets rating prompt
    └─ Order moves to HISTORY
```

---

## 💾 MongoDB Collections Schema

```javascript
// 1. USERS COLLECTION
db.users.insertOne({
  _id: ObjectId(),
  phone: "918866666666",
  name: "Amit Kumar",
  restaurants: ["rest_123"],
  preferences: {
    spiceLevel: 3,
    dietaryRestrictions: ["vegetarian"],
    defaultAddress: "..."
  },
  createdAt: ISODate,
  lastOrderDate: ISODate
})

// 2. RESTAURANTS COLLECTION
db.restaurants.insertOne({
  _id: ObjectId(),
  restaurantId: "rest_123",
  name: "Raj Restaurant",
  phone: "01143332222",
  email: "contact@raj.com",
  address: "123 Main St, Delhi",
  cuisineType: ["Indian", "North Indian"],
  isActive: true,
  deliveryRadius: 5, // km
  deliveryFee: 50,
  minOrderValue: 150,
  operatingHours: {
    open: "11:00",
    close: "22:00",
    closedOn: ["MONDAY"]
  },
  coordinates: {
    type: "Point",
    coordinates: [28.6139, 77.2090]
  },
  avgPrepTime: 25, // minutes
  rating: 4.6,
  createdAt: ISODate
})

// 3. MENU ITEMS COLLECTION
db.menus.insertOne({
  _id: ObjectId(),
  itemId: "item_001",
  restaurantId: "rest_123",
  name: "Spicy Chicken Biryani",
  price: 220,
  category: "RICE_CURRY",
  tags: ["spicy", "chicken", "non-veg"],
  isAvailable: true,
  createdAt: ISODate
})

// 4. CARTS COLLECTION
db.carts.insertOne({
  _id: ObjectId(),
  userPhone: "918866666666",
  restaurantId: "rest_123",
  items: [
    {
      itemId: "item_001",
      quantity: 1,
      price: 220
    }
  ],
  total: 220,
  expiresAt: ISODate("2026-03-26T00:00:00Z"),
  createdAt: ISODate
})

// 5. ORDERS COLLECTION
db.orders.insertOne({
  _id: ObjectId(),
  orderId: "ord_1234567",
  userPhone: "918866666666",
  restaurantId: "rest_123",
  items: [...],
  total: 310,
  status: "CONFIRMED",
  paymentStatus: "COMPLETED",
  deliveryBoyId: "boy_456",
  createdAt: ISODate,
  updatedAt: ISODate
})

// 6. DELIVERY BOYS COLLECTION
db.delivery_boys.insertOne({
  _id: ObjectId(),
  deliveryBoyId: "boy_456",
  restaurantId: "rest_123",
  name: "Ravi Kumar",
  phone: "919234567890",
  status: "AVAILABLE",
  totalDeliveries: 450,
  averageRating: 4.7,
  createdAt: ISODate
})

// 7. PAYMENT TRANSACTIONS COLLECTION
db.payment_transactions.insertOne({
  _id: ObjectId(),
  orderId: "ord_1234567",
  paymentId: "pay_2Tz3Qg9X7Zq",
  amount: 31000, // paise
  status: "COMPLETED",
  method: "razorpay",
  webhookReceived: true,
  createdAt: ISODate
})

// 8. ADMIN/RESTAURANT ACCOUNTS
db.restaurant_admins.insertOne({
  _id: ObjectId(),
  restaurantId: "rest_123",
  email: "admin@raj.com",
  hashedPassword: "...",
  role: "ADMIN",
  permissions: ["VIEW_ORDERS", "UPDATE_MENU", "VIEW_ANALYTICS"],
  createdAt: ISODate
})
```

---

## 🚀 MVP Implementation Plan

### **Phase 1: Core Features (Weeks 1-4)**
✅ **Goal:** Functional WhatsApp ordering with AI recommendations

#### Week 1-2: Backend Foundation
- [ ] Setup Next.js + MongoDB
- [ ] Create core collections (menu, orders, users, carts)
- [ ] Implement auth + tenant isolation
- [ ] Build API routes (CRUD for menu, cart, order basics)

#### Week 3: AI Integration
- [ ] Integrate Groq API
- [ ] Build AI service with prompt templates
- [ ] Test intent detection + entity extraction
- [ ] Integrate with menu matching

#### Week 4: WhatsApp + Payments
- [ ] Setup 11za webhook handling
- [ ] Integrate Razorpay payment links
- [ ] Build basic notification service
- [ ] End-to-end test: Message → AI → Cart → Payment

#### Deliverable
- Restaurant can receive WhatsApp orders
- Customer gets AI recommendations
- Orders processed through Razorpay

---

### **Phase 2: Enhanced Features (Weeks 5-7)**
✅ **Goal:** Full kitchen dashboard + delivery tracking

- [ ] Build kitchen dashboard UI (React/Next.js)
- [ ] WebSocket integration for real-time updates
- [ ] Delivery boy assignment system
- [ ] Order status tracking + notifications
- [ ] Analytics dashboard basics

#### Deliverable
- Kitchen staff can manage orders
- Delivery boys assigned + tracked
- Customer gets real-time updates

---

### **Phase 3: Scale & Optimization (Weeks 8+)**
- [ ] Redis integration for cart (optional but recommended)
- [ ] Multi-restaurant support (swiggy-like discovery)
- [ ] Advanced AI: Upsell, reorder recommendations
- [ ] Performance optimization
- [ ] Production deployment

---

## ⚠️ Key Architectural Challenges & Solutions

### Challenge 1: State Management in Stateless WhatsApp

**Problem:** WhatsApp doesn't maintain session state.

**Solution:**
- Store cart in MongoDB with 2-hour TTL
- Use user phone + restaurant ID as composite key
- Implement cart expiry cleanup job

### Challenge 2: AI Accuracy

**Problem:** Groq might misunderstand intent or extract wrong entities.

**Solution:**
- Build comprehensive prompt templates
- Tag menu items (heavily use tags for matching)
- Add confidence scoring
- Fallback to human flow if confidence < 0.75

### Challenge 3: Order Synchronization

**Problem:** Multiple updates (kitchen, delivery, payment) happening concurrently.

**Solution:**
- Use MongoDB transactions (multi-doc ACID)
- Implement strict status machine
- Add idempotency keys to webhooks

### Challenge 4: WhatsApp UX Limitations

**Problem:** Can't show rich UI like web apps.

**Solution:**
- Use WhatsApp buttons for primary actions
- Interactive lists for menu browsing
- Template messages for consistency
- Quick replies for common flows

---

## 🔐 Security Considerations

1. **API Security**
   - JWT for restaurant admin dashboard
   - API key validation for 11za + Razorpay
   - Rate limiting on AI endpoint
   - Input validation + sanitization

2. **Data Protection**
   - Encrypt sensitive fields (phone, payment details)
   - HTTPS only
   - MongoDB field-level encryption for PII

3. **Webhook Verification**
   - Verify Razorpay signature (X-Razorpay-Signature)
   - Verify 11za webhook authenticity
   - Implement replay attack prevention

4. **Multi-tenancy**
   - Enforce restaurantId in all queries
   - Row-level security in MongoDB
   - Separate API keys per restaurant

---

## 📊 Performance Targets

| Metric | Target |
|--------|--------|
| **AI Response Time** | < 2 seconds |
| **Order Creation** | < 500ms |
| **Dashboard Load** | < 1 second |
| **Concurrent Users** | 1000+ (Phase 1) |
| **Database Query** | < 100ms (p99) |
| **WhatsApp Message Delivery** | < 5 seconds |

**Optimization Strategy:**
- Redis caching for menu
- Database indexing on hot fields (restaurantId, userPhone)
- CDN for images
- Lazy load dashboard components

---

## 🌍 Deployment Architecture

```
┌─────────────────────────┐
│   GitHub (Source)       │
└────────────┬────────────┘
             │ Push
             ↓
┌─────────────────────────┐
│  Vercel (Deployment)    │
│  • Next.js Auto-deploy  │
│  • Serverless functions │
│  • Edge functions       │
└────────────┬────────────┘
             │
    ┌────────┼────────┐
    ↓        ↓        ↓
  MongoDB  Groq    11za
  Atlas    API     API
  (Cloud)
```

**Environment Setup:**
```bash
# .env.local
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/cloudkitchen
GROQ_API_KEY=gsk_xxxxxxxxxxxxx
GROQ_MODEL_ID=mixtral-8x7b-32768
ELEVENZA_API_KEY=xxxx
ELEVANZA_WEBHOOK_SECRET=xxxx
RAZORPAY_KEY_ID=xxxxx
RAZORPAY_KEY_SECRET=xxxxx
NEXT_PUBLIC_API_URL=https://yourdomain.com
```

---

## 🔄 Future Enhancements

1. **Advanced AI**
   - Personalized recommendations based on order history
   - "Your usual?" feature
   - Seasonal recommendations

2. **Multi-Restaurant**
   - Discovery feed (like Swiggy)
   - Cross-restaurant comparison
   - Rating system

3. **Analytics**
   - Predictive demand forecasting
   - Peak hour optimization
   - AI-driven pricing recommendations

4. **Loyalty**
   - Rewards program
   - Referral system
   - VIP tier management

5. **Compliance**
   - Order tracking for delivery mandates
   - Tax compliance export
   - GST bill generation

---

## 📝 Quick Start Commands

```bash
# Clone & Setup
git clone <repo>
cd cloudkitchen
npm install

# Environment
cp .env.example .env.local
# Fill in secrets

# Development
npm run dev
# Opens http://localhost:3000

# Database
# MongoDB Atlas: Create cluster, get connection string

# Build
npm run build
npm run start

# Deploy to Vercel
vercel deploy
```

---

## 📚 API Quick Reference

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/webhook/11za` | POST | Signature | WhatsApp messages |
| `/api/ai/process` | POST | API Key | AI recommendations |
| `/api/cart/*` | GET/POST | Phone | Cart operations |
| `/api/order/*` | GET/POST | Phone | Order lifecycle |
| `/api/menu/:rest` | GET | Public | Browse menu |
| `/api/payment/webhook` | POST | Signature | Razorpay callbacks |
| `/dashboard/*` | GET | JWT | Kitchen dashboard |

---

**Document Status:** Final v1.0  
**Last Updated:** March 2026  
**Next Review:** After Phase 1 completion
