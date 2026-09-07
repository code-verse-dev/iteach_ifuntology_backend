import { Module } from '@nestjs/common';
import { SeedService } from './seed.service';
import { ModelsModule } from 'src/models/models.module';

@Module({
  imports: [ModelsModule],
  providers: [SeedService],
})
export class SeedModule {}
