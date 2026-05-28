import { Router } from 'express'
import { authenticate, requireAdmin } from '../middleware/auth'
import { prisma } from '../lib/prisma'
import type { AuthRequest } from '../types'
import type { LeadStatus } from '@prisma/client'

const router = Router()

function toString(val: string | string[] | undefined): string | undefined {
  if (Array.isArray(val)) return val[0]
  return val
}

// GET /api/categories/:slug/leads - Get leads for a category with search, filter, sort
router.get('/categories/:slug/leads', authenticate, async (req: AuthRequest, res) => {
  try {
    const { slug } = req.params
    const {
      search,
      status,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page = '1',
      limit = '50',
    } = req.query

    const category = await prisma.category.findUnique({
      where: { slug: String(slug) },
    })

    if (!category) {
      return res.status(404).json({ error: 'Category not found' })
    }

    const pageNum = Math.max(1, parseInt(toString(page as string | string[]) || '1'))
    const limitNum = Math.min(200, Math.max(1, parseInt(toString(limit as string | string[]) || '50')))
    const skip = (pageNum - 1) * limitNum

    const where: any = { categoryId: category.id }

    const searchStr = toString(search as string | string[])
    if (searchStr) {
      where.OR = [
        { businessName: { contains: searchStr, mode: 'insensitive' } },
        { ownerName: { contains: searchStr, mode: 'insensitive' } },
        { phone: { contains: searchStr, mode: 'insensitive' } },
        { city: { contains: searchStr, mode: 'insensitive' } },
      ]
    }

    const statusStr = toString(status as string | string[])
    if (statusStr && statusStr !== 'ALL') {
      where.status = statusStr
    }

    const validSortFields = ['businessName', 'ownerName', 'city', 'status', 'createdAt', 'updatedAt']
    const sortField = validSortFields.includes(toString(sortBy as string | string[]) || '') ? toString(sortBy as string | string[]) : 'createdAt'

    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        orderBy: { [sortField || 'createdAt']: toString(sortOrder as string | string[]) === 'asc' ? 'asc' : 'desc' },
        skip,
        take: limitNum,
        include: {
          updater: {
            select: { name: true, email: true }
          }
        }
      }),
      prisma.lead.count({ where }),
    ])

    const statusCounts = await prisma.lead.groupBy({
      by: ['status'],
      where: { categoryId: category.id },
      _count: { status: true },
    })

    const statusCountMap: Record<string, number> = {}
    statusCounts.forEach(s => {
      statusCountMap[s.status] = s._count.status
    })

    return res.json({
      leads,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
      category: {
        id: category.id,
        name: category.name,
        slug: category.slug,
      },
      statusCounts: statusCountMap,
    })
  } catch (error: any) {
    console.error('Get leads error:', error)
    return res.status(500).json({ error: error.message })
  }
})

// GET /api/leads/:id - Get a single lead
router.get('/leads/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id)
    const lead = await prisma.lead.findUnique({
      where: { id },
      include: {
        category: { select: { name: true, slug: true } },
        updater: { select: { name: true } },
        activities: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          include: { user: { select: { name: true } } },
        },
      },
    })

    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' })
    }

    return res.json({ lead })
  } catch (error: any) {
    console.error('Get lead error:', error)
    return res.status(500).json({ error: error.message })
  }
})

// POST /api/categories/:slug/leads - Create a new lead (admin only)
router.post('/categories/:slug/leads', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { slug } = req.params
    const {
      businessName,
      ownerName,
      phone,
      city,
      googleProfileUrl,
      googleReviewCount,
      notes,
      status,
    } = req.body

    if (!businessName) {
      return res.status(400).json({ error: 'Business name is required' })
    }

    const category = await prisma.category.findUnique({
      where: { slug: String(slug) },
    })

    if (!category) {
      return res.status(404).json({ error: 'Category not found' })
    }

    // Check for duplicate phone
    if (phone) {
      const existing = await prisma.lead.findFirst({
        where: { phone: String(phone), categoryId: category.id },
      })
      if (existing) {
        return res.status(400).json({ error: 'Lead with this phone number already exists in this category' })
      }
    }

    const lead = await prisma.lead.create({
      data: {
        categoryId: category.id,
        businessName: String(businessName),
        ownerName: ownerName ? String(ownerName) : null,
        phone: phone ? String(phone) : null,
        city: city ? String(city) : null,
        googleProfileUrl: googleProfileUrl ? String(googleProfileUrl) : null,
        googleReviewCount: parseInt(String(googleReviewCount)) || 0,
        notes: notes ? String(notes) : null,
        status: (status as LeadStatus) || 'NOT_CONTACTED',
        isCalled: false,
        updatedBy: req.user!.id,
      },
    })

    await prisma.activity.create({
      data: {
        leadId: lead.id,
        userId: req.user!.id,
        action: 'CREATED',
        newValue: `Lead "${businessName}" created`,
      },
    })

    return res.json({ lead })
  } catch (error: any) {
    console.error('Create lead error:', error)
    return res.status(500).json({ error: error.message })
  }
})

// PATCH /api/leads/:id - Update a lead
router.patch('/leads/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id)
    const {
      businessName,
      ownerName,
      phone,
      city,
      googleProfileUrl,
      googleReviewCount,
      notes,
      status,
      isCalled,
    } = req.body

    const existingLead = await prisma.lead.findUnique({
      where: { id },
    })

    if (!existingLead) {
      return res.status(404).json({ error: 'Lead not found' })
    }

    const updateData: any = {}
    const activityLogs: any[] = []

    if (businessName !== undefined) updateData.businessName = String(businessName)
    if (ownerName !== undefined) updateData.ownerName = ownerName ? String(ownerName) : null
    if (phone !== undefined) updateData.phone = phone ? String(phone) : null
    if (city !== undefined) updateData.city = city ? String(city) : null
    if (googleProfileUrl !== undefined) updateData.googleProfileUrl = googleProfileUrl ? String(googleProfileUrl) : null
    if (googleReviewCount !== undefined) updateData.googleReviewCount = parseInt(String(googleReviewCount)) || 0
    if (notes !== undefined) {
      updateData.notes = notes ? String(notes) : null
      if (notes !== existingLead.notes) {
        activityLogs.push({
          leadId: id,
          userId: req.user!.id,
          action: 'NOTE_ADDED',
          oldValue: existingLead.notes,
          newValue: notes ? String(notes) : null,
        })
      }
    }
    if (status !== undefined && status !== existingLead.status) {
      updateData.status = status as LeadStatus
      activityLogs.push({
        leadId: id,
        userId: req.user!.id,
        action: 'STATUS_CHANGED',
        oldValue: existingLead.status,
        newValue: status,
      })
    }
    if (isCalled !== undefined && isCalled !== existingLead.isCalled) {
      updateData.isCalled = Boolean(isCalled)
      if (isCalled) {
        activityLogs.push({
          leadId: id,
          userId: req.user!.id,
          action: 'CALLED',
          newValue: 'Lead marked as called',
        })
      }
    }

    updateData.updatedBy = req.user!.id

    const lead = await prisma.lead.update({
      where: { id },
      data: updateData,
    })

    if (activityLogs.length > 0) {
      await prisma.activity.createMany({ data: activityLogs })
    }

    return res.json({ lead })
  } catch (error: any) {
    console.error('Update lead error:', error)
    return res.status(500).json({ error: error.message })
  }
})

// DELETE /api/leads/:id - Delete a lead (admin only)
router.delete('/leads/:id', authenticate, requireAdmin, async (_req: AuthRequest, res) => {
  try {
    const id = parseInt(_req.params.id)
    await prisma.lead.delete({ where: { id } })
    return res.json({ success: true })
  } catch (error: any) {
    console.error('Delete lead error:', error)
    return res.status(500).json({ error: error.message })
  }
})

// POST /api/leads/bulk-delete - Bulk delete leads (admin only)
router.post('/leads/bulk-delete', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { ids } = req.body
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'No IDs provided' })
    }

    const result = await prisma.lead.deleteMany({
      where: { id: { in: ids.map(Number) } },
    })

    return res.json({ deleted: result.count })
  } catch (error: any) {
    console.error('Bulk delete error:', error)
    return res.status(500).json({ error: error.message })
  }
})

// GET /api/leads/:id/activities - Get lead activities
router.get('/leads/:id/activities', authenticate, async (_req: AuthRequest, res) => {
  try {
    const id = parseInt(_req.params.id)
    const activities = await prisma.activity.findMany({
      where: { leadId: id },
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { name: true } } },
    })
    return res.json({ activities })
  } catch (error: any) {
    console.error('Get activities error:', error)
    return res.status(500).json({ error: error.message })
  }
})

export default router
