import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Res,
  Req,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { CourseModuleService } from './course-module.service';
import { CourseService } from 'src/course/course.service';
import { CreateCourseModuleDto } from './dto/create-course-module.dto';
import { UpdateCourseModuleDto } from './dto/update-course-module.dto';
import { AuthGuard } from 'src/decorators/auth.guard.decorator';
import { QueryDto } from 'src/dto/query.dto';

@Controller('/api/course-module')
export class CourseModuleController {
  constructor(
    private readonly courseModuleService: CourseModuleService,
    private readonly courseService: CourseService,
  ) {}

  @Post()
  @AuthGuard('admin')
  async create(
    @Body() createCourseModuleDto: CreateCourseModuleDto,
    @Res() res: Response,
  ) {
    const result = await this.courseModuleService.create(createCourseModuleDto);
    return res.status(result.status).json(result.response);
  }

  @Get()
  @AuthGuard('any')
  async findByCourseType(
    @Query() query: QueryDto,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const result = await this.courseModuleService.findByCourseType(
      query,
      (req as any).user?.role,
    );
    return res.status(result.status).json(result.response);
  }

  @Get('course/by-type/:courseType')
  async getCourseByCourseType(
    @Param('courseType') courseType: string,
    @Res() res: Response,
  ) {
    const result = await this.courseService.findByCourseType(courseType);
    return res.status(result.status).json(result.response);
  }

  @Get(':id')
  @AuthGuard('any')
  async findOne(
    @Param('id') id: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const result = await this.courseModuleService.findOne(
      id,
      (req as any).user?.role,
    );
    return res.status(result.status).json(result.response);
  }

  @Patch(':id')
  @AuthGuard('admin')
  async update(
    @Param('id') id: string,
    @Body() updateCourseModuleDto: UpdateCourseModuleDto,
    @Res() res: Response,
  ) {
    const result = await this.courseModuleService.update(
      id,
      updateCourseModuleDto,
    );
    return res.status(result.status).json(result.response);
  }

  @Delete(':id')
  @AuthGuard('admin')
  async remove(@Param('id') id: string, @Res() res: Response) {
    const result = await this.courseModuleService.remove(id);
    return res.status(result.status).json(result.response);
  }
}
