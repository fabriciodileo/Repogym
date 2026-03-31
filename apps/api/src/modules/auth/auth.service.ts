import jwt from 'jsonwebtoken';

import { AppError } from '../../core/errors/app-error.js';
import type { AuthenticatedSession } from '../../core/types/auth.js';
import { hashToken, signAccessToken, signRefreshToken, verifyRefreshToken } from '../../lib/jwt.js';
import { comparePassword } from '../../lib/password.js';
import { auditService } from '../audit/audit.service.js';
import { authRepository } from './auth.repository.js';

type LoginInput = {
  email: string;
  password: string;
  ipAddress?: string;
  userAgent?: string;
};

type RefreshInput = {
  refreshToken: string;
};

type LogoutInput = {
  userId: string;
  refreshToken?: string;
  ipAddress?: string;
  userAgent?: string;
};

const decodeRefreshExpiration = (token: string) => {
  const decoded = jwt.decode(token) as { exp?: number } | null;

  if (!decoded?.exp) {
    throw new AppError('No se pudo determinar la expiracion del refresh token.', 500);
  }

  return new Date(decoded.exp * 1000);
};

const mapSession = (user: Awaited<ReturnType<typeof authRepository.findUserById>>): AuthenticatedSession => {
  if (!user) {
    throw new AppError('Usuario no encontrado.', 404, 'USER_NOT_FOUND');
  }

  return {
    userId: user.id,
    email: user.email,
    role: user.role.code,
    branchId: user.branchId ?? null,
    permissions: user.role.rolePermissions.map((item) => item.permission.code),
  };
};

const mapUserResponse = (user: NonNullable<Awaited<ReturnType<typeof authRepository.findUserById>>>) => ({
  id: user.id,
  firstName: user.firstName,
  lastName: user.lastName,
  email: user.email,
  isActive: user.isActive,
  lastAccessAt: user.lastAccessAt,
  role: {
    id: user.role.id,
    code: user.role.code,
    name: user.role.name,
  },
  branchId: user.branchId,
});

export class AuthService {
  async login(input: LoginInput) {
    const user = await authRepository.findUserByEmail(input.email);

    if (!user || !user.isActive) {
      throw new AppError('Credenciales invalidas.', 401, 'INVALID_CREDENTIALS');
    }

    const isPasswordValid = await comparePassword(input.password, user.passwordHash);

    if (!isPasswordValid) {
      throw new AppError('Credenciales invalidas.', 401, 'INVALID_CREDENTIALS');
    }

    const session = mapSession(user);
    const accessToken = signAccessToken(session);
    const refreshToken = signRefreshToken({ sub: user.id, jti: crypto.randomUUID() });

    await Promise.all([
      authRepository.createRefreshToken(user.id, hashToken(refreshToken), decodeRefreshExpiration(refreshToken)),
      authRepository.updateLastAccess(user.id),
      auditService.record({
        userId: user.id,
        branchId: user.branchId,
        action: 'LOGIN',
        entityName: 'User',
        entityId: user.id,
        description: 'Inicio de sesion interno',
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
      }),
    ]);

    return {
      accessToken,
      refreshToken,
      user: mapUserResponse(user),
    };
  }

  async refresh(input: RefreshInput) {
    const payload = verifyRefreshToken(input.refreshToken);
    const tokenHash = hashToken(input.refreshToken);
    const storedToken = await authRepository.findRefreshToken(payload.sub, tokenHash);

    if (!storedToken) {
      throw new AppError('La sesion ya no es valida.', 401, 'INVALID_REFRESH_TOKEN');
    }

    const user = await authRepository.findUserById(payload.sub);

    if (!user || !user.isActive) {
      throw new AppError('Usuario no disponible.', 401, 'INVALID_REFRESH_TOKEN');
    }

    await authRepository.revokeRefreshToken(storedToken.id);

    const session = mapSession(user);
    const accessToken = signAccessToken(session);
    const refreshToken = signRefreshToken({ sub: user.id, jti: crypto.randomUUID() });

    await authRepository.createRefreshToken(
      user.id,
      hashToken(refreshToken),
      decodeRefreshExpiration(refreshToken),
    );

    return {
      accessToken,
      refreshToken,
      user: mapUserResponse(user),
    };
  }

  async logout(input: LogoutInput) {
    if (input.refreshToken) {
      const payload = verifyRefreshToken(input.refreshToken);
      const tokenHash = hashToken(input.refreshToken);
      const storedToken = await authRepository.findRefreshToken(payload.sub, tokenHash);

      if (storedToken) {
        await authRepository.revokeRefreshToken(storedToken.id);
      }
    } else {
      await authRepository.revokeUserRefreshTokens(input.userId);
    }

    await auditService.record({
      userId: input.userId,
      action: 'LOGOUT',
      entityName: 'User',
      entityId: input.userId,
      description: 'Cierre de sesion interno',
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
    });

    return { ok: true };
  }

  async getSession(userId: string) {
    const user = await authRepository.findUserById(userId);

    if (!user || !user.isActive) {
      throw new AppError('Sesion no valida.', 401, 'UNAUTHENTICATED');
    }

    return {
      user: mapUserResponse(user),
      session: mapSession(user),
    };
  }
}

export const authService = new AuthService();
