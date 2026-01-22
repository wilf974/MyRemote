# MyRemote - Sécurité & Threat Model

**Version**: 1.0
**Date**: 2026-01-22
**Approche**: STRIDE + Defense in Depth

---

## Table des matières
1. [Principes de sécurité](#1-principes-de-sécurité)
2. [Threat Model (STRIDE)](#2-threat-model-stride)
3. [RBAC granulaire](#3-rbac-granulaire)
4. [Authentification & 2FA](#4-authentification--2fa)
5. [Chiffrement](#5-chiffrement)
6. [Gestion des secrets](#6-gestion-des-secrets)
7. [Audit & Logging](#7-audit--logging)
8. [Incident Response](#8-incident-response)

---

## 1. Principes de sécurité

### 1.1 Principes directeurs

| Principe | Description |
|----------|-------------|
| **Zero Trust** | Aucune confiance implicite, vérifier à chaque requête |
| **Least Privilege** | Permissions minimales par défaut, RBAC granulaire |
| **Defense in Depth** | Multiples couches de sécurité (auth, RBAC, chiffrement, audit) |
| **Fail Secure** | En cas d'erreur, refuser l'accès (deny by default) |
| **Auditabilité** | Toutes actions tracées, logs immuables |
| **Transparence** | Consentement explicite (mode attended), justification (unattended) |

### 1.2 Surface d'attaque

```
┌────────────────────────────────────────────────────────────────┐
│                    Attack Surface                              │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  External:                                                     │
│  • Web UI (HTTPS, port 443)                                    │
│  • API Gateway (HTTPS, port 443)                               │
│  • WebSocket (WSS, port 443)                                   │
│  • TURN Relay (UDP/TCP, port 3478)                             │
│                                                                │
│  Internal:                                                     │
│  • PostgreSQL (port 5432, localhost uniquement)                │
│  • Redis (port 6379, localhost uniquement)                     │
│  • Agent ↔ Control Plane (WebSocket, TLS 1.3)                  │
│                                                                │
│  Trust Boundaries:                                             │
│  • Internet ↔ Web UI (TLS, JWT auth)                           │
│  • Internet ↔ Agent (TLS, device_secret)                       │
│  • Web UI ↔ API Gateway (JWT, RBAC)                            │
│  • API ↔ Database (connection string, TLS)                     │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

---

## 2. Threat Model (STRIDE)

### 2.1 Spoofing (Usurpation d'identité)

| Menace | Scénario | Impact | Mitigation | Priorité |
|--------|----------|--------|-----------|----------|
| **T1: Agent spoofing** | Attaquant crée faux agent pour s'inscrire | Haut | Enrollment token usage unique (24h), signature agent | Critique |
| **T2: User spoofing** | Attaquant vole JWT access token | Haut | JWT court (15min), refresh token rotation, 2FA | Critique |
| **T3: Session hijacking** | Attaquant intercepte session WebRTC | Moyen | DTLS chiffrement, ICE credentials temporaires | Haut |

**Mitigations détaillées** :

**T1 - Agent spoofing** :
```yaml
Controls:
  - Enrollment token: usage unique, expire 24h
  - Agent signature: Authenticode (Windows), Notarization (macOS), GPG (Linux)
  - Rate limiting: 5 tentatives enrollment / 15min / IP
  - Audit: log toutes tentatives enrollment (success + failure)
  - Alert: si > 10 tentatives failed / heure → admin notification
```

**T2 - User spoofing** :
```yaml
Controls:
  - JWT access token: 15min expiration
  - JWT refresh token: 7 jours, rotation à chaque refresh
  - 2FA TOTP: obligatoire (configurable par admin)
  - Device fingerprinting: IP + User-Agent logged
  - Session invalidation: logout révoque tous tokens
  - Keycloak: session management, concurrent session limits
```

**T3 - Session hijacking** :
```yaml
Controls:
  - WebRTC: DTLS 1.2 chiffrement (clés éphémères)
  - ICE credentials: temporaires (TURN username includes timestamp)
  - Session timeout: idle 30min, max 8h (configurable)
  - Audit: log toute connexion/déconnexion WebRTC
```

---

### 2.2 Tampering (Altération de données)

| Menace | Scénario | Impact | Mitigation | Priorité |
|--------|----------|--------|-----------|----------|
| **T4: Agent binary tampering** | Attaquant modifie binaire agent | Critique | Signature binaire (Cosign), vérification à l'install | Critique |
| **T5: Database tampering** | Attaquant modifie audit logs | Critique | Logs append-only (REVOKE UPDATE/DELETE), PostgreSQL WAL | Critique |
| **T6: Man-in-the-Middle** | Attaquant intercepte trafic API/WebSocket | Haut | TLS 1.3, HSTS, cert pinning (optionnel) | Haut |

**Mitigations** :

**T4 - Agent tampering** :
```yaml
Controls:
  - Binary signature: Cosign (SHA256 hash + signature)
  - Installation: vérification signature avant install
  - Auto-update: vérification signature avant upgrade
  - Hash check: agent vérifie propre intégrité au démarrage
  - Alert: si signature invalide → refuse exécution + log
```

**T5 - Database tampering** :
```sql
-- Audit logs append-only
REVOKE UPDATE, DELETE ON audit_logs FROM myremote_app;
REVOKE UPDATE, DELETE ON audit_logs FROM PUBLIC;

-- PostgreSQL WAL (Write-Ahead Logging) pour Point-in-Time Recovery
archive_mode = on
archive_command = 'cp %p /backup/wal/%f'

-- Trigger détection tampering (checksum)
CREATE TRIGGER audit_log_checksum_trigger
BEFORE INSERT ON audit_logs
FOR EACH ROW EXECUTE FUNCTION calculate_checksum();
```

**T6 - Man-in-the-Middle** :
```yaml
Controls:
  - TLS 1.3: cipher suites modernes uniquement (ECDHE-RSA-AES256-GCM-SHA384)
  - HSTS: Strict-Transport-Security header (max-age=31536000)
  - Certificate pinning: optionnel (agent peut pin Control Plane cert)
  - Let's Encrypt: auto-renewal certs (Traefik)
  - mTLS: optionnel (agent peut présenter client cert)
```

---

### 2.3 Repudiation (Répudiation)

| Menace | Scénario | Impact | Mitigation | Priorité |
|--------|----------|--------|-----------|----------|
| **T7: Deny session creation** | User nie avoir créé session | Moyen | Audit logs immuables (user_id, timestamp, IP) | Haut |
| **T8: Deny command execution** | Technicien nie commande terminal | Moyen | Log toutes commandes (session_events table) | Haut |

**Mitigations** :

**T7/T8 - Repudiation** :
```yaml
Controls:
  - Audit logs: immuables, rétention 90 jours
  - Log fields: user_id, user_email, action, resource_id, timestamp, ip_address, user_agent
  - Session events: toutes commandes terminal, fichiers transférés (SHA256 hash)
  - Proof of consent: log consentement utilisateur (attended mode)
  - Justification: obligatoire (mode unattended)
  - Export logs: possibilité export JSON/CSV (compliance)
```

---

### 2.4 Information Disclosure (Divulgation d'informations)

| Menace | Scénario | Impact | Mitigation | Priorité |
|--------|----------|--------|-----------|----------|
| **T9: Database leak** | Attaquant accède PostgreSQL directement | Critique | Firewall, TLS, chiffrement au repos | Critique |
| **T10: Secrets exposure** | device_secret exposé dans logs | Haut | Secrets dans Vault, redaction logs | Haut |
| **T11: Session sniffing** | Attaquant capture trafic WebRTC | Moyen | DTLS chiffrement, P2P prioritaire | Moyen |

**Mitigations** :

**T9 - Database leak** :
```yaml
Controls:
  - Network: PostgreSQL écoute localhost uniquement (127.0.0.1)
  - Firewall: iptables/ufw bloque port 5432 externe
  - Authentication: PostgreSQL password + pg_hba.conf restrictif
  - TLS: connexion PostgreSQL via TLS (sslmode=require)
  - Encryption at rest: LUKS (Linux) ou PostgreSQL TDE
  - Backups: chiffrés (GPG) avant upload S3
```

**T10 - Secrets exposure** :
```yaml
Controls:
  - Vault: HashiCorp Vault pour TURN secrets, API keys
  - Agent: device_secret stocké dans SQLite chiffré (SQLCipher)
  - Logs redaction: regex redact patterns (token, password, secret)
  - Environment variables: jamais de secrets hardcodés
  - .env files: .gitignore, permissions 600
```

**T11 - Session sniffing** :
```yaml
Controls:
  - WebRTC: DTLS 1.2 + SRTP (media encryption)
  - P2P priority: connexion directe (bypasse serveur)
  - TURN relay: si P2P échoue, trafic via TURN (DTLS)
  - Perfect Forward Secrecy: clés éphémères (pas de clé réutilisée)
```

---

### 2.5 Denial of Service (Déni de service)

| Menace | Scénario | Impact | Mitigation | Priorité |
|--------|----------|--------|-----------|----------|
| **T12: API flooding** | Attaquant spam API → surcharge | Haut | Rate limiting (Redis), WAF | Haut |
| **T13: Agent flooding** | Attaquant envoie milliers heartbeats | Moyen | Rate limiting agent, authentification | Moyen |
| **T14: TURN bandwidth exhaustion** | Attaquant abuse TURN relay | Moyen | TURN auth (short-term credentials), quotas | Moyen |

**Mitigations** :

**T12 - API flooding** :
```yaml
Controls:
  - Rate limiting: 100 req/min/user (Redis sliding window)
  - WAF: Cloudflare ou ModSecurity (si applicable)
  - DDoS protection: Cloudflare, Fail2ban
  - Auto-scaling: API stateless → scale horizontalement
  - Circuit breaker: si backend down, fail fast
```

**T13 - Agent flooding** :
```yaml
Controls:
  - Heartbeat rate limit: 1 heartbeat / 30s / device_id
  - Authentication: device_secret requis (JWT)
  - Blacklist: si agent abuse → revoke device
  - Monitoring: alerte si > 100 heartbeats/min d'un device
```

**T14 - TURN bandwidth exhaustion** :
```yaml
Controls:
  - TURN credentials: short-term (24h expiration, HMAC)
  - Quotas: max 10 GB / session, max 100 GB / jour / user
  - Monitoring: Prometheus metrics (turn_bandwidth_bytes)
  - Alert: si > 500 GB / jour → investigation
```

---

### 2.6 Elevation of Privilege (Élévation de privilèges)

| Menace | Scénario | Impact | Mitigation | Priorité |
|--------|----------|--------|-----------|----------|
| **T15: RBAC bypass** | Attaquant accède ressources non autorisées | Critique | RBAC strict, tests RBAC, principe moindre privilège | Critique |
| **T16: Agent privilege escalation** | Agent obtient root/admin non nécessaire | Haut | Agent tourne en user context, capabilities Linux | Haut |
| **T17: SQL injection** | Attaquant injecte SQL → accès admin | Critique | ORM (TypeORM), prepared statements, validation | Critique |

**Mitigations** :

**T15 - RBAC bypass** :
```yaml
Controls:
  - RBAC: vérification à chaque endpoint (middleware Express)
  - Permissions granulaires: devices:view, sessions:create, etc.
  - Tests: suite tests RBAC (user Viewer ne peut pas create session)
  - Audit: log toutes tentatives accès denied (status=403)
  - Principe moindre privilège: permissions minimales par défaut
```

**T16 - Agent privilege escalation** :
```yaml
Controls:
  - Linux: agent user=myremote (non-root), capabilities si nécessaire
  - Windows: agent service=LocalSystem (minimal), pas admin user context
  - macOS: LaunchDaemon root (sandboxed), entitlements restrictifs
  - Pas de sudo/UAC bypass: jamais
  - Audit: log toute tentative élévation privilège
```

**T17 - SQL injection** :
```typescript
// ✅ CORRECT: Prepared statements (TypeORM)
const devices = await deviceRepository.find({
  where: { status: userInput } // TypeORM échappe automatiquement
});

// ❌ INCORRECT: Raw query sans échappement
const devices = await connection.query(
  `SELECT * FROM devices WHERE status = '${userInput}'` // SQL injection !
);

// ✅ CORRECT: Raw query avec paramètres
const devices = await connection.query(
  'SELECT * FROM devices WHERE status = $1',
  [userInput]
);
```

---

## 3. RBAC granulaire

### 3.1 Rôles & Permissions

| Rôle | Permissions | Use Case |
|------|-------------|----------|
| **Admin** | `*:*` (toutes) | Admin IT, configuration plateforme |
| **Operator** | `devices:*`, `sessions:*`, `terminal:*`, `files:*`, `contacts:*` | Technicien support L1/L2 |
| **Viewer** | `devices:view`, `sessions:view` | Observateur, reporting |
| **Auditor** | `audit:*`, `devices:view`, `sessions:view` | RSSI, compliance officer |

### 3.2 Matrice permissions détaillée

| Resource | Actions | Admin | Operator | Viewer | Auditor |
|----------|---------|-------|----------|--------|---------|
| **devices** | view | ✓ | ✓ | ✓ | ✓ |
| | enroll | ✓ | ✗ | ✗ | ✗ |
| | revoke | ✓ | ✗ | ✗ | ✗ |
| | configure | ✓ | ✗ | ✗ | ✗ |
| **sessions** | create | ✓ | ✓ | ✗ | ✗ |
| | view | ✓ | ✓ (own) | ✓ | ✓ |
| | terminate | ✓ | ✓ (own) | ✗ | ✗ |
| | unattended | ✓ | ✓ | ✗ | ✗ |
| **terminal** | access | ✓ | ✓ | ✗ | ✗ |
| **files** | read | ✓ | ✓ | ✗ | ✗ |
| | write | ✓ | ✓ | ✗ | ✗ |
| **contacts** | view | ✓ | ✓ | ✗ | ✗ |
| | create | ✓ | ✓ | ✗ | ✗ |
| | edit | ✓ | ✓ | ✗ | ✗ |
| | delete | ✓ | ✗ | ✗ | ✗ |
| **audit** | view | ✓ | ✗ | ✗ | ✓ |
| | export | ✓ | ✗ | ✗ | ✓ |
| **users** | manage | ✓ | ✗ | ✗ | ✗ |

### 3.3 Implémentation RBAC (NestJS)

```typescript
// guards/rbac.guard.ts
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class RBACGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.get<string[]>(
      'permissions',
      context.getHandler()
    );

    if (!requiredPermissions) {
      return true; // Pas de permission requise
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user; // Depuis JWT (decoded par AuthGuard)

    // Vérifier si user a toutes les permissions requises
    return requiredPermissions.every(permission =>
      user.permissions.includes(permission)
    );
  }
}

// Decorator
export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata('permissions', permissions);

// Utilisation dans controller
@Controller('devices')
export class DevicesController {
  @Get()
  @UseGuards(AuthGuard, RBACGuard)
  @RequirePermissions('devices:view')
  async listDevices() {
    // ...
  }

  @Post(':id/revoke')
  @UseGuards(AuthGuard, RBACGuard)
  @RequirePermissions('devices:revoke')
  async revokeDevice(@Param('id') id: string) {
    // Audit log
    await this.auditService.log({
      action: 'device.revoked',
      resource_type: 'device',
      resource_id: id,
      user_id: request.user.id,
      status: 'success'
    });
    // ...
  }
}
```

---

## 4. Authentification & 2FA

### 4.1 Flow authentification OIDC

```
1. User → Web UI (/login)
2. Web UI → Keycloak Authorization Endpoint
   GET https://auth.myremote.example.com/realms/myremote/protocol/openid-connect/auth
       ?response_type=code
       &client_id=myremote-web
       &redirect_uri=https://myremote.example.com/callback
       &scope=openid profile email

3. Keycloak → User : Login form (email + password)

4. User → Keycloak : Submit credentials

5. Keycloak → User : 2FA prompt (TOTP code)

6. User → Keycloak : Submit TOTP code

7. Keycloak → Web UI : Redirect with authorization_code
   https://myremote.example.com/callback?code=abc123

8. Web UI → Keycloak Token Endpoint
   POST https://auth.myremote.example.com/realms/myremote/protocol/openid-connect/token
   Body:
     grant_type=authorization_code
     code=abc123
     client_id=myremote-web
     client_secret=***
     redirect_uri=https://myremote.example.com/callback

9. Keycloak → Web UI : Tokens
   {
     "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
     "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
     "id_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
     "expires_in": 900  // 15 minutes
   }

10. Web UI → Store tokens (httpOnly cookie)

11. Web UI → API Gateway (tous appels)
    Authorization: Bearer {access_token}

12. API Gateway → Validate JWT (Keycloak public key)
    → Decode → Extract user_id, roles, permissions
    → Check RBAC
    → Process request
```

### 4.2 Configuration 2FA (TOTP)

**Keycloak** :
```yaml
Realm: myremote
Authentication Flow:
  - Username + Password (required)
  - OTP (TOTP) (required)

OTP Policy:
  - Algorithm: SHA1 (compatibility) ou SHA256
  - Digits: 6
  - Period: 30 seconds
  - Initial counter: 0
  - Supported applications: Google Authenticator, Authy, 1Password

Enrollment:
  - First login → QR code displayed
  - User scans with authenticator app
  - User enters code → verified → 2FA activated
```

**Backup codes** :
```yaml
- Keycloak génère 10 backup codes à l'activation 2FA
- User télécharge codes (PDF)
- Si perte téléphone → use backup code (usage unique)
- Admin peut reset 2FA (après vérification identité)
```

---

## 5. Chiffrement

### 5.1 Chiffrement en transit

| Flux | Protocole | Cipher Suite | Cert |
|------|-----------|--------------|------|
| **Web UI → API** | TLS 1.3 | TLS_AES_256_GCM_SHA384 | Let's Encrypt |
| **Agent → API** | TLS 1.3 + mTLS (opt) | TLS_AES_256_GCM_SHA384 | Let's Encrypt + client cert |
| **WebRTC** | DTLS 1.2 | DTLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384 | Self-signed (éphémère) |
| **PostgreSQL** | TLS 1.3 | TLS_AES_256_GCM_SHA384 | Self-signed |

**Configuration TLS (Traefik)** :
```yaml
# traefik.yml
tls:
  options:
    default:
      minVersion: VersionTLS13
      cipherSuites:
        - TLS_AES_256_GCM_SHA384
        - TLS_CHACHA20_POLY1305_SHA256
      curvePreferences:
        - CurveP521
        - CurveP384
```

### 5.2 Chiffrement au repos

| Ressource | Méthode | Clé |
|-----------|---------|-----|
| **PostgreSQL** | LUKS (filesystem) ou PostgreSQL TDE | Master key (Vault) |
| **Agent SQLite** | SQLCipher | device_secret (derivé) |
| **Backups** | GPG | PGP key (Vault) |
| **Secrets** | HashiCorp Vault | Auto-unseal (AWS KMS ou Shamir) |

**PostgreSQL TDE (Transparent Data Encryption)** :
```sql
-- Option 1: LUKS (Linux)
cryptsetup luksFormat /dev/sdb
cryptsetup open /dev/sdb postgresql_encrypted
mkfs.ext4 /dev/mapper/postgresql_encrypted
mount /dev/mapper/postgresql_encrypted /var/lib/postgresql

-- Option 2: PostgreSQL pg_tde (extension)
CREATE EXTENSION pg_tde;
SELECT pg_tde_set_master_key('master_key_from_vault');
```

**Agent SQLite (SQLCipher)** :
```rust
// agent/src/storage.rs
use rusqlite::{Connection, OpenFlags};

fn open_encrypted_db(path: &str, device_secret: &str) -> Result<Connection> {
    let conn = Connection::open_with_flags(
        path,
        OpenFlags::SQLITE_OPEN_READ_WRITE | OpenFlags::SQLITE_OPEN_CREATE
    )?;

    // Derive key from device_secret (PBKDF2)
    let key = derive_key(device_secret);

    // Set encryption key (SQLCipher)
    conn.execute(&format!("PRAGMA key = '{}'", key), [])?;

    Ok(conn)
}
```

---

## 6. Gestion des secrets

### 6.1 HashiCorp Vault

```
Vault Structure:
secret/
  myremote/
    postgres_password
    redis_password
    keycloak_client_secret
    turn_secret
    jwt_signing_key
    backup_gpg_key
```

**Accès Vault (API)** :
```typescript
// backend/src/vault.service.ts
import * as vault from 'node-vault';

export class VaultService {
  private client: vault.client;

  constructor() {
    this.client = vault({
      apiVersion: 'v1',
      endpoint: process.env.VAULT_ADDR, // http://localhost:8200
      token: process.env.VAULT_TOKEN
    });
  }

  async getSecret(path: string): Promise<string> {
    const response = await this.client.read(`secret/data/myremote/${path}`);
    return response.data.data.value;
  }

  async rotateSecret(path: string, newValue: string): Promise<void> {
    await this.client.write(`secret/data/myremote/${path}`, {
      data: { value: newValue }
    });
    await this.auditService.log({
      action: 'secret.rotated',
      resource_type: 'secret',
      resource_id: path,
      status: 'success'
    });
  }
}
```

### 6.2 Rotation des secrets

| Secret | Rotation | Méthode |
|--------|----------|---------|
| **JWT signing key** | 90 jours | Manual, old key gardée 7j (grace period) |
| **TURN secret** | 30 jours | Automated (cron), old secret gardé 24h |
| **PostgreSQL password** | 180 jours | Manual, maintenance window |
| **Keycloak client secret** | Manual (si leak) | Regénérer dans Keycloak admin |

---

## 7. Audit & Logging

### 7.1 Événements auditables

| Catégorie | Événements |
|-----------|------------|
| **Authentication** | login.success, login.failed, logout, 2fa.enabled, 2fa.failed |
| **Devices** | device.enrolled, device.revoked, device.updated |
| **Sessions** | session.created, session.consent_granted, session.consent_denied, session.terminated |
| **Files** | file.downloaded, file.uploaded, file.deleted |
| **Terminal** | terminal.opened, terminal.command_executed, terminal.closed |
| **Users** | user.created, user.role_assigned, user.deactivated |
| **Audit** | audit.exported, audit.viewed |

### 7.2 Format audit log

```json
{
  "id": "audit_abc123",
  "timestamp": "2026-01-22T10:30:00.000Z",
  "user_id": "user_xyz",
  "user_email": "julie@example.com",
  "action": "session.created",
  "resource_type": "session",
  "resource_id": "sess_abc123",
  "ip_address": "1.2.3.4",
  "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)...",
  "details": {
    "device_id": "dev_abc123",
    "device_hostname": "PC-Bureau-001",
    "session_type": "desktop",
    "access_mode": "attended",
    "consent_given": true
  },
  "status": "success",
  "request_id": "req_xyz789"
}
```

### 7.3 SIEM Integration (future)

```yaml
Outputs:
  - Loki (logs centralisés)
  - Splunk (via HTTP Event Collector)
  - Elastic Stack (via Filebeat)

Alerting:
  - Prometheus Alertmanager
  - PagerDuty
  - Slack webhook
```

---

## 8. Incident Response

### 8.1 Playbooks

#### Incident : Suspicion account compromise

```markdown
1. Detection:
   - Alert: > 5 login failures en 5 min
   - Alert: Login depuis IP inhabituelle

2. Investigation:
   - Consulter audit logs (filter: user_id, action=login.*)
   - Vérifier IP source (geoloc, ASN)
   - Contacter user (email, phone)

3. Containment:
   - Lock account (Keycloak: user → Actions → Disable)
   - Révoque tous refresh tokens actifs
   - Force logout (sessions Redis invalidation)

4. Eradication:
   - Reset password (générer nouveau, envoi email sécurisé)
   - Re-enable 2FA (QR code nouveau)

5. Recovery:
   - Unlock account après reset password
   - User teste login + 2FA

6. Lessons Learned:
   - Review: pourquoi password compromis ? (phishing, leak ?)
   - Action: formation sécurité, password manager
```

#### Incident : Agent comportement suspect

```markdown
1. Detection:
   - Alert: Agent envoie > 100 heartbeats/min
   - Alert: Agent tente connexions multiples devices

2. Investigation:
   - Logs agent (journalctl -u myremote-agent)
   - Audit logs (filter: device_id)
   - Vérifier signature binaire agent

3. Containment:
   - Revoke device (API: POST /devices/{id}/revoke)
   - Bloquer IP agent (firewall)

4. Eradication:
   - Désinstaller agent (remote ou sur site)
   - Scanner antivirus device
   - Réinstaller agent (nouveau token)

5. Recovery:
   - Re-enroll device (token nouveau)
   - Monitoring renforcé 7 jours

6. Lessons Learned:
   - Rootcause: malware sur device ? agent modifié ?
   - Action: EDR sur devices, agent integrity checks
```

---

## 9. Compliance & RGPD

### 9.1 Mesures RGPD

| Exigence RGPD | Implémentation MyRemote |
|---------------|-------------------------|
| **Consentement** | Mode attended = consentement explicite utilisateur |
| **Droit à l'oubli** | Soft delete (deleted_at), hard delete après 90j |
| **Portabilité** | Export audit logs JSON/CSV |
| **Limitation conservation** | Logs 90j, sessions terminées 90j |
| **Sécurité** | Chiffrement transit + repos, RBAC, 2FA |
| **Notification breach** | Procédure incident response (72h max) |

### 9.2 Data Processing Agreement (DPA)

```markdown
MyRemote traite les données suivantes (IT interne):
- Utilisateurs IT: email, nom, logs activité
- Devices: hostname, IP, inventaire système
- Sessions: logs connexions, commandes terminal (si applicable)
- Contacts: nom, email, téléphone (utilisateurs finaux)

Base légale: Intérêt légitime (gestion IT interne)

Durée conservation: 90 jours (audit logs)

Transferts hors UE: Aucun (hébergement France)

Sous-traitants: Aucun (self-hosted)
```

---

## Annexes

### A. Checklist sécurité (déploiement production)

```markdown
☐ TLS 1.3 configuré (Traefik)
☐ Let's Encrypt certs auto-renewal
☐ HSTS header activé
☐ Keycloak 2FA obligatoire
☐ PostgreSQL chiffrement au repos (LUKS ou TDE)
☐ PostgreSQL connexion TLS
☐ Vault configuré (secrets externalisés)
☐ Rate limiting activé (Redis)
☐ Firewall configuré (ufw/iptables)
☐ Backups quotidiens (chiffrés GPG)
☐ Monitoring (Prometheus + Grafana)
☐ Alerting (failed logins, agent anomalies)
☐ Audit logs rétention 90j
☐ Agent binaires signés (Cosign)
☐ RBAC testé (tests E2E)
☐ Incident response playbooks rédigés
☐ Formation équipe (sécurité, RGPD)
```

### B. Outils sécurité recommandés

| Outil | Usage |
|-------|-------|
| **OWASP ZAP** | Scan vulnérabilités Web UI |
| **Trivy** | Scan vulns containers Docker |
| **Semgrep** | Static analysis code (TypeScript) |
| **SonarQube** | Code quality + security hotspots |
| **Snyk** | Scan dépendances (npm, Cargo) |
| **Fail2ban** | Protection brute-force SSH/API |

---

**Document maintenu par** : RSSI + Tech Lead
**Dernière révision** : 2026-01-22
**Prochaine révision** : Après pentest MVP (audit externe)
