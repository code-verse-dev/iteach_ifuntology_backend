import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import * as mongoosePaginate from 'mongoose-paginate';
import * as aggregatePaginate from 'mongoose-aggregate-paginate-v2';

export enum CourseType {
  FUNTOLOGY = 'Funtology',
  BARBERTOLOGY = 'Barbertology',
  SKINTOLOGY = 'Skintology',
  NAILTOLOGY = 'Nailtology',
}

export type CourseDocument = Course & Document;

@Schema({ timestamps: true })
export class Course {
  @Prop({ required: true, unique: true, enum: CourseType })
  courseType: CourseType;

  @Prop({ type: [String], default: [] })
  features: string[];

  @Prop({ required: true, min: 1, max: 4 })
  sortOrder: number;

  @Prop()
  image: string;

  @Prop()
  description: string;
}

export const CourseSchema = SchemaFactory.createForClass(Course);

CourseSchema.plugin(mongoosePaginate);
CourseSchema.plugin(aggregatePaginate as any);
