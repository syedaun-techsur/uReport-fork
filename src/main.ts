import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import * as session from 'express-session';
import { Redis } from 'ioredis';
import { AppModule } from './app.module';
import { GelfLoggerService } from './common/logger/gelf-logger.service';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const connectRedis = require('connect-redis') as { default: new (opts: { client: unknown }) => import('express-session').Store };
// connect-redis v7 CJS: .default is the RedisStore class
const RedisStore = connectRedis.default;

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  // Register GelfLoggerService as the application logger (F14)
  app.useLogger(app.get(GelfLoggerService));

  // Global validation pipe (TechArch §5.5)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false, // Open311 compat: jurisdiction_id, device_id accepted and ignored
      transform: true,
    }),
  );

  // Redis-backed session store (TechArch §5.2, §6.3)
  const redisClient = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
    // Suppress unhandled-error events during reconnect storms; NestJS logs these via GELF.
    // Without this listener ioredis emits to process 'error' which crashes Node in some versions.
    lazyConnect: false,
    maxRetriesPerRequest: null,
    enableOfflineQueue: true,
  });
  // Attach an error listener so ioredis reconnect errors don't become unhandled exceptions.
  redisClient.on('error', (err: Error) => {
    // Non-fatal: ioredis will reconnect automatically; sessions degrade gracefully.
    console.warn('[redis] connection error (non-fatal):', err.message);
  });
  const redisStore = new RedisStore({ client: redisClient });

  app.use(
    session({
      store: redisStore,
      secret: process.env.SESSION_SECRET ?? 'dev-secret-change-in-prod',
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: parseInt(process.env.SESSION_TTL_SECONDS ?? '3600', 10) * 1000,
      },
    }),
  );

  const port = process.env.PORT ?? 3000;
  await app.listen(port, '0.0.0.0');
}
bootstrap();
