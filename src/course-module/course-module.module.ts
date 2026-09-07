import { Module } from '@nestjs/common';
import { CourseModuleService } from './course-module.service';
import { CourseModuleController } from './course-module.controller';
import { ModelsModule } from 'src/models/models.module';
import { CourseFeatureModule } from 'src/course/course.module';

@Module({
  imports: [ModelsModule, CourseFeatureModule],
  controllers: [CourseModuleController],
  providers: [CourseModuleService],
  exports: [CourseModuleService],
})
export class CourseModuleModule {}
