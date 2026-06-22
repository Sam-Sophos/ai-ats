import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import { useCandidateAuthStore } from './store/candidateAuthStore'

// ─── Public ───────────────────────────────────────────────────────────────────
import LandingPage from './pages/LandingPage'

// ─── Recruiter layout & pages ────────────────────────────────────────────────
import PageWrapper from './components/layout/PageWrapper'
import LoginPage from './pages/auth/LoginPage'
import DashboardPage from './pages/DashboardPage'
import JobsListPage from './pages/jobs/JobsListPage'
import JobDetailPage from './pages/jobs/JobDetailPage'
import ApplicationsListPage from './pages/applications/ApplicationsListPage'
import ApplicationDetailPage from './pages/applications/ApplicationDetailPage'
import SubmitApplicationPage from './pages/applications/SubmitApplicationPage'
import CandidatesListPage from './pages/candidates/CandidatesListPage'
import PipelineBoardPage from './pages/pipeline/PipelineBoardPage'
import InterviewsPage from './pages/interviews/InterviewsPage'
import InterviewDetailPage from './pages/interviews/InterviewDetailPage'
import CommunicationsPage from './pages/communications/CommunicationsPage'

// ─── Candidate portal layout & pages ─────────────────────────────────────────
import CareersLayout from './components/layout/CareersLayout'
import CareersJobsPage from './pages/careers/CareersJobsPage'
import CareersJobDetailPage from './pages/careers/CareersJobDetailPage'
import CandidateRegisterPage from './pages/careers/CandidateRegisterPage'
import CandidateLoginPage from './pages/careers/CandidateLoginPage'
import MyApplicationsPage from './pages/careers/MyApplicationsPage'

// ─── Route guards ─────────────────────────────────────────────────────────────
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <>{children}</>
}

function CandidateProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useCandidateAuthStore((s) => s.isAuthenticated)
  if (!isAuthenticated) return <Navigate to="/careers/login" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ── Public landing page ────────────────────────────────────── */}
        <Route path="/" element={<LandingPage />} />

        {/* ── Recruiter auth ─────────────────────────────────────────── */}
        <Route path="/login" element={<LoginPage />} />

        {/* ── Recruiter console (pathless layout route) ──────────────── */}
        <Route element={<ProtectedRoute><PageWrapper /></ProtectedRoute>}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/jobs" element={<JobsListPage />} />
          <Route path="/jobs/:id" element={<JobDetailPage />} />
          <Route path="/applications" element={<ApplicationsListPage />} />
          <Route path="/applications/new" element={<SubmitApplicationPage />} />
          <Route path="/applications/:id" element={<ApplicationDetailPage />} />
          <Route path="/candidates" element={<CandidatesListPage />} />
          <Route path="/pipeline" element={<PipelineBoardPage />} />
          <Route path="/interviews" element={<InterviewsPage />} />
          <Route path="/interviews/:id" element={<InterviewDetailPage />} />
          <Route path="/communications" element={<CommunicationsPage />} />
        </Route>

        {/* ── Candidate portal ───────────────────────────────────────── */}
        <Route path="/careers" element={<CareersLayout />}>
          <Route index element={<CareersJobsPage />} />
          <Route path=":id" element={<CareersJobDetailPage />} />
          <Route path="login" element={<CandidateLoginPage />} />
          <Route path="register" element={<CandidateRegisterPage />} />
          <Route
            path="my-applications"
            element={
              <CandidateProtectedRoute>
                <MyApplicationsPage />
              </CandidateProtectedRoute>
            }
          />
        </Route>

        {/* ── Fallback ───────────────────────────────────────────────── */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}