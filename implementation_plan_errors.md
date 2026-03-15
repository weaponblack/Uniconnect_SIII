# Plan de Implementación: Manejo de Errores Centralizado (Frontend)

Se ha refactorizado la infraestructura de comunicación y manejo de errores del frontend para cumplir con los requisitos de robustez y consistencia.

## Cambios Realizados

### 1. Infraestructura de API (`apiClient`)
- **Archivo:** [api-client.ts](file:///c:/Users/weapo/OneDrive/Documents/GitHub/Uniconnect_SIII/front/lib/api-client.ts)
- Implementación de una instancia de **Axios** como cliente base.
- **Interceptores de Petición:** Añaden automáticamente el token de sesión de `SecureStore` en todas las peticiones salientes.
- **Interceptores de Respuesta:** Capturan cualquier error de red o de API y lo redirigen al manejador global.

### 2. Manejador de Errores Global ([errorHandler](file:///c:/Users/weapo/OneDrive/Documents/GitHub/Uniconnect_SIII/front/lib/error-handler.ts#9-50))
- **Archivo:** [error-handler.ts](file:///c:/Users/weapo/OneDrive/Documents/GitHub/Uniconnect_SIII/front/lib/error-handler.ts)
- Función centralizada que interpreta códigos HTTP:
    - `400`: Errores de validación.
    - `401`: Sesión expirada/No autorizado.
    - `404`: Recurso no encontrado.
    - `500`: Error interno del servidor.
- Muestra alertas consistentes al usuario utilizando `Alert.alert`.

### 3. Captura de Errores de Renderizado ([ErrorBoundary](file:///c:/Users/weapo/OneDrive/Documents/GitHub/Uniconnect_SIII/front/components/ErrorBoundary.tsx#13-51))
- **Archivo:** [ErrorBoundary.tsx](file:///c:/Users/weapo/OneDrive/Documents/GitHub/Uniconnect_SIII/front/components/ErrorBoundary.tsx)
- Componente de clase React para capturar fallos críticos durante el renderizado.
- Muestra una pantalla de error amigable con opción de reintento en lugar de cerrar la app.
- Integrado en el diseño raíz: [app/_layout.tsx](file:///c:/Users/weapo/OneDrive/Documents/GitHub/Uniconnect_SIII/front/app/_layout.tsx).

### 4. Refactorización de Servicios
Se eliminó el uso directo de `fetch` y la lógica repetitiva de `try/catch` y gestión de tokens en:
- [auth-api.ts](file:///c:/Users/weapo/OneDrive/Documents/GitHub/Uniconnect_SIII/front/lib/auth-api.ts)
- [student-api.ts](file:///c:/Users/weapo/OneDrive/Documents/GitHub/Uniconnect_SIII/front/lib/student-api.ts)
- [study-group-api.ts](file:///c:/Users/weapo/OneDrive/Documents/GitHub/Uniconnect_SIII/front/lib/study-group-api.ts)

## Cómo usar el nuevo apiClient

Para añadir nuevas peticiones, simplemente importa `apiClient`:

```typescript
import apiClient from './api-client';

export async function myNewAction() {
  // El token se añade solo, y el error se maneja solo (muestra alerta)
  const response = await apiClient.get('/some-endpoint');
  return response.data;
}

// Si necesitas manejar el error manualmente sin la alerta global:
export async function silentAction() {
  const response = await apiClient.get('/quiet', { handleError: false });
  return response.data;
}
```
