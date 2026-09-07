import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import * as mongoosePaginate from 'mongoose-paginate';
import * as aggregatePaginate from 'mongoose-aggregate-paginate-v2';
import { CourseType } from './course.schema';

export type CourseModuleDocument = CourseModule & Document;

@Schema({ timestamps: true })
export class CourseModule {
  @Prop({ enum: CourseType, required: true })
  courseType: CourseType;

  @Prop({ required: true })
  title: string;

  @Prop()
  description: string;

  @Prop({ required: true })
  order: number;

  @Prop({ enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' })
  status: string;

  @Prop({ default: true })
  studentView: boolean;

  @Prop({ required: true })
  duration: number;

  @Prop({ required: false })
  totalLessons?: number;
}

export const CourseModuleSchema = SchemaFactory.createForClass(CourseModule);

CourseModuleSchema.virtual('lessons', {
  ref: 'Lesson',
  localField: '_id',
  foreignField: 'courseModule',
});

CourseModuleSchema.plugin(mongoosePaginate);
CourseModuleSchema.plugin(aggregatePaginate as any);
