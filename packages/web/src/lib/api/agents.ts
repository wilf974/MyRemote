import { apiClient } from './client';

export interface Agent {
  id: string;
  hostname: string;
  os: string;
  osVersion: string;
  architecture: string;
  ipAddress: string;
  macAddress: string;
  version: string;
  status: 'ONLINE' | 'OFFLINE' | 'UNKNOWN';
  publicKey: string;
  lastSeenAt: string;
  enrolledAt: string;
  enrolledBy: string;
  tags: string[];
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  enrolledByUser?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
}

export interface UpdateAgentData {
  hostname?: string;
  tags?: string[];
  metadata?: Record<string, any>;
}

export const agentsApi = {
  async getAll(params?: {
    status?: string;
    os?: string;
    search?: string;
    tags?: string;
    page?: number;
    limit?: number;
  }) {
    const response = await apiClient.get('/agents', { params });
    return response.data;
  },

  async getOne(id: string) {
    const response = await apiClient.get(`/agents/${id}`);
    return response.data;
  },

  async update(id: string, data: UpdateAgentData) {
    const response = await apiClient.put(`/agents/${id}`, data);
    return response.data;
  },

  async delete(id: string) {
    const response = await apiClient.delete(`/agents/${id}`);
    return response.data;
  },

  async getStats() {
    const response = await apiClient.get('/agents/stats');
    return response.data;
  },
};
