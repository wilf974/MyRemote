import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AgentsService } from './agents.service';
import {
  EnrollAgentDto,
  UpdateAgentDto,
  AgentHeartbeatDto,
  AgentStatus,
  UserRole,
} from '@myremote/shared';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { CurrentUser, CurrentUserPayload } from '../auth/decorators/current-user.decorator';

@Controller('agents')
@UseGuards(JwtAuthGuard)
export class AgentsController {
  constructor(private readonly agentsService: AgentsService) {}

  /**
   * Get all agents
   */
  @Get()
  @Roles(UserRole.ADMIN, UserRole.TECHNICIAN, UserRole.VIEWER)
  async findAll(
    @Query('status') status?: AgentStatus,
    @Query('os') os?: string,
    @Query('search') search?: string,
    @Query('tags') tags?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.agentsService.findAll({
      status,
      os,
      search,
      tags: tags ? tags.split(',') : undefined,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  /**
   * Get agent statistics
   */
  @Get('stats')
  @Roles(UserRole.ADMIN, UserRole.TECHNICIAN)
  async getStats() {
    return this.agentsService.getStats();
  }

  /**
   * Get agent by ID
   */
  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.TECHNICIAN, UserRole.VIEWER)
  async findOne(@Param('id') id: string) {
    return this.agentsService.findOne(id);
  }

  /**
   * Enroll new agent (public endpoint for agents)
   */
  @Public()
  @Post('enroll')
  @HttpCode(HttpStatus.CREATED)
  async enroll(@Body() enrollAgentDto: EnrollAgentDto) {
    // In a real scenario, the enrollment would validate the token
    // and get the user ID from it. For now, we use a system user ID.
    const systemUserId = 'system';
    return this.agentsService.enroll(enrollAgentDto, systemUserId);
  }

  /**
   * Agent heartbeat (public endpoint for agents)
   */
  @Public()
  @Post('heartbeat')
  @HttpCode(HttpStatus.OK)
  async heartbeat(@Body() heartbeatDto: AgentHeartbeatDto) {
    return this.agentsService.heartbeat(heartbeatDto);
  }

  /**
   * Update agent
   */
  @Put(':id')
  @Roles(UserRole.ADMIN, UserRole.TECHNICIAN)
  async update(
    @Param('id') id: string,
    @Body() updateAgentDto: UpdateAgentDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.agentsService.update(id, updateAgentDto, user.id);
  }

  /**
   * Delete agent
   */
  @Delete(':id')
  @Roles(UserRole.ADMIN)
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.agentsService.remove(id, user.id);
  }
}
