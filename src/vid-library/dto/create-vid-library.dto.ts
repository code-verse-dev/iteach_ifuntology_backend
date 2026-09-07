import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { CourseType } from 'src/models/course.schema';

export class CreateVidLibraryDto {
  @IsEnum(CourseType)
  @IsNotEmpty()
  courseType: CourseType;

  @IsOptional()
  @IsString()
  title?: string;
}
