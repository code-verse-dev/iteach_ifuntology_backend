import {
  IsString,
  IsEnum,
  IsArray,
  IsNumber,
  IsOptional,
  Min,
  ValidateNested,
  ArrayMinSize,
  ValidateIf,
  IsMongoId,
  IsDefined,
} from 'class-validator';
import { Type } from 'class-transformer';
import { LessonQuizQuestionType } from 'src/models/lesson-quiz-question.schema';

export class CreateLessonQuizQuestionItemDto {
  @IsString()
  question: string;

  @IsEnum(LessonQuizQuestionType)
  type: LessonQuizQuestionType;

  @ValidateIf((o) => o.type === LessonQuizQuestionType.MULTIPLE_CHOICE)
  @IsDefined({ message: 'Options are required when type is multiple_choice' })
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(2)
  options?: string[];

  @IsDefined({ message: 'correctAnswer is required' })
  correctAnswer: string | number | boolean;

  @IsOptional()
  @IsNumber()
  @Min(1)
  points?: number;

  @IsNumber()
  order: number;
}

export class CreateLessonQuizQuestionDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateLessonQuizQuestionItemDto)
  questions: CreateLessonQuizQuestionItemDto[];

  @IsMongoId()
  lesson: string;
}
