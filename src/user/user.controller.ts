import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Res,
  HttpStatus,
  Req,
  Query,
  Put,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UserService } from './user.service';
import {
  CreateTeacherDto,
  UpdateUserDto,
  UpdateUserPasswordDto,
} from './dto/create-user.dto';
import {
  imageFileFilter,
  imageStorage,
} from 'src/common/utils/upload.single.service';
import { Request, Response } from 'express';
import { LoginDto } from 'src/dto/login.dto';
import { AuthGuard } from 'src/decorators/auth.guard.decorator';
import { QueryDto } from 'src/dto/query.dto';
import { cookieOptions } from 'src/common/config/cookieOptions';

@Controller('/api/user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post('/login')
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.userService.login(dto);
    const loginData = result.data as {
      accessToken?: string;
      refreshToken?: string;
      user?: unknown;
    };
    if (loginData?.accessToken) {
      res.cookie('accessToken', loginData.accessToken, cookieOptions);
      res.cookie('refreshToken', loginData.refreshToken, cookieOptions);
      return {
        status: result.status,
        message: result.message,
        data: {
          user: loginData.user,
          accessToken: loginData.accessToken,
        },
      };
    }

    return result;
  }

  @Post('/logout')
  @AuthGuard('any')
  async logout(@Req() req: any, @Res({ passthrough: true }) res: Response) {
    const result = await this.userService.logout(req.user._id);
    res.clearCookie('accessToken', cookieOptions);
    res.clearCookie('refreshToken', cookieOptions);
    return result;
  }

  @Get('/getMyProfile')
  @AuthGuard('any')
  async getMyProfile(@Req() req: any, @Res() res: Response) {
    const userId = (req as any).user._id;
    const result = await this.userService.getMyProfile(userId);
    return res.status(result.status).json(result.response);
  }

  @Get('/admin/getUsers')
  @AuthGuard('admin')
  async findAll(@Query() query: QueryDto, @Res() res: Response) {
    const result = await this.userService.findAllWithFilters(query);
    return res.status(HttpStatus.OK).json(result);
  }

  @Get('/admin/stats')
  @AuthGuard('admin')
  async getAdminUserStats(@Res() res: Response) {
    const result = await this.userService.getAdminUserStats();
    return res.status(result.status).json(result.response);
  }

  @Post('/admin/create-teacher')
  @AuthGuard('admin')
  @UseInterceptors(
    FileInterceptor('image', {
      storage: imageStorage,
      fileFilter: imageFileFilter,
    }),
  )
  async createTeacher(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: CreateTeacherDto,
    @Res() res: Response,
  ) {
    const result = await this.userService.createTeacher(dto, file);
    return res.status(result.status).json(result.response);
  }

  @Put('/admin/teacher/:id/password')
  @AuthGuard('admin')
  async updateTeacherPassword(
    @Param('id') id: string,
    @Body() body: UpdateUserPasswordDto,
    @Res() res: Response,
  ) {
    const result = await this.userService.updateUserPassword(id, body.password);
    return res.status(result.status).json(result.response);
  }

  @Get('/getUser/:id')
  @AuthGuard('any')
  async findOne(@Param('id') id: string, @Res() res: Response) {
    const result = await this.userService.findUserById(id);
    return res.status(result.status).json(result.response);
  }

  @Put('/editProfile')
  @AuthGuard('any')
  @UseInterceptors(
    FileInterceptor('image', {
      storage: imageStorage,
      fileFilter: imageFileFilter,
    }),
  )
  async update(
    @Body() body: UpdateUserDto,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const userId = (req as any).user._id;
    const result = await this.userService.updateProfile(userId, body);
    return res.status(result.status).json(result.response);
  }

  @Put('/toggle/:id')
  @AuthGuard('admin')
  async toggleStatus(
    @Param('id') id: string,
    @Body() body: any,
    @Res() res: Response,
  ) {
    const result = await this.userService.toggleStatus(id, body.status);
    return res.status(result.status).json(result.response);
  }

  @Get('/admin-account')
  @AuthGuard('any')
  async getAdminAccount(@Res() res: Response) {
    const result = await this.userService.getAdminAccount();
    return res.status(result.status).json(result.response);
  }
}
