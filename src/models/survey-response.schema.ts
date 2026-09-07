import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import * as mongoosePaginate from 'mongoose-paginate';
import * as aggregatePaginate from 'mongoose-aggregate-paginate-v2';

export type SurveyResponseDocument = SurveyResponse & Document;

@Schema({ timestamps: true })
export class SurveyResponse {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Survey', required: true })
  survey: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  user: MongooseSchema.Types.ObjectId;

  @Prop([
    {
      question: {
        type: MongooseSchema.Types.ObjectId,
        ref: 'SurveyQuestion',
      },
      answer: MongooseSchema.Types.Mixed,
    },
  ])
  answers: {
    question: MongooseSchema.Types.ObjectId;
    answer: any;
  }[];
}

export const SurveyResponseSchema = SchemaFactory.createForClass(SurveyResponse);

SurveyResponseSchema.plugin(mongoosePaginate);
SurveyResponseSchema.plugin(aggregatePaginate as any);
