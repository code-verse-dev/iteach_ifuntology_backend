import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';

export const AuthGuard = (
  guardType: 'student' | 'admin' | 'teacher' | 'any',
) => {
  return applyDecorators(
    SetMetadata('guardType', guardType),
    UseGuards(JwtAuthGuard),
  );
};
