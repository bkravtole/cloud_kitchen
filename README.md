# CloudKitchen Platform - Complete Documentation Index

**Project:** AI-Powered WhatsApp Cloud Kitchen Platform  
**Status:** Ready for Implementation (Phase 1)  
**Last Updated:** March 2026

---

## 📚 Documentation Structure

This repository contains the complete High-Level Design (HLD) for the CloudKitchen platform. All documents are interconnected and should be read in order.

---

## 🚀 Quick Start Guide

### For Product Managers
1. Start with [HLD.md](./HLD.md) - **Executive Summary** section
2. Read [TECHNICAL_DECISIONS.md](./TECHNICAL_DECISIONS.md) - understand why we chose this stack
3. Review [IMPLEMENTATION_ROADMAP.md](./IMPLEMENTATION_ROADMAP.md) - Timeline and milestones

### For Developers
1. Read [HLD.md](./HLD.md) - complete system architecture overview
2. Study [API_CONTRACTS.md](./API_CONTRACTS.md) - all endpoints and request/response formats
3. Reference [TECHNICAL_DECISIONS.md](./TECHNICAL_DECISIONS.md) - understand architecture choices
4. Follow [IMPLEMENTATION_ROADMAP.md](./IMPLEMENTATION_ROADMAP.md) - week-by-week implementation plan

### For DevOps/Infrastructure
1. [HLD.md](./HLD.md) - **Deployment Architecture** section
2. [TECHNICAL_DECISIONS.md](./TECHNICAL_DECISIONS.md) - **Deployment Decisions** section
3. Read environment variables list in [IMPLEMENTATION_ROADMAP.md](./IMPLEMENTATION_ROADMAP.md)

---

## 📖 Document Guide

### 1. 📋 HLD.md (Main Document)
**Length:** ~3000 lines  
**Purpose:** Complete system architecture

**Contains:**
- Executive summary
- System architecture diagram
- Core modules deep dive (8 services)
- Database schemas (MongoDB)
- Integration flows (3 main user journeys)
- Security considerations
- Performance targets
- Deployment architecture
- Future enhancements

**Key Sections:**
- [System Architecture Overview](#-system-architecture) in HLD
- [Core Modules Deep Dive](#-core-modules-deep-dive) - AI, Cart, Order, Menu, Delivery, Payment
- [Integration Flows](#-integration-flows) - How everything talks to each other
- [MongoDB Collections](#-mongodb-collections) - Complete schema definitions

**When to read:**
- ✅ First time understanding the system
- ✅ Getting lost in implementation details
- ✅ Need big-picture context

---

### 2. 🔌 API_CONTRACTS.md
**Length:** ~1500 lines  
**Purpose:** API specification and contracts

**Contains:**
- All 8 API endpoint groups with examples
- Request/response schemas
- Error codes and handling
- Rate limiting
- Pagination patterns
- Authentication methods

**Endpoint Groups:**
1. Webhook: `POST /api/webhook/11za` - Receive WhatsApp messages
2. AI: `POST /api/ai/process` - AI recommendations
3. Cart: `GET/POST/PATCH/DELETE /api/cart/*` - Cart operations
4. Order: `GET/POST/PATCH /api/order/*` - Order lifecycle
5. Menu: `GET/POST/PATCH/DELETE /api/menu/*` - Menu management
6. Payment: `POST /api/payment/*` - Razorpay integration
7. Delivery: `GET/POST/PATCH /api/delivery/*` - Delivery tracking
8. Dashboard: `GET /api/dashboard/*` - Kitchen analytics

**When to read:**
- ✅ Building API routes
- ✅ Integrating with 3rd party services
- ✅ Writing tests
- ✅ Frontend integration

---

### 3. 🔨 TECHNICAL_DECISIONS.md
**Length:** ~2000 lines  
**Purpose:** Architecture decisions and trade-offs

**Contains:**
- 10 core technology decisions with rationale
- Comparison with alternatives
- Pros/cons analysis
- Migration paths for future scaling
- Risk assessment and mitigations
- Security decisions
- Performance strategies
- Deployment choices

**Decisions Covered:**
1. Next.js as single stack (backend + frontend)
2. MongoDB as primary database
3. Groq for AI (not OpenAI)
4. Redis as optional cache
5. 11za for WhatsApp integration
6. Razorpay for payments
7. WhatsApp as primary UI (not mobile app)
8. Web dashboard for kitchen (not tickets)
9. Cart expiry strategy
10. Multi-tenancy model

**When to read:**
- ✅ Need to understand "why not X?" questions
- ✅ Concerned about tech decisions
- ✅ Planning future migrations
- ✅ Managing stakeholder questions

---

### 4. 🗓️ IMPLEMENTATION_ROADMAP.md
**Length:** ~1500 lines  
**Purpose:** Week-by-week implementation plan

**Contains:**
- Phase 1 breakdown (4 weeks)
- Phase 2 planning (3 weeks)
- Phase 3 roadmap
- Detailed task breakdowns
- Time estimates
- Code templates for each week
- Deployment checklist
- Testing strategies
- Development tips

**Phase Breakdown:**
- **Phase 1 (Weeks 1-4):** MVP - Orders + AI (36 dev days)
- **Phase 2 (Weeks 5-7):** Real-time + Delivery (24 dev days)
- **Phase 3 (Weeks 8+):** Scale + Multi-restaurant

**Timeline:**
- 2 developers working full-time → 4 weeks to production
- 1 developer working full-time → 8 weeks to production

**When to read:**
- ✅ Planning sprint tasks
- ✅ Estimating effort for team
- ✅ Code template references
- ✅ Deployment preparation

---

## 🔗 Cross-References

### Tracing an API Request

**User sends WhatsApp message:**
```
Customer → 11za → /api/webhook/11za (see API_CONTRACTS.md)
          ↓
        Verify signature (see TECHNICAL_DECISIONS.md - Security)
          ↓
        Call AI Service (see HLD.md - AI Service module)
          ↓
        Query Menu (see API_CONTRACTS.md - Menu endpoint)
          ↓
        Return response (see API_CONTRACTS.md - Response format)
          ↓
        Send via 11za (see HLD.md - Notification Layer)
```

### Building a New Feature (e.g., Delivery Tracking)

1. **Understand the feature:**
   - Read HLD.md - [Delivery Service](#-delivery-service) section
   
2. **Check database schema:**
   - See HLD.md - [MongoDB Collections](#-mongodb-collections) for delivery_boys collection
   
3. **Find API endpoints:**
   - Search API_CONTRACTS.md for `/api/delivery/*`
   
4. **Understand deployment:**
   - See TECHNICAL_DECISIONS.md - [Decision: Deployment Strategy](#decision-vercel-for-mvp)
   
5. **Plan implementation:**
   - Follow IMPLEMENTATION_ROADMAP.md - Week 6 tasks

### Scaling to 10,000 Users

1. **Current architecture limits:**
   - See TECHNICAL_DECISIONS.md - [Decision: MongoDB vs MySQL](#decision-2-mongodb-as-primary-database)
   
2. **Performance concerns:**
   - See HLD.md - [Performance Targets](#-performance-targets)
   
3. **Upgrade path:**
   - See TECHNICAL_DECISIONS.md - Scaling Path section for each decision
   
4. **Expected timeline:**
   - See IMPLEMENTATION_ROADMAP.md - Phase 2 and Phase 3

---

## 🎯 MVP Requirements Checklist

### Phase 1 Must-Have Features
- ✅ WhatsApp messaging via 11za
- ✅ AI intent detection + menu mapping (Groq)
- ✅ Shopping cart (MongoDB)
- ✅ Order creation
- ✅ Razorpay payment integration
- ✅ Kitchen dashboard (web)
- ✅ Order status updates
- ✅ Delivery boy assignment (manual)

### Phase 1 NOT Included
- ❌ Reorder recommendations
- ❌ Real-time WebSocket updates
- ❌ Delivery boy tracking (only assignment)
- ❌ Mobile app
- ❌ Multi-restaurant discovery
- ❌ Advanced analytics

---

## 🛠️ Technology Stack Reference

| Component | Technology | Why | Doc Reference |
|-----------|-----------|-----|---|
| **Frontend** | Next.js 14+ | Native React, easy SSR | HLD - Tech Stack |
| **Backend** | Next.js API Routes | Same repo, faster MVP | TECHNICAL_DECISIONS - Decision 1 |
| **Database** | MongoDB Atlas | Flexible schema, good for docs | TECHNICAL_DECISIONS - Decision 2 |
| **AI/LLM** | Groq (Mixtral) | 10x cheaper than OpenAI, fast | TECHNICAL_DECISIONS - Decision 3 |
| **Messaging** | 11za SDK | WhatsApp integration, India-friendly | TECHNICAL_DECISIONS - Decision 5 |
| **Payments** | Razorpay | No PCI burden, payment links | TECHNICAL_DECISIONS - Decision 6 |
| **Caching** | Redis (Phase 2) | For cart/session if needed | TECHNICAL_DECISIONS - Decision 4 |
| **Hosting** | Vercel | Next.js native, auto-scaling | TECHNICAL_DECISIONS - Decision 9 |

**See:** TECHNICAL_DECISIONS.md for detailed rationale on each choice

---

## 📊 Database Schema Overview

```
users
├─ phone (unique)
├─ name
├─ preferences
└─ restaurants

restaurants
├─ restaurantId (unique)
├─ name
├─ address
├─ cuisineType
└─ operatingHours

menus
├─ itemId
├─ restaurantId
├─ name, price, category
├─ tags (indexed for AI)
├─ spiceLevel, serves
└─ isAvailable

carts
├─ userPhone + restaurantId (unique)
├─ items []
├─ total
└─ expiresAt (TTL index)

orders
├─ orderId (unique)
├─ userPhone, restaurantId
├─ items [], total
├─ status (indexed)
├─ paymentStatus, paymentId
└─ deliveryBoyId

delivery_boys
├─ deliveryBoyId
├─ restaurantId
├─ name, phone
├─ status (indexed)
├─ location (geo)
└─ rating

payment_transactions
├─ orderId (unique)
├─ paymentId (unique)
├─ amount, status
└─ webhookReceived
```

**Full schema:** See HLD.md - [MongoDB Collections](#-mongodb-collections)

---

## 🔐 Security Checklist

Before going live:
- [ ] Verify Razorpay webhook signatures (HMAC-SHA256)
- [ ] Verify 11za webhook signatures
- [ ] Use JWT with HTTP-only cookies for admin dashboard
- [ ] Enforce restaurantId in all database queries
- [ ] Hash passwords with bcrypt
- [ ] Use HTTPS only
- [ ] Rate limiting on AI endpoint (50 req/min per restaurant)
- [ ] Input validation on all endpoints
- [ ] MongoDB field-level encryption for sensitive data
- [ ] Test SQL injection/NoSQL injection scenarios

**Details:** See TECHNICAL_DECISIONS.md - [Security Decisions](#-security-decisions)

---

## 📈 Success Metrics

### MVP Phase (Week 4)
- ✅ 10+ test orders processed end-to-end
- ✅ AI recognition accuracy > 80%
- ✅ Payment success rate 100%
- ✅ Order latency < 5 seconds
- ✅ Dashboard response < 1 second

### Phase 2 (Week 7)
- ✅ Support 500 concurrent users
- ✅ 99.9% uptime
- ✅ Real-time updates < 2 sec latency
- ✅ Delivery tracking live

### Phase 3 (Month 6)
- ✅ Support 10K+ concurrent users
- ✅ Multi-restaurant platform
- ✅ AI accuracy > 95%
- ✅ Mobile app live

---

## 🚀 Deployment Commands

```bash
# Setup
npm install
cp .env.example .env.local
# Fill environment variables

# Development
npm run dev
# http://localhost:3000

# Build
npm run build
npm run start

# Deploy to Vercel
vercel deploy --prod

# Verify deployment
curl https://your-domain.com/api/health
```

---

## 📞 Integration Partner Setup

### 1️⃣ Groq API
- URL: https://console.groq.com
- Get API Key → Environment variable: `GROQ_API_KEY`
- Model: `mixtral-8x7b-32768`
- Test with: `/api/ai/process` endpoint

### 2️⃣ 11za (WhatsApp)
- URL: https://11za.com
- Setup webhook: `{your-domain}/api/webhook/11za`
- Get API Key + Webhook Secret
- Test webhook: Use ngrok locally

### 3️⃣ MongoDB Atlas
- URL: https://www.mongodb.com/cloud/atlas
- Create cluster
- Get connection string: `MONGODB_URI`
- Create database: `cloudkitchen`

### 4️⃣ Razorpay
- URL: https://dashboard.razorpay.com
- Create account (KYC required)
- Get Test Keys first (rzp_test_*)
- Setup webhook: `{your-domain}/api/payment/webhook`
- Verify signature: Use `RAZORPAY_KEY_SECRET`

---

## ❓ FAQ & Troubleshooting

### Q: Why Next.js and not separate Node backend?
**A:** See TECHNICAL_DECISIONS.md - [Decision 1: Next.js as Single Stack](#decision-1-nextjs-as-single-stack-framework). TL;DR: Faster MVP, 4 weeks instead of 8.

### Q: Can we use PostgreSQL instead of MongoDB?
**A:** Possible, but adds complexity for document storage. See TECHNICAL_DECISIONS.md - [Decision 2](#decision-2-mongodb-as-primary-database) for migration path.

### Q: What if Razorpay webhook fails?
**A:** Webhook retry logic built-in. Dashboard has manual confirmation. See TECHNICAL_DECISIONS.md - Risk 3.

### Q: How do we scale to 100K users?
**A:** Plan Phase 3 microservices + sharded MongoDB. See IMPLEMENTATION_ROADMAP.md - Phase 3.

### Q: Can we add mobile app later?
**A:** Yes, same backend APIs work. See HLD.md - [Future Enhancements](#-future-enhancements).

### Q: How do we handle multiple restaurants?
**A:** Multi-tenancy via `restaurantId` filtering. Plan Phase 3 for swiggy-like discovery. See TECHNICAL_DECISIONS.md - [Decision 10](#decision-10-multi-tenancy-model).

---

## 📋 Pre-Implementation Checklist

Before starting Phase 1:

### Team
- [ ] 2-3 developers assigned
- [ ] Scrum master/project manager
- [ ] Product owner available for clarifications
- [ ] DevOps person for deployment

### Infrastructure
- [ ] MongoDB Atlas cluster created
- [ ] Groq API key obtained
- [ ] 11za account setup
- [ ] Razorpay (test) account created
- [ ] Vercel account ready
- [ ] Domain configured (if not localhost)

### Planning
- [ ] GitHub repo created & branching strategy defined
- [ ] Jira/Linear tickets created for Week 1 tasks
- [ ] Dev environment setup guide written
- [ ] Daily standup scheduled
- [ ] Sprint planning: 4-week Phase 1

### Code Setup
- [ ] Next.js project created
- [ ] TypeScript configured
- [ ] ESLint + Prettier setup
- [ ] Environment variables template created
- [ ] Git hooks setup (pre-commit, pre-push)
- [ ] CI/CD pipeline configured (optional but recommended)

---

## 📞 Support & Questions

### For Architecture Questions
→ See HLD.md or TECHNICAL_DECISIONS.md

### For API Implementation
→ See API_CONTRACTS.md

### For Timeline/Planning
→ See IMPLEMENTATION_ROADMAP.md

### For Deployment
→ See HLD.md - Deployment Architecture

### For Decision Rationale
→ See TECHNICAL_DECISIONS.md

---

## 📝 Document Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | March 2026 | Initial HLD complete |

---

## 🎓 Learning Resources

Recommended reading for team to get up to speed:

1. **MongoDB:** https://docs.mongodb.com/
2. **Next.js:** https://nextjs.org/docs
3. **Groq API:** https://console.groq.com/docs
4. **Razorpay:** https://razorpay.com/docs
5. **11za:** Contact support for SDK documentation

---

## 🔄 Next Steps

1. **Immediately:**
   - [ ] All developers read HLD.md
   - [ ] Setup external APIs (11za, Groq, Razorpay, MongoDB)
   - [ ] Create GitHub repo with .gitignore

2. **Week 1:**
   - [ ] Start IMPLEMENTATION_ROADMAP.md - Week 1 tasks
   - [ ] Deploy basic Next.js skeleton to Vercel
   - [ ] Setup local development environment

3. **End of Week 1:**
   - [ ] MongoDB collections ready
   - [ ] API routes skeleton ready
   - [ ] Team sync on progress + blockers

---

**Document Prepared By:** AI Architecture Team  
**Status:** ✅ Ready for Implementation  
**Approval:** Product + Tech Lead  
**Last Updated:** March 25, 2026

**Start Implementation:** Now! 🚀
#   c l o u d k i t c h e n  
 