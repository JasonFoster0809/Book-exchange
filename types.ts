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
    name: string;
    studentId: string; // MSSV
    avatar: string;
    isVerified: boolean;
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
    isLookingToBuy?: boolean; // True if this is a "Wanted" post
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