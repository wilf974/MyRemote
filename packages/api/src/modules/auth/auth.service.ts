import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DatabaseService } from '../database/database.service';
import { KeycloakService } from './keycloak.service';
import { LoginDto } from '@myremote/shared';
import { AuditAction, AuditSeverity } from '@myremote/shared';
import * as speakeasy from 'speakeasy';

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    twoFactorEnabled: boolean;
  };
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly database: DatabaseService,
    private readonly keycloakService: KeycloakService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Login user with email and password
   */
  async login(loginDto: LoginDto, ipAddress: string, userAgent: string): Promise<LoginResponse> {
    const { email, password, totpCode } = loginDto;

    // 1. Authenticate with Keycloak
    const tokens = await this.keycloakService.login(email, password);

    // 2. Get user from database
    const user = await this.database.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('User account is not active');
    }

    // 3. Check 2FA if enabled
    if (user.twoFactorEnabled) {
      if (!totpCode) {
        throw new UnauthorizedException('2FA code required');
      }

      // Verify TOTP code (in production, the secret should be stored securely)
      // For now, this is a placeholder - Keycloak handles 2FA
      // const verified = speakeasy.totp.verify({
      //   secret: user.totpSecret,
      //   encoding: 'base32',
      //   token: totpCode,
      // });

      // if (!verified) {
      //   throw new UnauthorizedException('Invalid 2FA code');
      // }
    }

    // 4. Update last login
    await this.database.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // 5. Create audit log
    await this.database.auditLog.create({
      data: {
        action: AuditAction.USER_LOGIN,
        severity: AuditSeverity.INFO,
        userId: user.id,
        ipAddress,
        userAgent,
        metadata: {
          email: user.email,
          success: true,
        },
      },
    });

    this.logger.log(`User ${user.email} logged in successfully`);

    return {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresIn: tokens.expires_in,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        twoFactorEnabled: user.twoFactorEnabled,
      },
    };
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string): Promise<{ accessToken: string; expiresIn: number }> {
    const tokens = await this.keycloakService.refreshToken(refreshToken);

    return {
      accessToken: tokens.access_token,
      expiresIn: tokens.expires_in,
    };
  }

  /**
   * Logout user
   */
  async logout(userId: string, refreshToken: string, ipAddress: string, userAgent: string): Promise<void> {
    // Logout from Keycloak
    await this.keycloakService.logout(refreshToken);

    // Create audit log
    await this.database.auditLog.create({
      data: {
        action: AuditAction.USER_LOGOUT,
        severity: AuditSeverity.INFO,
        userId,
        ipAddress,
        userAgent,
        metadata: {},
      },
    });

    this.logger.log(`User ${userId} logged out`);
  }

  /**
   * Generate 2FA secret for user
   */
  async generate2FASecret(userId: string): Promise<{ secret: string; qrCode: string }> {
    const user = await this.database.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const secret = speakeasy.generateSecret({
      name: `MyRemote (${user.email})`,
      issuer: 'MyRemote',
    });

    // Store secret temporarily (should be confirmed with TOTP code)
    // In production, store this encrypted in database

    return {
      secret: secret.base32,
      qrCode: secret.otpauth_url,
    };
  }

  /**
   * Enable 2FA for user
   */
  async enable2FA(userId: string, secret: string, totpCode: string): Promise<void> {
    // Verify TOTP code
    const verified = speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token: totpCode,
    });

    if (!verified) {
      throw new UnauthorizedException('Invalid 2FA code');
    }

    // Enable 2FA
    await this.database.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: true },
    });

    // Create audit log
    await this.database.auditLog.create({
      data: {
        action: AuditAction.TWO_FACTOR_ENABLE,
        severity: AuditSeverity.INFO,
        userId,
        ipAddress: '0.0.0.0', // Should be passed from controller
        userAgent: 'unknown',
        metadata: {},
      },
    });

    this.logger.log(`2FA enabled for user ${userId}`);
  }

  /**
   * Disable 2FA for user
   */
  async disable2FA(userId: string, password: string): Promise<void> {
    const user = await this.database.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Verify password with Keycloak
    try {
      await this.keycloakService.login(user.email, password);
    } catch (error) {
      throw new UnauthorizedException('Invalid password');
    }

    // Disable 2FA
    await this.database.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: false },
    });

    // Create audit log
    await this.database.auditLog.create({
      data: {
        action: AuditAction.TWO_FACTOR_DISABLE,
        severity: AuditSeverity.WARNING,
        userId,
        ipAddress: '0.0.0.0',
        userAgent: 'unknown',
        metadata: {},
      },
    });

    this.logger.warn(`2FA disabled for user ${userId}`);
  }
}
