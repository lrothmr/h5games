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

  async getMfaStatus() {
    const response = await api.get('/admin/mfa/status');
    return response.data;
  },

  // 文件管理
  async listFiles(gameId: string, folder: string = '') {
    const response = await api.get('/admin/files/list', { params: { gameId, folder } });
    return response.data.data;
  },

  async readFile(gameId: string, filePath: string) {
    const response = await api.get('/admin/files/read', { params: { gameId, filePath } });
    return response.data.data;
  },

  async saveFile(gameId: string, filePath: string, content: string) {
    const response = await api.post('/admin/files/save', { gameId, filePath, content });
    return response.data;
  },
};
