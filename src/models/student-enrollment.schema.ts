import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import * as mongoosePaginate from 'mongoose-paginate';
import * as aggregatePaginate from 'mongoose-aggregate-paginate-v2';
import { CourseType } from './course.schema';

export type StudentEnrollmentDocument = StudentEnrollment & Document;

@Schema({ timestamps: true })
export class StudentEnrollment {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  teacher: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  user: MongooseSchema.Types.ObjectId;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'TeacherAssignment',
    required: true,
  })
  assignment: MongooseSchema.Types.ObjectId;

  @Prop({ enum: CourseType, required: true })
  courseType: CourseType;

  @Prop({ enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' })
  status: string;
}

export const StudentEnrollmentSchema =
  SchemaFactory.createForClass(StudentEnrollment);

StudentEnrollmentSchema.plugin(mongoosePaginate);
StudentEnrollmentSchema.plugin(aggregatePaginate as any);
