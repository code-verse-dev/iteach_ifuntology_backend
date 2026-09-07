import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { VidLibrary, VidLibraryDocument } from 'src/models/vid-library.schema';
import { CreateVidLibraryDto } from './dto/create-vid-library.dto';
import { UpdateVidLibraryDto } from './dto/update-vid-library.dto';
import { ApiResponse } from 'src/common/response';
import { QueryDto } from 'src/dto/query.dto';
import { removeFromUploads } from 'src/helpers';
import { CourseType } from 'src/models/course.schema';
import { UserRole } from 'src/models/user.schema';
import {
  TeacherAssignment,
  TeacherAssignmentDocument,
} from 'src/models/teacher-assignment.schema';
import {
  StudentEnrollment,
  StudentEnrollmentDocument,
} from 'src/models/student-enrollment.schema';

type Viewer = { _id?: string; role?: string };

@Injectable()
export class VidLibraryService {
  constructor(
    @InjectModel(VidLibrary.name)
    private vidLibraryModel: Model<VidLibraryDocument>,
    @InjectModel(TeacherAssignment.name)
    private assignmentModel: Model<TeacherAssignmentDocument>,
    @InjectModel(StudentEnrollment.name)
    private enrollmentModel: Model<StudentEnrollmentDocument>,
  ) {}

  async getAccessibleCourseTypes(viewer?: Viewer) {
    try {
      const courseTypes = await this.resolveAccessibleCourseTypes(viewer);
      return {
        status: HttpStatus.OK,
        response: ApiResponse(
          { courseTypes },
          'Accessible course types fetched',
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

  async create(dto: CreateVidLibraryDto, video?: Express.Multer.File) {
    try {
      if (!video) {
        return {
          status: HttpStatus.BAD_REQUEST,
          response: ApiResponse({}, 'Video is required', false),
        };
      }
      const created = await this.vidLibraryModel.create({
        courseType: dto.courseType,
        title: dto.title,
        fileUrl: video.filename,
      });
      return {
        status: HttpStatus.CREATED,
        response: ApiResponse(created, 'Video added', true),
      };
    } catch (error: any) {
      console.error(error);
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        response: ApiResponse({}, error.message, false),
      };
    }
  }

  async findAll(query: QueryDto, viewer?: Viewer) {
    try {
      const page = query?.page ? parseInt(String(query.page), 10) : 1;
      const limit = query?.limit ? parseInt(String(query.limit), 10) : 10;
      const requestedType = (query?.courseType || query?.course || '').trim();
      const keyword = query?.keyword?.trim();
      const accessible = await this.resolveAccessibleCourseTypes(viewer);

      if (viewer?.role !== UserRole.ADMIN && !accessible.length) {
        return {
          status: HttpStatus.OK,
          response: ApiResponse(
            { docs: [], totalDocs: 0, page, limit, totalPages: 0 },
            'Videos fetched successfully',
            true,
          ),
        };
      }

      if (requestedType && viewer?.role !== UserRole.ADMIN && !accessible.includes(requestedType as CourseType)) {
        return {
          status: HttpStatus.FORBIDDEN,
          response: ApiResponse({}, 'You do not have access to this course', false),
        };
      }

      const match: Record<string, unknown> = {};
      if (requestedType) {
        match.courseType = requestedType;
      } else if (viewer?.role !== UserRole.ADMIN) {
        match.courseType = { $in: accessible };
      }
      if (keyword) {
        match.$or = [
          { title: { $regex: keyword, $options: 'i' } },
          { courseType: { $regex: keyword, $options: 'i' } },
        ];
      }

      const pipeline: any[] = [];
      if (Object.keys(match).length) pipeline.push({ $match: match });
      pipeline.push({ $sort: { createdAt: -1 } });
      const aggregate = this.vidLibraryModel.aggregate(pipeline);
      const result = await (this.vidLibraryModel as any).aggregatePaginate(
        aggregate,
        { page, limit },
      );
      return {
        status: HttpStatus.OK,
        response: ApiResponse(result, 'Videos fetched successfully', true),
      };
    } catch (error: any) {
      console.error(error);
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        response: ApiResponse({}, error.message, false),
      };
    }
  }

  async findOne(id: string, viewer?: Viewer) {
    try {
      const video = await this.vidLibraryModel.findById(id);
      if (!video) {
        return {
          status: HttpStatus.NOT_FOUND,
          response: ApiResponse({}, 'Video not found', false),
        };
      }
      const allowed = await this.canAccessCourseType(viewer, video.courseType);
      if (!allowed) {
        return {
          status: HttpStatus.FORBIDDEN,
          response: ApiResponse({}, 'You cannot view this video', false),
        };
      }
      return {
        status: HttpStatus.OK,
        response: ApiResponse(video, 'Video fetched', true),
      };
    } catch (error: any) {
      console.error(error);
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        response: ApiResponse({}, error.message, false),
      };
    }
  }

  async update(
    id: string,
    dto: UpdateVidLibraryDto,
    video?: Express.Multer.File,
  ) {
    try {
      const existing = await this.vidLibraryModel.findById(id);
      if (!existing) {
        return {
          status: HttpStatus.NOT_FOUND,
          response: ApiResponse({}, 'Video not found', false),
        };
      }
      const update: any = { ...dto };
      if (video) {
        removeFromUploads(existing.fileUrl);
        update.fileUrl = video.filename;
      }
      const updated = await this.vidLibraryModel.findByIdAndUpdate(
        id,
        { $set: update },
        { new: true },
      );
      return {
        status: HttpStatus.OK,
        response: ApiResponse(updated, 'Video updated', true),
      };
    } catch (error: any) {
      console.error(error);
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        response: ApiResponse({}, error.message, false),
      };
    }
  }

  async remove(id: string) {
    try {
      const deleted = await this.vidLibraryModel.findByIdAndDelete(id);
      if (!deleted) {
        return {
          status: HttpStatus.NOT_FOUND,
          response: ApiResponse({}, 'Video not found', false),
        };
      }
      removeFromUploads(deleted.fileUrl);
      if (deleted.videoThumbnail) removeFromUploads(deleted.videoThumbnail);
      return {
        status: HttpStatus.OK,
        response: ApiResponse({}, 'Video deleted', true),
      };
    } catch (error: any) {
      console.error(error);
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        response: ApiResponse({}, error.message, false),
      };
    }
  }

  private async resolveAccessibleCourseTypes(viewer?: Viewer): Promise<CourseType[]> {
    if (!viewer?._id) return [];
    if (viewer.role === UserRole.ADMIN) return Object.values(CourseType);

    if (viewer.role === UserRole.TEACHER) {
      const types = await this.assignmentModel
        .distinct('courseType', { teacher: new Types.ObjectId(String(viewer._id)) })
        .exec();
      return types as CourseType[];
    }

    if (viewer.role === UserRole.STUDENT) {
      const types = await this.enrollmentModel
        .distinct('courseType', {
          user: new Types.ObjectId(String(viewer._id)),
          status: 'ACTIVE',
        })
        .exec();
      return types as CourseType[];
    }

    return [];
  }

  private async canAccessCourseType(viewer: Viewer | undefined, courseType: string) {
    if (viewer?.role === UserRole.ADMIN) return true;
    const types = await this.resolveAccessibleCourseTypes(viewer);
    return types.includes(courseType as CourseType);
  }
}
