# IndexBoost — Plan Projet

## 🎯 Concept
SaaS d'indexation en masse via Google Indexing API + IndexNow.
L'utilisateur colle ses URLs, clique "Indexer", et l'outil soumet automatiquement en rotant sur plusieurs service accounts Google.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────┐
│                   Frontend                       │
│            Next.js (React + App Router)          │
│                                                  │
│  Landing Page (/) ─── SEO, pricing, CTA          │
│  Dashboard (/app) ─── Auth required              │
│    ├── Submit URLs ─── Textarea + bouton         │
│    ├── Historique ──── Tableau paginé             │
│    ├── Quotas ──────── Barres de progression      │
│    ├── Clés API ────── Gestion service accounts   │
│    └── Settings ────── Plan, billing, profil      │
└──────────────────────┬──────────────────────────┘
                       │ API calls
┌──────────────────────▼──────────────────────────┐
│                   Backend                        │
│              Fastify (Node.js)                   │
│                                                  │
│  POST /api/submit ─── Valide + dispatch URLs     │
│  GET  /api/status ─── Quotas temps réel          │
│  GET  /api/history ── Historique paginé           │
│  POST /api/keys ───── CRUD service accounts      │
│  Webhook Stripe ───── Gestion abonnements        │
│                                                  │
│  Services:                                       │
│    ├── GoogleIndexer ── Rotation clés, appel API │
│    ├── IndexNowSubmitter ── Bing, Yandex, DDG    │
│    ├── QueueManager ── Overflow + retry           │
│    └── QuotaTracker ── Usage par clé + reset      │
└──────────────────────┬──────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────┐
│               PostgreSQL                         │
│                                                  │
│  users ──────── Auth, plan, stripe_id            │
│  service_keys ── Credentials GCP par user        │
│  submissions ─── URL, status, timestamp          │
│  quota_usage ─── Usage journalier par clé        │
└─────────────────────────────────────────────────┘
```

---

## 📦 Stack Technique

| Couche | Techno | Pourquoi |
|--------|--------|----------|
| Frontend | **Next.js 15 (App Router)** | Landing SEO + Dashboard SPA |
| UI | **Tailwind + shadcn/ui** | Composants pro, rapide à dev |
| Auth | **Auth.js (NextAuth)** | Login Google/Email, self-hosted, 0€ |
| Backend | **Fastify** | Léger, rapide, TypeScript natif |
| DB | **PostgreSQL** | Robuste, multi-tenant, JSON support |
| ORM | **Drizzle** | Type-safe, léger, migrations simples |
| Queue | **BullMQ + Redis** | Retry, backoff, scheduling fiable |
| Billing | **Stripe** | Plans, checkout, webhooks |
| Hosting | **Self-hosted Docker** (serveur PA) | 0€, tout local |
| Tunnel | **Cloudflare Tunnel** (gratuit) | Accès externe si besoin |

---

## 💰 Modèle Pricing (proposition)

| Plan | Prix | URLs/jour | Service Accounts | Features |
|------|------|-----------|-------------------|----------|
| **Free** | 0€ | 50 | 1 | Google Indexing API only |
| **Pro** | 19€/mois | 2 000 | 10 | + IndexNow + Historique + Priority queue |
| **Business** | 49€/mois | 10 000 | 50 | + API access + Webhooks + Support |
| **Enterprise** | Sur devis | Illimité | Illimité | + Self-hosted + SLA |

---

## 🗓️ Roadmap — 4 Phases

### Phase 1 — MVP (Semaine 1-2)
**Objectif : outil fonctionnel utilisable**

- [ ] Setup projet (monorepo, Next.js + Fastify + PostgreSQL)
- [ ] Auth (Clerk — login Google/email)
- [ ] Page "Submit URLs" — textarea + bouton + feedback
- [ ] Backend: soumission Google Indexing API avec 1 clé
- [ ] Rotation multi-clés (round-robin least-used)
- [ ] Quota tracking par clé + reset cron à minuit
- [ ] Page "Dashboard" — quotas + historique basique
- [ ] Page "Clés API" — upload service account JSON
- [ ] Docker Compose pour dev local

### Phase 2 — Polish (Semaine 3)
**Objectif : prêt à montrer**

- [ ] IndexNow (Bing, Yandex, DuckDuckGo)
- [ ] Queue avec retry + backoff exponentiel (BullMQ)
- [ ] Historique paginé avec filtres (success/failed/pending)
- [ ] Landing page (hero, features, pricing, CTA)
- [ ] Responsive mobile
- [ ] Rate limiting API
- [ ] Validation URLs (format, duplicates, domaines autorisés)

### Phase 3 — Monétisation (Semaine 4)
**Objectif : premiers revenus**

- [ ] Intégration Stripe (plans, checkout, webhooks)
- [ ] Enforcement des limites par plan
- [ ] Page pricing interactive
- [ ] Emails transactionnels (welcome, quota alert, receipt)
- [ ] CGU / Privacy Policy
- [ ] Deploy production (Vercel + Railway)
- [ ] Domaine custom + SSL

### Phase 4 — Growth (Post-launch)
**Objectif : scale**

- [ ] API publique avec clé API (pour les devs/agences)
- [ ] Import sitemap XML automatique
- [ ] Webhooks (notification quand indexation terminée)
- [ ] Bulk re-index (re-soumettre toutes les URLs d'un domaine)
- [ ] Analytics avancées (taux d'indexation, temps moyen)
- [ ] Intégration Google Search Console (vérifier si indexé)
- [ ] Programme affilié

---

## 📁 Structure Projet

```
indexboost/
├── apps/
│   ├── web/                 # Next.js frontend
│   │   ├── app/
│   │   │   ├── (landing)/   # Landing page publique
│   │   │   ├── (app)/       # Dashboard (auth required)
│   │   │   │   ├── submit/
│   │   │   │   ├── dashboard/
│   │   │   │   ├── keys/
│   │   │   │   └── settings/
│   │   │   └── api/         # Next.js API routes (proxy)
│   │   └── components/
│   │       ├── ui/          # shadcn components
│   │       └── app/         # Business components
│   │
│   └── api/                 # Fastify backend
│       ├── src/
│       │   ├── routes/      # API endpoints
│       │   ├── services/    # Business logic
│       │   │   ├── google-indexer.ts
│       │   │   ├── indexnow-submitter.ts
│       │   │   ├── queue-manager.ts
│       │   │   └── quota-tracker.ts
│       │   ├── db/          # Drizzle schema + migrations
│       │   └── lib/         # Utils, config
│       └── Dockerfile
│
├── packages/
│   └── shared/              # Types partagés
│
├── docker-compose.yml       # Dev: API + PostgreSQL + Redis
├── turbo.json               # Monorepo config
└── package.json
```

---

## 🔑 Points Techniques Clés

### Rotation Multi-Clés

⚠️ **Important :** Le quota Google Indexing API est de **200 requêtes/jour par PROJET Google Cloud**.  
Pour que la rotation multi-clés soit efficace, **chaque service account doit provenir d'un projet GCP différent**.  
Si tous les service accounts viennent du même projet, ils partagent le même quota de 200/jour.

```typescript
// Sélection de la clé avec le moins d'usage (least-used)
async function pickBestKey(userId: string): Promise<ServiceKey> {
  return db.query.serviceKeys.findFirst({
    where: eq(serviceKeys.userId, userId),
    orderBy: asc(serviceKeys.dailyUsed),
    having: lt(serviceKeys.dailyUsed, serviceKeys.dailyLimit)
  })
}
```

### Retry avec Backoff
```typescript
// BullMQ job options
{
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 5000  // 5s, 25s, 125s
  }
}
```

### Sécurité
- Service account JSON chiffrés en DB (AES-256)
- Rate limiting par IP + par user
- Validation stricte des URLs
- CORS restrictif
- Webhook Stripe avec signature verification

---

## 🚀 Nom & Domaine (suggestions)

- **IndexBoost** — indexboost.io
- **BulkIndex** — bulkindex.io
- **IndexPilot** — indexpilot.com
- **FastIndex** — fastindex.app
- **PushIndex** — pushindex.io

---

## ⚠️ Risques & Limitations

1. **Google Indexing API : restrictions officielles** 
   - L'API est **officiellement limitée** aux types de pages **JobPosting** et **BroadcastEvent** uniquement
   - Quota : **200 requêtes/jour par PROJET Google Cloud** (pas par service account)
   - ⚠️ **La rotation multi-clés ne fonctionne que si chaque service account appartient à un PROJET DIFFÉRENT**
   - Risque de ban si utilisation hors cas d'usage officiels
   - *Mitigation :* Diversifier (IndexNow), communiquer clairement les limites aux users, disclaimer dans les CGU
   
2. **Concurrence** — SpeedyIndex, IndexMeNow existent déjà
   - *Mitigation :* Open source core, meilleur UX, prix compétitif

3. **Responsabilité** — Si Google ban les comptes des users
   - *Mitigation :* CGU claires, disclaimer, pas de garantie d'indexation

---

*Créé le 28/03/2026 — PA & ClawdBot*
