import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import * as mongoosePaginate from 'mongoose-paginate';
import * as aggregatePaginate from 'mongoose-aggregate-paginate-v2';

export type SurveyQuestionDocument = SurveyQuestion & Document;

export enum QuestionType {
  TEXT = 'text',
  MULTIPLE_CHOICE = 'multiple_choice',
  RATING = 'rating',
  YES_NO = 'yes_no',
}

@Schema({ timestamps: true })
export class SurveyQuestion {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Survey',
    required: true,
  })
  survey: MongooseSchema.Types.ObjectId;

  @Prop({ required: true })
  question: string;

  @Prop({
    enum: QuestionType,
    required: true,
  })
  type: QuestionType;

  @Prop({ type: [String] })
  options: string[];

  @Prop({ default: false })
  required: boolean;

  @Prop()
  order: number;
}

export const SurveyQuestionSchema = SchemaFactory.createForClass(SurveyQuestion);

SurveyQuestionSchema.plugin(mongoosePaginate);
SurveyQuestionSchema.plugin(aggregatePaginate as any);
