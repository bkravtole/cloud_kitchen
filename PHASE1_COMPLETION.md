# 🎯 Phase 1 Complete Implementation - Week 2-4

You've completed the **Project Setup**. Now let's build the full MVP end-to-end.

---

## 📋 What's Left in Phase 1

### ✅ Already Done
- Project structure & configuration
- MongoDB connection & indexes
- TypeScript types & utilities
- Menu, Cart, Order services
- Kitchen Dashboard UI
- 8 API route stubs

### ⏳ Remaining Tasks
1. **Week 2:** Complete API routes with error handling
2. **Week 3:** 11za WhatsApp webhook implementation
3. **Week 3:** AI service integration with WhatsApp
4. **Week 4:** Razorpay payment webhook & verification
5. **Week 4:** End-to-end testing & deployment

---

## 🚀 WEEK 2: Complete Core API Routes

### Task 1: Enhance Menu API (2 hours)
Update `src/app/api/menu/route.ts` to add search & filtering:

```typescript
'use server';

import { NextResponse, NextRequest } from 'next/server';
import { connectToDatabase } from '@/lib/db/mongodb';
import { MenuService } from '@/lib/services/menu';
import { errorResponse, logStructured, getPaginationParams } from '@/lib/utils';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get('restaurantId');
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const { page, limit, skip } = getPaginationParams(searchParams);

    if (!restaurantId) {
      return NextResponse.json(
        { success: false, error: 'restaurantId is required' },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();
    const menuService = new MenuService(db);

    let menu;
    if (search) {
      menu = await menuService.searchMenu(restaurantId, search);
    } else if (category) {
      menu = await menuService.getMenuByCategory(restaurantId, category);
    } else {
      menu = await menuService.getMenuByRestaurant(restaurantId);
    }

    return NextResponse.json(
      {
        success: true,
        data: menu.slice(skip, skip + limit),
        total: menu.length,
        page,
        limit,
      },
      { status: 200 }
    );
  } catch (error) {
    logStructured('error', 'Menu GET error', { error });
    return NextResponse.json(errorResponse('Failed to fetch menu'), { status: 500 });
  }
}
```

### Task 2: Cart Remove Item Endpoint (1 hour)
Create `src/app/api/cart/[itemId]/route.ts`:

```typescript
'use server';

import { NextResponse, NextRequest } from 'next/server';
import { connectToDatabase } from '@/lib/db/mongodb';
import { CartService } from '@/lib/services/cart';
import { errorResponse, logStructured } from '@/lib/utils';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { itemId: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const userPhone = searchParams.get('userPhone');
    const restaurantId = searchParams.get('restaurantId');

    if (!userPhone || !restaurantId) {
      return NextResponse.json(
        { success: false, error: 'userPhone and restaurantId required' },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();
    const cartService = new CartService(db);

    const updatedCart = await cartService.removeItemFromCart(
      userPhone,
      restaurantId,
      params.itemId
    );

    logStructured('info', 'Item removed from cart', {
      userPhone,
      restaurantId,
      itemId: params.itemId,
    });

    return NextResponse.json(
      { success: true, data: updatedCart },
      { status: 200 }
    );
  } catch (error) {
    logStructured('error', 'Cart DELETE error', { error });
    return NextResponse.json(errorResponse('Failed to remove item'), { status: 500 });
  }
}
```

### Task 3: Order Status Update (1 hour)
Already created in `/api/order/[orderId]/route.ts` - verify it works.

Test:
```bash
curl -X PATCH http://localhost:3000/api/order/ord_12345 \
  -H "Content-Type: application/json" \
  -d '{"status": "PREPARING", "restaurantId": "rest_001"}'
```

---

## 🧠 WEEK 3: 11za WhatsApp Integration

### Task 1: Complete 11za Webhook Handler (3 hours)

Update `src/app/api/webhook/11za/route.ts`:

```typescript
'use server';

import { NextResponse, NextRequest } from 'next/server';
import { connectToDatabase } from '@/lib/db/mongodb';
import { MenuService } from '@/lib/services/menu';
import { CartService } from '@/lib/services/cart';
import { processUserMessage } from '@/lib/services/groq';
import { logStructured, errorResponse, verify11zaSignature, formatPhoneNumber } from '@/lib/utils';

interface 11zaWebhookPayload {
  from: string;
  text: string;
  messageId: string;
  timestamp: number;
  type: 'text' | 'button_response' | 'list_response';
}

export async function POST(request: NextRequest) {
  try {
    const signature = request.headers.get('X-11za-Signature');
    const body = await request.text();

    if (!signature) {
      logStructured('warn', '11za webhook missing signature');
      return NextResponse.json({ success: false }, { status: 400 });
    }

    // Verify signature
    // const isValid = verify11zaSignature(body, signature, process.env.11ZA_WEBHOOK_SECRET!);
    // if (!isValid) {
    //   logStructured('warn', '11za webhook invalid signature');
    //   return NextResponse.json({ success: false }, { status: 401 });
    // }

    const payload: 11zaWebhookPayload = JSON.parse(body);
    const { from, text, messageId, type } = payload;

    logStructured('info', '11za message received', {
      from,
      messageId,
      text: text.substring(0, 50),
      type,
    });

    // TODO: Route to appropriate handler based on message type
    // For now, process as text message

    // Format phone number
    const fromPhone = formatPhoneNumber(from);
    const restaurantId = 'rest_001'; // TODO: Get from user context

    const { db } = await connectToDatabase();
    const menuService = new MenuService(db);

    // Get menu
    const menu = await menuService.getMenuByRestaurant(restaurantId);

    if (!menu.length) {
      await send11zaMessage(fromPhone, 'Sorry, menu is not available right now.');
      return NextResponse.json({ success: true }, { status: 200 });
    }

    // Process AI
    const aiResponse = await processUserMessage(
      text,
      menu as any,
      'CloudKitchen Restaurant',
      []
    );

    // Format response
    let responseText = aiResponse.conversationalResponse;

    if (aiResponse.suggestedItems.length > 0) {
      const suggestedMenuItems = menu.filter(item =>
        aiResponse.suggestedItems.some(id => id.toLowerCase() === item.itemId.toLowerCase())
      );

      responseText += '\n\n*Available Items:*\n';
      suggestedMenuItems.forEach((item, idx) => {
        responseText += `${idx + 1}. ${item.name} - ₹${item.price}\n`;
      });
    }

    // Send response back
    await send11zaMessage(fromPhone, responseText);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    logStructured('error', '11za webhook error', { error });
    return NextResponse.json(errorResponse('Webhook failed', 500), { status: 500 });
  }
}

async function send11zaMessage(toPhone: string, message: string): Promise<void> {
  try {
    const response = await fetch(`${process.env.11ZA_BASE_URL}/send_message`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.11ZA_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: toPhone,
        text: message,
      }),
    });

    if (!response.ok) {
      logStructured('error', '11za send failed', {
        status: response.status,
        message,
      });
    }
  } catch (error) {
    logStructured('error', '11za send error', { error });
  }
}
```

### Task 2: Service for 11za API (2 hours)

Create `src/lib/services/11za.ts`:

```typescript
import { logStructured } from '@/lib/utils';

interface 11zaMessage {
  to: string;
  text?: string;
  buttons?: Array<{ id: string; title: string }>;
  list?: {
    title: string;
    body: string;
    rows: Array<{ id: string; title: string; description?: string }>;
  };
}

export class ElevenZaService {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = process.env.11ZA_API_KEY || '';
    this.baseUrl = process.env.11ZA_BASE_URL || '';
  }

  async sendMessage(to: string, message: 11zaMessage): Promise<string> {
    try {
      const payload = {
        ...message,
        to,
      };

      const response = await fetch(`${this.baseUrl}/send_message`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data: any = await response.json();
      logStructured('info', '11za message sent', {
        to,
        messageId: data.messageId,
      });

      return data.messageId;
    } catch (error) {
      logStructured('error', '11za send error', { error, to });
      throw error;
    }
  }

  async sendButtonMessage(
    to: string,
    text: string,
    buttons: Array<{ id: string; title: string }>
  ): Promise<string> {
    return this.sendMessage(to, { to, text, buttons });
  }

  async sendListMessage(
    to: string,
    title: string,
    body: string,
    rows: Array<{ id: string; title: string; description?: string }>
  ): Promise<string> {
    return this.sendMessage(to, {
      to,
      list: {
        title,
        body,
        rows,
      },
    });
  }
}

export function get11zaService(): ElevenZaService {
  return new ElevenZaService();
}
```

### Task 3: Test 11za Webhook Locally (1 hour)

```bash
# Install ngrok for local testing
npm install -g ngrok

# In one terminal: start your dev server
npm run dev

# In another terminal: expose to internet
ngrok http 3000

# Get the ngrok URL (e.g., https://abc123.ngrok.io)
# Add to 11za dashboard: https://abc123.ngrok.io/api/webhook/11za

# Test webhook locally
curl -X POST http://localhost:3000/api/webhook/11za \
  -H "Content-Type: application/json" \
  -H "X-11za-Signature: test" \
  -d '{
    "from": "919876543210",
    "text": "Show me spicy items",
    "messageId": "msg_123",
    "timestamp": 1234567890,
    "type": "text"
  }'
```

---

## 💳 WEEK 4: Razorpay Payment Integration

### Task 1: Razorpay Service (2 hours)

Create `src/lib/services/razorpay.ts`:

```typescript
import Razorpay from 'razorpay';
import { logStructured } from '@/lib/utils';

export class RazorpayService {
  private razorpay: Razorpay;

  constructor() {
    this.razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID!,
      key_secret: process.env.RAZORPAY_KEY_SECRET!,
    });
  }

  async generatePaymentLink(params: {
    orderId: string;
    amount: number;
    customerName: string;
    customerPhone: string;
    customerEmail: string;
    description: string;
    redirectUrl: string;
  }): Promise<{ shortUrl: string; razorpayOrderId: string }> {
    try {
      const paymentLink = await this.razorpay.paymentLink.create({
        amount: Math.round(params.amount * 100), // Convert to paise
        currency: 'INR',
        accept_partial: false,
        customer: {
          name: params.customerName,
          contact: params.customerPhone,
          email: params.customerEmail,
        },
        notify: {
          sms: true,
          email: true,
        },
        reminder_enable: true,
        notes: {
          orderId: params.orderId,
        },
        callback_url: params.redirectUrl,
        callback_method: 'get',
        description: params.description,
      });

      logStructured('info', 'Payment link created', {
        orderId: params.orderId,
        paymentLinkId: paymentLink.id,
      });

      return {
        shortUrl: paymentLink.short_url,
        razorpayOrderId: paymentLink.id,
      };
    } catch (error) {
      logStructured('error', 'Payment link creation failed', { error });
      throw error;
    }
  }
}

export function getRazorpayService(): RazorpayService {
  return new RazorpayService();
}
```

### Task 2: Update Order API for Payment (2 hours)

Update `src/app/api/order/route.ts` to include payment link:

```typescript
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userPhone, userName, restaurantId, restaurantName, items, total, specialInstructions, userEmail } =
      body;

    // ... validation ...

    const { db } = await connectToDatabase();
    const orderId = generateOrderId();
    
    // Create order
    const newOrder: IOrder = {
      orderId,
      userPhone,
      userName,
      restaurantId,
      restaurantName,
      items,
      specialInstructions,
      subtotal: total,
      tax: Math.round(total * 0.05),
      deliveryCharges: 30,
      total: total + Math.round(total * 0.05) + 30,
      status: OrderStatus.CREATED,
      paymentStatus: 'PENDING',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection<IOrder>('orders').insertOne(newOrder as any);

    // Generate payment link
    const razorpayService = getRazorpayService();
    const { shortUrl, razorpayOrderId } = await razorpayService.generatePaymentLink({
      orderId,
      amount: newOrder.total,
      customerName: userName,
      customerPhone: userPhone,
      customerEmail: userEmail || 'customer@cloudkitchen.com',
      description: `Order ${orderId} - ${restaurantName}`,
      redirectUrl: `${process.env.NEXT_PUBLIC_API_URL}/api/payment/success?orderId=${orderId}`,
    });

    // Update order with razorpay ID
    await db.collection<IOrder>('orders').updateOne(
      { orderId },
      { $set: { razorpayOrderId } }
    );

    logStructured('info', 'Order created with payment link', {
      orderId,
      razorpayOrderId,
      total: newOrder.total,
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          orderId,
          paymentLink: shortUrl,
          total: newOrder.total,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    logStructured('error', 'Order POST error', { error });
    return NextResponse.json(errorResponse('Failed to create order'), { status: 500 });
  }
}
```

### Task 3: Payment Webhook Handler (2 hours)

Update `src/app/api/payment/webhook/route.ts`:

```typescript
'use server';

import { NextResponse, NextRequest } from 'next/server';
import { connectToDatabase } from '@/lib/db/mongodb';
import { logStructured, errorResponse, verifyRazorpaySignature } from '@/lib/utils';
import { OrderStatus, IOrder } from '@/types';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const signature = request.headers.get('X-Razorpay-Signature');
    const body = await request.text();

    if (!signature) {
      logStructured('warn', 'Razorpay webhook missing signature');
      return NextResponse.json({ success: false }, { status: 400 });
    }

    const payload = JSON.parse(body);
    const { event, payload: data } = payload;

    // Verify signature
    const shasum = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!);
    shasum.update(body);
    const expectedSignature = shasum.digest('hex');

    if (signature !== expectedSignature) {
      logStructured('warn', 'Razorpay webhook invalid signature');
      return NextResponse.json({ success: false }, { status: 401 });
    }

    logStructured('info', 'Razorpay webhook verified', { event });

    const { db } = await connectToDatabase();

    if (event === 'payment.authorized' || event === 'payment.captured') {
      const paymentLinkId = data.payment_link?.id || data.id;
      const paymentId = data.payment?.entity?.id || data.payments?.items?.[0]?.id;
      const orderId = data.notes?.orderId;

      if (!orderId) {
        logStructured('warn', 'Payment webhook missing orderId');
        return NextResponse.json({ success: true }, { status: 200 });
      }

      // Update order
      const result = await db.collection('orders').findOneAndUpdate(
        { orderId },
        {
          $set: {
            paymentStatus: 'AUTHORIZED',
            paymentId,
            status: OrderStatus.CONFIRMED,
            updatedAt: new Date(),
          },
        },
        { returnDocument: 'after' }
      );

      logStructured('info', 'Order payment confirmed', {
        orderId,
        paymentId,
        status: OrderStatus.CONFIRMED,
      });

      // TODO: Send WhatsApp notification
      // await send11zaMessage(result.value.userPhone, `Your order ${orderId} is confirmed!`);
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    logStructured('error', 'Razorpay webhook error', { error });
    return NextResponse.json(errorResponse('Webhook failed', 500), { status: 500 });
  }
}
```

---

## 🧪 End-to-End Testing

### Scenario: Complete Order Flow

```bash
# 1. Create menu
curl -X POST http://localhost:3000/api/menu \
  -H "Content-Type: application/json" \
  -d '{
    "restaurantId": "rest_001",
    "itemId": "item_001",
    "name": "Butter Chicken",
    "price": 300,
    "category": "Curries",
    "tags": ["bestseller"],
    "spiceLevel": 3,
    "serves": 2,
    "isAvailable": true
  }'

# 2. Add to cart
curl -X POST http://localhost:3000/api/cart \
  -H "Content-Type: application/json" \
  -d '{
    "userPhone": "919876543210",
    "restaurantId": "rest_001",
    "restaurantName": "My Restaurant",
    "item": {
      "itemId": "item_001",
      "name": "Butter Chicken",
      "price": 300,
      "quantity": 2
    }
  }'

# 3. Create order
curl -X POST http://localhost:3000/api/order \
  -H "Content-Type: application/json" \
  -d '{
    "userPhone": "919876543210",
    "userName": "Raj Kumar",
    "userEmail": "raj@example.com",
    "restaurantId": "rest_001",
    "restaurantName": "My Restaurant",
    "items": [{
      "itemId": "item_001",
      "name": "Butter Chicken",
      "price": 300,
      "quantity": 2
    }],
    "total": 600,
    "specialInstructions": "Less spicy"
  }'

# Response will have: paymentLink, orderId

# 4. Use payment link to complete payment

# 5. Check order status
curl "http://localhost:3000/api/order?restaurantId=rest_001&userPhone=919876543210"

# 6. Kitchen updates order status
curl -X PATCH http://localhost:3000/api/order/ord_xxxxx \
  -H "Content-Type: application/json" \
  -d '{
    "status": "PREPARING",
    "restaurantId": "rest_001"
  }'
```

---

## ✅ Phase 1 Completion Checklist

- [ ] Week 2: All API routes complete & tested
- [ ] Week 3: 11za webhook receiving messages
- [ ] Week 3: AI processing messages from WhatsApp
- [ ] Week 3: Responses sent back via WhatsApp
- [ ] Week 4: Razorpay payment links generated
- [ ] Week 4: Payment webhook verification working
- [ ] Week 4: Order status updates working
- [ ] Week 4: End-to-end test passed
- [ ] Deploy to Vercel
- [ ] Document API for Phase 2

Once all complete → Move to Phase 2!

# 🎯 Phase 1 Complete Implementation - Week 2-4

You've completed the **Project Setup**. Now let's build the full MVP end-to-end.

---

## 📋 What's Left in Phase 1

### ✅ Already Done
- Project structure & configuration
- MongoDB connection & indexes
- TypeScript types & utilities
- Menu, Cart, Order services
- Kitchen Dashboard UI
- 8 API route stubs

### ⏳ Remaining Tasks
1. **Week 2:** Complete API routes with error handling
2. **Week 3:** 11za WhatsApp webhook implementation
3. **Week 3:** AI service integration with WhatsApp
4. **Week 4:** Razorpay payment webhook & verification
5. **Week 4:** End-to-end testing & deployment

---

## 🚀 WEEK 2: Complete Core API Routes

### Task 1: Enhance Menu API (2 hours)
Update `src/app/api/menu/route.ts` to add search & filtering:

```typescript
'use server';

import { NextResponse, NextRequest } from 'next/server';
import { connectToDatabase } from '@/lib/db/mongodb';
import { MenuService } from '@/lib/services/menu';
import { errorResponse, logStructured, getPaginationParams } from '@/lib/utils';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get('restaurantId');
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const { page, limit, skip } = getPaginationParams(searchParams);

    if (!restaurantId) {
      return NextResponse.json(
        { success: false, error: 'restaurantId is required' },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();
    const menuService = new MenuService(db);

    let menu;
    if (search) {
      menu = await menuService.searchMenu(restaurantId, search);
    } else if (category) {
      menu = await menuService.getMenuByCategory(restaurantId, category);
    } else {
      menu = await menuService.getMenuByRestaurant(restaurantId);
    }

    return NextResponse.json(
      {
        success: true,
        data: menu.slice(skip, skip + limit),
        total: menu.length,
        page,
        limit,
      },
      { status: 200 }
    );
  } catch (error) {
    logStructured('error', 'Menu GET error', { error });
    return NextResponse.json(errorResponse('Failed to fetch menu'), { status: 500 });
  }
}
```

### Task 2: Cart Remove Item Endpoint (1 hour)
Create `src/app/api/cart/[itemId]/route.ts`:

```typescript
'use server';

import { NextResponse, NextRequest } from 'next/server';
import { connectToDatabase } from '@/lib/db/mongodb';
import { CartService } from '@/lib/services/cart';
import { errorResponse, logStructured } from '@/lib/utils';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { itemId: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const userPhone = searchParams.get('userPhone');
    const restaurantId = searchParams.get('restaurantId');

    if (!userPhone || !restaurantId) {
      return NextResponse.json(
        { success: false, error: 'userPhone and restaurantId required' },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();
    const cartService = new CartService(db);

    const updatedCart = await cartService.removeItemFromCart(
      userPhone,
      restaurantId,
      params.itemId
    );

    logStructured('info', 'Item removed from cart', {
      userPhone,
      restaurantId,
      itemId: params.itemId,
    });

    return NextResponse.json(
      { success: true, data: updatedCart },
      { status: 200 }
    );
  } catch (error) {
    logStructured('error', 'Cart DELETE error', { error });
    return NextResponse.json(errorResponse('Failed to remove item'), { status: 500 });
  }
}
```

### Task 3: Order Status Update (1 hour)
Already created in `/api/order/[orderId]/route.ts` - verify it works.

Test:
```bash
curl -X PATCH http://localhost:3000/api/order/ord_12345 \
  -H "Content-Type: application/json" \
  -d '{"status": "PREPARING", "restaurantId": "rest_001"}'
```

---

## 🧠 WEEK 3: 11za WhatsApp Integration

### Task 1: Complete 11za Webhook Handler (3 hours)

Update `src/app/api/webhook/11za/route.ts`:

```typescript
'use server';

import { NextResponse, NextRequest } from 'next/server';
import { connectToDatabase } from '@/lib/db/mongodb';
import { MenuService } from '@/lib/services/menu';
import { CartService } from '@/lib/services/cart';
import { processUserMessage } from '@/lib/services/groq';
import { logStructured, errorResponse, verify11zaSignature, formatPhoneNumber } from '@/lib/utils';

interface 11zaWebhookPayload {
  from: string;
  text: string;
  messageId: string;
  timestamp: number;
  type: 'text' | 'button_response' | 'list_response';
}

export async function POST(request: NextRequest) {
  try {
    const signature = request.headers.get('X-11za-Signature');
    const body = await request.text();

    if (!signature) {
      logStructured('warn', '11za webhook missing signature');
      return NextResponse.json({ success: false }, { status: 400 });
    }

    // Verify signature
    // const isValid = verify11zaSignature(body, signature, process.env.11ZA_WEBHOOK_SECRET!);
    // if (!isValid) {
    //   logStructured('warn', '11za webhook invalid signature');
    //   return NextResponse.json({ success: false }, { status: 401 });
    // }

    const payload: 11zaWebhookPayload = JSON.parse(body);
    const { from, text, messageId, type } = payload;

    logStructured('info', '11za message received', {
      from,
      messageId,
      text: text.substring(0, 50),
      type,
    });

    // TODO: Route to appropriate handler based on message type
    // For now, process as text message

    // Format phone number
    const fromPhone = formatPhoneNumber(from);
    const restaurantId = 'rest_001'; // TODO: Get from user context

    const { db } = await connectToDatabase();
    const menuService = new MenuService(db);

    // Get menu
    const menu = await menuService.getMenuByRestaurant(restaurantId);

    if (!menu.length) {
      await send11zaMessage(fromPhone, 'Sorry, menu is not available right now.');
      return NextResponse.json({ success: true }, { status: 200 });
    }

    // Process AI
    const aiResponse = await processUserMessage(
      text,
      menu as any,
      'CloudKitchen Restaurant',
      []
    );

    // Format response
    let responseText = aiResponse.conversationalResponse;

    if (aiResponse.suggestedItems.length > 0) {
      const suggestedMenuItems = menu.filter(item =>
        aiResponse.suggestedItems.some(id => id.toLowerCase() === item.itemId.toLowerCase())
      );

      responseText += '\n\n*Available Items:*\n';
      suggestedMenuItems.forEach((item, idx) => {
        responseText += `${idx + 1}. ${item.name} - ₹${item.price}\n`;
      });
    }

    // Send response back
    await send11zaMessage(fromPhone, responseText);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    logStructured('error', '11za webhook error', { error });
    return NextResponse.json(errorResponse('Webhook failed', 500), { status: 500 });
  }
}

async function send11zaMessage(toPhone: string, message: string): Promise<void> {
  try {
    const response = await fetch(`${process.env.11ZA_BASE_URL}/send_message`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.11ZA_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: toPhone,
        text: message,
      }),
    });

    if (!response.ok) {
      logStructured('error', '11za send failed', {
        status: response.status,
        message,
      });
    }
  } catch (error) {
    logStructured('error', '11za send error', { error });
  }
}
```

### Task 2: Service for 11za API (2 hours)

Create `src/lib/services/11za.ts`:

```typescript
import { logStructured } from '@/lib/utils';

interface 11zaMessage {
  to: string;
  text?: string;
  buttons?: Array<{ id: string; title: string }>;
  list?: {
    title: string;
    body: string;
    rows: Array<{ id: string; title: string; description?: string }>;
  };
}

export class ElevenZaService {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = process.env.11ZA_API_KEY || '';
    this.baseUrl = process.env.11ZA_BASE_URL || '';
  }

  async sendMessage(to: string, message: 11zaMessage): Promise<string> {
    try {
      const payload = {
        ...message,
        to,
      };

      const response = await fetch(`${this.baseUrl}/send_message`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data: any = await response.json();
      logStructured('info', '11za message sent', {
        to,
        messageId: data.messageId,
      });

      return data.messageId;
    } catch (error) {
      logStructured('error', '11za send error', { error, to });
      throw error;
    }
  }

  async sendButtonMessage(
    to: string,
    text: string,
    buttons: Array<{ id: string; title: string }>
  ): Promise<string> {
    return this.sendMessage(to, { to, text, buttons });
  }

  async sendListMessage(
    to: string,
    title: string,
    body: string,
    rows: Array<{ id: string; title: string; description?: string }>
  ): Promise<string> {
    return this.sendMessage(to, {
      to,
      list: {
        title,
        body,
        rows,
      },
    });
  }
}

export function get11zaService(): ElevenZaService {
  return new ElevenZaService();
}
```

### Task 3: Test 11za Webhook Locally (1 hour)

```bash
# Install ngrok for local testing
npm install -g ngrok

# In one terminal: start your dev server
npm run dev

# In another terminal: expose to internet
ngrok http 3000

# Get the ngrok URL (e.g., https://abc123.ngrok.io)
# Add to 11za dashboard: https://abc123.ngrok.io/api/webhook/11za

# Test webhook locally
curl -X POST http://localhost:3000/api/webhook/11za \
  -H "Content-Type: application/json" \
  -H "X-11za-Signature: test" \
  -d '{
    "from": "919876543210",
    "text": "Show me spicy items",
    "messageId": "msg_123",
    "timestamp": 1234567890,
    "type": "text"
  }'
```

---

## 💳 WEEK 4: Razorpay Payment Integration

### Task 1: Razorpay Service (2 hours)

Create `src/lib/services/razorpay.ts`:

```typescript
import Razorpay from 'razorpay';
import { logStructured } from '@/lib/utils';

export class RazorpayService {
  private razorpay: Razorpay;

  constructor() {
    this.razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID!,
      key_secret: process.env.RAZORPAY_KEY_SECRET!,
    });
  }

  async generatePaymentLink(params: {
    orderId: string;
    amount: number;
    customerName: string;
    customerPhone: string;
    customerEmail: string;
    description: string;
    redirectUrl: string;
  }): Promise<{ shortUrl: string; razorpayOrderId: string }> {
    try {
      const paymentLink = await this.razorpay.paymentLink.create({
        amount: Math.round(params.amount * 100), // Convert to paise
        currency: 'INR',
        accept_partial: false,
        customer: {
          name: params.customerName,
          contact: params.customerPhone,
          email: params.customerEmail,
        },
        notify: {
          sms: true,
          email: true,
        },
        reminder_enable: true,
        notes: {
          orderId: params.orderId,
        },
        callback_url: params.redirectUrl,
        callback_method: 'get',
        description: params.description,
      });

      logStructured('info', 'Payment link created', {
        orderId: params.orderId,
        paymentLinkId: paymentLink.id,
      });

      return {
        shortUrl: paymentLink.short_url,
        razorpayOrderId: paymentLink.id,
      };
    } catch (error) {
      logStructured('error', 'Payment link creation failed', { error });
      throw error;
    }
  }
}

export function getRazorpayService(): RazorpayService {
  return new RazorpayService();
}
```

### Task 2: Update Order API for Payment (2 hours)

Update `src/app/api/order/route.ts` to include payment link:

```typescript
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userPhone, userName, restaurantId, restaurantName, items, total, specialInstructions, userEmail } =
      body;

    // ... validation ...

    const { db } = await connectToDatabase();
    const orderId = generateOrderId();
    
    // Create order
    const newOrder: IOrder = {
      orderId,
      userPhone,
      userName,
      restaurantId,
      restaurantName,
      items,
      specialInstructions,
      subtotal: total,
      tax: Math.round(total * 0.05),
      deliveryCharges: 30,
      total: total + Math.round(total * 0.05) + 30,
      status: OrderStatus.CREATED,
      paymentStatus: 'PENDING',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection<IOrder>('orders').insertOne(newOrder as any);

    // Generate payment link
    const razorpayService = getRazorpayService();
    const { shortUrl, razorpayOrderId } = await razorpayService.generatePaymentLink({
      orderId,
      amount: newOrder.total,
      customerName: userName,
      customerPhone: userPhone,
      customerEmail: userEmail || 'customer@cloudkitchen.com',
      description: `Order ${orderId} - ${restaurantName}`,
      redirectUrl: `${process.env.NEXT_PUBLIC_API_URL}/api/payment/success?orderId=${orderId}`,
    });

    // Update order with razorpay ID
    await db.collection<IOrder>('orders').updateOne(
      { orderId },
      { $set: { razorpayOrderId } }
    );

    logStructured('info', 'Order created with payment link', {
      orderId,
      razorpayOrderId,
      total: newOrder.total,
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          orderId,
          paymentLink: shortUrl,
          total: newOrder.total,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    logStructured('error', 'Order POST error', { error });
    return NextResponse.json(errorResponse('Failed to create order'), { status: 500 });
  }
}
```

### Task 3: Payment Webhook Handler (2 hours)

Update `src/app/api/payment/webhook/route.ts`:

```typescript
'use server';

import { NextResponse, NextRequest } from 'next/server';
import { connectToDatabase } from '@/lib/db/mongodb';
import { logStructured, errorResponse, verifyRazorpaySignature } from '@/lib/utils';
import { OrderStatus, IOrder } from '@/types';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const signature = request.headers.get('X-Razorpay-Signature');
    const body = await request.text();

    if (!signature) {
      logStructured('warn', 'Razorpay webhook missing signature');
      return NextResponse.json({ success: false }, { status: 400 });
    }

    const payload = JSON.parse(body);
    const { event, payload: data } = payload;

    // Verify signature
    const shasum = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!);
    shasum.update(body);
    const expectedSignature = shasum.digest('hex');

    if (signature !== expectedSignature) {
      logStructured('warn', 'Razorpay webhook invalid signature');
      return NextResponse.json({ success: false }, { status: 401 });
    }

    logStructured('info', 'Razorpay webhook verified', { event });

    const { db } = await connectToDatabase();

    if (event === 'payment.authorized' || event === 'payment.captured') {
      const paymentLinkId = data.payment_link?.id || data.id;
      const paymentId = data.payment?.entity?.id || data.payments?.items?.[0]?.id;
      const orderId = data.notes?.orderId;

      if (!orderId) {
        logStructured('warn', 'Payment webhook missing orderId');
        return NextResponse.json({ success: true }, { status: 200 });
      }

      // Update order
      const result = await db.collection('orders').findOneAndUpdate(
        { orderId },
        {
          $set: {
            paymentStatus: 'AUTHORIZED',
            paymentId,
            status: OrderStatus.CONFIRMED,
            updatedAt: new Date(),
          },
        },
        { returnDocument: 'after' }
      );

      logStructured('info', 'Order payment confirmed', {
        orderId,
        paymentId,
        status: OrderStatus.CONFIRMED,
      });

      // TODO: Send WhatsApp notification
      // await send11zaMessage(result.value.userPhone, `Your order ${orderId} is confirmed!`);
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    logStructured('error', 'Razorpay webhook error', { error });
    return NextResponse.json(errorResponse('Webhook failed', 500), { status: 500 });
  }
}
```

---

## 🧪 End-to-End Testing

### Scenario: Complete Order Flow

```bash
# 1. Create menu
curl -X POST http://localhost:3000/api/menu \
  -H "Content-Type: application/json" \
  -d '{
    "restaurantId": "rest_001",
    "itemId": "item_001",
    "name": "Butter Chicken",
    "price": 300,
    "category": "Curries",
    "tags": ["bestseller"],
    "spiceLevel": 3,
    "serves": 2,
    "isAvailable": true
  }'

# 2. Add to cart
curl -X POST http://localhost:3000/api/cart \
  -H "Content-Type: application/json" \
  -d '{
    "userPhone": "919876543210",
    "restaurantId": "rest_001",
    "restaurantName": "My Restaurant",
    "item": {
      "itemId": "item_001",
      "name": "Butter Chicken",
      "price": 300,
      "quantity": 2
    }
  }'

# 3. Create order
curl -X POST http://localhost:3000/api/order \
  -H "Content-Type: application/json" \
  -d '{
    "userPhone": "919876543210",
    "userName": "Raj Kumar",
    "userEmail": "raj@example.com",
    "restaurantId": "rest_001",
    "restaurantName": "My Restaurant",
    "items": [{
      "itemId": "item_001",
      "name": "Butter Chicken",
      "price": 300,
      "quantity": 2
    }],
    "total": 600,
    "specialInstructions": "Less spicy"
  }'

# Response will have: paymentLink, orderId

# 4. Use payment link to complete payment

# 5. Check order status
curl "http://localhost:3000/api/order?restaurantId=rest_001&userPhone=919876543210"

# 6. Kitchen updates order status
curl -X PATCH http://localhost:3000/api/order/ord_xxxxx \
  -H "Content-Type: application/json" \
  -d '{
    "status": "PREPARING",
    "restaurantId": "rest_001"
  }'
```

---

## ✅ Phase 1 Completion Checklist

- [ ] Week 2: All API routes complete & tested
- [ ] Week 3: 11za webhook receiving messages
- [ ] Week 3: AI processing messages from WhatsApp
- [ ] Week 3: Responses sent back via WhatsApp
- [ ] Week 4: Razorpay payment links generated
- [ ] Week 4: Payment webhook verification working
- [ ] Week 4: Order status updates working
- [ ] Week 4: End-to-end test passed
- [ ] Deploy to Vercel
- [ ] Document API for Phase 2

Once all complete → Move to Phase 2!
