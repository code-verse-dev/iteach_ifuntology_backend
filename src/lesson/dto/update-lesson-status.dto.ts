import { IsIn, IsNotEmpty } from 'class-validator';

export class UpdateLessonStatusDto {
  @IsNotEmpty({ message: 'Status is required' })
  @IsIn(['ACTIVE', 'INACTIVE'], { message: 'Status must be ACTIVE or INACTIVE' })
  status: 'ACTIVE' | 'INACTIVE';
}
