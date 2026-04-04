-- Migration: assign parent_id to existing categories and purposes
-- that were created without a parent-child relationship.
-- This links each category/purpose to its correct scope.

-- Step 1: Link categories to Personale scope
UPDATE "tags" SET "parent_id" = (SELECT "id" FROM "tags" WHERE "name" = 'Personale' AND "type" = 'scope' LIMIT 1)
WHERE "parent_id" IS NULL AND "type" = 'category' AND "name" IN (
  'Affitto', 'Box', 'Bollette', 'Acqua', 'Spesa alimentare',
  'Automobile', 'Telepass', 'Assicurazioni', 'Carta di credito',
  'Palestra', 'Capelli', 'Beneficenza', 'Whoop', 'Commercialista personale',
  'TARI', 'F24 - IVA', 'F24 - IRPEF', 'F24 - Cedolini', 'Multe',
  'Netflix', 'Disney+', 'Amazon Prime', 'YouTube', 'Spotify',
  'Notion', 'ChatGPT', 'Claude', 'Google Premium',
  'VPN/VPS', 'Domini', 'Software e abbonamenti'
);

-- Step 2: Link categories to Familiare scope
UPDATE "tags" SET "parent_id" = (SELECT "id" FROM "tags" WHERE "name" = 'Familiare' AND "type" = 'scope' LIMIT 1)
WHERE "parent_id" IS NULL AND "type" = 'category' AND "name" IN (
  'Scuola', 'Milano Ristorazione', 'Baby Sitter', 'Pulizie casa',
  'Assicurazioni familiari', 'Vacanze e viaggi', 'Regali',
  'Comunita'' ebraica', 'Attivita'' familiari e sportive'
);

-- Step 3: Link categories to Aziendale Kairos scope
UPDATE "tags" SET "parent_id" = (SELECT "id" FROM "tags" WHERE "name" = 'Aziendale Kairos' AND "type" = 'scope' LIMIT 1)
WHERE "parent_id" IS NULL AND "type" = 'category' AND "name" IN (
  'Commercialista aziendale', 'Assicurazioni professionali',
  'Collaboratori', 'Ufficio', 'PEC', 'Fatturazione elettronica'
);

-- Step 4: Link categories to VS / Opzionetika scope
UPDATE "tags" SET "parent_id" = (SELECT "id" FROM "tags" WHERE "name" = 'VS / Opzionetika' AND "type" = 'scope' LIMIT 1)
WHERE "parent_id" IS NULL AND "type" = 'category' AND "name" IN (
  'TradingView', 'Corsi VS / Opzionetika', 'Earnings (trading)'
);

-- Step 5: Link categories to Ghiaccio Spettacolo scope
UPDATE "tags" SET "parent_id" = (SELECT "id" FROM "tags" WHERE "name" = 'Ghiaccio Spettacolo' AND "type" = 'scope' LIMIT 1)
WHERE "parent_id" IS NULL AND "type" = 'category' AND "name" IN (
  'Coreografia', 'Insegnamento', 'Formazione / Speaker'
);

-- Step 6: Link categories to Ace of Diamonds scope
UPDATE "tags" SET "parent_id" = (SELECT "id" FROM "tags" WHERE "name" = 'Ace of Diamonds' AND "type" = 'scope' LIMIT 1)
WHERE "parent_id" IS NULL AND "type" = 'category' AND "name" = 'Consulenza';

-- Step 7: Link purposes to their scopes
UPDATE "tags" SET "parent_id" = (SELECT "id" FROM "tags" WHERE "name" = 'VS / Opzionetika' AND "type" = 'scope' LIMIT 1)
WHERE "parent_id" IS NULL AND "type" = 'purpose' AND "name" = 'Da dividere con Mirko';

UPDATE "tags" SET "parent_id" = (SELECT "id" FROM "tags" WHERE "name" = 'Aziendale Kairos' AND "type" = 'scope' LIMIT 1)
WHERE "parent_id" IS NULL AND "type" = 'purpose' AND "name" IN ('Versamento c/capitale', 'Scaricabile IVA');

UPDATE "tags" SET "parent_id" = (SELECT "id" FROM "tags" WHERE "name" = 'Familiare' AND "type" = 'scope' LIMIT 1)
WHERE "parent_id" IS NULL AND "type" = 'purpose' AND "name" IN ('Per conto parenti', 'Accantonamento figli');
