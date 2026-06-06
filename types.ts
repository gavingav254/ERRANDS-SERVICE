export type ErrandCategory = 'Food' | 'Snacks' | 'Groceries' | 'Printing' | 'Airtime' | 'Other';
export type ErrandStatus = 'Pending' | 'Awaiting Payment' | 'Accepted' | 'Shopping' | 'On the way' | 'Delivered';
export type ErrandUrgency = 'Normal' | 'ASAP';
export type PaymentMethod = 'Cash on Delivery' | 'M-Pesa';
export type PaymentStatus = 'Pending Payment' | 'Payment Confirmed' | 'Delivered';

export interface TimelineEvent {
  status: string;
  timestamp: string;
}

export interface Errand {
  id: string;
  orderId: string; // e.g. CR-1001
  fullName: string;
  phoneNumber: string;
  category: ErrandCategory;
  description: string;
  location: string;
  budget?: number | null;
  urgency: ErrandUrgency;
  status: ErrandStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
  estimatedTime?: string | null;
  timeline: TimelineEvent[];
  runnerNote?: string | null;
  notes?: string | null; // Additional optional instructions
  estimatedFee?: number | null; // Calculated delivery fee
  deliveryZone?: 'Campus Delivery' | 'Outside Campus Delivery' | null;
  estimatedItemCost?: number | null;
  totalAmountDue?: number | null;
}

export interface Message {
  id: string;
  senderPhone: string;
  senderRole: 'student' | 'runner';
  senderName: string;
  text: string;
  createdAt: string; // ISO date string
}

