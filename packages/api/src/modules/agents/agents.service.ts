import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class AgentsService {
  constructor(private readonly database: DatabaseService) {}

  // TODO: Implement agents service methods
}
