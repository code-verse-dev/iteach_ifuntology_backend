import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  LessonQuizQuestion,
  LessonQuizQuestionDocument,
} from 'src/models/lesson-quiz-question.schema';
import { Lesson, LessonDocument } from 'src/models/lesson.schema';
import { CreateLessonQuizQuestionDto } from './dto/create-lesson-quiz-question.dto';
import { UpdateLessonQuizQuestionDto } from './dto/update-lesson-quiz-question.dto';
import { ApiResponse } from 'src/common/response';
import { QUESTION_LESSON_TYPES } from 'src/common/constants/lesson.constants';

@Injectable()
export class LessonQuizQuestionService {
  constructor(
    @InjectModel(LessonQuizQuestion.name)
    private lessonQuizQuestionModel: Model<LessonQuizQuestionDocument>,
    @InjectModel(Lesson.name) private lessonModel: Model<LessonDocument>,
  ) {}

  async create(createLessonQuizQuestionDto: CreateLessonQuizQuestionDto) {
    try {
      const { questions, lesson } = createLessonQuizQuestionDto;
      const lessonDoc = await this.lessonModel.findById(lesson);
      if (!lessonDoc) {
        return {
          status: HttpStatus.BAD_REQUEST,
          response: ApiResponse({}, 'Lesson not found', false),
        };
      }
      if (
        !QUESTION_LESSON_TYPES.includes(
          lessonDoc.type as (typeof QUESTION_LESSON_TYPES)[number],
        )
      ) {
        return {
          status: HttpStatus.BAD_REQUEST,
          response: ApiResponse(
            {},
            'Lesson must be of type QUIZ, TEST, or EXAM',
            false,
          ),
        };
      }
      const docs = questions.map((q) => ({
        lesson: lessonDoc._id,
        question: q.question,
        type: q.type,
        options: q.options ?? [],
        correctAnswer: q.correctAnswer,
        points: q.points ?? 1,
        order: q.order,
      }));
      const created = await this.lessonQuizQuestionModel.insertMany(docs);
      return {
        status: HttpStatus.CREATED,
        response: ApiResponse(
          created,
          `${created.length} quiz question(s) created successfully`,
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

  async findByLesson(lessonId: string, includeCorrectAnswer: boolean) {
    try {
      if (!lessonId || !Types.ObjectId.isValid(lessonId)) {
        return {
          status: HttpStatus.BAD_REQUEST,
          response: ApiResponse({}, 'Valid lesson id is required', false),
        };
      }
      const docs = await this.lessonQuizQuestionModel
        .find({ lesson: new Types.ObjectId(lessonId) })
        .sort({ order: 1 })
        .lean();
      const questions = includeCorrectAnswer
        ? docs
        : docs.map(({ correctAnswer: _, ...rest }) => rest);
      return {
        status: HttpStatus.OK,
        response: ApiResponse(
          questions,
          'Quiz questions fetched successfully',
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

  async update(id: string, dto: UpdateLessonQuizQuestionDto) {
    try {
      const updated = await this.lessonQuizQuestionModel.findByIdAndUpdate(
        id,
        { $set: dto },
        { new: true },
      );
      if (!updated) {
        return {
          status: HttpStatus.NOT_FOUND,
          response: ApiResponse({}, 'Question not found', false),
        };
      }
      return {
        status: HttpStatus.OK,
        response: ApiResponse(updated, 'Question updated', true),
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
      const deleted = await this.lessonQuizQuestionModel.findByIdAndDelete(id);
      if (!deleted) {
        return {
          status: HttpStatus.NOT_FOUND,
          response: ApiResponse({}, 'Question not found', false),
        };
      }
      return {
        status: HttpStatus.OK,
        response: ApiResponse({}, 'Question deleted', true),
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
