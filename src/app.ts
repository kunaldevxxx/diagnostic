import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';

import routes from './routes';
import paymentRoutes from './routes/payment.routes';
import { swaggerDocument } from './config/swagger';
import { errorHandler } from './middlewares/error.middleware';
import { globalRateLimiter } from './middlewares/rateLimiter';
import { AppError } from './utils/apiError';
import { ApiResponse } from './utils/apiResponse';

const app: Application = express();

// Security & Parsing Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// HTTP Request Logger
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(':method :url :status :res[content-length] - :response-time ms'));
}

// Global Rate Limiter
app.use(globalRateLimiter);

// API Documentation (OpenAPI / Swagger UI)
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Health Check Endpoint
app.get('/health', (req: Request, res: Response) => {
  return ApiResponse.success({
    res,
    statusCode: 200,
    message: 'EVE Healthcare Diagnostic Service is healthy and operational',
    data: {
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
    },
  });
});

// Mount Routes
// Standard API router under /api
app.use('/api', routes);

// Assignment-specific direct payment paths: POST /payments/ and POST /payments/webhook/
app.use('/payments', paymentRoutes);

// Catch-all for undefined routes
app.all('*', (req: Request, res: Response, next) => {
  next(AppError.notFound(`Cannot find ${req.method} ${req.originalUrl} on this server`));
});

// Centralized Global Error Handler
app.use(errorHandler);

export default app;
