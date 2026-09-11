-- ═══════════════════════════════════════════════════════════════════
-- MIGRATION: Add posts_per_day to content_preferences (Max 3 Posts/Day)
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE IF EXISTS public.content_preferences
ADD COLUMN IF NOT EXISTS posts_per_day INT DEFAULT 1;

COMMENT ON COLUMN public.content_preferences.posts_per_day IS 'Jumlah postingan per hari (1, 2, atau maksimal 3 postingan/hari)';
