import { Module } from '@nestjs/common';
import { LessonProgressService } from './lesson-progress.service';
import { LessonProgressController } from './lesson-progress.controller';
import { ModelsModule } from 'src/models/models.module';
import { NotificationModule } from 'src/notification/notification.module';

@Module({
  imports: [ModelsModule, NotificationModule],
  controllers: [LessonProgressController],
  providers: [LessonProgressService],
})
export class LessonProgressModule {}
