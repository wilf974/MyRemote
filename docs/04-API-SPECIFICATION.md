# MyRemote - API REST Specification

**Version**: 1.0.0
**Base URL**: `https://api.myremote.example.com/api/v1`
**Auth**: Bearer JWT (OIDC)
**Format**: JSON

---

## Table des matières
1. [Authentification](#1-authentification)
2. [Rate Limiting & Erreurs](#2-rate-limiting--erreurs)
3. [Endpoints Devices](#3-endpoints-devices)
4. [Endpoints Sessions](#4-endpoints-sessions)
5. [Endpoints Contacts](#5-endpoints-contacts)
6. [Endpoints Audit](#6-endpoints-audit)
7. [Endpoints Enrollment](#7-endpoints-enrollment)
8. [Endpoints Users & RBAC](#8-endpoints-users--rbac)
9. [WebSocket Events](#9-websocket-events)

---

## 1. Authentification

### 1.1 Flow OIDC (Keycloak)

```
1. User accède à https://myremote.example.com
2. Redirect vers https://auth.myremote.example.com/realms/myremote/protocol/openid-connect/auth
3. Login + 2FA
4. Callback avec authorization_code
5. Exchange code → access_token (JWT, 15min) + refresh_token (7j)
6. Toutes requêtes API : Header Authorization: Bearer <access_token>
```

### 1.2 JWT Structure

```json
{
  "sub": "user_abc123",
  "email": "julie@example.com",
  "roles": ["operator"],
  "permissions": ["devices:view", "sessions:create"],
  "iat": 1706000000,
  "exp": 1706000900
}
```

### 1.3 Headers requis

```http
GET /api/v1/devices HTTP/1.1
Host: api.myremote.example.com
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
Accept: application/json
```

---

## 2. Rate Limiting & Erreurs

### 2.1 Rate Limits

| Endpoint | Limite |
|----------|--------|
| **Login** | 5 tentatives / 15min / IP |
| **API (authenticated)** | 100 req/min / user |
| **Agent endpoints** | 200 req/min / device |
| **File upload** | 10 GB / jour / user |

Headers response :
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1706000960
```

### 2.2 Codes erreurs standards

| Code | Message | Description |
|------|---------|-------------|
| `400` | Bad Request | Payload invalide, champs manquants |
| `401` | Unauthorized | JWT absent ou invalide |
| `403` | Forbidden | Permission refusée (RBAC) |
| `404` | Not Found | Ressource inexistante |
| `409` | Conflict | Conflit (ex: device déjà enrolled) |
| `422` | Unprocessable Entity | Validation métier échouée |
| `429` | Too Many Requests | Rate limit dépassé |
| `500` | Internal Server Error | Erreur serveur |

Format erreur JSON :
```json
{
  "error": {
    "code": "DEVICE_NOT_FOUND",
    "message": "Device with ID dev_abc123 not found",
    "details": {
      "device_id": "dev_abc123"
    },
    "timestamp": "2026-01-22T10:30:00Z",
    "request_id": "req_xyz789"
  }
}
```

---

## 3. Endpoints Devices

### 3.1 Liste devices

```http
GET /api/v1/devices?status=online&os_type=windows&page=1&limit=50
```

**Query params** :
- `status` (optional) : `online`, `offline`, `revoked`
- `os_type` (optional) : `windows`, `macos`, `linux`
- `group_id` (optional) : UUID du groupe
- `search` (optional) : recherche hostname (ILIKE)
- `page` (default: 1)
- `limit` (default: 50, max: 100)

**Response 200** :
```json
{
  "data": [
    {
      "id": "dev_abc123",
      "hostname": "PC-Bureau-001",
      "os_type": "windows",
      "os_version": "11 Pro",
      "architecture": "x64",
      "agent_version": "1.0.0",
      "status": "online",
      "last_seen_at": "2026-01-22T10:25:00Z",
      "local_ip": "192.168.1.50",
      "public_ip": "1.2.3.4",
      "metadata": {
        "cpu": "Intel i7-1165G7",
        "ram_gb": 16,
        "disks": [
          {"name": "C:", "total_gb": 512, "free_gb": 128}
        ]
      },
      "enrolled_at": "2026-01-15T08:00:00Z",
      "groups": ["grp_prod_001"],
      "has_unattended_access": false
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 127,
    "total_pages": 3
  }
}
```

**Permissions** : `devices:view`

---

### 3.2 Détail device

```http
GET /api/v1/devices/{device_id}
```

**Response 200** : (même structure que liste, objet unique)

**Permissions** : `devices:view`

---

### 3.3 Révoquer device

```http
POST /api/v1/devices/{device_id}/revoke
```

**Payload** :
```json
{
  "reason": "Device compromised, remplacement matériel"
}
```

**Response 200** :
```json
{
  "id": "dev_abc123",
  "status": "revoked",
  "revoked_at": "2026-01-22T10:30:00Z",
  "revoked_by": "user_xyz"
}
```

**Permissions** : `devices:revoke`

---

### 3.4 Groupes de devices

#### 3.4.1 Liste groupes

```http
GET /api/v1/device-groups
```

**Response 200** :
```json
{
  "data": [
    {
      "id": "grp_prod_001",
      "name": "Production",
      "description": "Serveurs de production",
      "device_count": 12,
      "created_at": "2026-01-10T09:00:00Z"
    }
  ]
}
```

#### 3.4.2 Créer groupe

```http
POST /api/v1/device-groups
```

**Payload** :
```json
{
  "name": "Dev Team",
  "description": "Postes développeurs"
}
```

**Response 201** : (même structure que liste)

**Permissions** : `devices:manage`

#### 3.4.3 Ajouter device à groupe

```http
POST /api/v1/device-groups/{group_id}/members
```

**Payload** :
```json
{
  "device_ids": ["dev_abc123", "dev_def456"]
}
```

**Response 200** :
```json
{
  "added": 2,
  "group_id": "grp_prod_001"
}
```

**Permissions** : `devices:manage`

---

## 4. Endpoints Sessions

### 4.1 Créer session (attended)

```http
POST /api/v1/sessions
```

**Payload** :
```json
{
  "device_id": "dev_abc123",
  "session_type": "desktop",
  "access_mode": "attended"
}
```

**Response 201** :
```json
{
  "id": "sess_xyz789",
  "device_id": "dev_abc123",
  "session_type": "desktop",
  "access_mode": "attended",
  "status": "pending_consent",
  "started_at": "2026-01-22T10:30:00Z",
  "signaling": {
    "websocket_url": "wss://api.myremote.example.com/ws/sessions/sess_xyz789",
    "ice_servers": [
      {
        "urls": ["stun:stun.myremote.example.com:3478"]
      },
      {
        "urls": ["turn:turn.myremote.example.com:3478?transport=udp"],
        "username": "1706000900:julie",
        "credential": "xKpL8nQ..."
      }
    ]
  }
}
```

**Flow** :
1. API crée session `status=pending_consent`
2. Agent reçoit notification WebSocket
3. Agent affiche popup consentement à utilisateur
4. Si accepté → agent envoie `consent_granted`, status → `active`
5. UI établit WebRTC via signaling

**Permissions** : `sessions:create`

---

### 4.2 Créer session (unattended)

```http
POST /api/v1/sessions
```

**Payload** :
```json
{
  "device_id": "srv_prod_01",
  "session_type": "terminal",
  "access_mode": "unattended",
  "unattended_password": "admin_secret_123",
  "justification": "Mise à jour patches sécurité CVE-2026-1234"
}
```

**Response 201** : (même structure, status → `active` immédiatement)

**Validation** :
- API vérifie `unattended_password` contre `devices.unattended_password_hash` (bcrypt)
- Si incorrect → `401 Unauthorized`
- `justification` obligatoire (min 10 caractères)

**Audit** : Log `session.created` avec `access_mode=unattended`, `justification` incluse

**Permissions** : `sessions:create` + `sessions:unattended`

---

### 4.3 Terminer session

```http
DELETE /api/v1/sessions/{session_id}
```

**Response 200** :
```json
{
  "id": "sess_xyz789",
  "status": "terminated",
  "ended_at": "2026-01-22T10:45:00Z",
  "duration_seconds": 900
}
```

**Permissions** : `sessions:terminate` (ou owner de la session)

---

### 4.4 Liste sessions (audit)

```http
GET /api/v1/sessions?device_id=dev_abc123&status=active&from=2026-01-20&to=2026-01-22
```

**Query params** :
- `device_id` (optional)
- `user_id` (optional)
- `status` (optional) : `active`, `terminated`, `failed`
- `from`, `to` (optional) : filtre dates (ISO 8601)
- `page`, `limit`

**Response 200** :
```json
{
  "data": [
    {
      "id": "sess_xyz789",
      "device": {
        "id": "dev_abc123",
        "hostname": "PC-Bureau-001"
      },
      "session_type": "desktop",
      "access_mode": "attended",
      "consent_given": true,
      "status": "terminated",
      "started_at": "2026-01-22T10:30:00Z",
      "ended_at": "2026-01-22T10:45:00Z",
      "duration_seconds": 900,
      "participants": [
        {
          "user_id": "user_xyz",
          "email": "julie@example.com",
          "role": "controller"
        }
      ]
    }
  ],
  "pagination": {...}
}
```

**Permissions** : `sessions:view` (propres sessions) ou `audit:view` (toutes sessions)

---

## 5. Endpoints Contacts

### 5.1 Liste contacts

```http
GET /api/v1/contacts?search=sophie&page=1&limit=50
```

**Response 200** :
```json
{
  "data": [
    {
      "id": "contact_abc123",
      "full_name": "Sophie Martin",
      "email": "sophie.martin@example.com",
      "phone": "+33612345678",
      "notes": "Comptabilité, bureau 204",
      "devices": [
        {
          "id": "dev_abc123",
          "hostname": "PC-Bureau-001",
          "is_primary": true
        }
      ],
      "created_at": "2026-01-15T08:00:00Z"
    }
  ]
}
```

**Permissions** : `contacts:view`

---

### 5.2 Créer contact

```http
POST /api/v1/contacts
```

**Payload** :
```json
{
  "full_name": "Sophie Martin",
  "email": "sophie.martin@example.com",
  "phone": "+33612345678",
  "notes": "Comptabilité",
  "device_ids": ["dev_abc123"]
}
```

**Response 201** : (même structure que liste)

**Permissions** : `contacts:create`

---

### 5.3 Associer contact à device

```http
POST /api/v1/contacts/{contact_id}/devices
```

**Payload** :
```json
{
  "device_id": "dev_abc123",
  "is_primary": true
}
```

**Permissions** : `contacts:manage`

---

## 6. Endpoints Audit

### 6.1 Liste audit logs

```http
GET /api/v1/audit?action=session.created&user_id=user_xyz&from=2026-01-20&limit=100
```

**Query params** :
- `action` (optional) : `login.success`, `device.enrolled`, `session.created`, etc.
- `user_id` (optional)
- `resource_type` (optional) : `device`, `session`, `user`
- `resource_id` (optional)
- `status` (optional) : `success`, `failure`, `denied`
- `from`, `to` (optional)
- `page`, `limit`

**Response 200** :
```json
{
  "data": [
    {
      "id": "audit_abc123",
      "user_email": "julie@example.com",
      "action": "session.created",
      "resource_type": "session",
      "resource_id": "sess_xyz789",
      "ip_address": "1.2.3.4",
      "user_agent": "Mozilla/5.0...",
      "details": {
        "device_id": "dev_abc123",
        "device_hostname": "PC-Bureau-001",
        "session_type": "desktop",
        "access_mode": "attended"
      },
      "status": "success",
      "occurred_at": "2026-01-22T10:30:00Z"
    }
  ],
  "pagination": {...}
}
```

**Permissions** : `audit:view`

---

### 6.2 Exporter audit logs

```http
POST /api/v1/audit/export
```

**Payload** :
```json
{
  "format": "json",
  "from": "2026-01-01T00:00:00Z",
  "to": "2026-01-22T23:59:59Z",
  "filters": {
    "action": "session.*"
  }
}
```

**Response 200** :
```json
{
  "export_id": "export_abc123",
  "status": "processing",
  "estimated_duration_seconds": 30
}
```

**Polling** :
```http
GET /api/v1/audit/export/{export_id}
```

**Response 200** (when ready) :
```json
{
  "export_id": "export_abc123",
  "status": "completed",
  "download_url": "https://api.myremote.example.com/api/v1/audit/export/export_abc123/download",
  "expires_at": "2026-01-23T10:30:00Z",
  "file_size_bytes": 1048576
}
```

**Permissions** : `audit:export`

---

## 7. Endpoints Enrollment

### 7.1 Générer token enrollment

```http
POST /api/v1/enrollment/tokens
```

**Payload** :
```json
{
  "description": "Token pour PC Bureau Sophie",
  "max_uses": 1,
  "expires_in_hours": 24,
  "device_group_id": "grp_prod_001"
}
```

**Response 201** :
```json
{
  "id": "token_abc123",
  "token": "myr_8f3k2l9dj3k2l9dj3k2l9dj3k2l9dj",
  "max_uses": 1,
  "uses_count": 0,
  "expires_at": "2026-01-23T10:30:00Z",
  "device_group_id": "grp_prod_001",
  "created_at": "2026-01-22T10:30:00Z"
}
```

**Permissions** : `devices:enroll`

---

### 7.2 Enrollment agent (utilisé par agent)

```http
POST /api/v1/enrollment/enroll
```

**Payload** :
```json
{
  "token": "myr_8f3k2l9dj3k2l9dj3k2l9dj3k2l9dj",
  "hostname": "PC-Bureau-001",
  "os_type": "windows",
  "os_version": "11 Pro",
  "architecture": "x64",
  "agent_version": "1.0.0",
  "local_ip": "192.168.1.50",
  "mac_address": "AA:BB:CC:DD:EE:FF",
  "metadata": {
    "cpu": "Intel i7-1165G7",
    "ram_gb": 16
  }
}
```

**Response 201** :
```json
{
  "device_id": "dev_abc123",
  "websocket_url": "wss://api.myremote.example.com/ws/agents/dev_abc123",
  "heartbeat_interval_seconds": 30,
  "policies": {
    "auto_update": {
      "enabled": true,
      "channel": "stable"
    }
  }
}
```

**Auth** : Token enrollment dans header `X-Enrollment-Token`

**Validation** :
- Token valide (non expiré, uses_count < max_uses)
- Hostname unique (ou alerte si doublon)
- Token incrémente `uses_count`

---

### 7.3 Liste tokens enrollment

```http
GET /api/v1/enrollment/tokens?active=true
```

**Response 200** : (liste tokens avec status)

**Permissions** : `devices:enroll`

---

## 8. Endpoints Users & RBAC

### 8.1 Liste users

```http
GET /api/v1/users?is_active=true&page=1&limit=50
```

**Response 200** :
```json
{
  "data": [
    {
      "id": "user_abc123",
      "email": "julie@example.com",
      "full_name": "Julie Technicienne",
      "is_active": true,
      "roles": ["operator"],
      "last_login_at": "2026-01-22T09:00:00Z",
      "created_at": "2026-01-15T08:00:00Z"
    }
  ]
}
```

**Permissions** : `users:view` (admins uniquement)

---

### 8.2 Assigner rôle

```http
POST /api/v1/users/{user_id}/roles
```

**Payload** :
```json
{
  "role_id": "role_operator"
}
```

**Permissions** : `users:manage`

---

### 8.3 Permissions utilisateur courant

```http
GET /api/v1/users/me/permissions
```

**Response 200** :
```json
{
  "user_id": "user_abc123",
  "email": "julie@example.com",
  "roles": ["operator"],
  "permissions": [
    "devices:view",
    "sessions:create",
    "terminal:access",
    "files:read",
    "files:write"
  ]
}
```

**Auth** : JWT (pas de permission requise, retourne propres perms)

---

## 9. WebSocket Events

### 9.1 Connexion WebSocket

**URL** : `wss://api.myremote.example.com/ws`

**Auth** : Query param `?token=<JWT>`

**Client** : Web UI ou Agent

---

### 9.2 Events Agent → Server

#### 9.2.1 Heartbeat

```json
{
  "event": "agent:heartbeat",
  "data": {
    "device_id": "dev_abc123",
    "timestamp": "2026-01-22T10:30:00Z",
    "status": "online",
    "cpu_usage": 42.5,
    "ram_usage_percent": 68.2
  }
}
```

**Fréquence** : 30s

---

#### 9.2.2 Consent response

```json
{
  "event": "session:consent_response",
  "data": {
    "session_id": "sess_xyz789",
    "consent_given": true,
    "timestamp": "2026-01-22T10:30:15Z"
  }
}
```

---

### 9.3 Events Server → Agent

#### 9.3.1 Session request (attended)

```json
{
  "event": "session:request",
  "data": {
    "session_id": "sess_xyz789",
    "session_type": "desktop",
    "requester": {
      "email": "julie@example.com",
      "full_name": "Julie Technicienne"
    }
  }
}
```

→ Agent affiche popup : "Julie Technicienne demande à accéder..."

---

#### 9.3.2 Policy update

```json
{
  "event": "policy:update",
  "data": {
    "policy_type": "auto_update",
    "config": {
      "enabled": true,
      "version": "1.1.0",
      "download_url": "https://cdn.myremote.example.com/agent/1.1.0/myremote-agent-windows-x64.exe",
      "signature": "sha256:abc123..."
    }
  }
}
```

---

### 9.4 Events Server → UI (real-time updates)

#### 9.4.1 Device status change

```json
{
  "event": "device:status_changed",
  "data": {
    "device_id": "dev_abc123",
    "status": "online",
    "last_seen_at": "2026-01-22T10:30:00Z"
  }
}
```

---

#### 9.4.2 Session terminated

```json
{
  "event": "session:terminated",
  "data": {
    "session_id": "sess_xyz789",
    "reason": "user_disconnected",
    "ended_at": "2026-01-22T10:45:00Z"
  }
}
```

---

## 10. OpenAPI 3.0 Spec (extrait)

```yaml
openapi: 3.0.3
info:
  title: MyRemote API
  version: 1.0.0
  description: API de gestion de parc et support à distance
  contact:
    email: support@myremote.example.com
servers:
  - url: https://api.myremote.example.com/api/v1
    description: Production
  - url: https://api-staging.myremote.example.com/api/v1
    description: Staging

security:
  - bearerAuth: []

components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT

  schemas:
    Device:
      type: object
      properties:
        id:
          type: string
          format: uuid
        hostname:
          type: string
        os_type:
          type: string
          enum: [windows, macos, linux]
        status:
          type: string
          enum: [online, offline, revoked]
        last_seen_at:
          type: string
          format: date-time
      required:
        - id
        - hostname
        - os_type
        - status

    Error:
      type: object
      properties:
        error:
          type: object
          properties:
            code:
              type: string
            message:
              type: string
            timestamp:
              type: string
              format: date-time
            request_id:
              type: string

paths:
  /devices:
    get:
      summary: Liste devices
      operationId: listDevices
      tags:
        - Devices
      security:
        - bearerAuth: []
      parameters:
        - name: status
          in: query
          schema:
            type: string
            enum: [online, offline, revoked]
        - name: page
          in: query
          schema:
            type: integer
            default: 1
        - name: limit
          in: query
          schema:
            type: integer
            default: 50
            maximum: 100
      responses:
        '200':
          description: Liste devices
          content:
            application/json:
              schema:
                type: object
                properties:
                  data:
                    type: array
                    items:
                      $ref: '#/components/schemas/Device'
                  pagination:
                    type: object
        '401':
          $ref: '#/components/responses/Unauthorized'
        '429':
          $ref: '#/components/responses/TooManyRequests'

  /sessions:
    post:
      summary: Créer session remote
      operationId: createSession
      tags:
        - Sessions
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                device_id:
                  type: string
                  format: uuid
                session_type:
                  type: string
                  enum: [desktop, terminal, files]
                access_mode:
                  type: string
                  enum: [attended, unattended]
                unattended_password:
                  type: string
                  description: Required if access_mode=unattended
                justification:
                  type: string
                  description: Required if access_mode=unattended
              required:
                - device_id
                - session_type
                - access_mode
      responses:
        '201':
          description: Session créée
        '401':
          $ref: '#/components/responses/Unauthorized'
        '403':
          $ref: '#/components/responses/Forbidden'

  components:
    responses:
      Unauthorized:
        description: Non authentifié
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/Error'
      Forbidden:
        description: Permission refusée
      TooManyRequests:
        description: Rate limit dépassé
        headers:
          X-RateLimit-Reset:
            schema:
              type: integer
```

---

## Annexes

### A. Codes d'erreur métier

| Code | HTTP | Description |
|------|------|-------------|
| `DEVICE_NOT_FOUND` | 404 | Device inexistant |
| `DEVICE_OFFLINE` | 422 | Device offline, session impossible |
| `CONSENT_DENIED` | 403 | User a refusé consentement |
| `INVALID_UNATTENDED_PASSWORD` | 401 | Mot de passe unattended incorrect |
| `TOKEN_EXPIRED` | 401 | Token enrollment expiré |
| `TOKEN_EXHAUSTED` | 409 | Token déjà utilisé (max_uses atteint) |
| `INSUFFICIENT_PERMISSIONS` | 403 | Permission manquante (RBAC) |

### B. Webhook (future V1)

```http
POST https://customer-webhook.example.com/myremote/events
```

**Payload** :
```json
{
  "event_type": "session.created",
  "timestamp": "2026-01-22T10:30:00Z",
  "data": {
    "session_id": "sess_xyz789",
    "device_id": "dev_abc123"
  }
}
```

**Signature** : HMAC-SHA256 dans header `X-MyRemote-Signature`

---

**Document maintenu par** : Tech Lead Backend
**Dernière révision** : 2026-01-22
**Spec OpenAPI complète** : `/docs/openapi.yaml`
