import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  TeacherAssignment,
  TeacherAssignmentDocument,
} from 'src/models/teacher-assignment.schema';
import { User, UserDocument, UserRole } from 'src/models/user.schema';
import { ApiResponse } from 'src/common/response';
import { AssignmentItemDto } from './dto/assign-courses.dto';
import { NotificationService } from 'src/notification/notification.service';

@Injectable()
export class TeacherAssignmentService {
  constructor(
    @InjectModel(TeacherAssignment.name)
    private assignmentModel: Model<TeacherAssignmentDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private readonly notificationService: NotificationService,
  ) {}

  async findByTeacher(teacherId: string) {
    try {
      const assignments = await this.assignmentModel
        .find({ teacher: teacherId })
        .lean()
        .exec();
      return {
        status: HttpStatus.OK,
        response: ApiResponse(
          assignments,
          'Assignments fetched successfully',
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

  async assignCourses(teacherId: string, assignments: AssignmentItemDto[]) {
    try {
      const teacher = await this.userModel.findById(teacherId);
      if (!teacher || teacher.role !== UserRole.TEACHER) {
        return {
          status: HttpStatus.NOT_FOUND,
          response: ApiResponse({}, 'Teacher not found', false),
        };
      }

      const existing = await this.assignmentModel.find({ teacher: teacherId });
      const existingByType = new Map(
        existing.map((a) => [String(a.courseType), a]),
      );
      const incomingTypes = new Set(assignments.map((a) => String(a.courseType)));

      for (const current of existing) {
        if (!incomingTypes.has(String(current.courseType))) {
          if ((current.usedSeats ?? 0) > 0) {
            return {
              status: HttpStatus.BAD_REQUEST,
              response: ApiResponse(
                {},
                `Cannot remove ${current.courseType} while students are enrolled`,
                false,
              ),
            };
          }
          await this.assignmentModel.deleteOne({ _id: current._id });
        }
      }

      const saved: TeacherAssignmentDocument[] = [];
      for (const item of assignments) {
        const current = existingByType.get(String(item.courseType));
        const usedSeats = current?.usedSeats ?? 0;
        if (item.seats < usedSeats) {
          return {
            status: HttpStatus.BAD_REQUEST,
            response: ApiResponse(
              {},
              `Seats for ${item.courseType} cannot be less than used seats (${usedSeats})`,
              false,
            ),
          };
        }
        const updated = await this.assignmentModel.findOneAndUpdate(
          { teacher: teacherId, courseType: item.courseType },
          {
            $set: {
              teacher: teacherId,
              courseType: item.courseType,
              seats: item.seats,
              usedSeats,
            },
          },
          { upsert: true, new: true },
        );
        saved.push(updated);
      }

      try {
        this.notificationService.sendNotificationToUser(
          teacherId,
          'Courses assigned',
          'An admin updated your assigned courses and student seats.',
          { assignments: saved.map((a) => a.courseType) },
        );
      } catch (notifErr) {
        console.error(notifErr);
      }

      return {
        status: HttpStatus.OK,
        response: ApiResponse(saved, 'Assignments saved', true),
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
