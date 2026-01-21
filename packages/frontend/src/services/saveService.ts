import api from './api';

export const saveService = {
  async upload(gameId: string, saveData: any) {
    const response = await api.post('/saves/upload', {
      gameId,
      saveData
    });
    return response.data;
  },

  async download(gameId: string) {
    const response = await api.post('/saves/download', {
      gameId
    });
    return response.data.data?.saveData;
  },

  async setAutoSave(autoSave: boolean) {
    const response = await api.post('/saves/auto-save', {
      autoSave
    });
    return response.data;
  },

  async getAutoSave() {
    const response = await api.get('/saves/auto-save');
    return response.data.data?.autoSave;
  }
};
