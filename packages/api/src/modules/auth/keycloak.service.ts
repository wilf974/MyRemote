import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

interface KeycloakTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  refresh_expires_in: number;
  token_type: string;
}

@Injectable()
export class KeycloakService {
  private readonly logger = new Logger(KeycloakService.name);
  private readonly keycloakUrl: string;
  private readonly realm: string;
  private readonly clientId: string;
  private readonly clientSecret: string;

  constructor(private readonly configService: ConfigService) {
    this.keycloakUrl = this.configService.get<string>('KEYCLOAK_URL');
    this.realm = this.configService.get<string>('KEYCLOAK_REALM');
    this.clientId = this.configService.get<string>('KEYCLOAK_CLIENT_ID');
    this.clientSecret = this.configService.get<string>('KEYCLOAK_CLIENT_SECRET');
  }

  /**
   * Authenticate user with Keycloak
   */
  async login(email: string, password: string): Promise<KeycloakTokenResponse> {
    try {
      const url = `${this.keycloakUrl}/realms/${this.realm}/protocol/openid-connect/token`;
      
      const params = new URLSearchParams();
      params.append('client_id', this.clientId);
      params.append('client_secret', this.clientSecret);
      params.append('grant_type', 'password');
      params.append('username', email);
      params.append('password', password);

      const response = await axios.post<KeycloakTokenResponse>(url, params, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      return response.data;
    } catch (error) {
      this.logger.error('Keycloak login failed', error.response?.data);
      throw new UnauthorizedException('Invalid credentials');
    }
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string): Promise<KeycloakTokenResponse> {
    try {
      const url = `${this.keycloakUrl}/realms/${this.realm}/protocol/openid-connect/token`;
      
      const params = new URLSearchParams();
      params.append('client_id', this.clientId);
      params.append('client_secret', this.clientSecret);
      params.append('grant_type', 'refresh_token');
      params.append('refresh_token', refreshToken);

      const response = await axios.post<KeycloakTokenResponse>(url, params, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      return response.data;
    } catch (error) {
      this.logger.error('Token refresh failed', error.response?.data);
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  /**
   * Logout user from Keycloak
   */
  async logout(refreshToken: string): Promise<void> {
    try {
      const url = `${this.keycloakUrl}/realms/${this.realm}/protocol/openid-connect/logout`;
      
      const params = new URLSearchParams();
      params.append('client_id', this.clientId);
      params.append('client_secret', this.clientSecret);
      params.append('refresh_token', refreshToken);

      await axios.post(url, params, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });
    } catch (error) {
      this.logger.error('Keycloak logout failed', error.response?.data);
      // Don't throw error, logout should succeed even if Keycloak fails
    }
  }

  /**
   * Verify JWT token with Keycloak
   */
  async verifyToken(token: string): Promise<any> {
    try {
      const url = `${this.keycloakUrl}/realms/${this.realm}/protocol/openid-connect/userinfo`;
      
      const response = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      return response.data;
    } catch (error) {
      this.logger.error('Token verification failed', error.response?.data);
      throw new UnauthorizedException('Invalid token');
    }
  }

  /**
   * Get user info from Keycloak
   */
  async getUserInfo(userId: string, adminToken: string): Promise<any> {
    try {
      const url = `${this.keycloakUrl}/admin/realms/${this.realm}/users/${userId}`;
      
      const response = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });

      return response.data;
    } catch (error) {
      this.logger.error('Failed to get user info', error.response?.data);
      throw new Error('Failed to get user info from Keycloak');
    }
  }
}
