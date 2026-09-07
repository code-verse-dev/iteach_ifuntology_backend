import {
  IsString,
  IsEnum,
  IsBoolean,
  IsOptional,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { SurveyType } from 'src/models/survey.schema';
import { UserRole } from 'src/models/user.schema';
import { QuestionType } from 'src/models/survey-question.schema';

export class CreateSurveyQuestionInlineDto {
  @IsString()
  question: string;

  @IsEnum(QuestionType)
  type: QuestionType;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  options?: string[];

  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @IsOptional()
  order?: number;
}

export class CreateSurveyDto {
  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsEnum(SurveyType)
  type: SurveyType;

  @IsEnum(UserRole)
  targetRole: UserRole;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSurveyQuestionInlineDto)
  questions?: CreateSurveyQuestionInlineDto[];
}
