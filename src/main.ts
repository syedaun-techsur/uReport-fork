import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import * as session from 'express-session';
import { Redis } from 'ioredis';
import { AppModule } from './app.module';
import { GelfLoggerService } from './common/logger/gelf-logger.service';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const RedisStore = require('connect-redis').default;

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

  // Redis-backed session store (TechArch §5.2, §6.3)
  const redisClient = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379');
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  const redisStore = new RedisStore({ client: redisClient }) as session.Store;

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
