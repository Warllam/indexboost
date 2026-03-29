/**
 * Generate Security Keys
 * 
 * Utility script to generate JWT_SECRET and ENCRYPTION_KEY
 * Usage: tsx scripts/generate-keys.ts
 */

import crypto from 'crypto';

console.log('🔐 IndexBoost Security Keys Generator\n');

// Generate JWT Secret (64 random bytes = 88 base64 chars)
const jwtSecret = crypto.randomBytes(64).toString('base64');
console.log('JWT_SECRET (copy to .env):');
console.log(jwtSecret);
console.log();

// Generate Encryption Key (32 bytes = 64 hex chars for AES-256)
const encryptionKey = crypto.randomBytes(32).toString('hex');
console.log('ENCRYPTION_KEY (copy to .env):');
console.log(encryptionKey);
console.log();

console.log('✅ Keys generated successfully!');
console.log('⚠️  Keep these keys secret and never commit to git');
