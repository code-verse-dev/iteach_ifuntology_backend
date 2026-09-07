import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Res,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { CourseService } from './course.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { AuthGuard } from 'src/decorators/auth.guard.decorator';
import {
  imageFileFilter,
  imageStorage,
} from 'src/common/utils/upload.single.service';

@Controller('/api/course')
export class CourseController {
  constructor(private readonly courseService: CourseService) {}

  @Post()
  @AuthGuard('admin')
  @UseInterceptors(
    FileInterceptor('image', {
      storage: imageStorage,
      fileFilter: imageFileFilter,
    }),
  )
  async create(
    @Body() createCourseDto: CreateCourseDto,
    @UploadedFile() file: Express.Multer.File,
    @Res() res: Response,
  ) {
    const result = await this.courseService.create(createCourseDto, file);
    return res.status(result.status).json(result.response);
  }

  @Get()
  @AuthGuard('any')
  async findAll(@Res() res: Response) {
    const result = await this.courseService.findAll();
    return res.status(result.status).json(result.response);
  }

  @Get(':id')
  @AuthGuard('any')
  async findOne(@Param('id') id: string, @Res() res: Response) {
    const result = await this.courseService.findOne(id);
    return res.status(result.status).json(result.response);
  }

  @Patch(':id')
  @AuthGuard('admin')
  async update(
    @Param('id') id: string,
    @Body() updateCourseDto: UpdateCourseDto,
    @Res() res: Response,
  ) {
    const result = await this.courseService.update(id, updateCourseDto);
    return res.status(result.status).json(result.response);
  }
}
