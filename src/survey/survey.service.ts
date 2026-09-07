import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Survey, SurveyDocument } from 'src/models/survey.schema';
import {
  SurveyQuestion,
  SurveyQuestionDocument,
} from 'src/models/survey-question.schema';
import { CreateSurveyDto } from './dto/create-survey.dto';
import { UpdateSurveyDto } from './dto/update-survey.dto';
import { ApiResponse } from 'src/common/response';
import { QueryDto } from 'src/dto/query.dto';
import { UserRole } from 'src/models/user.schema';
import {
  SurveyResponse,
  SurveyResponseDocument,
} from 'src/models/survey-response.schema';

@Injectable()
export class SurveyService {
  constructor(
    @InjectModel(Survey.name) private surveyModel: Model<SurveyDocument>,
    @InjectModel(SurveyQuestion.name)
    private surveyQuestionModel: Model<SurveyQuestionDocument>,
    @InjectModel(SurveyResponse.name)
    private surveyResponseModel: Model<SurveyResponseDocument>,
  ) {}

  async create(createSurveyDto: CreateSurveyDto, createdBy?: string) {
    try {
      const surveyDoc = await this.surveyModel.create({
        title: createSurveyDto.title,
        description: createSurveyDto.description,
        type: createSurveyDto.type,
        targetRole: createSurveyDto.targetRole,
        isActive: createSurveyDto.isActive ?? true,
        ...(createdBy && { createdBy: new Types.ObjectId(createdBy) }),
      });
      if (createSurveyDto.questions?.length) {
        await this.surveyQuestionModel.insertMany(
          createSurveyDto.questions.map((q, index) => ({
            survey: surveyDoc._id,
            question: q.question,
            type: q.type,
            options: q.options,
            required: q.required ?? false,
            order: q.order ?? index,
          })),
        );
      }
      const survey = await this.surveyModel
        .findById(surveyDoc._id)
        .populate('createdBy', 'firstName lastName email')
        .lean();
      const questions = await this.surveyQuestionModel
        .find({ survey: surveyDoc._id })
        .sort({ order: 1 })
        .lean();
      return {
        status: HttpStatus.CREATED,
        response: ApiResponse(
          { ...survey, questions },
          'Survey created successfully',
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

  async findAll(query: QueryDto, role?: string) {
    try {
      const page = query?.page ? parseInt(String(query.page), 10) : 1;
      const limit = query?.limit ? parseInt(String(query.limit), 10) : 10;
      const type = query?.type?.trim();
      const targetRole = query?.role?.trim();
      const match: Record<string, unknown> = {};
      if (type) match.type = type;
      if (role && role !== UserRole.ADMIN) {
        match.targetRole = role;
        match.isActive = true;
      } else if (targetRole) {
        match.targetRole = targetRole;
      }
      const pipeline: any[] = [];
      if (Object.keys(match).length) pipeline.push({ $match: match });
      pipeline.push({ $sort: { createdAt: -1 } });
      pipeline.push({
        $lookup: {
          from: 'surveyquestions',
          localField: '_id',
          foreignField: 'survey',
          as: 'questions',
        },
      });
      pipeline.push({
        $lookup: {
          from: 'surveyresponses',
          localField: '_id',
          foreignField: 'survey',
          as: 'responses',
        },
      });
      pipeline.push({
        $addFields: {
          totalQuestions: { $size: '$questions' },
          totalResponses: { $size: '$responses' },
        },
      });
      pipeline.push({ $project: { questions: 0, responses: 0 } });
      const aggregate = this.surveyModel.aggregate(pipeline);
      const result = await (this.surveyModel as any).aggregatePaginate(
        aggregate,
        { page, limit },
      );
      return {
        status: HttpStatus.OK,
        response: ApiResponse(
          result,
          `${result.docs?.length ?? 0} surveys found`,
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

  async findOne(surveyId: string) {
    try {
      const survey = await this.surveyModel.findById(surveyId).lean();
      if (!survey) {
        return {
          status: HttpStatus.NOT_FOUND,
          response: ApiResponse({}, 'Survey not found', false),
        };
      }
      const questions = await this.surveyQuestionModel
        .find({ survey: surveyId })
        .sort({ order: 1 })
        .lean();
      return {
        status: HttpStatus.OK,
        response: ApiResponse({ ...survey, questions }, 'Survey fetched', true),
      };
    } catch (error: any) {
      console.error(error);
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        response: ApiResponse({}, error.message, false),
      };
    }
  }

  async update(surveyId: string, dto: UpdateSurveyDto) {
    try {
      const { questions, ...rest } = dto as any;
      const updated = await this.surveyModel.findByIdAndUpdate(
        surveyId,
        { $set: rest },
        { new: true },
      );
      if (!updated) {
        return {
          status: HttpStatus.NOT_FOUND,
          response: ApiResponse({}, 'Survey not found', false),
        };
      }
      return {
        status: HttpStatus.OK,
        response: ApiResponse(updated, 'Survey updated', true),
      };
    } catch (error: any) {
      console.error(error);
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        response: ApiResponse({}, error.message, false),
      };
    }
  }

  async remove(surveyId: string) {
    try {
      const deleted = await this.surveyModel.findByIdAndDelete(surveyId);
      if (!deleted) {
        return {
          status: HttpStatus.NOT_FOUND,
          response: ApiResponse({}, 'Survey not found', false),
        };
      }
      await this.surveyQuestionModel.deleteMany({ survey: surveyId });
      await this.surveyResponseModel.deleteMany({ survey: surveyId });
      return {
        status: HttpStatus.OK,
        response: ApiResponse({}, 'Survey deleted', true),
      };
    } catch (error: any) {
      console.error(error);
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        response: ApiResponse({}, error.message, false),
      };
    }
  }

  async findAvailable(userId: string, role: string) {
    try {
      if (!userId || !role) {
        return {
          status: HttpStatus.BAD_REQUEST,
          response: ApiResponse({}, 'Valid user is required', false),
        };
      }
      const [surveys, userResponses] = await Promise.all([
        this.surveyModel
          .find({ targetRole: role, isActive: true })
          .sort({ createdAt: -1 })
          .lean()
          .exec(),
        this.surveyResponseModel
          .find({ user: userId })
          .select('_id survey')
          .lean()
          .exec(),
      ]);
      const responseBySurvey = new Map(
        userResponses.map((res) => [String(res.survey), String(res._id)]),
      );
      const data = surveys.map((survey) => {
        const responseId = responseBySurvey.get(String(survey._id)) ?? null;
        return {
          ...survey,
          isSubmitted: !!responseId,
          responseId,
        };
      });
      return {
        status: HttpStatus.OK,
        response: ApiResponse(data, 'Available surveys fetched', true),
      };
    } catch (error: any) {
      console.error(error);
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        response: ApiResponse({}, error.message, false),
      };
    }
  }

  async toggle(surveyId: string) {
    try {
      const survey = await this.surveyModel.findById(surveyId);
      if (!survey) {
        return {
          status: HttpStatus.NOT_FOUND,
          response: ApiResponse({}, 'Survey not found', false),
        };
      }
      survey.isActive = !survey.isActive;
      await survey.save();
      return {
        status: HttpStatus.OK,
        response: ApiResponse(survey, 'Survey status updated', true),
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
