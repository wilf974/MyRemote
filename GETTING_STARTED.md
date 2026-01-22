# MyRemote - Guide de Démarrage Rapide

**Version**: 1.0
**Date**: 2026-01-22
**Temps estimé**: 30 minutes

---

## 🚀 Démarrage en 5 étapes

Ce guide vous permet de lancer l'environnement de développement MyRemote en **moins de 30 minutes**.

---

## Prérequis

Installez les outils suivants sur votre machine :

```bash
# Vérifier les versions
node --version    # doit être >= 20.0.0
pnpm --version    # doit être >= 8.0.0
docker --version  # doit être >= 24.0.0
rustc --version   # doit être >= 1.70.0 (pour l'agent)
git --version     # n'importe quelle version récente
```

Si manquant, installez :

```bash
# Node.js 20+ (via nvm recommandé)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 20
nvm use 20

# pnpm
npm install -g pnpm

# Docker Desktop
# Windows/macOS : https://www.docker.com/products/docker-desktop
# Linux : https://docs.docker.com/engine/install/

# Rust (pour développement agent)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

---

## Étape 1 : Clone du Repository

```bash
git clone https://github.com/wilf974/MyRemote.git
cd MyRemote

# Checkout la branche avec la conception complète
git checkout claude/remote-support-app-design-arFMJ
```

---

## Étape 2 : Configuration Environnement

### 2.1 Copier les fichiers d'exemple

```bash
# Backend API
cp packages/api/.env.example packages/api/.env

# Frontend Web
cp packages/web/.env.local.example packages/web/.env.local

# Agent (optionnel pour dev backend/frontend)
cp packages/agent/.env.example packages/agent/.env
```

### 2.2 Éditer les configurations (optionnel)

Les valeurs par défaut fonctionnent pour le développement local. Modifiez uniquement si nécessaire.

**packages/api/.env** :
```bash
# Valeurs par défaut OK pour dev
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/myremote
REDIS_URL=redis://localhost:6379
KEYCLOAK_URL=http://localhost:8080
JWT_SECRET=dev_secret_change_in_production
```

**packages/web/.env.local** :
```bash
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_WS_URL=ws://localhost:4000
NEXT_PUBLIC_KEYCLOAK_URL=http://localhost:8080
```

---

## Étape 3 : Démarrer l'Infrastructure

Lancez PostgreSQL, Redis, Keycloak, et les outils de monitoring :

```bash
# Démarrer tous les services
docker-compose up -d

# Vérifier que les services sont UP
docker-compose ps

# Devrait afficher :
# NAME                STATUS
# myremote-postgres   Up (healthy)
# myremote-redis      Up (healthy)
# myremote-keycloak   Up
# myremote-prometheus Up
# myremote-grafana    Up
# myremote-loki       Up
# myremote-turn       Up
```

**Attendez 30 secondes** que Keycloak initialise complètement.

### Services disponibles

| Service | URL | Credentials |
|---------|-----|-------------|
| **PostgreSQL** | localhost:5432 | postgres / postgres |
| **Redis** | localhost:6379 | (no password) |
| **Keycloak** | http://localhost:8080 | admin / admin |
| **Prometheus** | http://localhost:9090 | (no auth) |
| **Grafana** | http://localhost:3001 | admin / admin |

---

## Étape 4 : Installer les Dépendances

```bash
# Install toutes les dépendances du monorepo (peut prendre 2-3 min)
pnpm install
```

---

## Étape 5 : Lancer les Serveurs de Développement

### Option A : Tout lancer en parallèle (recommandé)

```bash
# Démarre API + Web en mode watch
pnpm dev
```

Cela lance :
- **API Backend** : http://localhost:4000
  - API Docs (Swagger) : http://localhost:4000/api/docs
  - Health check : http://localhost:4000/api/v1/health
- **Web Frontend** : http://localhost:3000

### Option B : Lancer séparément (pour debug)

Terminal 1 (Backend API) :
```bash
cd packages/api
pnpm dev
# → http://localhost:4000
```

Terminal 2 (Frontend Web) :
```bash
cd packages/web
pnpm dev
# → http://localhost:3000
```

Terminal 3 (Agent - optionnel) :
```bash
cd packages/agent
cargo run
```

---

## ✅ Vérification

### Backend API fonctionne ?

```bash
# Test health endpoint
curl http://localhost:4000/api/v1/health

# Devrait retourner :
# {"status":"ok","timestamp":"2026-01-22T10:00:00Z"}
```

### Frontend Web fonctionne ?

Ouvrir navigateur : http://localhost:3000

Vous devriez voir la page d'accueil MyRemote.

### Keycloak fonctionne ?

Ouvrir : http://localhost:8080

Login avec `admin` / `admin`

---

## 🗄️ Initialiser la Database

### Créer le schéma

```bash
# Run migrations (crée toutes les tables)
pnpm db:migrate

# Vérifier les tables créées
docker exec -it myremote-postgres psql -U postgres -d myremote -c "\dt"

# Devrait lister : users, roles, devices, sessions, audit_logs, etc.
```

### Seed données de test (optionnel)

```bash
# Créer des données de test (users, roles, devices exemple)
pnpm db:seed

# Vérifier
docker exec -it myremote-postgres psql -U postgres -d myremote -c "SELECT * FROM users;"
```

---

## 🔑 Configuration Keycloak (Première fois)

### 1. Créer le Realm "myremote"

1. Ouvrir http://localhost:8080
2. Login : `admin` / `admin`
3. Menu dropdown (Master) → **Add realm**
4. Name : `myremote`
5. Enabled : **ON**
6. Click **Create**

### 2. Créer le Client "myremote-api"

1. Realm : `myremote`
2. **Clients** → **Create client**
3. Client ID : `myremote-api`
4. Client Protocol : `openid-connect`
5. Click **Next**
6. Client authentication : **ON**
7. Authorization : **OFF**
8. Standard flow : **ON**
9. Direct access grants : **ON**
10. Click **Save**
11. **Credentials** tab → copier **Client secret** dans `packages/api/.env` :
    ```bash
    KEYCLOAK_CLIENT_SECRET=<secret-copié>
    ```

### 3. Créer le Client "myremote-web"

Répéter pour client ID `myremote-web` (pour le frontend)

### 4. Créer un User de test

1. **Users** → **Add user**
2. Username : `admin@example.com`
3. Email : `admin@example.com`
4. First name : `Admin`
5. Last name : `Test`
6. Email verified : **ON**
7. Click **Create**
8. **Credentials** tab → **Set password**
9. Password : `password123`
10. Temporary : **OFF**
11. Click **Save**

### 5. Activer 2FA (TOTP)

1. Realm Settings → **Authentication** → **Required actions**
2. Activer : **Configure OTP**
3. Users → Select `admin@example.com` → **Required User Actions**
4. Add : **Configure OTP**

Au premier login, l'utilisateur devra configurer 2FA (scan QR code avec Google Authenticator).

---

## 🧪 Tester l'Application

### 1. Ouvrir l'application

http://localhost:3000

### 2. Login

- Click **Continue with Keycloak SSO**
- Login : `admin@example.com` / `password123`
- Configurer 2FA (scan QR avec Google Authenticator)
- Entrer code TOTP (6 digits)

### 3. Accéder au Dashboard

Vous devriez voir le dashboard avec :
- Stats devices (vide pour l'instant)
- Sidebar navigation (Devices, Sessions, Contacts, Audit)

---

## 🔧 Commandes Utiles

### Docker

```bash
# Voir les logs
docker-compose logs -f                    # Tous les services
docker-compose logs -f postgres           # PostgreSQL uniquement
docker-compose logs -f api                # API uniquement (si lancé via Docker)

# Restart un service
docker-compose restart postgres

# Stop tous les services
docker-compose down

# Stop + supprimer volumes (⚠️ efface la database)
docker-compose down -v
```

### Database

```bash
# Accéder au shell PostgreSQL
docker exec -it myremote-postgres psql -U postgres -d myremote

# Lister les tables
\dt

# Describe une table
\d users

# Query exemple
SELECT * FROM users;

# Quitter
\q
```

### Développement

```bash
# Linter (check code style)
pnpm lint

# Formater le code
pnpm format

# Tests unitaires
pnpm test

# Tests E2E (nécessite dev servers running)
pnpm test:e2e

# Build production
pnpm build

# Clean (supprimer node_modules, dist, etc.)
pnpm clean
```

### Agent (Rust)

```bash
cd packages/agent

# Run en mode dev
cargo run

# Tests
cargo test

# Build release
cargo build --release

# Linter
cargo clippy
```

---

## 🐛 Troubleshooting

### Problème : Docker services n'démarrent pas

```bash
# Check Docker daemon
docker info

# Si erreur "Cannot connect to Docker daemon"
# → Démarrer Docker Desktop

# Supprimer et recréer les containers
docker-compose down -v
docker-compose up -d
```

### Problème : Port déjà utilisé (5432, 6379, 8080, etc.)

```bash
# Trouver le processus utilisant le port
# Linux/macOS
lsof -i :5432

# Windows
netstat -ano | findstr :5432

# Kill le processus ou changer le port dans docker-compose.yml
```

### Problème : pnpm install échoue

```bash
# Clear cache
pnpm store prune

# Retry
rm -rf node_modules
pnpm install
```

### Problème : Migrations database échouent

```bash
# Vérifier que PostgreSQL est UP
docker-compose ps postgres

# Vérifier connexion
docker exec -it myremote-postgres psql -U postgres -c "SELECT version();"

# Recréer la database
docker exec -it myremote-postgres psql -U postgres -c "DROP DATABASE IF EXISTS myremote;"
docker exec -it myremote-postgres psql -U postgres -c "CREATE DATABASE myremote;"

# Re-run migrations
pnpm db:migrate
```

### Problème : Keycloak "admin/admin" ne fonctionne pas

```bash
# Reset Keycloak
docker-compose stop keycloak
docker-compose rm -f keycloak
docker volume rm myremote_keycloak_data
docker-compose up -d keycloak

# Attendre 30s puis retry
```

---

## 📚 Prochaines Étapes

Maintenant que votre environnement est prêt :

1. **Lire la documentation** :
   - [PRD](./docs/01-PRD.md) : Comprendre les features
   - [Architecture](./docs/02-ARCHITECTURE.md) : Comprendre le design
   - [Security](./docs/07-SECURITY-THREAT-MODEL.md) : Comprendre les menaces

2. **Explorer le code** :
   - `packages/api/src/` : Backend NestJS
   - `packages/web/src/` : Frontend Next.js
   - `packages/agent/src/` : Agent Rust

3. **Commencer le développement** :
   - Voir [Implementation Plan](./docs/08-IMPLEMENTATION-PLAN.md)
   - Sprint 0 : Setup CI/CD
   - Sprint 1 : Auth module + RBAC

4. **Contribuer** :
   - Créer une branche : `git checkout -b feature/my-feature`
   - Coder + tester
   - Commit : `git commit -m "feat: add my feature"`
   - Push : `git push origin feature/my-feature`
   - Créer une Pull Request

---

## 🆘 Support

- **Documentation** : Voir dossier `docs/`
- **Issues** : https://github.com/wilf974/MyRemote/issues
- **Discussions** : https://github.com/wilf974/MyRemote/discussions

---

## ✅ Checklist Environnement Prêt

- [ ] Node.js 20+ installé
- [ ] pnpm installé
- [ ] Docker Desktop running
- [ ] Repo cloné
- [ ] `pnpm install` complété
- [ ] `docker-compose up -d` OK (tous services UP)
- [ ] Keycloak realm "myremote" créé
- [ ] Keycloak client "myremote-api" créé
- [ ] User test créé (admin@example.com)
- [ ] `pnpm db:migrate` OK (tables créées)
- [ ] Backend API http://localhost:4000 → OK
- [ ] Frontend Web http://localhost:3000 → OK
- [ ] Login fonctionnel avec 2FA

**🎉 Si tous les items sont cochés, vous êtes prêt à développer !**

---

**Temps total** : ~30 minutes
**Dernière mise à jour** : 2026-01-22
