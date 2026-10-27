import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure data directory exists
const dataDir = path.resolve(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'attendance.db');
export const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      roll_number TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      department TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      period INTEGER NOT NULL CHECK(period >= 1 AND period <= 7),
      status TEXT NOT NULL CHECK(status IN ('Present', 'Absent')),
      remarks TEXT,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
      UNIQUE(student_id, date, period)
    );

    CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);
    CREATE INDEX IF NOT EXISTS idx_attendance_student_date ON attendance(student_id, date);
    CREATE INDEX IF NOT EXISTS idx_students_dept ON students(department);
  `);

  const studentCount = db.prepare('SELECT COUNT(*) as count FROM students').get() as { count: number };
  if (studentCount.count === 0) {
    seedInitialData();
  }
}

export function seedInitialData() {
  const insertStudent = db.prepare(`
    INSERT INTO students (roll_number, name, department, email, phone)
    VALUES (@roll_number, @name, @department, @email, @phone)
  `);

  const initialStudents = [
    { roll_number: '23CS101', name: 'Aarav Sharma', department: 'Computer Science', email: 'aarav.sharma@college.edu', phone: '9876543201' },
    { roll_number: '23CS102', name: 'Ananya Iyer', department: 'Computer Science', email: 'ananya.iyer@college.edu', phone: '9876543202' },
    { roll_number: '23CS103', name: 'Rohan Verma', department: 'Computer Science', email: 'rohan.verma@college.edu', phone: '9876543203' },
    { roll_number: '23CS104', name: 'Diya Patel', department: 'Computer Science', email: 'diya.patel@college.edu', phone: '9876543204' },
    { roll_number: '23EC201', name: 'Vikram Malhotra', department: 'Electronics & Communication', email: 'vikram.m@college.edu', phone: '9876543205' },
    { roll_number: '23EC202', name: 'Sneha Reddy', department: 'Electronics & Communication', email: 'sneha.reddy@college.edu', phone: '9876543206' },
    { roll_number: '23EC203', name: 'Kabir Das', department: 'Electronics & Communication', email: 'kabir.das@college.edu', phone: '9876543207' },
    { roll_number: '23ME301', name: 'Aditya Kulkarni', department: 'Mechanical Engineering', email: 'aditya.k@college.edu', phone: '9876543208' },
    { roll_number: '23ME302', name: 'Pooja Nair', department: 'Mechanical Engineering', email: 'pooja.nair@college.edu', phone: '9876543209' },
    { roll_number: '23ME303', name: 'Rahul Joshi', department: 'Mechanical Engineering', email: 'rahul.joshi@college.edu', phone: '9876543210' },
    { roll_number: '23EE401', name: 'Ishaan Gupta', department: 'Electrical Engineering', email: 'ishaan.gupta@college.edu', phone: '9876543211' },
    { roll_number: '23EE402', name: 'Meera Sen', department: 'Electrical Engineering', email: 'meera.sen@college.edu', phone: '9876543212' },
    { roll_number: '23IT501', name: 'Tanvi Deshmukh', department: 'Information Technology', email: 'tanvi.d@college.edu', phone: '9876543213' },
    { roll_number: '23IT502', name: 'Karthik Raja', department: 'Information Technology', email: 'karthik.raja@college.edu', phone: '9876543214' },
    { roll_number: '23CE601', name: 'Rhea Choudhury', department: 'Civil Engineering', email: 'rhea.c@college.edu', phone: '9876543215' },
  ];

  const seedTransaction = db.transaction(() => {
    const studentIds: number[] = [];
    for (const student of initialStudents) {
      const res = insertStudent.run(student);
      studentIds.push(res.lastInsertRowid as number);
    }

    const insertAttendance = db.prepare(`
      INSERT OR REPLACE INTO attendance (student_id, date, period, status)
      VALUES (?, ?, ?, ?)
    `);

    const now = new Date();
    const dates: string[] = [];
    for (let d = 1; d <= 25; d++) {
      const dateObj = new Date(now.getFullYear(), now.getMonth(), d);
      if (dateObj.getDay() !== 0 && dateObj.getDay() !== 6 && dateObj <= now) {
        const yyyy = dateObj.getFullYear();
        const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
        const dd = String(dateObj.getDate()).padStart(2, '0');
        dates.push(`${yyyy}-${mm}-${dd}`);
      }
    }

    const todayStr = now.toISOString().split('T')[0];
    if (!dates.includes(todayStr) && now.getDay() !== 0 && now.getDay() !== 6) {
      dates.push(todayStr);
    }

    for (let i = 0; i < studentIds.length; i++) {
      const sId = studentIds[i];
      // A few students below 75% for defaulter alert testing
      const isDefaulter = i === 2 || i === 7 || i === 11;
      const targetAttendanceRate = isDefaulter ? 0.62 : (i % 2 === 0 ? 0.92 : 0.85);

      for (const date of dates) {
        for (let period = 1; period <= 7; period++) {
          const hash = (sId * 37 + date.charCodeAt(date.length - 1) * 19 + period * 13) % 100;
          const status = (hash / 100) < targetAttendanceRate ? 'Present' : 'Absent';
          insertAttendance.run(sId, date, period, status);
        }
      }
    }
  });

  seedTransaction();
}
