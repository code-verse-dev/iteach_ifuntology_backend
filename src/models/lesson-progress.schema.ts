import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import * as mongoosePaginate from 'mongoose-paginate';
import * as aggregatePaginate from 'mongoose-aggregate-paginate-v2';
import { CourseType } from './course.schema';

export type LessonProgressDocument = LessonProgress & Document;

@Schema({ timestamps: true })
export class LessonProgress {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  student: MongooseSchema.Types.ObjectId;

  @Prop({ enum: CourseType, required: true })
  courseType: CourseType;

  @Prop({ type: [MongooseSchema.Types.ObjectId], ref: 'Lesson', default: [] })
  completedLessons: MongooseSchema.Types.ObjectId[];

  @Prop({
    type: [MongooseSchema.Types.ObjectId],
    ref: 'CourseModule',
    default: [],
  })
  completedModules: MongooseSchema.Types.ObjectId[];

  @Prop({ default: 0 })
  progressPercentage: number;
}

export const LessonProgressSchema = SchemaFactory.createForClass(LessonProgress);

LessonProgressSchema.plugin(mongoosePaginate);
LessonProgressSchema.plugin(aggregatePaginate as any);
