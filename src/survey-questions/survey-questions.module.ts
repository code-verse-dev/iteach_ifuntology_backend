import { Module } from '@nestjs/common';
import { SurveyQuestionsService } from './survey-questions.service';
import { SurveyQuestionsController } from './survey-questions.controller';
import { ModelsModule } from 'src/models/models.module';

@Module({
  imports: [ModelsModule],
  controllers: [SurveyQuestionsController],
  providers: [SurveyQuestionsService],
})
export class SurveyQuestionsModule {}
