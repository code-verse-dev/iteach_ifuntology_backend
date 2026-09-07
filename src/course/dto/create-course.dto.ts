import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { CourseType } from 'src/models/course.schema';

export class CreateCourseDto {
  @IsEnum(CourseType, {
    message:
      'courseType must be one of: Funtology, Barbertology, Skintology, Nailtology',
  })
  courseType: CourseType;

  @IsArray()
  @IsString({ each: true })
  features: string[];

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(4)
  sortOrder: number;

  @IsOptional()
  @IsNotEmpty()
  description: string;
}
