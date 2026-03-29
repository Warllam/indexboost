/**
 * Encryption Utilities
 * AES-256-GCM encryption/decryption for sensitive data (service account credentials)
 */
import crypto from 'crypto';
import { config } from './config.js';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;

/**
 * Derives a cryptographic key from the encryption key using PBKDF2
 */
function deriveKey(salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(
    config.ENCRYPTION_KEY,
    salt,
    100000,
    KEY_LENGTH,
    'sha256'
  );
}

/**
 * Encrypts text using AES-256-GCM
 * Returns base64-encoded string: salt:iv:encrypted:authTag
 */
export function encrypt(text: string): string {
  const salt = crypto.randomBytes(SALT_LENGTH);
  const key = deriveKey(salt);
  const iv = crypto.randomBytes(IV_LENGTH);
  
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  // Combine: salt:iv:encrypted:authTag
  return [
    salt.toString('hex'),
    iv.toString('hex'),
    encrypted,
    authTag.toString('hex'),
  ].join(':');
}

/**
 * Decrypts text encrypted with encrypt()
 * Throws error if decryption fails or data is tampered with
 */
export function decrypt(encryptedData: string): string {
  const parts = encryptedData.split(':');
  
  if (parts.length !== 4) {
    throw new Error('Invalid encrypted data format');
  }
  
  const [saltHex, ivHex, encrypted, authTagHex] = parts;
  
  const salt = Buffer.from(saltHex, 'hex');
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  
  const key = deriveKey(salt);
  
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

/**
 * Validates that a string is valid JSON for a Google Service Account
 */
export function validateServiceAccountJSON(jsonString: string): boolean {
  try {
    const parsed = JSON.parse(jsonString);
    return !!(
      parsed.type === 'service_account' &&
      parsed.project_id &&
      parsed.private_key_id &&
      parsed.private_key &&
      parsed.client_email
    );
  } catch {
    return false;
  }
}
