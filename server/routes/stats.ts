import { Router } from 'express'

import { authenticate } from '../middleware/auth.js'
import { prisma } from '../lib/prisma.js'

import type { AuthRequest } from '../types.js'

const router = Router()

// GET /api/stats - Get dashboard statistics
router.get('/', authenticate, async (_req: AuthRequest, res) => {
  try {
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    const [
      totalLeads,
      totalCalled,
      todayCalled,
      weekCalled,
      statusBreakdown,
      recentActivities,
      categoriesCount,
    ] = await Promise.all([
      prisma.lead.count(),
      prisma.lead.count({ where: { isCalled: true } }),
      prisma.activity.count({
        where: {
          action: 'CALLED',
          createdAt: { gte: todayStart },
        },
      }),
      prisma.lead.count({
        where: {
          isCalled: true,
          updatedAt: { gte: weekStart },
        },
      }),
      prisma.lead.groupBy({
        by: ['status'],
        _count: { status: true },
      }),
      prisma.activity.findMany({
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: {
          lead: { select: { businessName: true } },
          user: { select: { name: true } },
        },
      }),
      prisma.category.count(),
    ])

    const statusMap: Record<string, number> = {}
    statusBreakdown.forEach(s => {
      statusMap[s.status] = s._count.status
    })

    return res.json({
      overview: {
        totalLeads,
        totalCalled,
        totalRemaining: totalLeads - totalCalled,
        todayCalls: todayCalled,
        weeklyCalls: weekCalled,
        categoriesCount,
      },
      statusBreakdown: statusMap,
      recentActivity: recentActivities,
    })
  } catch (error: any) {
    console.error('Stats error:', error)
    return res.status(500).json({ error: error.message })
  }
})

// GET /api/stats/calls-by-day - Get daily call stats for chart
router.get('/calls-by-day', authenticate, async (_req: AuthRequest, res) => {
  try {
    const now = new Date()
    const days: { date: string; calls: number }[] = []

    for (let i = 6; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
      const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate())
      const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1)

      const count = await prisma.activity.count({
        where: {
          action: 'CALLED',
          createdAt: { gte: startOfDay, lt: endOfDay },
        },
      })

      days.push({
        date: date.toLocaleDateString('en-US', { weekday: 'short' }),
        calls: count,
      })
    }

    return res.json({ days })
  } catch (error: any) {
    console.error('Calls by day error:', error)
    return res.status(500).json({ error: error.message })
  }
})

export default router
