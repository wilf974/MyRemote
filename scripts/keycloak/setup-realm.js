#!/usr/bin/env node

/**
 * Keycloak Realm Setup Script
 *
 * This script automatically configures a Keycloak realm for MyRemote:
 * - Creates the 'myremote' realm
 * - Configures API and Web clients
 * - Sets up roles (ADMIN, TECHNICIAN, VIEWER)
 * - Configures 2FA/TOTP settings
 *
 * Usage: node setup-realm.js
 */

const axios = require('axios');

const KEYCLOAK_URL = process.env.KEYCLOAK_URL || 'http://localhost:8080';
const ADMIN_USERNAME = process.env.KEYCLOAK_ADMIN || 'admin';
const ADMIN_PASSWORD = process.env.KEYCLOAK_ADMIN_PASSWORD || 'admin';
const REALM_NAME = 'myremote';

class KeycloakSetup {
  constructor() {
    this.adminToken = null;
  }

  async getAdminToken() {
    console.log('🔑 Obtaining admin token...');

    const params = new URLSearchParams();
    params.append('client_id', 'admin-cli');
    params.append('username', ADMIN_USERNAME);
    params.append('password', ADMIN_PASSWORD);
    params.append('grant_type', 'password');

    const response = await axios.post(
      `${KEYCLOAK_URL}/realms/master/protocol/openid-connect/token`,
      params,
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      }
    );

    this.adminToken = response.data.access_token;
    console.log('✅ Admin token obtained');
  }

  async createRealm() {
    console.log(`🏗️  Creating realm: ${REALM_NAME}...`);

    const realmConfig = {
      realm: REALM_NAME,
      enabled: true,
      displayName: 'MyRemote',
      displayNameHtml: '<b>MyRemote</b>',
      loginTheme: 'keycloak',
      accountTheme: 'keycloak',
      adminTheme: 'keycloak',
      emailTheme: 'keycloak',
      sslRequired: 'external',
      registrationAllowed: false,
      registrationEmailAsUsername: true,
      rememberMe: true,
      verifyEmail: true,
      loginWithEmailAllowed: true,
      duplicateEmailsAllowed: false,
      resetPasswordAllowed: true,
      editUsernameAllowed: false,
      bruteForceProtected: true,
      permanentLockout: false,
      maxFailureWaitSeconds: 900,
      minimumQuickLoginWaitSeconds: 60,
      waitIncrementSeconds: 60,
      quickLoginCheckMilliSeconds: 1000,
      maxDeltaTimeSeconds: 43200,
      failureFactor: 5,
      defaultSignatureAlgorithm: 'RS256',
      offlineSessionIdleTimeout: 2592000,
      offlineSessionMaxLifespanEnabled: false,
      offlineSessionMaxLifespan: 5184000,
      accessTokenLifespan: 3600,
      accessTokenLifespanForImplicitFlow: 900,
      ssoSessionIdleTimeout: 1800,
      ssoSessionMaxLifespan: 36000,
      otpPolicyType: 'totp',
      otpPolicyAlgorithm: 'HmacSHA1',
      otpPolicyInitialCounter: 0,
      otpPolicyDigits: 6,
      otpPolicyLookAheadWindow: 1,
      otpPolicyPeriod: 30,
    };

    try {
      await axios.post(
        `${KEYCLOAK_URL}/admin/realms`,
        realmConfig,
        {
          headers: { Authorization: `Bearer ${this.adminToken}` },
        }
      );
      console.log('✅ Realm created');
    } catch (error) {
      if (error.response?.status === 409) {
        console.log('⚠️  Realm already exists');
      } else {
        throw error;
      }
    }
  }

  async createRoles() {
    console.log('👥 Creating roles...');

    const roles = [
      { name: 'ADMIN', description: 'Administrator with full access' },
      { name: 'TECHNICIAN', description: 'Technician with session access' },
      { name: 'VIEWER', description: 'Viewer with read-only access' },
    ];

    for (const role of roles) {
      try {
        await axios.post(
          `${KEYCLOAK_URL}/admin/realms/${REALM_NAME}/roles`,
          role,
          {
            headers: { Authorization: `Bearer ${this.adminToken}` },
          }
        );
        console.log(`  ✅ Role created: ${role.name}`);
      } catch (error) {
        if (error.response?.status === 409) {
          console.log(`  ⚠️  Role already exists: ${role.name}`);
        } else {
          throw error;
        }
      }
    }
  }

  async createApiClient() {
    console.log('🔧 Creating API client...');

    const clientConfig = {
      clientId: 'myremote-api',
      name: 'MyRemote API',
      description: 'Backend API client',
      enabled: true,
      protocol: 'openid-connect',
      publicClient: false,
      bearerOnly: false,
      standardFlowEnabled: false,
      implicitFlowEnabled: false,
      directAccessGrantsEnabled: true,
      serviceAccountsEnabled: true,
      authorizationServicesEnabled: false,
      fullScopeAllowed: true,
      redirectUris: [],
      webOrigins: [],
      attributes: {
        'access.token.lifespan': '3600',
      },
    };

    try {
      await axios.post(
        `${KEYCLOAK_URL}/admin/realms/${REALM_NAME}/clients`,
        clientConfig,
        {
          headers: { Authorization: `Bearer ${this.adminToken}` },
        }
      );
      console.log('✅ API client created');

      // Get client to retrieve its secret
      const clients = await axios.get(
        `${KEYCLOAK_URL}/admin/realms/${REALM_NAME}/clients?clientId=myremote-api`,
        {
          headers: { Authorization: `Bearer ${this.adminToken}` },
        }
      );

      if (clients.data.length > 0) {
        const clientId = clients.data[0].id;
        const secret = await axios.get(
          `${KEYCLOAK_URL}/admin/realms/${REALM_NAME}/clients/${clientId}/client-secret`,
          {
            headers: { Authorization: `Bearer ${this.adminToken}` },
          }
        );

        console.log(`\n📝 API Client Secret: ${secret.data.value}`);
        console.log('   Add this to your .env file as KEYCLOAK_CLIENT_SECRET\n');
      }
    } catch (error) {
      if (error.response?.status === 409) {
        console.log('⚠️  API client already exists');
      } else {
        throw error;
      }
    }
  }

  async createWebClient() {
    console.log('🌐 Creating Web client...');

    const clientConfig = {
      clientId: 'myremote-web',
      name: 'MyRemote Web',
      description: 'Frontend web application',
      enabled: true,
      protocol: 'openid-connect',
      publicClient: true,
      bearerOnly: false,
      standardFlowEnabled: true,
      implicitFlowEnabled: false,
      directAccessGrantsEnabled: false,
      serviceAccountsEnabled: false,
      authorizationServicesEnabled: false,
      fullScopeAllowed: true,
      redirectUris: [
        'http://localhost:3000/*',
        'https://myremote.woutils.com/*',
      ],
      webOrigins: [
        'http://localhost:3000',
        'https://myremote.woutils.com',
      ],
      attributes: {
        'pkce.code.challenge.method': 'S256',
      },
    };

    try {
      await axios.post(
        `${KEYCLOAK_URL}/admin/realms/${REALM_NAME}/clients`,
        clientConfig,
        {
          headers: { Authorization: `Bearer ${this.adminToken}` },
        }
      );
      console.log('✅ Web client created');
    } catch (error) {
      if (error.response?.status === 409) {
        console.log('⚠️  Web client already exists');
      } else {
        throw error;
      }
    }
  }

  async configureOTP() {
    console.log('🔐 Configuring OTP/2FA policy...');

    const otpPolicy = {
      otpPolicyType: 'totp',
      otpPolicyAlgorithm: 'HmacSHA1',
      otpPolicyInitialCounter: 0,
      otpPolicyDigits: 6,
      otpPolicyLookAheadWindow: 1,
      otpPolicyPeriod: 30,
    };

    await axios.put(
      `${KEYCLOAK_URL}/admin/realms/${REALM_NAME}`,
      otpPolicy,
      {
        headers: { Authorization: `Bearer ${this.adminToken}` },
      }
    );

    console.log('✅ OTP policy configured');
  }

  async run() {
    try {
      console.log('🚀 Starting Keycloak setup for MyRemote...\n');

      await this.getAdminToken();
      await this.createRealm();
      await this.createRoles();
      await this.createApiClient();
      await this.createWebClient();
      await this.configureOTP();

      console.log('\n✅ Keycloak setup completed successfully!');
      console.log('\n📋 Next steps:');
      console.log('   1. Copy the API client secret to your .env file');
      console.log('   2. Create users in Keycloak admin console');
      console.log('   3. Assign roles to users');
      console.log(`   4. Access Keycloak: ${KEYCLOAK_URL}/admin`);
      console.log(`   5. Realm: ${REALM_NAME}\n`);
    } catch (error) {
      console.error('\n❌ Setup failed:', error.response?.data || error.message);
      process.exit(1);
    }
  }
}

// Run setup
const setup = new KeycloakSetup();
setup.run();
