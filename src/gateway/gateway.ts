import {
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ConnectedSocket } from '@nestjs/websockets';
import { User, UserDocument } from 'src/models/user.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  pingTimeout: 60000,
})
export class MyGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  handleConnection(socket: Socket) {
    console.log('connected to Socket.io');
  }

  handleDisconnect(socket: Socket) {
    console.log('User Disconnected');
  }

  @SubscribeMessage('setup')
  handleSetup(@MessageBody() userData: any, @ConnectedSocket() client: Socket) {
    client.join(userData._id);
    console.log(`User ${userData._id} joined the room`);
    client.emit('connected');
  }

  @SubscribeMessage('setupAdmin')
  handleSetupAdmin(
    @MessageBody() data: any,
    @ConnectedSocket() client: Socket,
  ) {
    client.join('admin');
    console.log('Admin Joined Room');
    client.emit('connected');
  }

  @SubscribeMessage('new message')
  async handleNewMessage(
    @MessageBody() message: any,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      message.sender = await this.userModel.findById(message.sender);
      message.receiver = await this.userModel.findById(message.receiver);
      if (!message.receiver) {
        return console.log('message.reciever not defined');
      }
      client.to(message.receiver._id.toString()).emit('new message', message);
    } catch (error: any) {
      console.error('Error handling new message:', error);
    }
  }
}
