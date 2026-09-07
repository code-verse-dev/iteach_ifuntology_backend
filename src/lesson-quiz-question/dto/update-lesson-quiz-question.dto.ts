import { PartialType } from '@nestjs/mapped-types';
import { CreateLessonQuizQuestionItemDto } from './create-lesson-quiz-question.dto';

export class UpdateLessonQuizQuestionDto extends PartialType(
  CreateLessonQuizQuestionItemDto,
) {}
