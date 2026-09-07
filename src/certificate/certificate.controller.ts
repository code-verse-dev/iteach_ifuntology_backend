import { Controller, Get, Param, Query, Req, Res } from '@nestjs/common';
import { CertificateService } from './certificate.service';
import { AuthGuard } from 'src/decorators/auth.guard.decorator';
import { Request, Response } from 'express';
import { QueryDto } from 'src/dto/query.dto';

@Controller('/api/certificate')
export class CertificateController {
  constructor(private readonly certificateService: CertificateService) {}

  @Get('/')
  @AuthGuard('admin')
  async findAll(@Query() query: QueryDto, @Res() res: Response) {
    const result = await this.certificateService.findAll(query);
    return res.status(result.status).json(result.response);
  }

  @Get('/stats')
  @AuthGuard('admin')
  async getStats(@Res() res: Response) {
    const result = await this.certificateService.getStats();
    return res.status(result.status).json(result.response);
  }

  @Get('/my-certificates')
  @AuthGuard('any')
  async findMyCertificates(@Res() res: Response, @Req() req: Request) {
    const userId = (req as any).user._id;
    const result = await this.certificateService.findMyCertificates(userId);
    return res.status(result.status).json(result.response);
  }

  @Get('/by-course/:courseType')
  @AuthGuard('student')
  async findMyCertificateByCourse(
    @Param('courseType') courseType: string,
    @Res() res: Response,
    @Req() req: Request,
  ) {
    const userId = (req as any).user._id;
    const result = await this.certificateService.findMyCertificateByCourse(
      userId,
      decodeURIComponent(courseType),
    );
    return res.status(result.status).json(result.response);
  }

  @Get('/student/:studentId')
  @AuthGuard('any')
  async findByStudent(
    @Param('studentId') studentId: string,
    @Res() res: Response,
    @Req() req: Request,
  ) {
    const result = await this.certificateService.findByStudent(
      studentId,
      (req as any).user,
    );
    return res.status(result.status).json(result.response);
  }

  @Get(':id')
  @AuthGuard('any')
  async findOne(
    @Param('id') id: string,
    @Res() res: Response,
    @Req() req: Request,
  ) {
    const result = await this.certificateService.findOne(id, (req as any).user);
    return res.status(result.status).json(result.response);
  }
}
