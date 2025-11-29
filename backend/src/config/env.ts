import dotenv from "dotenv";
dotenv.config();

import { loadBackendConfig, type BackendConfig } from "@indexflow/config";

export type { BackendConfig };

export const config = loadBackendConfig();
