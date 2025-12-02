import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import type { DestinationStream } from 'pino';
import type { Options as PinoHttpOptions, HttpLogger } from 'pino-http';

import { config } from './config/env.js';
import { logger } from './config/logger.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { defaultRateLimiter } from './middleware/rateLimiter.js';
import routes from './routes/index.js';
import transferRoutes from './routes/transfers.js';

const app = express();

app.disable('x-powered-by');

if (config.enableRequestLogging) {
  type PinoHttpFactory = (
    options?: PinoHttpOptions,
    stream?: DestinationStream
  ) => HttpLogger;
  const createPinoHttp = pinoHttp as unknown as PinoHttpFactory;

  app.use(
    createPinoHttp({
      logger,
      autoLogging: true
    })
  );
}

app.use(helmet());
app.use(
  cors({
    origin: config.nodeEnv === 'production' ? 'https://indexflow.app' : '*'
  })
);
app.use(defaultRateLimiter);
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

app.get('/', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'indexflow-backend',
    docs: ['/health', '/api/transfers', '/api/transfers/recent']
  });
});

app.use('/api/transfers', transferRoutes);
app.use('/transfers', transferRoutes);
app.use('/api', routes);
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
