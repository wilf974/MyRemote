import { apiClient } from './client';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  status: string;
  twoFactorEnabled: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserData {
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  password: string;
}

export interface UpdateUserData {
  firstName?: string;
  lastName?: string;
  role?: string;
  status?: string;
}

export const usersApi = {
  async getAll(params?: {
    role?: string;
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const response = await apiClient.get('/users', { params });
    return response.data;
  },

  async getOne(id: string) {
    const response = await apiClient.get(`/users/${id}`);
    return response.data;
  },

  async create(data: CreateUserData) {
    const response = await apiClient.post('/users', data);
    return response.data;
  },

  async update(id: string, data: UpdateUserData) {
    const response = await apiClient.put(`/users/${id}`, data);
    return response.data;
  },

  async delete(id: string) {
    const response = await apiClient.delete(`/users/${id}`);
    return response.data;
  },

  async getStats() {
    const response = await apiClient.get('/users/stats');
    return response.data;
  },
};
