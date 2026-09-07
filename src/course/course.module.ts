import { Module } from '@nestjs/common';
import { CourseService } from './course.service';
import { CourseController } from './course.controller';
import { ModelsModule } from 'src/models/models.module';
import { MongooseModule } from '@nestjs/mongoose';
import { Course, CourseSchema } from 'src/models/course.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Course.name, schema: CourseSchema }]),
    ModelsModule,
  ],
  controllers: [CourseController],
  providers: [CourseService],
  exports: [CourseService],
})
export class CourseFeatureModule {}
