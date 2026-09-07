import { Module } from '@nestjs/common';
import { LessonQuizResponseService } from './lesson-quiz-response.service';
import { LessonQuizResponseController } from './lesson-quiz-response.controller';
import { ModelsModule } from 'src/models/models.module';
import { NotificationModule } from 'src/notification/notification.module';
import { CourseQuizModule } from 'src/lesson/course-quiz.module';

@Module({
  imports: [ModelsModule, NotificationModule, CourseQuizModule],
  controllers: [LessonQuizResponseController],
  providers: [LessonQuizResponseService],
})
export class LessonQuizResponseModule {}
