import { Injectable, NotFoundException, ConflictException, Logger, Inject, forwardRef } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { EventsGateway } from '../../gateways/events.gateway';
import {
  EnrollAgentDto,
  UpdateAgentDto,
  AgentHeartbeatDto,
  AgentStatus,
  AuditAction,
  AuditSeverity,
} from '@myremote/shared';

@Injectable()
export class AgentsService {
  private readonly logger = new Logger(AgentsService.name);

  constructor(
    private readonly database: DatabaseService,
    @Inject(forwardRef(() => EventsGateway))
    private readonly eventsGateway: EventsGateway,
  ) {}

  /**
   * Get all agents with optional filters
   */
  async findAll(filters?: {
    status?: AgentStatus;
    os?: string;
    search?: string;
    tags?: string[];
    page?: number;
    limit?: number;
  }) {
    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.os) {
      where.os = filters.os;
    }

    if (filters?.search) {
      where.OR = [
        { hostname: { contains: filters.search, mode: 'insensitive' } },
        { ipAddress: { contains: filters.search } },
        { macAddress: { contains: filters.search } },
      ];
    }

    if (filters?.tags && filters.tags.length > 0) {
      where.tags = {
        hasEvery: filters.tags,
      };
    }

    const [agents, total] = await Promise.all([
      this.database.agent.findMany({
        where,
        skip,
        take: limit,
        orderBy: { lastSeenAt: 'desc' },
        include: {
          enrolledByUser: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      }),
      this.database.agent.count({ where }),
    ]);

    return {
      data: agents,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get agent by ID
   */
  async findOne(id: string) {
    const agent = await this.database.agent.findUnique({
      where: { id },
      include: {
        enrolledByUser: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!agent) {
      throw new NotFoundException('Agent not found');
    }

    return agent;
  }

  /**
   * Enroll new agent
   */
  async enroll(enrollAgentDto: EnrollAgentDto, enrolledBy: string) {
    // Check if agent with same MAC address already exists
    const existingAgent = await this.database.agent.findFirst({
      where: { macAddress: enrollAgentDto.macAddress },
    });

    if (existingAgent) {
      throw new ConflictException('Agent with this MAC address already enrolled');
    }

    // TODO: Verify enrollment token
    // For now, we'll skip token verification

    // Create agent
    const agent = await this.database.agent.create({
      data: {
        hostname: enrollAgentDto.hostname,
        os: enrollAgentDto.os,
        osVersion: enrollAgentDto.osVersion,
        architecture: enrollAgentDto.architecture,
        ipAddress: enrollAgentDto.ipAddress,
        macAddress: enrollAgentDto.macAddress,
        version: enrollAgentDto.version,
        publicKey: enrollAgentDto.publicKey,
        status: AgentStatus.ONLINE,
        enrolledBy,
        lastSeenAt: new Date(),
        tags: [],
        metadata: {},
      },
      include: {
        enrolledByUser: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Create audit log
    await this.database.auditLog.create({
      data: {
        action: AuditAction.AGENT_ENROLL,
        severity: AuditSeverity.INFO,
        userId: enrolledBy,
        agentId: agent.id,
        ipAddress: enrollAgentDto.ipAddress,
        userAgent: 'agent',
        metadata: {
          hostname: agent.hostname,
          os: agent.os,
        },
      },
    });

    this.logger.log(`Agent enrolled: ${agent.hostname} (${agent.id})`);

    // Emit WebSocket event
    this.eventsGateway.emitAgentEnrolled(agent);

    return agent;
  }

  /**
   * Update agent
   */
  async update(id: string, updateAgentDto: UpdateAgentDto, updatedBy: string) {
    const agent = await this.database.agent.findUnique({
      where: { id },
    });

    if (!agent) {
      throw new NotFoundException('Agent not found');
    }

    const updatedAgent = await this.database.agent.update({
      where: { id },
      data: updateAgentDto,
      include: {
        enrolledByUser: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Create audit log
    await this.database.auditLog.create({
      data: {
        action: AuditAction.AGENT_UPDATE,
        severity: AuditSeverity.INFO,
        userId: updatedBy,
        agentId: id,
        ipAddress: '0.0.0.0',
        userAgent: 'system',
        metadata: {
          changes: updateAgentDto,
        },
      },
    });

    return updatedAgent;
  }

  /**
   * Delete agent
   */
  async remove(id: string, deletedBy: string) {
    const agent = await this.database.agent.findUnique({
      where: { id },
    });

    if (!agent) {
      throw new NotFoundException('Agent not found');
    }

    await this.database.agent.delete({
      where: { id },
    });

    // Create audit log
    await this.database.auditLog.create({
      data: {
        action: AuditAction.AGENT_DELETE,
        severity: AuditSeverity.WARNING,
        userId: deletedBy,
        agentId: id,
        ipAddress: '0.0.0.0',
        userAgent: 'system',
        metadata: {
          hostname: agent.hostname,
        },
      },
    });

    this.logger.log(`Agent deleted: ${agent.hostname} (${id})`);

    // Emit WebSocket event
    this.eventsGateway.emitAgentDeleted(id);

    return { message: 'Agent deleted successfully' };
  }

  /**
   * Process agent heartbeat
   */
  async heartbeat(heartbeatDto: AgentHeartbeatDto) {
    const agent = await this.database.agent.findUnique({
      where: { id: heartbeatDto.agentId },
    });

    if (!agent) {
      throw new NotFoundException('Agent not found');
    }

    // Update agent status and last seen
    const updatedAgent = await this.database.agent.update({
      where: { id: heartbeatDto.agentId },
      data: {
        status: heartbeatDto.status,
        ipAddress: heartbeatDto.ipAddress,
        lastSeenAt: new Date(),
        metadata: {
          ...agent.metadata,
          cpuUsage: heartbeatDto.cpuUsage,
          memoryUsage: heartbeatDto.memoryUsage,
          diskUsage: heartbeatDto.diskUsage,
          uptimeSeconds: heartbeatDto.uptimeSeconds,
        },
      },
    });

    // Emit WebSocket event
    this.eventsGateway.emitAgentHeartbeat(heartbeatDto.agentId, {
      status: heartbeatDto.status,
      cpuUsage: heartbeatDto.cpuUsage,
      memoryUsage: heartbeatDto.memoryUsage,
      diskUsage: heartbeatDto.diskUsage,
      uptimeSeconds: heartbeatDto.uptimeSeconds,
    });

    return { received: true };
  }

  /**
   * Get agent statistics
   */
  async getStats() {
    const [total, online, offline] = await Promise.all([
      this.database.agent.count(),
      this.database.agent.count({ where: { status: AgentStatus.ONLINE } }),
      this.database.agent.count({ where: { status: AgentStatus.OFFLINE } }),
    ]);

    const osDistribution = await this.database.agent.groupBy({
      by: ['os'],
      _count: true,
    });

    return {
      total,
      byStatus: {
        online,
        offline,
        unknown: total - online - offline,
      },
      byOS: osDistribution.map((r) => ({
        os: r.os,
        count: r._count,
      })),
    };
  }

  /**
   * Mark agents as offline if they haven't sent heartbeat in 5 minutes
   */
  async checkOfflineAgents() {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    const result = await this.database.agent.updateMany({
      where: {
        status: AgentStatus.ONLINE,
        lastSeenAt: {
          lt: fiveMinutesAgo,
        },
      },
      data: {
        status: AgentStatus.OFFLINE,
      },
    });

    if (result.count > 0) {
      this.logger.log(`Marked ${result.count} agents as offline`);
    }

    return result;
  }
}
