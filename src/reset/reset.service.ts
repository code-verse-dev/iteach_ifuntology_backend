import {
  BadRequestException,
  HttpStatus,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Reset, ResetDocument } from '../models/reset.schema';
import { UserService } from 'src/user/user.service';
import { EmailService } from 'src/common/services/email.service';
import {
  ChangePasswordDto,
  ResetPasswordDto,
  SendCodeDto,
  VerifyCodeDto,
} from './dto';
import { ApiResponse } from 'src/common/response';
import * as bcrypt from 'bcrypt';

@Injectable()
export class ResetService {
  constructor(
    @InjectModel(Reset.name) private resetModel: Model<ResetDocument>,
    private userService: UserService,
    private mailService: EmailService,
  ) {}

  async sendCode(dto: SendCodeDto) {
    const { email, type } = dto;
    const user = await this.findUserByType(email, type);
    if (!user) {
      return {
        status: HttpStatus.NOT_FOUND,
        response: ApiResponse({}, 'User Not Found', false),
      };
    }

    const code = this.generateCode();
    await this.resetModel.findOneAndUpdate(
      { email },
      { code, type },
      { upsert: true, new: true },
    );

    const emailContent = `<p>Your verification code is <strong>${code}</strong></p>`;
    await this.mailService.sendEmail(
      email,
      'iTeach iFuntology Password Reset',
      emailContent,
    );

    return {
      status: HttpStatus.OK,
      response: ApiResponse({}, 'Verification Code Sent', true),
    };
  }

  async verifyCode(dto: VerifyCodeDto) {
    const { email, code } = dto;
    const isValid = await this.validateResetToken(email, code);
    if (!isValid) {
      return {
        status: HttpStatus.OK,
        response: ApiResponse({}, 'Invalid Verification Code', false),
      };
    }
    return {
      status: HttpStatus.OK,
      response: ApiResponse({}, 'Verification Code Verified', true),
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const { email, code, password, type } = dto;

    const token = await this.resetModel.findOne({ email, code });
    if (!token) throw new BadRequestException('Invalid verification code');

    const user = await this.findUserByType(email, type);
    if (!user) throw new NotFoundException('User not found');

    user.password = await bcrypt.hash(password, 10);
    await user.save();
    await this.resetModel.deleteOne({ email, code });

    return {
      status: HttpStatus.OK,
      response: ApiResponse({}, 'Password updated successfully', true),
    };
  }

  async changePassword(dto: ChangePasswordDto) {
    const { email, oldPassword, password, type } = dto;

    const user = await this.findUserByType(email, type);
    if (!user) throw new NotFoundException('User not found');

    const isOldMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isOldMatch) throw new UnauthorizedException('Incorrect old password');

    const isSame = await bcrypt.compare(password, user.password);
    if (isSame) throw new BadRequestException('No change in old password');

    user.password = await bcrypt.hash(password, 10);
    await user.save();

    return {
      status: HttpStatus.OK,
      response: ApiResponse({}, 'Password changed successfully', true),
    };
  }

  private async findUserByType(email: string, role: string): Promise<any> {
    return this.userService.findByEmailAndRole(email, role);
  }

  private generateCode(): string {
    return Math.floor(1000 + Math.random() * 9000).toString();
  }

  private async validateResetToken(
    email: string,
    code: string,
  ): Promise<boolean> {
    const token = await this.resetModel.findOne({ email, code });
    if (!token) {
      return false;
    }
    return true;
  }
}
