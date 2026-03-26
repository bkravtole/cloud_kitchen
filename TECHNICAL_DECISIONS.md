# CloudKitchen Technical Decisions & Rationale

**Version:** 1.0  
**Date:** March 2026

---

## 🎯 Core Architecture Decisions

### Decision 1: Next.js as Single Stack Framework

#### What We Chose
Single Next.js application with:
- API routes for backend
- Pages/Components for frontend dashboard

#### Why This Decision
| Pro | Con | Impact |
|-----|-----|--------|
| Faster MVP | Less separation of concerns | ✅ For MVP is worth it |
| Shared code (types, utils) | Harder to scale to microservices | Plan Phase 3 refactor |
| Easier deployment | Larger bundle | Acceptable for 1000s of users |
| Single tech team | Less flexibility per service | Team is small anyway |

#### Alternatives Considered
1. **Separate Node.js Backend + Next.js Frontend**
   - ❌ Rejected: Overkill for MVP, adds deployment complexity

2. **Microservices (orders, menu, ai as separate)**
   - ❌ Rejected: Good for scale, bad for startup speed

#### Recommendation for Phase 3
When you hit scaling limits (10K+ concurrent users), consider:
```
Next.js (Dashboard only)
   ↓
Node.js Services (Orders, Menu, AI, Delivery)
   ↓
MongoDB (separate shards per service)
   ↓
Message Queue (RabbitMQ/Redis Streams)
```

---

### Decision 2: MongoDB as Primary Database

#### What We Chose
MongoDB with collections:
- users, restaurants, menus, carts, orders, delivery_boys, payments

#### Why This Decision
| Criterion | MySQL | PostgreSQL | MongoDB | **Winner** |
|-----------|-------|-----------|---------|-----------|
| **Flexibility** | Rigid schema | Rigid schema | Flexible | MongoDB ✅ |
| **Docs/JSON** | Hard | Possible | Native | MongoDB ✅ |
| **WhatsApp State** | Needs serialization | Needs serialization | Direct | MongoDB ✅ |
| **Scaling** | Vertical | Vertical | Horizontal | MongoDB ✅ |
| **Query Power** | Strong | Strongest | Good | PostgreSQL ⚠️ |
| **Setup Time** | Quick | Medium | Quick | Tie |
| **Atlas Pricing** | AWS/GCP | AWS/GCP | MongoDB Atlas | MongoDB ✅ |

#### Key Assumption
Your data is **document-oriented** (orders as complete units, not normalized across tables).

#### When to Reconsider
- If you need complex relational queries across tables
- ACID multi-table transactions become critical
- Team expertise heavily skewed toward SQL

#### Mitigation
- Use MongoDB transactions (multi-doc ACID in v4.0+)
- Design schemas to avoid cross-collection queries initially
- Keep backup plan to migrate to PostgreSQL if needed

---

### Decision 3: Groq for AI Service (Not OpenAI)

#### What We Chose
Groq's Mixtral-8x7b model

| Metric | Groq | OpenAI |
|--------|------|--------|
| **Cost per 1M tokens** | ₹1-2 | ₹15-20 |
| **Latency** | ~500ms | ~1-2s |
| **Context window** | 32k | 128k |
| **Reliability** | 99.9% | 99.95% |
| **Food domain training** | Good | Good |
| **Customization** | Limited | Limited |

#### Why Groq
✅ **Cost:** 8-10x cheaper than OpenAI
✅ **Speed:** Sub-second response (critical for WhatsApp)
✅ **Accuracy:** Mixtral is strong for intent detection
✅ **Scalability:** Can handle 10K+ requests/day

#### Trade-offs
- Less fine-tuning capability
- Smaller context window (but sufficient)

#### Implementation Notes
```javascript
const Groq = require("groq-sdk");
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function processUserMessage(message, menu) {
  const response = await groq.chat.completions.create({
    model: "mixtral-8x7b-32768",
    messages: [
      {
        role: "user",
        content: `Given menu: ${JSON.stringify(menu)}
                  User: "${message}"
                  Return JSON: {intent, entities, recommendedItems}`
      }
    ],
    temperature: 0.7,
    max_tokens: 500
  });
  
  return JSON.parse(response.choices[0].message.content);
}
```

#### Future Upgrade Path (Phase 3)
```
Groq (MVP)
   ↓ (if accuracy issues)
Groq + Fine-tuning (using your data)
   ↓ (if cost becomes issue)
Groq + Local LLaMa (on-prem, no API calls)
```

---

### Decision 4: Redis as Optional Cache

#### What We Chose
**Phase 1 (MVP):** MongoDB only  
**Phase 2+:** Add Redis for cart/session

#### Why Optional
| Scenario | Use MongoDB | Use Redis |
|----------|------------|----------|
| **1-100 concurrent users** | ✅ Sufficient | ⚠️ Overkill |
| **1k concurrent users** | ⚠️ Slow | ✅ Needed |
| **Complex queries** | ✅ Better | ❌ Limited |
| **State storage** | Acceptable | ✅ Optimized |

#### Redis Use Case
```javascript
// Redis patterns for Phase 2:

// 1. Cart state (fast access, auto-expiry)
redis.setex(
  `cart:${phone}:${restaurantId}`,
  7200, // 2 hours
  JSON.stringify(cartData)
);

// 2. Session tracking
redis.sadd(`active_sessions`, sessionId);

// 3. Rate limiting
redis.incr(`requests:${apiKey}:${minute}`);

// 4. Real-time leaderboard
redis.zadd(`popular_items`, score, itemId);
```

#### When to Introduce Redis
Metrics to watch:
- Cart queries taking > 200ms
- Dashboard responsiveness dropping
- Database CPU > 70%
- P99 latency > 2 seconds

---

### Decision 5: 11za for WhatsApp Integration

#### What We Chose
11za webhook-based integration

#### Competitors Evaluated
| Service | Cost | Setup | Webhooks | SDKs |
|---------|------|-------|----------|------|
| **11za** | ₹XX/month | 1 hour | ✅ Yes | ✅ Python, JS |
| **Twilio** | $$$$/month | 1 hour | ✅ Yes | 🌟 Excellent |
| **WhatsApp Official API** | $$$$/month | 2 weeks | ✅ Complex | ⚠️ New |
| **Baileys (self-hosted)** | Free | Complex | ❌ No | JS |

#### Why 11za
✅ **Cost-effective** for Indian market  
✅ **Fast setup** (hours not days)  
✅ **Good webhook support**  
✅ **Familiar with Groq ecosystem**

#### Webhook Flow
```
WhatsApp User Message
   ↓
11za receives → Validates → Calls our webhook
   ↓
POST /api/webhook/11za
   ↓
Our backend processes → Calls AI → Formats response
   ↓
Calls 11za API → Send back to user
```

#### Fallback Strategy
If 11za fails:
1. Migrate to Twilio (same webhook pattern)
2. Minimal code changes needed
3. Database queries unaffected

---

### Decision 6: Razorpay for Payments

#### What We Chose
Razorpay payment links (no PCI compliance burden)

#### Why Payment Links (Not Direct Integration)
```
Direct Integration          Payment Links (Chosen)
  ↓                              ↓
Card handling              No card handling
PCI DSS compliance         PCI handled by Razorpay
Complex webhook logic      Simple webhook logic
Higher risk                Lower risk
```

#### Payment Flow
```
User clicks [Pay ₹310]
   ↓
Backend generates Razorpay link
   ↓
Sends link via WhatsApp
   ↓
User opens link → Pays on Razorpay
   ↓
Razorpay sends webhook (/api/payment/webhook)
   ↓
We verify signature → Update order
   ↓
Customer gets confirmation
```

#### Security Measures
```javascript
// Always verify Razorpay signature
import crypto from 'crypto';

function verifyRazorpaySignature(orderId, paymentId, signature) {
  const body = orderId + "|" + paymentId;
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest('hex');
  
  return signature === expectedSignature; // Must match exactly
}
```

#### Alternatives (if needed)
- **Stripe:** Better international, same webhook pattern
- **2Checkout:** More payment methods, complex setup

---

### Decision 7: WhatsApp as Primary UI (Not Mobile App)

#### What We Chose
WhatsApp as primary interface, Web dashboard for kitchen staff

#### Why (Customer Perspective)
```
Advantage              Impact
─────────────────────  ────────────────────────
No app install         Available to 500M WhatsApp users
Familiar UX            Low learning curve
Native notifications   Already has WhatsApp
Small data (KB)        Works on 2G WhatsApp Web
────────────────────────────────────────────────
Limitations:
- No rich UI like app
- Stateless (WhatsApp)
- Limited customization
```

#### Design Philosophy
```
❌ Don't try to replicate Swiggy on WhatsApp
✅ Design for WhatsApp constraints

Good:
[Category] → [Items as buttons] → [Cart] → [Checkout]

Bad:
[Carousel with swipes] → [Animations] → [Rich UI]
```

#### Long-term Strategy
```
Phase 1: WhatsApp only (MVP)
Phase 2: WhatsApp + lightweight PWA (on demand)
Phase 3: WhatsApp + mobile app (if market demands)
```

---

### Decision 8: Kitchen Dashboard on Web (Not Hardcopy Tickets)

#### What We Chose
Modern kitchen display system (KDS) on Next.js + Browser

#### Why
| Method | Speed | Cost | Reliability |
|--------|-------|------|-------------|
| **Paper tickets** | Slow, lost | Printer supplies | Can't search history |
| **WhatsApp forwarding** | Lag, confusion | None | Staff miss orders |
| **KDS (Web dashboard)** | ✅ Real-time | Server | ✅ Reliable |
| **Mobile KDS app** | Real-time | Dev cost | Requires updates |

#### Dashboard Tech Stack
```
Next.js Pages (/dashboard)
   ↓
Real-time updates → WebSocket or Server-Sent Events (SSE)
   ↓
TailwindCSS + ShadcnUI (fast styling)
   ↓
Browser on café screen/PC
```

#### WebSocket vs SSE Decision
We chose **to be flexible** (start with polling, upgrade to SSE):

```javascript
// MVP (Polling)
setInterval(() => fetch('/api/dashboard/orders'), 2000);

// Phase 2 (SSE)
const eventSource = new EventSource('/api/sse/orders');
eventSource.onmessage = (event) => updateOrders(event.data);

// Benefit: 2 seconds latency enough for kitchen
// Alternative: WebSocket if < 1 sec needed later
```

---

### Decision 9: State Management (Cart Expiry)

#### What We Chose
Cart expires after 2 hours in MongoDB (with cleanup job)

#### Why This
```
User Workflow:
1. User adds items to cart
2. Browses menu, comes back after 30 mins
3. Cart still exists ✅
4. User leaves (comes back after 24 hours)
5. Cart expired ✅ (prevents stale orders)
```

#### Implementation
```javascript
// MongoDB TTL Index
db.carts.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// When creating cart:
{
  expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000) // +2 hours
}

// MongoDB automatically deletes expired docs
```

---

### Decision 10: Multi-tenancy Model

#### What We Chose
Restaurant-based tenancy (each restaurant is isolated)

#### Database Isolation
```javascript
// Every query includes restaurantId:
db.orders.find({ restaurantId: "rest_123", status: "NEW" })
          ↑
This is MANDATORY - never query without it

// Index for performance:
db.orders.createIndex({ restaurantId: 1, status: 1 })
```

#### Scaling Path
```
Phase 1: Single MongoDB → Single tenant at a time
Phase 2: Sharded MongoDB → ShardKey = restaurantId
Phase 3: Separate clusters → One per restaurant
```

---

## 🛡️ Security Decisions

### Decision: No Direct Card Storage

#### What We Chose
Payment links (Razorpay) — No PCI compliance needed

#### Why
```
Self-storing cards:
- Need PCI DSS Level 1 certification
- Complex security requirements
- 3rd-party payment processor anyway
- Why reinvent?

Using payment links:
✅ Razorpay handles PCI
✅ We just verify webhooks
✅ Simple + secure
```

### Decision: JWT for Admin Dashboard

#### What We Chose
JWT tokens + HTTP-only cookies

```javascript
// Login flow:
1. POST /api/auth/login { email, password }
2. Generate JWT token (expires in 7 days)
3. Set HTTP-only cookie (auto-included in requests)
4. Frontend gets secure auth

// Why HTTP-only?
- XSS attacks can't read cookie (unlike localStorage)
- Browser auto-sends with requests
- More secure than localStorage token
```

### Decision: Webhook Signature Verification

#### What We Chose
HMAC-SHA256 for Razorpay + 11za webhooks

```javascript
// Razorpay signature:
const signature = 
  HMAC_SHA256(orderId|paymentId, KEY_SECRET)
    ✅ Proves webhook came from Razorpay

// 11za signature:
const signature = 
  HMAC_SHA256(requestBody, WEBHOOK_SECRET)
    ✅ Proves webhook came from 11za

// Never trust unsigned webhooks!
```

---

## 📊 Performance Decisions

### Decision: Indexing Strategy

```javascript
// Essential indexes for performance:

// 1. Orders by restaurant + status (kitchen dashboard)
db.orders.createIndex({ restaurantId: 1, status: 1 });

// 2. Orders by customer phone (order history)
db.orders.createIndex({ userPhone: 1, createdAt: -1 });

// 3. Menu by restaurant + category (browsing)
db.menus.createIndex({ restaurantId: 1, category: 1 });

// 4. Cart by user + restaurant (active carts)
db.carts.createIndex({ userPhone: 1, restaurantId: 1 });

// 5. Delivery boys by status (assignment)
db.delivery_boys.createIndex({ restaurantId: 1, status: 1 });
```

### Decision: Caching Strategy

| Data | Cache? | TTL | Reason |
|------|--------|-----|--------|
| Menu | Redis | 1 hour | Rarely changes, high reads |
| Orders | DB only | — | Real-time changes |
| Cart | DB | 2 hours | Must persist |
| User prefs | Redis | 24 hours | Personalization |
| Popular items | Redis | 1 hour | Analytics |

---

## 🚀 Deployment Decisions

### Decision: Vercel for MVP

#### What We Chose
Vercel (Next.js native deployment)

#### Why Vercel
```
Option           Cost   Setup  Scaling  Monitoring
─────────────────────────────────────────────────
Vercel          $$$    Easy   Auto     🌟 Built-in
Self-hosted AWS $$     Hard   Manual   Need setup
Railway.app     $$     Easy   Good     Good
Render.com      $$     Easy   Good     Good
```

#### Why NOT self-hosted initially
- DevOps overhead for MVP
- Scaling requires manual work
- Vercel handles auto-scaling automatically

#### Migration Path (Phase 3)
```
Vercel (MVP to 1K users)
   ↓ (if cost becomes issue)
Self-hosted on AWS/GCP (control costs)
   ↓ (if global scale needed)
Multi-region deployment (edge functions)
```

### Decision: MongoDB Atlas for Database

#### What We Chose
MongoDB Atlas (managed cloud)

#### Why NOT self-hosted MongoDB
```
Self-hosted DB:
❌ DevOps burden
❌ Backups complex
❌ Scaling manual
❌ High availability setup needed

MongoDB Atlas:
✅ Managed backups
✅ Auto-scaling
✅ Built-in monitoring
✅ Multi-region setup
✅ Only ₹5K-50K/month (Atlas M10+)
```

---

## 🔄 Roadmap Decisions

### MVP (Phase 1) — Weeks 1-4
```
Must-Have:
✅ WhatsApp messaging + AI
✅ Menu + Cart
✅ Orders + Payment
✅ Kitchen dashboard

Nice-to-Have (postpone):
❌ Reorder recommendations
❌ Loyalty program
❌ Multi-restaurant discovery
```

### Scaling Phase (Phase 2) — Weeks 5-12
```
Add:
+ Redis caching
+ Real-time delivery tracking (WebSocket)
+ Analytics dashboard
+ Reorder recommendations
+ Delivery boy mobile app
```

### Growth Phase (Phase 3) — Months 4+
```
Add:
+ Multi-restaurant support
+ Smart recommendation engine
+ Microservices architecture
+ Mobile app for customers
+ International expansion
```

---

## ⚠️ Risks & Mitigations

### Risk 1: AI Accuracy

**Impact:** Poor recommendations hurt UX  
**Probability:** 40% (Groq is good but not perfect)

**Mitigation:**
```
1. Build confidence scoring (reject if < 75%)
2. Fallback to menu browsing
3. Track accuracy metrics
4. Human review loop (restaurant can correct)
5. Phase 2: Fine-tune on your data
```

### Risk 2: WhatsApp API Changes

**Impact:** App breaks overnight  
**Probability:** 10% (rare)

**Mitigation:**
```
1. Keep Twilio as backup provider
2. Webhook pattern (switch provider in 1 day)
3. Monitor 11za status page
4. Contact 11za support proactively
```

### Risk 3: Payment Webhook Failures

**Impact:** Orders paid but not confirmed  
**Probability:** 2% (Razorpay reliable)

**Mitigation:**
```
1. Implement idempotency keys
2. Verify payment status on dashboard
3. Manual confirmation option (for kitchen)
4. Retry logic for failed updates
5. Email alerts for payment anomalies
```

### Risk 4: Database Outage

**Impact:** Entire app down  
**Probability:** 1% (Atlas reliability)

**Mitigation:**
```
1. Enable automated backups (Atlas default)
2. Point-in-time recovery enabled
3. Multi-region backups
4. Tested recovery procedure
5. RTO < 1 hour commitment
```

---

## 📋 Checklist: Before Going Live

- [ ] Razorpay webhook signature verification working
- [ ] 11za webhook signature verification working
- [ ] AI processing returns JSON (not errors)
- [ ] Cart cleanup job running (deletes expired)
- [ ] Kitchen dashboard WebSocket stable
- [ ] Error logging (to Sentry or similar)
- [ ] Database backups automated
- [ ] .env.local secrets filled
- [ ] Rate limiting configured
- [ ] Load test (simulate 100 concurrent users)
- [ ] Happy path tested (message → AI → cart → payment)
- [ ] Error scenarios tested (payment fails, AI errors, etc.)

---

**Version:** 1.0  
**Last Updated:** March 2026  
**Next Review:** After Phase 1 completion
