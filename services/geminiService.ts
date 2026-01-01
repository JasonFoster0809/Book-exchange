import OpenAI from "openai";
import { ProductCategory } from "../types";

// Sử dụng biến môi trường từ .env.local
const apiKey = import.meta.env.VITE_GROQ_API_KEY;

const client = new OpenAI({
  apiKey: apiKey,
  baseURL: "https://api.groq.com/openai/v1",
  dangerouslyAllowBrowser: true 
});

// 1. Tạo mô tả sản phẩm (Giữ nguyên)
export const generateProductDescription = async (
  title: string,
  condition: string,
  category: string,
  keyDetails: string
): Promise<string> => {
  if (!apiKey) return "Chưa có cấu hình API Key cho AI.";

  try {
    const prompt = `
      You are a copywriter for a student marketplace.
      Write a short, catchy description (max 80 words) for:
      Item: ${title}
      Category: ${category}
      Condition: ${condition}
      Details: ${keyDetails}
      Language: Vietnamese.
      Tone: Friendly, honest, student-focused.
      Output: Just the text.
    `;

    const response = await client.chat.completions.create({
      model: "llama3-70b-8192", 
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    });

    return response.choices[0]?.message?.content || "Không thể tạo mô tả.";
  } catch (error) {
    console.error("AI Error:", error);
    return "Lỗi kết nối AI.";
  }
};

// 2. Tìm kiếm thông minh (Giữ nguyên)
export const smartSearchInterpreter = async (query: string): Promise<{
    category?: ProductCategory,
    keywords: string[]
} | null> => {
    if (!apiKey) return null;

    try {
        const prompt = `
          Analyze search query: "${query}". 
          Return JSON with 'category' (Textbook, Electronics, School Supplies, Clothing, Other) 
          and 'keywords' (3-5 items).
          Example: { "category": "Textbook", "keywords": ["Calculus", "Math"] }
        `;

        const response = await client.chat.completions.create({
            model: "llama3-70b-8192",
            messages: [{ role: "user", content: prompt }],
            response_format: { type: "json_object" },
            temperature: 0,
        });
        
        const content = response.choices[0]?.message?.content;
        return content ? JSON.parse(content) : null;
    } catch (e) {
        return null;
    }
}

// 3. [MỚI] Gợi ý giá bán
export const estimatePrice = async (
  title: string, 
  category: string, 
  condition: string
): Promise<string> => {
  if (!apiKey) return "";

  try {
     const prompt = `
      Bạn là chuyên gia định giá đồ cũ cho sinh viên tại Việt Nam.
      Hãy gợi ý một mức giá hợp lý (bằng VND) cho sản phẩm sau:
      - Tên: ${title}
      - Loại: ${category}
      - Tình trạng: ${condition}
      
      Trả lời NGẮN GỌN duy nhất một con số gợi ý (ví dụ: 50000) hoặc một khoảng giá (ví dụ: 50000 - 100000). 
      Không giải thích thêm.
    `;

    const response = await client.chat.completions.create({
      model: "llama3-70b-8192",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.5,
      max_tokens: 50
    });

    return response.choices[0]?.message?.content?.trim() || "";
  } catch (e) {
    console.error("Price estimate error", e);
    return "";
  }
}