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

export interface User {
  id: string;
  email?: string;       // Bắt buộc có dòng này
  name: string;
  studentId: string;
  avatar: string;
  isVerified: boolean;
  role?: 'user' | 'admin'; // Bắt buộc có dòng này
}

export interface Product {
  id: string;
  sellerId: string;
  title: string;
  description: string;
  price: number;
  category: ProductCategory;
  condition: ProductCondition;
  images: string[];
  tradeMethod: TradeMethod;
  postedAt: string;
  isLookingToBuy?: boolean;
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

// BẮT BUỘC PHẢI CÓ CÁI NÀY Ở CUỐI FILE
export interface DBProfile {
  id: string;
  name: string | null;
  student_id: string | null;
  avatar_url: string | null;
  is_verified: boolean;
  role: string;
}