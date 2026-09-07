import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import * as aggregatePaginate from 'mongoose-aggregate-paginate-v2';
import { CourseType } from './course.schema';

export type VidLibraryDocument = VidLibrary & Document;

@Schema({ timestamps: true })
export class VidLibrary {
  @Prop({
    type: String,
    enum: CourseType,
    required: true,
  })
  courseType: CourseType;

  @Prop({ required: true })
  fileUrl: string;

  @Prop({ default: null })
  videoThumbnail?: string;

  @Prop({ required: false })
  title?: string;
}

export const VidLibrarySchema = SchemaFactory.createForClass(VidLibrary);

VidLibrarySchema.plugin(aggregatePaginate as any);
