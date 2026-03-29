/**
 * Google Indexing Service
 * Handles Google Indexing API submissions with service account authentication
 * 
 * ⚠️ IMPORTANT LIMITATIONS:
 * - Google Indexing API quota: 200 requests/day per GCP PROJECT (not per service account)
 * - Multi-key rotation only works if service accounts come from DIFFERENT GCP projects
 * - Official usage: JobPosting and BroadcastEvent pages only
 * - Using for other content types may result in API access revocation
 */
import { google } from 'googleapis';
import { JWT } from 'google-auth-library';
import { db } from '../db/index.js';
import { serviceKeys } from '../db/schema.js';
import { eq, asc, and } from 'drizzle-orm';
import { decrypt } from '../lib/crypto.js';

const INDEXING_API_ENDPOINT = 'https://indexing.googleapis.com/v3/urlNotifications:publish';
const SCOPES = ['https://www.googleapis.com/auth/indexing'];

interface IndexingResult {
  success: boolean;
  error?: string;
}

/**
 * Selects the least-used service key for a user (round-robin)
 */
export async function selectLeastUsedKey(userId: string): Promise<typeof serviceKeys.$inferSelect | null> {
  const keys = await db
    .select()
    .from(serviceKeys)
    .where(eq(serviceKeys.userId, userId))
    .orderBy(asc(serviceKeys.dailyUsed));
  
  if (keys.length === 0) {
    return null;
  }
  
  // Find first key with available quota
  const availableKey = keys.find(key => key.dailyUsed < key.dailyLimit);
  
  return availableKey || null;
}

/**
 * Creates an authenticated JWT client from encrypted service account credentials
 */
function createAuthClient(encryptedCredentials: string): JWT {
  const credentialsJSON = decrypt(encryptedCredentials);
  const credentials = JSON.parse(credentialsJSON);
  
  return new JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: SCOPES,
  });
}

/**
 * Submits a URL to Google Indexing API
 */
export async function submitToGoogleIndexing(
  url: string,
  keyId: string
): Promise<IndexingResult> {
  try {
    // Fetch the service key
    const [key] = await db
      .select()
      .from(serviceKeys)
      .where(eq(serviceKeys.id, keyId))
      .limit(1);
    
    if (!key) {
      return { success: false, error: 'Service key not found' };
    }
    
    // Check quota
    if (key.dailyUsed >= key.dailyLimit) {
      return { success: false, error: 'Daily quota exceeded for this key' };
    }
    
    // Create authenticated client
    const authClient = createAuthClient(key.encryptedCredentials);
    
    // Make API request
    const response = await authClient.request({
      url: INDEXING_API_ENDPOINT,
      method: 'POST',
      data: {
        url: url,
        type: 'URL_UPDATED',
      },
    });
    
    if (response.status === 200) {
      // Increment usage counter
      await db
        .update(serviceKeys)
        .set({ dailyUsed: key.dailyUsed + 1 })
        .where(eq(serviceKeys.id, keyId));
      
      return { success: true };
    }
    
    return { 
      success: false, 
      error: `API returned status ${response.status}` 
    };
    
  } catch (error: any) {
    const errorMessage = error?.response?.data?.error?.message || error.message || 'Unknown error';
    return { 
      success: false, 
      error: `Google API error: ${errorMessage}` 
    };
  }
}

/**
 * Checks if a user has any service keys with available quota
 */
export async function hasAvailableQuota(userId: string): Promise<boolean> {
  const key = await selectLeastUsedKey(userId);
  return key !== null;
}
