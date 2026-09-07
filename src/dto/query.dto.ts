import {
  IsBooleanString,
  IsDateString,
  IsNumberString,
  IsOptional,
  IsString,
} from 'class-validator';

export class QueryDto {
  @IsOptional()
  @IsNumberString()
  page: number;

  @IsOptional()
  @IsNumberString()
  limit: number;

  @IsOptional()
  @IsString()
  keyword: string;

  @IsOptional()
  @IsDateString({}, { message: 'From must be a valid date string' })
  from: Date;

  @IsOptional()
  @IsDateString({}, { message: 'To must be a valid date string' })
  to: Date;

  @IsOptional()
  @IsBooleanString()
  isRead: string;

  @IsString()
  @IsOptional()
  type: string;

  @IsString()
  @IsOptional()
  status: string;

  @IsString()
  @IsOptional()
  role: string;

  @IsOptional()
  teacher: string;

  @IsString()
  @IsOptional()
  courseType: string;

  @IsString()
  @IsOptional()
  course: string;
}
