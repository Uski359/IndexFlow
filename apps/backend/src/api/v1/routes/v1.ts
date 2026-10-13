import { Router } from 'express';

import campaignsRouter from './campaigns.js';
import campaignRunRouter from './campaignRun.js';
import commentaryRouter from './commentary.js';
import ensRouter from './ens.js';
import evaluateRouter from './evaluate.js';
import insightsRouter from './insights.js';
import mockWalletsRouter from './mockWallets.js';

const v1Router = Router();

v1Router.use('/campaigns', campaignsRouter);
v1Router.use('/evaluate', evaluateRouter);
v1Router.use('/insights', insightsRouter);
v1Router.use('/commentary', commentaryRouter);
v1Router.use('/ens', ensRouter);
v1Router.use('/campaign', campaignRunRouter);
v1Router.use('/campaign', mockWalletsRouter);

export default v1Router;
