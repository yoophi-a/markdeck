export type DesktopErrorCode =
  | 'UNKNOWN_ERROR'
  | 'UNSAFE_PATH'
  | 'NOT_FOUND'
  | 'PERMISSION_DENIED'
  | 'INVALID_INPUT'
  | 'IPC_UNAVAILABLE'
  | 'CONTENT_ROOT_NOT_SET';

export interface DesktopApiErrorPayload {
  code: DesktopErrorCode;
  message: string;
}

export type DesktopApiResult<T> = { ok: true; data: T } | { ok: false; error: DesktopApiErrorPayload };

export class DesktopApiError extends Error {
  code: DesktopErrorCode;

  constructor(error: DesktopApiErrorPayload) {
    super(error.message);
    this.name = 'DesktopApiError';
    this.code = error.code;
  }
}
