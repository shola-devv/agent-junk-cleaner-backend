export interface ApiSuccess<T> {
  success: true;
  data: T;
  requestId: string;
}

export interface ApiErrorPayload {
  code: string;
  message: string;
  retryable: boolean;
  details?: unknown;
}

export interface ApiFailure {
  success: false;
  error: ApiErrorPayload;
  requestId: string;
}
