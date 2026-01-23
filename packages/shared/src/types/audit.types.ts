import { z } from 'zod';

// Audit Action
export enum AuditAction {
  // User actions
  USER_LOGIN = 'USER_LOGIN',
  USER_LOGOUT = 'USER_LOGOUT',
  USER_CREATE = 'USER_CREATE',
  USER_UPDATE = 'USER_UPDATE',
  USER_DELETE = 'USER_DELETE',

  // Agent actions
  AGENT_ENROLL = 'AGENT_ENROLL',
  AGENT_UPDATE = 'AGENT_UPDATE',
  AGENT_DELETE = 'AGENT_DELETE',

  // Session actions
  SESSION_CREATE = 'SESSION_CREATE',
  SESSION_START = 'SESSION_START',
  SESSION_END = 'SESSION_END',
  SESSION_CONSENT_GRANT = 'SESSION_CONSENT_GRANT',
  SESSION_CONSENT_DENY = 'SESSION_CONSENT_DENY',

  // Security actions
  TWO_FACTOR_ENABLE = 'TWO_FACTOR_ENABLE',
  TWO_FACTOR_DISABLE = 'TWO_FACTOR_DISABLE',
  PASSWORD_CHANGE = 'PASSWORD_CHANGE',
  PERMISSION_CHANGE = 'PERMISSION_CHANGE',
}

// Audit Severity
export enum AuditSeverity {
  INFO = 'INFO',
  WARNING = 'WARNING',
  CRITICAL = 'CRITICAL',
}

// Audit Log Entity
export interface AuditLog {
  id: string;
  action: AuditAction;
  severity: AuditSeverity;
  userId: string | null;
  agentId: string | null;
  sessionId: string | null;
  ipAddress: string;
  userAgent: string;
  metadata: Record<string, any>;
  timestamp: Date;
}

// Audit DTOs
export const CreateAuditLogSchema = z.object({
  action: z.nativeEnum(AuditAction),
  severity: z.nativeEnum(AuditSeverity),
  userId: z.string().uuid().nullable(),
  agentId: z.string().uuid().nullable(),
  sessionId: z.string().uuid().nullable(),
  ipAddress: z.string().ip(),
  userAgent: z.string(),
  metadata: z.record(z.any()).optional(),
});

export type CreateAuditLogDto = z.infer<typeof CreateAuditLogSchema>;

export const QueryAuditLogsSchema = z.object({
  action: z.nativeEnum(AuditAction).optional(),
  userId: z.string().uuid().optional(),
  agentId: z.string().uuid().optional(),
  sessionId: z.string().uuid().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
});

export type QueryAuditLogsDto = z.infer<typeof QueryAuditLogsSchema>;
