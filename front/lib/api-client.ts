import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import { authConfig } from '@/constants/AuthConfig';
import { loadSession } from '@/lib/session';
import { errorHandler } from './error-handler';

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
  (response) => response,
  (error) => {
    // Solo manejamos errores si no se ha desactivado explícitamente el manejo global
    // por ejemplo, mediante una propiedad custom en el config
    if (error.config?.handleError !== false) {
      errorHandler(error);
    }
    return Promise.reject(error);
  }
);

export default apiClient;
