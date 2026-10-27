import React from 'react';
import { 
  Users, 
  CalendarCheck2, 
  BarChart3, 
  GraduationCap, 
  RotateCcw,
  Clock
} from 'lucide-react';

interface HeaderProps {
  activeTab: 'dashboard' | 'attendance' | 'students' | 'reports';
  setActiveTab: (tab: 'dashboard' | 'attendance' | 'students' | 'reports') => void;
  onResetData: () => void;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, setActiveTab, onResetData }) => {
  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <header className="bg-slate-900 text-white shadow-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between py-4 border-b border-slate-800 gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600 rounded-lg shadow-inner flex items-center justify-center">
              <GraduationCap className="w-7 h-7 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-white">
                  Apex Institute of Technology
                </h1>
                <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-700/50 font-medium">
                  Portal v1.0
                </span>
              </div>
              <p className="text-xs text-slate-400">
                College Student Attendance Management System • 7-Period Daily Registry
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-xs bg-slate-800/80 px-3 py-1.5 rounded-md border border-slate-700 text-slate-300">
              <Clock className="w-3.5 h-3.5 text-indigo-400" />
              <span>Today: <strong className="text-white font-medium">{currentDate}</strong></span>
            </div>

            <button
              onClick={onResetData}
              title="Reset sample students and attendance data"
              className="text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Demo Data</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex space-x-1 sm:space-x-4 pt-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-2 py-3 px-3 sm:px-4 border-b-2 text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === 'dashboard'
                ? 'border-indigo-500 text-indigo-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Dashboard</span>
          </button>

          <button
            onClick={() => setActiveTab('attendance')}
            className={`flex items-center gap-2 py-3 px-3 sm:px-4 border-b-2 text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === 'attendance'
                ? 'border-indigo-500 text-indigo-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            <CalendarCheck2 className="w-4 h-4" />
            <span>Mark Daily Attendance (7 Periods)</span>
          </button>

          <button
            onClick={() => setActiveTab('students')}
            className={`flex items-center gap-2 py-3 px-3 sm:px-4 border-b-2 text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === 'students'
                ? 'border-indigo-500 text-indigo-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Student Directory</span>
          </button>

          <button
            onClick={() => setActiveTab('reports')}
            className={`flex items-center gap-2 py-3 px-3 sm:px-4 border-b-2 text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === 'reports'
                ? 'border-indigo-500 text-indigo-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Monthly Reports & Defaulters (&lt;75%)</span>
          </button>
        </nav>
      </div>
    </header>
  );
};
