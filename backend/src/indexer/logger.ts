import fs from 'node:fs';
import path from 'node:path';

import { createLogger, format, transports } from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

const logDir = process.env.INDEXER_LOG_DIR ?? path.join(process.cwd(), 'logs');
fs.mkdirSync(logDir, { recursive: true });

const consoleFormat = format.combine(
  format.colorize(),
  format.timestamp(),
  format.printf(({ level, message, timestamp, ...meta }) => {
    const metaString = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
    return `${timestamp} [${level}] ${message}${metaString}`;
  })
);

const fileTransport = new DailyRotateFile({
  dirname: logDir,
  filename: 'indexer-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxFiles: '14d',
  level: process.env.INDEXER_LOG_LEVEL ?? 'info'
});

export const logger = createLogger({
  level: process.env.INDEXER_LOG_LEVEL ?? 'info',
  format: format.combine(format.timestamp(), format.errors({ stack: true }), format.json()),
  transports: [fileTransport, new transports.Console({ format: consoleFormat })]
});

export type IndexerLogger = typeof logger;
