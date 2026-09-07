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
  UseInterceptors,
  UploadedFile,
  ValidationPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request, Response } from 'express';
import { VidLibraryService } from './vid-library.service';
import { CreateVidLibraryDto } from './dto/create-vid-library.dto';
import { UpdateVidLibraryDto } from './dto/update-vid-library.dto';
import { AuthGuard } from 'src/decorators/auth.guard.decorator';
import { QueryDto } from 'src/dto/query.dto';
import { fileFilter, fileStorage } from 'src/common/utils/upload.files.service';

@Controller('/api/vid-library')
export class VidLibraryController {
  constructor(private readonly vidLibraryService: VidLibraryService) {}

  @Post()
  @AuthGuard('admin')
  @UseInterceptors(
    FileInterceptor('video', { storage: fileStorage, fileFilter }),
  )
  async create(
    @Body(new ValidationPipe({ transform: true })) dto: CreateVidLibraryDto,
    @UploadedFile() video: Express.Multer.File,
    @Res() res: Response,
  ) {
    const result = await this.vidLibraryService.create(dto, video);
    return res.status(result.status).json(result.response);
  }

  @Get('accessible-course-types')
  @AuthGuard('any')
  async getAccessibleCourseTypes(@Req() req: Request, @Res() res: Response) {
    const result = await this.vidLibraryService.getAccessibleCourseTypes(
      (req as any).user,
    );
    return res.status(result.status).json(result.response);
  }

  @Get()
  @AuthGuard('any')
  async findAll(
    @Query() query: QueryDto,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const result = await this.vidLibraryService.findAll(query, (req as any).user);
    return res.status(result.status).json(result.response);
  }

  @Get(':id')
  @AuthGuard('any')
  async findOne(
    @Param('id') id: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const result = await this.vidLibraryService.findOne(id, (req as any).user);
    return res.status(result.status).json(result.response);
  }

  @Patch(':id')
  @AuthGuard('admin')
  @UseInterceptors(
    FileInterceptor('video', { storage: fileStorage, fileFilter }),
  )
  async update(
    @Param('id') id: string,
    @Body(new ValidationPipe({ transform: true })) dto: UpdateVidLibraryDto,
    @UploadedFile() video: Express.Multer.File,
    @Res() res: Response,
  ) {
    const result = await this.vidLibraryService.update(id, dto, video);
    return res.status(result.status).json(result.response);
  }

  @Delete(':id')
  @AuthGuard('admin')
  async remove(@Param('id') id: string, @Res() res: Response) {
    const result = await this.vidLibraryService.remove(id);
    return res.status(result.status).json(result.response);
  }
}
