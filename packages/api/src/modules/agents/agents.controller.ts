import { Controller, Get } from '@nestjs/common';
import { AgentsService } from './agents.service';

@Controller('agents')
export class AgentsController {
  constructor(private readonly agentsService: AgentsService) {}

  @Get()
  async findAll() {
    // TODO: Implement
    return { message: 'Agents endpoint - to be implemented' };
  }
}
