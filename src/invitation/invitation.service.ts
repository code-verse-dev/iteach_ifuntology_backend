import { HttpStatus, Injectable } from '@nestjs/common';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { Model, Connection, Types } from 'mongoose';
import { User, UserDocument, UserRole } from 'src/models/user.schema';
import {
  TeacherAssignment,
  TeacherAssignmentDocument,
} from 'src/models/teacher-assignment.schema';
import {
  StudentEnrollment,
  StudentEnrollmentDocument,
} from 'src/models/student-enrollment.schema';
import { Invitation, InvitationDocument } from 'src/models/invitation.schema';
import { ApiResponse } from 'src/common/response';
import { EmailService } from 'src/common/services/email.service';
import { QueryDto } from 'src/dto/query.dto';
import * as bcrypt from 'bcrypt';
import { NotificationService } from 'src/notification/notification.service';
import {
  generateStrongPassword,
  isStrongPassword,
  PASSWORD_VALIDATION_MESSAGE,
} from 'src/common/utils/password.util';
import { Certificate, CertificateDocument } from 'src/models/certificate.schema';

@Injectable()
export class InvitationService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(TeacherAssignment.name)
    private assignmentModel: Model<TeacherAssignmentDocument>,
    @InjectModel(StudentEnrollment.name)
    private enrollmentModel: Model<StudentEnrollmentDocument>,
    @InjectModel(Invitation.name)
    private invitationModel: Model<InvitationDocument>,
    @InjectModel(Certificate.name)
    private certificateModel: Model<CertificateDocument>,
    @InjectConnection() private connection: Connection,
    private readonly mailService: EmailService,
    private readonly notificationService: NotificationService,
  ) {}

  async create(dto: CreateInvitationDto, teacherId: string) {
    const session = await this.connection.startSession();
    try {
      const { firstName, lastName, courseType, email } = dto;
      const selectedCourseTypes = [...new Set(courseType)];
      if (!selectedCourseTypes.length) {
        return {
          status: HttpStatus.BAD_REQUEST,
          response: ApiResponse({}, 'At least one courseType is required', false),
        };
      }

      session.startTransaction();

      const assignments = await this.assignmentModel
        .find({
          teacher: teacherId,
          courseType: { $in: selectedCourseTypes },
        })
        .session(session);

      if (!assignments.length) {
        await session.abortTransaction();
        return {
          status: HttpStatus.BAD_REQUEST,
          response: ApiResponse({}, 'No courses assigned to this teacher', false),
        };
      }

      const assignmentByCourse = new Map(
        assignments.map((a) => [String(a.courseType), a]),
      );
      const missingCourses = selectedCourseTypes.filter(
        (ct) => !assignmentByCourse.has(String(ct)),
      );
      if (missingCourses.length) {
        await session.abortTransaction();
        return {
          status: HttpStatus.BAD_REQUEST,
          response: ApiResponse(
            { missingCourseTypes: missingCourses },
            'Teacher is not assigned one or more selected courses',
            false,
          ),
        };
      }

      for (const ct of selectedCourseTypes) {
        const assignment = assignmentByCourse.get(String(ct))!;
        if (assignment.usedSeats >= assignment.seats) {
          await session.abortTransaction();
          return {
            status: HttpStatus.BAD_REQUEST,
            response: ApiResponse(
              {},
              `No remaining seats for ${ct}`,
              false,
            ),
          };
        }
      }

      const existingEmailUser = await this.userModel
        .findOne({ email: email.toLowerCase() })
        .session(session);
      if (existingEmailUser) {
        await session.abortTransaction();
        return {
          status: HttpStatus.BAD_REQUEST,
          response: ApiResponse({}, 'A user with this email already exists', false),
        };
      }

      const password = dto.password || generateStrongPassword();
      if (dto.password && !isStrongPassword(dto.password)) {
        await session.abortTransaction();
        return {
          status: HttpStatus.BAD_REQUEST,
          response: ApiResponse({}, PASSWORD_VALIDATION_MESSAGE, false),
        };
      }

      const hashed = await bcrypt.hash(password, 10);
      const usernameBase = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
      const username = `${usernameBase}${Date.now().toString().slice(-4)}`;

      const [student] = await this.userModel.create(
        [
          {
            firstName,
            lastName,
            email: email.toLowerCase(),
            username,
            password: hashed,
            role: UserRole.STUDENT,
            status: 'ACTIVE',
          },
        ],
        { session },
      );

      for (const ct of selectedCourseTypes) {
        const assignment = assignmentByCourse.get(String(ct))!;
        await this.enrollmentModel.create(
          [
            {
              teacher: teacherId,
              user: student._id,
              assignment: assignment._id,
              courseType: ct,
              status: 'ACTIVE',
            },
          ],
          { session },
        );
        assignment.usedSeats += 1;
        await assignment.save({ session });
        await this.invitationModel.create(
          [
            {
              teacher: teacherId,
              assignment: assignment._id,
              email: email.toLowerCase(),
              courseType: ct,
              status: 'ACCEPTED',
            },
          ],
          { session },
        );
      }

      await session.commitTransaction();

      try {
        await this.mailService.sendEmail(
          email,
          'Your iTeach iFuntology student account',
          `<p>Hello ${firstName},</p><p>Your teacher invited you to iTeach iFuntology.</p><p>Email: ${email}</p><p>Password: ${password}</p>`,
        );
      } catch (emailErr) {
        console.error('Failed to send student invite email:', emailErr);
      }

      try {
        this.notificationService.sendNotificationToUser(
          String(student._id),
          'Welcome to iTeach iFuntology',
          'Your teacher created your student account.',
        );
      } catch (notifErr) {
        console.error(notifErr);
      }

      const userObj = student.toObject();
      delete (userObj as any).password;
      delete (userObj as any).refreshToken;

      return {
        status: HttpStatus.CREATED,
        response: ApiResponse(userObj, 'Student invited successfully', true),
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

  private studentListPipeline(matchFilter: Record<string, unknown>, keyword?: string) {
    const pipeline: any[] = [
      { $match: matchFilter },
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'user',
          pipeline: [
            {
              $project: {
                _id: 1,
                firstName: 1,
                lastName: 1,
                email: 1,
                username: 1,
                status: 1,
                createdAt: 1,
              },
            },
          ],
        },
      },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'users',
          localField: 'teacher',
          foreignField: '_id',
          as: 'teacherDoc',
          pipeline: [
            { $project: { firstName: 1, lastName: 1, email: 1 } },
          ],
        },
      },
      { $unwind: { path: '$teacherDoc', preserveNullAndEmptyArrays: true } },
    ];

    if (keyword) {
      const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      pipeline.push({
        $match: {
          $or: [
            { 'user.firstName': { $regex: escapedKeyword, $options: 'i' } },
            { 'user.lastName': { $regex: escapedKeyword, $options: 'i' } },
            { 'user.email': { $regex: escapedKeyword, $options: 'i' } },
            { 'user.username': { $regex: escapedKeyword, $options: 'i' } },
          ],
        },
      });
    }

    pipeline.push(
      {
        $lookup: {
          from: 'lessonprogresses',
          let: { userId: '$user._id', courseType: '$courseType' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$student', '$$userId'] },
                    { $eq: ['$courseType', '$$courseType'] },
                  ],
                },
              },
            },
            { $project: { progressPercentage: 1 } },
            { $limit: 1 },
          ],
          as: 'lessonProgressDoc',
        },
      },
      {
        $addFields: {
          progressPercentage: {
            $ifNull: [
              { $arrayElemAt: ['$lessonProgressDoc.progressPercentage', 0] },
              0,
            ],
          },
          teacher: '$teacherDoc',
        },
      },
      { $project: { lessonProgressDoc: 0, teacherDoc: 0 } },
      { $sort: { createdAt: -1 } },
    );

    return pipeline;
  }

  async findTeacherStudents(query: QueryDto, teacherId: string) {
    try {
      const page = query?.page ? parseInt(String(query.page), 10) : 1;
      const limit = query?.limit ? parseInt(String(query.limit), 10) : 10;
      const keyword = query?.keyword?.trim();
      const courseType = query?.courseType?.trim();

      const matchFilter: Record<string, unknown> = {
        teacher: new Types.ObjectId(teacherId),
      };
      if (courseType) matchFilter.courseType = courseType;

      const pipeline = this.studentListPipeline(matchFilter, keyword);
      const aggregate = this.enrollmentModel.aggregate(pipeline);
      const result = await (this.enrollmentModel as any).aggregatePaginate(
        aggregate,
        { page, limit },
      );
      return {
        status: HttpStatus.OK,
        response: ApiResponse(
          result,
          `${result.docs?.length ?? 0} students found`,
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

  async findAllStudents(query: QueryDto) {
    try {
      const page = query?.page ? parseInt(String(query.page), 10) : 1;
      const limit = query?.limit ? parseInt(String(query.limit), 10) : 10;
      const keyword = query?.keyword?.trim();
      const courseType = query?.courseType?.trim();
      const teacher = query?.teacher;

      const matchFilter: Record<string, unknown> = {};
      if (courseType) matchFilter.courseType = courseType;
      if (teacher) matchFilter.teacher = new Types.ObjectId(String(teacher));

      const pipeline = this.studentListPipeline(matchFilter, keyword);
      const aggregate = this.enrollmentModel.aggregate(pipeline);
      const result = await (this.enrollmentModel as any).aggregatePaginate(
        aggregate,
        { page, limit },
      );
      return {
        status: HttpStatus.OK,
        response: ApiResponse(
          result,
          `${result.docs?.length ?? 0} students found`,
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

  async findStudentById(id: string, teacherId: string) {
    try {
      const enrollments = await this.enrollmentModel
        .find({ user: id, teacher: teacherId })
        .populate('user', '-password -refreshToken')
        .lean();
      if (!enrollments.length) {
        return {
          status: HttpStatus.NOT_FOUND,
          response: ApiResponse({}, 'Student not found', false),
        };
      }
      const certificates = await this.certificateModel
        .find({ student: id })
        .populate('course', 'title courseType')
        .sort({ createdAt: -1 })
        .lean()
        .exec();
      const user = enrollments[0].user;
      return {
        status: HttpStatus.OK,
        response: ApiResponse(
          {
            user,
            enrollments: enrollments.map((enrollment) => ({
              _id: enrollment._id,
              courseType: enrollment.courseType,
              status: enrollment.status,
            })),
            certificates,
          },
          'Student fetched successfully',
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

  async toggleStudentStatus(id: string, teacherId: string) {
    try {
      const student = await this.userModel.findOne({
        _id: id,
        role: UserRole.STUDENT,
      });
      const enrollment = await this.enrollmentModel.findOne({
        user: id,
        teacher: teacherId,
      });
      if (!student || !enrollment) {
        return {
          status: HttpStatus.NOT_FOUND,
          response: ApiResponse({}, 'Student not found', false),
        };
      }
      student.status = student.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
      await student.save();
      return {
        status: HttpStatus.OK,
        response: ApiResponse(student, 'Student status updated', true),
      };
    } catch (error: any) {
      console.error(error);
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        response: ApiResponse({}, error.message, false),
      };
    }
  }

  async resetStudentPassword(id: string, teacherId: string, password: string) {
    try {
      const enrollment = await this.enrollmentModel.findOne({
        user: id,
        teacher: teacherId,
      });
      if (!enrollment) {
        return {
          status: HttpStatus.NOT_FOUND,
          response: ApiResponse({}, 'Student not found', false),
        };
      }
      const student = await this.userModel.findById(id);
      if (!student) {
        return {
          status: HttpStatus.NOT_FOUND,
          response: ApiResponse({}, 'Student not found', false),
        };
      }
      student.password = await bcrypt.hash(password, 10);
      await student.save();
      return {
        status: HttpStatus.OK,
        response: ApiResponse({}, 'Password updated', true),
      };
    } catch (error: any) {
      console.error(error);
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        response: ApiResponse({}, error.message, false),
      };
    }
  }

  async deleteStudentByTeacher(id: string, teacherId: string) {
    const session = await this.connection.startSession();
    try {
      session.startTransaction();
      const enrollments = await this.enrollmentModel
        .find({ user: id, teacher: teacherId })
        .session(session);
      if (!enrollments.length) {
        await session.abortTransaction();
        return {
          status: HttpStatus.NOT_FOUND,
          response: ApiResponse({}, 'Student not found', false),
        };
      }

      for (const enrollment of enrollments) {
        await this.assignmentModel.updateOne(
          { _id: enrollment.assignment, usedSeats: { $gt: 0 } },
          { $inc: { usedSeats: -1 } },
          { session },
        );
      }

      await this.enrollmentModel.deleteMany(
        { user: id, teacher: teacherId },
        { session },
      );

      const remaining = await this.enrollmentModel
        .countDocuments({ user: id })
        .session(session);
      if (remaining === 0) {
        await this.userModel.deleteOne({ _id: id, role: UserRole.STUDENT }, { session });
      }

      await session.commitTransaction();
      return {
        status: HttpStatus.OK,
        response: ApiResponse({}, 'Student removed', true),
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

  async getMyTeachers(userId: string) {
    try {
      const enrollments = await this.enrollmentModel
        .find({ user: userId, status: 'ACTIVE' })
        .populate('teacher', 'firstName lastName email image')
        .lean();
      return {
        status: HttpStatus.OK,
        response: ApiResponse(enrollments, 'Teachers fetched successfully', true),
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
