import { Module } from '@nestjs/common';
import { VidLibraryService } from './vid-library.service';
import { VidLibraryController } from './vid-library.controller';
import { ModelsModule } from 'src/models/models.module';

@Module({
  imports: [ModelsModule],
  controllers: [VidLibraryController],
  providers: [VidLibraryService],
})
export class VidLibraryModule {}
