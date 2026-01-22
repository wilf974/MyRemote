# MyRemote - Agent Enrollment & Lifecycle

**Version**: 1.0
**Date**: 2026-01-22

---

## Table des matières
1. [Vue d'ensemble](#1-vue-densemble)
2. [Installation légitime](#2-installation-légitime)
3. [Processus d'enrollment](#3-processus-denrollment)
4. [Heartbeat & Monitoring](#4-heartbeat--monitoring)
5. [Policy management](#5-policy-management)
6. [Auto-update](#6-auto-update)
7. [Sécurité agent](#7-sécurité-agent)

---

## 1. Vue d'ensemble

### 1.1 Principes de conception agent

| Principe | Description |
|----------|-------------|
| **Légitimité** | Installation explicite par admin IT, pas de déploiement furtif |
| **Consentement** | Mode attended = consentement obligatoire utilisateur final |
| **Transparence** | Processus visible (service Windows, LaunchDaemon, systemd) |
| **Signature** | Binaire signé (Cosign), vérification à l'installation |
| **Minimal privilege** | Agent tourne en user context (pas root/admin sauf nécessaire) |
| **Audit** | Toutes actions loguées localement + serveur |

### 1.2 Architecture agent

```
┌────────────────────────────────────────────────────────────┐
│                    MyRemote Agent (Rust)                   │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐ │
│  │  Enrollment  │   │  Heartbeat   │   │   Policy     │ │
│  │   Module     │   │   Module     │   │   Engine     │ │
│  └──────────────┘   └──────────────┘   └──────────────┘ │
│                                                            │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐ │
│  │   Session    │   │   Terminal   │   │    Files     │ │
│  │   Manager    │   │   Handler    │   │   Handler    │ │
│  └──────────────┘   └──────────────┘   └──────────────┘ │
│                                                            │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐ │
│  │   WebRTC     │   │  WebSocket   │   │   Audit      │ │
│  │    Peer      │   │   Client     │   │   Logger     │ │
│  └──────────────┘   └──────────────┘   └──────────────┘ │
│                                                            │
│  ┌─────────────────────────────────────────────────────┐ │
│  │          Local Config & State (SQLite)              │ │
│  └─────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────┘
```

---

## 2. Installation légitime

### 2.1 Packages signés

| OS | Format | Signature | Distribution |
|----|--------|-----------|--------------|
| **Windows** | MSI | Authenticode (cert EV) | CDN + Web UI download |
| **macOS** | PKG | Apple notarization + Developer ID | CDN + Web UI download |
| **Linux** | DEB, RPM | GPG signature | CDN + APT/YUM repo |

### 2.2 Installation Windows (exemple)

#### Étape 1 : Génération token enrollment (Admin)

Admin IT génère token depuis Web UI :

```
Token : myr_8f3k2l9dj3k2l9dj3k2l9dj3k2l9dj
Expires : 2026-01-23 10:30 UTC (24h)
Max uses : 1
```

#### Étape 2 : Téléchargement installateur

```
URL : https://cdn.myremote.example.com/agent/1.0.0/myremote-agent-windows-x64.msi
Taille : 12 MB
Signature : SHA256: abc123..., Authenticode valide
```

#### Étape 3 : Installation MSI

```cmd
msiexec /i myremote-agent-windows-x64.msi /qn ENROLLMENT_TOKEN=myr_8f3k2l9dj3k2l9dj3k2l9dj3k2l9dj SERVER_URL=https://api.myremote.example.com
```

**Paramètres** :
- `ENROLLMENT_TOKEN` : token généré par admin
- `SERVER_URL` : URL Control Plane
- `/qn` : silent install (ou GUI avec prompt token)

**Actions installateur** :
1. Vérifie signature Authenticode (Windows trust store)
2. Copie binaire dans `C:\Program Files\MyRemote\myremote-agent.exe`
3. Crée service Windows `MyRemoteAgent`
4. Lance service → enrollment automatique
5. Affiche notification : "MyRemote agent enrolled successfully"

### 2.3 Installation macOS

```bash
# Télécharger PKG signé
curl -O https://cdn.myremote.example.com/agent/1.0.0/myremote-agent-macos-universal.pkg

# Vérifier signature
pkgutil --check-signature myremote-agent-macos-universal.pkg
# Output: Developer ID Installer: MyRemote Inc (TEAM_ID)

# Installer (nécessite sudo)
sudo installer -pkg myremote-agent-macos-universal.pkg -target /

# Configurer enrollment token
sudo defaults write /Library/Preferences/com.myremote.agent EnrollmentToken "myr_8f3k2l9dj3k2l9dj3k2l9dj3k2l9dj"
sudo defaults write /Library/Preferences/com.myremote.agent ServerURL "https://api.myremote.example.com"

# Lancer LaunchDaemon
sudo launchctl load /Library/LaunchDaemons/com.myremote.agent.plist
```

**LaunchDaemon** (`/Library/LaunchDaemons/com.myremote.agent.plist`) :
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.myremote.agent</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/local/bin/myremote-agent</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>/var/log/myremote-agent.log</string>
    <key>StandardErrorPath</key>
    <string>/var/log/myremote-agent-error.log</string>
</dict>
</plist>
```

### 2.4 Installation Linux (Debian/Ubuntu)

```bash
# Ajouter GPG key
curl -fsSL https://cdn.myremote.example.com/gpg.key | sudo gpg --dearmor -o /usr/share/keyrings/myremote.gpg

# Ajouter repo APT
echo "deb [signed-by=/usr/share/keyrings/myremote.gpg] https://apt.myremote.example.com stable main" | sudo tee /etc/apt/sources.list.d/myremote.list

# Installer
sudo apt update
sudo apt install myremote-agent

# Configurer enrollment
sudo myremote-agent enroll --token myr_8f3k2l9dj3k2l9dj3k2l9dj3k2l9dj --server https://api.myremote.example.com

# Démarrer service
sudo systemctl start myremote-agent
sudo systemctl enable myremote-agent
```

**Systemd service** (`/etc/systemd/system/myremote-agent.service`) :
```ini
[Unit]
Description=MyRemote Agent
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
ExecStart=/usr/bin/myremote-agent
Restart=always
RestartSec=10
User=myremote
Group=myremote

[Install]
WantedBy=multi-user.target
```

---

## 3. Processus d'enrollment

### 3.1 Flux complet

```
┌─────────────────────────────────────────────────────────────┐
│                   Enrollment Flow                           │
└─────────────────────────────────────────────────────────────┘

1. Admin génère token enrollment (Web UI)
   → API POST /api/v1/enrollment/tokens
   → Token : myr_8f3k2l9dj3k2l9dj3k2l9dj3k2l9dj (expires 24h)

2. Admin télécharge installateur signé + donne token

3. Installation agent sur device
   → Binaire copié, service créé

4. Agent démarre, lit token depuis config
   → Windows : Registry HKLM\Software\MyRemote\EnrollmentToken
   → macOS : /Library/Preferences/com.myremote.agent.plist
   → Linux : /etc/myremote/config.toml

5. Agent envoie requête enrollment
   → POST https://api.myremote.example.com/api/v1/enrollment/enroll
   → Headers : X-Enrollment-Token: myr_8f3k2l9dj3k2l9dj3k2l9dj3k2l9dj
   → Payload : {hostname, os_type, os_version, metadata, ...}

6. API valide token
   → Vérifie : non expiré, uses_count < max_uses
   → Si valide : crée device record, incrémente uses_count
   → Si invalide : 401 Unauthorized

7. API retourne credentials device
   → Response : {device_id, websocket_url, device_secret (JWT long-lived)}

8. Agent stocke credentials localement (chiffrées)
   → SQLite local : /var/lib/myremote/agent.db (PRAGMA key = device_secret)

9. Agent se connecte WebSocket
   → WSS wss://api.myremote.example.com/ws/agents/{device_id}
   → Auth : Bearer {device_secret}

10. Agent envoie premier heartbeat
    → event: agent:heartbeat
    → status: online

11. Device apparaît dans Web UI (status: online)
```

### 3.2 Requête enrollment (détail)

```http
POST /api/v1/enrollment/enroll HTTP/1.1
Host: api.myremote.example.com
Content-Type: application/json
X-Enrollment-Token: myr_8f3k2l9dj3k2l9dj3k2l9dj3k2l9dj
User-Agent: MyRemote-Agent/1.0.0 (Windows NT 10.0; x64)

{
  "hostname": "PC-Bureau-001",
  "os_type": "windows",
  "os_version": "11 Pro 22H2 (Build 22621.963)",
  "architecture": "x64",
  "agent_version": "1.0.0",
  "local_ip": "192.168.1.50",
  "public_ip": "1.2.3.4",
  "mac_address": "AA:BB:CC:DD:EE:FF",
  "metadata": {
    "cpu": {
      "model": "Intel Core i7-1165G7",
      "cores": 4,
      "threads": 8,
      "frequency_mhz": 2800
    },
    "ram": {
      "total_gb": 16,
      "available_gb": 8.2
    },
    "disks": [
      {
        "name": "C:",
        "total_gb": 512,
        "free_gb": 128,
        "filesystem": "NTFS"
      }
    ],
    "gpu": "Intel Iris Xe Graphics",
    "network_interfaces": [
      {
        "name": "Ethernet",
        "mac": "AA:BB:CC:DD:EE:FF",
        "ip": "192.168.1.50"
      }
    ]
  }
}
```

### 3.3 Response enrollment

```http
HTTP/1.1 201 Created
Content-Type: application/json

{
  "device_id": "dev_abc123",
  "websocket_url": "wss://api.myremote.example.com/ws/agents/dev_abc123",
  "device_secret": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...", // JWT long-lived (90 jours)
  "heartbeat_interval_seconds": 30,
  "config": {
    "log_level": "info",
    "metrics_enabled": true
  },
  "policies": {
    "auto_update": {
      "enabled": true,
      "channel": "stable",
      "check_interval_hours": 24
    },
    "session_timeout": {
      "idle_timeout_minutes": 30,
      "max_duration_hours": 8
    }
  }
}
```

### 3.4 Stockage local credentials (sécurisé)

Agent stocke `device_secret` chiffré dans SQLite local.

**Structure SQLite** (`/var/lib/myremote/agent.db`) :

```sql
-- Chiffrement database avec SQLCipher
PRAGMA key = '<derived_from_device_secret>';

CREATE TABLE config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

INSERT INTO config VALUES ('device_id', 'dev_abc123');
INSERT INTO config VALUES ('device_secret', 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...');
INSERT INTO config VALUES ('server_url', 'https://api.myremote.example.com');

CREATE TABLE audit_log_local (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    action TEXT NOT NULL,
    details TEXT, -- JSON
    timestamp INTEGER NOT NULL
);
```

**Permissions fichier** :
- Linux : `chmod 600 /var/lib/myremote/agent.db`, owner `myremote:myremote`
- Windows : ACL restrictive (SYSTEM + Administrators uniquement)
- macOS : `chmod 600 /Library/Application Support/MyRemote/agent.db`

---

## 4. Heartbeat & Monitoring

### 4.1 Heartbeat périodique

Agent envoie heartbeat toutes les **30 secondes** (configurable).

**Payload WebSocket** :
```json
{
  "event": "agent:heartbeat",
  "data": {
    "device_id": "dev_abc123",
    "timestamp": "2026-01-22T10:30:00Z",
    "status": "online",
    "uptime_seconds": 86400,
    "cpu_usage_percent": 42.5,
    "ram_usage_percent": 68.2,
    "disk_free_gb": 128,
    "agent_version": "1.0.0",
    "active_sessions": 0
  }
}
```

### 4.2 Détection offline

**Control Plane logic** :
- Si heartbeat non reçu depuis > **90 secondes** (3x interval) → status = `offline`
- UI affiche status `offline` avec badge rouge
- Alerte optionnelle (si configurée) : email, Slack, etc.

### 4.3 Inventaire périodique

Agent envoie inventaire complet toutes les **24 heures** (ou à la demande).

**Payload** :
```json
{
  "event": "agent:inventory_update",
  "data": {
    "device_id": "dev_abc123",
    "timestamp": "2026-01-22T10:00:00Z",
    "metadata": {
      "cpu": {...},
      "ram": {...},
      "disks": [...],
      "installed_software": [
        {"name": "Google Chrome", "version": "120.0.6099.109"},
        {"name": "Microsoft Office", "version": "16.0.17126.20132"}
      ],
      "windows_updates": [
        {"kb": "KB5034763", "installed": "2026-01-15"}
      ]
    }
  }
}
```

**Stockage** : Upsert `devices.metadata` (JSONB)

---

## 5. Policy Management

### 5.1 Policy pull

Agent pull les policies depuis Control Plane toutes les **1 heure** (ou à la demande).

**Requête** :
```http
GET /api/v1/agents/{device_id}/policies HTTP/1.1
Authorization: Bearer {device_secret}
```

**Response** :
```json
{
  "policies": {
    "auto_update": {
      "enabled": true,
      "channel": "stable",
      "version": "1.1.0",
      "download_url": "https://cdn.myremote.example.com/agent/1.1.0/myremote-agent-windows-x64.msi",
      "signature": "sha256:def456...",
      "force_update": false
    },
    "session_timeout": {
      "idle_timeout_minutes": 30,
      "max_duration_hours": 8
    },
    "allowed_session_types": ["desktop", "terminal"],
    "require_justification": true
  }
}
```

### 5.2 Policy enforcement

Agent applique les policies localement :

| Policy | Enforcement |
|--------|-------------|
| `auto_update.enabled` | Si true, agent check version et télécharge si nécessaire |
| `session_timeout.idle_timeout_minutes` | Ferme session si inactivité > 30min |
| `allowed_session_types` | Refuse sessions si type non autorisé |
| `require_justification` | Force justification pour toute session unattended |

---

## 6. Auto-update

### 6.1 Processus auto-update

```
1. Agent pull policies (toutes les heures)
   → GET /api/v1/agents/{device_id}/policies

2. Si nouvelle version disponible (policy.auto_update.version > agent_version)
   → Agent log : "New version available: 1.1.0"

3. Agent télécharge nouveau binaire (URL signée)
   → download_url : https://cdn.myremote.example.com/agent/1.1.0/myremote-agent-windows-x64.msi

4. Agent vérifie signature (Authenticode, GPG, Notarization)
   → compare policy.auto_update.signature avec hash téléchargé
   → Si mismatch → ABORT + alerte (tentative tampering)

5. Si force_update=false
   → Agent attend aucune session active (attente max 8h)
   → Si force_update=true → update immédiat (redémarrage sessions)

6. Agent lance update
   → Windows : msiexec /i new-agent.msi /qn /norestart
   → Linux : dpkg -i new-agent.deb
   → macOS : installer -pkg new-agent.pkg -target /

7. Agent redémarre service
   → systemctl restart myremote-agent
   → launchctl unload + load

8. Nouveau agent démarre, vérifie version
   → Envoie event : agent:updated
   → Payload : {old_version: "1.0.0", new_version: "1.1.0"}

9. Control Plane met à jour devices.agent_version
```

### 6.2 Rollback policy

Si l'update échoue (ex: nouveau binaire crash au démarrage) :

```
1. Agent détecte crash loop (3x redémarrages en 5min)
2. Agent rollback automatique vers version précédente
   → Restaure backup binaire (agent stocke last working version)
3. Agent envoie event : agent:update_failed
   → Payload : {version: "1.1.0", error: "crash_loop", rollback_version: "1.0.0"}
4. Admin reçoit alerte, investigate
```

---

## 7. Sécurité agent

### 7.1 Threat model agent

| Menace | Mitigation |
|--------|-----------|
| **Tampering binaire** | Signature Authenticode/GPG vérifiée à l'installation |
| **Man-in-the-Middle** | TLS 1.3 (pinning cert optionnel), mTLS (future) |
| **Exfiltration device_secret** | SQLite chiffré (SQLCipher), permissions restrictives |
| **Elevation of privilege** | Agent tourne en user context, pas root sauf install |
| **Reverse engineering** | Obfuscation légère (Rust release mode), pas de secret hardcodé |
| **Rogue agent** | Enrollment token usage unique, expiration 24h |

### 7.2 Permissions OS

#### Windows
```
Service : MyRemoteAgent
Account : LocalSystem (nécessaire pour desktop capture, mais LIMITED)
ACL : C:\Program Files\MyRemote\
  - SYSTEM : Full Control
  - Administrators : Full Control
  - Users : Read & Execute
```

#### Linux
```
Service : myremote-agent.service
User : myremote (non-root)
Capabilities : CAP_NET_BIND_SERVICE (si nécessaire port < 1024)
```

#### macOS
```
LaunchDaemon : com.myremote.agent
User : root (nécessaire pour screen capture, mais sandboxed)
Entitlements :
  - com.apple.security.device.camera (si screen share)
  - com.apple.security.network.client
```

### 7.3 Audit local

Agent logue toutes actions localement (logs + SQLite) :

```
2026-01-22 10:30:00 INFO  Agent started (version 1.0.0)
2026-01-22 10:30:01 INFO  Enrolled successfully (device_id: dev_abc123)
2026-01-22 10:30:02 INFO  WebSocket connected
2026-01-22 10:35:00 INFO  Session requested (session_id: sess_xyz789, type: desktop, requester: julie@example.com)
2026-01-22 10:35:05 INFO  User consent given (session_id: sess_xyz789)
2026-01-22 10:35:10 INFO  WebRTC connection established (session_id: sess_xyz789, ice_type: relay)
2026-01-22 10:45:00 INFO  Session terminated (session_id: sess_xyz789, duration: 600s)
```

**Rétention logs** : 30 jours localement (rotation), envoi à Control Plane (audit_logs table)

### 7.4 Uninstall propre

**Windows** :
```cmd
msiexec /x {PRODUCT_GUID} /qn
```
→ Supprime service, binaire, config (garde logs si admin veut)

**Linux** :
```bash
sudo apt remove --purge myremote-agent
```
→ Supprime binaire, service, config, logs

**macOS** :
```bash
sudo /Library/MyRemote/uninstall.sh
```
→ Supprime LaunchDaemon, binaire, preferences

**Important** : Uninstall envoie event `agent:uninstalled` → Control Plane marque device `status=revoked`

---

## 8. Troubleshooting

### 8.1 Problèmes courants

| Problème | Cause | Solution |
|----------|-------|----------|
| Agent offline après install | Token expiré | Regénérer token, réinstaller |
| Enrollment échoue 401 | Token invalide/déjà utilisé | Vérifier token, régénérer |
| WebSocket déconnecte | Firewall bloque port 443 | Whitelist `api.myremote.example.com` |
| Update échoue | Signature invalide | Vérifier CDN, attendre nouveau rollout |
| Session desktop lag | Bande passante faible, TURN relay | Vérifier réseau, QoS |

### 8.2 Logs debug

```bash
# Linux
sudo journalctl -u myremote-agent -f --since "1 hour ago"

# Windows
Get-EventLog -LogName Application -Source MyRemoteAgent -Newest 50

# macOS
tail -f /var/log/myremote-agent.log
```

---

## Annexes

### A. Configuration agent (exemple TOML)

```toml
# /etc/myremote/config.toml (Linux)

[server]
url = "https://api.myremote.example.com"
websocket_reconnect_delay_seconds = 5
heartbeat_interval_seconds = 30

[enrollment]
token = "myr_8f3k2l9dj3k2l9dj3k2l9dj3k2l9dj"  # Supprimé après enrollment réussi

[local]
database_path = "/var/lib/myremote/agent.db"
log_path = "/var/log/myremote/agent.log"
log_level = "info"  # debug, info, warn, error

[security]
tls_verify = true
cert_pinning = false  # Future : pin Control Plane cert

[features]
desktop_capture = true
terminal_access = true
file_transfer = true
```

### B. Agent CLI (debug)

```bash
# Vérifier status
myremote-agent status
# Output: Status: online, Device ID: dev_abc123, Uptime: 2d 5h 32m

# Forcer heartbeat
myremote-agent heartbeat --force

# Forcer inventory update
myremote-agent inventory --send

# Test connexion
myremote-agent test-connection --server https://api.myremote.example.com
# Output: ✓ TLS OK, ✓ Auth OK, ✓ WebSocket OK

# Re-enroll (si credentials perdues)
sudo myremote-agent enroll --token myr_new_token --force
```

---

**Document maintenu par** : Tech Lead Agent + DevOps
**Dernière révision** : 2026-01-22
**Code agent** : `packages/agent/` (Rust)
