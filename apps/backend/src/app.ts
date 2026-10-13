import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import type { DestinationStream } from 'pino';
import type { Options as PinoHttpOptions, HttpLogger } from 'pino-http';

import { config } from './infra/config/env.js';
import { logger } from './infra/config/logger.js';
import { errorHandler, notFoundHandler } from './api/middleware/errorHandler.js';
import { defaultRateLimiter } from './api/middleware/rateLimiter.js';
import routes from './api/legacy/routes/index.js';
import v1Routes from './api/v1/routes/v1.js';
import transferRoutes from './api/legacy/routes/transfers.js';
import faucetRoute from './api/legacy/routes/faucet.js';
import { generatePolymarketPilotDataset } from './mock/mockData.js';
import sybilRouter from './routes/sybil.js';

const app = express();
const FAUCET_PRIVATE_KEY_REGEX = /^0x[0-9a-fA-F]{64}$/;

const isFaucetConfigured = () => {
  const rpcUrl = process.env.RPC_URL?.trim();
  const tokenAddress = process.env.TOKEN_ADDRESS?.trim();
  const tokenDecimals = process.env.TOKEN_DECIMALS?.trim();
  const privateKey = process.env.FAUCET_PRIVATE_KEY?.trim();

  return Boolean(
    rpcUrl &&
      tokenAddress &&
      tokenDecimals &&
      privateKey &&
      FAUCET_PRIVATE_KEY_REGEX.test(privateKey)
  );
};

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
    docs: [
      '/health',
      '/api/transfers',
      '/api/transfers/recent',
      '/api/participants',
      '/api/mock/polymarket-pilot'
    ]
  });
});

app.get('/api/participants', (_req, res) => {
  try {
    const pilotData = generatePolymarketPilotDataset();
    res.json(pilotData);
  } catch (error) {
    logger.error({ err: error }, 'Failed to serve pilot dataset');
    res.status(500).json({ error: 'Failed to serve pilot dataset' });
  }
});

app.get('/api/mock/polymarket-pilot', (_req, res) => {
  const items = generatePolymarketPilotDataset();

  res.json({
    datasetName: 'polymarket-pilot',
    generatedAt: new Date().toISOString(),
    total: items.length,
    items
  });
});

app.get('/v1/mock/polymarket-pilot', (_req, res) => {
  const items = generatePolymarketPilotDataset();

  res.json({
    datasetName: 'polymarket-pilot',
    generatedAt: new Date().toISOString(),
    total: items.length,
    items
  });
});

app.use('/api/transfers', transferRoutes);
app.use('/transfers', transferRoutes);
app.use('/api/v1/sybil', sybilRouter);
if (isFaucetConfigured()) {
  app.use('/api/faucet', faucetRoute);
  app.use('/faucet', faucetRoute);
} else if (config.nodeEnv !== 'test') {
  logger.warn('Faucet disabled: missing or invalid faucet environment configuration.');
}
app.use('/v1', v1Routes);
app.use('/api', routes);
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
