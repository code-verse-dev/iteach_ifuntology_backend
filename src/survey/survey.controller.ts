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
import { Response, Request } from 'express';
import { SurveyService } from './survey.service';
import { CreateSurveyDto } from './dto/create-survey.dto';
import { UpdateSurveyDto } from './dto/update-survey.dto';
import { AuthGuard } from 'src/decorators/auth.guard.decorator';
import { QueryDto } from 'src/dto/query.dto';

@Controller('/api/survey')
export class SurveyController {
  constructor(private readonly surveyService: SurveyService) {}

  @Post()
  @AuthGuard('admin')
  async create(
    @Body() createSurveyDto: CreateSurveyDto,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const createdBy = (req as any).user?._id;
    const result = await this.surveyService.create(createSurveyDto, createdBy);
    return res.status(result.status).json(result.response);
  }

  @Get()
  @AuthGuard('any')
  async findAll(
    @Query() query: QueryDto,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const role = (req as any).user?.role;
    const result = await this.surveyService.findAll(query, role);
    return res.status(result.status).json(result.response);
  }

  @Get('available')
  @AuthGuard('any')
  async findAvailable(@Req() req: Request, @Res() res: Response) {
    const result = await this.surveyService.findAvailable(
      String((req as any).user?._id ?? ''),
      (req as any).user?.role,
    );
    return res.status(result.status).json(result.response);
  }

  @Get(':surveyId')
  @AuthGuard('any')
  async findOne(@Param('surveyId') surveyId: string, @Res() res: Response) {
    const result = await this.surveyService.findOne(surveyId);
    return res.status(result.status).json(result.response);
  }

  @Patch('toggle/:surveyId')
  @AuthGuard('admin')
  async toggle(@Param('surveyId') surveyId: string, @Res() res: Response) {
    const result = await this.surveyService.toggle(surveyId);
    return res.status(result.status).json(result.response);
  }

  @Patch(':surveyId')
  @AuthGuard('admin')
  async update(
    @Param('surveyId') surveyId: string,
    @Body() updateSurveyDto: UpdateSurveyDto,
    @Res() res: Response,
  ) {
    const result = await this.surveyService.update(surveyId, updateSurveyDto);
    return res.status(result.status).json(result.response);
  }

  @Delete(':surveyId')
  @AuthGuard('admin')
  async remove(@Param('surveyId') surveyId: string, @Res() res: Response) {
    const result = await this.surveyService.remove(surveyId);
    return res.status(result.status).json(result.response);
  }
}
