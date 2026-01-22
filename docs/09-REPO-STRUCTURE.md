# MyRemote - Structure du Repository & Starter Kit

**Version**: 1.0
**Date**: 2026-01-22
**Type**: Monorepo (Turborepo)

---

## Table des matières
1. [Vue d'ensemble](#1-vue-densemble)
2. [Arborescence complète](#2-arborescence-complète)
3. [Packages](#3-packages)
4. [Configuration](#4-configuration)
5. [Scripts npm](#5-scripts-npm)
6. [Environnement dev](#6-environnement-dev)

---

## 1. Vue d'ensemble

### 1.1 Choix technique : Monorepo

**Raison** : Facilite partage code (types, utils), versioning unifié, builds optimisés (Turborepo cache).

**Outils** :
- **Turborepo** : Orchestration builds/tests
- **pnpm** : Package manager (workspaces)
- **Changesets** : Gestion releases/changelog

### 1.2 Packages principaux

| Package | Path | Description | Tech |
|---------|------|-------------|------|
| **api** | `packages/api` | Backend API (REST, WebSocket) | NestJS, TypeScript |
| **web** | `packages/web` | Frontend Web UI | Next.js 14, React, TailwindCSS |
| **agent** | `packages/agent` | Agent multi-OS (client devices) | Rust |
| **shared** | `packages/shared` | Code partagé (types, utils) | TypeScript |
| **database** | `packages/database` | Migrations, seeds | TypeORM, SQL |

---

## 2. Arborescence complète

```
myremote/
├── .github/
│   ├── workflows/
│   │   ├── ci.yml                    # CI/CD pipeline
│   │   ├── release.yml               # Release automation
│   │   └── security-scan.yml         # Security scans
│   └── PULL_REQUEST_TEMPLATE.md
│
├── docs/                              # Documentation (YOU ARE HERE)
│   ├── 01-PRD.md
│   ├── 02-ARCHITECTURE.md
│   ├── 03-DATABASE-SCHEMA.md
│   ├── 04-API-SPECIFICATION.md
│   ├── 05-AGENT-ENROLLMENT.md
│   ├── 06-UI-UX-MOCKUPS.md
│   ├── 07-SECURITY-THREAT-MODEL.md
│   ├── 08-IMPLEMENTATION-PLAN.md
│   └── 09-REPO-STRUCTURE.md
│
├── packages/
│   │
│   ├── api/                           # Backend NestJS
│   │   ├── src/
│   │   │   ├── main.ts               # Entry point
│   │   │   ├── app.module.ts         # Root module
│   │   │   ├── auth/                 # Auth module (OIDC, JWT)
│   │   │   │   ├── auth.module.ts
│   │   │   │   ├── auth.controller.ts
│   │   │   │   ├── auth.service.ts
│   │   │   │   ├── guards/
│   │   │   │   │   ├── jwt-auth.guard.ts
│   │   │   │   │   └── rbac.guard.ts
│   │   │   │   └── decorators/
│   │   │   │       └── require-permissions.decorator.ts
│   │   │   ├── devices/              # Devices module
│   │   │   │   ├── devices.module.ts
│   │   │   │   ├── devices.controller.ts
│   │   │   │   ├── devices.service.ts
│   │   │   │   ├── entities/
│   │   │   │   │   └── device.entity.ts
│   │   │   │   └── dto/
│   │   │   │       ├── create-device.dto.ts
│   │   │   │       └── update-device.dto.ts
│   │   │   ├── sessions/             # Sessions module
│   │   │   │   ├── sessions.module.ts
│   │   │   │   ├── sessions.controller.ts
│   │   │   │   ├── sessions.service.ts
│   │   │   │   ├── sessions.gateway.ts  # WebSocket
│   │   │   │   └── entities/
│   │   │   │       └── session.entity.ts
│   │   │   ├── enrollment/           # Enrollment module
│   │   │   │   ├── enrollment.module.ts
│   │   │   │   ├── enrollment.controller.ts
│   │   │   │   └── enrollment.service.ts
│   │   │   ├── audit/                # Audit logs module
│   │   │   │   ├── audit.module.ts
│   │   │   │   ├── audit.controller.ts
│   │   │   │   ├── audit.service.ts
│   │   │   │   └── entities/
│   │   │   │       └── audit-log.entity.ts
│   │   │   ├── contacts/             # Contacts module
│   │   │   │   ├── contacts.module.ts
│   │   │   │   ├── contacts.controller.ts
│   │   │   │   └── contacts.service.ts
│   │   │   ├── common/               # Shared backend code
│   │   │   │   ├── filters/
│   │   │   │   │   └── http-exception.filter.ts
│   │   │   │   ├── interceptors/
│   │   │   │   │   ├── logging.interceptor.ts
│   │   │   │   │   └── timeout.interceptor.ts
│   │   │   │   └── pipes/
│   │   │   │       └── validation.pipe.ts
│   │   │   └── config/               # Configuration
│   │   │       ├── database.config.ts
│   │   │       ├── redis.config.ts
│   │   │       └── keycloak.config.ts
│   │   ├── test/
│   │   │   ├── e2e/
│   │   │   │   ├── devices.e2e-spec.ts
│   │   │   │   └── sessions.e2e-spec.ts
│   │   │   └── jest-e2e.json
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── nest-cli.json
│   │   └── .env.example
│   │
│   ├── web/                           # Frontend Next.js
│   │   ├── src/
│   │   │   ├── app/                  # Next.js 14 App Router
│   │   │   │   ├── layout.tsx        # Root layout
│   │   │   │   ├── page.tsx          # Home (redirect to /dashboard)
│   │   │   │   ├── login/
│   │   │   │   │   └── page.tsx      # Login page
│   │   │   │   ├── dashboard/
│   │   │   │   │   └── page.tsx      # Dashboard
│   │   │   │   ├── devices/
│   │   │   │   │   ├── page.tsx      # Devices list
│   │   │   │   │   └── [id]/
│   │   │   │   │       └── page.tsx  # Device detail
│   │   │   │   ├── sessions/
│   │   │   │   │   ├── page.tsx      # Sessions list
│   │   │   │   │   └── [id]/
│   │   │   │   │       └── page.tsx  # Session live
│   │   │   │   ├── contacts/
│   │   │   │   │   └── page.tsx      # Contacts
│   │   │   │   ├── audit/
│   │   │   │   │   └── page.tsx      # Audit logs
│   │   │   │   └── enrollment/
│   │   │   │       └── page.tsx      # Enrollment tokens
│   │   │   ├── components/           # React components
│   │   │   │   ├── ui/               # shadcn/ui components
│   │   │   │   │   ├── button.tsx
│   │   │   │   │   ├── badge.tsx
│   │   │   │   │   ├── card.tsx
│   │   │   │   │   ├── table.tsx
│   │   │   │   │   └── ...
│   │   │   │   ├── layout/
│   │   │   │   │   ├── Header.tsx
│   │   │   │   │   ├── Sidebar.tsx
│   │   │   │   │   └── MainLayout.tsx
│   │   │   │   ├── devices/
│   │   │   │   │   ├── DevicesList.tsx
│   │   │   │   │   ├── DeviceStatusBadge.tsx
│   │   │   │   │   └── DeviceEnrollModal.tsx
│   │   │   │   ├── sessions/
│   │   │   │   │   ├── SessionsList.tsx
│   │   │   │   │   ├── SessionLiveDesktop.tsx
│   │   │   │   │   └── SessionLiveTerminal.tsx
│   │   │   │   └── audit/
│   │   │   │       └── AuditLogsList.tsx
│   │   │   ├── lib/                  # Utilities
│   │   │   │   ├── api.ts            # API client (fetch wrapper)
│   │   │   │   ├── auth.ts           # Auth helpers (JWT)
│   │   │   │   ├── websocket.ts      # WebSocket client
│   │   │   │   └── utils.ts          # Misc utils
│   │   │   └── styles/
│   │   │       └── globals.css       # Global styles (TailwindCSS)
│   │   ├── public/
│   │   │   ├── logo.svg
│   │   │   └── favicon.ico
│   │   ├── tests/
│   │   │   └── unit/
│   │   │       └── DeviceStatusBadge.test.tsx
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── next.config.js
│   │   ├── tailwind.config.js
│   │   └── .env.local.example
│   │
│   ├── agent/                         # Agent Rust
│   │   ├── src/
│   │   │   ├── main.rs               # Entry point
│   │   │   ├── config.rs             # Configuration (TOML)
│   │   │   ├── enrollment.rs         # Enrollment logic
│   │   │   ├── heartbeat.rs          # Heartbeat loop
│   │   │   ├── inventory.rs          # System inventory
│   │   │   ├── session.rs            # Session management
│   │   │   ├── webrtc.rs             # WebRTC peer (desktop)
│   │   │   ├── terminal.rs           # Terminal (PTY)
│   │   │   ├── files.rs              # File transfer
│   │   │   ├── storage.rs            # SQLite local storage
│   │   │   ├── websocket.rs          # WebSocket client
│   │   │   ├── policy.rs             # Policy engine
│   │   │   ├── update.rs             # Auto-update logic
│   │   │   └── utils/
│   │   │       ├── crypto.rs         # Cryptography helpers
│   │   │       └── logger.rs         # Logging setup
│   │   ├── tests/
│   │   │   ├── enrollment_test.rs
│   │   │   └── heartbeat_test.rs
│   │   ├── Cargo.toml
│   │   ├── Cargo.lock
│   │   └── .env.example
│   │
│   ├── shared/                        # Shared TypeScript code
│   │   ├── src/
│   │   │   ├── types/                # Shared types
│   │   │   │   ├── device.ts
│   │   │   │   ├── session.ts
│   │   │   │   ├── user.ts
│   │   │   │   └── audit.ts
│   │   │   ├── constants/            # Shared constants
│   │   │   │   ├── permissions.ts
│   │   │   │   └── roles.ts
│   │   │   └── utils/                # Shared utils
│   │   │       └── validation.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── database/                      # Database migrations
│       ├── migrations/
│       │   ├── 001_initial_schema.sql
│       │   ├── 002_add_unattended_password.sql
│       │   └── 003_add_contacts.sql
│       ├── seeds/
│       │   ├── 001_seed_roles.ts
│       │   └── 002_seed_test_data.ts
│       ├── ormconfig.ts              # TypeORM config
│       └── package.json
│
├── scripts/                           # Utility scripts
│   ├── setup-dev.sh                  # Setup dev env
│   ├── generate-certs.sh             # Generate dev TLS certs
│   ├── seed-data.sh                  # Seed test data
│   └── release.sh                    # Release automation
│
├── infra/                             # Infrastructure as Code
│   ├── docker/
│   │   ├── api.Dockerfile
│   │   ├── web.Dockerfile
│   │   └── agent.Dockerfile
│   ├── k8s/                          # Kubernetes manifests
│   │   ├── api-deployment.yaml
│   │   ├── web-deployment.yaml
│   │   ├── postgres-statefulset.yaml
│   │   ├── redis-deployment.yaml
│   │   └── ingress.yaml
│   ├── terraform/                    # Terraform (VPS provisioning)
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── outputs.tf
│   └── ansible/                      # Ansible (server config)
│       ├── playbook.yml
│       └── roles/
│
├── e2e/                               # E2E tests (Playwright)
│   ├── tests/
│   │   ├── login.spec.ts
│   │   ├── devices.spec.ts
│   │   ├── sessions.spec.ts
│   │   └── audit.spec.ts
│   ├── playwright.config.ts
│   └── package.json
│
├── .changeset/                        # Changesets (releases)
│   └── config.json
│
├── docker-compose.yml                 # Dev environment
├── docker-compose.prod.yml            # Production environment
├── turbo.json                         # Turborepo config
├── package.json                       # Root package.json
├── pnpm-workspace.yaml                # pnpm workspaces
├── .gitignore
├── .prettierrc
├── .eslintrc.js
├── LICENSE
└── README.md                          # Main README
```

---

## 3. Packages

### 3.1 Backend (api)

**Technologies** :
- NestJS 10+
- TypeScript 5+
- TypeORM (PostgreSQL)
- Redis (cache, PubSub)
- Socket.IO (WebSocket)
- Passport (OIDC)

**Dépendances clés** :
```json
{
  "dependencies": {
    "@nestjs/common": "^10.0.0",
    "@nestjs/core": "^10.0.0",
    "@nestjs/platform-express": "^10.0.0",
    "@nestjs/platform-socket.io": "^10.0.0",
    "@nestjs/typeorm": "^10.0.0",
    "@nestjs/passport": "^10.0.0",
    "typeorm": "^0.3.17",
    "pg": "^8.11.0",
    "redis": "^4.6.0",
    "socket.io": "^4.6.0",
    "passport": "^0.7.0",
    "passport-jwt": "^4.0.1",
    "bcrypt": "^5.1.1",
    "class-validator": "^0.14.0",
    "class-transformer": "^0.5.1"
  }
}
```

### 3.2 Frontend (web)

**Technologies** :
- Next.js 14 (App Router)
- React 18
- TailwindCSS 3
- shadcn/ui
- xterm.js (terminal)
- WebRTC (desktop streaming)

**Dépendances clés** :
```json
{
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "tailwindcss": "^3.4.0",
    "@radix-ui/react-*": "latest",
    "xterm": "^5.3.0",
    "xterm-addon-fit": "^0.8.0",
    "socket.io-client": "^4.6.0",
    "simple-peer": "^9.11.1"
  }
}
```

### 3.3 Agent (agent)

**Technologies** :
- Rust (stable)
- tokio (async runtime)
- serde (serialization)
- reqwest (HTTP client)
- tokio-tungstenite (WebSocket)
- libwebrtc (WebRTC)

**Dépendances clés** (Cargo.toml) :
```toml
[dependencies]
tokio = { version = "1.35", features = ["full"] }
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
reqwest = { version = "0.11", features = ["json"] }
tokio-tungstenite = "0.21"
sqlx = { version = "0.7", features = ["sqlite", "runtime-tokio-native-tls"] }
bcrypt = "0.15"
tracing = "0.1"
tracing-subscriber = "0.3"
```

---

## 4. Configuration

### 4.1 Variables d'environnement (backend)

```bash
# .env (packages/api/.env)

# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/myremote

# Redis
REDIS_URL=redis://localhost:6379

# Keycloak (OIDC)
KEYCLOAK_URL=https://auth.myremote.example.com
KEYCLOAK_REALM=myremote
KEYCLOAK_CLIENT_ID=myremote-api
KEYCLOAK_CLIENT_SECRET=***

# JWT
JWT_SECRET=change_me_in_production
JWT_EXPIRATION=15m
REFRESH_TOKEN_EXPIRATION=7d

# TURN
TURN_URL=turn:turn.myremote.example.com:3478
TURN_SECRET=***

# Vault (optional)
VAULT_ADDR=http://localhost:8200
VAULT_TOKEN=***

# Logging
LOG_LEVEL=info

# CORS
CORS_ORIGINS=https://myremote.example.com,http://localhost:3000
```

### 4.2 Variables d'environnement (frontend)

```bash
# .env.local (packages/web/.env.local)

NEXT_PUBLIC_API_URL=https://api.myremote.example.com
NEXT_PUBLIC_WS_URL=wss://api.myremote.example.com
NEXT_PUBLIC_KEYCLOAK_URL=https://auth.myremote.example.com
NEXT_PUBLIC_KEYCLOAK_REALM=myremote
NEXT_PUBLIC_KEYCLOAK_CLIENT_ID=myremote-web
```

### 4.3 Configuration agent (TOML)

```toml
# /etc/myremote/config.toml (Linux)

[server]
url = "https://api.myremote.example.com"
websocket_reconnect_delay_seconds = 5
heartbeat_interval_seconds = 30

[local]
database_path = "/var/lib/myremote/agent.db"
log_path = "/var/log/myremote/agent.log"
log_level = "info"

[security]
tls_verify = true
```

---

## 5. Scripts npm

### 5.1 Scripts root (package.json)

```json
{
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "test": "turbo run test",
    "lint": "turbo run lint",
    "format": "prettier --write \"**/*.{ts,tsx,js,jsx,json,md}\"",
    "clean": "turbo run clean && rm -rf node_modules",
    "db:migrate": "pnpm --filter database migrate",
    "db:seed": "pnpm --filter database seed",
    "docker:up": "docker-compose up -d",
    "docker:down": "docker-compose down",
    "docker:logs": "docker-compose logs -f"
  }
}
```

### 5.2 Scripts backend (packages/api/package.json)

```json
{
  "scripts": {
    "dev": "nest start --watch",
    "build": "nest build",
    "start": "node dist/main",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:cov": "jest --coverage",
    "test:e2e": "jest --config ./test/jest-e2e.json",
    "lint": "eslint \"{src,test}/**/*.ts\"",
    "format": "prettier --write \"src/**/*.ts\""
  }
}
```

### 5.3 Scripts frontend (packages/web/package.json)

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "test": "vitest",
    "lint": "next lint",
    "format": "prettier --write \"src/**/*.{ts,tsx}\""
  }
}
```

---

## 6. Environnement dev

### 6.1 Setup initial

```bash
# Clone repo
git clone https://github.com/your-org/myremote.git
cd myremote

# Install dependencies (pnpm)
pnpm install

# Setup env files
cp packages/api/.env.example packages/api/.env
cp packages/web/.env.local.example packages/web/.env.local
cp packages/agent/.env.example packages/agent/.env

# Start Docker services (PostgreSQL, Redis, Keycloak)
docker-compose up -d

# Wait for services to be ready
sleep 10

# Run migrations
pnpm db:migrate

# Seed test data
pnpm db:seed

# Start dev servers (parallel)
pnpm dev
# → API: http://localhost:4000
# → Web: http://localhost:3000
# → Agent: cargo run (manual)
```

### 6.2 Docker Compose (dev)

Services inclus :
- PostgreSQL 16
- Redis 7
- Keycloak 24
- Traefik (reverse proxy, dev TLS)
- Prometheus (metrics)
- Grafana (dashboards)

---

## Annexes

### A. Commandes utiles

```bash
# Build tout le monorepo
pnpm build

# Run tests (all packages)
pnpm test

# Lint + fix
pnpm lint --fix

# Clean (node_modules, dist, build artifacts)
pnpm clean

# Agent (Rust)
cd packages/agent
cargo build --release
cargo test
cargo clippy

# Database migrations
pnpm db:migrate:create add_new_column
pnpm db:migrate:run
pnpm db:migrate:revert

# Docker Compose
docker-compose up -d          # Start services
docker-compose down           # Stop services
docker-compose logs -f api    # Follow logs
docker-compose restart api    # Restart service
```

### B. IDE Setup (VSCode)

Extensions recommandées :
```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "rust-lang.rust-analyzer",
    "ms-vscode.vscode-typescript-next"
  ]
}
```

Settings (`.vscode/settings.json`) :
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "[rust]": {
    "editor.defaultFormatter": "rust-lang.rust-analyzer"
  }
}
```

---

**Document maintenu par** : Tech Lead
**Dernière révision** : 2026-01-22
**Repo** : https://github.com/your-org/myremote
