import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as jwt from 'jsonwebtoken';
import { ConfigService } from '@nestjs/config';
import { User, UserDocument } from 'src/models/user.schema';
import { IS_PUBLIC_KEY } from 'src/decorators/public.decorator';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private configService: ConfigService,
    private reflector: Reflector,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}
  async canActivate(context: ExecutionContext): Promise<any> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const guardType =
      this.reflector.get<string>('guardType', context.getHandler()) ?? 'any';

    const token =
      request?.cookies?.accessToken ||
      request?.body?.token ||
      request?.query?.token ||
      request?.headers?.['authorization']?.replace('Bearer ', '');

    if (!token) {
      throw new ForbiddenException('Access Forbidden');
    }
    let decoded: any;
    try {
      decoded = jwt.verify(
        token.replace('Bearer ', ''),
        this.configService.get<string>('ACCESS_TOKEN_SECRET') || 'default',
      );
    } catch (err: any) {
      console.error('JWT verification error:', err);
      throw new UnauthorizedException('Invalid Token, Please sign in again');
    }

    const user = await this.userModel.findById(decoded._id).select('-password');

    if (!user) {
      throw new UnauthorizedException('Unauthorized access');
    }

    if (user.status === 'INACTIVE') {
      throw new ForbiddenException('Account is not approved');
    }

    if (guardType !== 'any' && user.role !== guardType) {
      throw new UnauthorizedException('Unauthorized access');
    }

    request.user = user;
    return true;
  }
}
