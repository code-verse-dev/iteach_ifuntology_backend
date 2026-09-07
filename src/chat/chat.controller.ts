import { Controller, Get, Post, Body, Res, Req, Query } from '@nestjs/common';
import { ChatService } from './chat.service';
import { CreateChatDto } from './dto/create-chat.dto';
import { AuthGuard } from 'src/decorators/auth.guard.decorator';
import { Request, Response } from 'express';
import { QueryDto } from 'src/dto/query.dto';

@Controller('/api/chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  @AuthGuard('any')
  async create(@Body() createChatDto: CreateChatDto, @Res() res: Response) {
    const result = await this.chatService.create(createChatDto);
    return res.status(result.status).json(result.response);
  }

  @Get()
  @AuthGuard('any')
  async fetchMyChats(
    @Req() req: Request,
    @Res() res: Response,
    @Query() query: QueryDto,
  ) {
    const userId = (req as any).user._id;
    const result = await this.chatService.fetchMyChats(userId, query);
    return res.status(result.status).json(result.response);
  }
}
