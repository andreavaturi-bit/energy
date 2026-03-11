import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  ArrowLeftRight,
  Wallet,
  Users,
  Contact,
  Tag,
  PieChart,
  Calendar,
  Clock,
  Upload,
  BarChart3,
  TrendingUp,
  Settings,
  X,
  Zap,
  Wand2,
} from 'lucide-react'

interface SidebarProps {
  onClose: () => void
}

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/transactions', icon: ArrowLeftRight, label: 'Transazioni' },
  { to: '/containers', icon: Wallet, label: 'Contenitori' },
  { to: '/subjects', icon: Users, label: 'Soggetti' },
  { to: '/counterparties', icon: Contact, label: 'Controparti' },
  { to: '/tags', icon: Tag, label: 'Tag' },
  { to: '/budget', icon: PieChart, label: 'Budget' },
  { to: '/recurrences', icon: Calendar, label: 'Ricorrenze' },
  { to: '/pendenze', icon: Clock, label: 'Pendenze' },
  { to: '/projections', icon: TrendingUp, label: 'Proiezioni' },
  { to: '/import', icon: Upload, label: 'Import' },
  { to: '/statistics', icon: BarChart3, label: 'Statistiche' },
  { to: '/smart-rules', icon: Wand2, label: 'Regole Smart' },
  { to: '/settings', icon: Settings, label: 'Impostazioni' },
]

export function Sidebar({ onClose }: SidebarProps) {
  return (
    <div className="flex h-full flex-col bg-zinc-900 border-r border-zinc-800">
      {/* Logo */}
      <div className="flex h-14 items-center justify-between px-4 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-energy-500" />
          <h1 className="text-lg font-bold tracking-tight">
            EN<span className="text-energy-500">€</span>RGY
          </h1>
        </div>
        <button
          onClick={onClose}
          className="rounded-md p-1 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 lg:hidden"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            onClick={onClose}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-energy-500/10 text-energy-400'
                  : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200',
              )
            }
          >
            <item.icon className="h-4 w-4 shrink-0" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-zinc-800 px-4 py-3">
        <p className="text-xs text-zinc-600">Il denaro e' energia</p>
      </div>
    </div>
  )
}
