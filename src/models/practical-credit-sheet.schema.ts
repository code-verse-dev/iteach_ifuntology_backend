import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { CourseType } from './course.schema';

export type PracticalCreditSheetDocument = PracticalCreditSheet & Document;

@Schema({ _id: false })
export class PracticalCreditRow {
  @Prop({ required: false, trim: true })
  entryDate?: string;

  @Prop({ type: Map, of: String, default: {} })
  cells!: Map<string, string>;

  @Prop({ default: false })
  approved!: boolean;

  @Prop({ required: false })
  approvedAt?: Date;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: false })
  approvedBy?: MongooseSchema.Types.ObjectId;
}

export const PracticalCreditRowSchema =
  SchemaFactory.createForClass(PracticalCreditRow);

@Schema({ timestamps: true })
export class PracticalCreditSheet {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  student!: MongooseSchema.Types.ObjectId;

  @Prop({ enum: CourseType, required: true })
  courseType!: CourseType;

  @Prop({ default: '' })
  name!: string;

  @Prop({ type: [PracticalCreditRowSchema], default: [] })
  rows!: PracticalCreditRow[];
}

export const PracticalCreditSheetSchema =
  SchemaFactory.createForClass(PracticalCreditSheet);

PracticalCreditSheetSchema.index({ student: 1, courseType: 1 }, { unique: true });
