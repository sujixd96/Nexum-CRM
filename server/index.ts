import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import path from 'path'

import authRoutes from './routes/auth.js'
import categoryRoutes from './routes/categories.js'
import leadRoutes from './routes/leads.js'
import uploadRoutes from './routes/upload.js'
import statsRoutes from './routes/stats.js'
dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

// Middleware
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Serve uploads statically
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')))

// API Routes
app.use('/api/auth', authRoutes)
app.use('/api/categories', categoryRoutes)
app.use('/api', leadRoutes)
app.use('/api/upload', uploadRoutes)
app.use('/api/stats', statsRoutes)

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Server error:', err)
  res.status(500).json({ error: err.message || 'Internal server error' })
})

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
