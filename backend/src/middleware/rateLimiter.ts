import rateLimit from 'express-rate-limit';

export const defaultRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 200,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: 'Too many requests from this IP, please try again later.',
  skip: (req) => req.path.startsWith('/api/proof-of-usage')
});

export const validatorRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: 'Validator operations are being rate limited.'
});
