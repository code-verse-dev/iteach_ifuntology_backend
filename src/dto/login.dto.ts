import { IsEmail, IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { UserRole } from 'src/models/user.schema';

export class LoginDto {
  @IsString({ message: 'Email or Username must be a string' })
  @IsNotEmpty({ message: 'Email or Username is required as a login identifier' })
  identifier: string;

  @IsString({ message: 'Password must be a string' })
  @IsNotEmpty({ message: 'Password is required' })
  password: string;

  @IsEnum(UserRole, {
    message: 'Role must be student, teacher, or admin',
  })
  @IsNotEmpty({ message: 'Role is required' })
  role: UserRole;
}
