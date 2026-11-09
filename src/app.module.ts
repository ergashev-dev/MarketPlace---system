import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { AuthModule } from './auth/auth.module.js';
import { CategoriesModule } from './categories/categories.module.js';
import { UsersModule } from './users/users.module.js';
import { PropertiesModule } from './properties/properties.module.js';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { AdminModule } from './admin/admin.module.js';
import { FavoritesModule } from './favorites/favorites.module.js';
import { InquiriesModule } from './inquiries/inquiries.module.js';
import { NotificationsModule } from './notifications/notifications.module.js';
import { AuditModule } from './audit/audit.module.js';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { GLOBAL_THROTTLE } from './common/throttle.config.js';

@Module({
  imports: [
    ThrottlerModule.forRoot([GLOBAL_THROTTLE]),
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'uploads'),
      serveRoot: '/uploads',
    }),
    PrismaModule,
    AuthModule,
    CategoriesModule,
    UsersModule,
    PropertiesModule,
    AdminModule,
    FavoritesModule,
    InquiriesModule,
    NotificationsModule,
    AuditModule,
  ],
  controllers: [AppController],
  providers: [AppService, { provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}