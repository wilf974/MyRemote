# MyRemote - Product Requirements Document (PRD)

**Version**: 1.0
**Date**: 2026-01-22
**Status**: Draft
**Owner**: Tech Lead

---

## Executive Summary

MyRemote est une plateforme de support et d'administration à distance **légitime** pour IT interne d'entreprise. Elle permet la gestion de parc, la prise en main à distance (desktop/terminal/fichiers), et le suivi d'audit complet, avec consentement explicite ou mode unattended sécurisé.

**Principe fondamental** : Zéro fonctionnalité furtive, tout est audité, signé, et transparent.

---

## 1. Vision & Objectifs

### Vision
Fournir aux équipes IT une solution **auto-hébergée, sécurisée et transparente** pour :
- Gérer un inventaire de postes multi-OS
- Effectuer du support à distance (desktop, terminal, fichiers)
- Tracer toutes les actions (compliance, audit)

### Objectifs business
- **Autonomie** : réduire la dépendance aux solutions SaaS tierces (TeamViewer, AnyDesk)
- **Conformité RGPD** : données hébergées en EU (France)
- **Coût** : self-host sur VPS, scalabilité horizontale
- **Sécurité** : zéro trust, RBAC, 2FA, chiffrement end-to-end

### KPIs MVP
- Temps moyen de connexion à un poste : < 10s
- Disponibilité : 99.5% (SLA interne)
- Nombre de postes gérés : MVP 50-200, V1 illimité
- Nombre de techniciens simultanés : MVP 5-10, V1 illimité

---

## 2. Personas

### Persona 1 : **Admin IT (Marc)**
- **Rôle** : Administrateur système senior
- **Besoins** :
  - Vue globale du parc (inventaire, status)
  - Configuration des rôles et permissions
  - Consultation des logs d'audit
  - Gestion des tokens d'enrollment
- **Pain points** :
  - Solutions actuelles (AnyDesk, VNC) non auditables
  - Manque de visibilité sur qui accède à quoi
  - Pas de gestion centralisée des accès

### Persona 2 : **Technicien Support (Julie)**
- **Rôle** : Support L1/L2
- **Besoins** :
  - Accès rapide aux postes autorisés
  - Remote desktop + terminal + transfert de fichiers
  - Carnet d'adresses (groupes de postes, contacts)
  - Historique des sessions (pour suivi ticket)
- **Pain points** :
  - Multiplier les outils (VNC, SSH, SCP)
  - Pas de traçabilité des actions
  - Difficultés avec postes derrière NAT

### Persona 3 : **Utilisateur Final (Sophie)**
- **Rôle** : Employée bureau (non-IT)
- **Besoins** :
  - Recevoir du support sans friction
  - **Consentement explicite** avant toute session attended
  - Visibilité sur qui est connecté
- **Pain points** :
  - Peur de la surveillance non autorisée
  - Ne sait pas qui a accès à son poste

### Persona 4 : **RSSI (Thomas)**
- **Rôle** : Responsable Sécurité des SI
- **Besoins** :
  - Audit complet (qui, quoi, quand, depuis où)
  - Politiques de sécurité (2FA obligatoire, rotation tokens)
  - Preuve de consentement pour sessions attended
- **Pain points** :
  - Outils actuels = boîtes noires
  - Pas de logs exploitables pour incidents

---

## 3. User Stories (MVP)

### Epic 1 : Gestion du parc
- **US-001** : En tant qu'Admin, je veux voir la liste de tous les postes avec leur statut (online/offline/dernière connexion)
- **US-002** : En tant qu'Admin, je veux filtrer les postes par OS, groupe, tag
- **US-003** : En tant qu'Admin, je veux créer des groupes de postes (Production, Dev, Bureautique)
- **US-004** : En tant qu'Admin, je veux générer un token d'enrollment à usage unique (expiration configurable)
- **US-005** : En tant qu'Admin, je veux révoquer un poste (désactivation de l'agent)

### Epic 2 : Enrollment de postes
- **US-010** : En tant qu'Admin, je génère un token d'enrollment (validité 24h, usage unique)
- **US-011** : En tant qu'Installateur, je télécharge l'agent signé depuis l'interface web
- **US-012** : En tant qu'Installateur, je lance l'agent avec le token → le poste apparaît dans le parc
- **US-013** : L'agent envoie un heartbeat toutes les 30s + inventaire de base (hostname, OS, IP, CPU, RAM)

### Epic 3 : Authentification & RBAC
- **US-020** : En tant qu'Admin, je configure Keycloak (OIDC) comme provider d'identité
- **US-021** : En tant qu'Utilisateur IT, je me connecte avec email + 2FA TOTP
- **US-022** : En tant qu'Admin, je définis des rôles : Admin, Operator, Viewer
- **US-023** : En tant qu'Admin, j'assigne des permissions granulaires (view, control, files, terminal, audit)

### Epic 4 : Carnet d'adresses
- **US-030** : En tant que Technicien, je veux créer des contacts (nom, email, téléphone, notes)
- **US-031** : En tant que Technicien, je veux associer des contacts à des postes (ex: "Sophie → PC-Bureau-001")
- **US-032** : En tant que Technicien, je veux chercher un poste par nom de contact
- **US-033** : En tant que Technicien, je veux des favoris (postes accédés fréquemment)

### Epic 5 : Session Remote Desktop
- **US-040** : En tant que Technicien, je clique sur "Connecter" sur un poste (mode attended)
- **US-041** : L'utilisateur final reçoit une notification : "Julie demande à accéder à votre poste [Accepter] [Refuser]"
- **US-042** : Si accepté → session WebRTC s'ouvre dans le navigateur, streaming du desktop
- **US-043** : En tant que Technicien, je contrôle le pointeur/clavier à distance
- **US-044** : En tant que Technicien, je vois un indicateur "session active" avec durée
- **US-045** : En tant qu'Utilisateur, je peux déconnecter la session à tout moment (bouton "Terminer la session")

### Epic 6 : Session Unattended (mot de passe admin)
- **US-050** : En tant qu'Admin, je configure un "mot de passe unattended" par poste ou groupe
- **US-051** : En tant que Technicien, je clique sur "Connecter (unattended)" → je saisis le mot de passe
- **US-052** : Si correct → session ouverte sans consentement utilisateur (ex: serveur, kiosque)
- **US-053** : La session est loguée avec justification obligatoire (champ "Raison de connexion")

### Epic 7 : Terminal à distance
- **US-060** : En tant que Technicien, j'ouvre un terminal shell sur un poste (bash/cmd/powershell selon OS)
- **US-061** : En tant que Technicien, j'exécute des commandes, je vois l'output en temps réel
- **US-062** : Toutes les commandes sont loguées (audit)

### Epic 8 : Transfert de fichiers
- **US-070** : En tant que Technicien, j'ouvre un explorateur de fichiers distant
- **US-071** : En tant que Technicien, je télécharge un fichier du poste distant → mon navigateur
- **US-072** : En tant que Technicien, j'upload un fichier de mon navigateur → poste distant
- **US-073** : Toutes les opérations fichiers sont loguées (path, size, hash SHA256)

### Epic 9 : Audit & Compliance
- **US-080** : En tant qu'Admin, je consulte tous les logs d'audit (connexions, actions, échecs)
- **US-081** : En tant qu'Admin, je filtre les logs par utilisateur, poste, date, type d'action
- **US-082** : En tant qu'Admin, j'exporte les logs en JSON/CSV (rétention 90 jours)
- **US-083** : En tant que RSSI, je reçois une alerte si tentative d'accès refusée (3x)

### Epic 10 : Auto-update agent
- **US-090** : En tant qu'Admin, je publie une nouvelle version de l'agent (binaire signé)
- **US-091** : Les agents pull la config toutes les heures, détectent la nouvelle version
- **US-092** : L'agent vérifie la signature, télécharge, s'auto-update (redémarrage service)

---

## 4. Parcours utilisateurs (User Journeys)

### Journey 1 : Enrollment d'un nouveau poste

```
[Admin Marc] → Génère token enrollment (24h, usage unique)
              ↓
[Admin Marc] → Télécharge installateur agent (myremote-agent-windows-x64-signed.msi)
              ↓
[Admin Marc] → Installe agent sur PC-Bureau-001 avec token
              ↓
[Agent]      → Vérifie token auprès de Control Plane API
              ↓
[Agent]      → Enregistre poste (hostname, OS, metadata)
              ↓
[Agent]      → Démarre heartbeat (30s) + inventaire initial
              ↓
[Admin Marc] → Voit PC-Bureau-001 apparaître dans le parc (status: online)
```

### Journey 2 : Session attended (support utilisateur)

```
[Utilisateur Sophie] → Appelle le support (ticket #1234)
                      ↓
[Technicien Julie]   → Recherche "Sophie" dans carnet d'adresses
                      ↓
[Technicien Julie]   → Clique sur PC-Bureau-001 → "Connecter (attended)"
                      ↓
[Agent PC-Bureau-001]→ Affiche notification Windows : "Julie demande accès [Accepter/Refuser]"
                      ↓
[Sophie]             → Clique "Accepter"
                      ↓
[Control Plane]      → Logue consentement + crée session_id
                      ↓
[Data Plane]         → Établit WebRTC P2P (ou via TURN si NAT strict)
                      ↓
[Technicien Julie]   → Voit le desktop de Sophie, contrôle pointeur/clavier
                      ↓
[Technicien Julie]   → Résout le problème, clique "Terminer session"
                      ↓
[Control Plane]      → Logue fin de session (durée: 8min 34s)
```

### Journey 3 : Session unattended (serveur maintenance)

```
[Technicien Julie]   → Clique sur SRV-PROD-01 → "Connecter (unattended)"
                      ↓
[UI]                 → Demande mot de passe unattended + justification
                      ↓
[Technicien Julie]   → Saisit mot de passe + raison: "Mise à jour patches sécurité"
                      ↓
[Control Plane]      → Vérifie mot de passe (hash bcrypt)
                      ↓
[Control Plane]      → Logue connexion + justification
                      ↓
[Data Plane]         → Ouvre session sans consentement utilisateur
                      ↓
[Technicien Julie]   → Effectue maintenance, déconnecte
```

### Journey 4 : Audit après incident

```
[RSSI Thomas]        → Reçoit alerte : "3 tentatives connexion échouées SRV-DB-01"
                      ↓
[RSSI Thomas]        → Ouvre interface Audit
                      ↓
[RSSI Thomas]        → Filtre : device=SRV-DB-01, date=dernières 24h
                      ↓
[UI]                 → Affiche logs :
                       - 10:23 user=julie action=connect_attempt status=failed (mauvais mdp)
                       - 10:24 user=julie action=connect_attempt status=failed
                       - 10:25 user=julie action=connect_attempt status=failed
                       - 10:26 user=julie action=locked (account locked 15min)
                      ↓
[RSSI Thomas]        → Contacte Julie, vérifie légitimité
                      ↓
[RSSI Thomas]        → Exporte logs en JSON pour SOC
```

---

## 5. Exigences Non-Fonctionnelles

### 5.1 Performance
- **Latence connexion** : < 5s (établissement session WebRTC)
- **Latency streaming** : < 200ms (desktop, acceptable pour support)
- **Throughput fichiers** : min 10 MB/s (transfert fichiers)
- **Concurrent sessions** : 100+ sessions simultanées (scalabilité horizontale)

### 5.2 Sécurité (CRITICAL)
- **Authentification** : OIDC (Keycloak) + 2FA TOTP obligatoire
- **Authorization** : RBAC granulaire (view/control/files/terminal/audit)
- **Chiffrement transit** : TLS 1.3 (control plane), DTLS (WebRTC data plane)
- **Chiffrement au repos** : PostgreSQL (transparent data encryption), secrets dans Vault
- **Signature binaires** : Agents signés avec Cosign (vérification à l'installation)
- **Rotation tokens** : JWT access token (15min), refresh token (7j, rotation)
- **Rate limiting** : 100 req/min/user (API), 5 tentatives login/15min
- **Audit logs** : immuables (append-only), rétention 90j, exportables

### 5.3 Disponibilité
- **SLA** : 99.5% (MVP), 99.9% (V1)
- **RTO** : < 15min (restore control plane)
- **RPO** : < 1h (backup database)
- **Health checks** : liveness + readiness probes (K8s)

### 5.4 Scalabilité
- **Horizontale** : Control plane (NestJS) stateless → N replicas
- **Verticale** : PostgreSQL (read replicas), Redis Cluster
- **Data plane** : TURN relay servers (multi-région possible)

### 5.5 Compliance
- **RGPD** : données hébergées EU (France), pas de transfert hors EU
- **Consentement** : opt-in explicite (mode attended), logs de consentement
- **Droit à l'oubli** : suppression device = suppression logs associés (90j après)
- **Transparence** : UI utilisateur final (qui est connecté, historique accès)

### 5.6 Observabilité
- **Logs structurés** : JSON (Loki)
- **Métriques** : Prometheus (API latency, session count, agent health)
- **Tracing** : OpenTelemetry (optionnel V1)
- **Dashboards** : Grafana (overview, alerts)

### 5.7 Compatibilité OS
- **Windows** : 10, 11 (x64, ARM64)
- **macOS** : 13+ (Intel, Apple Silicon)
- **Linux** : Ubuntu 20.04+, Debian 11+, RHEL 8+ (x64, ARM64)

### 5.8 Réseau
- **NAT traversal** : STUN (prioritaire), TURN relay (fallback)
- **Firewall** : agent initie connexions sortantes (WebSocket/443)
- **Offline resilience** : agent stocke état local, re-sync au retour online

---

## 6. Contraintes Techniques

### 6.1 Contraintes d'infrastructure
- **Hébergement** : VPS France (OVH, Scaleway, Hetzner)
- **Conteneurisation** : Docker Compose (MVP), Kubernetes (V1)
- **CI/CD** : GitHub Actions ou GitLab CI
- **Backup** : PostgreSQL daily dump → S3-compatible (Scaleway Object Storage)

### 6.2 Contraintes de développement
- **Langages** : TypeScript (backend/frontend), Rust (agent)
- **Testing** : coverage > 70% (unit), E2E (Playwright)
- **Documentation** : OpenAPI (API), Rust doc (agent), Storybook (UI)

### 6.3 Contraintes de sécurité (ABSOLUES)
- ❌ **Interdictions strictes** :
  - Pas de keylogger, pas de screenshot silencieux
  - Pas de collecte de mots de passe/credentials
  - Pas de désactivation antivirus/firewall
  - Pas de persistance furtive (rootkit, etc.)
  - Pas de bypass UAC/sudo
- ✅ **Obligations** :
  - Tout binaire signé (Cosign)
  - Tout accès tracé (audit log)
  - Consentement explicite (attended) ou justification (unattended)

---

## 7. Out of Scope (MVP)

Les fonctionnalités suivantes sont **exclues du MVP** (possibles en V1+) :
- ❌ Mobile app (iOS/Android) → V1
- ❌ Chat intégré (technicien ↔ utilisateur) → V1
- ❌ Enregistrement de sessions vidéo → V1
- ❌ Wake-on-LAN → V1
- ❌ Gestion de mots de passe (password manager) → hors scope
- ❌ Ticketing system intégré → intégration externe (Jira, etc.)
- ❌ Multi-tenant (plusieurs organisations isolées) → V1 (pour l'instant IT interne unique)

---

## 8. Success Criteria (MVP)

Le MVP est considéré réussi si :
- ✅ 50 postes enrollés (mix Windows/macOS/Linux)
- ✅ 5 techniciens utilisent quotidiennement (sessions desktop + terminal)
- ✅ 100% des sessions sont loguées et auditables
- ✅ Temps moyen de connexion < 10s (95th percentile)
- ✅ Aucun incident de sécurité (accès non autorisé)
- ✅ Taux d'adoption : 80% des techniciens préfèrent MyRemote vs outils legacy

---

## 9. Roadmap

### Phase 1 : MVP (8-12 semaines)
- Enrollment postes (token-based)
- Remote desktop (WebRTC) + consentement attended
- Terminal à distance (WebSocket)
- RBAC basique (Admin, Operator, Viewer)
- Audit logs (immutable)
- Docker Compose self-host

### Phase 2 : V1 (6 mois)
- Transfert fichiers (upload/download)
- Carnet d'adresses (contacts, groupes)
- Mode unattended (mot de passe admin)
- Auto-update agent (signé)
- Multi-tenant (isolation organisations)
- Kubernetes deployment

### Phase 3 : V2 (12 mois)
- Mobile app (iOS/Android)
- Chat intégré
- Enregistrement sessions (compliance)
- Wake-on-LAN
- Intégrations (Jira, Slack, PagerDuty)
- HA + multi-région

---

## 10. Risques & Mitigation

| Risque | Impact | Probabilité | Mitigation |
|--------|--------|-------------|------------|
| NAT traversal échoue (strict firewall) | Haut | Moyen | TURN relay obligatoire, tests réseau variés |
| Performance WebRTC (latence > 500ms) | Moyen | Faible | Optimisation codec VP9, fallback H.264 |
| Agent détecté comme malware (antivirus) | Haut | Moyen | Signature Cosign, whitelist auprès vendors, doc claire |
| Fuite de données (logs non chiffrés) | Critique | Faible | Chiffrement PostgreSQL, accès restreint, audit |
| Scalabilité (> 1000 postes) | Moyen | Moyen | Architecture stateless, tests de charge, K8s ready |
| Adoption faible (techniciens résistent) | Moyen | Faible | Formation, UX simple, migration progressive |

---

## Annexes

### A. Glossaire
- **Attended session** : session nécessitant consentement explicite de l'utilisateur
- **Unattended session** : session sans consentement (serveur, kiosque), avec mot de passe admin
- **Control Plane** : composants API, auth, database (gestion, orchestration)
- **Data Plane** : flux de données remote (WebRTC, WebSocket terminal/files)
- **Enrollment** : processus d'ajout d'un poste au parc (via token)
- **Heartbeat** : signal périodique de l'agent (preuve de vie)

### B. Références
- OWASP Top 10 : https://owasp.org/www-project-top-ten/
- WebRTC Security : https://webrtc-security.github.io/
- RGPD : https://www.cnil.fr/fr/reglement-europeen-protection-donnees

---

**Document approuvé par** : Tech Lead
**Prochaine étape** : Architecture détaillée (C4, diagrammes)
