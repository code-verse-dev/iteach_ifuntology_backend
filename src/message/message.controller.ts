import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Res,
  Req,
  Query,
} from '@nestjs/common';
import { MessageService } from './message.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { AuthGuard } from 'src/decorators/auth.guard.decorator';
import { Request, Response } from 'express';
import { QueryDto } from 'src/dto/query.dto';

@Controller('/api/message')
export class MessageController {
  constructor(private readonly messageService: MessageService) {}

  @Post()
  @AuthGuard('any')
  async create(
    @Body() createMessageDto: CreateMessageDto,
    @Res() res: Response,
    @Req() req: Request,
  ) {
    const userId = (req as any).user._id;
    const result = await this.messageService.create(createMessageDto, userId);
    return res.status(result.status).json(result.response);
  }

  @Get('/:chat')
  @AuthGuard('any')
  async getChatMessages(
    @Param('chat') chat: string,
    @Res() res: Response,
    @Query() query: QueryDto,
  ) {
    const result = await this.messageService.getChatMessages(chat, query);
    return res.status(result.status).json(result.response);
  }
}
