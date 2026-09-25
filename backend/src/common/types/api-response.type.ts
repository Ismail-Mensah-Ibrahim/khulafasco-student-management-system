export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  requestId: string;
  timestamp: string;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}
