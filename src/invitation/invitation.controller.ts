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
  Query,
} from '@nestjs/common';
import { InvitationService } from './invitation.service';
import {
  CreateInvitationDto,
  ResetStudentPasswordDto,
} from './dto/create-invitation.dto';
import { AuthGuard } from 'src/decorators/auth.guard.decorator';
import { Response, Request } from 'express';
import { QueryDto } from 'src/dto/query.dto';

@Controller('/api/invitation')
export class InvitationController {
  constructor(private readonly invitationService: InvitationService) {}

  @Post('create')
  @AuthGuard('teacher')
  async create(
    @Body() createInvitationDto: CreateInvitationDto,
    @Res() res: Response,
    @Req() req: Request,
  ) {
    const teacherId = (req as any).user._id;
    const result = await this.invitationService.create(
      createInvitationDto,
      teacherId,
    );
    return res.status(result.status).json(result.response);
  }

  @Get('admin/students')
  @AuthGuard('admin')
  async getAllStudents(@Query() query: QueryDto, @Res() res: Response) {
    const result = await this.invitationService.findAllStudents(query);
    return res.status(result.status).json(result.response);
  }

  @Get('my-students')
  @AuthGuard('teacher')
  async getStudents(
    @Query() query: QueryDto,
    @Res() res: Response,
    @Req() req: Request,
  ) {
    const teacherId = (req as any).user._id;
    const result = await this.invitationService.findTeacherStudents(
      query,
      teacherId,
    );
    return res.status(result.status).json(result.response);
  }

  @Get('my-students/:id')
  @AuthGuard('teacher')
  async getStudentById(
    @Param('id') id: string,
    @Res() res: Response,
    @Req() req: Request,
  ) {
    const teacherId = (req as any).user._id;
    const result = await this.invitationService.findStudentById(id, teacherId);
    return res.status(result.status).json(result.response);
  }

  @Patch('my-students/:id/status')
  @AuthGuard('teacher')
  async toggleStudentStatus(
    @Param('id') id: string,
    @Res() res: Response,
    @Req() req: Request,
  ) {
    const teacherId = (req as any).user._id;
    const result = await this.invitationService.toggleStudentStatus(
      id,
      teacherId,
    );
    return res.status(result.status).json(result.response);
  }

  @Post('my-students/:id/reset-password')
  @AuthGuard('teacher')
  async resetStudentPassword(
    @Param('id') id: string,
    @Body() body: ResetStudentPasswordDto,
    @Res() res: Response,
    @Req() req: Request,
  ) {
    const teacherId = (req as any).user._id;
    const result = await this.invitationService.resetStudentPassword(
      id,
      teacherId,
      body.password,
    );
    return res.status(result.status).json(result.response);
  }

  @Delete('my-students/:id')
  @AuthGuard('teacher')
  async deleteStudent(
    @Param('id') id: string,
    @Res() res: Response,
    @Req() req: Request,
  ) {
    const teacherId = String((req as any).user._id);
    const result = await this.invitationService.deleteStudentByTeacher(
      id,
      teacherId,
    );
    return res.status(result.status).json(result.response);
  }

  @Get('my-teachers')
  @AuthGuard('student')
  async getMyTeachers(@Req() req: any, @Res() res: Response) {
    const userId = (req as any).user._id;
    const result = await this.invitationService.getMyTeachers(userId);
    return res.status(result.status).json(result.response);
  }
}
