/**
 * Automated Integration Test Suite for Student Attendance Management System
 * Run with: node tests/api.test.js
 */

const BASE_URL = process.env.TEST_URL || 'http://127.0.0.1:3000';

async function runTests() {
  console.log(`\n🚀 Starting Automated API & Backend Integration Tests against ${BASE_URL}...\n`);
  let passed = 0;
  let failed = 0;

  async function assert(desc, fn) {
    try {
      await fn();
      console.log(`  ✓ PASS: ${desc}`);
      passed++;
    } catch (err) {
      console.error(`  ✗ FAIL: ${desc} -> ${err.message}`);
      failed++;
    }
  }

  // Test 1: Health check
  await assert('Health check endpoint responds healthy', async () => {
    const res = await fetch(`${BASE_URL}/api/health`);
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const data = await res.json();
    if (data.status !== 'healthy') throw new Error('Status not healthy');
  });

  // Test 2: Dashboard summary
  await assert('Dashboard summary returns students, departments, and monthly stats', async () => {
    const res = await fetch(`${BASE_URL}/api/dashboard/summary`);
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const data = await res.json();
    if (typeof data.totalStudents !== 'number' || data.totalStudents < 1) {
      throw new Error('Invalid totalStudents');
    }
    if (!Array.isArray(data.departments) || data.departments.length === 0) {
      throw new Error('Invalid departments array');
    }
    if (typeof data.monthly.defaultersCount !== 'number') {
      throw new Error('Missing defaulters count');
    }
  });

  // Test 3: Students search & filtering
  await assert('Search students by roll number or name', async () => {
    const res = await fetch(`${BASE_URL}/api/students?search=Aarav`);
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) {
      throw new Error('Search did not return expected student');
    }
    if (!data[0].name.includes('Aarav')) {
      throw new Error('Incorrect student returned');
    }
  });

  // Test 4: Add new student
  let testStudentId = null;
  const testRoll = `TEST_${Date.now() % 10000}`;
  await assert('Add student with unique roll number and department', async () => {
    const res = await fetch(`${BASE_URL}/api/students`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roll_number: testRoll,
        name: 'Automated Test Student',
        department: 'Computer Science',
        email: 'test@college.edu',
        phone: '1234567890',
      }),
    });
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const student = await res.json();
    testStudentId = student.id;
    if (student.roll_number !== testRoll) throw new Error('Roll number mismatch');
  });

  // Test 5: Prevent duplicate roll numbers
  await assert('Prevent adding student with duplicate roll number (409 Conflict)', async () => {
    const res = await fetch(`${BASE_URL}/api/students`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roll_number: testRoll,
        name: 'Duplicate Student',
        department: 'Computer Science',
      }),
    });
    if (res.status !== 409) {
      throw new Error(`Expected 409 Conflict, got ${res.status}`);
    }
  });

  // Test 6: Mark 7-period attendance for date
  const testDate = '2026-10-27';
  await assert('Save 7-period daily attendance and prevent duplicates', async () => {
    const records = [];
    for (let p = 1; p <= 7; p++) {
      records.push({
        student_id: testStudentId,
        period: p,
        status: p <= 5 ? 'Present' : 'Absent', // 5 Present, 2 Absent
      });
    }

    const saveRes = await fetch(`${BASE_URL}/api/attendance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: testDate, records }),
    });
    if (!saveRes.ok) throw new Error(`Status ${saveRes.status}`);
    const saveResult = await saveRes.json();
    if (!saveResult.success) throw new Error('Failed to save attendance');

    // Retrieve and verify
    const fetchRes = await fetch(`${BASE_URL}/api/attendance?date=${testDate}`);
    const dayData = await fetchRes.json();
    const studentRecord = dayData.records.find((r) => r.id === testStudentId);
    if (!studentRecord) throw new Error('Test student attendance not found');
    if (studentRecord.periods[1] !== 'Present' || studentRecord.periods[7] !== 'Absent') {
      throw new Error('Periods status does not match saved values');
    }
  });

  // Test 7: Monthly reports & 75% calculation
  await assert('Calculate monthly attendance percentage and identify shortage', async () => {
    const res = await fetch(`${BASE_URL}/api/reports/monthly?month=2026-10`);
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const report = await res.json();
    if (typeof report.averageAttendance !== 'number') {
      throw new Error('Invalid averageAttendance calculation');
    }
    const studentReport = report.students.find((s) => s.id === testStudentId);
    if (!studentReport) throw new Error('Student missing from monthly report');
    if (typeof studentReport.percentage !== 'number') {
      throw new Error('Student percentage missing');
    }
  });

  // Test 8: CSV Export
  await assert('Export monthly attendance report as CSV with valid headers', async () => {
    const res = await fetch(`${BASE_URL}/api/reports/export-csv?month=2026-10`);
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const contentType = res.headers.get('content-type');
    if (!contentType || !contentType.includes('text/csv')) {
      throw new Error(`Unexpected content type: ${contentType}`);
    }
    const csv = await res.text();
    if (!csv.includes('Roll Number') || !csv.includes('Attendance %')) {
      throw new Error('CSV headers missing');
    }
  });

  // Clean up test student
  if (testStudentId) {
    await fetch(`${BASE_URL}/api/students/${testStudentId}`, { method: 'DELETE' });
  }

  console.log(`\n================================`);
  console.log(`Results: ${passed} Passed, ${failed} Failed`);
  console.log(`================================\n`);

  if (failed > 0) process.exit(1);
}

runTests().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
