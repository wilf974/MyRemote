# MyRemote - Plan de Réalisation

**Version**: 1.0
**Date**: 2026-01-22
**Méthodologie**: Agile (Scrum), sprints 2 semaines

---

## Table des matières
1. [Vue d'ensemble](#1-vue-densemble)
2. [Roadmap & Jalons](#2-roadmap--jalons)
3. [Backlog MVP (Sprints 1-6)](#3-backlog-mvp-sprints-1-6)
4. [Backlog V1 (Sprints 7-12)](#4-backlog-v1-sprints-7-12)
5. [Stratégie Tests](#5-stratégie-tests)
6. [CI/CD Pipeline](#6-cicd-pipeline)
7. [Packaging & Releases](#7-packaging--releases)
8. [Équipe & Rôles](#8-équipe--rôles)

---

## 1. Vue d'ensemble

### 1.1 Timeline globale

```
┌─────────────────────────────────────────────────────────────────┐
│                         Timeline                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Semaines 1-2   : Sprint 0 (Setup infrastructure)              │
│  Semaines 3-4   : Sprint 1 (Auth + RBAC)                       │
│  Semaines 5-6   : Sprint 2 (Devices + Enrollment)              │
│  Semaines 7-8   : Sprint 3 (Agent Rust - Heartbeat)            │
│  Semaines 9-10  : Sprint 4 (Sessions Desktop WebRTC)           │
│  Semaines 11-12 : Sprint 5 (Terminal + Audit)                  │
│  Semaines 13-14 : Sprint 6 (Tests + MVP Release)               │
│                                                                 │
│  ───────────────── MVP RELEASE (14 semaines) ──────────────────│
│                                                                 │
│  Semaines 15-16 : Sprint 7 (Files Transfer)                    │
│  Semaines 17-18 : Sprint 8 (Contacts + Unattended)             │
│  Semaines 19-20 : Sprint 9 (Auto-update Agent)                 │
│  Semaines 21-22 : Sprint 10 (Multi-tenant + K8s)               │
│  Semaines 23-24 : Sprint 11 (Monitoring + Alerting)            │
│  Semaines 25-26 : Sprint 12 (Tests E2E + V1 Release)           │
│                                                                 │
│  ───────────────── V1 RELEASE (26 semaines) ───────────────────│
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 Définition of Done (DoD)

Critères pour considérer une user story "Done" :

```markdown
☐ Code écrit, reviewé, mergé (PR approuvée par 1+ reviewer)
☐ Tests unitaires écrits (coverage ≥ 70%)
☐ Tests E2E écrits (scénarios critiques)
☐ Documentation technique mise à jour (README, API docs)
☐ CI/CD pipeline passe (build, lint, tests)
☐ Déployé en staging, testé manuellement
☐ Security review (si feature sensible : auth, RBAC, chiffrement)
☐ Audit log implémenté (si applicable)
```

---

## 2. Roadmap & Jalons

### 2.1 MVP (14 semaines)

**Objectif** : Plateforme fonctionnelle pour support IT interne (50-200 postes).

**Features** :
- ✅ Authentification OIDC + 2FA
- ✅ RBAC (Admin, Operator, Viewer)
- ✅ Gestion devices (enrollment, inventory, status)
- ✅ Agent multi-OS (Windows, macOS, Linux) - heartbeat
- ✅ Sessions remote desktop (WebRTC, attended)
- ✅ Terminal à distance (WebSocket)
- ✅ Audit logs (immuables, 90j rétention)
- ✅ Docker Compose deployment

**Métriques success MVP** :
- 50 devices enrollés
- 5 techniciens utilisent quotidiennement
- 100% sessions auditées
- Temps connexion < 10s (95th percentile)

### 2.2 V1 (26 semaines totales)

**Objectif** : Plateforme production-ready, scalable, multi-tenant.

**Features additionnelles** :
- ✅ Transfert fichiers (upload/download)
- ✅ Carnet d'adresses (contacts, groupes)
- ✅ Mode unattended (mot de passe admin)
- ✅ Auto-update agent (signé)
- ✅ Multi-tenant (isolation organisations)
- ✅ Kubernetes deployment
- ✅ Monitoring avancé (Prometheus, Grafana, Loki)
- ✅ Alerting (failed logins, agent anomalies)

**Métriques success V1** :
- 500+ devices
- 20+ techniciens
- 99.5% uptime
- < 200ms latency API (p95)

---

## 3. Backlog MVP (Sprints 1-6)

### Sprint 0 : Setup Infrastructure (Semaines 1-2)

**Objectif** : Mettre en place environnement dev + CI/CD.

| User Story | Points | Assigné | Priorité |
|------------|--------|---------|----------|
| Créer repo monorepo (Turborepo) | 3 | DevOps | Haute |
| Setup Docker Compose (PostgreSQL, Redis, Keycloak) | 5 | DevOps | Haute |
| Setup CI/CD (GitHub Actions) | 5 | DevOps | Haute |
| Setup Keycloak (realm, client OIDC) | 3 | Backend | Haute |
| Setup backend NestJS (boilerplate) | 3 | Backend | Haute |
| Setup frontend Next.js (boilerplate) | 3 | Frontend | Haute |
| Setup agent Rust (boilerplate) | 5 | Agent | Haute |
| Migrations PostgreSQL (schema initial) | 3 | Backend | Haute |
| **Total Sprint 0** | **30 points** | | |

**Livrables** :
- Repo GitHub avec CI/CD
- Docker Compose up → services running
- Dev env prêt (hot reload backend/frontend)

---

### Sprint 1 : Auth + RBAC (Semaines 3-4)

**Objectif** : Authentification fonctionnelle + permissions de base.

| User Story | Points | Assigné | Priorité |
|------------|--------|---------|----------|
| US-021: Login OIDC (Keycloak integration) | 8 | Backend + Frontend | Critique |
| US-022: 2FA TOTP (enrollment + verification) | 5 | Backend + Frontend | Critique |
| US-023: RBAC middleware (NestJS guards) | 8 | Backend | Critique |
| US-024: JWT validation + refresh token rotation | 5 | Backend | Critique |
| Page Login (UI) | 3 | Frontend | Haute |
| Page Dashboard (skeleton) | 3 | Frontend | Haute |
| Tests E2E login flow | 3 | QA | Haute |
| **Total Sprint 1** | **35 points** | | |

**Démo** : User peut se connecter (email + 2FA), accéder dashboard vide.

---

### Sprint 2 : Devices + Enrollment (Semaines 5-6)

**Objectif** : Gestion devices + enrollment token fonctionnel.

| User Story | Points | Assigné | Priorité |
|------------|--------|---------|----------|
| US-001: Liste devices (API + UI) | 5 | Backend + Frontend | Critique |
| US-004: Générer token enrollment | 8 | Backend + Frontend | Critique |
| US-010-012: Enrollment flow (agent → API) | 13 | Backend + Agent | Critique |
| US-002: Filtres devices (status, OS, groupe) | 3 | Frontend | Moyenne |
| US-003: Créer groupes devices | 5 | Backend + Frontend | Moyenne |
| Page Devices (UI complète) | 5 | Frontend | Haute |
| Tests E2E enrollment | 3 | QA | Haute |
| **Total Sprint 2** | **42 points** | | |

**Démo** : Admin génère token, installe agent (stub), device apparaît dans liste.

---

### Sprint 3 : Agent Rust - Heartbeat (Semaines 7-8)

**Objectif** : Agent fonctionnel (enrollment, heartbeat, inventaire).

| User Story | Points | Assigné | Priorité |
|------------|--------|---------|----------|
| Agent: Enrollment (Windows) | 8 | Agent | Critique |
| Agent: Enrollment (macOS) | 8 | Agent | Critique |
| Agent: Enrollment (Linux) | 5 | Agent | Critique |
| Agent: Heartbeat WebSocket | 5 | Agent | Critique |
| Agent: Inventaire système (CPU, RAM, disks) | 5 | Agent | Haute |
| Agent: SQLite local (config storage) | 3 | Agent | Haute |
| Backend: WebSocket gateway (agent ↔ server) | 8 | Backend | Critique |
| Tests: Agent enrollment + heartbeat | 5 | QA | Haute |
| **Total Sprint 3** | **47 points** | | |

**Démo** : Agent réel installé (3 OS), envoie heartbeat, device status "online" dans UI.

---

### Sprint 4 : Sessions Desktop WebRTC (Semaines 9-10)

**Objectif** : Remote desktop fonctionnel (attended).

| User Story | Points | Assigné | Priorité |
|------------|--------|---------|----------|
| US-040-042: Create session attended (API) | 8 | Backend | Critique |
| Agent: WebRTC peer (screen capture) | 13 | Agent | Critique |
| Backend: WebRTC signaling (SDP, ICE) | 8 | Backend | Critique |
| Backend: TURN relay (coturn setup) | 5 | DevOps | Critique |
| Frontend: WebRTC client (video stream) | 8 | Frontend | Critique |
| US-043: Contrôle pointeur/clavier | 8 | Agent + Frontend | Critique |
| Page Session Live (UI) | 5 | Frontend | Haute |
| Tests E2E session desktop | 5 | QA | Haute |
| **Total Sprint 4** | **60 points** | | |

**Démo** : Technicien se connecte à un device, voit desktop, contrôle pointeur.

---

### Sprint 5 : Terminal + Audit (Semaines 11-12)

**Objectif** : Terminal remote + audit logs complets.

| User Story | Points | Assigné | Priorité |
|------------|--------|---------|----------|
| US-060-062: Terminal session (API) | 8 | Backend | Critique |
| Agent: PTY spawn (shell) | 8 | Agent | Critique |
| Backend: Terminal relay (WebSocket binary) | 5 | Backend | Critique |
| Frontend: xterm.js integration | 5 | Frontend | Critique |
| US-080-082: Audit logs (API + UI) | 8 | Backend + Frontend | Critique |
| Page Audit (UI) | 5 | Frontend | Haute |
| Audit: Logs toutes actions (sessions, devices) | 5 | Backend | Critique |
| Tests E2E terminal + audit | 3 | QA | Haute |
| **Total Sprint 5** | **47 points** | | |

**Démo** : Technicien ouvre terminal, exécute commandes, logs auditables.

---

### Sprint 6 : Tests + MVP Release (Semaines 13-14)

**Objectif** : Stabilisation, tests complets, déploiement MVP.

| Tâche | Points | Assigné | Priorité |
|-------|--------|---------|----------|
| Tests E2E complets (Playwright) | 13 | QA | Critique |
| Security audit (OWASP ZAP scan) | 5 | Security | Haute |
| Load testing (k6 - 100 devices, 10 sessions) | 5 | DevOps | Haute |
| Documentation finale (README, INSTALL) | 5 | Tech Lead | Haute |
| Packaging agent (MSI, PKG, DEB) | 8 | Agent + DevOps | Critique |
| Signature binaires agent (Cosign) | 3 | DevOps | Critique |
| Déploiement production VPS | 5 | DevOps | Critique |
| Formation équipe IT (3h) | 3 | Tech Lead | Moyenne |
| **Total Sprint 6** | **47 points** | | |

**Démo** : MVP déployé, 50 devices enrollés, techniciens formés.

---

## 4. Backlog V1 (Sprints 7-12)

### Sprint 7 : Files Transfer (Semaines 15-16)

| User Story | Points | Assigné | Priorité |
|------------|--------|---------|----------|
| US-070-073: File transfer (API) | 8 | Backend | Haute |
| Agent: File access (SFTP-like) | 8 | Agent | Haute |
| Backend: Files relay (WebSocket chunked) | 5 | Backend | Haute |
| Frontend: File browser UI | 8 | Frontend | Haute |
| Frontend: Upload/download progress | 3 | Frontend | Moyenne |
| Tests E2E files | 3 | QA | Haute |
| **Total Sprint 7** | **35 points** | | |

---

### Sprint 8 : Contacts + Unattended (Semaines 17-18)

| User Story | Points | Assigné | Priorité |
|------------|--------|---------|----------|
| US-030-033: Carnet d'adresses (API + UI) | 8 | Backend + Frontend | Haute |
| US-050-053: Mode unattended (API) | 8 | Backend | Haute |
| Agent: Mot de passe unattended | 5 | Agent | Haute |
| Page Contacts (UI) | 5 | Frontend | Haute |
| Tests E2E contacts + unattended | 3 | QA | Haute |
| **Total Sprint 8** | **29 points** | | |

---

### Sprint 9 : Auto-update Agent (Semaines 19-20)

| User Story | Points | Assigné | Priorité |
|------------|--------|---------|----------|
| US-090-092: Policy pull agent | 8 | Backend + Agent | Haute |
| Agent: Auto-update logic | 13 | Agent | Haute |
| Agent: Signature verification (Cosign) | 5 | Agent | Haute |
| Backend: Publish new agent version (API) | 3 | Backend | Haute |
| Tests: Auto-update flow | 5 | QA | Haute |
| **Total Sprint 9** | **34 points** | | |

---

### Sprint 10 : Multi-tenant + K8s (Semaines 21-22)

| Tâche | Points | Assigné | Priorité |
|-------|--------|---------|----------|
| Migration multi-tenant (organizations table) | 13 | Backend | Haute |
| RBAC multi-tenant (RLS PostgreSQL) | 8 | Backend | Haute |
| Kubernetes manifests (Helm charts) | 13 | DevOps | Haute |
| Migration Docker Compose → K8s | 8 | DevOps | Haute |
| Tests multi-tenant isolation | 5 | QA | Haute |
| **Total Sprint 10** | **47 points** | | |

---

### Sprint 11 : Monitoring + Alerting (Semaines 23-24)

| Tâche | Points | Assigné | Priorité |
|-------|--------|---------|----------|
| Prometheus metrics (API, agent, sessions) | 8 | Backend + Agent | Haute |
| Grafana dashboards (overview, devices, sessions) | 5 | DevOps | Haute |
| Loki logs centralisés | 5 | DevOps | Haute |
| Alerting rules (Prometheus Alertmanager) | 5 | DevOps | Haute |
| PagerDuty integration | 3 | DevOps | Moyenne |
| Tests alerting | 3 | QA | Moyenne |
| **Total Sprint 11** | **29 points** | | |

---

### Sprint 12 : Tests E2E + V1 Release (Semaines 25-26)

| Tâche | Points | Assigné | Priorité |
|-------|--------|---------|----------|
| Tests E2E V1 (tous features) | 13 | QA | Critique |
| Pentest externe (optionnel) | 13 | Security | Haute |
| Load testing (1000 devices, 50 sessions) | 5 | DevOps | Haute |
| Documentation V1 (changelog, migration guide) | 5 | Tech Lead | Haute |
| Déploiement production K8s | 5 | DevOps | Critique |
| **Total Sprint 12** | **41 points** | | |

**Démo** : V1 release, 500+ devices, multi-tenant, K8s, monitoring complet.

---

## 5. Stratégie Tests

### 5.1 Pyramide de tests

```
            ┌─────────────┐
            │   E2E (5%)  │  Playwright (scénarios complets)
            └─────────────┘
         ┌──────────────────┐
         │ Integration (15%)│  Tests API, DB, WebSocket
         └──────────────────┘
      ┌─────────────────────────┐
      │  Unit Tests (80%)       │  Jest (backend), Vitest (frontend), Rust tests (agent)
      └─────────────────────────┘
```

### 5.2 Tests unitaires

**Backend (NestJS + Jest)** :
```typescript
// devices.service.spec.ts
describe('DevicesService', () => {
  it('should list devices with status filter', async () => {
    const devices = await service.list({ status: 'online' });
    expect(devices.length).toBeGreaterThan(0);
    expect(devices[0].status).toBe('online');
  });

  it('should throw 404 if device not found', async () => {
    await expect(service.findOne('invalid-id')).rejects.toThrow(NotFoundException);
  });
});
```

**Frontend (Next.js + Vitest)** :
```typescript
// DeviceStatusBadge.test.tsx
import { render } from '@testing-library/react';
import DeviceStatusBadge from './DeviceStatusBadge';

test('renders online badge', () => {
  const { getByText } = render(<DeviceStatusBadge status="online" />);
  expect(getByText('🟢 Online')).toBeInTheDocument();
});
```

**Agent (Rust + cargo test)** :
```rust
// agent/src/enrollment.rs
#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_enroll_with_valid_token() {
        let result = enroll("myr_valid_token", "PC-Test").await;
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_enroll_with_expired_token() {
        let result = enroll("myr_expired_token", "PC-Test").await;
        assert!(result.is_err());
    }
}
```

### 5.3 Tests E2E (Playwright)

```typescript
// e2e/session-desktop.spec.ts
import { test, expect } from '@playwright/test';

test('create attended session and connect', async ({ page, context }) => {
  // Login
  await page.goto('https://myremote.example.com');
  await page.click('text=Continue with Keycloak SSO');
  await page.fill('input[name="username"]', 'julie@example.com');
  await page.fill('input[name="password"]', 'password123');
  await page.click('button[type="submit"]');
  await page.fill('input[name="totp"]', '123456'); // Mock TOTP
  await page.click('button[type="submit"]');

  // Liste devices
  await page.goto('https://myremote.example.com/devices');
  await expect(page.locator('text=PC-Bureau-001')).toBeVisible();

  // Créer session
  await page.click('text=Connect');
  await page.click('text=Desktop (Attended)');

  // Vérifier session pending consent
  await expect(page.locator('text=Waiting for user consent...')).toBeVisible();

  // Simuler consentement (agent mock)
  // ...

  // Vérifier session active
  await expect(page.locator('text=Session Active')).toBeVisible({ timeout: 10000 });
});
```

### 5.4 Tests de charge (k6)

```javascript
// load-tests/api-devices.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '2m', target: 100 }, // Ramp-up 100 users
    { duration: '5m', target: 100 }, // Stay 100 users
    { duration: '2m', target: 0 },   // Ramp-down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% requests < 500ms
  },
};

export default function () {
  const response = http.get('https://api.myremote.example.com/api/v1/devices', {
    headers: { Authorization: 'Bearer TOKEN' },
  });
  check(response, { 'status is 200': (r) => r.status === 200 });
  sleep(1);
}
```

---

## 6. CI/CD Pipeline

### 6.1 GitHub Actions Workflow

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run lint

  test-backend:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_PASSWORD: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      redis:
        image: redis:7
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run test:backend
      - run: npm run test:coverage
      - uses: codecov/codecov-action@v4

  test-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run test:frontend

  test-agent:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]
    steps:
      - uses: actions/checkout@v4
      - uses: actions-rs/toolchain@v1
        with:
          toolchain: stable
      - run: cargo test --manifest-path agent/Cargo.toml

  build-agent:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]
    steps:
      - uses: actions/checkout@v4
      - uses: actions-rs/toolchain@v1
        with:
          toolchain: stable
      - run: cargo build --release --manifest-path agent/Cargo.toml
      - uses: actions/upload-artifact@v4
        with:
          name: agent-${{ matrix.os }}
          path: agent/target/release/myremote-agent*

  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: docker-compose up -d
      - run: npx playwright install
      - run: npm run test:e2e
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-videos
          path: test-results/

  security-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: aquasecurity/trivy-action@master
        with:
          scan-type: 'fs'
          scan-ref: '.'
          format: 'sarif'
          output: 'trivy-results.sarif'
      - uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: 'trivy-results.sarif'

  deploy-staging:
    needs: [lint, test-backend, test-frontend, test-agent, e2e]
    if: github.ref == 'refs/heads/develop'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: docker-compose -f docker-compose.staging.yml up -d
      # Deploy to staging VPS via SSH
      - uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.STAGING_HOST }}
          username: deploy
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            cd /opt/myremote
            git pull origin develop
            docker-compose pull
            docker-compose up -d
```

### 6.2 Pipeline stages

```
┌─────────────────────────────────────────────────────────────────┐
│                        CI/CD Pipeline                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. Lint (ESLint, Prettier)             ───► ✓ Pass            │
│  2. Test Backend (Jest)                 ───► ✓ Pass (95% cov)  │
│  3. Test Frontend (Vitest)              ───► ✓ Pass            │
│  4. Test Agent (cargo test)             ───► ✓ Pass (3 OS)     │
│  5. Build Agent (cargo build --release) ───► ✓ Artifacts       │
│  6. E2E Tests (Playwright)              ───► ✓ Pass            │
│  7. Security Scan (Trivy)               ───► ✓ No vulns        │
│                                                                 │
│  ──────────────── If develop branch ───────────────────        │
│  8. Deploy Staging (Docker Compose)     ───► ✓ Deployed        │
│                                                                 │
│  ──────────────── If main branch + tag ────────────────        │
│  9. Build & Sign Agent (Cosign)         ───► ✓ Signed          │
│ 10. Build Docker Images                 ───► ✓ Pushed          │
│ 11. Deploy Production (K8s)             ───► ✓ Deployed        │
│ 12. Create GitHub Release               ───► ✓ v1.0.0          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 7. Packaging & Releases

### 7.1 Versioning (SemVer)

```
Version format: MAJOR.MINOR.PATCH

Examples:
- 1.0.0 : MVP release
- 1.1.0 : V1 release (features additionnelles)
- 1.1.1 : Patch (bugfix)
- 2.0.0 : Breaking changes (future)
```

### 7.2 Agent Packaging

**Windows (MSI)** :
```bash
# Build agent
cargo build --release --target x86_64-pc-windows-msvc

# Create MSI (WiX Toolset)
candle myremote-agent.wxs
light -out myremote-agent-windows-x64.msi myremote-agent.wixobj

# Sign (Authenticode)
signtool sign /f cert.pfx /p password /t http://timestamp.digicert.com myremote-agent-windows-x64.msi

# Verify signature
signtool verify /pa myremote-agent-windows-x64.msi
```

**macOS (PKG)** :
```bash
# Build agent (universal binary)
cargo build --release --target x86_64-apple-darwin
cargo build --release --target aarch64-apple-darwin
lipo -create -output myremote-agent target/x86_64-apple-darwin/release/myremote-agent target/aarch64-apple-darwin/release/myremote-agent

# Create PKG
pkgbuild --root installer/root --identifier com.myremote.agent --version 1.0.0 --install-location /usr/local/bin myremote-agent-macos-universal.pkg

# Sign (Developer ID)
productsign --sign "Developer ID Installer: MyRemote Inc (TEAM_ID)" myremote-agent-macos-universal.pkg myremote-agent-macos-universal-signed.pkg

# Notarize (Apple)
xcrun notarytool submit myremote-agent-macos-universal-signed.pkg --keychain-profile "notarytool" --wait

# Verify
spctl -a -v --type install myremote-agent-macos-universal-signed.pkg
```

**Linux (DEB/RPM)** :
```bash
# Build agent
cargo build --release --target x86_64-unknown-linux-gnu

# Create DEB
fpm -s dir -t deb -n myremote-agent -v 1.0.0 \
  --prefix /usr/bin \
  --deb-systemd myremote-agent.service \
  target/release/myremote-agent

# Sign DEB (GPG)
dpkg-sig --sign builder myremote-agent_1.0.0_amd64.deb

# Create RPM
fpm -s dir -t rpm -n myremote-agent -v 1.0.0 \
  --prefix /usr/bin \
  target/release/myremote-agent

# Sign RPM
rpm --addsign myremote-agent-1.0.0-1.x86_64.rpm
```

### 7.3 Release Checklist

```markdown
☐ Code freeze (branch release/vX.Y.Z)
☐ Bump version (package.json, Cargo.toml, etc.)
☐ Update CHANGELOG.md
☐ Run full test suite (unit + E2E)
☐ Security scan (Trivy, Snyk)
☐ Build agent binaries (3 OS)
☐ Sign binaries (Authenticode, Notarization, GPG)
☐ Verify signatures
☐ Build Docker images (api, web)
☐ Tag Docker images (ghcr.io/myremote/api:vX.Y.Z)
☐ Push Docker images
☐ Deploy staging → smoke test
☐ Deploy production (canary ou blue/green)
☐ Create GitHub Release (tag + binaries + changelog)
☐ Update documentation (docs.myremote.example.com)
☐ Announce release (email, Slack, changelog blog post)
```

---

## 8. Équipe & Rôles

### 8.1 Composition équipe MVP

| Rôle | Nombre | Responsabilités |
|------|--------|-----------------|
| **Tech Lead / Architecte** | 1 | Architecture, code reviews, décisions techniques |
| **Backend Developer** | 2 | API NestJS, PostgreSQL, WebSocket, RBAC |
| **Frontend Developer** | 1 | Next.js, UI/UX, WebRTC client |
| **Agent Developer (Rust)** | 1 | Agent multi-OS, WebRTC peer, auto-update |
| **DevOps** | 1 | CI/CD, Docker, K8s, monitoring, infra |
| **QA / Test Engineer** | 1 | Tests E2E, load tests, security scans |
| **Security / RSSI** | 0.5 (part-time) | Threat model, audits, compliance |

**Total** : 7.5 FTE

### 8.2 Cérémonies Scrum

| Cérémonie | Fréquence | Durée | Participants |
|-----------|-----------|-------|--------------|
| **Sprint Planning** | Début sprint (2 semaines) | 2h | Toute l'équipe |
| **Daily Standup** | Quotidien | 15min | Toute l'équipe |
| **Sprint Review** | Fin sprint | 1h | Équipe + stakeholders |
| **Sprint Retrospective** | Fin sprint | 1h | Toute l'équipe |
| **Backlog Refinement** | Mi-sprint | 1h | Tech Lead + Product Owner |

---

## Annexes

### A. Outils de gestion projet

| Outil | Usage |
|-------|-------|
| **Jira** | Backlog, sprints, tickets |
| **Confluence** | Documentation (specs, ADR) |
| **Slack** | Communication équipe |
| **GitHub** | Code, PR reviews, CI/CD |
| **Figma** | Mockups UI/UX |

### B. Métriques Agile

| Métrique | Objectif | Mesure |
|----------|----------|--------|
| **Velocity** | 35-45 points/sprint | Story points completed |
| **Cycle Time** | < 3 jours | Temps PR open → merged |
| **Lead Time** | < 5 jours | Ticket créé → déployé |
| **Bug Ratio** | < 10% stories | Bugs / Total stories |
| **Test Coverage** | ≥ 70% | Backend + Frontend + Agent |

---

**Document maintenu par** : Tech Lead + Scrum Master
**Dernière révision** : 2026-01-22
**Backlog complet** : Jira (https://myremote.atlassian.net)
