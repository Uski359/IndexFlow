import http from 'http';

import app from './app.js';
import { config } from './config/env.js';
import { logger } from './config/logger.js';
import rootRoute from "./routes/root.js";
  
app.use("/", rootRoute);

const server = http.createServer(app);

server.listen(config.port, () => {
  logger.info(`API server listening on port ${config.port}`);
});

function shutdown(signal: string) {
  logger.info({ signal }, 'Shutting down gracefully');
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });

  setTimeout(() => {
    logger.error('Forcing shutdown after timeout');
    process.exit(1);
  }, 10_000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
