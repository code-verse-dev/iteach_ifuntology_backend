import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  CertificateDocument,
  Certificate,
} from 'src/models/certificate.schema';
import { Course, CourseDocument } from 'src/models/course.schema';
import {
  StudentEnrollment,
  StudentEnrollmentDocument,
} from 'src/models/student-enrollment.schema';
import { ApiResponse } from 'src/common/response';
import { QueryDto } from 'src/dto/query.dto';

@Injectable()
export class CertificateService {
  constructor(
    @InjectModel(Certificate.name)
    private readonly certificateModel: Model<CertificateDocument>,
    @InjectModel(Course.name)
    private readonly courseModel: Model<CourseDocument>,
    @InjectModel(StudentEnrollment.name)
    private readonly enrollmentModel: Model<StudentEnrollmentDocument>,
  ) {}

  async generateCertificate(studentId: string, courseId: string) {
    const course = await this.courseModel.findById(courseId).lean().exec();
    return this.certificateModel.create({
      student: studentId,
      course: courseId,
      courseType: course?.courseType,
    });
  }

  async findExistingCertificate(studentId: string, courseId: string) {
    return this.certificateModel
      .findOne({ student: studentId, course: courseId })
      .sort({ createdAt: -1 })
      .lean()
      .exec();
  }

  async findMyCertificates(userId: string) {
    try {
      if (!userId) {
        return {
          status: HttpStatus.BAD_REQUEST,
          response: ApiResponse({}, 'Valid user id is required', false),
        };
      }
      const certificates = await this.certificateModel
        .find({ student: userId })
        .populate('course', 'title courseType')
        .populate('student', 'firstName lastName email')
        .sort({ createdAt: -1 })
        .lean()
        .exec();
      return {
        status: HttpStatus.OK,
        response: ApiResponse(
          certificates,
          'Certificates fetched successfully',
          true,
        ),
      };
    } catch (error: any) {
      console.error(error);
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        response: ApiResponse({}, 'Failed to fetch certificates', false),
      };
    }
  }

  async findMyCertificateByCourse(userId: string, courseType: string) {
    try {
      if (!userId || !courseType) {
        return {
          status: HttpStatus.BAD_REQUEST,
          response: ApiResponse({}, 'Course type is required', false),
        };
      }
      const certificate = await this.certificateModel
        .findOne({
          student: userId,
          courseType: { $regex: `^${courseType.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' },
        })
        .populate('course', 'title courseType')
        .populate('student', 'firstName lastName email')
        .sort({ createdAt: -1 })
        .lean()
        .exec();
      if (!certificate) {
        return {
          status: HttpStatus.NOT_FOUND,
          response: ApiResponse(
            {},
            'No certificate earned for this course yet. Pass every quiz to earn one.',
            false,
          ),
        };
      }
      return {
        status: HttpStatus.OK,
        response: ApiResponse(
          certificate,
          'Certificate fetched successfully',
          true,
        ),
      };
    } catch (error: any) {
      console.error(error);
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        response: ApiResponse({}, 'Failed to fetch certificate', false),
      };
    }
  }

  async findByStudent(studentId: string, viewer?: { _id?: string; role?: string }) {
    try {
      if (!studentId) {
        return {
          status: HttpStatus.BAD_REQUEST,
          response: ApiResponse({}, 'Valid student id is required', false),
        };
      }
      const allowed = await this.canViewStudentCertificates(studentId, viewer);
      if (!allowed) {
        return {
          status: HttpStatus.FORBIDDEN,
          response: ApiResponse({}, 'You cannot view these certificates', false),
        };
      }
      const certificates = await this.certificateModel
        .find({ student: studentId })
        .populate('course', 'title courseType')
        .populate('student', 'firstName lastName email')
        .sort({ createdAt: -1 })
        .lean()
        .exec();
      return {
        status: HttpStatus.OK,
        response: ApiResponse(
          certificates,
          'Certificates fetched successfully',
          true,
        ),
      };
    } catch (error: any) {
      console.error(error);
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        response: ApiResponse({}, 'Failed to fetch certificates', false),
      };
    }
  }

  async findAll(query: QueryDto) {
    try {
      const page = query?.page ? parseInt(String(query.page), 10) : 1;
      const limit = query?.limit ? parseInt(String(query.limit), 10) : 20;
      const courseType = (query?.courseType || query?.course || '').trim();
      const keyword = query?.keyword?.trim();
      const filter: Record<string, unknown> = {};
      if (courseType) {
        const escaped = courseType.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        filter.courseType = { $regex: `^${escaped}$`, $options: 'i' };
      }

      const pipeline: any[] = [
        { $match: filter },
        {
          $lookup: {
            from: 'users',
            localField: 'student',
            foreignField: '_id',
            as: 'student',
            pipeline: [
              { $project: { firstName: 1, lastName: 1, email: 1 } },
            ],
          },
        },
        { $unwind: { path: '$student', preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: 'courses',
            localField: 'course',
            foreignField: '_id',
            as: 'course',
            pipeline: [{ $project: { title: 1, courseType: 1 } }],
          },
        },
        { $unwind: { path: '$course', preserveNullAndEmptyArrays: true } },
      ];
      if (keyword) {
        pipeline.push({
          $match: {
            $or: [
              { courseType: { $regex: keyword, $options: 'i' } },
              { 'course.title': { $regex: keyword, $options: 'i' } },
              { 'student.firstName': { $regex: keyword, $options: 'i' } },
              { 'student.lastName': { $regex: keyword, $options: 'i' } },
              { 'student.email': { $regex: keyword, $options: 'i' } },
            ],
          },
        });
      }
      pipeline.push({ $sort: { createdAt: -1 } });

      const aggregate = this.certificateModel.aggregate(pipeline);
      const result = await (this.certificateModel as any).aggregatePaginate(
        aggregate,
        { page, limit },
      );
      return {
        status: HttpStatus.OK,
        response: ApiResponse(result, 'Certificates fetched successfully', true),
      };
    } catch (error: any) {
      console.error(error);
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        response: ApiResponse({}, 'Failed to fetch certificates', false),
      };
    }
  }

  async getStats() {
    try {
      const [byCourse, total] = await Promise.all([
        this.certificateModel.aggregate([
          { $group: { _id: '$courseType', total: { $sum: 1 } } },
        ]),
        this.certificateModel.countDocuments(),
      ]);
      const byCourseType = Object.fromEntries(
        byCourse.map((row: { _id: string; total: number }) => [row._id, row.total]),
      );
      return {
        status: HttpStatus.OK,
        response: ApiResponse(
          { total, byCourseType },
          'Certificate stats fetched',
          true,
        ),
      };
    } catch (error: any) {
      console.error(error);
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        response: ApiResponse({}, 'Failed to fetch certificate stats', false),
      };
    }
  }

  async findOne(id: string, viewer?: { _id?: string; role?: string }) {
    try {
      if (!id) {
        return {
          status: HttpStatus.BAD_REQUEST,
          response: ApiResponse({}, 'Valid certificate id is required', false),
        };
      }
      const certificate = await this.certificateModel
        .findById(id)
        .populate('student', 'firstName lastName email')
        .populate('course', 'title courseType')
        .lean()
        .exec();
      if (!certificate) {
        return {
          status: HttpStatus.NOT_FOUND,
          response: ApiResponse({}, 'Certificate not found', false),
        };
      }
      const studentId = String((certificate.student as any)?._id ?? certificate.student);
      const allowed = await this.canViewStudentCertificates(studentId, viewer);
      if (!allowed) {
        return {
          status: HttpStatus.FORBIDDEN,
          response: ApiResponse({}, 'You cannot view this certificate', false),
        };
      }
      return {
        status: HttpStatus.OK,
        response: ApiResponse(
          certificate,
          'Certificate fetched successfully',
          true,
        ),
      };
    } catch (error: any) {
      console.error(error);
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        response: ApiResponse({}, 'Failed to fetch certificate', false),
      };
    }
  }

  private async canViewStudentCertificates(
    studentId: string,
    viewer?: { _id?: string; role?: string },
  ) {
    if (!viewer?._id) return false;
    if (viewer.role === 'admin') return true;
    if (String(viewer._id) === String(studentId)) return true;
    if (viewer.role === 'teacher') {
      const enrollment = await this.enrollmentModel
        .findOne({
          user: new Types.ObjectId(studentId),
          teacher: new Types.ObjectId(String(viewer._id)),
        })
        .select('_id')
        .lean()
        .exec();
      return !!enrollment;
    }
    return false;
  }
}
