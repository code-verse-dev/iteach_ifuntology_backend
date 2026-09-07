import {
  ArrayNotEmpty,
  IsArray,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { CourseType } from 'src/models/course.schema';
import { IsStrongPassword } from 'src/common/utils/password.util';

export class CreateInvitationDto {
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsOptional()
  @IsString()
  @IsStrongPassword()
  password?: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsEnum(CourseType, { each: true })
  courseType: CourseType[];
}

export class ResetStudentPasswordDto {
  @IsString({ message: 'Password must be a string' })
  @IsStrongPassword()
  password: string;
}
