import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import * as mongoosePaginate from 'mongoose-paginate';
import * as aggregatePaginate from 'mongoose-aggregate-paginate-v2';
import { CourseType } from './course.schema';

export type InvitationDocument = Invitation & Document;

@Schema({ timestamps: true })
export class Invitation {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  teacher: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'TeacherAssignment' })
  assignment: MongooseSchema.Types.ObjectId;

  @Prop()
  email: string;

  @Prop({ enum: CourseType })
  courseType: CourseType;

  @Prop({ enum: ['PENDING', 'ACCEPTED', 'EXPIRED'], default: 'ACCEPTED' })
  status: string;
}

export const InvitationSchema = SchemaFactory.createForClass(Invitation);

InvitationSchema.plugin(mongoosePaginate);
InvitationSchema.plugin(aggregatePaginate as any);
