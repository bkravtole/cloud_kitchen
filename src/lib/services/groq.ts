import { Groq } from 'groq-sdk';
import { AIResponse } from '@/types';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const GROQ_MODEL = process.env.GROQ_MODEL || 'mixtral-8x7b-32768';

interface MenuItem {
  name: string;
  price: number;
  tags: string[];
  category: string;
  serves: number;
  spiceLevel: number;
}

export async function processUserMessage(
  userMessage: string,
  menu: MenuItem[],
  restaurantName: string,
  previousOrders: any[] = []
): Promise<AIResponse> {
  try {
    const menuContext = menu
      .map(
        m =>
          `- ${m.name} (₹${m.price}, serves ${m.serves}, spice: ${m.spiceLevel}/5, tags: ${m.tags.join(', ')})`
      )
      .join('\n');

    const previousOrderContext =
      previousOrders.length > 0
        ? `\nCustomer's previous orders: ${previousOrders.map(o => o.items.map((i: any) => i.name).join(', ')).join(' | ')}`
        : '';

    const prompt = `You are a helpful restaurant AI assistant for ${restaurantName}.

RESTAURANT MENU:
${menuContext}
${previousOrderContext}

CUSTOMER MESSAGE: "${userMessage}"

Respond with valid JSON only (no markdown, no code blocks):
{
  "intent": "GET_RECOMMENDATION or ORDER or TRACK or QUESTION or MENU or HELP",
  "entities": {
    "spiceLevel": 1-5 or null,
    "people": number or null,
    "dietary": ["vegan", "gluten-free"] or [],
    "category": "string or null",
    "itemName": "string or null"
  },
  "suggestedItems": ["item name 1", "item name 2"],
  "conversationalResponse": "Your friendly response to the customer",
  "suggestedActions": ["ADD_TO_CART", "VIEW_MENU", "HELP"],
  "confidence": 0.85
}`;

    const message = await groq.chat.completions.create({
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      model: GROQ_MODEL,
      temperature: 0.3,
      max_tokens: 500,
    });

    const responseText = message.choices[0]?.message?.content || '{}';

    // Clean up response (remove markdown code blocks if present)
    const cleanedResponse = responseText
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    const aiResponse: AIResponse = JSON.parse(cleanedResponse);

    return {
      ...aiResponse,
      confidence: aiResponse.confidence || 0.85,
    };
  } catch (error) {
    console.error('❌ Groq API Error:', error);

    // Fallback response
    return {
      intent: 'HELP',
      entities: {},
      suggestedItems: [],
      conversationalResponse:
        "I'm having trouble understanding. Please try again or type 'menu' to see our offerings.",
      suggestedActions: ['VIEW_MENU', 'HELP'],
      confidence: 0,
    };
  }
}

export function extractMenuTags(menu: MenuItem[]): string[] {
  const tags = new Set<string>();
  menu.forEach(item => {
    item.tags.forEach(tag => tags.add(tag.toLowerCase()));
  });
  return Array.from(tags);
}

export function filterMenuByPreferences(
  menu: MenuItem[],
  spiceLevel?: number,
  dietary?: string[],
  category?: string
): MenuItem[] {
  return menu.filter(item => {
    if (spiceLevel && item.spiceLevel > spiceLevel) return false;
    if (category && item.category.toLowerCase() !== category.toLowerCase()) return false;
    if (dietary && dietary.length > 0) {
      const hasDietaryTag = dietary.some(d => item.tags.map(t => t.toLowerCase()).includes(d.toLowerCase()));
      if (!hasDietaryTag) return false;
    }
    return true;
  });
}
