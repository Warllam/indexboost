/**
 * API Test Script
 * 
 * Test basique pour vérifier que l'API fonctionne correctement
 * Usage: tsx scripts/test-api.ts
 */

import jwt from 'jsonwebtoken';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });

const API_URL = process.env.API_URL || 'http://localhost:3000';
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error('❌ JWT_SECRET not found in .env');
  process.exit(1);
}

// Generate test token
const token = jwt.sign(
  {
    sub: '1',
    email: 'demo@indexboost.app',
    name: 'Demo User',
  },
  JWT_SECRET,
  { expiresIn: '1h' }
);

async function test() {
  console.log('🧪 Testing IndexBoost API\n');
  console.log(`API URL: ${API_URL}\n`);

  try {
    // Test 1: Health check
    console.log('1️⃣  Testing health endpoint...');
    const healthRes = await fetch(`${API_URL}/health`);
    const health = await healthRes.json();
    
    if (healthRes.ok && health.status === 'ok') {
      console.log('   ✅ Health check passed');
    } else {
      throw new Error('Health check failed');
    }

    // Test 2: Status endpoint (with auth)
    console.log('\n2️⃣  Testing status endpoint...');
    const statusRes = await fetch(`${API_URL}/api/status`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    
    if (!statusRes.ok) {
      const error = await statusRes.text();
      throw new Error(`Status endpoint failed: ${error}`);
    }
    
    const status = await statusRes.json();
    console.log('   ✅ Status endpoint passed');
    console.log(`   📊 Quotas: ${status.usedQuota}/${status.totalQuota}`);

    // Test 3: Keys endpoint
    console.log('\n3️⃣  Testing keys endpoint...');
    const keysRes = await fetch(`${API_URL}/api/keys`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    
    if (!keysRes.ok) {
      const error = await keysRes.text();
      throw new Error(`Keys endpoint failed: ${error}`);
    }
    
    const keys = await keysRes.json();
    console.log('   ✅ Keys endpoint passed');
    console.log(`   🔑 Total keys: ${keys.length}`);

    // Test 4: History endpoint
    console.log('\n4️⃣  Testing history endpoint...');
    const historyRes = await fetch(`${API_URL}/api/history?page=1&pageSize=5`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    
    if (!historyRes.ok) {
      const error = await historyRes.text();
      throw new Error(`History endpoint failed: ${error}`);
    }
    
    const history = await historyRes.json();
    console.log('   ✅ History endpoint passed');
    console.log(`   📝 Total submissions: ${history.total}`);

    // Test 5: Submit endpoint (dry run - commented out to avoid creating test data)
    console.log('\n5️⃣  Testing submit endpoint...');
    const submitRes = await fetch(`${API_URL}/api/submit`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        urls: [`https://example.com/test-${Date.now()}`],
      }),
    });
    
    if (!submitRes.ok) {
      const error = await submitRes.text();
      throw new Error(`Submit endpoint failed: ${error}`);
    }
    
    const submit = await submitRes.json();
    console.log('   ✅ Submit endpoint passed');
    console.log(`   ✓ Accepted: ${submit.accepted}, Rejected: ${submit.rejected}`);

    console.log('\n✅ All tests passed!\n');
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

test();
