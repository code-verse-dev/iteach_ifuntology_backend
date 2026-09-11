import { Type } from 'class-transformer';
import {
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class SaveDailyPracticalEntryDto {
  @IsObject()
  cells: Record<string, string>;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  timezone?: string;
}

export class PracticalCreditRowDto {
  @IsObject()
  cells: Record<string, string>;

  @IsOptional()
  @IsString()
  entryDate?: string;
}

export class UpdatePracticalCreditSheetDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => PracticalCreditRowDto)
  rows?: PracticalCreditRowDto[];
}
