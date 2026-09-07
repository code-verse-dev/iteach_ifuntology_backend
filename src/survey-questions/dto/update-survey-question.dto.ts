import { PartialType } from '@nestjs/mapped-types';
import { CreateSurveyQuestionDto } from './create-survey-question.dto';

export class UpdateSurveyQuestionDto extends PartialType(
  CreateSurveyQuestionDto,
) {}
