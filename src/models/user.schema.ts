import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import * as mongoosePaginate from 'mongoose-paginate';
import * as aggregatePaginate from 'mongoose-aggregate-paginate-v2';
import { SignOptions } from 'jsonwebtoken';
import { StringValue } from 'ms';

export type UserDocument = User &
  Document & {
    isPasswordCorrect(password: string): Promise<boolean>;
    generateAccessToken(): string;
    generateRefreshToken(): string;
  };

export enum UserRole {
  STUDENT = 'student',
  ADMIN = 'admin',
  TEACHER = 'teacher',
}

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true })
  firstName: string;

  @Prop({ required: true })
  lastName: string;

  @Prop({ required: true })
  password: string;

  @Prop({ required: false, unique: true, lowercase: true, sparse: true })
  email?: string;

  @Prop({
    required: function (this: User) {
      return this.role === UserRole.STUDENT;
    },
    unique: true,
    sparse: true,
  })
  username?: string;

  @Prop({
    required: function (this: User) {
      return this.role !== UserRole.STUDENT;
    },
  })
  phoneNumber?: string;

  @Prop()
  image: string;

  @Prop({ enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' })
  status: string;

  @Prop({
    type: String,
    enum: UserRole,
    default: UserRole.TEACHER,
  })
  role: UserRole;

  @Prop({ default: null })
  refreshToken: string;

  @Prop({ required: false })
  organization?: string;

  @Prop({ required: false })
  country?: string;

  @Prop({ required: false })
  city?: string;

  @Prop({ required: false })
  state?: string;

  @Prop({ required: false })
  streetAddress?: string;

  @Prop({ required: false })
  zipCode?: string;
}

export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.methods.isPasswordCorrect = async function (
  password: string,
): Promise<boolean> {
  return bcrypt.compare(password, this.password);
};

UserSchema.methods.generateAccessToken = function (): string {
  const expiresIn = (process.env.ACCESS_TOKEN_EXPIRY ?? '15m') as StringValue;
  const options: SignOptions = { expiresIn };
  return jwt.sign(
    {
      _id: this._id,
      email: this.email,
      firstName: this.firstName,
      role: this.role,
    },
    process.env.ACCESS_TOKEN_SECRET as jwt.Secret,
    options,
  );
};

UserSchema.methods.generateRefreshToken = function (): string {
  const expiresIn = (process.env.REFRESH_TOKEN_EXPIRY ?? '30d') as StringValue;
  const options: SignOptions = { expiresIn };
  return jwt.sign(
    { _id: this._id },
    process.env.REFRESH_TOKEN_SECRET as jwt.Secret,
    options,
  );
};

UserSchema.plugin(mongoosePaginate);
UserSchema.plugin(aggregatePaginate as any);
