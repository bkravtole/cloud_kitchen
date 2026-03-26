# CloudKitchen API Contracts

**Version:** 1.0  
**Last Updated:** March 2026

---

## Authentication

All authenticated endpoints require either:
- **JWT Token** (for dashboard): `Authorization: Bearer <jwt_token>`
- **API Key** (for service-to-service): `X-API-Key: <api_key>`
- **Phone + OTP** (for WhatsApp users): Implicit via 11za webhook

---

## 1️⃣ Webhook Endpoint: Receive WhatsApp Messages

### POST `/api/webhook/11za`

Receives messages, button clicks, and list selections from 11za.

```javascript
// REQUEST
{
  "timestamp": "2026-03-25T18:30:00Z",
  "event": "message|button_click|list_selection",
  "from": "919876543210",
  "conversationId": "conv_abc123",
  "restaurantId": "rest_123", // Optional - can be inferred
  
  // For text messages
  "message": "Give me spicy food for 2 people",
  "messageType": "text",
  
  // For button clicks
  "buttonId": "add_item:item_001:1",
  "baseMessage": "Add Spicy Biryani?",
  
  // For list selections
  "selectedListItemId": "item_002",
  "selectedListItemTitle": "Paneer Tikka"
}

// RESPONSE (200 OK)
{
  "status": "success",
  "message": "Message processed",
  "nextAction": {
    "type": "send_message|send_buttons|send_list|send_catalog",
    "payload": { /* ... */ }
  }
}

// ERROR (400/500)
{
  "status": "error",
  "error": "Invalid webhook signature",
  "code": "WEBHOOK_INVALID"
}
```

**Processing Logic:**
1. Verify webhook signature (HMAC-SHA256)
2. Find or create user session
3. Detect intent using AI
4. Execute corresponding action
5. Send response via 11za

---

## 2️⃣ AI Service: Process Message

### POST `/api/ai/process`

Main AI processing endpoint.

```javascript
// REQUEST
{
  "userMessage": "Give me spicy food for 2 people",
  "userId": "919876543210",
  "restaurantId": "rest_123",
  "conversationHistory": [],
  "previousOrders": [
    {
      "orderId": "ord_123",
      "items": ["item_001", "item_005"],
      "date": "2026-03-20"
    }
  ],
  "menuContext": [] // Full menu if needed for context
}

// RESPONSE (200 OK)
{
  "intent": "GET_RECOMMENDATION", // GET_RECOMMENDATION|ORDER|TRACK|QUESTION|MENU
  "confidence": 0.95,
  "entities": {
    "spiceLevel": "high",
    "servings": 2,
    "category": null,
    "dietary": [],
    "price_range": null
  },
  "recommendedItems": [
    {
      "itemId": "item_001",
      "name": "Spicy Chicken Biryani",
      "price": 220,
      "description": "Fragrant rice with chicken",
      "tags": ["spicy", "rice", "chicken"],
      "score": 0.98
    },
    {
      "itemId": "item_002",
      "name": "Paneer Tikka Masala",
      "price": 180,
      "tags": ["spicy", "paneer", "gravy"],
      "score": 0.92
    }
  ],
  "message": "🔥 For 2 people, I recommend...",
  "suggestedFollowUp": "Would you like to add these to your cart?",
  "suggestedActions": ["ADD_TO_CART", "SEE_SIMILAR", "CUSTOMIZE"],
  "upsellItems": [
    {
      "itemId": "item_010",
      "name": "Raita",
      "reason": "Complements spicy items well"
    }
  ]
}

// ERROR (400)
{
  "error": "Invalid input",
  "details": { "userMessage": "required" }
}
```

**Intent Types:**
- `GET_RECOMMENDATION`: "Give me spicy food"
- `ORDER`: "Order 2 Biryani"
- `TRACK`: "Where is my order?"
- `QUESTION`: "Do you have paneer dishes?"
- `MENU`: User wants to see menu

---

## 3️⃣ Cart Service

### GET `/api/cart/:userId`

Retrieve user's current cart.

```javascript
// REQUEST
GET /api/cart/919876543210?restaurantId=rest_123
Headers: Authorization: Bearer token

// RESPONSE (200 OK)
{
  "success": true,
  "cart": {
    "cartId": "cart_xyz789",
    "userId": "919876543210",
    "restaurantId": "rest_123",
    "items": [
      {
        "cartItemId": "ci_001",
        "itemId": "item_001",
        "name": "Spicy Biryani",
        "quantity": 1,
        "price": 220,
        "addons": [
          {
            "addonId": "addon_001",
            "name": "Extra Rice",
            "price": 50
          }
        ],
        "subtotal": 270
      }
    ],
    "subtotal": 270,
    "tax": 50,
    "deliveryFee": 50,
    "total": 370,
    "createdAt": "2026-03-25T18:00:00Z",
    "expiresAt": "2026-03-26T02:00:00Z"
  }
}
```

### POST `/api/cart/add`

Add item to cart.

```javascript
// REQUEST
{
  "userId": "919876543210",
  "restaurantId": "rest_123",
  "itemId": "item_001",
  "quantity": 1,
  "addons": [
    { "addonId": "addon_001", "quantity": 1 }
  ]
}

// RESPONSE (201 Created)
{
  "success": true,
  "cart": { /* ... */ },
  "message": "Item added to cart",
  "newTotal": 370
}
```

### PATCH `/api/cart/items/:cartItemId`

Update cart item quantity.

```javascript
// REQUEST
{
  "quantity": 2
}

// RESPONSE (200 OK)
{
  "success": true,
  "cart": { /* ... */ }
}
```

### DELETE `/api/cart/items/:cartItemId`

Remove item from cart.

```javascript
// RESPONSE (200 OK)
{
  "success": true,
  "message": "Item removed from cart",
  "newTotal": 220
}
```

### DELETE `/api/cart/:userId`

Clear entire cart.

```javascript
// RESPONSE (200 OK)
{
  "success": true,
  "message": "Cart cleared"
}
```

---

## 4️⃣ Order Service

### POST `/api/order/create`

Create order from cart.

```javascript
// REQUEST
{
  "userId": "919876543210",
  "restaurantId": "rest_123",
  "notes": "Extra spicy, no onions"
}

// RESPONSE (201 Created)
{
  "success": true,
  "order": {
    "orderId": "ord_1234567",
    "orderNumber": 1234567, // For kitchen display
    "userId": "919876543210",
    "restaurantId": "rest_123",
    "items": [ /* ... */ ],
    "subtotal": 270,
    "tax": 50,
    "deliveryFee": 50,
    "total": 370,
    "status": "PAYMENT_PENDING",
    "paymentStatus": "PENDING",
    "notes": "Extra spicy, no onions",
    "createdAt": "2026-03-25T18:30:00Z"
  },
  "paymentLink": "https://rzp.io/i/abc123def456" // Razorpay
}
```

### GET `/api/order/:orderId`

Retrieve order details.

```javascript
// RESPONSE (200 OK)
{
  "success": true,
  "order": {
    "orderId": "ord_1234567",
    "status": "CONFIRMED",
    "items": [ /* ... */ ],
    "currentlyPreparing": ["item_001"], // Kitchen shows what's being made
    "estimatedReadyTime": "2026-03-25T18:55:00Z",
    "deliveryBoyId": "boy_456",
    "deliveryBoyPhone": "919234567890",
    "deliveryBoyName": "Ravi",
    "deliveryBoyLocation": { "lat": 28.6139, "lng": 77.2090 },
    "status": "ASSIGNED",
    "timeline": [
      { "status": "CONFIRMED", "timestamp": "2026-03-25T18:30:00Z" },
      { "status": "PREPARING", "timestamp": "2026-03-25T18:35:00Z" },
      { "status": "READY", "timestamp": "2026-03-25T18:55:00Z" }
    ]
  }
}
```

### PATCH `/api/order/:orderId/status`

Update order status (Kitchen Dashboard).

```javascript
// REQUEST
{
  "status": "PREPARING", // CONFIRMED|PREPARING|READY|ASSIGNED|PICKED_UP|DELIVERED|CANCELLED
  "timestamp": "2026-03-25T18:35:00Z"
}

// RESPONSE (200 OK)
{
  "success": true,
  "order": { /* updated order */ },
  "notifications": {
    "customer": "Your food is being prepared",
    "deliveryBoy": null // if not ready for delivery yet
  }
}
```

### GET `/api/order/user/:userId`

Get all orders for user.

```javascript
// RESPONSE (200 OK)
{
  "success": true,
  "orders": [
    { /* order 1 */ },
    { /* order 2 */ }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 15
  }
}
```

### POST `/api/order/:orderId/rate`

Rate completed order.

```javascript
// REQUEST
{
  "rating": 4,
  "review": "Great food, fast delivery!",
  "issues": [] // ["WRONG_ITEM", "COLD_FOOD", "LATE_DELIVERY"]
}

// RESPONSE (200 OK)
{
  "success": true,
  "message": "Review submitted"
}
```

---

## 5️⃣ Menu Service

### GET `/api/menu/:restaurantId`

Get all menu items.

```javascript
// REQUEST
GET /api/menu/rest_123?category=RICE_CURRY&sort=popularity

// RESPONSE (200 OK)
{
  "success": true,
  "restaurant": {
    "name": "Raj Restaurant",
    "rating": 4.6
  },
  "items": [
    {
      "itemId": "item_001",
      "name": "Spicy Biryani",
      "price": 220,
      "category": "RICE_CURRY",
      "description": "Fragrant rice with chicken",
      "image": "url",
      "tags": ["spicy", "rice", "chicken"],
      "spiceLevel": 3,
      "serves": 2,
      "isAvailable": true,
      "preparationTime": 25,
      "rating": 4.7,
      "reviews": 150,
      "bestseller": true,
      "addons": [
        {
          "addonId": "addon_001",
          "name": "Extra Rice",
          "price": 50
        }
      ]
    }
  ]
}
```

### GET `/api/menu/search`

Search menu.

```javascript
// REQUEST
GET /api/menu/search?q=spicy&restaurantId=rest_123

// RESPONSE
{
  "success": true,
  "query": "spicy",
  "results": [ /* matching items */ ],
  "filters": {
    "category": ["RICE_CURRY", "GRAVY"],
    "priceRange": { "min": 150, "max": 350 },
    "dietary": ["vegetarian", "non-vegetarian"]
  }
}
```

### POST `/api/menu` (Admin)

Create menu item.

```javascript
// REQUEST
{
  "restaurantId": "rest_123",
  "name": "Spicy Biryani",
  "price": 220,
  "category": "RICE_CURRY",
  "description": "...",
  "tags": ["spicy", "rice"],
  "spiceLevel": 3,
  "serves": 2,
  "image": "url",
  "addons": [ /* ... */ ]
}

// RESPONSE (201 Created)
{
  "success": true,
  "item": { /* ... */ }
}
```

---

## 6️⃣ Payment Service

### POST `/api/payment/create`

Generate Razorpay payment link.

```javascript
// REQUEST
{
  "orderId": "ord_1234567",
  "amount": 37000, // in paise
  "currency": "INR",
  "customerPhone": "919876543210",
  "customerEmail": "customer@example.com"
}

// RESPONSE (201 Created)
{
  "success": true,
  "paymentLink": "https://rzp.io/i/abc123def456",
  "paymentLinkId": "pl_xyz",
  "amount": 37000,
  "status": "created",
  "expiresAt": "2026-03-26T18:30:00Z"
}
```

### POST `/api/payment/webhook`

Razorpay callback (auto-called by Razorpay).

```javascript
// REQUEST from Razorpay
{
  "event": "payment_link.completed",
  "payload": {
    "payment_link": {
      "id": "pl_xyz",
      "amount": 37000,
      "amount_paid": 37000,
      "status": "completed",
      "notes": {
        "orderId": "ord_1234567"
      }
    },
    "payment": {
      "id": "pay_2Tz3Qg9X7Zq",
      "status": "authorized"
    }
  }
}

// Internal action (no response body)
// * Update order.paymentStatus = "COMPLETED"
// * Update order.status = "CONFIRMED"
// * Trigger kitchen notification
// * Send WhatsApp confirmation to customer
```

---

## 7️⃣ Delivery Service

### GET `/api/delivery/boys/:restaurantId`

List available delivery boys.

```javascript
// RESPONSE (200 OK)
{
  "success": true,
  "deliveryBoys": [
    {
      "deliveryBoyId": "boy_456",
      "name": "Ravi Kumar",
      "phone": "919234567890",
      "status": "AVAILABLE",
      "location": { "lat": 28.6139, "lng": 77.2090 },
      "distanceFromRestaurant": 0.5, // km
      "totalDeliveries": 450,
      "rating": 4.7,
      "currentAssignedOrders": 1,
      "maxCapacity": 3
    }
  ]
}
```

### POST `/api/delivery/assign/:orderId`

Assign delivery boy to order.

```javascript
// REQUEST
{
  "deliveryBoyId": "boy_456",
  "autoAssign": false
}

// RESPONSE (200 OK)
{
  "success": true,
  "order": { /* updated with deliveryBoyId */ },
  "notification": "Delivery boy assigned"
}
```

### PATCH `/api/delivery/boys/:deliveryBoyId/status`

Update delivery boy status.

```javascript
// REQUEST
{
  "status": "AVAILABLE", // AVAILABLE|BUSY|OFFLINE|ON_LEAVE
  "location": { "lat": 28.6139, "lng": 77.2090 }
}

// RESPONSE (200 OK)
{
  "success": true,
  "deliveryBoy": { /* updated */ }
}
```

### GET `/api/delivery/track/:orderId`

Track order location (real-time).

```javascript
// RESPONSE (200 OK SSE Stream)
{
  "orderId": "ord_1234567",
  "status": "OUT_FOR_DELIVERY",
  "deliveryBoy": {
    "name": "Ravi",
    "phone": "919234567890",
    "location": { "lat": 28.6139, "lng": 77.2090 }
  },
  "estimatedArrival": "2026-03-25T19:15:00Z",
  "distance": 2.3 // km
}
```

---

## 8️⃣ Dashboard API (Admin/Kitchen)

### GET `/api/dashboard/stats`

Get dashboard overview.

```javascript
// RESPONSE (200 OK)
{
  "success": true,
  "stats": {
    "totalOrders": 45,
    "newOrders": 3,
    "preparingOrders": 5,
    "readyOrders": 2,
    "deliveredToday": 35,
    "revenue": 125000, // rupees
    "averagePrepTime": 24, // minutes
    "rating": 4.6
  }
}
```

### GET `/api/dashboard/orders`

Get filtered orders for kitchen.

```javascript
// REQUEST
GET /api/dashboard/orders?status=NEW,PREPARING&restaurantId=rest_123

// RESPONSE (200 OK)
{
  "success": true,
  "orders": [
    {
      "orderId": "ord_1234567",
      "orderNumber": 1234567,
      "customerPhone": "919876543210",
      "items": [ /* ... */ ],
      "status": "PREPARING",
      "notes": "Extra spicy",
      "createdAt": "2026-03-25T18:30:00Z",
      "timeElapsed": 8, // minutes
      "estimatedReady": 17, // minutes more
      "actions": ["MARK_READY", "DELAY", "CANCEL"]
    }
  ]
}
```

---

## Error Codes

```javascript
// Standard error responses:
{
  "success": false,
  "error": "Order not found",
  "code": "ORDER_NOT_FOUND",
  "statusCode": 404,
  "details": { /* optional */ }
}

// Common codes:
/*
  AUTH_REQUIRED           (401) - Need authentication
  AUTH_FAILED             (401) - Invalid token
  FORBIDDEN               (403) - No permission
  NOT_FOUND               (404) - Resource doesn't exist
  VALIDATION_ERROR        (400) - Invalid input
  DUPLICATE_ENTRY         (409) - Already exists
  PAYMENT_FAILED          (402) - Payment error
  RESTAURANT_CLOSED       (400) - Restaurant closed
  ITEM_OUT_OF_STOCK       (400) - Item unavailable
  DELIVERY_UNAVAILABLE    (400) - No delivery boys
  INTERNAL_ERROR          (500) - Server error
  AI_ERROR                (500) - AI service error
  WEBHOOK_INVALID         (400) - Invalid signature
*/
```

---

## Rate Limits

```
Public endpoints:     100 req/min
Authenticated:        500 req/min
AI processing:        50 req/min (per restaurant)
Webhook endpoints:    Unlimited (but validated)
```

---

## Pagination

```javascript
// Query params:
?page=1&limit=10&sort=createdAt&order=desc

// Response:
{
  "data": [ /* ... */ ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 150,
    "pages": 15
  }
}
```

---

**Last Updated:** March 2026

# CloudKitchen API Contracts

**Version:** 1.0  
**Last Updated:** March 2026

---

## Authentication

All authenticated endpoints require either:
- **JWT Token** (for dashboard): `Authorization: Bearer <jwt_token>`
- **API Key** (for service-to-service): `X-API-Key: <api_key>`
- **Phone + OTP** (for WhatsApp users): Implicit via 11za webhook

---

## 1️⃣ Webhook Endpoint: Receive WhatsApp Messages

### POST `/api/webhook/11za`

Receives messages, button clicks, and list selections from 11za.

```javascript
// REQUEST
{
  "timestamp": "2026-03-25T18:30:00Z",
  "event": "message|button_click|list_selection",
  "from": "919876543210",
  "conversationId": "conv_abc123",
  "restaurantId": "rest_123", // Optional - can be inferred
  
  // For text messages
  "message": "Give me spicy food for 2 people",
  "messageType": "text",
  
  // For button clicks
  "buttonId": "add_item:item_001:1",
  "baseMessage": "Add Spicy Biryani?",
  
  // For list selections
  "selectedListItemId": "item_002",
  "selectedListItemTitle": "Paneer Tikka"
}

// RESPONSE (200 OK)
{
  "status": "success",
  "message": "Message processed",
  "nextAction": {
    "type": "send_message|send_buttons|send_list|send_catalog",
    "payload": { /* ... */ }
  }
}

// ERROR (400/500)
{
  "status": "error",
  "error": "Invalid webhook signature",
  "code": "WEBHOOK_INVALID"
}
```

**Processing Logic:**
1. Verify webhook signature (HMAC-SHA256)
2. Find or create user session
3. Detect intent using AI
4. Execute corresponding action
5. Send response via 11za

---

## 2️⃣ AI Service: Process Message

### POST `/api/ai/process`

Main AI processing endpoint.

```javascript
// REQUEST
{
  "userMessage": "Give me spicy food for 2 people",
  "userId": "919876543210",
  "restaurantId": "rest_123",
  "conversationHistory": [],
  "previousOrders": [
    {
      "orderId": "ord_123",
      "items": ["item_001", "item_005"],
      "date": "2026-03-20"
    }
  ],
  "menuContext": [] // Full menu if needed for context
}

// RESPONSE (200 OK)
{
  "intent": "GET_RECOMMENDATION", // GET_RECOMMENDATION|ORDER|TRACK|QUESTION|MENU
  "confidence": 0.95,
  "entities": {
    "spiceLevel": "high",
    "servings": 2,
    "category": null,
    "dietary": [],
    "price_range": null
  },
  "recommendedItems": [
    {
      "itemId": "item_001",
      "name": "Spicy Chicken Biryani",
      "price": 220,
      "description": "Fragrant rice with chicken",
      "tags": ["spicy", "rice", "chicken"],
      "score": 0.98
    },
    {
      "itemId": "item_002",
      "name": "Paneer Tikka Masala",
      "price": 180,
      "tags": ["spicy", "paneer", "gravy"],
      "score": 0.92
    }
  ],
  "message": "🔥 For 2 people, I recommend...",
  "suggestedFollowUp": "Would you like to add these to your cart?",
  "suggestedActions": ["ADD_TO_CART", "SEE_SIMILAR", "CUSTOMIZE"],
  "upsellItems": [
    {
      "itemId": "item_010",
      "name": "Raita",
      "reason": "Complements spicy items well"
    }
  ]
}

// ERROR (400)
{
  "error": "Invalid input",
  "details": { "userMessage": "required" }
}
```

**Intent Types:**
- `GET_RECOMMENDATION`: "Give me spicy food"
- `ORDER`: "Order 2 Biryani"
- `TRACK`: "Where is my order?"
- `QUESTION`: "Do you have paneer dishes?"
- `MENU`: User wants to see menu

---

## 3️⃣ Cart Service

### GET `/api/cart/:userId`

Retrieve user's current cart.

```javascript
// REQUEST
GET /api/cart/919876543210?restaurantId=rest_123
Headers: Authorization: Bearer token

// RESPONSE (200 OK)
{
  "success": true,
  "cart": {
    "cartId": "cart_xyz789",
    "userId": "919876543210",
    "restaurantId": "rest_123",
    "items": [
      {
        "cartItemId": "ci_001",
        "itemId": "item_001",
        "name": "Spicy Biryani",
        "quantity": 1,
        "price": 220,
        "addons": [
          {
            "addonId": "addon_001",
            "name": "Extra Rice",
            "price": 50
          }
        ],
        "subtotal": 270
      }
    ],
    "subtotal": 270,
    "tax": 50,
    "deliveryFee": 50,
    "total": 370,
    "createdAt": "2026-03-25T18:00:00Z",
    "expiresAt": "2026-03-26T02:00:00Z"
  }
}
```

### POST `/api/cart/add`

Add item to cart.

```javascript
// REQUEST
{
  "userId": "919876543210",
  "restaurantId": "rest_123",
  "itemId": "item_001",
  "quantity": 1,
  "addons": [
    { "addonId": "addon_001", "quantity": 1 }
  ]
}

// RESPONSE (201 Created)
{
  "success": true,
  "cart": { /* ... */ },
  "message": "Item added to cart",
  "newTotal": 370
}
```

### PATCH `/api/cart/items/:cartItemId`

Update cart item quantity.

```javascript
// REQUEST
{
  "quantity": 2
}

// RESPONSE (200 OK)
{
  "success": true,
  "cart": { /* ... */ }
}
```

### DELETE `/api/cart/items/:cartItemId`

Remove item from cart.

```javascript
// RESPONSE (200 OK)
{
  "success": true,
  "message": "Item removed from cart",
  "newTotal": 220
}
```

### DELETE `/api/cart/:userId`

Clear entire cart.

```javascript
// RESPONSE (200 OK)
{
  "success": true,
  "message": "Cart cleared"
}
```

---

## 4️⃣ Order Service

### POST `/api/order/create`

Create order from cart.

```javascript
// REQUEST
{
  "userId": "919876543210",
  "restaurantId": "rest_123",
  "notes": "Extra spicy, no onions"
}

// RESPONSE (201 Created)
{
  "success": true,
  "order": {
    "orderId": "ord_1234567",
    "orderNumber": 1234567, // For kitchen display
    "userId": "919876543210",
    "restaurantId": "rest_123",
    "items": [ /* ... */ ],
    "subtotal": 270,
    "tax": 50,
    "deliveryFee": 50,
    "total": 370,
    "status": "PAYMENT_PENDING",
    "paymentStatus": "PENDING",
    "notes": "Extra spicy, no onions",
    "createdAt": "2026-03-25T18:30:00Z"
  },
  "paymentLink": "https://rzp.io/i/abc123def456" // Razorpay
}
```

### GET `/api/order/:orderId`

Retrieve order details.

```javascript
// RESPONSE (200 OK)
{
  "success": true,
  "order": {
    "orderId": "ord_1234567",
    "status": "CONFIRMED",
    "items": [ /* ... */ ],
    "currentlyPreparing": ["item_001"], // Kitchen shows what's being made
    "estimatedReadyTime": "2026-03-25T18:55:00Z",
    "deliveryBoyId": "boy_456",
    "deliveryBoyPhone": "919234567890",
    "deliveryBoyName": "Ravi",
    "deliveryBoyLocation": { "lat": 28.6139, "lng": 77.2090 },
    "status": "ASSIGNED",
    "timeline": [
      { "status": "CONFIRMED", "timestamp": "2026-03-25T18:30:00Z" },
      { "status": "PREPARING", "timestamp": "2026-03-25T18:35:00Z" },
      { "status": "READY", "timestamp": "2026-03-25T18:55:00Z" }
    ]
  }
}
```

### PATCH `/api/order/:orderId/status`

Update order status (Kitchen Dashboard).

```javascript
// REQUEST
{
  "status": "PREPARING", // CONFIRMED|PREPARING|READY|ASSIGNED|PICKED_UP|DELIVERED|CANCELLED
  "timestamp": "2026-03-25T18:35:00Z"
}

// RESPONSE (200 OK)
{
  "success": true,
  "order": { /* updated order */ },
  "notifications": {
    "customer": "Your food is being prepared",
    "deliveryBoy": null // if not ready for delivery yet
  }
}
```

### GET `/api/order/user/:userId`

Get all orders for user.

```javascript
// RESPONSE (200 OK)
{
  "success": true,
  "orders": [
    { /* order 1 */ },
    { /* order 2 */ }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 15
  }
}
```

### POST `/api/order/:orderId/rate`

Rate completed order.

```javascript
// REQUEST
{
  "rating": 4,
  "review": "Great food, fast delivery!",
  "issues": [] // ["WRONG_ITEM", "COLD_FOOD", "LATE_DELIVERY"]
}

// RESPONSE (200 OK)
{
  "success": true,
  "message": "Review submitted"
}
```

---

## 5️⃣ Menu Service

### GET `/api/menu/:restaurantId`

Get all menu items.

```javascript
// REQUEST
GET /api/menu/rest_123?category=RICE_CURRY&sort=popularity

// RESPONSE (200 OK)
{
  "success": true,
  "restaurant": {
    "name": "Raj Restaurant",
    "rating": 4.6
  },
  "items": [
    {
      "itemId": "item_001",
      "name": "Spicy Biryani",
      "price": 220,
      "category": "RICE_CURRY",
      "description": "Fragrant rice with chicken",
      "image": "url",
      "tags": ["spicy", "rice", "chicken"],
      "spiceLevel": 3,
      "serves": 2,
      "isAvailable": true,
      "preparationTime": 25,
      "rating": 4.7,
      "reviews": 150,
      "bestseller": true,
      "addons": [
        {
          "addonId": "addon_001",
          "name": "Extra Rice",
          "price": 50
        }
      ]
    }
  ]
}
```

### GET `/api/menu/search`

Search menu.

```javascript
// REQUEST
GET /api/menu/search?q=spicy&restaurantId=rest_123

// RESPONSE
{
  "success": true,
  "query": "spicy",
  "results": [ /* matching items */ ],
  "filters": {
    "category": ["RICE_CURRY", "GRAVY"],
    "priceRange": { "min": 150, "max": 350 },
    "dietary": ["vegetarian", "non-vegetarian"]
  }
}
```

### POST `/api/menu` (Admin)

Create menu item.

```javascript
// REQUEST
{
  "restaurantId": "rest_123",
  "name": "Spicy Biryani",
  "price": 220,
  "category": "RICE_CURRY",
  "description": "...",
  "tags": ["spicy", "rice"],
  "spiceLevel": 3,
  "serves": 2,
  "image": "url",
  "addons": [ /* ... */ ]
}

// RESPONSE (201 Created)
{
  "success": true,
  "item": { /* ... */ }
}
```

---

## 6️⃣ Payment Service

### POST `/api/payment/create`

Generate Razorpay payment link.

```javascript
// REQUEST
{
  "orderId": "ord_1234567",
  "amount": 37000, // in paise
  "currency": "INR",
  "customerPhone": "919876543210",
  "customerEmail": "customer@example.com"
}

// RESPONSE (201 Created)
{
  "success": true,
  "paymentLink": "https://rzp.io/i/abc123def456",
  "paymentLinkId": "pl_xyz",
  "amount": 37000,
  "status": "created",
  "expiresAt": "2026-03-26T18:30:00Z"
}
```

### POST `/api/payment/webhook`

Razorpay callback (auto-called by Razorpay).

```javascript
// REQUEST from Razorpay
{
  "event": "payment_link.completed",
  "payload": {
    "payment_link": {
      "id": "pl_xyz",
      "amount": 37000,
      "amount_paid": 37000,
      "status": "completed",
      "notes": {
        "orderId": "ord_1234567"
      }
    },
    "payment": {
      "id": "pay_2Tz3Qg9X7Zq",
      "status": "authorized"
    }
  }
}

// Internal action (no response body)
// * Update order.paymentStatus = "COMPLETED"
// * Update order.status = "CONFIRMED"
// * Trigger kitchen notification
// * Send WhatsApp confirmation to customer
```

---

## 7️⃣ Delivery Service

### GET `/api/delivery/boys/:restaurantId`

List available delivery boys.

```javascript
// RESPONSE (200 OK)
{
  "success": true,
  "deliveryBoys": [
    {
      "deliveryBoyId": "boy_456",
      "name": "Ravi Kumar",
      "phone": "919234567890",
      "status": "AVAILABLE",
      "location": { "lat": 28.6139, "lng": 77.2090 },
      "distanceFromRestaurant": 0.5, // km
      "totalDeliveries": 450,
      "rating": 4.7,
      "currentAssignedOrders": 1,
      "maxCapacity": 3
    }
  ]
}
```

### POST `/api/delivery/assign/:orderId`

Assign delivery boy to order.

```javascript
// REQUEST
{
  "deliveryBoyId": "boy_456",
  "autoAssign": false
}

// RESPONSE (200 OK)
{
  "success": true,
  "order": { /* updated with deliveryBoyId */ },
  "notification": "Delivery boy assigned"
}
```

### PATCH `/api/delivery/boys/:deliveryBoyId/status`

Update delivery boy status.

```javascript
// REQUEST
{
  "status": "AVAILABLE", // AVAILABLE|BUSY|OFFLINE|ON_LEAVE
  "location": { "lat": 28.6139, "lng": 77.2090 }
}

// RESPONSE (200 OK)
{
  "success": true,
  "deliveryBoy": { /* updated */ }
}
```

### GET `/api/delivery/track/:orderId`

Track order location (real-time).

```javascript
// RESPONSE (200 OK SSE Stream)
{
  "orderId": "ord_1234567",
  "status": "OUT_FOR_DELIVERY",
  "deliveryBoy": {
    "name": "Ravi",
    "phone": "919234567890",
    "location": { "lat": 28.6139, "lng": 77.2090 }
  },
  "estimatedArrival": "2026-03-25T19:15:00Z",
  "distance": 2.3 // km
}
```

---

## 8️⃣ Dashboard API (Admin/Kitchen)

### GET `/api/dashboard/stats`

Get dashboard overview.

```javascript
// RESPONSE (200 OK)
{
  "success": true,
  "stats": {
    "totalOrders": 45,
    "newOrders": 3,
    "preparingOrders": 5,
    "readyOrders": 2,
    "deliveredToday": 35,
    "revenue": 125000, // rupees
    "averagePrepTime": 24, // minutes
    "rating": 4.6
  }
}
```

### GET `/api/dashboard/orders`

Get filtered orders for kitchen.

```javascript
// REQUEST
GET /api/dashboard/orders?status=NEW,PREPARING&restaurantId=rest_123

// RESPONSE (200 OK)
{
  "success": true,
  "orders": [
    {
      "orderId": "ord_1234567",
      "orderNumber": 1234567,
      "customerPhone": "919876543210",
      "items": [ /* ... */ ],
      "status": "PREPARING",
      "notes": "Extra spicy",
      "createdAt": "2026-03-25T18:30:00Z",
      "timeElapsed": 8, // minutes
      "estimatedReady": 17, // minutes more
      "actions": ["MARK_READY", "DELAY", "CANCEL"]
    }
  ]
}
```

---

## Error Codes

```javascript
// Standard error responses:
{
  "success": false,
  "error": "Order not found",
  "code": "ORDER_NOT_FOUND",
  "statusCode": 404,
  "details": { /* optional */ }
}

// Common codes:
/*
  AUTH_REQUIRED           (401) - Need authentication
  AUTH_FAILED             (401) - Invalid token
  FORBIDDEN               (403) - No permission
  NOT_FOUND               (404) - Resource doesn't exist
  VALIDATION_ERROR        (400) - Invalid input
  DUPLICATE_ENTRY         (409) - Already exists
  PAYMENT_FAILED          (402) - Payment error
  RESTAURANT_CLOSED       (400) - Restaurant closed
  ITEM_OUT_OF_STOCK       (400) - Item unavailable
  DELIVERY_UNAVAILABLE    (400) - No delivery boys
  INTERNAL_ERROR          (500) - Server error
  AI_ERROR                (500) - AI service error
  WEBHOOK_INVALID         (400) - Invalid signature
*/
```

---

## Rate Limits

```
Public endpoints:     100 req/min
Authenticated:        500 req/min
AI processing:        50 req/min (per restaurant)
Webhook endpoints:    Unlimited (but validated)
```

---

## Pagination

```javascript
// Query params:
?page=1&limit=10&sort=createdAt&order=desc

// Response:
{
  "data": [ /* ... */ ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 150,
    "pages": 15
  }
}
```

---

**Last Updated:** March 2026
