import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './user.schema';
import { Reset, ResetSchema } from './reset.schema';
import { Course, CourseSchema } from './course.schema';
import { CourseModule, CourseModuleSchema } from './course-module.schema';
import { Lesson, LessonSchema } from './lesson.schema';
import { LessonProgress, LessonProgressSchema } from './lesson-progress.schema';
import {
  TeacherAssignment,
  TeacherAssignmentSchema,
} from './teacher-assignment.schema';
import { Invitation, InvitationSchema } from './invitation.schema';
import {
  StudentEnrollment,
  StudentEnrollmentSchema,
} from './student-enrollment.schema';
import { Notification, NotificationSchema } from './notification.schema';
import { Survey, SurveySchema } from './survey.schema';
import { SurveyQuestion, SurveyQuestionSchema } from './survey-question.schema';
import { SurveyResponse, SurveyResponseSchema } from './survey-response.schema';
import {
  LessonQuizQuestion,
  LessonQuizQuestionSchema,
} from './lesson-quiz-question.schema';
import {
  LessonQuizResponse,
  LessonQuizResponseSchema,
} from './lesson-quiz-response.schema';
import { Certificate, CertificateSchema } from './certificate.schema';
import { Chat, ChatSchema } from './chat.schema';
import { Message, MessageSchema } from './message.schema';
import { VidLibrary, VidLibrarySchema } from './vid-library.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Reset.name, schema: ResetSchema },
      { name: Course.name, schema: CourseSchema },
      { name: CourseModule.name, schema: CourseModuleSchema },
      { name: Lesson.name, schema: LessonSchema },
      { name: LessonProgress.name, schema: LessonProgressSchema },
      { name: TeacherAssignment.name, schema: TeacherAssignmentSchema },
      { name: Invitation.name, schema: InvitationSchema },
      { name: StudentEnrollment.name, schema: StudentEnrollmentSchema },
      { name: Notification.name, schema: NotificationSchema },
      { name: Survey.name, schema: SurveySchema },
      { name: SurveyQuestion.name, schema: SurveyQuestionSchema },
      { name: SurveyResponse.name, schema: SurveyResponseSchema },
      { name: LessonQuizQuestion.name, schema: LessonQuizQuestionSchema },
      { name: LessonQuizResponse.name, schema: LessonQuizResponseSchema },
      { name: Certificate.name, schema: CertificateSchema },
      { name: Chat.name, schema: ChatSchema },
      { name: Message.name, schema: MessageSchema },
      { name: VidLibrary.name, schema: VidLibrarySchema },
    ]),
  ],
  exports: [MongooseModule],
})
export class ModelsModule {}
