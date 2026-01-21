import api from './api';

export const saveService = {
  async upload(gameId: string, saveData: any) {
    const response = await api.post('/saves', {
      action: 'upload',
      gameId,
      saveData
    });
    return response.data;
  },

  async download(gameId: string) {
    const response = await api.post('/saves', {
      action: 'download',
      gameId
    });
    return response.data.data?.saveData;
  },

  async setAutoSave(autoSave: boolean) {
    const response = await api.post('/saves', {
      action: 'set_auto_save',
      autoSave
    });
    return response.data;
  },

  async getAutoSave() {
    const response = await api.post('/saves', {
      action: 'get_auto_save'
    });
    return response.data.data?.autoSave;
  }
};
