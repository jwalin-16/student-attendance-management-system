export interface Student {
  id: number;
  roll_number: string;
  name: string;
  department: string;
  email?: string;
  phone?: string;
  created_at?: string;
}

export type AttendanceStatus = 'Present' | 'Absent';

export interface StudentAttendanceRow {
  id: number;
  roll_number: string;
  name: string;
  department: string;
  periods: Record<number, AttendanceStatus | null>;
  presentCount: number;
  absentCount: number;
  isFullyMarked: boolean;
}

export interface DayAttendanceResponse {
  date: string;
  totalStudents: number;
  totalMarkedPeriods: number;
  totalPresent: number;
  totalAbsent: number;
  records: StudentAttendanceRow[];
}

export interface PeriodStat {
  present: number;
  total: number;
  pct: number;
}

export interface StudentMonthlyReport {
  id: number;
  rollNumber: string;
  name: string;
  department: string;
  email?: string;
  phone?: string;
  totalPeriods: number;
  presentPeriods: number;
  absentPeriods: number;
  percentage: number;
  isBelow75: boolean;
  periodStats: Record<number, PeriodStat>;
}

export interface MonthlyReportResponse {
  month: string;
  totalWorkingDays: number;
  totalStudents: number;
  below75Count: number;
  averageAttendance: number;
  overallPresent: number;
  overallTotal: number;
  students: StudentMonthlyReport[];
}

export interface DashboardSummary {
  totalStudents: number;
  departments: Array<{ department: string; student_count: number }>;
  today: {
    date: string;
    isLogged: boolean;
    presentCount: number;
    absentCount: number;
    totalPeriods: number;
    percentage: number;
  };
  monthly: {
    month: string;
    defaultersCount: number;
    averagePercentage: number;
    totalLoggedPeriods: number;
  };
  recentDates: Array<{
    date: string;
    students_marked: number;
    total_periods: number;
  }>;
}

export const PERIOD_DETAILS = [
  { id: 1, name: 'Period 1', time: '09:00 - 09:50' },
  { id: 2, name: 'Period 2', time: '09:50 - 10:40' },
  { id: 3, name: 'Period 3', time: '10:55 - 11:45' },
  { id: 4, name: 'Period 4', time: '11:45 - 12:35' },
  { id: 5, name: 'Period 5', time: '01:25 - 02:15' },
  { id: 6, name: 'Period 6', time: '02:15 - 03:05' },
  { id: 7, name: 'Period 7', time: '03:05 - 03:55' },
];

export const DEPARTMENTS = [
  'Computer Science',
  'Electronics & Communication',
  'Mechanical Engineering',
  'Electrical Engineering',
  'Information Technology',
  'Civil Engineering',
];
