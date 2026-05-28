import { Router } from 'express'
import { authenticate, requireAdmin } from '../middleware/auth'
import { prisma } from '../lib/prisma'
import type { AuthRequest } from '../types'

const router = Router()

// GET /api/categories - Get all categories with stats
router.get('/', authenticate, async (_req: AuthRequest, res) => {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { createdAt: 'asc' },
      include: {
        _count: {
          select: { leads: true }
        },
        leads: {
          select: {
            isCalled: true,
            status: true,
          }
        }
      }
    })

    const categoriesWithStats = categories.map(cat => ({
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      description: cat.description,
      totalLeads: cat._count.leads,
      calledLeads: cat.leads.filter(l => l.isCalled).length,
      remainingLeads: cat.leads.filter(l => !l.isCalled).length,
      interestedCount: cat.leads.filter(l => l.status === 'INTERESTED').length,
      convertedCount: cat.leads.filter(l => l.status === 'CONVERTED').length,
    }))

    return res.json({ categories: categoriesWithStats })
  } catch (error: any) {
    console.error('Get categories error:', error)
    return res.status(500).json({ error: error.message })
  }
})

// POST /api/categories - Create a new category (admin only)
router.post('/', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { name, slug, description } = req.body

    if (!name || !slug) {
      return res.status(400).json({ error: 'Name and slug are required' })
    }

    const normalizedSlug = String(slug).toLowerCase().replace(/[^a-z0-9-]/g, '-')

    const category = await prisma.category.create({
      data: {
        name: String(name),
        slug: normalizedSlug,
        description: description ? String(description) : null,
        createdBy: req.user!.id,
      },
    })

    return res.json({ category })
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Category with this name or slug already exists' })
    }
    console.error('Create category error:', error)
    return res.status(500).json({ error: error.message })
  }
})

// DELETE /api/categories/:id - Delete a category (admin only)
router.delete('/:id', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id)
    await prisma.category.delete({
      where: { id },
    })
    return res.json({ success: true })
  } catch (error: any) {
    console.error('Delete category error:', error)
    return res.status(500).json({ error: error.message })
  }
})

export default router
