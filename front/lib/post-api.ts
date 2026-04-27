import apiClient from './api-client';
import { Platform } from 'react-native';

export interface PostComment {
  id: string;
  content: string;
  authorId: string;
  author: {
    name: string;
    profileImage: string | null;
  };
  createdAt: string;
}

export interface Post {
  id: string;
  title: string;
  content: string;
  type: string;
  isPinned: boolean;
  authorId: string;
  author: {
    name: string;
    profileImage: string | null;
  };
  fileUrls: string[]; // JSON string arrays will be parsed normally
  createdAt: string;
  comments: PostComment[];
}

export const postApi = {
  getGroupPosts: async (groupId: string): Promise<Post[]> => {
    const response = await apiClient.get<Post[]>(`/groups/${groupId}/posts`);
    return Array.isArray(response.data) ? response.data : (response.data as any).data || [];
  },

  createPost: async (groupId: string, data: { title: string; content: string; type: string; isPinned?: boolean }, files?: { uri: string; type: string; name: string }[]) => {
    const formData = new FormData();
    formData.append('title', data.title);
    formData.append('content', data.content);
    formData.append('type', data.type);
    if (data.isPinned !== undefined) {
      formData.append('isPinned', String(data.isPinned));
    }

    if (files && files.length > 0) {
      for (const file of files) {
        // Need to pass it directly
        formData.append('files', {
          uri: Platform.OS === 'ios' ? file.uri.replace('file://', '') : file.uri,
          type: file.type || 'application/octet-stream',
          name: file.name
        } as any);
      }
    }

    const response = await apiClient.post(`/groups/${groupId}/posts`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data.data;
  },

  togglePin: async (groupId: string, postId: string) => {
    const response = await apiClient.put(`/groups/${groupId}/posts/${postId}/pin`);
    return response.data.data;
  },

  deletePost: async (groupId: string, postId: string) => {
    const response = await apiClient.delete(`/groups/${groupId}/posts/${postId}`);
    return response.data;
  },

  addComment: async (groupId: string, postId: string, content: string) => {
    const response = await apiClient.post(`/groups/${groupId}/posts/${postId}/comments`, { content });
    return response.data.data;
  },

  deleteResource: async (groupId: string, postId: string, resourceId: string) => {
    const response = await apiClient.delete(`/groups/${groupId}/posts/${postId}/resources/${resourceId}`);
    return response.data;
  }
};