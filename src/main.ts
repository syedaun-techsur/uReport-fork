import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import * as session from 'express-session';
import { Redis } from 'ioredis';
import { AppModule } from './app.module';
import { GelfLoggerService } from './common/logger/gelf-logger.service';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const RedisStore = require('connect-redis').default;

/**
 * Attempt to connect to Redis and return a RedisStore if successful.
 * Falls back to undefined (MemoryStore) if Redis is unavailable.
 */
async function createSessionStore(): Promise<session.Store | undefined> {
  return new Promise((resolve) => {
    const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';
    const redisClient = new Redis(redisUrl, {
      // Do not retry — fail fast so the fallback kicks in immediately
      maxRetriesPerRequest: 0,
      retryStrategy: () => null,
      enableOfflineQueue: false,
      lazyConnect: true,
    });

    const cleanup = (store?: session.Store) => {
      redisClient.removeAllListeners();
      resolve(store);
    };

    redisClient.once('ready', () => {
      console.log('[session] Redis connected — using RedisStore');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      cleanup(new RedisStore({ client: redisClient }) as session.Store);
    });

    redisClient.once('error', (err: Error) => {
      console.warn(
        `[session] Redis unavailable (${err.message}) — falling back to MemoryStore`,
      );
      void redisClient.disconnect();
      cleanup(undefined);
    });

    // Initiate the connection (lazyConnect means it doesn't auto-connect)
    redisClient.connect().catch(() => {
      // error event fires separately; ignore the promise rejection here
    });

    // Safety timeout: if neither event fires within 3 s, fall back
    setTimeout(() => {
      console.warn('[session] Redis connection timed out — falling back to MemoryStore');
      void redisClient.disconnect();
      cleanup(undefined);
    }, 3000);
  });
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  // Register GelfLoggerService as the application logger (F14)
  app.useLogger(app.get(GelfLoggerService));

  // Global validation pipe (TechArch §5.5)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,  // Open311 compat: jurisdiction_id, device_id accepted and ignored
      transform: true,
    }),
  );

  // Redis-backed session store with MemoryStore fallback (TechArch §5.2, §6.3)
  const sessionStore = await createSessionStore();

  app.use(
    session({
      // sessionStore is undefined when Redis is unavailable → express-session uses built-in MemoryStore
      ...(sessionStore ? { store: sessionStore } : {}),
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
