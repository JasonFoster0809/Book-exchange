import { GoogleGenAI, Type } from "@google/genai";
import { ProductCategory, ProductCondition } from "../types";

const apiKey = process.env.API_KEY || ''; 
// Note: In a real production app, ensure this key is not exposed to the client directly 
// without proxy or strictly limited restrictions, but for this React-only demo we use env.

const ai = new GoogleGenAI({ apiKey });

export const generateProductDescription = async (
  title: string,
  condition: string,
  category: string,
  keyDetails: string
): Promise<string> => {
  if (!apiKey) return "AI description unavailable (Missing API Key).";

  try {
    const prompt = `
      You are a helpful assistant for a university student marketplace.
      Write a short, engaging, and honest sales description (max 100 words) for a used item.
      
      Item: ${title}
      Category: ${category}
      Condition: ${condition}
      User Notes: ${keyDetails}
      
      Tone: Friendly, student-to-student, transparent about defects.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    return response.text || "Could not generate description.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Error generating description. Please try again.";
  }
};

export const smartSearchInterpreter = async (query: string): Promise<{
    category?: ProductCategory,
    keywords: string[]
} | null> => {
    if (!apiKey) return null;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Analyze this search query for a student marketplace: "${query}". Return a JSON object with a likely 'category' (enum match: Textbook, Electronics, School Supplies, Uniforms/Clothing, Other) and a list of 3-5 search 'keywords' to match against database titles.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        category: { 
                            type: Type.STRING, 
                            enum: [
                                ProductCategory.TEXTBOOK, 
                                ProductCategory.ELECTRONICS, 
                                ProductCategory.SUPPLIES, 
                                ProductCategory.CLOTHING, 
                                ProductCategory.OTHER
                            ],
                            nullable: true
                        },
                        keywords: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING }
                        }
                    }
                }
            }
        });

        const json = JSON.parse(response.text || "{}");
        return json;
    } catch (e) {
        console.error("Smart search failed", e);
        return null;
    }
}
