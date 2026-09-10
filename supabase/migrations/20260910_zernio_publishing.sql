-- ═══════════════════════════════════════════════════════════════════
-- MIGRATION: Zernio Publishing Columns & Indexes
-- ═══════════════════════════════════════════════════════════════════

-- Ensure columns exist in content_posts for Zernio scheduling & publishing
ALTER TABLE public.content_posts
ADD COLUMN IF NOT EXISTS zernio_post_id TEXT,
ADD COLUMN IF NOT EXISTS zernio_account_id TEXT,
ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;

-- Index on zernio_post_id for rapid webhook lookup
CREATE INDEX IF NOT EXISTS idx_content_posts_zernio_post_id 
ON public.content_posts (zernio_post_id);

-- Index on status and scheduled_at for calendar and scheduling queries
CREATE INDEX IF NOT EXISTS idx_content_posts_status_scheduled_at
ON public.content_posts (status, scheduled_at);
