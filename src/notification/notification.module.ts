import { Module } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { NotificationController } from './notification.controller';
import { ModelsModule } from 'src/models/models.module';
import { GatewayModule } from 'src/gateway/gateway.module';
import {
  Notification,
  NotificationSchema,
} from 'src/models/notification.schema';
import { MongooseModule } from '@nestjs/mongoose';

@Module({
  imports: [
    ModelsModule,
    GatewayModule,
    MongooseModule.forFeature([
      { name: Notification.name, schema: NotificationSchema },
    ]),
  ],
  controllers: [NotificationController],
  providers: [NotificationService],
  exports: [NotificationService],
})
export class NotificationModule {}
