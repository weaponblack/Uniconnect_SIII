import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import { authConfig } from '@/constants/AuthConfig';
import { loadSession, saveSession, clearSession } from '@/lib/session';
import { errorHandler } from './error-handler';
import { router } from 'expo-router';

// Extender la interfaz de configuración de Axios
declare module 'axios' {
  export interface AxiosRequestConfig {
    handleError?: boolean;
  }
}

const apiClient: AxiosInstance = axios.create({
  baseURL: authConfig.backendUrl,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });

  failedQueue = [];
};

// Interceptor para añadir el token de autenticación
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const session = await loadSession();
    if (session?.accessToken && config.headers) {
      config.headers.Authorization = `Bearer ${session.accessToken}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para manejar errores globalmente
apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error) => {
    const originalRequest = error.config;

    // Verificar si es un error 401 y no estamos pidiendo Refresh
    if (error.response?.status === 401 && !originalRequest._retry && originalRequest.url !== '/auth/refresh') {
      if (isRefreshing) {
        return new Promise(function (resolve, reject) {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers.Authorization = 'Bearer ' + token;
          return apiClient(originalRequest);
        }).catch(err => {
          return Promise.reject(err);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const session = await loadSession();
      if (!session || !session.refreshToken || session.user.id.startsWith('auth0|')) {
        // Fallback natural
        isRefreshing = false;
        await clearSession();
        router.replace('/');
        return Promise.reject(error);
      }

      try {
        // Evitaremos una dependencia circular importando refresh directamente de axios basico 
        // o podemos usar api-client si tiene handleError false. Mejor un request simple para no loopear.
        const res = await axios.post(`${authConfig.backendUrl}/auth/refresh`, {
          refreshToken: session.refreshToken
        });

        const newSessionData = res.data;
        await saveSession(newSessionData);
        apiClient.defaults.headers.common['Authorization'] = 'Bearer ' + newSessionData.accessToken;
        originalRequest.headers.Authorization = 'Bearer ' + newSessionData.accessToken;

        processQueue(null, newSessionData.accessToken);
        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        await clearSession();
        router.replace('/');
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    if (error.config?.handleError !== false) {
      errorHandler(error);
    }
    return Promise.reject(error);
  }
);

export default apiClient;
