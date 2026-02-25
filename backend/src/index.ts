import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { authRouter } from './modules/auth/auth.routes.js';
import { env } from './config/env.js';
import { checkDbConnection, prisma } from './lib/prisma.js';

const app = express();
const port = env.PORT;

app.use(cors());
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());

let isDatabaseConnected = false;

app.get('/health', (_req, res) => {
  res.json({
    status: isDatabaseConnected ? 'ok' : 'degraded',
    service: 'uniconnect-backend',
    database: isDatabaseConnected ? 'up' : 'down',
    timestamp: new Date().toISOString(),
  });
});

app.get('/health/db', async (_req, res) => {
  const connected = await checkDbConnection();
  isDatabaseConnected = connected;

  return res.status(connected ? 200 : 503).json({
    database: connected ? 'up' : 'down',
    timestamp: new Date().toISOString(),
  });
});

app.use('/auth', authRouter);

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof Error) {
    return res.status(400).json({
      message: err.message,
    });
  }

  return res.status(500).json({
    message: 'Unexpected server error',
  });
});

async function bootstrap() {
  try {
    await prisma.$connect();
    isDatabaseConnected = true;
    console.log('Database connection: OK');

    app.listen(port, () => {
      console.log(`API running on http://localhost:${port}`);
    });
  } catch (error) {
    isDatabaseConnected = false;
    console.error('Database connection: FAILED');
    console.error(error);
    process.exit(1);
  }
}

bootstrap();
