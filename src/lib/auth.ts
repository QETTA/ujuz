import { createSecretKey } from 'node:crypto';
import { SignJWT, jwtVerify } from 'jose';
import type { FastifyRequest } from 'fastify';

import { AppError } from './errors';

const secret = () => createSecretKey(process.env.JWT_SECRET || 'change-me', 'utf-8');
const issuer = () => process.env.JWT_ISSUER || 'ujuz-api';
const audience = () => process.env.JWT_AUDIENCE || 'ujuz-widget';

export async function signAnonToken(anonId: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({ typ: 'anon', anon_id: anonId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt(now)
    .setNotBefore(now)
    .setExpirationTime(now + 60 * 60 * 24 * 30)
    .setIssuer(issuer())
    .setAudience(audience())
    .sign(secret());
}

export async function verifyAnonToken(token: string): Promise<string> {
  const result = await jwtVerify(token, secret(), {
    issuer: issuer(),
    audience: audience(),
    algorithms: ['HS256'],
  });

  if (typeof result.payload.anon_id !== 'string' || result.payload.typ !== 'anon') {
    throw new AppError('INVALID_TOKEN', 'Invalid token claims', 401);
  }
  return result.payload.anon_id;
}

export async function getAnonIdFromRequest(req: FastifyRequest): Promise<string> {
  const authorization = req.headers.authorization;
  if (!authorization) {
    throw new AppError('MISSING_AUTH', 'Missing Authorization header', 401);
  }

  const [bearer, token] = authorization.split(' ');
  if (bearer !== 'Bearer' || !token) {
    throw new AppError('INVALID_AUTH', 'Invalid Authorization header', 401);
  }

  return verifyAnonToken(token);
}
