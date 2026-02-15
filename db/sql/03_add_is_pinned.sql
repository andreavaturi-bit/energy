-- Migration: Add is_pinned column to containers table
-- Run this in the Supabase SQL Editor

ALTER TABLE containers ADD COLUMN IF NOT EXISTS is_pinned boolean DEFAULT false NOT NULL;
