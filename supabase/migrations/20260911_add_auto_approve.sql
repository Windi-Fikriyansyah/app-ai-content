-- MIGRATION: Add auto_approve column to content_preferences table
ALTER TABLE IF EXISTS public.content_preferences
ADD COLUMN IF NOT EXISTS auto_approve BOOLEAN DEFAULT false;

COMMENT ON COLUMN public.content_preferences.auto_approve IS 'Otomatis menyetujui (Approve) konten setelah lolos AI Review (skor >= 80)';
