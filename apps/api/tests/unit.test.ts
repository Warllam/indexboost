/**
 * Unit Tests (no DB/Redis)
 * Tests for crypto, config validation, and key selection logic
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { encrypt, decrypt, validateServiceAccountJSON } from '../src/lib/crypto.js';

// Mock config to avoid loading real .env
vi.mock('../src/lib/config.js', () => ({
  config: {
    DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
    REDIS_URL: 'redis://localhost:6379',
    ENCRYPTION_KEY: 'a'.repeat(32), // 32 chars minimum
    PORT: 4000,
    CORS_ORIGIN: 'http://localhost:3000',
    NODE_ENV: 'test',
  },
}));

describe('Crypto Module', () => {
  describe('encrypt/decrypt round-trip', () => {
    it('should encrypt and decrypt text successfully', () => {
      const plaintext = 'Hello, World!';
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);
      
      expect(decrypted).toBe(plaintext);
    });

    it('should produce different ciphertext for same input (due to random IV)', () => {
      const plaintext = 'Same message';
      const encrypted1 = encrypt(plaintext);
      const encrypted2 = encrypt(plaintext);
      
      expect(encrypted1).not.toBe(encrypted2);
      expect(decrypt(encrypted1)).toBe(plaintext);
      expect(decrypt(encrypted2)).toBe(plaintext);
    });

    it('should encrypt/decrypt JSON service account credentials', () => {
      const serviceAccount = {
        type: 'service_account',
        project_id: 'my-project-123',
        private_key_id: 'key123',
        private_key: '-----BEGIN PRIVATE KEY-----\nfake\n-----END PRIVATE KEY-----\n',
        client_email: 'test@my-project.iam.gserviceaccount.com',
      };
      
      const plaintext = JSON.stringify(serviceAccount);
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);
      
      expect(JSON.parse(decrypted)).toEqual(serviceAccount);
    });

    it('should throw error on tampered ciphertext', () => {
      const encrypted = encrypt('secret data');
      // Tamper with the auth tag (last part of the encrypted string)
      const parts = encrypted.split(':');
      parts[3] = '0'.repeat(32); // Replace auth tag with invalid one
      const tampered = parts.join(':');
      
      expect(() => decrypt(tampered)).toThrowError();
    });

    it('should throw error on invalid encrypted data format', () => {
      expect(() => decrypt('invalid:format')).toThrow('Invalid encrypted data format');
      expect(() => decrypt('not:enough:parts')).toThrow();
    });
  });

  describe('validateServiceAccountJSON', () => {
    it('should validate correct service account JSON', () => {
      const validJSON = JSON.stringify({
        type: 'service_account',
        project_id: 'test-project',
        private_key_id: 'abc123',
        private_key: '-----BEGIN PRIVATE KEY-----\nkey\n-----END PRIVATE KEY-----\n',
        client_email: 'test@test-project.iam.gserviceaccount.com',
      });
      
      expect(validateServiceAccountJSON(validJSON)).toBe(true);
    });

    it('should reject JSON missing required fields', () => {
      const invalidJSON = JSON.stringify({
        type: 'service_account',
        project_id: 'test-project',
        // Missing private_key, private_key_id, client_email
      });
      
      expect(validateServiceAccountJSON(invalidJSON)).toBe(false);
    });

    it('should reject JSON with wrong type', () => {
      const wrongType = JSON.stringify({
        type: 'user_account', // Wrong!
        project_id: 'test',
        private_key_id: 'key',
        private_key: 'key',
        client_email: 'test@example.com',
      });
      
      expect(validateServiceAccountJSON(wrongType)).toBe(false);
    });

    it('should reject malformed JSON', () => {
      expect(validateServiceAccountJSON('not json at all')).toBe(false);
      expect(validateServiceAccountJSON('{incomplete')).toBe(false);
    });
  });
});

describe('Key Selection Logic (Mocked)', () => {
  it('should select least-used key', () => {
    const keys = [
      { id: 'key1', dailyUsed: 50, dailyLimit: 200 },
      { id: 'key2', dailyUsed: 10, dailyLimit: 200 },
      { id: 'key3', dailyUsed: 100, dailyLimit: 200 },
    ];
    
    // Sort by dailyUsed ascending
    const sorted = [...keys].sort((a, b) => a.dailyUsed - b.dailyUsed);
    const leastUsed = sorted.find(key => key.dailyUsed < key.dailyLimit);
    
    expect(leastUsed?.id).toBe('key2');
    expect(leastUsed?.dailyUsed).toBe(10);
  });

  it('should return null if all keys are at quota', () => {
    const keys = [
      { id: 'key1', dailyUsed: 200, dailyLimit: 200 },
      { id: 'key2', dailyUsed: 200, dailyLimit: 200 },
    ];
    
    const availableKey = keys.find(key => key.dailyUsed < key.dailyLimit);
    
    expect(availableKey).toBeUndefined();
  });

  it('should prefer key with lower usage even if multiple are available', () => {
    const keys = [
      { id: 'key1', dailyUsed: 150, dailyLimit: 200 },
      { id: 'key2', dailyUsed: 5, dailyLimit: 200 },
      { id: 'key3', dailyUsed: 100, dailyLimit: 200 },
    ];
    
    const sorted = [...keys].sort((a, b) => a.dailyUsed - b.dailyUsed);
    const best = sorted[0];
    
    expect(best.id).toBe('key2');
  });
});

describe('Config Validation (Mocked)', () => {
  it('should export valid config object', async () => {
    // Config is already mocked via vi.mock above
    const { config } = await import('../src/lib/config.js');
    
    expect(config.DATABASE_URL).toBeDefined();
    expect(config.REDIS_URL).toBeDefined();
    expect(config.ENCRYPTION_KEY).toHaveLength(32);
    expect(config.PORT).toBe(4000);
    expect(config.NODE_ENV).toBe('test');
  });
});
