// ==========================================
// 1. ENUMS (DANH MỤC & TRẠNG THÁI)
// ==========================================

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
  USED = 'used',
  LIKE_NEW = 'like_new'
}

export enum ProductStatus {
  AVAILABLE = 'available',
  PENDING = 'pending', // Đang giao dịch
  SOLD = 'sold',       // Đã bán
  BANNED = 'banned',   // Bị admin khóa
  HIDDEN = 'hidden'    // Người dùng tự ẩn
}

export enum VerificationStatus {
  UNVERIFIED = 'unverified',
  PENDING = 'pending',
  VERIFIED = 'verified',
  REJECTED = 'rejected'
}

// ==========================================
// 2. USER & AUTH INTERFACES
// ==========================================

// Interface dùng cho State của React (App State)
export interface User {
  id: string;
  email: string;
  name: string;
  avatar: string;
  role: 'user' | 'admin';
  
  studentId: string;   
  isVerified: boolean; 
  banned: boolean;     
  banUntil: string | null; 
  
  // Thông tin bổ sung (Đã thêm để fix lỗi AuthContext)
  bio?: string;
  major?: string;
  academicYear?: string;
  coverUrl?: string;
  joinedAt?: string;
  lastSeen?: string;
}

// Interface dùng cho Dữ liệu thô từ Supabase (DB Schema)
export interface DBProfile {
  id: string;
  email?: string;
  name: string | null;
  avatar_url: string | null;
  cover_url?: string | null;
  
  role: string;
  student_code: string | null; 
  verified_status: string; // 'unverified' | 'pending' | ...
  
  bio?: string | null;
  major?: string | null;
  academic_year?: string | null;
  
  created_at: string;
  last_seen?: string;
  banned_until?: string | null;
  ban_reason?: string | null;
}

export interface VerificationRequest {
  id: string;
  user_id: string;
  student_code: string;
  image_url: string;
  status: 'pending' | 'approved' | 'rejected';
  admin_note?: string;
  created_at: string;
  
  // Relation
  profiles?: DBProfile; 
}

// ==========================================
// 3. PRODUCT INTERFACE
// ==========================================

export interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  images: string[]; // Luôn là mảng string
  
  category: string;
  condition: string;
  status: string;
  
  // Thông tin giao dịch
  tradeMethod: string;
  location: string;
  
  // Meta data (Mapped fields for UI)
  sellerId: string;
  postedAt: string;
  view_count: number;

  // Raw DB fields (Optional - để tránh lỗi khi fetch raw)
  seller_id?: string;
  created_at?: string;
  location_name?: string;
  trade_method?: string;

  // Relation (Thông tin người bán)
  seller?: {
    id: string;
    name: string;
    avatar_url: string;
    verified_status: string;
    student_code?: string;
    last_seen?: string;
  };
}

// ==========================================
// 4. SOCIAL & INTERACTION INTERFACES
// ==========================================

export interface Review {
  id: string;
  reviewerId: string;
  revieweeId?: string;
  rating: number;
  comment: string;
  createdAt: string;

  // UI Helpers
  reviewerName?: string;
  reviewerAvatar?: string;
}

export interface Comment {
  id: string;
  productId: string;
  userId: string;
  content: string;
  createdAt: string;
  parentId?: string | null;

  // Relation
  user?: { 
    name: string; 
    avatar_url: string 
  };
  replies?: Comment[];
}

export interface Report {
  id: string;
  reporterId: string;
  productId: string;
  reason: string;
  status: 'pending' | 'resolved' | 'dismissed';
  createdAt: string;
  
  // Relations (Optional)
  reporter?: DBProfile;
  product?: Product;
}

// ==========================================
// 5. CHAT INTERFACES
// ==========================================

export interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  type: 'text' | 'image' | 'system'; 
  is_read?: boolean;
  created_at: string;
}

export interface ChatConversation {
  id: string;
  participant1: string;
  participant2: string;
  updated_at: string;
  
  // UI Helpers
  partner?: {
    id: string;
    name: string;
    avatar_url: string;
    last_seen?: string;
  };
  last_message?: string;
  unread_count?: number;
}
