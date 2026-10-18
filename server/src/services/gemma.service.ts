import { z } from 'zod';
import { config } from '../config';
import {
  AIMenuTranslationResult,
  AIImproveDescriptionResult,
} from '../types';

// Zod schemas for validating AI outputs
const translationItemSchema = z.object({
  id: z.string(),
  original_name: z.string(),
  translated_name: z.string(),
  original_description: z.string().optional().nullable(),
  translated_description: z.string().optional().nullable(),
});

const categoryTranslationSchema = z.object({
  id: z.string(),
  original_name: z.string(),
  translated_name: z.string(),
  dishes: z.array(translationItemSchema),
});

export const gemmaTranslationResultSchema = z.object({
  menu_title: z
    .object({
      original: z.string(),
      translated: z.string(),
    })
    .optional(),
  categories: z.array(categoryTranslationSchema),
});

export const gemmaImproveDescriptionSchema = z.object({
  dish_name: z.string(),
  improved_description: z.string().min(5),
  suggested_tags: z.array(z.string()).optional(),
});

export class GemmaServiceError extends Error {
  constructor(message: string, public statusCode: number = 500, public details?: any) {
    super(message);
    this.name = 'GemmaServiceError';
  }
}

/**
 * Clean markdown JSON blocks or accidental wrapper text
 */
function extractJsonFromText(text: string): string {
  let cleaned = text.trim();
  // Remove markdown code fences if present
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }
  return cleaned.trim();
}

/**
 * Service to interact with Google Gemma open-weight models via hosted inference.
 */
export class GemmaService {
  private provider: 'google' | 'groq' | 'openai_compatible';
  private apiKey: string;
  private model: string;
  private apiBaseUrl?: string;

  constructor() {
    this.provider = config.gemma.provider;
    this.apiKey = config.gemma.apiKey;
    this.model = config.gemma.model;
    this.apiBaseUrl = config.gemma.apiBaseUrl;
  }

  public isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiKey.trim().length > 0);
  }

  public getProviderInfo() {
    return {
      provider: this.provider,
      model: this.model,
      isConfigured: this.isConfigured(),
    };
  }

  /**
   * Dispatches prompt to the configured hosted inference provider
   */
  private async executePrompt(systemPrompt: string, userPrompt: string): Promise<string> {
    if (!this.isConfigured()) {
      throw new GemmaServiceError(
        `Gemma AI is not configured. Please supply a valid GEMMA_API_KEY in your server environment or .env file (provider: ${this.provider}, model: ${this.model}).`,
        503
      );
    }

    try {
      if (this.provider === 'google') {
        return await this.callGoogleAIStudio(systemPrompt, userPrompt);
      } else if (this.provider === 'groq') {
        return await this.callGroq(systemPrompt, userPrompt);
      } else {
        return await this.callOpenAICompatible(systemPrompt, userPrompt);
      }
    } catch (err: any) {
      if (err instanceof GemmaServiceError) {
        throw err;
      }
      throw new GemmaServiceError(
        `Failed to communicate with Gemma provider (${this.provider}): ${err.message || 'Unknown network error'}`,
        502,
        err
      );
    }
  }

  /**
   * Google AI Studio REST Endpoint for Gemma
   * Model: gemma-2-9b-it or gemma-2-27b-it
   * URL: https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key}
   */
  private async callGoogleAIStudio(systemPrompt: string, userPrompt: string): Promise<string> {
    const baseUrl = this.apiBaseUrl || 'https://generativelanguage.googleapis.com';
    const url = `${baseUrl}/v1beta/models/${encodeURIComponent(this.model)}:generateContent?key=${encodeURIComponent(this.apiKey)}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: `${systemPrompt}\n\nStrict requirement: Respond ONLY with valid JSON conforming to the requested schema. Do not include markdown codeblocks or conversational text.\n\n${userPrompt}`,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: 'application/json',
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorJson: any = null;
      try {
        errorJson = JSON.parse(errorText);
      } catch {}
      const msg = errorJson?.error?.message || `HTTP ${response.status}: ${response.statusText}`;
      throw new GemmaServiceError(`Google AI Studio error (${this.model}): ${msg}`, response.status);
    }

    const data: any = await response.json();
    const candidate = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!candidate) {
      throw new GemmaServiceError('Received empty candidate response from Google AI Studio Gemma model', 502);
    }
    return candidate;
  }

  /**
   * Groq Cloud inference for Gemma 2
   * Model: gemma2-9b-it
   * URL: https://api.groq.com/openai/v1/chat/completions
   */
  private async callGroq(systemPrompt: string, userPrompt: string): Promise<string> {
    const baseUrl = this.apiBaseUrl || 'https://api.groq.com/openai/v1';
    const url = `${baseUrl}/chat/completions`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: `${systemPrompt}\nYou must return valid JSON only.`,
          },
          {
            role: 'user',
            content: userPrompt,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new GemmaServiceError(`Groq API error (${response.status}): ${errorText}`, response.status);
    }

    const data: any = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new GemmaServiceError('Empty response content received from Groq Gemma endpoint', 502);
    }
    return content;
  }

  /**
   * Generic OpenAI-compatible endpoint (Ollama, Together AI, OpenRouter, vLLM)
   */
  private async callOpenAICompatible(systemPrompt: string, userPrompt: string): Promise<string> {
    const baseUrl = (this.apiBaseUrl || 'https://openrouter.ai/api/v1').replace(/\/$/, '');
    const url = `${baseUrl}/chat/completions`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: `${systemPrompt}\nYou must respond with pure JSON only matching the schema.`,
          },
          {
            role: 'user',
            content: userPrompt,
          },
        ],
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new GemmaServiceError(`OpenAI-compatible Gemma endpoint error (${response.status}): ${errorText}`, response.status);
    }

    const data: any = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new GemmaServiceError('Empty response content from inference endpoint', 502);
    }
    return content;
  }

  /**
   * Translates menu category titles and dish items between English and Urdu (or other supported languages)
   */
  public async translateMenu(
    payload: {
      menuTitle: string;
      sourceLanguage: string;
      targetLanguage: string;
      categories: Array<{
        id: string;
        name: string;
        dishes: Array<{
          id: string;
          name: string;
          description?: string | null;
        }>;
      }>;
    }
  ): Promise<AIMenuTranslationResult> {
    const sourceLangName = payload.sourceLanguage === 'en' ? 'English' : 'Urdu';
    const targetLangName = payload.targetLanguage === 'ur' ? 'Urdu' : 'English';

    const systemPrompt = `You are a culinary translation expert specializing in Pakistani and international restaurant menus.
Translate the provided restaurant menu items from ${sourceLangName} to ${targetLangName}.

CULTURAL AND TRANSLATION GUIDELINES:
1. When translating from English to Urdu:
   - Use natural, authentic Pakistani culinary Urdu.
   - For dishes with iconic traditional South Asian names (e.g. "Chicken Karahi", "Daal Makhani", "Seekh Kabab", "Gulab Jamun", "Biryani"), use authentic Nastaliq Urdu transliteration/script (e.g. "چکن کڑاہی", "دال مکھنی", "سیخ کباب", "گلاب جامن", "بریانی").
   - For Western or modern cafe items (e.g., "Club Sandwich", "Espresso", "Mint Margarita"), transliterate the recognized culinary name gracefully into Urdu (e.g. "کلب سینڈوچ", "اسپریسو", "منٹ مارگریٹا") rather than awkward literal translation.
   - Write enticing, natural dish descriptions in Urdu that sound like a fine dining or authentic cafe menu.
2. When translating from Urdu to English:
   - Use appetizing, standard English culinary terms.
3. PRESERVATION RULES:
   - You MUST preserve all 'id' fields exactly as provided in the input. Never change, renumber, or drop an 'id'.
   - Do NOT invent ingredients or allergen warnings.
4. JSON OUTPUT FORMAT:
Return a JSON object with this exact structure:
{
  "menu_title": {
    "original": "${payload.menuTitle}",
    "translated": "translated title"
  },
  "categories": [
    {
      "id": "category-id",
      "original_name": "original category name",
      "translated_name": "translated category name",
      "dishes": [
        {
          "id": "dish-id",
          "original_name": "original dish name",
          "translated_name": "translated dish name",
          "original_description": "original description",
          "translated_description": "translated description"
        }
      ]
    }
  ]
}`;

    const userPrompt = JSON.stringify({
      menu_title: payload.menuTitle,
      source_language: payload.sourceLanguage,
      target_language: payload.targetLanguage,
      categories: payload.categories.map((c) => ({
        id: c.id,
        name: c.name,
        dishes: c.dishes.map((d) => ({
          id: d.id,
          name: d.name,
          description: d.description || '',
        })),
      })),
    });

    const rawResponse = await this.executePrompt(systemPrompt, userPrompt);
    const cleanedJson = extractJsonFromText(rawResponse);

    let parsed: any;
    try {
      parsed = JSON.parse(cleanedJson);
    } catch (parseErr) {
      throw new GemmaServiceError(
        'Gemma model produced invalid JSON output. Please retry or edit translations manually.',
        502,
        { raw: rawResponse }
      );
    }

    const validated = gemmaTranslationResultSchema.safeParse(parsed);
    if (!validated.success) {
      throw new GemmaServiceError(
        'Gemma model output failed schema validation. Please check that category and dish IDs match.',
        502,
        validated.error.format()
      );
    }

    return {
      source_language: payload.sourceLanguage,
      target_language: payload.targetLanguage,
      menu_title: validated.data.menu_title,
      categories: validated.data.categories,
    };
  }

  /**
   * Improves a dish description to be enticing and concise based strictly on restaurant-supplied notes.
   */
  public async improveDescription(payload: {
    dishName: string;
    currentDescription?: string | null;
    ingredients?: string | null;
    cuisineNotes?: string | null;
  }): Promise<AIImproveDescriptionResult> {
    const systemPrompt = `You are an award-winning restaurant menu copywriter.
Generate an enticing, professional, and concise menu description (15 to 30 words) for the specified dish.

CRITICAL SAFETY & TRUTH CONSTRAINTS:
1. ONLY utilize ingredients, cooking methods, and flavor notes explicitly provided in the user's prompt.
2. NEVER invent allergens (such as nuts, dairy, gluten), false health benefits, or unmentioned ingredients.
3. If minimal info is given, highlight the dish's culinary texture and temperature (e.g. freshly simmered, slow-cooked, aromatic) without adding fake ingredients.
4. Suggest 1 to 3 relevant dietary/attribute tags (e.g., "spicy", "vegetarian", "chef-special", "halal") ONLY if supported by the ingredients.

JSON OUTPUT FORMAT:
Return a JSON object strictly matching this schema:
{
  "dish_name": "${payload.dishName}",
  "improved_description": "Enticing 20-30 word description",
  "suggested_tags": ["tag1", "tag2"]
}`;

    const userPrompt = JSON.stringify({
      dish_name: payload.dishName,
      current_description: payload.currentDescription || '',
      ingredients: payload.ingredients || '',
      cuisine_notes: payload.cuisineNotes || '',
    });

    const rawResponse = await this.executePrompt(systemPrompt, userPrompt);
    const cleanedJson = extractJsonFromText(rawResponse);

    let parsed: any;
    try {
      parsed = JSON.parse(cleanedJson);
    } catch (parseErr) {
      throw new GemmaServiceError(
        'Gemma model produced invalid JSON for description improvement. Please retry.',
        502,
        { raw: rawResponse }
      );
    }

    const validated = gemmaImproveDescriptionSchema.safeParse(parsed);
    if (!validated.success) {
      throw new GemmaServiceError(
        'Gemma model response did not match expected description schema.',
        502,
        validated.error.format()
      );
    }

    return {
      dish_name: validated.data.dish_name,
      original_description: payload.currentDescription || undefined,
      improved_description: validated.data.improved_description,
      suggested_tags: validated.data.suggested_tags,
    };
  }
}

export const gemmaService = new GemmaService();
export default gemmaService;
