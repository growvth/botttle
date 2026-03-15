/**
 * Standard API response shapes (from Agentd).
 */

export type SuccessResponse<T> = {
  success: true;
  data: T;
};

export type ErrorResponse = {
  success: false;
  error: {
    code: string;
    message: string;
  };
};

export type ApiResponse<T> = SuccessResponse<T> | ErrorResponse;

export function success<T>(data: T): SuccessResponse<T> {
  return { success: true, data };
}

export function error(code: string, message: string): ErrorResponse {
  return { success: false, error: { code, message } };
}
