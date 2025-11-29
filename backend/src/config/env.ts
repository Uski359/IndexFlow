import dotenv from "dotenv";
dotenv.config();

import { loadBackendConfig, type BackendConfig } from "../../config/dist/index.js";

export type { BackendConfig };

export const config = loadBackendConfig();
