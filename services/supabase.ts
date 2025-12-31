import { createClient } from '@supabase/supabase-js';

// Dùng luôn key cứng để đảm bảo không bị lỗi biến môi trường
const supabaseUrl = "https://efyrdkncvjmkgfpcxcdg.supabase.co";
const supabaseKey = "sb_publishable_1EY9pnGFXIfpyNCYt1bwCw_6t3fPBYH";

// Log ra kiểm tra xem có nhận được key không (Bật F12 Console để xem)
console.log("Supabase URL:", supabaseUrl);

export const supabase = createClient(supabaseUrl, supabaseKey);