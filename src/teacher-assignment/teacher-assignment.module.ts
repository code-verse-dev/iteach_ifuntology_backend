import { Module } from '@nestjs/common';
import { TeacherAssignmentService } from './teacher-assignment.service';
import { TeacherAssignmentController } from './teacher-assignment.controller';
import { ModelsModule } from 'src/models/models.module';
import { NotificationModule } from 'src/notification/notification.module';

@Module({
  imports: [ModelsModule, NotificationModule],
  controllers: [TeacherAssignmentController],
  providers: [TeacherAssignmentService],
  exports: [TeacherAssignmentService],
})
export class TeacherAssignmentModule {}
