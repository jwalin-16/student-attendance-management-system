import React, { useState, useEffect } from 'react';
import { 
  FileSpreadsheet, 
  Download, 
  Filter, 
  AlertTriangle, 
  CheckCircle2, 
  Search, 
  ChevronRight, 
  Calendar,
  X,
  Info
} from 'lucide-react';
import { MonthlyReportResponse, StudentMonthlyReport, DEPARTMENTS, PERIOD_DETAILS } from '../types';
import { api } from '../services/api';

export const ReportsView: React.FC = () => {
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonth);
  const [department, setDepartment] = useState<string>('All');
  const [onlyDefaulters, setOnlyDefaulters] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  const [loading, setLoading] = useState<boolean>(true);
  const [report, setReport] = useState<MonthlyReportResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedStudentDetail, setSelectedStudentDetail] = useState<StudentMonthlyReport | null>(null);

  const fetchMonthlyReport = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const data = await api.getMonthlyReport(selectedMonth, department);
      setReport(data);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to fetch monthly report');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMonthlyReport();
  }, [selectedMonth, department]);

  const filteredStudents = (report?.students || []).filter((s) => {
    if (onlyDefaulters && !s.isBelow75) return false;
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      s.rollNumber.toLowerCase().includes(term) ||
      s.name.toLowerCase().includes(term) ||
      s.department.toLowerCase().includes(term)
    );
  });

  const handleDownloadCsv = () => {
    const url = api.getExportCsvUrl(selectedMonth, department, onlyDefaulters);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Attendance_Report_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Generate recent 12 months for dropdown selector
  const availableMonths: Array<{ value: string; label: string }> = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const lbl = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    availableMonths.push({ value: val, label: lbl });
  }

  return (
    <div className="space-y-5">
      {/* Top Filter & Export Bar */}
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
            <span>Monthly Attendance Reports & Defaulters List</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Aggregated period calculations, shortage highlighting below 75%, and certified CSV reports.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Month Selector */}
          <div className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-slate-400" />
            <select
              aria-label="Select evaluation month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm text-slate-800 bg-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs"
            >
              {availableMonths.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          {/* Department Filter */}
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

          {/* Export CSV Button */}
          <button
            onClick={handleDownloadCsv}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold shadow transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Monthly Statistics Summary Cards */}
      {report && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
              Working Days Logged
            </span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900">{report.totalWorkingDays} Days</span>
              <span className="text-xs text-slate-500">in {selectedMonth}</span>
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">
              ~{report.totalWorkingDays * 7} total scheduled periods
            </span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
              Average Class Attendance
            </span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900">{report.averageAttendance}%</span>
              <span className="text-xs text-emerald-600 font-medium">overall</span>
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">
              {report.overallPresent} / {report.overallTotal} student-periods attended
            </span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
              Eligible Students (&ge;75%)
            </span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-emerald-600">
                {report.totalStudents - report.below75Count}
              </span>
              <span className="text-xs text-slate-500">/ {report.totalStudents}</span>
            </div>
            <span className="text-[11px] text-emerald-600 mt-1 block font-medium">
              Eligible for semester exams
            </span>
          </div>

          <div className={`p-4 rounded-xl border shadow-xs transition-colors ${
            report.below75Count > 0 ? 'bg-rose-50/50 border-rose-300' : 'bg-white border-slate-200'
          }`}>
            <span className="text-xs font-semibold text-rose-700 uppercase tracking-wider block">
              Defaulters / Shortage (&lt;75%)
            </span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-rose-600">{report.below75Count}</span>
              <span className="text-xs text-rose-600 font-semibold">students flagged</span>
            </div>
            <span className="text-[11px] text-rose-600 mt-1 block">
              Attendance shortage notification required
            </span>
          </div>
        </div>
      )}

      {/* Filter Tabs: All vs Defaulters & Search */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setOnlyDefaulters(false)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              !onlyDefaulters
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Students ({report?.students.length || 0})
          </button>
          <button
            onClick={() => setOnlyDefaulters(true)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${
              onlyDefaulters
                ? 'bg-rose-600 text-white'
                : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Shortage Defaulters Only (&lt;75%)</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white text-rose-700 font-extrabold border border-rose-300">
              {report?.below75Count || 0}
            </span>
          </button>
        </div>

        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search student or roll no..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 w-56 shadow-xs"
          />
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500">
            <div className="w-7 h-7 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            Calculating monthly attendance records...
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            {onlyDefaulters ? (
              <div className="flex flex-col items-center gap-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                <p className="font-semibold text-slate-800">No attendance defaulters found!</p>
                <p className="text-xs text-slate-400">All evaluated students currently have 75% or higher attendance.</p>
              </div>
            ) : (
              <p>No students match your query.</p>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                  <th className="py-3 px-3 w-10 text-center">#</th>
                  <th className="py-3 px-3">Roll Number</th>
                  <th className="py-3 px-4">Student Name</th>
                  <th className="py-3 px-3">Department</th>
                  <th className="py-3 px-3 text-center">Periods Held</th>
                  <th className="py-3 px-3 text-center text-emerald-700">Attended</th>
                  <th className="py-3 px-3 text-center text-rose-700">Absences</th>
                  <th className="py-3 px-4 text-center">Attendance %</th>
                  <th className="py-3 px-3 text-center">Status / Eligibility</th>
                  <th className="py-3 px-3 text-center">Period 1-7 Breakdown</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredStudents.map((s, idx) => (
                  <tr
                    key={s.id}
                    className={`transition-colors cursor-pointer hover:bg-slate-50/80 ${
                      s.isBelow75 ? 'bg-rose-50/40 hover:bg-rose-50/70' : ''
                    }`}
                    onClick={() => setSelectedStudentDetail(s)}
                  >
                    <td className="py-3 px-3 text-xs text-slate-400 text-center font-mono">
                      {idx + 1}
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-xs text-indigo-700">
                      {s.rollNumber}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      {s.name}
                    </td>
                    <td className="py-3 px-3 text-xs text-slate-600">
                      {s.department}
                    </td>
                    <td className="py-3 px-3 text-center font-medium text-slate-700">
                      {s.totalPeriods}
                    </td>
                    <td className="py-3 px-3 text-center font-bold text-emerald-600">
                      {s.presentPeriods}
                    </td>
                    <td className="py-3 px-3 text-center font-bold text-rose-600">
                      {s.absentPeriods}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="inline-flex items-center gap-2">
                        <div className="w-16 bg-slate-200 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-2 rounded-full ${
                              s.isBelow75 ? 'bg-rose-600' : 'bg-emerald-600'
                            }`}
                            style={{ width: `${s.percentage}%` }}
                          ></div>
                        </div>
                        <span className={`font-bold text-xs ${
                          s.isBelow75 ? 'text-rose-700 font-extrabold' : 'text-slate-800'
                        }`}>
                          {s.percentage}%
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-center">
                      {s.totalPeriods === 0 ? (
                        <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-500 font-medium">
                          No Data
                        </span>
                      ) : s.isBelow75 ? (
                        <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 font-bold border border-rose-300">
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                          Shortage (&lt;75%)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-semibold border border-emerald-300">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          Eligible (&ge;75%)
                        </span>
                      )}
                    </td>

                    {/* Period breakdown mini indicators */}
                    <td className="py-3 px-3 text-center">
                      <div className="inline-flex items-center gap-1">
                        {PERIOD_DETAILS.map((p) => {
                          const pStat = s.periodStats[p.id];
                          const pPct = pStat?.pct || 0;
                          return (
                            <span
                              key={p.id}
                              title={`Period ${p.id} (${p.time}): ${pStat?.present || 0}/${pStat?.total || 0} (${pPct}%)`}
                              className={`w-4 h-4 rounded-xs text-[9px] font-bold flex items-center justify-center text-white ${
                                (pStat?.total || 0) === 0
                                  ? 'bg-slate-200 text-slate-400'
                                  : pPct >= 75
                                  ? 'bg-emerald-600'
                                  : 'bg-rose-500'
                              }`}
                            >
                              {p.id}
                            </span>
                          );
                        })}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Student Breakdown Modal */}
      {selectedStudentDetail && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full overflow-hidden border border-slate-200">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base">{selectedStudentDetail.name}</h3>
                <span className="text-xs text-indigo-300 font-mono">
                  Roll No: {selectedStudentDetail.rollNumber} • {selectedStudentDetail.department}
                </span>
              </div>
              <button
                onClick={() => setSelectedStudentDetail(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Overall status banner */}
              <div className={`p-4 rounded-lg border flex items-center justify-between ${
                selectedStudentDetail.isBelow75 
                  ? 'bg-rose-50 border-rose-300 text-rose-900' 
                  : 'bg-emerald-50 border-emerald-300 text-emerald-900'
              }`}>
                <div>
                  <div className="font-bold text-sm">
                    {selectedStudentDetail.isBelow75 ? 'Attendance Shortage Warning' : 'Good Attendance Standing'}
                  </div>
                  <div className="text-xs mt-0.5 opacity-90">
                    {selectedStudentDetail.isBelow75
                      ? 'Student does not meet the minimum 75% required attendance.'
                      : 'Student meets all university criteria for semester appearance.'}
                  </div>
                </div>
                <div className="text-2xl font-black">
                  {selectedStudentDetail.percentage}%
                </div>
              </div>

              {/* Summary Stats Grid */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <span className="text-[11px] text-slate-500 font-semibold block uppercase">Total Periods</span>
                  <span className="text-lg font-bold text-slate-800">{selectedStudentDetail.totalPeriods}</span>
                </div>
                <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-200">
                  <span className="text-[11px] text-emerald-700 font-semibold block uppercase">Attended</span>
                  <span className="text-lg font-bold text-emerald-700">{selectedStudentDetail.presentPeriods}</span>
                </div>
                <div className="bg-rose-50 p-3 rounded-lg border border-rose-200">
                  <span className="text-[11px] text-rose-700 font-semibold block uppercase">Missed / Absent</span>
                  <span className="text-lg font-bold text-rose-700">{selectedStudentDetail.absentPeriods}</span>
                </div>
              </div>

              {/* Period by Period Analysis */}
              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Period-Wise Breakdown for {selectedMonth}
                </h4>
                <div className="space-y-1.5">
                  {PERIOD_DETAILS.map((p) => {
                    const stat = selectedStudentDetail.periodStats[p.id] || { present: 0, total: 0, pct: 0 };
                    return (
                      <div
                        key={p.id}
                        className="flex items-center justify-between p-2 rounded-md bg-slate-50 border border-slate-200 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-700">{p.name}</span>
                          <span className="text-slate-400 text-[11px]">({p.time})</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-slate-600">
                            {stat.present} / {stat.total} periods
                          </span>
                          <span className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                            stat.pct >= 75 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}>
                            {stat.pct}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedStudentDetail(null)}
                  className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
