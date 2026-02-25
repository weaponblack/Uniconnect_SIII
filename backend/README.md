# UniConnect Backend (Google Institutional Auth)

Backend en Node + TypeScript + Express + Prisma con autenticacion Google para correo institucional.

## Requisitos
- Node 18+
- PostgreSQL online (Neon, Supabase, Render, Railway)

## 1) Instalar dependencias
```bash
npm install
```

## 2) Variables de entorno
1. Copia `.env.example` a `.env`
2. Completa valores reales:
   - `DATABASE_URL`
   - `DIRECT_URL`
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_ALLOWED_DOMAINS`
   - `JWT_ACCESS_SECRET`
   - `REFRESH_TOKEN_PEPPER`

## 3) Prisma
```bash
npm run prisma:generate
npm run prisma:migrate -- --name init_auth
```

## 4) Ejecutar en desarrollo
```bash
npm run dev
```

API: `http://localhost:4000`

## Endpoints auth
- `POST /auth/google`
  - Body: `{ "idToken": "google_id_token" }`
  - Verifica token Google, valida dominio institucional, crea/actualiza usuario y retorna tokens de app.

- `POST /auth/refresh`
  - Body: `{ "refreshToken": "sessionId.tokenPart" }`
  - Rota refresh token y entrega nuevo access token.

- `POST /auth/logout`
  - Body: `{ "refreshToken": "sessionId.tokenPart" }`
  - Revoca sesion.

## Criterios de seguridad incluidos
- Verificacion criptografica del ID token con `google-auth-library`.
- Validacion de `iss`, `aud`, `email_verified`.
- Restriccion por dominios permitidos (`GOOGLE_ALLOWED_DOMAINS`).
- Refresh token opaco por sesion, almacenado hasheado en DB.
- Rotacion de refresh token en cada uso.

## Nota de arquitectura
Este modulo cubre solo autenticacion. Tu diagrama de negocio (posts, chats, etc.) se puede conectar despues mediante `userId` y `role`.
