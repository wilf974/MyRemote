import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class AuthService {
  constructor(private readonly database: DatabaseService) {}

  // TODO: Implement Keycloak integration
  // TODO: Implement JWT validation
  // TODO: Implement 2FA validation
}
