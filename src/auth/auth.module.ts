import { Global, Module } from '@nestjs/common';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { ModelsModule } from 'src/models/models.module';

@Global()
@Module({
  imports: [ModelsModule],
  providers: [JwtAuthGuard],
  exports: [JwtAuthGuard],
})
export class AuthModule {}
