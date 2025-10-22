import { logger } from './logger.js';

export const auditLogger = logger.child({ name: 'audit' });
