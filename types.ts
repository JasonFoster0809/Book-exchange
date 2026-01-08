// --- ENUMS (DANH MỤC CỐ ĐỊNH) ---

export enum Campus {
  CS1 = 'Quận 10 (CS1)',
  CS2 = 'Dĩ An (CS2)',
  OTHER = 'Khác'
}

export enum ProductCategory {
  TEXTBOOK = 'textbook',
  ELECTRONICS = 'electronics', 
  SUPPLIES = 'supplies',
  CLOTHING = 'clothing',
  OTHER = 'other'
}

export enum TradeMethod {
  DIRECT = 'direct',
  SHIPPING = 'shipping', 
  BOTH = 'flexible'
}

export enum ProductCondition {
  NEW = 'new',
  LIKE_NEW = 'like_new',
  GOOD = 'good',
  FAIR = 'fair',
  POOR = 'poor'
}

export enum ProductStatus {
  AVAILABLE = 'available',
  PENDING = 'pending',
  SOLD = 'sold',
  HIDDEN = 'hidden'
}

export enum HuntStatus {
  ACTIVE = 'active',
  PENDING = 'pending',
  COMPLETED = 'completed'
}

// --- INTERFACES ---

export interface User {
  id: string;
  email?: string;
  name: string;
  studentId: string;
  avatar: string;
  isVerified: boolean;
  role: 'user' | 'admin';
  rating?: number; 
  completedTrades?: number;
  
  // --- THÊM CHO HỆ THỐNG XỬ PHẠT ---
  banUntil?: string | null; 
  banned?: boolean; 
}

export interface Product {
  // --- Fields từ Database (snake_case) ---
  id: string;
  created_at?: string;      // Thay vì postedAt
  title: string;
  description: string;
  price: number;
  images: string[];
  category: ProductCategory | string;
  status: ProductStatus | string;
  condition: ProductCondition | string;
  
  seller_id?: string;       // Foreign Key tới profiles
  view_count?: number;
  like_count?: number;
  tags?: string[];
  trade_method?: TradeMethod | string;
  location_name?: string;   // Tên địa điểm lưu trong DB

  // --- Fields cho UI (camelCase - Map từ DB sang) ---
  sellerId: string;         // Map từ seller_id
  postedAt: string;         // Map từ created_at
  tradeMethod: TradeMethod | string; // Map từ trade_method
  location?: string;        // Map từ location_name
  
  // --- FIX LỖI BUILD: Thêm lại trường này (Optional) ---
  isLookingToBuy?: boolean; 
  
  buyerId?: string;
  campus?: Campus | string; 
  
  // Liên kết người bán (khi join bảng)
  seller?: User | any;
  profiles?: DBProfile;     // Khi join trực tiếp profiles

  isLiked?: boolean;
  isGoodPrice?: boolean;
}

// Interface khớp chính xác với bảng 'profiles' trong Supabase (SQL Mới)
export interface DBProfile {
  id: string;
  name: string | null;
  email?: string;
  avatar_url: string | null;
  cover_url?: string | null;
  bio?: string | null;
  
  // Thông tin sinh viên & xác thực
  student_code: string | null; // SQL mới dùng student_code
  verified_status: 'unverified' | 'pending' | 'verified' | 'rejected'; // Enum trong DB
  
  role: 'user' | 'admin';
  
  // Stats
  rating?: number;
  completed_trades?: number; 
  last_seen?: string;
  
  // Trạng thái khóa
  is_banned?: boolean;      // SQL mới dùng is_banned
  ban_until?: string | null;
  ban_reason?: string | null;
}

// Interface cho bảng 'verification_requests'
export interface VerificationRequest {
  id: string;
  user_id: string;
  student_code: string;
  image_url: string;
  status: 'pending' | 'approved' | 'rejected';
  admin_note?: string;
  created_at: string;
  profiles?: DBProfile; // Join sang bảng profiles
}

// --- CÁC INTERFACE PHỤ TRỢ ---

export interface Review {
  id: string;
  reviewerId: string;
  reviewerName: string;
  reviewerAvatar: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  type: 'text' | 'image' | 'location';
  image_url?: string;
  created_at: string;
}

export interface ChatSession {
  id: string;
  participant1: string;
  participant2: string;
  partnerName?: string;
  partnerAvatar?: string;
  partnerId?: string;
  isPartnerRestricted?: boolean;
  last_message?: string;
  unread_count?: number;
  updated_at?: string;
}

export interface Comment {
  id: string;
  product_id: string; // DB: product_id
  user_id: string;    // DB: user_id
  content: string;
  created_at: string; // DB: created_at
  
  // UI Mapped fields (Optional)
  productId?: string;
  userId?: string;
  userName?: string;
  userAvatar?: string;
  createdAt?: string;
  
  user?: { name: string; avatar_url: string }; // Join data
  parentId?: string | null;
  replies?: Comment[];
}

export interface Report {
  id: string;
  product_id: string;
  reporter_id: string;
  reason: string;
  status: 'pending' | 'resolved' | 'dismissed';
  created_at: string;
  product?: Product;
  reporter?: DBProfile;
}

export interface Hunt {
  id: string;
  userId: string;
  keyword: string;
  status: HuntStatus | string;
  createdAt: string;
}
