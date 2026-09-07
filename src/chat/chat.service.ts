import { HttpStatus, Injectable } from '@nestjs/common';
import { CreateChatDto } from './dto/create-chat.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Chat, ChatDocument } from 'src/models/chat.schema';
import { Model, Types } from 'mongoose';
import { ApiResponse } from 'src/common/response';
import { User, UserDocument } from 'src/models/user.schema';
import { QueryDto } from 'src/dto/query.dto';

@Injectable()
export class ChatService {
  constructor(
    @InjectModel(Chat.name) private chatModel: Model<ChatDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  async create(body: CreateChatDto) {
    const { sender, receiver } = body;
    const _sender = await this.userModel.findById(sender);
    if (!_sender) {
      return {
        status: HttpStatus.BAD_REQUEST,
        response: ApiResponse({}, 'Sender not found', false),
      };
    }
    const _receiver = await this.userModel.findById(receiver);
    if (!_receiver) {
      return {
        status: HttpStatus.BAD_REQUEST,
        response: ApiResponse({}, 'Receiver not found', false),
      };
    }
    try {
      const isChat = await this.chatModel
        .findOne({
          isExpired: false,
          $or: [
            { sender: _sender._id, receiver: _receiver._id },
            { sender: _receiver._id, receiver: _sender._id },
          ],
        })
        .populate('sender', '-password')
        .populate('receiver', '-password')
        .populate({
          path: 'latestMessage',
          populate: {
            path: 'sender',
            select: '-password',
          },
        });
      if (isChat) {
        return {
          status: HttpStatus.OK,
          response: ApiResponse(isChat, 'Chat Already Exists!', true),
        };
      }
      const created = await this.chatModel.create({
        sender: _sender._id,
        receiver: _receiver._id,
      });
      const chat = await this.chatModel
        .findById(created._id)
        .populate('sender', '-password')
        .populate('receiver', '-password');
      return {
        status: HttpStatus.CREATED,
        response: ApiResponse(chat, 'Chat Created Successfully', true),
      };
    } catch (error: any) {
      console.error(error);
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        response: ApiResponse({}, error.message, false),
      };
    }
  }

  async fetchMyChats(userId: any, query: QueryDto) {
    try {
      const keyword = query?.keyword?.trim();
      const userObjectId = new Types.ObjectId(String(userId));
      const page = query?.page ? parseInt(String(query.page), 10) : 1;
      const limit = query?.limit ? parseInt(String(query.limit), 10) : 50;

      const pipeline: any[] = [
        {
          $match: {
            $or: [{ sender: userObjectId }, { receiver: userObjectId }],
            isExpired: false,
          },
        },
        {
          $lookup: {
            from: 'users',
            localField: 'sender',
            foreignField: '_id',
            as: 'senderDoc',
            pipeline: [
              {
                $project: { firstName: 1, lastName: 1, email: 1, image: 1 },
              },
            ],
          },
        },
        {
          $lookup: {
            from: 'users',
            localField: 'receiver',
            foreignField: '_id',
            as: 'receiverDoc',
            pipeline: [
              {
                $project: { firstName: 1, lastName: 1, email: 1, image: 1 },
              },
            ],
          },
        },
        {
          $lookup: {
            from: 'messages',
            localField: 'latestMessage',
            foreignField: '_id',
            as: 'latestMessageDoc',
            pipeline: [
              { $project: { content: 1, createdAt: 1, sender: 1 } },
            ],
          },
        },
        {
          $addFields: {
            senderDoc: { $arrayElemAt: ['$senderDoc', 0] },
            receiverDoc: { $arrayElemAt: ['$receiverDoc', 0] },
            latestMessage: { $arrayElemAt: ['$latestMessageDoc', 0] },
          },
        },
        { $project: { latestMessageDoc: 0 } },
      ];

      if (keyword) {
        pipeline.push({
          $match: {
            $or: [
              {
                $and: [
                  { sender: userObjectId },
                  {
                    $or: [
                      {
                        'receiverDoc.firstName': {
                          $regex: keyword,
                          $options: 'i',
                        },
                      },
                      {
                        'receiverDoc.lastName': {
                          $regex: keyword,
                          $options: 'i',
                        },
                      },
                    ],
                  },
                ],
              },
              {
                $and: [
                  { receiver: userObjectId },
                  {
                    $or: [
                      {
                        'senderDoc.firstName': {
                          $regex: keyword,
                          $options: 'i',
                        },
                      },
                      {
                        'senderDoc.lastName': {
                          $regex: keyword,
                          $options: 'i',
                        },
                      },
                    ],
                  },
                ],
              },
            ],
          },
        });
      }

      pipeline.push({ $sort: { updatedAt: -1, createdAt: -1 } });

      const aggregate = this.chatModel.aggregate(pipeline);
      const result = await (this.chatModel as any).aggregatePaginate(
        aggregate,
        {
          page,
          limit,
        },
      );

      return {
        status: HttpStatus.OK,
        response: ApiResponse(result, 'Chats fetched successfully', true),
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
