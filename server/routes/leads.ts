import { Router } from 'express'
import { authenticate, requireAdmin } from '../middleware/auth.js'
import { prisma } from '../lib/prisma.js'
import multer from 'multer'
import XLSX from 'xlsx'
import path from 'path'
import fs from 'fs'
import type { AuthRequest } from '../types.js'
import type { LeadStatus } from '@prisma/client'

const router = Router()

const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 50 * 1024 * 1024,
  },
  fileFilter: (_req: any, file: any, cb: any) => {
    const allowedExtensions = ['.xlsx', '.xls', '.csv', '.json']
    const ext = path.extname(file.originalname).toLowerCase()

    if (allowedExtensions.includes(ext)) {
      cb(null, true)
    } else {
      cb(new Error('Only .xlsx, .xls, .csv, and .json files are allowed'))
    }
  },
})

function toString(val: string | string[] | undefined): string | undefined {
  if (Array.isArray(val)) return val[0]
  return val
}

// System Smart Parser: Extract keys directly from raw user data array
const extractJsonArray = (filePath: string): any[] => {
  const raw = fs.readFileSync(filePath, 'utf8')
  let parsedData = JSON.parse(raw)

  if (!Array.isArray(parsedData) && typeof parsedData === 'object' && parsedData !== null) {
    const keyWithArray = Object.keys(parsedData).find(key => Array.isArray(parsedData[key]))
    if (keyWithArray) {
      parsedData = parsedData[keyWithArray]
    }
  }
  return parsedData
}

// Helper block to auto match field headers regardless of source format type (JSON/Excel)
const runAutoMapping = (headers: string[]) => {
  const detectedMapping: Record<string, string> = {}
  
  headers.forEach((header) => {
    const h = header.toLowerCase()

    if (
      h === 'title' ||
      h.includes('business') ||
      h.includes('company') ||
      h.includes('gym') ||
      h.includes('restaurant') ||
      h.includes('shop') ||
      h.includes('name')
    ) {
      if (!detectedMapping.businessName) detectedMapping.businessName = header
    }

    if (
      h.includes('owner') ||
      h.includes('contact person') ||
      h.includes('person')
    ) {
      detectedMapping.ownerName = header
    }

    if (
      h.includes('phone') ||
      h.includes('mobile') ||
      h.includes('contact') ||
      h.includes('number')
    ) {
      detectedMapping.phone = header
    }

    if (
      h.includes('city') ||
      h.includes('location') ||
      h.includes('place') ||
      h.includes('area')
    ) {
      detectedMapping.city = header
    }

    if (h.includes('review') || h.includes('rating') || h.includes('count')) {
      detectedMapping.googleReviewCount = header
    }

    if (
      h === 'url' ||
      h.includes('google') ||
      h.includes('profile') ||
      h.includes('link')
    ) {
      detectedMapping.googleProfileUrl = header
    }

    if (h.includes('note') || h.includes('remark') || h.includes('street')) {
      detectedMapping.notes = header
    }
  })

  return detectedMapping
}

// POST /api/leads/detect-columns
router.post(
  '/detect-columns',
  authenticate,
  requireAdmin,
  upload.single('file'),
  async (req: AuthRequest, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' })
      }

      const ext = path.extname(req.file.originalname).toLowerCase()
      let rows: any[] = []

      if (ext === '.json') {
        try {
          rows = extractJsonArray(req.file.path)
        } catch (jsonErr) {
          return res.status(400).json({ error: 'Invalid JSON file content syntax structure' })
        }

        if (!Array.isArray(rows) || rows.length === 0) {
          return res.status(400).json({
            error: 'Invalid JSON format. Dataset must be an array of objects.',
          })
        }

        // Dynamically get the keys from the uploaded JSON object (e.g., "title", "totalScore")
        const headers = Object.keys(rows[0] || {})
        const detectedMapping = runAutoMapping(headers)

        return res.json({
          success: true,
          headers,
          preview: rows.slice(0, 5),
          detectedMapping,
        })
      }

      // Excel/CSV Handling
      const workbook = XLSX.readFile(req.file.path)
      const worksheet = workbook.Sheets[workbook.SheetNames[0]]
      rows = XLSX.utils.sheet_to_json<any>(worksheet, { defval: '' })

      if (!rows || rows.length === 0) {
        return res.status(400).json({ error: 'No data found in file' })
      }

      const headers = Object.keys(rows[0] || {})
      const detectedMapping = runAutoMapping(headers)

      return res.json({
        success: true,
        headers,
        preview: rows.slice(0, 5),
        detectedMapping,
      })
    } catch (error: any) {
      console.error('Detect Columns Error:', error)
      return res.status(500).json({ error: error.message || 'Failed to detect columns' })
    } finally {
      if (req.file && fs.existsSync(req.file.path)) {
        try { fs.unlinkSync(req.file.path) } catch {}
      }
    }
  }
)

// POST /api/leads/import/:categorySlug
router.post(
  '/import/:categorySlug',
  authenticate,
  requireAdmin,
  upload.single('file'),
  async (req: AuthRequest, res) => {
    let filePathToClean = req.file?.path || null
    try {
      const { categorySlug } = req.params
      const mapping = JSON.parse(req.body.mapping || '{}')

      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' })
      }

      const category = await prisma.category.findUnique({
        where: { slug: String(categorySlug) },
      })

      if (!category) {
        return res.status(404).json({ error: 'Category not found' })
      }

      const ext = path.extname(req.file.originalname).toLowerCase()
      let rows: any[] = []

      if (ext === '.json') {
        try {
          rows = extractJsonArray(req.file.path)
        } catch (jsonErr) {
          return res.status(400).json({ error: 'Invalid JSON dataset file structure syntax' })
        }
        
        if (!Array.isArray(rows) || rows.length === 0) {
          return res.status(400).json({ error: 'Invalid JSON format or empty array dataset target' })
        }
      } else {
        const workbook = XLSX.readFile(req.file.path)
        const worksheet = workbook.Sheets[workbook.SheetNames[0]]
        rows = XLSX.utils.sheet_to_json<any>(worksheet, { defval: '' })
      }

      let created = 0
      let duplicates = 0
      let errors = 0

      for (const row of rows) {
        try {
          const businessName = row[mapping.businessName]

          if (!businessName) {
            errors++
            continue
          }

          const phone = mapping.phone
            ? String(row[mapping.phone] || '').trim()
            : null

          const existing = await prisma.lead.findFirst({
            where: {
              OR: [
                phone ? { phone } : undefined,
                { businessName: String(businessName) },
              ].filter(Boolean) as any,
            },
          })

          if (existing) {
            duplicates++
            continue
          }

          await prisma.lead.create({
            data: {
              categoryId: category.id,
              businessName: String(businessName),
              ownerName: mapping.ownerName ? String(row[mapping.ownerName] || '') : null,
              phone,
              city: mapping.city ? String(row[mapping.city] || '') : null,
              googleProfileUrl: mapping.googleProfileUrl ? String(row[mapping.googleProfileUrl] || '') : null,
              googleReviewCount: mapping.googleReviewCount ? Number(row[mapping.googleReviewCount] || 0) : 0,
              notes: mapping.notes ? String(row[mapping.notes] || '') : null,
              status: 'NOT_CONTACTED',
              isCalled: false,
              updatedBy: req.user!.id,
            },
          })

          created++
        } catch (err) {
          console.error('Error tracking single lead database insert:', err)
          errors++
        }
      }

      return res.json({
        success: true,
        summary: {
          total: rows.length,
          created,
          duplicates,
          errors,
        },
      })
    } catch (error: any) {
      console.error('Upload Error:', error)
      return res.status(500).json({ error: error.message || 'Upload failed' })
    } finally {
      if (filePathToClean && fs.existsSync(filePathToClean)) {
        try { fs.unlinkSync(filePathToClean) } catch {}
      }
    }
  }
)

// GET /api/categories/:slug/leads
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
          updater: { select: { name: true, email: true } }
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

// GET /api/leads/:id
router.get('/leads/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const id = parseInt(String(req.params.id))
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

// POST /api/categories/:slug/leads
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

// PATCH /api/leads/:id
router.patch('/leads/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const id = parseInt(String(req.params.id))
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

    const existingLead = await prisma.lead.findUnique({ where: { id } })

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

// DELETE /api/leads/:id
router.delete('/leads/:id', authenticate, requireAdmin, async (_req: AuthRequest, res) => {
  try {
    const id = parseInt(String(_req.params.id))
    await prisma.lead.delete({ where: { id } })
    return res.json({ success: true })
  } catch (error: any) {
    console.error('Delete lead error:', error)
    return res.status(500).json({ error: error.message })
  }
})

// POST /api/leads/bulk-delete
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

// GET /api/leads/:id/activities
router.get('/leads/:id/activities', authenticate, async (_req: AuthRequest, res) => {
  try {
    const id = parseInt(String(_req.params.id))
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