# MyRemote - Guide de Développement

## 🎉 Sprint 1 Complété - Fondations du Projet

Le Sprint 1 (Fondations) a été complété avec succès. L'infrastructure de base est maintenant en place.

### ✅ Ce qui a été implémenté

#### Structure du Monorepo
- ✅ Configuration Turborepo pour l'orchestration des builds
- ✅ Configuration pnpm workspaces
- ✅ Scripts de développement partagés
- ✅ Configuration TypeScript globale
- ✅ Configuration Prettier

#### Packages Créés

**1. packages/shared** - Types partagés
- Types TypeScript pour toutes les entités (User, Agent, Session, AuditLog)
- Schémas de validation Zod pour les DTOs
- Exportation centralisée des types

**2. packages/database** - Base de données
- Configuration Prisma ORM
- Schéma de base de données complet (20+ tables)
- Client Prisma singleton
- Scripts de migration

**3. packages/api** - API NestJS
- Application NestJS initialisée
- Module de base de données
- Endpoints de health check
- Structure modulaire (Auth, Users, Agents, Sessions, Audit)
- Validation globale avec class-validator
- Configuration CORS et rate limiting

**4. packages/web** - Frontend Next.js
- Application Next.js 14 avec App Router
- Configuration Tailwind CSS
- Page d'accueil de base
- Configuration TypeScript

#### Infrastructure
- ✅ Dockerfiles mis à jour pour la nouvelle structure
- ✅ Docker Compose pour le développement local
- ✅ Services: PostgreSQL, Redis, Keycloak, Grafana, Loki, Prometheus

---

## 🚀 Démarrage en Développement

### Prérequis

- Node.js 20+
- pnpm 8+
- Docker & Docker Compose

### Installation

```bash
# 1. Installer les dépendances
pnpm install

# 2. Démarrer les services infrastructure
docker compose up -d

# 3. Attendre que les services soient prêts (30s)
docker compose ps

# 4. Générer le client Prisma
pnpm db:generate

# 5. Créer la base de données
pnpm db:migrate

# 6. Démarrer le développement
pnpm dev
```

Cela démarre :
- API NestJS : http://localhost:3001
- Frontend Next.js : http://localhost:3000
- Keycloak : http://localhost:8080
- Grafana : http://localhost:3001 (port 3000 dans le container)

### Scripts Disponibles

```bash
# Développement
pnpm dev              # Démarre tous les packages en mode dev
pnpm build            # Build tous les packages
pnpm test             # Lance les tests

# Base de données
pnpm db:generate      # Génère le client Prisma
pnpm db:migrate       # Crée/applique les migrations
pnpm db:studio        # Ouvre Prisma Studio

# Formatage
pnpm format           # Formate le code avec Prettier

# Nettoyage
pnpm clean            # Nettoie les artifacts de build
```

### Structure des Packages

```
MyRemote/
├── packages/
│   ├── shared/          # Types TypeScript partagés
│   │   └── src/types/   # User, Agent, Session, Audit
│   ├── database/        # Prisma ORM
│   │   └── prisma/      # Schéma et migrations
│   ├── api/             # API NestJS
│   │   └── src/modules/ # Auth, Users, Agents, Sessions, Audit
│   └── web/             # Frontend Next.js
│       └── src/app/     # Pages et composants
├── infra/               # Configuration infrastructure
│   ├── docker/          # Dockerfiles
│   └── nginx/           # Configuration nginx
└── docs/                # Documentation complète
```

---

## 🔧 Configuration des Services

### PostgreSQL
- **Host**: localhost:5432
- **Database**: myremote
- **User**: postgres
- **Password**: postgres

### Redis
- **Host**: localhost:6379
- **No password** (dev)

### Keycloak
- **URL**: http://localhost:8080
- **Admin**: admin / admin
- **Realm**: myremote (à créer)

---

## 📋 Prochaines Étapes - Sprint 2

### Sprint 2 : Authentification (Semaines 3-4)

#### À Implémenter

1. **Configuration Keycloak**
   - [ ] Créer le realm "myremote"
   - [ ] Configurer les clients (API + Web)
   - [ ] Activer 2FA TOTP obligatoire
   - [ ] Configurer les rôles (ADMIN, TECHNICIAN, VIEWER)

2. **API - Module Auth**
   - [ ] Intégration Keycloak avec Passport JWT
   - [ ] Middleware d'authentification
   - [ ] Guards pour les rôles
   - [ ] Endpoints de login/logout
   - [ ] Validation 2FA

3. **Frontend - Pages Auth**
   - [ ] Page de login
   - [ ] Configuration 2FA
   - [ ] Gestion de session
   - [ ] Redirection après auth

4. **Tests**
   - [ ] Tests unitaires auth service
   - [ ] Tests E2E login flow
   - [ ] Tests 2FA

### Sprint 3 : Gestion de Flotte (Semaines 5-6)

- Implémentation CRUD agents
- Liste et détails des agents
- WebSocket pour statut en temps réel

### Sprint 4 : Agent Rust (Semaines 7-9)

- Agent multi-plateforme (Windows, macOS, Linux)
- Enrollment sécurisé
- Heartbeat et monitoring

### Sprint 5 : Sessions Distantes (Semaines 10-12)

- Session bureau (WebRTC)
- Session terminal (xterm.js)
- Session fichiers

### Sprint 6 : Finalisation (Semaines 13-14)

- Monitoring complet
- Tests E2E
- Documentation
- Sécurité

---

## 🐛 Problèmes Connus

### DNS en Attente
Les sous-domaines `api.myremote.woutils.com`, `auth.myremote.woutils.com`, et `monitoring.myremote.woutils.com` sont configurés dans Hostinger mais pas encore propagés. Une fois propagés :

```bash
cd /opt/apps/MyRemote
sudo bash scripts/get-ssl-certificates.sh
sudo bash scripts/deploy-infrastructure-only.sh
```

### Code Application vs Infrastructure
- ✅ **Documentation** : Complète (21 fichiers)
- ✅ **Infrastructure** : Scripts de déploiement prêts
- ✅ **Fondations code** : Sprint 1 complété
- ⚠️ **Fonctionnalités** : À implémenter (Sprints 2-6)

---

## 📚 Documentation

- `docs/00-SYNTHESE-COMPLETE.md` - Vue d'ensemble
- `docs/01-PRD.md` - Exigences produit
- `docs/02-ARCHITECTURE.md` - Architecture système
- `docs/08-IMPLEMENTATION-PLAN.md` - Plan d'implémentation détaillé
- `DEPLOYMENT-STATUS.md` - État du déploiement VPS

---

## 🤝 Contribution

Voir `CONTRIBUTING.md` pour les guidelines de contribution.

---

## 📝 Notes

- Le développement local utilise des mots de passe simples (dev seulement)
- Pour la production, utiliser `.env.prod` avec des secrets forts
- Les logs sont dans `docker compose logs -f [service]`
- Prisma Studio : http://localhost:5555 (après `pnpm db:studio`)

---

**Dernière mise à jour** : 2026-01-23  
**Sprint actuel** : Sprint 1 (Complété) ✅  
**Prochain sprint** : Sprint 2 (Authentification)
