<div align="center">

<img src="https://img.shields.io/badge/HireFlow_AI-Intelligent_Hiring,_Streamlined-2563EB?style=for-the-badge&labelColor=1B2A4A" alt="HireFlow AI" />

<br /><br />

[![Django](https://img.shields.io/badge/Django_6-092E20?style=flat-square&logo=django&logoColor=white)](https://djangoproject.com)
[![React](https://img.shields.io/badge/React_18-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=flat-square&logo=postgresql&logoColor=white)](https://postgresql.org)
[![Celery](https://img.shields.io/badge/Celery-37814A?style=flat-square&logo=celery&logoColor=white)](https://docs.celeryq.dev)
[![Redis](https://img.shields.io/badge/Redis-DC382D?style=flat-square&logo=redis&logoColor=white)](https://redis.io)
[![Groq](https://img.shields.io/badge/Groq_AI-F55036?style=flat-square)](https://groq.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)

<br />

**A production-grade, two-sided AI-powered Applicant Tracking System.**
Recruiters manage hiring pipelines. Candidates browse jobs, apply, and get AI-scored in real time.

<br />

 &nbsp;·&nbsp; [**API →**](https://ai-ats-fd59.onrender.com/api/) &nbsp;·&nbsp; [**Report Bug**](https://github.com/Sam-Sophos/ai-ats/issues)

</div>

---

## What is HireFlow AI?

HireFlow AI is a full-stack SaaS applicant tracking system that uses AI to score candidates against job requirements in real time. It serves two completely separate user types on a single backend:

**Recruiters** get a full hiring console — job management, a drag-and-drop candidate pipeline, interview scheduling, structured evaluations, and email communications.

**Candidates** get a public job board, a self-service account portal, resume upload with drag-and-drop, and instant AI match scoring with a natural language explanation — no recruiter interaction needed.

The AI pipeline extracts skills, years of experience, and education level from raw PDF resumes using Groq's Llama 3.1 model, then scores candidates against job requirements in under 5 seconds — asynchronously, without blocking the web server.

---

## Features

### Recruiter Console
- **Dashboard** — real-time aggregate stats with applications-by-status bar chart, auto-refreshes every 60 seconds
- **Job Management** — create job postings with skill requirements, department, and description
- **Pipeline Kanban** — drag-and-drop board across 8 stages with AI score badges color-coded green/amber/red
- **Application Dossier** — full candidate view with AI match breakdown (matched/missing/additional skills), experience & education card, score override, status timeline, resume viewer, and AI processing log
- **AI Recommendation Card** — deterministic green/amber/red recommendation factoring skill match ratio and years of experience
- **Interview Scheduling** — schedule interviews, assign participants, collect structured 1-10 evaluations with written feedback
- **Communications** — email templates with merge tags (`{{candidate_first_name}}`, `{{job_title}}`), send history, per-application log
- **Role-Based Access Control** — ADMIN, HR_MANAGER, INTERVIEWER with enforcement at both API and UI levels

### Candidate Portal
- **Public Jobs Board** — browse open positions by department, search by title — no login required
- **Self-Service Accounts** — candidates register and log in completely independently from recruiter accounts
- **Resume Upload** — drag-and-drop PDF upload with client-side validation (type + 5MB size limit)
- **Live AI Scoring** — real-time polling shows the match score appear as the AI computes it
- **AI Match Explanation** — natural language summary explaining why the candidate scored what they scored
- **My Applications** — track all submissions with current pipeline stage and AI score

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                             │
│  React 18 · TypeScript · Vite 8 · TailwindCSS v4 · Zustand     │
│  Recruiter Console  →  /dashboard, /jobs, /pipeline, ...       │
│  Candidate Portal   →  /careers, /careers/:id, /careers/apply  │
└────────────────────────┬────────────────────────────────────────┘
                         │  HTTPS / Bearer JWT
┌────────────────────────▼────────────────────────────────────────┐
│                       API LAYER                                 │
│  Django 6 · Django REST Framework · 30+ endpoints              │
│  Two independent JWT auth systems:                              │
│    Recruiter JWT  →  standard User model + role claims          │
│    Candidate JWT  →  custom candidate_id claim (CandidateJWT)  │
└────────────────┬───────────────────────────┬────────────────────┘
                 │                           │
┌────────────────▼──────────┐  ┌────────────▼───────────────────┐
│       DATA LAYER          │  │         AI PIPELINE             │
│  PostgreSQL               │  │  Celery Worker + Redis Broker   │
│  18 normalized tables     │  │  pdfminer.six → text extract    │
│  Full audit trail         │  │  Groq API · Llama 3.1 8B        │
│  Immutable status history │  │  Skills · Experience · Education│
└───────────────────────────┘  └────────────────────────────────┘
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend Framework | Django 6.0 + Django REST Framework |
| Database | PostgreSQL — 18 normalized tables |
| Task Queue | Celery 5.6 + Redis |
| AI Model | Groq API — Llama 3.1 8B Instant |
| PDF Parsing | pdfminer.six |
| Authentication | SimpleJWT — two independent systems |
| Frontend Framework | React 18 + TypeScript |
| Build Tool | Vite 8 |
| Styling | TailwindCSS v4 |
| Server State | TanStack React Query |
| Client State | Zustand (persisted to localStorage) |
| HTTP Client | Axios with silent refresh interceptor |
| Forms & Validation | React Hook Form + Zod |
| Backend Hosting | Render.com |
| Frontend Hosting | Vercel |

---

## AI Pipeline

```
Candidate uploads PDF resume and clicks Submit
         ↓
POST /api/candidate-auth/apply/    202 Accepted (immediate)
         ↓
Celery task queued → Redis broker
         ↓
Worker picks up task:
  1. Extract raw text from PDF (pdfminer.six)
  2. Send to Groq API (Llama 3.1 8B):
       → Extract skills list
       → Extract years of professional experience
       → Extract highest education level
  3. Match against job required skills:
       matched  = job_skills ∩ candidate_skills
       missing  = job_skills − candidate_skills
       additional = candidate_skills − job_skills
       score    = |matched| / |job_skills| × 100
  4. Save score + skills + experience + education to DB
  5. Mark task SUCCESS
         ↓
Frontend polls GET /api/tasks/{task_id}/ every 2 seconds
         ↓
Score, breakdown, and recommendation appear live in the UI
Typical end-to-end time: < 5 seconds
```

---

## Database Schema

```
accounts       →  User (AbstractBaseUser), Role, Department
jobs           →  Job, Skill, JobSkill (explicit M2M through table)
candidates     →  Candidate (with password for self-service auth)
applications   →  Application, ApplicationSkill, ApplicationStatusHistory (append-only),
                  Status, JobOffer, AIProcessingLog
interviews     →  Interview, InterviewParticipant, Evaluation
communications →  MessageTemplate, CommunicationsLog
```

---

## Getting Started

### Prerequisites

- Python 3.12+
- Node.js 20+
- PostgreSQL 14+
- Redis 6+

### 1. Clone and set up backend

```bash
git clone https://github.com/Sam-Sophos/ai-ats.git
cd ai-ats/backend

python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env`:

```env
SECRET_KEY=your-secret-key-here
DEBUG=True
DATABASE_URL=postgresql://postgres:password@localhost:5432/ats_db
REDIS_URL=redis://localhost:6379/0
GROQ_API_KEY=your-groq-api-key
```

Get a free Groq API key at [console.groq.com](https://console.groq.com).

### 3. Set up database and seed data

```bash
python manage.py migrate
python manage.py seed_roles
python manage.py seed_statuses
python manage.py seed_demo_data
```

### 4. Start the backend

```bash
# Terminal 1 — Django
python manage.py runserver

# Terminal 2 — Celery worker (required for AI scoring)
celery -A config worker --loglevel=info
```

### 5. Set up and start frontend

```bash
cd ../frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

---

## Demo Credentials

| Role | Email | Password |
|---|---|---|
| Admin | `admin@ats.com` | `admin1234` |
| HR Manager | `hr@ats.com` | `hr1234` |
| Interviewer | `interviewer@ats.com` | `int1234` |

To test the candidate flow, go to `/careers/register` and create a new account.

---

## API Reference

```
# Auth
POST   /api/auth/login/                      Recruiter login → JWT tokens
GET    /api/auth/me/                          Current user profile
GET    /api/dashboard/stats/                  Aggregate stats for dashboard

# Jobs & Skills
GET    /api/jobs/                             List jobs (paginated, ?search=, ?department=)
POST   /api/jobs/                             Create job posting
GET    /api/skills/?search=python             Skill autocomplete

# Candidate Self-Service
POST   /api/candidate-auth/register/          Create candidate account
POST   /api/candidate-auth/login/             Candidate login → JWT tokens
POST   /api/candidate-auth/apply/             Submit application with PDF resume
GET    /api/candidate-auth/my-applications/   Candidate's own submissions
GET    /api/tasks/{task_id}/                  Poll AI processing status

# Applications (recruiter)
GET    /api/applications/                     List all applications
GET    /api/applications/{id}/                Full dossier with AI breakdown
PATCH  /api/applications/{id}/move-status/    Move to next pipeline stage
PATCH  /api/applications/{id}/override-score/ Manual score override (HR only)
GET    /api/applications/{id}/resume/         Stream PDF resume file

# Interviews & Evaluations
GET    /api/interviews/                       List interviews
POST   /api/interviews/                       Schedule interview
POST   /api/evaluations/                      Submit evaluation (participants only)

# Communications
GET    /api/templates/                        List email templates
POST   /api/templates/                        Create template
POST   /api/communications/send/              Send email to candidate
```

---

## Test Suite

```bash
cd backend
pytest           # Run all 41 tests
pytest -v        # Verbose
pytest -k "auth" # Filter by name
```

| File | Tests | Coverage |
|---|---|---|
| `tests/test_models.py` | 8 | Models, relationships, constraints |
| `tests/test_auth.py` | 9 | Login, JWT, permissions, RBAC |
| `tests/test_applications.py` | 13 | Full application workflow |
| `tests/test_ai_pipeline.py` | 11 | Groq integration, skill matching, scoring |

---

## Project Structure

```
ai-ats/
├── backend/
│   ├── apps/
│   │   ├── accounts/           User, Role, Department
│   │   ├── applications/       Application, Status, AI pipeline, dashboard stats
│   │   ├── candidates/         Candidate model + candidate JWT auth
│   │   ├── communications/     MessageTemplate, CommunicationsLog
│   │   ├── interviews/         Interview, InterviewParticipant, Evaluation
│   │   └── jobs/               Job, Skill, JobSkill
│   ├── config/
│   │   ├── settings/
│   │   │   ├── base.py
│   │   │   ├── development.py
│   │   │   └── production.py
│   │   ├── urls.py
│   │   └── celery.py
│   ├── services/
│   │   ├── ai_service.py       Groq integration + prompt
│   │   └── matching_service.py Skill intersection + scoring
│   ├── Procfile                Render: web + worker
│   ├── build.sh                Render build script
│   └── requirements.txt
└── frontend/
    └── src/
        ├── api/                One module per resource + axios interceptors
        ├── components/
        │   ├── layout/         Sidebar, Navbar, PageWrapper, CareersLayout
        │   └── ui/             Button, Badge, Modal, Input, AIScoreBadge, StatusBadge
        ├── hooks/              useAuth, useCandidateAuth, useTaskPoller
        ├── pages/
        │   ├── auth/           LoginPage
        │   ├── applications/   ApplicationsListPage, ApplicationDetailPage
        │   ├── careers/        CareersJobsPage, CareersJobDetailPage, MyApplicationsPage
        │   ├── communications/ CommunicationsPage
        │   ├── interviews/     InterviewsPage, InterviewDetailPage
        │   ├── jobs/           JobsListPage, JobDetailPage
        │   ├── pipeline/       PipelineBoardPage (Kanban)
        │   └── DashboardPage
        ├── store/              authStore, candidateAuthStore (Zustand + localStorage)
        └── types.ts            All TypeScript interfaces mirroring backend serializers
```

---

## Deployment

### Backend (Render.com)

The `Procfile` defines two services:

```
web:    gunicorn config.wsgi:application --bind 0.0.0.0:$PORT --workers 2
worker: celery -A config worker --loglevel=info --concurrency 1
```

Required environment variables on Render:

```
DJANGO_SETTINGS_MODULE=config.settings.production
SECRET_KEY=
DATABASE_URL=                 (from Render PostgreSQL)
REDIS_URL=                    (from Render Key Value)
GROQ_API_KEY=
ALLOWED_HOSTS=your-app.onrender.com
CORS_ALLOWED_ORIGINS=https://your-frontend.vercel.app
DEBUG=False
```

### Frontend (Vercel)

Set root directory to `frontend`. Add one environment variable:

```
VITE_API_BASE_URL=https://your-backend.onrender.com
```

---

## Roadmap

- [ ] Multi-tenancy — multiple companies on one platform
- [ ] Company self-registration + team invite flow
- [ ] Weighted skill matching (importance scores per required skill)
- [ ] Transactional email delivery via Brevo
- [ ] Candidate-facing score explanation ("here's why you scored 78%")
- [ ] Public company job board pages (`/jobs/acme-corp`)
- [ ] Stripe billing — free and pro tier
- [ ] Mobile audit and responsive improvements
- [ ] GitHub Actions CI/CD pipeline

---

## License

MIT License — see [LICENSE](LICENSE) for details.

---

<div align="center">

Built by **Samuel Tafere Melaku** — ECE Student · Addis Ababa University

[GitHub](https://github.com/Sam-Sophos) · [LinkedIn](https://linkedin.com/in/samuel-tafere)

<sub>© 2026 HireFlow AI, Inc. · Intelligent Hiring, Streamlined.</sub>

</div>
