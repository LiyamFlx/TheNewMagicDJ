export type AppErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'BAD_REQUEST'
  | 'NOT_FOUND'
  | 'RATE_LIMITED'
  | 'TIMEOUT'
  | 'NETWORK_ERROR'
  | 'UPSTREAM_ERROR'
  | 'INTERNAL_ERROR';

export interface NormalizedError {
  code: AppErrorCode;
  message: string;
  httpStatus?: number;
  retriable?: boolean;
  details?: any;
}

export class AppError extends Error implements NormalizedError {
  code: AppErrorCode;
  httpStatus?: number;
  retriable?: boolean;
  details?: any;

  constructor(
    code: AppErrorCode,
    message: string,
    options?: { httpStatus?: number; retriable?: boolean; details?: any; cause?: any }
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.httpStatus = options?.httpStatus;
    this.retriable = options?.retriable;
    this.details = options?.details;
    // Preserve original cause where supported
    // @ts-ignore
    if (options?.cause) this.cause = options.cause;
  }

  toJSON(): NormalizedError {
    return {
      code: this.code,
      message: this.message,
      httpStatus: this.httpStatus,
      retriable: this.retriable,
      details: this.details,
    };
  }
}

export function normalizeError(err: unknown, fallback: Partial<NormalizedError> = {}): NormalizedError {
  if (err instanceof AppError) return err.toJSON();
  if (err instanceof Error) {
    return {
      code: (fallback.code as AppErrorCode) || 'INTERNAL_ERROR',
      message: err.message || fallback.message || 'Unexpected error',
      httpStatus: fallback.httpStatus,
      retriable: fallback.retriable,
      details: fallback.details,
    };
  }
  return {
    code: (fallback.code as AppErrorCode) || 'INTERNAL_ERROR',
    message: fallback.message || 'Unexpected error',
    httpStatus: fallback.httpStatus,
    retriable: fallback.retriable,
    details: fallback.details ?? err,
  };
}

export async function errorFromResponse(resp: Response, bodyText?: string): Promise<AppError> {
  const status = resp.status;
  const message = `${status} ${resp.statusText}`;
  let code: AppErrorCode = 'UPSTREAM_ERROR';
  if (status === 400) code = 'BAD_REQUEST';
  else if (status === 401) code = 'UNAUTHORIZED';
  else if (status === 403) code = 'FORBIDDEN';
  else if (status === 404) code = 'NOT_FOUND';
  else if (status === 408) code = 'TIMEOUT';
  else if (status === 429) code = 'RATE_LIMITED';
  else if (status >= 500) code = 'UPSTREAM_ERROR';

  return new AppError(code, message, {
    httpStatus: status,
    retriable: status >= 500 || status === 429 || status === 408,
    details: { body: bodyText?.slice(0, 200) },
  });
}

