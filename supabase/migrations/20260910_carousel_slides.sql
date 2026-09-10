-- ═══════════════════════════════════════════════════════════════════
-- MIGRATION: Content Posts V4 — Instagram Carousel Multi-Slide Support
-- Adds: media_urls (JSONB array of image URLs), carousel_slides (JSONB array of slide objects)
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE public.content_posts
  ADD COLUMN IF NOT EXISTS media_urls JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS carousel_slides JSONB DEFAULT '[]'::jsonb;

-- Documentation comments
COMMENT ON COLUMN public.content_posts.media_urls IS 'Array of image URLs for multi-image posts (e.g. Instagram Carousel slides: [slide1_url, slide2_url, ...])';
COMMENT ON COLUMN public.content_posts.carousel_slides IS 'Array of detailed carousel slide objects: [{ slide: 1, imageUrl: "...", title: "...", prompt: "..." }, ...]';
