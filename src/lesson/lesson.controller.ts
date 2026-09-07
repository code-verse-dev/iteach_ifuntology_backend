import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseInterceptors,
  UploadedFiles,
  Res,
  Query,
  Req,
  ValidationPipe,
} from '@nestjs/common';
import { LessonService } from './lesson.service';
import { CourseQuizService } from './course-quiz.service';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';
import { UpdateLessonStatusDto } from './dto/update-lesson-status.dto';
import { AuthGuard } from 'src/decorators/auth.guard.decorator';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { fileFilter, fileStorage } from 'src/common/utils/upload.files.service';
import { Response, Request } from 'express';
import { QueryDto } from 'src/dto/query.dto';

@Controller('/api/lesson')
export class LessonController {
  constructor(
    private readonly lessonService: LessonService,
    private readonly courseQuizService: CourseQuizService,
  ) {}

  @Post()
  @AuthGuard('admin')
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'file', maxCount: 1 },
        { name: 'video', maxCount: 1 },
      ],
      { storage: fileStorage, fileFilter },
    ),
  )
  async create(
    @UploadedFiles()
    files: { file?: Express.Multer.File[]; video?: Express.Multer.File[] },
    @Body() createLessonDto: CreateLessonDto,
    @Res() res: Response,
  ) {
    const result = await this.lessonService.create(files, createLessonDto);
    return res.status(result.status).json(result.response);
  }

  @Get()
  @AuthGuard('any')
  async findAll(
    @Query('courseModule') courseModule: string | undefined,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const result = await this.lessonService.findAll(
      courseModule,
      (req as any).user?.role,
    );
    return res.status(result.status).json(result.response);
  }

  @Get('/quizzes')
  @AuthGuard('admin')
  async getQuizzes(@Res() res: Response, @Query() query: QueryDto) {
    const result = await this.lessonService.getQuizzes(query);
    return res.status(result.status).json(result.response);
  }

  @Get('/course-quizzes/:courseType/teacher')
  @AuthGuard('teacher')
  async getCourseQuizzesForTeacher(
    @Param('courseType') courseType: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const result = await this.courseQuizService.getCourseQuizzesForTeacher(
      String((req as any).user._id),
      decodeURIComponent(courseType),
    );
    return res.status(result.status).json(result.response);
  }

  @Get('/course-tests/:courseType/teacher')
  @AuthGuard('teacher')
  async getCourseTestsForTeacher(
    @Param('courseType') courseType: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const result = await this.courseQuizService.getCourseTestsForTeacher(
      String((req as any).user._id),
      decodeURIComponent(courseType),
    );
    return res.status(result.status).json(result.response);
  }

  @Get('/course-exams/:courseType/teacher')
  @AuthGuard('teacher')
  async getCourseExamsForTeacher(
    @Param('courseType') courseType: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const result = await this.courseQuizService.getCourseExamsForTeacher(
      String((req as any).user._id),
      decodeURIComponent(courseType),
    );
    return res.status(result.status).json(result.response);
  }

  @Get('/course-quizzes/:courseType')
  @AuthGuard('student')
  async getCourseQuizzes(
    @Param('courseType') courseType: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const result = await this.courseQuizService.getCourseQuizzesForStudent(
      String((req as any).user._id),
      decodeURIComponent(courseType),
    );
    return res.status(result.status).json(result.response);
  }

  @Get('/course-tests/:courseType')
  @AuthGuard('student')
  async getCourseTests(
    @Param('courseType') courseType: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const result = await this.courseQuizService.getCourseTestsForStudent(
      String((req as any).user._id),
      decodeURIComponent(courseType),
    );
    return res.status(result.status).json(result.response);
  }

  @Get('/course-exams/:courseType')
  @AuthGuard('student')
  async getCourseExams(
    @Param('courseType') courseType: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const result = await this.courseQuizService.getCourseExamsForStudent(
      String((req as any).user._id),
      decodeURIComponent(courseType),
    );
    return res.status(result.status).json(result.response);
  }

  @Get(':id')
  @AuthGuard('any')
  async findOne(
    @Param('id') id: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const result = await this.lessonService.findOne(
      id,
      (req as any).user?.role,
    );
    return res.status(result.status).json(result.response);
  }

  @Patch(':id/status')
  @AuthGuard('admin')
  async updateStatus(
    @Param('id') id: string,
    @Body(ValidationPipe) updateLessonStatusDto: UpdateLessonStatusDto,
    @Res() res: Response,
  ) {
    const result = await this.lessonService.updateStatus(
      id,
      updateLessonStatusDto.status,
    );
    return res.status(result.status).json(result.response);
  }

  @Patch(':id')
  @AuthGuard('admin')
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'file', maxCount: 1 },
        { name: 'video', maxCount: 1 },
      ],
      { storage: fileStorage, fileFilter },
    ),
  )
  async update(
    @Param('id') id: string,
    @Body() updateLessonDto: UpdateLessonDto,
    @UploadedFiles()
    files: { file?: Express.Multer.File[]; video?: Express.Multer.File[] },
    @Res() res: Response,
  ) {
    const result = await this.lessonService.update(id, updateLessonDto, files);
    return res.status(result.status).json(result.response);
  }

  @Delete(':id')
  @AuthGuard('admin')
  async remove(@Param('id') id: string, @Res() res: Response) {
    const result = await this.lessonService.remove(id);
    return res.status(result.status).json(result.response);
  }
}
