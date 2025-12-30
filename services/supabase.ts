import { createClient } from '@supabase/supabase-js';

// Điền trực tiếp thông tin bạn vừa cung cấp
const supabaseUrl = "https://efyrdkncvjmkgfpcxcdg.supabase.co";
const supabaseKey = "sb_publishable_1EY9pnGFXIfpyNCYt1bwCw_6t3fPBYH";

if (!supabaseUrl || !supabaseKey) {
  console.error("⚠️ Thiếu Supabase Key!");
}

export const supabase = createClient(supabaseUrl, supabaseKey);