import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import * as mongoosePaginate from 'mongoose-paginate';
import * as aggregatePaginate from 'mongoose-aggregate-paginate-v2';

export type LessonQuizQuestionDocument = LessonQuizQuestion & Document;

export enum LessonQuizQuestionType {
  MULTIPLE_CHOICE = 'multiple_choice',
  TRUE_FALSE = 'true_false',
  SHORT_ANSWER = 'short_answer',
}

@Schema({ timestamps: true })
export class LessonQuizQuestion {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Lesson', required: true })
  lesson: MongooseSchema.Types.ObjectId;

  @Prop({ required: true })
  question: string;

  @Prop({ enum: LessonQuizQuestionType, required: true })
  type: LessonQuizQuestionType;

  @Prop({ type: [String], default: [] })
  options: string[];

  @Prop({ required: true })
  correctAnswer: MongooseSchema.Types.Mixed;

  @Prop({ default: 1 })
  points: number;

  @Prop({ required: true })
  order: number;
}

export const LessonQuizQuestionSchema =
  SchemaFactory.createForClass(LessonQuizQuestion);
LessonQuizQuestionSchema.plugin(mongoosePaginate);
LessonQuizQuestionSchema.plugin(aggregatePaginate as any);
