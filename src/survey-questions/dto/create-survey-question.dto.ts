import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { QuestionType } from 'src/models/survey-question.schema';

export class CreateSurveyQuestionDto {
  @IsString()
  @IsNotEmpty()
  question: string;

  @IsEnum(QuestionType)
  type: QuestionType;

  @IsOptional()
  options?: string[];

  @IsOptional()
  required?: boolean;

  @IsOptional()
  order?: number;
}
