import { ApiError } from '@error/ApiError';
import { ErrorCode } from '@error/ErrorCodes';
import { Request } from 'express';
import { JWT } from 'utility/JWT/JWT';
import { JWT_ACCESS_AUD, JWT_ISSUER } from 'utility/JWT/JWTConstants';
import { IAccessToken } from './IAccessToken';

export async function expressAuthentication(
  request: Request,
  securityName: string,
  scopes?: string[]
): Promise<IAccessToken | null> {
  if (securityName === 'jwt') {
    const authHeader = request.headers.authorization || '';
    if (!authHeader.startsWith('Bearer ')) {
      throw new ApiError(ErrorCode.Unauthorized, 'auth/missing-header', 'Missing authorization header with Bearer token');
    }

    const token = authHeader.split('Bearer ')[1];

    const jwt = new JWT();
    let decoded = await jwt.decodeAndVerify<IAccessToken>(token, {
      issuer: JWT_ISSUER,
      audience: JWT_ACCESS_AUD,
    });

    if (scopes && scopes.length > 0) {
      if (!decoded.role || !scopes.includes(decoded.role)) {
        throw new ApiError(ErrorCode.Forbidden, 'auth/insufficient-permissions', `Access denied. Required roles: ${scopes.join(', ')}`);
      }
    }

    return decoded;
  }

  return null;
}
