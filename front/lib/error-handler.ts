import { Alert } from 'react-native';

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
        // Aquí se podría disparar una acción de logout global si fuera necesario
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
    errorMessage = 'No se pudo conectar con el servidor. Verifica tu conexión.';
  } else {
    // Algo pasó al configurar la petición
    errorMessage = error.message || errorMessage;
  }

  // Mostrar alerta al usuario
  Alert.alert('Error', errorMessage);

  return {
    message: errorMessage,
    status: status,
    originalError: error
  };
};
