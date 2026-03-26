# 🚀 Performance Optimization Guide

## Current Optimizations

### Database
- ✅ Indexes on all frequently queried fields
- ✅ TTL indexes for cart auto-expiration
- ✅ Pagination for large result sets
- ✅ Connection pooling via MongoDB URL

### API
- ✅ Response caching headers
- ✅ Pagination defaults (20 items)
- ✅ Filtering at database level
- ✅ Async operations throughout

### Frontend
- ✅ Next.js 14 App Router (server components by default)
- ✅ Image optimization (next/image)
- ✅ Dynamic imports for code splitting
- ✅ CSS-in-JS with TailwindCSS (small bundle)

---

## Recommended Optimizations (Future)

### Database Performance
```typescript
// Already implemented:
db.orders.createIndex({ restaurantId: 1, status: 1 });
db.menus.createIndex({ tags: 1, restaurantId: 1 });

// Consider for future:
- Composite indexes for complex queries
- Caching layer (Redis) for frequently accessed data
- Database read replicas for analytics queries
```

### API Caching
```typescript
// Add response caching
const cacheMiddleware = (maxAge: number = 60) => {
  return (req: Request, res: Response) => {
    res.setHeader('Cache-Control', `public, max-age=${maxAge}`);
  };
};

// Use for:
- /api/menu (30 min cache)
- /api/restaurants (1 hour cache)
- /api/analytics/overview (5 min cache)
```

### Real-time Optimization
```typescript
// Batch SSE messages to reduce overhead
- Send updates every 500ms vs every update
- Debounce location updates from delivery boys
- Compress SSE payloads
```

### Frontend Bundle Size
```bash
# Analyze bundle
npm run build

# Current optimizations:
- next/dynamic for lazy loading
- Tree-shaking unused code
- CSS purging (TailwindCSS)
```

---

## Monitoring & Metrics

### Key Metrics to Track
- API response time (target: <200ms)
- Database query time (target: <50ms)
- Page load time (target: <2s)
- Time to Interactive (target: <3s)

### Tools
- Next.js Analytics: Monitor Core Web Vitals
- MongoDB Atlas Metrics: Track query performance
- Vercel Speed Insights: Real user metrics

---

## Load Testing

### Simulate High Traffic
```bash
# Using Apache Bench or similar
ab -n 1000 -c 10 https://cloudkitchen.example.com/api/menu

# Monitor:
- Response time distribution
- Error rate
- Throughput (requests/sec)
```

---

## Deployment Best Practices

### Vercel Configuration
```js
// vercel.json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "env": {
    "NODE_ENV": "production"
  },
  "functions": {
    "pages/api/**": {
      "memory": 1024
    }
  }
}
```

### Environment
- ✅ Use environment variables for secrets
- ✅ Enable GZIP compression
- ✅ Use CDN for static assets
- ✅ Set appropriate cache headers

---

## Query Optimization Examples

### Before (Slow)
```typescript
const orders = await db.collection('orders').find({}).toArray();
const filtered = orders.filter(o => o.restaurantId === id && o.status === 'DELIVERED');
```

### After (Fast)
```typescript
const orders = await db.collection('orders')
  .find({ restaurantId: id, status: 'DELIVERED' })
  .limit(20)
  .toArray();
```

---

## Next Steps (Week 8+)

- [ ] Add Redis caching layer
- [ ] Implement full-text search for menu items
- [ ] Add pagination cursors for large datasets
- [ ] Implement request rate limiting
- [ ] Add API request batching
- [ ] Monitor infrastructure costs

