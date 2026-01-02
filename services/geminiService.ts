import OpenAI from "openai";

// 1. CẤU HÌNH API KEY & MODEL
const apiKey = import.meta.env.VITE_GROQ_API_KEY;

// Log cảnh báo nếu thiếu key
if (!apiKey) {
  console.warn("⚠️ CẢNH BÁO: Chưa tìm thấy VITE_GROQ_API_KEY trong file .env");
}

// --- KHAI BÁO MODEL ---
// Model mạnh nhất (Dùng cho viết lách, suy luận, JSON)
const GROQ_MODEL_ID = "llama-3.3-70b-versatile"; 
// Model siêu tốc (Dùng cho các tác vụ nhẹ, realtime nếu cần sau này)
const GROQ_TITLE_MODEL_ID = "llama-3.1-8b-instant"; 

// 2. Cấu hình Client
const client = new OpenAI({
  apiKey: apiKey || "dummy_key", 
  baseURL: "https://api.groq.com/openai/v1",
  dangerouslyAllowBrowser: true 
});

/**
 * FEATURE 1: AI VIẾT HỘ (Magic Write)
 * Sử dụng Model 70B để văn phong hay và sáng tạo nhất
 */
export const generateCreativeDescription = async (
  title: string,
  category: string
): Promise<string | null> => {
  if (!apiKey) {
    alert("Thiếu API Key! Hãy tạo file .env và thêm VITE_GROQ_API_KEY");
    return null;
  }

  try {
    console.log(`🤖 Đang viết mô tả cho: ${title}...`);

    const prompt = `
      Bạn là sinh viên Bách Khoa TP.HCM (BK). 
      Hãy viết 1 đoạn mô tả ngắn (khoảng 3 câu), văn phong vui vẻ, chân thật (dùng từ: pass lại, giá sinh viên, bao test) để bán món đồ này:
      - Tên: "${title}"
      - Loại: "${category}"
      
      Yêu cầu: Chỉ trả về nội dung văn bản, không có dấu ngoặc kép.
    `;

    const response = await client.chat.completions.create({
      model: GROQ_MODEL_ID, // Dùng model mạnh nhất
      messages: [{ role: "user", content: prompt }],
      temperature: 0.8,
      max_tokens: 250,
    });

    const content = response.choices[0]?.message?.content;
    console.log("✅ AI đã viết xong:", content);
    return content || null;

  } catch (error: any) {
    console.error("❌ Lỗi AI Viết Hộ:", error);
    handleError(error);
    return null;
  }
};

/**
 * FEATURE 2: GỢI Ý GIÁ (Price Estimate)
 * Sử dụng Model 70B để suy luận giá cả chính xác hơn
 */
export const estimatePrice = async (
  title: string, 
  category: string, 
  condition: string
): Promise<string> => {
  if (!apiKey) return "";

  try {
    console.log(`💰 Đang định giá: ${title}...`);

    const prompt = `
      Đóng vai chuyên gia định giá đồ cũ tại Việt Nam.
      Hãy gợi ý mức giá bán (VNĐ) hợp lý cho sinh viên mua lại món đồ này:
      - Món: ${title} (${category})
      - Tình trạng: ${condition}
      
      Yêu cầu: Chỉ trả về duy nhất con số hoặc khoảng giá (Ví dụ: "50.000" hoặc "1.000.000 - 1.200.000"). Không giải thích thêm.
    `;

    const response = await client.chat.completions.create({
      model: GROQ_MODEL_ID, // Dùng model mạnh nhất
      messages: [{ role: "user", content: prompt }],
      temperature: 0.4,
      max_tokens: 50
    });

    const price = response.choices[0]?.message?.content?.trim();
    console.log("✅ Gợi ý giá:", price);
    return price || "";

  } catch (e) {
    console.error("Lỗi định giá:", e);
    return "";
  }
}

/**
 * FEATURE 3: TÌM KIẾM THÔNG MINH (Smart Search)
 * Sử dụng Model 70B để đảm bảo trả về đúng định dạng JSON (Model nhỏ dễ bị sai format)
 */
export const smartSearchInterpreter = async (query: string): Promise<{
    category?: string,
    maxPrice?: number,
    keywords: string[]
} | null> => {
    if (!apiKey) return null;

    try {
        const prompt = `
          Analyze search query: "${query}".
          Return JSON object with:
          1. "category": Best guess from [Giáo trình, Đồ điện tử, Gia dụng, Thời trang, Dụng cụ học tập, Khác].
          2. "maxPrice": Detected budget in VND (number only). If none, null.
          3. "keywords": Array of 3-5 keywords.
        `;

        const response = await client.chat.completions.create({
            model: GROQ_MODEL_ID, // Dùng 70b để đảm bảo JSON chuẩn
            messages: [{ role: "user", content: prompt }],
            response_format: { type: "json_object" },
            temperature: 0.1,
        });
        
        const content = response.choices[0]?.message?.content;
        return content ? JSON.parse(content) : null;
    } catch (e) {
        console.error("Smart Search Error:", e);
        return null;
    }
}

// Hàm xử lý lỗi chung
const handleError = (error: any) => {
    if (error?.status === 400) alert("Model AI bị lỗi cấu hình. Hãy kiểm tra lại tên model trong code.");
    else if (error?.status === 401) alert("API Key Groq không hợp lệ.");
    else if (error?.status === 404) alert("Model không tồn tại (Sai tên model).");
    else alert("Lỗi kết nối AI: " + (error.message || "Không xác định"));
}