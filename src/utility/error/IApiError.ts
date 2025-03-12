import { ErrorCode } from './ErrorCodes';

export interface IApiError {
  code: ErrorCode,
  structured: string,
  message?: string,
  details?: any,
}