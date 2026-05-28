import { useAuth } from '@/hooks/useAuth'
import { useTheme } from '@/hooks/useTheme'
import {
  Sun,
  Moon,
  LogOut,
  Shield,
  User,
  Mail,
  Crown,
} from 'lucide-react'

export default function Settings() {
  const { user, logout, isAdmin } = useAuth()
  const { theme, toggleTheme } = useTheme()

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-1">Settings</h1>
        <p className="text-sm text-[#737373]">Manage your preferences</p>
      </div>

      <div className="space-y-4">
        {/* Profile Card */}
        <div className="bg-[#171717] rounded-xl border border-[#262626] p-5">
          <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <User className="w-4 h-4 text-[#F59E0B]" />
            Profile
          </h2>
          {user && (
            <div className="flex items-center gap-4">
              <img
                src={user.avatar || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.name || 'User')}
                alt=""
                className="w-14 h-14 rounded-full"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-white font-medium">{user.name || 'User'}</p>
                  {isAdmin && (
                    <span className="flex items-center gap-1 px-2 py-0.5 bg-[#F59E0B]/10 text-[#F59E0B] rounded text-[10px] font-medium">
                      <Crown className="w-3 h-3" />
                      Admin
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-sm text-[#737373]">
                  <Mail className="w-3.5 h-3.5" />
                  {user.email}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Appearance */}
        <div className="bg-[#171717] rounded-xl border border-[#262626] p-5">
          <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            {theme === 'dark' ? (
              <Moon className="w-4 h-4 text-[#F59E0B]" />
            ) : (
              <Sun className="w-4 h-4 text-[#F59E0B]" />
            )}
            Appearance
          </h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white">Dark Mode</p>
              <p className="text-xs text-[#737373]">Toggle between dark and light theme</p>
            </div>
            <button
              onClick={toggleTheme}
              className={`w-12 h-6 rounded-full transition-colors relative ${
                theme === 'dark' ? 'bg-[#F59E0B]' : 'bg-[#262626]'
              }`}
            >
              <div
                className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                  theme === 'dark' ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Permissions */}
        <div className="bg-[#171717] rounded-xl border border-[#262626] p-5">
          <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <Shield className="w-4 h-4 text-[#F59E0B]" />
            Your Permissions
          </h2>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-[#737373]">View leads</span>
              <CheckIcon />
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-[#737373]">Update lead status</span>
              <CheckIcon />
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-[#737373]">Add notes</span>
              <CheckIcon />
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-[#737373]">Upload Excel files</span>
              {isAdmin ? <CheckIcon /> : <XIcon />}
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-[#737373]">Delete leads</span>
              {isAdmin ? <CheckIcon /> : <XIcon />}
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-[#737373]">Manage categories</span>
              {isAdmin ? <CheckIcon /> : <XIcon />}
            </div>
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 py-3 bg-red-500/10 text-red-400 rounded-xl border border-red-500/20 hover:bg-red-500/20 transition-colors text-sm font-medium"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </div>
  )
}

function CheckIcon() {
  return (
    <div className="w-5 h-5 rounded-full bg-emerald-500/10 flex items-center justify-center">
      <div className="w-2 h-2 rounded-full bg-emerald-400" />
    </div>
  )
}

function XIcon() {
  return (
    <div className="w-5 h-5 rounded-full bg-red-500/10 flex items-center justify-center">
      <div className="w-2 h-2 rounded-full bg-red-400" />
    </div>
  )
}
