import app from './app';
import { env } from './config/env';
import { prisma } from './config/prisma';
import { logger } from './config/logger';

const PORT = env.PORT || 5000;

const startServer = async () => {
  try {
    // Verify database connection
    await prisma.$connect();
    logger.info(' Connected to PostgreSQL database successfully.');

    const server = app.listen(PORT, () => {
      logger.info(` EVE Healthcare Diagnostic Service running on port ${PORT}`);
      logger.info(` Swagger Documentation available at: http://localhost:${PORT}/api-docs`);
      logger.info(` Healthcheck available at: http://localhost:${PORT}/health`);
    });

    // Graceful Shutdown
    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}. Shutting down gracefully...`);
      server.close(async () => {
        await prisma.$disconnect();
        logger.info('Database connection closed. Process terminated.');
        process.exit(0);
      });

      // Force exit after 10s if connections refuse to close
      setTimeout(() => {
        logger.error('Forced shutdown due to timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
