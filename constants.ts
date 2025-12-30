import { Product, ProductCategory, ProductCondition, TradeMethod, User } from './types';

export const CURRENT_USER: User = {
  id: 'u1',
  name: 'Minh Student',
  studentId: '20215001',
  avatar: 'https://picsum.photos/id/64/100/100',
  isVerified: true,
};

export const MOCK_USERS: Record<string, User> = {
  'u2': {
    id: 'u2',
    name: 'Lan Nguyen',
    studentId: '20201234',
    avatar: 'https://picsum.photos/id/65/100/100',
    isVerified: true,
  },
  'u3': {
    id: 'u3',
    name: 'Hung Tran',
    studentId: '20229876',
    avatar: 'https://picsum.photos/id/66/100/100',
    isVerified: false,
  }
};

export const MOCK_PRODUCTS: Product[] = [
  {
    id: 'p1',
    sellerId: 'u2',
    title: 'Calculus 1 Textbook - James Stewart',
    description: 'Used for one semester. Some highlighting but pages are clean. Essential for MATH101.',
    price: 150000,
    category: ProductCategory.TEXTBOOK,
    condition: ProductCondition.GOOD,
    images: ['https://picsum.photos/id/24/400/300'],
    tradeMethod: TradeMethod.LOCKER,
    postedAt: '2023-10-25T10:00:00Z',
  },
  {
    id: 'p2',
    sellerId: 'u3',
    title: 'Casio FX-580VN X',
    description: 'Lost the cover case, but works perfectly. Battery replaced last month.',
    price: 300000,
    category: ProductCategory.ELECTRONICS,
    condition: ProductCondition.FAIR,
    images: ['https://picsum.photos/id/3/400/300'],
    tradeMethod: TradeMethod.DIRECT,
    postedAt: '2023-10-26T14:30:00Z',
  },
  {
    id: 'p3',
    sellerId: 'u2',
    title: 'Lab Coat (Size M)',
    description: 'Clean, white lab coat for Chemistry labs. No stains.',
    price: 80000,
    category: ProductCategory.CLOTHING,
    condition: ProductCondition.LIKE_NEW,
    images: ['https://picsum.photos/id/40/400/300'],
    tradeMethod: TradeMethod.BOTH,
    postedAt: '2023-10-27T09:15:00Z',
  },
  {
    id: 'p4',
    sellerId: 'u3',
    title: 'Looking for: Architecture Drafting Table',
    description: 'I need a portable drafting table for my final project. Budget around 500k.',
    price: 500000,
    category: ProductCategory.SUPPLIES,
    condition: ProductCondition.GOOD,
    images: ['https://picsum.photos/id/20/400/300'],
    tradeMethod: TradeMethod.DIRECT,
    postedAt: '2023-10-28T08:00:00Z',
    isLookingToBuy: true,
  }
];