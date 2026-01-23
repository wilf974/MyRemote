import { z } from 'zod';

// Agent Status
export enum AgentStatus {
  ONLINE = 'ONLINE',
  OFFLINE = 'OFFLINE',
  UNKNOWN = 'UNKNOWN',
}

// Agent OS Type
export enum AgentOS {
  WINDOWS = 'WINDOWS',
  MACOS = 'MACOS',
  LINUX = 'LINUX',
}

// Agent Entity
export interface Agent {
  id: string;
  hostname: string;
  os: AgentOS;
  osVersion: string;
  architecture: string;
  ipAddress: string;
  macAddress: string;
  version: string;
  status: AgentStatus;
  publicKey: string;
  lastSeenAt: Date;
  enrolledAt: Date;
  enrolledBy: string;
  tags: string[];
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

// Agent DTOs
export const EnrollAgentSchema = z.object({
  hostname: z.string().min(1).max(255),
  os: z.nativeEnum(AgentOS),
  osVersion: z.string(),
  architecture: z.string(),
  ipAddress: z.string().ip(),
  macAddress: z.string().regex(/^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/),
  publicKey: z.string(),
  version: z.string(),
  enrollmentToken: z.string(),
});

export type EnrollAgentDto = z.infer<typeof EnrollAgentSchema>;

export const UpdateAgentSchema = z.object({
  hostname: z.string().min(1).max(255).optional(),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.any()).optional(),
});

export type UpdateAgentDto = z.infer<typeof UpdateAgentSchema>;

export const AgentHeartbeatSchema = z.object({
  agentId: z.string().uuid(),
  status: z.nativeEnum(AgentStatus),
  ipAddress: z.string().ip(),
  cpuUsage: z.number().min(0).max(100),
  memoryUsage: z.number().min(0).max(100),
  diskUsage: z.number().min(0).max(100),
  uptimeSeconds: z.number().min(0),
});

export type AgentHeartbeatDto = z.infer<typeof AgentHeartbeatSchema>;
