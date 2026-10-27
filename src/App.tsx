import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { DashboardView } from './components/DashboardView';
import { MarkAttendanceView } from './components/MarkAttendanceView';
import { StudentsView } from './components/StudentsView';
import { ReportsView } from './components/ReportsView';
import { DashboardSummary } from './types';
import { api } from './services/api';
import { Database, ShieldCheck, CheckCircle2 } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'attendance' | 'students' | 'reports'>('dashboard');
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState<boolean>(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fetchSummary = async () => {
    try {
      setLoadingSummary(true);
      const data = await api.getDashboardSummary();
      setSummary(data);
    } catch (err) {
      console.error('Error fetching dashboard summary:', err);
    } finally {
      setLoadingSummary(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  const handleResetData = async () => {
    if (window.confirm('Reset all demo student and attendance data back to default initial state?')) {
      try {
        await api.resetData();
        await fetchSummary();
        setToastMessage('Database successfully reset and re-seeded with sample records!');
        setTimeout(() => setToastMessage(null), 4000);
      } catch (err: any) {
        alert(err.message || 'Failed to reset data');
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Navigation & Brand Header */}
      <Header 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        onResetData={handleResetData} 
      />

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 bg-emerald-600 text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 text-sm">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'dashboard' && (
          <DashboardView
            summary={summary}
            loading={loadingSummary}
            onNavigate={(tab) => setActiveTab(tab)}
            onSelectDate={(date) => setSelectedDate(date)}
          />
        )}

        {activeTab === 'attendance' && (
          <MarkAttendanceView
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
            onAttendanceSaved={fetchSummary}
          />
        )}

        {activeTab === 'students' && (
          <StudentsView onStudentChanged={fetchSummary} />
        )}

        {activeTab === 'reports' && (
          <ReportsView />
        )}
      </main>

      {/* Minimal clean footer */}
      <footer className="bg-white border-t border-slate-200 py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">Student Attendance Management System</span>
            <span>•</span>
            <span className="flex items-center gap-1 text-slate-600">
              <Database className="w-3.5 h-3.5 text-indigo-600" />
              SQLite Persistent Storage
            </span>
          </div>

          <div className="flex items-center gap-4 text-slate-400">
            <span>7 Periods Daily</span>
            <span>•</span>
            <span>75% University Threshold Rules</span>
            <span>•</span>
            <span className="text-emerald-600 flex items-center gap-1 font-medium">
              <ShieldCheck className="w-3.5 h-3.5" />
              Zero Duplicates Guaranteed
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
