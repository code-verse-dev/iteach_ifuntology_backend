import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import * as mongoosePaginate from 'mongoose-paginate';
import * as aggregatePaginate from 'mongoose-aggregate-paginate-v2';
import { CourseType } from './course.schema';

export type TeacherAssignmentDocument = TeacherAssignment & Document;

@Schema({ timestamps: true })
export class TeacherAssignment {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  teacher: MongooseSchema.Types.ObjectId;

  @Prop({ enum: CourseType, required: true })
  courseType: CourseType;

  @Prop({ required: true, min: 0, default: 0 })
  seats: number;

  @Prop({ required: true, min: 0, default: 0 })
  usedSeats: number;
}

export const TeacherAssignmentSchema =
  SchemaFactory.createForClass(TeacherAssignment);

TeacherAssignmentSchema.index({ teacher: 1, courseType: 1 }, { unique: true });
TeacherAssignmentSchema.plugin(mongoosePaginate);
TeacherAssignmentSchema.plugin(aggregatePaginate as any);
