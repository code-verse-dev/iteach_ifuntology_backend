import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

function toOptionalBoolean(value: unknown): boolean | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (value === true || value === 'true') return true;
  if (value === false || value === 'false') return false;
  return undefined;
}

export class CreateLessonDto {
  @IsMongoId()
  @IsNotEmpty()
  courseModule: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(['PDF', 'VIDEO', 'QUIZ', 'TEST', 'EXAM'], {
    message: 'type must be PDF, VIDEO, QUIZ, TEST, or EXAM',
  })
  @IsNotEmpty()
  type: 'PDF' | 'VIDEO' | 'QUIZ' | 'TEST' | 'EXAM';

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsNotEmpty()
  order: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsNotEmpty()
  duration: number;

  @IsOptional()
  @Transform(({ value }) => toOptionalBoolean(value))
  @IsBoolean()
  allowPdfPreview?: boolean;

  @IsOptional()
  @Transform(({ value }) => toOptionalBoolean(value))
  @IsBoolean()
  allowPdfDownload?: boolean;
}
