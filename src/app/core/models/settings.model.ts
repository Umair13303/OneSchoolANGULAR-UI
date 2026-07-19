export interface SchoolSettingsDto {
  regularStartTime: string;
  regularEndTime: string;
  regularTotalPeriods: number;
  regularBreakAllowed: boolean;
  regularBreakStart: string;
  regularBreakEnd: string;
  regularGapMinutes: number;

  fridayStartTime: string;
  fridayEndTime: string;
  fridayTotalPeriods: number;
  fridayBreakAllowed: boolean;
  fridayBreakStart: string;
  fridayBreakEnd: string;
  fridayGapMinutes: number;

  sundayEnabled: boolean;
  sundayStartTime: string;
  sundayEndTime: string;

  // Working days: array of day numbers (1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat, 7=Sun)
  workingDays: number[];

  // Break placement: break is inserted after this period number
  regularBreakAfterPeriod: number;
  fridayBreakAfterPeriod: number;

  // Break duration in minutes
  regularBreakDuration: number;
  fridayBreakDuration: number;

  holidays: string[];

  minPeriodDurationMinutes: number;
  maxPeriodDurationMinutes: number;
  maxPeriodsPerDay: number;
  appName: string;

  // Admission numbers: {prefix}-{year?}-{sequence padded to admissionNoPadding}
  admissionNoPrefix: string;
  admissionNoIncludeYear: boolean;
  admissionNoPadding: number;
}

export interface ScheduleProfileDto {
  id: number;
  name: string;
  isActive: boolean;
  createdAt: string;
  days: DayScheduleDto[];
}

export interface DayScheduleDto {
  dayOfWeek: number;
  dayName: string;
  isWorkingDay: boolean;
  startTime: string;
  endTime: string;
  numberOfPeriods: number;
  hasBreak: boolean;
  breakAfterPeriod: number;
  breakDuration: number;
}

export interface GeneratedPeriod {
  periodNo: number;
  periodName: string;
  startTime: string;
  endTime: string;
  isBreak: boolean;
  durationMinutes: number;
  editable?: boolean;
}
