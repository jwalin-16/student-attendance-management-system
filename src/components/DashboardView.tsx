import React from 'react';
import { 
  Users, 
  CalendarCheck2, 
  AlertTriangle, 
  Building2, 
  ArrowRight, 
  CheckCircle2, 
  TrendingUp, 
  Clock,
  FileSpreadsheet
} from 'lucide-react';
import { DashboardSummary, PERIOD_DETAILS } from '../types';

interface DashboardViewProps {
  summary: DashboardSummary | null;
  loading: boolean;
  onNavigate: (tab: 'attendance' | 'students' | 'reports') => void;
  onSelectDate: (date: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  summary,
  loading,
  onNavigate,
  onSelectDate,
}) => {
  if (loading || !summary) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-medium text-slate-500">Loading attendance dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-indigo-700 via-indigo-800 to-slate-900 rounded-xl p-6 text-white shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/30 border border-indigo-400/30 text-indigo-200 mb-2">
            Academic Session 2026-27
          </span>
          <h2 className="text-2xl font-bold tracking-tight">College Attendance Dashboard</h2>
          <p className="text-sm text-indigo-100/90 mt-1 max-w-xl">
            Real-time daily attendance monitoring across 7 college periods, automated monthly analytics, and instant 75% attendance shortage tracking.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => onNavigate('attendance')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white text-indigo-700 hover:bg-indigo-50 font-semibold text-sm shadow transition-colors"
          >
            <CalendarCheck2 className="w-4 h-4" />
            <span>Mark Today's Attendance</span>
          </button>
          <button
            onClick={() => onNavigate('reports')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-600/60 hover:bg-indigo-600 text-white font-medium text-sm border border-indigo-400/40 transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Monthly Reports</span>
          </button>
        </div>
      </div>

      {/* Defaulter Alert Banner if students < 75% */}
      {summary.monthly.defaultersCount > 0 && (
        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-lg shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-full text-amber-700 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-amber-900">
                Attendance Shortage Notice ({summary.monthly.defaultersCount} Students Below 75%)
              </h4>
              <p className="text-xs text-amber-700 mt-0.5">
                Per university regulations, students below 75% monthly attendance are flagged as defaulters and risk exam debarment.
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigate('reports')}
            className="text-xs font-semibold px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-md transition-colors shrink-0 flex items-center gap-1"
          >
            <span>View Defaulters List</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 4 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Total Students */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Enrolled Students
            </span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900">{summary.totalStudents}</span>
            <span className="text-xs text-slate-500">in college registry</span>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">Across {summary.departments.length} departments</span>
            <button
              onClick={() => onNavigate('students')}
              className="text-indigo-600 hover:text-indigo-800 font-medium inline-flex items-center gap-1"
            >
              Directory <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Card 2: Today's Attendance */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Today's Attendance
            </span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <CalendarCheck2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900">
              {summary.today.isLogged ? `${summary.today.percentage}%` : 'Pending'}
            </span>
            {summary.today.isLogged && (
              <span className="text-xs text-emerald-600 font-medium bg-emerald-50 px-1.5 py-0.5 rounded">
                {summary.today.presentCount} / {summary.today.totalPeriods} periods
              </span>
            )}
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">
              {summary.today.isLogged ? 'Recorded for today' : 'No records yet today'}
            </span>
            <button
              onClick={() => {
                onSelectDate(summary.today.date);
                onNavigate('attendance');
              }}
              className="text-indigo-600 hover:text-indigo-800 font-medium inline-flex items-center gap-1"
            >
              {summary.today.isLogged ? 'Edit' : 'Mark Now'} <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Card 3: Monthly Average */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Monthly Average
            </span>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900">{summary.monthly.averagePercentage}%</span>
            <span className="text-xs text-slate-500">for {summary.monthly.month}</span>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">{summary.monthly.totalLoggedPeriods} periods evaluated</span>
            <button
              onClick={() => onNavigate('reports')}
              className="text-indigo-600 hover:text-indigo-800 font-medium inline-flex items-center gap-1"
            >
              Analytics <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Card 4: Defaulters Count (< 75%) */}
        <div className={`bg-white rounded-xl p-5 border shadow-xs transition-colors ${
          summary.monthly.defaultersCount > 0 ? 'border-amber-300 bg-amber-50/20' : 'border-slate-200'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Attendance Shortage
            </span>
            <div className={`p-2 rounded-lg ${
              summary.monthly.defaultersCount > 0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'
            }`}>
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className={`text-3xl font-bold ${
              summary.monthly.defaultersCount > 0 ? 'text-amber-600' : 'text-slate-900'
            }`}>
              {summary.monthly.defaultersCount}
            </span>
            <span className="text-xs text-slate-500">students &lt; 75%</span>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">Requirement: &gt;= 75%</span>
            <button
              onClick={() => onNavigate('reports')}
              className="text-amber-700 hover:text-amber-900 font-medium inline-flex items-center gap-1"
            >
              Inspect <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Grid: Department Distribution & Recent Recorded Dates */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Department Distribution (col-span-2) */}
        <div className="lg:col-span-2 bg-white rounded-xl p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-indigo-600" />
                <span>Department Enrollment Breakdown</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Distribution of students enrolled across academic branches
              </p>
            </div>
            <button
              onClick={() => onNavigate('students')}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
            >
              Manage Students &rarr;
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {summary.departments.map((dept) => {
              const pct = summary.totalStudents > 0 
                ? Math.round((dept.student_count / summary.totalStudents) * 100) 
                : 0;
              return (
                <div key={dept.department} className="p-3.5 bg-slate-50 rounded-lg border border-slate-200/80">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-800 truncate pr-2">
                      {dept.department}
                    </span>
                    <span className="text-xs font-bold px-2 py-0.5 bg-white border border-slate-200 text-slate-700 rounded-md">
                      {dept.student_count} Students
                    </span>
                  </div>
                  <div className="mt-2.5">
                    <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-indigo-600 h-1.5 rounded-full"
                        style={{ width: `${pct}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between items-center mt-1 text-[11px] text-slate-500">
                      <span>{pct}% of college roll</span>
                      <span>7 periods daily</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Attendance Sessions (col-span-1) */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-600" />
                <span>Recent Attendance Logs</span>
              </h3>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Saved dates in persistent SQLite database. Click to view or edit.
            </p>

            <div className="space-y-2.5">
              {summary.recentDates && summary.recentDates.length > 0 ? (
                summary.recentDates.map((item) => (
                  <div
                    key={item.date}
                    onClick={() => {
                      onSelectDate(item.date);
                      onNavigate('attendance');
                    }}
                    className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 hover:border-indigo-300 hover:bg-indigo-50/40 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 group-hover:scale-125 transition-transform"></div>
                      <div>
                        <div className="text-xs font-bold text-slate-800 group-hover:text-indigo-700">
                          {item.date}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {item.students_marked} students • {item.total_periods} periods
                        </div>
                      </div>
                    </div>
                    <span className="text-xs text-indigo-600 group-hover:translate-x-0.5 transition-transform">
                      &rarr;
                    </span>
                  </div>
                ))
              ) : (
                <div className="p-4 text-center text-xs text-slate-500 bg-slate-50 rounded-lg">
                  No attendance logged yet.
                </div>
              )}
            </div>
          </div>

          <button
            onClick={() => onNavigate('attendance')}
            className="w-full mt-4 py-2 px-3 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 transition-colors text-center"
          >
            Open Attendance Register
          </button>
        </div>
      </div>

      {/* College Daily Schedule Reference Card */}
      <div className="bg-slate-900 text-slate-200 rounded-xl p-5 border border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-400" />
              <span>Standard 7-Period Daily Timetable Scheme</span>
            </h3>
            <p className="text-xs text-slate-400">
              Every student is evaluated across seven distinct academic periods per day.
            </p>
          </div>
          <span className="text-xs text-indigo-400 bg-indigo-950 px-2.5 py-1 rounded border border-indigo-800/60 self-start sm:self-auto font-medium">
            35 Periods / 5-Day Week
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 mt-3">
          {PERIOD_DETAILS.map((p) => (
            <div key={p.id} className="bg-slate-800/80 p-2.5 rounded-lg border border-slate-700 text-center">
              <span className="text-xs font-bold text-white block">{p.name}</span>
              <span className="text-[11px] text-slate-400 block mt-0.5">{p.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
