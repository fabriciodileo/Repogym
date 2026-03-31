import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import pinoHttp from 'pino-http';

import { env } from './config/env.js';
import { defaultRateLimiter } from './core/middleware/rate-limit.js';
import { errorHandler } from './core/middleware/error-handler.js';
import { notFoundHandler } from './core/middleware/not-found.js';
import { logger } from './lib/logger.js';
import { apiRouter } from './routes/index.js';

const allowedOrigins = env.CORS_ORIGIN.split(',').map((origin) => origin.trim());

export const app = express();

app.use(
  pinoHttp({
    logger,
  }),
);
app.use(helmet());
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  }),
);
app.use(express.json({ limit: '2mb' }));
app.use(defaultRateLimiter);

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'gym-api', now: new Date().toISOString() });
});

app.use('/api/v1', apiRouter);
app.use(notFoundHandler);
app.use(errorHandler);
