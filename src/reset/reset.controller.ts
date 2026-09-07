import { Controller, Post, Body, Res } from '@nestjs/common';
import { ResetService } from './reset.service';
import {
  ChangePasswordDto,
  ResetPasswordDto,
  SendCodeDto,
  VerifyCodeDto,
} from './dto';
import { AuthGuard } from 'src/decorators/auth.guard.decorator';
import { Response } from 'express';

@Controller('/api/reset')
export class ResetController {
  constructor(private readonly resetService: ResetService) {}

  @Post('/sendVerificationCode')
  async sendCode(@Body() dto: SendCodeDto, @Res() res: Response) {
    const result = await this.resetService.sendCode(dto);
    return res.status(result.status).json(result.response);
  }

  @Post('/verifyRecoverCode')
  async verify(@Body() dto: VerifyCodeDto, @Res() res: Response) {
    const result = await this.resetService.verifyCode(dto);
    return res.status(result.status).json(result.response);
  }

  @Post('/resetPassword')
  async resetPassword(@Body() dto: ResetPasswordDto, @Res() res: Response) {
    const result = await this.resetService.resetPassword(dto);
    return res.status(result.status).json(result.response);
  }

  @Post('/changePassword')
  @AuthGuard('any')
  async changePassword(@Body() dto: ChangePasswordDto, @Res() res: Response) {
    const result = await this.resetService.changePassword(dto);
    return res.status(result.status).json(result.response);
  }
}
