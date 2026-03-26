# 🤖 Advanced AI Recommendations System

**Version:** Phase 3 Feature  
**Status:** ✨ Complete  
**Technology:** Groq API (Mixtral LLM)

---

## 📋 Overview

The Advanced AI Recommendations System uses Groq's Mixtral LLM to provide intelligent, context-aware menu suggestions based on:

- **User Preferences** - Dietary restrictions, spice tolerance, budget
- **Order History** - Previous purchases and eating patterns
- **Time Context** - Breakfast/lunch/dinner/snack appropriate items
- **Seasonal Trends** - Current season and day of week
- **Meal Intelligence** - Complementary items that pair well
- **Social Signals** - What's trending among other users

---

## 🏗️ Architecture

### Components

```
User Profile Analysis
      ↓
Order History Mining
      ↓
Preference Extraction
      ↓
Groq AI Engine
      ↓
Recommendation Ranking
      ↓
Meal Combination Pairing
      ↓
API Response
      ↓
UI Rendering
```

### Data Flow

```
GET /api/recommendations/advanced
     ↓
1. Fetch user's order history
2. Analyze preferences from past orders
3. Get available menu items
4. Call Groq API with context
5. Process recommendations
6. Generate meal pairings
7. Get trending items
8. Return consolidated results
```

---

## 🔄 API Endpoints

### Get Advanced Recommendations

```
GET /api/recommendations/advanced
```

**Query Parameters:**
```
userPhone              : string     (required for personalized)
restaurantId           : string     (required)
includeCombo          : boolean     (default: true)
includeTrending       : boolean     (default: true)
limit                 : number      (default: 5)
```

**Response:**
```json
{
  "success": true,
  "data": {
    "personalized": [
      {
        "itemId": "item_123",
        "name": "Butter Chicken",
        "price": 320,
        "reasoning": "You love butter chicken and ordered it 5 times. Great choice!",
        "confidence": 0.95,
        "category": "Main Course",
        "tags": ["spicy", "chicken", "tandoor"],
        "complementaryItems": ["rice", "naan"],
        "mealTiming": "lunch"
      }
    ],
    "combinations": [
      {
        "itemId": "item_456",
        "name": "Basmati Rice",
        "price": 80,
        "reasoning": "Pairs perfectly with your main course",
        "confidence": 0.92,
        "category": "Rice",
        "mealTiming": "lunch"
      }
    ],
    "trending": [
      {
        "itemId": "item_789",
        "name": "Paneer Tikka",
        "price": 280,
        "reasoning": "15 orders in the last week - customers love this!",
        "confidence": 0.88,
        "category": "Appetizer"
      }
    ],
    "userProfile": {
      "totalOrders": 42,
      "favoriteCategories": ["Main Course", "Rice"],
      "spicePreference": 4,
      "dietaryRestrictions": []
    }
  }
}
```

---

## 🤖 Groq AI Prompt Engineering

### Recommendation Prompt Template

```
You are an expert restaurant recommendation AI. Analyze the user profile and recommend top 5 menu items.

USER PROFILE:
- Dietary Preferences: vegan, gluten-free
- Spice Preference: 4/5
- Budget: $10-$25
- Favorite Categories: Main Course, Rice
- Top Past Orders: Butter Chicken (5 times), Biryani (3 times), Naan (7 times)

CURRENT CONTEXT:
- Time: evening
- Day: Friday
- Season: summer

AVAILABLE MENU:
- Butter Chicken ($8, Main Course, tags: spicy, chicken)
- Vegetable Biryani ($12, Main Course, tags: vegetarian, rice)
- Naan ($2, Bread, tags: wheat)
...

REQUIREMENTS:
1. Match user preferences
2. Prioritize favorite categories
3. Consider time of day
4. Provide reasoning
5. Include complementary items
6. Score confidence 0.0-1.0

Response with JSON:
{
  "recommendations": [...]
}
```

### Key Prompt Features

✅ **Context Awareness** - Includes time, day, season  
✅ **Preference Matching** - Filters by restrictions, budget, spice  
✅ **History Integration** - Considers past orders  
✅ **Reasoning Required** - Explains each recommendation  
✅ **Confidence Scoring** - Indicates match quality  
✅ **JSON Output** - Structured, parseable responses  

---

## 📊 Recommendation Types

### 1. Personalized Recommendations

**What:** Items tailored to individual user
**How:** Analyzes preferences + history + context
**When:** Every time user visits recommendations page
**Example:**
```
"You love butter chicken and ordered it 5 times. Great choice!"
```

### 2. Meal Combinations

**What:** Complementary items that go together
**How:** Groq analyzes flavor pairings and traditions
**When:** Based on top personalized recommendation
**Example:**
```
Primary: Butter Chicken
Pairs: Basmati Rice + Naan
Reason: "Classic Indian combination - aromatic rice complements the creamy sauce"
```

### 3. Trending Items

**What:** Popular items across all users (last 7 days)
**How:** Aggregates recent order counts
**When:** Always included for discovery
**Example:**
```
"15 orders in the last week - customers love this!"
```

---

## 🧠 Preference Analysis Algorithm

### Step 1: Extract From History

```typescript
// Count items and categories
const itemFrequency = new Map<string, number>();
const categoryCount = new Map<string, number>();

for each order:
  for each item:
    itemFrequency[item]++
    categoryCount[item.category]++
    totalSpice += item.spiceLevel
    totalSpend += item.price
```

### Step 2: Calculate Averages

```typescript
avgSpice = totalSpice / itemCount
avgBudget = totalSpend / orderCount
favoriteCategories = top 3 categories by frequency
```

### Step 3: Infer Preferences

```typescript
if (all_orders.every(item => item.vegetarian))
  dietaryRestrictions.push('vegetarian')

if (all_orders.every(item => item.vegan))
  dietaryRestrictions.push('vegan')
```

### Step 4: Set Constraints

```typescript
Menu Filter:
- Exclude dietary violations
- Exclude allergies
- Filter by price range: [avgBudget * 0.7, avgBudget * 1.3]
- Filter by spice level: <= userPreference
```

---

## ⏰ Context-Based Logic

### Time of Day

```
6:00 - 12:00   → breakfast items
12:00 - 17:00  → lunch items
17:00 - 21:00  → dinner items
21:00 - 6:00   → snacks/desserts
```

### Day of Week

```
Monday    → Recovery meals, light options
Friday    → Heavier, celebratory items
Saturday  → Family meals, premium items
```

### Season

```
Summer    → Light, cold drinks, salads
Winter    → Warm, heavy, comfort foods
Spring    → Fresh items, seasonal vegetables
Autumn    → Harvest items, premium ingredients
```

---

## 📈 Confidence Scoring

Recommendations are scored 0.0 to 1.0:

```
0.90 - 1.0  → ⭐ Perfect Match
            → Exact preference match, past favorite
            
0.75 - 0.89 → ✅ Good Match
            → Matches most preferences, category favorite
            
0.50 - 0.74 → 👍 Interesting
            → Partial match, trending alternative
            
< 0.50      → 🤔 Discovery Item
            → New, might like based on profile
```

---

## 🚀 Usage Examples

### Example 1: Vegetarian User

**Profile:**
- All past orders: vegetarian items
- Budget: ₹200-300
- Spice: 3/5
- Favorites: Paneer dishes, Rice

**Recommendations:**
1. Paneer Butter Masala (past favorite) - 95% confidence
2. Arhar Dal (nutritionally balanced) - 88% confidence
3. Paneer Tikka (trending, matches profile) - 85% confidence

### Example 2: First-Time User

**No order history available**

**System Returns:**
- Trending items (most popular)
- Category recommendations (based on menu)
- No personalized recommendations yet

### Example 3: Premium User

**Profile:**
- 50+ orders
- Budget: ₹500+
- Preferences: Seafood, biryani, premium items

**Recommendations:**
- Premium seafood options
- Specialty biryanis
- Paired with wine/premium beverages
- Trending luxury items

---

## 🔒 Privacy & Performance

### Data Privacy

✅ Only uses data from own orders  
✅ No cross-user data leakage  
✅ Anonymous trending only (counts, not individuals)  
✅ User preferences stored encrypted  

### Performance Optimization

```
Cache strategy:
- User preferences: Cache 24 hours
- Menu data: Cache 6 hours
- Trending items: Cache 1 hour
- API calls: Limit 10/minute per user

Database queries:
- Indexed on: [restaurantId, status, createdAt]
- Pagination: Limit 20 orders per query
- TTL: Clean old data
```

### Groq API Optimization

```
Temperature: 0.7
  (balanced between consistency and creativity)

Max Tokens: 2000
  (sufficient for detailed recommendations)

Batching:
  Multiple users → Single Groq call
  Cache responses where possible
```

---

## 📋 Implementation Checklist

### Backend

- ✅ Advanced recommendation service (`src/lib/services/advanced-recommendations.ts`)
- ✅ API endpoint (`src/app/api/recommendations/advanced/route.ts`)
- ✅ Preference analysis algorithm
- ✅ Meal combination pairing logic
- ✅ Trending items aggregation
- ✅ Groq integration

### Frontend

- ✅ Advanced recommendations UI (`src/app/advanced-recommendations/page.tsx`)
- ✅ Personalized card display
- ✅ Meal combination section
- ✅ Trending items carousel
- ✅ User profile display
- ✅ Responsive design

### Testing

- [ ] Unit tests for preference analysis
- [ ] Integration tests with Groq API
- [ ] E2E tests for recommendation flow
- [ ] Performance load testing
- [ ] Edge cases (no history, all restrictions)

---

## 🔮 Future Enhancements

### Phase 3.1: Advanced Features

- **Social Recommendations** - "People like you ordered..."
- **Occasion-Based** - Birthday, meeting, date night suggestions
- **Nutritional Analysis** - Calorie counting, macro balancing
- **Allergen Warnings** - Real-time allergy alerts
- **Price Optimization** - Best value for money recommendations

### Phase 3.2: Multi-Model

- Use ensemble of multiple LLMs
- Fine-tune model on restaurant data
- A/B testing recommendation strategies
- Feedback loop optimization

### Phase 3.3: Integration

- Compare with competitors
- External data: Weather, local events
- Historical patterns: Time-series analysis
- Mobile push notifications

---

## 📚 Files Overview

| File | Purpose |
|------|---------|
| `src/lib/services/advanced-recommendations.ts` | AI recommendation logic |
| `src/app/api/recommendations/advanced/route.ts` | API endpoint |
| `src/app/advanced-recommendations/page.tsx` | UI page |
| `ADVANCED_RECOMMENDATIONS.md` | This file |

---

## 🎯 Success Metrics

- Conversion rate from viewed recommendations to added items
- Time spent on recommendations page
- Click-through rate on "Add to Cart"
- User satisfaction rating
- Recommendation accuracy over time

---

## 📞 Support

For issues or questions about advanced recommendations:

1. Check Groq API status
2. Verify `GROQ_API_KEY` environment variable
3. Review Groq model availability
4. Check MongoDB collection indexes
5. Monitor API response times

---

**Advanced AI Recommendations Ready!** 🚀
