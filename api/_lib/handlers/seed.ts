import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getSupabase, ok, badRequest } from '../supabase.js'

const NOTION_AREAS: Record<string, string[]> = {
  'Casa e dintorni': ['Affitto','Bollette','Box','Pulizie casalinghe','Lavori, manutenzione e riparazioni','Mobili, arredamenti e simili','Elettrodomestici'],
  'Mangiare e dintorni': ['Panetteria','Bar','Pizzeria','Torte, dolci, pasticcini, etc','Sushi','Ristorante','Supermercato, mercato o spesa','Home delivery','Fruttivendolo, mercato, etc','Pub, locali, drink, etc','Fast food e dintorni','Acqua'],
  'Figli, famiglia e amici': ['Assicurazioni','Giocattoli','Vacanze e villeggiature','Regali','Cancelleria','Massimo','Sarah','Samuele','Valeria','Scuola','Nonna Paola','Attività varie bambini (sport, extrascolastiche, etc)','Baby Sitter'],
  'Trasporti e spostamenti vari': ['Riparazione auto','Lavaggio auto','Noleggio Auto','Mezzi pubblici','Monopattini','Parcheggi','Hotel','Carburante','Voli aerei','Treni','Car sharing','Taxi','Pedaggi autostradali','Additivi x auto e simili','Rata Automobile'],
  'Abbigliamento e dintorni': ['Abbigliamento e vestiti','Scarpe','Attrezzature varie','Tintoria'],
  'Tech e hardware': ['Accessori e tecnologia','Telefonia'],
  'Formazione e crescita': ['Corsi','Newsletter e membership finanziarie','Libri'],
  'Healthcare & esthetics': ['Visite mediche','Estetista','Farmacia e terapie varie','Barbiere','Fisioterapia, osteopatia e massaggi','Igiene e cura della persona','Integratori','Capelli'],
  'Spese aziendali': ['Lavoro online (UpWork, Fiverr, etc)','Spese aziendali x Kairòs','Spese aziendali x Shuffle','Finanziamento Soci'],
  'Sport e fitness': ['Fitness, palestra e Calisthenics','Tennis, ping pong, padel e simili','Sci, snowboard, snowskates, etc'],
  'Media': ['Film','Musica','Abbonamenti TV'],
  'App e software': ['Software e App','Domini, hosting e VPS'],
  'Divertimento e hobby': ['Feste','Teatro, spettacoli e simili','Piscine, funivie, parchi divertimenti e simili','Cinema','Hobby'],
  'Contributi': ['F24','Tasse','Beneficenza'],
  'Errori e inefficienze': ['Spese legali','Multe'],
  'Costi finanziari': ['Commercialista','Spese bancarie e commissioni','Documenti, marche da bollo, etc'],
  'Varie & eventuali': ['Costi di spedizione','Acquisti online','Boh!'],
  'Pendenze e compensazioni': ['Prestito','Compensazioni, residui, restituzioni e movimenti vari'],
}

const NOTION_UNASSIGNED_CATEGORIES = ['Spese aziendali x Gruppo VS','Spese x Coreografia','Viaggi, gite, escursioni, etc','Pocket Money']

const NOTION_AREA_COLORS: Record<string, string> = {
  'Casa e dintorni': '#3b82f6',
  'Mangiare e dintorni': '#f97316',
  'Figli, famiglia e amici': '#ec4899',
  'Trasporti e spostamenti vari': '#6366f1',
  'Abbigliamento e dintorni': '#8b5cf6',
  'Tech e hardware': '#06b6d4',
  'Formazione e crescita': '#14b8a6',
  'Healthcare & esthetics': '#ef4444',
  'Spese aziendali': '#64748b',
  'Sport e fitness': '#22c55e',
  'Media': '#a855f7',
  'App e software': '#0ea5e9',
  'Divertimento e hobby': '#f59e0b',
  'Contributi': '#dc2626',
  'Errori e inefficienze': '#b91c1c',
  'Costi finanziari': '#78716c',
  'Varie & eventuali': '#9ca3af',
  'Pendenze e compensazioni': '#d97706',
}

const NOTION_COUNTERPARTIES = [
  'Ace of Diamonds SRL','Alessandro Liberatore','Alessia Tornaghi','Alex Zlatkov','Alexandra Odman',
  'Alexia Paganini','Ana Sofia Beschea','Antena TV','Awe Sport','Black SRL','Brunico',
  'Bulgaria - Club Velichkova','CUS Torino','Chiara Salducco','Cliente VS/Opz',
  'Club di pattinaggio Bellinzona','Comitato Regionale Veneto','Corona Brașov','Danilo Gelao',
  'Daria Troi','David Cipolleschi','Davide Biocchi',
  'Deutsche Eislauf-Union | Federazione tedesca','Diana Lapierre','Dreaming Ice ASD',
  'EFFENNE SRL','Eis Club Gardena','Elisa Brunico','FISG','Giada Romiti','Gianluca De Risi',
  'Gioia Fiori','INPS','Ice Angels - Feltre','Ice Club Arau (Annette)','Ice Emotion',
  'Il Gatto e la Volpe nel web','Irene D\'Auria','Irma Caldara e Riccardo Maglio',
  'Julia Grabowski','Kai Jagoda','Kairòs SRLS','Leasys','Liri','Louis Weissert',
  'Luca Fuenfert','Lukas Britschgi','Léa Serna','MBA Mutua','Mamma','Marco Viotto',
  'Massimo','Milla Ruud & Nikolaj Majorov','Mirko Castignani','Nicole Schott','Noah Bodenstein',
  'POLSKI ZWIĄZEK | Federazione polacca','Papà','Pietro Mazzetti','Ramona Andreea Voicu',
  'Rotelle','Scacco Matto SRLS','Seregno 2012','Shuffle SRL','Simo','Stefano Russo',
  'Unfair Advantage SRL','Vale','Valentina Russo','Varie ed eventuali','Zio Gigio','iceDOME',
]

const NOTION_ACTIVITIES = [
  { name: 'Performance', ambito: 'PATTINAGGIO' },
  { name: 'Direzione artistica', ambito: 'PATTINAGGIO' },
  { name: 'Coreografia/Insegnamento', ambito: 'PATTINAGGIO' },
  { name: 'Vantaggio Sleale / Opzionetika', ambito: 'FINANZA' },
  { name: 'Ghiaccio_Spettacolo', ambito: 'PATTINAGGIO' },
  { name: 'Speakeraggio e Presentazione', ambito: 'PATTINAGGIO' },
  { name: 'Locali', ambito: 'ALTRO' },
  { name: 'Restituzione prestiti, anticipi e rimborsi', ambito: 'ALTRO' },
  { name: 'Assicurazioni', ambito: 'ALTRO' },
  { name: 'Music editing', ambito: 'PATTINAGGIO' },
  { name: 'Assistenza', ambito: 'ALTRO' },
]

export async function handleSeed(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return badRequest(res, 'Use POST to seed data')

  const sb = getSupabase()
  const results: string[] = []

  // 1. Delete existing tags that are NOT linked to any transaction
  const { data: usedTagIds } = await sb.from('transaction_tags').select('tag_id')
  const usedSet = new Set((usedTagIds || []).map((r: { tag_id: string }) => r.tag_id))

  const { data: existingTags } = await sb.from('tags').select('id, name')
  const tagsToDelete = (existingTags || []).filter((t: { id: string }) => !usedSet.has(t.id))
  if (tagsToDelete.length > 0) {
    const ids = tagsToDelete.map((t: { id: string }) => t.id)
    // Also clean recurrence_tags
    await sb.from('recurrence_tags').delete().in('tag_id', ids)
    await sb.from('tags').delete().in('id', ids)
    results.push(`Deleted ${tagsToDelete.length} unused tags`)
  }

  // 2. Create Area tags (type = 'category', parent)
  const areaIdMap = new Map<string, string>()

  for (const [areaName, color] of Object.entries(NOTION_AREA_COLORS)) {
    // Check if already exists
    const { data: existing } = await sb.from('tags').select('id').eq('name', areaName).eq('type', 'category').limit(1)
    if (existing && existing.length > 0) {
      areaIdMap.set(areaName, existing[0].id)
      continue
    }
    const { data: created, error } = await sb.from('tags').insert({
      name: areaName,
      type: 'category',
      color,
      is_active: true,
    }).select('id').single()
    if (error) {
      results.push(`Error creating area "${areaName}": ${error.message}`)
    } else if (created) {
      areaIdMap.set(areaName, created.id)
    }
  }
  results.push(`Created/found ${areaIdMap.size} areas`)

  // 3. Create Category tags (type = 'purpose', with parentId)
  let catCount = 0
  for (const [areaName, categories] of Object.entries(NOTION_AREAS)) {
    const parentId = areaIdMap.get(areaName) || null
    for (const catName of categories) {
      const { data: existing } = await sb.from('tags').select('id').eq('name', catName).eq('type', 'purpose').limit(1)
      if (existing && existing.length > 0) continue
      const { error } = await sb.from('tags').insert({
        name: catName,
        type: 'purpose',
        parent_id: parentId,
        is_active: true,
      })
      if (!error) catCount++
      else results.push(`Error creating cat "${catName}": ${error.message}`)
    }
  }

  // Unassigned categories (no parent area)
  for (const catName of NOTION_UNASSIGNED_CATEGORIES) {
    const { data: existing } = await sb.from('tags').select('id').eq('name', catName).eq('type', 'purpose').limit(1)
    if (existing && existing.length > 0) continue
    const { error } = await sb.from('tags').insert({ name: catName, type: 'purpose', is_active: true })
    if (!error) catCount++
  }
  results.push(`Created ${catCount} categories`)

  // 4. Create Activity tags (type = 'scope')
  let actCount = 0
  for (const act of NOTION_ACTIVITIES) {
    const { data: existing } = await sb.from('tags').select('id').eq('name', act.name).eq('type', 'scope').limit(1)
    if (existing && existing.length > 0) continue
    const { error } = await sb.from('tags').insert({
      name: act.name,
      type: 'scope',
      is_active: true,
    })
    if (!error) actCount++
  }
  results.push(`Created ${actCount} activities (scope tags)`)

  // 5. Delete existing counterparties that are NOT linked to any transaction
  const { data: usedCpIds } = await sb.from('transactions').select('counterparty_id').not('counterparty_id', 'is', null)
  const usedCpSet = new Set((usedCpIds || []).map((r: { counterparty_id: string }) => r.counterparty_id))
  const { data: existingCps } = await sb.from('counterparties').select('id, name')
  const cpsToDelete = (existingCps || []).filter((c: { id: string }) => !usedCpSet.has(c.id))
  if (cpsToDelete.length > 0) {
    await sb.from('counterparties').delete().in('id', cpsToDelete.map((c: { id: string }) => c.id))
    results.push(`Deleted ${cpsToDelete.length} unused counterparties`)
  }

  // 6. Create counterparties from Notion data
  let cpCount = 0
  for (const name of NOTION_COUNTERPARTIES) {
    const { data: existing } = await sb.from('counterparties').select('id').eq('name', name).limit(1)
    if (existing && existing.length > 0) continue
    const { error } = await sb.from('counterparties').insert({ name, is_active: true })
    if (!error) cpCount++
  }
  results.push(`Created ${cpCount} counterparties`)

  return ok(res, { message: 'Seed completed', results })
}

