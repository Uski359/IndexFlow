import http from 'http';

import app from './app.js';
import { config } from './infra/config/env.js';
import { logger } from './infra/config/logger.js';
import { transferRepository } from './infra/repositories/transferRepository.js';
import { startBaseIndexer } from './indexer/baseIndexer.js';
import './infra/indexer/listener/sepolia.listener.js';

async function startServer() {
  let stopBaseIndexer: () => Promise<void> = async () => undefined;

  try {
    await transferRepository.ensureConnected();
    logger.info('Connected to MongoDB');
  } catch (err) {
    logger.error({ err }, 'MongoDB connection failed');
  }

  try {
    stopBaseIndexer = await startBaseIndexer();
  } catch (err) {
    logger.error({ err }, 'Base ERC-8004 indexer failed to start');
  }

  const server = http.createServer(app);

  server.listen(config.port, () => {
    logger.info(`API server listening on port ${config.port}`);
  });

  function shutdown(signal: string) {
    logger.info({ signal }, 'Shutting down gracefully');
    server.close(() => {
      void stopBaseIndexer()
        .catch((err: unknown) => logger.error({ err }, 'Failed to stop Base ERC-8004 indexer'))
        .finally(() => {
          logger.info('HTTP server closed');
          process.exit(0);
        });
    });

    setTimeout(() => {
      logger.error('Forcing shutdown after timeout');
      process.exit(1);
    }, 10_000).unref();
  }

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

startServer();
