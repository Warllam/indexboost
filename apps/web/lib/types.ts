// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Stats
export interface Stats {
  today: number;
  successRate: number;
  totalIndexed: number;
}

// Quotas
export interface Quota {
  keyName: string;
  used: number;
  limit: number;
}

export interface QuotasResponse {
  quotas: Quota[];
}

// History
export interface HistoryEntry {
  id: string;
  url: string;
  googleStatus: 'success' | 'failed' | 'pending';
  indexnowStatus?: 'success' | 'failed';
  createdAt: string;
}

export interface HistoryResponse {
  entries: HistoryEntry[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// Service Accounts
export interface ServiceAccount {
  id: string;
  name: string;
  email: string;
  quotaUsed: number;
  quotaLimit: number;
  createdAt: string;
}

export interface ServiceAccountsResponse {
  accounts: ServiceAccount[];
}

// URL Submission
export interface UrlSubmitResult {
  url: string;
  status: 'success' | 'failed';
  message?: string;
}

export interface UrlSubmitResponse {
  results: UrlSubmitResult[];
  successCount: number;
  failedCount: number;
}
