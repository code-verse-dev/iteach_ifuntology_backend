import { HttpStatus, Injectable } from '@nestjs/common';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';
import { ApiResponse } from 'src/common/response';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { Lesson, LessonDocument } from 'src/models/lesson.schema';
import { Model, Connection } from 'mongoose';
import { removeFromUploads } from 'src/helpers';
import {
  CourseModule,
  CourseModuleDocument,
} from 'src/models/course-module.schema';
import { QueryDto } from 'src/dto/query.dto';
import { QUESTION_LESSON_TYPES } from 'src/common/constants/lesson.constants';

@Injectable()
export class LessonService {
  constructor(
    @InjectModel(Lesson.name)
    private readonly lessonModel: Model<LessonDocument>,
    @InjectModel(CourseModule.name)
    private readonly courseModuleModel: Model<CourseModuleDocument>,
    @InjectConnection() private readonly connection: Connection,
  ) {}

  private isStudentView(viewerRole?: string) {
    return viewerRole === 'student';
  }

  async create(filesData: any, createLessonDto: CreateLessonDto) {
    const session = await this.connection.startSession();
    try {
      await session.startTransaction();
      const { title, description, courseModule, type, order, duration } =
        createLessonDto;
      const file = filesData?.file;
      const video = filesData?.video;

      if (type === 'PDF' && !file) throw new Error('File is required');
      if (type === 'VIDEO' && !video) throw new Error('Video is required');

      const moduleDoc = await this.courseModuleModel
        .findById(courseModule)
        .session(session);
      if (!moduleDoc) throw new Error('Course module not found');

      const existingLesson = await this.lessonModel
        .findOne({ title, courseModule })
        .session(session);
      if (existingLesson) throw new Error('Lesson with this title already exists');

      const existingOrder = await this.lessonModel
        .findOne({ courseModule, order })
        .session(session);
      if (existingOrder) {
        throw new Error('A lesson with this order already exists in this module');
      }

      const data: any = { title, courseModule, type, order, duration };
      if (description !== undefined) data.description = description;
      if (type === 'PDF') {
        data.fileUrl = file[0]?.filename;
        data.allowPdfPreview = createLessonDto.allowPdfPreview ?? true;
        data.allowPdfDownload = createLessonDto.allowPdfDownload ?? true;
      }
      if (type === 'VIDEO') {
        data.fileUrl = video[0]?.filename;
      }

      const createdLesson = await this.lessonModel.create([data], { session });
      await this.courseModuleModel.updateOne(
        { _id: courseModule },
        { $inc: { totalLessons: 1 } },
        { session },
      );
      await session.commitTransaction();
      return {
        status: HttpStatus.CREATED,
        response: ApiResponse(
          createdLesson[0],
          'Lesson created successfully',
          true,
        ),
      };
    } catch (error: any) {
      await session.abortTransaction();
      return {
        status: HttpStatus.BAD_REQUEST,
        response: ApiResponse({}, error.message, false),
      };
    } finally {
      await session.endSession();
    }
  }

  async findAll(courseModule?: string, viewerRole?: string) {
    try {
      const filter: Record<string, unknown> = {};
      if (courseModule) filter.courseModule = courseModule;
      if (this.isStudentView(viewerRole)) filter.studentView = true;
      const lessons = await this.lessonModel
        .find(filter)
        .sort({ order: 1 })
        .lean()
        .exec();
      return {
        status: HttpStatus.OK,
        response: ApiResponse(lessons, 'Lessons fetched successfully', true),
      };
    } catch (error: any) {
      console.error(error);
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        response: ApiResponse({}, error.message, false),
      };
    }
  }

  async getQuizzes(query: QueryDto) {
    try {
      const page = query?.page ? parseInt(String(query.page), 10) : 1;
      const limit = query?.limit ? parseInt(String(query.limit), 10) : 10;
      const courseType = (query?.courseType || query?.course || '').trim();
      const keyword = query?.keyword?.trim();
      const type = query?.type?.trim();
      const status = query?.status?.trim();

      const typeFilter =
        type && QUESTION_LESSON_TYPES.includes(type as any)
          ? type
          : { $in: ['QUIZ', 'TEST', 'EXAM'] };
      const match: Record<string, unknown> = {
        type: typeFilter,
        ...(status ? { status } : {}),
      };

      if (courseType) {
        const escaped = courseType.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const modules = await this.courseModuleModel
          .find({ courseType: { $regex: `^${escaped}$`, $options: 'i' } })
          .select('_id')
          .lean()
          .exec();
        const moduleIds = modules.map((mod) => mod._id);
        match.courseModule = { $in: [...moduleIds, ...moduleIds.map((id) => String(id))] };
      }

      const pipeline: any[] = [
        { $match: match },
        {
          $addFields: {
            courseModuleObjId: {
              $convert: {
                input: '$courseModule',
                to: 'objectId',
                onError: '$courseModule',
                onNull: null,
              },
            },
          },
        },
        {
          $lookup: {
            from: 'coursemodules',
            localField: 'courseModuleObjId',
            foreignField: '_id',
            as: 'courseModuleDoc',
          },
        },
        { $unwind: { path: '$courseModuleDoc', preserveNullAndEmptyArrays: true } },
      ];
      if (keyword) {
        pipeline.push({
          $match: { title: { $regex: keyword, $options: 'i' } },
        });
      }
      pipeline.push({
        $lookup: {
          from: 'lessonquizquestions',
          localField: '_id',
          foreignField: 'lesson',
          as: 'questionDocs',
        },
      });
      pipeline.push({
        $addFields: {
          courseModule: {
            _id: '$courseModuleDoc._id',
            name: '$courseModuleDoc.title',
            title: '$courseModuleDoc.title',
            courseType: '$courseModuleDoc.courseType',
          },
          noOfQuestions: { $size: '$questionDocs' },
        },
      });
      pipeline.push({
        $project: { questionDocs: 0, courseModuleDoc: 0, courseModuleObjId: 0 },
      });
      pipeline.push({ $sort: { createdAt: -1 } });

      const aggregate = this.lessonModel.aggregate(pipeline);
      const result = await (this.lessonModel as any).aggregatePaginate(
        aggregate,
        { page, limit },
      );
      return {
        status: HttpStatus.OK,
        response: ApiResponse(result, 'Quizzes fetched successfully', true),
      };
    } catch (error: any) {
      console.error(error);
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        response: ApiResponse({}, error.message, false),
      };
    }
  }

  async findOne(id: string, viewerRole?: string) {
    try {
      const lesson = await this.lessonModel
        .findOne({
          _id: id,
          ...(this.isStudentView(viewerRole) ? { studentView: true } : {}),
        })
        .populate('courseModule')
        .lean()
        .exec();
      if (!lesson) {
        return {
          status: HttpStatus.NOT_FOUND,
          response: ApiResponse({}, 'Lesson not found', false),
        };
      }
      return {
        status: HttpStatus.OK,
        response: ApiResponse(lesson, 'Lesson fetched successfully', true),
      };
    } catch (error: any) {
      console.error(error);
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        response: ApiResponse({}, error.message, false),
      };
    }
  }

  async updateStatus(id: string, status: string) {
    try {
      const updated = await this.lessonModel.findByIdAndUpdate(
        id,
        { $set: { status } },
        { new: true },
      );
      if (!updated) {
        return {
          status: HttpStatus.NOT_FOUND,
          response: ApiResponse({}, 'Lesson not found', false),
        };
      }
      return {
        status: HttpStatus.OK,
        response: ApiResponse(updated, 'Lesson status updated', true),
      };
    } catch (error: any) {
      console.error(error);
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        response: ApiResponse({}, error.message, false),
      };
    }
  }

  async update(id: string, dto: UpdateLessonDto, files?: any) {
    try {
      const lesson = await this.lessonModel.findById(id);
      if (!lesson) {
        return {
          status: HttpStatus.NOT_FOUND,
          response: ApiResponse({}, 'Lesson not found', false),
        };
      }
      const update: any = { ...dto };
      if (files?.file?.[0]) {
        removeFromUploads(lesson.fileUrl);
        update.fileUrl = files.file[0].filename;
      }
      if (files?.video?.[0]) {
        removeFromUploads(lesson.fileUrl);
        update.fileUrl = files.video[0].filename;
      }
      const updated = await this.lessonModel.findByIdAndUpdate(
        id,
        { $set: update },
        { new: true },
      );
      return {
        status: HttpStatus.OK,
        response: ApiResponse(updated, 'Lesson updated successfully', true),
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
      const deleted = await this.lessonModel.findByIdAndDelete(id);
      if (!deleted) {
        return {
          status: HttpStatus.NOT_FOUND,
          response: ApiResponse({}, 'Lesson not found', false),
        };
      }
      removeFromUploads(deleted.fileUrl);
      await this.courseModuleModel.updateOne(
        { _id: deleted.courseModule },
        { $inc: { totalLessons: -1 } },
      );
      return {
        status: HttpStatus.OK,
        response: ApiResponse({}, 'Lesson deleted successfully', true),
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
