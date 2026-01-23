# MyRemote - Guide de Développement

## 🎉 Sprint 2 Complété - Authentification avec Keycloak

Le Sprint 2 (Authentification) a été complété avec succès ! Le système d'authentification complet est maintenant opérationnel avec Keycloak, 2FA et RBAC.

### ✅ Ce qui a été implémenté (Sprint 2)

#### API - Module d'Authentification
- ✅ Stratégie JWT avec Passport
- ✅ Guards (JwtAuthGuard, RolesGuard) enregistrés globalement
- ✅ Decorators (@Public, @Roles, @CurrentUser)
- ✅ Service Keycloak (login, refresh, logout, validation)
- ✅ Service Auth complet (login, 2FA, audit logs)
- ✅ Endpoints REST:
  - POST /auth/login - Login avec email/password + 2FA optionnel
  - POST /auth/refresh - Rafraîchir le token d'accès
  - POST /auth/logout - Se déconnecter
  - GET /auth/me - Obtenir les infos utilisateur
  - POST /auth/2fa/generate - Générer secret 2FA
  - POST /auth/2fa/enable - Activer 2FA avec vérification TOTP
  - POST /auth/2fa/disable - Désactiver 2FA avec mot de passe

#### Frontend - Interface d'Authentification
- ✅ Client API Axios avec intercepteurs (auto-refresh des tokens)
- ✅ Store Zustand pour la gestion de l'état auth
- ✅ Page /login avec support 2FA
- ✅ Page /dashboard protégée avec infos utilisateur
- ✅ Page /dashboard/2fa pour gérer la 2FA
- ✅ Persistance de session (localStorage)
- ✅ Redirection automatique si non authentifié

#### Configuration Keycloak
- ✅ Script automatisé de configuration (setup-realm.js)
- ✅ Création du realm 'myremote'
- ✅ Client API (myremote-api) avec client credentials
- ✅ Client Web (myremote-web) avec PKCE
- ✅ Rôles: ADMIN, TECHNICIAN, VIEWER
- ✅ Politique OTP/2FA (TOTP, 6 chiffres, 30s)
- ✅ Documentation complète

#### Sécurité
- ✅ JWT token-based authentication
- ✅ Rotation des refresh tokens
- ✅ Contrôle d'accès basé sur les rôles (RBAC)
- ✅ 2FA TOTP (codes à 6 chiffres, fenêtre 30s)
- ✅ Audit logging pour tous les événements auth
- ✅ Protection contre force brute (via Keycloak)
- ✅ Expiration des tokens (1h accès, configurable)

---

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
- **Realm**: myremote
- **Setup**: `cd scripts/keycloak && npm install && npm run setup`

---

## 🚀 Configuration Keycloak (Sprint 2)

### Setup automatique

```bash
# 1. Démarrer Keycloak
docker compose up -d keycloak

# 2. Attendre que Keycloak soit prêt (30-60s)
docker compose logs -f keycloak

# 3. Exécuter le script de configuration
cd scripts/keycloak
npm install
npm run setup

# 4. Copier le client secret affiché dans .env
```

### Créer un utilisateur

1. Accéder à http://localhost:8080/admin
2. Login: admin / admin
3. Sélectionner le realm `myremote`
4. Users → Add user
5. Remplir email, firstName, lastName
6. Sauvegarder
7. Credentials → Set password
8. Role Mappings → Assigner ADMIN/TECHNICIAN/VIEWER

### Tester l'authentification

```bash
# Démarrer l'API et le Web
pnpm dev

# Ouvrir le navigateur
http://localhost:3000/login

# Se connecter avec l'utilisateur créé
```

---

## 📋 Prochaines Étapes - Sprint 3

### Sprint 3 : Gestion de Flotte (Semaines 5-6)

#### À Implémenter

1. **API - Module Users**
   - [ ] Endpoints CRUD pour users
   - [ ] Synchronisation avec Keycloak
   - [ ] Gestion des rôles
   - [ ] Liste et recherche

2. **API - Module Agents**
   - [ ] Endpoints CRUD pour agents
   - [ ] Enrollment sécurisé
   - [ ] Heartbeat et status
   - [ ] Tags et métadonnées

3. **Frontend - Pages Users**
   - [ ] Liste des utilisateurs
   - [ ] Créer/éditer utilisateur
   - [ ] Assigner rôles
   - [ ] Désactiver/supprimer

4. **Frontend - Pages Agents**
   - [ ] Liste des agents (avec statut en temps réel)
   - [ ] Détails d'un agent
   - [ ] Actions (redémarrer, mettre à jour)
   - [ ] Tags et filtres

5. **WebSocket**
   - [ ] Configuration Socket.io
   - [ ] Events pour statut agents
   - [ ] Updates en temps réel

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
- ✅ **Authentification** : Sprint 2 complété (Keycloak, JWT, 2FA, RBAC)
- ⚠️ **Fonctionnalités** : À implémenter (Sprints 3-6)

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
**Sprints complétés** : Sprint 1 (Fondations) ✅ | Sprint 2 (Authentification) ✅
**Prochain sprint** : Sprint 3 (Gestion de Flotte - Users & Agents)
