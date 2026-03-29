# IndexBoost API

Backend API for IndexBoost - automated Google Indexing & IndexNow submission service.

## 🚀 Tech Stack

- **Framework:** Fastify + TypeScript
- **Database:** PostgreSQL 16 + Drizzle ORM
- **Queue:** BullMQ + Redis
- **APIs:** Google Indexing API, IndexNow

## 📦 Features

- **URL Submission:** Batch submit URLs for indexing
- **Queue Management:** BullMQ workers with retry logic and exponential backoff
- **Quota Tracking:** Daily limits per service account with automatic reset at midnight UTC
  - ⚠️ **Google Indexing API quota: 200 requests/day per GCP PROJECT** (not per service account)
  - Multi-key rotation works only if service accounts come from **different GCP projects**
- **Service Key Management:** Encrypted storage of Google Service Account credentials (AES-256-GCM)
- **Status Monitoring:** Real-time quota usage and queue statistics
- **Rate Limiting:** 100 requests/minute per IP
- **Graceful Shutdown:** Clean resource cleanup on SIGTERM/SIGINT

### ⚠️ Google Indexing API Restrictions

The Google Indexing API is **officially limited to**:
- **JobPosting** pages (job listings)
- **BroadcastEvent** pages (live streams)

Using it for other content types may result in API access revocation. Consider using **IndexNow** as a safer alternative for general web pages.

## 🛠️ Setup

### Prerequisites

- Node.js 20+
- Docker & Docker Compose (for PostgreSQL & Redis)
- Google Cloud Service Account with Indexing API enabled

### Installation

1. **Clone and install dependencies:**

```bash
cd /home/warllam/clawd/projects/indexboost/apps/api
npm install
```

2. **Configure environment variables:**

```bash
cp .env.example .env
```

Edit `.env`:

```env
DATABASE_URL=postgresql://indexboost:indexboost@localhost:5432/indexboost
REDIS_URL=redis://localhost:6379
PORT=4000
CORS_ORIGIN=http://localhost:3000
ENCRYPTION_KEY=your-32-byte-hex-key-here  # Generate: openssl rand -hex 32
NODE_ENV=development
```

3. **Start infrastructure (PostgreSQL + Redis):**

```bash
cd ../..  # Go to project root
docker-compose up -d postgres redis
```

4. **Run database migrations:**

```bash
npm run db:push
```

5. **Start the API:**

```bash
# Development (with hot reload)
npm run dev

# Production build
npm run build
npm start
```

## 📡 API Endpoints

### POST /api/submit

Submit URLs for indexing.

**Request:**
```json
{
  "urls": ["https://example.com/page1", "https://example.com/page2"],
  "userId": "user-uuid"
}
```

**Response:**
```json
{
  "accepted": ["https://example.com/page1"],
  "rejected": [
    {
      "url": "https://example.com/page2",
      "reason": "Invalid URL format"
    }
  ],
  "queued": 1
}
```

### GET /api/status?userId=uuid

Get quota usage and queue statistics.

**Response:**
```json
{
  "quota": {
    "totalCapacity": 200,
    "totalUsed": 45,
    "available": 155,
    "keys": [
      {
        "id": "key-uuid",
        "name": "Production Key",
        "used": 45,
        "limit": 200,
        "available": 155
      }
    ]
  },
  "queues": {
    "google": { "pending": 12, "completed": 45, "failed": 0 },
    "indexnow": { "pending": 8, "completed": 50, "failed": 2 }
  }
}
```

### GET /api/history?userId=uuid&limit=50&offset=0&status=success

Get paginated submission history.

**Response:**
```json
{
  "submissions": [
    {
      "id": "submission-uuid",
      "url": "https://example.com/page1",
      "googleStatus": "success",
      "indexnowStatus": "success",
      "attempts": 1,
      "errorMessage": null,
      "createdAt": "2024-01-01T12:00:00Z",
      "updatedAt": "2024-01-01T12:01:00Z"
    }
  ],
  "pagination": {
    "limit": 50,
    "offset": 0,
    "total": 120,
    "hasMore": true
  }
}
```

### POST /api/keys

Add a new Google Service Account.

**Request:**
```json
{
  "userId": "user-uuid",
  "name": "Production Key",
  "serviceAccountJson": "{\"type\":\"service_account\",\"project_id\":\"...\"}",
  "dailyLimit": 200
}
```

**Response:**
```json
{
  "id": "key-uuid",
  "name": "Production Key",
  "dailyLimit": 200,
  "createdAt": "2024-01-01T12:00:00Z"
}
```

### GET /api/keys?userId=uuid

List all service keys (credentials not exposed).

### DELETE /api/keys/:id?userId=uuid

Delete a service key.

## 🔐 Security

- **Encryption:** Service account credentials encrypted with AES-256-GCM
- **Rate Limiting:** 100 req/min per IP
- **CORS:** Restricted to configured origin
- **Input Validation:** Zod schemas for all endpoints

## 🐳 Docker

### Build and run with Docker Compose:

```bash
# Full stack (PostgreSQL + Redis + API)
docker-compose up -d

# Infrastructure only (for local development)
docker-compose up -d postgres redis
```

### Build API image manually:

```bash
cd apps/api
docker build -t indexboost-api .
```

## 📊 Database Schema

### Users
- `id` (uuid, PK)
- `email` (varchar, unique)
- `name` (varchar)
- `plan` (enum: free/pro/business)
- `created_at` (timestamp)

### Service Keys
- `id` (uuid, PK)
- `user_id` (uuid, FK → users)
- `name` (varchar)
- `encrypted_credentials` (text)
- `daily_limit` (int, default: 200)
- `daily_used` (int, default: 0)
- `last_reset` (timestamp)
- `created_at` (timestamp)

### Submissions
- `id` (uuid, PK)
- `user_id` (uuid, FK → users)
- `url` (text)
- `google_status` (enum: pending/queued/success/failed)
- `indexnow_status` (enum: pending/queued/success/failed)
- `key_used` (uuid, FK → service_keys)
- `error_message` (text, nullable)
- `attempts` (int, default: 0)
- `created_at` (timestamp)
- `updated_at` (timestamp)

## 🔄 Queue System

- **Google Indexing Queue:** 5 concurrent workers, 3 retry attempts with exponential backoff (5s → 25s → 125s)
- **IndexNow Queue:** 10 concurrent workers, same retry logic
- **Quota Reset Job:** Runs daily at midnight UTC, resets `daily_used` to 0 for all keys

## 🧪 Development

```bash
# Watch mode with hot reload
npm run dev

# Generate Drizzle migrations
npm run db:generate

# Push schema to database
npm run db:push

# Open Drizzle Studio (GUI)
npm run db:studio
```

## 📝 Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string | ✅ | - |
| `REDIS_URL` | Redis connection string | ✅ | - |
| `ENCRYPTION_KEY` | 32+ char encryption key | ✅ | - |
| `PORT` | API server port | ❌ | 4000 |
| `CORS_ORIGIN` | Allowed CORS origin | ❌ | http://localhost:3000 |
| `NODE_ENV` | Environment mode | ❌ | development |

## 🐛 Troubleshooting

### Database connection failed
```bash
# Check PostgreSQL is running
docker ps | grep postgres

# Test connection
psql postgresql://indexboost:indexboost@localhost:5432/indexboost
```

### Redis connection failed
```bash
# Check Redis is running
docker ps | grep redis

# Test connection
redis-cli ping
```

### Google API errors
- Verify service account JSON is valid
- Check that Indexing API is enabled in Google Cloud Console
- Ensure service account has `Indexing API User` role

## 📄 License

MIT
