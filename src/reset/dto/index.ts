import { IsEmail, IsIn, IsNotEmpty, IsString } from 'class-validator';
import { IsStrongPassword } from 'src/common/utils/password.util';

const USER_TYPES = ['student', 'admin', 'teacher'] as const;

export class SendCodeDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsIn(USER_TYPES)
  @IsNotEmpty()
  type: string;
}

export class VerifyCodeDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  code: string;
}

export class ResetPasswordDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsNotEmpty()
  @IsStrongPassword()
  password: string;

  @IsIn(USER_TYPES)
  @IsNotEmpty()
  type: string;
}

export class ChangePasswordDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  oldPassword: string;

  @IsString()
  @IsNotEmpty()
  @IsStrongPassword()
  password: string;

  @IsIn(USER_TYPES)
  type: string;
}
