import { HttpStatus, Injectable } from '@nestjs/common';
import {
  CreateLessonProgressDto,
  CompleteModuleDto,
} from './dto/create-lesson-progress.dto';
import { ApiResponse } from 'src/common/response';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { Lesson, LessonDocument } from 'src/models/lesson.schema';
import { Model, Connection } from 'mongoose';
import {
  LessonProgress,
  LessonProgressDocument,
} from 'src/models/lesson-progress.schema';
import {
  CourseModule,
  CourseModuleDocument,
} from 'src/models/course-module.schema';
import {
  StudentEnrollment,
  StudentEnrollmentDocument,
} from 'src/models/student-enrollment.schema';
import { Certificate, CertificateDocument } from 'src/models/certificate.schema';
import { Course, CourseDocument } from 'src/models/course.schema';
import { NotificationService } from 'src/notification/notification.service';

@Injectable()
export class LessonProgressService {
  constructor(
    @InjectModel(Lesson.name) private readonly lessonModel: Model<LessonDocument>,
    @InjectModel(LessonProgress.name)
    private readonly lessonProgressModel: Model<LessonProgressDocument>,
    @InjectModel(CourseModule.name)
    private readonly courseModuleModel: Model<CourseModuleDocument>,
    @InjectModel(StudentEnrollment.name)
    private readonly enrollmentModel: Model<StudentEnrollmentDocument>,
    @InjectModel(Certificate.name)
    private readonly certificateModel: Model<CertificateDocument>,
    @InjectModel(Course.name) private readonly courseModel: Model<CourseDocument>,
    private readonly notificationService: NotificationService,
    @InjectConnection() private readonly connection: Connection,
  ) {}

  async markLessonCompleted(
    createLessonProgressDto: CreateLessonProgressDto,
    studentId: string,
  ) {
    const session = await this.connection.startSession();
    try {
      const { lessonId } = createLessonProgressDto;
      const lesson = await this.lessonModel.findById(lessonId).session(session);
      if (!lesson) {
        return {
          status: HttpStatus.NOT_FOUND,
          response: ApiResponse({}, 'Lesson not found', false),
        };
      }
      const module = await this.courseModuleModel
        .findById(lesson.courseModule)
        .session(session);
      if (!module) {
        return {
          status: HttpStatus.NOT_FOUND,
          response: ApiResponse({}, 'Course module not found', false),
        };
      }
      const courseType = module.courseType;
      session.startTransaction();

      let progress = await this.lessonProgressModel
        .findOne({ student: studentId, courseType })
        .session(session);
      if (!progress) {
        const [created] = await this.lessonProgressModel.create(
          [
            {
              student: studentId,
              courseType,
              completedLessons: [lesson._id],
              completedModules: [],
            },
          ],
          { session },
        );
        progress = created;
      } else if (
        !progress.completedLessons.some(
          (id) => id.toString() === String(lesson._id),
        )
      ) {
        progress.completedLessons.push(lesson._id as any);
        await progress.save({ session });
      }

      const moduleIds = await this.courseModuleModel
        .find({ courseType })
        .session(session)
        .distinct('_id');
      const totalLessons = await this.lessonModel
        .countDocuments({
          type: { $in: ['PDF', 'VIDEO', 'QUIZ'] },
          status: 'ACTIVE',
          courseModule: { $in: moduleIds },
        })
        .session(session);
      progress.progressPercentage = totalLessons
        ? (progress.completedLessons.length / totalLessons) * 100
        : 0;
      await progress.save({ session });

      if (progress.progressPercentage >= 100) {
        const course = await this.courseModel
          .findOne({ courseType })
          .session(session);
        if (course) {
          const existingCert = await this.certificateModel
            .findOne({ student: studentId, course: course._id })
            .session(session);
          if (!existingCert) {
            await this.certificateModel.create(
              [
                {
                  student: studentId,
                  course: course._id,
                  courseType,
                },
              ],
              { session },
            );
          }
        }
      }

      await session.commitTransaction();
      try {
        this.notificationService.sendNotificationToUser(
          String(studentId),
          'Lesson completed',
          `You completed ${lesson.title}.`,
        );
      } catch (notifErr) {
        console.error(notifErr);
      }
      return {
        status: HttpStatus.OK,
        response: ApiResponse(progress, 'Lesson marked complete', true),
      };
    } catch (error: any) {
      await session.abortTransaction();
      console.error(error);
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        response: ApiResponse({}, error.message, false),
      };
    } finally {
      session.endSession();
    }
  }

  async markModuleCompleted(dto: CompleteModuleDto, studentId: string) {
    try {
      const module = await this.courseModuleModel.findById(dto.courseModuleId);
      if (!module) {
        return {
          status: HttpStatus.NOT_FOUND,
          response: ApiResponse({}, 'Course module not found', false),
        };
      }
      let progress = await this.lessonProgressModel.findOne({
        student: studentId,
        courseType: module.courseType,
      });
      if (!progress) {
        progress = await this.lessonProgressModel.create({
          student: studentId,
          courseType: module.courseType,
          completedLessons: [],
          completedModules: [module._id],
        });
      } else if (
        !progress.completedModules.some(
          (id) => id.toString() === String(module._id),
        )
      ) {
        progress.completedModules.push(module._id as any);
        await progress.save();
      }
      return {
        status: HttpStatus.OK,
        response: ApiResponse(progress, 'Module marked complete', true),
      };
    } catch (error: any) {
      console.error(error);
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        response: ApiResponse({}, error.message, false),
      };
    }
  }

  async getAverageProgressByCourseType(teacherId: string, courseType: string) {
    try {
      const enrollments = await this.enrollmentModel.find({
        teacher: teacherId,
        ...(courseType ? { courseType } : {}),
      });
      const studentIds = enrollments.map((e) => e.user);
      const progresses = await this.lessonProgressModel.find({
        student: { $in: studentIds },
        ...(courseType ? { courseType } : {}),
      });
      const avg =
        progresses.length > 0
          ? progresses.reduce((s, p) => s + (p.progressPercentage || 0), 0) /
            progresses.length
          : 0;
      return {
        status: HttpStatus.OK,
        response: ApiResponse(
          { averageProgress: Math.round(avg) },
          'Average progress fetched',
          true,
        ),
      };
    } catch (error: any) {
      console.error(error);
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        response: ApiResponse({}, error.message, false),
      };
    }
  }

  async getAverageProgressForStudent(studentId: string) {
    try {
      const progresses = await this.lessonProgressModel.find({
        student: studentId,
      });
      const avg =
        progresses.length > 0
          ? progresses.reduce((s, p) => s + (p.progressPercentage || 0), 0) /
            progresses.length
          : 0;
      return {
        status: HttpStatus.OK,
        response: ApiResponse(
          { averageProgress: Math.round(avg), progresses },
          'Student progress fetched',
          true,
        ),
      };
    } catch (error: any) {
      console.error(error);
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        response: ApiResponse({}, error.message, false),
      };
    }
  }

  async findStudentProgress(studentId: string) {
    try {
      const progresses = await this.lessonProgressModel
        .find({ student: studentId })
        .lean();
      return {
        status: HttpStatus.OK,
        response: ApiResponse(progresses, 'Progress fetched', true),
      };
    } catch (error: any) {
      console.error(error);
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        response: ApiResponse({}, error.message, false),
      };
    }
  }
}
