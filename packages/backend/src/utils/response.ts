import { Response } from 'express';

interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
}

export const successResponse = <T>(res: Response, message: string, data?: T): Response => {
  const response: ApiResponse<T> = {
    success: true,
    message,
    ...(data !== undefined && { data }),
  };
  return res.json(response);
};

export const errorResponse = (res: Response, message: string, statusCode = 400): Response => {
  return res.status(statusCode).json({
    success: false,
    message,
  });
};

export const serverError = (res: Response, error: unknown): Response => {
  console.error('Server Error:', error);
  return res.status(500).json({
    success: false,
    message: '服务器内部错误',
  });
};
