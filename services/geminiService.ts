import OpenAI from "openai";
import { ProductCategory } from "../types";

// Lấy API Key từ file .env.local (hoặc dùng key cứng nếu test nhanh)
const apiKey = import.meta.env.VITE_GROQ_API_KEY || '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';

// Cấu hình Client kết nối tới Groq
const client = new OpenAI({
  apiKey: apiKey,
  baseURL: "https://api.groq.com/openai/v1",
  dangerouslyAllowBrowser: true // Cho phép chạy trên trình duyệt (React)
});

// Hàm 1: Viết mô tả sản phẩm (Dùng Llama 3)
export const generateProductDescription = async (
  title: string,
  condition: string,
  category: string,
  keyDetails: string
): Promise<string> => {
  if (!apiKey) return "Chưa có API Key Groq.";

  try {
    const prompt = `
      You are a helpful assistant for a university student marketplace.
      Write a short, engaging, and honest sales description (max 100 words) for a used item.
      
      Item: ${title}
      Category: ${category}
      Condition: ${condition}
      User Notes: ${keyDetails}
      
      Tone: Friendly, student-to-student, transparent about defects.
      Output: Just the description text, no quotes.
    `;

    const response = await client.chat.completions.create({
      model: "llama3-70b-8192", // Model mạnh và siêu nhanh của Groq
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    });

    return response.choices[0]?.message?.content || "Không thể tạo mô tả.";
  } catch (error) {
    console.error("Llama/Groq API Error:", error);
    return "Lỗi khi gọi AI. Vui lòng kiểm tra lại kết nối.";
  }
};

// Hàm 2: Tìm kiếm thông minh (Dùng Llama 3 trả về JSON)
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
            response_format: { type: "json_object" }, // Bắt buộc Llama trả về JSON chuẩn
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