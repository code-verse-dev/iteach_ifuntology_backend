import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsMongoId,
  IsNotEmpty,
  Min,
  ValidateNested,
} from 'class-validator';
import { CourseType } from 'src/models/course.schema';

export class AssignmentItemDto {
  @IsEnum(CourseType)
  @IsNotEmpty()
  courseType: CourseType;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  seats: number;
}

export class AssignCoursesDto {
  @IsArray()
  @ArrayMinSize(0)
  @ValidateNested({ each: true })
  @Type(() => AssignmentItemDto)
  assignments: AssignmentItemDto[];
}
