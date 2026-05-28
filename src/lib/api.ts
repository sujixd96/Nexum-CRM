const API_BASE = 'https://nexum-crm-production.up.railway.app/api'

async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const token = localStorage.getItem('token')

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers,
  })

  if (response.status === 401) {
    localStorage.removeItem('token')
    window.location.href = '/login'
    throw new Error('Unauthorized')
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({
      error: 'Request failed',
    }))

    throw new Error(
      error.error || `Request failed with status ${response.status}`
    )
  }

  return response.json()
}
export const api = {
  // Auth
  loginWithGoogle: (credential: string) =>
    fetch(`${API_BASE}/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential }),
    }).then(r => r.json()),

  getMe: () => fetchWithAuth('/auth/me'),

  // Categories
  getCategories: () => fetchWithAuth('/categories'),
  createCategory: (data: { name: string; slug: string; description?: string }) =>
    fetchWithAuth('/categories', { method: 'POST', body: JSON.stringify(data) }),
  deleteCategory: (id: number) =>
    fetchWithAuth(`/categories/${id}`, { method: 'DELETE' }),

  // Leads
  getLeads: (slug: string, params?: {
    search?: string
    status?: string
    sortBy?: string
    sortOrder?: string
    page?: number
    limit?: number
  }) => {
    const query = new URLSearchParams()
    if (params?.search) query.set('search', params.search)
    if (params?.status && params.status !== 'ALL') query.set('status', params.status)
    if (params?.sortBy) query.set('sortBy', params.sortBy)
    if (params?.sortOrder) query.set('sortOrder', params.sortOrder)
    if (params?.page) query.set('page', String(params.page))
    if (params?.limit) query.set('limit', String(params.limit))
    return fetchWithAuth(`/categories/${slug}/leads?${query}`)
  },

  getLead: (id: number) => fetchWithAuth(`/leads/${id}`),

  createLead: (slug: string, data: Partial<Lead>) =>
    fetchWithAuth(`/categories/${slug}/leads`, { method: 'POST', body: JSON.stringify(data) }),

  updateLead: (id: number, data: Partial<Lead>) =>
    fetchWithAuth(`/leads/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  deleteLead: (id: number) =>
    fetchWithAuth(`/leads/${id}`, { method: 'DELETE' }),

  bulkDeleteLeads: (ids: number[]) =>
    fetchWithAuth('/leads/bulk-delete', { method: 'POST', body: JSON.stringify({ ids }) }),

  getLeadActivities: (id: number) => fetchWithAuth(`/leads/${id}/activities`),

  // Upload
  uploadExcel: (categorySlug: string, file: File, mapping?: Record<string, string>) => {
    const formData = new FormData()
    formData.append('file', file)
    if (mapping) formData.append('mapping', JSON.stringify(mapping))

    return fetch(`${API_BASE}/upload/${categorySlug}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
      },
      body: formData,
    }).then(r => r.json())
  },

  detectColumns: (file: File) => {
    const formData = new FormData()
    formData.append('file', file)

    return fetch(`${API_BASE}/upload/detect-columns`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
      },
      body: formData,
    }).then(r => r.json())
  },

  // Stats
  getStats: () => fetchWithAuth('/stats'),
  getCallsByDay: () => fetchWithAuth('/stats/calls-by-day'),
}

import type { Lead } from '@/types'
