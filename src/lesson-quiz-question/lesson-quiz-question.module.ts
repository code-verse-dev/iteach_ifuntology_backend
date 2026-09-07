import { Module } from '@nestjs/common';
import { LessonQuizQuestionService } from './lesson-quiz-question.service';
import { LessonQuizQuestionController } from './lesson-quiz-question.controller';
import { ModelsModule } from 'src/models/models.module';

@Module({
  imports: [ModelsModule],
  controllers: [LessonQuizQuestionController],
  providers: [LessonQuizQuestionService],
  exports: [LessonQuizQuestionService],
})
export class LessonQuizQuestionModule {}
