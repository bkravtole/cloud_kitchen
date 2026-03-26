/**
 * Advanced AI Recommendation Service
 * 
 * Uses Groq API to provide intelligent, context-aware recommendations based on:
 * - User preferences and dietary restrictions
 * - Order history and patterns
 * - Time of day
 * - Seasonal trends
 * - Meal combinations
 * - Similar user preferences (collaborative filtering)
 */

import { Groq } from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const GROQ_MODEL = process.env.GROQ_MODEL || 'mixtral-8x7b-32768';

export interface MenuItem {
  itemId: string;
  name: string;
  price: number;
  category: string;
  tags: string[];
  spiceLevel: number;
  vegetarian: boolean;
  vegan: boolean;
  glutenFree?: boolean;
  rating?: number;
  description?: string;
  servingSize?: string;
  calories?: number;
}

export interface UserPreferences {
  dietaryRestrictions: string[]; // ['vegan', 'gluten-free', 'keto']
  spicePreference: number; // 1-5
  budgetRange: [number, number]; // [min, max]
  favoriteCategories: string[];
  dislikedItems: string[];
  allergies: string[];
}

export interface OrderPattern {
  itemName: string;
  timesOrdered: number;
  lastOrderedDate: Date;
  avgTimeOfOrder: string; // 'morning', 'afternoon', 'evening'
  averageSpend: number;
}

export interface AdvancedRecommendation {
  itemId: string;
  name: string;
  price: number;
  reasoning: string;
  confidence: number; // 0-1
  category: string;
  tags: string[];
  complementaryItems: string[];
  mealTiming: string; // 'breakfast', 'lunch', 'dinner', 'snack'
}

export interface RecommendationContext {
  timeOfDay: string;
  dayOfWeek: string;
  season: string;
  weatherDescription?: string;
  occasion?: string;
}

/**
 * Get current context (time, season, etc.)
 */
function getContext(): RecommendationContext {
  const now = new Date();
  const hours = now.getHours();
  const dayOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][now.getDay()];
  const month = now.getMonth();

  let timeOfDay = 'night';
  if (hours >= 6 && hours < 12) timeOfDay = 'morning';
  else if (hours >= 12 && hours < 17) timeOfDay = 'afternoon';
  else if (hours >= 17 && hours < 21) timeOfDay = 'evening';

  let season = 'spring';
  if (month >= 2 && month < 5) season = 'spring';
  else if (month >= 5 && month < 8) season = 'summer';
  else if (month >= 8 && month < 11) season = 'autumn';
  else season = 'winter';

  return {
    timeOfDay,
    dayOfWeek,
    season,
  };
}

/**
 * Main function: Get AI-powered recommendations
 */
export async function getAdvancedRecommendations(
  userPreferences: UserPreferences,
  orderHistory: OrderPattern[],
  availableMenu: any[],
  limit: number = 5
): Promise<AdvancedRecommendation[]> {
  try {
    const context = getContext();

    // Filter menu based on preferences
    const filteredMenu = filterMenuByPreferences(availableMenu, userPreferences);

    if (filteredMenu.length === 0) {
      return [];
    }

    // Build recommendation prompt for Groq
    const prompt = buildRecommendationPrompt(
      userPreferences,
      orderHistory,
      filteredMenu,
      context
    );

    const message = await groq.chat.completions.create({
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      model: GROQ_MODEL,
      temperature: 0.7,
      max_tokens: 2000,
    });

    const responseText = message.choices[0]?.message?.content || '{}';
    const cleanedResponse = responseText
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    const recommendationData = JSON.parse(cleanedResponse);

    // Map results back to full menu items
    const recommendations: AdvancedRecommendation[] = recommendationData.recommendations
      .slice(0, limit)
      .map((rec: any) => {
        const menuItem = availableMenu.find(item => item.name === rec.itemName);
        return {
          itemId: menuItem?.itemId || '',
          name: rec.itemName,
          price: menuItem?.price || 0,
          reasoning: rec.reasoning,
          confidence: rec.confidence,
          category: menuItem?.category || '',
          tags: menuItem?.tags || [],
          complementaryItems: rec.complementaryItems || [],
          mealTiming: rec.mealTiming,
        };
      });

    return recommendations;
  } catch (error) {
    console.error('Advanced recommendations error:', error);
    return [];
  }
}

/**
 * Filter menu based on user preferences
 */
function filterMenuByPreferences(menu: MenuItem[], prefs: UserPreferences): MenuItem[] {
  return menu.filter(item => {
    // Check dietary restrictions
    if (prefs.dietaryRestrictions.includes('vegan') && !item.vegan) return false;
    if (prefs.dietaryRestrictions.includes('vegetarian') && !item.vegetarian) return false;
    if (prefs.dietaryRestrictions.includes('gluten-free') && !item.glutenFree) return false;

    // Check allergies
    if (prefs.allergies.some(allergy => item.tags.includes(allergy))) return false;

    // Check disliked items
    if (prefs.dislikedItems.includes(item.name)) return false;

    // Check price range
    if (item.price < prefs.budgetRange[0] || item.price > prefs.budgetRange[1]) return false;

    // Check spice tolerance
    if (item.spiceLevel > prefs.spicePreference) return false;

    return true;
  });
}

/**
 * Build recommendation prompt for Groq AI
 */
function buildRecommendationPrompt(
  prefs: UserPreferences,
  orderHistory: OrderPattern[],
  filteredMenu: MenuItem[],
  context: RecommendationContext
): string {
  const topCategories = orderHistory
    .slice(0, 3)
    .map(p => `${p.itemName} (ordered ${p.timesOrdered} times)`);

  const menuList = filteredMenu
    .slice(0, 50) // Limit to top 50 items for context
    .map(
      item =>
        `- ${item.name} ($${item.price}, category: ${item.category}, tags: ${item.tags.join(', ')})${
          item.rating ? ` [Rating: ${item.rating}/5]` : ''
        }`
    );

  return `You are an expert restaurant recommendation AI. Analyze the user profile and recommend top 5 menu items.

USER PROFILE:
- Dietary Preferences: ${prefs.dietaryRestrictions.join(', ') || 'No restrictions'}
- Spice Preference: ${prefs.spicePreference}/5
- Budget: $${prefs.budgetRange[0]}-$${prefs.budgetRange[1]}
- Favorite Categories: ${prefs.favoriteCategories.join(', ')}
- Top Past Orders: ${topCategories.join(', ')}

CURRENT CONTEXT:
- Time: ${context.timeOfDay}
- Day: ${context.dayOfWeek}
- Season: ${context.season}

AVAILABLE MENU (filtered for preferences):
${menuList.join('\n')}

REQUIREMENTS FOR RECOMMENDATIONS:
1. Suggest items that match user preferences
2. Prioritize items matching favorite categories
3. Consider time of day (breakfast/lunch/dinner appropriate)
4. Provide reasoning for each recommendation
5. Include complementary items that go well together
6. Score confidence 0.0-1.0 based on how well it matches preferences

Respond with valid JSON (no markdown):
{
  "recommendations": [
    {
      "itemName": "string",
      "reasoning": "why this is recommended",
      "confidence": 0.95,
      "complementaryItems": ["item1", "item2"],
      "mealTiming": "breakfast|lunch|dinner|snack"
    }
  ]
}`;
}

/**
 * Get meal combination recommendations (pairing items that go together)
 */
export async function getMealCombinations(
  primaryItem: any,
  availableMenu: any[],
  limit: number = 3
): Promise<{ items: MenuItem[]; reasoning: string }> {
  try {
    const menuContext = availableMenu
      .slice(0, 30)
      .map(item => `${item.name} (${item.category})`)
      .join(', ');

    const prompt = `Given this primary dish: "${primaryItem.name}" (${primaryItem.category})

From these available items: ${menuContext}

Suggest ${limit} complementary items that would go well with this dish as a complete meal.
Consider flavors, textures, nutritional balance, and dining traditions.

Respond with JSON:
{
  "complementaryItems": ["item1", "item2", "item3"],
  "mealtip": "brief explanation of why these go together"
}`;

    const message = await groq.chat.completions.create({
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      model: GROQ_MODEL,
      temperature: 0.7,
      max_tokens: 300,
    });

    const responseText = message.choices[0]?.message?.content || '{}';
    const cleanedResponse = responseText
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    const mealData = JSON.parse(cleanedResponse);

    const complementaryItems = availableMenu.filter(item =>
      mealData.complementaryItems.includes(item.name)
    );

    return {
      items: complementaryItems,
      reasoning: mealData.mealtip,
    };
  } catch (error) {
    console.error('Meal combination error:', error);
    return { items: [], reasoning: '' };
  }
}

/**
 * Analyze user preferences from order history
 */
export function analyzeUserPreferences(orderHistory: MenuItem[]): UserPreferences {
  // Count occurrences of tags
  const tagCounts = new Map<string, number>();
  const categoryCount = new Map<string, number>();
  let totalSpice = 0;
  let totalItems = 0;
  let totalSpend = 0;

  orderHistory.forEach(item => {
    item.tags.forEach(tag => {
      tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
    });
    categoryCount.set(item.category, (categoryCount.get(item.category) || 0) + 1);
    totalSpice += item.spiceLevel;
    totalItems++;
    totalSpend += item.price;
  });

  // Calculate averages
  const avgSpice = Math.round(totalSpice / totalItems);
  const avgSpend = totalSpend / (totalItems || 1);

  // Infer dietary preferences from past orders
  const dietaryRestrictions: string[] = [];
  if (orderHistory.every(item => item.vegetarian)) dietaryRestrictions.push('vegetarian');
  if (orderHistory.every(item => item.vegan)) dietaryRestrictions.push('vegan');

  // Top categories
  const favoriteCategories = Array.from(categoryCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([cat]) => cat);

  return {
    dietaryRestrictions,
    spicePreference: avgSpice,
    budgetRange: [avgSpend * 0.7, avgSpend * 1.3],
    favoriteCategories,
    dislikedItems: [],
    allergies: [],
  };
}

/**
 * Trending items recommendation (popular across all users)
 */
export async function getTrendingRecommendations(
  allOrders: { itemName: string; count: number }[],
  availableMenu: any[],
  limit: number = 5
): Promise<AdvancedRecommendation[]> {
  try {
    // Get top trending items
    const trendingItems = allOrders.sort((a, b) => b.count - a.count).slice(0, 10);

    const trendingItemsStr = trendingItems
      .map(item => `${item.itemName} (${item.count} orders)`)
      .join('\n');

    const prompt = `These are trending menu items:
${trendingItemsStr}

For each, rate WHY it's trending and who would enjoy it.
Respond with JSON:
[
  {
    "itemName": "string",
    "reason": "why it's trending",
    "appeal": "demographic or persona it appeals to"
  }
]`;

    const message = await groq.chat.completions.create({
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      model: GROQ_MODEL,
      temperature: 0.7,
      max_tokens: 400,
    });

    const responseText = message.choices[0]?.message?.content || '[]';
    const cleanedResponse = responseText
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    const trendingData = JSON.parse(cleanedResponse);

    const recommendations: AdvancedRecommendation[] = trendingData
      .slice(0, limit)
      .map((rec: any) => {
        const menuItem = availableMenu.find(item => item.name === rec.itemName);
        return {
          itemId: menuItem?.itemId || '',
          name: rec.itemName,
          price: menuItem?.price || 0,
          reasoning: `Trending: ${rec.reason}`,
          confidence: 0.85,
          category: menuItem?.category || '',
          tags: menuItem?.tags || [],
          complementaryItems: [],
          mealTiming: 'anytime',
        };
      });

    return recommendations;
  } catch (error) {
    console.error('Trending recommendations error:', error);
    return [];
  }
}

