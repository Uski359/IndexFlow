import express from "express";
import cors from "cors";
import helmet from "helmet";
import healthRoute from "./routes/health.js";

const app = express();

app.use(express.json());
app.use(cors());
app.use(helmet());

app.use(healthRoute);


import apiRoutes from "./routes/index.js";
app.use("/api", apiRoutes);

import { notFoundHandler } from "./middleware/errorHandler.js";
app.use(notFoundHandler);

export default app;
