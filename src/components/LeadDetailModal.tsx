import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { useAuth } from '@/hooks/useAuth'
import type { Lead, LeadStatus } from '@/types'
import type { Activity as ActivityType } from '@/types'
import {
  X,
  Phone,
  ExternalLink,
  MessageCircle,
  Save,
  CheckCircle,
  Square,
  Clock,
  MapPin,
  Star,
  Trash2,
  ActivityIcon,
} from 'lucide-react'

const statusConfig: Record<LeadStatus, { label: string; color: string; bg: string }> = {
  NOT_CONTACTED: { label: 'Not Contacted', color: 'text-gray-400', bg: 'bg-gray-500/10 border-gray-500/20' },
  CALLED: { label: 'Called', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
  INTERESTED: { label: 'Interested', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
  FOLLOW_UP: { label: 'Follow Up', color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20' },
  CONVERTED: { label: 'Converted', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  REJECTED: { label: 'Rejected', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
}

interface LeadDetailModalProps {
  lead: Lead
  onClose: () => void
  onUpdate: () => void
}

export default function LeadDetailModal({ lead, onClose, onUpdate }: LeadDetailModalProps) {
  const { isAdmin } = useAuth()
  const [notes, setNotes] = useState(lead.notes || '')
  const [status, setStatus] = useState<LeadStatus>(lead.status)
  const [isCalled, setIsCalled] = useState(lead.isCalled)
  const [activities, setActivities] = useState<ActivityType[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchActivities()
  }, [lead.id])

  const fetchActivities = async () => {
    try {
      const res = await api.getLeadActivities(lead.id)
      setActivities(res.activities)
    } catch (error) {
      console.error('Failed to fetch activities:', error)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const updates: Partial<Lead> = {}
      if (notes !== lead.notes) updates.notes = notes
      if (status !== lead.status) updates.status = status
      if (isCalled !== lead.isCalled) updates.isCalled = isCalled

      if (Object.keys(updates).length > 0) {
        await api.updateLead(lead.id, updates)
        onUpdate()
      }
      onClose()
    } catch (error) {
      console.error('Failed to save lead:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!isAdmin) return
    if (!confirm('Are you sure you want to delete this lead?')) return
    try {
      await api.deleteLead(lead.id)
      onUpdate()
      onClose()
    } catch (error) {
      console.error('Failed to delete lead:', error)
    }
  }

  const openWhatsApp = (phone: string | null) => {
    if (!phone) return
    const cleaned = phone.replace(/\D/g, '')
    window.open(`https://wa.me/${cleaned}`, '_blank')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative bg-[#171717] rounded-2xl border border-[#262626] w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#262626]">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsCalled(!isCalled)}
              className="mt-0.5"
            >
              {isCalled ? (
                <CheckCircle className="w-5 h-5 text-emerald-400" />
              ) : (
                <Square className="w-5 h-5 text-[#737373]" />
              )}
            </button>
            <div>
              <h2 className="text-lg font-semibold text-white">{lead.businessName}</h2>
              {lead.ownerName && (
                <p className="text-xs text-[#737373]">{lead.ownerName}</p>
              )}
            </div>
          </div>
          <button onClick={onClose} className="text-[#737373] hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Status */}
          <div>
            <label className="text-[10px] text-[#737373] uppercase tracking-wider font-medium mb-2 block">Status</label>
            <div className="flex flex-wrap gap-2">
              {Object.entries(statusConfig).map(([key, config]) => (
                <button
                  key={key}
                  onClick={() => setStatus(key as LeadStatus)}
                  className={`px-3 py-1.5 rounded-md text-xs border transition-colors ${
                    status === key ? config.bg + ' ' + config.color : 'bg-[#0A0A0A] border-[#262626] text-[#737373] hover:text-white'
                  }`}
                >
                  {config.label}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div>
            <label className="text-[10px] text-[#737373] uppercase tracking-wider font-medium mb-2 block">Quick Actions</label>
            <div className="flex gap-2">
              {lead.phone && (
                <>
                  <a
                    href={`tel:${lead.phone}`}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-[#F59E0B] text-black rounded-lg text-sm font-medium hover:bg-[#F59E0B]/90 transition-colors"
                  >
                    <Phone className="w-4 h-4" />
                    Call
                  </a>
                  <button
                    onClick={() => openWhatsApp(lead.phone)}
                    className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-emerald-500/10 text-emerald-400 rounded-lg text-sm hover:bg-emerald-500/20 transition-colors"
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
                  className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-[#262626] text-[#737373] rounded-lg text-sm hover:text-white transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-3">
            {lead.phone && (
              <div className="bg-[#0A0A0A] rounded-lg p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <Phone className="w-3 h-3 text-[#F59E0B]" />
                  <span className="text-[10px] text-[#737373] uppercase">Phone</span>
                </div>
                <p className="text-sm text-white">{lead.phone}</p>
              </div>
            )}
            {lead.city && (
              <div className="bg-[#0A0A0A] rounded-lg p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <MapPin className="w-3 h-3 text-[#F59E0B]" />
                  <span className="text-[10px] text-[#737373] uppercase">City</span>
                </div>
                <p className="text-sm text-white">{lead.city}</p>
              </div>
            )}
            {lead.googleReviewCount > 0 && (
              <div className="bg-[#0A0A0A] rounded-lg p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <Star className="w-3 h-3 text-[#F59E0B]" />
                  <span className="text-[10px] text-[#737373] uppercase">Reviews</span>
                </div>
                <p className="text-sm text-white">{lead.googleReviewCount}</p>
              </div>
            )}
            <div className="bg-[#0A0A0A] rounded-lg p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Clock className="w-3 h-3 text-[#F59E0B]" />
                <span className="text-[10px] text-[#737373] uppercase">Added</span>
              </div>
              <p className="text-sm text-white">
                {new Date(lead.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-[10px] text-[#737373] uppercase tracking-wider font-medium mb-2 block">Notes</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Add notes about this lead..."
              rows={3}
              className="w-full px-3 py-2 bg-[#0A0A0A] border border-[#262626] rounded-lg text-sm text-white placeholder-[#737373] focus:outline-none focus:border-[#F59E0B]/50 resize-none"
            />
          </div>

          {/* Activity Log */}
          {activities.length > 0 && (
            <div>
              <label className="text-[10px] text-[#737373] uppercase tracking-wider font-medium mb-2 block">Activity</label>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {activities.map(activity => (
                  <div key={activity.id} className="flex items-start gap-2 text-xs">
                    <ActivityIcon className="w-3 h-3 text-[#737373] mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="text-[#737373]">
                        {activity.action === 'STATUS_CHANGED' && `Status changed${activity.newValue ? ` to ${activity.newValue}` : ''}`}
                        {activity.action === 'CALLED' && 'Marked as called'}
                        {activity.action === 'CREATED' && 'Lead created'}
                        {activity.action === 'NOTE_ADDED' && 'Note updated'}
                        {activity.action === 'UPDATED' && 'Lead updated'}
                      </span>
                      <span className="text-[#737373] ml-1">
                        {new Date(activity.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[#262626]">
          {isAdmin && (
            <button
              onClick={handleDelete}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          )}
          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm text-[#737373] hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#F59E0B] text-black rounded-lg text-sm font-medium hover:bg-[#F59E0B]/90 transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
