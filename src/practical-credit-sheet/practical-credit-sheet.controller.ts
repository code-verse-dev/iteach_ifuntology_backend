import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthGuard } from 'src/decorators/auth.guard.decorator';
import { TeacherUpdatePracticalRowDto } from './dto/teacher-update-practical-row.dto';
import { SaveDailyPracticalEntryDto } from './dto/update-practical-credit-sheet.dto';
import { PracticalCreditSheetService } from './practical-credit-sheet.service';

@Controller('/api/practical-sheet')
export class PracticalCreditSheetController {
  constructor(
    private readonly practicalCreditSheetService: PracticalCreditSheetService,
  ) {}

  @Get('teacher/entries')
  @AuthGuard('teacher')
  async listTeacherEntries(
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('courseType') courseType: string,
    @Query('page') page: string,
    @Query('limit') limit: string,
    @Query('timezone') timezone: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const teacherId = String((req as any).user._id);
    const result = await this.practicalCreditSheetService.listTeacherEntries(
      teacherId,
      {
        from,
        to,
        timezone,
        courseType: courseType ? decodeURIComponent(courseType) : undefined,
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
      },
    );
    return res.status(result.status).json(result.response);
  }

  @Post('teacher/entries/bulk-approve-today')
  @AuthGuard('teacher')
  async bulkApproveToday(
    @Body() body: { courseType?: string; timezone?: string },
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const teacherId = String((req as any).user._id);
    const courseType = body?.courseType
      ? decodeURIComponent(String(body.courseType))
      : undefined;
    const result =
      await this.practicalCreditSheetService.bulkApproveTodayEntries(
        teacherId,
        courseType,
        body?.timezone,
      );
    return res.status(result.status).json(result.response);
  }

  @Get('student/:studentId/:courseType')
  @AuthGuard('teacher')
  async getStudentSheet(
    @Param('studentId') studentId: string,
    @Param('courseType') courseType: string,
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('timezone') timezone: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const teacherId = (req as any).user._id;
    const decoded = decodeURIComponent(courseType);
    const result = await this.practicalCreditSheetService.getForTeacher(
      teacherId,
      studentId,
      decoded,
      { from, to, timezone },
    );
    return res.status(result.status).json(result.response);
  }

  @Put('student/:studentId/:courseType/entry/:entryDate')
  @AuthGuard('teacher')
  async teacherUpdateEntry(
    @Param('studentId') studentId: string,
    @Param('courseType') courseType: string,
    @Param('entryDate') entryDate: string,
    @Body() dto: TeacherUpdatePracticalRowDto,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const teacherId = String((req as any).user._id);
    const decoded = decodeURIComponent(courseType);
    const result = await this.practicalCreditSheetService.teacherUpdateEntry(
      teacherId,
      studentId,
      decoded,
      entryDate,
      dto,
    );
    return res.status(result.status).json(result.response);
  }

  @Get(':courseType')
  @AuthGuard('student')
  async getMySheet(
    @Param('courseType') courseType: string,
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('timezone') timezone: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const studentId = (req as any).user._id;
    const decoded = decodeURIComponent(courseType);
    const result = await this.practicalCreditSheetService.getOrCreate(
      studentId,
      decoded,
      { from, to, timezone },
    );
    return res.status(result.status).json(result.response);
  }

  @Put(':courseType/daily')
  @AuthGuard('student')
  async saveDailyEntry(
    @Param('courseType') courseType: string,
    @Body() dto: SaveDailyPracticalEntryDto,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const studentId = (req as any).user._id;
    const decoded = decodeURIComponent(courseType);
    const result = await this.practicalCreditSheetService.saveDailyEntry(
      studentId,
      decoded,
      dto,
    );
    return res.status(result.status).json(result.response);
  }
}
