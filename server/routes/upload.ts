import { Router } from 'express'
import { authenticate, requireAdmin } from '../middleware/auth.js'
import { prisma } from '../lib/prisma.js'
import multer from 'multer'
import XLSX from 'xlsx'
import path from 'path'
import fs from 'fs'
import type { AuthRequest } from '../types.js'

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

// 1. DETECT COLUMNS ROUTE
router.post(
  '/detect-columns',
  authenticate,
  requireAdmin,
  upload.single('file'),
  async (req: AuthRequest, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          error: 'No file uploaded',
        })
      }

      const ext = path.extname(req.file.originalname).toLowerCase()
      let rows: any[] = []

      if (ext === '.json') {
        const raw = fs.readFileSync(req.file.path, 'utf8')
        rows = JSON.parse(raw)

        if (!Array.isArray(rows) || rows.length === 0) {
          return res.status(400).json({
            error: 'Invalid JSON format',
          })
        }

        const headers = Object.keys(rows[0])

        return res.json({
          success: true,
          headers,
          preview: rows.slice(0, 5),
          detectedMapping: {
            businessName: 'businessName',
            ownerName: 'ownerName',
            phone: 'phone',
            city: 'city',
            googleProfileUrl: 'googleProfileUrl',
            googleReviewCount: 'googleReviewCount',
            notes: 'notes',
          },
        })
      }

      // Excel/CSV Handling
      const workbook = XLSX.readFile(req.file.path)
      const worksheet = workbook.Sheets[workbook.SheetNames[0]]
      rows = XLSX.utils.sheet_to_json<any>(worksheet, { defval: '' })

      if (!rows || rows.length === 0) {
        return res.status(400).json({
          error: 'No data found in file',
        })
      }

      const headers = Object.keys(rows[0] || {})
      const detectedMapping: Record<string, string> = {}

      headers.forEach((header) => {
        const h = header.toLowerCase()

        if (
          h.includes('business') ||
          h.includes('company') ||
          h.includes('gym') ||
          h.includes('restaurant') ||
          h.includes('shop') ||
          h.includes('name')
        ) {
          detectedMapping.businessName = header
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

        if (h.includes('review') || h.includes('rating')) {
          detectedMapping.googleReviewCount = header
        }

        if (
          h.includes('google') ||
          h.includes('profile') ||
          h.includes('url') ||
          h.includes('link')
        ) {
          detectedMapping.googleProfileUrl = header
        }

        if (h.includes('note') || h.includes('remark')) {
          detectedMapping.notes = header
        }
      })

      return res.json({
        success: true,
        headers,
        preview: rows.slice(0, 5),
        detectedMapping,
      })
    } catch (error: any) {
      console.error('Detect Columns Error:', error)
      return res.status(500).json({
        error: error.message || 'Failed to detect columns',
      })
    }
  }
)

// 2. MAIN UPLOAD AND SAVE ROUTE
router.post(
  '/:categorySlug',
  authenticate,
  requireAdmin,
  upload.single('file'),
  async (req: AuthRequest, res) => {
    try {
      const { categorySlug } = req.params
      const mapping = JSON.parse(req.body.mapping || '{}')

      if (!req.file) {
        return res.status(400).json({
          error: 'No file uploaded',
        })
      }

      const category = await prisma.category.findUnique({
        where: {
          slug: String(categorySlug),
        },
      })

      if (!category) {
        return res.status(404).json({
          error: 'Category not found',
        })
      }

      const ext = path.extname(req.file.originalname).toLowerCase()
      let rows: any[] = []

      // Handle JSON logic during parsing and importing
      if (ext === '.json') {
        const raw = fs.readFileSync(req.file.path, 'utf8')
        rows = JSON.parse(raw)
        
        if (!Array.isArray(rows) || rows.length === 0) {
          return res.status(400).json({
            error: 'Invalid JSON format or empty array',
          })
        }
      } else {
        // Handle Excel / CSV parsing
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
                {
                  businessName: String(businessName),
                },
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
              ownerName: mapping.ownerName
                ? String(row[mapping.ownerName] || '')
                : null,
              phone,
              city: mapping.city 
                ? String(row[mapping.city] || '') 
                : null,
              googleProfileUrl: mapping.googleProfileUrl
                ? String(row[mapping.googleProfileUrl] || '')
                : null,
              googleReviewCount: mapping.googleReviewCount
                ? Number(row[mapping.googleReviewCount] || 0)
                : 0,
              notes: mapping.notes 
                ? String(row[mapping.notes] || '') 
                : null,
              status: 'NOT_CONTACTED',
              isCalled: false,
              updatedBy: req.user!.id,
            },
          })

          created++
        } catch (err) {
          console.error('Error tracking individual lead:', err)
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
      return res.status(500).json({
        error: error.message || 'Upload failed',
      })
    }
  }
)

export default router