import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { CourseType } from 'src/models/course.schema';

export class CreateCourseModuleDto {
  @IsEnum(CourseType)
  @IsNotEmpty()
  courseType: CourseType;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsNotEmpty()
  order: number;

  @IsOptional()
  @IsEnum(['ACTIVE', 'INACTIVE'])
  status?: 'ACTIVE' | 'INACTIVE';

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsNotEmpty()
  duration: number;
}
