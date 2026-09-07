import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { Connection, Model } from 'mongoose';
import { Course, CourseDocument } from 'src/models/course.schema';
import {
  CourseModule,
  CourseModuleDocument,
} from 'src/models/course-module.schema';
import {
  TeacherAssignment,
  TeacherAssignmentDocument,
} from 'src/models/teacher-assignment.schema';
import { Certificate, CertificateDocument } from 'src/models/certificate.schema';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { ApiResponse } from 'src/common/response';

const MAX_COURSES = 4;

@Injectable()
export class CourseService {
  constructor(
    @InjectModel(Course.name) private courseModel: Model<CourseDocument>,
    @InjectModel(CourseModule.name)
    private courseModuleModel: Model<CourseModuleDocument>,
    @InjectModel(TeacherAssignment.name)
    private assignmentModel: Model<TeacherAssignmentDocument>,
    @InjectModel(Certificate.name)
    private certificateModel: Model<CertificateDocument>,
    @InjectConnection() private readonly connection: Connection,
  ) {}

  async create(createCourseDto: CreateCourseDto, file?: Express.Multer.File) {
    try {
      const count = await this.courseModel.countDocuments().exec();
      if (count >= MAX_COURSES) {
        return {
          status: HttpStatus.BAD_REQUEST,
          response: ApiResponse(
            {},
            `Only ${MAX_COURSES} courses are allowed (one per course type).`,
            false,
          ),
        };
      }
      const existing = await this.courseModel
        .findOne({ courseType: createCourseDto.courseType })
        .exec();
      if (existing) {
        return {
          status: HttpStatus.BAD_REQUEST,
          response: ApiResponse(
            {},
            `A course for ${createCourseDto.courseType} already exists.`,
            false,
          ),
        };
      }
      const created = await this.courseModel.create({
        courseType: createCourseDto.courseType,
        features: createCourseDto.features ?? [],
        sortOrder: createCourseDto.sortOrder,
        image: file?.filename,
        description: createCourseDto.description,
      });
      return {
        status: HttpStatus.CREATED,
        response: ApiResponse(created, 'Course created successfully', true),
      };
    } catch (error: any) {
      console.error(error);
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        response: ApiResponse(
          {},
          error?.message ?? 'Failed to create course',
          false,
        ),
      };
    }
  }

  async findByCourseType(courseType: string) {
    try {
      if (!courseType?.trim()) {
        return {
          status: HttpStatus.BAD_REQUEST,
          response: ApiResponse({}, 'courseType is required', false),
        };
      }
      const course = await this.courseModel
        .findOne({ courseType: courseType.trim() })
        .lean()
        .exec();
      if (!course) {
        return {
          status: HttpStatus.NOT_FOUND,
          response: ApiResponse({}, 'Course not found', false),
        };
      }
      return {
        status: HttpStatus.OK,
        response: ApiResponse(course, 'Course fetched successfully', true),
      };
    } catch (error: any) {
      console.error(error);
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        response: ApiResponse(
          {},
          error?.message ?? 'Failed to fetch course',
          false,
        ),
      };
    }
  }

  async findOne(id: string) {
    try {
      const course = await this.courseModel.findById(id).lean().exec();
      if (!course) {
        return {
          status: HttpStatus.NOT_FOUND,
          response: ApiResponse({}, 'Course not found', false),
        };
      }
      return {
        status: HttpStatus.OK,
        response: ApiResponse(course, 'Course fetched successfully', true),
      };
    } catch (error: any) {
      console.error(error);
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        response: ApiResponse({}, error.message, false),
      };
    }
  }

  async findAll() {
    try {
      const courses = await this.courseModel
        .find()
        .sort({ sortOrder: 1 })
        .lean()
        .exec();

      const [moduleStats, assignmentCounts, certificateCounts] = await Promise.all([
        this.courseModuleModel
          .aggregate([
            {
              $group: {
                _id: '$courseType',
                totalModules: { $sum: 1 },
                totalContent: { $sum: { $ifNull: ['$totalLessons', 0] } },
              },
            },
          ])
          .exec(),
        this.assignmentModel
          .aggregate([
            { $group: { _id: '$courseType', totalAssignments: { $sum: 1 } } },
          ])
          .exec(),
        this.certificateModel
          .aggregate([
            { $group: { _id: '$courseType', totalCertificates: { $sum: 1 } } },
          ])
          .exec(),
      ]);

      const modulesByCourseType: Record<
        string,
        { totalModules: number; totalContent: number }
      > = {};
      moduleStats.forEach(
        (s: { _id: string; totalModules: number; totalContent: number }) => {
          modulesByCourseType[s._id] = {
            totalModules: s.totalModules,
            totalContent: s.totalContent,
          };
        },
      );
      const assignmentsByCourseType: Record<string, number> = {};
      assignmentCounts.forEach(
        (s: { _id: string; totalAssignments: number }) => {
          assignmentsByCourseType[s._id] = s.totalAssignments;
        },
      );
      const certificatesByCourseType: Record<string, number> = {};
      certificateCounts.forEach(
        (s: { _id: string; totalCertificates: number }) => {
          certificatesByCourseType[s._id] = s.totalCertificates;
        },
      );

      const coursesWithStats = courses.map((course: any) => {
        const stats = modulesByCourseType[course.courseType];
        return {
          ...course,
          totalModules: stats?.totalModules ?? 0,
          totalAssignments: assignmentsByCourseType[course.courseType] ?? 0,
          totalCertificates: certificatesByCourseType[course.courseType] ?? 0,
          totalContent: stats?.totalContent ?? 0,
        };
      });

      return {
        status: HttpStatus.OK,
        response: ApiResponse(
          coursesWithStats,
          'Courses fetched successfully',
          true,
        ),
      };
    } catch (error: any) {
      console.error(error);
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        response: ApiResponse(
          {},
          error?.message ?? 'Failed to fetch courses',
          false,
        ),
      };
    }
  }

  async update(id: string, updateCourseDto: UpdateCourseDto) {
    try {
      const currentCourse = await this.courseModel.findById(id).lean().exec();
      if (!currentCourse) {
        return {
          status: HttpStatus.NOT_FOUND,
          response: ApiResponse({}, 'Course not found', false),
        };
      }

      const newSortOrder = updateCourseDto.sortOrder;
      if (
        newSortOrder !== undefined &&
        newSortOrder !== currentCourse.sortOrder
      ) {
        const session = await this.connection.startSession();
        try {
          session.startTransaction();
          const otherWithTargetOrder = await this.courseModel
            .findOne({ sortOrder: newSortOrder, _id: { $ne: id } })
            .session(session)
            .exec();
          if (otherWithTargetOrder) {
            await this.courseModel
              .findByIdAndUpdate(
                otherWithTargetOrder._id,
                { $set: { sortOrder: currentCourse.sortOrder } },
                { session },
              )
              .exec();
          }
          const updated = await this.courseModel
            .findByIdAndUpdate(
              id,
              { $set: updateCourseDto },
              { new: true, runValidators: true, session },
            )
            .lean()
            .exec();
          await session.commitTransaction();
          session.endSession();
          return {
            status: HttpStatus.OK,
            response: ApiResponse(updated, 'Course updated successfully', true),
          };
        } catch (txError) {
          await session.abortTransaction();
          session.endSession();
          throw txError;
        }
      }

      const updated = await this.courseModel
        .findByIdAndUpdate(
          id,
          { $set: updateCourseDto },
          { new: true, runValidators: true },
        )
        .lean()
        .exec();
      return {
        status: HttpStatus.OK,
        response: ApiResponse(updated, 'Course updated successfully', true),
      };
    } catch (error: any) {
      console.error(error);
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        response: ApiResponse(
          {},
          error?.message ?? 'Failed to update course',
          false,
        ),
      };
    }
  }
}
