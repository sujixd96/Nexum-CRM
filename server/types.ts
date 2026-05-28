import type { Request } from 'express'

export interface User {
  id: number
  email: string
  name: string | null
  role: string
}

export interface AuthRequest extends Request {
  user?: User
}
