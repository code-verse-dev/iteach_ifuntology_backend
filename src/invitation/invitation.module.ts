import { Module } from '@nestjs/common';
import { InvitationService } from './invitation.service';
import { InvitationController } from './invitation.controller';
import { ModelsModule } from 'src/models/models.module';
import { SharedEmailModule } from 'src/common/modules/email.module';
import { NotificationModule } from 'src/notification/notification.module';

@Module({
  imports: [ModelsModule, SharedEmailModule, NotificationModule],
  controllers: [InvitationController],
  providers: [InvitationService],
  exports: [InvitationService],
})
export class InvitationModule {}
