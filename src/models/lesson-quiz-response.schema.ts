import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import * as mongoosePaginate from 'mongoose-paginate';
import * as aggregatePaginate from 'mongoose-aggregate-paginate-v2';

export type LessonQuizResponseDocument = LessonQuizResponse & Document;

@Schema({ timestamps: true })
export class LessonQuizResponse {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Lesson', required: true })
  lesson: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  user: MongooseSchema.Types.ObjectId;

  @Prop([
    {
      question: {
        type: MongooseSchema.Types.ObjectId,
        ref: 'LessonQuizQuestion',
        required: true,
      },
      answer: MongooseSchema.Types.Mixed,
    },
  ])
  answers: {
    question: MongooseSchema.Types.ObjectId;
    answer: number | string | boolean;
  }[];

  @Prop({ default: 0 })
  score: number;

  @Prop({ default: 0 })
  totalPoints: number;

  @Prop({ default: 0 })
  percentage: number;
}

export const LessonQuizResponseSchema =
  SchemaFactory.createForClass(LessonQuizResponse);
LessonQuizResponseSchema.plugin(mongoosePaginate);
LessonQuizResponseSchema.plugin(aggregatePaginate as any);
