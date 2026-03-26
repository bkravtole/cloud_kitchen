# 🚀 Quick Start Guide - CloudKitchen Phase 1

Get up and running in 5 minutes!

## 1️⃣ Install Dependencies (2 min)

```bash
cd d:\cloudkitchen
npm install
```

This will install all packages including:
- Next.js 14
- MongoDB driver
- Groq SDK
- Razorpay SDK
- TailwindCSS
- TypeScript

## 2️⃣ Setup Environment Variables (2 min)

```bash
# Copy the template
cp .env.example .env.local
```

Then edit `.env.local` and add your credentials:

### Get MongoDB URI (Required)
1. Go to https://www.mongodb.com/cloud/atlas
2. Create cluster (free tier)


### Get Groq API Key (Required for AI)
1. Go to https://console.groq.com
2. Create API key
3. Add to `.env.local`: `GROQ_API_KEY=gsk_...`

### Get Razorpay Keys (Required for Payments)
1. Go to https://dashboard.razorpay.com
2. Use TEST mode keys (starts with `rzp_test_`)
3. Add to `.env.local`:
   ```
   RAZORPAY_KEY_ID=rzp_test_...
   RAZORPAY_KEY_SECRET=...
   ```

### Get 11za Keys (Required for WhatsApp)
1. Go to https://11za.com
2. Create account (or contact for API)
3. Add to `.env.local`:
   ```
   ELEVENZA_API_KEY=...
   11ZA_WEBHOOK_SECRET=...
   ```

## 3️⃣ Start Development Server (1 min)

```bash
npm run dev
```

Open browser: **http://localhost:3000**

You should see:
- ✅ Home page with CloudKitchen welcome
- ✅ Dashboard link working
- ✅ Navigation ready

## 4️⃣ Test Health Check (1 sec)

Open new terminal:
```bash
curl http://localhost:3000/api/health
```

**Expected Response:**
```json
{
  "success": true,
  "message": "CloudKitchen API is healthy",
  "version": "1.0.0"
}
```

## ✅ You're Ready!

Your CloudKitchen Phase 1 MVP is now ready for development.

---

## 📋 Next: Create Test Data

### Add a Menu Item

```bash
curl -X POST http://localhost:3000/api/menu \
  -H "Content-Type: application/json" \
  -d '{
    "restaurantId": "rest_001",
    "itemId": "item_001",
    "name": "Butter Chicken",
    "price": 300,
    "category": "Curries",
    "tags": ["spicy", "chicken", "bestseller"],
    "spiceLevel": 3,
    "serves": 2,
    "isAvailable": true,
    "preparationTime": 20,
    "description": "Creamy and spicy chicken curry"
  }'
```

### Get Menu

```bash
curl "http://localhost:3000/api/menu?restaurantId=rest_001"
```

### Add Item to Cart

```bash
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
      "quantity": 1
    }
  }'
```

### Get Cart

```bash
curl "http://localhost:3000/api/cart?userPhone=919876543210&restaurantId=rest_001"
```

### Test AI Processing

```bash
curl -X POST http://localhost:3000/api/ai/process \
  -H "Content-Type: application/json" \
  -d '{
    "userMessage": "Show me spicy food for 2 people",
    "restaurantId": "rest_001",
    "restaurantName": "My Restaurant",
    "userPhone": "919876543210"
  }'
```

---

## 📚 Documentation

- **[DEVELOPMENT.md](./DEVELOPMENT.md)** - Complete development guide
- **[HLD.md](./HLD.md)** - System architecture & design
- **[API_CONTRACTS.md](./API_CONTRACTS.md)** - API specifications
- **[TECHNICAL_DECISIONS.md](./TECHNICAL_DECISIONS.md)** - Why these choices?
- **[IMPLEMENTATION_ROADMAP.md](./IMPLEMENTATION_ROADMAP.md)** - Week-by-week plan

---

## 🎯 What You Have

✅ **Backend API** - 8 endpoints ready for development  
✅ **Frontend Dashboard** - Kitchen management UI  
✅ **Database Layer** - MongoDB with auto-indexes  
✅ **AI Service** - Groq integration ready  
✅ **TypeScript** - Full type safety  
✅ **Utilities** - Logging, verification, ID generation  

---

## ⚡ Commands Reference

```bash
# Start dev server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Check TypeScript
npm run type-check
```

---

## 🚨 Common Issues

**MongoDB Connection Failed?**
- Check MONGODB_URI is correct
- Verify IP whitelist in MongoDB Atlas
- Ensure credentials are URL-encoded

**Groq API Error?**
- Check GROQ_API_KEY is valid
- Verify API quota not exceeded
- Try regenerating key

**Port 3000 already in use?**
```bash
npm run dev -- -p 3001
```

---

## 🎉 Next Steps

1. ✅ Complete setup above
2. ⏭️ Follow [Week 2 tasks](#-week-2-tasks) in DEVELOPMENT.md
3. 📍 Implement 11za webhook
4. 💳 Integrate Razorpay payments
5. 🧪 End-to-end testing
6. 🚀 Deploy to Vercel

Happy coding! 🚀
