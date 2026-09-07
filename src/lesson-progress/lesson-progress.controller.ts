import { Controller, Get, Post, Body, Param, Res, Req, Query } from '@nestjs/common';
import { LessonProgressService } from './lesson-progress.service';
import {
  CreateLessonProgressDto,
  CompleteModuleDto,
} from './dto/create-lesson-progress.dto';
import { Response, Request } from 'express';
import { AuthGuard } from 'src/decorators/auth.guard.decorator';

@Controller('/api/lesson-progress')
export class LessonProgressController {
  constructor(private readonly lessonProgressService: LessonProgressService) {}

  @Post('/complete')
  @AuthGuard('student')
  async markLessonCompleted(
    @Body() createLessonProgressDto: CreateLessonProgressDto,
    @Res() res: Response,
    @Req() req: Request,
  ) {
    const studentId = (req as any).user._id;
    const result = await this.lessonProgressService.markLessonCompleted(
      createLessonProgressDto,
      studentId,
    );
    return res.status(result.status).json(result.response);
  }

  @Post('module/complete')
  @AuthGuard('student')
  async markModuleCompleted(
    @Body() dto: CompleteModuleDto,
    @Res() res: Response,
    @Req() req: Request,
  ) {
    const studentId = (req as any).user._id;
    const result = await this.lessonProgressService.markModuleCompleted(
      dto,
      studentId,
    );
    return res.status(result.status).json(result.response);
  }

  @Get('teacher/average-progress')
  @AuthGuard('teacher')
  async getAverageProgress(
    @Query('courseType') courseType: string,
    @Res() res: Response,
    @Req() req: Request,
  ) {
    const teacherId = (req as any).user._id;
    const result =
      await this.lessonProgressService.getAverageProgressByCourseType(
        teacherId,
        courseType,
      );
    return res.status(result.status).json(result.response);
  }

  @Get('student/average-progress')
  @AuthGuard('student')
  async getMyAverageProgress(@Res() res: Response, @Req() req: Request) {
    const studentId = (req as any).user._id;
    const result =
      await this.lessonProgressService.getAverageProgressForStudent(studentId);
    return res.status(result.status).json(result.response);
  }

  @Get(':id')
  @AuthGuard('any')
  async getMyProgress(@Res() res: Response, @Param('id') studentId: string) {
    const result =
      await this.lessonProgressService.findStudentProgress(studentId);
    return res.status(result.status).json(result.response);
  }
}
