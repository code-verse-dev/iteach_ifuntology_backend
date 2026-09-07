import { IsMongoId, IsNotEmpty } from 'class-validator';

export class CreateChatDto {
  @IsMongoId({ message: 'Sender must be a valid user id' })
  @IsNotEmpty({ message: 'Sender is required' })
  sender: string;

  @IsMongoId({ message: 'Receiver must be a valid user id' })
  @IsNotEmpty({ message: 'Receiver is required' })
  receiver: string;
}
