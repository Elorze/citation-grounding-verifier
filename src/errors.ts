export type ErrorCode =
  | 'INVALID_REQUEST'
  | 'PAYLOAD_TOO_LARGE'
  | 'MODEL_OUTPUT_INVALID'
  | 'UPSTREAM_TIMEOUT'
  | 'UPSTREAM_ERROR'
  | 'INTERNAL_ERROR';

export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly status: number,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function toErrorBody(err: AppError): {
  error: { code: string; message: string; details?: unknown };
} {
  const body: { error: { code: string; message: string; details?: unknown } } =
    {
      error: { code: err.code, message: err.message },
    };
  if (err.details !== undefined) body.error.details = err.details;
  return body;
}
