import { createApp } from './app';
import { env } from './config/env';
import { markShuttingDown } from './services/readiness.service';
import { closeMongoConnection } from './services/mongo.service';
import { logger } from './utils/logger';

const app = createApp();

const server = app.listen(env.PORT, env.HOST, () => {
  logger.info('server_started', { host: env.HOST, port: env.PORT, nodeEnv: env.NODE_ENV });
});

let shuttingDown = false;
function shutdown(reason: string, exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info('shutdown_started', { reason });
  markShuttingDown(); // /ready now returns 503 so callers stop sending traffic

  const force = setTimeout(() => {
    logger.error('shutdown_forced');
    process.exit(1);
  }, 10_000);
  force.unref();

  server.close((err) => {
    if (err) {
      logger.error('shutdown_error', { message: err.message });
      process.exit(1);
    }
    void closeMongoConnection()
      .then(() => {
        logger.info('shutdown_complete');
        process.exit(exitCode);
      })
      .catch((closeError: unknown) => {
        logger.error('shutdown_error', {
          message: closeError instanceof Error ? closeError.message : 'MongoDB close failed',
        });
        process.exit(1);
      });
  });
  server.closeIdleConnections();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('unhandledRejection', (reason) => {
  logger.error('unhandled_rejection', {
    message: reason instanceof Error ? reason.message : 'unknown',
  });
  shutdown('unhandledRejection', 1);
});
process.on('uncaughtException', (err) => {
  logger.error('uncaught_exception', { message: err.message, stack: err.stack });
  shutdown('uncaughtException', 1);
});
