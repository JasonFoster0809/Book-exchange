import OpenAI from "openai";
import { ProductCategory } from "../types";

// Sử dụng biến môi trường chuẩn VITE_GROQ_API_KEY
// Fallback key chỉ dùng cho demo, nên đưa vào .env trong thực tế
const apiKey = import.meta.env.VITE_GROQ_API_KEY || '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';

const client = new OpenAI({
  apiKey: apiKey,
  baseURL: "https://api.groq.com/openai/v1",
  dangerouslyAllowBrowser: true 
});

export const generateProductDescription = async (
  title: string,
  condition: string,
  category: string,
  keyDetails: string
): Promise<string> => {
  if (!apiKey) return "Chưa có API Key.";

  try {
    const prompt = `
      You are a helpful assistant for a university student marketplace.
      Write a short, engaging, and honest sales description (max 100 words) for a used item.
      
      Item: ${title}
      Category: ${category}
      Condition: ${condition}
      User Notes: ${keyDetails}
      
      Tone: Friendly, student-to-student, transparent about defects.
      Language: Vietnamese (Tiếng Việt).
      Output: Just the description text, no quotes.
    `;

    const response = await client.chat.completions.create({
      model: "llama3-70b-8192", 
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    });

    return response.choices[0]?.message?.content || "Không thể tạo mô tả.";
  } catch (error) {
    console.error("AI API Error:", error);
    return "Lỗi khi gọi AI. Vui lòng kiểm tra lại kết nối.";
  }
};

export const smartSearchInterpreter = async (query: string): Promise<{
    category?: ProductCategory,
    keywords: string[]
} | null> => {
    if (!apiKey) return null;

    try {
        const prompt = `
          Analyze this search query for a student marketplace: "${query}". 
          Return a JSON object with a likely 'category' (enum match: Textbook, Electronics, School Supplies, Uniforms/Clothing, Other) 
          and a list of 3-5 search 'keywords' related to the item.
          
          Example output format: { "category": "Textbook", "keywords": ["Calculus", "Math", "Stewart"] }
        `;

        const response = await client.chat.completions.create({
            model: "llama3-70b-8192",
            messages: [{ role: "user", content: prompt }],
            response_format: { type: "json_object" },
            temperature: 0,
        });
        
        const content = response.choices[0]?.message?.content;
        if (!content) return null;

        return JSON.parse(content);
    } catch (e) {
        console.error("Smart search failed", e);
        return null;
    }
}