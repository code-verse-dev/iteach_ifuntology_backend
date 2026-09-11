import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ApiResponse } from 'src/common/response';
import {
  PracticalCreditSheet,
  PracticalCreditSheetDocument,
} from 'src/models/practical-credit-sheet.schema';
import { CourseType } from 'src/models/course.schema';
import {
  StudentEnrollment,
  StudentEnrollmentDocument,
} from 'src/models/student-enrollment.schema';
import { User, UserDocument } from 'src/models/user.schema';
import { TeacherUpdatePracticalRowDto } from './dto/teacher-update-practical-row.dto';
import { SaveDailyPracticalEntryDto } from './dto/update-practical-credit-sheet.dto';
import {
  computeRowCreditTotal,
  createEmptyEntryCells,
  createWeightCells,
  daysInMonth,
  getColumnsForCourse,
  isValidDateString,
  monthRange,
  PRACTICAL_SHEET_COURSE_TYPES,
  todayDateString,
  type PracticalColumnDef,
} from './practical-credit-sheet.constants';

type ExistingRowLike = {
  entryDate?: string;
  cells?: Map<string, string> | Record<string, string>;
  approved?: boolean;
  approvedAt?: Date;
  approvedBy?: Types.ObjectId | string;
};

type DateFilter = { from?: string; to?: string; timezone?: string };

@Injectable()
export class PracticalCreditSheetService {
  constructor(
    @InjectModel(PracticalCreditSheet.name)
    private readonly sheetModel: Model<PracticalCreditSheetDocument>,
    @InjectModel(StudentEnrollment.name)
    private readonly enrollmentModel: Model<StudentEnrollmentDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  private isSupportedCourse(courseType: string): courseType is CourseType {
    return (PRACTICAL_SHEET_COURSE_TYPES as readonly string[]).includes(
      courseType,
    );
  }

  private rowCellsToObject(
    cells?: Map<string, string> | Record<string, string>,
  ): Record<string, string> {
    if (!cells) return {};
    if (cells instanceof Map) {
      return Object.fromEntries(cells.entries());
    }
    return { ...cells };
  }

  private hasFilledCells(cells: Record<string, string>): boolean {
    return Object.entries(cells).some(
      ([key, value]) => key !== 'total' && String(value ?? '').trim() !== '',
    );
  }

  private normalizeEntryCells(
    incoming: Record<string, string> | undefined,
    columns: readonly PracticalColumnDef[],
  ): Record<string, string> {
    const cells = createEmptyEntryCells(columns);
    for (const col of columns) {
      if (col.key === 'total') continue;
      const value = incoming?.[col.key];
      cells[col.key] = typeof value === 'string' ? value : '';
    }
    cells.total = computeRowCreditTotal(cells, columns);
    return cells;
  }

  private async resolveStudentName(studentId: string): Promise<string> {
    const user = await this.userModel
      .findById(studentId)
      .select('firstName lastName')
      .lean()
      .exec();
    if (!user) return '';
    return `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();
  }

  private async syncStudentName(
    sheet: PracticalCreditSheetDocument,
    studentName: string,
  ) {
    if (studentName && sheet.name !== studentName) {
      sheet.name = studentName;
      await sheet.save();
    }
  }

  private serializeRow(row: any, columns: readonly PracticalColumnDef[]) {
    const cells = this.rowCellsToObject(row?.cells);
    const normalized = this.normalizeEntryCells(cells, columns);
    return {
      entryDate: row?.entryDate ?? null,
      cells: normalized,
      approved: Boolean(row?.approved),
      approvedAt: row?.approvedAt ?? null,
      approvedBy: row?.approvedBy ? String(row.approvedBy) : null,
    };
  }

  private computeMonthProgress(
    rows: ExistingRowLike[],
    now = new Date(),
    timeZone?: string,
  ) {
    const { from, to } = monthRange(now, timeZone);
    const filledDates = new Set<string>();
    for (const row of rows) {
      if (!row.entryDate || row.entryDate < from || row.entryDate > to) continue;
      if (this.hasFilledCells(this.rowCellsToObject(row.cells))) {
        filledDates.add(row.entryDate);
      }
    }
    const totalDays = daysInMonth(now, timeZone);
    const filled = filledDates.size;
    return {
      filled,
      totalDays,
      percent: totalDays ? Math.round((filled / totalDays) * 100) : 0,
      from,
      to,
    };
  }

  private filterRowsByDate(
    rows: ExistingRowLike[],
    filter: DateFilter,
  ): ExistingRowLike[] {
    const from = filter.from && isValidDateString(filter.from) ? filter.from : null;
    const to = filter.to && isValidDateString(filter.to) ? filter.to : null;
    return rows
      .filter((row) => {
        if (!row.entryDate) return false;
        if (from && row.entryDate < from) return false;
        if (to && row.entryDate > to) return false;
        return this.hasFilledCells(this.rowCellsToObject(row.cells));
      })
      .sort((a, b) => String(a.entryDate).localeCompare(String(b.entryDate)));
  }

  private serializeSheet(
    sheet: PracticalCreditSheetDocument | Record<string, any>,
    columns: readonly PracticalColumnDef[],
    options: {
      filter?: DateFilter;
      studentName?: string;
      exists?: boolean;
      timezone?: string;
    } = {},
  ) {
    const timeZone = options.timezone ?? options.filter?.timezone;
    const plain =
      typeof (sheet as any).toObject === 'function'
        ? (sheet as any).toObject()
        : { ...sheet };
    const allRows: ExistingRowLike[] = plain.rows ?? [];
    const filter = options.filter ?? monthRange(new Date(), timeZone);
    const filtered = this.filterRowsByDate(allRows, filter);
    const today = todayDateString(new Date(), timeZone);
    const todayRaw = allRows.find((r) => r.entryDate === today);
    const monthProgress = this.computeMonthProgress(allRows, new Date(), timeZone);
    const defaultRange = monthRange(new Date(), timeZone);

    return {
      _id: plain._id,
      student: plain.student,
      courseType: plain.courseType,
      name: options.studentName ?? plain.name ?? '',
      creditWeights: createWeightCells(columns),
      filter: {
        from: filter.from ?? defaultRange.from,
        to: filter.to ?? defaultRange.to,
      },
      monthProgress,
      today,
      todayEntry: todayRaw ? this.serializeRow(todayRaw, columns) : null,
      rows: filtered.map((row) => this.serializeRow(row, columns)),
      exists: options.exists ?? true,
      createdAt: plain.createdAt,
      updatedAt: plain.updatedAt,
    };
  }

  private async assertTeacherEnrollment(
    teacherId: string,
    studentId: string,
    courseType: string,
  ) {
    const enrollment = await this.enrollmentModel
      .findOne({
        user: new Types.ObjectId(studentId),
        teacher: new Types.ObjectId(teacherId),
        courseType,
      })
      .lean()
      .exec();
    return Boolean(enrollment);
  }

  private resolveFilter(query?: DateFilter): DateFilter {
    const timeZone = query?.timezone;
    const defaults = monthRange(new Date(), timeZone);
    const from =
      query?.from && isValidDateString(query.from) ? query.from : defaults.from;
    const to =
      query?.to && isValidDateString(query.to) ? query.to : defaults.to;
    return from <= to
      ? { from, to, timezone: timeZone }
      : { from: to, to: from, timezone: timeZone };
  }

  async listTeacherEntries(
    teacherId: string,
    query?: DateFilter & {
      courseType?: string;
      page?: number;
      limit?: number;
    },
  ) {
    try {
      const courseTypeFilter = query?.courseType?.trim();
      if (courseTypeFilter && !this.isSupportedCourse(courseTypeFilter)) {
        return {
          status: HttpStatus.BAD_REQUEST,
          response: ApiResponse(
            {},
            'Practical sheet is not available for this course yet',
            false,
          ),
        };
      }

      const filter = this.resolveFilter(query);
      const page = Math.max(1, Number(query?.page) || 1);
      const limit = Math.min(100, Math.max(1, Number(query?.limit) || 20));

      const enrollmentQuery: Record<string, unknown> = {
        teacher: new Types.ObjectId(teacherId),
      };
      if (courseTypeFilter) enrollmentQuery.courseType = courseTypeFilter;

      const enrollments = await this.enrollmentModel
        .find(enrollmentQuery)
        .select('user courseType')
        .lean()
        .exec();

      if (!enrollments.length) {
        return {
          status: HttpStatus.OK,
          response: ApiResponse(
            {
              docs: [],
              totalDocs: 0,
              page,
              limit,
              totalPages: 0,
              filter,
              today: todayDateString(new Date(), filter.timezone),
            },
            'No practical entries found',
            true,
          ),
        };
      }

      const allowedPairs = new Set(
        enrollments.map((e) => `${String(e.user)}::${String(e.courseType)}`),
      );
      const studentIds = [
        ...new Set(enrollments.map((e) => String(e.user))),
      ].map((id) => new Types.ObjectId(id));

      const sheetQuery: Record<string, unknown> = {
        student: { $in: studentIds },
      };
      if (courseTypeFilter) sheetQuery.courseType = courseTypeFilter;

      const sheets = await this.sheetModel.find(sheetQuery).lean().exec();
      const missingNameIds = sheets
        .filter((s) => !String(s.name ?? '').trim())
        .map((s) => String(s.student));
      const uniqueMissing = [...new Set(missingNameIds)];
      const nameById = new Map<string, string>();
      if (uniqueMissing.length) {
        const users = await this.userModel
          .find({ _id: { $in: uniqueMissing } })
          .select('firstName lastName')
          .lean()
          .exec();
        for (const u of users) {
          nameById.set(
            String(u._id),
            `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim(),
          );
        }
      }

      const entries: Array<{
        studentId: string;
        studentName: string;
        courseType: string;
        entryDate: string;
        cells: Record<string, string>;
        total: string;
        approved: boolean;
        approvedAt: Date | null;
        approvedBy: string | null;
      }> = [];

      for (const sheet of sheets) {
        const studentId = String(sheet.student);
        const courseType = String(sheet.courseType);
        if (!allowedPairs.has(`${studentId}::${courseType}`)) continue;
        if (!this.isSupportedCourse(courseType)) continue;

        const columns = getColumnsForCourse(courseType);
        if (!columns) continue;

        const studentName =
          String(sheet.name ?? '').trim() ||
          nameById.get(studentId) ||
          'Student';

        for (const row of (sheet.rows ?? []) as ExistingRowLike[]) {
          if (!row?.entryDate || !isValidDateString(row.entryDate)) continue;
          if (row.entryDate < filter.from! || row.entryDate > filter.to!) {
            continue;
          }
          const cells = this.normalizeEntryCells(
            this.rowCellsToObject(row.cells),
            columns,
          );
          if (!this.hasFilledCells(cells)) continue;

          entries.push({
            studentId,
            studentName,
            courseType,
            entryDate: row.entryDate,
            cells,
            total: cells.total || computeRowCreditTotal(cells, columns),
            approved: Boolean(row.approved),
            approvedAt: row.approvedAt ?? null,
            approvedBy: row.approvedBy ? String(row.approvedBy) : null,
          });
        }
      }

      entries.sort((a, b) => {
        const byDate = b.entryDate.localeCompare(a.entryDate);
        if (byDate !== 0) return byDate;
        return a.studentName.localeCompare(b.studentName);
      });

      const totalDocs = entries.length;
      const totalPages = Math.max(1, Math.ceil(totalDocs / limit) || 1);
      const start = (page - 1) * limit;
      const docs = entries.slice(start, start + limit);

      return {
        status: HttpStatus.OK,
        response: ApiResponse(
          {
            docs,
            totalDocs,
            page,
            limit,
            totalPages,
            filter,
            today: todayDateString(new Date(), filter.timezone),
          },
          'Practical entries fetched successfully',
          true,
        ),
      };
    } catch (error: any) {
      console.error(error);
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        response: ApiResponse(
          {},
          error?.message ?? 'Failed to fetch practical entries',
          false,
        ),
      };
    }
  }

  async getOrCreate(
    studentId: string,
    courseType: string,
    query?: DateFilter,
  ) {
    try {
      if (!this.isSupportedCourse(courseType)) {
        return {
          status: HttpStatus.BAD_REQUEST,
          response: ApiResponse(
            {},
            'Practical sheet is not available for this course yet',
            false,
          ),
        };
      }

      const columns = getColumnsForCourse(courseType);
      if (!columns) {
        return {
          status: HttpStatus.BAD_REQUEST,
          response: ApiResponse({}, 'Unsupported course type', false),
        };
      }

      const studentName = await this.resolveStudentName(studentId);
      let sheet = await this.sheetModel
        .findOne({ student: studentId, courseType })
        .exec();

      if (!sheet) {
        sheet = await this.sheetModel.create({
          student: studentId,
          courseType,
          name: studentName,
          rows: [],
        });
      } else {
        await this.syncStudentName(sheet, studentName);
      }

      return {
        status: HttpStatus.OK,
        response: ApiResponse(
          this.serializeSheet(sheet, columns, {
            filter: this.resolveFilter(query),
            studentName,
            exists: true,
          }),
          'Practical sheet fetched successfully',
          true,
        ),
      };
    } catch (error: any) {
      console.error(error);
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        response: ApiResponse(
          {},
          error?.message ?? 'Failed to fetch practical sheet',
          false,
        ),
      };
    }
  }

  async getForTeacher(
    teacherId: string,
    studentId: string,
    courseType: string,
    query?: DateFilter,
  ) {
    try {
      if (!Types.ObjectId.isValid(studentId)) {
        return {
          status: HttpStatus.BAD_REQUEST,
          response: ApiResponse({}, 'Valid student id is required', false),
        };
      }

      if (!this.isSupportedCourse(courseType)) {
        return {
          status: HttpStatus.BAD_REQUEST,
          response: ApiResponse(
            {},
            'Practical sheet is not available for this course yet',
            false,
          ),
        };
      }

      const columns = getColumnsForCourse(courseType);
      if (!columns) {
        return {
          status: HttpStatus.BAD_REQUEST,
          response: ApiResponse({}, 'Unsupported course type', false),
        };
      }

      const enrolled = await this.assertTeacherEnrollment(
        teacherId,
        studentId,
        courseType,
      );
      if (!enrolled) {
        return {
          status: HttpStatus.FORBIDDEN,
          response: ApiResponse(
            {},
            'Student is not enrolled under you for this course',
            false,
          ),
        };
      }

      const studentName = await this.resolveStudentName(studentId);
      let sheet = await this.sheetModel
        .findOne({ student: studentId, courseType })
        .exec();

      if (!sheet) {
        const emptyFilter = this.resolveFilter(query);
        return {
          status: HttpStatus.OK,
          response: ApiResponse(
            {
              student: studentId,
              courseType,
              name: studentName,
              creditWeights: createWeightCells(columns),
              filter: emptyFilter,
              monthProgress: {
                filled: 0,
                totalDays: daysInMonth(new Date(), query?.timezone),
                percent: 0,
                ...monthRange(new Date(), query?.timezone),
              },
              today: todayDateString(new Date(), query?.timezone),
              todayEntry: null,
              rows: [],
              exists: false,
            },
            'Student has not started this practical sheet yet',
            true,
          ),
        };
      }

      await this.syncStudentName(sheet, studentName);

      return {
        status: HttpStatus.OK,
        response: ApiResponse(
          this.serializeSheet(sheet, columns, {
            filter: this.resolveFilter(query),
            studentName,
            exists: true,
          }),
          'Practical sheet fetched successfully',
          true,
        ),
      };
    } catch (error: any) {
      console.error(error);
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        response: ApiResponse(
          {},
          error?.message ?? 'Failed to fetch practical sheet',
          false,
        ),
      };
    }
  }

  async saveDailyEntry(
    studentId: string,
    courseType: string,
    dto: SaveDailyPracticalEntryDto,
  ) {
    try {
      if (!this.isSupportedCourse(courseType)) {
        return {
          status: HttpStatus.BAD_REQUEST,
          response: ApiResponse(
            {},
            'Practical sheet is not available for this course yet',
            false,
          ),
        };
      }

      const columns = getColumnsForCourse(courseType);
      if (!columns) {
        return {
          status: HttpStatus.BAD_REQUEST,
          response: ApiResponse({}, 'Unsupported course type', false),
        };
      }

      const today = todayDateString(new Date(), dto.timezone);
      const cells = this.normalizeEntryCells(dto.cells, columns);
      if (!this.hasFilledCells(cells)) {
        return {
          status: HttpStatus.BAD_REQUEST,
          response: ApiResponse(
            {},
            'Enter at least one practical quantity for today',
            false,
          ),
        };
      }

      const studentName = await this.resolveStudentName(studentId);
      let sheet = await this.sheetModel
        .findOne({ student: studentId, courseType })
        .exec();

      if (!sheet) {
        sheet = await this.sheetModel.create({
          student: studentId,
          courseType,
          name: studentName,
          rows: [],
        });
      }

      const rows = [...((sheet.rows ?? []) as ExistingRowLike[])];
      const existingIndex = rows.findIndex((r) => r.entryDate === today);

      if (existingIndex >= 0 && rows[existingIndex]?.approved) {
        return {
          status: HttpStatus.BAD_REQUEST,
          response: ApiResponse(
            {},
            "Today's entry is already approved and cannot be edited",
            false,
          ),
        };
      }

      const nextEntry = {
        entryDate: today,
        cells,
        approved: false,
      };

      if (existingIndex >= 0) {
        rows[existingIndex] = nextEntry;
      } else {
        rows.push(nextEntry);
      }

      rows.sort((a, b) =>
        String(a.entryDate ?? '').localeCompare(String(b.entryDate ?? '')),
      );

      sheet.rows = rows as any;
      sheet.name = studentName || sheet.name;
      sheet.markModified('rows');
      await sheet.save();

      return {
        status: HttpStatus.OK,
        response: ApiResponse(
          this.serializeSheet(sheet, columns, {
            filter: monthRange(new Date(), dto.timezone),
            studentName,
            exists: true,
            timezone: dto.timezone,
          }),
          'Daily practical entry saved successfully',
          true,
        ),
      };
    } catch (error: any) {
      console.error(error);
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        response: ApiResponse(
          {},
          error?.message ?? 'Failed to save daily practical entry',
          false,
        ),
      };
    }
  }

  async teacherUpdateEntry(
    teacherId: string,
    studentId: string,
    courseType: string,
    entryDate: string,
    dto: TeacherUpdatePracticalRowDto,
  ) {
    try {
      if (!Types.ObjectId.isValid(studentId)) {
        return {
          status: HttpStatus.BAD_REQUEST,
          response: ApiResponse({}, 'Valid student id is required', false),
        };
      }

      if (!this.isSupportedCourse(courseType)) {
        return {
          status: HttpStatus.BAD_REQUEST,
          response: ApiResponse(
            {},
            'Practical sheet is not available for this course yet',
            false,
          ),
        };
      }

      const columns = getColumnsForCourse(courseType);
      if (!columns) {
        return {
          status: HttpStatus.BAD_REQUEST,
          response: ApiResponse({}, 'Unsupported course type', false),
        };
      }

      if (!isValidDateString(entryDate)) {
        return {
          status: HttpStatus.BAD_REQUEST,
          response: ApiResponse(
            {},
            'Valid entryDate (YYYY-MM-DD) is required',
            false,
          ),
        };
      }

      if (dto.cells == null && dto.approve !== true) {
        return {
          status: HttpStatus.BAD_REQUEST,
          response: ApiResponse(
            {},
            'Provide cells to update and/or approve: true',
            false,
          ),
        };
      }

      const enrolled = await this.assertTeacherEnrollment(
        teacherId,
        studentId,
        courseType,
      );
      if (!enrolled) {
        return {
          status: HttpStatus.FORBIDDEN,
          response: ApiResponse(
            {},
            'Student is not enrolled under you for this course',
            false,
          ),
        };
      }

      const studentName = await this.resolveStudentName(studentId);
      let sheet = await this.sheetModel
        .findOne({ student: studentId, courseType })
        .exec();

      if (!sheet) {
        sheet = await this.sheetModel.create({
          student: studentId,
          courseType,
          name: studentName,
          rows: [],
        });
      }

      const rows = [...((sheet.rows ?? []) as ExistingRowLike[])];
      const index = rows.findIndex((r) => r.entryDate === entryDate);
      const current = index >= 0 ? rows[index] : null;
      const currentCells = this.rowCellsToObject(current?.cells);

      const nextCells = dto.cells
        ? this.normalizeEntryCells(dto.cells, columns)
        : this.normalizeEntryCells(currentCells, columns);

      if (!this.hasFilledCells(nextCells) && dto.approve !== true) {
        return {
          status: HttpStatus.BAD_REQUEST,
          response: ApiResponse(
            {},
            'Entry must include at least one quantity',
            false,
          ),
        };
      }

      const nextRow: any = {
        entryDate,
        cells: nextCells,
        approved: Boolean(current?.approved),
        approvedAt: current?.approvedAt,
        approvedBy: current?.approvedBy,
      };

      if (dto.approve === true) {
        nextRow.approved = true;
        nextRow.approvedAt = new Date();
        nextRow.approvedBy = new Types.ObjectId(teacherId);
      }

      if (index >= 0) {
        rows[index] = nextRow;
      } else {
        rows.push(nextRow);
      }

      rows.sort((a, b) =>
        String(a.entryDate ?? '').localeCompare(String(b.entryDate ?? '')),
      );

      sheet.rows = rows as any;
      sheet.name = studentName || sheet.name;
      sheet.markModified('rows');
      await sheet.save();

      return {
        status: HttpStatus.OK,
        response: ApiResponse(
          this.serializeSheet(sheet, columns, {
            filter: monthRange(),
            studentName,
            exists: true,
          }),
          dto.approve
            ? 'Entry updated and approved successfully'
            : 'Entry updated successfully',
          true,
        ),
      };
    } catch (error: any) {
      console.error(error);
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        response: ApiResponse(
          {},
          error?.message ?? 'Failed to update practical sheet entry',
          false,
        ),
      };
    }
  }

  async bulkApproveTodayEntries(
    teacherId: string,
    courseType?: string,
    timezone?: string,
  ) {
    try {
      const courseTypeFilter = courseType?.trim();
      if (courseTypeFilter && !this.isSupportedCourse(courseTypeFilter)) {
        return {
          status: HttpStatus.BAD_REQUEST,
          response: ApiResponse(
            {},
            'Practical sheet is not available for this course yet',
            false,
          ),
        };
      }

      const today = todayDateString(new Date(), timezone);
      const enrollmentQuery: Record<string, unknown> = {
        teacher: new Types.ObjectId(teacherId),
      };
      if (courseTypeFilter) enrollmentQuery.courseType = courseTypeFilter;

      const enrollments = await this.enrollmentModel
        .find(enrollmentQuery)
        .select('user courseType')
        .lean()
        .exec();

      if (!enrollments.length) {
        return {
          status: HttpStatus.OK,
          response: ApiResponse(
            { approvedCount: 0, today },
            'No pending entries for today',
            true,
          ),
        };
      }

      const allowedPairs = new Set(
        enrollments.map((e) => `${String(e.user)}::${String(e.courseType)}`),
      );
      const studentIds = [
        ...new Set(enrollments.map((e) => String(e.user))),
      ].map((id) => new Types.ObjectId(id));

      const sheetQuery: Record<string, unknown> = {
        student: { $in: studentIds },
      };
      if (courseTypeFilter) sheetQuery.courseType = courseTypeFilter;

      const sheets = await this.sheetModel.find(sheetQuery).exec();
      let approvedCount = 0;
      const approved: Array<{
        studentId: string;
        courseType: string;
        entryDate: string;
      }> = [];

      for (const sheet of sheets) {
        const studentId = String(sheet.student);
        const sheetCourse = String(sheet.courseType);
        if (!allowedPairs.has(`${studentId}::${sheetCourse}`)) continue;

        const rows = [...((sheet.rows ?? []) as ExistingRowLike[])];
        let changed = false;

        for (let i = 0; i < rows.length; i += 1) {
          const row = rows[i];
          if (row?.entryDate !== today) continue;
          if (row.approved) continue;
          if (!this.hasFilledCells(this.rowCellsToObject(row.cells))) continue;

          rows[i] = {
            ...row,
            approved: true,
            approvedAt: new Date(),
            approvedBy: new Types.ObjectId(teacherId),
          };
          changed = true;
          approvedCount += 1;
          approved.push({
            studentId,
            courseType: sheetCourse,
            entryDate: today,
          });
        }

        if (changed) {
          sheet.rows = rows as any;
          sheet.markModified('rows');
          await sheet.save();
        }
      }

      return {
        status: HttpStatus.OK,
        response: ApiResponse(
          { approvedCount, today, approved },
          approvedCount
            ? `Approved ${approvedCount} entr${approvedCount === 1 ? 'y' : 'ies'} for today`
            : 'No pending entries for today',
          true,
        ),
      };
    } catch (error: any) {
      console.error(error);
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        response: ApiResponse(
          {},
          error?.message ?? "Failed to bulk approve today's entries",
          false,
        ),
      };
    }
  }
}
