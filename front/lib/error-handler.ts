import { showToast } from '../components/Toast';

export interface ApiError {
  message: string;
  status?: number;
  errors?: any[];
}

export const errorHandler = (error: any) => {
  let errorMessage = 'Ocurrió un error inesperado';
  let status = error.response?.status;

  if (error.response) {
    // El servidor respondió con un código status fuera del rango 2xx
    const data = error.response.data;
    errorMessage = data.message || errorMessage;

    switch (status) {
      case 400:
        errorMessage = `Error de validación: ${errorMessage}`;
        break;
      case 401:
        errorMessage = 'Sesión expirada o no autorizada';
        break;
      case 404:
        errorMessage = 'Recurso no encontrado';
        break;
      case 500:
        errorMessage = 'Error interno del servidor. Inténtalo más tarde.';
        break;
    }
  } else if (error.request) {
    // La petición fue hecha pero no se recibió respuesta
    errorMessage = `Falla de red hacia: ${error.config?.baseURL}${error.config?.url} (${error.message})`;
  } else {
    // Algo pasó al configurar la petición
    errorMessage = error.message || errorMessage;
  }

  // Mostrar notificación al usuario
  showToast(errorMessage, 'error');

  return {
    message: errorMessage,
    status: status,
    originalError: error
  };
};
