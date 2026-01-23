import { Controller, Get } from '@nestjs/common';
import { SessionsService } from './sessions.service';

@Controller('sessions')
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Get()
  async findAll() {
    // TODO: Implement
    return { message: 'Sessions endpoint - to be implemented' };
  }
}
