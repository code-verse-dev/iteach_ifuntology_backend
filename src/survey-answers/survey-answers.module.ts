import { Module } from '@nestjs/common';
import { SurveyAnswersService } from './survey-answers.service';
import { SurveyAnswersController } from './survey-answers.controller';
import { ModelsModule } from 'src/models/models.module';
import { NotificationModule } from 'src/notification/notification.module';

@Module({
  imports: [ModelsModule, NotificationModule],
  controllers: [SurveyAnswersController],
  providers: [SurveyAnswersService],
})
export class SurveyAnswersModule {}
