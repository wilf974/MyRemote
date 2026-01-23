import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() body: any) {
    // TODO: Implement login with Keycloak
    return { message: 'Login endpoint - to be implemented' };
  }

  @Post('logout')
  async logout() {
    // TODO: Implement logout
    return { message: 'Logout endpoint - to be implemented' };
  }
}
