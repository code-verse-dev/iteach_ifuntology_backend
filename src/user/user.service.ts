import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { User, UserDocument, UserRole } from '../models/user.schema';
import { Model } from 'mongoose';
import { ApiResponse } from 'src/common/response';
import * as bcrypt from 'bcrypt';
import { LoginDto } from 'src/dto/login.dto';
import { QueryDto } from 'src/dto/query.dto';
import * as moment from 'moment';
import * as fs from 'fs';
import * as path from 'path';
import { NotificationService } from 'src/notification/notification.service';
import {
  StudentEnrollment,
  StudentEnrollmentDocument,
} from 'src/models/student-enrollment.schema';
import {
  TeacherAssignment,
  TeacherAssignmentDocument,
} from 'src/models/teacher-assignment.schema';
import { CreateTeacherDto } from './dto/create-user.dto';
import { EmailService } from 'src/common/services/email.service';

@Injectable()
export class UserService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(StudentEnrollment.name)
    private readonly enrollmentModel: Model<StudentEnrollmentDocument>,
    @InjectModel(TeacherAssignment.name)
    private readonly assignmentModel: Model<TeacherAssignmentDocument>,
    private readonly notificationService: NotificationService,
    private readonly emailService: EmailService,
  ) {}

  async login(dto: LoginDto) {
    try {
      const { identifier, password, role } = dto;

      if (!identifier || !password) {
        return ApiResponse({}, 'Please provide credentials', false);
      }

      const user = await this.userModel.findOne({
        role,
        $or: [{ email: identifier.toLowerCase() }, { username: identifier }],
      });

      if (!user) {
        return ApiResponse({}, 'User not found', false);
      }

      if (user.role === UserRole.STUDENT) {
        const enrollment = await this.enrollmentModel
          .findOne({ user: user._id, status: 'ACTIVE' })
          .exec();
        if (!enrollment) {
          return ApiResponse(
            {},
            'No active course enrollment found. Please contact your teacher.',
            false,
          );
        }
      }
      if (user.status !== 'ACTIVE') {
        return ApiResponse(
          {},
          'Your account is marked as inactive. Please contact support.',
          false,
        );
      }

      const isPasswordValid = await user.isPasswordCorrect(password);
      if (!isPasswordValid) {
        return ApiResponse({}, 'Invalid credentials', false);
      }

      const accessToken = user.generateAccessToken();
      const refreshToken = user.generateRefreshToken();
      user.refreshToken = refreshToken;
      await user.save({ validateBeforeSave: false });

      const { password: _, ...userObj } = user.toObject();

      return ApiResponse(
        { accessToken, refreshToken, user: userObj },
        'Login successful',
        true,
      );
    } catch (error: any) {
      return ApiResponse({}, error.message, false);
    }
  }

  async logout(userId: string) {
    try {
      await this.userModel.findByIdAndUpdate(
        userId,
        { $set: { refreshToken: null } },
        { new: true },
      );
      return ApiResponse({}, 'Logged out successfully', true);
    } catch (error: any) {
      console.error(error);
      return ApiResponse({}, error.message, false);
    }
  }

  async createTeacher(dto: CreateTeacherDto, file?: Express.Multer.File) {
    try {
      const existing = await this.findByEmail(dto.email);
      if (existing) {
        return {
          status: HttpStatus.BAD_REQUEST,
          response: ApiResponse({}, 'User already exists', false),
        };
      }

      const hashedPassword = await bcrypt.hash(dto.password, 10);
      const created = await this.userModel.create({
        ...dto,
        email: dto.email.toLowerCase(),
        password: hashedPassword,
        role: UserRole.TEACHER,
        status: 'ACTIVE',
        image: file?.filename,
      });

      try {
        this.notificationService.sendNotificationToAdmin(
          'New teacher created',
          `${created.firstName} ${created.lastName} (${created.email}) has been added.`,
          { userId: String(created._id) },
        );
      } catch (notifErr) {
        console.error('Failed to send teacher created notification:', notifErr);
      }

      try {
        await this.emailService.sendEmail(
          created.email ?? '',
          'Your iTeach iFuntology account',
          `<p>Hello ${created.firstName},</p><p>An admin created your teacher account. Sign in with this email. Your temporary password is the one they set for you.</p>`,
        );
      } catch (emailErr) {
        console.error('Failed to send teacher welcome email:', emailErr);
      }

      const userResponse = created.toObject();
      delete (userResponse as any).password;
      delete (userResponse as any).refreshToken;

      return {
        status: HttpStatus.OK,
        response: ApiResponse(userResponse, 'Teacher created successfully', true),
      };
    } catch (error: any) {
      console.error(error);
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        response: ApiResponse({}, error.message ?? 'Failed to create teacher', false),
      };
    }
  }

  async updateUserPassword(id: string, password: string) {
    try {
      const user = await this.userModel.findById(id);
      if (!user) {
        return {
          status: HttpStatus.NOT_FOUND,
          response: ApiResponse({}, 'User not found', false),
        };
      }
      user.password = await bcrypt.hash(password, 10);
      await user.save();
      return {
        status: HttpStatus.OK,
        response: ApiResponse({}, 'Password updated successfully', true),
      };
    } catch (error: any) {
      console.error(error);
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        response: ApiResponse({}, error.message, false),
      };
    }
  }

  async findAllWithFilters(query: QueryDto) {
    try {
      const { keyword, from, to, page = 1, limit = 10, role, status } = query;
      const pipeline: any[] = [
        { $sort: { createdAt: -1 } },
        { $match: { role: { $ne: UserRole.ADMIN } } },
      ];

      if (role) pipeline.push({ $match: { role } });
      if (status) pipeline.push({ $match: { status } });

      if (from) {
        const utcFrom = moment.utc(from, 'YYYY-MM-DD').startOf('day').toDate();
        pipeline.push({ $match: { createdAt: { $gte: utcFrom } } });
      }
      if (to) {
        const utcTo = moment.utc(to, 'YYYY-MM-DD').endOf('day').toDate();
        pipeline.push({ $match: { createdAt: { $lte: utcTo } } });
      }
      if (keyword) {
        pipeline.push({
          $match: {
            $or: [
              { firstName: { $regex: keyword, $options: 'i' } },
              { lastName: { $regex: keyword, $options: 'i' } },
              { email: { $regex: keyword, $options: 'i' } },
            ],
          },
        });
      }

      pipeline.push(
        { $project: { password: 0, refreshToken: 0 } },
        {
          $lookup: {
            from: 'teacherassignments',
            let: { userId: '$_id' },
            pipeline: [
              { $match: { $expr: { $eq: ['$teacher', '$$userId'] } } },
              {
                $project: {
                  courseType: 1,
                  seats: 1,
                  usedSeats: 1,
                },
              },
            ],
            as: 'assignedCourses',
          },
        },
        {
          $lookup: {
            from: 'studentenrollments',
            let: { userId: '$_id' },
            pipeline: [
              { $match: { $expr: { $eq: ['$user', '$$userId'] } } },
              {
                $lookup: {
                  from: 'users',
                  localField: 'teacher',
                  foreignField: '_id',
                  as: 'teacherDoc',
                },
              },
              {
                $unwind: {
                  path: '$teacherDoc',
                  preserveNullAndEmptyArrays: true,
                },
              },
              {
                $project: {
                  _id: 1,
                  courseType: 1,
                  status: 1,
                  createdAt: 1,
                  teacher: {
                    _id: '$teacherDoc._id',
                    firstName: '$teacherDoc.firstName',
                    lastName: '$teacherDoc.lastName',
                    email: '$teacherDoc.email',
                  },
                },
              },
            ],
            as: 'enrollments',
          },
        },
        {
          $lookup: {
            from: 'surveyresponses',
            let: { userId: '$_id' },
            pipeline: [
              { $match: { $expr: { $eq: ['$user', '$$userId'] } } },
              { $sort: { createdAt: -1 } },
              {
                $lookup: {
                  from: 'surveys',
                  localField: 'survey',
                  foreignField: '_id',
                  as: 'surveyDoc',
                },
              },
              {
                $unwind: {
                  path: '$surveyDoc',
                  preserveNullAndEmptyArrays: true,
                },
              },
              {
                $project: {
                  _id: 1,
                  title: '$surveyDoc.title',
                  type: '$surveyDoc.type',
                  createdAt: 1,
                },
              },
            ],
            as: 'surveyResponses',
          },
        },
        {
          $lookup: {
            from: 'certificates',
            let: { userId: '$_id' },
            pipeline: [
              { $match: { $expr: { $eq: ['$student', '$$userId'] } } },
              { $sort: { createdAt: -1 } },
              {
                $lookup: {
                  from: 'courses',
                  localField: 'course',
                  foreignField: '_id',
                  as: 'courseDoc',
                },
              },
              {
                $unwind: {
                  path: '$courseDoc',
                  preserveNullAndEmptyArrays: true,
                },
              },
              {
                $project: {
                  _id: 1,
                  courseType: 1,
                  createdAt: 1,
                  course: {
                    _id: '$courseDoc._id',
                    title: '$courseDoc.title',
                    courseType: '$courseDoc.courseType',
                  },
                },
              },
            ],
            as: 'certificates',
          },
        },
        {
          $addFields: {
            studentCount: {
              $cond: [
                { $eq: ['$role', 'teacher'] },
                {
                  $size: {
                    $ifNull: ['$assignedCourses', []],
                  },
                },
                0,
              ],
            },
          },
        },
      );

      const aggregate = this.userModel.aggregate(pipeline);
      const result = await (this.userModel as any).aggregatePaginate(
        aggregate,
        { page, limit },
      );

      if (result.docs) {
        for (const doc of result.docs) {
          if (doc.role === UserRole.TEACHER) {
            doc.studentCount = await this.enrollmentModel
              .distinct('user', { teacher: doc._id })
              .then((ids) => ids.length);
          }
        }
      }

      return ApiResponse(result, `${result.docs?.length ?? 0} users found`, true);
    } catch (error: any) {
      console.error(error);
      return ApiResponse({}, error.message, false);
    }
  }

  async getAdminUserStats() {
    try {
      const [teachers, students, assignments] = await Promise.all([
        this.userModel.countDocuments({ role: UserRole.TEACHER }),
        this.userModel.countDocuments({ role: UserRole.STUDENT }),
        this.assignmentModel.countDocuments(),
      ]);
      return {
        status: HttpStatus.OK,
        response: ApiResponse(
          { teachers, students, assignments },
          'Admin stats fetched successfully',
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

  async findUserById(id: string) {
    const user = await this.userModel.findById(id).select('-password -refreshToken');
    if (!user) {
      return {
        status: HttpStatus.NOT_FOUND,
        response: ApiResponse({}, 'User not found', false),
      };
    }
    return {
      status: HttpStatus.OK,
      response: ApiResponse(user, 'User details fetched successfully', true),
    };
  }

  async getMyProfile(id: string) {
    try {
      const user = await this.userModel
        .findById(id)
        .select('-password -refreshToken');
      if (!user) {
        return {
          status: HttpStatus.NOT_FOUND,
          response: ApiResponse({}, 'Account not found', false),
        };
      }
      return {
        status: HttpStatus.OK,
        response: ApiResponse(user, 'Profile details fetched successfully', true),
      };
    } catch (error: any) {
      console.error(error);
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        response: ApiResponse({}, error.message, false),
      };
    }
  }

  async updateProfile(id: string, body: any) {
    try {
      const user = await this.userModel.findById(id);
      if (!user) {
        return {
          status: HttpStatus.NOT_FOUND,
          response: ApiResponse({}, 'Account not found', false),
        };
      }

      const updatedFields: any = {
        firstName: body.firstName ? body.firstName : user.firstName,
        lastName: body.lastName ? body.lastName : user.lastName,
        phoneNumber: body.phoneNumber ? body.phoneNumber : user.phoneNumber,
      };

      if (body.organization !== undefined)
        updatedFields.organization = body.organization;
      if (body.country !== undefined) updatedFields.country = body.country;
      if (body.city !== undefined) updatedFields.city = body.city;
      if (body.state !== undefined) updatedFields.state = body.state;
      if (body.streetAddress !== undefined)
        updatedFields.streetAddress = body.streetAddress;
      if (body.zipCode !== undefined) updatedFields.zipCode = body.zipCode;

      if (body.image) {
        if (user.image) {
          const filepath = path.resolve('Uploads', user.image);
          if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
        }
        updatedFields.image = body.image;
      }

      const updatedUser = await this.userModel
        .findByIdAndUpdate(id, updatedFields, { new: true })
        .select('-password -refreshToken');

      return {
        status: HttpStatus.OK,
        response: ApiResponse(
          updatedUser,
          'Profile details updated successfully',
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

  async toggleStatus(id: string, status: string) {
    try {
      if (!status) {
        return {
          status: HttpStatus.BAD_REQUEST,
          response: ApiResponse({}, 'Status is required', false),
        };
      }
      const user = await this.userModel.findById(id);
      if (!user) {
        return {
          status: HttpStatus.NOT_FOUND,
          response: ApiResponse({}, 'User not found', false),
        };
      }
      user.status = status;
      const updated = await user.save();
      return {
        status: HttpStatus.OK,
        response: ApiResponse(updated, 'status updated successfully', true),
      };
    } catch (error: any) {
      console.error(error);
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        response: ApiResponse({}, error.message, false),
      };
    }
  }

  async getAdminAccount() {
    try {
      const admin = await this.userModel
        .findOne({ role: UserRole.ADMIN })
        .select('firstName lastName email _id');
      if (!admin) {
        return {
          status: HttpStatus.NOT_FOUND,
          response: ApiResponse({}, 'Admin account not found', false),
        };
      }
      return {
        status: HttpStatus.OK,
        response: ApiResponse(admin, 'Admin account fetched successfully', true),
      };
    } catch (error: any) {
      console.error(error);
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        response: ApiResponse({}, error.message, false),
      };
    }
  }

  async findByEmail(email: string) {
    return this.userModel.findOne({ email: email?.toLowerCase() }).exec();
  }

  async findByEmailAndRole(email: string, role: string) {
    return this.userModel.findOne({ email: email?.toLowerCase(), role }).exec();
  }

  async findOne(id: string) {
    return this.userModel.findById(id).exec();
  }
}
