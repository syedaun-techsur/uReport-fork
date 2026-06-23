import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { APP_INTERCEPTOR, APP_FILTER } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AdminModule } from './modules/admin/admin.module';
import { FormatMiddleware } from './common/middleware/format.middleware';
import { GelfRequestMiddleware } from './common/middleware/gelf-request.middleware';
import { GelfLoggerModule } from './common/logger/gelf-logger.module';
import { GelfExceptionFilter } from './common/filters/gelf-exception.filter';
import { AuthModule } from './modules/auth/auth.module';
import { SerializationInterceptor } from './common/interceptors/serialization.interceptor';
import { JsonSerializer } from './common/serializers/json.serializer';
import { XmlSerializer } from './common/serializers/xml.serializer';
import { CsvSerializer } from './common/serializers/csv.serializer';
import { TxtSerializer } from './common/serializers/txt.serializer';
import { HtmlRenderer } from './common/serializers/html.renderer';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    GelfLoggerModule,
    AuthModule,
    AdminModule,
    // Feature modules added here in subsequent waves
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: GelfExceptionFilter,
    },
    JsonSerializer,
    XmlSerializer,
    CsvSerializer,
    TxtSerializer,
    HtmlRenderer,
    {
      provide: APP_INTERCEPTOR,
      useClass: SerializationInterceptor,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    // Apply GelfRequestMiddleware first for request logging (F14)
    consumer.apply(GelfRequestMiddleware).forRoutes('*');
    // Apply FormatMiddleware to all routes globally
    consumer.apply(FormatMiddleware).forRoutes('*');
  }
}
