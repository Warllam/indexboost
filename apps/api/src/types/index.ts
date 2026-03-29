/**
 * Types partagés pour l'API IndexBoost
 * 
 * Définit les interfaces et types utilisés dans toute l'application.
 */

export type UserPlan = 'free' | 'pro' | 'business';

export type GoogleStatus = 'pending' | 'success' | 'failed' | 'quota_exceeded';
export type IndexNowStatus = 'pending' | 'success' | 'failed' | 'skipped';

export interface ServiceAccountCredentials {
  type: string;
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id: string;
  auth_uri: string;
  token_uri: string;
  auth_provider_x509_cert_url: string;
  client_x509_cert_url: string;
}

export interface SubmitRequest {
  urls: string[];
}

export interface SubmitResponse {
  accepted: number;
  rejected: number;
  errors: Array<{
    url: string;
    reason: string;
  }>;
}

export interface StatusResponse {
  totalKeys: number;
  keysAvailable: number;
  keysExhausted: number;
  totalQuota: number;
  usedQuota: number;
  remainingQuota: number;
  nextReset: string;
}

export interface HistoryItem {
  id: number;
  url: string;
  googleStatus: GoogleStatus;
  indexnowStatus: IndexNowStatus;
  keyUsed: number | null;
  errorMessage: string | null;
  attempts: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface HistoryResponse {
  items: HistoryItem[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface ServiceKeyInfo {
  id: number;
  name: string;
  dailyLimit: number;
  dailyUsed: number;
  lastReset: Date;
  projectId: string;
  clientEmail: string;
}

export interface CreateKeyRequest {
  name: string;
  credentials: ServiceAccountCredentials;
  dailyLimit?: number;
}

export interface UpdateKeyRequest {
  name?: string;
  dailyLimit?: number;
}

export interface JWTPayload {
  sub: string; // user id
  email: string;
  name?: string;
  iat?: number;
  exp?: number;
}

export interface JobData {
  userId: string;
  url: string;
  submissionId: number;
}

export interface GoogleIndexResult {
  success: boolean;
  keyId: number;
  error?: string;
}

export interface IndexNowResult {
  success: boolean;
  error?: string;
}
