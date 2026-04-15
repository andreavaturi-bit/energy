import { type ReactNode, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import { X, Loader2 } from 'lucide-react'
import { useEffect, useCallback } from 'react'
import { cn } from '@/lib/utils'

type Size = 'sm' | 'md' | 'lg' | 'xl' | '2xl'

interface FormModalProps {
  title: string
  onClose: () => void
  onSubmit: () => void
  children: ReactNode
  size?: Size
  submitLabel?: string
  cancelLabel?: string
  submitDisabled?: boolean
  isSubmitting?: boolean
  submittingLabel?: string
  /** Nasconde il footer (per modali che hanno azioni custom nel body) */
  hideFooter?: boolean
}

const sizeClasses: Record<Size, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
}

/**
 * Modale standard per form create/edit.
 *
 * Include:
 * - overlay con click-to-close e blur
 * - header con titolo e bottone X
 * - body scrollabile con i campi (children)
 * - footer con bottone Annulla + bottone Submit (con spinner durante isSubmitting)
 * - escape per chiudere, blocco scroll body
 * - submit via form (Enter sul primo input lo attiva)
 */
export function FormModal({
  title,
  onClose,
  onSubmit,
  children,
  size = 'lg',
  submitLabel = 'Salva',
  cancelLabel = 'Annulla',
  submitDisabled = false,
  isSubmitting = false,
  submittingLabel = 'Salvataggio...',
  hideFooter = false,
}: FormModalProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) onClose()
    },
    [onClose, isSubmitting],
  )

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [handleKeyDown])

  function handleFormSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (submitDisabled || isSubmitting) return
    onSubmit()
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={() => !isSubmitting && onClose()}
      />
      <form
        onSubmit={handleFormSubmit}
        className={cn(
          'relative z-10 w-full mx-4 flex flex-col max-h-[90vh]',
          'rounded-2xl border border-zinc-700 bg-zinc-900 shadow-2xl',
          'animate-in fade-in zoom-in-95 duration-200',
          sizeClasses[size],
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
          <h2 className="text-lg font-semibold text-zinc-100">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-md p-1 text-zinc-400 hover:text-zinc-200 disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">{children}</div>

        {/* Footer */}
        {!hideFooter && (
          <div className="flex items-center justify-end gap-3 border-t border-zinc-800 px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-700 transition-colors disabled:opacity-50"
            >
              {cancelLabel}
            </button>
            <button
              type="submit"
              disabled={submitDisabled || isSubmitting}
              className="rounded-lg bg-energy-500 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-energy-400 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {submittingLabel}
                </span>
              ) : (
                submitLabel
              )}
            </button>
          </div>
        )}
      </form>
    </div>,
    document.body,
  )
}
