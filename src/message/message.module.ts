import { Module } from '@nestjs/common';
import { MessageService } from './message.service';
import { MessageController } from './message.controller';
import { ModelsModule } from 'src/models/models.module';
import { GatewayModule } from 'src/gateway/gateway.module';

@Module({
  imports: [ModelsModule, GatewayModule],
  controllers: [MessageController],
  providers: [MessageService],
})
export class MessageModule {}
