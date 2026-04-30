import apiClient from './api-client';

export interface ChatMessage {
  id: string;
  content: string;
  senderId: string;
  groupId?: string;
  receiverId?: string;
  isPrivate: boolean;
  fileUrl?: string;
  fileName?: string;
  fileType?: string;
  createdAt: string;
  sender: {
    id: string;
    name: string | null;
    avatarUrl: string | null;
  };
}

export const chatApi = {
  getGroupHistory: async (groupId: string): Promise<ChatMessage[]> => {
    const { data } = await apiClient.get(`/chat/group/${groupId}`);
    return data;
  },

  sendGroupMessage: async (groupId: string, content: string, file?: any): Promise<ChatMessage> => {
    const formData = new FormData();
    formData.append('content', content);
    if (file) {
      formData.append('file', file as any);
    }
    const { data } = await apiClient.post(`/chat/group/${groupId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  getPrivateHistory: async (otherUserId: string): Promise<ChatMessage[]> => {
    const { data } = await apiClient.get(`/chat/private/${otherUserId}`);
    return data;
  },

  sendPrivateMessage: async (otherUserId: string, content: string, file?: any): Promise<ChatMessage> => {
    const formData = new FormData();
    formData.append('content', content);
    if (file) {
      formData.append('file', file as any);
    }
    const { data } = await apiClient.post(`/chat/private/${otherUserId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },
};
