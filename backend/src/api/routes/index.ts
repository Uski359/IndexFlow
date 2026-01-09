import { Router } from 'express';

import contributionsRouter from './contributions.routes.js';
import healthRouter from './health.routes.js';
import holdersRouter from './holders.routes.js';
import poiRouter from './poi.routes.js';
import proofOfUsageRouter from './proofOfUsage.routes.js';
import stakingRouter from './staking.routes.js';
import statsRouter from './stats.routes.js';
import supplyRouter from './supply.routes.js';
import transfersRouter from './transfers.routes.js';

const apiRouter = Router();

apiRouter.use('/health', healthRouter);
apiRouter.use('/supply', supplyRouter);
apiRouter.use('/holders', holdersRouter);
apiRouter.use('/stats', statsRouter);
apiRouter.use('/transfers', transfersRouter);
apiRouter.use('/staking', stakingRouter);
apiRouter.use('/poi', poiRouter);
apiRouter.use('/proof-of-usage', proofOfUsageRouter);
apiRouter.use('/contributions', contributionsRouter);

export default apiRouter;
