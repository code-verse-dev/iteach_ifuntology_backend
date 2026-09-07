import { Module } from '@nestjs/common';
import { MyGateway } from './gateway';
import { ModelsModule } from 'src/models/models.module';

@Module({
  imports: [ModelsModule],
  providers: [MyGateway],
  exports: [MyGateway],
})
export class GatewayModule {}
