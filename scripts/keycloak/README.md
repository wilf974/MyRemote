# Keycloak Setup Script

This script automatically configures Keycloak for MyRemote.

## What it does

- Creates the `myremote` realm
- Configures API client (`myremote-api`) with client credentials grant
- Configures Web client (`myremote-web`) with authorization code flow + PKCE
- Creates roles: ADMIN, TECHNICIAN, VIEWER
- Configures OTP/2FA policy (TOTP, 6 digits, 30s period)

## Prerequisites

- Keycloak running (via Docker Compose or standalone)
- Node.js installed

## Usage

### 1. Start Keycloak

```bash
cd /home/user/MyRemote
docker compose up -d keycloak

# Wait for Keycloak to be ready (30-60 seconds)
docker compose logs -f keycloak
```

### 2. Run the setup script

```bash
cd scripts/keycloak
npm install
npm run setup
```

Or with environment variables:

```bash
KEYCLOAK_URL=http://localhost:8080 \
KEYCLOAK_ADMIN=admin \
KEYCLOAK_ADMIN_PASSWORD=admin \
npm run setup
```

### 3. Copy the client secret

The script will output the API client secret. Copy it to your `.env` file:

```env
KEYCLOAK_CLIENT_SECRET=<generated-secret>
```

## Creating Users

After setup, create users via Keycloak admin console:

1. Access: http://localhost:8080/admin
2. Login with admin credentials
3. Select `myremote` realm
4. Go to Users → Add user
5. Fill in email, first name, last name
6. Save
7. Go to Credentials tab → Set password
8. Go to Role Mappings → Assign role (ADMIN, TECHNICIAN, or VIEWER)

## Testing Authentication

```bash
# In packages/api directory
npm run dev

# In packages/web directory
npm run dev

# Open browser
http://localhost:3000/login

# Login with the user you created
```

## Troubleshooting

### Keycloak not accessible

```bash
# Check if Keycloak is running
docker compose ps keycloak

# Check logs
docker compose logs keycloak

# Restart
docker compose restart keycloak
```

### Script fails with 401

- Check admin username/password
- Wait for Keycloak to be fully started

### Script fails with connection error

- Ensure Keycloak URL is correct
- Check if port 8080 is accessible

## Advanced Configuration

### Custom realm settings

Edit `setup-realm.js` and modify the `realmConfig` object.

### Additional clients

Add more clients by creating new methods in the `KeycloakSetup` class.

### Import existing realm

```bash
# Export realm from Keycloak UI
# Then import with:
docker compose exec keycloak /opt/keycloak/bin/kc.sh import --file /tmp/myremote-realm.json
```

## Security Notes

- In production, use strong admin passwords
- Rotate client secrets regularly
- Enable HTTPS for Keycloak
- Configure proper redirect URIs for production domain
- Enable email verification for new users
- Configure SMTP for password reset emails
