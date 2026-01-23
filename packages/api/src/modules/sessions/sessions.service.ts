import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class SessionsService {
  constructor(private readonly database: DatabaseService) {}

  // TODO: Implement sessions service methods
}
