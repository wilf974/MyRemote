# MyRemote - Architecture Détaillée

**Version**: 1.0
**Date**: 2026-01-22

---

## Table des matières
1. [Vue d'ensemble](#1-vue-densemble)
2. [Diagramme C4 - Niveau 1 (Contexte)](#2-diagramme-c4---niveau-1-contexte)
3. [Diagramme C4 - Niveau 2 (Conteneurs)](#3-diagramme-c4---niveau-2-conteneurs)
4. [Séparation Control Plane / Data Plane](#4-séparation-control-plane--data-plane)
5. [Protocoles & Communications](#5-protocoles--communications)
6. [NAT Traversal (STUN/TURN)](#6-nat-traversal-stunturn)
7. [Architecture de sécurité](#7-architecture-de-sécurité)
8. [Déploiement & Infrastructure](#8-déploiement--infrastructure)
9. [Scalabilité & HA](#9-scalabilité--ha)

---

## 1. Vue d'ensemble

### 1.1 Principes architecturaux

| Principe | Description |
|----------|-------------|
| **Zero Trust** | Aucune confiance implicite : auth à chaque requête, RBAC strict |
| **Separation of Concerns** | Control Plane (orchestration) ≠ Data Plane (flux remote) |
| **Defense in Depth** | Chiffrement, firewall, rate limiting, audit |
| **Stateless Control Plane** | API sans état → scalabilité horizontale |
| **Observability First** | Logs structurés, métriques, traces |
| **Fail Secure** | En cas d'erreur, refuser l'accès (deny by default) |

### 1.2 Architecture de référence

```
┌─────────────────────────────────────────────────────────────┐
│                      MyRemote Platform                       │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐    │
│  │   Control    │   │     Data     │   │  Observability│    │
│  │    Plane     │   │    Plane     │   │     Stack     │    │
│  │              │   │              │   │               │    │
│  │  - API       │   │  - WebRTC    │   │  - Prometheus │    │
│  │  - Auth      │   │  - TURN      │   │  - Grafana    │    │
│  │  - Database  │   │  - WebSocket │   │  - Loki       │    │
│  │  - Redis     │   │              │   │               │    │
│  └──────────────┘   └──────────────┘   └──────────────┘    │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                  Security Layer                       │   │
│  │  - Keycloak (OIDC) - 2FA - RBAC - TLS/DTLS - Vault  │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
└─────────────────────────────────────────────────────────────┘
         ▲                          ▲                    ▲
         │                          │                    │
    ┌────┴────┐              ┌──────┴──────┐      ┌─────┴─────┐
    │ Web UI  │              │   Agents    │      │   Admins  │
    │ (Next)  │              │ (Win/Mac/   │      │ (Grafana) │
    │         │              │  Linux)     │      │           │
    └─────────┘              └─────────────┘      └───────────┘
```

---

## 2. Diagramme C4 - Niveau 1 (Contexte)

```
                 ┌──────────────────────────────────────┐
                 │         MyRemote Platform            │
                 │  (Remote Support & Fleet Management) │
                 └──────────────────────────────────────┘
                        ▲              ▲              ▲
                        │              │              │
        ┌───────────────┘              │              └──────────────┐
        │                              │                             │
        │                              │                             │
   ┌────┴─────┐                  ┌─────┴──────┐              ┌──────┴───────┐
   │  IT      │                  │   End      │              │   Security   │
   │  Admins/ │                  │   Users    │              │   Officer    │
   │  Techs   │                  │  (Devices) │              │   (RSSI)     │
   └────┬─────┘                  └─────┬──────┘              └──────┬───────┘
        │                              │                             │
        │ • Manage fleet               │ • Grant consent             │ • Audit logs
        │ • Remote sessions            │ • Receive support           │ • Security policies
        │ • Audit logs                 │ • See who's connected       │ • Compliance reports
        │                              │                             │
        │                              │                             │
        ▼                              ▼                             ▼
   ┌─────────────────────────────────────────────────────────────────────┐
   │                     External Systems                                 │
   ├─────────────────────────────────────────────────────────────────────┤
   │  • Keycloak (OIDC/2FA)                                               │
   │  • SMTP (email alerts)                                               │
   │  • S3-compatible storage (backups)                                   │
   │  • (Optional) Ticketing system (Jira, etc.)                          │
   └─────────────────────────────────────────────────────────────────────┘
```

### Acteurs principaux

1. **IT Admins / Technicians** (Personas Marc, Julie)
   - Gèrent le parc de postes
   - Initient les sessions remote
   - Consultent l'audit

2. **End Users** (Persona Sophie)
   - Reçoivent du support
   - Donnent consentement (mode attended)
   - Voient qui est connecté

3. **Security Officer** (Persona Thomas)
   - Audite les accès
   - Configure les politiques de sécurité
   - Exporte les logs (compliance)

---

## 3. Diagramme C4 - Niveau 2 (Conteneurs)

```
┌───────────────────────────────────────────────────────────────────────────┐
│                          MyRemote Platform                                 │
├───────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐ │
│  │                        CONTROL PLANE                                 │ │
│  │                                                                      │ │
│  │  ┌────────────┐   ┌────────────┐   ┌────────────┐   ┌───────────┐ │ │
│  │  │   Web UI   │   │  API       │   │ WebSocket  │   │  Auth     │ │ │
│  │  │  (Next.js) │   │ Gateway    │   │  Gateway   │   │ Service   │ │ │
│  │  │            │   │ (NestJS)   │   │ (NestJS)   │   │(Keycloak) │ │ │
│  │  │ - Dashboard│   │            │   │            │   │           │ │ │
│  │  │ - Devices  │   │ - REST API │   │ - Agent ↔  │   │ - OIDC    │ │ │
│  │  │ - Sessions │   │ - GraphQL  │   │   Server   │   │ - 2FA     │ │ │
│  │  │ - Audit    │   │ - RBAC     │   │ - Signaling│   │ - JWT     │ │ │
│  │  └────────────┘   └────────────┘   └────────────┘   └───────────┘ │ │
│  │        │                 │                 │                │       │ │
│  │        └─────────────────┴─────────────────┴────────────────┘       │ │
│  │                                  │                                   │ │
│  │                                  ▼                                   │ │
│  │                    ┌───────────────────────────┐                    │ │
│  │                    │    PostgreSQL             │                    │ │
│  │                    │  - users, devices         │                    │ │
│  │                    │  - sessions, audit_logs   │                    │ │
│  │                    │  - RBAC, contacts         │                    │ │
│  │                    └───────────────────────────┘                    │ │
│  │                                  ▲                                   │ │
│  │                                  │                                   │ │
│  │                    ┌───────────────────────────┐                    │ │
│  │                    │    Redis                  │                    │ │
│  │                    │  - Sessions cache         │                    │ │
│  │                    │  - Rate limiting          │                    │ │
│  │                    │  - PubSub (real-time)     │                    │ │
│  │                    └───────────────────────────┘                    │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐ │
│  │                          DATA PLANE                                  │ │
│  │                                                                      │ │
│  │  ┌────────────┐   ┌────────────┐   ┌────────────┐                 │ │
│  │  │  WebRTC    │   │   TURN     │   │  Terminal/ │                 │ │
│  │  │ Signaling  │   │   Relay    │   │   Files    │                 │ │
│  │  │  Server    │   │  (coturn)  │   │   Relay    │                 │ │
│  │  │            │   │            │   │ (WebSocket)│                 │ │
│  │  │ - SDP      │   │ - STUN     │   │            │                 │ │
│  │  │ - ICE      │   │ - TURN     │   │ - Shell    │                 │ │
│  │  │ - P2P      │   │ - Fallback │   │ - SFTP-like│                 │ │
│  │  └────────────┘   └────────────┘   └────────────┘                 │ │
│  │        │                 │                 │                        │ │
│  │        └─────────────────┴─────────────────┘                        │ │
│  │                          │                                           │ │
│  │                     (Media flows)                                    │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐ │
│  │                     OBSERVABILITY STACK                              │ │
│  │                                                                      │ │
│  │  ┌────────────┐   ┌────────────┐   ┌────────────┐                 │ │
│  │  │ Prometheus │   │  Grafana   │   │    Loki    │                 │ │
│  │  │ (Metrics)  │   │(Dashboards)│   │   (Logs)   │                 │ │
│  │  └────────────┘   └────────────┘   └────────────┘                 │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
└───────────────────────────────────────────────────────────────────────────┘
                    ▲                                    ▲
                    │                                    │
                    │                                    │
        ┌───────────┴──────────┐              ┌─────────┴──────────┐
        │   Technicians        │              │   Agents           │
        │   (Web Browser)      │              │  (Win/Mac/Linux)   │
        │                      │              │                    │
        │ - HTTPS/WSS          │              │ - WebSocket (443)  │
        │ - JWT auth           │              │ - mTLS (optional)  │
        └──────────────────────┘              └────────────────────┘
```

### Description des conteneurs

#### Control Plane

| Conteneur | Technologies | Responsabilités |
|-----------|-------------|-----------------|
| **Web UI** | Next.js 14, React, TailwindCSS | Interface utilisateur (dashboard, devices, sessions, audit) |
| **API Gateway** | NestJS, TypeScript | REST/GraphQL API, RBAC, business logic |
| **WebSocket Gateway** | NestJS, Socket.IO | Signaling WebRTC, agent ↔ server communication, real-time updates |
| **Auth Service** | Keycloak (externe) | OIDC, 2FA TOTP, gestion utilisateurs |
| **PostgreSQL** | PostgreSQL 16 | Base de données principale (users, devices, sessions, audit) |
| **Redis** | Redis 7 | Cache sessions, rate limiting, PubSub |

#### Data Plane

| Conteneur | Technologies | Responsabilités |
|-----------|-------------|-----------------|
| **WebRTC Signaling** | Node.js / NestJS | Établissement de connexions WebRTC (SDP, ICE) |
| **TURN Relay** | coturn | Relai NAT traversal (fallback si P2P échoue) |
| **Terminal/Files Relay** | NestJS WebSocket | Streaming terminal (xterm.js), transfert fichiers |

#### Agents

| OS | Technologie | Binaire |
|----|-------------|---------|
| **Windows** | Rust | `myremote-agent.exe` (service Windows) |
| **macOS** | Rust | `myremote-agent` (LaunchDaemon) |
| **Linux** | Rust | `myremote-agent` (systemd service) |

**Responsabilités agent** :
- Enrollment (token-based)
- Heartbeat (30s)
- Inventaire système (OS, hostname, IP, CPU, RAM)
- WebRTC peer (streaming desktop via libwebrtc)
- Terminal spawn (cmd/powershell/bash)
- File access (SFTP-like)
- Policy pull (config, auto-update)

---

## 4. Séparation Control Plane / Data Plane

### 4.1 Principe

```
┌───────────────────────────────────────────────────────────────┐
│                       CONTROL PLANE                            │
│  (Orchestration, Auth, Database, Business Logic)              │
│                                                                 │
│  Responsabilités :                                             │
│  • Authentification (OIDC, 2FA)                                │
│  • Authorization (RBAC)                                        │
│  • Gestion devices (enrollment, inventory)                     │
│  • Gestion sessions (création, lifecycle)                      │
│  • Audit logs (immutable)                                      │
│  • API REST/GraphQL                                            │
│                                                                 │
│  Protocoles : HTTPS, WebSocket (signaling)                     │
└───────────────────────────────────────────────────────────────┘
                              │
                              │ (Control messages only)
                              │
┌───────────────────────────────────────────────────────────────┐
│                         DATA PLANE                             │
│  (Media flows, Terminal streams, File transfers)               │
│                                                                 │
│  Responsabilités :                                             │
│  • WebRTC peer-to-peer (desktop streaming)                     │
│  • TURN relay (fallback NAT)                                   │
│  • Terminal WebSocket (xterm.js ↔ agent)                       │
│  • File transfer WebSocket (binary chunks)                     │
│                                                                 │
│  Protocoles : WebRTC (DTLS/SRTP), WebSocket (binary)           │
└───────────────────────────────────────────────────────────────┘
```

### 4.2 Avantages de la séparation

| Avantage | Description |
|----------|-------------|
| **Scalabilité** | Control plane stateless (scale out), Data plane scale indépendamment |
| **Sécurité** | Minimise surface d'attaque : data plane ne connaît pas les credentials |
| **Performance** | Flux media ne passent pas par API (latence minimale) |
| **Résilience** | Si control plane down, sessions data plane actives continuent |
| **Observabilité** | Métriques séparées (API latency vs media quality) |

### 4.3 Flux d'interaction

```
1. User requests session
   → UI → API Gateway (Control Plane)
   → Auth check (JWT, RBAC)
   → Create session record (PostgreSQL)
   → Generate ICE credentials (TURN)
   → Return session_id + ICE servers

2. WebRTC connection establishment
   → UI ↔ WebRTC Signaling (Data Plane)
   → SDP offer/answer exchange
   → ICE candidate exchange
   → P2P connection (or TURN relay)

3. Media streaming
   → UI ↔ Agent (direct P2P, bypasses Control Plane)
   → Desktop frames (VP9/H.264)
   → Keyboard/mouse events

4. Session termination
   → UI → API Gateway (Control Plane)
   → Update session record (end_time, duration)
   → Audit log
```

---

## 5. Protocoles & Communications

### 5.1 Vue d'ensemble

| Flux | Protocole | Chiffrement | Port | Description |
|------|-----------|-------------|------|-------------|
| **Web UI ↔ API** | HTTPS (REST) | TLS 1.3 | 443 | API calls (CRUD devices, sessions, audit) |
| **Web UI ↔ WebSocket** | WSS | TLS 1.3 | 443 | Real-time updates (device status, notifications) |
| **Agent ↔ API** | HTTPS | TLS 1.3 + mTLS (opt) | 443 | Enrollment, heartbeat, policy pull |
| **Agent ↔ WebSocket** | WSS | TLS 1.3 + mTLS (opt) | 443 | Signaling, control messages |
| **UI ↔ Agent (WebRTC)** | WebRTC | DTLS 1.2 + SRTP | Dynamic (UDP) | Desktop streaming (P2P prioritaire) |
| **UI ↔ Agent (via TURN)** | TURN | DTLS 1.2 + SRTP | 3478 (UDP/TCP) | Fallback si P2P échoue |
| **UI ↔ Terminal Relay** | WSS | TLS 1.3 | 443 | Terminal streaming (xterm.js) |
| **UI ↔ Files Relay** | WSS | TLS 1.3 | 443 | File upload/download (chunked) |

### 5.2 Détails des protocoles

#### 5.2.1 REST API (Control Plane)

- **Format** : JSON (application/json)
- **Auth** : Bearer token (JWT) dans header `Authorization`
- **Rate limiting** : 100 req/min/user (via Redis)
- **Versioning** : `/api/v1/...`
- **CORS** : Strictement configuré (origin whitelist)

Exemple requête :
```http
GET /api/v1/devices?status=online HTTP/1.1
Host: myremote.example.com
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

#### 5.2.2 WebSocket (Signaling)

- **Protocole** : Socket.IO (fallback long-polling)
- **Auth** : JWT passé dans handshake (`?token=...`)
- **Events** :
  - `agent:heartbeat` : agent envoie heartbeat toutes les 30s
  - `device:status` : changement statut device (online/offline)
  - `session:offer` : SDP offer (WebRTC)
  - `session:answer` : SDP answer
  - `session:ice_candidate` : ICE candidate

Exemple message :
```json
{
  "event": "agent:heartbeat",
  "data": {
    "device_id": "dev_abc123",
    "timestamp": "2026-01-22T10:30:00Z",
    "status": "online",
    "load": 0.42
  }
}
```

#### 5.2.3 WebRTC (Data Plane)

- **Signaling** : SDP via WebSocket
- **Codecs desktop** :
  - Video : VP9 (prioritaire), VP8, H.264 (fallback)
  - Audio : Opus (si nécessaire pour audio partagé)
- **NAT Traversal** : ICE (STUN + TURN)
- **Chiffrement** : DTLS 1.2 (clés éphémères)
- **QoS** : Adaptive bitrate (selon bande passante)

#### 5.2.4 Terminal WebSocket

- **Protocol** : Binaire (WebSocket binary frames)
- **Format** : PTY output (ANSI escape codes)
- **Lib client** : xterm.js (Web UI)
- **Lib agent** : tokio-pty (Rust)
- **Flow control** : Backpressure via WebSocket buffering

Exemple flux :
```
User (xterm.js) → WSS → Terminal Relay → WSS → Agent → PTY → Shell
                                                          ↓
                                                        Output
                                                          ↓
User (xterm.js) ← WSS ← Terminal Relay ← WSS ← Agent ← PTY
```

#### 5.2.5 File Transfer WebSocket

- **Protocol** : Binaire (chunked 64KB)
- **Flow** :
  - Upload : UI → WSS → Files Relay → WSS → Agent → Filesystem
  - Download : Filesystem → Agent → WSS → Files Relay → WSS → UI
- **Metadata** : JSON header (filename, size, hash SHA256)
- **Checksum** : Vérification SHA256 côté agent + UI

---

## 6. NAT Traversal (STUN/TURN)

### 6.1 Problématique

```
┌──────────────────────────┐         ┌──────────────────────────┐
│    Technician (NAT)      │         │      Agent (NAT)         │
│   192.168.1.10           │         │   192.168.0.50           │
└──────────┬───────────────┘         └──────────┬───────────────┘
           │                                     │
           │ (Public IP: 1.2.3.4)                │ (Public IP: 5.6.7.8)
           │                                     │
      ┌────┴─────────────────────────────────────┴────┐
      │              Internet                          │
      │    ❌ Direct P2P blocked by NAT/firewall      │
      └────────────────────────────────────────────────┘
```

### 6.2 Solution : ICE (Interactive Connectivity Establishment)

**Étapes** :
1. **STUN** : Découverte de l'adresse publique + port
2. **Tentative P2P** : Connexion directe (hole punching)
3. **Fallback TURN** : Si P2P échoue, relay via serveur TURN

### 6.3 Architecture TURN

```
┌────────────────────────────────────────────────────────────────┐
│                     TURN Relay Server                          │
│                    (coturn, VPS public)                        │
│                                                                 │
│  • Port 3478 UDP/TCP (STUN/TURN)                               │
│  • Port 5349 TCP (TURNS, TLS)                                  │
│  • Auth : short-term credentials (HMAC)                        │
│                                                                 │
│  Config :                                                       │
│  - realm=myremote.example.com                                  │
│  - static-auth-secret=<SECRET>                                 │
│  - fingerprint (security)                                      │
│  - log-file=/var/log/coturn.log                                │
└────────────────────────────────────────────────────────────────┘
         ▲                                      ▲
         │ (TURN relay)                         │ (TURN relay)
         │                                      │
┌────────┴────────┐                    ┌────────┴────────┐
│  Technician UI  │                    │     Agent       │
│  (192.168.1.10) │◄───────────────────►│ (192.168.0.50) │
└─────────────────┘    (Media via TURN) └─────────────────┘
```

### 6.4 Génération credentials TURN (Control Plane)

Lors de la création d'une session, l'API génère des credentials temporaires TURN :

```typescript
// Control Plane (NestJS)
import * as crypto from 'crypto';

function generateTurnCredentials(username: string, secret: string, ttl: number = 86400) {
  const timestamp = Math.floor(Date.now() / 1000) + ttl; // Expiration 24h
  const turnUsername = `${timestamp}:${username}`;
  const hmac = crypto.createHmac('sha1', secret);
  hmac.update(turnUsername);
  const turnPassword = hmac.digest('base64');

  return {
    urls: ['turn:turn.myremote.example.com:3478?transport=udp'],
    username: turnUsername,
    credential: turnPassword
  };
}
```

### 6.5 Statistiques ICE (observabilité)

Métriques Prometheus :
- `webrtc_ice_connection_success_rate` : % connexions P2P réussies
- `webrtc_turn_relay_usage` : % sessions via TURN
- `webrtc_turn_bandwidth_bytes` : Bande passante TURN consommée

**Objectif** : > 80% connexions P2P directes (économie bande passante TURN)

---

## 7. Architecture de sécurité

### 7.1 Threat Model (cf. document dédié 08-SECURITY.md)

Principes clés :
- **Defense in Depth** : plusieurs couches de sécurité
- **Least Privilege** : permissions minimales par défaut
- **Zero Trust** : vérifier à chaque requête (auth + RBAC)
- **Audit Everything** : logs immuables

### 7.2 Flux d'authentification (OIDC)

```
┌─────────┐                                            ┌──────────┐
│  User   │                                            │ Keycloak │
│ (Julie) │                                            │  (OIDC)  │
└────┬────┘                                            └────┬─────┘
     │                                                      │
     │ 1. Click "Login"                                     │
     ├─────────────────────────────────────────────────────►│
     │                                                      │
     │ 2. Redirect to Keycloak (OAuth2 Authorization)      │
     │◄─────────────────────────────────────────────────────┤
     │                                                      │
     │ 3. Enter credentials (email + password)              │
     ├─────────────────────────────────────────────────────►│
     │                                                      │
     │ 4. Prompt 2FA (TOTP code)                            │
     │◄─────────────────────────────────────────────────────┤
     │                                                      │
     │ 5. Enter TOTP code                                   │
     ├─────────────────────────────────────────────────────►│
     │                                                      │
     │ 6. Redirect to Web UI with Authorization Code        │
     │◄─────────────────────────────────────────────────────┤
     │                                                      │
┌────┴────┐                                            ┌────┴─────┐
│ Web UI  │ 7. Exchange code for tokens (access+refresh) │ Keycloak │
│ (Next)  ├─────────────────────────────────────────────►│          │
└────┬────┘                                            └────┬─────┘
     │                                                      │
     │ 8. Return JWT (access_token, refresh_token, id_token)│
     │◄─────────────────────────────────────────────────────┤
     │                                                      │
     │ 9. Store tokens (httpOnly cookie)                    │
     │                                                      │
┌────┴────┐                                            ┌────┴─────┐
│ Web UI  │ 10. API call with Bearer token             │   API    │
│         ├───────────────────────────────────────────►│ Gateway  │
└─────────┘                                            └──────────┘
                11. Validate JWT signature (Keycloak public key)
                12. Check RBAC (roles, permissions)
                13. Return data
```

### 7.3 JWT Structure

**Access Token** (courte durée : 15min) :
```json
{
  "sub": "user_abc123",
  "email": "julie@example.com",
  "roles": ["operator"],
  "permissions": ["devices:view", "sessions:create", "terminal:access"],
  "iat": 1706000000,
  "exp": 1706000900
}
```

**Refresh Token** (longue durée : 7 jours, rotation) :
- Stocké en httpOnly cookie (protection XSS)
- Rotation à chaque refresh (protection replay)

### 7.4 RBAC (Role-Based Access Control)

| Role | Permissions |
|------|-------------|
| **Admin** | `*:*` (toutes permissions) |
| **Operator** | `devices:view`, `devices:groups`, `sessions:create`, `sessions:view`, `terminal:access`, `files:read`, `files:write`, `contacts:*` |
| **Viewer** | `devices:view`, `sessions:view`, `audit:view` |
| **Auditor** | `audit:*`, `devices:view`, `sessions:view` |

Permissions granulaires (actions) :
- `devices:view` : lire liste devices
- `devices:enroll` : créer token enrollment
- `devices:revoke` : désactiver device
- `sessions:create` : initier session remote
- `sessions:terminate` : terminer session
- `terminal:access` : ouvrir terminal
- `files:read` : télécharger fichiers
- `files:write` : upload fichiers
- `audit:view` : consulter logs
- `audit:export` : exporter logs

### 7.5 Chiffrement

| Couche | Protocole | Détails |
|--------|-----------|---------|
| **Transit (Control Plane)** | TLS 1.3 | Cert Let's Encrypt (auto-renew), HSTS, cipher suites modernes |
| **Transit (Data Plane)** | DTLS 1.2 (WebRTC) | SRTP (media encryption), clés éphémères (Perfect Forward Secrecy) |
| **Au repos (Database)** | PostgreSQL TDE | Transparent Data Encryption (pg_tde ou LUKS) |
| **Au repos (Secrets)** | HashiCorp Vault | API keys, TURN secrets, encryption keys |
| **Au repos (Backups)** | GPG | Backups PostgreSQL chiffrés avant upload S3 |

### 7.6 Rate Limiting & DDoS Protection

| Endpoint | Limite | Stratégie |
|----------|--------|-----------|
| **Login** | 5 tentatives / 15min / IP | Account lockout temporaire (15min) |
| **API** | 100 req/min / user | 429 Too Many Requests |
| **WebSocket** | 1 connexion / user / device | Connexions supplémentaires rejetées |
| **File upload** | 10 GB / jour / user | Quota dépassé → 403 Forbidden |

Implémentation : Redis (sliding window algorithm)

---

## 8. Déploiement & Infrastructure

### 8.1 Architecture déploiement (Docker Compose - MVP)

```yaml
# docker-compose.yml (production-ready)

version: '3.9'

services:
  # Control Plane
  traefik:
    image: traefik:v3.0
    ports:
      - "443:443"
      - "80:80"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - ./traefik.yml:/etc/traefik/traefik.yml
      - ./acme.json:/acme.json
    labels:
      - "traefik.enable=true"

  api:
    image: myremote/api:latest
    deploy:
      replicas: 3
    environment:
      - DATABASE_URL=postgresql://postgres:***@postgres:5432/myremote
      - REDIS_URL=redis://redis:6379
      - KEYCLOAK_URL=https://auth.myremote.example.com
    labels:
      - "traefik.http.routers.api.rule=Host(`api.myremote.example.com`)"
      - "traefik.http.routers.api.tls.certresolver=letsencrypt"

  web:
    image: myremote/web:latest
    environment:
      - NEXT_PUBLIC_API_URL=https://api.myremote.example.com
    labels:
      - "traefik.http.routers.web.rule=Host(`myremote.example.com`)"
      - "traefik.http.routers.web.tls.certresolver=letsencrypt"

  postgres:
    image: postgres:16-alpine
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data

  keycloak:
    image: quay.io/keycloak/keycloak:24.0
    environment:
      - KEYCLOAK_ADMIN=admin
      - KEYCLOAK_ADMIN_PASSWORD=${KEYCLOAK_ADMIN_PASSWORD}
    labels:
      - "traefik.http.routers.keycloak.rule=Host(`auth.myremote.example.com`)"

  # Data Plane
  turn:
    image: coturn/coturn:latest
    network_mode: host
    volumes:
      - ./turnserver.conf:/etc/coturn/turnserver.conf

  # Observability
  prometheus:
    image: prom/prometheus:latest
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus

  grafana:
    image: grafana/grafana:latest
    volumes:
      - grafana_data:/var/lib/grafana
    labels:
      - "traefik.http.routers.grafana.rule=Host(`monitoring.myremote.example.com`)"

  loki:
    image: grafana/loki:latest
    volumes:
      - loki_data:/loki

volumes:
  postgres_data:
  redis_data:
  prometheus_data:
  grafana_data:
  loki_data:
```

### 8.2 Ressources VPS (MVP : 50-200 postes)

| Composant | CPU | RAM | Disk | Justification |
|-----------|-----|-----|------|---------------|
| **API (x3 replicas)** | 2 vCPU | 4 GB | 20 GB | Node.js, stateless |
| **PostgreSQL** | 2 vCPU | 8 GB | 100 GB | Database principale |
| **Redis** | 1 vCPU | 2 GB | 10 GB | Cache + PubSub |
| **TURN Relay** | 4 vCPU | 8 GB | 50 GB | Bande passante intensive |
| **Keycloak** | 2 vCPU | 4 GB | 20 GB | Auth provider |
| **Monitoring** | 2 vCPU | 4 GB | 100 GB | Prometheus, Grafana, Loki |
| **Total** | **15 vCPU** | **30 GB** | **300 GB** | |

**Estimation coût VPS** (France, OVH/Scaleway) :
- 1x VPS Confort (16 vCPU, 32 GB RAM) : ~50€/mois
- 100 GB stockage SSD : inclus
- Bande passante 1 Gbps : incluse (unmetered)

### 8.3 Migration Kubernetes (V1 : > 500 postes)

```
Namespace: myremote-prod

Deployments:
- api (replicas: 5, HPA 3-10)
- websocket (replicas: 3, HPA 2-5)
- web (replicas: 3)
- turn-relay (replicas: 2, multi-région)

StatefulSets:
- postgres (replicas: 3, Patroni HA)
- redis (replicas: 3, Redis Cluster)

Services:
- api-service (LoadBalancer)
- websocket-service (LoadBalancer)
- postgres-service (ClusterIP)

Ingress:
- Traefik / NGINX Ingress Controller
- Cert-Manager (Let's Encrypt)

Storage:
- PostgreSQL: Ceph RBD (replicated)
- Prometheus: Local SSD (ephemeral ok)

Monitoring:
- Prometheus Operator
- Grafana (HA replicas: 2)
- Loki (distributed mode)
```

---

## 9. Scalabilité & HA

### 9.1 Scalabilité horizontale

| Composant | Strategy | Limit |
|-----------|----------|-------|
| **API Gateway** | Stateless, HPA (CPU > 70%) | Illimité |
| **WebSocket Gateway** | Stateful (sticky sessions), scale par sharding | ~10k connexions / replica |
| **TURN Relay** | Stateless, scale par région géographique | ~500 sessions / replica |
| **PostgreSQL** | Read replicas (pgpool), sharding (Citus) | ~10k devices / instance |
| **Redis** | Redis Cluster (sharding par key) | Illimité |

### 9.2 High Availability (HA)

```
┌────────────────────────────────────────────────────────┐
│                   Load Balancer                        │
│                (Traefik / HAProxy)                     │
└───────────┬──────────────────────┬─────────────────────┘
            │                      │
    ┌───────▼────────┐     ┌───────▼────────┐
    │   API Pod 1    │     │   API Pod 2    │
    └───────┬────────┘     └───────┬────────┘
            │                      │
            └──────────┬───────────┘
                       │
           ┌───────────▼────────────┐
           │  PostgreSQL Primary    │
           └───────────┬────────────┘
                       │
          ┌────────────┴────────────┐
          │                         │
┌─────────▼──────┐        ┌─────────▼──────┐
│ PG Replica 1   │        │ PG Replica 2   │
│  (Read-only)   │        │  (Read-only)   │
└────────────────┘        └────────────────┘
```

**SLA** :
- Control Plane : 99.9% (tolérance : 8.76h downtime/an)
- Data Plane (sessions actives) : best effort (reconnexion auto si relay restart)

### 9.3 Disaster Recovery

| Scenario | RTO | RPO | Stratégie |
|----------|-----|-----|-----------|
| **PostgreSQL crash** | 5 min | 0 | Patroni auto-failover vers replica |
| **Datacenter down** | 30 min | 1h | Backup quotidien S3, restore sur nouveau VPS |
| **Corruption base** | 1h | 1h | Point-in-time recovery (WAL archives) |
| **Ransomware** | 2h | 24h | Backups offline (immutable S3 glacier) |

**Backup policy** :
- Full backup PostgreSQL : quotidien 2h UTC
- WAL archiving : continuous (streaming)
- Rétention : 30 jours (backups), 90 jours (WAL)
- Test restore : mensuel (procédure automatisée)

---

## 10. Annexes

### 10.1 Glossaire technique

- **ICE** : Interactive Connectivity Establishment (NAT traversal)
- **STUN** : Session Traversal Utilities for NAT (découverte IP publique)
- **TURN** : Traversal Using Relays around NAT (relai fallback)
- **SDP** : Session Description Protocol (WebRTC)
- **DTLS** : Datagram TLS (chiffrement UDP)
- **SRTP** : Secure Real-time Transport Protocol (media encryption)
- **mTLS** : Mutual TLS (authentification bidirectionnelle)

### 10.2 Références

- WebRTC specs : https://www.w3.org/TR/webrtc/
- ICE/STUN/TURN : RFC 8445, 8489, 8656
- OIDC : https://openid.net/specs/openid-connect-core-1_0.html
- C4 Model : https://c4model.com/

---

**Document maintenu par** : Tech Lead + DevOps
**Dernière révision** : 2026-01-22
**Prochaine révision** : Après implémentation MVP (validation architecture réelle)
