import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDb, db, seedInitialData } from './server/db.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isProduction = process.env.NODE_ENV === 'production';
const PORT = 3000;

async function startServer() {
  const app = express();
  app.use(express.json());

  // Initialize SQLite schema and initial data
  initDb();

  // --- API ROUTES ---

  // Health check endpoint
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
  });

  // 1. Dashboard summary
  app.get('/api/dashboard/summary', (_req: Request, res: Response) => {
    try {
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

      const totalStudentsRow = db.prepare('SELECT COUNT(*) as count FROM students').get() as { count: number };
      const totalStudents = totalStudentsRow.count;

      // Departments count
      const deptRows = db.prepare('SELECT department, COUNT(*) as student_count FROM students GROUP BY department ORDER BY student_count DESC').all() as Array<{ department: string; student_count: number }>;

      // Today's attendance
      const todayAttendance = db.prepare(`
        SELECT 
          COUNT(*) as total_records,
          SUM(CASE WHEN status = 'Present' THEN 1 ELSE 0 END) as present_count,
          SUM(CASE WHEN status = 'Absent' THEN 1 ELSE 0 END) as absent_count
        FROM attendance
        WHERE date = ?
      `).get(today) as { total_records: number; present_count: number; absent_count: number };

      const todayPresent = todayAttendance.present_count || 0;
      const todayTotal = todayAttendance.total_records || 0;
      const todayPercentage = todayTotal > 0 ? Math.round((todayPresent / todayTotal) * 100) : 0;

      // Monthly stats & defaulters (< 75%)
      const monthlyStats = db.prepare(`
        SELECT 
          s.id,
          COUNT(a.id) as total_periods,
          SUM(CASE WHEN a.status = 'Present' THEN 1 ELSE 0 END) as present_periods
        FROM students s
        LEFT JOIN attendance a ON s.id = a.student_id AND a.date LIKE ?
        GROUP BY s.id
      `).all(`${currentMonth}%`) as Array<{ id: number; total_periods: number; present_periods: number }>;

      let defaulterCount = 0;
      let totalAttendedPeriods = 0;
      let totalAllPeriods = 0;

      for (const row of monthlyStats) {
        if (row.total_periods > 0) {
          totalAllPeriods += row.total_periods;
          totalAttendedPeriods += row.present_periods;
          const pct = (row.present_periods / row.total_periods) * 100;
          if (pct < 75) {
            defaulterCount++;
          }
        }
      }

      const monthlyAverage = totalAllPeriods > 0 ? Math.round((totalAttendedPeriods / totalAllPeriods) * 100) : 0;

      // Recent 5 dates with attendance recorded
      const recentDates = db.prepare(`
        SELECT date, COUNT(DISTINCT student_id) as students_marked, COUNT(*) as total_periods
        FROM attendance
        GROUP BY date
        ORDER BY date DESC
        LIMIT 5
      `).all() as Array<{ date: string; students_marked: number; total_periods: number }>;

      res.json({
        totalStudents,
        departments: deptRows,
        today: {
          date: today,
          isLogged: todayTotal > 0,
          presentCount: todayPresent,
          absentCount: todayAttendance.absent_count || 0,
          totalPeriods: todayTotal,
          percentage: todayPercentage,
        },
        monthly: {
          month: currentMonth,
          defaultersCount: defaulterCount,
          averagePercentage: monthlyAverage,
          totalLoggedPeriods: totalAllPeriods,
        },
        recentDates,
      });
    } catch (error: any) {
      console.error('Error in /api/dashboard/summary:', error);
      res.status(500).json({ error: error.message || 'Failed to fetch dashboard summary' });
    }
  });

  // 2. Students CRUD & Search
  // GET /api/students
  app.get('/api/students', (req: Request, res: Response) => {
    try {
      const search = (req.query.search as string || '').trim().toLowerCase();
      const department = (req.query.department as string || '').trim();

      let query = 'SELECT * FROM students WHERE 1=1';
      const params: any[] = [];

      if (department && department !== 'All') {
        query += ' AND department = ?';
        params.push(department);
      }

      if (search) {
        query += ' AND (LOWER(roll_number) LIKE ? OR LOWER(name) LIKE ? OR LOWER(department) LIKE ?)';
        const pattern = `%${search}%`;
        params.push(pattern, pattern, pattern);
      }

      query += ' ORDER BY roll_number ASC';

      const students = db.prepare(query).all(...params);
      res.json(students);
    } catch (error: any) {
      console.error('Error fetching students:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // POST /api/students (Add student)
  app.post('/api/students', (req: Request, res: Response) => {
    try {
      const { roll_number, name, department, email, phone } = req.body;

      if (!roll_number || !name || !department) {
        return res.status(400).json({ error: 'Roll number, Name, and Department are required.' });
      }

      const trimmedRoll = roll_number.trim().toUpperCase();
      const trimmedName = name.trim();
      const trimmedDept = department.trim();

      // Check unique roll number
      const existing = db.prepare('SELECT id FROM students WHERE roll_number = ?').get(trimmedRoll);
      if (existing) {
        return res.status(409).json({ error: `Student with roll number "${trimmedRoll}" already exists.` });
      }

      const stmt = db.prepare(`
        INSERT INTO students (roll_number, name, department, email, phone)
        VALUES (?, ?, ?, ?, ?)
      `);
      const result = stmt.run(trimmedRoll, trimmedName, trimmedDept, (email || '').trim(), (phone || '').trim());
      const newStudent = db.prepare('SELECT * FROM students WHERE id = ?').get(result.lastInsertRowid);

      res.status(201).json(newStudent);
    } catch (error: any) {
      console.error('Error adding student:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // PUT /api/students/:id (Edit student)
  app.put('/api/students/:id', (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      const { roll_number, name, department, email, phone } = req.body;

      if (!id || isNaN(id)) {
        return res.status(400).json({ error: 'Invalid student ID.' });
      }

      if (!roll_number || !name || !department) {
        return res.status(400).json({ error: 'Roll number, Name, and Department are required.' });
      }

      const trimmedRoll = roll_number.trim().toUpperCase();

      // Ensure roll number is not taken by another student
      const duplicate = db.prepare('SELECT id FROM students WHERE roll_number = ? AND id != ?').get(trimmedRoll, id);
      if (duplicate) {
        return res.status(409).json({ error: `Roll number "${trimmedRoll}" is already assigned to another student.` });
      }

      const stmt = db.prepare(`
        UPDATE students
        SET roll_number = ?, name = ?, department = ?, email = ?, phone = ?
        WHERE id = ?
      `);
      const info = stmt.run(trimmedRoll, name.trim(), department.trim(), (email || '').trim(), (phone || '').trim(), id);

      if (info.changes === 0) {
        return res.status(404).json({ error: 'Student not found.' });
      }

      const updated = db.prepare('SELECT * FROM students WHERE id = ?').get(id);
      res.json(updated);
    } catch (error: any) {
      console.error('Error updating student:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // DELETE /api/students/:id
  app.delete('/api/students/:id', (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (!id || isNaN(id)) {
        return res.status(400).json({ error: 'Invalid student ID.' });
      }

      const stmt = db.prepare('DELETE FROM students WHERE id = ?');
      const info = stmt.run(id);

      if (info.changes === 0) {
        return res.status(404).json({ error: 'Student not found.' });
      }

      res.json({ message: 'Student and attendance records deleted successfully.' });
    } catch (error: any) {
      console.error('Error deleting student:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // 3. Attendance Endpoints
  // GET /api/attendance?date=YYYY-MM-DD&department=
  app.get('/api/attendance', (req: Request, res: Response) => {
    try {
      const date = req.query.date as string || new Date().toISOString().split('T')[0];
      const department = req.query.department as string || '';

      let studentQuery = 'SELECT id, roll_number, name, department FROM students WHERE 1=1';
      const studentParams: any[] = [];
      if (department && department !== 'All') {
        studentQuery += ' AND department = ?';
        studentParams.push(department);
      }
      studentQuery += ' ORDER BY roll_number ASC';

      const students = db.prepare(studentQuery).all(...studentParams) as Array<{
        id: number;
        roll_number: string;
        name: string;
        department: string;
      }>;

      // Fetch attendance rows for this date
      const attendanceRows = db.prepare(`
        SELECT student_id, period, status, remarks
        FROM attendance
        WHERE date = ?
      `).all(date) as Array<{
        student_id: number;
        period: number;
        status: 'Present' | 'Absent';
        remarks?: string;
      }>;

      // Map by student_id and period
      const attendanceMap = new Map<string, string>();
      for (const row of attendanceRows) {
        attendanceMap.set(`${row.student_id}-${row.period}`, row.status);
      }

      let totalPresent = 0;
      let totalAbsent = 0;
      let totalMarkedPeriods = 0;

      const studentAttendance = students.map((s) => {
        const periods: Record<number, 'Present' | 'Absent' | null> = {};
        let studentPresent = 0;
        let studentAbsent = 0;

        for (let p = 1; p <= 7; p++) {
          const st = (attendanceMap.get(`${s.id}-${p}`) as 'Present' | 'Absent') || null;
          periods[p] = st;
          if (st === 'Present') {
            studentPresent++;
            totalPresent++;
            totalMarkedPeriods++;
          } else if (st === 'Absent') {
            studentAbsent++;
            totalAbsent++;
            totalMarkedPeriods++;
          }
        }

        return {
          ...s,
          periods,
          presentCount: studentPresent,
          absentCount: studentAbsent,
          isFullyMarked: studentPresent + studentAbsent === 7,
        };
      });

      res.json({
        date,
        totalStudents: students.length,
        totalMarkedPeriods,
        totalPresent,
        totalAbsent,
        records: studentAttendance,
      });
    } catch (error: any) {
      console.error('Error fetching attendance:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // POST /api/attendance (Batch save/upsert attendance for a date)
  // Prevents duplicates by using SQLite UNIQUE(student_id, date, period) and ON CONFLICT DO UPDATE
  app.post('/api/attendance', (req: Request, res: Response) => {
    try {
      const { date, records } = req.body;

      if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({ error: 'Valid date in YYYY-MM-DD format is required.' });
      }

      if (!Array.isArray(records)) {
        return res.status(400).json({ error: 'Records must be an array of attendance items.' });
      }

      const upsertStmt = db.prepare(`
        INSERT INTO attendance (student_id, date, period, status, remarks, updated_at)
        VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(student_id, date, period) DO UPDATE SET
          status = excluded.status,
          remarks = excluded.remarks,
          updated_at = CURRENT_TIMESTAMP
      `);

      const saveTransaction = db.transaction((items: any[]) => {
        let savedCount = 0;
        for (const item of items) {
          if (
            typeof item.student_id === 'number' &&
            item.period >= 1 &&
            item.period <= 7 &&
            (item.status === 'Present' || item.status === 'Absent')
          ) {
            upsertStmt.run(item.student_id, date, item.period, item.status, item.remarks || null);
            savedCount++;
          }
        }
        return savedCount;
      });

      const count = saveTransaction(records);

      res.json({
        success: true,
        message: `Successfully saved ${count} period attendance records for date ${date}.`,
        date,
        savedCount: count,
      });
    } catch (error: any) {
      console.error('Error saving attendance:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // 4. Monthly Reports & Defaulter (<75%) Calculations
  // GET /api/reports/monthly?month=YYYY-MM&department=
  app.get('/api/reports/monthly', (req: Request, res: Response) => {
    try {
      const now = new Date();
      const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const month = (req.query.month as string || currentMonthStr).trim();
      const department = (req.query.department as string || '').trim();

      if (!/^\d{4}-\d{2}$/.test(month)) {
        return res.status(400).json({ error: 'Month must be in YYYY-MM format (e.g. 2026-10).' });
      }

      let studentQuery = 'SELECT id, roll_number, name, department, email, phone FROM students WHERE 1=1';
      const studentParams: any[] = [];
      if (department && department !== 'All') {
        studentQuery += ' AND department = ?';
        studentParams.push(department);
      }
      studentQuery += ' ORDER BY roll_number ASC';

      const students = db.prepare(studentQuery).all(...studentParams) as Array<{
        id: number;
        roll_number: string;
        name: string;
        department: string;
        email?: string;
        phone?: string;
      }>;

      // Get count of distinct working days in this month where attendance was marked
      const distinctDaysRow = db.prepare(`
        SELECT COUNT(DISTINCT date) as days_count
        FROM attendance
        WHERE date LIKE ?
      `).get(`${month}%`) as { days_count: number };
      const totalWorkingDays = distinctDaysRow.days_count || 0;

      // Aggregate attendance per student for this month
      const attendanceSummary = db.prepare(`
        SELECT 
          student_id,
          COUNT(*) as total_periods,
          SUM(CASE WHEN status = 'Present' THEN 1 ELSE 0 END) as present_periods,
          SUM(CASE WHEN status = 'Absent' THEN 1 ELSE 0 END) as absent_periods
        FROM attendance
        WHERE date LIKE ?
        GROUP BY student_id
      `).all(`${month}%`) as Array<{
        student_id: number;
        total_periods: number;
        present_periods: number;
        absent_periods: number;
      }>;

      const summaryMap = new Map<number, { total: number; present: number; absent: number }>();
      for (const row of attendanceSummary) {
        summaryMap.set(row.student_id, {
          total: row.total_periods,
          present: row.present_periods,
          absent: row.absent_periods,
        });
      }

      // Period-wise breakdown (how many times attended period 1, period 2, etc.)
      const periodWise = db.prepare(`
        SELECT 
          student_id,
          period,
          SUM(CASE WHEN status = 'Present' THEN 1 ELSE 0 END) as present_count,
          COUNT(*) as total_count
        FROM attendance
        WHERE date LIKE ?
        GROUP BY student_id, period
      `).all(`${month}%`) as Array<{
        student_id: number;
        period: number;
        present_count: number;
        total_count: number;
      }>;

      const periodMap = new Map<string, { present: number; total: number }>();
      for (const pw of periodWise) {
        periodMap.set(`${pw.student_id}-${pw.period}`, {
          present: pw.present_count,
          total: pw.total_count,
        });
      }

      let overallPresent = 0;
      let overallTotal = 0;
      let below75Count = 0;

      const reportRows = students.map((s) => {
        const stats = summaryMap.get(s.id) || { total: 0, present: 0, absent: 0 };
        const percentage = stats.total > 0 ? Number(((stats.present / stats.total) * 100).toFixed(1)) : 0;
        const isBelow75 = stats.total > 0 && percentage < 75;

        if (isBelow75) {
          below75Count++;
        }
        overallPresent += stats.present;
        overallTotal += stats.total;

        const periodStats: Record<number, { present: number; total: number; pct: number }> = {};
        for (let p = 1; p <= 7; p++) {
          const pStat = periodMap.get(`${s.id}-${p}`) || { present: 0, total: 0 };
          periodStats[p] = {
            present: pStat.present,
            total: pStat.total,
            pct: pStat.total > 0 ? Number(((pStat.present / pStat.total) * 100).toFixed(0)) : 0,
          };
        }

        return {
          id: s.id,
          rollNumber: s.roll_number,
          name: s.name,
          department: s.department,
          email: s.email,
          phone: s.phone,
          totalPeriods: stats.total,
          presentPeriods: stats.present,
          absentPeriods: stats.absent,
          percentage,
          isBelow75,
          periodStats,
        };
      });

      const averageAttendance = overallTotal > 0 ? Number(((overallPresent / overallTotal) * 100).toFixed(1)) : 0;

      res.json({
        month,
        totalWorkingDays,
        totalStudents: students.length,
        below75Count,
        averageAttendance,
        overallPresent,
        overallTotal,
        students: reportRows,
      });
    } catch (error: any) {
      console.error('Error generating monthly report:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // 5. CSV Export Endpoint
  // GET /api/reports/export-csv?month=YYYY-MM&department=&defaulters_only=
  app.get('/api/reports/export-csv', (req: Request, res: Response) => {
    try {
      const now = new Date();
      const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const month = (req.query.month as string || currentMonthStr).trim();
      const department = (req.query.department as string || '').trim();
      const defaultersOnly = req.query.defaulters_only === 'true';

      let studentQuery = 'SELECT id, roll_number, name, department, email, phone FROM students WHERE 1=1';
      const studentParams: any[] = [];
      if (department && department !== 'All') {
        studentQuery += ' AND department = ?';
        studentParams.push(department);
      }
      studentQuery += ' ORDER BY roll_number ASC';

      const students = db.prepare(studentQuery).all(...studentParams) as Array<{
        id: number;
        roll_number: string;
        name: string;
        department: string;
        email?: string;
        phone?: string;
      }>;

      const attendanceSummary = db.prepare(`
        SELECT 
          student_id,
          COUNT(*) as total_periods,
          SUM(CASE WHEN status = 'Present' THEN 1 ELSE 0 END) as present_periods,
          SUM(CASE WHEN status = 'Absent' THEN 1 ELSE 0 END) as absent_periods
        FROM attendance
        WHERE date LIKE ?
        GROUP BY student_id
      `).all(`${month}%`) as Array<{
        student_id: number;
        total_periods: number;
        present_periods: number;
        absent_periods: number;
      }>;

      const summaryMap = new Map<number, { total: number; present: number; absent: number }>();
      for (const row of attendanceSummary) {
        summaryMap.set(row.student_id, {
          total: row.total_periods,
          present: row.present_periods,
          absent: row.absent_periods,
        });
      }

      // Build CSV
      const csvRows: string[] = [];
      csvRows.push('Roll Number,Student Name,Department,Total Periods Held,Periods Attended,Total Absences,Attendance %,Status,Email,Phone');

      for (const s of students) {
        const stats = summaryMap.get(s.id) || { total: 0, present: 0, absent: 0 };
        const pct = stats.total > 0 ? ((stats.present / stats.total) * 100).toFixed(1) : '0.0';
        const numPct = parseFloat(pct);
        const isShortage = stats.total > 0 && numPct < 75;
        const status = stats.total === 0 ? 'No Data' : isShortage ? 'DEFICIENT (< 75%)' : 'ELIGIBLE (>= 75%)';

        if (defaultersOnly && !isShortage) {
          continue;
        }

        const escapeCsv = (str: string) => `"${(str || '').replace(/"/g, '""')}"`;

        csvRows.push([
          escapeCsv(s.roll_number),
          escapeCsv(s.name),
          escapeCsv(s.department),
          stats.total,
          stats.present,
          stats.absent,
          `${pct}%`,
          escapeCsv(status),
          escapeCsv(s.email || ''),
          escapeCsv(s.phone || '')
        ].join(','));
      }

      const csvContent = csvRows.join('\r\n');
      const filename = `attendance_report_${month}${department ? `_${department.replace(/\s+/g, '_')}` : ''}${defaultersOnly ? '_defaulters' : ''}.csv`;

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(csvContent);
    } catch (error: any) {
      console.error('Error exporting CSV:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // 6. Reset database endpoint (optional utility for demo / testing)
  app.post('/api/reset-data', (_req: Request, res: Response) => {
    try {
      db.exec(`
        DELETE FROM attendance;
        DELETE FROM students;
      `);
      seedInitialData();
      res.json({ message: 'Database reset and sample data successfully re-seeded.' });
    } catch (error: any) {
      console.error('Error resetting database:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // --- VITE MIDDLEWARE / STATIC ASSETS ---
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist/index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal error starting server:', err);
  process.exit(1);
});
