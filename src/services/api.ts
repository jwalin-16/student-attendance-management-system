import {
  Student,
  DayAttendanceResponse,
  MonthlyReportResponse,
  DashboardSummary,
  AttendanceStatus,
} from '../types';

export const api = {
  async getDashboardSummary(): Promise<DashboardSummary> {
    const res = await fetch('/api/dashboard/summary');
    if (!res.ok) throw new Error('Failed to fetch dashboard summary');
    return res.json();
  },

  async getStudents(search = '', department = ''): Promise<Student[]> {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (department && department !== 'All') params.append('department', department);
    const res = await fetch(`/api/students?${params.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch students');
    return res.json();
  },

  async addStudent(data: Omit<Student, 'id' | 'created_at'>): Promise<Student> {
    const res = await fetch('/api/students', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to add student' }));
      throw new Error(err.error || 'Failed to add student');
    }
    return res.json();
  },

  async updateStudent(id: number, data: Partial<Student>): Promise<Student> {
    const res = await fetch(`/api/students/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to update student' }));
      throw new Error(err.error || 'Failed to update student');
    }
    return res.json();
  },

  async deleteStudent(id: number): Promise<void> {
    const res = await fetch(`/api/students/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to delete student' }));
      throw new Error(err.error || 'Failed to delete student');
    }
  },

  async getAttendance(date: string, department = ''): Promise<DayAttendanceResponse> {
    const params = new URLSearchParams({ date });
    if (department && department !== 'All') params.append('department', department);
    const res = await fetch(`/api/attendance?${params.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch attendance');
    return res.json();
  },

  async saveAttendance(
    date: string,
    records: Array<{ student_id: number; period: number; status: AttendanceStatus }>
  ): Promise<{ success: boolean; message: string; savedCount: number }> {
    const res = await fetch('/api/attendance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date, records }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to save attendance' }));
      throw new Error(err.error || 'Failed to save attendance');
    }
    return res.json();
  },

  async getMonthlyReport(month: string, department = ''): Promise<MonthlyReportResponse> {
    const params = new URLSearchParams({ month });
    if (department && department !== 'All') params.append('department', department);
    const res = await fetch(`/api/reports/monthly?${params.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch monthly report');
    return res.json();
  },

  getExportCsvUrl(month: string, department = '', defaultersOnly = false): string {
    const params = new URLSearchParams({ month });
    if (department && department !== 'All') params.append('department', department);
    if (defaultersOnly) params.append('defaulters_only', 'true');
    return `/api/reports/export-csv?${params.toString()}`;
  },

  async resetData(): Promise<{ message: string }> {
    const res = await fetch('/api/reset-data', { method: 'POST' });
    if (!res.ok) throw new Error('Failed to reset data');
    return res.json();
  },
};
