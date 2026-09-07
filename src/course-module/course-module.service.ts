import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  CourseModule,
  CourseModuleDocument,
} from 'src/models/course-module.schema';
import { Lesson, LessonDocument } from 'src/models/lesson.schema';
import { CreateCourseModuleDto } from './dto/create-course-module.dto';
import { UpdateCourseModuleDto } from './dto/update-course-module.dto';
import { ApiResponse } from 'src/common/response';
import { QueryDto } from 'src/dto/query.dto';

@Injectable()
export class CourseModuleService {
  constructor(
    @InjectModel(CourseModule.name)
    private courseModuleModel: Model<CourseModuleDocument>,
    @InjectModel(Lesson.name) private lessonModel: Model<LessonDocument>,
  ) {}

  private isStudentView(viewerRole?: string) {
    return viewerRole === 'student';
  }

  async create(createCourseModuleDto: CreateCourseModuleDto) {
    try {
      const created = await this.courseModuleModel.create({
        courseType: createCourseModuleDto.courseType,
        title: createCourseModuleDto.title,
        description: createCourseModuleDto.description,
        order: createCourseModuleDto.order,
        status: createCourseModuleDto.status ?? 'ACTIVE',
        duration: createCourseModuleDto.duration,
        totalLessons: 0,
      });
      return {
        status: HttpStatus.CREATED,
        response: ApiResponse(
          created,
          'Course module created successfully',
          true,
        ),
      };
    } catch (error: any) {
      console.error(error);
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        response: ApiResponse(
          {},
          error?.message ?? 'Failed to create course module',
          false,
        ),
      };
    }
  }

  async findByCourseType(query: QueryDto, viewerRole?: string) {
    try {
      const page = query?.page ? parseInt(String(query.page), 10) : 1;
      const limit = query?.limit ? parseInt(String(query.limit), 10) : 50;
      const courseType = query?.courseType?.trim();
      const keyword = query?.keyword?.trim();

      const match: Record<string, unknown> = {};
      if (courseType) match.courseType = courseType;
      if (this.isStudentView(viewerRole)) match.studentView = true;
      if (keyword) {
        match.$or = [
          { title: { $regex: keyword, $options: 'i' } },
          { description: { $regex: keyword, $options: 'i' } },
        ];
      }

      const pipeline: any[] = [];
      if (Object.keys(match).length) pipeline.push({ $match: match });
      pipeline.push({ $sort: { order: 1 } });
      pipeline.push({
        $lookup: {
          from: 'lessons',
          localField: '_id',
          foreignField: 'courseModule',
          as: 'lessons',
        },
      });
      if (this.isStudentView(viewerRole)) {
        pipeline.push({
          $addFields: {
            lessons: {
              $filter: {
                input: '$lessons',
                as: 'lesson',
                cond: { $eq: ['$$lesson.studentView', true] },
              },
            },
          },
        });
      }

      const aggregate = this.courseModuleModel.aggregate(pipeline);
      const result = await (this.courseModuleModel as any).aggregatePaginate(
        aggregate,
        { page, limit },
      );
      return {
        status: HttpStatus.OK,
        response: ApiResponse(
          result,
          'Course modules fetched successfully',
          true,
        ),
      };
    } catch (error: any) {
      console.error(error);
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        response: ApiResponse(
          {},
          error?.message ?? 'Failed to fetch course modules',
          false,
        ),
      };
    }
  }

  async findOne(id: string, viewerRole?: string) {
    try {
      const module = await this.courseModuleModel
        .findOne({
          _id: id,
          ...(this.isStudentView(viewerRole) ? { studentView: true } : {}),
        })
        .lean()
        .exec();
      if (!module) {
        return {
          status: HttpStatus.NOT_FOUND,
          response: ApiResponse({}, 'Course module not found', false),
        };
      }
      const lessons = await this.lessonModel
        .find({
          courseModule: id,
          ...(this.isStudentView(viewerRole) ? { studentView: true } : {}),
        })
        .sort({ order: 1 })
        .lean()
        .exec();
      return {
        status: HttpStatus.OK,
        response: ApiResponse(
          { ...module, lessons },
          'Course module fetched successfully',
          true,
        ),
      };
    } catch (error: any) {
      console.error(error);
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        response: ApiResponse(
          {},
          error?.message ?? 'Failed to fetch course module',
          false,
        ),
      };
    }
  }

  async update(id: string, updateCourseModuleDto: UpdateCourseModuleDto) {
    try {
      const existing = await this.courseModuleModel.findById(id).exec();
      if (!existing) {
        return {
          status: HttpStatus.NOT_FOUND,
          response: ApiResponse({}, 'Course module not found', false),
        };
      }

      const updatePayload: Record<string, unknown> = {
        ...updateCourseModuleDto,
      };

      if (updateCourseModuleDto.order !== undefined) {
        const newOrder = Number(updateCourseModuleDto.order);
        const oldOrder = existing.order;
        if (newOrder !== oldOrder) {
          const conflict = await this.courseModuleModel
            .findOne({
              courseType: existing.courseType,
              order: newOrder,
              _id: { $ne: id },
            })
            .exec();
          if (conflict) {
            await this.courseModuleModel
              .findByIdAndUpdate(conflict._id, { $set: { order: oldOrder } })
              .exec();
          }
          updatePayload.order = newOrder;
        }
      }

      const updated = await this.courseModuleModel
        .findByIdAndUpdate(id, { $set: updatePayload }, { new: true, runValidators: true })
        .lean()
        .exec();
      return {
        status: HttpStatus.OK,
        response: ApiResponse(
          updated,
          'Course module updated successfully',
          true,
        ),
      };
    } catch (error: any) {
      console.error(error);
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        response: ApiResponse(
          {},
          error?.message ?? 'Failed to update course module',
          false,
        ),
      };
    }
  }

  async remove(id: string) {
    try {
      const deleted = await this.courseModuleModel.findByIdAndDelete(id).exec();
      if (!deleted) {
        return {
          status: HttpStatus.NOT_FOUND,
          response: ApiResponse({}, 'Course module not found', false),
        };
      }
      await this.lessonModel.deleteMany({ courseModule: id }).exec();
      return {
        status: HttpStatus.OK,
        response: ApiResponse({}, 'Course module deleted successfully', true),
      };
    } catch (error: any) {
      console.error(error);
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        response: ApiResponse(
          {},
          error?.message ?? 'Failed to delete course module',
          false,
        ),
      };
    }
  }
}
