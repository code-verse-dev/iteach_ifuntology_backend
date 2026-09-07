import { Controller, Get, Put, Body, Param, Res, Req } from '@nestjs/common';
import { TeacherAssignmentService } from './teacher-assignment.service';
import { AssignCoursesDto } from './dto/assign-courses.dto';
import { AuthGuard } from 'src/decorators/auth.guard.decorator';
import { Request, Response } from 'express';

@Controller('/api/teacher-assignment')
export class TeacherAssignmentController {
  constructor(
    private readonly teacherAssignmentService: TeacherAssignmentService,
  ) {}

  @Get('/my')
  @AuthGuard('teacher')
  async myAssignments(@Req() req: Request, @Res() res: Response) {
    const teacherId = String((req as any).user._id);
    const result = await this.teacherAssignmentService.findByTeacher(teacherId);
    return res.status(result.status).json(result.response);
  }

  @Get('/:teacherId')
  @AuthGuard('admin')
  async findByTeacher(
    @Param('teacherId') teacherId: string,
    @Res() res: Response,
  ) {
    const result = await this.teacherAssignmentService.findByTeacher(teacherId);
    return res.status(result.status).json(result.response);
  }

  @Put('/:teacherId')
  @AuthGuard('admin')
  async assign(
    @Param('teacherId') teacherId: string,
    @Body() dto: AssignCoursesDto,
    @Res() res: Response,
  ) {
    const result = await this.teacherAssignmentService.assignCourses(
      teacherId,
      dto.assignments,
    );
    return res.status(result.status).json(result.response);
  }
}
