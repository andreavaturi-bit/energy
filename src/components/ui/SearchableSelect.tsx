import { useState, useRef, useEffect, useCallback } from 'react'
import { ChevronDown, X, Search, Check } from 'lucide-react'

// ── Types ───────────────────────────────────────────────────

export interface SelectOption {
  value: string
  label: string
  color?: string | null
  icon?: React.ReactNode
  group?: string
}

interface BaseProps {
  options: SelectOption[]
  placeholder?: string
  disabled?: boolean
  className?: string
}

// ── Single select (combobox with search) ────────────────────

interface SearchableSelectProps extends BaseProps {
  value: string
  onChange: (value: string) => void
  allowEmpty?: boolean
  emptyLabel?: string
}

export function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = 'Seleziona...',
  allowEmpty = false,
  emptyLabel = '— Nessuno —',
  disabled = false,
  className = '',
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const filtered = search
    ? options.filter((o) => o.label.toLowerCase().includes(search.toLowerCase()))
    : options

  const selected = options.find((o) => o.value === value)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus()
    }
  }, [open])

  function handleSelect(val: string) {
    onChange(val)
    setOpen(false)
    setSearch('')
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-left focus:border-energy-500 focus:outline-none focus:ring-1 focus:ring-energy-500 disabled:opacity-50"
      >
        {selected ? (
          <span className="flex items-center gap-2 flex-1 min-w-0 truncate text-zinc-200">
            {selected.color && (
              <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: selected.color }} />
            )}
            {selected.icon}
            {selected.label}
          </span>
        ) : (
          <span className="flex-1 text-zinc-500 truncate">{placeholder}</span>
        )}
        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-800 shadow-xl max-h-60 overflow-hidden">
          {/* Search input */}
          <div className="flex items-center gap-2 border-b border-zinc-700 px-3 py-2">
            <Search className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cerca..."
              className="flex-1 bg-transparent text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none"
            />
            {search && (
              <button type="button" onClick={() => setSearch('')} className="text-zinc-500 hover:text-zinc-300">
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          <div className="overflow-y-auto max-h-48">
            {allowEmpty && (
              <button
                type="button"
                onClick={() => handleSelect('')}
                className={`flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-zinc-700 transition-colors ${
                  !value ? 'text-energy-400' : 'text-zinc-400'
                }`}
              >
                {!value && <Check className="h-3.5 w-3.5 shrink-0" />}
                <span className={!value ? '' : 'pl-5'}>{emptyLabel}</span>
              </button>
            )}
            {filtered.length === 0 && (
              <div className="px-3 py-4 text-center text-xs text-zinc-500">Nessun risultato</div>
            )}
            {filtered.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => handleSelect(option.value)}
                className={`flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-zinc-700 transition-colors ${
                  value === option.value ? 'text-energy-400' : 'text-zinc-200'
                }`}
              >
                {value === option.value ? (
                  <Check className="h-3.5 w-3.5 shrink-0" />
                ) : (
                  <span className="w-3.5 shrink-0" />
                )}
                {option.color && (
                  <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: option.color }} />
                )}
                {option.icon}
                <span className="truncate">{option.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Multi-select (combobox with search + chips) ─────────────

interface SearchableMultiSelectProps extends BaseProps {
  value: string[]
  onChange: (value: string[]) => void
  maxDisplay?: number
}

export function SearchableMultiSelect({
  value,
  onChange,
  options,
  placeholder = 'Seleziona...',
  disabled = false,
  className = '',
  maxDisplay = 3,
}: SearchableMultiSelectProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const filtered = search
    ? options.filter((o) => o.label.toLowerCase().includes(search.toLowerCase()))
    : options

  const selectedOptions = value.map((v) => options.find((o) => o.value === v)).filter(Boolean) as SelectOption[]

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus()
    }
  }, [open])

  const toggle = useCallback(
    (val: string) => {
      onChange(value.includes(val) ? value.filter((v) => v !== val) : [...value, val])
    },
    [value, onChange],
  )

  function removeTag(val: string, e: React.MouseEvent) {
    e.stopPropagation()
    onChange(value.filter((v) => v !== val))
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-left focus:border-energy-500 focus:outline-none focus:ring-1 focus:ring-energy-500 disabled:opacity-50 min-h-[38px] flex-wrap"
      >
        {selectedOptions.length > 0 ? (
          <>
            {selectedOptions.slice(0, maxDisplay).map((opt) => (
              <span
                key={opt.value}
                className="inline-flex items-center gap-1 rounded-full bg-zinc-700 px-2 py-0.5 text-xs text-zinc-200"
              >
                {opt.color && (
                  <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: opt.color }} />
                )}
                <span className="truncate max-w-[80px]">{opt.label}</span>
                <button
                  type="button"
                  onClick={(e) => removeTag(opt.value, e)}
                  className="text-zinc-400 hover:text-zinc-200 ml-0.5"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </span>
            ))}
            {selectedOptions.length > maxDisplay && (
              <span className="text-xs text-zinc-500">+{selectedOptions.length - maxDisplay}</span>
            )}
          </>
        ) : (
          <span className="flex-1 text-zinc-500">{placeholder}</span>
        )}
        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-zinc-500 ml-auto" />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-800 shadow-xl max-h-60 overflow-hidden">
          <div className="flex items-center gap-2 border-b border-zinc-700 px-3 py-2">
            <Search className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cerca..."
              className="flex-1 bg-transparent text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none"
            />
            {search && (
              <button type="button" onClick={() => setSearch('')} className="text-zinc-500 hover:text-zinc-300">
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          <div className="overflow-y-auto max-h-48">
            {filtered.length === 0 && (
              <div className="px-3 py-4 text-center text-xs text-zinc-500">Nessun risultato</div>
            )}
            {filtered.map((option) => {
              const isSelected = value.includes(option.value)
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => toggle(option.value)}
                  className={`flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-zinc-700 transition-colors ${
                    isSelected ? 'text-energy-400' : 'text-zinc-200'
                  }`}
                >
                  <span className={`flex h-4 w-4 items-center justify-center rounded border shrink-0 ${
                    isSelected ? 'border-energy-500 bg-energy-500/20' : 'border-zinc-600'
                  }`}>
                    {isSelected && <Check className="h-3 w-3" />}
                  </span>
                  {option.color && (
                    <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: option.color }} />
                  )}
                  {option.icon}
                  <span className="truncate">{option.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
