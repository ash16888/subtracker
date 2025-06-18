export type InsightType = 
  | 'optimization' 
  | 'duplicate' 
  | 'warning' 
  | 'trend'
  | 'forecast'
  | 'category'
  | 'analysis';

export type InsightPriority = 'high' | 'medium' | 'low';

export interface AIInsight {
  id: string;
  type: InsightType;
  priority: InsightPriority;
  title: string;
  description: string;
  actionItems?: string[];
  potentialSavings?: number;
  affectedSubscriptions?: string[];
  createdAt: Date;
}

export interface GenerateInsightsRequest {
  subscriptions: Array<{
    id: string;
    name: string;
    amount: number;
    currency: string;
    billing_period: 'monthly' | 'yearly';
    next_payment_date: string;
    category?: string;
    url?: string;
  }>;
  userId: string;
}

export interface GenerateInsightsResponse {
  insights: AIInsight[];
  generatedAt: Date;
}