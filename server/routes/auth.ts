import { Router } from 'express'
import { OAuth2Client } from 'google-auth-library'
import jwt from 'jsonwebtoken'

import { prisma } from '../lib/prisma.js'

const router = Router()

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || ''
const JWT_SECRET = process.env.JWT_SECRET || 'boss_level_secret_key_123'

const client = new OAuth2Client(GOOGLE_CLIENT_ID)

// POST /api/auth/google - Verify Google token and login/signup
router.post('/google', async (req, res) => {
  try {
    const { credential } = req.body

    if (!credential) {
      return res.status(400).json({ error: 'No credential provided' })
    }

    // Verify the Google ID token
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: GOOGLE_CLIENT_ID,
    })

    const payload = ticket.getPayload()
    if (!payload) {
      return res.status(400).json({ error: 'Invalid token payload' })
    }

    const { sub: googleId, email, name, picture } = payload

    if (!email) {
      return res.status(400).json({ error: 'Email not found in Google profile' })
    }

    // Find or create user
    let user = await prisma.user.findUnique({
      where: { email },
    })

    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          name: name || email.split('@')[0],
          avatar: picture,
          googleId,
          role: 'MEMBER',
        },
      })
    } else {
      // Update googleId and avatar if missing
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          googleId: user.googleId || googleId,
          avatar: picture || user.avatar,
          name: name || user.name,
        },
      })
    }

    // Generate JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    )

    return res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        role: user.role,
      },
    })
  } catch (error: any) {
    console.error('Google auth error:', error)
    return res.status(500).json({ error: error.message || 'Authentication failed' })
  }
})

// GET /api/auth/me - Get current user
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token' })
    }

    const token = authHeader.split(' ')[1]
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, name: true, avatar: true, role: true }
    })

    if (!user) {
      return res.status(401).json({ error: 'User not found' })
    }

    return res.json({ user })
  } catch {
    return res.status(401).json({ error: 'Invalid token' })
  }
})

export default router
