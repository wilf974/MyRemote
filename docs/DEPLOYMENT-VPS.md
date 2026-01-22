# MyRemote - Guide de Déploiement VPS Production

**Version**: 1.0
**Date**: 2026-01-22
**Temps estimé**: 60-90 minutes (première installation)

---

## 📋 Table des Matières

1. [Prérequis](#prérequis)
2. [Configuration DNS](#configuration-dns)
3. [Préparation du VPS](#préparation-du-vps)
4. [Déploiement Automatique](#déploiement-automatique)
5. [Configuration Post-Installation](#configuration-post-installation)
6. [Vérification](#vérification)
7. [Backup et Restauration](#backup-et-restauration)
8. [Mise à Jour](#mise-à-jour)
9. [Monitoring et Alertes](#monitoring-et-alertes)
10. [Troubleshooting](#troubleshooting)
11. [Sécurité](#sécurité)

---

## Prérequis

### VPS Minimum Requis

| Ressource | Minimum | Recommandé |
|-----------|---------|------------|
| **CPU** | 2 cores | 4 cores |
| **RAM** | 4 GB | 8 GB |
| **Disque** | 40 GB SSD | 100 GB SSD |
| **Bande passante** | 100 Mbps | 1 Gbps |
| **OS** | Ubuntu 22.04 LTS | Ubuntu 22.04 LTS |

### Accès Requis

- ✅ Accès SSH root ou sudo
- ✅ Adresse IP publique fixe
- ✅ Possibilité de configurer DNS
- ✅ Ports ouverts : 22 (SSH), 80 (HTTP), 443 (HTTPS), 3478/5349 (TURN), 49152-65535 (TURN relay)

### Domaine et DNS

- ✅ Nom de domaine disponible (ex: `myremote.woutils.com`)
- ✅ Accès à la configuration DNS (CloudFlare, OVH, etc.)

---

## Configuration DNS

Avant de commencer, configurez les enregistrements DNS suivants :

### Enregistrements A Requis

| Sous-domaine | Type | Valeur | TTL |
|--------------|------|--------|-----|
| `myremote.woutils.com` | A | `YOUR_VPS_IP` | 300 |
| `api.myremote.woutils.com` | A | `YOUR_VPS_IP` | 300 |
| `auth.myremote.woutils.com` | A | `YOUR_VPS_IP` | 300 |
| `monitoring.myremote.woutils.com` | A | `YOUR_VPS_IP` | 300 |

**Exemple (CloudFlare)** :
```
Type  Name        Content          TTL   Proxy
A     myremote    123.45.67.89     Auto  ⚠️ DNS Only (pas de proxy)
A     api         123.45.67.89     Auto  ⚠️ DNS Only
A     auth        123.45.67.89     Auto  ⚠️ DNS Only
A     monitoring  123.45.67.89     Auto  ⚠️ DNS Only
```

**IMPORTANT** : Désactiver le proxy CloudFlare (orange → gris) pour permettre à Let's Encrypt de valider le domaine.

### Vérification DNS

Attendez la propagation DNS (5-30 minutes), puis vérifiez :

```bash
# Depuis votre machine locale
dig myremote.woutils.com +short
dig api.myremote.woutils.com +short
dig auth.myremote.woutils.com +short
dig monitoring.myremote.woutils.com +short

# Tous doivent retourner : 123.45.67.89 (votre IP VPS)
```

---

## Préparation du VPS

### 1. Connexion SSH

```bash
ssh root@YOUR_VPS_IP
```

### 2. Mise à Jour Système

```bash
apt-get update
apt-get upgrade -y
apt-get autoremove -y
```

### 3. Configuration Firewall (Manuelle - si vous préférez)

Si vous voulez configurer le firewall manuellement avant le script :

```bash
# Installer UFW
apt-get install -y ufw

# Autoriser SSH (IMPORTANT - ne pas se bloquer !)
ufw allow OpenSSH

# Autoriser HTTP/HTTPS
ufw allow 'Nginx Full'

# Autoriser TURN
ufw allow 3478/tcp
ufw allow 3478/udp
ufw allow 5349/tcp
ufw allow 49152:65535/udp

# Activer firewall
ufw enable
ufw status
```

### 4. Créer Utilisateur Non-Root (Optionnel mais recommandé)

```bash
# Créer utilisateur
adduser deployer

# Ajouter aux sudoers
usermod -aG sudo deployer

# Copier clés SSH
rsync --archive --chown=deployer:deployer ~/.ssh /home/deployer

# Tester connexion
# (depuis votre machine)
ssh deployer@YOUR_VPS_IP
```

---

## Déploiement Automatique

### Option A : Script Automatique (Recommandé)

Le script `scripts/deploy-vps.sh` automatise tout le processus.

```bash
# Connexion au VPS
ssh root@YOUR_VPS_IP
# OU
ssh deployer@YOUR_VPS_IP

# Télécharger le script
curl -o deploy-vps.sh https://raw.githubusercontent.com/wilf974/MyRemote/claude/remote-support-app-design-arFMJ/scripts/deploy-vps.sh

# Rendre exécutable
chmod +x deploy-vps.sh

# Lancer le script
sudo ./deploy-vps.sh
```

**Le script va :**
1. ✅ Mettre à jour le système
2. ✅ Installer Docker, Docker Compose, Nginx, Certbot
3. ✅ Configurer le firewall (préserve les règles existantes)
4. ✅ Créer `/opt/apps/MyRemote`
5. ✅ Cloner le repository
6. ✅ Vous demander de configurer `.env.prod` (éditeur nano)
7. ✅ Obtenir les certificats SSL (Let's Encrypt)
8. ✅ Configurer Nginx (sans casser les sites existants)
9. ✅ Démarrer Docker Compose
10. ✅ Lancer les migrations database

**Temps estimé** : 10-15 minutes

### Option B : Déploiement Manuel

Si vous préférez le contrôle manuel :

#### 1. Installer Docker et Docker Compose

```bash
# Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Docker Compose
sudo apt-get install -y docker compose-plugin

# Vérifier
docker --version
docker compose version
```

#### 2. Installer Nginx et Certbot

```bash
sudo apt-get install -y nginx certbot python3-certbot-nginx
```

#### 3. Créer le Répertoire et Cloner le Repository

```bash
sudo mkdir -p /opt/apps/MyRemote
cd /opt/apps/MyRemote

sudo git clone https://github.com/wilf974/MyRemote.git .
sudo git checkout claude/remote-support-app-design-arFMJ
```

#### 4. Configurer les Variables d'Environnement

```bash
# Copier le template
sudo cp .env.prod.example .env.prod

# Éditer avec vos valeurs
sudo nano .env.prod
```

**Variables OBLIGATOIRES à modifier** :

```bash
DOMAIN=myremote.woutils.com

# PostgreSQL (générer mot de passe fort)
POSTGRES_PASSWORD=CHANGE_ME_STRONG_PASSWORD_HERE

# Redis
REDIS_PASSWORD=CHANGE_ME_STRONG_PASSWORD_HERE

# Keycloak
KEYCLOAK_ADMIN_PASSWORD=CHANGE_ME_STRONG_PASSWORD_HERE
KEYCLOAK_CLIENT_SECRET=CHANGE_ME_GENERATE_WITH_KEYCLOAK

# JWT Secrets (générer avec openssl)
JWT_SECRET=$(openssl rand -base64 64)
TURN_SECRET=$(openssl rand -base64 32)

# Grafana
GRAFANA_ADMIN_PASSWORD=CHANGE_ME_STRONG_PASSWORD_HERE

# Email (optionnel - pour alertes)
SMTP_HOST=smtp.example.com
SMTP_USER=alerts@myremote.woutils.com
SMTP_PASSWORD=CHANGE_ME
```

**Générer des secrets forts** :
```bash
# JWT Secret (64 chars)
openssl rand -base64 64

# TURN Secret (32 chars)
openssl rand -base64 32

# Ou password aléatoire
openssl rand -base64 32 | tr -d "=+/" | cut -c1-25
```

#### 5. Obtenir les Certificats SSL

```bash
# Arrêter nginx temporairement
sudo systemctl stop nginx

# Obtenir certificats (mode standalone)
sudo certbot certonly --standalone \
  --agree-tos \
  --no-eff-email \
  --email admin@woutils.com \
  -d myremote.woutils.com \
  -d api.myremote.woutils.com \
  -d auth.myremote.woutils.com \
  -d monitoring.myremote.woutils.com

# Vérifier
sudo ls -la /etc/letsencrypt/live/myremote.woutils.com/
```

**Si erreur DNS** : Vérifiez que vos enregistrements A pointent bien vers votre VPS.

#### 6. Configurer Nginx

```bash
# Copier la configuration
sudo cp infra/nginx/myremote.conf /etc/nginx/sites-available/myremote.conf

# Activer le site
sudo ln -s /etc/nginx/sites-available/myremote.conf /etc/nginx/sites-enabled/myremote.conf

# Tester la configuration
sudo nginx -t

# Recharger nginx
sudo systemctl start nginx
sudo systemctl reload nginx
sudo systemctl enable nginx
```

#### 7. Démarrer Docker Compose

```bash
cd /opt/apps/MyRemote

# Pull images
sudo docker compose -f docker compose.prod.yml pull

# Démarrer les services
sudo docker compose -f docker compose.prod.yml up -d

# Vérifier que tout est UP
sudo docker compose -f docker compose.prod.yml ps
```

#### 8. Lancer les Migrations Database

```bash
# Attendre 30s que PostgreSQL initialise
sleep 30

# Lancer migrations
sudo docker compose -f docker compose.prod.yml exec api pnpm db:migrate

# Vérifier les tables
sudo docker compose -f docker compose.prod.yml exec postgres psql -U myremote -d myremote -c "\dt"
```

---

## Configuration Post-Installation

### 1. Configuration Keycloak

#### Accéder à Keycloak

https://auth.myremote.woutils.com

Login : `admin` / `[KEYCLOAK_ADMIN_PASSWORD from .env.prod]`

#### Créer le Realm

1. Menu dropdown (Master) → **Add realm**
2. Name : `myremote`
3. Enabled : **ON**
4. Click **Create**

#### Créer le Client API

1. Realm : `myremote`
2. **Clients** → **Create client**
3. Client ID : `myremote-api`
4. Client Protocol : `openid-connect`
5. **Next**
6. Client authentication : **ON**
7. Authorization : **OFF**
8. Standard flow : **ON**
9. Direct access grants : **ON**
10. **Save**
11. **Credentials** tab → copier **Client secret**
12. Mettre à jour `.env.prod` :
    ```bash
    KEYCLOAK_CLIENT_SECRET=[client-secret-copié]
    ```
13. Redémarrer l'API :
    ```bash
    sudo docker compose -f docker compose.prod.yml restart api
    ```

#### Créer le Client Web

Répéter la même procédure pour `myremote-web` (pour le frontend).

#### Configurer les Redirects URIs

Client `myremote-web` :
- Valid redirect URIs :
  - `https://myremote.woutils.com/*`
  - `https://myremote.woutils.com/auth/callback`
- Valid post logout redirect URIs :
  - `https://myremote.woutils.com`
- Web origins :
  - `https://myremote.woutils.com`

#### Créer un Utilisateur Admin

1. **Users** → **Add user**
2. Username : `admin@myremote.woutils.com`
3. Email : `admin@myremote.woutils.com`
4. First name : `Admin`
5. Last name : `MyRemote`
6. Email verified : **ON**
7. **Create**
8. **Credentials** tab → **Set password**
9. Password : `[votre-mot-de-passe-fort]`
10. Temporary : **OFF**
11. **Save**

#### Activer 2FA TOTP (Obligatoire)

1. Realm Settings → **Authentication** → **Required actions**
2. Activer : **Configure OTP**
3. Users → Select `admin@myremote.woutils.com` → **Required User Actions**
4. Add : **Configure OTP**

Au premier login, l'utilisateur devra scanner le QR code avec Google Authenticator.

### 2. Seed Données de Test (Optionnel)

```bash
cd /opt/apps/MyRemote

# Créer données de test (users, roles, devices exemple)
sudo docker compose -f docker compose.prod.yml exec api pnpm db:seed
```

---

## Vérification

### 1. Check Services Docker

```bash
cd /opt/apps/MyRemote
sudo docker compose -f docker compose.prod.yml ps

# Tous doivent être "Up (healthy)"
# NAME                      STATUS
# myremote-postgres-prod    Up (healthy)
# myremote-redis-prod       Up (healthy)
# myremote-keycloak-prod    Up
# myremote-api-prod         Up (healthy)
# myremote-web-prod         Up (healthy)
# myremote-turn-prod        Up
# myremote-prometheus-prod  Up
# myremote-grafana-prod     Up
```

### 2. Check Endpoints

```bash
# Health check API
curl https://api.myremote.woutils.com/api/v1/health

# Devrait retourner :
# {"status":"ok","timestamp":"2026-01-22T10:00:00Z"}

# Web UI
curl -I https://myremote.woutils.com

# Devrait retourner : HTTP/2 200

# Keycloak
curl -I https://auth.myremote.woutils.com

# Devrait retourner : HTTP/2 200

# Monitoring
curl -I https://monitoring.myremote.woutils.com

# Devrait retourner : HTTP/2 200 (avec redirect vers login)
```

### 3. Test SSL

```bash
# Vérifier certificats SSL
echo | openssl s_client -connect myremote.woutils.com:443 -servername myremote.woutils.com 2>/dev/null | openssl x509 -noout -dates

# Devrait afficher :
# notBefore=...
# notAfter=... (dans 90 jours)
```

### 4. Test Connexion Web

1. Ouvrir navigateur : https://myremote.woutils.com
2. Cliquer **Continue with Keycloak SSO**
3. Login avec `admin@myremote.woutils.com` / `[votre-mot-de-passe]`
4. Configurer 2FA (scanner QR code avec Google Authenticator)
5. Entrer code TOTP (6 digits)
6. Accéder au Dashboard

**✅ Si vous voyez le dashboard, le déploiement est réussi !**

---

## Backup et Restauration

### Stratégie de Backup

**Fréquence recommandée** :
- PostgreSQL : **quotidien** (backup complet)
- Volumes Docker : **hebdomadaire**
- Configuration (`.env.prod`, nginx) : **à chaque modification**

### Backup PostgreSQL

#### Manuel

```bash
cd /opt/apps/MyRemote

# Backup complet
sudo docker compose -f docker compose.prod.yml exec postgres pg_dump -U myremote myremote > backup-$(date +%Y%m%d-%H%M%S).sql

# Compresser
gzip backup-*.sql

# Copier vers stockage externe (S3, SFTP, etc.)
# Exemple avec rsync vers serveur backup
rsync -avz backup-*.sql.gz user@backup-server:/backups/myremote/
```

#### Automatique (Cron)

```bash
# Créer script de backup
sudo nano /opt/apps/MyRemote/scripts/backup-db.sh
```

Contenu :
```bash
#!/bin/bash
BACKUP_DIR="/opt/backups/myremote"
RETENTION_DAYS=30

mkdir -p $BACKUP_DIR
cd /opt/apps/MyRemote

# Backup PostgreSQL
docker compose -f docker compose.prod.yml exec -T postgres pg_dump -U myremote myremote | gzip > $BACKUP_DIR/backup-$(date +%Y%m%d-%H%M%S).sql.gz

# Nettoyer backups > 30 jours
find $BACKUP_DIR -name "backup-*.sql.gz" -mtime +$RETENTION_DAYS -delete

# (Optionnel) Upload vers S3
# aws s3 sync $BACKUP_DIR s3://myremote-backups/postgres/
```

```bash
# Rendre exécutable
sudo chmod +x /opt/apps/MyRemote/scripts/backup-db.sh

# Ajouter au cron (tous les jours à 2h du matin)
sudo crontab -e

# Ajouter :
0 2 * * * /opt/apps/MyRemote/scripts/backup-db.sh >> /var/log/myremote-backup.log 2>&1
```

### Restauration PostgreSQL

```bash
cd /opt/apps/MyRemote

# Arrêter l'API
sudo docker compose -f docker compose.prod.yml stop api

# Restaurer backup
gunzip < backup-YYYYMMDD-HHMMSS.sql.gz | sudo docker compose -f docker compose.prod.yml exec -T postgres psql -U myremote myremote

# Redémarrer l'API
sudo docker compose -f docker compose.prod.yml start api
```

### Backup Volumes Docker

```bash
# Lister volumes
sudo docker volume ls | grep myremote

# Backup volume PostgreSQL
sudo docker run --rm -v myremote_postgres_data:/data -v /opt/backups:/backup ubuntu tar czf /backup/postgres-data-$(date +%Y%m%d).tar.gz -C /data .

# Backup volume Redis
sudo docker run --rm -v myremote_redis_data:/data -v /opt/backups:/backup ubuntu tar czf /backup/redis-data-$(date +%Y%m%d).tar.gz -C /data .
```

---

## Mise à Jour

### Process de Mise à Jour

```bash
cd /opt/apps/MyRemote

# 1. Backup avant mise à jour (IMPORTANT)
sudo docker compose -f docker compose.prod.yml exec postgres pg_dump -U myremote myremote | gzip > backup-pre-update-$(date +%Y%m%d).sql.gz

# 2. Pull dernières modifications
sudo git fetch origin
sudo git pull origin claude/remote-support-app-design-arFMJ

# 3. Rebuild images
sudo docker compose -f docker compose.prod.yml build

# 4. Arrêter les services
sudo docker compose -f docker compose.prod.yml down

# 5. Pull nouvelles images (si utilisées depuis registry)
sudo docker compose -f docker compose.prod.yml pull

# 6. Redémarrer avec nouvelles images
sudo docker compose -f docker compose.prod.yml up -d

# 7. Lancer migrations database (si nécessaire)
sudo docker compose -f docker compose.prod.yml exec api pnpm db:migrate

# 8. Vérifier logs
sudo docker compose -f docker compose.prod.yml logs -f api
```

### Rollback en Cas de Problème

```bash
# 1. Arrêter les services
sudo docker compose -f docker compose.prod.yml down

# 2. Revenir au commit précédent
sudo git log --oneline -10  # Voir historique
sudo git checkout [commit-hash-précédent]

# 3. Rebuild
sudo docker compose -f docker compose.prod.yml build

# 4. Redémarrer
sudo docker compose -f docker compose.prod.yml up -d

# 5. Si problème database, restaurer backup
gunzip < backup-pre-update-YYYYMMDD.sql.gz | sudo docker compose -f docker compose.prod.yml exec -T postgres psql -U myremote myremote
```

---

## Monitoring et Alertes

### Accès Grafana

https://monitoring.myremote.woutils.com

Login : `admin` / `[GRAFANA_ADMIN_PASSWORD from .env.prod]`

### Dashboards Importés

1. **Node Exporter Full** (ID: 1860)
   - Métriques système (CPU, RAM, disque, réseau)

2. **PostgreSQL Database** (ID: 9628)
   - Métriques database (connexions, transactions, cache)

3. **Redis** (ID: 11835)
   - Métriques cache (hits/misses, memory)

4. **Docker Container** (ID: 193)
   - Métriques conteneurs

### Logs (Loki)

Grafana → **Explore** → Data source : **Loki**

Queries utiles :
```logql
# Logs API
{container_name="myremote-api-prod"}

# Logs erreurs seulement
{container_name="myremote-api-prod"} |= "ERROR"

# Logs sessions (connexions remote)
{container_name="myremote-api-prod"} |= "session"

# Logs audit
{container_name="myremote-api-prod"} |= "audit"
```

### Alertes Critiques (à configurer)

Exemples d'alertes à créer dans Prometheus :

1. **API Down** : `up{job="myremote-api"} == 0`
2. **Database Connexions Saturées** : `pg_stat_activity_count > 90`
3. **Disque Plein** : `node_filesystem_avail_bytes{mountpoint="/"} / node_filesystem_size_bytes{mountpoint="/"} < 0.1`
4. **RAM Saturée** : `node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes < 0.1`

---

## Troubleshooting

### Problème : Services Docker ne démarrent pas

```bash
# Check logs
sudo docker compose -f docker compose.prod.yml logs

# Vérifier ressources système
free -h
df -h

# Restart un service spécifique
sudo docker compose -f docker compose.prod.yml restart api
```

### Problème : Certificats SSL expirés

Let's Encrypt renouvelle automatiquement, mais si problème :

```bash
# Renouveler manuellement
sudo certbot renew

# Vérifier auto-renewal
sudo systemctl status certbot.timer

# Forcer renouvellement
sudo certbot renew --force-renewal
```

### Problème : Nginx erreur 502 Bad Gateway

```bash
# Vérifier que le service backend est UP
sudo docker compose -f docker compose.prod.yml ps

# Vérifier logs nginx
sudo tail -f /var/log/nginx/error.log

# Vérifier que le port est bien ouvert
sudo netstat -tlnp | grep 4000  # API backend
sudo netstat -tlnp | grep 3000  # Web frontend
```

### Problème : Database connexion error

```bash
# Vérifier PostgreSQL
sudo docker compose -f docker compose.prod.yml logs postgres

# Tester connexion
sudo docker compose -f docker compose.prod.yml exec postgres psql -U myremote -d myremote -c "SELECT version();"

# Vérifier password dans .env.prod
sudo cat /opt/apps/MyRemote/.env.prod | grep POSTGRES_PASSWORD
```

### Problème : Keycloak ne démarre pas

```bash
# Vérifier logs
sudo docker compose -f docker compose.prod.yml logs keycloak

# Keycloak prend 30-60s à démarrer, vérifier après 1 minute
sleep 60
sudo docker compose -f docker compose.prod.yml ps keycloak
```

### Problème : TURN relay ne fonctionne pas (pas de WebRTC)

```bash
# Vérifier coturn
sudo docker compose -f docker compose.prod.yml logs turn

# Tester TURN depuis client
# Utiliser : https://webrtc.github.io/samples/src/content/peerconnection/trickle-ice/

# Vérifier firewall
sudo ufw status | grep 3478
sudo ufw status | grep 49152:65535
```

---

## Sécurité

### Checklist Sécurité Production

- [ ] **Firewall activé** (UFW) avec règles restrictives
- [ ] **SSH** : Désactiver login root (`PermitRootLogin no`)
- [ ] **SSH** : Utiliser clés SSH (désactiver password auth)
- [ ] **SSL/TLS** : Certificats Let's Encrypt valides (< 90 jours)
- [ ] **Passwords** : Tous les mots de passe par défaut changés (`.env.prod`)
- [ ] **JWT Secret** : Généré aléatoirement (64 chars minimum)
- [ ] **Database** : Pas d'accès public (uniquement réseau Docker interne)
- [ ] **Redis** : Password configuré
- [ ] **Keycloak** : 2FA TOTP activé pour tous les utilisateurs
- [ ] **Nginx** : Security headers configurés (HSTS, X-Frame-Options, etc.)
- [ ] **Backups** : Backup database quotidien automatique
- [ ] **Monitoring** : Alertes configurées (API down, disque plein, etc.)
- [ ] **Logs** : Audit logs activés et rétention 90 jours
- [ ] **Updates** : Plan de mise à jour régulier (mensuel)

### Hardening SSH

```bash
sudo nano /etc/ssh/sshd_config

# Désactiver login root
PermitRootLogin no

# Utiliser uniquement clés SSH
PasswordAuthentication no
PubkeyAuthentication yes

# Changer port SSH (optionnel)
Port 2222

# Redémarrer SSH
sudo systemctl restart sshd
```

### Monitoring Intrusion (Fail2Ban)

```bash
# Installer Fail2Ban
sudo apt-get install -y fail2ban

# Configurer pour SSH + Nginx
sudo nano /etc/fail2ban/jail.local
```

Contenu :
```ini
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true
port = ssh
logpath = /var/log/auth.log

[nginx-http-auth]
enabled = true
port = http,https
logpath = /var/log/nginx/error.log

[nginx-limit-req]
enabled = true
port = http,https
logpath = /var/log/nginx/error.log
```

```bash
# Redémarrer
sudo systemctl restart fail2ban
sudo systemctl enable fail2ban

# Vérifier status
sudo fail2ban-client status
```

---

## Commandes Utiles

### Docker

```bash
# Voir tous les conteneurs
sudo docker compose -f docker compose.prod.yml ps

# Logs en temps réel
sudo docker compose -f docker compose.prod.yml logs -f

# Logs d'un service spécifique
sudo docker compose -f docker compose.prod.yml logs -f api

# Restart tous les services
sudo docker compose -f docker compose.prod.yml restart

# Restart un service
sudo docker compose -f docker compose.prod.yml restart api

# Stop tous les services
sudo docker compose -f docker compose.prod.yml down

# Stop + supprimer volumes (⚠️ DANGER - perte de données)
sudo docker compose -f docker compose.prod.yml down -v

# Rebuild + redémarrer
sudo docker compose -f docker compose.prod.yml up -d --build

# Nettoyer images inutilisées
sudo docker system prune -a
```

### Database

```bash
# Accéder au shell PostgreSQL
sudo docker compose -f docker compose.prod.yml exec postgres psql -U myremote -d myremote

# Lister tables
\dt

# Describe table
\d users

# Query
SELECT * FROM users LIMIT 10;

# Quitter
\q

# Backup
sudo docker compose -f docker compose.prod.yml exec postgres pg_dump -U myremote myremote > backup.sql

# Restaurer
cat backup.sql | sudo docker compose -f docker compose.prod.yml exec -T postgres psql -U myremote myremote
```

### Nginx

```bash
# Tester config
sudo nginx -t

# Recharger config
sudo systemctl reload nginx

# Restart nginx
sudo systemctl restart nginx

# Voir erreurs
sudo tail -f /var/log/nginx/error.log

# Voir access logs
sudo tail -f /var/log/nginx/access.log
```

### SSL Certificates

```bash
# Lister certificats
sudo certbot certificates

# Renouveler
sudo certbot renew

# Renouveler (force)
sudo certbot renew --force-renewal

# Vérifier auto-renewal
sudo systemctl status certbot.timer

# Tester auto-renewal (dry-run)
sudo certbot renew --dry-run
```

---

## Support

- **Documentation** : `/opt/apps/MyRemote/docs/`
- **Issues** : https://github.com/wilf974/MyRemote/issues
- **Logs** : `/var/log/nginx/` + `docker compose logs`

---

## Checklist Post-Déploiement

- [ ] DNS configuré (4 sous-domaines)
- [ ] Script `deploy-vps.sh` exécuté avec succès
- [ ] Certificats SSL obtenus (Let's Encrypt)
- [ ] Tous services Docker UP et healthy
- [ ] `.env.prod` configuré avec secrets forts
- [ ] Keycloak realm "myremote" créé
- [ ] Keycloak clients (api + web) créés
- [ ] Utilisateur admin créé avec 2FA
- [ ] Test connexion web réussi (https://myremote.woutils.com)
- [ ] Backup database automatique configuré (cron)
- [ ] Monitoring Grafana accessible
- [ ] Firewall UFW activé et configuré
- [ ] SSH hardening appliqué
- [ ] Fail2Ban installé et actif
- [ ] Auto-renewal SSL configuré (certbot.timer)

**🎉 Si tous les items sont cochés, le déploiement est complet !**

---

**Temps total déploiement** : 60-90 minutes
**Dernière mise à jour** : 2026-01-22
**Mainteneurs** : Tech Lead, DevOps Team
