import {
  Plus,
  User,
  Building2,
  Search,
  LayoutGrid,
  List,
  MoreHorizontal,
} from 'lucide-react'

// Types reference: Subject, SubjectType, SubjectRole from @/types

// Placeholder subjects
const mockSubjects = [
  {
    id: '1',
    type: 'person' as const,
    name: 'Andrea V.',
    role: 'Titolare',
    taxId: 'VRDNDR85...',
    country: 'IT',
    containers: 5,
    isActive: true,
    notes: 'Soggetto principale',
  },
  {
    id: '2',
    type: 'person' as const,
    name: 'Laura M.',
    role: 'Familiare',
    taxId: null,
    country: 'IT',
    containers: 2,
    isActive: true,
    notes: 'Partner',
  },
  {
    id: '3',
    type: 'company' as const,
    name: 'Kairos SRLS',
    role: 'Titolare',
    taxId: '12345678901',
    country: 'IT',
    containers: 1,
    isActive: true,
    notes: 'Societa\' di consulenza',
  },
  {
    id: '4',
    type: 'company' as const,
    name: 'Shuffle SSRL',
    role: 'Partner',
    taxId: '98765432101',
    country: 'IT',
    containers: 1,
    isActive: true,
    notes: 'Ghiaccio Spettacolo',
  },
  {
    id: '5',
    type: 'company' as const,
    name: 'LTD UK',
    role: 'Titolare',
    taxId: null,
    country: 'GB',
    containers: 1,
    isActive: true,
    notes: 'Societa\' UK',
  },
  {
    id: '6',
    type: 'person' as const,
    name: 'Mirko T.',
    role: 'Partner',
    taxId: null,
    country: 'IT',
    containers: 0,
    isActive: true,
    notes: 'VS/Opzionetika',
  },
]

const roleColors: Record<string, string> = {
  Titolare: 'bg-energy-500/10 text-energy-400',
  Familiare: 'bg-blue-500/10 text-blue-400',
  Partner: 'bg-purple-500/10 text-purple-400',
  Altro: 'bg-zinc-500/10 text-zinc-400',
}

export function Subjects() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Soggetti</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Gestione persone fisiche e societa' collegate alle tue finanze
          </p>
        </div>
        <button className="flex items-center gap-2 rounded-lg bg-energy-500 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-energy-400 transition-colors">
          <Plus className="h-4 w-4" />
          Nuovo Soggetto
        </button>
      </div>

      {/* Search and view toggle */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Cerca soggetti..."
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 py-2 pl-10 pr-4 text-sm text-zinc-200 placeholder-zinc-500 focus:border-energy-500 focus:outline-none focus:ring-1 focus:ring-energy-500"
          />
        </div>
        <div className="flex rounded-lg border border-zinc-700 bg-zinc-800">
          <button className="rounded-l-lg bg-zinc-700 p-2 text-zinc-200">
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button className="rounded-r-lg p-2 text-zinc-500 hover:text-zinc-300">
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Subjects sections */}
      <div className="space-y-8">
        {/* Persone fisiche */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <User className="h-5 w-5 text-zinc-400" />
            <h2 className="text-lg font-semibold text-zinc-200">Persone Fisiche</h2>
            <span className="ml-1 rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-500">
              {mockSubjects.filter((s) => s.type === 'person').length}
            </span>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {mockSubjects
              .filter((s) => s.type === 'person')
              .map((subject) => (
                <div
                  key={subject.id}
                  className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 hover:border-zinc-700 transition-colors cursor-pointer"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800">
                        <User className="h-5 w-5 text-zinc-400" />
                      </div>
                      <div>
                        <p className="font-semibold text-zinc-100">{subject.name}</p>
                        <p className="text-xs text-zinc-500">{subject.country}</p>
                      </div>
                    </div>
                    <button className="rounded-md p-1 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300">
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-zinc-500">Ruolo</span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${roleColors[subject.role] || roleColors['Altro']}`}>
                        {subject.role}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-zinc-500">Contenitori</span>
                      <span className="text-xs text-zinc-300">{subject.containers}</span>
                    </div>
                    {subject.taxId && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-zinc-500">Cod. Fiscale</span>
                        <span className="text-xs text-zinc-400 font-mono">{subject.taxId}</span>
                      </div>
                    )}
                    {subject.notes && (
                      <p className="text-xs text-zinc-500 italic pt-1 border-t border-zinc-800">
                        {subject.notes}
                      </p>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Societa' */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Building2 className="h-5 w-5 text-zinc-400" />
            <h2 className="text-lg font-semibold text-zinc-200">Societa'</h2>
            <span className="ml-1 rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-500">
              {mockSubjects.filter((s) => s.type === 'company').length}
            </span>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {mockSubjects
              .filter((s) => s.type === 'company')
              .map((subject) => (
                <div
                  key={subject.id}
                  className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 hover:border-zinc-700 transition-colors cursor-pointer"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800">
                        <Building2 className="h-5 w-5 text-zinc-400" />
                      </div>
                      <div>
                        <p className="font-semibold text-zinc-100">{subject.name}</p>
                        <p className="text-xs text-zinc-500">{subject.country}</p>
                      </div>
                    </div>
                    <button className="rounded-md p-1 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300">
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-zinc-500">Ruolo</span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${roleColors[subject.role] || roleColors['Altro']}`}>
                        {subject.role}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-zinc-500">Contenitori</span>
                      <span className="text-xs text-zinc-300">{subject.containers}</span>
                    </div>
                    {subject.taxId && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-zinc-500">P. IVA</span>
                        <span className="text-xs text-zinc-400 font-mono">{subject.taxId}</span>
                      </div>
                    )}
                    {subject.notes && (
                      <p className="text-xs text-zinc-500 italic pt-1 border-t border-zinc-800">
                        {subject.notes}
                      </p>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  )
}
