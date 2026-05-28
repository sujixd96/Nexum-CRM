import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { api } from '@/lib/api'
import { useAuth } from '@/hooks/useAuth'
import type { Category, DashboardStats } from '@/types'
import {
  Phone,
  Users,
  CheckCircle,
  Clock,
  TrendingUp,
  Activity,
  ArrowRight,
  Dumbbell,
  Stethoscope,
  UtensilsCrossed,
  BookOpen,
  GraduationCap,
  FolderOpen,
} from 'lucide-react'

const categoryIcons: Record<string, React.ReactNode> = {
  gyms: <Dumbbell className="w-5 h-5" />,
  doctors: <Stethoscope className="w-5 h-5" />,
  restaurants: <UtensilsCrossed className="w-5 h-5" />,
  libraries: <BookOpen className="w-5 h-5" />,
  'coaching-centres': <GraduationCap className="w-5 h-5" />,
}

const statusColors: Record<string, string> = {
  NOT_CONTACTED: 'bg-gray-500/10 text-gray-400',
  CALLED: 'bg-blue-500/10 text-blue-400',
  INTERESTED: 'bg-blue-500/10 text-blue-400',
  FOLLOW_UP: 'bg-yellow-500/10 text-yellow-400',
  CONVERTED: 'bg-emerald-500/10 text-emerald-400',
  REJECTED: 'bg-red-500/10 text-red-400',
}

export default function Dashboard() {
  const { isAdmin } = useAuth()
  const [categories, setCategories] = useState<Category[]>([])
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [catRes, statsRes] = await Promise.all([
        api.getCategories(),
        api.getStats(),
      ])
      setCategories(catRes.categories)
      setStats(statsRes)
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const totalProgress = stats
    ? stats.overview.totalLeads > 0
      ? Math.round((stats.overview.totalCalled / stats.overview.totalLeads) * 100)
      : 0
    : 0

  if (loading) {
    return (
      <div className="p-4 md:p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-[#171717] rounded-lg w-48" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-36 bg-[#171717] rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-1">Dashboard</h1>
        <p className="text-sm text-[#737373]">Overview of your outreach campaigns</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <div className="bg-[#171717] rounded-xl border border-[#262626] p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-[#F59E0B]" />
            <span className="text-xs text-[#737373] uppercase tracking-wider">Total Leads</span>
          </div>
          <p className="text-2xl font-bold text-white">{stats?.overview.totalLeads || 0}</p>
        </div>
        <div className="bg-[#171717] rounded-xl border border-[#262626] p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <span className="text-xs text-[#737373] uppercase tracking-wider">Called</span>
          </div>
          <p className="text-2xl font-bold text-white">{stats?.overview.totalCalled || 0}</p>
        </div>
        <div className="bg-[#171717] rounded-xl border border-[#262626] p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-yellow-400" />
            <span className="text-xs text-[#737373] uppercase tracking-wider">Remaining</span>
          </div>
          <p className="text-2xl font-bold text-white">{stats?.overview.totalRemaining || 0}</p>
        </div>
        <div className="bg-[#171717] rounded-xl border border-[#262626] p-4">
          <div className="flex items-center gap-2 mb-2">
            <Phone className="w-4 h-4 text-blue-400" />
            <span className="text-xs text-[#737373] uppercase tracking-wider">Today's Calls</span>
          </div>
          <p className="text-2xl font-bold text-white">{stats?.overview.todayCalls || 0}</p>
        </div>
      </div>

      {/* Overall Progress */}
      <div className="bg-[#171717] rounded-xl border border-[#262626] p-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#F59E0B]" />
            <span className="text-sm font-medium text-white">Overall Progress</span>
          </div>
          <span className="text-sm font-bold text-[#F59E0B]">{totalProgress}%</span>
        </div>
        <div className="h-2 bg-[#262626] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#F59E0B] rounded-full transition-all duration-500"
            style={{ width: `${totalProgress}%` }}
          />
        </div>
      </div>

      {/* Category Cards */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-[#F59E0B]" />
            Categories
          </h2>
          {isAdmin && (
            <Link
              to="/categories"
              className="text-xs text-[#F59E0B] hover:underline flex items-center gap-1"
            >
              Manage <ArrowRight className="w-3 h-3" />
            </Link>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((cat, index) => {
            const progress = cat.totalLeads > 0
              ? Math.round((cat.calledLeads / cat.totalLeads) * 100)
              : 0
            return (
              <Link
                key={cat.id}
                to={`/category/${cat.slug}`}
                className="group bg-[#171717] rounded-xl border border-[#262626] hover:border-[#F59E0B]/50 p-5 transition-all duration-200 hover:shadow-lg hover:shadow-[#F59E0B]/5"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[#F59E0B]/10 flex items-center justify-center text-[#F59E0B]">
                      {categoryIcons[cat.slug] || <FolderOpen className="w-5 h-5" />}
                    </div>
                    <div>
                      <h3 className="font-semibold text-white group-hover:text-[#F59E0B] transition-colors">
                        {cat.name}
                      </h3>
                      <p className="text-xs text-[#737373]">{cat.totalLeads} leads</p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-[#737373] group-hover:text-[#F59E0B] transition-colors" />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#737373]">{cat.calledLeads} called</span>
                    <span className="text-[#737373]">{cat.remainingLeads} remaining</span>
                  </div>
                  <div className="h-1.5 bg-[#262626] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#F59E0B] rounded-full transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className="flex items-center gap-3 text-[10px]">
                    {cat.interestedCount > 0 && (
                      <span className="text-blue-400">{cat.interestedCount} interested</span>
                    )}
                    {cat.convertedCount > 0 && (
                      <span className="text-emerald-400">{cat.convertedCount} converted</span>
                    )}
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      </div>

      {/* Status Breakdown & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Status Breakdown */}
        <div className="bg-[#171717] rounded-xl border border-[#262626] p-4">
          <h3 className="text-sm font-semibold text-white mb-4">Status Breakdown</h3>
          <div className="space-y-2">
            {stats?.statusBreakdown && Object.entries(stats.statusBreakdown).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between">
                <span className={`text-xs px-2 py-1 rounded-md ${statusColors[status]}`}>
                  {status.replace(/_/g, ' ')}
                </span>
                <span className="text-sm text-white font-medium">{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="lg:col-span-2 bg-[#171717] rounded-xl border border-[#262626] p-4">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-4 h-4 text-[#F59E0B]" />
            <h3 className="text-sm font-semibold text-white">Recent Activity</h3>
          </div>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {stats?.recentActivity?.length === 0 && (
              <p className="text-sm text-[#737373] text-center py-4">No recent activity</p>
            )}
            {stats?.recentActivity?.map(activity => (
              <div key={activity.id} className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-[#262626] flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Activity className="w-4 h-4 text-[#737373]" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-white truncate">
                    {activity.lead.businessName}
                  </p>
                  <p className="text-xs text-[#737373]">
                    {activity.action === 'STATUS_CHANGED' && `Status changed to ${activity.newValue}`}
                    {activity.action === 'CALLED' && 'Marked as called'}
                    {activity.action === 'CREATED' && 'Lead created'}
                    {activity.action === 'NOTE_ADDED' && 'Note added'}
                  </p>
                </div>
                <span className="text-[10px] text-[#737373] flex-shrink-0">
                  {new Date(activity.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
