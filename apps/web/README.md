# IndexBoost - Frontend

Modern, clean frontend for IndexBoost — a mass Google indexing SaaS built with Next.js 15, TypeScript, and Tailwind CSS.

## Stack

- **Next.js 15** (App Router)
- **TypeScript**
- **Tailwind CSS** + **shadcn/ui**
- **Auth.js (NextAuth v5)** — Google OAuth + Email/Password
- **Lucide Icons**

## Features

- 🚀 **Landing Page** — Simple, conversion-focused design
- 🔐 **Authentication** — Google OAuth and credentials
- 📊 **Dashboard** — Real-time stats and quota monitoring
- 📝 **URL Submission** — Batch submit with live feedback
- 📜 **History** — Complete submission logs with filters
- 🔑 **Service Key Management** — Upload and manage Google service accounts
- ⚙️ **Settings** — Profile management

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Copy `.env.local.example` to `.env.local`:

```bash
cp .env.local.example .env.local
```

Fill in the required values:

```env
# API
NEXT_PUBLIC_API_URL=http://localhost:4000

# Auth.js
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-change-this

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
apps/web/
├── app/
│   ├── layout.tsx              # Root layout
│   ├── page.tsx                # Landing page
│   ├── (auth)/                 # Auth pages
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   └── (app)/                  # Protected app pages
│       ├── layout.tsx          # App layout (sidebar)
│       ├── dashboard/page.tsx
│       ├── submit/page.tsx
│       ├── history/page.tsx
│       ├── keys/page.tsx
│       └── settings/page.tsx
├── components/
│   ├── ui/                     # shadcn components
│   ├── landing/                # Landing page components
│   └── app/                    # Dashboard components
├── lib/
│   ├── api.ts                  # API client
│   ├── auth.ts                 # Auth.js config
│   └── utils.ts                # Helpers
└── middleware.ts               # Route protection
```

## API Integration

The frontend connects to the backend API at `http://localhost:4000` (configurable via `NEXT_PUBLIC_API_URL`).

All authenticated requests include the JWT token from Auth.js in the Authorization header.

## Design System

- **Color Scheme**: Dark theme (zinc-950 background) with blue/indigo accents
- **Typography**: Inter font (system fallback)
- **Components**: shadcn/ui for consistent, accessible UI
- **Icons**: Lucide React
- **Responsive**: Mobile-first, fully responsive

## Build

```bash
npm run build
npm start
```

## License

MIT — Built with ❤️ by PA
