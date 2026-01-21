import api from './api';

export interface InviteCode {
  id: number;
  code: string;
  isUsed: boolean;
  createdAt: string;
  usedAt?: string;
  usedBy?: string;
}

export interface User {
  id: number;
  username: string;
  email: string;
  autoSave: boolean;
  createdAt: string;
}

export const adminService = {
  async getInviteCodes(): Promise<InviteCode[]> {
    const response = await api.get('/admin/invite-codes');
    return response.data.data;
  },

  async generateInviteCode(count: number = 1): Promise<string[]> {
    const response = await api.post('/admin/invite-codes', { count });
    return response.data.data;
  },

  async deleteInviteCode(id: number): Promise<void> {
    await api.delete(`/admin/invite-codes/${id}`);
  },

  async getUsers(): Promise<User[]> {
    const response = await api.get('/admin/users');
    return response.data.data;
  },
};
