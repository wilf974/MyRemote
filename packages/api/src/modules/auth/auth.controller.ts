import { Controller, Post, Get, Body, UseGuards, Req, HttpCode, HttpStatus } from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from '@myremote/shared';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Public } from './decorators/public.decorator';
import { CurrentUser, CurrentUserPayload } from './decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Login endpoint
   */
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto, @Req() req: Request) {
    const ipAddress = req.ip || '0.0.0.0';
    const userAgent = req.headers['user-agent'] || 'unknown';

    return this.authService.login(loginDto, ipAddress, userAgent);
  }

  /**
   * Refresh token endpoint
   */
  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body('refreshToken') refreshToken: string) {
    return this.authService.refreshToken(refreshToken);
  }

  /**
   * Logout endpoint
   */
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @CurrentUser() user: CurrentUserPayload,
    @Body('refreshToken') refreshToken: string,
    @Req() req: Request,
  ) {
    const ipAddress = req.ip || '0.0.0.0';
    const userAgent = req.headers['user-agent'] || 'unknown';

    await this.authService.logout(user.id, refreshToken, ipAddress, userAgent);

    return { message: 'Logged out successfully' };
  }

  /**
   * Get current user info
   */
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getCurrentUser(@CurrentUser() user: CurrentUserPayload) {
    return user;
  }

  /**
   * Generate 2FA secret
   */
  @UseGuards(JwtAuthGuard)
  @Post('2fa/generate')
  async generate2FA(@CurrentUser() user: CurrentUserPayload) {
    return this.authService.generate2FASecret(user.id);
  }

  /**
   * Enable 2FA
   */
  @UseGuards(JwtAuthGuard)
  @Post('2fa/enable')
  async enable2FA(
    @CurrentUser() user: CurrentUserPayload,
    @Body('secret') secret: string,
    @Body('totpCode') totpCode: string,
  ) {
    await this.authService.enable2FA(user.id, secret, totpCode);
    return { message: '2FA enabled successfully' };
  }

  /**
   * Disable 2FA
   */
  @UseGuards(JwtAuthGuard)
  @Post('2fa/disable')
  async disable2FA(
    @CurrentUser() user: CurrentUserPayload,
    @Body('password') password: string,
  ) {
    await this.authService.disable2FA(user.id, password);
    return { message: '2FA disabled successfully' };
  }
}
