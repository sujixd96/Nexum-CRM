import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router'
import { api } from '@/lib/api'
import { useAuth } from '@/hooks/useAuth'
import type { Lead, LeadStatus } from '@/types'
import ExcelUploadModal from '@/components/ExcelUploadModal'
import LeadDetailModal from '@/components/LeadDetailModal'
import {
  Search,
  Phone,
  ExternalLink,
  Filter,
  Upload,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  MoreHorizontal,
  Trash2,
  CheckSquare,
  Square,
  MessageCircle,
} from 'lucide-react'

const statusConfig: Record<LeadStatus, { label: string; color: string }> = {
  NOT_CONTACTED: { label: 'Not Contacted', color: 'bg-gray-500/10 text-gray-400 border-gray-500/20' },
  CALLED: { label: 'Called', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  INTERESTED: { label: 'Interested', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  FOLLOW_UP: { label: 'Follow Up', color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' },
  CONVERTED: { label: 'Converted', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  REJECTED: { label: 'Rejected', color: 'bg-red-500/10 text-red-400 border-red-500/20' },
}

const statusOrder: LeadStatus[] = ['NOT_CONTACTED', 'CALLED', 'INTERESTED', 'FOLLOW_UP', 'CONVERTED', 'REJECTED']

export default function CategoryLeads() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const { isAdmin } = useAuth()

  const [leads, setLeads] = useState<Lead[]>([])
  const [categoryName, setCategoryName] = useState('')
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [sortBy, setSortBy] = useState('createdAt')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [page, setPage] = useState(1)
  const [limit] = useState(50)

  const [selectedLeads, setSelectedLeads] = useState<Set<number>>(new Set())
  const [showUpload, setShowUpload] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [detailLead, setDetailLead] = useState<Lead | null>(null)
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({})

  const fetchLeads = useCallback(async () => {
    if (!slug) return
    setLoading(true)
    try {
      const res = await api.getLeads(slug, {
        search: search || undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        sortBy,
        sortOrder,
        page,
        limit,
      })
      setLeads(res.leads)
      setCategoryName(res.category.name)
      setTotal(res.total)
      setTotalPages(res.totalPages)
      setStatusCounts(res.statusCounts)
    } catch (error) {
      console.error('Failed to fetch leads:', error)
    } finally {
      setLoading(false)
    }
  }, [slug, search, statusFilter, sortBy, sortOrder, page, limit])

  useEffect(() => {
    fetchLeads()
  }, [fetchLeads])

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortOrder('asc')
    }
    setPage(1)
  }

  const handleStatusChange = async (leadId: number, newStatus: LeadStatus) => {
    try {
      await api.updateLead(leadId, { status: newStatus })
      setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: newStatus } : l))
      if (detailLead?.id === leadId) {
        setDetailLead(prev => prev ? { ...prev, status: newStatus } : null)
      }
    } catch (error) {
      console.error('Failed to update status:', error)
    }
  }

  const handleToggleCalled = async (lead: Lead) => {
    try {
      await api.updateLead(lead.id, { isCalled: !lead.isCalled })
      setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, isCalled: !l.isCalled } : l))
    } catch (error) {
      console.error('Failed to update called status:', error)
    }
  }

  const handleBulkDelete = async () => {
    if (!isAdmin || selectedLeads.size === 0) return
    if (!confirm(`Delete ${selectedLeads.size} leads?`)) return
    try {
      await api.bulkDeleteLeads(Array.from(selectedLeads))
      setSelectedLeads(new Set())
      fetchLeads()
    } catch (error) {
      console.error('Failed to delete leads:', error)
    }
  }

  const toggleSelectAll = () => {
    if (selectedLeads.size === leads.length) {
      setSelectedLeads(new Set())
    } else {
      setSelectedLeads(new Set(leads.map(l => l.id)))
    }
  }

  const toggleSelect = (id: number) => {
    setSelectedLeads(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const openWhatsApp = (phone: string | null) => {
    if (!phone) return
    const cleaned = phone.replace(/\D/g, '')
    window.open(`https://wa.me/${cleaned}`, '_blank')
  }

  const cycleStatus = (leadId: number, currentStatus: LeadStatus) => {
    const currentIndex = statusOrder.indexOf(currentStatus)
    const nextIndex = (currentIndex + 1) % statusOrder.length
    handleStatusChange(leadId, statusOrder[nextIndex])
  }

  return (
    <div className="p-4 md:p-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="w-8 h-8 rounded-lg bg-[#171717] border border-[#262626] flex items-center justify-center text-[#737373] hover:text-white hover:border-[#F59E0B]/50 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-white">{categoryName}</h1>
            <p className="text-xs text-[#737373]">{total} leads total</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isAdmin && (
            <>
              {selectedLeads.size > 0 && (
                <button
                  onClick={handleBulkDelete}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-500/10 text-red-400 text-sm hover:bg-red-500/20 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Delete ({selectedLeads.size})</span>
                </button>
              )}
              <button
                onClick={() => setShowUpload(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#F59E0B] text-black text-sm font-medium hover:bg-[#F59E0B]/90 transition-colors"
              >
                <Upload className="w-4 h-4" />
                <span className="hidden sm:inline">Upload Excel</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#737373]" />
          <input
            type="text"
            placeholder="Search by business, owner, phone, city..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            className="w-full pl-10 pr-4 py-2.5 bg-[#171717] border border-[#262626] rounded-lg text-sm text-white placeholder-[#737373] focus:outline-none focus:border-[#F59E0B]/50 transition-colors"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-1.5 px-3 py-2.5 rounded-lg border text-sm transition-colors ${
            showFilters || statusFilter !== 'ALL'
              ? 'bg-[#F59E0B]/10 border-[#F59E0B]/50 text-[#F59E0B]'
              : 'bg-[#171717] border-[#262626] text-[#737373] hover:text-white'
          }`}
        >
          <Filter className="w-4 h-4" />
          Filters
        </button>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="bg-[#171717] border border-[#262626] rounded-lg p-3 mb-4 flex flex-wrap gap-2">
          <button
            onClick={() => { setStatusFilter('ALL'); setPage(1) }}
            className={`px-3 py-1.5 rounded-md text-xs transition-colors ${
              statusFilter === 'ALL' ? 'bg-[#F59E0B] text-black' : 'bg-[#262626] text-[#737373] hover:text-white'
            }`}
          >
            All ({total})
          </button>
          {Object.entries(statusCounts).map(([status, count]) => (
            <button
              key={status}
              onClick={() => { setStatusFilter(status); setPage(1) }}
              className={`px-3 py-1.5 rounded-md text-xs transition-colors ${
                statusFilter === status ? 'bg-[#F59E0B] text-black' : 'bg-[#262626] text-[#737373] hover:text-white'
              }`}
            >
              {status.replace(/_/g, ' ')} ({count})
            </button>
          ))}
        </div>
      )}

      {/* Mobile Lead Cards */}
      <div className="md:hidden space-y-3 mb-4">
        {loading ? (
          [...Array(5)].map((_, i) => (
            <div key={i} className="bg-[#171717] rounded-xl border border-[#262626] p-4 animate-pulse">
              <div className="h-5 bg-[#262626] rounded w-1/2 mb-2" />
              <div className="h-4 bg-[#262626] rounded w-1/3" />
            </div>
          ))
        ) : leads.length === 0 ? (
          <div className="text-center py-12 bg-[#171717] rounded-xl border border-[#262626]">
            <p className="text-[#737373] text-sm">No leads found</p>
          </div>
        ) : (
          leads.map(lead => (
            <div
              key={lead.id}
              className="bg-[#171717] rounded-xl border border-[#262626] p-4 hover:border-[#F59E0B]/30 transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <button
                    onClick={() => handleToggleCalled(lead)}
                    className="flex-shrink-0 mt-0.5"
                  >
                    {lead.isCalled ? (
                      <CheckSquare className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <Square className="w-5 h-5 text-[#737373]" />
                    )}
                  </button>
                  <div className="min-w-0 flex-1">
                    <h3
                      className="font-semibold text-white text-sm truncate cursor-pointer"
                      onClick={() => setDetailLead(lead)}
                    >
                      {lead.businessName}
                    </h3>
                    {lead.ownerName && (
                      <p className="text-xs text-[#737373] truncate">{lead.ownerName}</p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => cycleStatus(lead.id, lead.status)}
                  className={`text-[10px] px-2 py-1 rounded-md border flex-shrink-0 ml-2 ${statusConfig[lead.status].color}`}
                >
                  {statusConfig[lead.status].label}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
                {lead.city && (
                  <div className="text-[#737373]">
                    <span className="text-[10px] uppercase">City</span>
                    <p className="text-white">{lead.city}</p>
                  </div>
                )}
                {lead.googleReviewCount > 0 && (
                  <div className="text-[#737373]">
                    <span className="text-[10px] uppercase">Reviews</span>
                    <p className="text-white">{lead.googleReviewCount}</p>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                {lead.phone && (
                  <>
                    <a
                      href={`tel:${lead.phone}`}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-[#F59E0B] text-black rounded-lg text-sm font-medium active:scale-95 transition-transform"
                    >
                      <Phone className="w-4 h-4" />
                      Call
                    </a>
                    <button
                      onClick={() => openWhatsApp(lead.phone)}
                      className="px-3 py-2.5 bg-emerald-500/10 text-emerald-400 rounded-lg active:scale-95 transition-transform"
                    >
                      <MessageCircle className="w-4 h-4" />
                    </button>
                  </>
                )}
                {lead.googleProfileUrl && (
                  <a
                    href={lead.googleProfileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-2.5 bg-[#262626] text-[#737373] rounded-lg hover:text-white active:scale-95 transition-transform"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block bg-[#171717] rounded-xl border border-[#262626] overflow-hidden mb-4">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[#171717] border-b border-[#262626]">
                <th className="px-4 py-3 w-10">
                  <button onClick={toggleSelectAll}>
                    {selectedLeads.size === leads.length && leads.length > 0 ? (
                      <CheckSquare className="w-4 h-4 text-[#F59E0B]" />
                    ) : (
                      <Square className="w-4 h-4 text-[#737373]" />
                    )}
                  </button>
                </th>
                <th className="px-4 py-3 w-10"></th>
                <th
                  className="px-4 py-3 text-left text-[10px] font-medium text-[#737373] uppercase tracking-wider cursor-pointer hover:text-white select-none"
                  onClick={() => handleSort('businessName')}
                >
                  <span className="flex items-center gap-1">Business <ArrowUpDown className="w-3 h-3" /></span>
                </th>
                <th className="px-4 py-3 text-left text-[10px] font-medium text-[#737373] uppercase tracking-wider">Owner</th>
                <th className="px-4 py-3 text-left text-[10px] font-medium text-[#737373] uppercase tracking-wider">City</th>
                <th className="px-4 py-3 text-left text-[10px] font-medium text-[#737373] uppercase tracking-wider">Reviews</th>
                <th className="px-4 py-3 text-left text-[10px] font-medium text-[#737373] uppercase tracking-wider">Phone</th>
                <th className="px-4 py-3 text-left text-[10px] font-medium text-[#737373] uppercase tracking-wider">Profile</th>
                <th
                  className="px-4 py-3 text-left text-[10px] font-medium text-[#737373] uppercase tracking-wider cursor-pointer hover:text-white select-none"
                  onClick={() => handleSort('status')}
                >
                  <span className="flex items-center gap-1">Status <ArrowUpDown className="w-3 h-3" /></span>
                </th>
                <th className="px-4 py-3 text-left text-[10px] font-medium text-[#737373] uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="border-b border-[#262626]">
                    <td colSpan={10} className="px-4 py-4">
                      <div className="h-4 bg-[#262626] rounded animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-[#737373] text-sm">
                    No leads found. {isAdmin && 'Upload an Excel file to get started.'}
                  </td>
                </tr>
              ) : (
                leads.map(lead => (
                  <tr
                    key={lead.id}
                    className="border-b border-[#262626] hover:bg-[#262626]/30 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <button onClick={() => toggleSelect(lead.id)}>
                        {selectedLeads.has(lead.id) ? (
                          <CheckSquare className="w-4 h-4 text-[#F59E0B]" />
                        ) : (
                          <Square className="w-4 h-4 text-[#737373]" />
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => handleToggleCalled(lead)}>
                        {lead.isCalled ? (
                          <CheckSquare className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <Square className="w-4 h-4 text-[#737373]" />
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setDetailLead(lead)}
                        className="text-sm font-medium text-white hover:text-[#F59E0B] transition-colors text-left"
                      >
                        {lead.businessName}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-sm text-[#737373]">{lead.ownerName || '—'}</td>
                    <td className="px-4 py-3 text-sm text-[#737373]">{lead.city || '—'}</td>
                    <td className="px-4 py-3 text-sm text-[#737373]">{lead.googleReviewCount || '—'}</td>
                    <td className="px-4 py-3">
                      {lead.phone ? (
                        <div className="flex items-center gap-1">
                          <a
                            href={`tel:${lead.phone}`}
                            className="text-sm text-[#F59E0B] hover:underline"
                          >
                            {lead.phone}
                          </a>
                          <button
                            onClick={() => openWhatsApp(lead.phone)}
                            className="text-emerald-400 hover:text-emerald-300"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-sm text-[#737373]">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {lead.googleProfileUrl ? (
                        <a
                          href={lead.googleProfileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#737373] hover:text-white transition-colors"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      ) : (
                        <span className="text-[#737373]">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => cycleStatus(lead.id, lead.status)}
                        className={`text-[10px] px-2 py-1 rounded-md border ${statusConfig[lead.status].color} hover:opacity-80 transition-opacity`}
                      >
                        {statusConfig[lead.status].label}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setDetailLead(lead)}
                        className="text-[#737373] hover:text-white transition-colors"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-[#737373]">
            Showing {((page - 1) * limit) + 1}-{Math.min(page * limit, total)} of {total}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#171717] border border-[#262626] text-[#737373] hover:text-white disabled:opacity-30 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const pageNum = i + 1
              return (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-medium transition-colors ${
                    page === pageNum
                      ? 'bg-[#F59E0B] text-black'
                      : 'bg-[#171717] border border-[#262626] text-[#737373] hover:text-white'
                  }`}
                >
                  {pageNum}
                </button>
              )
            })}
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#171717] border border-[#262626] text-[#737373] hover:text-white disabled:opacity-30 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      {showUpload && (
        <ExcelUploadModal
          categorySlug={slug!}
          categoryName={categoryName}
          onClose={() => setShowUpload(false)}
          onSuccess={fetchLeads}
        />
      )}

      {detailLead && (
        <LeadDetailModal
          lead={detailLead}
          onClose={() => setDetailLead(null)}
          onUpdate={fetchLeads}
        />
      )}
    </div>
  )
}
