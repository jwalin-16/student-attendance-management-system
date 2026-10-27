# College Student Attendance Management System

A simple, robust, and fully functional Student Attendance Management System built with **React**, **JavaScript / TypeScript**, **Node.js**, **Express**, and **SQLite** for persistent storage.

---

## 🌟 Key Features

1. **Student Directory & CRUD**:
   - Add, edit, and delete students with unique roll numbers.
   - Real-time search across roll number, student name, and department.
   - Filter directory by academic departments (Computer Science, Electronics, Mechanical, Electrical, IT, Civil).

2. **Daily 7-Period Attendance Marking**:
   - Standard 7-period daily timetable scheme (09:00 AM to 03:55 PM).
   - Interactive Present (**P**) and Absent (**A**) toggles with intuitive color states.
   - Batch actions: *Mark All Present*, *Mark All Absent*, and *Reset to Saved*.
   - Row-level quick-fill buttons for individual students.

3. **Date Selection & Historical Retrieval**:
   - Select any date using the date picker or quick buttons (*Today*, *Yesterday*).
   - Instantly loads existing attendance records from SQLite or provides a fresh register.

4. **Monthly Analytics & University Regulations (<75% Shortage)**:
   - Automated monthly attendance calculation: Total periods held, attended periods, absences, and attendance percentage.
   - **University Defaulter Alert**: Distinctly highlights any student with **< 75% attendance** in bold amber/red with shortage warning badges.
   - Quick toggle to filter and view only students at risk of shortage.

5. **Certified CSV Export**:
   - One-click export of monthly attendance records formatted for college administration.
   - Supports filtering by department or exporting defaulters (< 75%) only.

6. **SQLite Persistent Storage & Conflict Prevention**:
   - Persistent SQLite database stored in `data/attendance.db`.
   - Database schema enforces `UNIQUE(student_id, date, period)` to prevent any duplicate attendance records.
   - Data persists across server restarts and container recreations.

7. **Clean & Beginner-Friendly UI**:
   - Intuitive dashboard with summary statistics, department distribution, today's status, and recent logs.
   - No unnecessary animations or complex dependencies.

---

## 🛠️ Technology Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS, Lucide Icons
- **Backend**: Node.js 22, Express, TypeScript (TSX)
- **Database**: SQLite (via `better-sqlite3` with WAL mode & foreign keys enabled)
- **DevOps & Testing**: Docker, Docker Compose, Kubernetes, Jenkins, VS Code, Selenium

---

## 🚀 Running the Project Locally

### Prerequisites
- Node.js (version 20 or higher, v22 recommended)
- npm (version 9 or higher)

### Step-by-Step Instructions

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-username/college-attendance-system.git
   cd college-attendance-system
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the development server**:
   ```bash
   npm run dev
   ```
   The application will start on **`http://localhost:3000`**. On first boot, SQLite will automatically create `data/attendance.db` and initialize demo college students and attendance data.

4. **Build for production**:
   ```bash
   npm run build
   ```

5. **Run in production mode**:
   ```bash
   npm start
   ```

6. **Run automated API integration tests**:
   ```bash
   npm test
   ```

---

## 🐳 Running with Docker & Docker Compose

### Using Docker Compose (Recommended)
This runs the application in a production container and automatically mounts a persistent Docker volume for the SQLite database.

```bash
# Build and launch container in background
docker compose up -d --build

# View container logs
docker compose logs -f

# Stop container
docker compose down
```
Access the application at `http://localhost:3000`. Data in `./data` persists across container restarts!

### Using Docker CLI
```bash
# Build image
docker build -t college-attendance-system:latest .

# Run container with volume mount for SQLite
docker run -d \
  -p 3000:3000 \
  -v $(pwd)/data:/app/data \
  --name attendance_app \
  college-attendance-system:latest
```

---

## ☸️ Deploying to Kubernetes (k8s)

Kubernetes manifests are located in the `k8s/` folder:
- `k8s/pvc.yaml`: PersistentVolumeClaim to retain SQLite database files across pod lifecycles.
- `k8s/deployment.yaml`: Deployment with single replica (RWO SQLite compatibility) and health/liveness probes.
- `k8s/service.yaml`: Service definition exposing port 80/3000.

Deploy to your Kubernetes cluster:
```bash
# 1. Apply PersistentVolumeClaim
kubectl apply -f k8s/pvc.yaml

# 2. Deploy the application
kubectl apply -f k8s/deployment.yaml

# 3. Create the Service
kubectl apply -f k8s/service.yaml

# Verify deployment status
kubectl get pods -l app=college-attendance-system
kubectl get svc college-attendance-service
```

---

## 🔄 Jenkins CI/CD Pipeline

A complete declarative `Jenkinsfile` is included at the root of the repository. It defines stages for:
1. **Source Checkout**: Pulls latest commits from GitHub.
2. **Dependency Installation**: Runs `npm ci`.
3. **Static Analysis & Linting**: Executes TypeScript compiler check (`npm run lint`).
4. **Vite Compilation**: Builds optimized client bundle (`npm run build`).
5. **Automated Testing**: Runs backend integration tests (`node tests/api.test.js`).
6. **Container Build**: Builds tagged Docker image.
7. **Container Sanity Check**: Spins up container and verifies `/api/health`.

---

## 🧪 Automated Testing with Selenium

An end-to-end Selenium test suite is provided in `tests/selenium_attendance_test.py`.

### Setup & Execution
```bash
# Install Python Selenium dependencies
pip install selenium webdriver-manager pytest

# Execute tests against local or remote app
python tests/selenium_attendance_test.py
# Or with pytest:
pytest tests/selenium_attendance_test.py -v
```

The test validates:
- Dashboard load & timetable cards
- 7-period daily attendance marking & batch action
- Saving records and SQLite persistence verification
- Student addition and real-time search
- Monthly reports & `<75%` attendance shortage badges
- CSV export download availability

---

## 💻 VS Code Configuration

The repository includes ready-to-use VS Code configurations in `.vscode/`:
- `.vscode/launch.json`: Press **F5** in VS Code to run the full-stack development server with interactive debugging and breakpoints.
- `.vscode/settings.json`: Recommended formatting, TypeScript SDK paths, and workspace file exclusions.

---

## 🗄️ Database Schema & Architecture

SQLite database is located at `data/attendance.db`.

```sql
CREATE TABLE students (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  roll_number TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  department TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE attendance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  date TEXT NOT NULL,
  period INTEGER NOT NULL CHECK(period >= 1 AND period <= 7),
  status TEXT NOT NULL CHECK(status IN ('Present', 'Absent')),
  remarks TEXT,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  UNIQUE(student_id, date, period) -- Prevents duplicate attendance records!
);
```

---

## 📡 REST API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Container and server health check |
| `GET` | `/api/dashboard/summary` | Overall metrics, department counts, today's attendance |
| `GET` | `/api/students` | Get all students (supports `?search=` and `?department=`) |
| `POST` | `/api/students` | Add a new student |
| `PUT` | `/api/students/:id` | Update an existing student |
| `DELETE` | `/api/students/:id` | Delete a student and cascade their attendance |
| `GET` | `/api/attendance` | Get attendance for a date (`?date=YYYY-MM-DD`) |
| `POST` | `/api/attendance` | Batch save/upsert attendance records for 7 periods |
| `GET` | `/api/reports/monthly` | Calculate monthly percentages and defaulters (`?month=YYYY-MM`) |
| `GET` | `/api/reports/export-csv` | Download monthly attendance spreadsheet as CSV |
| `POST` | `/api/reset-data` | Reset demo students and sample attendance |

---

## 📜 License
This project is open-source and released under the MIT / Apache-2.0 License.
