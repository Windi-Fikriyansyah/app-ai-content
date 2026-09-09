-- ═══════════════════════════════════════════════════════════════════
-- MIGRATION: Content Preferences & AI Strategy Schema
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.content_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  posts_per_week INT DEFAULT 5,
  posting_days JSONB DEFAULT '["Monday", "Wednesday", "Friday"]'::jsonb,
  posting_time TEXT DEFAULT '19:00',
  content_types JSONB DEFAULT '["Educational", "Promotional", "Engagement", "Branding", "Tips", "Storytelling"]'::jsonb,
  strategy_distribution JSONB DEFAULT '{"Educational": 40, "Promotional": 20, "Engagement": 15, "Branding": 10, "Tips": 10, "Storytelling": 5}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT uq_content_preferences_workspace UNIQUE(workspace_id)
);

ALTER TABLE public.content_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view content preferences of their workspaces"
  ON public.content_preferences FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workspaces
      WHERE workspaces.id = content_preferences.workspace_id
      AND workspaces.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert content preferences in their workspaces"
  ON public.content_preferences FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workspaces
      WHERE workspaces.id = content_preferences.workspace_id
      AND workspaces.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can update content preferences in their workspaces"
  ON public.content_preferences FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workspaces
      WHERE workspaces.id = content_preferences.workspace_id
      AND workspaces.owner_id = auth.uid()
    )
  );
