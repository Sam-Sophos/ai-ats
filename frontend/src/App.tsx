import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'

// Layout
import PageWrapper from './components/layout/PageWrapper'

// Auth
import LoginPage from './pages/auth/LoginPage'

// Pages
import DashboardPage from './pages/DashboardPage'
import JobsListPage from './pages/jobs/JobsListPage'
import JobDetailPage from './pages/jobs/JobDetailPage'
import ApplicationsListPage from './pages/applications/ApplicationsListPage'
import ApplicationDetailPage from './pages/applications/ApplicationDetailPage'
import SubmitApplicationPage from './pages/applications/SubmitApplicationPage'
import CandidatesListPage from './pages/candidates/CandidatesListPage'
import PipelineBoardPage from './pages/pipeline/PipelineBoardPage'
import InterviewsPage from './pages/interviews/InterviewsPage'
import CommunicationsPage from './pages/communications/CommunicationsPage'
import InterviewDetailPage from './pages/interviews/InterviewDetailPage'
// Protected route wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<LoginPage />} />

        {/* Protected — all wrapped in the sidebar/navbar layout */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <PageWrapper />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />

          <Route path="jobs" element={<JobsListPage />} />
          <Route path="jobs/:id" element={<JobDetailPage />} />

          <Route path="applications" element={<ApplicationsListPage />} />
          <Route path="applications/new" element={<SubmitApplicationPage />} />
          <Route path="applications/:id" element={<ApplicationDetailPage />} />

          <Route path="candidates" element={<CandidatesListPage />} />

          <Route path="pipeline" element={<PipelineBoardPage />} />

          <Route path="interviews" element={<InterviewsPage />} />
          <Route path="interviews" element={<InterviewsPage />} />
          <Route path="interviews/:id" element={<InterviewDetailPage />} /> 

          <Route path="communications" element={<CommunicationsPage />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}