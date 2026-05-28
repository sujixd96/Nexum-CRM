import { useState } from 'react'
import { Link, useLocation } from 'react-router'
import { useAuth } from '@/hooks/useAuth'
import { useTheme } from '@/hooks/useTheme'
import {
  LayoutDashboard,
  Phone,
  FolderOpen,
  Settings,
  LogOut,
  Sun,
  Moon,
  Menu,
  X,
  Shield,
} from 'lucide-react'

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/' },
  { label: 'Categories', icon: FolderOpen, path: '/categories' },
  { label: 'Settings', icon: Settings, path: '/settings' },
]

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user, logout, isAdmin } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex fixed left-0 top-0 h-full w-60 bg-[#0A0A0A] border-r border-[#262626] flex-col z-30">
        <div className="p-4 flex items-center gap-3 border-b border-[#262626]">
          <div className="w-9 h-9 rounded-lg bg-[#F59E0B] flex items-center justify-center">
            <Phone className="w-5 h-5 text-black" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white leading-tight">Nexus</h1>
            <p className="text-[10px] text-[#737373] uppercase tracking-wider">Outbound CRM</p>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {navItems.map(item => {
            const isActive = location.pathname === item.path
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 ${
                  isActive
                    ? 'bg-[#F59E0B]/10 text-[#F59E0B] font-medium'
                    : 'text-[#737373] hover:text-white hover:bg-[#171717]'
                }`}
              >
                <item.icon className="w-[18px] h-[18px]" />
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="p-3 border-t border-[#262626] space-y-1">
          <button
            onClick={toggleTheme}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[#737373] hover:text-white hover:bg-[#171717] transition-colors w-full"
          >
            {theme === 'dark' ? <Sun className="w-[18px] h-[18px]" /> : <Moon className="w-[18px] h-[18px]" />}
            {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
          </button>

          {user && (
            <div className="flex items-center gap-3 px-3 py-2.5">
              <img
                src={user.avatar || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.name || 'User')}
                alt=""
                className="w-8 h-8 rounded-full"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white truncate">{user.name || 'User'}</p>
                <p className="text-[10px] text-[#737373] truncate">{user.email}</p>
              </div>
              <button
                onClick={logout}
                className="text-[#737373] hover:text-red-400 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="md:hidden fixed top-0 left-0 right-0 h-14 bg-[#0A0A0A]/80 backdrop-blur-md border-b border-[#262626] flex items-center justify-between px-4 z-40">
        <button
          onClick={() => setSidebarOpen(true)}
          className="text-[#737373] hover:text-white"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#F59E0B] flex items-center justify-center">
            <Phone className="w-4 h-4 text-black" />
          </div>
          <span className="font-bold text-sm">Nexus</span>
        </div>
        <button onClick={toggleTheme} className="text-[#737373] hover:text-white">
          {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
      </header>

      {/* Mobile Sidebar Drawer */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/60" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-64 bg-[#0A0A0A] border-r border-[#262626] flex flex-col">
            <div className="p-4 flex items-center justify-between border-b border-[#262626]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#F59E0B] flex items-center justify-center">
                  <Phone className="w-4 h-4 text-black" />
                </div>
                <span className="font-bold">Nexus</span>
              </div>
              <button onClick={() => setSidebarOpen(false)} className="text-[#737373]">
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 p-3 space-y-1">
              {navItems.map(item => {
                const isActive = location.pathname === item.path
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 px-3 py-3 rounded-lg text-sm transition-colors ${
                      isActive
                        ? 'bg-[#F59E0B]/10 text-[#F59E0B] font-medium'
                        : 'text-[#737373] hover:text-white hover:bg-[#171717]'
                    }`}
                  >
                    <item.icon className="w-[18px] h-[18px]" />
                    {item.label}
                  </Link>
                )
              })}
            </nav>
            <div className="p-3 border-t border-[#262626]">
              {user && (
                <div className="flex items-center gap-3 px-3 py-2">
                  <img
                    src={user.avatar || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.name || 'User')}
                    alt=""
                    className="w-8 h-8 rounded-full"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{user.name || 'User'}</p>
                    <div className="flex items-center gap-1">
                      {isAdmin && <Shield className="w-3 h-3 text-[#F59E0B]" />}
                      <p className="text-[10px] text-[#737373] truncate">{user.email}</p>
                    </div>
                  </div>
                  <button onClick={logout} className="text-[#737373] hover:text-red-400">
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </aside>
        </div>
      )}

      {/* Main Content */}
      <main className="md:pl-60 pt-14 md:pt-0 min-h-screen">
        {children}
      </main>
    </div>
  )
}
