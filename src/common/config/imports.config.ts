import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { ModelsModule } from 'src/models/models.module';
import { SharedEmailModule } from '../modules/email.module';
import { GatewayModule } from 'src/gateway/gateway.module';
import { NotificationModule } from 'src/notification/notification.module';
import { UserModule } from 'src/user/user.module';
import { ResetModule } from 'src/reset/reset.module';
import { TeacherAssignmentModule } from 'src/teacher-assignment/teacher-assignment.module';
import { InvitationModule } from 'src/invitation/invitation.module';
import { CourseFeatureModule } from 'src/course/course.module';
import { CourseModuleModule } from 'src/course-module/course-module.module';
import { LessonModule } from 'src/lesson/lesson.module';
import { LessonQuizQuestionModule } from 'src/lesson-quiz-question/lesson-quiz-question.module';
import { LessonQuizResponseModule } from 'src/lesson-quiz-response/lesson-quiz-response.module';
import { LessonProgressModule } from 'src/lesson-progress/lesson-progress.module';
import { VidLibraryModule } from 'src/vid-library/vid-library.module';
import { SurveyModule } from 'src/survey/survey.module';
import { SurveyQuestionsModule } from 'src/survey-questions/survey-questions.module';
import { SurveyAnswersModule } from 'src/survey-answers/survey-answers.module';
import { ChatModule } from 'src/chat/chat.module';
import { MessageModule } from 'src/message/message.module';
import { CertificateModule } from 'src/certificate/certificate.module';
import { SeedModule } from 'src/seed/seed.module';
import { AuthModule } from 'src/auth/auth.module';

export const AppImports = [
  ConfigModule.forRoot({
    isGlobal: true,
    envFilePath: ['.env', `.env.${process.env.NODE_ENV || 'development'}`],
  }),

  MongooseModule.forRootAsync({
    imports: [ConfigModule],
    useFactory: (configService: ConfigService) => ({
      uri: configService.get<string>('DB'),
    }),
    inject: [ConfigService],
  }),

  ServeStaticModule.forRoot({
    rootPath: join(__dirname, '..', '..', 'Uploads'),
    serveRoot: '/Uploads',
  }),

  ModelsModule,
  AuthModule,
  SharedEmailModule,
  GatewayModule,
  NotificationModule,
  UserModule,
  ResetModule,
  TeacherAssignmentModule,
  InvitationModule,
  CourseFeatureModule,
  CourseModuleModule,
  LessonModule,
  LessonQuizQuestionModule,
  LessonQuizResponseModule,
  LessonProgressModule,
  VidLibraryModule,
  SurveyModule,
  SurveyQuestionsModule,
  SurveyAnswersModule,
  ChatModule,
  MessageModule,
  CertificateModule,
  SeedModule,
];
