import { Routes, Route, Navigate } from 'react-router-dom'
import { AppLayout } from './components/layout/AppLayout'
import { Dashboard } from './pages/Dashboard'
import { Transactions } from './pages/Transactions'
import { Containers } from './pages/Containers'
import { Subjects } from './pages/Subjects'
import { Budget } from './pages/Budget'
import { Recurrences } from './pages/Recurrences'
import { ImportData } from './pages/ImportData'
import { Statistics } from './pages/Statistics'
import { Projections } from './pages/Projections'
import { Pendenze } from './pages/Pendenze'
import { Counterparties } from './pages/Counterparties'
import { Settings } from './pages/Settings'
import { SmartRules } from './pages/SmartRules'

export function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/transactions" element={<Transactions />} />
        <Route path="/containers" element={<Containers />} />
        <Route path="/subjects" element={<Subjects />} />
        <Route path="/counterparties" element={<Counterparties />} />
        <Route path="/budget" element={<Budget />} />
        <Route path="/recurrences" element={<Recurrences />} />
        <Route path="/pendenze" element={<Pendenze />} />
        <Route path="/projections" element={<Projections />} />
        <Route path="/import" element={<ImportData />} />
        <Route path="/statistics" element={<Statistics />} />
        <Route path="/smart-rules" element={<SmartRules />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
