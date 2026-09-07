import { Module } from '@nestjs/common';
import { CourseQuizService } from './course-quiz.service';
import { ModelsModule } from 'src/models/models.module';
import { CertificateModule } from 'src/certificate/certificate.module';
import { NotificationModule } from 'src/notification/notification.module';

@Module({
  imports: [ModelsModule, CertificateModule, NotificationModule],
  providers: [CourseQuizService],
  exports: [CourseQuizService],
})
export class CourseQuizModule {}

