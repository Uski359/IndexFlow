import dotenv from "dotenv";
dotenv.config();

import {
  loadBackendConfig,
  type BackendConfig
} from '../../packages/config/dist/index.js';

export type { BackendConfig };

export const config = loadBackendConfig();
