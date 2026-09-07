import { forwardRef, Module } from '@nestjs/common';
import { ResetService } from './reset.service';
import { ResetController } from './reset.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Reset, ResetSchema } from '../models/reset.schema';
import { UserModule } from 'src/user/user.module';
import { SharedEmailModule } from 'src/common/modules/email.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Reset.name, schema: ResetSchema }]),
    forwardRef(() => UserModule),
    SharedEmailModule,
  ],
  controllers: [ResetController],
  providers: [ResetService],
})
export class ResetModule {}
