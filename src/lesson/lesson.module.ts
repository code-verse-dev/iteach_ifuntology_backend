import { Module } from '@nestjs/common';
import { LessonService } from './lesson.service';
import { LessonController } from './lesson.controller';
import { ModelsModule } from 'src/models/models.module';
import { CourseQuizModule } from './course-quiz.module';

@Module({
  imports: [ModelsModule, CourseQuizModule],
  controllers: [LessonController],
  providers: [LessonService],
  exports: [LessonService, CourseQuizModule],
})
export class LessonModule {}
