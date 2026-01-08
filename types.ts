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

// --- THÊM ENUM NÀY ĐỂ FIX LỖI MARKETPLACE ---
export enum SortOption {
  NEWEST = "newest",
  PRICE_ASC = "price_asc",
  PRICE_DESC = "price_desc",
  MOST_VIEWED = "most_viewed",
}

// ==========================================
// 2. USER & PROFILE INTERFACES
// ==========================================

export interface User {
  id: string;
  email?: string;
  name: string;
  avatar: string;
  role: 'user' | 'admin';
  
  studentId: string;   
  isVerified: boolean; 
  banned?: boolean;    
  banUntil?: string | null; 
  
  rating?: number; 
  completedTrades?: number;
}

export interface DBProfile {
  id: string;
  name: string | null;
  email?: string;
  avatar_url: string | null;
  cover_url?: string | null;
  bio?: string | null;
  major?: string | null;
  academic_year?: string | null;
  
  student_code: string | null; 
  verified_status: 'unverified' | 'pending' | 'verified' | 'rejected';
  is_banned?: boolean;
  ban_until?: string | null;
  ban_reason?: string | null;
  
  role: 'user' | 'admin';
  rating?: number;
  completed_trades?: number; 
  last_seen?: string;
}

export interface VerificationRequest {
  id: string;
  user_id: string;
  student_code: string;
  image_url: string;
  status: 'pending' | 'approved' | 'rejected';
  admin_note?: string;
  created_at: string;
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
  images: string[];
  category: ProductCategory | string;
  status: ProductStatus | string;
  condition: ProductCondition | string;
  
  // DB Fields
  created_at?: string;      
  seller_id?: string;       
  location_name?: string;   
  trade_method?: TradeMethod | string;
  view_count?: number;
  like_count?: number;
  tags?: string[];

  // UI Fields (Map từ DB sang)
  sellerId: string;         
  postedAt: string;         
  tradeMethod: TradeMethod | string; 
  location?: string;        
  
  isLookingToBuy?: boolean; 
  buyerId?: string;
  campus?: Campus | string; 
  
  seller?: User | any;      
  profiles?: DBProfile;     

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
  
  productId?: string;
  userId?: string;
  userName?: string;
  userAvatar?: string;
  createdAt?: string;
  
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
