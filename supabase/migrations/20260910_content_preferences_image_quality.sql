-- ═══════════════════════════════════════════════════════════════════
-- MIGRATION: Add image_quality to content_preferences
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE IF EXISTS public.content_preferences
ADD COLUMN IF NOT EXISTS image_quality TEXT DEFAULT 'medium';
