# IndexBoost API Tests

Test suite for IndexBoost API covering unit tests, integration tests, and regression tests.

## 📦 Test Structure

```
tests/
├── unit.test.ts         # Unit tests (no DB/Redis required)
├── integration.test.ts  # Integration tests (requires Docker)
├── regression.test.ts   # Regression tests (mocked APIs)
└── README.md
```

## 🚀 Running Tests

### Prerequisites

```bash
# Install dependencies
npm install

# For integration tests, start PostgreSQL + Redis
cd ../..
docker-compose up -d postgres redis
```

### Run All Tests

```bash
npm test
```

### Run Tests in Watch Mode

```bash
npm run test:watch
```

### Run Tests with UI

```bash
npm run test:ui
```

### Run Tests with Coverage

```bash
npm run test:coverage
```

### Run Specific Test File

```bash
npx vitest tests/unit.test.ts
npx vitest tests/integration.test.ts
npx vitest tests/regression.test.ts
```

## 📝 Test Categories

### Unit Tests (`unit.test.ts`)

Tests isolated functions without external dependencies (DB, Redis, APIs).

**Covers:**
- ✅ Crypto module (encrypt/decrypt round-trip)
- ✅ Service account JSON validation
- ✅ Config validation (env vars)
- ✅ Key selection logic (least-used algorithm)

**No dependencies required** — runs instantly.

### Integration Tests (`integration.test.ts`)

Tests the full stack with real PostgreSQL and Redis.

**Covers:**
- ✅ Database operations (insert, update, query)
- ✅ Service key management
- ✅ Quota tracking and reset
- ✅ Submission history
- ✅ Queue operations (BullMQ)

**Requires:**
- PostgreSQL (Docker: `indexboost-postgres`)
- Redis (Docker: `indexboost-redis`)

**Setup:**
```bash
cd ../..
docker-compose up -d postgres redis

# Wait for services to be ready (10-15 seconds)
docker-compose ps

# Run tests
cd apps/api
npm test integration
```

### Regression Tests (`regression.test.ts`)

Tests API behavior with mocked external services (no real API calls).

**Covers:**
- ✅ Google Indexing API success path
- ✅ Google Indexing API error paths (quota exceeded, auth error)
- ✅ IndexNow submission (success/error)
- ✅ BullMQ retry logic (exponential backoff)
- ✅ URL validation
- ✅ Rate limiting logic

**No external dependencies** — all APIs are mocked.

## 🐛 Troubleshooting

### Tests fail with "Cannot connect to database"

**Problem:** PostgreSQL not running or wrong connection string.

**Solution:**
```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# Start PostgreSQL
docker-compose up -d postgres

# Verify connection
psql postgresql://indexboost:indexboost@localhost:5432/indexboost
```

### Tests fail with "Redis connection refused"

**Problem:** Redis not running.

**Solution:**
```bash
# Check if Redis is running
docker ps | grep redis

# Start Redis
docker-compose up -d redis

# Verify connection
redis-cli ping
```

### Tests timeout

**Problem:** Database migrations not applied.

**Solution:**
```bash
npm run db:push
```

### Module import errors

**Problem:** TypeScript paths not resolved.

**Solution:**
```bash
# Rebuild
npm run build

# Or use tsx in watch mode
npm run dev
```

## 🎯 Test Coverage

Run coverage report:

```bash
npm run test:coverage
```

Coverage report will be generated in `coverage/` folder.

**Target coverage:**
- Statements: > 80%
- Branches: > 75%
- Functions: > 80%
- Lines: > 80%

## 🔄 CI/CD Integration

### GitHub Actions

Example workflow:

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: indexboost
          POSTGRES_PASSWORD: indexboost
          POSTGRES_DB: indexboost
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      
      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - run: npm install
      - run: npm run db:push
      - run: npm test
```

## 📚 Writing New Tests

### Unit Test Example

```typescript
import { describe, it, expect } from 'vitest';

describe('My Feature', () => {
  it('should do something', () => {
    const result = myFunction('input');
    expect(result).toBe('expected output');
  });
});
```

### Integration Test Example

```typescript
import { describe, it, expect, beforeAll } from 'vitest';
import { db } from '../src/db/index.js';

describe('My Database Feature', () => {
  beforeAll(async () => {
    // Setup test data
  });

  it('should query database', async () => {
    const result = await db.select().from(myTable);
    expect(result).toHaveLength(1);
  });
});
```

### Mocked API Test Example

```typescript
import { describe, it, expect, vi } from 'vitest';

vi.mock('../src/services/external-api.js', () => ({
  callExternalAPI: vi.fn(() => Promise.resolve({ success: true })),
}));

describe('My API Feature', () => {
  it('should call external API', async () => {
    const { callExternalAPI } = await import('../src/services/external-api.js');
    const result = await callExternalAPI('test');
    expect(result.success).toBe(true);
  });
});
```

## 🔗 Resources

- [Vitest Documentation](https://vitest.dev/)
- [BullMQ Testing](https://docs.bullmq.io/guide/testing)
- [Drizzle ORM Testing](https://orm.drizzle.team/docs/testing)
- [Fastify Testing](https://www.fastify.io/docs/latest/Guides/Testing/)
