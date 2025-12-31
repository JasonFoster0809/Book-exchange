// src/types.ts

// --- ENUMS (DANH MỤC CỐ ĐỊNH) ---

export enum ProductCategory {
  TEXTBOOK = 'Textbook',
  ELECTRONICS = 'Electronics',
  SUPPLIES = 'School Supplies',
  CLOTHING = 'Uniforms/Clothing',
  OTHER = 'Other'
}

export enum TradeMethod {
  DIRECT = 'Direct Meetup',
  LOCKER = 'Smart Locker (Indirect)',
  BOTH = 'Flexible'
}

export enum ProductCondition {
  NEW = 'Brand New',
  LIKE_NEW = 'Like New',
  GOOD = 'Good',
  FAIR = 'Fair',
  POOR = 'Poor'
}

// Enum trạng thái sản phẩm
export enum ProductStatus {
  AVAILABLE = 'available', // Đang bán
  PENDING = 'pending',     // Đang giao dịch
  SOLD = 'sold'            // Đã bán
}

// Enum trạng thái săn tin
export enum HuntStatus {
  ACTIVE = 'active',       // Đang tìm kiếm
  PENDING = 'pending',     // Đang thương lượng
  COMPLETED = 'completed'  // Đã mua được
}

// --- INTERFACES (CẤU TRÚC DỮ LIỆU) ---

export interface User {
  id: string;
  email?: string;
  name: string;
  studentId: string;
  avatar: string;
  isVerified: boolean;
  role?: 'user' | 'admin';
}

export interface Product {
  id: string;
  sellerId: string;
  title: string;
  description: string;
  price: number;
  category: ProductCategory | string;
  condition: ProductCondition | string;
  images: string[];
  tradeMethod: TradeMethod | string;
  postedAt: string;
  isLookingToBuy?: boolean;
  
  status: ProductStatus | string; 
  buyerId?: string;

  // [ĐÃ CÓ] Đánh dấu tin đã tim
  isLiked?: boolean; 
  
  // [MỚI THÊM] Đếm lượt xem
  view_count?: number;
}

export interface Hunt {
  id: string;
  userId: string;
  keyword: string;
  status: HuntStatus | string;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  text: string;
  timestamp: number;
}

export interface ChatSession {
  id: string;
  participants: User[];
  lastMessage: string;
  unreadCount: number;
}

export interface DBProfile {
  id: string;
  name: string | null;
  student_id: string | null;
  avatar_url: string | null;
  is_verified: boolean;
  role: string;
}

export interface Review {
  id: string;
  reviewerId: string;
  reviewerName: string;
  reviewerAvatar: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface Comment {
  id: string;
  productId: string;
  userId: string;
  userName: string;
  userAvatar: string;
  content: string;
  createdAt: string;
  parentId: string | null;
  replies?: Comment[];
}

export interface Report {
  id: string;
  reason: string;
  status: 'pending' | 'resolved' | 'dismissed';
  created_at: string;
  product?: Product;
  reporter?: DBProfile;
}