import { Link } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import {
  Zap, Briefcase, Users, BarChart3, CheckCircle2,
  ArrowRight, Brain, Shield, Clock, Star
} from 'lucide-react'

const FEATURES_CANDIDATES = [
  { icon: Briefcase, title: 'Browse Open Roles', description: 'Search and filter hundreds of positions across departments and locations in seconds.' },
  { icon: Brain, title: 'AI-Powered Matching', description: 'Our AI reads your resume and instantly shows you how well you match each role — before you even apply.' },
  { icon: Clock, title: 'Real-Time Status Updates', description: 'Track exactly where your application stands at every stage of the hiring pipeline.' },
]

const FEATURES_COMPANIES = [
  { icon: Zap, title: 'Intelligent Resume Screening', description: 'AI parses every resume in seconds, extracts skills, and scores candidates against your requirements automatically.' },
  { icon: BarChart3, title: 'Visual Pipeline Management', description: 'Drag-and-drop Kanban board gives your team a live view of every candidate moving through every stage.' },
  { icon: Users, title: 'Collaborative Hiring', description: 'Assign interviewers, collect structured evaluations, and align your team — all in one place.' },
  { icon: Shield, title: 'Role-Based Access Control', description: 'Admins, HR Managers, and Interviewers each see and do exactly what their role requires — nothing more.' },
]

const STATS = [
  { value: '10×', label: 'Faster Screening' },
  { value: '94%', label: 'Recruiter Satisfaction' },
  { value: '< 2s', label: 'AI Scoring Time' },
  { value: '100%', label: 'Audit Trail Coverage' },
]

export default function LandingPage() {
  const isRecruiterAuthenticated = useAuthStore((s) => s.isAuthenticated)

  return (
    <div className="min-h-screen bg-white">
      {/* ── Navbar ─────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 bg-white border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-700 rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-gray-900 text-lg">HireFlow AI</span>
          </div>

          <nav className="hidden sm:flex items-center gap-8 text-sm text-gray-600">
            <a href="#for-candidates" className="hover:text-gray-900 transition-colors">For Candidates</a>
            <a href="#for-companies" className="hover:text-gray-900 transition-colors">For Companies</a>
            <a href="#features" className="hover:text-gray-900 transition-colors">Features</a>
          </nav>

          <div className="flex items-center gap-3">
            <Link to="/careers" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
              Browse Jobs
            </Link>
            {isRecruiterAuthenticated ? (
              <Link
                to="/dashboard"
                className="flex items-center gap-1.5 bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-800 transition-colors"
              >
                Go to Console
                <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <Link
                to="/login"
                className="flex items-center gap-1.5 bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-800 transition-colors"
              >
                Recruiter Sign In
                <ArrowRight className="w-4 h-4" />
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* ── Hero ───────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-950 via-blue-900 to-blue-800 text-white">
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '32px 32px' }}
        />
        <div className="relative max-w-6xl mx-auto px-6 py-24 text-center">
          <div className="inline-flex items-center gap-2 bg-blue-800/60 border border-blue-700 text-blue-200 text-xs font-medium px-4 py-1.5 rounded-full mb-6">
            <Zap className="w-3.5 h-3.5" />
            Powered by AI — Built for Modern Hiring
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold leading-tight mb-6">
            Hiring, Intelligently
            <span className="block text-blue-300 mt-2">Streamlined.</span>
          </h1>
          <p className="text-blue-100 text-lg max-w-2xl mx-auto mb-10">
            HireFlow AI connects the world's best talent with the companies that need them —
            using AI to screen resumes, score candidates, and keep every hiring pipeline
            moving at the speed of business.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/careers"
              className="flex items-center gap-2 bg-white text-blue-900 font-semibold px-6 py-3 rounded-xl hover:bg-blue-50 transition-colors"
            >
              <Briefcase className="w-5 h-5" />
              Browse Open Jobs
            </Link>
            <Link
              to="/login"
              className="flex items-center gap-2 bg-blue-700/60 border border-blue-600 text-white font-medium px-6 py-3 rounded-xl hover:bg-blue-700 transition-colors"
            >
              <BarChart3 className="w-5 h-5" />
              Recruiter Console
            </Link>
          </div>
        </div>
      </section>

      {/* ── Stats ──────────────────────────────────────────────────────── */}
      <section className="border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 py-12 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {STATS.map((stat) => (
            <div key={stat.label}>
              <p className="text-3xl font-bold text-blue-700">{stat.value}</p>
              <p className="text-sm text-gray-500 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── For Candidates ─────────────────────────────────────────────── */}
      <section id="for-candidates" className="max-w-6xl mx-auto px-6 py-20">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-4">
              <Users className="w-3.5 h-3.5" />
              FOR JOB SEEKERS
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Find your next role — and know your chances before you apply.
            </h2>
            <p className="text-gray-500 mb-8">
              Create a free account, upload your resume, and let HireFlow AI show you
              exactly how well you match each open position. No more guessing.
            </p>
            <div className="space-y-4">
              {FEATURES_CANDIDATES.map((f) => (
                <div key={f.title} className="flex gap-4">
                  <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
                    <f.icon className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{f.title}</p>
                    <p className="text-sm text-gray-500 mt-0.5">{f.description}</p>
                  </div>
                </div>
              ))}
            </div>
            <Link
              to="/careers/register"
              className="inline-flex items-center gap-2 mt-8 bg-emerald-600 text-white font-medium px-5 py-2.5 rounded-xl hover:bg-emerald-700 transition-colors"
            >
              Create a Free Account
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-8 border border-emerald-100">
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 mb-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm font-semibold text-gray-900">Senior Frontend Engineer</p>
                  <p className="text-xs text-gray-400">Engineering · Remote</p>
                </div>
                <span className="flex items-center gap-1 bg-emerald-100 text-emerald-700 text-xs font-bold px-2.5 py-1 rounded-full">
                  <Zap className="w-3 h-3" /> 94%
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {['React', 'TypeScript', 'Node.js'].map((s) => (
                  <span key={s} className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full">{s}</span>
                ))}
              </div>
            </div>
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm font-semibold text-gray-900">Product Manager</p>
                  <p className="text-xs text-gray-400">Product · New York, NY</p>
                </div>
                <span className="flex items-center gap-1 bg-amber-100 text-amber-700 text-xs font-bold px-2.5 py-1 rounded-full">
                  <Zap className="w-3 h-3" /> 67%
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {['Strategy', 'Roadmapping', 'SQL'].map((s) => (
                  <span key={s} className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full">{s}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── For Companies ──────────────────────────────────────────────── */}
      <section id="for-companies" className="bg-gray-50 border-y border-gray-100">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-4">
              <BarChart3 className="w-3.5 h-3.5" />
              FOR COMPANIES
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Your entire hiring pipeline — in one intelligent console.
            </h2>
            <p className="text-gray-500 max-w-xl mx-auto">
              From the moment a candidate applies to the day they're hired, HireFlow AI
              keeps your team aligned, your data clean, and your pipeline moving.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURES_COMPANIES.map((f) => (
              <div key={f.title} className="bg-white rounded-xl p-6 border border-gray-200">
                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center mb-4">
                  <f.icon className="w-5 h-5 text-blue-700" />
                </div>
                <p className="text-sm font-semibold text-gray-900 mb-2">{f.title}</p>
                <p className="text-xs text-gray-500 leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>

          <div className="text-center mt-10">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 bg-blue-700 text-white font-medium px-6 py-3 rounded-xl hover:bg-blue-800 transition-colors"
            >
              Access the Recruiter Console
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── How it works ───────────────────────────────────────────────── */}
      <section id="features" className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">How HireFlow AI Works</h2>
          <p className="text-gray-500 max-w-xl mx-auto">
            A full hiring cycle — from job posting to offer letter — powered by AI at every step.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {[
            { step: '01', title: 'Post a Job', description: 'Define the role, required skills, and department. Our AI immediately suggests additional skills based on market data for that role.' },
            { step: '02', title: 'Candidates Apply', description: 'Job seekers browse your open positions, upload their resume, and apply in minutes. The AI immediately begins parsing and scoring.' },
            { step: '03', title: 'AI Screens Instantly', description: 'Every resume is analyzed, skills are extracted, and a match score (0–100%) is generated — before a recruiter reads a single line.' },
            { step: '04', title: 'Pipeline & Kanban', description: 'Move candidates through Applied → Screening → Interview → Technical Assessment → Offer → Hired with a drag-and-drop board.' },
            { step: '05', title: 'Structured Evaluations', description: 'Interviewers submit scored feedback directly inside the platform. HR sees a consolidated view — no more scattered email threads.' },
            { step: '06', title: 'Communicate & Close', description: 'Send personalized templated emails to candidates at any stage. Every communication is logged automatically for compliance.' },
          ].map((item) => (
            <div key={item.step} className="relative pl-14">
              <span className="absolute left-0 top-0 text-4xl font-bold text-gray-100 leading-none select-none">{item.step}</span>
              <div className="relative">
                <CheckCircle2 className="w-5 h-5 text-blue-700 mb-3" />
                <p className="text-sm font-semibold text-gray-900 mb-1">{item.title}</p>
                <p className="text-xs text-gray-500 leading-relaxed">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────────────────────────── */}
      <section className="bg-blue-950 text-white">
        <div className="max-w-6xl mx-auto px-6 py-20 text-center">
          <div className="flex justify-center mb-4">
            {[1,2,3,4,5].map((n) => (
              <Star key={n} className="w-5 h-5 fill-amber-400 text-amber-400" />
            ))}
          </div>
          <h2 className="text-3xl font-bold mb-4">Ready to transform your hiring?</h2>
          <p className="text-blue-200 max-w-lg mx-auto mb-8">
            Whether you're looking for your next opportunity or building the team that defines the future —
            HireFlow AI is where it starts.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/careers"
              className="flex items-center gap-2 bg-white text-blue-900 font-semibold px-6 py-3 rounded-xl hover:bg-blue-50 transition-colors"
            >
              <Briefcase className="w-5 h-5" />
              I'm a Job Seeker
            </Link>
            <Link
              to="/login"
              className="flex items-center gap-2 border border-blue-700 text-white font-medium px-6 py-3 rounded-xl hover:bg-blue-800 transition-colors"
            >
              <BarChart3 className="w-5 h-5" />
              I'm a Recruiter
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <footer className="border-t border-gray-100 bg-white">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-400">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-blue-700 rounded flex items-center justify-center">
              <Zap className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-semibold text-gray-600">HireFlow AI</span>
            <span>— © 2026 HireFlow AI, Inc. All rights reserved.</span>
          </div>
          <div className="flex items-center gap-6">
            <Link to="/careers" className="hover:text-gray-600 transition-colors">Browse Jobs</Link>
            <Link to="/careers/register" className="hover:text-gray-600 transition-colors">Job Seekers</Link>
            <Link to="/login" className="hover:text-gray-600 transition-colors">Recruiters</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}