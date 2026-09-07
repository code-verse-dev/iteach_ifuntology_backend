import { Controller, Get, Param, Query, Req, Res, Put } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { AuthGuard } from 'src/decorators/auth.guard.decorator';
import { QueryDto } from 'src/dto/query.dto';
import { Request, Response } from 'express';

@Controller('/api/notification')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get('/getUserNotifications')
  @AuthGuard('any')
  async findAll(
    @Query() query: QueryDto,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const userId = (req as any).user._id;
    const result = await this.notificationService.findUserNotifications(
      userId,
      query,
    );
    return res.status(result.status).json(result.response);
  }

  @Get('/getAllAdminNotifications')
  @AuthGuard('admin')
  async findAdminNotifications(@Query() query: QueryDto, @Res() res: Response) {
    const result = await this.notificationService.findAdminNotifications(query);
    return res.status(result.status).json(result.response);
  }

  @Get('/getNotificationById/:id')
  @AuthGuard('any')
  async findOne(
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const result = await this.notificationService.findOne(id);
    return res.status(result.status).json(result.response);
  }

  @Put('/toggleNotification/:id')
  @AuthGuard('any')
  async toggle(@Param('id') id: string, @Res() res: Response) {
    const result = await this.notificationService.toggleNotification(id);
    return res.status(result.status).json(result.response);
  }

  @Put('/mark-all-read')
  @AuthGuard('any')
  async markAllAsRead(@Req() req: Request, @Res() res: Response) {
    const userId = (req as any).user._id;
    const result = await this.notificationService.markAllAsRead(userId);
    return res.status(result.status).json(result.response);
  }

  @Put('/admin/mark-all-read')
  @AuthGuard('admin')
  async markAllAsReadAdmin(@Res() res: Response) {
    const result = await this.notificationService.markAllAsReadAdmin();
    return res.status(result.status).json(result.response);
  }
}
