import { NavLink } from 'react-router-dom'
import {
  Briefcase, Users, UserCheck, LayoutDashboard,
  Calendar, MessageSquare, GitBranch, PlusCircle, Zap
} from 'lucide-react'
import { cn } from '../ui'
import { useAuthStore } from '../../store/authStore'

const navItems = [
  { to: '/dashboard',      label: 'Dashboard',      icon: LayoutDashboard },
  { to: '/jobs',           label: 'Jobs',           icon: Briefcase       },
  { to: '/applications',   label: 'Applications',   icon: UserCheck       },
  { to: '/candidates',     label: 'Candidates',     icon: Users           },
  { to: '/pipeline',       label: 'Pipeline',       icon: GitBranch       },
  { to: '/interviews',     label: 'Interviews',     icon: Calendar        },
  { to: '/communications', label: 'Communications', icon: MessageSquare   },
]

export default function Sidebar() {
  const user = useAuthStore((s) => s.user)
  const isHR = user?.role?.title === 'HR_MANAGER' || user?.role?.title === 'ADMIN'

  return (
    <aside className="fixed left-0 top-0 h-screen w-56 bg-[#1a237e] flex flex-col z-40">
      {/* Brand */}
      <div className="px-4 pt-5 pb-4 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-blue-400 rounded-lg flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-tight">HireFlow AI</p>
            <p className="text-blue-300 text-[10px] uppercase tracking-wider">Recruiter Console</p>
          </div>
        </div>
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                isActive
                  ? 'bg-white/20 text-white font-medium'
                  : 'text-blue-200 hover:bg-white/10 hover:text-white'
              )
            }
          >
            <Icon className="w-4 h-4 shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Bottom section */}
      <div className="px-2 pb-4 space-y-1 border-t border-white/10 pt-3">
        {isHR && (
          <NavLink
            to="/jobs"
            className="flex items-center gap-2 w-full px-3 py-2 bg-blue-500 hover:bg-blue-400 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            Create New Job
          </NavLink>
        )}

        {/* User info */}
        {user && (
          <div className="flex items-center gap-2 px-3 py-2 mt-1">
            <div className="w-8 h-8 rounded-full bg-blue-400 flex items-center justify-center text-white text-xs font-bold shrink-0">
              {user.first_name[0]}{user.last_name[0]}
            </div>
            <div className="min-w-0">
              <p className="text-white text-xs font-medium truncate">{user.first_name} {user.last_name}</p>
              <p className="text-blue-300 text-[10px] truncate">{user.role?.title ?? 'User'}</p>
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}