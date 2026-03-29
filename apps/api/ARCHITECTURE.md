# IndexBoost - Architecture Technique

## 🏗️ Vue d'ensemble

IndexBoost est un système d'indexation en masse pour Google et autres moteurs de recherche. Il utilise une architecture asynchrone basée sur des queues pour gérer des milliers de soumissions en parallèle.

```
┌─────────────┐         ┌─────────────┐         ┌──────────────┐
│   Client    │────────▶│   Fastify   │────────▶│  PostgreSQL  │
│   (JWT)     │         │     API     │         │   Database   │
└─────────────┘         └─────────────┘         └──────────────┘
                               │
                               │ Enqueue Jobs
                               ▼
                        ┌─────────────┐
                        │   BullMQ    │
                        │   Queues    │
                        └─────────────┘
                               │
                ┌──────────────┼──────────────┐
                ▼              ▼              ▼
        ┌──────────┐   ┌──────────┐   ┌──────────┐
        │  Google  │   │ IndexNow │   │ Overflow │
        │  Worker  │   │  Worker  │   │  Queue   │
        └──────────┘   └──────────┘   └──────────┘
                │              │              │
                ▼              ▼              │
        ┌──────────┐   ┌──────────┐         │
        │  Google  │   │   Bing   │         │
        │ Indexing │   │  Yandex  │         │
        │   API    │   │ DDG, etc.│         │
        └──────────┘   └──────────┘         │
                                             │
                        ┌────────────────────┘
                        │ Midnight UTC Reset
                        ▼
                  Daily Cron Job
```

## 🔄 Flux de Données

### 1. Soumission d'URLs (`POST /api/submit`)

```
Client
  │
  ├─ JWT Authentication
  │
  ├─ Validation (Zod)
  │   ├─ URL format (http/https)
  │   ├─ No duplicates
  │   └─ Max 1000 URLs/request
  │
  ├─ Create submission records (PostgreSQL)
  │
  ├─ Enqueue jobs (BullMQ)
  │   ├─ google-indexing queue
  │   └─ indexnow queue
  │
  └─ Return { accepted, rejected, errors }
```

### 2. Processing Google Indexing

```
google-indexing Worker
  │
  ├─ Get least used service key (Round-robin)
  │   └─ quotaTracker.getLeastUsedKey()
  │
  ├─ All keys exhausted?
  │   ├─ YES → Move to overflow queue
  │   └─ NO  → Continue
  │
  ├─ Decrypt credentials (AES-256-GCM)
  │
  ├─ Authenticate (google-auth-library)
  │   └─ Get access token (JWT)
  │
  ├─ POST to Google Indexing API
  │   └─ Body: { url, type: "URL_UPDATED" }
  │
  ├─ Success?
  │   ├─ YES
  │   │   ├─ Increment quota usage
  │   │   └─ Update submission: google_status = 'success'
  │   └─ NO
  │       ├─ Quota error? → overflow queue
  │       └─ Other error? → Retry (exponential backoff)
  │
  └─ Retry: 3 attempts (5s, 25s, 125s)
```

### 3. Processing IndexNow

```
indexnow Worker
  │
  ├─ No authentication needed
  │
  ├─ POST to multiple endpoints (parallel)
  │   ├─ api.indexnow.org
  │   ├─ bing.com/indexnow
  │   └─ yandex.com/indexnow
  │
  ├─ Body:
  │   {
  │     host: "example.com",
  │     key: "indexboost",
  │     keyLocation: "https://example.com/indexboost.txt",
  │     urlList: ["https://example.com/page1"]
  │   }
  │
  ├─ At least one success?
  │   ├─ YES → indexnow_status = 'success'
  │   └─ NO  → Retry
  │
  └─ No quota limits (unlimited)
```

### 4. Overflow Management

```
Quota Exhausted
  │
  ├─ Move job to overflow queue
  │
  ├─ Update submission: google_status = 'quota_exceeded'
  │
  └─ Wait for daily reset...

Daily Reset (00:00 UTC)
  │
  ├─ Reset all service keys
  │   └─ daily_used = 0
  │
  ├─ Get all jobs from overflow queue
  │
  └─ Re-submit to google-indexing queue
```

## 🔐 Sécurité

### Authentication Flow

```
Client Request
  │
  ├─ Header: Authorization: Bearer <JWT>
  │
  ├─ authenticateJWT middleware
  │   ├─ Extract token
  │   ├─ Verify signature (HS256)
  │   ├─ Check expiration
  │   └─ Extract payload: { sub, email, name }
  │
  ├─ Attach to request
  │   ├─ request.userId
  │   ├─ request.userEmail
  │   └─ request.userName
  │
  └─ Continue to route handler
```

### Credentials Encryption

```
Service Account JSON
  │
  ├─ AES-256-GCM encryption
  │   ├─ Key: 32 bytes (64 hex chars from .env)
  │   ├─ IV: Random 12 bytes per encryption
  │   └─ Auth Tag: 16 bytes
  │
  ├─ Format: "iv:authTag:ciphertext" (base64)
  │
  └─ Store in PostgreSQL (text column)

Decryption
  │
  ├─ Split "iv:authTag:ciphertext"
  │
  ├─ Decrypt with AES-256-GCM
  │
  └─ Parse JSON → ServiceAccountCredentials
```

### Rate Limiting

```
Rate Limit (100 req/min per user)
  │
  ├─ Key: userId (from JWT) or IP
  │
  ├─ Window: 60 seconds
  │
  ├─ Storage: In-memory (Fastify)
  │
  └─ Response: 429 Too Many Requests
```

## 🔄 Quota Management

### Round-Robin Key Selection

```
quotaTracker.getLeastUsedKey(userId)
  │
  ├─ SELECT * FROM service_keys
  │   WHERE user_id = ?
  │   ORDER BY daily_used ASC
  │
  ├─ Filter: daily_used < daily_limit
  │
  ├─ Return first key (least used)
  │
  └─ Return null if all exhausted
```

### Usage Tracking

```
After successful Google API call
  │
  ├─ Increment service_keys.daily_used
  │
  ├─ Update/Insert quota_usage
  │   ├─ key_id, date, used, limit
  │   └─ For historical tracking
  │
  └─ DB transaction (atomic)
```

### Daily Reset

```
Cron Job (00:00 UTC)
  │
  ├─ UPDATE service_keys
  │   SET daily_used = 0,
  │       last_reset = NOW()
  │
  ├─ Get overflow queue jobs
  │
  ├─ For each job:
  │   ├─ Add to google-indexing queue
  │   └─ Remove from overflow
  │
  └─ Log: "✓ Reset completed. N jobs moved"
```

## 📊 Database Indexes

Performance-critical indexes:

```sql
-- Users lookup by email (auth)
CREATE INDEX users_email_idx ON users(email);

-- Service keys per user
CREATE INDEX service_keys_user_id_idx ON service_keys(user_id);

-- Submissions queries
CREATE INDEX submissions_user_id_idx ON submissions(user_id);
CREATE INDEX submissions_created_at_idx ON submissions(created_at);
CREATE INDEX submissions_google_status_idx ON submissions(google_status);

-- Quota usage lookup
CREATE INDEX quota_usage_key_id_date_idx ON quota_usage(key_id, date);
```

## 🚀 Performance Optimizations

### 1. Connection Pooling

```typescript
// PostgreSQL
max: 20 connections

// Redis
maxRetriesPerRequest: null (BullMQ requirement)
```

### 2. Queue Concurrency

```typescript
// Google Indexing Worker
concurrency: 10 (process 10 jobs in parallel)

// IndexNow Worker
concurrency: 20 (no rate limits, process faster)

// Overflow Worker
concurrency: 5 (drain slowly after reset)
```

### 3. Job Retention

```typescript
removeOnComplete: {
  count: 100,  // Keep last 100 completed
  age: 24 * 3600  // 24 hours
}

removeOnFail: {
  count: 500,  // Keep last 500 failed
  age: 7 * 24 * 3600  // 7 days
}
```

### 4. Batch Operations

```typescript
// IndexNow supports up to 10,000 URLs per request
indexNowService.submitBatch(urls);

// Groups URLs by hostname
// Submits each host group in one request
```

## 🔌 API Integrations

### Google Indexing API

```
Endpoint: https://indexing.googleapis.com/v3/urlNotifications:publish
Method: POST
Auth: OAuth 2.0 (Service Account JWT)
Scope: https://www.googleapis.com/auth/indexing

Body:
{
  "url": "https://example.com/page",
  "type": "URL_UPDATED"
}

Response (Success):
{
  "urlNotificationMetadata": {
    "url": "https://example.com/page",
    "latestUpdate": { ... }
  }
}

Rate Limit: 200 calls/day per service account
```

### IndexNow Protocol

```
Endpoint: https://api.indexnow.org/indexnow (or engine-specific)
Method: POST
Auth: None (public API with key verification)

Body:
{
  "host": "example.com",
  "key": "indexboost",
  "keyLocation": "https://example.com/indexboost.txt",
  "urlList": [
    "https://example.com/page1",
    "https://example.com/page2"
  ]
}

Response: 200 or 202 (accepted)

Rate Limit: None (unlimited, but throttled by endpoint)
```

## 🧪 Error Handling Strategy

### 1. Validation Errors (400)

```typescript
try {
  const validation = schema.safeParse(input);
  if (!validation.success) {
    return reply.status(400).send({
      error: 'Invalid request',
      message: validation.error.errors[0].message
    });
  }
} catch (error) {
  // ...
}
```

### 2. Authentication Errors (401)

```typescript
const payload = verifyToken(token);
// Throws on invalid/expired token

// Caught by authenticateJWT middleware
return reply.status(401).send({
  error: 'Unauthorized',
  message: 'Invalid token'
});
```

### 3. Resource Not Found (404)

```typescript
const user = await db.select()...;
if (user.length === 0) {
  return reply.status(404).send({
    error: 'User not found'
  });
}
```

### 4. Rate Limit (429)

```typescript
// Automatic via @fastify/rate-limit plugin
// Returns 429 when limit exceeded
```

### 5. Server Errors (500)

```typescript
try {
  // ... operation
} catch (error) {
  fastify.log.error(error);
  return reply.status(500).send({
    error: 'Internal server error',
    message: error.message
  });
}
```

### 6. Queue Job Failures

```typescript
// BullMQ automatic retry with exponential backoff
// After 3 failures → marked as failed
// Logged to console
// Stored in Redis for 7 days

googleWorker.on('failed', (job, err) => {
  console.error(`Job ${job.id} failed:`, err.message);
});
```

## 🔧 Maintenance

### Health Check

```bash
curl http://localhost:3000/health
```

Response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "version": "1.0.0"
}
```

### Database Migrations

```bash
# Generate migration from schema changes
npm run db:generate

# Apply migrations
npm run db:migrate

# Drizzle Studio (DB GUI)
npm run db:studio
```

### Queue Monitoring

```typescript
// Get queue stats
const googleStats = await googleQueue.getJobCounts();
// { waiting, active, completed, failed, delayed }

// Get failed jobs
const failed = await googleQueue.getFailed();

// Retry failed job
await job.retry();

// Clean old jobs
await googleQueue.clean(24 * 3600 * 1000, 'completed');
```

### Logs

```bash
# Development (pretty logs)
npm run dev

# Production (JSON logs)
NODE_ENV=production npm start

# Logs are output to stdout (capture with Docker logs, systemd, etc.)
```

## 🚢 Deployment Checklist

- [ ] Set strong JWT_SECRET (64+ chars)
- [ ] Generate unique ENCRYPTION_KEY
- [ ] Configure PostgreSQL with SSL
- [ ] Set Redis password
- [ ] Enable CORS for production domain only
- [ ] Set NODE_ENV=production
- [ ] Configure log aggregation (Datadog, Loki, etc.)
- [ ] Setup error tracking (Sentry)
- [ ] Monitor queue health (Bull Board, custom dashboard)
- [ ] Setup backup strategy for PostgreSQL
- [ ] Configure Redis persistence (AOF)
- [ ] Load balancer for multiple API instances
- [ ] Rate limit at load balancer level
- [ ] CDN for static assets (if any)

## 📈 Scalability

### Horizontal Scaling

```
┌─────────┐
│  NGINX  │  Load Balancer
└────┬────┘
     │
     ├──────┬──────┬──────┐
     ▼      ▼      ▼      ▼
  API-1  API-2  API-3  API-N
     │      │      │      │
     └──────┴──────┴──────┘
            │
     ┌──────┴──────┐
     ▼             ▼
PostgreSQL      Redis
(replicas)    (cluster)
```

- **API**: Stateless, scale horizontally (Docker Swarm, Kubernetes)
- **PostgreSQL**: Read replicas, connection pooling (PgBouncer)
- **Redis**: Cluster mode, sentinel for HA
- **BullMQ Workers**: Separate from API, scale independently

### Bottlenecks

1. **Google API Rate Limit**: 200 calls/day/key
   - Solution: Add more service accounts (keys)
   
2. **PostgreSQL Write Throughput**: Submissions inserts
   - Solution: Batch inserts, use UNLOGGED tables for high write, replicas
   
3. **Redis Memory**: Queue data
   - Solution: Adjust job retention, use Redis cluster

4. **Network**: API → Google API calls
   - Solution: Deploy in same region as Google APIs (us-central1)

## 🎯 Next Steps

1. **Monitoring**: Add Prometheus metrics
2. **Alerting**: Setup alerts for queue depth, error rate
3. **Analytics**: Dashboard for usage stats
4. **Webhooks**: Notify users on completion
5. **Bulk Operations**: CSV/file upload for URLs
6. **Scheduling**: Delayed submission, recurring jobs
7. **Multi-tenancy**: Organization/team support
8. **API Versioning**: /api/v1, /api/v2
