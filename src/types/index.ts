export interface User {
  id: number
  email: string
  name: string | null
  avatar: string | null
  role: 'ADMIN' | 'MEMBER'
}

export interface Category {
  id: number
  name: string
  slug: string
  description: string | null
  totalLeads: number
  calledLeads: number
  remainingLeads: number
  interestedCount: number
  convertedCount: number
}

export type LeadStatus = 'NOT_CONTACTED' | 'CALLED' | 'INTERESTED' | 'FOLLOW_UP' | 'CONVERTED' | 'REJECTED'

export interface Lead {
  id: number
  categoryId: number
  businessName: string
  ownerName: string | null
  phone: string | null
  city: string | null
  googleProfileUrl: string | null
  googleReviewCount: number
  status: LeadStatus
  notes: string | null
  isCalled: boolean
  createdAt: string
  updatedAt: string
  updater: { name: string | null; email: string } | null
}

export interface Activity {
  id: number
  leadId: number
  lead: { businessName: string }
  user: { name: string | null }
  action: string
  oldValue: string | null
  newValue: string | null
  createdAt: string
}

export interface StatsOverview {
  totalLeads: number
  totalCalled: number
  totalRemaining: number
  todayCalls: number
  weeklyCalls: number
  categoriesCount: number
}

export interface DashboardStats {
  overview: StatsOverview
  statusBreakdown: Record<string, number>
  recentActivity: Activity[]
}
