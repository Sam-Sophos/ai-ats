import { Outlet, Link, useNavigate } from 'react-router-dom'
import { Zap, Briefcase, User, LogOut } from 'lucide-react'
import { useCandidateAuth } from '../../hooks/useCandidateAuth'

export default function CareersLayout() {
  const { candidate, isAuthenticated, logout } = useCandidateAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/careers')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top navbar — clean, public-facing, no sidebar */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          {/* Brand */}
          <Link to="/careers" className="flex items-center gap-2">
            <div className="w-7 h-7 bg-blue-700 rounded-lg flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-gray-900 text-sm">HireFlow</span>
          </Link>

          {/* Nav links */}
          <nav className="flex items-center gap-6 text-sm">
            <Link to="/careers" className="flex items-center gap-1.5 text-gray-600 hover:text-gray-900 transition-colors">
              <Briefcase className="w-4 h-4" />
              Jobs
            </Link>

            {isAuthenticated ? (
              <>
                <Link
                  to="/careers/my-applications"
                  className="flex items-center gap-1.5 text-gray-600 hover:text-gray-900 transition-colors"
                >
                  <User className="w-4 h-4" />
                  My Applications
                </Link>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-bold">
                    {candidate?.first_name?.[0]}{candidate?.last_name?.[0]}
                  </div>
                  <span className="text-gray-700 hidden sm:block">{candidate?.first_name}</span>
                  <button
                    onClick={handleLogout}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    title="Sign out"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </>
            ) : (
              <>
                <Link to="/careers/login" className="text-gray-600 hover:text-gray-900 transition-colors">
                  Sign In
                </Link>
                <Link
                  to="/careers/register"
                  className="bg-blue-700 text-white px-3 py-1.5 rounded-lg hover:bg-blue-800 transition-colors font-medium"
                >
                  Create Account
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Page content */}
      <main className="max-w-5xl mx-auto px-6 py-8">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white mt-16">
        <div className="max-w-5xl mx-auto px-6 py-6 flex items-center justify-between text-xs text-gray-400">
          <span>© 2026 HireFlow AI, Inc. All rights reserved.</span>
          <span>Intelligent Hiring, Streamlined.</span>
        </div>
      </footer>
    </div>
  )
}
