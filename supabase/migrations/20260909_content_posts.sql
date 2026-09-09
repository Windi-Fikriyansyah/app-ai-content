-- ═══════════════════════════════════════════════════════════════════
-- MIGRATION: Content Posts & 30-Day Plan Schema
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.content_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content_type TEXT NOT NULL, -- educational, promotional, engagement, branding, tips, storytelling, social proof
  pillar TEXT DEFAULT 'general',
  objective TEXT DEFAULT 'engagement',
  topic TEXT NOT NULL,
  hook TEXT,
  key_points JSONB DEFAULT '[]'::jsonb,
  cta TEXT,
  visual_direction TEXT,
  format TEXT DEFAULT 'Feed', -- Feed, Carousel, Reels, Story
  platform TEXT DEFAULT 'instagram',
  status TEXT DEFAULT 'PLANNED', -- PLANNED, GENERATING, DRAFT, REVIEW, APPROVAL, APPROVED, SCHEDULED, PUBLISHING, PUBLISHED, FAILED, CANCELLED
  scheduled_date DATE NOT NULL,
  scheduled_time TIME DEFAULT '19:00:00',
  scheduled_at TIMESTAMPTZ,
  caption TEXT,
  hashtags JSONB DEFAULT '[]'::jsonb,
  media_url TEXT,
  ai_score NUMERIC(5,2),
  zernio_post_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.content_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view content posts of their workspaces"
  ON public.content_posts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workspaces
      WHERE workspaces.id = content_posts.workspace_id
      AND workspaces.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert content posts in their workspaces"
  ON public.content_posts FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workspaces
      WHERE workspaces.id = content_posts.workspace_id
      AND workspaces.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can update content posts in their workspaces"
  ON public.content_posts FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workspaces
      WHERE workspaces.id = content_posts.workspace_id
      AND workspaces.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete content posts in their workspaces"
  ON public.content_posts FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workspaces
      WHERE workspaces.id = content_posts.workspace_id
      AND workspaces.owner_id = auth.uid()
    )
  );
