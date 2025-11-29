import dotenv from "dotenv";
dotenv.config();

import { loadBackendConfig } from '@indexflow/config';

export { type BackendConfig } from '@indexflow/config';

export const config = loadBackendConfig();
