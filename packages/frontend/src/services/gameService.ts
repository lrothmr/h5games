import api from './api';

export interface Game {
  id: string;
  name: string;
  url: string;
  image: string | null;
  pinned: boolean;
  open: boolean;
  createdAt: string;
  clicks: number;
  likes: number;
}

export interface GameFormData {
  name: string;
  url?: string;
  image?: string;
  pinned?: boolean;
  open?: boolean;
}

export const gameService = {
  async getAll(): Promise<Game[]> {
    const response = await api.get('/games');
    return response.data.data;
  },

  async getById(id: string): Promise<Game> {
    const response = await api.get(`/games/${id}`);
    return response.data.data;
  },

  async create(data: GameFormData): Promise<Game> {
    const response = await api.post('/games', data);
    return response.data.data;
  },

  async update(id: string, data: Partial<GameFormData>): Promise<Game> {
    const response = await api.put(`/games/${id}`, data);
    return response.data.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/games/${id}`);
  },

  async upload(
    file: File,
    data: { name: string; gameId?: string; pinned?: boolean; open?: boolean },
    onProgress?: (percent: number) => void
  ): Promise<Game> {
    const CHUNK_SIZE = 5 * 1024 * 1024;
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    const uploadId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    if (totalChunks <= 1) {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('name', data.name);
      if (data.gameId) formData.append('gameId', data.gameId);
      if (data.pinned !== undefined) formData.append('pinned', String(data.pinned));
      if (data.open !== undefined) formData.append('open', String(data.open));

      const response = await api.post('/games/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total && onProgress) {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            onProgress(percent);
          }
        },
      });
      return response.data.data;
    }

    for (let i = 0; i < totalChunks; i++) {
      const start = i * CHUNK_SIZE;
      const end = Math.min(file.size, start + CHUNK_SIZE);
      const chunk = file.slice(start, end);

      const formData = new FormData();
      formData.append('file', chunk);
      formData.append('uploadId', uploadId);
      formData.append('chunkIndex', String(i));

      await api.post('/games/upload-chunk', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (onProgress) {
        const percent = Math.round(((i + 1) / totalChunks) * 100);
        onProgress(percent);
      }
    }

    const response = await api.post('/games/upload-merge', {
      uploadId,
      fileName: file.name,
      totalChunks,
      name: data.name,
      gameId: data.gameId,
      pinned: data.pinned,
      open: data.open,
    });

    return response.data.data;
  },

  async uploadImage(id: string, file: File): Promise<string> {
    const formData = new FormData();
    formData.append('image', file);

    const response = await api.post(`/games/${id}/image`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data.data.image;
  },

  async recordClick(gameId: string): Promise<void> {
    await api.post('/games/click', { gameId });
  },

  async recordLike(gameId: string, deviceId: string): Promise<number> {
    const response = await api.post('/games/like', { gameId, deviceId });
    return response.data.data.likes;
  },

  async getLikedGames(deviceId: string): Promise<string[]> {
    const response = await api.get('/games/likes', { params: { deviceId } });
    return response.data.data.likedGames;
  },
};
