import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { User, UserSchema } from '../models/user.schema';
import { MongooseModule } from '@nestjs/mongoose';
import { ModelsModule } from 'src/models/models.module';
import { NotificationModule } from 'src/notification/notification.module';
import { SharedEmailModule } from 'src/common/modules/email.module';

@Module({
  imports: [
    ModelsModule,
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    NotificationModule,
    SharedEmailModule,
  ],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService, MongooseModule],
})
export class UserModule {}
