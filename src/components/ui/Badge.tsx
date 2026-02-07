import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface BadgeProps {
  children: ReactNode
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'outline'
  size?: 'sm' | 'md'
  color?: string
  className?: string
}

const variantClasses: Record<NonNullable<BadgeProps['variant']>, string> = {
  default: 'bg-zinc-700/50 text-zinc-300',
  success: 'bg-green-500/15 text-green-400',
  warning: 'bg-amber-500/15 text-amber-400',
  danger: 'bg-red-500/15 text-red-400',
  info: 'bg-blue-500/15 text-blue-400',
  outline: 'border border-zinc-700 text-zinc-400 bg-transparent',
}

const sizeClasses: Record<NonNullable<BadgeProps['size']>, string> = {
  sm: 'px-1.5 py-0.5 text-[10px]',
  md: 'px-2 py-0.5 text-xs',
}

export function Badge({
  children,
  variant = 'default',
  size = 'md',
  color,
  className,
}: BadgeProps) {
  // When a custom color is provided, use inline styles for bg + text
  if (color) {
    return (
      <span
        className={cn(
          'inline-flex items-center rounded-full font-medium leading-tight',
          sizeClasses[size],
          className,
        )}
        style={{
          backgroundColor: `${color}20`,
          color: color,
        }}
      >
        {children}
      </span>
    )
  }

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-medium leading-tight',
        sizeClasses[size],
        variantClasses[variant],
        className,
      )}
    >
      {children}
    </span>
  )
}
