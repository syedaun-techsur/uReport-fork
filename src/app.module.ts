import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AdminModule } from './modules/admin/admin.module';
import { FormatMiddleware } from './common/middleware/format.middleware';
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
    AdminModule,
    // Feature modules imported here as they are built in subsequent waves
  ],
  providers: [
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
    // Apply FormatMiddleware to all routes globally
    consumer.apply(FormatMiddleware).forRoutes('*');
  }
}
