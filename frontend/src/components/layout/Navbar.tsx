import { Bell, HelpCircle, LogOut, Search } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { useNavigate } from 'react-router-dom'

interface NavbarProps {
  searchPlaceholder?: string
}

export default function Navbar({ searchPlaceholder = 'Search globally...' }: NavbarProps) {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center gap-4 px-6 sticky top-0 z-30">
      {/* Search */}
      <div className="flex-1 max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder={searchPlaceholder}
            className="w-full pl-9 pr-4 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-3 ml-auto">
        <button className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
        </button>
        <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
          <HelpCircle className="w-5 h-5" />
        </button>

        {/* User menu */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-blue-700 flex items-center justify-center text-white text-xs font-bold">
            {user?.first_name?.[0]}{user?.last_name?.[0]}
          </div>
          <span className="text-sm font-medium text-gray-700 hidden sm:block">
            {user?.first_name} {user?.last_name}
          </span>
          <button
            onClick={handleLogout}
            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            title="Log out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  )
}
