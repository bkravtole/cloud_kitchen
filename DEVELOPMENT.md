# 🚀 CloudKitchen - Phase 1 Development Guide

## Project Structure

```
src/
├── app/
│   ├── api/                          # Next.js API Routes
│   │   ├── health/route.ts           # Health check endpoint
│   │   ├── menu/route.ts             # Menu CRUD operations
│   │   ├── cart/route.ts             # Cart management
│   │   ├── order/route.ts            # Order operations
│   │   ├── ai/process/route.ts       # AI message processing
│   │   ├── webhook/11za/route.ts     # 11za WhatsApp webhook
│   │   └── payment/webhook/route.ts  # Razorpay webhook
│   │
│   ├── dashboard/                    # Kitchen Dashboard Pages
│   │   ├── layout.tsx                # Dashboard layout
│   │   └── page.tsx                  # Main dashboard
│   │
│   ├── layout.tsx                    # Root layout
│   ├── page.tsx                      # Home page
│   └── globals.css                   # Global styles
│
├── lib/
│   ├── db/
│   │   └── mongodb.ts                # MongoDB connection & indexes
│   ├── services/
│   │   ├── groq.ts                   # Groq AI service
│   │   ├── menu.ts                   # Menu service
│   │   └── cart.ts                   # Cart service
│   └── utils.ts                      # Utilities (logging, verification, etc)
│
├── types/
│   └── index.ts                      # TypeScript interfaces
│
└── components/                        # React components (future use)

package.json                           # Dependencies
tsconfig.json                          # TypeScript config
next.config.js                         # Next.js config
tailwind.config.js                     # Tailwind CSS config
postcss.config.js                      # PostCSS config
.env.example                           # Environment variables template
.gitignore                             # Git ignore rules
```

## Setup Instructions

### 1. Install Dependencies

```bash
cd d:\cloudkitchen
npm install
```

### 2. Environment Configuration

```bash
# Copy the example file
cp .env.example .env.local

# Fill in the required variables:
# - MONGODB_URI: MongoDB Atlas connection string
# - GROQ_API_KEY: Get from https://console.groq.com
# - ELEVENZA_API_KEY: Get from https://11za.com
# - RAZORPAY_KEY_ID & RAZORPAY_KEY_SECRET: Get from https://dashboard.razorpay.com
```

### 3. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## API Endpoints Reference

### Health Check
```
GET /api/health
```

### Menu Management
```
GET /api/menu?restaurantId=rest_123
POST /api/menu (create item)
```

Example POST:
```json
{
  "restaurantId": "rest_123",
  "itemId": "item_001",
  "name": "Chicken Biryani",
  "price": 250,
  "category": "Rice",
  "tags": ["spicy", "bestseller"],
  "spiceLevel": 4,
  "serves": 2,
  "isAvailable": true,
  "preparationTime": 20
}
```

### Cart Operations
```
GET /api/cart?userPhone=919876543210&restaurantId=rest_123
POST /api/cart (add item)
```

Example POST:
```json
{
  "userPhone": "919876543210",
  "restaurantId": "rest_123",
  "restaurantName": "My Restaurant",
  "item": {
    "itemId": "item_001",
    "name": "Chicken Biryani",
    "price": 250,
    "quantity": 1
  }
}
```

### Order Management
```
POST /api/order (create order)
GET /api/order?restaurantId=rest_123&userPhone=919876543210
PATCH /api/order/:orderId (update status)
```

### AI Message Processing
```
POST /api/ai/process
```

Example:
```json
{
  "userMessage": "Show me spicy food",
  "restaurantId": "rest_123",
  "restaurantName": "My Restaurant",
  "userPhone": "919876543210"
}
```

### Webhooks
```
POST /api/webhook/11za (11za WhatsApp messages)
POST /api/payment/webhook (Razorpay payments)
```

## Database Setup

### MongoDB Collections

The following collections will be auto-created with proper indexes:

1. **users** - Customer profiles
2. **restaurants** - Restaurant information
3. **menus** - Menu items
4. **carts** - Shopping carts (2-hour TTL)
5. **orders** - Order records
6. **delivery_boys** - Delivery personnel
7. **payment_transactions** - Payment records

Indexes are automatically created on first connection.

## Development Workflow

### Week 1-2 Tasks (Already Done)
- ✅ Next.js 14 project setup
- ✅ MongoDB connection
- ✅ TypeScript types
- ✅ Core services (Menu, Cart, Groq AI)
- ✅ Basic API routes
- ✅ Kitchen dashboard UI

### Week 2-3 Tasks (Next)
- [ ] Implement 11za webhook message receiving
- [ ] Complete AI -> WhatsApp response flow
- [ ] Implement Razorpay payment link generation
- [ ] Test end-to-end order flow
- [ ] Add authentication for kitchen dashboard

### Week 3-4 Tasks
- [ ] Real-time order updates (WebSocket/SSE)
- [ ] Delivery boy management
- [ ] Kitchen display system optimization
- [ ] Error handling & recovery
- [ ] Unit & integration tests
- [ ] Deploy to Vercel

## Testing Local Setup

### 1. Test Health Check
```bash
curl http://localhost:3000/api/health
```

### 2. Create Test Menu (Restaurant)
```bash
curl -X POST http://localhost:3000/api/menu \
  -H "Content-Type: application/json" \
  -d '{
    "restaurantId": "rest_001",
    "itemId": "item_001",
    "name": "Butter Chicken",
    "price": 300,
    "category": "Curries",
    "tags": ["spicy", "chicken"],
    "spiceLevel": 3,
    "serves": 2,
    "isAvailable": true
  }'
```

### 3. Seed Menu Data
Create a script file `scripts/seed-menu.js`:
```javascript
const fetch = require('node-fetch');

const menuItems = [
  {
    restaurantId: 'rest_001',
    itemId: 'item_001',
    name: 'Chicken Biryani',
    price: 250,
    category: 'Rice',
    tags: ['spicy', 'bestseller'],
  },
  // ... more items
];

async function seed() {
  for (const item of menuItems) {
    await fetch('http://localhost:3000/api/menu', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    });
  }
  console.log('Menu seeded!');
}

seed();
```

## 🧠 Key Features Already Implemented

### 1. **MongoDB Connection**
- Automatic connection pooling
- Index creation on startup
- Connection reuse in serverless environment

### 2. **TypeScript Types**
- Interfaces for all entities (User, Order, Cart, etc.)
- Enum for statuses
- Type-safe API responses

### 3. **Groq AI Service**
- Message intent detection
- Entity extraction
- Menu filtering by preferences
- Fallback responses

### 4. **Menu Management**
- Create, read, update, delete operations
- Filtering by category, tags, availability
- Search functionality

### 5. **Cart Management**
- Add/remove items
- Quantity updates
- Automatic price calculation (with tax & delivery)
- 2-hour automatic expiry

### 6. **Kitchen Dashboard**
- Real-time order display
- Order status management
- Order filtering and search
- Responsive UI with TailwindCSS

## 📝 Common Tasks

### Add a New API Endpoint

1. Create file: `src/app/api/[feature]/route.ts`
2. Implement GET/POST/PATCH/DELETE handlers
3. Use `connectToDatabase()` to get MongoDB instance
4. Return `NextResponse.json()` with proper status

Example:
```typescript
import { NextResponse, NextRequest } from 'next/server';
import { connectToDatabase } from '@/lib/db/mongodb';
import { errorResponse, logStructured } from '@/lib/utils';

export async function GET(request: NextRequest) {
  try {
    const { db } = await connectToDatabase();
    // Your logic here
    return NextResponse.json({ success: true, data: {} });
  } catch (error) {
    logStructured('error', 'Error message', { error });
    return NextResponse.json(errorResponse('Failed'), { status: 500 });
  }
}
```

### Add a New Service

1. Create file: `src/lib/services/[name].ts`
2. Export class with methods
3. Inject MongoDB `Db` instance in constructor
4. Use in API routes

### Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables via dashboard or:
vercel env add MONGODB_URI
vercel env add GROQ_API_KEY
# ... etc
```

## 🐛 Troubleshooting

### MongoDB Connection Failed
- Verify `MONGODB_URI` in `.env.local`
- Check IP whitelist in MongoDB Atlas
- Ensure database is in the right cluster

### Groq API Errors
- Verify `GROQ_API_KEY` is correct
- Check remaining API quota
- Test with simple prompt

### 11za Webhook Not Receiving
- Use ngrok for local testing: `ngrok http 3000`
- Update webhook URL in 11za dashboard
- Check signature verification

### Razorpay Test Mode
- Use test keys (starts with `rzp_test_`)
- Use test card: `4111 1111 1111 1111`
- Expiry: Any future date
- CVV: Any 3 digits

## 📚 ReadMore

- [HLD.md](./HLD.md) - System architecture
- [API_CONTRACTS.md](./API_CONTRACTS.md) - Complete API specification
- [TECHNICAL_DECISIONS.md](./TECHNICAL_DECISIONS.md) - Design decisions
- [IMPLEMENTATION_ROADMAP.md](./IMPLEMENTATION_ROADMAP.md) - Week-by-week plan

## ✅ Phase 1 Checklist

- [ ] Dependencies installed & environment configured
- [ ] MongoDB connection tested
- [ ] Groq API integration tested
- [ ] Menu CRUD operations working
- [ ] Cart operations working
- [ ] Order creation flow working
- [ ] AI message processing working
- [ ] Kitchen dashboard displaying orders
- [ ] 11za webhook ready for messages
- [ ] Razorpay webhook ready for payments
- [ ] End-to-end test completed
- [ ] Deployed to Vercel

# 🚀 CloudKitchen - Phase 1 Development Guide

## Project Structure

```
src/
├── app/
│   ├── api/                          # Next.js API Routes
│   │   ├── health/route.ts           # Health check endpoint
│   │   ├── menu/route.ts             # Menu CRUD operations
│   │   ├── cart/route.ts             # Cart management
│   │   ├── order/route.ts            # Order operations
│   │   ├── ai/process/route.ts       # AI message processing
│   │   ├── webhook/11za/route.ts     # 11za WhatsApp webhook
│   │   └── payment/webhook/route.ts  # Razorpay webhook
│   │
│   ├── dashboard/                    # Kitchen Dashboard Pages
│   │   ├── layout.tsx                # Dashboard layout
│   │   └── page.tsx                  # Main dashboard
│   │
│   ├── layout.tsx                    # Root layout
│   ├── page.tsx                      # Home page
│   └── globals.css                   # Global styles
│
├── lib/
│   ├── db/
│   │   └── mongodb.ts                # MongoDB connection & indexes
│   ├── services/
│   │   ├── groq.ts                   # Groq AI service
│   │   ├── menu.ts                   # Menu service
│   │   └── cart.ts                   # Cart service
│   └── utils.ts                      # Utilities (logging, verification, etc)
│
├── types/
│   └── index.ts                      # TypeScript interfaces
│
└── components/                        # React components (future use)

package.json                           # Dependencies
tsconfig.json                          # TypeScript config
next.config.js                         # Next.js config
tailwind.config.js                     # Tailwind CSS config
postcss.config.js                      # PostCSS config
.env.example                           # Environment variables template
.gitignore                             # Git ignore rules
```

## Setup Instructions

### 1. Install Dependencies

```bash
cd d:\cloudkitchen
npm install
```

### 2. Environment Configuration

```bash
# Copy the example file
cp .env.example .env.local

# Fill in the required variables:
# - MONGODB_URI: MongoDB Atlas connection string
# - GROQ_API_KEY: Get from https://console.groq.com
# - ELEVENZA_API_KEY: Get from https://11za.com
# - RAZORPAY_KEY_ID & RAZORPAY_KEY_SECRET: Get from https://dashboard.razorpay.com
```

### 3. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## API Endpoints Reference

### Health Check
```
GET /api/health
```

### Menu Management
```
GET /api/menu?restaurantId=rest_123
POST /api/menu (create item)
```

Example POST:
```json
{
  "restaurantId": "rest_123",
  "itemId": "item_001",
  "name": "Chicken Biryani",
  "price": 250,
  "category": "Rice",
  "tags": ["spicy", "bestseller"],
  "spiceLevel": 4,
  "serves": 2,
  "isAvailable": true,
  "preparationTime": 20
}
```

### Cart Operations
```
GET /api/cart?userPhone=919876543210&restaurantId=rest_123
POST /api/cart (add item)
```

Example POST:
```json
{
  "userPhone": "919876543210",
  "restaurantId": "rest_123",
  "restaurantName": "My Restaurant",
  "item": {
    "itemId": "item_001",
    "name": "Chicken Biryani",
    "price": 250,
    "quantity": 1
  }
}
```

### Order Management
```
POST /api/order (create order)
GET /api/order?restaurantId=rest_123&userPhone=919876543210
PATCH /api/order/:orderId (update status)
```

### AI Message Processing
```
POST /api/ai/process
```

Example:
```json
{
  "userMessage": "Show me spicy food",
  "restaurantId": "rest_123",
  "restaurantName": "My Restaurant",
  "userPhone": "919876543210"
}
```

### Webhooks
```
POST /api/webhook/11za (11za WhatsApp messages)
POST /api/payment/webhook (Razorpay payments)
```

## Database Setup

### MongoDB Collections

The following collections will be auto-created with proper indexes:

1. **users** - Customer profiles
2. **restaurants** - Restaurant information
3. **menus** - Menu items
4. **carts** - Shopping carts (2-hour TTL)
5. **orders** - Order records
6. **delivery_boys** - Delivery personnel
7. **payment_transactions** - Payment records

Indexes are automatically created on first connection.

## Development Workflow

### Week 1-2 Tasks (Already Done)
- ✅ Next.js 14 project setup
- ✅ MongoDB connection
- ✅ TypeScript types
- ✅ Core services (Menu, Cart, Groq AI)
- ✅ Basic API routes
- ✅ Kitchen dashboard UI

### Week 2-3 Tasks (Next)
- [ ] Implement 11za webhook message receiving
- [ ] Complete AI -> WhatsApp response flow
- [ ] Implement Razorpay payment link generation
- [ ] Test end-to-end order flow
- [ ] Add authentication for kitchen dashboard

### Week 3-4 Tasks
- [ ] Real-time order updates (WebSocket/SSE)
- [ ] Delivery boy management
- [ ] Kitchen display system optimization
- [ ] Error handling & recovery
- [ ] Unit & integration tests
- [ ] Deploy to Vercel

## Testing Local Setup

### 1. Test Health Check
```bash
curl http://localhost:3000/api/health
```

### 2. Create Test Menu (Restaurant)
```bash
curl -X POST http://localhost:3000/api/menu \
  -H "Content-Type: application/json" \
  -d '{
    "restaurantId": "rest_001",
    "itemId": "item_001",
    "name": "Butter Chicken",
    "price": 300,
    "category": "Curries",
    "tags": ["spicy", "chicken"],
    "spiceLevel": 3,
    "serves": 2,
    "isAvailable": true
  }'
```

### 3. Seed Menu Data
Create a script file `scripts/seed-menu.js`:
```javascript
const fetch = require('node-fetch');

const menuItems = [
  {
    restaurantId: 'rest_001',
    itemId: 'item_001',
    name: 'Chicken Biryani',
    price: 250,
    category: 'Rice',
    tags: ['spicy', 'bestseller'],
  },
  // ... more items
];

async function seed() {
  for (const item of menuItems) {
    await fetch('http://localhost:3000/api/menu', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    });
  }
  console.log('Menu seeded!');
}

seed();
```

## 🧠 Key Features Already Implemented

### 1. **MongoDB Connection**
- Automatic connection pooling
- Index creation on startup
- Connection reuse in serverless environment

### 2. **TypeScript Types**
- Interfaces for all entities (User, Order, Cart, etc.)
- Enum for statuses
- Type-safe API responses

### 3. **Groq AI Service**
- Message intent detection
- Entity extraction
- Menu filtering by preferences
- Fallback responses

### 4. **Menu Management**
- Create, read, update, delete operations
- Filtering by category, tags, availability
- Search functionality

### 5. **Cart Management**
- Add/remove items
- Quantity updates
- Automatic price calculation (with tax & delivery)
- 2-hour automatic expiry

### 6. **Kitchen Dashboard**
- Real-time order display
- Order status management
- Order filtering and search
- Responsive UI with TailwindCSS

## 📝 Common Tasks

### Add a New API Endpoint

1. Create file: `src/app/api/[feature]/route.ts`
2. Implement GET/POST/PATCH/DELETE handlers
3. Use `connectToDatabase()` to get MongoDB instance
4. Return `NextResponse.json()` with proper status

Example:
```typescript
import { NextResponse, NextRequest } from 'next/server';
import { connectToDatabase } from '@/lib/db/mongodb';
import { errorResponse, logStructured } from '@/lib/utils';

export async function GET(request: NextRequest) {
  try {
    const { db } = await connectToDatabase();
    // Your logic here
    return NextResponse.json({ success: true, data: {} });
  } catch (error) {
    logStructured('error', 'Error message', { error });
    return NextResponse.json(errorResponse('Failed'), { status: 500 });
  }
}
```

### Add a New Service

1. Create file: `src/lib/services/[name].ts`
2. Export class with methods
3. Inject MongoDB `Db` instance in constructor
4. Use in API routes

### Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables via dashboard or:
vercel env add MONGODB_URI
vercel env add GROQ_API_KEY
# ... etc
```

## 🐛 Troubleshooting

### MongoDB Connection Failed
- Verify `MONGODB_URI` in `.env.local`
- Check IP whitelist in MongoDB Atlas
- Ensure database is in the right cluster

### Groq API Errors
- Verify `GROQ_API_KEY` is correct
- Check remaining API quota
- Test with simple prompt

### 11za Webhook Not Receiving
- Use ngrok for local testing: `ngrok http 3000`
- Update webhook URL in 11za dashboard
- Check signature verification

### Razorpay Test Mode
- Use test keys (starts with `rzp_test_`)
- Use test card: `4111 1111 1111 1111`
- Expiry: Any future date
- CVV: Any 3 digits

## 📚 ReadMore

- [HLD.md](./HLD.md) - System architecture
- [API_CONTRACTS.md](./API_CONTRACTS.md) - Complete API specification
- [TECHNICAL_DECISIONS.md](./TECHNICAL_DECISIONS.md) - Design decisions
- [IMPLEMENTATION_ROADMAP.md](./IMPLEMENTATION_ROADMAP.md) - Week-by-week plan

## ✅ Phase 1 Checklist

- [ ] Dependencies installed & environment configured
- [ ] MongoDB connection tested
- [ ] Groq API integration tested
- [ ] Menu CRUD operations working
- [ ] Cart operations working
- [ ] Order creation flow working
- [ ] AI message processing working
- [ ] Kitchen dashboard displaying orders
- [ ] 11za webhook ready for messages
- [ ] Razorpay webhook ready for payments
- [ ] End-to-end test completed
- [ ] Deployed to Vercel
