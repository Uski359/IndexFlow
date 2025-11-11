import "dotenv/config";

import { loadIndexNodeEnv } from "@indexflow/config";

export type { IndexNodeEnv as AppEnv } from "@indexflow/config";

export const env = loadIndexNodeEnv();
