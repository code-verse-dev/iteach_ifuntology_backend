import { HttpStatus, Injectable } from '@nestjs/common';
import { CreateMessageDto } from './dto/create-message.dto';
import mongoose, { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { Message, MessageDocument } from 'src/models/message.schema';
import { ApiResponse } from 'src/common/response';
import { Chat, ChatDocument } from 'src/models/chat.schema';
import { QueryDto } from 'src/dto/query.dto';
import { MyGateway } from 'src/gateway/gateway';

@Injectable()
export class MessageService {
  constructor(
    @InjectModel(Message.name) private messageModel: Model<MessageDocument>,
    @InjectModel(Chat.name) private chatModel: Model<ChatDocument>,
    private readonly gateway: MyGateway,
  ) {}

  async create(body: CreateMessageDto, userId: string) {
    const { chatId, content } = body;
    try {
      const chat = await this.chatModel.findById(chatId);
      if (!chat) {
        return {
          status: HttpStatus.BAD_REQUEST,
          response: ApiResponse({}, 'Chat not found', false),
        };
      }
      const message = await this.messageModel.create({
        chat: chatId,
        content,
        sender: userId,
      });
      await message.populate('sender', 'firstName lastName _id image');
      chat.latestMessage = message._id as any;
      await chat.save();

      const payload = {
        ...message.toObject(),
        sender: message.sender,
      };
      this.gateway.server.emit('message', payload);

      return {
        status: HttpStatus.CREATED,
        response: ApiResponse(message, 'Message sent successfully', true),
      };
    } catch (error: any) {
      console.error(error);
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        response: ApiResponse({}, error.message, false),
      };
    }
  }

  async getChatMessages(chatId: any, query: QueryDto) {
    const page = query?.page ? parseInt(query.page as any, 10) : 1;
    const limit = query?.limit ? parseInt(query.limit as any, 10) : 25;
    try {
      const aggregate = this.messageModel.aggregate([
        { $match: { chat: new mongoose.Types.ObjectId(chatId) } },
        { $sort: { createdAt: 1 } },
        {
          $lookup: {
            from: 'users',
            localField: 'sender',
            foreignField: '_id',
            as: 'sender',
            pipeline: [
              { $project: { _id: 1, image: 1, firstName: 1, lastName: 1 } },
            ],
          },
        },
        { $unwind: { path: '$sender', preserveNullAndEmptyArrays: true } },
      ]);
      const messages = await (this.messageModel as any).aggregatePaginate(
        aggregate,
        { page, limit },
      );
      return {
        status: HttpStatus.OK,
        response: ApiResponse(messages, 'Messages fetched successfully', true),
      };
    } catch (error: any) {
      console.error(error);
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        response: ApiResponse({}, error.message, false),
      };
    }
  }
}
