import { useState, useMemo } from 'react'
import {
  Plus,
  User,
  Building2,
  Search,
  LayoutGrid,
  List,
  MoreHorizontal,
  Pencil,
  Trash2,
  Wallet,
  Users,
  ChevronRight,
  Eye,
  EyeOff,
  Globe,
  Loader2,
  AlertCircle,
} from 'lucide-react'
import {
  useSubjects,
  useContainers,
  useCreateSubject,
  useUpdateSubject,
  useDeleteSubject,
} from '@/lib/hooks'
import type { Subject, SubjectType, SubjectRole } from '@/types'
import { PageHeader } from '@/components/ui/PageHeader'
import { useModalState } from '@/hooks/useModalState'
import { FormModal } from '@/components/ui/FormModal'

const roleColors: Record<string, string> = {
  owner: 'bg-energy-500/10 text-energy-400',
  family: 'bg-blue-500/10 text-blue-400',
  partner: 'bg-purple-500/10 text-purple-400',
  other: 'bg-zinc-500/10 text-zinc-400',
}

const roleLabels: Record<string, string> = {
  owner: 'Titolare',
  family: 'Familiare',
  partner: 'Partner',
  other: 'Altro',
}

const countryFlags: Record<string, string> = {
  IT: '🇮🇹',
  GB: '🇬🇧',
  RO: '🇷🇴',
  US: '🇺🇸',
}

type ViewMode = 'grid' | 'list'

interface SubjectFormData {
  type: SubjectType
  name: string
  legalForm: string
  country: string
  role: SubjectRole
  parentSubjectId: string
  notes: string
}

const emptyForm: SubjectFormData = {
  type: 'person',
  name: '',
  legalForm: '',
  country: 'IT',
  role: 'owner',
  parentSubjectId: '',
  notes: '',
}

export function Subjects() {
  const { data: subjects = [], isLoading, isError, error } = useSubjects()
  const { data: containers = [] } = useContainers()
  const createSubject = useCreateSubject()
  const updateSubject = useUpdateSubject()
  const deleteSubject = useDeleteSubject()

  const [search, setSearch] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [showInactive, setShowInactive] = useState(false)
  const modal = useModalState<Subject>()
  const [form, setForm] = useState<SubjectFormData>(emptyForm)
  const [menuOpen, setMenuOpen] = useState<string | null>(null)

  const filtered = useMemo(() => {
    return subjects.filter((s) => {
      if (!showInactive && !s.isActive) return false
      if (search) {
        const q = search.toLowerCase()
        return (
          s.name.toLowerCase().includes(q) ||
          (s.notes && s.notes.toLowerCase().includes(q)) ||
          (s.legalForm && s.legalForm.toLowerCase().includes(q))
        )
      }
      return true
    })
  }, [subjects, search, showInactive])

  const persons = filtered.filter((s) => s.type === 'person')
  const companies = filtered.filter((s) => s.type === 'company')

  function openCreate() {
    setForm(emptyForm)
    modal.openCreate()
  }

  function openEdit(subject: Subject) {
    setForm({
      type: subject.type,
      name: subject.name,
      legalForm: subject.legalForm || '',
      country: subject.country,
      role: (subject.role as SubjectRole) || 'other',
      parentSubjectId: subject.parentSubjectId || '',
      notes: subject.notes || '',
    })
    modal.openEdit(subject)
    setMenuOpen(null)
  }

  function handleSave() {
    if (!form.name.trim()) return

    if (modal.editingItem) {
      updateSubject.mutate(
        {
          id: modal.editingItem.id,
          data: {
            type: form.type,
            name: form.name,
            legalForm: form.legalForm || null,
            country: form.country,
            role: form.role,
            parentSubjectId: form.parentSubjectId || null,
            notes: form.notes || null,
          },
        },
        {
          onSuccess: () => {
            modal.close()
          },
        },
      )
    } else {
      createSubject.mutate(
        {
          type: form.type,
          name: form.name,
          legalForm: form.legalForm || null,
          country: form.country,
          role: form.role,
          parentSubjectId: form.parentSubjectId || null,
          notes: form.notes || null,
          isActive: true,
        },
        {
          onSuccess: () => {
            modal.close()
          },
        },
      )
    }
  }

  function handleToggleActive(subject: Subject) {
    updateSubject.mutate({
      id: subject.id,
      data: { isActive: !subject.isActive },
    })
    setMenuOpen(null)
  }

  function handleDelete(subject: Subject) {
    const subjectContainers = containers.filter((c) => c.subjectId === subject.id)
    if (subjectContainers.length > 0) {
      alert('Impossibile eliminare: il soggetto ha contenitori associati.')
      return
    }
    deleteSubject.mutate(subject.id)
    setMenuOpen(null)
  }

  function getParentName(parentId: string | null | undefined): string | null {
    if (!parentId) return null
    const parent = subjects.find((s) => s.id === parentId)
    return parent ? parent.name : null
  }

  function getContainerCount(subjectId: string): number {
    return containers.filter((c) => c.subjectId === subjectId).length
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3 text-zinc-400">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Caricamento soggetti...</span>
        </div>
      </div>
    )
  }

  // Error state
  if (isError) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3 text-red-400">
          <AlertCircle className="h-6 w-6" />
          <span>Errore nel caricamento: {error instanceof Error ? error.message : 'Errore sconosciuto'}</span>
        </div>
      </div>
    )
  }

  function renderSubjectCard(subject: Subject) {
    const containerCount = getContainerCount(subject.id)
    const parentName = getParentName(subject.parentSubjectId)
    const isCompany = subject.type === 'company'

    return (
      <div
        key={subject.id}
        className={`bg-zinc-900 border border-zinc-800 rounded-xl p-4 hover:border-zinc-700 transition-colors relative ${
          !subject.isActive ? 'opacity-50' : ''
        }`}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-full ${
              isCompany ? 'bg-amber-500/10' : 'bg-blue-500/10'
            }`}>
              {isCompany ? (
                <Building2 className="h-5 w-5 text-amber-400" />
              ) : (
                <User className="h-5 w-5 text-blue-400" />
              )}
            </div>
            <div>
              <p className="font-semibold text-zinc-100">{subject.name}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-sm">{countryFlags[subject.country] || subject.country}</span>
                {subject.legalForm && (
                  <span className="text-xs text-zinc-500">{subject.legalForm}</span>
                )}
              </div>
            </div>
          </div>
          <div className="relative">
            <button
              className="rounded-md p-1 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
              onClick={() => setMenuOpen(menuOpen === subject.id ? null : subject.id)}
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
            {menuOpen === subject.id && (
              <div className="absolute right-0 top-8 z-10 w-44 rounded-lg border border-zinc-700 bg-zinc-800 py-1 shadow-xl">
                <button
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-700"
                  onClick={() => openEdit(subject)}
                >
                  <Pencil className="h-3.5 w-3.5" /> Modifica
                </button>
                <button
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-700"
                  onClick={() => handleToggleActive(subject)}
                >
                  {subject.isActive ? (
                    <><EyeOff className="h-3.5 w-3.5" /> Disattiva</>
                  ) : (
                    <><Eye className="h-3.5 w-3.5" /> Riattiva</>
                  )}
                </button>
                <button
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-zinc-700"
                  onClick={() => handleDelete(subject)}
                >
                  <Trash2 className="h-3.5 w-3.5" /> Elimina
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 space-y-2">
          {parentName && (
            <div className="flex items-center gap-1 text-xs text-zinc-500">
              <ChevronRight className="h-3 w-3" />
              <span>Collegato a <span className="text-zinc-400">{parentName}</span></span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-500">Ruolo</span>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              roleColors[subject.role || 'other'] || roleColors['other']
            }`}>
              {roleLabels[subject.role || 'other'] || 'Altro'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-500">Contenitori</span>
            <span className="text-xs text-zinc-300 font-medium">{containerCount}</span>
          </div>
          {!subject.isActive && (
            <span className="inline-block rounded-full bg-zinc-700 px-2 py-0.5 text-xs text-zinc-400">
              Inattivo
            </span>
          )}
          {subject.notes && (
            <p className="text-xs text-zinc-500 italic pt-1 border-t border-zinc-800">
              {subject.notes}
            </p>
          )}
        </div>
      </div>
    )
  }

  function renderSubjectRow(subject: Subject) {
    const containerCount = getContainerCount(subject.id)
    const parentName = getParentName(subject.parentSubjectId)
    const isCompany = subject.type === 'company'

    return (
      <div
        key={subject.id}
        className={`flex items-center gap-4 px-6 py-3 hover:bg-zinc-800/30 transition-colors ${
          !subject.isActive ? 'opacity-50' : ''
        }`}
      >
        <div className={`flex h-8 w-8 items-center justify-center rounded-full shrink-0 ${
          isCompany ? 'bg-amber-500/10' : 'bg-blue-500/10'
        }`}>
          {isCompany ? (
            <Building2 className="h-4 w-4 text-amber-400" />
          ) : (
            <User className="h-4 w-4 text-blue-400" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-zinc-200 truncate">{subject.name}</p>
            {subject.legalForm && (
              <span className="text-xs text-zinc-500">{subject.legalForm}</span>
            )}
          </div>
          {parentName && (
            <p className="text-xs text-zinc-500 flex items-center gap-1">
              <ChevronRight className="h-3 w-3" /> {parentName}
            </p>
          )}
        </div>
        <span className="text-sm shrink-0">{countryFlags[subject.country] || subject.country}</span>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
          roleColors[subject.role || 'other'] || roleColors['other']
        }`}>
          {roleLabels[subject.role || 'other'] || 'Altro'}
        </span>
        <div className="shrink-0 flex items-center gap-1 text-xs text-zinc-400 w-16 justify-center">
          <Wallet className="h-3 w-3" /> {containerCount}
        </div>
        <div className="shrink-0 flex items-center gap-1">
          <button
            className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
            onClick={() => openEdit(subject)}
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
            onClick={() => handleToggleActive(subject)}
          >
            {subject.isActive ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6" onClick={() => menuOpen && setMenuOpen(null)}>
      {/* Page header */}
      <PageHeader
        title="Soggetti"
        description={`${subjects.filter((s) => s.isActive).length} soggetti attivi (${persons.length} persone, ${companies.length} societa')`}
        actions={
          <button
            className="flex items-center gap-2 rounded-lg bg-energy-500 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-energy-400 transition-colors"
            onClick={openCreate}
          >
            <Plus className="h-4 w-4" />
            Nuovo Soggetto
          </button>
        }
      />

      {/* Search and controls */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Cerca soggetti..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 py-2 pl-10 pr-4 text-sm text-zinc-200 placeholder-zinc-500 focus:border-energy-500 focus:outline-none focus:ring-1 focus:ring-energy-500"
          />
        </div>
        <button
          className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs transition-colors ${
            showInactive
              ? 'border-energy-500 bg-energy-500/10 text-energy-400'
              : 'border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-600'
          }`}
          onClick={() => setShowInactive(!showInactive)}
        >
          <EyeOff className="h-3.5 w-3.5" />
          Inattivi
        </button>
        <div className="flex rounded-lg border border-zinc-700 bg-zinc-800">
          <button
            className={`rounded-l-lg p-2 ${viewMode === 'grid' ? 'bg-zinc-700 text-zinc-200' : 'text-zinc-500 hover:text-zinc-300'}`}
            onClick={() => setViewMode('grid')}
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            className={`rounded-r-lg p-2 ${viewMode === 'list' ? 'bg-zinc-700 text-zinc-200' : 'text-zinc-500 hover:text-zinc-300'}`}
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Subjects sections */}
      {viewMode === 'grid' ? (
        <div className="space-y-8">
          {/* Persone fisiche */}
          {persons.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <User className="h-5 w-5 text-blue-400" />
                <h2 className="text-lg font-semibold text-zinc-200">Persone Fisiche</h2>
                <span className="ml-1 rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-500">
                  {persons.length}
                </span>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {persons.map(renderSubjectCard)}
              </div>
            </div>
          )}

          {/* Societa' */}
          {companies.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Building2 className="h-5 w-5 text-amber-400" />
                <h2 className="text-lg font-semibold text-zinc-200">Societa'</h2>
                <span className="ml-1 rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-500">
                  {companies.length}
                </span>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {companies.map(renderSubjectCard)}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {persons.length > 0 && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
              <div className="flex items-center gap-2 px-6 py-3 border-b border-zinc-800">
                <User className="h-4 w-4 text-blue-400" />
                <span className="text-sm font-semibold text-zinc-200">Persone Fisiche</span>
                <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-500">{persons.length}</span>
              </div>
              <div className="divide-y divide-zinc-800/50">
                {persons.map(renderSubjectRow)}
              </div>
            </div>
          )}
          {companies.length > 0 && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
              <div className="flex items-center gap-2 px-6 py-3 border-b border-zinc-800">
                <Building2 className="h-4 w-4 text-amber-400" />
                <span className="text-sm font-semibold text-zinc-200">Societa'</span>
                <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-500">{companies.length}</span>
              </div>
              <div className="divide-y divide-zinc-800/50">
                {companies.map(renderSubjectRow)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create/Edit Modal */}
      {modal.isOpen && (
        <FormModal
          title={modal.isEditing ? 'Modifica Soggetto' : 'Nuovo Soggetto'}
          size="lg"
          onClose={modal.close}
          onSubmit={handleSave}
          submitDisabled={!form.name.trim()}
          isSubmitting={createSubject.isPending || updateSubject.isPending}
          submitLabel={modal.isEditing ? 'Salva Modifiche' : 'Crea Soggetto'}
        >
          {/* Type */}
          <div className="flex gap-3">
            <button
              type="button"
              className={`flex-1 flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm transition-colors ${
                form.type === 'person'
                  ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                  : 'border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-600'
              }`}
              onClick={() => setForm({ ...form, type: 'person', legalForm: '' })}
            >
              <User className="h-4 w-4" /> Persona Fisica
            </button>
            <button
              type="button"
              className={`flex-1 flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm transition-colors ${
                form.type === 'company'
                  ? 'border-amber-500 bg-amber-500/10 text-amber-400'
                  : 'border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-600'
              }`}
              onClick={() => setForm({ ...form, type: 'company' })}
            >
              <Building2 className="h-4 w-4" /> Societa'
            </button>
          </div>

          {/* Name */}
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Nome *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 focus:border-energy-500 focus:outline-none focus:ring-1 focus:ring-energy-500"
              placeholder={form.type === 'person' ? 'es. Andrea Vaturi' : 'es. Kairos SRLS'}
            />
          </div>

          {/* Legal form (only for companies) */}
          {form.type === 'company' && (
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Forma Giuridica</label>
              <input
                type="text"
                value={form.legalForm}
                onChange={(e) => setForm({ ...form, legalForm: e.target.value })}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 focus:border-energy-500 focus:outline-none focus:ring-1 focus:ring-energy-500"
                placeholder="es. SRLS, SRL, LTD, SSRL..."
              />
            </div>
          )}

          {/* Country + Role */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-zinc-500 mb-1">
                <Globe className="inline h-3 w-3 mr-1" />Paese
              </label>
              <select
                value={form.country}
                onChange={(e) => setForm({ ...form, country: e.target.value })}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 focus:border-energy-500 focus:outline-none"
              >
                <option value="IT">Italia</option>
                <option value="GB">UK</option>
                <option value="RO">Romania</option>
                <option value="US">USA</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">
                <Users className="inline h-3 w-3 mr-1" />Ruolo
              </label>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value as SubjectRole })}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 focus:border-energy-500 focus:outline-none"
              >
                <option value="owner">Titolare</option>
                <option value="family">Familiare</option>
                <option value="partner">Partner</option>
                <option value="other">Altro</option>
              </select>
            </div>
          </div>

          {/* Parent subject */}
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Soggetto Genitore (opzionale)</label>
            <select
              value={form.parentSubjectId}
              onChange={(e) => setForm({ ...form, parentSubjectId: e.target.value })}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 focus:border-energy-500 focus:outline-none"
            >
              <option value="">— Nessuno —</option>
              {subjects
                .filter((s) => s.id !== modal.editingItem?.id && s.isActive)
                .map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Note</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={2}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 focus:border-energy-500 focus:outline-none focus:ring-1 focus:ring-energy-500 resize-none"
              placeholder="Note aggiuntive..."
            />
          </div>
        </FormModal>
      )}
    </div>
  )
}
