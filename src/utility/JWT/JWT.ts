import { ApiError } from '@error/ApiError';
import { ErrorCode } from '@error/ErrorCodes';
import { readFileSync } from 'fs';
import { JwtPayload, sign, SignOptions, TokenExpiredError, verify, VerifyOptions } from 'jsonwebtoken';
import { join } from 'path';

export class JWT {

  private static PRIVATE_KEY: string;
  private static PUBLIC_KEY: string;

  constructor() {
    if (!JWT.PRIVATE_KEY) {
      console.log(process.env.PRIVATE_KEY_FILE)
      console.log(process.env.PUBLIC_KEY_FILE)
      JWT.PRIVATE_KEY = process.env.PRIVATE_KEY_FILE ||  readFileSync( join('config', 'signing', 'signing.key'), 'ascii')
    }

    if (!JWT.PUBLIC_KEY) {
      JWT.PUBLIC_KEY =process.env.PUBLIC_KEY_FILE ||  readFileSync( join('config', 'signing', 'signing.pub'), 'ascii')
    }
  }

  async create<T extends object>(payload: T, options: SignOptions) {
    return new Promise<string>(
      (resolve, reject) => {
        sign(payload, JWT.PRIVATE_KEY, Object.assign(options, { algorithm: 'RS256' }), (err: any, encoded) => {
          if (err) {
            reject(err);
            return;
          }
          resolve(encoded!);
        });
      }
    )
  }

  async decodeAndVerify<T extends JwtPayload>(token: string, options: VerifyOptions) {
    return new Promise<T>(
      (resolve, reject) => {
        verify(token, JWT.PUBLIC_KEY, Object.assign(options, {
          algorithms: ['RS256']
        }), (err: any, decoded) => {
          if (err) {
            if (err instanceof TokenExpiredError) {
              reject(new ApiError(ErrorCode.Unauthorized, 'token/expired', 'Token expired'))
            } else {              
              reject(new ApiError(ErrorCode.Unauthorized, 'token/invalid', 'Token invalid'))
            }
            return;
          }
          resolve(decoded as T);
        })
      }
    )
  }
}