import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Lesson, LessonDocument } from 'src/models/lesson.schema';
import {
  CourseModule,
  CourseModuleDocument,
} from 'src/models/course-module.schema';
import { Course, CourseDocument, CourseType } from 'src/models/course.schema';
import {
  StudentEnrollment,
  StudentEnrollmentDocument,
} from 'src/models/student-enrollment.schema';
import {
  TeacherAssignment,
  TeacherAssignmentDocument,
} from 'src/models/teacher-assignment.schema';
import {
  LessonQuizQuestion,
  LessonQuizQuestionDocument,
} from 'src/models/lesson-quiz-question.schema';
import {
  LessonQuizResponse,
  LessonQuizResponseDocument,
} from 'src/models/lesson-quiz-response.schema';
import { Certificate, CertificateDocument } from 'src/models/certificate.schema';
import { QUIZ_PASS_THRESHOLD } from 'src/common/constants/quiz.constants';
import { QuestionLessonType } from 'src/common/constants/lesson.constants';
import { CertificateService } from 'src/certificate/certificate.service';
import { NotificationService } from 'src/notification/notification.service';
import { ApiResponse } from 'src/common/response';

export type QuizAttemptStatus = 'not_attempted' | 'passed' | 'failed';

@Injectable()
export class CourseQuizService {
  constructor(
    @InjectModel(Lesson.name) private readonly lessonModel: Model<LessonDocument>,
    @InjectModel(CourseModule.name)
    private readonly courseModuleModel: Model<CourseModuleDocument>,
    @InjectModel(Course.name) private readonly courseModel: Model<CourseDocument>,
    @InjectModel(StudentEnrollment.name)
    private readonly enrollmentModel: Model<StudentEnrollmentDocument>,
    @InjectModel(TeacherAssignment.name)
    private readonly assignmentModel: Model<TeacherAssignmentDocument>,
    @InjectModel(LessonQuizQuestion.name)
    private readonly questionModel: Model<LessonQuizQuestionDocument>,
    @InjectModel(LessonQuizResponse.name)
    private readonly responseModel: Model<LessonQuizResponseDocument>,
    @InjectModel(Certificate.name)
    private readonly certificateModel: Model<CertificateDocument>,
    private readonly certificateService: CertificateService,
    private readonly notificationService: NotificationService,
  ) {}

  private formatMetadataValue(value: unknown): string | null {
    if (value == null) return null;
    const text = String(value).trim();
    return text.length > 0 ? text : null;
  }

  private lessonMetadata(lesson: Record<string, unknown>) {
    return {
      unitId: this.formatMetadataValue(lesson.unitId ?? lesson.unit_id),
      unitNo: this.formatMetadataValue(lesson.unitNo ?? lesson.unit_no),
      unit: this.formatMetadataValue(lesson.unit),
      chapterId: this.formatMetadataValue(lesson.chapterId ?? lesson.chapter_id),
      chapter: this.formatMetadataValue(lesson.chapter),
      totalMarks: this.formatMetadataValue(lesson.totalMarks),
    };
  }

  private getQuizStatus(percentage: number | null | undefined): QuizAttemptStatus {
    if (percentage == null) return 'not_attempted';
    return percentage >= QUIZ_PASS_THRESHOLD ? 'passed' : 'failed';
  }

  async assertStudentEnrolled(userId: string, courseType: string) {
    const enrollment = await this.enrollmentModel
      .findOne({ user: userId, courseType, status: 'ACTIVE' })
      .lean()
      .exec();
    return !!enrollment;
  }

  async assertTeacherAssigned(userId: string, courseType: string) {
    const assignment = await this.assignmentModel
      .findOne({ teacher: userId, courseType })
      .lean()
      .exec();
    return !!assignment;
  }

  async getCourseTypeForLesson(lessonId: string): Promise<CourseType | null> {
    const lesson = await this.lessonModel
      .findById(lessonId)
      .select('courseModule')
      .lean()
      .exec();
    if (!lesson?.courseModule) return null;
    const module = await this.courseModuleModel
      .findById(lesson.courseModule)
      .select('courseType')
      .lean()
      .exec();
    return (module?.courseType as CourseType) ?? null;
  }

  private async getAssessmentLessonsForCourse(
    courseType: CourseType,
    lessonType: QuestionLessonType,
  ) {
    const modules = await this.courseModuleModel
      .find({ courseType, status: 'ACTIVE' })
      .select('_id title')
      .lean()
      .exec();
    if (!modules.length) {
      return {
        modules: [],
        moduleById: new Map<string, { _id: unknown; title?: string }>(),
        assessmentLessons: [] as Array<Record<string, any>>,
        questionCountByLesson: new Map<string, number>(),
      };
    }

    const moduleById = new Map(modules.map((m) => [String(m._id), m]));
    const moduleIds = modules.map((m) => m._id);
    const assessmentLessons = await this.lessonModel
      .find({
        courseModule: { $in: moduleIds },
        type: lessonType,
        status: 'ACTIVE',
      })
      .sort({ order: 1 })
      .lean()
      .exec();

    const lessonIds = assessmentLessons.map((l) => l._id);
    const questionCounts = await this.questionModel
      .aggregate([
        { $match: { lesson: { $in: lessonIds } } },
        { $group: { _id: '$lesson', count: { $sum: 1 } } },
      ])
      .exec();

    const questionCountByLesson = new Map(
      questionCounts.map((c) => [String(c._id), c.count as number]),
    );
    const lessonsWithQuestions = assessmentLessons.filter(
      (l) => (questionCountByLesson.get(String(l._id)) ?? 0) > 0,
    );

    return {
      modules,
      moduleById,
      assessmentLessons: lessonsWithQuestions,
      questionCountByLesson,
    };
  }

  private async getLatestResponsesByLesson(userId: string, lessonIds: string[]) {
    const latestResponses = await this.responseModel
      .find({ lesson: { $in: lessonIds }, user: userId })
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    const responseByLesson = new Map<string, (typeof latestResponses)[0]>();
    for (const res of latestResponses) {
      const key = String(res.lesson);
      if (!responseByLesson.has(key)) responseByLesson.set(key, res);
    }
    return responseByLesson;
  }

  private buildTeacherAssessmentListItem(
    lesson: Record<string, any>,
    moduleById: Map<string, { _id: unknown; title?: string }>,
    questionCountByLesson: Map<string, number>,
    includeQuizMetadata: boolean,
    includeExamPdf = false,
    courseType?: string,
  ) {
    const module = moduleById.get(String(lesson.courseModule));
    return {
      _id: lesson._id,
      title: lesson.title,
      courseModule: lesson.courseModule,
      moduleTitle: module?.title ?? '—',
      courseType: courseType ?? null,
      duration: lesson.duration ?? null,
      ...(includeQuizMetadata ? this.lessonMetadata(lesson) : {}),
      ...(includeExamPdf
        ? {
            fileUrl: lesson.fileUrl ?? null,
            allowPdfPreview: lesson.allowPdfPreview ?? true,
            allowPdfDownload: lesson.allowPdfDownload ?? true,
          }
        : {}),
      noOfQuestions: questionCountByLesson.get(String(lesson._id)) ?? 0,
    };
  }

  private buildStudentAssessmentListItem(
    lesson: Record<string, any>,
    moduleById: Map<string, { _id: unknown; title?: string }>,
    questionCountByLesson: Map<string, number>,
    responseByLesson: Map<string, any>,
    includeQuizMetadata: boolean,
    includeExamPdf = false,
    courseType?: string,
  ) {
    const latestResponse = responseByLesson.get(String(lesson._id)) ?? null;
    const module = moduleById.get(String(lesson.courseModule));
    const percentage = latestResponse?.percentage ?? null;
    return {
      _id: lesson._id,
      title: lesson.title,
      courseModule: lesson.courseModule,
      moduleTitle: module?.title ?? '—',
      courseType: courseType ?? null,
      duration: lesson.duration ?? null,
      ...(includeQuizMetadata ? this.lessonMetadata(lesson) : {}),
      ...(includeExamPdf
        ? {
            fileUrl: lesson.fileUrl ?? null,
            allowPdfPreview: lesson.allowPdfPreview ?? true,
            allowPdfDownload: lesson.allowPdfDownload ?? true,
          }
        : {}),
      noOfQuestions: questionCountByLesson.get(String(lesson._id)) ?? 0,
      status: this.getQuizStatus(percentage),
      latestResponse: latestResponse
        ? {
            _id: latestResponse._id,
            score: latestResponse.score,
            totalPoints: latestResponse.totalPoints,
            percentage: latestResponse.percentage,
            createdAt: latestResponse.createdAt,
          }
        : null,
    };
  }

  async getCourseAssessmentsForTeacher(
    userId: string,
    courseType: string,
    lessonType: 'QUIZ' | 'TEST' | 'EXAM',
  ) {
    try {
      const validTypes = Object.values(CourseType);
      if (!courseType || !validTypes.includes(courseType as CourseType)) {
        return {
          status: HttpStatus.BAD_REQUEST,
          response: ApiResponse({}, 'Invalid courseType', false),
        };
      }
      const isAssigned = await this.assertTeacherAssigned(userId, courseType);
      if (!isAssigned) {
        return {
          status: HttpStatus.FORBIDDEN,
          response: ApiResponse({}, 'You are not assigned this course', false),
        };
      }
      const { moduleById, assessmentLessons, questionCountByLesson } =
        await this.getAssessmentLessonsForCourse(
          courseType as CourseType,
          lessonType,
        );
      const items = assessmentLessons.map((lesson) =>
        this.buildTeacherAssessmentListItem(
          lesson,
          moduleById,
          questionCountByLesson,
          lessonType === 'QUIZ' || lessonType === 'TEST',
          lessonType === 'EXAM',
          courseType,
        ),
      );
      const label =
        lessonType === 'QUIZ'
          ? 'quizzes'
          : lessonType === 'TEST'
            ? 'tests'
            : 'exams';
      const totalKey =
        lessonType === 'QUIZ'
          ? 'totalQuizzes'
          : lessonType === 'TEST'
            ? 'totalTests'
            : 'totalExams';
      return {
        status: HttpStatus.OK,
        response: ApiResponse(
          {
            courseType,
            assessmentType: lessonType,
            [totalKey]: items.length,
            [label]: items,
          },
          `Course ${label} fetched successfully`,
          true,
        ),
      };
    } catch (error: any) {
      console.error(error);
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        response: ApiResponse(
          {},
          `Failed to fetch course ${lessonType.toLowerCase()}s`,
          false,
        ),
      };
    }
  }

  async getCourseQuizzesForTeacher(userId: string, courseType: string) {
    return this.getCourseAssessmentsForTeacher(userId, courseType, 'QUIZ');
  }

  async getCourseTestsForTeacher(userId: string, courseType: string) {
    return this.getCourseAssessmentsForTeacher(userId, courseType, 'TEST');
  }

  async getCourseExamsForTeacher(userId: string, courseType: string) {
    return this.getCourseAssessmentsForTeacher(userId, courseType, 'EXAM');
  }

  async getCourseQuizzesForStudent(userId: string, courseType: string) {
    try {
      const validTypes = Object.values(CourseType);
      if (!courseType || !validTypes.includes(courseType as CourseType)) {
        return {
          status: HttpStatus.BAD_REQUEST,
          response: ApiResponse({}, 'Invalid courseType', false),
        };
      }
      const isEnrolled = await this.assertStudentEnrolled(userId, courseType);
      if (!isEnrolled) {
        return {
          status: HttpStatus.FORBIDDEN,
          response: ApiResponse({}, 'You are not enrolled in this course', false),
        };
      }
      const course = await this.courseModel
        .findOne({ courseType })
        .select('_id courseType')
        .lean()
        .exec();
      const { moduleById, assessmentLessons, questionCountByLesson } =
        await this.getAssessmentLessonsForCourse(courseType as CourseType, 'QUIZ');
      const lessonIds = assessmentLessons.map((l) => String(l._id));
      const responseByLesson = await this.getLatestResponsesByLesson(
        userId,
        lessonIds,
      );
      const quizzes = assessmentLessons.map((lesson) =>
        this.buildStudentAssessmentListItem(
          lesson,
          moduleById,
          questionCountByLesson,
          responseByLesson,
          true,
          false,
          courseType,
        ),
      );
      const passedCount = quizzes.filter((q) => q.status === 'passed').length;
      const allQuizzesPassed = quizzes.length > 0 && passedCount === quizzes.length;
      let certificate: { _id: string; certificateUrl?: string } | null = null;
      if (course) {
        const cert = await this.certificateModel
          .findOne({ student: userId, course: course._id })
          .sort({ createdAt: -1 })
          .select('_id certificateUrl')
          .lean()
          .exec();
        if (cert) {
          certificate = {
            _id: String(cert._id),
            certificateUrl: cert.certificateUrl,
          };
        }
      }
      return {
        status: HttpStatus.OK,
        response: ApiResponse(
          {
            courseType,
            courseId: course?._id ? String(course._id) : null,
            passThreshold: QUIZ_PASS_THRESHOLD,
            totalQuizzes: quizzes.length,
            passedCount,
            allQuizzesPassed,
            certificate,
            quizzes,
          },
          'Course quizzes fetched successfully',
          true,
        ),
      };
    } catch (error: any) {
      console.error(error);
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        response: ApiResponse({}, 'Failed to fetch course quizzes', false),
      };
    }
  }

  async getCourseAssessmentsForStudent(
    userId: string,
    courseType: string,
    lessonType: 'TEST' | 'EXAM',
  ) {
    try {
      const validTypes = Object.values(CourseType);
      if (!courseType || !validTypes.includes(courseType as CourseType)) {
        return {
          status: HttpStatus.BAD_REQUEST,
          response: ApiResponse({}, 'Invalid courseType', false),
        };
      }
      const isEnrolled = await this.assertStudentEnrolled(userId, courseType);
      if (!isEnrolled) {
        return {
          status: HttpStatus.FORBIDDEN,
          response: ApiResponse({}, 'You are not enrolled in this course', false),
        };
      }
      const { moduleById, assessmentLessons, questionCountByLesson } =
        await this.getAssessmentLessonsForCourse(
          courseType as CourseType,
          lessonType,
        );
      const lessonIds = assessmentLessons.map((l) => String(l._id));
      const responseByLesson = await this.getLatestResponsesByLesson(
        userId,
        lessonIds,
      );
      const items = assessmentLessons.map((lesson) =>
        this.buildStudentAssessmentListItem(
          lesson,
          moduleById,
          questionCountByLesson,
          responseByLesson,
          lessonType === 'TEST',
          lessonType === 'EXAM',
          courseType,
        ),
      );
      const passedCount = items.filter((item) => item.status === 'passed').length;
      const label = lessonType === 'TEST' ? 'tests' : 'exams';
      const totalKey = lessonType === 'TEST' ? 'totalTests' : 'totalExams';
      return {
        status: HttpStatus.OK,
        response: ApiResponse(
          {
            courseType,
            assessmentType: lessonType,
            passThreshold: QUIZ_PASS_THRESHOLD,
            [totalKey]: items.length,
            passedCount,
            [label]: items,
          },
          `Course ${label} fetched successfully`,
          true,
        ),
      };
    } catch (error: any) {
      console.error(error);
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        response: ApiResponse(
          {},
          `Failed to fetch course ${lessonType.toLowerCase()}s`,
          false,
        ),
      };
    }
  }

  async getCourseTestsForStudent(userId: string, courseType: string) {
    return this.getCourseAssessmentsForStudent(userId, courseType, 'TEST');
  }

  async getCourseExamsForStudent(userId: string, courseType: string) {
    return this.getCourseAssessmentsForStudent(userId, courseType, 'EXAM');
  }

  async tryIssueCertificateAfterQuizPass(userId: string, lessonId: string) {
    const lesson = await this.lessonModel
      .findById(lessonId)
      .select('type')
      .lean()
      .exec();
    if (!lesson || lesson.type !== 'QUIZ') {
      return {
        certificateIssued: false,
        certificateId: null as string | null,
        allQuizzesPassed: false,
      };
    }
    const courseType = await this.getCourseTypeForLesson(lessonId);
    if (!courseType) {
      return {
        certificateIssued: false,
        certificateId: null as string | null,
        allQuizzesPassed: false,
      };
    }
    const isEnrolled = await this.assertStudentEnrolled(userId, courseType);
    if (!isEnrolled) {
      return { certificateIssued: false, certificateId: null, allQuizzesPassed: false };
    }
    const { assessmentLessons } = await this.getAssessmentLessonsForCourse(
      courseType,
      'QUIZ',
    );
    if (!assessmentLessons.length) {
      return { certificateIssued: false, certificateId: null, allQuizzesPassed: false };
    }
    const lessonIds = assessmentLessons.map((l) => String(l._id));
    const responseByLesson = await this.getLatestResponsesByLesson(userId, lessonIds);
    const allPassed = assessmentLessons.every((item) => {
      const latest = responseByLesson.get(String(item._id));
      return latest != null && latest.percentage >= QUIZ_PASS_THRESHOLD;
    });
    if (!allPassed) {
      return { certificateIssued: false, certificateId: null, allQuizzesPassed: false };
    }
    const course = await this.courseModel
      .findOne({ courseType })
      .select('_id')
      .lean()
      .exec();
    if (!course) {
      return { certificateIssued: false, certificateId: null, allQuizzesPassed: true };
    }
    const existing = await this.certificateService.findExistingCertificate(
      userId,
      String(course._id),
    );
    if (existing) {
      return {
        certificateIssued: false,
        certificateId: String(existing._id),
        allQuizzesPassed: true,
      };
    }
    const certificate = await this.certificateService.generateCertificate(
      userId,
      String(course._id),
    );
    const certificateId = certificate?._id ? String(certificate._id) : null;
    if (certificateId) {
      try {
        this.notificationService.sendNotificationToUser(
          userId,
          'Certificate earned!',
          `Congratulations! You passed all quizzes and earned your ${courseType} certificate.`,
          { courseType, certificateId },
        );
      } catch (err: any) {
        console.error('Certificate notification failed:', err);
      }
    }
    return {
      certificateIssued: !!certificateId,
      certificateId,
      allQuizzesPassed: true,
    };
  }
}
