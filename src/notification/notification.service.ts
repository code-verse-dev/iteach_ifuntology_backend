import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import {
  NotificationDocument,
  Notification,
} from 'src/models/notification.schema';
import { MyGateway } from 'src/gateway/gateway';
import { ApiResponse } from 'src/common/response';
import mongoose, { Model } from 'mongoose';
import { QueryDto } from 'src/dto/query.dto';

@Injectable()
export class NotificationService {
  constructor(
    @InjectModel(Notification.name)
    private NotificationModel: Model<NotificationDocument>,
    private gateway: MyGateway,
  ) {}

  async findUserNotifications(userId: any, query: QueryDto) {
    const { page = 1, limit = 10, keyword, isRead } = query;
    const pipeline: any = [];
    pipeline.push({ $sort: { createdAt: -1 } });
    if (keyword) {
      pipeline.push({
        $match: {
          $or: [
            { title: { $regex: keyword, $options: 'i' } },
            { content: { $regex: keyword, $options: 'i' } },
          ],
        },
      });
    }
    if (typeof isRead !== 'undefined') {
      const isReadValue = isRead === 'true';
      pipeline.push({ $match: { isRead: isReadValue } });
    }
    pipeline.push({ $match: { isAdmin: false } });
    pipeline.push({
      $match: { user: new mongoose.Types.ObjectId(userId) },
    });
    const unreadCountAggregate = [
      ...pipeline,
      { $match: { isRead: false } },
      { $count: 'unreadCount' },
    ];
    const myAggregate = this.NotificationModel.aggregate(pipeline);
    const unreadCountPromise = this.NotificationModel.aggregate(
      unreadCountAggregate,
    ).then((result) => (result.length > 0 ? result[0].unreadCount : 0));

    return Promise.all([
      (this.NotificationModel as any).aggregatePaginate(myAggregate, {
        page,
        limit,
      }),
      unreadCountPromise,
    ])
      .then(([notifications, unreadCount]) => {
        return {
          status: HttpStatus.OK,
          response: ApiResponse(
            { notifications, unreadCount },
            `${notifications.docs.length} Notifications Found`,
            true,
          ),
        };
      })
      .catch((error) => {
        console.error(error);
        return {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          response: ApiResponse({}, error.message, false),
        };
      });
  }

  async findAdminNotifications(query: QueryDto) {
    const { page = 1, limit = 10, keyword, isRead } = query;
    const pipeline: any = [];
    pipeline.push({ $sort: { createdAt: -1 } });
    pipeline.push({ $match: { isAdmin: true } });

    if (keyword) {
      pipeline.push({
        $match: {
          $or: [
            { title: { $regex: keyword, $options: 'i' } },
            { content: { $regex: keyword, $options: 'i' } },
          ],
        },
      });
    }
    if (typeof isRead !== 'undefined') {
      const isReadValue = isRead === 'true';
      pipeline.push({ $match: { isRead: isReadValue } });
    }
    const unreadCountAggregate = [
      ...pipeline,
      { $match: { isRead: false } },
      { $count: 'unreadCount' },
    ];

    const myAggregate = this.NotificationModel.aggregate(pipeline);
    const unreadCountPromise = this.NotificationModel.aggregate(
      unreadCountAggregate,
    ).then((result) => (result.length > 0 ? result[0].unreadCount : 0));

    return Promise.all([
      (this.NotificationModel as any).aggregatePaginate(myAggregate, {
        page,
        limit,
      }),
      unreadCountPromise,
    ])
      .then(([notifications, unreadCount]) => {
        return {
          status: HttpStatus.OK,
          response: ApiResponse(
            { notifications, unreadCount },
            `${notifications.docs.length} Notifications Found`,
            true,
          ),
        };
      })
      .catch((error) => {
        console.error(error);
        return {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          response: ApiResponse({}, error.message, false),
        };
      });
  }

  async findOne(id: string) {
    try {
      const notification = await this.NotificationModel.findById(id);
      if (!notification) {
        return {
          status: HttpStatus.NOT_FOUND,
          response: ApiResponse({}, 'Notification Not Found', false),
        };
      }
      return {
        status: HttpStatus.OK,
        response: ApiResponse(notification, 'Success', true),
      };
    } catch (error: any) {
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        response: ApiResponse({}, 'Internal Server Error', false),
      };
    }
  }

  async toggleNotification(id: string) {
    try {
      const notification = await this.NotificationModel.findById(id);
      if (!notification) {
        return {
          status: HttpStatus.NOT_FOUND,
          response: ApiResponse({}, 'Notification Not Found', false),
        };
      }
      notification.isRead = !notification.isRead;
      await notification.save();
      return {
        status: HttpStatus.OK,
        response: ApiResponse(
          notification,
          'Status Updated Successfully',
          true,
        ),
      };
    } catch (error: any) {
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        response: ApiResponse({}, 'Internal Server Error', false),
      };
    }
  }

  async markAllAsRead(userId: string) {
    try {
      const result = await this.NotificationModel.updateMany(
        {
          user: new mongoose.Types.ObjectId(userId),
          isAdmin: false,
          isRead: false,
        },
        { $set: { isRead: true } },
      );
      return {
        status: HttpStatus.OK,
        response: ApiResponse(
          { modifiedCount: result.modifiedCount },
          'All notifications marked as read',
          true,
        ),
      };
    } catch (error: any) {
      console.error(error);
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        response: ApiResponse({}, error.message, false),
      };
    }
  }

  async markAllAsReadAdmin() {
    try {
      const result = await this.NotificationModel.updateMany(
        { isAdmin: true, isRead: false },
        { $set: { isRead: true } },
      );
      return {
        status: HttpStatus.OK,
        response: ApiResponse(
          { modifiedCount: result.modifiedCount },
          'All admin notifications marked as read',
          true,
        ),
      };
    } catch (error: any) {
      console.error(error);
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        response: ApiResponse({}, error.message, false),
      };
    }
  }

  async sendNotificationToAdmin(title: string, content: string, payload = {}) {
    this.gateway.server?.to('admin').emit('notification', {
      title,
      content,
      payload,
      isAdmin: true,
    });
    const notification = new this.NotificationModel({
      title,
      content,
      isAdmin: true,
      payload,
    });
    try {
      await notification.save();
    } catch (error: any) {
      console.error('Error saving notification:', error);
    }
  }

  async sendNotificationToUser(
    userId: string,
    title: string,
    content: string,
    payload = {},
  ) {
    this.gateway.server?.to(userId).emit('notification', {
      title,
      content,
      payload,
      isAdmin: false,
    });
    const notification = new this.NotificationModel({
      user: new mongoose.Types.ObjectId(userId),
      title,
      content,
      isAdmin: false,
      payload,
    });
    try {
      await notification.save();
    } catch (error: any) {
      console.error('Error saving notification:', error);
    }
  }
}
