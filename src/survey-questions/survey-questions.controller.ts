import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Res,
} from '@nestjs/common';
import { SurveyQuestionsService } from './survey-questions.service';
import { CreateSurveyQuestionDto } from './dto/create-survey-question.dto';
import { UpdateSurveyQuestionDto } from './dto/update-survey-question.dto';
import { AuthGuard } from 'src/decorators/auth.guard.decorator';
import { Response } from 'express';

@Controller('api/survey-questions')
export class SurveyQuestionsController {
  constructor(
    private readonly surveyQuestionsService: SurveyQuestionsService,
  ) {}

  @Post(':surveyId')
  @AuthGuard('admin')
  async create(
    @Param('surveyId') surveyId: string,
    @Body() questions: CreateSurveyQuestionDto[],
    @Res() res: Response,
  ) {
    const result = await this.surveyQuestionsService.create(surveyId, questions);
    return res.status(result.status).json(result.response);
  }

  @Get(':surveyId/questions')
  @AuthGuard('any')
  async findAll(@Param('surveyId') surveyId: string, @Res() res: Response) {
    const result = await this.surveyQuestionsService.findAll(surveyId);
    return res.status(result.status).json(result.response);
  }

  @Patch(':id')
  @AuthGuard('admin')
  async update(
    @Param('id') id: string,
    @Body() updateSurveyQuestionDto: UpdateSurveyQuestionDto,
    @Res() res: Response,
  ) {
    const result = await this.surveyQuestionsService.update(
      id,
      updateSurveyQuestionDto,
    );
    return res.status(result.status).json(result.response);
  }

  @Delete(':id')
  @AuthGuard('admin')
  async remove(@Param('id') id: string, @Res() res: Response) {
    const result = await this.surveyQuestionsService.remove(id);
    return res.status(result.status).json(result.response);
  }
}
