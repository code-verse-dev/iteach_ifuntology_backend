import { CourseType } from '../models/course.schema';

export const PRACTICAL_SHEET_COURSE_TYPES = [
  CourseType.SKINTOLOGY,
  CourseType.FUNTOLOGY,
  CourseType.NAILTOLOGY,
  CourseType.BARBERTOLOGY,
] as const;

export type PracticalColumnDef = {
  key: string;
  creditWeight: number;
};

export const SKINTOLOGY_COLUMNS: readonly PracticalColumnDef[] = [
  { key: 'sanitationDisinfection', creditWeight: 0.5 },
  { key: 'stationSetUp', creditWeight: 0.5 },
  { key: 'makeUpRemoval', creditWeight: 1 },
  { key: 'browApplications', creditWeight: 1 },
  { key: 'facialManipulations', creditWeight: 1.5 },
  { key: 'specialtyFacialArt', creditWeight: 1 },
  { key: 'deepFacialTreatment', creditWeight: 1 },
  { key: 'draping', creditWeight: 0.5 },
  { key: 'fiveStepCleansing', creditWeight: 1.5 },
  { key: 'mockHairRemoval', creditWeight: 1 },
  { key: 'eyelashApplication', creditWeight: 1 },
  { key: 'facialGems', creditWeight: 0.75 },
  { key: 'facialContourHighlighting', creditWeight: 1.75 },
  { key: 'fullFacialMakeUpApplication', creditWeight: 2.5 },
  { key: 'eyelashReplacement', creditWeight: 0.75 },
  { key: 'eyes', creditWeight: 1 },
  { key: 'lips', creditWeight: 1 },
  { key: 'theatricalMakeUp', creditWeight: 3 },
  { key: 'specialtyHolidayFacial', creditWeight: 2 },
  { key: 'weddingPromsHomecomingLooks', creditWeight: 3 },
  { key: 'total', creditWeight: 0 },
] as const;

export const FUNTOLOGY_COLUMNS: readonly PracticalColumnDef[] = [
  { key: 'sanitationDisinfection', creditWeight: 0.5 },
  { key: 'stationSetUp', creditWeight: 1 },
  { key: 'wetHairstyling', creditWeight: 1.5 },
  { key: 'dryHairstyling', creditWeight: 1 },
  { key: 'mockPermanentWaveServices', creditWeight: 3 },
  { key: 'mockShampooServices', creditWeight: 0.5 },
  { key: 'mockConditionerServices', creditWeight: 0.5 },
  { key: 'haircutting', creditWeight: 0.75 },
  { key: 'facialMassages', creditWeight: 1 },
  { key: 'mockChemicalServices', creditWeight: 2 },
  { key: 'hairSectioningParting', creditWeight: 1 },
  { key: 'scalpTreatments', creditWeight: 1 },
  { key: 'hairSculptingFingerwaving', creditWeight: 2 },
  { key: 'mockHaircolorServices', creditWeight: 1.75 },
  { key: 'mockRetouchApplications', creditWeight: 1.75 },
  { key: 'braidsTwistsCornrows', creditWeight: 3 },
  { key: 'artificialEnhancements', creditWeight: 2 },
  { key: 'lashBrowServices', creditWeight: 1 },
  { key: 'nailcareServices', creditWeight: 1.5 },
  { key: 'total', creditWeight: 0 },
] as const;

export const NAILTOLOGY_COLUMNS: readonly PracticalColumnDef[] = [
  { key: 'sanitationDisinfection', creditWeight: 0.5 },
  { key: 'stationSetUp', creditWeight: 1 },
  { key: 'nailPolishing', creditWeight: 1 },
  { key: 'nailPolishRemoval', creditWeight: 0.5 },
  { key: 'nailShapingServices', creditWeight: 0.5 },
  { key: 'handArmMassages', creditWeight: 1 },
  { key: 'nailArtServices', creditWeight: 1.5 },
  { key: 'manicures', creditWeight: 1 },
  { key: 'pedicures', creditWeight: 1 },
  { key: 'nailPolishing5Nails', creditWeight: 0.75 },
  { key: 'nailPolishing10Nails', creditWeight: 1.5 },
  { key: 'extraLongNails', creditWeight: 2.25 },
  { key: 'mockOilTreatmentServices', creditWeight: 1 },
  { key: 'nailRepair', creditWeight: 1 },
  { key: 'alternatingNailPatterns', creditWeight: 1 },
  { key: 'primaryColorNailDesigns', creditWeight: 1 },
  { key: 'secondaryColorNailDesigns', creditWeight: 1 },
  { key: 'nailcareServices', creditWeight: 1.5 },
  { key: 'themeNails', creditWeight: 2 },
  { key: 'total', creditWeight: 0 },
] as const;

export const BARBERTOLOGY_COLUMNS: readonly PracticalColumnDef[] = [
  { key: 'sanitationDisinfection', creditWeight: 0.5 },
  { key: 'stationSetUp', creditWeight: 0.5 },
  { key: 'haircuttingBeard', creditWeight: 0.5 },
  { key: 'haircuttingMustaches', creditWeight: 0.5 },
  { key: 'haircuttingShears', creditWeight: 0.75 },
  { key: 'haircuttingClippers', creditWeight: 0.75 },
  { key: 'haircuttingWith3PlusGuards', creditWeight: 1 },
  { key: 'haircuttingOverComb', creditWeight: 0.75 },
  { key: 'drapings', creditWeight: 1 },
  { key: 'wetHairstyling', creditWeight: 1.5 },
  { key: 'dryHairstyling', creditWeight: 1 },
  { key: 'mockPermanentWaveServices', creditWeight: 3 },
  { key: 'mockShampooServices', creditWeight: 0.5 },
  { key: 'mockConditionerServices', creditWeight: 0.5 },
  { key: 'facialMassages', creditWeight: 1 },
  { key: 'mockChemicalServices', creditWeight: 2 },
  { key: 'hairSectioningParting', creditWeight: 1 },
  { key: 'scalpTreatmentsDetangling', creditWeight: 1 },
  { key: 'hairSculpting', creditWeight: 1 },
  { key: 'mockHaircolorServices', creditWeight: 1.75 },
  { key: 'mockRetouchApplications', creditWeight: 1.75 },
  { key: 'braidsTwistsCornrows', creditWeight: 3 },
  { key: 'artificialEnhancements', creditWeight: 2 },
  { key: 'browServices', creditWeight: 1 },
  { key: 'nailcareServices', creditWeight: 1 },
  { key: 'total', creditWeight: 0 },
] as const;

export function formatCreditWeight(weight: number): string {
  if (!Number.isFinite(weight) || weight <= 0) return '';
  const fixed = weight.toFixed(2);
  if (weight < 1) return fixed.replace(/^0/, '');
  return fixed;
}

export function getColumnsForCourse(
  courseType: string,
): readonly PracticalColumnDef[] | null {
  switch (courseType) {
    case CourseType.SKINTOLOGY:
      return SKINTOLOGY_COLUMNS;
    case CourseType.FUNTOLOGY:
      return FUNTOLOGY_COLUMNS;
    case CourseType.NAILTOLOGY:
      return NAILTOLOGY_COLUMNS;
    case CourseType.BARBERTOLOGY:
      return BARBERTOLOGY_COLUMNS;
    default:
      return null;
  }
}

export function createEmptyEntryCells(
  columns: readonly PracticalColumnDef[],
): Record<string, string> {
  return Object.fromEntries(columns.map((c) => [c.key, '']));
}

export function createWeightCells(
  columns: readonly PracticalColumnDef[],
): Record<string, string> {
  const cells: Record<string, string> = {};
  for (const col of columns) {
    if (col.key === 'total') {
      cells[col.key] = '';
      continue;
    }
    cells[col.key] = formatCreditWeight(col.creditWeight);
  }
  return cells;
}

export function computeRowCreditTotal(
  cells: Record<string, string>,
  columns: readonly PracticalColumnDef[],
): string {
  let sum = 0;
  for (const col of columns) {
    if (col.key === 'total') continue;
    const raw = String(cells?.[col.key] ?? '').trim();
    if (!raw) continue;
    const entered = Number(raw);
    if (!Number.isFinite(entered)) continue;
    const weight = col.creditWeight > 0 ? col.creditWeight : 1;
    sum += entered * weight;
  }
  if (sum === 0) return '';
  const rounded = Math.round(sum * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2);
}

export function isValidTimeZone(timeZone?: string): boolean {
  if (!timeZone || typeof timeZone !== 'string') return false;
  const tz = timeZone.trim();
  if (!tz || tz.length > 100) return false;
  try {
    Intl.DateTimeFormat('en-US', { timeZone: tz }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

export function todayDateString(now = new Date(), timeZone?: string): string {
  if (isValidTimeZone(timeZone)) {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: timeZone?.trim(),
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(now);
    const y = parts.find((p) => p.type === 'year')?.value;
    const m = parts.find((p) => p.type === 'month')?.value;
    const d = parts.find((p) => p.type === 'day')?.value;
    if (y && m && d) return `${y}-${m}-${d}`;
  }
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function monthRange(
  now = new Date(),
  timeZone?: string,
): { from: string; to: string } {
  const today = todayDateString(now, timeZone);
  const y = Number(today.slice(0, 4));
  const m = Number(today.slice(5, 7));
  const from = `${today.slice(0, 4)}-${today.slice(5, 7)}-01`;
  const lastDay = new Date(y, m, 0).getDate();
  const to = `${today.slice(0, 4)}-${today.slice(5, 7)}-${String(lastDay).padStart(2, '0')}`;
  return { from, to };
}

export function daysInMonth(now = new Date(), timeZone?: string): number {
  const today = todayDateString(now, timeZone);
  const y = Number(today.slice(0, 4));
  const m = Number(today.slice(5, 7));
  return new Date(y, m, 0).getDate();
}

export function isValidDateString(value?: string): boolean {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const dt = new Date(`${value}T00:00:00`);
  return !Number.isNaN(dt.getTime()) && todayDateString(dt) === value;
}
