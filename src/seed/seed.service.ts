import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Course, CourseDocument, CourseType } from 'src/models/course.schema';

@Injectable()
export class SeedService implements OnModuleInit {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @InjectModel(Course.name)
    private readonly courseModel: Model<CourseDocument>,
  ) {}

  async onModuleInit() {
    await this.seedCourses();
  }

  private async seedCourses() {
    const count = await this.courseModel.countDocuments();
    if (count > 0) {
      return;
    }
    await this.courseModel.insertMany([
      {
        courseType: CourseType.FUNTOLOGY,
        sortOrder: 1,
        description: 'Funtology career education course',
        features: [],
      },
      {
        courseType: CourseType.BARBERTOLOGY,
        sortOrder: 2,
        description: 'Barbertology career education course',
        features: [],
      },
      {
        courseType: CourseType.SKINTOLOGY,
        sortOrder: 3,
        description: 'Skintology career education course',
        features: [],
      },
      {
        courseType: CourseType.NAILTOLOGY,
        sortOrder: 4,
        description: 'Nailtology career education course',
        features: [],
      },
    ]);
    this.logger.log('Seeded four LMS courses');
  }
}
