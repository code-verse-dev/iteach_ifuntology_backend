import { IsMongoId, IsNotEmpty, IsString } from 'class-validator';

export class CreateLessonProgressDto {
  @IsNotEmpty()
  @IsString()
  lessonId: string;
}

export class CompleteModuleDto {
  @IsNotEmpty()
  @IsMongoId()
  courseModuleId: string;
}
