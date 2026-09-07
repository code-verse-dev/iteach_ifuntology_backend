import { HttpStatus, Injectable } from '@nestjs/common';
import { CreateSurveyQuestionDto } from './dto/create-survey-question.dto';
import { UpdateSurveyQuestionDto } from './dto/update-survey-question.dto';
import { InjectModel } from '@nestjs/mongoose';
import {
  SurveyQuestion,
  SurveyQuestionDocument,
} from 'src/models/survey-question.schema';
import { Model } from 'mongoose';
import { ApiResponse } from 'src/common/response';
import { Survey, SurveyDocument } from 'src/models/survey.schema';

@Injectable()
export class SurveyQuestionsService {
  constructor(
    @InjectModel(SurveyQuestion.name)
    private surveyQuestionModel: Model<SurveyQuestionDocument>,
    @InjectModel(Survey.name) private surveyModel: Model<SurveyDocument>,
  ) {}

  async create(surveyId: string, questions: CreateSurveyQuestionDto[]) {
    try {
      const survey = await this.surveyModel.findById(surveyId);
      if (!survey) {
        return {
          status: HttpStatus.NOT_FOUND,
          response: ApiResponse({}, 'Survey not found', false),
        };
      }
      if (!questions || questions.length === 0) {
        return {
          status: HttpStatus.BAD_REQUEST,
          response: ApiResponse({}, 'Questions are required', false),
        };
      }
      const createdQuestions = await this.surveyQuestionModel.insertMany(
        questions.map((q) => ({ ...q, survey: surveyId })),
      );
      return {
        status: HttpStatus.CREATED,
        response: ApiResponse(
          createdQuestions,
          'Survey questions created successfully',
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

  async findAll(surveyId: string) {
    try {
      const questions = await this.surveyQuestionModel
        .find({ survey: surveyId })
        .sort({ order: 1 })
        .lean();
      return {
        status: HttpStatus.OK,
        response: ApiResponse(
          questions,
          'Survey questions fetched successfully',
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

  async update(id: string, dto: UpdateSurveyQuestionDto) {
    try {
      const updated = await this.surveyQuestionModel.findByIdAndUpdate(
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
      const deleted = await this.surveyQuestionModel.findByIdAndDelete(id);
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
