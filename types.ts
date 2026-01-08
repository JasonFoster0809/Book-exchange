// ==========================================
// 1. ENUMS (DANH MỤC & TRẠNG THÁI)
// ==========================================

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

// ==========================================
// 2. USER & PROFILE INTERFACES
// ==========================================

// Interface dùng trong AuthContext (Frontend Logic)
// Dữ liệu này đã được map từ DBProfile sang
export interface User {
  id: string;
  email?: string;
  name: string;
  avatar: string;
  role: 'user' | 'admin';
  
  // Các trường đã map lại tên cho dễ dùng ở Frontend
  studentId: string;   // Map từ student_code
  isVerified: boolean; // Map từ verified_status
  banned?: boolean;    // Map từ is_banned
  banUntil?: string | null; 
  
  rating?: number; 
  completedTrades?: number;
}

// Interface khớp 100% với bảng 'profiles' trong Database (SQL Mới)
export interface DBProfile {
  id: string;
  name: string | null;
  email?: string;
  avatar_url: string | null;
  cover_url?: string | null;
  bio?: string | null;
  major?: string | null;
  academic_year?: string | null;
  
  // --- CỘT MỚI TRONG SQL ---
  student_code: string | null; // Thay vì student_id cũ
  verified_status: 'unverified' | 'pending' | 'verified' | 'rejected';
  is_banned?: boolean;
  ban_until?: string | null;
  ban_reason?: string | null;
  
  role: 'user' | 'admin';
  rating?: number;
  completed_trades?: number; 
  last_seen?: string;
}

// Interface cho bảng 'verification_requests' (Admin duyệt SV)
export interface VerificationRequest {
  id: string;
  user_id: string;
  student_code: string; // Khớp DB
  image_url: string;
  status: 'pending' | 'approved' | 'rejected';
  admin_note?: string;
  created_at: string;
  
  // Join tables
  profiles?: DBProfile; 
}

// ==========================================
// 3. PRODUCT INTERFACE (HYBRID)
// ==========================================

export interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  images: string[];
  category: ProductCategory | string;
  status: ProductStatus | string;
  condition: ProductCondition | string;
  
  // --- FIELDS TỪ DATABASE (snake_case) ---
  // Có thể undefined nếu chưa fetch hoặc dùng alias
  created_at?: string;      
  seller_id?: string;       
  location_name?: string;   
  trade_method?: TradeMethod | string;
  view_count?: number;
  like_count?: number;
  tags?: string[];

  // --- FIELDS CHO UI (camelCase - Map từ DB sang) ---
  // Bắt buộc có để code cũ không bị lỗi
  sellerId: string;         // Map từ seller_id
  postedAt: string;         // Map từ created_at
  tradeMethod: TradeMethod | string; // Map từ trade_method
  location?: string;        // Map từ location_name
  
  // --- FIX LỖI BUILD (Các trường cũ vẫn đang được gọi) ---
  isLookingToBuy?: boolean; // Cần thêm dòng này để fix lỗi ProductCard
  buyerId?: string;
  campus?: Campus | string; 
  
  // --- RELATIONS (JOIN DATA) ---
  seller?: User | any;      // User object đã map
  profiles?: DBProfile;     // Raw profile object từ DB

  // --- UI STATES ---
  isLiked?: boolean;
  isGoodPrice?: boolean;
}

// ==========================================
// 4. OTHER INTERFACES
// ==========================================

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
  
  // UI Helper fields
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
  product_id: string;
  user_id: string;
  content: string;
  created_at: string;
  
  // UI Helper fields
  productId?: string;
  userId?: string;
  userName?: string;
  userAvatar?: string;
  createdAt?: string;
  
  // Relations
  user?: { name: string; avatar_url: string };
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
  
  // Relations
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
