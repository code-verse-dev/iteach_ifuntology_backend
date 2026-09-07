import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

export type ResetDocument = Reset & Document;

@Schema({ timestamps: true })
export class Reset {
  @Prop({ required: true })
  email: string;

  @Prop({ required: true })
  code: string;

  @Prop({ enum: ['student', 'admin', 'teacher'] })
  type: string;
}

export const ResetSchema = SchemaFactory.createForClass(Reset);
