-- ═══════════════════════════════════════════════════════════════════
-- MIGRATION: Add threads_caption to content_posts table
-- Dedicated caption strictly for Meta Threads (under 500 characters)
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE public.content_posts
  ADD COLUMN IF NOT EXISTS threads_caption TEXT;

COMMENT ON COLUMN public.content_posts.threads_caption IS 'Dedicated caption tailored specifically for Threads (strictly maximum 500 characters)';
