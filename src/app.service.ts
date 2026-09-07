import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppService {
  constructor(private configService: ConfigService) {}
  getHello(): string {
    return `iTeach iFuntology Server running on port ${this.configService.get<number>('PORT') || 3034}.`;
  }
}
