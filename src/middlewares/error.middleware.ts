import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/apiError';
import { ApiResponse } from '../utils/apiResponse';
import { logger } from '../config/logger';

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): any => {
  // Operational AppError
  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error(`${err.message} - ${req.method} ${req.originalUrl}`, err);
    } else {
      logger.warn(`[${err.statusCode}] ${err.message} - ${req.method} ${req.originalUrl}`);
    }

    return ApiResponse.error({
      res,
      statusCode: err.statusCode,
      message: err.message,
      errors: err.details,
    });
  }

  // Handle JSON parse errors from body-parser
  if (err instanceof SyntaxError && 'body' in err) {
    logger.warn(`Malformed JSON body in request: ${err.message}`);
    return ApiResponse.error({
      res,
      statusCode: 400,
      message: 'Invalid JSON payload received in request body',
    });
  }

  // Handle Prisma Known Errors
  if (err.code === 'P2002') {
    const target = Array.isArray(err.meta?.target) ? err.meta.target.join(', ') : 'field';
    return ApiResponse.error({
      res,
      statusCode: 409,
      message: `A record with this ${target} already exists.`,
    });
  }

  if (err.code === 'P2025') {
    return ApiResponse.error({
      res,
      statusCode: 404,
      message: 'The requested record was not found.',
    });
  }

  // Fallback for unhandled unexpected errors
  logger.error(`Unhandled Exception: ${err.message} - Stack: ${err.stack}`, {
    method: req.method,
    url: req.originalUrl,
    body: req.body,
  });

  return ApiResponse.error({
    res,
    statusCode: 500,
    message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
    errors: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
};
