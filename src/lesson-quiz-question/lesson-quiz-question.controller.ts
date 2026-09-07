import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Res,
  Req,
} from '@nestjs/common';
import { LessonQuizQuestionService } from './lesson-quiz-question.service';
import { CreateLessonQuizQuestionDto } from './dto/create-lesson-quiz-question.dto';
import { UpdateLessonQuizQuestionDto } from './dto/update-lesson-quiz-question.dto';
import { AuthGuard } from 'src/decorators/auth.guard.decorator';
import { Response, Request } from 'express';

@Controller('/api/lesson-quiz-question')
export class LessonQuizQuestionController {
  constructor(
    private readonly lessonQuizQuestionService: LessonQuizQuestionService,
  ) {}

  @Post()
  @AuthGuard('admin')
  async create(
    @Body() createLessonQuizQuestionDto: CreateLessonQuizQuestionDto,
    @Res() res: Response,
  ) {
    const result = await this.lessonQuizQuestionService.create(
      createLessonQuizQuestionDto,
    );
    return res.status(result.status).json(result.response);
  }

  @Get(':lessonId')
  @AuthGuard('any')
  async getQuizQuestionsByLesson(
    @Param('lessonId') lessonId: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const role = (req as any).user?.role;
    const includeCorrectAnswer = role === 'admin';
    const result = await this.lessonQuizQuestionService.findByLesson(
      lessonId,
      includeCorrectAnswer,
    );
    return res.status(result.status).json(result.response);
  }

  @Patch(':id')
  @AuthGuard('admin')
  async update(
    @Param('id') id: string,
    @Body() updateLessonQuizQuestionDto: UpdateLessonQuizQuestionDto,
    @Res() res: Response,
  ) {
    const result = await this.lessonQuizQuestionService.update(
      id,
      updateLessonQuizQuestionDto,
    );
    return res.status(result.status).json(result.response);
  }

  @Delete(':id')
  @AuthGuard('admin')
  async remove(@Param('id') id: string, @Res() res: Response) {
    const result = await this.lessonQuizQuestionService.remove(id);
    return res.status(result.status).json(result.response);
  }
}
