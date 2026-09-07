import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import {
  SurveyResponse,
  SurveyResponseDocument,
} from 'src/models/survey-response.schema';
import { Model, Types } from 'mongoose';
import { ApiResponse } from 'src/common/response';
import { Survey, SurveyDocument } from 'src/models/survey.schema';
import {
  SurveyQuestion,
  SurveyQuestionDocument,
} from 'src/models/survey-question.schema';
import { QueryDto } from 'src/dto/query.dto';
import { NotificationService } from 'src/notification/notification.service';

@Injectable()
export class SurveyAnswersService {
  constructor(
    @InjectModel(SurveyResponse.name)
    private surveyResponseModel: Model<SurveyResponseDocument>,
    @InjectModel(SurveyQuestion.name)
    private questionModel: Model<SurveyQuestionDocument>,
    @InjectModel(Survey.name) private surveyModel: Model<SurveyDocument>,
    private readonly notificationService: NotificationService,
  ) {}

  async create(surveyId: string, userId: string, answers: any[]) {
    try {
      const survey = await this.surveyModel.findById(surveyId);
      if (!survey) {
        return {
          status: HttpStatus.NOT_FOUND,
          response: ApiResponse({}, 'Survey not found', false),
        };
      }
      if (!survey.isActive) {
        return {
          status: HttpStatus.BAD_REQUEST,
          response: ApiResponse({}, 'This survey is not accepting responses', false),
        };
      }
      const existingResponse = await this.surveyResponseModel.findOne({
        survey: surveyId,
        user: userId,
      });

      if (existingResponse) {
        return {
          status: HttpStatus.BAD_REQUEST,
          response: ApiResponse(
            {},
            'You have already submitted this survey',
            false,
          ),
        };
      }

      const questions: any = await this.questionModel.find({
        survey: surveyId,
      });

      for (const question of questions) {
        if (question.required) {
          const answered = answers.find(
            (a) => a.question === question._id.toString(),
          );

          if (!answered) {
            return {
              status: HttpStatus.BAD_REQUEST,
              response: ApiResponse(
                {},
                `Question required: ${question.question}`,
                false,
              ),
            };
          }
        }
      }

      const response = await this.surveyResponseModel.create({
        survey: surveyId,
        user: userId,
        answers,
      });
      try {
        this.notificationService.sendNotificationToAdmin(
          'Survey submitted',
          `A survey response has been submitted for survey: ${survey.title}`,
          { surveyId, responseId: String(response._id) },
        );
      } catch (notifErr) {
        console.error('Failed to send survey submitted notification:', notifErr);
      }
      return {
        status: HttpStatus.CREATED,
        response: ApiResponse(
          response,
          'Survey response created successfully',
          true,
        ),
      };
    } catch (error: any) {
      console.error(error);
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        response: ApiResponse(
          {},
          (error as Error).message ?? 'Failed to create survey answer',
          false,
        ),
      };
    }
  }

  async findResponsesBySurveyId(surveyId: string, query: QueryDto) {
    try {
      if (!surveyId || !Types.ObjectId.isValid(surveyId)) {
        return {
          status: HttpStatus.BAD_REQUEST,
          response: ApiResponse({}, 'Valid survey id is required', false),
        };
      }
      const page = query?.page ? parseInt(String(query.page), 10) : 1;
      const limit = query?.limit ? parseInt(String(query.limit), 10) : 10;

      const survey = await this.surveyModel
        .findById(surveyId)
        .select('_id title description type')
        .lean();
      if (!survey) {
        return {
          status: HttpStatus.NOT_FOUND,
          response: ApiResponse({}, 'Survey not found', false),
        };
      }

      const aggregate = this.surveyResponseModel.aggregate([
        { $match: { survey: new Types.ObjectId(surveyId) } },
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
        {
          $lookup: {
            from: 'surveyquestions',
            localField: 'answers.question',
            foreignField: '_id',
            as: 'questionDocs',
          },
        },
        {
          $addFields: {
            answers: {
              $map: {
                input: '$answers',
                as: 'ans',
                in: {
                  question: {
                    $arrayElemAt: [
                      {
                        $filter: {
                          input: '$questionDocs',
                          as: 'q',
                          cond: { $eq: ['$$q._id', '$$ans.question'] },
                        },
                      },
                      0,
                    ],
                  },
                  answer: '$$ans.answer',
                },
              },
            },
          },
        },
        { $project: { questionDocs: 0 } },
      ]);

      const result = await (this.surveyResponseModel as any).aggregatePaginate(
        aggregate,
        { page, limit },
      );

      return {
        status: HttpStatus.OK,
        response: ApiResponse(
          {
            survey,
            ...result,
            responses: result.docs,
          },
          `${result.docs?.length ?? 0} responses found`,
          true,
        ),
      };
    } catch (error: any) {
      console.error(error);
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        response: ApiResponse(
          {},
          (error as Error).message ?? 'Failed to fetch survey responses',
          false,
        ),
      };
    }
  }

  async getSurveyStats(surveyId: string) {
    try {
      const totalResponses = await this.surveyResponseModel.countDocuments({
        survey: surveyId,
      });

      const totalQuestions = await this.questionModel.countDocuments({
        survey: surveyId,
      });

      const ratingStats = await this.surveyResponseModel.aggregate([
        { $match: { survey: new Types.ObjectId(surveyId) } },
        { $unwind: '$answers' },
        {
          $lookup: {
            from: 'surveyquestions',
            localField: 'answers.question',
            foreignField: '_id',
            as: 'question',
          },
        },
        { $unwind: '$question' },
        {
          $match: {
            'question.type': 'rating',
          },
        },
        {
          $group: {
            _id: null,
            avgRating: {
              $avg: {
                $toDouble: '$answers.answer',
              },
            },
          },
        },
      ]);

      return {
        status: HttpStatus.OK,
        response: ApiResponse(
          {
            totalResponses,
            totalQuestions,
            averageRating: ratingStats[0]?.avgRating || 0,
          },
          'Survey stats fetched successfully',
          true,
        ),
      };
    } catch (error: any) {
      console.error(error);
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        response: ApiResponse(
          {},
          (error as Error).message ?? 'Failed to fetch survey stats',
          false,
        ),
      };
    }
  }

  async getQuestionStats(surveyId: string) {
    try {
      const stats = await this.surveyResponseModel.aggregate([
        {
          $match: {
            survey: new Types.ObjectId(surveyId),
          },
        },
        { $unwind: '$answers' },
        {
          $lookup: {
            from: 'surveyquestions',
            localField: 'answers.question',
            foreignField: '_id',
            as: 'question',
          },
        },
        { $unwind: '$question' },
        {
          $group: {
            _id: '$answers.question',
            question: { $first: '$question.question' },
            type: { $first: '$question.type' },
            totalResponses: { $sum: 1 },
            avgRating: {
              $avg: {
                $cond: [
                  { $eq: ['$question.type', 'rating'] },
                  { $toDouble: '$answers.answer' },
                  null,
                ],
              },
            },
          },
        },
      ]);
      return {
        status: HttpStatus.OK,
        response: ApiResponse(
          stats,
          'Question stats fetched successfully',
          true,
        ),
      };
    } catch (error: any) {
      console.error(error);
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        response: ApiResponse(
          {},
          (error as Error).message ?? 'Failed to fetch question stats',
          false,
        ),
      };
    }
  }

  async findOne(id: string) {
    try {
      if (!id || !Types.ObjectId.isValid(id)) {
        return {
          status: HttpStatus.BAD_REQUEST,
          response: ApiResponse({}, 'Valid response id is required', false),
        };
      }
      const response = await this.surveyResponseModel
        .findById(id)
        .populate('user', 'firstName lastName email')
        .populate('answers.question', 'question type options order')
        .lean();
      if (!response) {
        return {
          status: HttpStatus.NOT_FOUND,
          response: ApiResponse({}, 'Survey response not found', false),
        };
      }
      return {
        status: HttpStatus.OK,
        response: ApiResponse(
          response,
          'Survey response fetched successfully',
          true,
        ),
      };
    } catch (error: any) {
      console.error(error);
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        response: ApiResponse(
          {},
          (error as Error).message ?? 'Failed to fetch survey response',
          false,
        ),
      };
    }
  }
}
