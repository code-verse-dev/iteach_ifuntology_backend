import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { UserRole } from './user.schema';
import * as mongoosePaginate from 'mongoose-paginate';
import * as aggregatePaginate from 'mongoose-aggregate-paginate-v2';

export type SurveyDocument = Survey & Document;

export enum SurveyType {
  FEEDBACK = 'feedback',
  SATISFACTION = 'satisfaction',
  EVALUATION = 'evaluation',
}

@Schema({ timestamps: true })
export class Survey {
  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  description: string;

  @Prop({
    type: String,
    enum: SurveyType,
    required: true,
  })
  type: SurveyType;

  @Prop({
    type: String,
    enum: UserRole,
    required: true,
  })
  targetRole: UserRole;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
  createdBy: MongooseSchema.Types.ObjectId;
}

export const SurveySchema = SchemaFactory.createForClass(Survey);

SurveySchema.plugin(mongoosePaginate);
SurveySchema.plugin(aggregatePaginate as any);
