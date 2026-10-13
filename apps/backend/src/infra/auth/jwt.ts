import jwt from 'jsonwebtoken';

import { config } from '../config/env.js';

interface AdminTokenPayload {
  sub: string;
  role: 'admin';
  iat: number;
  exp: number;
  iss: string;
}

export function signAdminToken(address: string) {
  const payload = {
    sub: address.toLowerCase(),
    role: 'admin'
  };

  return jwt.sign(payload, config.jwtSecret, {
    issuer: config.jwtIssuer,
    expiresIn: config.jwtExpirySeconds
  });
}

export function verifyAdminToken(token: string): AdminTokenPayload {
  return jwt.verify(token, config.jwtSecret, {
    issuer: config.jwtIssuer,
    algorithms: ['HS256']
  }) as AdminTokenPayload;
}
