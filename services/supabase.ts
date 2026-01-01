import { createClient } from '@supabase/supabase-js';

// Đọc biến môi trường từ file .env.local
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Thiếu cấu hình Supabase trong .env.local");
}

export const supabase = createClient(supabaseUrl, supabaseKey);