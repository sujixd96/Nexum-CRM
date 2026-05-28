import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { api } from '@/lib/api'
import { useAuth } from '@/hooks/useAuth'
import type { Category } from '@/types'
import {
  FolderOpen,
  Plus,
  Trash2,
  ArrowRight,
  Dumbbell,
  Stethoscope,
  UtensilsCrossed,
  BookOpen,
  GraduationCap,
  X,
  Loader2,
} from 'lucide-react'

const categoryIcons: Record<string, React.ReactNode> = {
  gyms: <Dumbbell className="w-5 h-5" />,
  doctors: <Stethoscope className="w-5 h-5" />,
  restaurants: <UtensilsCrossed className="w-5 h-5" />,
  libraries: <BookOpen className="w-5 h-5" />,
  'coaching-centres': <GraduationCap className="w-5 h-5" />,
}

export default function Categories() {
  const { isAdmin } = useAuth()
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [newCategory, setNewCategory] = useState({ name: '', slug: '', description: '' })
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    try {
      const res = await api.getCategories()
      setCategories(res.categories)
    } catch (error) {
      console.error('Failed to fetch categories:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    if (!newCategory.name || !newCategory.slug) return
    setCreating(true)
    try {
      await api.createCategory(newCategory)
      setNewCategory({ name: '', slug: '', description: '' })
      setShowCreate(false)
      fetchCategories()
    } catch (error: any) {
      alert(error.message || 'Failed to create category')
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure? This will delete all leads in this category.')) return
    try {
      await api.deleteCategory(id)
      fetchCategories()
    } catch (error: any) {
      alert(error.message || 'Failed to delete category')
    }
  }

  const generateSlug = (name: string) => {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  }

  if (loading) {
    return (
      <div className="p-4 md:p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-[#171717] rounded w-48" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-32 bg-[#171717] rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Categories</h1>
          <p className="text-sm text-[#737373]">Manage your lead categories</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-[#F59E0B] text-black rounded-lg text-sm font-medium hover:bg-[#F59E0B]/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Category
          </button>
        )}
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map(cat => {
          const progress = cat.totalLeads > 0
            ? Math.round((cat.calledLeads / cat.totalLeads) * 100)
            : 0
          return (
            <div
              key={cat.id}
              className="bg-[#171717] rounded-xl border border-[#262626] hover:border-[#F59E0B]/50 transition-all duration-200 p-5"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#F59E0B]/10 flex items-center justify-center text-[#F59E0B]">
                    {categoryIcons[cat.slug] || <FolderOpen className="w-5 h-5" />}
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">{cat.name}</h3>
                    <p className="text-xs text-[#737373]">{cat.totalLeads} leads</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {isAdmin && (
                    <button
                      onClick={() => handleDelete(cat.id)}
                      className="p-1.5 text-[#737373] hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#737373]">{cat.calledLeads} called</span>
                  <span className="text-[#737373]">{cat.remainingLeads} remaining</span>
                </div>
                <div className="h-1.5 bg-[#262626] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#F59E0B] rounded-full transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              <Link
                to={`/category/${cat.slug}`}
                className="flex items-center justify-center gap-1.5 w-full py-2.5 bg-[#0A0A0A] rounded-lg text-sm text-[#F59E0B] hover:bg-[#F59E0B]/10 transition-colors"
              >
                View Leads
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )
        })}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => setShowCreate(false)} />
          <div className="relative bg-[#171717] rounded-2xl border border-[#262626] w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-white">Create Category</h2>
              <button onClick={() => setShowCreate(false)} className="text-[#737373] hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-[#737373] mb-1 block">Name *</label>
                <input
                  type="text"
                  value={newCategory.name}
                  onChange={e => {
                    const name = e.target.value
                    setNewCategory(prev => ({
                      ...prev,
                      name,
                      slug: prev.slug || generateSlug(name),
                    }))
                  }}
                  placeholder="e.g., Dental Clinics"
                  className="w-full px-3 py-2.5 bg-[#0A0A0A] border border-[#262626] rounded-lg text-sm text-white placeholder-[#737373] focus:outline-none focus:border-[#F59E0B]/50"
                />
              </div>
              <div>
                <label className="text-xs text-[#737373] mb-1 block">Slug *</label>
                <input
                  type="text"
                  value={newCategory.slug}
                  onChange={e => setNewCategory(prev => ({ ...prev, slug: e.target.value }))}
                  placeholder="e.g., dental-clinics"
                  className="w-full px-3 py-2.5 bg-[#0A0A0A] border border-[#262626] rounded-lg text-sm text-white placeholder-[#737373] focus:outline-none focus:border-[#F59E0B]/50"
                />
              </div>
              <div>
                <label className="text-xs text-[#737373] mb-1 block">Description</label>
                <input
                  type="text"
                  value={newCategory.description}
                  onChange={e => setNewCategory(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief description..."
                  className="w-full px-3 py-2.5 bg-[#0A0A0A] border border-[#262626] rounded-lg text-sm text-white placeholder-[#737373] focus:outline-none focus:border-[#F59E0B]/50"
                />
              </div>
              <button
                onClick={handleCreate}
                disabled={creating || !newCategory.name || !newCategory.slug}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#F59E0B] text-black rounded-lg text-sm font-medium hover:bg-[#F59E0B]/90 transition-colors disabled:opacity-50"
              >
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Create Category
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
