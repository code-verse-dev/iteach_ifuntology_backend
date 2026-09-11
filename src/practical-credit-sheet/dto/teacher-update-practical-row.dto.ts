import { IsBoolean, IsObject, IsOptional } from 'class-validator';

export class TeacherUpdatePracticalRowDto {
  @IsOptional()
  @IsObject()
  cells?: Record<string, string>;

  @IsOptional()
  @IsBoolean()
  approve?: boolean;
}
