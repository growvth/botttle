import * as bcrypt from 'bcrypt';
import * as jose from 'jose';
import { prisma } from '@botttle/db';
import type { LoginBody, RegisterBody } from './schema.js';

const JWT_SECRET = new TextEncoder().encode(
  process.env['JWT_SECRET'] ?? 'dev-secret-change-in-production'
);
const REFRESH_SECRET = new TextEncoder().encode(
  process.env['REFRESH_SECRET'] ?? 'dev-refresh-secret-change-in-production'
);

const ACCESS_TTL = '15m';
const REFRESH_TTL = '7d';

export type TokenPayload = { sub: string; email: string; role: string };

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function signAccessToken(payload: TokenPayload): Promise<string> {
  return new jose.SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime(ACCESS_TTL)
    .setIssuedAt()
    .sign(JWT_SECRET);
}

export async function signRefreshToken(payload: TokenPayload): Promise<string> {
  return new jose.SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime(REFRESH_TTL)
    .setIssuedAt()
    .sign(REFRESH_SECRET);
}

export async function verifyAccessToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jose.jwtVerify(token, JWT_SECRET);
    return payload as unknown as TokenPayload;
  } catch {
    return null;
  }
}

export async function verifyRefreshToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jose.jwtVerify(token, REFRESH_SECRET);
    return payload as unknown as TokenPayload;
  } catch {
    return null;
  }
}

export async function login(body: LoginBody): Promise<
  | { ok: true; accessToken: string; refreshToken: string; user: { id: string; email: string; role: string; name: string | null } }
  | { ok: false; code: string; message: string }
> {
  const user = await prisma.user.findUnique({ where: { email: body.email } });
  if (!user || user.disabled) {
    return { ok: false, code: 'UNAUTHORIZED', message: 'Invalid email or password' };
  }
  const valid = await verifyPassword(body.password, user.passwordHash);
  if (!valid) {
    return { ok: false, code: 'UNAUTHORIZED', message: 'Invalid email or password' };
  }
  const payload: TokenPayload = { sub: user.id, email: user.email, role: user.role };
  const accessToken = await signAccessToken(payload);
  const refreshToken = await signRefreshToken(payload);
  return {
    ok: true,
    accessToken,
    refreshToken,
    user: { id: user.id, email: user.email, role: user.role, name: user.name },
  };
}

export async function register(body: RegisterBody): Promise<
  | { ok: true; accessToken: string; refreshToken: string; user: { id: string; email: string; role: string; name: string | null } }
  | { ok: false; code: string; message: string }
> {
  const existing = await prisma.user.findUnique({ where: { email: body.email } });
  if (existing) {
    return { ok: false, code: 'CONFLICT', message: 'Email already registered' };
  }
  const userCount = await prisma.user.count();
  const isFirstUser = userCount === 0;
  const passwordHash = await hashPassword(body.password);
  const role = isFirstUser ? 'ADMIN' : (body.role ?? 'CLIENT');
  const user = await prisma.user.create({
    data: {
      email: body.email,
      passwordHash,
      name: body.name ?? null,
      role,
    },
  });
  const payload: TokenPayload = { sub: user.id, email: user.email, role: user.role };
  const accessToken = await signAccessToken(payload);
  const refreshToken = await signRefreshToken(payload);
  return {
    ok: true,
    accessToken,
    refreshToken,
    user: { id: user.id, email: user.email, role: user.role, name: user.name },
  };
}

export async function refresh(refreshToken: string): Promise<
  | { ok: true; accessToken: string; refreshToken: string }
  | { ok: false; code: string; message: string }
> {
  const payload = await verifyRefreshToken(refreshToken);
  if (!payload) {
    return { ok: false, code: 'UNAUTHORIZED', message: 'Invalid or expired refresh token' };
  }
  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user || user.disabled) {
    return { ok: false, code: 'UNAUTHORIZED', message: 'User not found or disabled' };
  }
  const newPayload: TokenPayload = { sub: user.id, email: user.email, role: user.role };
  const accessToken = await signAccessToken(newPayload);
  const newRefreshToken = await signRefreshToken(newPayload);
  return { ok: true, accessToken, refreshToken: newRefreshToken };
}
