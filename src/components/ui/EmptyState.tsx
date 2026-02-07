import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  action?: { label: string; onClick: () => void }
  className?: string
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-16 text-center', className)}>
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-zinc-800">
        <Icon className="h-7 w-7 text-zinc-600" />
      </div>
      <h3 className="mt-4 text-base font-semibold text-zinc-300">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-zinc-500">{description}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="mt-5 rounded-lg bg-energy-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-energy-600"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
