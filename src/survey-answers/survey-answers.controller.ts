import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Res,
  Req,
  Query,
} from '@nestjs/common';
import { SurveyAnswersService } from './survey-answers.service';
import { CreateSurveyAnswerDto } from './dto/create-survey-answer.dto';
import { Request, Response } from 'express';
import { AuthGuard } from 'src/decorators/auth.guard.decorator';
import { QueryDto } from 'src/dto/query.dto';

@Controller('/api/survey-answers')
export class SurveyAnswersController {
  constructor(private readonly surveyAnswersService: SurveyAnswersService) {}

  @Post(':surveyId')
  @AuthGuard('any')
  async create(
    @Param('surveyId') surveyId: string,
    @Body() body: CreateSurveyAnswerDto,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const userId = (req as any).user?._id;
    const result = await this.surveyAnswersService.create(
      surveyId,
      userId,
      body.answers,
    );
    return res.status(result.status).json(result.response);
  }

  @Get('by-id/:id')
  @AuthGuard('any')
  async findOne(@Param('id') id: string, @Res() res: Response) {
    const result = await this.surveyAnswersService.findOne(id);
    return res.status(result.status).json(result.response);
  }

  @Get(':surveyId')
  @AuthGuard('admin')
  async getSurveyResponses(
    @Param('surveyId') surveyId: string,
    @Query() query: QueryDto,
    @Res() res: Response,
  ) {
    const result = await this.surveyAnswersService.findResponsesBySurveyId(
      surveyId,
      query,
    );
    return res.status(result.status).json(result.response);
  }

  @Get('/:surveyId/stats')
  @AuthGuard('admin')
  async getSurveyStats(
    @Param('surveyId') surveyId: string,
    @Res() res: Response,
  ) {
    const result = await this.surveyAnswersService.getSurveyStats(surveyId);
    return res.status(result.status).json(result.response);
  }

  @Get('/:surveyId/question-stats')
  @AuthGuard('admin')
  async getQuestionStats(
    @Param('surveyId') surveyId: string,
    @Res() res: Response,
  ) {
    const result = await this.surveyAnswersService.getQuestionStats(surveyId);
    return res.status(result.status).json(result.response);
  }

}
