// --- ENUMS (DANH MỤC CỐ ĐỊNH) ---

export enum Campus {
  CS1 = 'Quận 10 (CS1)',
  CS2 = 'Dĩ An (CS2)',
  OTHER = 'Khác'
}

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

export enum ProductStatus {
  AVAILABLE = 'available',
  PENDING = 'pending',
  SOLD = 'sold'
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
  role: 'user' | 'admin'; // Bỏ dấu ? để bắt buộc xác định quyền
  rating?: number; 
  completedTrades?: number;
  
  // --- THÊM CHO HỆ THỐNG XỬ PHẠT ---
  banUntil?: string | null; 
  banned?: boolean; 
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
  campus?: Campus | string; 
  
  // Liên kết người bán
  seller?: User | any;

  isLiked?: boolean;
  view_count?: number;
  isGoodPrice?: boolean;
}

// Interface này khớp chính xác với bảng 'profiles' trong Supabase
export interface DBProfile {
  id: string;
  name: string | null;
  email?: string; // Thêm email
  student_id: string | null;
  avatar_url: string | null;
  cover_url?: string | null; // Thêm ảnh bìa
  bio?: string | null;        // Thêm tiểu sử
  major?: string | null;      // Thêm ngành học
  academic_year?: string | null; // Thêm khóa học
  is_verified: boolean;
  role: string;
  rating?: number;
  completed_trades?: number; 
  last_seen?: string;        // Thêm thời gian hoạt động cuối
  
  // --- QUAN TRỌNG: ĐỂ ĐỒNG BỘ VỚI ADMIN & AUTH ---
  banned?: boolean;
  ban_until?: string | null;
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
  conversation_id: string; // Thêm id cuộc hội thoại
  sender_id: string;       // Đổi camelCase sang snake_case để khớp DB
  content: string;         // Đổi text thành content
  type: 'text' | 'image' | 'location'; // Thêm phân loại tin nhắn
  image_url?: string;
  created_at: string;      // Dùng string/ISO thay vì timestamp number
}

export interface ChatSession {
  id: string;
  participant1: string;
  participant2: string;
  partnerName?: string;
  partnerAvatar?: string;
  partnerId?: string;
  isPartnerRestricted?: boolean; // Cảnh báo đối phương bị ban
  last_message?: string;
  unread_count?: number;
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
  product_id: string;   // Thêm để dễ truy vấn
  reporter_id: string;  // Thêm để dễ truy vấn
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