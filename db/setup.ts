/**
 * €N€RGY - Database Setup Script
 *
 * Esegue in sequenza:
 * 1. Push dello schema (crea tutte le tabelle)
 * 2. Seed con i dati reali
 *
 * Eseguire con: npm run db:setup
 */

import { execSync } from 'child_process'

console.log('╔════════════════════════════════════════╗')
console.log('║     €N€RGY - Database Setup            ║')
console.log('║     Il denaro e\' energia               ║')
console.log('╚════════════════════════════════════════╝')
console.log()

try {
  // Step 1: Push schema
  console.log('STEP 1: Push dello schema al database...')
  console.log('─────────────────────────────────────────')
  execSync('npx drizzle-kit push --force', { stdio: 'inherit' })
  console.log()

  // Step 2: Seed
  console.log('STEP 2: Seed con dati reali...')
  console.log('─────────────────────────────────────────')
  execSync('npx tsx db/seed.ts', { stdio: 'inherit' })
  console.log()

  console.log('╔════════════════════════════════════════╗')
  console.log('║     SETUP COMPLETATO CON SUCCESSO!     ║')
  console.log('╚════════════════════════════════════════╝')
} catch (error) {
  console.error('\nErrore durante il setup:', error)
  process.exit(1)
}
