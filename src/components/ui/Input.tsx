import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes, type SelectHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

// ─── Shared label + error wrapper ─────────────────────────────────

interface FieldWrapperProps {
  label?: string
  error?: string
  className?: string
  children: React.ReactNode
}

function FieldWrapper({ label, error, className, children }: FieldWrapperProps) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && (
        <label className="text-sm font-medium text-zinc-400">{label}</label>
      )}
      {children}
      {error && (
        <p className="text-xs text-red-400">{error}</p>
      )}
    </div>
  )
}

// ─── Shared input classes ─────────────────────────────────────────

const baseInputClasses =
  'w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 transition-colors focus:border-energy-500 focus:outline-none focus:ring-1 focus:ring-energy-500 disabled:cursor-not-allowed disabled:opacity-50'

// ─── Input ────────────────────────────────────────────────────────

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className, ...props }, ref) => {
    return (
      <FieldWrapper label={label} error={error}>
        <input
          ref={ref}
          className={cn(baseInputClasses, error && 'border-red-500', className)}
          {...props}
        />
      </FieldWrapper>
    )
  },
)

Input.displayName = 'Input'

// ─── Select ───────────────────────────────────────────────────────

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'children'> {
  label?: string
  error?: string
  options: { value: string; label: string }[]
  placeholder?: string
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, placeholder, className, ...props }, ref) => {
    return (
      <FieldWrapper label={label} error={error}>
        <select
          ref={ref}
          className={cn(
            baseInputClasses,
            'appearance-none bg-[length:16px] bg-[right_0.75rem_center] bg-no-repeat',
            'bg-[url("data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2371717a%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22/%3E%3C/svg%3E")]',
            'pr-9',
            error && 'border-red-500',
            className,
          )}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </FieldWrapper>
    )
  },
)

Select.displayName = 'Select'

// ─── Textarea ─────────────────────────────────────────────────────

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, className, ...props }, ref) => {
    return (
      <FieldWrapper label={label} error={error}>
        <textarea
          ref={ref}
          className={cn(
            baseInputClasses,
            'min-h-[80px] resize-y',
            error && 'border-red-500',
            className,
          )}
          {...props}
        />
      </FieldWrapper>
    )
  },
)

Textarea.displayName = 'Textarea'
