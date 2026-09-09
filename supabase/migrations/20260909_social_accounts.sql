-- ═══════════════════════════════════════════════════════════════════
-- MIGRATION: Social Accounts & Zernio Integration Schema
-- ═══════════════════════════════════════════════════════════════════

-- 1. Add zernio_api_key & zernio_profile_id to workspaces table if not present
ALTER TABLE public.workspaces 
ADD COLUMN IF NOT EXISTS zernio_api_key TEXT,
ADD COLUMN IF NOT EXISTS zernio_profile_id TEXT;

-- 2. SOCIAL ACCOUNTS TABLE
CREATE TABLE IF NOT EXISTS public.social_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  provider TEXT NOT NULL, -- e.g. 'instagram', 'facebook', 'twitter', 'linkedin'
  provider_account_id TEXT NOT NULL,
  username TEXT NOT NULL,
  display_name TEXT,
  profile_picture_url TEXT,
  status TEXT DEFAULT 'connected', -- 'connected', 'disconnected', 'expired'
  timezone TEXT DEFAULT 'Asia/Jakarta',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT uq_workspace_provider_account UNIQUE(workspace_id, provider, provider_account_id)
);

ALTER TABLE public.social_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view social accounts of their workspaces"
  ON public.social_accounts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workspaces
      WHERE workspaces.id = social_accounts.workspace_id
      AND workspaces.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert social accounts in their workspaces"
  ON public.social_accounts FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workspaces
      WHERE workspaces.id = social_accounts.workspace_id
      AND workspaces.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can update social accounts in their workspaces"
  ON public.social_accounts FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workspaces
      WHERE workspaces.id = social_accounts.workspace_id
      AND workspaces.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete social accounts in their workspaces"
  ON public.social_accounts FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workspaces
      WHERE workspaces.id = social_accounts.workspace_id
      AND workspaces.owner_id = auth.uid()
    )
  );
