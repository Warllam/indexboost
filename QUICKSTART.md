# IndexBoost - Quick Start Guide

Guide de démarrage rapide pour lancer le backend IndexBoost en 5 minutes.

## 📋 Prérequis

- Node.js 18+ installé
- Docker et Docker Compose installés
- Terminal Unix (Linux/macOS) ou WSL sur Windows

## 🚀 Installation Rapide

### 1. Naviguer vers le projet

```bash
cd /home/warllam/clawd/projects/indexboost/apps/api
```

### 2. Installer les dépendances

```bash
npm install
```

### 3. Générer les clés de sécurité

```bash
npm run generate-keys
```

Copier les clés générées dans un fichier `.env`:

```bash
cp .env.example .env
# Puis éditer .env et remplacer JWT_SECRET et ENCRYPTION_KEY
```

### 4. Démarrer PostgreSQL + Redis

```bash
cd ../..  # Retour à la racine du projet
docker-compose up -d

# Vérifier que les services sont prêts
docker-compose ps
```

Attendre que les services affichent "healthy" (environ 10-15 secondes).

### 5. Créer les tables de la base de données

```bash
cd apps/api

# Générer les migrations
npm run db:generate

# Appliquer les migrations
npm run db:migrate
```

### 6. Seed la base de données (optionnel)

```bash
npm run db:seed
```

Cela crée un utilisateur de test: `demo@indexboost.app`

### 7. Démarrer l'API

```bash
npm run dev
```

L'API est maintenant disponible sur **http://localhost:3000**

## ✅ Vérification

```bash
# Test health check
curl http://localhost:3000/health
```

Réponse attendue:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "version": "1.0.0"
}
```

## 🧪 Test avec un JWT

Pour tester les endpoints protégés, vous devez générer un JWT compatible Auth.js:

### Option 1: Utiliser jwt.io

1. Aller sur https://jwt.io
2. Algorithm: HS256
3. Payload:
```json
{
  "sub": "1",
  "email": "demo@indexboost.app",
  "name": "Demo User",
  "iat": 1640995200,
  "exp": 9999999999
}
```
4. Secret: Votre JWT_SECRET du fichier .env
5. Copier le JWT généré

### Option 2: Node.js script

```javascript
// generate-test-jwt.js
const jwt = require('jsonwebtoken');
const secret = 'YOUR_JWT_SECRET_FROM_ENV';

const token = jwt.sign(
  {
    sub: '1',
    email: 'demo@indexboost.app',
    name: 'Demo User'
  },
  secret,
  { expiresIn: '30d' }
);

console.log(token);
```

```bash
node generate-test-jwt.js
```

### Test des endpoints

```bash
export JWT_TOKEN="eyJhbGciOiJIUzI1NiIs..."

# Get status
curl -H "Authorization: Bearer $JWT_TOKEN" \
  http://localhost:3000/api/status

# Submit URLs
curl -X POST \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"urls":["https://example.com/test"]}' \
  http://localhost:3000/api/submit

# Get history
curl -H "Authorization: Bearer $JWT_TOKEN" \
  http://localhost:3000/api/history

# List service keys
curl -H "Authorization: Bearer $JWT_TOKEN" \
  http://localhost:3000/api/keys
```

## 🔧 Commandes Utiles

```bash
# Development avec hot reload
npm run dev

# Build pour production
npm run build

# Démarrer en mode production
npm start

# Linter
npm run lint

# Format code
npm run format

# Drizzle Studio (GUI pour la DB)
npm run db:studio
# Ouvrir https://local.drizzle.studio

# Voir les logs des services
docker-compose logs -f postgres
docker-compose logs -f redis

# Arrêter les services
docker-compose down

# Supprimer les données (reset complet)
docker-compose down -v
```

## 📊 Monitoring

### Voir les logs en temps réel

L'API affiche des logs colorés en mode dev:

```
[Google] Processing https://example.com for user 123
[Google] ✓ https://example.com indexed successfully
[IndexNow] Processing https://example.com
[IndexNow] ✓ https://example.com submitted successfully
```

### Accès aux bases de données

```bash
# PostgreSQL
docker exec -it indexboost-postgres psql -U indexboost -d indexboost

# Requêtes SQL
SELECT * FROM users;
SELECT * FROM service_keys;
SELECT * FROM submissions ORDER BY created_at DESC LIMIT 10;

# Redis CLI
docker exec -it indexboost-redis redis-cli

# Commandes Redis
KEYS *
LLEN bull:google-indexing:wait
```

## 🔑 Ajouter une vraie clé Google

⚠️ **Limitations Google Indexing API :**
- Quota : **200 requêtes/jour par PROJET Google Cloud** (pas par service account)
- Usage officiel : **uniquement pages JobPosting et BroadcastEvent**
- Pour la rotation multi-clés, **chaque service account doit provenir d'un PROJET DIFFÉRENT**

**Étapes :**

1. Créer un projet Google Cloud: https://console.cloud.google.com
2. Activer "Web Search Indexing API"
3. Créer un Service Account avec rôle "Indexing API User"
4. Télécharger le JSON credentials
5. Ajouter via l'API:

```bash
curl -X POST \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d @service-account.json \
  http://localhost:3000/api/keys
```

Avec `service-account.json`:
```json
{
  "name": "My Production Key",
  "dailyLimit": 200,
  "credentials": {
    "type": "service_account",
    "project_id": "...",
    "private_key_id": "...",
    "private_key": "...",
    "client_email": "...",
    "client_id": "...",
    "auth_uri": "...",
    "token_uri": "...",
    "auth_provider_x509_cert_url": "...",
    "client_x509_cert_url": "..."
  }
}
```

## 🐛 Troubleshooting

### Port déjà utilisé

```bash
# Changer le port dans .env
PORT=3001
```

### PostgreSQL connection refused

```bash
# Vérifier que le service est démarré
docker-compose ps

# Si non healthy, voir les logs
docker-compose logs postgres

# Restart
docker-compose restart postgres
```

### Redis connection refused

```bash
docker-compose restart redis
```

### Migration errors

```bash
# Supprimer la DB et recréer
docker-compose down -v
docker-compose up -d
npm run db:migrate
npm run db:seed
```

### TypeScript errors

```bash
# Nettoyer et reinstaller
rm -rf node_modules dist
npm install
npm run build
```

## 🎯 Prochaines Étapes

1. **Frontend**: Créer l'interface web pour soumettre des URLs
2. **Auth.js**: Intégrer Auth.js pour gérer l'authentification complète
3. **Tests**: Ajouter des tests unitaires et d'intégration
4. **Monitoring**: Ajouter Prometheus + Grafana
5. **Deployment**: Déployer sur VPS, AWS, GCP, etc.

## 📚 Documentation

- [README.md](apps/api/README.md) - Documentation complète
- [ARCHITECTURE.md](apps/api/ARCHITECTURE.md) - Architecture technique détaillée
- [Google Indexing API Docs](https://developers.google.com/search/apis/indexing-api/v3/quickstart)
- [IndexNow Protocol](https://www.indexnow.org/documentation)
- [Drizzle ORM](https://orm.drizzle.team)
- [BullMQ](https://docs.bullmq.io)
- [Fastify](https://www.fastify.io)

## 💬 Support

Pour toute question ou problème:
- Ouvrir une issue sur GitHub
- Consulter la documentation
- Vérifier les logs d'erreur

---

🎉 **Vous êtes prêt!** L'API IndexBoost tourne maintenant en local.
