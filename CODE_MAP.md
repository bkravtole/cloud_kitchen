# 📚 CloudKitchen Architecture & Code Map

Complete guide to understanding the codebase structure and data flow.

---

## 🏗️ High-Level Architecture

```
┌─────────────────────────────────────────┐
│  WhatsApp User / Kitchen Staff          │
└────────────────┬────────────────────────┘
                 │
┌────────────────▼─────────────────────────────┐
│  11za Webhook / Kitchen Dashboard            │
│  (API Routes)                                │
└────────────────┬─────────────────────────────┘
                 │
┌────────────────▼──────────────────────────────────────┐
│  Business Logic Services                             │
│  ├─ MenuService     (Get/Filter/Search)              │
│  ├─ CartService     (Add/Remove/Calculate)           │
│  ├─ OrderService    (Create/Update/Status)           │
│  ├─ GroqService     (AI Intent & Recommendations)    │
│  ├─ 11zaService     (Send WhatsApp messages)        │
│  └─ RazorpayService (Generate payment links)         │
└────────────────┬──────────────────────────────────────┘
                 │
┌────────────────▼──────────────────────────────────────┐
│  Data Storage                                         │
│  └─ MongoDB (Users, Orders, Menu, Cart, Payments)    │
└───────────────────────────────────────────────────────┘
```

---

## 📂 File Structure & Organization

```
src/
├── app/
│   ├── api/                          # All API endpoints
│   │   ├── health/route.ts           # Service health check
│   │   ├── menu/route.ts             # Menu CRUD operations
│   │   ├── cart/route.ts             # Cart management
│   │   ├── cart/[itemId]/route.ts    # Remove item from cart
│   │   ├── order/route.ts            # Create/Get orders
│   │   ├── order/[orderId]/route.ts  # Update order status
│   │   ├── ai/process/route.ts       # AI message processing
│   │   ├── webhook/11za/route.ts     # WhatsApp webhook
│   │   └── payment/webhook/route.ts  # Razorpay webhook
│   │
│   ├── dashboard/
│   │   ├── layout.tsx                # Dashboard layout & nav
│   │   └── page.tsx                  # Main dashboard view
│   │
│   ├── layout.tsx                    # Root layout
│   ├── page.tsx                      # Home page
│   └── globals.css                   # Global styles
│
├── lib/
│   ├── db/
│   │   └── mongodb.ts                # MongoDB connection & indexes
│   │
│   ├── services/
│   │   ├── menu.ts                   # Menu business logic
│   │   ├── cart.ts                   # Cart business logic
│   │   ├── order.ts                  # Order business logic (NEW!)
│   │   ├── groq.ts                   # AI service
│   │   ├── 11za.ts                   # WhatsApp API (NEW!)
│   │   └── razorpay.ts               # Payment links (NEW!)
│   │
│   └── utils.ts                      # Utilities & helpers
│
├── types/
│   └── index.ts                      # All TypeScript interfaces
│
└── components/                       # React components (future)
```

---

## 🔄 Data Flow: Complete Order Journey

### 1️⃣ **User Sends WhatsApp Message**

```
User: "Show me spicy chicken"
            ↓
         11za receives
            ↓
  POST /api/webhook/11za
```

**File:** `src/app/api/webhook/11za/route.ts`

**Payload:**
```javascript
{
  from: "919876543210",
  text: "Show me spicy chicken",
  messageId: "msg_123",
  type: "text"
}
```

---

### 2️⃣ **Server Processes Message with AI**

```
Webhook handler
    ↓
Connect to MongoDB
    ↓
Get restaurant menu (MenuService)
    ↓
Call Groq API (processUserMessage)
    ↓
AI returns: intent, suggestedItems, response
```

**Files Involved:**
- `src/app/api/webhook/11za/route.ts` - Entry point
- `src/lib/services/menu.ts` - Get menu
- `src/lib/services/groq.ts` - AI processing
- `src/lib/db/mongodb.ts` - Database connection

**Groq Example:**
```
Input: "Show me spicy chicken"
       ↓
Groq AI analyzes
       ↓
Output: {
  intent: "GET_RECOMMENDATION",
  entities: { spiceLevel: 4, dietary: [] },
  suggestedItems: ["item_butter_chicken"],
  conversationalResponse: "Perfect! I found delicious spicy chicken..."
}
```

---

### 3️⃣ **Server Sends Response Back**

```
Format response with suggested items
            ↓
Call 11za API (ElevenZaService)
            ↓
Send WhatsApp message back to user
```

**Service:** `src/lib/services/11za.ts`

**Code:**
```typescript
await get11zaService().sendTextMessage(
  "919876543210",
  "Perfect! I found delicious spicy chicken..."
);
```

**11za API Call:**
```
POST https://internal.11za.in/apis/send_message
Authorization: Bearer {11ZA_API_KEY}
{
  to: "919876543210",
  text: "Perfect! I found..."
}
```

---

### 4️⃣ **User Adds Items to Cart**

```
POST /api/cart
{
  userPhone: "919876543210",
  restaurantId: "rest_001",
  item: { itemId, name, price, quantity }
}
            ↓
CartService.addItemToCart()
            ↓
Calculate: subtotal, tax, deliveryCharges, total
            ↓
Save to MongoDB (carts collection)
            ↓
Return updated cart
```

**Service:** `src/lib/services/cart.ts`

**MongoDB Collection:**
```javascript
{
  _id: ObjectId,
  userPhone: "919876543210",
  restaurantId: "rest_001",
  items: [
    { itemId, name, price, quantity, addons }
  ],
  subtotal: 700,
  tax: 35,
  deliveryCharges: 30,
  total: 765,
  expiresAt: Date(+2 hours),
  createdAt, updatedAt
}
```

---

### 5️⃣ **User Checks Out (Creates Order)**

```
POST /api/order
{
  userPhone, userName, restaurantId,
  items: [...],
  specialInstructions
}
            ↓
OrderService.createOrder()
            ↓
Generate orderId
            ↓
Calculate totals
            ↓
Save order to MongoDB
            ↓
Generate Razorpay payment link
            ↓
Return paymentLink + orderId
```

**Service:** `src/lib/services/order.ts`  
**Razorpay Service:** `src/lib/services/razorpay.ts`

**MongoDB Collection:**
```javascript
{
  orderId: "ord_1711234567_abc123",
  userPhone: "919876543210",
  restaurantId: "rest_001",
  items: [...],
  subtotal: 700,
  tax: 35,
  deliveryCharges: 30,
  total: 765,
  status: "CREATED",
  paymentStatus: "PENDING",
  razorpayOrderId: "plink_123abc",
  createdAt, updatedAt
}
```

---

### 6️⃣ **User Completes Payment**

```
User clicks payment link
            ↓
Razorpay payment gateway
            ↓
User enters card details
            ↓
Payment processed
            ↓
Razorpay sends webhook
```

**Webhook Target:** `POST /api/payment/webhook`

**Razorpay Payload:**
```javascript
{
  event: "payment.authorized",
  payload: {
    id: "plink_123abc",
    notes: { orderId: "ord_1711234567_abc123" },
    amount: 76500  // in paise (₹765)
  }
}
```

---

### 7️⃣ **Server Confirms Payment & Updates Order**

```
POST /api/payment/webhook
            ↓
Verify signature (HMAC-SHA256)
            ↓
Extract orderId from notes
            ↓
OrderService.updatePaymentStatus()
            ↓
Set: status = "CONFIRMED", paymentStatus = "AUTHORIZED"
            ↓
Save to MongoDB
            ↓
TODO: Send confirmation WhatsApp message
```

**Code in `src/app/api/payment/webhook/route.ts`:**
```typescript
await orderService.updatePaymentStatus(
  orderId,
  paymentId,
  'AUTHORIZED'
);
```

---

### 8️⃣ **Kitchen Dashboard Shows Order**

```
Kitchen staff opens dashboard
            ↓
Browser requests: GET /api/order?restaurantId=rest_001
            ↓
OrderService.getOrdersByRestaurant()
            ↓
Returns 50 most recent orders
            ↓
Dashboard displays in real-time
```

**Dashboard:** `src/app/dashboard/page.tsx`

Orders shown by status:
- **NEW:** status = "CONFIRMED"
- **PREPARING:** status = "PREPARING"
- **READY:** status = "READY"

---

### 9️⃣ **Kitchen Updates Order Status**

```
Kitchen staff clicks: Preparing → Ready → Delivered
            ↓
PATCH /api/order/{orderId}
{
  status: "READY",
  restaurantId: "rest_001"
}
            ↓
OrderService.updateOrderStatus()
            ↓
Save to MongoDB
            ↓
Dashboard refreshes (polls every 5 seconds)
```

---

## 🔑 Key Files to Know

### **Entry Points (API Routes)**

| File | Purpose | Receives | Returns |
|------|---------|----------|---------|
| `menu/route.ts` | Menu CRUD | GET/POST | Items array |
| `cart/route.ts` | Cart ops | GET/POST | Cart object |
| `order/route.ts` | Orders | POST/GET | Order + payment link |
| `webhook/11za/route.ts` | Messages | WhatsApp | 200 OK (async response) |
| `ai/process/route.ts` | AI | text message | Intent + items |
| `payment/webhook/route.ts` | Razorpay | Payment event | 200 OK |

### **Services (Business Logic)**

| File | Purpose | Key Methods |
|------|---------|-------------|
| `menu.ts` | Menu operations | getMenuByRestaurant(), searchMenu(), filterMenuByPreferences() |
| `cart.ts` | Cart operations | addItemToCart(), removeItemFromCart(), getCart() |
| `order.ts` | Order operations | createOrder(), updateOrderStatus(), updatePaymentStatus() |
| `groq.ts` | AI processing | processUserMessage(), filterMenuByPreferences() |
| `11za.ts` | WhatsApp API | sendTextMessage(), sendButtonMessage() |
| `razorpay.ts` | Payments | generatePaymentLink(), verifyPaymentLink() |

### **Database (MongoDB)**

| Collection | Purpose | Key Fields |
|-----------|---------|-----------|
| `users` | Customer profiles | phone (unique), name, preferences |
| `restaurants` | Restaurant info | restaurantId (unique), name, address |
| `menus` | Menu items | itemId, restaurantId, tags, price |
| `carts` | Shopping carts | userPhone + restaurantId (unique), items, expiresAt (TTL) |
| `orders` | Order records | orderId (unique), status, paymentStatus |
| `payment_transactions` | Payments | orderId, paymentId, status |

---

## 🚚 Week 6: Delivery Management System

### **Delivery Workflow**

```
Order READY
    ↓
Kitchen assigns delivery boy
    ↓
POST /api/delivery/assign
    ↓
DeliveryService.createAssignment()
    ↓
Generates assignmentId
    ↓
Returns deliveryBoyPhone, vehicleType, ETA
    ↓
Kitchen notifies delivery boy
    ↓
Delivery boy starts location tracking via SSE stream
    ↓
Customer views live tracking on /delivery-tracking
    ↓
Kitchen staff monitors on /kitchen/delivery-dashboard
    ↓
Delivery status: ASSIGNED → PICKED_UP → IN_TRANSIT → DELIVERED
```

### **New Pages (UI)**

| Page | Path | Purpose |
|------|------|---------|
| Customer Tracking | `/delivery-tracking` | Real-time delivery status with live location updates |
| Kitchen Dashboard | `/kitchen/delivery-dashboard` | Monitor all active deliveries and assign delivery boys |

### **New API Routes**

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/delivery/assign` | POST | Assign delivery boy to order |
| `/api/delivery/location` | GET | Get current delivery location |
| `/api/delivery/assignments` | GET | List active assignments |
| `/api/delivery/register` | POST | Register new delivery boy |
| `/api/delivery/location/update` | PATCH | Update delivery location (from delivery boy app) |
| `/api/stream/kitchen` | GET | SSE stream for kitchen dashboard |

### **Database Collections**

```javascript
// collections/delivery_assignments
{
  assignmentId: "da_1711234567_abc123",
  restaurantId: "rest_001",
  deliveryBoyId: "db_001",
  deliveryBoyName: "Raj Kumar",
  deliveryBoyPhone: "919876543210",
  vehicleType: "bike" | "scooter" | "car",
  vehicleNumber: "DL01AB1234",
  orderIds: ["ord_123", "ord_124"],
  status: "ASSIGNED" | "PICKED_UP" | "IN_TRANSIT" | "DELIVERED",
  latitude: 28.6139,
  longitude: 77.2090,
  estimatedDeliveryTime: "2024-03-26T19:45:00Z",
  deliveryAddress: "123 Market Street...",
  createdAt: Date,
  updatedAt: Date
}

// collections/delivery_boys
{
  deliveryBoyId: "db_001",
  restaurantId: "rest_001",
  name: "Raj Kumar",
  phone: "919876543210",
  vehicleType: "bike",
  vehicleNumber: "DL01AB1234",
  status: "ACTIVE" | "INACTIVE",
  rating: 4.5,
  completedDeliveries: 156,
  createdAt: Date
}
```

### **Real-Time Streaming (SSE)**

Stream endpoint: `/api/stream/kitchen?restaurantId=rest_001`

**Events:**
```javascript
// New delivery assigned
{
  event: "delivery_assigned",
  assignmentId: "da_123",
  assignment: { /* full assignment object */ }
}

// Location update
{
  event: "delivery_location_update",
  assignmentId: "da_123",
  latitude: 28.6139,
  longitude: 77.2090,
  distanceRemaining: 2.5
}

// Status update
{
  event: "delivery_status_update",
  assignmentId: "da_123",
  status: "IN_TRANSIT"
}
```

### **Key Features**

✅ **Assignment Workflow**: Assign delivery boys and generate unique assignment IDs  
✅ **Location Tracking**: Real-time GPS updates via SSE stream  
✅ **Status Management**: 4-step delivery status (ASSIGNED → PICKED_UP → IN_TRANSIT → DELIVERED)  
✅ **Customer Tracking**: Beautiful UI for customers to track deliveries in real-time  
✅ **Kitchen Dashboard**: Kitchen staff can monitor, assign, and update delivery status  
✅ **Live Notifications**: Events pushed to both kitchen and customer via SSE  

---

## 🚚 Week 6: Delivery Management System

### **Delivery Workflow**

```
Order READY
    ↓
Kitchen assigns delivery boy
    ↓
POST /api/delivery/assign
    ↓
DeliveryService.createAssignment()
    ↓
Generates assignmentId
    ↓
Returns deliveryBoyPhone, vehicleType, ETA
    ↓
Kitchen notifies delivery boy
    ↓
Delivery boy starts location tracking via SSE stream
    ↓
Customer views live tracking on /delivery-tracking
    ↓
Kitchen staff monitors on /kitchen/delivery-dashboard
    ↓
Delivery status: ASSIGNED → PICKED_UP → IN_TRANSIT → DELIVERED
```

### **New Pages (UI)**

| Page | Path | Purpose |
|------|------|---------|
| Customer Tracking | `/delivery-tracking` | Real-time delivery status with live location updates |
| Kitchen Dashboard | `/kitchen/delivery-dashboard` | Monitor all active deliveries and assign delivery boys |

### **New API Routes**

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/delivery/assign` | POST | Assign delivery boy to order |
| `/api/delivery/location` | GET | Get current delivery location |
| `/api/delivery/assignments` | GET | List active assignments |
| `/api/delivery/register` | POST | Register new delivery boy |
| `/api/delivery/location/update` | PATCH | Update delivery location (from delivery boy app) |
| `/api/stream/kitchen` | GET | SSE stream for kitchen dashboard |

### **Database Collections**

```javascript
// collections/delivery_assignments
{
  assignmentId: "da_1711234567_abc123",
  restaurantId: "rest_001",
  deliveryBoyId: "db_001",
  deliveryBoyName: "Raj Kumar",
  deliveryBoyPhone: "919876543210",
  vehicleType: "bike" | "scooter" | "car",
  vehicleNumber: "DL01AB1234",
  orderIds: ["ord_123", "ord_124"],
  status: "ASSIGNED" | "PICKED_UP" | "IN_TRANSIT" | "DELIVERED",
  latitude: 28.6139,
  longitude: 77.2090,
  estimatedDeliveryTime: "2024-03-26T19:45:00Z",
  deliveryAddress: "123 Market Street...",
  createdAt: Date,
  updatedAt: Date
}

// collections/delivery_boys
{
  deliveryBoyId: "db_001",
  restaurantId: "rest_001",
  name: "Raj Kumar",
  phone: "919876543210",
  vehicleType: "bike",
  vehicleNumber: "DL01AB1234",
  status: "ACTIVE" | "INACTIVE",
  rating: 4.5,
  completedDeliveries: 156,
  createdAt: Date
}
```

### **Real-Time Streaming (SSE)**

Stream endpoint: `/api/stream/kitchen?restaurantId=rest_001`

**Events:**
```javascript
// New delivery assigned
{
  event: "delivery_assigned",
  assignmentId: "da_123",
  assignment: { /* full assignment object */ }
}

// Location update
{
  event: "delivery_location_update",
  assignmentId: "da_123",
  latitude: 28.6139,
  longitude: 77.2090,
  distanceRemaining: 2.5
}

// Status update
{
  event: "delivery_status_update",
  assignmentId: "da_123",
  status: "IN_TRANSIT"
}
```

### **Key Features**

✅ **Assignment Workflow**: Assign delivery boys and generate unique assignment IDs  
✅ **Location Tracking**: Real-time GPS updates via SSE stream  
✅ **Status Management**: 4-step delivery status (ASSIGNED → PICKED_UP → IN_TRANSIT → DELIVERED)  
✅ **Customer Tracking**: Beautiful UI for customers to track deliveries in real-time  
✅ **Kitchen Dashboard**: Kitchen staff can monitor, assign, and update delivery status  
✅ **Live Notifications**: Events pushed to both kitchen and customer via SSE  

---

## 📊 Week 7: Analytics & Polish

### **Analytics Overview**

```
Customer Orders Historical Data
    ↓
GET /api/analytics/overview?restaurantId=rest_001&dateRange=today
    ↓
Aggregate metrics (revenue, order count, top items)
    ↓
Group by status and hour
    ↓
Return comprehensive dashboard data
```

### **New Pages (UI)**

| Page | Path | Purpose |
|------|------|---------|
| Kitchen Analytics | `/kitchen/analytics` | Revenue, orders, top items, peak hours |
| Order History | `/orders/history` | Customer view of past orders with reorder |
| Reorder Recommendations | `/recommendations` | AI-powered favorites and suggestions |
| Home/Landing | `/` | Updated with all feature links |

### **New API Routes**

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/analytics/overview` | GET | Get restaurant metrics (revenue, orders, items) |
| `/api/order/history` | GET | Get past orders for a customer |
| `/api/order/reorder-recommendations` | GET | Get favorites and recommendations |

### **Analytics Metrics**

```javascript
GET /api/analytics/overview?restaurantId=rest_001&dateRange=today

Response:
{
  totalOrders: 45,
  totalRevenue: "8750.50",
  averageOrderValue: "194.46",
  conversionRate: 95,
  topItems: [
    { itemId, name, quantity, revenue }
  ],
  ordersByStatus: { CONFIRMED, PREPARING, READY, DELIVERED },
  ordersByHour: [
    { hour: 0, count: 2 },
    { hour: 12, count: 15 },
    ...
  ]
}
```

### **Order History & Reorder**

```javascript
GET /api/order/history?userPhone=919876543210&limit=20&skip=0

Response:
{
  data: [
    {
      orderId: "ord_123",
      restaurantId: "rest_001",
      restaurantName: "Pizza Palace",
      items: [...],
      total: 450,
      status: "DELIVERED",
      createdAt: Date,
      itemCount: 3
    }
  ],
  pagination: { total, limit, skip }
}
```

### **Reorder Intelligence**

```javascript
GET /api/order/reorder-recommendations?userPhone=919876543210&restaurantId=rest_001

Response:
{
  frequentItems: [
    { itemId, name, price, timesOrdered: 5 }  // Ordered 2+ times
  ],
  lastOrdered: [
    { itemId, name, price, orderedAt }  // Most recent orders
  ],
  recommendations: [
    { itemId, name, price, reason }  // Popular items not yet tried
  ]
}
```

### **Dashboard Features**

**Kitchen Analytics Dashboard:**
✅ KPI cards (Total Orders, Revenue, AOV, Conversion Rate)
✅ Orders by status breakdown with progress bars
✅ Peak hours bar chart
✅ Top 10 selling items table
✅ Date range filter (Today/Week/Month)
✅ Real-time metrics refresh

**Customer Features:**
✅ Order history with pagination
✅ Filter by restaurant
✅ One-click reorder for delivered orders
✅ AI-powered favorite items
✅ Reorder recommendations page
✅ Recently ordered items

### **Key Features**

✅ **Business Intelligence**: Track revenue, top items, order trends  
✅ **Order History**: Complete customer order management  
✅ **Reorder System**: One-click reordering for delivered orders  
✅ **AI Recommendations**: Smart suggestions based on order history  
✅ **Analytics Dashboard**: Visual insights for restaurant staff  
✅ **UI Polish**: Improved navigation, better UX across all pages  

---

### **Pages Summary**

| Page | Path | Audience | Status |
|------|------|----------|--------|
| Home/Landing | `/` | All | ✅ Updated |
| Kitchen Dashboard | `/dashboard` | Kitchen Staff | ✅ Week 5 |
| Delivery Dashboard | `/kitchen/delivery-dashboard` | Kitchen Staff | ✅ Week 6 |
| Analytics Dashboard | `/kitchen/analytics` | Kitchen Manager | ✅ Week 7 |
| Track Delivery | `/delivery-tracking` | Customer | ✅ Week 6 |
| Order History | `/orders/history` | Customer | ✅ Week 7 |
| Recommendations | `/recommendations` | Customer | ✅ Week 7 |

---

## 🤖 Advanced AI Recommendations (Phase 3)

### **AI-Powered Intelligence**

```
User Profile Analysis
    ↓
Order History Mining
    ↓
Preference Extraction
    ↓
Groq Mixtral LLM
    ↓
Personalized Recommendations
    ↓
Meal Combination Pairing
    ↓
Trending Items Analysis
    ↓
UI Presentation
```

### **What Makes It Advanced**

✅ **Personalized by AI** - Groq Mixtral analyzes preferences holistically  
✅ **Context-Aware** - Time of day, season, day of week considered  
✅ **Smart Pairing** - Suggests complementary items that go together  
✅ **Confidence Scored** - Each recommendation has 0-1 confidence score  
✅ **Trending Integration** - Combines personal + popular items  
✅ **User Profile** - Shows analyzed dietary preferences and budget  

### **New Features**

| Feature | Purpose | API | UI |
|---------|---------|-----|-----|
| Personalized AI Recommendations | Groq-powered suggestions | `/advanced` | Cards |
| User Profile Display | Show analyzed preferences | `/advanced` | Profile Card |
| Meal Combinations | Complementary item pairings | `/advanced` | Section |
| Trending Items | Popular items last 7 days | `/advanced` | Showcase |
| Confidence Scoring | Quality indication per item | `/advanced` | Percentage |

### **API Endpoint**

```
GET /api/recommendations/advanced
  ?userPhone=919876543210
  &restaurantId=rest_001
  &includeCombo=true
  &includeTrending=true
  &limit=5
```

**Response:**
```javascript
{
  success: true,
  data: {
    personalized: [
      {
        itemId, name, price, reasoning, confidence,
        category, tags, complementaryItems, mealTiming
      }
    ],
    combinations: [...],  // Meal pairings
    trending: [...],      // Popular items
    userProfile: {
      totalOrders, favoriteCategories, spicePreference
    }
  }
}
```

### **Pages**

| Page | Path | Purpose |
|------|------|---------|
| Advanced Recommendations | `/advanced-recommendations` | AI recommendations + combos + trending |

### **Service Functions**

**File:** `src/lib/services/advanced-recommendations.ts`

```typescript
getAdvancedRecommendations()    // Main personalized AI
getMealCombinations()           // Pairing items
analyzeUserPreferences()        // Extract from history
getTrendingRecommendations()    // Popular items
```

### **Groq Integration**

- Model: `mixtral-8x7b-32768`
- Temperature: 0.7 (balanced)
- Max Tokens: 2000
- Prompt Engineering: Context-aware with user profile

### **Recommendation Types**

1. **Personalized** - Based on user's dietary, budget, history
2. **Combinations** - Groq-generated meal pairings
3. **Trending** - Popular items aggregated last 7 days

### **Preference Analysis Algorithm**

```
Input: User's order history
  ↓
1. Extract item frequency
2. Count by category
3. Calculate average spice level
4. Calculate average spend
5. Infer dietary restrictions
6. Build constraints (allergies, disliked items)
  ↓
Output: UserPreferences object
```

### **Time-Based Logic**

- Morning (6-12): Breakfast items
- Afternoon (12-17): Lunch items  
- Evening (17-21): Dinner items
- Night (21-6): Snacks/desserts

### **Key Technologies**

- **Groq API** - LLM for intelligent analysis
- **Mixtral 8x7B** - Fast, accurate model
- **MongoDB** - Order history aggregation
- **TypeScript** - Type-safe implementation

### **Confidence Scoring**

- 0.90-1.0 ⭐ Perfect Match (exact favorite)
- 0.75-0.89 ✅ Good Match (preference aligned)
- 0.50-0.74 👍 Interesting (partial match)
- <0.50 🤔 Discovery (new possibility)

---

## ⚙️ How to Add a New Feature

### Example: Add "Reorder" Feature

**Step 1: Add API Route**
```typescript
// src/app/api/order/recent/route.ts
export async function GET(request) {
  const userPhone = searchParams.get('userPhone');
  const orderService = new OrderService(db);
  const recentOrders = await orderService.getOrdersByUser(userPhone);
  return NextResponse.json({ data: recentOrders });
}
```

**Step 2: Use in Service**
Already exists in `OrderService.getOrdersByUser()`

**Step 3: Call from Frontend**
```typescript
const recentOrders = await fetch(`/api/order/recent?userPhone=919876543210`);
```

**Step 4: Test**
```bash
curl "http://localhost:3000/api/order/recent?userPhone=919876543210"
```

---

## 🧪 Testing Pattern

```
1. Prepare data (create menu, add to cart)
   ↓
2. Call API endpoint
   ↓
3. Verify MongoDB state
   ↓
4. Check response
```

**Test file:** `TESTING_GUIDE.md`

---

## 📊 Performance Tips

1. **Always filter by restaurantId** - Prevents data leaks
2. **Use MongoDB indexes** - Auto-created on startup
3. **Cart auto-expires** - TTL index cleans old carts
4. **Pagination ready** - Use `getPaginationParams()`
5. **Async operations** - All service calls are async

---

## 🔐 Security Checklist

- ✅ Phone number validation
- ✅ Razorpay signature verification
- ✅ 11za signature verification (TODO: enable)
- ⚠️ JWT auth for dashboard (TODO: implement)
- ⚠️ Rate limiting (TODO: enforce)
- ⚠️ Input sanitization (TODO: add)

---

**Questions? See:** `DEVELOPMENT.md` | `TESTING_GUIDE.md` | `PHASE1_COMPLETION.md`

# 📚 CloudKitchen Architecture & Code Map

Complete guide to understanding the codebase structure and data flow.

---

## 🏗️ High-Level Architecture

```
┌─────────────────────────────────────────┐
│  WhatsApp User / Kitchen Staff          │
└────────────────┬────────────────────────┘
                 │
┌────────────────▼─────────────────────────────┐
│  11za Webhook / Kitchen Dashboard            │
│  (API Routes)                                │
└────────────────┬─────────────────────────────┘
                 │
┌────────────────▼──────────────────────────────────────┐
│  Business Logic Services                             │
│  ├─ MenuService     (Get/Filter/Search)              │
│  ├─ CartService     (Add/Remove/Calculate)           │
│  ├─ OrderService    (Create/Update/Status)           │
│  ├─ GroqService     (AI Intent & Recommendations)    │
│  ├─ 11zaService     (Send WhatsApp messages)        │
│  └─ RazorpayService (Generate payment links)         │
└────────────────┬──────────────────────────────────────┘
                 │
┌────────────────▼──────────────────────────────────────┐
│  Data Storage                                         │
│  └─ MongoDB (Users, Orders, Menu, Cart, Payments)    │
└───────────────────────────────────────────────────────┘
```

---

## 📂 File Structure & Organization

```
src/
├── app/
│   ├── api/                          # All API endpoints
│   │   ├── health/route.ts           # Service health check
│   │   ├── menu/route.ts             # Menu CRUD operations
│   │   ├── cart/route.ts             # Cart management
│   │   ├── cart/[itemId]/route.ts    # Remove item from cart
│   │   ├── order/route.ts            # Create/Get orders
│   │   ├── order/[orderId]/route.ts  # Update order status
│   │   ├── ai/process/route.ts       # AI message processing
│   │   ├── webhook/11za/route.ts     # WhatsApp webhook
│   │   └── payment/webhook/route.ts  # Razorpay webhook
│   │
│   ├── dashboard/
│   │   ├── layout.tsx                # Dashboard layout & nav
│   │   └── page.tsx                  # Main dashboard view
│   │
│   ├── layout.tsx                    # Root layout
│   ├── page.tsx                      # Home page
│   └── globals.css                   # Global styles
│
├── lib/
│   ├── db/
│   │   └── mongodb.ts                # MongoDB connection & indexes
│   │
│   ├── services/
│   │   ├── menu.ts                   # Menu business logic
│   │   ├── cart.ts                   # Cart business logic
│   │   ├── order.ts                  # Order business logic (NEW!)
│   │   ├── groq.ts                   # AI service
│   │   ├── 11za.ts                   # WhatsApp API (NEW!)
│   │   └── razorpay.ts               # Payment links (NEW!)
│   │
│   └── utils.ts                      # Utilities & helpers
│
├── types/
│   └── index.ts                      # All TypeScript interfaces
│
└── components/                       # React components (future)
```

---

## 🔄 Data Flow: Complete Order Journey

### 1️⃣ **User Sends WhatsApp Message**

```
User: "Show me spicy chicken"
            ↓
         11za receives
            ↓
  POST /api/webhook/11za
```

**File:** `src/app/api/webhook/11za/route.ts`

**Payload:**
```javascript
{
  from: "919876543210",
  text: "Show me spicy chicken",
  messageId: "msg_123",
  type: "text"
}
```

---

### 2️⃣ **Server Processes Message with AI**

```
Webhook handler
    ↓
Connect to MongoDB
    ↓
Get restaurant menu (MenuService)
    ↓
Call Groq API (processUserMessage)
    ↓
AI returns: intent, suggestedItems, response
```

**Files Involved:**
- `src/app/api/webhook/11za/route.ts` - Entry point
- `src/lib/services/menu.ts` - Get menu
- `src/lib/services/groq.ts` - AI processing
- `src/lib/db/mongodb.ts` - Database connection

**Groq Example:**
```
Input: "Show me spicy chicken"
       ↓
Groq AI analyzes
       ↓
Output: {
  intent: "GET_RECOMMENDATION",
  entities: { spiceLevel: 4, dietary: [] },
  suggestedItems: ["item_butter_chicken"],
  conversationalResponse: "Perfect! I found delicious spicy chicken..."
}
```

---

### 3️⃣ **Server Sends Response Back**

```
Format response with suggested items
            ↓
Call 11za API (ElevenZaService)
            ↓
Send WhatsApp message back to user
```

**Service:** `src/lib/services/11za.ts`

**Code:**
```typescript
await get11zaService().sendTextMessage(
  "919876543210",
  "Perfect! I found delicious spicy chicken..."
);
```

**11za API Call:**
```
POST https://internal.11za.in/apis/send_message
Authorization: Bearer {11ZA_API_KEY}
{
  to: "919876543210",
  text: "Perfect! I found..."
}
```

---

### 4️⃣ **User Adds Items to Cart**

```
POST /api/cart
{
  userPhone: "919876543210",
  restaurantId: "rest_001",
  item: { itemId, name, price, quantity }
}
            ↓
CartService.addItemToCart()
            ↓
Calculate: subtotal, tax, deliveryCharges, total
            ↓
Save to MongoDB (carts collection)
            ↓
Return updated cart
```

**Service:** `src/lib/services/cart.ts`

**MongoDB Collection:**
```javascript
{
  _id: ObjectId,
  userPhone: "919876543210",
  restaurantId: "rest_001",
  items: [
    { itemId, name, price, quantity, addons }
  ],
  subtotal: 700,
  tax: 35,
  deliveryCharges: 30,
  total: 765,
  expiresAt: Date(+2 hours),
  createdAt, updatedAt
}
```

---

### 5️⃣ **User Checks Out (Creates Order)**

```
POST /api/order
{
  userPhone, userName, restaurantId,
  items: [...],
  specialInstructions
}
            ↓
OrderService.createOrder()
            ↓
Generate orderId
            ↓
Calculate totals
            ↓
Save order to MongoDB
            ↓
Generate Razorpay payment link
            ↓
Return paymentLink + orderId
```

**Service:** `src/lib/services/order.ts`  
**Razorpay Service:** `src/lib/services/razorpay.ts`

**MongoDB Collection:**
```javascript
{
  orderId: "ord_1711234567_abc123",
  userPhone: "919876543210",
  restaurantId: "rest_001",
  items: [...],
  subtotal: 700,
  tax: 35,
  deliveryCharges: 30,
  total: 765,
  status: "CREATED",
  paymentStatus: "PENDING",
  razorpayOrderId: "plink_123abc",
  createdAt, updatedAt
}
```

---

### 6️⃣ **User Completes Payment**

```
User clicks payment link
            ↓
Razorpay payment gateway
            ↓
User enters card details
            ↓
Payment processed
            ↓
Razorpay sends webhook
```

**Webhook Target:** `POST /api/payment/webhook`

**Razorpay Payload:**
```javascript
{
  event: "payment.authorized",
  payload: {
    id: "plink_123abc",
    notes: { orderId: "ord_1711234567_abc123" },
    amount: 76500  // in paise (₹765)
  }
}
```

---

### 7️⃣ **Server Confirms Payment & Updates Order**

```
POST /api/payment/webhook
            ↓
Verify signature (HMAC-SHA256)
            ↓
Extract orderId from notes
            ↓
OrderService.updatePaymentStatus()
            ↓
Set: status = "CONFIRMED", paymentStatus = "AUTHORIZED"
            ↓
Save to MongoDB
            ↓
TODO: Send confirmation WhatsApp message
```

**Code in `src/app/api/payment/webhook/route.ts`:**
```typescript
await orderService.updatePaymentStatus(
  orderId,
  paymentId,
  'AUTHORIZED'
);
```

---

### 8️⃣ **Kitchen Dashboard Shows Order**

```
Kitchen staff opens dashboard
            ↓
Browser requests: GET /api/order?restaurantId=rest_001
            ↓
OrderService.getOrdersByRestaurant()
            ↓
Returns 50 most recent orders
            ↓
Dashboard displays in real-time
```

**Dashboard:** `src/app/dashboard/page.tsx`

Orders shown by status:
- **NEW:** status = "CONFIRMED"
- **PREPARING:** status = "PREPARING"
- **READY:** status = "READY"

---

### 9️⃣ **Kitchen Updates Order Status**

```
Kitchen staff clicks: Preparing → Ready → Delivered
            ↓
PATCH /api/order/{orderId}
{
  status: "READY",
  restaurantId: "rest_001"
}
            ↓
OrderService.updateOrderStatus()
            ↓
Save to MongoDB
            ↓
Dashboard refreshes (polls every 5 seconds)
```

---

## 🔑 Key Files to Know

### **Entry Points (API Routes)**

| File | Purpose | Receives | Returns |
|------|---------|----------|---------|
| `menu/route.ts` | Menu CRUD | GET/POST | Items array |
| `cart/route.ts` | Cart ops | GET/POST | Cart object |
| `order/route.ts` | Orders | POST/GET | Order + payment link |
| `webhook/11za/route.ts` | Messages | WhatsApp | 200 OK (async response) |
| `ai/process/route.ts` | AI | text message | Intent + items |
| `payment/webhook/route.ts` | Razorpay | Payment event | 200 OK |

### **Services (Business Logic)**

| File | Purpose | Key Methods |
|------|---------|-------------|
| `menu.ts` | Menu operations | getMenuByRestaurant(), searchMenu(), filterMenuByPreferences() |
| `cart.ts` | Cart operations | addItemToCart(), removeItemFromCart(), getCart() |
| `order.ts` | Order operations | createOrder(), updateOrderStatus(), updatePaymentStatus() |
| `groq.ts` | AI processing | processUserMessage(), filterMenuByPreferences() |
| `11za.ts` | WhatsApp API | sendTextMessage(), sendButtonMessage() |
| `razorpay.ts` | Payments | generatePaymentLink(), verifyPaymentLink() |

### **Database (MongoDB)**

| Collection | Purpose | Key Fields |
|-----------|---------|-----------|
| `users` | Customer profiles | phone (unique), name, preferences |
| `restaurants` | Restaurant info | restaurantId (unique), name, address |
| `menus` | Menu items | itemId, restaurantId, tags, price |
| `carts` | Shopping carts | userPhone + restaurantId (unique), items, expiresAt (TTL) |
| `orders` | Order records | orderId (unique), status, paymentStatus |
| `payment_transactions` | Payments | orderId, paymentId, status |

---

## 🚚 Week 6: Delivery Management System

### **Delivery Workflow**

```
Order READY
    ↓
Kitchen assigns delivery boy
    ↓
POST /api/delivery/assign
    ↓
DeliveryService.createAssignment()
    ↓
Generates assignmentId
    ↓
Returns deliveryBoyPhone, vehicleType, ETA
    ↓
Kitchen notifies delivery boy
    ↓
Delivery boy starts location tracking via SSE stream
    ↓
Customer views live tracking on /delivery-tracking
    ↓
Kitchen staff monitors on /kitchen/delivery-dashboard
    ↓
Delivery status: ASSIGNED → PICKED_UP → IN_TRANSIT → DELIVERED
```

### **New Pages (UI)**

| Page | Path | Purpose |
|------|------|---------|
| Customer Tracking | `/delivery-tracking` | Real-time delivery status with live location updates |
| Kitchen Dashboard | `/kitchen/delivery-dashboard` | Monitor all active deliveries and assign delivery boys |

### **New API Routes**

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/delivery/assign` | POST | Assign delivery boy to order |
| `/api/delivery/location` | GET | Get current delivery location |
| `/api/delivery/assignments` | GET | List active assignments |
| `/api/delivery/register` | POST | Register new delivery boy |
| `/api/delivery/location/update` | PATCH | Update delivery location (from delivery boy app) |
| `/api/stream/kitchen` | GET | SSE stream for kitchen dashboard |

### **Database Collections**

```javascript
// collections/delivery_assignments
{
  assignmentId: "da_1711234567_abc123",
  restaurantId: "rest_001",
  deliveryBoyId: "db_001",
  deliveryBoyName: "Raj Kumar",
  deliveryBoyPhone: "919876543210",
  vehicleType: "bike" | "scooter" | "car",
  vehicleNumber: "DL01AB1234",
  orderIds: ["ord_123", "ord_124"],
  status: "ASSIGNED" | "PICKED_UP" | "IN_TRANSIT" | "DELIVERED",
  latitude: 28.6139,
  longitude: 77.2090,
  estimatedDeliveryTime: "2024-03-26T19:45:00Z",
  deliveryAddress: "123 Market Street...",
  createdAt: Date,
  updatedAt: Date
}

// collections/delivery_boys
{
  deliveryBoyId: "db_001",
  restaurantId: "rest_001",
  name: "Raj Kumar",
  phone: "919876543210",
  vehicleType: "bike",
  vehicleNumber: "DL01AB1234",
  status: "ACTIVE" | "INACTIVE",
  rating: 4.5,
  completedDeliveries: 156,
  createdAt: Date
}
```

### **Real-Time Streaming (SSE)**

Stream endpoint: `/api/stream/kitchen?restaurantId=rest_001`

**Events:**
```javascript
// New delivery assigned
{
  event: "delivery_assigned",
  assignmentId: "da_123",
  assignment: { /* full assignment object */ }
}

// Location update
{
  event: "delivery_location_update",
  assignmentId: "da_123",
  latitude: 28.6139,
  longitude: 77.2090,
  distanceRemaining: 2.5
}

// Status update
{
  event: "delivery_status_update",
  assignmentId: "da_123",
  status: "IN_TRANSIT"
}
```

### **Key Features**

✅ **Assignment Workflow**: Assign delivery boys and generate unique assignment IDs  
✅ **Location Tracking**: Real-time GPS updates via SSE stream  
✅ **Status Management**: 4-step delivery status (ASSIGNED → PICKED_UP → IN_TRANSIT → DELIVERED)  
✅ **Customer Tracking**: Beautiful UI for customers to track deliveries in real-time  
✅ **Kitchen Dashboard**: Kitchen staff can monitor, assign, and update delivery status  
✅ **Live Notifications**: Events pushed to both kitchen and customer via SSE  

---

## 🚚 Week 6: Delivery Management System

### **Delivery Workflow**

```
Order READY
    ↓
Kitchen assigns delivery boy
    ↓
POST /api/delivery/assign
    ↓
DeliveryService.createAssignment()
    ↓
Generates assignmentId
    ↓
Returns deliveryBoyPhone, vehicleType, ETA
    ↓
Kitchen notifies delivery boy
    ↓
Delivery boy starts location tracking via SSE stream
    ↓
Customer views live tracking on /delivery-tracking
    ↓
Kitchen staff monitors on /kitchen/delivery-dashboard
    ↓
Delivery status: ASSIGNED → PICKED_UP → IN_TRANSIT → DELIVERED
```

### **New Pages (UI)**

| Page | Path | Purpose |
|------|------|---------|
| Customer Tracking | `/delivery-tracking` | Real-time delivery status with live location updates |
| Kitchen Dashboard | `/kitchen/delivery-dashboard` | Monitor all active deliveries and assign delivery boys |

### **New API Routes**

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/delivery/assign` | POST | Assign delivery boy to order |
| `/api/delivery/location` | GET | Get current delivery location |
| `/api/delivery/assignments` | GET | List active assignments |
| `/api/delivery/register` | POST | Register new delivery boy |
| `/api/delivery/location/update` | PATCH | Update delivery location (from delivery boy app) |
| `/api/stream/kitchen` | GET | SSE stream for kitchen dashboard |

### **Database Collections**

```javascript
// collections/delivery_assignments
{
  assignmentId: "da_1711234567_abc123",
  restaurantId: "rest_001",
  deliveryBoyId: "db_001",
  deliveryBoyName: "Raj Kumar",
  deliveryBoyPhone: "919876543210",
  vehicleType: "bike" | "scooter" | "car",
  vehicleNumber: "DL01AB1234",
  orderIds: ["ord_123", "ord_124"],
  status: "ASSIGNED" | "PICKED_UP" | "IN_TRANSIT" | "DELIVERED",
  latitude: 28.6139,
  longitude: 77.2090,
  estimatedDeliveryTime: "2024-03-26T19:45:00Z",
  deliveryAddress: "123 Market Street...",
  createdAt: Date,
  updatedAt: Date
}

// collections/delivery_boys
{
  deliveryBoyId: "db_001",
  restaurantId: "rest_001",
  name: "Raj Kumar",
  phone: "919876543210",
  vehicleType: "bike",
  vehicleNumber: "DL01AB1234",
  status: "ACTIVE" | "INACTIVE",
  rating: 4.5,
  completedDeliveries: 156,
  createdAt: Date
}
```

### **Real-Time Streaming (SSE)**

Stream endpoint: `/api/stream/kitchen?restaurantId=rest_001`

**Events:**
```javascript
// New delivery assigned
{
  event: "delivery_assigned",
  assignmentId: "da_123",
  assignment: { /* full assignment object */ }
}

// Location update
{
  event: "delivery_location_update",
  assignmentId: "da_123",
  latitude: 28.6139,
  longitude: 77.2090,
  distanceRemaining: 2.5
}

// Status update
{
  event: "delivery_status_update",
  assignmentId: "da_123",
  status: "IN_TRANSIT"
}
```

### **Key Features**

✅ **Assignment Workflow**: Assign delivery boys and generate unique assignment IDs  
✅ **Location Tracking**: Real-time GPS updates via SSE stream  
✅ **Status Management**: 4-step delivery status (ASSIGNED → PICKED_UP → IN_TRANSIT → DELIVERED)  
✅ **Customer Tracking**: Beautiful UI for customers to track deliveries in real-time  
✅ **Kitchen Dashboard**: Kitchen staff can monitor, assign, and update delivery status  
✅ **Live Notifications**: Events pushed to both kitchen and customer via SSE  

---

## 📊 Week 7: Analytics & Polish

### **Analytics Overview**

```
Customer Orders Historical Data
    ↓
GET /api/analytics/overview?restaurantId=rest_001&dateRange=today
    ↓
Aggregate metrics (revenue, order count, top items)
    ↓
Group by status and hour
    ↓
Return comprehensive dashboard data
```

### **New Pages (UI)**

| Page | Path | Purpose |
|------|------|---------|
| Kitchen Analytics | `/kitchen/analytics` | Revenue, orders, top items, peak hours |
| Order History | `/orders/history` | Customer view of past orders with reorder |
| Reorder Recommendations | `/recommendations` | AI-powered favorites and suggestions |
| Home/Landing | `/` | Updated with all feature links |

### **New API Routes**

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/analytics/overview` | GET | Get restaurant metrics (revenue, orders, items) |
| `/api/order/history` | GET | Get past orders for a customer |
| `/api/order/reorder-recommendations` | GET | Get favorites and recommendations |

### **Analytics Metrics**

```javascript
GET /api/analytics/overview?restaurantId=rest_001&dateRange=today

Response:
{
  totalOrders: 45,
  totalRevenue: "8750.50",
  averageOrderValue: "194.46",
  conversionRate: 95,
  topItems: [
    { itemId, name, quantity, revenue }
  ],
  ordersByStatus: { CONFIRMED, PREPARING, READY, DELIVERED },
  ordersByHour: [
    { hour: 0, count: 2 },
    { hour: 12, count: 15 },
    ...
  ]
}
```

### **Order History & Reorder**

```javascript
GET /api/order/history?userPhone=919876543210&limit=20&skip=0

Response:
{
  data: [
    {
      orderId: "ord_123",
      restaurantId: "rest_001",
      restaurantName: "Pizza Palace",
      items: [...],
      total: 450,
      status: "DELIVERED",
      createdAt: Date,
      itemCount: 3
    }
  ],
  pagination: { total, limit, skip }
}
```

### **Reorder Intelligence**

```javascript
GET /api/order/reorder-recommendations?userPhone=919876543210&restaurantId=rest_001

Response:
{
  frequentItems: [
    { itemId, name, price, timesOrdered: 5 }  // Ordered 2+ times
  ],
  lastOrdered: [
    { itemId, name, price, orderedAt }  // Most recent orders
  ],
  recommendations: [
    { itemId, name, price, reason }  // Popular items not yet tried
  ]
}
```

### **Dashboard Features**

**Kitchen Analytics Dashboard:**
✅ KPI cards (Total Orders, Revenue, AOV, Conversion Rate)
✅ Orders by status breakdown with progress bars
✅ Peak hours bar chart
✅ Top 10 selling items table
✅ Date range filter (Today/Week/Month)
✅ Real-time metrics refresh

**Customer Features:**
✅ Order history with pagination
✅ Filter by restaurant
✅ One-click reorder for delivered orders
✅ AI-powered favorite items
✅ Reorder recommendations page
✅ Recently ordered items

### **Key Features**

✅ **Business Intelligence**: Track revenue, top items, order trends  
✅ **Order History**: Complete customer order management  
✅ **Reorder System**: One-click reordering for delivered orders  
✅ **AI Recommendations**: Smart suggestions based on order history  
✅ **Analytics Dashboard**: Visual insights for restaurant staff  
✅ **UI Polish**: Improved navigation, better UX across all pages  

---

### **Pages Summary**

| Page | Path | Audience | Status |
|------|------|----------|--------|
| Home/Landing | `/` | All | ✅ Updated |
| Kitchen Dashboard | `/dashboard` | Kitchen Staff | ✅ Week 5 |
| Delivery Dashboard | `/kitchen/delivery-dashboard` | Kitchen Staff | ✅ Week 6 |
| Analytics Dashboard | `/kitchen/analytics` | Kitchen Manager | ✅ Week 7 |
| Track Delivery | `/delivery-tracking` | Customer | ✅ Week 6 |
| Order History | `/orders/history` | Customer | ✅ Week 7 |
| Recommendations | `/recommendations` | Customer | ✅ Week 7 |

---

## 🤖 Advanced AI Recommendations (Phase 3)

### **AI-Powered Intelligence**

```
User Profile Analysis
    ↓
Order History Mining
    ↓
Preference Extraction
    ↓
Groq Mixtral LLM
    ↓
Personalized Recommendations
    ↓
Meal Combination Pairing
    ↓
Trending Items Analysis
    ↓
UI Presentation
```

### **What Makes It Advanced**

✅ **Personalized by AI** - Groq Mixtral analyzes preferences holistically  
✅ **Context-Aware** - Time of day, season, day of week considered  
✅ **Smart Pairing** - Suggests complementary items that go together  
✅ **Confidence Scored** - Each recommendation has 0-1 confidence score  
✅ **Trending Integration** - Combines personal + popular items  
✅ **User Profile** - Shows analyzed dietary preferences and budget  

### **New Features**

| Feature | Purpose | API | UI |
|---------|---------|-----|-----|
| Personalized AI Recommendations | Groq-powered suggestions | `/advanced` | Cards |
| User Profile Display | Show analyzed preferences | `/advanced` | Profile Card |
| Meal Combinations | Complementary item pairings | `/advanced` | Section |
| Trending Items | Popular items last 7 days | `/advanced` | Showcase |
| Confidence Scoring | Quality indication per item | `/advanced` | Percentage |

### **API Endpoint**

```
GET /api/recommendations/advanced
  ?userPhone=919876543210
  &restaurantId=rest_001
  &includeCombo=true
  &includeTrending=true
  &limit=5
```

**Response:**
```javascript
{
  success: true,
  data: {
    personalized: [
      {
        itemId, name, price, reasoning, confidence,
        category, tags, complementaryItems, mealTiming
      }
    ],
    combinations: [...],  // Meal pairings
    trending: [...],      // Popular items
    userProfile: {
      totalOrders, favoriteCategories, spicePreference
    }
  }
}
```

### **Pages**

| Page | Path | Purpose |
|------|------|---------|
| Advanced Recommendations | `/advanced-recommendations` | AI recommendations + combos + trending |

### **Service Functions**

**File:** `src/lib/services/advanced-recommendations.ts`

```typescript
getAdvancedRecommendations()    // Main personalized AI
getMealCombinations()           // Pairing items
analyzeUserPreferences()        // Extract from history
getTrendingRecommendations()    // Popular items
```

### **Groq Integration**

- Model: `mixtral-8x7b-32768`
- Temperature: 0.7 (balanced)
- Max Tokens: 2000
- Prompt Engineering: Context-aware with user profile

### **Recommendation Types**

1. **Personalized** - Based on user's dietary, budget, history
2. **Combinations** - Groq-generated meal pairings
3. **Trending** - Popular items aggregated last 7 days

### **Preference Analysis Algorithm**

```
Input: User's order history
  ↓
1. Extract item frequency
2. Count by category
3. Calculate average spice level
4. Calculate average spend
5. Infer dietary restrictions
6. Build constraints (allergies, disliked items)
  ↓
Output: UserPreferences object
```

### **Time-Based Logic**

- Morning (6-12): Breakfast items
- Afternoon (12-17): Lunch items  
- Evening (17-21): Dinner items
- Night (21-6): Snacks/desserts

### **Key Technologies**

- **Groq API** - LLM for intelligent analysis
- **Mixtral 8x7B** - Fast, accurate model
- **MongoDB** - Order history aggregation
- **TypeScript** - Type-safe implementation

### **Confidence Scoring**

- 0.90-1.0 ⭐ Perfect Match (exact favorite)
- 0.75-0.89 ✅ Good Match (preference aligned)
- 0.50-0.74 👍 Interesting (partial match)
- <0.50 🤔 Discovery (new possibility)

---

## ⚙️ How to Add a New Feature

### Example: Add "Reorder" Feature

**Step 1: Add API Route**
```typescript
// src/app/api/order/recent/route.ts
export async function GET(request) {
  const userPhone = searchParams.get('userPhone');
  const orderService = new OrderService(db);
  const recentOrders = await orderService.getOrdersByUser(userPhone);
  return NextResponse.json({ data: recentOrders });
}
```

**Step 2: Use in Service**
Already exists in `OrderService.getOrdersByUser()`

**Step 3: Call from Frontend**
```typescript
const recentOrders = await fetch(`/api/order/recent?userPhone=919876543210`);
```

**Step 4: Test**
```bash
curl "http://localhost:3000/api/order/recent?userPhone=919876543210"
```

---

## 🧪 Testing Pattern

```
1. Prepare data (create menu, add to cart)
   ↓
2. Call API endpoint
   ↓
3. Verify MongoDB state
   ↓
4. Check response
```

**Test file:** `TESTING_GUIDE.md`

---

## 📊 Performance Tips

1. **Always filter by restaurantId** - Prevents data leaks
2. **Use MongoDB indexes** - Auto-created on startup
3. **Cart auto-expires** - TTL index cleans old carts
4. **Pagination ready** - Use `getPaginationParams()`
5. **Async operations** - All service calls are async

---

## 🔐 Security Checklist

- ✅ Phone number validation
- ✅ Razorpay signature verification
- ✅ 11za signature verification (TODO: enable)
- ⚠️ JWT auth for dashboard (TODO: implement)
- ⚠️ Rate limiting (TODO: enforce)
- ⚠️ Input sanitization (TODO: add)

---

**Questions? See:** `DEVELOPMENT.md` | `TESTING_GUIDE.md` | `PHASE1_COMPLETION.md`
