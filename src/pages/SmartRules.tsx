import { useState } from 'react'
import {
  Wand2,
  Plus,
  Pencil,
  Trash2,
  Play,
  Sparkles,
  Loader2,
  CheckCircle2,
  X,
  ChevronDown,
  ChevronUp,
  Zap,
  Eye,
  Tag as TagIcon,
} from 'lucide-react'
import {
  useSmartRules,
  useCreateSmartRule,
  useUpdateSmartRule,
  useDeleteSmartRule,
  useTags,
  useContainers,
  useCounterparties,
} from '@/lib/hooks'
import { smartRulesApi, type AutoTagResult, type RuleSuggestion } from '@/lib/api'
import type { SmartRule, Tag, Container, Counterparty } from '@/types'
import { useQueryClient } from '@tanstack/react-query'

// ── Main component ─────────────────────────────────────────

export function SmartRules() {
  const { data: rules = [], isLoading } = useSmartRules()
  const { data: tags = [] } = useTags()
  const { data: containers = [] } = useContainers()
  const { data: counterparties = [] } = useCounterparties()
  const createRule = useCreateSmartRule()
  const deleteRule = useDeleteSmartRule()
  const queryClient = useQueryClient()

  const [showModal, setShowModal] = useState(false)
  const [editingRule, setEditingRule] = useState<SmartRule | null>(null)

  // Auto-tag state
  const [autoTagging, setAutoTagging] = useState(false)
  const [autoTagResult, setAutoTagResult] = useState<AutoTagResult | null>(null)
  const [showAutoTagResult, setShowAutoTagResult] = useState(false)

  // Suggestions state
  const [suggesting, setSuggesting] = useState(false)
  const [suggestions, setSuggestions] = useState<RuleSuggestion[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)

  function openCreate() {
    setEditingRule(null)
    setShowModal(true)
  }

  function openEdit(rule: SmartRule) {
    setEditingRule(rule)
    setShowModal(true)
  }

  function handleDelete(id: string) {
    if (!confirm('Eliminare questa regola?')) return
    deleteRule.mutate(id)
  }

  async function handleAutoTag(dryRun: boolean) {
    setAutoTagging(true)
    setAutoTagResult(null)
    try {
      const result = await smartRulesApi.autoTag(dryRun)
      setAutoTagResult(result)
      setShowAutoTagResult(true)
      if (!dryRun && result.applied > 0) {
        queryClient.invalidateQueries({ queryKey: ['transactions'] })
      }
    } catch (err) {
      console.error(err)
    } finally {
      setAutoTagging(false)
    }
  }

  async function handleSuggest() {
    setSuggesting(true)
    setSuggestions([])
    try {
      const result = await smartRulesApi.suggestRules()
      setSuggestions(result.suggestions || [])
      setShowSuggestions(true)
    } catch (err) {
      console.error(err)
    } finally {
      setSuggesting(false)
    }
  }

  async function acceptSuggestion(suggestion: RuleSuggestion) {
    const ruleData: Partial<SmartRule> = {
      name: suggestion.ruleName,
      assignTagId: suggestion.tagId,
      priority: Math.round(suggestion.confidence / 10),
      isActive: true,
      autoApply: true,
    }

    if (suggestion.type === 'counterparty') {
      ruleData.counterpartyId = suggestion.pattern
    } else if (suggestion.type === 'keyword') {
      ruleData.descriptionPattern = suggestion.pattern
    }

    createRule.mutate(ruleData as Partial<SmartRule>, {
      onSuccess: () => {
        setSuggestions(prev => prev.filter(s => s !== suggestion))
      },
    })
  }

  const activeRules = rules.filter(r => r.isActive)
  const inactiveRules = rules.filter(r => !r.isActive)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Regole Smart</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Categorizzazione automatica delle transazioni tramite regole intelligenti
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={openCreate}
            className="flex items-center gap-2 rounded-lg bg-energy-500 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-energy-400 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Nuova Regola
          </button>
        </div>
      </div>

      {/* Action buttons */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {/* AI Suggestions */}
        <button
          onClick={handleSuggest}
          disabled={suggesting}
          className="flex items-center gap-3 rounded-xl border border-purple-500/20 bg-purple-500/5 p-4 text-left hover:bg-purple-500/10 transition-colors disabled:opacity-50"
        >
          {suggesting ? <Loader2 className="h-8 w-8 text-purple-400 animate-spin shrink-0" /> : <Sparkles className="h-8 w-8 text-purple-400 shrink-0" />}
          <div>
            <p className="text-sm font-semibold text-purple-300">Suggerisci Regole</p>
            <p className="text-xs text-zinc-500">Analizza pattern dalle transazioni gia' taggate</p>
          </div>
        </button>

        {/* Dry run (preview) */}
        <button
          onClick={() => handleAutoTag(true)}
          disabled={autoTagging || activeRules.length === 0}
          className="flex items-center gap-3 rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 text-left hover:bg-blue-500/10 transition-colors disabled:opacity-50"
        >
          {autoTagging ? <Loader2 className="h-8 w-8 text-blue-400 animate-spin shrink-0" /> : <Eye className="h-8 w-8 text-blue-400 shrink-0" />}
          <div>
            <p className="text-sm font-semibold text-blue-300">Anteprima Auto-Tag</p>
            <p className="text-xs text-zinc-500">Simula senza applicare ({activeRules.length} regole attive)</p>
          </div>
        </button>

        {/* Apply auto-tag */}
        <button
          onClick={() => handleAutoTag(false)}
          disabled={autoTagging || activeRules.length === 0}
          className="flex items-center gap-3 rounded-xl border border-energy-500/20 bg-energy-500/5 p-4 text-left hover:bg-energy-500/10 transition-colors disabled:opacity-50"
        >
          {autoTagging ? <Loader2 className="h-8 w-8 text-energy-400 animate-spin shrink-0" /> : <Play className="h-8 w-8 text-energy-400 shrink-0" />}
          <div>
            <p className="text-sm font-semibold text-energy-300">Applica Auto-Tag</p>
            <p className="text-xs text-zinc-500">Tagga automaticamente le transazioni non categorizzate</p>
          </div>
        </button>
      </div>

      {/* Auto-tag result */}
      {showAutoTagResult && autoTagResult && (
        <AutoTagResultPanel result={autoTagResult} onClose={() => setShowAutoTagResult(false)} tags={tags} />
      )}

      {/* Suggestions panel */}
      {showSuggestions && suggestions.length > 0 && (
        <SuggestionsPanel
          suggestions={suggestions}
          onAccept={acceptSuggestion}
          onClose={() => setShowSuggestions(false)}
          accepting={createRule.isPending}
        />
      )}
      {showSuggestions && suggestions.length === 0 && !suggesting && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 text-center">
          <Sparkles className="h-8 w-8 text-zinc-600 mx-auto mb-2" />
          <p className="text-sm text-zinc-400">Nessun suggerimento trovato.</p>
          <p className="text-xs text-zinc-500 mt-1">Tagga manualmente alcune transazioni per permettere all'analisi di individuare pattern.</p>
        </div>
      )}

      {/* Rules list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-energy-400" />
        </div>
      ) : rules.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-12 text-center">
          <Wand2 className="h-12 w-12 text-zinc-600 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-zinc-300 mb-1">Nessuna regola configurata</h3>
          <p className="text-sm text-zinc-500 mb-4">Crea la tua prima regola o usa "Suggerisci Regole" per iniziare.</p>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-lg bg-energy-500 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-energy-400 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Crea Regola
          </button>
        </div>
      ) : (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-energy-400" />
              <h2 className="text-lg font-semibold text-zinc-100">Regole Attive</h2>
              <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">{activeRules.length}</span>
            </div>
          </div>
          <div className="divide-y divide-zinc-800/50">
            {activeRules.map(rule => (
              <RuleRow
                key={rule.id}
                rule={rule}
                tags={tags}
                containers={containers}
                counterparties={counterparties}
                onEdit={() => openEdit(rule)}
                onDelete={() => handleDelete(rule.id)}
              />
            ))}
            {activeRules.length === 0 && (
              <p className="px-6 py-8 text-center text-sm text-zinc-500">Nessuna regola attiva</p>
            )}
          </div>

          {inactiveRules.length > 0 && (
            <>
              <div className="px-6 py-3 border-t border-zinc-800 bg-zinc-800/20">
                <p className="text-xs text-zinc-500">Regole disattivate ({inactiveRules.length})</p>
              </div>
              <div className="divide-y divide-zinc-800/50 opacity-60">
                {inactiveRules.map(rule => (
                  <RuleRow
                    key={rule.id}
                    rule={rule}
                    tags={tags}
                    containers={containers}
                    counterparties={counterparties}
                    onEdit={() => openEdit(rule)}
                    onDelete={() => handleDelete(rule.id)}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Rule Modal */}
      {showModal && (
        <RuleModal
          rule={editingRule}
          tags={tags}
          containers={containers}
          counterparties={counterparties}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  )
}

// ── Rule row ───────────────────────────────────────────────

function RuleRow({
  rule,
  tags,
  containers,
  counterparties,
  onEdit,
  onDelete,
}: {
  rule: SmartRule
  tags: Tag[]
  containers: Container[]
  counterparties: Counterparty[]
  onEdit: () => void
  onDelete: () => void
}) {
  const tag = tags.find(t => t.id === rule.assignTagId) || rule.assignTag
  const cpName = rule.counterpartyId
    ? (counterparties.find(c => c.id === rule.counterpartyId)?.name || (rule as unknown as Record<string, unknown>).counterpartyName || '—')
    : null
  const ctName = rule.containerId
    ? (containers.find(c => c.id === rule.containerId)?.name || (rule as unknown as Record<string, unknown>).containerName || '—')
    : null

  return (
    <div className="flex items-center gap-4 px-6 py-3 hover:bg-zinc-800/30 transition-colors">
      {/* Priority badge */}
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-800 text-xs font-bold text-zinc-400 shrink-0">
        {rule.priority}
      </span>

      {/* Rule info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-zinc-200">{rule.name}</p>
        <div className="flex flex-wrap gap-2 mt-1">
          {rule.descriptionPattern && (
            <span className="inline-flex items-center gap-1 rounded bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-400">
              Descrizione contiene: <span className="text-zinc-200 font-mono">"{rule.descriptionPattern}"</span>
            </span>
          )}
          {cpName && (
            <span className="inline-flex items-center gap-1 rounded bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-400">
              Controparte: <span className="text-zinc-200">{cpName as string}</span>
            </span>
          )}
          {ctName && (
            <span className="inline-flex items-center gap-1 rounded bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-400">
              Contenitore: <span className="text-zinc-200">{ctName as string}</span>
            </span>
          )}
          {rule.transactionType && (
            <span className="inline-flex items-center gap-1 rounded bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-400">
              Tipo: <span className="text-zinc-200">{rule.transactionType}</span>
            </span>
          )}
        </div>
      </div>

      {/* Assigned tag */}
      {tag && (
        <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium bg-zinc-800 text-zinc-300 shrink-0">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: tag.color || '#6b7280' }} />
          {tag.name}
        </span>
      )}

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0">
        <button onClick={onEdit} className="rounded p-1.5 text-zinc-500 hover:text-energy-400 hover:bg-zinc-800" title="Modifica">
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button onClick={onDelete} className="rounded p-1.5 text-zinc-500 hover:text-red-400 hover:bg-zinc-800" title="Elimina">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}

// ── Auto-tag result panel ──────────────────────────────────

function AutoTagResultPanel({
  result,
  onClose,
  tags,
}: {
  result: AutoTagResult
  onClose: () => void
  tags: Tag[]
}) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className={`bg-zinc-900 border rounded-xl overflow-hidden ${result.dryRun ? 'border-blue-500/30' : 'border-energy-500/30'}`}>
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          {result.dryRun ? (
            <Eye className="h-5 w-5 text-blue-400" />
          ) : (
            <CheckCircle2 className="h-5 w-5 text-energy-400" />
          )}
          <div>
            <p className="text-sm font-semibold text-zinc-200">
              {result.dryRun ? 'Anteprima:' : 'Applicato:'}{' '}
              <span className={result.dryRun ? 'text-blue-400' : 'text-energy-400'}>
                {result.matches.length} match trovati
              </span>
              {!result.dryRun && <span className="text-zinc-400"> ({result.applied} taggati)</span>}
            </p>
            <p className="text-xs text-zinc-500">
              {result.totalUntagged} transazioni senza tag analizzate con {result.totalRules} regole
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {result.matches.length > 0 && (
            <button onClick={() => setExpanded(!expanded)} className="text-zinc-400 hover:text-zinc-200">
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          )}
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-200">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
      {expanded && result.matches.length > 0 && (
        <div className="border-t border-zinc-800 max-h-64 overflow-y-auto">
          {result.matches.map((match, i) => {
            const tag = tags.find(t => t.id === match.tagId)
            return (
              <div key={i} className="flex items-center gap-3 px-6 py-2 text-xs hover:bg-zinc-800/30">
                <span className="text-zinc-400 flex-1 truncate">{match.description}</span>
                <span className="text-zinc-500">{match.ruleName}</span>
                {tag && (
                  <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 bg-zinc-800 text-zinc-300 shrink-0">
                    <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: tag.color || '#6b7280' }} />
                    {tag.name}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Suggestions panel ──────────────────────────────────────

function SuggestionsPanel({
  suggestions,
  onAccept,
  onClose,
  accepting,
}: {
  suggestions: RuleSuggestion[]
  onAccept: (s: RuleSuggestion) => void
  onClose: () => void
  accepting: boolean
}) {
  return (
    <div className="bg-zinc-900 border border-purple-500/30 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-purple-400" />
          <h3 className="text-sm font-semibold text-zinc-200">Suggerimenti ({suggestions.length})</h3>
        </div>
        <button onClick={onClose} className="text-zinc-400 hover:text-zinc-200">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="divide-y divide-zinc-800/50 max-h-96 overflow-y-auto">
        {suggestions.map((s, i) => (
          <div key={i} className="flex items-center gap-4 px-6 py-3 hover:bg-zinc-800/30">
            {/* Confidence */}
            <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold shrink-0 ${
              s.confidence >= 80 ? 'bg-emerald-500/10 text-emerald-400' :
              s.confidence >= 60 ? 'bg-amber-500/10 text-amber-400' :
              'bg-zinc-800 text-zinc-400'
            }`}>
              {Math.round(s.confidence)}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-zinc-200">{s.ruleName}</p>
              <p className="text-xs text-zinc-500 mt-0.5">
                {s.type === 'counterparty' ? 'Controparte' : 'Parola chiave'} — {s.exampleCount} transazioni trovate
              </p>
            </div>

            {/* Tag */}
            <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs bg-zinc-800 text-zinc-300 shrink-0">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.tagColor }} />
              {s.tagName}
            </span>

            {/* Accept */}
            <button
              onClick={() => onAccept(s)}
              disabled={accepting}
              className="flex items-center gap-1 rounded-lg bg-purple-500/10 px-3 py-1.5 text-xs font-medium text-purple-300 hover:bg-purple-500/20 disabled:opacity-50 shrink-0"
            >
              <Plus className="h-3 w-3" />
              Crea
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Rule create/edit modal ─────────────────────────────────

function RuleModal({
  rule,
  tags,
  containers,
  counterparties,
  onClose,
}: {
  rule: SmartRule | null
  tags: Tag[]
  containers: Container[]
  counterparties: Counterparty[]
  onClose: () => void
}) {
  const createRule = useCreateSmartRule()
  const updateRule = useUpdateSmartRule()

  const [form, setForm] = useState({
    name: rule?.name || '',
    descriptionPattern: rule?.descriptionPattern || '',
    counterpartyId: rule?.counterpartyId || '',
    containerId: rule?.containerId || '',
    amountMin: rule?.amountMin || '',
    amountMax: rule?.amountMax || '',
    transactionType: rule?.transactionType || '',
    assignTagId: rule?.assignTagId || '',
    priority: rule?.priority ?? 5,
    isActive: rule?.isActive ?? true,
    autoApply: rule?.autoApply ?? true,
  })

  const inputCls = 'w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 placeholder-zinc-500 focus:border-energy-500 focus:outline-none focus:ring-1 focus:ring-energy-500'
  const labelCls = 'block text-xs font-medium text-zinc-400 mb-1'

  function handleSave() {
    if (!form.name.trim() || !form.assignTagId) return

    const data: Record<string, unknown> = {
      name: form.name,
      assignTagId: form.assignTagId,
      priority: form.priority,
      isActive: form.isActive,
      autoApply: form.autoApply,
      descriptionPattern: form.descriptionPattern || null,
      counterpartyId: form.counterpartyId || null,
      containerId: form.containerId || null,
      amountMin: form.amountMin || null,
      amountMax: form.amountMax || null,
      transactionType: form.transactionType || null,
    }

    if (rule) {
      updateRule.mutate({ id: rule.id, data: data as Partial<SmartRule> }, {
        onSuccess: () => onClose(),
      })
    } else {
      createRule.mutate(data as Partial<SmartRule>, {
        onSuccess: () => onClose(),
      })
    }
  }

  const canSave = form.name.trim() && form.assignTagId
  const isSaving = createRule.isPending || updateRule.isPending

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto rounded-2xl border border-zinc-700 bg-zinc-900 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
          <h2 className="text-lg font-semibold text-zinc-100">
            {rule ? 'Modifica Regola' : 'Nuova Regola'}
          </h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 px-6 py-5">
          {/* Name */}
          <div>
            <label className={labelCls}>Nome regola *</label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="es. Netflix → Abbonamenti"
              className={inputCls}
            />
          </div>

          {/* Assign tag */}
          <div>
            <label className={labelCls}>Assegna Tag *</label>
            <select
              value={form.assignTagId}
              onChange={e => setForm({ ...form, assignTagId: e.target.value })}
              className={inputCls}
            >
              <option value="">— Seleziona tag —</option>
              {tags.filter(t => t.isActive).map(t => (
                <option key={t.id} value={t.id}>{t.name} ({t.type})</option>
              ))}
            </select>
          </div>

          <div className="border-t border-zinc-800 pt-4">
            <p className="text-xs font-semibold text-zinc-400 mb-3 uppercase tracking-wider">Condizioni (AND)</p>

            {/* Description pattern */}
            <div className="mb-3">
              <label className={labelCls}>La descrizione contiene</label>
              <input
                type="text"
                value={form.descriptionPattern}
                onChange={e => setForm({ ...form, descriptionPattern: e.target.value })}
                placeholder="es. netflix, affitto, bolletta gas"
                className={inputCls}
              />
              <p className="text-[10px] text-zinc-600 mt-1">Supporta testo semplice o regex</p>
            </div>

            {/* Counterparty */}
            <div className="mb-3">
              <label className={labelCls}>Controparte</label>
              <select
                value={form.counterpartyId}
                onChange={e => setForm({ ...form, counterpartyId: e.target.value })}
                className={inputCls}
              >
                <option value="">— Qualsiasi —</option>
                {counterparties.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Container */}
            <div className="mb-3">
              <label className={labelCls}>Contenitore</label>
              <select
                value={form.containerId}
                onChange={e => setForm({ ...form, containerId: e.target.value })}
                className={inputCls}
              >
                <option value="">— Qualsiasi —</option>
                {containers.filter(c => c.isActive).map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Transaction type */}
            <div className="mb-3">
              <label className={labelCls}>Tipo transazione</label>
              <select
                value={form.transactionType}
                onChange={e => setForm({ ...form, transactionType: e.target.value })}
                className={inputCls}
              >
                <option value="">— Qualsiasi —</option>
                <option value="income">Entrata</option>
                <option value="expense">Uscita</option>
                <option value="transfer_out">Trasferimento uscita</option>
                <option value="transfer_in">Trasferimento entrata</option>
              </select>
            </div>

            {/* Amount range */}
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className={labelCls}>Importo min</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.amountMin}
                  onChange={e => setForm({ ...form, amountMin: e.target.value })}
                  placeholder="0.00"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Importo max</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.amountMax}
                  onChange={e => setForm({ ...form, amountMax: e.target.value })}
                  placeholder="∞"
                  className={inputCls}
                />
              </div>
            </div>
          </div>

          {/* Priority + toggles */}
          <div className="border-t border-zinc-800 pt-4">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={labelCls}>Priorita'</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={form.priority}
                  onChange={e => setForm({ ...form, priority: parseInt(e.target.value) || 0 })}
                  className={inputCls}
                />
              </div>
              <div className="flex items-end pb-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={e => setForm({ ...form, isActive: e.target.checked })}
                    className="h-4 w-4 rounded border-zinc-600 bg-zinc-800 text-energy-500 focus:ring-energy-500"
                  />
                  <span className="text-xs text-zinc-300">Attiva</span>
                </label>
              </div>
              <div className="flex items-end pb-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.autoApply}
                    onChange={e => setForm({ ...form, autoApply: e.target.checked })}
                    className="h-4 w-4 rounded border-zinc-600 bg-zinc-800 text-energy-500 focus:ring-energy-500"
                  />
                  <span className="text-xs text-zinc-300">Auto su import</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-zinc-800 px-6 py-4 flex justify-end gap-3">
          <button onClick={onClose} className="rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm text-zinc-300 hover:border-zinc-600">
            Annulla
          </button>
          <button
            onClick={handleSave}
            disabled={!canSave || isSaving}
            className="flex items-center gap-2 rounded-lg bg-energy-500 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-energy-400 disabled:opacity-50 transition-colors"
          >
            {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
            {rule ? 'Salva Modifiche' : 'Crea Regola'}
          </button>
        </div>
      </div>
    </div>
  )
}
