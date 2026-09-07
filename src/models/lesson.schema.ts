import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import * as mongoosePaginate from 'mongoose-paginate';
import * as aggregatePaginate from 'mongoose-aggregate-paginate-v2';

export type LessonDocument = Lesson & Document;

@Schema({ timestamps: true })
export class Lesson {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'CourseModule', required: true })
  courseModule: MongooseSchema.Types.ObjectId;

  @Prop({ required: true })
  title: string;

  @Prop()
  description?: string;

  @Prop({ enum: ['PDF', 'VIDEO', 'QUIZ', 'TEST', 'EXAM'], required: true })
  type: string;

  @Prop()
  fileUrl: string;

  @Prop({ default: null })
  videoThumbnail?: string;

  @Prop({ required: true })
  order: number;

  @Prop({ required: true })
  duration: number;

  @Prop({ enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' })
  status: string;

  @Prop({ default: true })
  studentView: boolean;

  @Prop({ default: true })
  allowPdfPreview?: boolean;

  @Prop({ default: true })
  allowPdfDownload?: boolean;
}

export const LessonSchema = SchemaFactory.createForClass(Lesson);

LessonSchema.plugin(mongoosePaginate);
LessonSchema.plugin(aggregatePaginate as any);
