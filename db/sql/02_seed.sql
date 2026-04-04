-- ============================================================
-- EN-RGY Database Seed Data
-- Converted from db/seed.ts
-- All IDs use gen_random_uuid()
-- Foreign keys use subqueries to resolve references
-- ============================================================

-- ============================================================
-- 1. SUBJECTS (11 records)
-- ============================================================

-- Subjects WITHOUT parent references (insert first)

INSERT INTO "subjects" ("id", "type", "name", "country", "role", "notes", "is_active")
VALUES (gen_random_uuid(), 'person', 'Andrea Vaturi', 'IT', 'owner', 'Titolare. Libero professionista (P.IVA) + imprenditore.', true);

INSERT INTO "subjects" ("id", "type", "name", "country", "role", "notes", "is_active")
VALUES (gen_random_uuid(), 'person', 'Mirko Castignani', 'IT', 'partner', 'Socio al 50% in Vantaggio Sleale / Opzionetika. Titolare di Scacco Matto SRLS.', true);

INSERT INTO "subjects" ("id", "type", "name", "legal_form", "country", "role", "notes", "is_active")
VALUES (gen_random_uuid(), 'company', 'TLF Advisory SRLS', 'SRLS', 'IT', 'other', 'Ha un conto Revolut aziendale.', true);

INSERT INTO "subjects" ("id", "type", "name", "legal_form", "country", "role", "notes", "is_active")
VALUES (gen_random_uuid(), 'company', 'LTD UK (VS/Opzionetika)', 'LTD', 'GB', 'partner', 'LTD inglese condivisa con Mirko Castignani.', true);

-- Subjects with parent = Andrea Vaturi

INSERT INTO "subjects" ("id", "type", "name", "country", "role", "parent_subject_id", "notes", "is_active")
VALUES (gen_random_uuid(), 'person', 'Moglie AV', 'IT', 'family', (SELECT id FROM subjects WHERE name = 'Andrea Vaturi'), 'Ha una Amex collegata al conto di Andrea.', true);

INSERT INTO "subjects" ("id", "type", "name", "country", "role", "parent_subject_id", "notes", "is_active")
VALUES (gen_random_uuid(), 'person', 'Massimo Vaturi', 'IT', 'family', (SELECT id FROM subjects WHERE name = 'Andrea Vaturi'), 'Figlio. Ha una prepagata.', true);

INSERT INTO "subjects" ("id", "type", "name", "legal_form", "country", "role", "parent_subject_id", "notes", "is_active")
VALUES (gen_random_uuid(), 'company', 'Kairos SRLS', 'SRLS', 'IT', 'owner', (SELECT id FROM subjects WHERE name = 'Andrea Vaturi'), 'SRL di Andrea al 100%. Interfaccia principale per il business VS/Opzionetika.', true);

INSERT INTO "subjects" ("id", "type", "name", "legal_form", "country", "role", "parent_subject_id", "notes", "is_active")
VALUES (gen_random_uuid(), 'company', 'Shuffle SSRL', 'SSRL', 'IT', 'other', (SELECT id FROM subjects WHERE name = 'Andrea Vaturi'), 'Gestisce Ghiaccio Spettacolo. Andrea socio al 33%.', true);

INSERT INTO "subjects" ("id", "type", "name", "legal_form", "country", "role", "parent_subject_id", "notes", "is_active")
VALUES (gen_random_uuid(), 'company', 'Ace of Diamonds SRL', 'SRL', 'RO', 'owner', (SELECT id FROM subjects WHERE name = 'Andrea Vaturi'), 'Azienda rumena. Probabilmente in fase di chiusura.', true);

INSERT INTO "subjects" ("id", "type", "name", "legal_form", "country", "role", "parent_subject_id", "notes", "is_active")
VALUES (gen_random_uuid(), 'company', 'Unfair Advantage SRL', 'SRL', 'RO', 'owner', (SELECT id FROM subjects WHERE name = 'Andrea Vaturi'), 'Azienda rumena. Probabilmente in fase di chiusura.', true);

-- Subject with parent = Mirko Castignani

INSERT INTO "subjects" ("id", "type", "name", "legal_form", "country", "role", "parent_subject_id", "notes", "is_active")
VALUES (gen_random_uuid(), 'company', 'Scacco Matto SRLS', 'SRLS', 'IT', 'partner', (SELECT id FROM subjects WHERE name = 'Mirko Castignani'), 'SRL di Mirko Castignani. Business 50/50 con Kairos per VS/Opzionetika.', true);

-- ============================================================
-- 2. CONTAINERS (53 records)
-- ============================================================

-- --- Conti personali di Andrea ---

INSERT INTO "containers" ("id", "subject_id", "name", "type", "provider", "currency", "is_multi_currency", "initial_balance", "icon", "color", "sort_order", "is_active", "notes")
VALUES (gen_random_uuid(), (SELECT id FROM subjects WHERE name = 'Andrea Vaturi'), 'ISP 2767', 'bank_account', 'Intesa Sanpaolo', 'EUR', false, '0', 'landmark', '#0066CC', 0, true, 'Conto corrente principale personale.');

INSERT INTO "containers" ("id", "subject_id", "name", "type", "provider", "currency", "is_multi_currency", "initial_balance", "icon", "color", "sort_order", "is_active", "notes")
VALUES (gen_random_uuid(), (SELECT id FROM subjects WHERE name = 'Andrea Vaturi'), 'Revolut Personal', 'bank_account', 'Revolut', 'EUR', true, '100', 'smartphone', '#0075EB', 1, true, 'Conto Revolut personale. Multi-valuta + risparmio.');

-- Contanti

INSERT INTO "containers" ("id", "subject_id", "name", "type", "provider", "currency", "is_multi_currency", "initial_balance", "icon", "color", "sort_order", "is_active", "notes")
VALUES (gen_random_uuid(), (SELECT id FROM subjects WHERE name = 'Andrea Vaturi'), 'Contanti', 'cash', NULL, 'EUR', false, '0', 'banknote', '#22C55E', 2, true, 'Cash fisico.');

-- Servizi di pagamento

INSERT INTO "containers" ("id", "subject_id", "name", "type", "provider", "currency", "is_multi_currency", "initial_balance", "icon", "color", "sort_order", "is_active", "notes")
VALUES (gen_random_uuid(), (SELECT id FROM subjects WHERE name = 'Andrea Vaturi'), 'PayPal', 'payment_service', 'PayPal', 'EUR', true, '0', 'smartphone', '#003087', 3, true, 'PayPal personale. Se saldo insufficiente, prende da Amex o ISP.');

INSERT INTO "containers" ("id", "subject_id", "name", "type", "provider", "currency", "is_multi_currency", "initial_balance", "icon", "color", "sort_order", "is_active", "notes")
VALUES (gen_random_uuid(), (SELECT id FROM subjects WHERE name = 'Andrea Vaturi'), 'Satispay', 'payment_service', 'Satispay', 'EUR', false, '100', 'smartphone', '#EF4444', 4, true, 'Ricarica automatica settimanale da ISP.');

-- Carte di credito

INSERT INTO "containers" ("id", "subject_id", "name", "type", "provider", "currency", "is_multi_currency", "initial_balance", "billing_day", "icon", "color", "sort_order", "is_active", "notes")
VALUES (gen_random_uuid(), (SELECT id FROM subjects WHERE name = 'Andrea Vaturi'), 'American Express Oro - AV', 'credit_card', 'American Express', 'EUR', false, '0', 10, 'credit-card', '#C5A44E', 5, true, 'Amex Oro personale di Andrea. Addebito su ISP.');

INSERT INTO "containers" ("id", "subject_id", "name", "type", "provider", "currency", "is_multi_currency", "initial_balance", "billing_day", "icon", "color", "sort_order", "is_active", "notes")
VALUES (gen_random_uuid(), (SELECT id FROM subjects WHERE name = 'Andrea Vaturi'), 'American Express Oro - VS', 'credit_card', 'American Express', 'EUR', false, '0', 10, 'credit-card', '#C5A44E', 6, true, 'Amex Oro per Vantaggio Sleale. Addebito su ISP.');

INSERT INTO "containers" ("id", "subject_id", "name", "type", "provider", "currency", "is_multi_currency", "initial_balance", "icon", "color", "sort_order", "is_active", "notes")
VALUES (gen_random_uuid(), (SELECT id FROM subjects WHERE name = 'Andrea Vaturi'), 'American Express Revolving', 'credit_card', 'American Express', 'EUR', false, '0', 'credit-card', '#8B7355', 7, true, 'Amex revolving.');

INSERT INTO "containers" ("id", "subject_id", "name", "type", "provider", "currency", "is_multi_currency", "initial_balance", "billing_day", "icon", "color", "sort_order", "is_active", "notes")
VALUES (gen_random_uuid(), (SELECT id FROM subjects WHERE name = 'Moglie AV'), 'American Express Moglie', 'credit_card', 'American Express', 'EUR', false, '0', 10, 'credit-card', '#C5A44E', 8, true, 'Amex intestata alla moglie, collegata al conto di Andrea.');

-- Risparmio

INSERT INTO "containers" ("id", "subject_id", "name", "type", "provider", "currency", "is_multi_currency", "initial_balance", "icon", "color", "sort_order", "is_active", "notes")
VALUES (gen_random_uuid(), (SELECT id FROM subjects WHERE name = 'Andrea Vaturi'), 'Fondo ca$$a', 'savings', NULL, 'EUR', false, '1300', 'piggy-bank', '#F59E0B', 9, true, 'Fondo cassa di emergenza.');

INSERT INTO "containers" ("id", "subject_id", "name", "type", "provider", "currency", "is_multi_currency", "initial_balance", "icon", "color", "sort_order", "is_active", "notes")
VALUES (gen_random_uuid(), (SELECT id FROM subjects WHERE name = 'Andrea Vaturi'), 'New York Piggy', 'savings', NULL, 'EUR', false, '0', 'piggy-bank', '#EC4899', 10, true, 'Salvadanaio/accantonamento.');

-- Trading personale

INSERT INTO "containers" ("id", "subject_id", "name", "type", "provider", "currency", "is_multi_currency", "initial_balance", "icon", "color", "sort_order", "is_active", "notes")
VALUES (gen_random_uuid(), (SELECT id FROM subjects WHERE name = 'Andrea Vaturi'), 'Interactive Brokers AV', 'trading', 'Interactive Brokers', 'EUR', true, '100', 'trending-up', '#D62B1F', 11, true, 'Conto trading personale di Andrea su IB.');

INSERT INTO "containers" ("id", "subject_id", "name", "type", "provider", "currency", "is_multi_currency", "initial_balance", "icon", "color", "sort_order", "is_active", "notes")
VALUES (gen_random_uuid(), (SELECT id FROM subjects WHERE name = 'Andrea Vaturi'), 'Trade Republic', 'trading', 'Trade Republic', 'EUR', false, '11000', 'trending-up', '#1A1A2E', 12, true, 'Investing. Saldo €11.000.');

INSERT INTO "containers" ("id", "subject_id", "name", "type", "provider", "currency", "is_multi_currency", "initial_balance", "icon", "color", "sort_order", "is_active")
VALUES (gen_random_uuid(), (SELECT id FROM subjects WHERE name = 'Andrea Vaturi'), 'iBroker.it', 'trading', 'iBroker', 'EUR', false, '270.60', 'trending-up', '#FF6600', 13, true);

INSERT INTO "containers" ("id", "subject_id", "name", "type", "provider", "currency", "is_multi_currency", "initial_balance", "icon", "color", "sort_order", "is_active")
VALUES (gen_random_uuid(), (SELECT id FROM subjects WHERE name = 'Andrea Vaturi'), 'Webank Trading', 'trading', 'Webank', 'EUR', false, '1627.73', 'trending-up', '#006837', 14, true);

INSERT INTO "containers" ("id", "subject_id", "name", "type", "provider", "currency", "is_multi_currency", "initial_balance", "icon", "color", "sort_order", "is_active")
VALUES (gen_random_uuid(), (SELECT id FROM subjects WHERE name = 'Andrea Vaturi'), 'Daniotti', 'trading', 'Daniotti', 'EUR', false, '3000', 'trending-up', '#D4A017', 15, true);

INSERT INTO "containers" ("id", "subject_id", "name", "type", "provider", "currency", "is_multi_currency", "initial_balance", "icon", "color", "sort_order", "is_active")
VALUES (gen_random_uuid(), (SELECT id FROM subjects WHERE name = 'Andrea Vaturi'), 'IG', 'trading', 'IG', 'EUR', true, '0', 'trending-up', '#DC143C', 16, true);

INSERT INTO "containers" ("id", "subject_id", "name", "type", "provider", "currency", "is_multi_currency", "initial_balance", "icon", "color", "sort_order", "is_active", "notes")
VALUES (gen_random_uuid(), (SELECT id FROM subjects WHERE name = 'Andrea Vaturi'), 'Soisy', 'trading', 'Soisy', 'EUR', false, '59.37', 'trending-up', '#5B21B6', 17, true, 'P2P lending / investing.');

INSERT INTO "containers" ("id", "subject_id", "name", "type", "provider", "currency", "is_multi_currency", "initial_balance", "icon", "color", "sort_order", "is_active")
VALUES (gen_random_uuid(), (SELECT id FROM subjects WHERE name = 'Andrea Vaturi'), 'Degiro', 'trading', 'Degiro', 'EUR', true, '129.39', 'trending-up', '#00A3E0', 18, true);

INSERT INTO "containers" ("id", "subject_id", "name", "type", "provider", "currency", "is_multi_currency", "initial_balance", "icon", "color", "sort_order", "is_active", "notes")
VALUES (gen_random_uuid(), (SELECT id FROM subjects WHERE name = 'Andrea Vaturi'), 'Lenndy', 'trading', 'Lenndy', 'EUR', false, '54.01', 'trending-up', '#4A90D9', 19, true, 'P2P lending.');

-- Crypto personale

INSERT INTO "containers" ("id", "subject_id", "name", "type", "provider", "currency", "is_multi_currency", "initial_balance", "icon", "color", "sort_order", "is_active")
VALUES (gen_random_uuid(), (SELECT id FROM subjects WHERE name = 'Andrea Vaturi'), 'Binance', 'crypto', 'Binance', 'EUR', true, '10000', 'bitcoin', '#F3BA2F', 20, true);

INSERT INTO "containers" ("id", "subject_id", "name", "type", "provider", "currency", "is_multi_currency", "initial_balance", "icon", "color", "sort_order", "is_active")
VALUES (gen_random_uuid(), (SELECT id FROM subjects WHERE name = 'Andrea Vaturi'), 'Wirex', 'crypto', 'Wirex', 'EUR', true, '0', 'bitcoin', '#00C3FF', 21, true);

INSERT INTO "containers" ("id", "subject_id", "name", "type", "provider", "currency", "is_multi_currency", "initial_balance", "icon", "color", "sort_order", "is_active")
VALUES (gen_random_uuid(), (SELECT id FROM subjects WHERE name = 'Andrea Vaturi'), 'Crypto.com', 'crypto', 'Crypto.com', 'EUR', true, '197.47', 'bitcoin', '#103F68', 22, true);

INSERT INTO "containers" ("id", "subject_id", "name", "type", "provider", "currency", "is_multi_currency", "initial_balance", "icon", "color", "sort_order", "is_active")
VALUES (gen_random_uuid(), (SELECT id FROM subjects WHERE name = 'Andrea Vaturi'), 'Coinbase', 'crypto', 'Coinbase', 'EUR', true, '405.94', 'bitcoin', '#0052FF', 23, true);

INSERT INTO "containers" ("id", "subject_id", "name", "type", "provider", "currency", "is_multi_currency", "initial_balance", "icon", "color", "sort_order", "is_active", "notes")
VALUES (gen_random_uuid(), (SELECT id FROM subjects WHERE name = 'Andrea Vaturi'), 'BlockFi', 'crypto', 'BlockFi', 'USD', false, '7.59', 'bitcoin', '#694ED6', 24, false, 'Probabilmente chiuso/bloccato.');

INSERT INTO "containers" ("id", "subject_id", "name", "type", "provider", "currency", "is_multi_currency", "initial_balance", "icon", "color", "sort_order", "is_active", "notes")
VALUES (gen_random_uuid(), (SELECT id FROM subjects WHERE name = 'Andrea Vaturi'), 'Deribit', 'crypto', 'Deribit', 'USD', true, '1300', 'bitcoin', '#57E099', 25, true, 'Crypto + Trading opzioni.');

INSERT INTO "containers" ("id", "subject_id", "name", "type", "provider", "currency", "is_multi_currency", "initial_balance", "icon", "color", "sort_order", "is_active")
VALUES (gen_random_uuid(), (SELECT id FROM subjects WHERE name = 'Andrea Vaturi'), 'Trust Wallet', 'crypto', 'Trust Wallet', 'USD', true, '0', 'bitcoin', '#3375BB', 26, true);

INSERT INTO "containers" ("id", "subject_id", "name", "type", "provider", "currency", "is_multi_currency", "initial_balance", "icon", "color", "sort_order", "is_active", "notes")
VALUES (gen_random_uuid(), (SELECT id FROM subjects WHERE name = 'Andrea Vaturi'), 'Polymarket', 'crypto', 'Polymarket', 'USD', false, '100', 'bitcoin', '#4C6EF5', 27, true, 'Prediction market.');

INSERT INTO "containers" ("id", "subject_id", "name", "type", "provider", "currency", "is_multi_currency", "initial_balance", "icon", "color", "sort_order", "is_active")
VALUES (gen_random_uuid(), (SELECT id FROM subjects WHERE name = 'Andrea Vaturi'), 'Climbermine', 'crypto', 'Climbermine', 'USD', false, '1000', 'bitcoin', '#00BFA5', 28, true);

INSERT INTO "containers" ("id", "subject_id", "name", "type", "provider", "currency", "is_multi_currency", "initial_balance", "icon", "color", "sort_order", "is_active", "notes")
VALUES (gen_random_uuid(), (SELECT id FROM subjects WHERE name = 'Andrea Vaturi'), 'MetaMask', 'crypto', 'MetaMask', 'USD', true, '0', 'bitcoin', '#E2761B', 29, true, 'Wallet DeFi.');

INSERT INTO "containers" ("id", "subject_id", "name", "type", "provider", "currency", "is_multi_currency", "initial_balance", "icon", "color", "sort_order", "is_active")
VALUES (gen_random_uuid(), (SELECT id FROM subjects WHERE name = 'Andrea Vaturi'), 'ByBit', 'crypto', 'ByBit', 'USD', true, '1000', 'bitcoin', '#F7A600', 30, true);

-- --- Conti aziendali Kairos ---

INSERT INTO "containers" ("id", "subject_id", "name", "type", "provider", "currency", "is_multi_currency", "initial_balance", "icon", "color", "sort_order", "is_active", "notes")
VALUES (gen_random_uuid(), (SELECT id FROM subjects WHERE name = 'Kairos SRLS'), 'Interactive Brokers Kairos', 'trading', 'Interactive Brokers', 'EUR', true, '7700', 'trending-up', '#D62B1F', 31, true, 'Conto trading aziendale Kairos.');

INSERT INTO "containers" ("id", "subject_id", "name", "type", "provider", "currency", "is_multi_currency", "initial_balance", "icon", "color", "sort_order", "is_active", "notes")
VALUES (gen_random_uuid(), (SELECT id FROM subjects WHERE name = 'Kairos SRLS'), 'ISP Kairos', 'bank_account', 'Intesa Sanpaolo', 'EUR', false, '0', 'landmark', '#0066CC', 32, true, 'Conto corrente aziendale Kairos su Intesa Sanpaolo.');

INSERT INTO "containers" ("id", "subject_id", "name", "type", "provider", "currency", "is_multi_currency", "initial_balance", "icon", "color", "sort_order", "is_active")
VALUES (gen_random_uuid(), (SELECT id FROM subjects WHERE name = 'Kairos SRLS'), 'Zurich Bank Kairos', 'bank_account', 'Zurich Bank', 'EUR', false, '0', 'landmark', '#003399', 33, true);

INSERT INTO "containers" ("id", "subject_id", "name", "type", "provider", "currency", "is_multi_currency", "initial_balance", "icon", "color", "sort_order", "is_active", "notes")
VALUES (gen_random_uuid(), (SELECT id FROM subjects WHERE name = 'Kairos SRLS'), 'Amex Kairos', 'credit_card', 'American Express', 'EUR', false, '0', 'credit-card', '#C5A44E', 34, true, 'American Express aziendale Kairos. Esporta Excel/CSV.');

INSERT INTO "containers" ("id", "subject_id", "name", "type", "provider", "currency", "is_multi_currency", "initial_balance", "icon", "color", "sort_order", "is_active")
VALUES (gen_random_uuid(), (SELECT id FROM subjects WHERE name = 'Kairos SRLS'), 'PayPal Kairos', 'payment_service', 'PayPal', 'EUR', true, '0', 'smartphone', '#003087', 35, true);

INSERT INTO "containers" ("id", "subject_id", "name", "type", "provider", "currency", "is_multi_currency", "initial_balance", "icon", "color", "sort_order", "is_active")
VALUES (gen_random_uuid(), (SELECT id FROM subjects WHERE name = 'Kairos SRLS'), 'Qonto Kairos', 'bank_account', 'Qonto', 'EUR', false, '0', 'landmark', '#7B61FF', 36, true);

INSERT INTO "containers" ("id", "subject_id", "name", "type", "provider", "currency", "is_multi_currency", "initial_balance", "icon", "color", "sort_order", "is_active")
VALUES (gen_random_uuid(), (SELECT id FROM subjects WHERE name = 'Kairos SRLS'), 'Stripe Kairos', 'payment_service', 'Stripe', 'EUR', true, '0', 'smartphone', '#635BFF', 37, true);

INSERT INTO "containers" ("id", "subject_id", "name", "type", "provider", "currency", "is_multi_currency", "initial_balance", "icon", "color", "sort_order", "is_active")
VALUES (gen_random_uuid(), (SELECT id FROM subjects WHERE name = 'Kairos SRLS'), 'Soldo Kairos', 'payment_service', 'Soldo', 'EUR', false, '0', 'smartphone', '#1A1A1A', 38, true);

INSERT INTO "containers" ("id", "subject_id", "name", "type", "provider", "currency", "is_multi_currency", "initial_balance", "icon", "color", "sort_order", "is_active")
VALUES (gen_random_uuid(), (SELECT id FROM subjects WHERE name = 'Kairos SRLS'), 'Saxo Kairos', 'trading', 'Saxo Bank', 'EUR', true, '0', 'trending-up', '#003D6A', 39, true);

INSERT INTO "containers" ("id", "subject_id", "name", "type", "provider", "currency", "is_multi_currency", "initial_balance", "icon", "color", "sort_order", "is_active")
VALUES (gen_random_uuid(), (SELECT id FROM subjects WHERE name = 'Kairos SRLS'), 'Wise Kairos', 'payment_service', 'Wise', 'EUR', true, '0', 'smartphone', '#9FE870', 40, true);

-- --- Conti Romania ---

INSERT INTO "containers" ("id", "subject_id", "name", "type", "provider", "currency", "is_multi_currency", "initial_balance", "icon", "color", "sort_order", "is_active")
VALUES (gen_random_uuid(), (SELECT id FROM subjects WHERE name = 'Ace of Diamonds SRL'), 'Banca Transilvania - LEI', 'bank_account', 'Banca Transilvania', 'RON', false, '0', 'landmark', '#FFD700', 41, true);

INSERT INTO "containers" ("id", "subject_id", "name", "type", "provider", "currency", "is_multi_currency", "initial_balance", "icon", "color", "sort_order", "is_active")
VALUES (gen_random_uuid(), (SELECT id FROM subjects WHERE name = 'Ace of Diamonds SRL'), 'Banca Transilvania - EUR (AoD)', 'bank_account', 'Banca Transilvania', 'EUR', false, '0', 'landmark', '#FFD700', 42, true);

INSERT INTO "containers" ("id", "subject_id", "name", "type", "provider", "currency", "is_multi_currency", "initial_balance", "icon", "color", "sort_order", "is_active")
VALUES (gen_random_uuid(), (SELECT id FROM subjects WHERE name = 'Unfair Advantage SRL'), 'Banca Transilvania - EUR (UA)', 'bank_account', 'Banca Transilvania', 'EUR', false, '0', 'landmark', '#FFD700', 43, true);

INSERT INTO "containers" ("id", "subject_id", "name", "type", "provider", "currency", "is_multi_currency", "initial_balance", "icon", "color", "sort_order", "is_active", "notes")
VALUES (gen_random_uuid(), (SELECT id FROM subjects WHERE name = 'Ace of Diamonds SRL'), 'Ace of Diamonds - EUR account', 'bank_account', 'Ace of Diamonds', 'EUR', false, '35000', 'landmark', '#DC2626', 44, true, 'Conto Gruppo VS. Saldo €35.000.');

-- --- TLF Advisory ---

INSERT INTO "containers" ("id", "subject_id", "name", "type", "provider", "currency", "is_multi_currency", "initial_balance", "icon", "color", "sort_order", "is_active")
VALUES (gen_random_uuid(), (SELECT id FROM subjects WHERE name = 'TLF Advisory SRLS'), 'Revolut - TLF Advisory', 'bank_account', 'Revolut', 'EUR', true, '0', 'smartphone', '#0075EB', 45, true);

-- --- Conti Gruppo VS (condivisi con Mirko) ---

INSERT INTO "containers" ("id", "subject_id", "name", "type", "provider", "currency", "is_multi_currency", "initial_balance", "icon", "color", "sort_order", "is_active", "notes")
VALUES (gen_random_uuid(), (SELECT id FROM subjects WHERE name = 'Kairos SRLS'), 'tastyworks - tastyClub', 'trading', 'tastytrade', 'USD', false, '5131', 'trending-up', '#CE1141', 46, true, 'Gruppo VS. Saldo $5.131.');

INSERT INTO "containers" ("id", "subject_id", "name", "type", "provider", "currency", "is_multi_currency", "initial_balance", "icon", "color", "sort_order", "is_active", "notes")
VALUES (gen_random_uuid(), (SELECT id FROM subjects WHERE name = 'Kairos SRLS'), 'IB - ProRealTime', 'trading', 'Interactive Brokers', 'EUR', true, '0', 'trending-up', '#D62B1F', 47, true, 'Gruppo VS. IB con ProRealTime.');

INSERT INTO "containers" ("id", "subject_id", "name", "type", "provider", "currency", "is_multi_currency", "initial_balance", "icon", "color", "sort_order", "is_active", "notes")
VALUES (gen_random_uuid(), (SELECT id FROM subjects WHERE name = 'Kairos SRLS'), 'IB - Mastermind', 'trading', 'Interactive Brokers', 'EUR', true, '5000', 'trending-up', '#D62B1F', 48, true, 'Gruppo VS Mastermind. Saldo €5.000.');

INSERT INTO "containers" ("id", "subject_id", "name", "type", "provider", "currency", "is_multi_currency", "initial_balance", "icon", "color", "sort_order", "is_active", "notes")
VALUES (gen_random_uuid(), (SELECT id FROM subjects WHERE name = 'Kairos SRLS'), 'Exante', 'trading', 'Exante', 'EUR', true, '0', 'trending-up', '#1B3A5C', 49, true, 'Gruppo VS.');

INSERT INTO "containers" ("id", "subject_id", "name", "type", "provider", "currency", "is_multi_currency", "initial_balance", "icon", "color", "sort_order", "is_active", "notes")
VALUES (gen_random_uuid(), (SELECT id FROM subjects WHERE name = 'Kairos SRLS'), 'Webank - Portafoglio strategico', 'trading', 'Webank', 'EUR', false, '10000', 'trending-up', '#006837', 50, true, 'Gruppo VS. Saldo €10.000.');

INSERT INTO "containers" ("id", "subject_id", "name", "type", "provider", "currency", "is_multi_currency", "initial_balance", "icon", "color", "sort_order", "is_active", "notes")
VALUES (gen_random_uuid(), (SELECT id FROM subjects WHERE name = 'Kairos SRLS'), 'Schwab', 'trading', 'Charles Schwab', 'USD', false, '0', 'trending-up', '#00A3E0', 51, true, 'Gruppo VS.');

-- --- Prepagata figlio ---

INSERT INTO "containers" ("id", "subject_id", "name", "type", "provider", "currency", "is_multi_currency", "initial_balance", "icon", "color", "sort_order", "is_active", "notes")
VALUES (gen_random_uuid(), (SELECT id FROM subjects WHERE name = 'Massimo Vaturi'), 'Prepagata Massimo', 'bank_account', NULL, 'EUR', false, '0', 'credit-card', '#8B5CF6', 52, true, 'Prepagata per Massimo.');

-- ============================================================
-- 3. TAGS (81 records) - with parent_id hierarchy
-- ============================================================

-- Scope IDs as variables via DO block
DO $$
DECLARE
  scope_personale  UUID := gen_random_uuid();
  scope_familiare  UUID := gen_random_uuid();
  scope_kairos     UUID := gen_random_uuid();
  scope_vs         UUID := gen_random_uuid();
  scope_ghiaccio   UUID := gen_random_uuid();
  scope_ace        UUID := gen_random_uuid();
BEGIN

-- --- SCOPE (ambito) - 6 records ---

INSERT INTO "tags" ("id", "name", "type", "color", "icon")
VALUES (scope_personale, 'Personale', 'scope', '#3B82F6', 'user');

INSERT INTO "tags" ("id", "name", "type", "color", "icon")
VALUES (scope_familiare, 'Familiare', 'scope', '#8B5CF6', 'users');

INSERT INTO "tags" ("id", "name", "type", "color", "icon")
VALUES (scope_kairos, 'Aziendale Kairos', 'scope', '#F59E0B', 'building');

INSERT INTO "tags" ("id", "name", "type", "color", "icon")
VALUES (scope_vs, 'VS / Opzionetika', 'scope', '#EF4444', 'target');

INSERT INTO "tags" ("id", "name", "type", "color", "icon")
VALUES (scope_ghiaccio, 'Ghiaccio Spettacolo', 'scope', '#06B6D4', 'snowflake');

INSERT INTO "tags" ("id", "name", "type", "color", "icon")
VALUES (scope_ace, 'Ace of Diamonds', 'scope', '#DC2626', 'diamond');

-- --- PURPOSE (finalita) - 5 records ---

INSERT INTO "tags" ("id", "name", "type", "color", "icon", "parent_id")
VALUES (gen_random_uuid(), 'Da dividere con Mirko', 'purpose', '#F97316', 'split', scope_vs);

INSERT INTO "tags" ("id", "name", "type", "color", "icon", "parent_id")
VALUES (gen_random_uuid(), 'Versamento c/capitale', 'purpose', '#14B8A6', 'arrow-down-to-line', scope_kairos);

INSERT INTO "tags" ("id", "name", "type", "color", "icon", "parent_id")
VALUES (gen_random_uuid(), 'Scaricabile IVA', 'purpose', '#84CC16', 'receipt', scope_kairos);

INSERT INTO "tags" ("id", "name", "type", "color", "icon", "parent_id")
VALUES (gen_random_uuid(), 'Per conto parenti', 'purpose', '#D946EF', 'heart-handshake', scope_familiare);

INSERT INTO "tags" ("id", "name", "type", "color", "icon", "parent_id")
VALUES (gen_random_uuid(), 'Accantonamento figli', 'purpose', '#EC4899', 'baby', scope_familiare);

-- --- CATEGORY - Personale: spese quotidiane ---

INSERT INTO "tags" ("id", "name", "type", "color", "icon", "parent_id")
VALUES (gen_random_uuid(), 'Affitto', 'category', '#6366F1', 'home', scope_personale);

INSERT INTO "tags" ("id", "name", "type", "color", "icon", "parent_id")
VALUES (gen_random_uuid(), 'Box', 'category', '#6366F1', 'car', scope_personale);

INSERT INTO "tags" ("id", "name", "type", "color", "icon", "parent_id")
VALUES (gen_random_uuid(), 'Bollette', 'category', '#F59E0B', 'zap', scope_personale);

INSERT INTO "tags" ("id", "name", "type", "color", "icon", "parent_id")
VALUES (gen_random_uuid(), 'Acqua', 'category', '#06B6D4', 'droplets', scope_personale);

INSERT INTO "tags" ("id", "name", "type", "color", "icon", "parent_id")
VALUES (gen_random_uuid(), 'Spesa alimentare', 'category', '#22C55E', 'shopping-cart', scope_personale);

INSERT INTO "tags" ("id", "name", "type", "color", "icon", "parent_id")
VALUES (gen_random_uuid(), 'Automobile', 'category', '#64748B', 'car', scope_personale);

INSERT INTO "tags" ("id", "name", "type", "color", "icon", "parent_id")
VALUES (gen_random_uuid(), 'Telepass', 'category', '#3B82F6', 'toll', scope_personale);

INSERT INTO "tags" ("id", "name", "type", "color", "icon", "parent_id")
VALUES (gen_random_uuid(), 'Assicurazioni', 'category', '#DC2626', 'shield', scope_personale);

INSERT INTO "tags" ("id", "name", "type", "color", "icon", "parent_id")
VALUES (gen_random_uuid(), 'Carta di credito', 'category', '#C5A44E', 'credit-card', scope_personale);

INSERT INTO "tags" ("id", "name", "type", "color", "icon", "parent_id")
VALUES (gen_random_uuid(), 'Palestra', 'category', '#22C55E', 'dumbbell', scope_personale);

INSERT INTO "tags" ("id", "name", "type", "color", "icon", "parent_id")
VALUES (gen_random_uuid(), 'Capelli', 'category', '#A855F7', 'scissors', scope_personale);

INSERT INTO "tags" ("id", "name", "type", "color", "icon", "parent_id")
VALUES (gen_random_uuid(), 'Beneficenza', 'category', '#F472B6', 'heart', scope_personale);

INSERT INTO "tags" ("id", "name", "type", "color", "icon", "parent_id")
VALUES (gen_random_uuid(), 'Whoop', 'category', '#000000', 'watch', scope_personale);

INSERT INTO "tags" ("id", "name", "type", "color", "icon", "parent_id")
VALUES (gen_random_uuid(), 'Commercialista personale', 'category', '#475569', 'calculator', scope_personale);

-- --- CATEGORY - Personale: tasse e imposte ---

INSERT INTO "tags" ("id", "name", "type", "color", "icon", "parent_id")
VALUES (gen_random_uuid(), 'TARI', 'category', '#EF4444', 'file-text', scope_personale);

INSERT INTO "tags" ("id", "name", "type", "color", "icon", "parent_id")
VALUES (gen_random_uuid(), 'F24 - IVA', 'category', '#DC2626', 'file-text', scope_personale);

INSERT INTO "tags" ("id", "name", "type", "color", "icon", "parent_id")
VALUES (gen_random_uuid(), 'F24 - IRPEF', 'category', '#DC2626', 'file-text', scope_personale);

INSERT INTO "tags" ("id", "name", "type", "color", "icon", "parent_id")
VALUES (gen_random_uuid(), 'F24 - Cedolini', 'category', '#DC2626', 'file-text', scope_personale);

INSERT INTO "tags" ("id", "name", "type", "color", "icon", "parent_id")
VALUES (gen_random_uuid(), 'Multe', 'category', '#EF4444', 'alert-triangle', scope_personale);

-- --- CATEGORY - Personale: abbonamenti e strumenti ---

INSERT INTO "tags" ("id", "name", "type", "color", "icon", "parent_id")
VALUES (gen_random_uuid(), 'Netflix', 'category', '#E50914', 'tv', scope_personale);

INSERT INTO "tags" ("id", "name", "type", "color", "icon", "parent_id")
VALUES (gen_random_uuid(), 'Disney+', 'category', '#113CCF', 'tv', scope_personale);

INSERT INTO "tags" ("id", "name", "type", "color", "icon", "parent_id")
VALUES (gen_random_uuid(), 'Amazon Prime', 'category', '#FF9900', 'tv', scope_personale);

INSERT INTO "tags" ("id", "name", "type", "color", "icon", "parent_id")
VALUES (gen_random_uuid(), 'YouTube', 'category', '#FF0000', 'tv', scope_personale);

INSERT INTO "tags" ("id", "name", "type", "color", "icon", "parent_id")
VALUES (gen_random_uuid(), 'Spotify', 'category', '#1DB954', 'music', scope_personale);

INSERT INTO "tags" ("id", "name", "type", "color", "icon", "parent_id")
VALUES (gen_random_uuid(), 'Notion', 'category', '#000000', 'layout', scope_personale);

INSERT INTO "tags" ("id", "name", "type", "color", "icon", "parent_id")
VALUES (gen_random_uuid(), 'ChatGPT', 'category', '#10A37F', 'bot', scope_personale);

INSERT INTO "tags" ("id", "name", "type", "color", "icon", "parent_id")
VALUES (gen_random_uuid(), 'Claude', 'category', '#D4A574', 'bot', scope_personale);

INSERT INTO "tags" ("id", "name", "type", "color", "icon", "parent_id")
VALUES (gen_random_uuid(), 'Google Premium', 'category', '#4285F4', 'search', scope_personale);

INSERT INTO "tags" ("id", "name", "type", "color", "icon", "parent_id")
VALUES (gen_random_uuid(), 'VPN/VPS', 'category', '#6366F1', 'shield', scope_personale);

INSERT INTO "tags" ("id", "name", "type", "color", "icon", "parent_id")
VALUES (gen_random_uuid(), 'Domini', 'category', '#64748B', 'globe', scope_personale);

INSERT INTO "tags" ("id", "name", "type", "color", "icon", "parent_id")
VALUES (gen_random_uuid(), 'Software e abbonamenti', 'category', '#8B5CF6', 'package', scope_personale);

-- --- CATEGORY - Familiare ---

INSERT INTO "tags" ("id", "name", "type", "color", "icon", "parent_id")
VALUES (gen_random_uuid(), 'Scuola', 'category', '#8B5CF6', 'book-open', scope_familiare);

INSERT INTO "tags" ("id", "name", "type", "color", "icon", "parent_id")
VALUES (gen_random_uuid(), 'Milano Ristorazione', 'category', '#F97316', 'utensils', scope_familiare);

INSERT INTO "tags" ("id", "name", "type", "color", "icon", "parent_id")
VALUES (gen_random_uuid(), 'Baby Sitter', 'category', '#EC4899', 'baby', scope_familiare);

INSERT INTO "tags" ("id", "name", "type", "color", "icon", "parent_id")
VALUES (gen_random_uuid(), 'Pulizie casa', 'category', '#14B8A6', 'sparkles', scope_familiare);

INSERT INTO "tags" ("id", "name", "type", "color", "icon", "parent_id")
VALUES (gen_random_uuid(), 'Assicurazioni familiari', 'category', '#DC2626', 'shield-check', scope_familiare);

INSERT INTO "tags" ("id", "name", "type", "color", "icon", "parent_id")
VALUES (gen_random_uuid(), 'Vacanze e viaggi', 'category', '#0EA5E9', 'plane', scope_familiare);

INSERT INTO "tags" ("id", "name", "type", "color", "icon", "parent_id")
VALUES (gen_random_uuid(), 'Regali', 'category', '#F43F5E', 'gift', scope_familiare);

INSERT INTO "tags" ("id", "name", "type", "color", "icon", "parent_id")
VALUES (gen_random_uuid(), 'Comunita'' ebraica', 'category', '#2563EB', 'star', scope_familiare);

INSERT INTO "tags" ("id", "name", "type", "color", "icon", "parent_id")
VALUES (gen_random_uuid(), 'Attivita'' familiari e sportive', 'category', '#10B981', 'trophy', scope_familiare);

-- --- CATEGORY - Aziendale Kairos ---

INSERT INTO "tags" ("id", "name", "type", "color", "icon", "parent_id")
VALUES (gen_random_uuid(), 'Commercialista aziendale', 'category', '#475569', 'calculator', scope_kairos);

INSERT INTO "tags" ("id", "name", "type", "color", "icon", "parent_id")
VALUES (gen_random_uuid(), 'Assicurazioni professionali', 'category', '#DC2626', 'shield', scope_kairos);

INSERT INTO "tags" ("id", "name", "type", "color", "icon", "parent_id")
VALUES (gen_random_uuid(), 'Collaboratori', 'category', '#F97316', 'users', scope_kairos);

INSERT INTO "tags" ("id", "name", "type", "color", "icon", "parent_id")
VALUES (gen_random_uuid(), 'Ufficio', 'category', '#64748B', 'building-2', scope_kairos);

INSERT INTO "tags" ("id", "name", "type", "color", "icon", "parent_id")
VALUES (gen_random_uuid(), 'PEC', 'category', '#3B82F6', 'mail', scope_kairos);

INSERT INTO "tags" ("id", "name", "type", "color", "icon", "parent_id")
VALUES (gen_random_uuid(), 'Fatturazione elettronica', 'category', '#14B8A6', 'file-check', scope_kairos);

-- --- CATEGORY - VS / Opzionetika ---

INSERT INTO "tags" ("id", "name", "type", "color", "icon", "parent_id")
VALUES (gen_random_uuid(), 'TradingView', 'category', '#2962FF', 'bar-chart', scope_vs);

INSERT INTO "tags" ("id", "name", "type", "color", "icon", "parent_id")
VALUES (gen_random_uuid(), 'Corsi VS / Opzionetika', 'category', '#22C55E', 'presentation', scope_vs);

INSERT INTO "tags" ("id", "name", "type", "color", "icon", "parent_id")
VALUES (gen_random_uuid(), 'Earnings (trading)', 'category', '#22C55E', 'trending-up', scope_vs);

-- --- CATEGORY - Ghiaccio Spettacolo ---

INSERT INTO "tags" ("id", "name", "type", "color", "icon", "parent_id")
VALUES (gen_random_uuid(), 'Coreografia', 'category', '#22C55E', 'music-2', scope_ghiaccio);

INSERT INTO "tags" ("id", "name", "type", "color", "icon", "parent_id")
VALUES (gen_random_uuid(), 'Insegnamento', 'category', '#22C55E', 'graduation-cap', scope_ghiaccio);

INSERT INTO "tags" ("id", "name", "type", "color", "icon", "parent_id")
VALUES (gen_random_uuid(), 'Formazione / Speaker', 'category', '#22C55E', 'mic', scope_ghiaccio);

-- --- CATEGORY - Ace of Diamonds ---

INSERT INTO "tags" ("id", "name", "type", "color", "icon", "parent_id")
VALUES (gen_random_uuid(), 'Consulenza', 'category', '#22C55E', 'briefcase', scope_ace);

END $$;

-- ============================================================
-- 4. COUNTERPARTIES (19 records)
-- ============================================================

-- --- Servizi ---

INSERT INTO "counterparties" ("id", "name", "type", "default_category")
VALUES (gen_random_uuid(), 'Netflix', 'service', 'Netflix');

INSERT INTO "counterparties" ("id", "name", "type", "default_category")
VALUES (gen_random_uuid(), 'Spotify', 'service', 'Spotify');

INSERT INTO "counterparties" ("id", "name", "type", "default_category")
VALUES (gen_random_uuid(), 'Amazon', 'service', 'Amazon Prime');

INSERT INTO "counterparties" ("id", "name", "type", "default_category")
VALUES (gen_random_uuid(), 'Google', 'service', 'Google Premium');

INSERT INTO "counterparties" ("id", "name", "type", "default_category")
VALUES (gen_random_uuid(), 'OpenAI', 'service', 'ChatGPT');

INSERT INTO "counterparties" ("id", "name", "type", "default_category")
VALUES (gen_random_uuid(), 'Anthropic', 'service', 'Claude');

INSERT INTO "counterparties" ("id", "name", "type", "default_category")
VALUES (gen_random_uuid(), 'TradingView', 'service', 'TradingView');

-- --- Enti ---

INSERT INTO "counterparties" ("id", "name", "type", "default_category")
VALUES (gen_random_uuid(), 'Agenzia delle Entrate', 'government', 'F24 - IVA');

INSERT INTO "counterparties" ("id", "name", "type", "default_category")
VALUES (gen_random_uuid(), 'Comune di Milano', 'government', 'TARI');

-- --- Persone/business ---

INSERT INTO "counterparties" ("id", "name", "type", "default_category")
VALUES (gen_random_uuid(), 'Proprietario casa', 'person', 'Affitto');

INSERT INTO "counterparties" ("id", "name", "type", "default_category")
VALUES (gen_random_uuid(), 'Monia (baby sitter)', 'person', 'Baby Sitter');

INSERT INTO "counterparties" ("id", "name", "type", "default_category")
VALUES (gen_random_uuid(), 'Rosy (baby sitter)', 'person', 'Baby Sitter');

-- --- Aziende partner ---

INSERT INTO "counterparties" ("id", "name", "type")
VALUES (gen_random_uuid(), 'Scacco Matto SRLS (Mirko)', 'company');

INSERT INTO "counterparties" ("id", "name", "type")
VALUES (gen_random_uuid(), 'Shuffle SSRL', 'company');

-- --- Supermercati ---

INSERT INTO "counterparties" ("id", "name", "type", "default_category")
VALUES (gen_random_uuid(), 'Esselunga', 'store', 'Spesa alimentare');

INSERT INTO "counterparties" ("id", "name", "type", "default_category")
VALUES (gen_random_uuid(), 'Carrefour', 'store', 'Spesa alimentare');

-- --- Utilities ---

INSERT INTO "counterparties" ("id", "name", "type", "default_category")
VALUES (gen_random_uuid(), 'Enel', 'company', 'Bollette');

INSERT INTO "counterparties" ("id", "name", "type", "default_category")
VALUES (gen_random_uuid(), 'A2A', 'company', 'Bollette');

INSERT INTO "counterparties" ("id", "name", "type", "default_category")
VALUES (gen_random_uuid(), 'Telepass', 'company', 'Telepass');
