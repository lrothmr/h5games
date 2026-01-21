import api from './api';

export const authService = {
  async adminLogin(username: string, password: string, mfaToken?: string): Promise<{ token: string; username: string; mustChangePassword?: boolean }> {
    const response = await api.post('/auth/admin/login', { username, password, mfaToken });
    return response.data.data;
  },

  async changeAdminPassword(oldPassword: string, newPassword: string): Promise<void> {
    await api.post('/auth/admin/change-password', { oldPassword, newPassword });
  },

  async setupMfa(): Promise<{ secret: string; qrCodeUrl: string }> {
    const response = await api.post('/auth/admin/mfa/setup');
    return response.data.data;
  },

  async verifyAndEnableMfa(secret: string, token: string): Promise<void> {
    await api.post('/auth/admin/mfa/verify', { secret, token });
  },

  async userLogin(username: string, password: string): Promise<{ token: string; username: string }> {
    const response = await api.post('/auth/login', { username, password });
    return response.data.data;
  },

  async userRegister(username: string, password: string, email: string, inviteCode: string): Promise<void> {
    await api.post('/auth/register', { username, password, email, inviteCode });
  },
};

export const saveService = {
  async getAutoSave(): Promise<boolean> {
    const response = await api.get('/saves/auto-save');
    return response.data.data.autoSave;
  },

  async setAutoSave(autoSave: boolean): Promise<void> {
    await api.post('/saves/auto-save', { autoSave });
  },

  async upload(gameId: string, saveData: unknown): Promise<void> {
    await api.post('/saves/upload', { gameId, saveData });
  },

  async download(gameId: string): Promise<unknown> {
    const response = await api.post('/saves/download', { gameId });
    return response.data.data.saveData;
  },

  async getList(): Promise<{ gameId: string; updatedAt: string }[]> {
    const response = await api.get('/saves/list');
    return response.data.data.saves;
  },
};
