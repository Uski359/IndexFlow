import { Router } from 'express';

import {
  getContributionLeaderboard,
  getUserContributions
} from '../controllers/contributions.controller.js';

const contributionsRouter = Router();

contributionsRouter.get('/user/:address', getUserContributions);
contributionsRouter.get('/leaderboard', getContributionLeaderboard);

export default contributionsRouter;
