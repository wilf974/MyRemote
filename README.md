# MyRemote - Remote Support Platform

**Version**: 1.0.0-MVP
**License**: MIT
**Status**: 🚧 In Development

MyRemote est une plateforme de support et d'administration à distance **légitime** pour équipes IT internes. Self-hosted, sécurisée, conforme RGPD.

---

## ✨ Features

- ✅ **Gestion de parc** : Inventaire devices multi-OS (Windows, macOS, Linux)
- ✅ **Remote Desktop** : WebRTC peer-to-peer (attended avec consentement)
- ✅ **Terminal** : Shell à distance (bash, cmd, powershell)
- ✅ **Transfert fichiers** : Upload/download sécurisé
- ✅ **Audit complet** : Logs immuables, rétention 90j
- ✅ **RBAC granulaire** : Admin, Operator, Viewer, Auditor
- ✅ **2FA obligatoire** : TOTP (Google Authenticator compatible)
- ✅ **Multi-OS agent** : Windows 10+, macOS 13+, Ubuntu/Debian

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    MyRemote Platform                        │
├─────────────────────────────────────────────────────────────┤
│  Control Plane:                                             │
│  • API Gateway (NestJS + PostgreSQL + Redis)                │
│  • WebSocket Gateway (signaling WebRTC)                     │
│  • Auth (Keycloak OIDC + 2FA)                               │
│                                                              │
│  Data Plane:                                                │
│  • WebRTC (desktop streaming, P2P prioritaire)              │
│  • TURN Relay (fallback NAT traversal)                      │
│  • Terminal/Files Relay (WebSocket)                         │
│                                                              │
│  Observability:                                             │
│  • Prometheus + Grafana + Loki                              │
└─────────────────────────────────────────────────────────────┘
```

Voir [Architecture détaillée](./docs/02-ARCHITECTURE.md)

---

## 🚀 Quick Start

### Prérequis

- **Node.js** 20+
- **pnpm** 8+
- **Docker** + Docker Compose
- **Rust** (stable, pour agent)
- **PostgreSQL** 16+ (via Docker)
- **Redis** 7+ (via Docker)

### Installation (Dev)

```bash
# 1. Clone repo
git clone https://github.com/your-org/myremote.git
cd myremote

# 2. Install dependencies
pnpm install

# 3. Setup env files
cp packages/api/.env.example packages/api/.env
cp packages/web/.env.local.example packages/web/.env.local
# → Edit .env files (database credentials, etc.)

# 4. Start infrastructure (PostgreSQL, Redis, Keycloak)
docker-compose up -d

# 5. Wait services ready (30s)
sleep 30

# 6. Run database migrations
pnpm db:migrate

# 7. Seed test data (optional)
pnpm db:seed

# 8. Start dev servers
pnpm dev
# → API: http://localhost:4000
# → Web UI: http://localhost:3000
# → Keycloak: http://localhost:8080 (admin/admin)
```

### Login (Dev)

Default test user (créé par seed) :
- **Email** : `admin@example.com`
- **Password** : `password123`
- **2FA** : Scan QR code avec Google Authenticator

---

## 📦 Repository Structure

```
myremote/
├── packages/
│   ├── api/          # Backend NestJS (API REST + WebSocket)
│   ├── web/          # Frontend Next.js 14 (App Router)
│   ├── agent/        # Agent Rust (Windows, macOS, Linux)
│   ├── shared/       # Shared TypeScript code (types, utils)
│   └── database/     # Migrations SQL (TypeORM)
│
├── docs/             # Documentation complète
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
├── e2e/              # Tests E2E (Playwright)
├── infra/            # Infrastructure as Code (Docker, K8s, Terraform)
└── scripts/          # Utility scripts
```

Voir [Structure complète](./docs/09-REPO-STRUCTURE.md)

---

## 🔐 Sécurité

MyRemote est conçu avec une approche **Zero Trust** et **Defense in Depth**.

**Principes** :
- ❌ **Aucune fonctionnalité furtive** : pas de keylogger, pas de collecte mots de passe
- ✅ **Consentement explicite** : mode "attended" nécessite acceptation utilisateur
- ✅ **Audit complet** : logs immuables (append-only), 90j rétention
- ✅ **Chiffrement** : TLS 1.3 (transit), DTLS (WebRTC), encryption au repos (PostgreSQL)
- ✅ **RBAC granulaire** : permissions par action (devices:view, sessions:create, etc.)
- ✅ **2FA obligatoire** : TOTP via Keycloak
- ✅ **Rate limiting** : 100 req/min/user, protection DDoS
- ✅ **Binaires signés** : agent signé (Authenticode, Notarization, GPG)

Voir [Threat Model complet](./docs/07-SECURITY-THREAT-MODEL.md)

---

## 📖 Documentation

| Document | Description |
|----------|-------------|
| [PRD](./docs/01-PRD.md) | Product Requirements (personas, user stories) |
| [Architecture](./docs/02-ARCHITECTURE.md) | Diagrammes C4, protocols, NAT traversal |
| [Database Schema](./docs/03-DATABASE-SCHEMA.md) | Modèle PostgreSQL (tables, relations, indexes) |
| [API Spec](./docs/04-API-SPECIFICATION.md) | REST API (OpenAPI), endpoints, payloads |
| [Agent Enrollment](./docs/05-AGENT-ENROLLMENT.md) | Installation agent, enrollment, heartbeat |
| [UI/UX Mockups](./docs/06-UI-UX-MOCKUPS.md) | Maquettes textuelles pages principales |
| [Security](./docs/07-SECURITY-THREAT-MODEL.md) | STRIDE threat model, RBAC, chiffrement |
| [Implementation Plan](./docs/08-IMPLEMENTATION-PLAN.md) | Sprints, backlog, tests, CI/CD |
| [Repo Structure](./docs/09-REPO-STRUCTURE.md) | Arborescence, packages, scripts |

---

## 🧪 Tests

### Tests unitaires

```bash
# Backend (Jest)
pnpm --filter api test

# Frontend (Vitest)
pnpm --filter web test

# Agent (Rust)
cd packages/agent && cargo test
```

### Tests E2E

```bash
# Playwright (scénarios complets)
pnpm test:e2e
```

### Tests de charge

```bash
# k6 (100 users, 5min)
k6 run e2e/load-tests/api-devices.js
```

---

## 🚢 Deployment

### Docker Compose (MVP)

```bash
# Production (VPS)
docker-compose -f docker-compose.prod.yml up -d
```

### Kubernetes (V1)

```bash
# Deploy all services
kubectl apply -f infra/k8s/

# Verify
kubectl get pods -n myremote
kubectl logs -f deployment/api -n myremote
```

Voir [Deployment Guide](./docs/deployment.md) (à créer)

---

## 🤝 Contributing

Contributions bienvenues ! Merci de :
1. Fork le repo
2. Créer une branche (`git checkout -b feature/amazing-feature`)
3. Commit avec message conventionnel (`git commit -m 'feat: add amazing feature'`)
4. Push (`git push origin feature/amazing-feature`)
5. Ouvrir une Pull Request

Code of Conduct : [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md) (à créer)

---

## 📊 Roadmap

### ✅ MVP (Q1 2026)
- Authentification OIDC + 2FA
- Gestion devices (enrollment, inventory)
- Agent multi-OS (Windows, macOS, Linux)
- Remote desktop (WebRTC, attended)
- Terminal à distance
- Audit logs

### 🚧 V1 (Q2 2026)
- Transfert fichiers
- Carnet d'adresses
- Mode unattended (mot de passe admin)
- Auto-update agent
- Multi-tenant
- Kubernetes deployment

### 🔮 V2 (Q3-Q4 2026)
- Mobile app (iOS, Android)
- Chat intégré
- Enregistrement sessions
- Wake-on-LAN
- Intégrations (Jira, Slack, PagerDuty)

---

## 📄 License

MIT License - voir [LICENSE](./LICENSE)

**IMPORTANT** : MyRemote est conçu pour un usage **légitime** uniquement (support IT autorisé). Toute utilisation malveillante est strictement interdite.

---

## 🙏 Acknowledgments

Technologies utilisées :
- [NestJS](https://nestjs.com/) - Backend framework
- [Next.js](https://nextjs.org/) - Frontend framework
- [Rust](https://www.rust-lang.org/) - Agent
- [PostgreSQL](https://www.postgresql.org/) - Database
- [Keycloak](https://www.keycloak.org/) - Auth (OIDC)
- [WebRTC](https://webrtc.org/) - Real-time communication
- [shadcn/ui](https://ui.shadcn.com/) - UI components
- [Turborepo](https://turbo.build/) - Monorepo orchestration

---

## 📞 Support

- **Issues** : [GitHub Issues](https://github.com/your-org/myremote/issues)
- **Discussions** : [GitHub Discussions](https://github.com/your-org/myremote/discussions)
- **Email** : support@myremote.example.com

---

**Made with ❤️ by the MyRemote team**
