import { IsArray, IsMongoId, IsNotEmpty } from 'class-validator';

export class CreateSurveyAnswerDto {
  @IsArray()
  answers: AnswerDto[];
}

export class AnswerDto {
  @IsMongoId()
  @IsNotEmpty()
  question: string;

  @IsNotEmpty()
  answer: any;
}
