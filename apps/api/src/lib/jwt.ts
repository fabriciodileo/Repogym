import jwt from 'jsonwebtoken';
import { createHash, randomUUID } from 'node:crypto';

import { env } from '../config/env.js';
import type { AuthenticatedSession } from '../core/types/auth.js';

export type RefreshTokenPayload = {
  sub: string;
  jti: string;
};

export const createRefreshTokenId = () => randomUUID();

const accessTokenOptions: jwt.SignOptions = {
  expiresIn: env.JWT_ACCESS_EXPIRES_IN as jwt.SignOptions['expiresIn'],
};

const refreshTokenOptions: jwt.SignOptions = {
  expiresIn: env.JWT_REFRESH_EXPIRES_IN as jwt.SignOptions['expiresIn'],
};

export const signAccessToken = (payload: AuthenticatedSession) =>
  jwt.sign(payload, env.JWT_ACCESS_SECRET, accessTokenOptions);

export const signRefreshToken = (payload: RefreshTokenPayload) =>
  jwt.sign(payload, env.JWT_REFRESH_SECRET, refreshTokenOptions);

export const verifyAccessToken = (token: string) =>
  jwt.verify(token, env.JWT_ACCESS_SECRET) as AuthenticatedSession;

export const verifyRefreshToken = (token: string) =>
  jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshTokenPayload;

export const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

