import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { GelfLoggerModule } from './common/logger/gelf-logger.module';
import { GelfRequestMiddleware } from './common/middleware/gelf-request.middleware';
import { GelfExceptionFilter } from './common/filters/gelf-exception.filter';
import { FormatMiddleware } from './common/middleware/format.middleware';
import { AuthMiddleware } from './common/middleware/auth.middleware';
import { SerializationInterceptor } from './common/interceptors/serialization.interceptor';
import { JsonSerializer } from './common/serializers/json.serializer';
import { XmlSerializer } from './common/serializers/xml.serializer';
import { CsvSerializer } from './common/serializers/csv.serializer';
import { TxtSerializer } from './common/serializers/txt.serializer';
import { HtmlRenderer } from './common/serializers/html.renderer';
import { CaslGuard } from './common/guards/casl.guard';
import { AuthGuard } from './common/guards/auth.guard';
import { PiiMaskInterceptor } from './common/interceptors/pii-mask.interceptor';
import { AuthModule } from './modules/auth/auth.module';
import { AdminModule } from './modules/admin/admin.module';
import { PeopleModule } from './modules/people/people.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { DepartmentsModule } from './modules/departments/departments.module';
import { Open311Module } from './modules/open311/open311.module';
import { TicketsModule } from './modules/tickets/tickets.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    GelfLoggerModule,
    AdminModule,
    AuthModule,
    PeopleModule,
    CategoriesModule,
    DepartmentsModule,
    TicketsModule,     // Wave 4a: full ticket lifecycle (plan 09)
    Open311Module,     // Wave 4c: GeoReport v2 public API
    // Wave 5: SearchModule, NotificationsModule, MediaModule, GeoModule
    // Wave 6: BookmarksModule, ReportsModule
  ],
  providers: [
    // Serialization
    JsonSerializer,
    XmlSerializer,
    CsvSerializer,
    TxtSerializer,
    HtmlRenderer,
    {
      provide: APP_INTERCEPTOR,
      useClass: SerializationInterceptor,
    },
    // Exception filter (GELF)
    {
      provide: APP_FILTER,
      useClass: GelfExceptionFilter,
    },
    // RBAC providers — registered here so controllers can inject them via @UseGuards/@UseInterceptors
    CaslGuard,
    AuthGuard,
    PiiMaskInterceptor,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    // Order matters: FormatMiddleware first, then GELF request logging, then AuthMiddleware
    // express-session is wired in main.ts (before NestJS middleware pipeline)
    consumer
      .apply(FormatMiddleware, GelfRequestMiddleware, AuthMiddleware)
      .forRoutes('*');
  }
}
