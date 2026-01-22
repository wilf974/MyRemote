# MyRemote - Modèle de Données PostgreSQL

**Version**: 1.0
**Date**: 2026-01-22
**SGBD**: PostgreSQL 16+

---

## Table des matières
1. [Vue d'ensemble](#1-vue-densemble)
2. [Schéma ERD](#2-schéma-erd)
3. [Tables détaillées](#3-tables-détaillées)
4. [Relations & Contraintes](#4-relations--contraintes)
5. [Index & Performance](#5-index--performance)
6. [Migrations SQL](#6-migrations-sql)
7. [Politiques de rétention](#7-politiques-de-rétention)

---

## 1. Vue d'ensemble

### 1.1 Groupes de tables

| Groupe | Tables | Description |
|--------|--------|-------------|
| **Identity & Access** | `users`, `roles`, `permissions`, `user_roles` | Gestion utilisateurs, RBAC |
| **Fleet Management** | `devices`, `device_groups`, `device_group_members` | Parc de postes, groupes |
| **Address Book** | `contacts`, `contact_devices` | Carnet d'adresses, association contacts ↔ devices |
| **Sessions** | `sessions`, `session_participants`, `session_events` | Sessions remote, participants, événements |
| **Enrollment** | `enrollment_tokens`, `device_enrollment_history` | Tokens enrollment, historique |
| **Audit & Compliance** | `audit_logs` | Logs immuables (append-only) |
| **Configuration** | `policies`, `device_policies` | Politiques (auto-update, unattended password) |
| **Secrets** | `secrets_metadata` | Metadata secrets (clés dans Vault) |

### 1.2 Principes de conception

- **Immutabilité audit logs** : table `audit_logs` append-only (pas de UPDATE/DELETE)
- **Soft delete** : `deleted_at` pour devices, contacts (rétention 90j avant hard delete)
- **JSONB metadata** : flexibilité pour inventaire devices (CPU, RAM, etc.)
- **UUID primary keys** : compatibilité distribuée, sécurité (pas de sequence predictive)
- **Timestamps** : `created_at`, `updated_at` automatiques (trigger)

---

## 2. Schéma ERD (Entity-Relationship Diagram)

```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│    users    │───┬───│ user_roles  │───────│    roles    │
└─────────────┘   │   └─────────────┘       └─────────────┘
                  │                                │
                  │                                │
                  │                          ┌──────────────┐
                  │                          │ permissions  │
                  │                          └──────────────┘
                  │
                  │   ┌──────────────────────┐
                  └───│   audit_logs         │
                      └──────────────────────┘
                      ┌──────────────────────┐
                      │   sessions           │
                      └──────────────────────┘
                             │       │
                    ┌────────┘       └────────┐
                    │                         │
          ┌─────────────────┐       ┌─────────────────┐
          │    devices      │       │session_participants│
          └─────────────────┘       └─────────────────┘
                 │       │
        ┌────────┘       └────────┐
        │                         │
┌───────────────┐       ┌─────────────────┐
│device_groups  │───────│device_group_     │
└───────────────┘       │   members        │
                        └──────────────────┘

┌───────────────┐       ┌─────────────────┐
│   contacts    │───────│contact_devices  │───┐
└───────────────┘       └─────────────────┘   │
                                               │
                        ┌──────────────────────┘
                        │
                ┌───────────────┐
                │   devices     │
                └───────────────┘
                        │
                        │
                ┌───────────────────┐
                │enrollment_tokens  │
                └───────────────────┘
```

---

## 3. Tables détaillées

### 3.1 Identity & Access

#### 3.1.1 `users`

Utilisateurs IT (admins, techniciens, auditeurs).

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    external_id VARCHAR(255) UNIQUE NOT NULL, -- ID depuis Keycloak (sub)
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

COMMENT ON TABLE users IS 'Utilisateurs IT (synchronisés depuis Keycloak OIDC)';
COMMENT ON COLUMN users.external_id IS 'Subject ID depuis Keycloak (sub claim JWT)';
COMMENT ON COLUMN users.deleted_at IS 'Soft delete (GDPR right to be forgotten)';
```

#### 3.1.2 `roles`

Rôles RBAC (Admin, Operator, Viewer, Auditor).

```sql
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) UNIQUE NOT NULL, -- 'admin', 'operator', 'viewer', 'auditor'
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Rôles par défaut
INSERT INTO roles (name, description) VALUES
    ('admin', 'Full access to all resources'),
    ('operator', 'Can manage devices and create sessions'),
    ('viewer', 'Read-only access to devices and sessions'),
    ('auditor', 'Can view and export audit logs');
```

#### 3.1.3 `permissions`

Permissions granulaires.

```sql
CREATE TABLE permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resource VARCHAR(50) NOT NULL, -- 'devices', 'sessions', 'audit', etc.
    action VARCHAR(50) NOT NULL,   -- 'view', 'create', 'update', 'delete', 'enroll', 'revoke'
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (resource, action)
);

-- Permissions par défaut
INSERT INTO permissions (resource, action, description) VALUES
    ('devices', 'view', 'View devices list'),
    ('devices', 'enroll', 'Generate enrollment tokens'),
    ('devices', 'revoke', 'Revoke/disable devices'),
    ('sessions', 'create', 'Initiate remote sessions'),
    ('sessions', 'terminate', 'Terminate sessions'),
    ('terminal', 'access', 'Access remote terminal'),
    ('files', 'read', 'Download files from devices'),
    ('files', 'write', 'Upload files to devices'),
    ('audit', 'view', 'View audit logs'),
    ('audit', 'export', 'Export audit logs');
```

#### 3.1.4 `user_roles`

Association users ↔ roles (N-N).

```sql
CREATE TABLE user_roles (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
    granted_at TIMESTAMPTZ DEFAULT NOW(),
    granted_by UUID REFERENCES users(id),
    PRIMARY KEY (user_id, role_id)
);
```

#### 3.1.5 `role_permissions`

Association roles ↔ permissions (N-N).

```sql
CREATE TABLE role_permissions (
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

-- Exemple : Admin a toutes les permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p WHERE r.name = 'admin';

-- Operator : view devices, create sessions, terminal, files
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'operator' AND p.resource IN ('devices', 'sessions', 'terminal', 'files');
```

---

### 3.2 Fleet Management

#### 3.2.1 `devices`

Postes gérés (Windows, macOS, Linux).

```sql
CREATE TABLE devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hostname VARCHAR(255) NOT NULL,
    os_type VARCHAR(50) NOT NULL, -- 'windows', 'macos', 'linux'
    os_version VARCHAR(100),
    architecture VARCHAR(50), -- 'x64', 'arm64'
    agent_version VARCHAR(50) NOT NULL, -- '1.0.0'

    -- Network
    local_ip INET,
    public_ip INET,
    mac_address MACADDR,

    -- Status
    status VARCHAR(50) DEFAULT 'offline', -- 'online', 'offline', 'revoked'
    last_seen_at TIMESTAMPTZ,

    -- Inventory (flexible JSON)
    metadata JSONB, -- {cpu: 'Intel i7', ram_gb: 16, disks: [...]}

    -- Unattended access
    unattended_password_hash VARCHAR(255), -- bcrypt hash (nullable)

    -- Lifecycle
    enrolled_at TIMESTAMPTZ DEFAULT NOW(),
    enrolled_by UUID REFERENCES users(id),
    revoked_at TIMESTAMPTZ,
    revoked_by UUID REFERENCES users(id),
    deleted_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_devices_status ON devices(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_devices_os_type ON devices(os_type) WHERE deleted_at IS NULL;
CREATE INDEX idx_devices_last_seen ON devices(last_seen_at DESC);
CREATE INDEX idx_devices_metadata ON devices USING GIN(metadata);

COMMENT ON COLUMN devices.unattended_password_hash IS 'Bcrypt hash du mot de passe unattended (si configuré)';
COMMENT ON COLUMN devices.metadata IS 'Inventaire flexible (CPU, RAM, disks, GPU, etc.)';
```

#### 3.2.2 `device_groups`

Groupes de postes (Production, Dev, Bureautique, etc.).

```sql
CREATE TABLE device_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_device_groups_name ON device_groups(name) WHERE deleted_at IS NULL;
```

#### 3.2.3 `device_group_members`

Association devices ↔ groups (N-N).

```sql
CREATE TABLE device_group_members (
    device_id UUID REFERENCES devices(id) ON DELETE CASCADE,
    group_id UUID REFERENCES device_groups(id) ON DELETE CASCADE,
    added_at TIMESTAMPTZ DEFAULT NOW(),
    added_by UUID REFERENCES users(id),
    PRIMARY KEY (device_id, group_id)
);
```

---

### 3.3 Address Book

#### 3.3.1 `contacts`

Contacts (utilisateurs finaux, non-IT).

```sql
CREATE TABLE contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    notes TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_contacts_name ON contacts(full_name) WHERE deleted_at IS NULL;
CREATE INDEX idx_contacts_email ON contacts(email) WHERE deleted_at IS NULL;
```

#### 3.3.2 `contact_devices`

Association contacts ↔ devices (N-N).

```sql
CREATE TABLE contact_devices (
    contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
    device_id UUID REFERENCES devices(id) ON DELETE CASCADE,
    is_primary BOOLEAN DEFAULT false, -- Un contact peut avoir un device principal
    added_at TIMESTAMPTZ DEFAULT NOW(),
    added_by UUID REFERENCES users(id),
    PRIMARY KEY (contact_id, device_id)
);

CREATE INDEX idx_contact_devices_device ON contact_devices(device_id);
```

---

### 3.4 Sessions

#### 3.4.1 `sessions`

Sessions remote (desktop, terminal, files).

```sql
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id UUID REFERENCES devices(id) ON DELETE CASCADE,

    -- Type de session
    session_type VARCHAR(50) NOT NULL, -- 'desktop', 'terminal', 'files'

    -- Mode d'accès
    access_mode VARCHAR(50) NOT NULL, -- 'attended', 'unattended'
    consent_given BOOLEAN, -- NULL si unattended, true/false si attended
    consent_given_at TIMESTAMPTZ,

    -- Justification (obligatoire si unattended)
    justification TEXT,

    -- Status
    status VARCHAR(50) DEFAULT 'active', -- 'active', 'terminated', 'failed'

    -- Lifecycle
    started_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    duration_seconds INTEGER GENERATED ALWAYS AS (EXTRACT(EPOCH FROM (ended_at - started_at))) STORED,

    -- Metadata
    metadata JSONB, -- {webrtc_ice_type: 'relay', bandwidth_mbps: 5.2, ...}

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sessions_device ON sessions(device_id);
CREATE INDEX idx_sessions_status ON sessions(status);
CREATE INDEX idx_sessions_started_at ON sessions(started_at DESC);
CREATE INDEX idx_sessions_type ON sessions(session_type);

COMMENT ON COLUMN sessions.consent_given IS 'NULL si unattended, true si user a accepté, false si refusé';
COMMENT ON COLUMN sessions.justification IS 'Raison de connexion (obligatoire pour unattended)';
```

#### 3.4.2 `session_participants`

Participants à une session (techniciens).

```sql
CREATE TABLE session_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'viewer', -- 'controller', 'viewer'
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    left_at TIMESTAMPTZ,
    UNIQUE (session_id, user_id)
);

CREATE INDEX idx_session_participants_session ON session_participants(session_id);
CREATE INDEX idx_session_participants_user ON session_participants(user_id);
```

#### 3.4.3 `session_events`

Événements durant une session (actions, erreurs).

```sql
CREATE TABLE session_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
    event_type VARCHAR(100) NOT NULL, -- 'command_executed', 'file_downloaded', 'screenshot_taken', 'error'
    details JSONB, -- {command: 'ls -la', exit_code: 0}, {file: '/tmp/file.txt', size_bytes: 1024}
    occurred_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_session_events_session ON session_events(session_id);
CREATE INDEX idx_session_events_type ON session_events(event_type);
CREATE INDEX idx_session_events_occurred_at ON session_events(occurred_at DESC);

COMMENT ON TABLE session_events IS 'Événements granulaires durant sessions (commandes, transferts fichiers, etc.)';
```

---

### 3.5 Enrollment

#### 3.5.1 `enrollment_tokens`

Tokens d'enrollment (usage unique).

```sql
CREATE TABLE enrollment_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token VARCHAR(255) UNIQUE NOT NULL, -- Format: 'myr_' + 32 caractères aléatoires

    -- Restrictions
    max_uses INTEGER DEFAULT 1,
    uses_count INTEGER DEFAULT 0,
    expires_at TIMESTAMPTZ NOT NULL,

    -- Metadata
    description TEXT, -- 'Token pour PC Bureau Sophie'
    device_group_id UUID REFERENCES device_groups(id), -- Assigner à un groupe automatiquement

    -- Lifecycle
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    revoked_at TIMESTAMPTZ,
    revoked_by UUID REFERENCES users(id)
);

CREATE INDEX idx_enrollment_tokens_token ON enrollment_tokens(token) WHERE revoked_at IS NULL;
CREATE INDEX idx_enrollment_tokens_expires_at ON enrollment_tokens(expires_at);

COMMENT ON COLUMN enrollment_tokens.token IS 'Token format: myr_<32_random_chars>, usage unique, expire après 24h';
```

#### 3.5.2 `device_enrollment_history`

Historique enrollments.

```sql
CREATE TABLE device_enrollment_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id UUID REFERENCES devices(id) ON DELETE CASCADE,
    token_id UUID REFERENCES enrollment_tokens(id),
    enrolled_at TIMESTAMPTZ DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT
);

CREATE INDEX idx_device_enrollment_device ON device_enrollment_history(device_id);
```

---

### 3.6 Audit & Compliance

#### 3.6.1 `audit_logs`

Logs d'audit immuables (append-only).

```sql
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Who
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    user_email VARCHAR(255), -- Denormalisé pour rétention même si user supprimé

    -- What
    action VARCHAR(100) NOT NULL, -- 'device.enrolled', 'session.created', 'file.downloaded', 'login.failed'
    resource_type VARCHAR(50), -- 'device', 'session', 'user'
    resource_id UUID,

    -- Context
    ip_address INET,
    user_agent TEXT,

    -- Details
    details JSONB, -- {device_hostname: 'PC-001', session_type: 'desktop', ...}

    -- When
    occurred_at TIMESTAMPTZ DEFAULT NOW(),

    -- Outcome
    status VARCHAR(50) DEFAULT 'success', -- 'success', 'failure', 'denied'
    error_message TEXT
);

-- IMPORTANT: Pas de UPDATE ni DELETE (immutabilité)
REVOKE UPDATE, DELETE ON audit_logs FROM PUBLIC;

CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_logs_occurred_at ON audit_logs(occurred_at DESC);
CREATE INDEX idx_audit_logs_status ON audit_logs(status);

COMMENT ON TABLE audit_logs IS 'Logs immuables (append-only), rétention 90 jours, exportables JSON/CSV';
```

---

### 3.7 Configuration

#### 3.7.1 `policies`

Politiques de sécurité (auto-update, rotation tokens, etc.).

```sql
CREATE TABLE policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    policy_type VARCHAR(50) NOT NULL, -- 'auto_update', '2fa_enforcement', 'session_timeout'
    config JSONB NOT NULL, -- {enabled: true, update_channel: 'stable', ...}
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Exemple policies
INSERT INTO policies (name, policy_type, config) VALUES
    ('Auto-update agents', 'auto_update', '{"enabled": true, "channel": "stable", "check_interval_hours": 24}'),
    ('Enforce 2FA', '2fa_enforcement', '{"enabled": true, "grace_period_days": 7}'),
    ('Session timeout', 'session_timeout', '{"idle_timeout_minutes": 30, "max_duration_hours": 8}');
```

#### 3.7.2 `device_policies`

Association devices/groupes ↔ policies.

```sql
CREATE TABLE device_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    policy_id UUID REFERENCES policies(id) ON DELETE CASCADE,
    device_id UUID REFERENCES devices(id) ON DELETE CASCADE,
    device_group_id UUID REFERENCES device_groups(id) ON DELETE CASCADE,
    applied_at TIMESTAMPTZ DEFAULT NOW(),
    CHECK ((device_id IS NOT NULL AND device_group_id IS NULL) OR (device_id IS NULL AND device_group_id IS NOT NULL))
);

CREATE INDEX idx_device_policies_device ON device_policies(device_id);
CREATE INDEX idx_device_policies_group ON device_policies(device_group_id);
```

---

### 3.8 Secrets

#### 3.8.1 `secrets_metadata`

Metadata des secrets (clés réelles dans Vault).

```sql
CREATE TABLE secrets_metadata (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    secret_type VARCHAR(50) NOT NULL, -- 'turn_secret', 'api_key', 'encryption_key'
    vault_path VARCHAR(255) NOT NULL, -- 'secret/myremote/turn_secret'
    last_rotated_at TIMESTAMPTZ,
    rotation_interval_days INTEGER, -- NULL = pas de rotation automatique
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE secrets_metadata IS 'Metadata uniquement, valeurs réelles dans HashiCorp Vault';
```

---

## 4. Relations & Contraintes

### 4.1 Diagramme relations

```
users (1) ─────< (N) user_roles (N) ─────> (1) roles
                                                  │
                                                  │
                                            (1) roles (1) ─────< (N) role_permissions (N) ─────> (1) permissions

devices (1) ─────< (N) sessions (N) ─────> (1) session_participants (N) ─────> (1) users

devices (N) <─────> (N) device_group_members <─────> (N) device_groups

contacts (N) <─────> (N) contact_devices <─────> (N) devices

enrollment_tokens (1) ─────< (N) device_enrollment_history (N) ─────> (1) devices
```

### 4.2 Contraintes CHECK

```sql
-- devices: unattended password doit être bcrypt hash (start with $2b$)
ALTER TABLE devices ADD CONSTRAINT check_unattended_password
    CHECK (unattended_password_hash IS NULL OR unattended_password_hash ~ '^\$2[aby]\$\d+\$');

-- sessions: justification obligatoire si unattended
ALTER TABLE sessions ADD CONSTRAINT check_justification_unattended
    CHECK (access_mode != 'unattended' OR (justification IS NOT NULL AND LENGTH(justification) > 10));

-- enrollment_tokens: expires_at > created_at
ALTER TABLE enrollment_tokens ADD CONSTRAINT check_expires_after_created
    CHECK (expires_at > created_at);

-- enrollment_tokens: max_uses >= uses_count
ALTER TABLE enrollment_tokens ADD CONSTRAINT check_uses_count
    CHECK (uses_count <= max_uses);
```

---

## 5. Index & Performance

### 5.1 Index stratégiques

| Table | Index | Justification |
|-------|-------|---------------|
| `devices` | `idx_devices_status` | Filtrage par statut (online/offline) très fréquent |
| `devices` | `idx_devices_last_seen` | Dashboard "postes récemment vus" |
| `devices` | `idx_devices_metadata (GIN)` | Recherche dans inventaire JSONB (ex: "RAM > 16GB") |
| `sessions` | `idx_sessions_started_at` | Liste sessions récentes (audit) |
| `audit_logs` | `idx_audit_logs_occurred_at` | Pagination logs par date |
| `audit_logs` | `idx_audit_logs_user` | Filtrage logs par utilisateur |
| `enrollment_tokens` | `idx_enrollment_tokens_token` | Vérification token lors enrollment |

### 5.2 Optimisations requêtes

#### Query 1 : Liste devices online avec dernière session

```sql
SELECT
    d.id,
    d.hostname,
    d.status,
    d.last_seen_at,
    s.started_at AS last_session_at,
    u.full_name AS last_session_user
FROM devices d
LEFT JOIN LATERAL (
    SELECT session_id, started_at
    FROM sessions
    WHERE device_id = d.id
    ORDER BY started_at DESC
    LIMIT 1
) s ON true
LEFT JOIN session_participants sp ON sp.session_id = s.session_id
LEFT JOIN users u ON u.id = sp.user_id
WHERE d.status = 'online' AND d.deleted_at IS NULL
ORDER BY d.last_seen_at DESC
LIMIT 100;
```

**Explication** : Utilise LATERAL JOIN pour éviter GROUP BY coûteux.

#### Query 2 : Audit logs avec filtering

```sql
SELECT
    al.id,
    al.action,
    al.user_email,
    al.occurred_at,
    al.details,
    d.hostname
FROM audit_logs al
LEFT JOIN devices d ON d.id = (al.details->>'device_id')::uuid
WHERE
    al.occurred_at >= NOW() - INTERVAL '7 days'
    AND al.action LIKE 'session.%'
    AND al.status = 'success'
ORDER BY al.occurred_at DESC
LIMIT 500;
```

**Performances** :
- Index `idx_audit_logs_occurred_at` : scan rapide derniers 7 jours
- Filtre `action LIKE 'session.%'` : utilise `idx_audit_logs_action`

### 5.3 Partitioning (V1, si > 1M logs)

```sql
-- Partitioning audit_logs par mois (évite tables trop grosses)
CREATE TABLE audit_logs (
    -- colonnes...
) PARTITION BY RANGE (occurred_at);

CREATE TABLE audit_logs_2026_01 PARTITION OF audit_logs
    FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');

CREATE TABLE audit_logs_2026_02 PARTITION OF audit_logs
    FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');

-- Automatiser création partitions (pg_cron ou script)
```

---

## 6. Migrations SQL

### 6.1 Migration initiale (V1.0.0)

```sql
-- File: migrations/001_initial_schema.sql

BEGIN;

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    external_id VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Roles table
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Permissions table
CREATE TABLE permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resource VARCHAR(50) NOT NULL,
    action VARCHAR(50) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (resource, action)
);

-- (... toutes les tables ci-dessus ...)

-- Trigger auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_devices_updated_at BEFORE UPDATE ON devices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- (... autres triggers ...)

COMMIT;
```

### 6.2 Migration V1.1.0 : Ajout multi-tenant (future)

```sql
-- File: migrations/002_multi_tenant.sql

BEGIN;

-- Organizations table
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) UNIQUE NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ajouter organization_id à toutes les tables principales
ALTER TABLE users ADD COLUMN organization_id UUID REFERENCES organizations(id);
ALTER TABLE devices ADD COLUMN organization_id UUID REFERENCES organizations(id);
ALTER TABLE sessions ADD COLUMN organization_id UUID REFERENCES organizations(id);

-- Index
CREATE INDEX idx_users_org ON users(organization_id);
CREATE INDEX idx_devices_org ON devices(organization_id);

-- Row Level Security (RLS)
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
CREATE POLICY devices_org_isolation ON devices
    USING (organization_id = current_setting('app.current_org_id')::uuid);

COMMIT;
```

---

## 7. Politiques de rétention

### 7.1 Règles de rétention

| Table | Retention | Stratégie |
|-------|-----------|-----------|
| `audit_logs` | 90 jours | Hard delete après 90j (GDPR compliance) |
| `sessions` | 90 jours | Soft delete (deleted_at), hard delete après 90j |
| `session_events` | 90 jours | Cascade delete avec sessions |
| `devices` | Indéfini | Soft delete (revoked_at), admin peut hard delete manuellement |
| `users` | Indéfini | Soft delete (GDPR), audit logs conservent email (denormalisé) |
| `enrollment_tokens` | 7 jours après expiration | Hard delete tokens expirés depuis > 7j |

### 7.2 Script cleanup automatique

```sql
-- Fonction de nettoyage (pg_cron daily @ 2h UTC)
CREATE OR REPLACE FUNCTION cleanup_old_data() RETURNS void AS $$
BEGIN
    -- Supprimer audit logs > 90 jours
    DELETE FROM audit_logs WHERE occurred_at < NOW() - INTERVAL '90 days';

    -- Supprimer sessions terminées > 90 jours
    DELETE FROM sessions WHERE ended_at < NOW() - INTERVAL '90 days';

    -- Supprimer enrollment tokens expirés > 7 jours
    DELETE FROM enrollment_tokens WHERE expires_at < NOW() - INTERVAL '7 days';

    -- Hard delete devices soft-deleted > 90 jours
    DELETE FROM devices WHERE deleted_at < NOW() - INTERVAL '90 days';

    RAISE NOTICE 'Cleanup completed at %', NOW();
END;
$$ LANGUAGE plpgsql;

-- Scheduler avec pg_cron (installer extension)
SELECT cron.schedule('cleanup-old-data', '0 2 * * *', 'SELECT cleanup_old_data()');
```

---

## 8. Sécurité Database

### 8.1 Rôles PostgreSQL

```sql
-- Rôle application (limited privileges)
CREATE ROLE myremote_app WITH LOGIN PASSWORD 'change_me_in_production';

-- Permissions strictes
GRANT CONNECT ON DATABASE myremote TO myremote_app;
GRANT USAGE ON SCHEMA public TO myremote_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO myremote_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO myremote_app;

-- Interdire UPDATE/DELETE sur audit_logs
REVOKE UPDATE, DELETE ON audit_logs FROM myremote_app;

-- Rôle read-only (pour analytics, Grafana)
CREATE ROLE myremote_readonly WITH LOGIN PASSWORD 'change_me_readonly';
GRANT CONNECT ON DATABASE myremote TO myremote_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO myremote_readonly;
```

### 8.2 Chiffrement au repos

```sql
-- Option 1: PostgreSQL Transparent Data Encryption (pgcrypto)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Option 2: LUKS (filesystem encryption, Linux)
-- Configuration au niveau OS/infra (hors SQL)

-- Option 3: AWS RDS encryption (si cloud)
-- Configuration via Terraform/CloudFormation
```

---

## Annexes

### A. Exemple données de test

```sql
-- Seed data (dev/staging)
INSERT INTO users (external_id, email, full_name) VALUES
    ('keycloak_sub_123', 'marc@example.com', 'Marc Admin'),
    ('keycloak_sub_456', 'julie@example.com', 'Julie Technicienne');

INSERT INTO roles (name, description) VALUES
    ('admin', 'Full access'),
    ('operator', 'Can manage devices and sessions');

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u, roles r WHERE u.email = 'marc@example.com' AND r.name = 'admin';

INSERT INTO devices (hostname, os_type, os_version, agent_version, status, metadata) VALUES
    ('PC-Bureau-001', 'windows', '11 Pro', '1.0.0', 'online', '{"cpu": "Intel i7-1165G7", "ram_gb": 16}'),
    ('MacBook-Dev-02', 'macos', '14.2', '1.0.0', 'offline', '{"cpu": "Apple M2", "ram_gb": 32}'),
    ('SRV-PROD-01', 'linux', 'Ubuntu 22.04', '1.0.0', 'online', '{"cpu": "AMD EPYC 7543", "ram_gb": 128}');
```

### B. Monitoring queries (Grafana)

```sql
-- Devices by status
SELECT status, COUNT(*) FROM devices WHERE deleted_at IS NULL GROUP BY status;

-- Sessions per day (last 30 days)
SELECT DATE(started_at) AS day, COUNT(*) FROM sessions
WHERE started_at >= NOW() - INTERVAL '30 days'
GROUP BY day ORDER BY day;

-- Failed login attempts (last 24h)
SELECT COUNT(*) FROM audit_logs
WHERE action = 'login.failed' AND occurred_at >= NOW() - INTERVAL '24 hours';
```

---

**Document maintenu par** : Tech Lead + DBA
**Dernière révision** : 2026-01-22
**Migration tool** : TypeORM / Prisma / Flyway
