import React, { useState, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, 
  Check, 
  X, 
  Save, 
  RotateCcw, 
  Search, 
  Filter, 
  CheckCheck, 
  AlertCircle,
  Clock,
  Sparkles
} from 'lucide-react';
import { 
  AttendanceStatus, 
  StudentAttendanceRow, 
  PERIOD_DETAILS, 
  DEPARTMENTS 
} from '../types';
import { api } from '../services/api';

interface MarkAttendanceViewProps {
  selectedDate: string;
  onDateChange: (date: string) => void;
  onAttendanceSaved?: () => void;
}

export const MarkAttendanceView: React.FC<MarkAttendanceViewProps> = ({
  selectedDate,
  onDateChange,
  onAttendanceSaved,
}) => {
  const [department, setDepartment] = useState<string>('All');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);

  // Editable records state: student_id -> { period: 'Present' | 'Absent' | null }
  const [records, setRecords] = useState<StudentAttendanceRow[]>([]);
  const [attendanceState, setAttendanceState] = useState<Record<number, Record<number, AttendanceStatus | null>>>({});

  // Load attendance data for the selected date and department
  const loadAttendance = async (date: string, dept: string) => {
    setLoading(true);
    setErrorMessage(null);
    setSaveSuccessMessage(null);
    try {
      const data = await api.getAttendance(date, dept);
      setRecords(data.records);

      // Initialize local editing state
      const initialMap: Record<number, Record<number, AttendanceStatus | null>> = {};
      data.records.forEach((student) => {
        initialMap[student.id] = { ...student.periods };
      });
      setAttendanceState(initialMap);
      setHasUnsavedChanges(false);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load attendance records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAttendance(selectedDate, department);
  }, [selectedDate, department]);

  // Toggle single period attendance
  const togglePeriodStatus = (studentId: number, period: number) => {
    setAttendanceState((prev) => {
      const currentStudentPeriods = prev[studentId] || {};
      const current = currentStudentPeriods[period];
      let nextStatus: AttendanceStatus | null = 'Present';

      if (current === 'Present') {
        nextStatus = 'Absent';
      } else if (current === 'Absent') {
        nextStatus = 'Present';
      } else {
        nextStatus = 'Present';
      }

      setHasUnsavedChanges(true);
      return {
        ...prev,
        [studentId]: {
          ...currentStudentPeriods,
          [period]: nextStatus,
        },
      };
    });
  };

  // Mark all periods for a specific student as Present or Absent
  const setStudentAllPeriods = (studentId: number, status: AttendanceStatus) => {
    setAttendanceState((prev) => {
      const newPeriods: Record<number, AttendanceStatus | null> = {};
      for (let p = 1; p <= 7; p++) {
        newPeriods[p] = status;
      }
      setHasUnsavedChanges(true);
      return {
        ...prev,
        [studentId]: newPeriods,
      };
    });
  };

  // Bulk action: Mark all filtered students as Present or Absent for all 7 periods
  const handleBulkAction = (status: AttendanceStatus) => {
    setAttendanceState((prev) => {
      const updated = { ...prev };
      filteredStudents.forEach((student) => {
        const studentPeriods: Record<number, AttendanceStatus | null> = {};
        for (let p = 1; p <= 7; p++) {
          studentPeriods[p] = status;
        }
        updated[student.id] = studentPeriods;
      });
      setHasUnsavedChanges(true);
      return updated;
    });
  };

  // Reset to saved state from DB
  const handleResetToSaved = () => {
    const initialMap: Record<number, Record<number, AttendanceStatus | null>> = {};
    records.forEach((student) => {
      initialMap[student.id] = { ...student.periods };
    });
    setAttendanceState(initialMap);
    setHasUnsavedChanges(false);
    setSaveSuccessMessage(null);
  };

  // Save changes to database
  const handleSaveAttendance = async () => {
    setSaving(true);
    setErrorMessage(null);
    setSaveSuccessMessage(null);

    try {
      const attendanceItems: Array<{ student_id: number; period: number; status: AttendanceStatus }> = [];

      Object.entries(attendanceState).forEach(([studentIdStr, studentPeriods]) => {
        const studentId = parseInt(studentIdStr, 10);
        Object.entries(studentPeriods).forEach(([periodStr, status]) => {
          const period = parseInt(periodStr, 10);
          if (status === 'Present' || status === 'Absent') {
            attendanceItems.push({
              student_id: studentId,
              period,
              status,
            });
          }
        });
      });

      const response = await api.saveAttendance(selectedDate, attendanceItems);
      setSaveSuccessMessage(`Attendance saved successfully! (${response.savedCount} period entries recorded in SQLite)`);
      setHasUnsavedChanges(false);

      // Re-fetch to update stats & state
      await loadAttendance(selectedDate, department);
      if (onAttendanceSaved) {
        onAttendanceSaved();
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save attendance records');
    } finally {
      setSaving(false);
    }
  };

  // Filter students by search term
  const filteredStudents = records.filter((student) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      student.roll_number.toLowerCase().includes(term) ||
      student.name.toLowerCase().includes(term) ||
      student.department.toLowerCase().includes(term)
    );
  });

  // Calculate live statistics for filtered students
  let totalMarkedPeriods = 0;
  let totalPresentPeriods = 0;
  let totalAbsentPeriods = 0;
  const totalPossiblePeriods = filteredStudents.length * 7;

  filteredStudents.forEach((s) => {
    const pMap = attendanceState[s.id] || {};
    for (let p = 1; p <= 7; p++) {
      const st = pMap[p];
      if (st === 'Present') {
        totalMarkedPeriods++;
        totalPresentPeriods++;
      } else if (st === 'Absent') {
        totalMarkedPeriods++;
        totalAbsentPeriods++;
      }
    }
  });

  const completionPercentage = totalPossiblePeriods > 0 
    ? Math.round((totalMarkedPeriods / totalPossiblePeriods) * 100) 
    : 0;

  const quickDates = [
    { label: 'Today', date: new Date().toISOString().split('T')[0] },
    { 
      label: 'Yesterday', 
      date: new Date(Date.now() - 86400000).toISOString().split('T')[0] 
    },
  ];

  return (
    <div className="space-y-5">
      {/* Top Controls Card: Date Picker & Filters */}
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Date Picker Controls */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <label htmlFor="attendance-date" className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                <CalendarIcon className="w-4 h-4 text-indigo-600" />
                <span>Attendance Date:</span>
              </label>
              <input
                id="attendance-date"
                type="date"
                value={selectedDate}
                onChange={(e) => onDateChange(e.target.value)}
                className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm font-medium text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-xs"
              />
            </div>

            <div className="flex items-center gap-1.5">
              {quickDates.map((qd) => (
                <button
                  key={qd.label}
                  type="button"
                  onClick={() => onDateChange(qd.date)}
                  className={`text-xs px-2.5 py-1.5 rounded-md font-medium transition-colors ${
                    selectedDate === qd.date
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {qd.label}
                </button>
              ))}
            </div>
          </div>

          {/* Department Filter & Search */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                aria-label="Filter by department"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs"
              >
                <option value="All">All Departments</option>
                {DEPARTMENTS.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search roll no, name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-3 py-1.5 border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 w-48 sm:w-56 shadow-xs"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  aria-label="Clear search text"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Action bar & completion rate */}
        <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-medium text-slate-600">
              Showing <strong>{filteredStudents.length}</strong> students:
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleBulkAction('Present')}
                className="px-2.5 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-300 rounded font-semibold transition-colors flex items-center gap-1"
              >
                <Check className="w-3.5 h-3.5" /> Mark All Present
              </button>
              <button
                type="button"
                onClick={() => handleBulkAction('Absent')}
                className="px-2.5 py-1 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-300 rounded font-semibold transition-colors flex items-center gap-1"
              >
                <X className="w-3.5 h-3.5" /> Mark All Absent
              </button>
              {hasUnsavedChanges && (
                <button
                  type="button"
                  onClick={handleResetToSaved}
                  className="px-2.5 py-1 bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-300 rounded font-medium transition-colors flex items-center gap-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Reset to Saved
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-slate-500">
              Marked: <strong>{totalMarkedPeriods}</strong> / {totalPossiblePeriods} periods ({completionPercentage}%)
            </span>
            <span className="text-emerald-600 font-semibold">
              {totalPresentPeriods} P
            </span>
            <span className="text-rose-600 font-semibold">
              {totalAbsentPeriods} A
            </span>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {saveSuccessMessage && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 px-4 py-3 rounded-lg text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCheck className="w-5 h-5 text-emerald-600" />
            <span>{saveSuccessMessage}</span>
          </div>
          <button
            onClick={() => setSaveSuccessMessage(null)}
            className="text-emerald-700 hover:text-emerald-900"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="bg-rose-50 border border-rose-300 text-rose-800 px-4 py-3 rounded-lg text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-rose-600" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-rose-700 hover:text-rose-900"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Attendance Grid Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500">
            <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            Loading attendance records for {selectedDate}...
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            No students found matching your filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                  <th className="py-3 px-3 w-12 text-center">#</th>
                  <th className="py-3 px-3 min-w-[100px]">Roll No</th>
                  <th className="py-3 px-4 min-w-[160px]">Student Name</th>
                  <th className="py-3 px-3 min-w-[140px]">Department</th>
                  
                  {/* Periods 1 to 7 Headers */}
                  {PERIOD_DETAILS.map((p) => (
                    <th key={p.id} className="py-3 px-1 text-center min-w-[70px]">
                      <div className="text-slate-800 font-bold">{p.name}</div>
                      <div className="text-[10px] text-slate-400 font-normal leading-tight">{p.time}</div>
                    </th>
                  ))}

                  <th className="py-3 px-3 text-center min-w-[100px]">Daily Status</th>
                  <th className="py-3 px-3 text-center min-w-[110px]">Row Quick Fill</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredStudents.map((student, idx) => {
                  const studentPeriods = attendanceState[student.id] || {};
                  
                  let presentCount = 0;
                  let absentCount = 0;
                  for (let p = 1; p <= 7; p++) {
                    if (studentPeriods[p] === 'Present') presentCount++;
                    if (studentPeriods[p] === 'Absent') absentCount++;
                  }

                  const allPresent = presentCount === 7;
                  const allAbsent = absentCount === 7;

                  return (
                    <tr 
                      key={student.id} 
                      className={`hover:bg-slate-50/70 transition-colors ${
                        allAbsent ? 'bg-rose-50/30' : ''
                      }`}
                    >
                      <td className="py-2.5 px-3 text-xs text-slate-400 text-center font-mono">
                        {idx + 1}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-semibold text-xs text-indigo-700">
                        {student.roll_number}
                      </td>
                      <td className="py-2.5 px-4 font-medium text-slate-900">
                        {student.name}
                      </td>
                      <td className="py-2.5 px-3 text-xs text-slate-600">
                        <span className="inline-block px-2 py-0.5 rounded bg-slate-100 border border-slate-200">
                          {student.department}
                        </span>
                      </td>

                      {/* 7 Periods Buttons */}
                      {PERIOD_DETAILS.map((p) => {
                        const status = studentPeriods[p.id];
                        const isPresent = status === 'Present';
                        const isAbsent = status === 'Absent';

                        return (
                          <td key={p.id} className="py-2 px-1 text-center">
                            <button
                              type="button"
                              onClick={() => togglePeriodStatus(student.id, p.id)}
                              title={`Period ${p.id} (${p.time}) - Click to toggle`}
                              className={`w-10 h-8 rounded-md text-xs font-bold transition-all shadow-2xs border ${
                                isPresent
                                  ? 'bg-emerald-600 text-white border-emerald-700 hover:bg-emerald-700 scale-102'
                                  : isAbsent
                                  ? 'bg-rose-600 text-white border-rose-700 hover:bg-rose-700 scale-102'
                                  : 'bg-slate-100 text-slate-400 border-slate-200 hover:bg-slate-200'
                              }`}
                            >
                              {isPresent ? 'P' : isAbsent ? 'A' : '—'}
                            </button>
                          </td>
                        );
                      })}

                      {/* Daily Status summary badge */}
                      <td className="py-2.5 px-3 text-center">
                        {presentCount + absentCount === 0 ? (
                          <span className="text-[11px] text-slate-400 font-medium">Unmarked</span>
                        ) : (
                          <div className="inline-flex flex-col items-center">
                            <span className="text-xs font-bold text-slate-800">
                              {presentCount}P / {absentCount}A
                            </span>
                            <span className="text-[10px] text-slate-500">
                              {Math.round((presentCount / 7) * 100)}% Today
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Quick Fill All 7 Periods for this student */}
                      <td className="py-2.5 px-3 text-center">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setStudentAllPeriods(student.id, 'Present')}
                            title="Mark all 7 periods Present"
                            className={`px-2 py-1 text-[11px] font-bold rounded border transition-colors ${
                              allPresent
                                ? 'bg-emerald-600 text-white border-emerald-700'
                                : 'bg-slate-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                            }`}
                          >
                            All P
                          </button>
                          <button
                            type="button"
                            onClick={() => setStudentAllPeriods(student.id, 'Absent')}
                            title="Mark all 7 periods Absent"
                            className={`px-2 py-1 text-[11px] font-bold rounded border transition-colors ${
                              allAbsent
                                ? 'bg-rose-600 text-white border-rose-700'
                                : 'bg-slate-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                            }`}
                          >
                            All A
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Floating / Bottom Sticky Action Bar */}
      <div className="sticky bottom-4 bg-slate-900/95 backdrop-blur text-white px-5 py-3 rounded-xl shadow-lg border border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-3 z-20">
        <div className="flex items-center gap-3 text-xs">
          <div className={`w-3 h-3 rounded-full ${hasUnsavedChanges ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`}></div>
          <div>
            <span className="font-semibold text-white">
              {hasUnsavedChanges ? 'Unsaved Attendance Changes' : 'All Changes Saved to SQLite'}
            </span>
            <span className="text-slate-400 ml-2">
              (Date: <strong className="text-slate-200">{selectedDate}</strong>)
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {hasUnsavedChanges && (
            <button
              type="button"
              onClick={handleResetToSaved}
              className="text-xs px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-600 transition-colors"
            >
              Discard Changes
            </button>
          )}

          <button
            type="button"
            onClick={handleSaveAttendance}
            disabled={saving}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg font-bold text-sm shadow transition-all ${
              saving
                ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                : hasUnsavedChanges
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white ring-2 ring-emerald-400/50'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white'
            }`}
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Saving to Database...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Attendance Records</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
