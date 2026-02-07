import type { LucideIcon } from 'lucide-react'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StatCardProps {
  title: string
  value: string
  subtitle?: string
  icon: LucideIcon
  trend?: { value: number; label: string }
  className?: string
}

export function StatCard({ title, value, subtitle, icon: Icon, trend, className }: StatCardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-zinc-800 bg-zinc-900 p-5',
        className,
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-energy-500/15">
          <Icon className="h-5 w-5 text-energy-500" />
        </div>

        {trend && (
          <div
            className={cn(
              'flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
              trend.value >= 0
                ? 'bg-green-500/10 text-green-400'
                : 'bg-red-500/10 text-red-400',
            )}
          >
            {trend.value >= 0 ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            <span>{trend.value >= 0 ? '+' : ''}{trend.value}%</span>
          </div>
        )}
      </div>

      <div className="mt-4">
        <p className="text-sm text-zinc-400">{title}</p>
        <p className="mt-1 text-2xl font-bold text-zinc-100">{value}</p>
        {subtitle && (
          <p className="mt-1 text-xs text-zinc-500">{subtitle}</p>
        )}
        {trend && (
          <p className="mt-1 text-xs text-zinc-500">{trend.label}</p>
        )}
      </div>
    </div>
  )
}
