-- ═══════════════════════════════════════════════════════════════════
-- MIGRATION: Content Posts V3 — Lazy Generation & AI Reviewer Schema
-- Adds: ai_review, caption_status, image_status, generation_error, generated_at
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE public.content_posts
  ADD COLUMN IF NOT EXISTS ai_review JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS caption_status TEXT DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS image_status TEXT DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS generation_error TEXT,
  ADD COLUMN IF NOT EXISTS generated_at TIMESTAMPTZ;

-- Add comment documentation
COMMENT ON COLUMN public.content_posts.ai_review IS 'Detailed AI Review results: score (0-100), status (READY FOR APPROVAL / NEEDS_REVISION), checks checklist, issues, suggestions';
COMMENT ON COLUMN public.content_posts.caption_status IS 'Caption generation status: PENDING, GENERATING, COMPLETED, FAILED';
COMMENT ON COLUMN public.content_posts.image_status IS 'Image generation status: PENDING, GENERATING, COMPLETED, FAILED';
COMMENT ON COLUMN public.content_posts.generation_error IS 'Error message if caption or image generation failed';
COMMENT ON COLUMN public.content_posts.generated_at IS 'Timestamp when Lazy Generation completed';
