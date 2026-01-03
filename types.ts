// src/types.ts

// --- ENUMS (DANH MỤC CỐ ĐỊNH) ---

// Địa điểm đặc thù của Bách Khoa giúp sinh viên lọc nơi nhận đồ gần nhất
export enum Campus {
  CS1 = 'Quận 10 (CS1)',
  CS2 = 'Dĩ An (CS2)',
  OTHER = 'Khác'
}

export enum ProductCategory {
  TEXTBOOK = 'Textbook',
  ELECTRONICS = 'Electronics', // Linh kiện, mạch nạp cho dân kỹ thuật
  SUPPLIES = 'School Supplies',
  CLOTHING = 'Uniforms/Clothing',
  OTHER = 'Other'
}

export enum TradeMethod {
  DIRECT = 'Direct Meetup', // Ghế đá, thư viện, canteen
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
  role?: 'user' | 'admin';
  rating?: number; 
  // Độ uy tín "Đồng môn": Dân kỹ thuật tin tưởng dựa trên số lượt giao dịch
  completedTrades?: number;
  banUntil?: string | null; 
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
  
  // [FIX] Thêm dấu ? để không báo lỗi khi dữ liệu thiếu campus
  campus?: Campus | string; 

  // [FIX] Thêm trường seller để sửa lỗi ở ProfilePage khi gọi product.seller
  seller?: User | any;

  isLiked?: boolean; // Để UI hiện nút Tim đỏ hay xám
  view_count?: number; // Số lượt xem tin
  isGoodPrice?: boolean; // Nhãn "Giá hời" (tự động hoặc admin set)
}

export interface DBProfile {
  id: string;
  name: string | null;
  student_id: string | null;
  avatar_url: string | null;
  is_verified: boolean;
  role: string;
  rating?: number;
  completed_trades?: number; 
}

// --- CÁC INTERFACE PHỤ TRỢ (CHAT, REVIEW, REPORT) ---

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

export interface Hunt {
  id: string;
  userId: string;
  keyword: string;
  status: HuntStatus | string;
  createdAt: string;
}