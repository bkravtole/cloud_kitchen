# 🧪 Phase 1 Testing Guide - Complete End-to-End

Everything is ready! Let's test the complete CloudKitchen flow.

---

## ✅ Pre-Test Checklist

Before testing, verify:
- [ ] `npm install` completed
- [ ] `.env.local` filled with all credentials
- [ ] MongoDB connection string valid
- [ ] Razorpay test keys configured
- [ ] Groq API key configured
- [ ] 11za credentials configured

---

## 🚀 Test 1: Health Check

```bash
curl http://localhost:3000/api/health
```

**Expected:** `{ "success": true, "message": "CloudKitchen API is healthy" }`

---

## 🍽️ Test 2: Menu Management

### 2.1 Create Menu Items

```bash
# Item 1: Butter Chicken
curl -X POST http://localhost:3000/api/menu \
  -H "Content-Type: application/json" \
  -d '{
    "restaurantId": "rest_001",
    "itemId": "item_butter_chicken",
    "name": "Butter Chicken",
    "price": 350,
    "category": "Curries",
    "tags": ["spicy", "chicken", "bestseller"],
    "spiceLevel": 3,
    "serves": 2,
    "isAvailable": true,
    "preparationTime": 20,
    "description": "Creamy and aromatic chicken curry"
  }'

# Item 2: Vegetable Biryani
curl -X POST http://localhost:3000/api/menu \
  -H "Content-Type: application/json" \
  -d '{
    "restaurantId": "rest_001",
    "itemId": "item_veg_biryani",
    "name": "Vegetable Biryani",
    "price": 280,
    "category": "Rice",
    "tags": ["vegetarian", "spicy", "contains-nuts"],
    "spiceLevel": 2,
    "serves": 2,
    "isAvailable": true,
    "preparationTime": 25,
    "description": "Fragrant basmati rice with vegetables"
  }'

# Item 3: Raita
curl -X POST http://localhost:3000/api/menu \
  -H "Content-Type: application/json" \
  -d '{
    "restaurantId": "rest_001",
    "itemId": "item_raita",
    "name": "Yogurt Raita",
    "price": 80,
    "category": "Sides",
    "tags": ["vegetarian", "cooling"],
    "spiceLevel": 1,
    "serves": 1,
    "isAvailable": true,
    "preparationTime": 5
  }'
```

### 2.2 Get Menu

```bash
curl "http://localhost:3000/api/menu?restaurantId=rest_001"
```

**Expected:** Array of 3 menu items

### 2.3 Search Menu

```bash
curl "http://localhost:3000/api/menu?restaurantId=rest_001&search=chicken"
```

**Expected:** Only Butter Chicken

### 2.4 Filter by Category

```bash
curl "http://localhost:3000/api/menu?restaurantId=rest_001&category=Curries"
```

**Expected:** Only Butter Chicken

---

## 🛒 Test 3: Cart Operations

### 3.1 Add Item to Cart

```bash
curl -X POST http://localhost:3000/api/cart \
  -H "Content-Type: application/json" \
  -d '{
    "userPhone": "919876543210",
    "restaurantId": "rest_001",
    "restaurantName": "CloudKitchen",
    "item": {
      "itemId": "item_butter_chicken",
      "name": "Butter Chicken",
      "price": 350,
      "quantity": 2
    }
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "userPhone": "919876543210",
    "items": [
      {
        "itemId": "item_butter_chicken",
        "name": "Butter Chicken",
        "price": 350,
        "quantity": 2
      }
    ],
    "subtotal": 700,
    "tax": 35,
    "deliveryCharges": 30,
    "total": 765
  }
}
```

### 3.2 Add Another Item

```bash
curl -X POST http://localhost:3000/api/cart \
  -H "Content-Type: application/json" \
  -d '{
    "userPhone": "919876543210",
    "restaurantId": "rest_001",
    "restaurantName": "CloudKitchen",
    "item": {
      "itemId": "item_raita",
      "name": "Yogurt Raita",
      "price": 80,
      "quantity": 1
    }
  }'
```

**Expected:** Cart now has 2 items

### 3.3 Get Cart

```bash
curl "http://localhost:3000/api/cart?userPhone=919876543210&restaurantId=rest_001"
```

**Expected:** Full cart with 2 items, total ~₹875

### 3.4 Remove Item

```bash
curl -X DELETE "http://localhost:3000/api/cart/item_raita?userPhone=919876543210&restaurantId=rest_001"
```

**Expected:** Cart back to 1 item

---

## 🧠 Test 4: AI Message Processing

### 4.1 Simple Recommendation Request

```bash
curl -X POST http://localhost:3000/api/ai/process \
  -H "Content-Type: application/json" \
  -d '{
    "userMessage": "Show me spicy chicken dishes",
    "restaurantId": "rest_001",
    "restaurantName": "CloudKitchen",
    "userPhone": "919876543210"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "intent": "GET_RECOMMENDATION",
    "entities": {
      "spiceLevel": 3,
      "dietary": []
    },
    "suggestedItems": ["item_butter_chicken"],
    "conversationalResponse": "I found a delicious spicy chicken dish for you!",
    "suggestedActions": ["ADD_TO_CART"]
  }
}
```

### 4.2 Order Intent

```bash
curl -X POST http://localhost:3000/api/ai/process \
  -H "Content-Type: application/json" \
  -d '{
    "userMessage": "I want to order butter chicken and raita for 2 people",
    "restaurantId": "rest_001",
    "restaurantName": "CloudKitchen",
    "userPhone": "919876543210"
  }'
```

**Expected:** Intent = "ORDER", with suggested items

---

## 💳 Test 5: Order & Payment

### 5.1 Create Order

```bash
curl -X POST http://localhost:3000/api/order \
  -H "Content-Type: application/json" \
  -d '{
    "userPhone": "919876543210",
    "userName": "Raj Kumar",
    "userEmail": "raj@example.com",
    "restaurantId": "rest_001",
    "restaurantName": "CloudKitchen",
    "items": [
      {
        "itemId": "item_butter_chicken",
        "name": "Butter Chicken",
        "price": 350,
        "quantity": 2
      },
      {
        "itemId": "item_raita",
        "name": "Yogurt Raita",
        "price": 80,
        "quantity": 1
      }
    ],
    "specialInstructions": "Less spicy"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "orderId": "ord_1711234567890_abc123",
    "total": 875,
    "paymentLink": "https://rzp.io/i/xyzabc",
    "razorpayOrderId": "plink_123abc"
  }
}
```

**⚠️ Save the `orderId` - you'll need it for the next step!**

### 5.2 Get Order

```bash
# Replace with your orderId from step 5.1
curl "http://localhost:3000/api/order?restaurantId=rest_001&orderId=ord_1711234567890_abc123"
```

**Expected:** Order details with status = "CREATED"

### 5.3 Complete Payment (Simulated)

Use the `paymentLink` from step 5.1 or simulate payment webhook:

```bash
curl -X POST http://localhost:3000/api/payment/webhook \
  -H "Content-Type: application/json" \
  -H "X-Razorpay-Signature: placeholder" \
  -d '{
    "event": "payment.authorized",
    "payload": {
      "id": "plink_123abc",
      "notes": {
        "orderId": "ord_1711234567890_abc123"
      },
      "amount": 87500
    }
  }'
```

**Note:** Real signature verification requires RAZORPAY_KEY_SECRET

### 5.4 Verify Payment Status

```bash
curl "http://localhost:3000/api/order?restaurantId=rest_001&orderId=ord_1711234567890_abc123"
```

**Expected:** Order status should be "CONFIRMED", paymentStatus = "AUTHORIZED"

---

## 🍳 Test 6: Kitchen Dashboard

1. Open browser: **http://localhost:3000/dashboard**
2. You should see:
   - Stats cards showing 1 new order, 0 preparing, etc.
   - Order table with your created order
   - Status dropdown to update order

### 6.1 Update Order Status

1. In dashboard, find your order
2. Click dropdown → Select "Preparing"
3. Order status should update to "PREPARING"

### 6.2 Verify Status Change

```bash
curl "http://localhost:3000/api/order?restaurantId=rest_001&orderId=ord_1711234567890_abc123"
```

**Expected:** status = "PREPARING"

---

## 📱 Test 7: WhatsApp Webhook (Using ngrok)

### 7.1 Setup ngrok

```bash
# Install ngrok
npm install -g ngrok

# In a new terminal at project root:
ngrok http 3000

# You'll get: Forwarding https://abc123.ngrok.io -> http://localhost:3000
# Note this URL
```

### 7.2 Setup 11za Webhook

1. Go to 11za dashboard
2. Set webhook URL to: `https://abc123.ngrok.io/api/webhook/11za`
3. Test send a message via 11za

### 7.3 Test Webhook Locally

```bash
curl -X POST http://localhost:3000/api/webhook/11za \
  -H "Content-Type: application/json" \
  -d '{
    "from": "919876543210",
    "text": "Show me spicy dishes",
    "messageId": "msg_123",
    "timestamp": 1711234567,
    "type": "text"
  }'
```

**Expected Response:** `{ "success": true }`

**Note:** Response is sent asynchronously to 11za API

---

## ✅ Complete Flow Test

```bash
# 1. Start server
npm run dev

# 2. In another terminal, create menu
curl -X POST http://localhost:3000/api/menu ...
curl -X POST http://localhost:3000/api/menu ...

# 3. Add to cart
curl -X POST http://localhost:3000/api/cart ...

# 4. Create order
curl -X POST http://localhost:3000/api/order ...
# Note: orderId

# 5. Simulate payment
curl -X POST http://localhost:3000/api/payment/webhook ...

# 6. Check order - status should be CONFIRMED
curl "http://localhost:3000/api/order?restaurantId=rest_001&orderId=ord_..."

# 7. Update status
curl -X PATCH http://localhost:3000/api/order/ord_.../status ...

# 8. View kitchen dashboard
# Open http://localhost:3000/dashboard
```

---

## 🐛 Troubleshooting

### "MongoDB connection failed"
- Check MONGODB_URI in .env.local
- Verify IP whitelist in MongoDB Atlas
- Test connection: `mongosh "mongodb+srv://..."`

### "Groq API Error: 401"
- Verify GROQ_API_KEY is correct
- Check character-by-character in .env.local
- Regenerate API key from console.groq.com

### "Razorpay payment link failed"
- Check RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET
- Ensure using TEST keys (rzp_test_*)
- Verify amount > 0

### "11za send failed"
- Check 11ZA_API_KEY and 11ZA_BASE_URL
- Verify endpoint: `{11ZA_BASE_URL}/send_message`
- Check phone number format (91 + 10 digits)

### "Webhook signature invalid"
- Use test mode (don't verify for local testing)
- See payment webhook for signature generation

---

## 📊 Success Indicators

✅ All tests pass =  **Phase 1 MVP Ready!**

Next steps:
- [ ] Deploy to Vercel
- [ ] Setup production environment variables
- [ ] Real payment testing with Razorpay
- [ ] Test with actual WhatsApp messages
- [ ] Setup monitoring & error alerts
- [ ] Move to Phase 2 (Real-time updates, Delivery)

---

**Ready to test? Run:** `npm run dev`

Then follow the tests in order!
