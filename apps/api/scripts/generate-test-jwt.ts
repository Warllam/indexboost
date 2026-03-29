/**
 * Generate Test JWT Token
 * 
 * Crée un JWT token de test pour l'utilisateur demo@indexboost.app
 * Usage: tsx scripts/generate-test-jwt.ts
 */

import jwt from 'jsonwebtoken';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load .env from parent directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error('❌ JWT_SECRET not found in .env file');
  console.error('Run: npm run generate-keys');
  process.exit(1);
}

const payload = {
  sub: '1', // User ID (matches seeded user)
  email: 'demo@indexboost.app',
  name: 'Demo User',
};

const token = jwt.sign(payload, JWT_SECRET, {
  algorithm: 'HS256',
  expiresIn: '30d',
});

console.log('🔑 Test JWT Token Generated\n');
console.log('User:', payload.email);
console.log('Expires:', '30 days');
console.log('\nToken:');
console.log(token);
console.log('\n✅ Copy this token to test protected endpoints');
console.log('\nExample:');
console.log(`export JWT_TOKEN="${token}"`);
console.log('curl -H "Authorization: Bearer $JWT_TOKEN" http://localhost:3000/api/status');
