import { HttpStatus, Injectable } from '@nestjs/common';
import { SubmitQuizDto } from './dto/create-lesson-quiz-response.dto';
import { InjectModel } from '@nestjs/mongoose';
import {
  LessonQuizResponse,
  LessonQuizResponseDocument,
} from 'src/models/lesson-quiz-response.schema';
import { Model, Types } from 'mongoose';
import { ApiResponse } from 'src/common/response';
import {
  LessonQuizQuestion,
  LessonQuizQuestionDocument,
  LessonQuizQuestionType,
} from 'src/models/lesson-quiz-question.schema';
import { Lesson, LessonDocument } from 'src/models/lesson.schema';
import { QUESTION_LESSON_TYPES } from 'src/common/constants/lesson.constants';
import { NotificationService } from 'src/notification/notification.service';
import { CourseQuizService } from 'src/lesson/course-quiz.service';

@Injectable()
export class LessonQuizResponseService {
  constructor(
    @InjectModel(LessonQuizResponse.name)
    private lessonQuizResponseModel: Model<LessonQuizResponseDocument>,
    @InjectModel(LessonQuizQuestion.name)
    private questionModel: Model<LessonQuizQuestionDocument>,
    @InjectModel(Lesson.name) private lessonModel: Model<LessonDocument>,
    private readonly notificationService: NotificationService,
    private readonly courseQuizService: CourseQuizService,
  ) {}

  async create(lessonId: string, userId: string, body: SubmitQuizDto) {
    try {
      const lessonDoc = await this.lessonModel
        .findById(lessonId)
        .select('type title')
        .lean()
        .exec();
      if (!lessonDoc) {
        return {
          status: HttpStatus.NOT_FOUND,
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
            'This lesson does not support quiz-style attempts',
            false,
          ),
        };
      }
      const questions = await this.questionModel.find({ lesson: lessonId });
      if (!questions.length) {
        return {
          status: HttpStatus.BAD_REQUEST,
          response: ApiResponse({}, 'Quiz not found for this lesson', false),
        };
      }

      let score = 0;
      let totalPoints = 0;
      const questionMap = new Map(questions.map((q) => [String(q._id), q]));
      const normalizeAnswer = (
        questionId: string,
        value: string | number | boolean,
      ) => {
        const q = questionMap.get(questionId);
        if (
          q?.type === LessonQuizQuestionType.SHORT_ANSWER &&
          typeof value === 'string'
        ) {
          return value.trim().toLowerCase();
        }
        return value;
      };
      const answerMap = new Map<string, string | number | boolean>();
      body.answers.forEach((a) => {
        answerMap.set(
          a.questionId.toString(),
          normalizeAnswer(a.questionId.toString(), a.answer),
        );
      });

      for (const question of questions) {
        totalPoints += question.points;
        const userAnswer = answerMap.get(String(question._id));
        if (userAnswer === undefined) continue;
        const correctAnswer = question.correctAnswer as unknown as
          | string
          | number
          | boolean;
        const isMatch = this.isAnswerCorrect(
          question.type,
          userAnswer,
          correctAnswer,
        );
        if (isMatch) score += question.points;
      }

      const percentage = totalPoints ? (score / totalPoints) * 100 : 0;
      const answers = body.answers.map((a) => ({
        question: a.questionId,
        answer: a.answer,
      }));
      const created = await this.lessonQuizResponseModel.create({
        lesson: lessonId,
        user: userId,
        answers,
        score,
        totalPoints,
        percentage,
      });

      const certMeta = await this.courseQuizService.tryIssueCertificateAfterQuizPass(
        String(userId),
        lessonId,
      );

      try {
        this.notificationService.sendNotificationToUser(
          String(userId),
          'Quiz submitted',
          `You scored ${Math.round(percentage)}% on ${lessonDoc.title}.`,
        );
      } catch (notifErr) {
        console.error(notifErr);
      }

      const payload = {
        ...(created.toObject?.() ?? created),
        ...certMeta,
      };

      return {
        status: HttpStatus.CREATED,
        response: ApiResponse(payload, 'Quiz submitted successfully', true),
      };
    } catch (error: any) {
      console.error(error);
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        response: ApiResponse({}, error.message, false),
      };
    }
  }

  private isAnswerCorrect(
    type: LessonQuizQuestionType | undefined,
    userAnswer: unknown,
    correctAnswer: unknown,
  ) {
    if (type === LessonQuizQuestionType.SHORT_ANSWER) {
      return (
        String(correctAnswer ?? '')
          .trim()
          .toLowerCase() === String(userAnswer ?? '').trim().toLowerCase()
      );
    }
    if (type === LessonQuizQuestionType.TRUE_FALSE) {
      const toBool = (value: unknown) => value === true || value === 'true';
      return toBool(userAnswer) === toBool(correctAnswer);
    }
    return userAnswer === correctAnswer;
  }

  async findAll(query: {
    lessonId: string;
    page?: string;
    limit?: string;
  }) {
    try {
      const page = query?.page ? parseInt(String(query.page), 10) : 1;
      const limit = query?.limit ? parseInt(String(query.limit), 10) : 10;
      const pipeline: any[] = [
        { $match: { lesson: new Types.ObjectId(query.lessonId) } },
        { $sort: { createdAt: -1 } },
        {
          $lookup: {
            from: 'users',
            localField: 'user',
            foreignField: '_id',
            as: 'user',
            pipeline: [
              { $project: { firstName: 1, lastName: 1, email: 1 } },
            ],
          },
        },
        { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
      ];
      const aggregate = this.lessonQuizResponseModel.aggregate(pipeline);
      const result = await (this.lessonQuizResponseModel as any).aggregatePaginate(
        aggregate,
        { page, limit },
      );
      return {
        status: HttpStatus.OK,
        response: ApiResponse(result, 'Quiz responses fetched', true),
      };
    } catch (error: any) {
      console.error(error);
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        response: ApiResponse({}, error.message, false),
      };
    }
  }

  async findById(id: string, userId: string, role?: string) {
    try {
      const doc = await this.lessonQuizResponseModel
        .findById(id)
        .populate({
          path: 'lesson',
          select: 'title type courseModule',
          populate: { path: 'courseModule', select: 'courseType title' },
        })
        .populate('user', 'firstName lastName email')
        .lean()
        .exec();
      if (!doc) {
        return {
          status: HttpStatus.NOT_FOUND,
          response: ApiResponse({}, 'Response not found', false),
        };
      }
      const populated = doc as any;
      const ownerId = populated.user?._id ?? populated.user;
      if (role !== 'admin' && String(ownerId) !== String(userId)) {
        return {
          status: HttpStatus.FORBIDDEN,
          response: ApiResponse({}, 'You cannot view this response', false),
        };
      }
      const questions = await this.questionModel
        .find({ lesson: populated.lesson?._id ?? populated.lesson })
        .lean()
        .exec();
      const questionMap = new Map(questions.map((q) => [String(q._id), q]));
      const answers = (doc.answers ?? []).map((item: any) => {
        const question = questionMap.get(String(item.question));
        const correctAnswer = question?.correctAnswer;
        const userAnswer = item.answer;
        const isMatch = this.isAnswerCorrect(
          question?.type,
          userAnswer,
          correctAnswer,
        );
        return {
          question: question
            ? {
                question: question.question,
                type: question.type,
                options: question.options,
                order: question.order,
                points: question.points,
                correctAnswer,
              }
            : item.question,
          answer: userAnswer,
          correct: isMatch,
        };
      });
      const lesson = doc.lesson as any;
      return {
        status: HttpStatus.OK,
        response: ApiResponse(
          {
            ...doc,
            lesson: lesson
              ? {
                  ...lesson,
                  courseType: lesson.courseModule?.courseType,
                }
              : lesson,
            answers,
          },
          'Quiz response fetched',
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
}
