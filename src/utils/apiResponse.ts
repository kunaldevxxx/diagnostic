import { Response } from 'express';

export interface ApiResponseOptions<T> {
  res: Response;
  statusCode?: number;
  message?: string;
  data?: T;
  meta?: Record<string, any>;
}

export class ApiResponse {
  static success<T>({
    res,
    statusCode = 200,
    message = 'Success',
    data,
    meta,
  }: ApiResponseOptions<T>) {
    return res.status(statusCode).json({
      success: true,
      message,
      data: data ?? null,
      ...(meta ? { meta } : {}),
    });
  }

  static error({
    res,
    statusCode = 500,
    message = 'Internal Server Error',
    errors,
  }: {
    res: Response;
    statusCode?: number;
    message?: string;
    errors?: any;
  }) {
    return res.status(statusCode).json({
      success: false,
      message,
      errors: errors ?? null,
    });
  }
}
