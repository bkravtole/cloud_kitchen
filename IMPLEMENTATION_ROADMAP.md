# CloudKitchen Implementation Roadmap

**Version:** 1.0  
**Timeline:** 20-24 weeks to production  
**Team Size:** 2-3 developers (backend + frontend)

---

## 📅 Phase 1: MVP Foundation (Weeks 1-4)

### Goal
Build a functional WhatsApp ordering system with AI that can process orders end-to-end.

---

### Week 1: Project Setup & Infrastructure

#### Tasks
```
┌─ Initialize Next.js project (App Router)
├─ Setup MongoDB Atlas cluster
├─ Configure environment variables
├─ Setup Git repository
├─ Create project documentation
└─ Setup local development environment

Duration: 3 days (2 dev days)
```

#### Deliverables
- ✅ Next.js project with `/api` routes skeleton
- ✅ MongoDB connection verified
- ✅ Environment setup guide
- ✅ Git repo with CI/CD config (optional for MVP)

#### Key Files to Create
```
/pages/
  /api/
    /webhook/
    /auth/
    /menu/
    /order/
    /cart/
    /ai/
    /payment/
    /delivery/

/lib/
  /db/
  /groq/
  /11za/
  /razorpay/
  /utils/

/models/ (TypeScript types)
/styles/
```

#### Estimated Time
- **3 days** (1 developer)

---

### Week 1-2: Core Data Models & Database

#### Tasks
```
┌─ Design MongoDB schemas
├─ Create collections
├─ Add indexes
├─ Create TypeScript types
├─ Create MongoDB client utility
└─ Create seed data (test menu)

Duration: 5 days
```

#### MongoDB Collections Setup

```javascript
// users collection
db.users.createIndex({ phone: 1 }, { unique: true });
db.users.createIndex({ restaurants: 1 });

// restaurants collection
db.restaurants.createIndex({ restaurantId: 1 }, { unique: true });
db.restaurants.createIndex({ coordinates: "2dsphere" }); // for geo queries

// menus collection
db.menus.createIndex({ restaurantId: 1, isAvailable: 1 });
db.menus.createIndex({ tags: 1, restaurantId: 1 });
db.menus.createIndex({ category: 1, restaurantId: 1 });

// carts collection
db.carts.createIndex({ userPhone: 1, restaurantId: 1 }, { unique: true });
db.carts.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL

// orders collection
db.orders.createIndex({ restaurantId: 1, status: 1 });
db.orders.createIndex({ userPhone: 1, createdAt: -1 });
db.orders.createIndex({ paymentId: 1 });

// delivery_boys collection
db.delivery_boys.createIndex({ restaurantId: 1, status: 1 });

// payment_transactions collection
db.payment_transactions.createIndex({ orderId: 1 }, { unique: true });
db.payment_transactions.createIndex({ paymentId: 1 }, { unique: true });
```

#### TypeScript Types Example
```typescript
// types/index.ts
interface IUser {
  _id?: string;
  phone: string;
  name: string;
  email?: string;
  preferences: {
    spiceLevel: 1 | 2 | 3 | 4 | 5;
    dietaryRestrictions: string[];
  };
}

interface IMenuItem {
  itemId: string;
  restaurantId: string;
  name: string;
  price: number;
  tags: string[];
  spiceLevel: 1 | 2 | 3 | 4 | 5;
  serves: number;
  isAvailable: boolean;
}

interface ICart {
  _id?: string;
  userPhone: string;
  restaurantId: string;
  items: {
    itemId: string;
    quantity: number;
    price: number;
    addons: { addonId: string; price: number }[];
  }[];
  total: number;
  expiresAt: Date;
}

interface IOrder {
  _id?: string;
  orderId: string;
  userPhone: string;
  restaurantId: string;
  items: any[];
  total: number;
  status: "PAYMENT_PENDING" | "CONFIRMED" | "PREPARING" | "READY" | "ASSIGNED" | "DELIVERED" | "CANCELLED";
  paymentStatus: "PENDING" | "COMPLETED" | "FAILED";
  paymentId?: string;
  deliveryBoyId?: string;
  createdAt: Date;
}
```

#### Estimated Time
- **5 days** (1 developer)

---

### Week 2: Core API Routes (CRUD Operations)

#### Tasks
```
┌─ Implement POST /api/menu (seed menu)
├─ Implement GET /api/menu/:restaurantId
├─ Implement POST /api/cart/add
├─ Implement GET /api/cart/:userId
├─ Implement DELETE /api/cart/:userId
├─ Create utility functions (auth, error handling)
└─ Add input validation

Duration: 4 days
```

#### Key API Routes Template
```typescript
// /api/menu/route.ts
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const restaurantId = searchParams.get("restaurantId");
  
  // TODO: Get menu items from MongoDB
  // TODO: Filter by restaurantId
  // TODO: Return sorted by popularity/category
  
  return Response.json({ success: true, items: [] });
}

export async function POST(request: Request) {
  // TODO: Authenticate (admin only)
  // TODO: Create new menu item
  // TODO: Validate input
  return Response.json({ success: true }, { status: 201 });
}
```

#### Estimated Time
- **4 days** (1 developer)

---

### Week 3: AI Integration & Groq Setup

#### Tasks
```
┌─ Sign up for Groq API
├─ Implement AI service wrapper
├─ Create /api/ai/process endpoint
├─ Test intent detection
├─ Create menu matching logic
├─ Build prompt templates
└─ Add error handling & fallbacks

Duration: 5 days
```

#### AI Service Implementation
```typescript
// /lib/groq.ts
import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

interface AIResponse {
  intent: "GET_RECOMMENDATION" | "ORDER" | "TRACK" | "QUESTION" | "MENU";
  confidence: number;
  entities: {
    spiceLevel?: 1 | 2 | 3 | 4 | 5;
    servings?: number;
    category?: string;
    dietary?: string[];
  };
  recommendedItems: string[]; // itemIds
  message: string;
  suggestedActions: string[];
}

export async function processUserMessage(
  userMessage: string,
  menu: IMenuItem[],
  previousOrders: any[] = []
): Promise<AIResponse> {
  const menuContext = menu
    .slice(0, 10)
    .map((item) => `${item.name} - ${item.tags.join(", ")}`)
    .join("\n");

  const prompt = `You are a helpful restaurant AI assistant.

Restaurant Menu (sample):
${menuContext}

User said: "${userMessage}"

Respond with JSON only (no markdown):
{
  "intent": "GET_RECOMMENDATION|ORDER|TRACK|QUESTION|MENU",
  "confidence": 0.0-1.0,
  "entities": {
    "spiceLevel": 1-5 or null,
    "servings": number or null,
    "category": "string or null",
    "dietary": []
  },
  "recommendedItems": [],
  "message": "friendly response",
  "suggestedActions": ["ADD_TO_CART", "SEE_MENU", etc]
}`;

  try {
    const response = await groq.chat.completions.create({
      model: "mixtral-8x7b-32768",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 500,
    });

    const content = response.choices[0].message.content;
    const cleanedContent = content
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();
    return JSON.parse(cleanedContent);
  } catch (error) {
    console.error("Groq API error:", error);
    return {
      intent: "QUESTION",
      confidence: 0,
      entities: {},
      recommendedItems: [],
      message: "Sorry, I couldn't understand. Please try again or browse our menu.",
      suggestedActions: ["SEE_MENU"],
    };
  }
}
```

#### Estimated Time
- **5 days** (1 developer)

---

### Week 3-4: 11za Webhook Integration

#### Tasks
```
┌─ Sign up for 11za API
├─ Understand webhook signature verification
├─ Implement POST /api/webhook/11za
├─ Test message reception
├─ Create response formatting functions
├─ Build button/list response builders
└─ Test end-to-end flow

Duration: 5 days
```

#### Webhook Implementation
```typescript
// /api/webhook/11za/route.ts
import crypto from "crypto";

async function verifySignature(
  body: string,
  signature: string
): Promise<boolean> {
  const hash = crypto
    .createHmac("sha256", process.env.11ZA_WEBHOOK_SECRET!)
    .update(body)
    .digest("hex");
  return hash === signature;
}

export async function POST(request: Request) {
  const signature = request.headers.get("X-11za-Webhook-Signature");
  const body = await request.text();

  // Verify webhook authenticity
  if (!signature || !(await verifySignature(body, signature))) {
    return Response.json(
      { error: "Invalid signature" },
      { status: 401 }
    );
  }

  const payload = JSON.parse(body);
  const { from, message, event, buttonId } = payload;

  try {
    // Find or create user cart
    let cart = await db.carts.findOne({
      userPhone: from,
      restaurantId: "rest_123", // TODO: Dynamic
    });

    if (!cart) {
      cart = await db.carts.insertOne({
        userPhone: from,
        restaurantId: "rest_123",
        items: [],
        total: 0,
        expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
      });
    }

    // Handle different event types
    if (event === "message") {
      const aiResponse = await processUserMessage(message, menu);
      // TODO: Format and send response
    } else if (event === "button_click") {
      const [action, itemId, quantity] = buttonId.split(":");
      if (action === "add_item") {
        // Add to cart
      }
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
```

#### Estimated Time
- **5 days** (1 developer)

---

### Week 4: Order & Payment Integration

#### Tasks
```
┌─ Implement POST /api/order/create
├─ Implement POST /api/payment/create (Razorpay)
├─ Implement POST /api/payment/webhook
├─ Test payment flow
├─ Add error handling
├─ Create notification system
└─ End-to-end testing

Duration: 5 days
```

#### Order Creation Flow
```typescript
// /api/order/route.ts
export async function POST(request: Request) {
  const { userPhone, restaurantId } = await request.json();

  // Get cart
  const cart = await db.carts.findOne({
    userPhone,
    restaurantId,
  });

  if (!cart || cart.items.length === 0) {
    return Response.json(
      { error: "Cart is empty" },
      { status: 400 }
    );
  }

  // Create order
  const orderId = `ord_${Date.now()}`;
  const order = {
    orderId,
    userPhone,
    restaurantId,
    items: cart.items,
    subtotal: cart.total,
    tax: Math.round(cart.total * 0.18), // 18% GST
    deliveryFee: 50,
    total: cart.total + Math.round(cart.total * 0.18) + 50,
    status: "PAYMENT_PENDING",
    paymentStatus: "PENDING",
    createdAt: new Date(),
  };

  await db.orders.insertOne(order);

  // Generate Razorpay link
  const paymentLink = await generateRazorpayLink(
    orderId,
    order.total,
    userPhone
  );

  // Clear cart
  await db.carts.deleteOne({ userPhone, restaurantId });

  return Response.json({
    success: true,
    order,
    paymentLink,
  });
}
```

#### Razorpay Integration
```typescript
// /lib/razorpay.ts
import Razorpay from "razorpay";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

export async function generatePaymentLink(
  orderId: string,
  amount: number,
  userPhone: string
) {
  const paymentLink = await razorpay.paymentLink.create({
    amount: amount * 100, // Convert to paise
    currency: "INR",
    accept_partial: false,
    first_min_partial_amount: 100,
    description: `Order ${orderId}`,
    customer: {
      name: "Customer",
      email: "customer@example.com",
      contact: userPhone,
    },
    notify: {
      sms: true,
      email: true,
    },
    reminder_enable: true,
    notes: {
      orderId,
    },
    callback_url: `${process.env.NEXT_PUBLIC_API_URL}/api/payment/webhook`,
    callback_method: "get",
  });

  return paymentLink.short_url;
}
```

#### Payment Webhook
```typescript
// /api/payment/webhook/route.ts
export async function POST(request: Request) {
  const { signature, paymentId, orderId } = await request.json();

  // Verify signature (see TECHNICAL_DECISIONS.md)
  if (!verifyRazorpaySignature(orderId, paymentId, signature)) {
    return Response.json({ error: "Invalid signature" }, { status: 401 });
  }

  // Update order status
  await db.orders.updateOne(
    { orderId },
    {
      $set: {
        paymentStatus: "COMPLETED",
        status: "CONFIRMED",
        paymentId,
        updatedAt: new Date(),
      },
    }
  );

  // Send WhatsApp confirmation
  await sendWhatsAppMessage(
    order.userPhone,
    `✅ Payment confirmed for order #${orderId}`
  );

  return Response.json({ success: true });
}
```

#### Estimated Time
- **5 days** (1 developer)

---

### Week 4: Kitchen Dashboard (Basic)

#### Tasks
```
┌─ Create basic dashboard page
├─ Display new orders
├─ Implement order status update buttons
├─ Add real-time polling (setInterval)
├─ Create order detail modal
└─ Basic styling with TailwindCSS

Duration: 4 days
```

#### Kitchen Dashboard Page
```typescript
// /app/dashboard/page.tsx
"use client";
import { useState, useEffect } from "react";

export default function Dashboard() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Polling every 2 seconds
    const interval = setInterval(async () => {
      setLoading(true);
      const res = await fetch("/api/dashboard/orders?status=NEW,PREPARING");
      const data = await res.json();
      setOrders(data.orders);
      setLoading(false);
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-4">
      <h1 className="text-3xl font-bold mb-6">Kitchen Dashboard</h1>

      <div className="grid grid-cols-3 gap-4 mb-8">
        {/* Stats */}
        <div className="bg-blue-100 p-4 rounded">
          <div className="text-2xl font-bold">
            {orders.filter((o) => o.status === "NEW").length}
          </div>
          <div className="text-gray-600">New Orders</div>
        </div>
      </div>

      <div className="grid gap-4">
        {orders.map((order) => (
          <OrderCard key={order.orderId} order={order} />
        ))}
      </div>
    </div>
  );
}

function OrderCard({ order }: { order: any }) {
  const handleStatusUpdate = async (status: string) => {
    await fetch(`/api/order/${order.orderId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
  };

  return (
    <div className="border-2 border-yellow-300 p-4 rounded bg-yellow-50">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-bold text-lg">Order #{order.orderId}</h3>
          <p className="text-gray-600">{order.customerPhone}</p>
          <div className="mt-2">
            {order.items.map((item: any) => (
              <p key={item.itemId}>
                {item.quantity}x {item.name}
              </p>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => handleStatusUpdate("PREPARING")}
            className="bg-green-500 text-white px-4 py-2 rounded"
          >
            Preparing
          </button>
          <button
            onClick={() => handleStatusUpdate("READY")}
            className="bg-blue-500 text-white px-4 py-2 rounded"
          >
            Ready
          </button>
        </div>
      </div>
    </div>
  );
}
```

#### Estimated Time
- **4 days** (1 developer)

---

### Week 4: Testing & MVP Release

#### Tasks
```
┌─ Write integration tests
├─ Test complete order flow
├─ Error scenario testing
├─ Load testing (simulate 100 concurrent users)
├─ Documentation updates
├─ Deployment to Vercel
└─ Go-live checklist

Duration: 3 days
```

#### MVP Checklist
- ✅ Customer can send WhatsApp message
- ✅ AI processes and recommends items
- ✅ Customer can add to cart
- ✅ Customer can checkout and pay
- ✅ Kitchen sees new order in dashboard
- ✅ Kitchen can mark order as preparing/ready
- ✅ Customer gets WhatsApp updates
- ✅ Order is confirmed in database
- ✅ Payment verified with Razorpay

#### Estimated Time
- **3 days** (2 developers)

---

## Total Phase 1 Effort

| Week | Task | Developer Days |
|------|------|-----------------|
| 1 | Setup + Database | 3 |
| 2 | API Routes | 5 |
| 3 | AI + Webhook | 10 |
| 4 | Orders + Dashboard | 12 |
| 4 | Testing + Release | 6 |
| **TOTAL** | | **36 dev days** |

**Timeline:** 4 weeks (2 developers working full-time) or 8 weeks (1 developer)

---

## 📅 Phase 2: Enhancement (Weeks 5-7)

### Goals
- Real-time order updates (WebSocket)
- Delivery tracking
- Analytics dashboard
- Performance optimization

### Tasks
```
Week 5: Real-time Updates
├─ Implement Server-Sent Events (SSE)
├─ Kitchen dashboard live updates
├─ Customer order tracking
└─ Performance optimization

Week 6: Delivery System
├─ Delivery boy assignment logic
├─ Delivery tracking UI
├─ Real-time location updates
└─ Delivery boy status management

Week 7: Analytics & Polish
├─ Analytics dashboard
├─ Order history
├─ Reorder recommendations
├─ UI/UX improvements
└─ Bug fixes from Phase 1
```

---

## 📅 Phase 3: Scale & Multi-Restaurant (Weeks 8+)

### Goals
- Support multiple restaurants
- Advanced AI recommendations
- Mobile app (optional)
- Global scaling

---

## 🛠️ Tech Stack Summary

```
Frontend:           Next.js 14+ (React)
Backend:            Next.js API Routes
Database:           MongoDB Atlas
AI:                 Groq API
Messaging:          11za Webhooks
Payments:           Razorpay
Hosting:            Vercel
Styling:            TailwindCSS + ShadcnUI
Real-time:          SSE or WebSocket (Phase 2)

Development:
- TypeScript
- Git for version control
- Jest for testing (optional)
- ESLint for code quality
```

---

## 💡 Development Tips

### 1. Use TypeScript from Start
Reduces bugs, improves refactoring later.

### 2. Environment Variables Checklist
```bash
MONGODB_URI=
GROQ_API_KEY=
GROQ_MODEL=
ELEVENZA_API_KEY=
11ZA_WEBHOOK_SECRET=
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=
NEXT_PUBLIC_API_URL=
```

### 3. Local Testing Strategy
```bash
# Terminal 1: Start dev server
npm run dev

# Terminal 2: Test webhook locally
ngrok http 3000
# Use ngrok URL in 11za webhook settings

# Test payment locally:
# Use Razorpay test keys (starts with "rzp_test_")
```

### 4. Logging Best Practices
```typescript
// Use structured logging
console.log(JSON.stringify({
  timestamp: new Date(),
  service: "order-service",
  action: "order-created",
  orderId: "ord_123",
  level: "INFO"
}));

// Later: Replace with Sentry or Datadog
```

---

## ⚠️ Common Pitfalls to Avoid

### ❌ Don't
- Deploy without verifying Razorpay signatures
- Query MongoDB without restaurantId filter
- Store passwords in plaintext
- Forget MongoDB indexes
- Ignore error cases in webhooks

### ✅ Do
- Test payment flow with real Razorpay test keys
- Always enforce restaurantId in queries
- Use bcrypt for passwords
- Create indexes before production
- Add retry logic and idempotency to webhooks

---

## 📊 Success Metrics (Phase 1)

By end of Week 4:
- ✅ 10+ test orders processed end-to-end
- ✅ AI recognition accuracy > 80%
- ✅ Payment success rate 100%
- ✅ Order to kitchen latency < 5 seconds
- ✅ Dashboard response time < 1 second
- ✅ Webhook reliability > 99%

---

**Document Version:** 1.0  
**Last Updated:** March 2026  
**Next Milestone:** Phase 1 MVP Release

# CloudKitchen Implementation Roadmap

**Version:** 1.0  
**Timeline:** 20-24 weeks to production  
**Team Size:** 2-3 developers (backend + frontend)

---

## 📅 Phase 1: MVP Foundation (Weeks 1-4)

### Goal
Build a functional WhatsApp ordering system with AI that can process orders end-to-end.

---

### Week 1: Project Setup & Infrastructure

#### Tasks
```
┌─ Initialize Next.js project (App Router)
├─ Setup MongoDB Atlas cluster
├─ Configure environment variables
├─ Setup Git repository
├─ Create project documentation
└─ Setup local development environment

Duration: 3 days (2 dev days)
```

#### Deliverables
- ✅ Next.js project with `/api` routes skeleton
- ✅ MongoDB connection verified
- ✅ Environment setup guide
- ✅ Git repo with CI/CD config (optional for MVP)

#### Key Files to Create
```
/pages/
  /api/
    /webhook/
    /auth/
    /menu/
    /order/
    /cart/
    /ai/
    /payment/
    /delivery/

/lib/
  /db/
  /groq/
  /11za/
  /razorpay/
  /utils/

/models/ (TypeScript types)
/styles/
```

#### Estimated Time
- **3 days** (1 developer)

---

### Week 1-2: Core Data Models & Database

#### Tasks
```
┌─ Design MongoDB schemas
├─ Create collections
├─ Add indexes
├─ Create TypeScript types
├─ Create MongoDB client utility
└─ Create seed data (test menu)

Duration: 5 days
```

#### MongoDB Collections Setup

```javascript
// users collection
db.users.createIndex({ phone: 1 }, { unique: true });
db.users.createIndex({ restaurants: 1 });

// restaurants collection
db.restaurants.createIndex({ restaurantId: 1 }, { unique: true });
db.restaurants.createIndex({ coordinates: "2dsphere" }); // for geo queries

// menus collection
db.menus.createIndex({ restaurantId: 1, isAvailable: 1 });
db.menus.createIndex({ tags: 1, restaurantId: 1 });
db.menus.createIndex({ category: 1, restaurantId: 1 });

// carts collection
db.carts.createIndex({ userPhone: 1, restaurantId: 1 }, { unique: true });
db.carts.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL

// orders collection
db.orders.createIndex({ restaurantId: 1, status: 1 });
db.orders.createIndex({ userPhone: 1, createdAt: -1 });
db.orders.createIndex({ paymentId: 1 });

// delivery_boys collection
db.delivery_boys.createIndex({ restaurantId: 1, status: 1 });

// payment_transactions collection
db.payment_transactions.createIndex({ orderId: 1 }, { unique: true });
db.payment_transactions.createIndex({ paymentId: 1 }, { unique: true });
```

#### TypeScript Types Example
```typescript
// types/index.ts
interface IUser {
  _id?: string;
  phone: string;
  name: string;
  email?: string;
  preferences: {
    spiceLevel: 1 | 2 | 3 | 4 | 5;
    dietaryRestrictions: string[];
  };
}

interface IMenuItem {
  itemId: string;
  restaurantId: string;
  name: string;
  price: number;
  tags: string[];
  spiceLevel: 1 | 2 | 3 | 4 | 5;
  serves: number;
  isAvailable: boolean;
}

interface ICart {
  _id?: string;
  userPhone: string;
  restaurantId: string;
  items: {
    itemId: string;
    quantity: number;
    price: number;
    addons: { addonId: string; price: number }[];
  }[];
  total: number;
  expiresAt: Date;
}

interface IOrder {
  _id?: string;
  orderId: string;
  userPhone: string;
  restaurantId: string;
  items: any[];
  total: number;
  status: "PAYMENT_PENDING" | "CONFIRMED" | "PREPARING" | "READY" | "ASSIGNED" | "DELIVERED" | "CANCELLED";
  paymentStatus: "PENDING" | "COMPLETED" | "FAILED";
  paymentId?: string;
  deliveryBoyId?: string;
  createdAt: Date;
}
```

#### Estimated Time
- **5 days** (1 developer)

---

### Week 2: Core API Routes (CRUD Operations)

#### Tasks
```
┌─ Implement POST /api/menu (seed menu)
├─ Implement GET /api/menu/:restaurantId
├─ Implement POST /api/cart/add
├─ Implement GET /api/cart/:userId
├─ Implement DELETE /api/cart/:userId
├─ Create utility functions (auth, error handling)
└─ Add input validation

Duration: 4 days
```

#### Key API Routes Template
```typescript
// /api/menu/route.ts
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const restaurantId = searchParams.get("restaurantId");
  
  // TODO: Get menu items from MongoDB
  // TODO: Filter by restaurantId
  // TODO: Return sorted by popularity/category
  
  return Response.json({ success: true, items: [] });
}

export async function POST(request: Request) {
  // TODO: Authenticate (admin only)
  // TODO: Create new menu item
  // TODO: Validate input
  return Response.json({ success: true }, { status: 201 });
}
```

#### Estimated Time
- **4 days** (1 developer)

---

### Week 3: AI Integration & Groq Setup

#### Tasks
```
┌─ Sign up for Groq API
├─ Implement AI service wrapper
├─ Create /api/ai/process endpoint
├─ Test intent detection
├─ Create menu matching logic
├─ Build prompt templates
└─ Add error handling & fallbacks

Duration: 5 days
```

#### AI Service Implementation
```typescript
// /lib/groq.ts
import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

interface AIResponse {
  intent: "GET_RECOMMENDATION" | "ORDER" | "TRACK" | "QUESTION" | "MENU";
  confidence: number;
  entities: {
    spiceLevel?: 1 | 2 | 3 | 4 | 5;
    servings?: number;
    category?: string;
    dietary?: string[];
  };
  recommendedItems: string[]; // itemIds
  message: string;
  suggestedActions: string[];
}

export async function processUserMessage(
  userMessage: string,
  menu: IMenuItem[],
  previousOrders: any[] = []
): Promise<AIResponse> {
  const menuContext = menu
    .slice(0, 10)
    .map((item) => `${item.name} - ${item.tags.join(", ")}`)
    .join("\n");

  const prompt = `You are a helpful restaurant AI assistant.

Restaurant Menu (sample):
${menuContext}

User said: "${userMessage}"

Respond with JSON only (no markdown):
{
  "intent": "GET_RECOMMENDATION|ORDER|TRACK|QUESTION|MENU",
  "confidence": 0.0-1.0,
  "entities": {
    "spiceLevel": 1-5 or null,
    "servings": number or null,
    "category": "string or null",
    "dietary": []
  },
  "recommendedItems": [],
  "message": "friendly response",
  "suggestedActions": ["ADD_TO_CART", "SEE_MENU", etc]
}`;

  try {
    const response = await groq.chat.completions.create({
      model: "mixtral-8x7b-32768",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 500,
    });

    const content = response.choices[0].message.content;
    const cleanedContent = content
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();
    return JSON.parse(cleanedContent);
  } catch (error) {
    console.error("Groq API error:", error);
    return {
      intent: "QUESTION",
      confidence: 0,
      entities: {},
      recommendedItems: [],
      message: "Sorry, I couldn't understand. Please try again or browse our menu.",
      suggestedActions: ["SEE_MENU"],
    };
  }
}
```

#### Estimated Time
- **5 days** (1 developer)

---

### Week 3-4: 11za Webhook Integration

#### Tasks
```
┌─ Sign up for 11za API
├─ Understand webhook signature verification
├─ Implement POST /api/webhook/11za
├─ Test message reception
├─ Create response formatting functions
├─ Build button/list response builders
└─ Test end-to-end flow

Duration: 5 days
```

#### Webhook Implementation
```typescript
// /api/webhook/11za/route.ts
import crypto from "crypto";

async function verifySignature(
  body: string,
  signature: string
): Promise<boolean> {
  const hash = crypto
    .createHmac("sha256", process.env.11ZA_WEBHOOK_SECRET!)
    .update(body)
    .digest("hex");
  return hash === signature;
}

export async function POST(request: Request) {
  const signature = request.headers.get("X-11za-Webhook-Signature");
  const body = await request.text();

  // Verify webhook authenticity
  if (!signature || !(await verifySignature(body, signature))) {
    return Response.json(
      { error: "Invalid signature" },
      { status: 401 }
    );
  }

  const payload = JSON.parse(body);
  const { from, message, event, buttonId } = payload;

  try {
    // Find or create user cart
    let cart = await db.carts.findOne({
      userPhone: from,
      restaurantId: "rest_123", // TODO: Dynamic
    });

    if (!cart) {
      cart = await db.carts.insertOne({
        userPhone: from,
        restaurantId: "rest_123",
        items: [],
        total: 0,
        expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
      });
    }

    // Handle different event types
    if (event === "message") {
      const aiResponse = await processUserMessage(message, menu);
      // TODO: Format and send response
    } else if (event === "button_click") {
      const [action, itemId, quantity] = buttonId.split(":");
      if (action === "add_item") {
        // Add to cart
      }
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
```

#### Estimated Time
- **5 days** (1 developer)

---

### Week 4: Order & Payment Integration

#### Tasks
```
┌─ Implement POST /api/order/create
├─ Implement POST /api/payment/create (Razorpay)
├─ Implement POST /api/payment/webhook
├─ Test payment flow
├─ Add error handling
├─ Create notification system
└─ End-to-end testing

Duration: 5 days
```

#### Order Creation Flow
```typescript
// /api/order/route.ts
export async function POST(request: Request) {
  const { userPhone, restaurantId } = await request.json();

  // Get cart
  const cart = await db.carts.findOne({
    userPhone,
    restaurantId,
  });

  if (!cart || cart.items.length === 0) {
    return Response.json(
      { error: "Cart is empty" },
      { status: 400 }
    );
  }

  // Create order
  const orderId = `ord_${Date.now()}`;
  const order = {
    orderId,
    userPhone,
    restaurantId,
    items: cart.items,
    subtotal: cart.total,
    tax: Math.round(cart.total * 0.18), // 18% GST
    deliveryFee: 50,
    total: cart.total + Math.round(cart.total * 0.18) + 50,
    status: "PAYMENT_PENDING",
    paymentStatus: "PENDING",
    createdAt: new Date(),
  };

  await db.orders.insertOne(order);

  // Generate Razorpay link
  const paymentLink = await generateRazorpayLink(
    orderId,
    order.total,
    userPhone
  );

  // Clear cart
  await db.carts.deleteOne({ userPhone, restaurantId });

  return Response.json({
    success: true,
    order,
    paymentLink,
  });
}
```

#### Razorpay Integration
```typescript
// /lib/razorpay.ts
import Razorpay from "razorpay";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

export async function generatePaymentLink(
  orderId: string,
  amount: number,
  userPhone: string
) {
  const paymentLink = await razorpay.paymentLink.create({
    amount: amount * 100, // Convert to paise
    currency: "INR",
    accept_partial: false,
    first_min_partial_amount: 100,
    description: `Order ${orderId}`,
    customer: {
      name: "Customer",
      email: "customer@example.com",
      contact: userPhone,
    },
    notify: {
      sms: true,
      email: true,
    },
    reminder_enable: true,
    notes: {
      orderId,
    },
    callback_url: `${process.env.NEXT_PUBLIC_API_URL}/api/payment/webhook`,
    callback_method: "get",
  });

  return paymentLink.short_url;
}
```

#### Payment Webhook
```typescript
// /api/payment/webhook/route.ts
export async function POST(request: Request) {
  const { signature, paymentId, orderId } = await request.json();

  // Verify signature (see TECHNICAL_DECISIONS.md)
  if (!verifyRazorpaySignature(orderId, paymentId, signature)) {
    return Response.json({ error: "Invalid signature" }, { status: 401 });
  }

  // Update order status
  await db.orders.updateOne(
    { orderId },
    {
      $set: {
        paymentStatus: "COMPLETED",
        status: "CONFIRMED",
        paymentId,
        updatedAt: new Date(),
      },
    }
  );

  // Send WhatsApp confirmation
  await sendWhatsAppMessage(
    order.userPhone,
    `✅ Payment confirmed for order #${orderId}`
  );

  return Response.json({ success: true });
}
```

#### Estimated Time
- **5 days** (1 developer)

---

### Week 4: Kitchen Dashboard (Basic)

#### Tasks
```
┌─ Create basic dashboard page
├─ Display new orders
├─ Implement order status update buttons
├─ Add real-time polling (setInterval)
├─ Create order detail modal
└─ Basic styling with TailwindCSS

Duration: 4 days
```

#### Kitchen Dashboard Page
```typescript
// /app/dashboard/page.tsx
"use client";
import { useState, useEffect } from "react";

export default function Dashboard() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Polling every 2 seconds
    const interval = setInterval(async () => {
      setLoading(true);
      const res = await fetch("/api/dashboard/orders?status=NEW,PREPARING");
      const data = await res.json();
      setOrders(data.orders);
      setLoading(false);
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-4">
      <h1 className="text-3xl font-bold mb-6">Kitchen Dashboard</h1>

      <div className="grid grid-cols-3 gap-4 mb-8">
        {/* Stats */}
        <div className="bg-blue-100 p-4 rounded">
          <div className="text-2xl font-bold">
            {orders.filter((o) => o.status === "NEW").length}
          </div>
          <div className="text-gray-600">New Orders</div>
        </div>
      </div>

      <div className="grid gap-4">
        {orders.map((order) => (
          <OrderCard key={order.orderId} order={order} />
        ))}
      </div>
    </div>
  );
}

function OrderCard({ order }: { order: any }) {
  const handleStatusUpdate = async (status: string) => {
    await fetch(`/api/order/${order.orderId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
  };

  return (
    <div className="border-2 border-yellow-300 p-4 rounded bg-yellow-50">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-bold text-lg">Order #{order.orderId}</h3>
          <p className="text-gray-600">{order.customerPhone}</p>
          <div className="mt-2">
            {order.items.map((item: any) => (
              <p key={item.itemId}>
                {item.quantity}x {item.name}
              </p>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => handleStatusUpdate("PREPARING")}
            className="bg-green-500 text-white px-4 py-2 rounded"
          >
            Preparing
          </button>
          <button
            onClick={() => handleStatusUpdate("READY")}
            className="bg-blue-500 text-white px-4 py-2 rounded"
          >
            Ready
          </button>
        </div>
      </div>
    </div>
  );
}
```

#### Estimated Time
- **4 days** (1 developer)

---

### Week 4: Testing & MVP Release

#### Tasks
```
┌─ Write integration tests
├─ Test complete order flow
├─ Error scenario testing
├─ Load testing (simulate 100 concurrent users)
├─ Documentation updates
├─ Deployment to Vercel
└─ Go-live checklist

Duration: 3 days
```

#### MVP Checklist
- ✅ Customer can send WhatsApp message
- ✅ AI processes and recommends items
- ✅ Customer can add to cart
- ✅ Customer can checkout and pay
- ✅ Kitchen sees new order in dashboard
- ✅ Kitchen can mark order as preparing/ready
- ✅ Customer gets WhatsApp updates
- ✅ Order is confirmed in database
- ✅ Payment verified with Razorpay

#### Estimated Time
- **3 days** (2 developers)

---

## Total Phase 1 Effort

| Week | Task | Developer Days |
|------|------|-----------------|
| 1 | Setup + Database | 3 |
| 2 | API Routes | 5 |
| 3 | AI + Webhook | 10 |
| 4 | Orders + Dashboard | 12 |
| 4 | Testing + Release | 6 |
| **TOTAL** | | **36 dev days** |

**Timeline:** 4 weeks (2 developers working full-time) or 8 weeks (1 developer)

---

## 📅 Phase 2: Enhancement (Weeks 5-7)

### Goals
- Real-time order updates (WebSocket)
- Delivery tracking
- Analytics dashboard
- Performance optimization

### Tasks
```
Week 5: Real-time Updates
├─ Implement Server-Sent Events (SSE)
├─ Kitchen dashboard live updates
├─ Customer order tracking
└─ Performance optimization

Week 6: Delivery System
├─ Delivery boy assignment logic
├─ Delivery tracking UI
├─ Real-time location updates
└─ Delivery boy status management

Week 7: Analytics & Polish
├─ Analytics dashboard
├─ Order history
├─ Reorder recommendations
├─ UI/UX improvements
└─ Bug fixes from Phase 1
```

---

## 📅 Phase 3: Scale & Multi-Restaurant (Weeks 8+)

### Goals
- Support multiple restaurants
- Advanced AI recommendations
- Mobile app (optional)
- Global scaling

---

## 🛠️ Tech Stack Summary

```
Frontend:           Next.js 14+ (React)
Backend:            Next.js API Routes
Database:           MongoDB Atlas
AI:                 Groq API
Messaging:          11za Webhooks
Payments:           Razorpay
Hosting:            Vercel
Styling:            TailwindCSS + ShadcnUI
Real-time:          SSE or WebSocket (Phase 2)

Development:
- TypeScript
- Git for version control
- Jest for testing (optional)
- ESLint for code quality
```

---

## 💡 Development Tips

### 1. Use TypeScript from Start
Reduces bugs, improves refactoring later.

### 2. Environment Variables Checklist
```bash
MONGODB_URI=
GROQ_API_KEY=
GROQ_MODEL=
ELEVENZA_API_KEY=
11ZA_WEBHOOK_SECRET=
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=
NEXT_PUBLIC_API_URL=
```

### 3. Local Testing Strategy
```bash
# Terminal 1: Start dev server
npm run dev

# Terminal 2: Test webhook locally
ngrok http 3000
# Use ngrok URL in 11za webhook settings

# Test payment locally:
# Use Razorpay test keys (starts with "rzp_test_")
```

### 4. Logging Best Practices
```typescript
// Use structured logging
console.log(JSON.stringify({
  timestamp: new Date(),
  service: "order-service",
  action: "order-created",
  orderId: "ord_123",
  level: "INFO"
}));

// Later: Replace with Sentry or Datadog
```

---

## ⚠️ Common Pitfalls to Avoid

### ❌ Don't
- Deploy without verifying Razorpay signatures
- Query MongoDB without restaurantId filter
- Store passwords in plaintext
- Forget MongoDB indexes
- Ignore error cases in webhooks

### ✅ Do
- Test payment flow with real Razorpay test keys
- Always enforce restaurantId in queries
- Use bcrypt for passwords
- Create indexes before production
- Add retry logic and idempotency to webhooks

---

## 📊 Success Metrics (Phase 1)

By end of Week 4:
- ✅ 10+ test orders processed end-to-end
- ✅ AI recognition accuracy > 80%
- ✅ Payment success rate 100%
- ✅ Order to kitchen latency < 5 seconds
- ✅ Dashboard response time < 1 second
- ✅ Webhook reliability > 99%

---

**Document Version:** 1.0  
**Last Updated:** March 2026  
**Next Milestone:** Phase 1 MVP Release
