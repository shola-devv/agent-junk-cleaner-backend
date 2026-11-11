import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { env } from './config/env';
import { errorHandler } from './middleware/errorHandler';
import { notFound } from './middleware/notFound';
import { requestId } from './middleware/requestId';
import { requestLogger } from './middleware/requestLogger';
import { routes } from './routes';
import { AppError } from './utils/appError';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', env.TRUST_PROXY_HOPS);

  app.use(requestId);
  app.use(requestLogger);
  app.use(helmet());
  app.use(
    cors({
      origin(origin, callback) {
        // No Origin header = non-browser caller (Electron main process, curl). CORS does not apply.
        if (!origin || env.ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
        callback(new AppError('CORS_NOT_ALLOWED', 'This origin is not allowed.', 403, false));
      },
      methods: ['GET', 'POST', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'X-Request-Id'],
      exposedHeaders: ['X-Request-Id', 'RateLimit', 'RateLimit-Policy', 'Retry-After'],
      maxAge: 600,
    }),
  );
  app.use(express.json({ limit: env.REQUEST_BODY_LIMIT }));

  app.use(routes);
  app.use(notFound);
  app.use(errorHandler);
  return app;
}
