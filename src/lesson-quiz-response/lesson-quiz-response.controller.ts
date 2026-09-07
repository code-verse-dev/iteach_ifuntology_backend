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
import { LessonQuizResponseService } from './lesson-quiz-response.service';
import { SubmitQuizDto } from './dto/create-lesson-quiz-response.dto';
import { Request, Response } from 'express';
import { AuthGuard } from 'src/decorators/auth.guard.decorator';

@Controller('/api/lesson-quiz-response')
export class LessonQuizResponseController {
  constructor(
    private readonly lessonQuizResponseService: LessonQuizResponseService,
  ) {}

  @Get('by-id/:id')
  @AuthGuard('any')
  async findById(
    @Param('id') id: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const result = await this.lessonQuizResponseService.findById(
      id,
      String((req as any).user._id),
      (req as any).user?.role,
    );
    return res.status(result.status).json(result.response);
  }

  @Post(':lessonId')
  @AuthGuard('any')
  async create(
    @Param('lessonId') lessonId: string,
    @Body() body: SubmitQuizDto,
    @Res() res: Response,
    @Req() req: Request,
  ) {
    const userId = (req as any).user._id;
    const result = await this.lessonQuizResponseService.create(
      lessonId,
      userId,
      body,
    );
    return res.status(result.status).json(result.response);
  }

  @Get(':lessonId')
  @AuthGuard('admin')
  async findAll(
    @Param('lessonId') lessonId: string,
    @Query('page') page: string | undefined,
    @Query('limit') limit: string | undefined,
    @Res() res: Response,
  ) {
    const result = await this.lessonQuizResponseService.findAll({
      lessonId,
      page,
      limit,
    });
    return res.status(result.status).json(result.response);
  }
}
