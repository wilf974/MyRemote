import { z } from 'zod';

// Session Type
export enum SessionType {
  DESKTOP = 'DESKTOP',
  TERMINAL = 'TERMINAL',
  FILE_TRANSFER = 'FILE_TRANSFER',
}

// Session Status
export enum SessionStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  ENDED = 'ENDED',
  FAILED = 'FAILED',
}

// Consent Status
export enum ConsentStatus {
  PENDING = 'PENDING',
  GRANTED = 'GRANTED',
  DENIED = 'DENIED',
  NOT_REQUIRED = 'NOT_REQUIRED',
}

// Session Entity
export interface Session {
  id: string;
  type: SessionType;
  status: SessionStatus;
  agentId: string;
  initiatedBy: string;
  consentStatus: ConsentStatus;
  consentGrantedBy: string | null;
  consentGrantedAt: Date | null;
  startedAt: Date;
  endedAt: Date | null;
  duration: number | null;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

// Session DTOs
export const CreateSessionSchema = z.object({
  type: z.nativeEnum(SessionType),
  agentId: z.string().uuid(),
  requireConsent: z.boolean().default(true),
  adminPassword: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

export type CreateSessionDto = z.infer<typeof CreateSessionSchema>;

export const SessionConsentSchema = z.object({
  sessionId: z.string().uuid(),
  granted: z.boolean(),
  reason: z.string().optional(),
});

export type SessionConsentDto = z.infer<typeof SessionConsentSchema>;

// WebRTC Signaling
export const WebRTCOfferSchema = z.object({
  sessionId: z.string().uuid(),
  sdp: z.string(),
  type: z.literal('offer'),
});

export type WebRTCOfferDto = z.infer<typeof WebRTCOfferSchema>;

export const WebRTCAnswerSchema = z.object({
  sessionId: z.string().uuid(),
  sdp: z.string(),
  type: z.literal('answer'),
});

export type WebRTCAnswerDto = z.infer<typeof WebRTCAnswerSchema>;

export const WebRTCIceCandidateSchema = z.object({
  sessionId: z.string().uuid(),
  candidate: z.string(),
  sdpMid: z.string().nullable(),
  sdpMLineIndex: z.number().nullable(),
});

export type WebRTCIceCandidateDto = z.infer<typeof WebRTCIceCandidateSchema>;
